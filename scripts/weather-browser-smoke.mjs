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
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    });
    await context.grantPermissions(["geolocation"], { origin: baseUrl });
    await context.setGeolocation({ latitude: 31.0, longitude: 76.0 });

    const page = await context.newPage();
    const pageErrors = [];
    const weatherQueries = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.route(
      /^https:\/\/api\.weatherapi\.com\/v1\/current\.json/,
      async (route) => {
        const query = new URL(route.request().url()).searchParams.get("q") || "";
        weatherQueries.push(query);
        const name = query === "auto:ip"
          ? "Approximate City"
          : query.includes(",")
            ? "Dharampur"
            : query;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            location: {
              name,
              region: "Himachal Pradesh",
              country: "India",
              localtime: "2026-11-16 13:00",
            },
            current: {
              temp_c: 23,
              feelslike_c: 24,
              humidity: 48,
              wind_kph: 5,
              pressure_mb: 1012,
              condition: { text: "Clear", icon: "" },
            },
          }),
        });
      },
    );

    const response = await page.goto(baseUrl + "/weather.html", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    assert.equal(response?.status(), 200, viewport.name + ": weather page returns HTTP 200");
    await page.waitForSelector("#useMyLocationBtn");
    assert.equal(weatherQueries.length, 0, viewport.name + ": location is not requested automatically");
    pass(viewport.name + ": weather page opens without silently requesting location");

    await page.locator('[data-lang="hi"]').click();
    await page.waitForFunction(() =>
      document.documentElement.lang === "hi" &&
      document.querySelector("#weatherPageTitle")?.textContent?.trim() === "आपके आस-पास का मौसम",
    );
    await page.locator('[data-lang="en"]').click();
    await page.waitForFunction(() => document.documentElement.lang === "en");
    pass(viewport.name + ": English and Hindi weather translations switch correctly");

    await page.locator("#useMyLocationBtn").click();
    await page.waitForFunction(() =>
      document.querySelector("#weatherCity")?.textContent?.includes("Dharampur") &&
      document.querySelector("#weatherResult")?.hidden === false,
    );
    assert.equal(weatherQueries.at(-1), "31,76", viewport.name + ": device GPS coordinates are sent to the weather lookup");
    assert.match(await page.locator("#weatherStatus").innerText(), /current location/i);
    pass(viewport.name + ": explicit device-location action loads weather from simulated browser coordinates");

    await page.locator("#useApproxLocationBtn").click();
    await page.waitForFunction(() =>
      document.querySelector("#weatherStatus")?.textContent?.toLowerCase().includes("approximate"),
    );
    assert.equal(weatherQueries.at(-1), "auto:ip", viewport.name + ": approximate lookup uses the opt-in IP query");
    assert.match(await page.locator("#weatherCity").innerText(), /Approximate City/);
    pass(viewport.name + ": approximate location works only after the user clicks its separate action");

    await page.locator("#locationInput").fill("Mandi");
    await page.locator("#weatherSearchForm").locator('button[type="submit"]').click();
    await page.waitForFunction(() => document.querySelector("#weatherCity")?.textContent?.includes("Mandi"));
    assert.equal(weatherQueries.at(-1), "Mandi", viewport.name + ": manual city search sends the entered place");
    pass(viewport.name + ": manual weather search works");

    const dimensions = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    }));
    assert.ok(
      dimensions.documentWidth <= dimensions.viewportWidth + 2,
      viewport.name + ": weather page must not overflow horizontally (" +
        dimensions.documentWidth + " > " + dimensions.viewportWidth + ")",
    );
    if (viewport.width <= 720) {
      await page.locator(".menu-toggle").click();
      assert.equal(await page.locator(".menu-toggle").getAttribute("aria-expanded"), "true");
      await page.keyboard.press("Escape");
      assert.equal(await page.locator(".menu-toggle").getAttribute("aria-expanded"), "false");
      pass(viewport.name + ": mobile navigation opens and Escape closes it");
    }
    assert.deepEqual(pageErrors, [], viewport.name + ": weather page must not emit uncaught browser JavaScript errors");
    pass(viewport.name + ": no uncaught browser JavaScript errors");

    await context.close();
  }

  console.log("\nWeather browser checks: " + passed + " passed, 0 failed");
} finally {
  await browser.close();
}
