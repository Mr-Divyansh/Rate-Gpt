import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = (process.env.RATE_GPT_BASE_URL || "http://127.0.0.1:4173").replace(/\/+$/, "");
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.route("**/api/v1/prices**", async (route) => {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: [{
        state: "Himachal Pradesh",
        district: "Mandi",
        market: "Mandi",
        arrival_date: "2026-11-23",
        modal_price: 3000,
        source_unit: "Rs/Quintal",
      }],
      meta: { source: "AGMARKNET", fetchedAt: "2026-11-23T12:00:00Z", hasNext: false },
    }),
  });
});

try {
  const decisionResponse = await page.goto(baseUrl + "/decision-tools.html", { waitUntil: "domcontentloaded" });
  assert.equal(decisionResponse?.status(), 200);
  await page.locator("#stateInput").fill("Himachal Pradesh");
  await page.locator("#cropInput").fill("Apple");
  await page.locator("#districtInput").fill("Mandi");
  await page.locator("#saveFavoriteButton").click();
  await page.waitForFunction(() => document.querySelector("#searchStatus")?.textContent?.includes("saved on this device"));

  await page.locator("#quantityInput").fill("5");
  await page.locator("#priceInput").fill("3000");
  await page.locator("#transportCostInput").fill("200");
  await page.locator("#handlingCostInput").fill("50");
  await page.locator("#costInput").fill("25");
  await page.locator("#saveScenarioButton").click();
  await page.waitForFunction(() => document.querySelector("#searchStatus")?.textContent?.includes("Scenario saved"));

  const dashboardResponse = await page.goto(baseUrl + "/farmer-dashboard.html", { waitUntil: "domcontentloaded" });
  assert.equal(dashboardResponse?.status(), 200);
  await page.waitForFunction(() => document.querySelectorAll("#dashboardFavorites li").length === 1);
  await page.waitForFunction(() => document.querySelectorAll("#dashboardScenarios .dashboard-scenario").length === 1);
  assert.match(await page.locator("#dashboardScenarios").innerText(), /₹14,725/);

  await page.locator("#alertCrop").fill("Apple");
  await page.locator("#alertDistrict").fill("Mandi");
  await page.locator("#alertTarget").fill("2500");
  await page.locator("#alertDirection").selectOption("above");
  await page.locator("#priceWatchForm button[type=submit]").click();
  await page.waitForFunction(() => document.querySelectorAll("#dashboardAlerts li").length === 1);
  await page.goto(baseUrl + "/decision-tools.html", { waitUntil: "domcontentloaded" });
  await page.locator("#stateInput").fill("Himachal Pradesh");
  await page.locator("#cropInput").fill("Apple");
  await page.locator("#districtInput").fill("Mandi");
  await page.locator("#searchButton").click();
  await page.waitForFunction(() => document.querySelector("#priceAlertStatus")?.textContent?.includes("Mandi"));
  assert.match(await page.locator("#priceAlertStatus").innerText(), /3,000/);
  await page.goto(baseUrl + "/farmer-dashboard.html", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelectorAll("#dashboardAlerts li").length === 1);
  console.log("PASS saved price watches match only returned comparable mandi observations");
  console.log("PASS saved crop searches and calculator scenarios persist on this device");

  const downloadPromise = page.waitForEvent("download");
  await page.locator("#exportDashboardButton").click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), "rate-gpt-farmer-dashboard.json");
  console.log("PASS dashboard data can be exported");

  await page.locator("#dashboardFavorites button").first().click();
  await page.waitForFunction(() => document.querySelectorAll("#dashboardFavorites li").length === 0);
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#clearDashboardButton").click();
  await page.waitForFunction(() => document.querySelectorAll("#dashboardScenarios .dashboard-scenario").length === 0);
  console.log("PASS individual removal and clear-all controls work");

  assert.deepEqual(errors, []);
  console.log("Farmer dashboard browser checks: 3 passed, 0 failed");
} finally {
  await context.close();
  await browser.close();
}
