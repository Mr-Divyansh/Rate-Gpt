import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = (process.env.RATE_GPT_BASE_URL || "https://rate-gpt.vercel.app").replace(/\/+$/, "");
const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

const browser = await chromium.launch({ headless: true });
let passed = 0;

function pass(label) {
  passed += 1;
  console.log("PASS " + label);
}

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const pageErrors = [];
    const consoleErrors = [];
    const failedRequests = [];
    const filterResponses = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("requestfailed", (request) => {
      failedRequests.push({ url: request.url(), error: request.failure()?.errorText || "unknown" });
    });
    page.on("response", (candidate) => {
      const url = new URL(candidate.url());
      if (url.pathname === "/api/v1/meta/filters") {
        filterResponses.push({ status: candidate.status(), state: url.searchParams.get("state") });
      }
    });
    page.setDefaultTimeout(45_000);

    const response = await page.goto(baseUrl + "/mandi-prices.html", {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    assert.equal(response?.status(), 200, viewport.name + ": mandi page must return HTTP 200");
    pass(viewport.name + ": mandi page opens");

    await page.waitForFunction(() => {
      const state = document.querySelector("#stateSelect");
      return state &&
        !state.disabled &&
        Array.from(state.options).some((option) => option.value === "Himachal Pradesh");
    }, null, { timeout: 45_000 });
    pass(viewport.name + ": government state options load");

    await page.selectOption("#stateSelect", "Himachal Pradesh");
    await page.waitForTimeout(1_000);
    let districtState = await page.evaluate(() => {
      const district = document.querySelector("#districtSelect");
      return { disabled: district?.disabled ?? true, optionCount: district?.options.length ?? 0 };
    });

    // Some browser engines can select an option without the app's delegated change listener
    // being ready after the initial asynchronous catalogue load. Dispatch once if needed.
    if (districtState.optionCount <= 1) {
      await page.locator("#stateSelect").dispatchEvent("change");
      await page.waitForFunction(() => {
        const district = document.querySelector("#districtSelect");
        return district && district.options.length > 1;
      }, null, { timeout: 30_000 }).catch(() => undefined);
      districtState = await page.evaluate(() => {
        const district = document.querySelector("#districtSelect");
        return { disabled: district?.disabled ?? true, optionCount: district?.options.length ?? 0 };
      });
    }

    assert.ok(
      districtState.optionCount > 1 && !districtState.disabled,
      viewport.name + ": state selection must load district options; diagnostics=" +
        JSON.stringify({ districtState, filterResponses, consoleErrors, failedRequests }),
    );
    pass(viewport.name + ": state selection loads district options");

    const districtValue = await page.locator("#districtSelect option").nth(1).getAttribute("value");
    assert.ok(districtValue, viewport.name + ": first district option must have a value");
    await page.selectOption("#districtSelect", districtValue);

    await page.waitForFunction(() => document.querySelectorAll("#mandiGrid button").length > 0, null, {
      timeout: 45_000,
    });
    pass(viewport.name + ": district selection loads mandi choices");

    const firstMandi = page.locator("#mandiGrid button").first();
    const mandiName = (await firstMandi.innerText()).trim();
    assert.ok(mandiName, viewport.name + ": mandi choice must have a readable label");

    const pricesResponsePromise = page.waitForResponse((candidate) => {
      const url = new URL(candidate.url());
      return url.pathname === "/api/v1/prices" && candidate.request().method() === "GET";
    }, { timeout: 45_000 });

    await firstMandi.click();
    const pricesResponse = await pricesResponsePromise;
    assert.equal(pricesResponse.status(), 200, viewport.name + ": selecting a mandi must fetch prices successfully");
    const pricesBody = await pricesResponse.json();
    assert.equal(pricesBody.success, true, viewport.name + ": prices API must return the documented success envelope");
    assert.ok(Array.isArray(pricesBody.data), viewport.name + ": prices API must return a records array");
    pass(viewport.name + ": selecting a mandi fetches live price records");

    await page.waitForFunction(() => {
      const tableRows = document.querySelector("#priceTableBody")?.children.length ?? 0;
      const mobileCards = document.querySelector("#mobilePriceList")?.children.length ?? 0;
      return tableRows > 0 || mobileCards > 0;
    }, null, { timeout: 30_000 });
    pass(viewport.name + ": price or honest empty-state UI renders");

    const dimensions = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    }));
    assert.ok(
      dimensions.documentWidth <= dimensions.viewportWidth + 2,
      viewport.name + ": page must not create horizontal viewport overflow (" +
        dimensions.documentWidth + " > " + dimensions.viewportWidth + ")",
    );
    pass(viewport.name + ": layout fits the viewport without horizontal overflow");

    assert.deepEqual(pageErrors, [], viewport.name + ": page must not emit uncaught browser JavaScript errors");
    pass(viewport.name + ": no uncaught browser JavaScript errors");

    await page.close();
  }

  console.log("\nProduction browser smoke checks: " + passed + " passed, 0 failed");
} finally {
  await browser.close();
}
