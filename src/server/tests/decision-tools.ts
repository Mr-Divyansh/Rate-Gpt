import assert from "node:assert/strict";
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

console.log("Decision-tools checks: 11 passed, 0 failed");
