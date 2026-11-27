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

    try {
      await page.waitForFunction(() => {
        const state = document.querySelector("#stateSelect");
        return state &&
          !state.disabled &&
          Array.from(state.options).some((option) => option.value === "Himachal Pradesh");
      }, null, { timeout: 45_000 });
    } catch (error) {
      throw new Error(
        viewport.name + ": state selector did not initialize; diagnostics=" +
          JSON.stringify({
            pageErrors,
            consoleErrors,
            failedRequests,
            filterResponses,
            stateSelect: await page.locator("#stateSelect").evaluate((element) => ({
              disabled: element.disabled,
              options: Array.from(element.options).map((option) => ({
                value: option.value,
                text: option.textContent,
              })),
            })),
          }) + "; cause=" + error.message,
      );
    }
    pass(viewport.name + ": government state options load");

    const stateFiltersResponsePromise = page.waitForResponse((candidate) => {
      const url = new URL(candidate.url());
      return url.pathname === "/api/v1/meta/filters" &&
        url.searchParams.get("state") === "Himachal Pradesh";
    }, { timeout: 45_000 });
    await page.selectOption("#stateSelect", "Himachal Pradesh");
    let stateFiltersResponse;
    try {
      stateFiltersResponse = await stateFiltersResponsePromise;
    } catch (error) {
      throw new Error(
        viewport.name + ": selecting the state did not trigger its directory request; diagnostics=" +
          JSON.stringify({
            filterResponses,
            pageErrors,
            consoleErrors,
            failedRequests,
            stateValue: await page.locator("#stateSelect").inputValue(),
            districtState: await page.locator("#districtSelect").evaluate((element) => ({
              disabled: element.disabled,
              options: Array.from(element.options).map((option) => option.value),
            })),
          }) + "; cause=" + error.message,
      );
    }
    assert.equal(stateFiltersResponse.status(), 200, viewport.name + ": state directory request must succeed");
    const stateFiltersBody = await stateFiltersResponse.json();
    assert.ok(
      Array.isArray(stateFiltersBody.data?.districts) && stateFiltersBody.data.districts.length > 0,
      viewport.name + ": state directory response must contain districts",
    );

    await page.waitForFunction(() => {
      const district = document.querySelector("#districtSelect");
      return district && !district.disabled && district.options.length > 1;
    }, null, { timeout: 45_000 });

    const districtState = await page.evaluate(() => {
      const district = document.querySelector("#districtSelect");
      return { disabled: district?.disabled ?? true, optionCount: district?.options.length ?? 0 };
    });
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

    // Audit the homepage polish and theme toggle at the same viewport sizes.
    const homePage = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
    });
    const homePageErrors = [];
    homePage.on("pageerror", (error) => homePageErrors.push(error.message));
    await homePage.goto(baseUrl + "/", { waitUntil: "domcontentloaded", timeout: 45_000 });
    await homePage.waitForSelector("[data-theme-toggle]", { timeout: 15_000 });
    await homePage.waitForSelector("footer.site-footer", { timeout: 15_000 });

    const homeVisuals = await homePage.evaluate(() => {
      const hero = document.querySelector(".hero-copy");
      const board = document.querySelector(".page-home .board");
      const heading = document.querySelector(".page-home .board-head h2");
      const footer = document.querySelector("footer.site-footer");
      const placeholderAds = Array.from(document.querySelectorAll(".ad-unit")).filter((unit) =>
        unit.querySelector('.adsbygoogle[data-ad-slot^="placeholder-"]') &&
        getComputedStyle(unit).display !== "none"
      );
      return {
        heroBorderWidth: parseFloat(getComputedStyle(hero).borderTopWidth),
        boardBorderWidth: parseFloat(getComputedStyle(board).borderTopWidth),
        headingGap: parseFloat(getComputedStyle(heading).columnGap),
        footerBackground: getComputedStyle(footer).backgroundImage,
        visiblePlaceholderAds: placeholderAds.length,
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
        theme: document.documentElement.dataset.theme,
      };
    });
    assert.equal(homeVisuals.heroBorderWidth, 0, viewport.name + ": hero copy must not retain a border");
    assert.equal(homeVisuals.boardBorderWidth, 0, viewport.name + ": latest mandi dashboard must not retain a border");
    assert.ok(homeVisuals.headingGap >= 12, viewport.name + ": dashboard icon and title must have breathing room");
    assert.ok(homeVisuals.footerBackground.includes("linear-gradient"), viewport.name + ": footer must use the branded gradient");
    assert.equal(homeVisuals.visiblePlaceholderAds, 0, viewport.name + ": unconfigured ad placeholders must stay hidden");
    assert.equal(homeVisuals.horizontalOverflow, false, viewport.name + ": homepage must fit the viewport");
    pass(viewport.name + ": homepage dashboard, footer and ad-placeholder styles");

    const initialTheme = homeVisuals.theme;
    await homePage.locator("[data-theme-toggle]").click();
    await homePage.waitForFunction((theme) =>
      document.documentElement.dataset.theme !== theme, initialTheme, { timeout: 5_000 });
    const switchedFooterBackground = await homePage.locator("footer.site-footer").evaluate((element) =>
      getComputedStyle(element).backgroundImage
    );
    assert.notEqual(
      switchedFooterBackground,
      homeVisuals.footerBackground,
      viewport.name + ": footer theme must update when the animated theme toggle is used",
    );
    pass(viewport.name + ": animated theme toggle switches the homepage footer theme");
    assert.deepEqual(homePageErrors, [], viewport.name + ": homepage must not emit uncaught browser JavaScript errors");
    await homePage.close();
  }

  // Verify every locally managed commodity photograph is publicly served by the preview.
  const imagePage = await browser.newPage();
  try {
    await imagePage.goto(baseUrl + "/mandi-prices.html", { waitUntil: "domcontentloaded" });
    const imageAudit = await imagePage.evaluate(async () => {
      const manifestResponse = await fetch("/commodity-image-manifest.json", { cache: "no-store" });
      if (!manifestResponse.ok) {
        return { manifestStatus: manifestResponse.status, total: 0, checked: 0, failures: ["manifest HTTP " + manifestResponse.status] };
      }
      const manifest = await manifestResponse.json();
      const entries = (manifest.commodities || []).filter((item) => item.status === "available" && item.image);
      const failures = [];
      let checked = 0;
      for (let offset = 0; offset < entries.length; offset += 12) {
        const batch = entries.slice(offset, offset + 12);
        const results = await Promise.all(batch.map(async (item) => {
          const base = String(manifest.imageBase || "/Images").replace(/\/+$/, "");
          const relative = String(item.image).replace(/^\/+/, "");
          const url = relative.startsWith("Images/") ? "/" + relative : base + "/" + relative;
          try {
            const response = await fetch(url, { method: "HEAD", cache: "no-store" });
            const type = response.headers.get("content-type") || "";
            return { id: item.id, ok: response.ok && type.includes("image/"), status: response.status, type };
          } catch (error) {
            return { id: item.id, ok: false, status: 0, type: String(error) };
          }
        }));
        checked += results.length;
        failures.push(...results.filter((result) => !result.ok));
      }
      return { manifestStatus: manifestResponse.status, total: entries.length, checked, failures };
    });
    assert.equal(imageAudit.manifestStatus, 200, "commodity image manifest must be public");
    assert.equal(imageAudit.total, 147, "all 147 commodity photographs must be listed");
    assert.equal(imageAudit.checked, 147, "all listed commodity images must be checked");
    assert.deepEqual(imageAudit.failures, [], "all commodity image URLs must return successful image responses");
    pass("all 147 deployed commodity photo URLs return HTTP 200 image content");
  } finally {
    await imagePage.close();
  }

  console.log("\nProduction browser smoke checks: " + passed + " passed, 0 failed");
} finally {
  await browser.close();
}
