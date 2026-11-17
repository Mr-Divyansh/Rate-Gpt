import { t } from "./i18n.js";

(() => {
  if ((window.location.pathname.split("/").pop() || "").toLowerCase() !== "weather.html") return;

  const API_KEY = import.meta.env.VITE_WEATHERAPI_KEY || "c6f1a1969af64489958184521261511";
  const form = document.getElementById("weatherSearchForm");
  const stateSelect = document.getElementById("stateSelect");
  const districtSelect = document.getElementById("districtSelect");
  const cityInput = document.getElementById("cityInput");
  const villageInput = document.getElementById("villageInput");
  const districtField = document.getElementById("districtField");
  const cityField = document.getElementById("cityField");
  const villageField = document.getElementById("villageField");
  const searchButton = document.getElementById("getWeatherBtn");
  const result = document.getElementById("weatherResult");
  const errorBox = document.getElementById("weatherError");
  const status = document.getElementById("weatherStatus");
  const scopeHint = document.getElementById("weatherScopeHint");
  const city = document.getElementById("weatherCity");
  const temperature = document.getElementById("weatherTemperature");
  const condition = document.getElementById("weatherCondition");
  const details = document.getElementById("weatherDetails");
  const updated = document.getElementById("weatherUpdated");
  const weatherIcon = document.getElementById("weatherIcon");

  if (!form || !stateSelect || !districtSelect || !cityInput || !villageInput || !searchButton || !result || !errorBox || !status) return;

  let requestController = null;
  let districtsByState = new Map();
  const setStatus = (message) => { status.textContent = message; status.hidden = !message; };
  const showError = (message) => { errorBox.textContent = message; errorBox.hidden = false; setStatus(""); };
  const clearMessages = () => { errorBox.hidden = true; setStatus(""); };
  const option = (value, label = value) => { const node = document.createElement("option"); node.value = value; node.textContent = label; return node; };

  function addDetail(label, value) {
    const item = document.createElement("div");
    item.className = "weather-detail";
    const name = document.createElement("span");
    name.className = "label";
    name.textContent = label;
    const amount = document.createElement("span");
    amount.className = "value";
    amount.textContent = value;
    item.append(name, amount);
    return item;
  }

  async function loadStates() {
    stateSelect.disabled = true;
    try {
      const response = await fetch("/api/v1/meta/filters", { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("Location directory unavailable");
      const payload = await response.json();
      const states = Array.isArray(payload?.data?.states) ? payload.data.states : [];
      if (!states.length) throw new Error("No states returned");
      stateSelect.replaceChildren(option("", "Select state"), ...states.map((name) => option(name)));
      stateSelect.disabled = false;
    } catch (error) {
      stateSelect.replaceChildren(option("", "Could not load states"));
      showError("State list could not be loaded. Please refresh and try again.");
      console.error("[Weather] State directory failed:", error);
    }
  }

  async function loadDistricts(state) {
    districtSelect.disabled = true;
    districtSelect.replaceChildren(option("", "Loading districts…"));
    try {
      let districts = districtsByState.get(state);
      if (!districts) {
        const url = new URL("/api/v1/meta/filters", window.location.origin);
        url.searchParams.set("state", state);
        const response = await fetch(url, { headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error("District directory unavailable");
        const payload = await response.json();
        districts = Array.isArray(payload?.data?.districts) ? payload.data.districts : [];
        districtsByState.set(state, districts);
      }
      districtSelect.replaceChildren(option("", "Select district"), ...districts.map((name) => option(name)));
      districtSelect.disabled = districts.length === 0;
      if (!districts.length) {
        districtSelect.replaceChildren(option("", "No district list available"));
        showError("District options are unavailable for this state. You can still get state-level weather.");
      }
    } catch (error) {
      districtSelect.replaceChildren(option("", "District list unavailable"));
      districtSelect.disabled = true;
      showError("District list could not be loaded. You can still get state-level weather.");
      console.error("[Weather] District directory failed:", error);
    }
  }

  function currentQuery() {
    const state = stateSelect.value;
    const district = districtSelect.value;
    const cityName = cityInput.value.trim();
    const village = villageInput.value.trim();
    if (!state) return "";
    return [village, cityName, district, state, "India"].filter(Boolean).join(", ");
  }

  function updateScope() {
    const state = stateSelect.value;
    const district = districtSelect.value;
    const cityName = cityInput.value.trim();
    const village = villageInput.value.trim();
    if (!state) {
      scopeHint.textContent = "Choose a state to see its overall weather.";
      searchButton.disabled = true;
      return;
    }
    if (!district) scopeHint.textContent = "Showing broad state-level weather. Select a district for a more local result.";
    else if (!cityName) scopeHint.textContent = "Showing district-level weather. Enter a city or town to narrow it down.";
    else if (!village) scopeHint.textContent = "Showing city-level weather. Add your village name for the most specific available result.";
    else scopeHint.textContent = "Searching for your village within the selected city, district and state.";
    searchButton.disabled = !API_KEY;
  }

  async function fetchWeather(query) {
    if (!query || !API_KEY) {
      showError(!API_KEY ? t("weather.notConfigured") : "Select at least a state.");
      return false;
    }
    requestController?.abort();
    const controller = new AbortController();
    requestController = controller;
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    searchButton.disabled = true;
    searchButton.textContent = "Loading weather…";
    clearMessages();
    setStatus("Finding the closest matching weather location…");
    try {
      const url = new URL("https://api.weatherapi.com/v1/current.json");
      url.searchParams.set("key", API_KEY);
      url.searchParams.set("q", query);
      url.searchParams.set("aqi", "no");
      const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.location || !data?.current) {
        throw new Error(data?.error?.message || `HTTP ${response.status}`);
      }
      const place = data.location;
      const current = data.current;
      city.textContent = [place.name, place.region, place.country].filter(Boolean).join(", ");
      temperature.textContent = `${current.temp_c}°C`;
      condition.textContent = current.condition?.text || "Condition unavailable";
      if (current.condition?.icon) {
        weatherIcon.src = current.condition.icon.startsWith("//") ? `https:${current.condition.icon}` : current.condition.icon;
        weatherIcon.alt = current.condition?.text || "Weather";
        weatherIcon.hidden = false;
      } else {
        weatherIcon.removeAttribute("src");
        weatherIcon.hidden = true;
      }
      details.replaceChildren(
        addDetail(t("weather.feelsLike"), `${current.feelslike_c}°C`),
        addDetail(t("weather.humidity"), `${current.humidity}%`),
        addDetail(t("weather.wind"), `${current.wind_kph} km/h`),
        addDetail(t("weather.pressure"), `${current.pressure_mb} mb`)
      );
      updated.textContent = place.localtime ? `${t("weather.localTime")}: ${place.localtime}` : "";
      result.hidden = false;
      errorBox.hidden = true;
      setStatus(`Weather matched: ${place.name}. ${place.lat != null && place.lon != null ? "Provider location verified." : ""}`);
      return true;
    } catch (error) {
      if (requestController !== controller) return false;
      showError(error?.name === "AbortError" ? "Weather request timed out. Please try again." : "No matching weather location was found. Check the selected district, city and village spelling.");
      console.error("[Weather] Request failed:", error);
      return false;
    } finally {
      window.clearTimeout(timeout);
      if (requestController === controller) {
        requestController = null;
        searchButton.textContent = "Get weather";
        updateScope();
      }
    }
  }

  stateSelect.addEventListener("change", async () => {
    clearMessages();
    districtField.hidden = !stateSelect.value;
    cityField.hidden = true;
    villageField.hidden = true;
    districtSelect.value = "";
    cityInput.value = "";
    villageInput.value = "";
    if (stateSelect.value) await loadDistricts(stateSelect.value);
    updateScope();
  });
  districtSelect.addEventListener("change", () => {
    clearMessages();
    cityField.hidden = !districtSelect.value;
    villageField.hidden = true;
    cityInput.value = "";
    villageInput.value = "";
    updateScope();
  });
  cityInput.addEventListener("input", () => {
    villageField.hidden = !cityInput.value.trim();
    villageInput.value = "";
    updateScope();
  });
  villageInput.addEventListener("input", updateScope);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    fetchWeather(currentQuery());
  });

  loadStates();
})();
