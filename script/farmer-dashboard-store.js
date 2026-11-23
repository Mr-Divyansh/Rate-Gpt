export const FARMER_DASHBOARD_KEY = "rateGptFarmerDashboard.v1";

function emptyData() {
  return { version: 1, favorites: [], scenarios: [] };
}

export function createFarmerDashboardStore(storage) {
  if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") {
    throw new TypeError("A localStorage-compatible storage adapter is required.");
  }

  function read() {
    try {
      const parsed = JSON.parse(storage.getItem(FARMER_DASHBOARD_KEY) || "null");
      if (parsed?.version === 1 && Array.isArray(parsed.favorites) && Array.isArray(parsed.scenarios)) {
        return { version: 1, favorites: parsed.favorites, scenarios: parsed.scenarios };
      }
    } catch {
      // Recover safely from malformed or unavailable local data.
    }
    return emptyData();
  }

  function write(data) {
    storage.setItem(FARMER_DASHBOARD_KEY, JSON.stringify(data));
    return data;
  }

  return {
    list: read,
    saveFavorite(favorite) {
      const state = String(favorite?.state || "").trim();
      const commodity = String(favorite?.commodity || "").trim();
      if (!state || !commodity) return false;
      const district = String(favorite.district || "").trim();
      const market = String(favorite.market || "").trim();
      const id = [state, commodity, district, market].join("::").toLowerCase();
      const data = read();
      const saved = { id, state, commodity, district, market, savedAt: new Date().toISOString() };
      const index = data.favorites.findIndex((item) => item.id === id);
      if (index >= 0) data.favorites[index] = saved;
      else data.favorites.unshift(saved);
      data.favorites = data.favorites.slice(0, 20);
      write(data);
      return saved;
    },
    removeFavorite(id) {
      const data = read();
      data.favorites = data.favorites.filter((item) => item.id !== id);
      write(data);
    },
    saveScenario(scenario) {
      const quantity = Number(scenario?.quantity);
      const modalPrice = Number(scenario?.modalPrice);
      const transportCost = Number(scenario?.transportCost ?? 0);
      const handlingCost = Number(scenario?.handlingCost ?? 0);
      const otherCosts = Number(scenario?.otherCosts ?? 0);
      if (![quantity, modalPrice, transportCost, handlingCost, otherCosts].every(Number.isFinite) ||
          quantity <= 0 || modalPrice < 0 || transportCost < 0 || handlingCost < 0 || otherCosts < 0) {
        return false;
      }
      const data = read();
      const saved = {
        id: scenario.id || "scenario-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
        market: String(scenario.market || "").trim(),
        sourceDate: String(scenario.sourceDate || "").trim(),
        state: String(scenario.state || "").trim(),
        commodity: String(scenario.commodity || "").trim(),
        quantity, modalPrice, transportCost, handlingCost, otherCosts,
        net: quantity * modalPrice - transportCost - handlingCost - otherCosts,
        savedAt: new Date().toISOString(),
      };
      data.scenarios.unshift(saved);
      data.scenarios = data.scenarios.slice(0, 50);
      write(data);
      return saved;
    },
    removeScenario(id) {
      const data = read();
      data.scenarios = data.scenarios.filter((item) => item.id !== id);
      write(data);
    },
    clear() {
      storage.removeItem(FARMER_DASHBOARD_KEY);
    },
  };
}
