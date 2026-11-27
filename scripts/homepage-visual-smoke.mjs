import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = (process.env.RATE_GPT_BASE_URL || "http://127.0.0.1:4173").replace(/\/+$/, "");
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
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
    });
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    const response = await page.goto(baseUrl + "/", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    assert.equal(response?.status(), 200, viewport.name + ": homepage must return HTTP 200");
    await page.waitForSelector("[data-theme-toggle]", { timeout: 15_000 });
    await page.waitForSelector("footer.site-footer", { timeout: 15_000 });
    const skipWelcome = page.locator(".onboarding-skip");
    if (await skipWelcome.count()) {
      await skipWelcome.click();
      await page.locator(".onboarding-dialog").waitFor({ state: "detached", timeout: 5_000 });
    }

    const visual = await page.evaluate(() => {
      const hero = document.querySelector(".hero-copy");
      const board = document.querySelector(".page-home .board");
      const heading = document.querySelector(".page-home .board-head h2");
      const footer = document.querySelector("footer.site-footer");
      const placeholders = Array.from(document.querySelectorAll(".ad-unit")).filter((unit) =>
        unit.querySelector('.adsbygoogle[data-ad-slot^="placeholder-"]') &&
        getComputedStyle(unit).display !== "none"
      );
      return {
        heroBorder: parseFloat(getComputedStyle(hero).borderTopWidth),
        boardBorder: parseFloat(getComputedStyle(board).borderTopWidth),
        headingGap: parseFloat(getComputedStyle(heading).columnGap),
        footerBackground: getComputedStyle(footer).backgroundImage,
        visiblePlaceholderAds: placeholders.length,
        documentWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        viewportWidth: document.documentElement.clientWidth,
        theme: document.documentElement.dataset.theme,
      };
    });

    assert.equal(visual.heroBorder, 0, viewport.name + ": hero copy must have no residual border");
    assert.equal(visual.boardBorder, 0, viewport.name + ": dashboard must have no visible outer border");
    assert.ok(visual.headingGap >= 12, viewport.name + ": dashboard icon and title must have clear spacing");
    assert.ok(visual.footerBackground.includes("linear-gradient"), viewport.name + ": footer must use the branded gradient");
    assert.equal(visual.visiblePlaceholderAds, 0, viewport.name + ": unconfigured AdSense placeholders must be hidden");
    assert.ok(
      visual.documentWidth <= visual.viewportWidth + 2,
      viewport.name + ": homepage must not overflow horizontally",
    );
    pass(viewport.name + ": homepage borders, heading spacing, footer, ads and responsive width");

    const initialTheme = visual.theme;
    await page.locator("[data-theme-toggle]").click();
    await page.waitForFunction(
      (theme) => document.documentElement.dataset.theme !== theme,
      initialTheme,
      { timeout: 5_000 },
    );
    const switchedFooter = await page.locator("footer.site-footer").evaluate((element) =>
      getComputedStyle(element).backgroundImage
    );
    assert.notEqual(
      switchedFooter,
      visual.footerBackground,
      viewport.name + ": footer surface must update with the animated theme toggle",
    );
    pass(viewport.name + ": theme toggle updates the footer surface");
    assert.deepEqual(pageErrors, [], viewport.name + ": homepage must not emit uncaught JavaScript errors");
    await page.close();
  }

  console.log("\nHomepage visual smoke checks: " + passed + " passed, 0 failed");
} finally {
  await browser.close();
}
