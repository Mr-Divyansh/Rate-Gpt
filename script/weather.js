import { t } from "./i18n.js";

(() => {
  const currentPage = window.location.pathname.split("/").pop()?.toLowerCase() || "";
  if (currentPage !== "weather.html") return;

  const WEATHERAPI_KEY = import.meta.env.VITE_WEATHERAPI_KEY || "c6f1a1969af64489958184521261511";
  const locationInput = document.getElementById("locationInput");
  const getWeatherBtn = document.getElementById("getWeatherBtn");
  const weatherResult = document.getElementById("weatherResult");
  const weatherError = document.getElementById("weatherError");
  const weatherCity = document.getElementById("weatherCity");
  const weatherTemperature = document.getElementById("weatherTemperature");
  const weatherCondition = document.getElementById("weatherCondition");
  const weatherDetails = document.getElementById("weatherDetails");

  if (!locationInput || !getWeatherBtn || !weatherResult || !weatherError ||
      !weatherCity || !weatherTemperature || !weatherCondition || !weatherDetails) return;

  const defaultButtonText = getWeatherBtn.textContent.trim() || "Get Weather";

  function showError(message) {
    weatherError.textContent = message;
    weatherError.hidden = false;
    weatherResult.hidden = true;
  }

  function addDetail(label, value) {
    const item = document.createElement("div");
    item.className = "weather-detail";
    const name = document.createElement("span");
    name.className = "label";
    name.textContent = label;
    const result = document.createElement("span");
    result.className = "value";
    result.textContent = value;
    item.append(name, result);
    return item;
  }

  async function fetchWeather(city) {
    if (!city) {
      showError("Please enter a city or district name.");
      return;
    }
    if (!WEATHERAPI_KEY) {
      showError("Weather service is not configured yet. Please try again later.");
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    getWeatherBtn.disabled = true;
    getWeatherBtn.textContent = "Loading…";
    weatherError.hidden = true;

    try {
      const apiUrl = new URL("https://api.weatherapi.com/v1/current.json");
      apiUrl.searchParams.set("key", WEATHERAPI_KEY);
      apiUrl.searchParams.set("q", city);
      apiUrl.searchParams.set("aqi", "no");

      const response = await fetch(apiUrl, { signal: controller.signal, headers: { Accept: "application/json" } });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.location || !data?.current) {
        const reason = data?.error?.message;
        throw new Error(typeof reason === "string" ? reason : `Weather service returned HTTP ${response.status}.`);
      }

      weatherCity.textContent = [data.location.name, data.location.region, data.location.country]
        .filter(Boolean).join(", ");
      weatherTemperature.textContent = `${data.current.temp_c}°C`;
      weatherCondition.textContent = data.current.condition?.text || "Current conditions unavailable";
      weatherDetails.replaceChildren(
        addDetail("Feels like", `${data.current.feelslike_c}°C`),
        addDetail("Humidity", `${data.current.humidity}%`),
        addDetail("Wind", `${data.current.wind_kph} km/h`),
        addDetail("Pressure", `${data.current.pressure_mb} mb`),
      );
      weatherResult.hidden = false;
      weatherError.hidden = true;
      locationInput.value = "";
    } catch (error) {
      console.error("Weather request failed:", error);
      const message = error?.name === "AbortError"
        ? "Weather request timed out. Please try again."
        : /key|api key|access denied|quota|inactive/i.test(error?.message || "")
          ? "Weather service access is unavailable right now. Please try again later."
          : "Weather could not be loaded. Check the location and try again.";
      showError(message);
    } finally {
      window.clearTimeout(timeout);
      getWeatherBtn.disabled = false;
      getWeatherBtn.textContent = defaultButtonText;
    }
  }

  getWeatherBtn.addEventListener("click", () => fetchWeather(locationInput.value.trim()));
  locationInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      fetchWeather(locationInput.value.trim());
    }
  });
})();
