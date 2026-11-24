import { createFarmerDashboardStore } from "./farmer-dashboard-store.js";
import { getLocale, onLangChange, t } from "./i18n.js";

const favoritesList = document.querySelector("#dashboardFavorites");
const scenariosList = document.querySelector("#dashboardScenarios");
const favoritesEmpty = document.querySelector("#favoritesEmpty");
const scenariosEmpty = document.querySelector("#scenariosEmpty");
const alertsList = document.querySelector("#dashboardAlerts");
const alertsEmpty = document.querySelector("#alertsEmpty");
const alertForm = document.querySelector("#priceWatchForm");
const status = document.querySelector("#dashboardStatus");
const exportButton = document.querySelector("#exportDashboardButton");
const clearButton = document.querySelector("#clearDashboardButton");
let store = null;
try {
  store = createFarmerDashboardStore(window.localStorage);
} catch {
  status.textContent = t("dashboard.storageUnavailable");
  exportButton.disabled = true;
  clearButton.disabled = true;
}
if (!store) {
  exportButton.disabled = true;
  clearButton.disabled = true;
  alertForm?.querySelectorAll("input,select,button").forEach((control) => { control.disabled = true; });
  store = {
    list: () => ({ version: 1, favorites: [], scenarios: [], alerts: [] }),
    removeFavorite: () => {},
    removeScenario: () => {},
    removeAlert: () => {},
    clear: () => {},
  };
}

const copy = (en, hi) => getLocale() === "hi-IN" ? hi : en;
const money = (value) => new Intl.NumberFormat(getLocale(), {
  style: "currency", currency: "INR", maximumFractionDigits: 2,
}).format(value);

function makeRemoveButton(label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "dashboard-remove";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function render() {
  const data = store.list();
  favoritesList.replaceChildren();
  scenariosList.replaceChildren();
  alertsList.replaceChildren();
  favoritesEmpty.hidden = data.favorites.length > 0;
  scenariosEmpty.hidden = data.scenarios.length > 0;
  alertsEmpty.hidden = data.alerts.length > 0;

  data.favorites.forEach((favorite) => {
    const item = document.createElement("li");
    item.className = "dashboard-favorite";
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = favorite.commodity + " · " + favorite.state;
    const details = document.createElement("p");
    details.textContent = [favorite.district, favorite.market].filter(Boolean).join(" · ") || t("dashboard.market") + ": —";
    copy.append(title, details);
    const remove = makeRemoveButton(t("dashboard.remove"), () => {
      store.removeFavorite(favorite.id);
      render();
    });
    item.append(copy, remove);
    favoritesList.append(item);
  });

  data.alerts.forEach((alert) => {
    const item = document.createElement("li");
    item.className = "dashboard-favorite";
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = alert.commodity + " · " + alert.state;
    const details = document.createElement("p");
    const direction = alert.direction === "above" ? t("dashboard.alertAbove") : t("dashboard.alertBelow");
    details.textContent = [alert.district, alert.market, direction, money(alert.targetPrice) + "/qtl"].filter(Boolean).join(" · ");
    copy.append(title, details);
    const remove = makeRemoveButton(t("dashboard.remove"), () => {
      store.removeAlert(alert.id);
      render();
    });
    item.append(copy, remove);
    alertsList.append(item);
  });

  data.scenarios.forEach((scenario) => {
    const card = document.createElement("article");
    card.className = "dashboard-scenario";
    const title = document.createElement("strong");
    title.textContent = [scenario.commodity || copy("Manual scenario", "मैन्युअल अनुमान"), scenario.market || copy("Manual estimate", "मैन्युअल गणना")].join(" · ");
    const meta = document.createElement("p");
    meta.textContent = t("dashboard.quantity") + ": " + scenario.quantity + " qtl · " +
      t("dashboard.price") + ": " + money(scenario.modalPrice) + "/qtl";
    const costs = document.createElement("p");
    costs.textContent = copy("Transport ", "ढुलाई ") + money(scenario.transportCost) + copy(" · Handling ", " · हैंडलिंग ") +
      money(scenario.handlingCost) + copy(" · Other ", " · अन्य ") + money(scenario.otherCosts);
    const sourceDate = document.createElement("p");
    sourceDate.textContent = t("dashboard.sourceDate") + ": " + (scenario.sourceDate || "—");
    const net = document.createElement("p");
    net.className = "scenario-net";
    net.textContent = t("dashboard.net") + ": " + money(scenario.net);
    const remove = makeRemoveButton(t("dashboard.remove"), () => {
      store.removeScenario(scenario.id);
      render();
    });
    card.append(title, meta, costs, sourceDate, net, remove);
    scenariosList.append(card);
  });
}

alertForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    const saved = store.saveAlert({
      state: document.querySelector("#alertState").value,
      commodity: document.querySelector("#alertCrop").value,
      district: document.querySelector("#alertDistrict").value,
      market: document.querySelector("#alertMarket").value,
      targetPrice: Number(document.querySelector("#alertTarget").value),
      direction: document.querySelector("#alertDirection").value,
    });
    status.textContent = saved ? t("dashboard.alertSaved") : t("dashboard.alertInvalid");
    if (saved) {
      alertForm.reset();
      document.querySelector("#alertState").value = "Himachal Pradesh";
      render();
    }
  } catch {
    status.textContent = t("dashboard.storageUnavailable");
  }
});

exportButton.addEventListener("click", () => {
  try {
    const data = store.list();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "rate-gpt-farmer-dashboard.json";
    link.click();
    URL.revokeObjectURL(url);
    status.textContent = t("dashboard.exported");
  } catch {
    status.textContent = t("dashboard.exportFailed");
  }
});

clearButton.addEventListener("click", () => {
  if (!window.confirm(t("dashboard.confirmClear"))) return;
  store.clear();
  status.textContent = t("dashboard.deleted");
  render();
});

onLangChange(render);
render();
