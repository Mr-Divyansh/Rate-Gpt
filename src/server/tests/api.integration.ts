import fs from "fs";
import os from "os";
import path from "path";
import http from "http";
import { fileURLToPath, pathToFileURL } from "url";

// Isolated temporary database for integration tests (never touch tracked rategpt.db)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use a deterministic temp database name based on test suite hash, not PID (avoids collisions)
const testDbHash = "api-integration";
const tmpDb = path.join(os.tmpdir(), `rategpt-api-test-${testDbHash}.db`);

// Load the canonical schema initializer from the project's database module
// We import after defining tmpDb so env vars are available, but we need the schema
// from the real database to initialize the test database properly.
const { createApiApp } = await import(
  pathToFileURL(path.resolve(__dirname, "..", "..", "..", "server.ts")).href
);

// Read the original rategpt.db path to copy schema from
const originalDbPath = path.resolve(process.cwd(), "rategpt.db");

// Track whether we need to clean up
let dbSetup = false;

async function setupTestDatabase() {
  await cleanupTestDatabase();

  // If original database exists, use its schema; otherwise initialize from scratch
  if (fs.existsSync(originalDbPath)) {
    // Copy the original database to the temp location for schema fidelity
    fs.copyFileSync(originalDbPath, tmpDb);
    console.log(
      `[TEST] Copied schema from original database: ${originalDbPath}`,
    );
  } else {
    // Create a fresh database with the minimal required schema
    const mod = (await import("better-sqlite3")) as { default: any };
    const BetterSqlite3 = mod.default ?? mod;
    const testDb = new BetterSqlite3(tmpDb);

    // Create the essential tables matching the project schema
    testDb.exec(`
      CREATE TABLE IF NOT EXISTS mandi_prices (
        id TEXT PRIMARY KEY,
        source_record_id TEXT,
        state TEXT,
        district TEXT,
        market TEXT,
        commodity TEXT,
        variety TEXT,
        grade TEXT,
        arrival_date TEXT,
        min_price REAL,
        max_price REAL,
        modal_price REAL,
        source_unit TEXT,
        dedup_key TEXT,
        first_fetched_at TEXT,
        last_fetched_at TEXT
      );
      CREATE TABLE IF NOT EXISTS sync_logs (
        id TEXT PRIMARY KEY,
        status TEXT,
        requested_date TEXT,
        state_filter TEXT,
        records_fetched INTEGER,
        records_inserted INTEGER,
        records_updated INTEGER,
        error_message TEXT,
        started_at TEXT,
        completed_at TEXT
      );
    `);
    // Seed one deterministic record so endpoint assertions (health/filters/
    // prices/trend/compare) have something to find regardless of whether a
    // real rategpt.db happens to exist on this machine.
    const now = new Date().toISOString();
    testDb
      .prepare(
        `INSERT INTO mandi_prices
          (id, source_record_id, state, district, market, commodity, variety,
           grade, arrival_date, min_price, max_price, modal_price, source_unit,
           dedup_key, first_fetched_at, last_fetched_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        "seed-test-record-1",
        "seed-1",
        "Himachal Pradesh",
        "Kangra",
        "Palampur",
        "Wheat",
        "Local",
        "FAQ",
        "2026-11-01",
        1800,
        2200,
        2000,
        "Rs/Quintal",
        "himachal pradesh|kangra|palampur|wheat|local|2026-11-01",
        now,
        now,
      );
    testDb.close();
    console.log(
      "[TEST] Created fresh test database with schema + 1 seed record",
    );
  }

  dbSetup = true;
  delete process.env.DATABASE_URL;
  delete process.env.POSTGRES_URL;
  delete process.env.VERCEL;
  process.env.RATEGPT_DB_PATH = tmpDb;
  process.env.NODE_ENV = "test";
  // server.ts only auto-starts its standalone listener when it is the actual
  // process entry point (see its isMainModule check), so importing it here
  // for createApiApp no longer requires VERCEL=1 as a workaround — and
  // setting it would make database-factory.ts refuse to fall back to SQLite.
  process.env.ADMIN_SYNC_KEY =
    "integration-test-admin-sync-key-not-a-real-secret";
  process.env.CRON_SECRET =
    "integration-test-cron-secret-not-a-real-secret";
}

async function cleanupTestDatabase() {
  try {
    if (fs.existsSync(tmpDb)) {
      fs.unlinkSync(tmpDb);
    }
    // Also clean up WAL and SHM files
    try {
      fs.unlinkSync(tmpDb + "-wal");
    } catch {
      /* ignore */
    }
    try {
      fs.unlinkSync(tmpDb + "-shm");
    } catch {
      /* ignore */
    }
  } catch {
    // ignore
  }
}

const app = createApiApp();
const server = await new Promise<any>((resolve) => {
  const s = app.listen(0, "127.0.0.1", () => resolve(s));
});
const port = (server.address() as any).port;
const base = `http://127.0.0.1:${port}`;

let passed = 0;
let failed = 0;

function assert(cond: boolean, name: string, detail?: string) {
  if (cond) {
    console.log(`  ✓ [PASS] ${name}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${name}${detail ? ` - ${detail}` : ""}`);
    failed++;
  }
}

async function request(
  method: string,
  p: string,
  body?: any,
  headers: Record<string, string> = {},
) {
  return new Promise<{ status: number; headers: any; json: any; text: string }>(
    (resolve, reject) => {
      const url = new URL(p, base);
      const opts: any = { method, headers: { ...headers } };
      let data: string | undefined;
      if (body) {
        data = JSON.stringify(body);
        opts.headers["Content-Type"] = "application/json";
      }
      const r = http.request(url, opts, (res) => {
        let chunks = "";
        res.on("data", (c) => (chunks += c));
        res.on("end", () => {
          let json: any = null;
          try {
            json = JSON.parse(chunks);
          } catch {
            /* ignore */
          }
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            json,
            text: chunks,
          });
        });
      });
      r.on("error", reject);
      if (data) r.write(data);
      r.end();
    },
  );
}

async function run() {
  console.log("\n========================================");
  console.log("🧪 RATE-GPT API INTEGRATION TESTS");
  console.log("========================================\n");

  // 1. Health
  console.log("1. Health:");
  const h = await request("GET", "/api/v1/health");
  assert(h.status === 200, "health returns 200", `status=${h.status}`);
  assert(h.json?.success === true, "health success envelope");
  assert(h.json?.data?.status === "healthy", "health status healthy");
  assert(
    typeof h.json?.data?.stats?.totalRecords === "number" &&
      h.json.data.stats.totalRecords > 0,
    "health has records",
  );
  assert(Boolean(h.headers["x-request-id"]), "health has X-Request-Id");

  // 1a. Synchronization schedule status
  const syncStatus = await request("GET", "/api/v1/sync-status");
  const nextSync = new Date(syncStatus.json?.data?.nextScheduledAt);
  assert(syncStatus.status === 200, "sync status returns 200");
  assert(
    typeof syncStatus.json?.data?.schedulerEnabled === "boolean" &&
      Number.isFinite(nextSync.getTime()),
    "sync status exposes scheduler state and next execution",
  );
  assert(
    nextSync.getUTCHours() === 0 && nextSync.getUTCMinutes() === 0,
    "next scheduled execution matches daily UTC schedule",
  );

  const cronNoAuth = await request("GET", "/api/v1/scheduler/sync");
  assert(
    cronNoAuth.status === 401,
    "scheduled sync rejects unauthenticated requests",
  );

  // 2. Filters
  console.log("\n2. Filters:");
  const f = await request("GET", "/api/v1/meta/filters");
  assert(f.status === 200, "filters returns 200");
  assert(
    Array.isArray(f.json?.data?.states) && f.json.data.states.length > 0,
    "filters has states",
  );

  // 3. Prices
  console.log("\n3. Prices:");
  const p = await request("GET", "/api/v1/prices?limit=5");
  assert(p.status === 200, "prices returns 200");
  assert(
    Array.isArray(p.json?.data) && p.json.data.length <= 5,
    "prices respects limit",
  );
  assert(
    typeof p.json?.meta?.total === "number" && p.json.meta.total > 0,
    "prices meta total",
  );
  assert(Boolean(p.headers["cache-control"]), "prices has Cache-Control");

  // 4. Empty result
  console.log("\n4. Empty result:");
  const e = await request("GET", "/api/v1/prices?search=NonExistentCrop12345");
  assert(e.status === 200, "empty search returns 200");
  assert(
    Array.isArray(e.json?.data) && e.json.data.length === 0,
    "empty search returns no records",
  );
  assert(e.json?.meta?.total === 0, "empty search total 0");

  // 5. Invalid input
  console.log("\n5. Invalid input:");
  const inv = await request("GET", "/api/v1/prices?limit=abc");
  assert(
    inv.status === 400,
    "invalid limit returns 400",
    `status=${inv.status}`,
  );
  assert(inv.json?.success === false, "invalid input success=false");

  // 6. Pagination
  console.log("\n6. Pagination:");
  const pg = await request("GET", "/api/v1/prices?limit=3&offset=3");
  assert(pg.status === 200, "paginated prices 200");
  assert(pg.json?.meta?.offset === 3, "offset reflected");

  // 7. Commodity search
  console.log("\n7. Commodity search:");
  const cs = await request("GET", "/api/v1/commodities/search?q=Wh&limit=5");
  assert(cs.status === 200, "commodity search 200");
  assert(Array.isArray(cs.json?.data), "commodity search returns array");

  // 8. Trend (may be empty)
  console.log("\n8. Trend:");
  const tr = await request(
    "GET",
    "/api/v1/prices/trend?commodity=Wheat&market=Lasalgaon",
  );
  assert(tr.status === 200, "trend returns 200", `status=${tr.status}`);

  // 9. Compare
  console.log("\n9. Compare:");
  const cmp = await request("GET", "/api/v1/prices/compare?commodity=Wheat");
  assert(cmp.status === 200, "compare returns 200", `status=${cmp.status}`);

  // 10. Admin sync auth (no real key configured in test env -> 503 or 401)
  console.log("\n10. Admin sync auth:");
  const sync = await request("POST", "/api/v1/admin/sync", {});
  assert(
    sync.status === 401 || sync.status === 503,
    "admin sync rejects unauthenticated",
    `status=${sync.status}`,
  );
  const invalidSyncBody = await request("POST", "/api/v1/admin/sync", {
    state: "x".repeat(101),
  }, {
    Authorization: "Bearer integration-test-admin-sync-key-not-a-real-secret",
  });
  assert(
    invalidSyncBody.status === 400,
    "admin sync validates filter lengths before executing",
  );

  // 11. Docs
  console.log("\n11. OpenAPI docs:");
  const docs = await request("GET", "/api/v1/docs");
  assert(docs.status === 200, "docs returns 200");
  assert(docs.json?.openapi === "3.0.3", "docs is OpenAPI 3.0.3");

  // 12. No stack trace in error response
  console.log("\n12. Error safety:");
  assert(
    !JSON.stringify(inv.json).includes("stack"),
    "error response has no stack trace",
  );

  // 13. Admin logs auth
  console.log("\n13. Admin logs auth:");
  const logsNoAuth = await request("GET", "/api/v1/admin/logs");
  assert(
    logsNoAuth.status === 401,
    "admin logs without creds rejected",
    `status=${logsNoAuth.status}`,
  );
  const logsBad = await new Promise<any>((resolve) => {
    const url = new URL("/api/v1/admin/logs", base);
    const r = http.request(
      url,
      { method: "GET", headers: { Authorization: "Bearer wrong-key" } },
      (res) => {
        let c = "";
        res.on("data", (d) => (c += d));
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            json: (() => {
              try {
                return JSON.parse(c);
              } catch {
                return null;
              }
            })(),
          }),
        );
      },
    );
    r.end();
  });
  assert(
    logsBad.status === 401,
    "admin logs with invalid creds rejected",
    `status=${logsBad.status}`,
  );
  const unicodeToken = "é".repeat(
    "integration-test-admin-sync-key-not-a-real-secret".length,
  );
  const logsUnicode = await request(
    "GET",
    "/api/v1/admin/logs",
    undefined,
    { Authorization: `Bearer ${unicodeToken}` },
  );
  assert(
    logsUnicode.status === 401,
    "admin logs safely rejects same-character-length Unicode tokens",
    `status=${logsUnicode.status}`,
  );
  const logsOk = await new Promise<any>((resolve) => {
    const url = new URL("/api/v1/admin/logs", base);
    const r = http.request(
      url,
      {
        method: "GET",
        headers: {
          Authorization:
            "Bearer integration-test-admin-sync-key-not-a-real-secret",
        },
      },
      (res) => {
        let c = "";
        res.on("data", (d) => (c += d));
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            json: (() => {
              try {
                return JSON.parse(c);
              } catch {
                return null;
              }
            })(),
          }),
        );
      },
    );
    r.end();
  });
  assert(
    logsOk.status === 200,
    "admin logs with valid creds returns 200",
    `status=${logsOk.status}`,
  );

  // 14. Admin sync auth
  console.log("\n14. Admin sync auth:");
  const syncNoAuth = await request("POST", "/api/v1/admin/sync", {});
  assert(
    syncNoAuth.status === 401,
    "admin sync without creds rejected",
    `status=${syncNoAuth.status}`,
  );
  const bodyKey = await request("POST", "/api/v1/admin/sync", {
    adminKey: "integration-test-admin-sync-key-not-a-real-secret",
  });
  assert(bodyKey.status === 401, "admin key is not accepted in request body");
  const syncBad = await new Promise<any>((resolve) => {
    const url = new URL("/api/v1/admin/sync", base);
    const r = http.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer wrong-key",
        },
      },
      (res) => {
        let c = "";
        res.on("data", (d) => (c += d));
        res.on("end", () => resolve({ status: res.statusCode }));
      },
    );
    r.write(JSON.stringify({}));
    r.end();
  });
  assert(
    syncBad.status === 401,
    "admin sync with invalid creds rejected",
    `status=${syncBad.status}`,
  );

  // 15. Public endpoints remain accessible
  console.log("\n15. Public endpoints:");
  const pubHealth = await request("GET", "/api/v1/health");
  assert(pubHealth.status === 200, "public health accessible");
  const pubPrices = await request("GET", "/api/v1/prices?limit=1");
  assert(pubPrices.status === 200, "public prices accessible");
  const pubFilters = await request("GET", "/api/v1/meta/filters");
  assert(pubFilters.status === 200, "public filters accessible");

  // 16. Secret safety
  console.log("\n16. Secret safety:");
  const errBody = JSON.stringify(logsBad.json || {});
  assert(
    !errBody.includes("integration-test-admin-sync-key-not-a-real-secret"),
    "error response does not leak admin key",
  );

  server.close();
  try {
    fs.unlinkSync(tmpDb);
  } catch {
    /* ignore */
  }

  console.log("\n========================================");
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log("========================================\n");

  if (failed > 0) process.exit(1);
}

async function runTests() {
  try {
    await setupTestDatabase();
    await run();
  } finally {
    await cleanupTestDatabase();
  }
}

runTests().catch((err) => {
  console.error("Fatal integration test error:", err);
  server.close();
  process.exit(1);
});
