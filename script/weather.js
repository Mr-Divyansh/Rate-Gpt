import { t } from "./i18n.js";

(() => {
  if ((window.location.pathname.split("/").pop() || "").toLowerCase() !== "weather.html") return;

  const API_KEY = import.meta.env.VITE_WEATHERAPI_KEY || "c6f1a1969af64489958184521261511";
  const form = document.getElementById("weatherSearchForm");
  const input = document.getElementById("locationInput");
  const searchButton = document.getElementById("getWeatherBtn");
  const locationButton = document.getElementById("useMyLocationBtn");
  const approximateLocationButton = document.getElementById("useApproxLocationBtn");
  const result = document.getElementById("weatherResult");
  const errorBox = document.getElementById("weatherError");
  const status = document.getElementById("weatherStatus");
  const city = document.getElementById("weatherCity");
  const temperature = document.getElementById("weatherTemperature");
  const condition = document.getElementById("weatherCondition");
  const details = document.getElementById("weatherDetails");
  const updated = document.getElementById("weatherUpdated");
  const weatherIcon = document.getElementById("weatherIcon");

  if (!form || !input || !searchButton || !locationButton || !approximateLocationButton || !result || !errorBox || !status) return;

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
    const controller = new AbortController();
    requestController = controller;
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    searchButton.disabled = true;
    locationButton.disabled = true;
    approximateLocationButton.disabled = true;
    searchButton.textContent = t("weather.loading");
    clearMessages();
    if (source === "location") setStatus(t("weather.locatingWeather"));

    try {
      const url = new URL("https://api.weatherapi.com/v1/current.json");
      url.searchParams.set("key", API_KEY);
      url.searchParams.set("q", query);
      url.searchParams.set("aqi", "no");
      const response = await fetch(url, {
        signal: controller.signal,
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
      setStatus(source === "location" ? t("weather.locationSuccess")
        : source === "approximate" ? t("weather.approxLocationSuccess") : "");
    } catch (error) {
      // Ignore completion from a superseded request; it must not overwrite
      // the status or results of the newer request.
      if (requestController !== controller) return;
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
      // An older aborted request must not re-enable controls while a newer
      // request is still running.
      if (requestController === controller) {
        requestController = null;
        searchButton.disabled = false;
        locationButton.disabled = false;
        approximateLocationButton.disabled = false;
        searchButton.textContent = t("weather.fetch");
      }
    }
  }

  function useMyLocation() {
    clearMessages();
    if (!window.isSecureContext) {
      showError(t("weather.insecureContext"));
      return;
    }
    if (!navigator.geolocation) {
      showError(t("weather.geolocationUnsupported"));
      return;
    }

    locationButton.disabled = true;
    searchButton.disabled = true;
    setStatus(t("weather.requestingLocation"));

    let permissionState = "unknown";
    const getPolicyState = () => {
      const policy = document.permissionsPolicy || document.featurePolicy;
      if (!policy?.allowsFeature) return "not-exposed";
      try {
        return policy.allowsFeature("geolocation") ? "allowed" : "blocked";
      } catch {
        return "check-failed";
      }
    };
    const finishButtons = () => {
      locationButton.disabled = false;
      approximateLocationButton.disabled = false;
      searchButton.disabled = false;
    };
    const diagnostic = (error) => {
      const reason = error.code === 1 ? "PERMISSION_DENIED"
        : error.code === 2 ? "POSITION_UNAVAILABLE"
          : error.code === 3 ? "TIMEOUT" : "UNKNOWN";
      return [
        `GPS diagnostic: ${reason} (code ${error.code ?? "n/a"})`,
        `permission=${permissionState}`,
        `secureContext=${window.isSecureContext}`,
        `geolocationPolicy=${getPolicyState()}`,
        `browserMessage=${error.message || "not provided"}`
      ].join(" · ");
    };

    const handlePosition = ({ coords }) => {
      finishButtons();
      setStatus(t("weather.locatingWeather"));
      fetchWeather(`${coords.latitude},${coords.longitude}`, "location");
    };
    const handleError = (error) => {
      finishButtons();
      const detail = diagnostic(error);
      console.warn("[Weather] Device geolocation failed:", detail);
      const message = error.code === 1 ? t("weather.locationDenied")
        : error.code === 3 ? t("weather.locationTimeout")
          : t("weather.locationUnavailable");
      showError(`${message} ${detail}`);
    };

    // Read permission state for diagnostics, but never await it before
    // getCurrentPosition: the geolocation request starts directly in the
    // user's click handler so the browser can show its native permission UI.
    if (navigator.permissions?.query) {
      navigator.permissions.query({ name: "geolocation" })
        .then((permission) => { permissionState = permission.state; })
        .catch(() => { permissionState = "query-unavailable"; });
    } else {
      permissionState = "permissions-api-unavailable";
    }

    try {
      navigator.geolocation.getCurrentPosition(
        handlePosition,
        handleError,
        { enableHighAccuracy: false, timeout: 45000, maximumAge: 600000 }
      );
    } catch (error) {
      finishButtons();
      const detail = `GPS diagnostic: synchronous-error · permission=${permissionState} · secureContext=${window.isSecureContext} · geolocationPolicy=${getPolicyState()} · browserMessage=${error?.message || "not provided"}`;
      console.error("[Weather] Geolocation could not start:", detail);
      showError(`${t("weather.locationUnavailable")} ${detail}`);
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    fetchWeather(input.value.trim());
  });
  locationButton.addEventListener("click", useMyLocation);
  // WeatherAPI auto:ip is deliberately opt-in and only used after this button
  // is clicked. It is an approximate city-level estimate, not device GPS.
  approximateLocationButton.addEventListener("click", () => {
    fetchWeather("auto:ip", "approximate");
  });
})();