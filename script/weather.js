import { t } from "./i18n.js";

(() => {
  if ((window.location.pathname.split("/").pop() || "").toLowerCase() !== "weather.html") return;

  const API_KEY = import.meta.env.VITE_WEATHERAPI_KEY || "c6f1a1969af64489958184521261511";
  const form = document.getElementById("weatherSearchForm");
  const input = document.getElementById("locationInput");
  const searchButton = document.getElementById("getWeatherBtn");
  const locationButton = document.getElementById("useMyLocationBtn");
  const result = document.getElementById("weatherResult");
  const errorBox = document.getElementById("weatherError");
  const status = document.getElementById("weatherStatus");
  const city = document.getElementById("weatherCity");
  const temperature = document.getElementById("weatherTemperature");
  const condition = document.getElementById("weatherCondition");
  const details = document.getElementById("weatherDetails");
  const updated = document.getElementById("weatherUpdated");
  const weatherIcon = document.getElementById("weatherIcon");

  if (!form || !input || !searchButton || !locationButton || !result || !errorBox || !status) return;

  let requestController = null;
  const setStatus = (message) => { status.textContent = message; status.hidden = !message; };
  const showError = (message) => {
    errorBox.textContent = message;
    errorBox.hidden = false;
    setStatus("");
  };
  const clearMessages = () => { errorBox.hidden = true; setStatus(""); };

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

  async function fetchWeather(query, source = "search") {
    if (!query || !API_KEY) {
      showError(!API_KEY ? t("weather.notConfigured") : t("weather.enterPlace"));
      return;
    }
    requestController?.abort();
    requestController = new AbortController();
    const timeout = window.setTimeout(() => requestController?.abort(), 12000);
    searchButton.disabled = true;
    locationButton.disabled = true;
    searchButton.textContent = t("weather.loading");
    clearMessages();
    if (source === "location") setStatus(t("weather.locatingWeather"));

    try {
      const url = new URL("https://api.weatherapi.com/v1/current.json");
      url.searchParams.set("key", API_KEY);
      url.searchParams.set("q", query);
      url.searchParams.set("aqi", "no");
      const response = await fetch(url, {
        signal: requestController.signal,
        headers: { Accept: "application/json" }
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.location || !data?.current) {
        const apiMessage = data?.error?.message;
        throw new Error(typeof apiMessage === "string" ? apiMessage : `HTTP ${response.status}`);
      }

      const place = data.location;
      const current = data.current;
      city.textContent = [place.name, place.region, place.country].filter(Boolean).join(", ");
      temperature.textContent = `${current.temp_c}°C`;
      condition.textContent = current.condition?.text || t("weather.conditionUnavailable");
      const iconPath = current.condition?.icon;
      if (iconPath) {
        weatherIcon.src = iconPath.startsWith("//") ? `https:${iconPath}` : iconPath;
        weatherIcon.alt = current.condition?.text || t("weather.weatherIcon");
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
      setStatus(source === "location" ? t("weather.locationSuccess") : "");
    } catch (error) {
      if (error?.name === "AbortError") {
        showError(t("weather.timeout"));
      } else {
        console.error("[Weather] Request failed:", error);
        const apiMessage = error?.message || "";
        showError(/key|api key|access denied|quota|inactive/i.test(apiMessage)
          ? t("weather.serviceUnavailable")
          : t("weather.fetchFailed"));
      }
    } finally {
      window.clearTimeout(timeout);
      searchButton.disabled = false;
      locationButton.disabled = false;
      searchButton.textContent = t("weather.fetch");
    }
  }

  function useMyLocation() {
    clearMessages();
    if (!("geolocation" in navigator)) {
      showError(t("weather.geolocationUnsupported"));
      return;
    }
    locationButton.disabled = true;
    searchButton.disabled = true;
    setStatus(t("weather.requestingLocation"));
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setStatus(t("weather.locatingWeather"));
        fetchWeather(`${coords.latitude},${coords.longitude}`, "location");
      },
      (error) => {
        locationButton.disabled = false;
        searchButton.disabled = false;
        const message = error.code === error.PERMISSION_DENIED
          ? t("weather.locationDenied")
          : error.code === error.TIMEOUT
            ? t("weather.locationTimeout")
            : t("weather.locationUnavailable");
        showError(message);
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }
    );
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    fetchWeather(input.value.trim());
  });
  locationButton.addEventListener("click", useMyLocation);
})();