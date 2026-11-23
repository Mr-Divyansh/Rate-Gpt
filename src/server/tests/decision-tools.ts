import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateNetProceeds, isRupeesPerQuintal } from "../../../script/decision-tools-core.js";
import { createFarmerDashboardStore, FARMER_DASHBOARD_KEY } from "../../../script/farmer-dashboard-store.js";

assert.equal(isRupeesPerQuintal("Rs/Quintal"), true);
assert.equal(isRupeesPerQuintal("₹ per quintal"), true);
assert.equal(isRupeesPerQuintal("INR/QTL"), true);
assert.equal(isRupeesPerQuintal("Rs/Kg"), false);
assert.equal(isRupeesPerQuintal("Not provided by source"), false);
assert.equal(isRupeesPerQuintal("Quintal"), false);

const estimate = calculateNetProceeds({
  quantity: 10,
  modalPrice: 2100,
  transportCost: 300,
  handlingCost: 100,
  otherCosts: 50,
});
assert.deepEqual(estimate, {
  gross: 21000,
  totalCosts: 450,
  net: 20550,
  breakEvenPrice: 45,
});

assert.equal(calculateNetProceeds({ quantity: 0, modalPrice: 2100 }), null);
assert.equal(calculateNetProceeds({ quantity: 10, modalPrice: -1 }), null);
assert.equal(calculateNetProceeds({ quantity: 10, modalPrice: 2100, otherCosts: -1 }), null);
assert.equal(calculateNetProceeds({ quantity: Number.NaN, modalPrice: 2100 }), null);

const memory = new Map<string, string>();
const mockStorage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => { memory.set(key, value); },
  removeItem: (key: string) => { memory.delete(key); },
};
const dashboardStore = createFarmerDashboardStore(mockStorage);
assert.ok(dashboardStore.saveFavorite({ state: "Himachal Pradesh", commodity: "Apple" }));
assert.equal(dashboardStore.list().favorites.length, 1);
dashboardStore.saveFavorite({ state: "Himachal Pradesh", commodity: "Apple" });
assert.equal(dashboardStore.list().favorites.length, 1);
assert.equal(dashboardStore.saveFavorite({ state: "", commodity: "Apple" }), false);
assert.ok(dashboardStore.saveScenario({
  id: "scenario-test", quantity: 5, modalPrice: 3000, transportCost: 200, handlingCost: 50, otherCosts: 25,
}));
assert.equal(dashboardStore.list().scenarios[0].net, 14725);
assert.equal(dashboardStore.saveScenario({ quantity: -1, modalPrice: 3000 }), false);
dashboardStore.removeFavorite(dashboardStore.list().favorites[0].id);
dashboardStore.removeScenario("scenario-test");
assert.equal(dashboardStore.list().favorites.length + dashboardStore.list().scenarios.length, 0);
dashboardStore.saveFavorite({ state: "Punjab", commodity: "Wheat" });
dashboardStore.clear();
assert.equal(mockStorage.getItem(FARMER_DASHBOARD_KEY), null);
assert.ok(dashboardStore.saveAlert({ state: "Himachal Pradesh", commodity: "Apple", targetPrice: 2500, direction: "above" }));
assert.equal(dashboardStore.list().alerts.length, 1);
assert.equal(dashboardStore.saveAlert({ state: "Himachal Pradesh", commodity: "Apple", targetPrice: -1, direction: "above" }), false);
dashboardStore.removeAlert(dashboardStore.list().alerts[0].id);
assert.equal(dashboardStore.list().alerts.length, 0);
for (let index = 0; index < 25; index += 1) {
  dashboardStore.saveFavorite({ state: "State " + index, commodity: "Crop " + index });
}
assert.equal(dashboardStore.list().favorites.length, 20);
for (let index = 0; index < 55; index += 1) {
  dashboardStore.saveScenario({ id: "limit-" + index, quantity: 1, modalPrice: 100 });
}
assert.equal(dashboardStore.list().scenarios.length, 50);

const manifest = JSON.parse(await readFile("public/manifest.webmanifest", "utf8"));
assert.equal(manifest.display, "standalone");
assert.equal(manifest.scope, "/");
assert.equal(manifest.start_url, "/index.html");
assert.equal(manifest.icons[0].src, "/Images/Logo.webp");

const serviceWorker = await readFile("public/service-worker.js", "utf8");
assert.match(serviceWorker, /url\.pathname\.startsWith\("\/api\/"\)\) return/);
assert.match(serviceWorker, /caches\.match\(OFFLINE_URL\)/);
assert.match(serviceWorker, /"\/style\/offline\.css"/);

const decisionPage = await readFile("decision-tools.html", "utf8");
const dashboardPage = await readFile("farmer-dashboard.html", "utf8");
const dashboardScript = await readFile("script/farmer-dashboard.js", "utf8");
const translations = await readFile("script/i18n.js", "utf8");
const decisionScript = await readFile("script/decision-tools.js", "utf8");
const translationKeys = new Set([
  ...[...decisionPage.matchAll(/data-i18n="([^"]+)"/g)].map((match) => match[1]),
  ...[...decisionPage.matchAll(/data-i18n-attr="[^"]*:([^"]+)"/g)].map((match) => match[1]),
  "decision.district", "decision.districtPlaceholder", "decision.marketFilter", "decision.marketPlaceholder",
  "decision.voiceButton", "decision.voiceUnsupported", "decision.voiceListening", "decision.voiceConfirm", "decision.voiceError", "decision.voiceNote",
  "decision.fetching", "decision.enterBoth", "decision.loaded", "decision.partialSuffix",
  "decision.noRecords", "decision.failed", "decision.invalidCalc", "decision.unitRequired",
  "decision.noComparable", "decision.assistantNeedSearch", "decision.assistantNeedQuantity",
  "decision.assistantUnsupported", "decision.assistantHighest", "decision.assistantTied",
  "decision.breakEven", "decision.assistantCalculation",
  "decision.saveFavorite", "decision.favoriteSaved", "decision.saveScenario", "decision.scenarioSaved",
  "decision.storageUnavailable", "decision.favoriteInvalid", "decision.scenarioInvalid",
  "dashboard.kicker", "dashboard.title", "dashboard.lede", "dashboard.privacy",
  "dashboard.favoritesTitle", "dashboard.favoritesEmpty", "dashboard.scenariosTitle", "dashboard.scenariosEmpty",
  "dashboard.export", "dashboard.clear", "dashboard.confirmClear", "dashboard.deleted",
  "dashboard.market", "dashboard.crop", "dashboard.quantity", "dashboard.price", "dashboard.net",
  "dashboard.sourceDate", "dashboard.remove", "dashboard.exported", "dashboard.exportFailed", "dashboard.storageUnavailable", "nav.dashboard",
  "dashboard.alertsTitle", "dashboard.alertsEmpty", "dashboard.alertState", "dashboard.alertCrop",
  "dashboard.alertDistrict", "dashboard.alertMarket", "dashboard.alertTarget", "dashboard.alertDirection",
  "dashboard.alertAbove", "dashboard.alertBelow", "dashboard.alertCreate", "dashboard.alertNote",
  "dashboard.alertSaved", "dashboard.alertInvalid", "decision.alertMatched", "decision.alertNoMatch",
]);
for (const key of translationKeys) {
  assert.ok(translations.split('"' + key + '":').length - 1 >= 2, "English and Hindi translation exist for " + key);
}
await readFile("Images/Logo.webp");
const offlinePage = await readFile("public/offline.html", "utf8");
assert.doesNotMatch(offlinePage, /\sstyle="/);
assert.match(decisionPage, /id="districtInput"/);
assert.match(decisionPage, /id="saveFavoriteButton"/);
assert.match(decisionPage, /id="saveScenarioButton"/);
assert.match(dashboardPage, /id="dashboardFavorites"/);
assert.match(dashboardPage, /id="priceWatchForm"/);
assert.match(dashboardPage, /id="dashboardAlerts"/);
assert.match(dashboardScript, /store\.saveAlert\(/);
assert.match(decisionPage, /id="priceAlertStatus"/);
assert.match(decisionScript, /checkLocalPriceAlerts\(comparedMarkets\)/);
assert.match(dashboardScript, /store\.clear\(\)/);
assert.match(dashboardScript, /URL\.createObjectURL/);
assert.match(decisionPage, /id="marketInput"/);
assert.match(decisionScript, /params\.set\("district", district\)/);
assert.match(decisionScript, /params\.set\("market", market\)/);
assert.match(decisionPage, /id="voiceCropButton"/);
assert.match(decisionScript, /voiceCropButton\.addEventListener\("click"/);
assert.match(decisionScript, /recognition\.start\(\)/);

console.log("Decision-tools and PWA checks: " + (51 + translationKeys.size) + " passed, 0 failed");
