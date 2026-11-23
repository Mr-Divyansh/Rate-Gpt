import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateNetProceeds, isRupeesPerQuintal } from "../../../script/decision-tools-core.js";

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
const translations = await readFile("script/i18n.js", "utf8");
const translationKeys = new Set([
  ...[...decisionPage.matchAll(/data-i18n="([^"]+)"/g)].map((match) => match[1]),
  ...[...decisionPage.matchAll(/data-i18n-attr="[^"]*:([^"]+)"/g)].map((match) => match[1]),
]);
for (const key of translationKeys) {
  assert.ok(translations.split('"' + key + '":').length - 1 >= 2, "English and Hindi translation exist for " + key);
}
const offlinePage = await readFile("public/offline.html", "utf8");
assert.doesNotMatch(offlinePage, /\sstyle="/);

console.log("Decision-tools and PWA checks: " + (19 + translationKeys.size) + " passed, 0 failed");
