export function isRupeesPerQuintal(unit) {
  const normalized = String(unit || "").toLowerCase().replace(/\s+/g, "");
  const rupees = /₹|rs\.?|inr|rupee/.test(normalized);
  const quintal = /quintal|qtl|(^|[^a-z])qt([^a-z]|$)/.test(normalized);
  return rupees && quintal;
}

export function calculateNetProceeds({
  quantity,
  modalPrice,
  transportCost = 0,
  handlingCost = 0,
  otherCosts = 0,
}) {
  const values = [quantity, modalPrice, transportCost, handlingCost, otherCosts];
  if (!values.every((value) => Number.isFinite(value)) ||
      quantity <= 0 || modalPrice < 0 ||
      transportCost < 0 || handlingCost < 0 || otherCosts < 0) {
    return null;
  }
  const gross = quantity * modalPrice;
  const totalCosts = transportCost + handlingCost + otherCosts;
  return {
    gross,
    totalCosts,
    net: gross - totalCosts,
    breakEvenPrice: totalCosts / quantity,
  };
}
