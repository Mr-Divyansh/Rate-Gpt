import { readFile } from "node:fs/promises";

let passed = 0;
let failed = 0;

function check(condition: boolean, label: string): void {
  if (condition) {
    passed += 1;
    console.log(`PASS ${label}`);
  } else {
    failed += 1;
    console.error(`FAIL ${label}`);
  }
}

async function main(): Promise<void> {
  const [sourceText, publicText, routeSource, apiDocs] = await Promise.all([
    readFile("openapi.json", "utf8"),
    readFile("public/openapi.json", "utf8"),
    readFile("src/server/routes/api.ts", "utf8"),
    readFile("docs/api.md", "utf8"),
  ]);

  let spec: any = null;
  try {
    spec = JSON.parse(sourceText);
  } catch {
    spec = null;
  }

  check(Boolean(spec?.openapi === "3.1.0" && spec?.paths), "source OpenAPI document is valid OpenAPI 3.1 JSON");
  check(sourceText === publicText, "public OpenAPI copy exactly matches the source specification");

  const expected = ["/", "/health", "/meta/filters", "/prices", "/prices/compare", "/commodities/search", "/prices/trend", "/sync-status", "/contact"];
  for (const path of expected) {
    check(Boolean(spec?.paths?.[path]), `OpenAPI documents ${path}`);
  }

  const contact = spec?.paths?.["/contact"]?.post;
  const requestSchema = contact?.requestBody?.content?.["application/json"]?.schema;
  check(Boolean(contact && requestSchema), "contact endpoint documents its JSON POST request body");
  check(
    Array.isArray(requestSchema?.required) &&
      ["name", "message", "consent"].every((field) => requestSchema.required.includes(field)) &&
      requestSchema?.properties?.consent?.const === true,
    "contact contract requires a message, name and explicit consent",
  );
  check(
    requestSchema?.properties?.email?.maxLength === 254 &&
      requestSchema?.properties?.phone?.maxLength === 24 &&
      Array.isArray(requestSchema?.anyOf),
    "contact contract documents bounded email and phone fields and the either-contact requirement",
  );
  check(
    contact?.responses?.["400"] &&
      contact?.responses?.["502"] &&
      contact?.responses?.["503"],
    "contact contract documents validation and delivery failure responses",
  );

  check(/router\.post\("\/contact"/.test(routeSource), "documented contact endpoint exists in the server router");
  check(
    routeSource.includes("commitSha: process.env.VERCEL_GIT_COMMIT_SHA"),
    "API discovery reports the Vercel deployment commit SHA for exact release verification",
  );
  check(/POST \/contact/.test(apiDocs), "human-readable API guide documents contact submission");
  check(
    !/Read-only API for/.test(spec?.info?.description ?? ""),
    "API description does not incorrectly describe the contact-enabled API as read-only",
  );

  console.log(`\\nAPI contract checks: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("API contract checks could not complete:", error);
  process.exitCode = 1;
});
