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
  const workflow = await readFile(".github/workflows/production-smoke.yml", "utf8");
  const waitStep = workflow.split("      - name: Wait for this release to reach production")[1]?.split("      - name: Run public production checks")[0] ?? "";
  const smokeStep = workflow.split("      - name: Run public production checks")[1] ?? "";

  check(waitStep.includes('echo "ready=true" >> "$GITHUB_OUTPUT"'),
    "release gate marks the release ready only after production markers respond");
  check(
    waitStep.includes('echo "ready=false" >> "$GITHUB_OUTPUT"') &&
      /::error::/.test(waitStep) &&
      /exit 1/.test(waitStep),
    "a stale or rate-limited production release fails the release gate instead of silently passing",
  );
  check(
    /api\/v1\/health/.test(waitStep) &&
      /api\/v1\//.test(waitStep) &&
      /openapi\.json/.test(waitStep) &&
      /llms\.txt/.test(waitStep),
    "release readiness requires health, API discovery, OpenAPI and AI guide markers",
  );
  check(
    /if: steps\.release\.outputs\.ready == 'true'/.test(smokeStep) &&
      /npm run test:production/.test(smokeStep),
    "public production smoke suite runs only after the current release is confirmed",
  );

  console.log(`\nProduction release-gate checks: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("Production release-gate checks could not complete:", error);
  process.exitCode = 1;
});
