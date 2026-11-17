import { t } from "./i18n.js";

(() => {
  if ((window.location.pathname.split("/").pop() || "").toLowerCase() !== "weather.html") return;

  const API_KEY = import.meta.env.VITE_WEATHERAPI_KEY || "c6f1a1969af64489958184521261511";
  const form = document.getElementById("weatherSearchForm");
  const input = document.getElementById("locationInput");
  const searchButton = document.getElementById("getWeatherBtn");
  const locationButton = document.getElementById("useMyLocationBtn");
  const stopTrackingButton = document.getElementById("stopLocationTrackingBtn");
  const approximateLocationButton = document.getElementById("useApproxLocationBtn");
  const result = document.getElementById("weatherResult");
  const errorBox = document.getElementById("weatherError");
  const status = document.getElementById("weatherStatus");
  const locationMeta = document.getElementById("weatherLocationMeta");
  const city = document.getElementById("weatherCity");
  const temperature = document.getElementById("weatherTemperature");
  const condition = document.getElementById("weatherCondition");
  const details = document.getElementById("weatherDetails");
  const updated = document.getElementById("weatherUpdated");
  const weatherIcon = document.getElementById("weatherIcon");

  if (!form || !input || !searchButton || !locationButton || !stopTrackingButton ||
      !approximateLocationButton || !result || !errorBox || !status || !locationMeta) return;

  const MOVEMENT_THRESHOLD_METRES = 500;
  const MIN_WEATHER_REFRESH_INTERVAL_MS = 15000;
  const HIGH_ACCURACY_OPTIONS = { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 };
  // Wi-Fi/cell-assisted browser location can work on Windows laptops that have
  // no GPS receiver. This is still browser geolocation, never an IP-city guess.
  const BALANCED_ACCURACY_OPTIONS = { enableHighAccuracy: false, timeout: 25000, maximumAge: 60000 };

  let requestController = null;
  let watchId = null;
  let tracking = false;
  let permissionState = "unknown";
  let locationMode = "high";
  let balancedFallbackAttempted = false;
  let latestPosition = null;
  let lastWeatherPosition = null;
  let lastWeatherRefreshAt = 0;
  let pendingRefreshTimer = null;

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

  function setTrackingUi(active) {
    tracking = active;
    locationButton.disabled = active;
    locationButton.hidden = active;
    stopTrackingButton.hidden = !active;
    stopTrackingButton.disabled = false;
    locationMeta.hidden = !active && !locationMeta.textContent;
  }

  function stopTracking({ announce = true } = {}) {
    if (watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
    watchId = null;
    if (pendingRefreshTimer !== null) window.clearTimeout(pendingRefreshTimer);
    pendingRefreshTimer = null;
    latestPosition = null;
    setTrackingUi(false);
    if (announce && trackingWasActive) setStatus(t("weather.trackingStopped"));
    trackingWasActive = false;
  }

  let trackingWasActive = false;

  function distanceMetres(a, b) {
    const radians = (degrees) => degrees * Math.PI / 180;
    const lat1 = radians(a.latitude);
    const lat2 = radians(b.latitude);
    const deltaLat = lat2 - lat1;
    const deltaLon = radians(b.longitude - a.longitude);
    const value = Math.sin(deltaLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
  }

  function updateLocationMeta(position) {
    const accuracy = Number.isFinite(position.coords.accuracy)
      ? Math.max(1, Math.round(position.coords.accuracy))
      : null;
    const time = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .format(new Date(position.timestamp || Date.now()));
    locationMeta.textContent = t("weather.trackingAccuracy", {
      meters: accuracy === null ? "—" : accuracy,
      time
    });
    locationMeta.hidden = false;
  }

  async function fetchWeather(query, source = "search") {
    if (!query || !API_KEY) {
      showError(!API_KEY ? t("weather.notConfigured") : t("weather.enterPlace"));
      return false;
    }
    requestController?.abort();
    const controller = new AbortController();
    requestController = controller;
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    searchButton.disabled = true;
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
      setStatus(source === "location" ? t("weather.trackingActive")
        : source === "approximate" ? t("weather.approxLocationSuccess") : "");
      return true;
    } catch (error) {
      if (requestController !== controller) return false;
      if (error?.name === "AbortError") {
        showError(t("weather.timeout"));
      } else {
        console.error("[Weather] Request failed:", error);
        const apiMessage = error?.message || "";
        showError(/key|api key|access denied|quota|inactive/i.test(apiMessage)
          ? t("weather.serviceUnavailable")
          : t("weather.fetchFailed"));
      }
      return false;
    } finally {
      window.clearTimeout(timeout);
      if (requestController === controller) {
        requestController = null;
        searchButton.disabled = false;
        approximateLocationButton.disabled = false;
        searchButton.textContent = t("weather.fetch");
      }
    }
  }

  function maybeRefreshWeather(position) {
    latestPosition = position;
    if (!lastWeatherPosition) {
      lastWeatherPosition = position.coords;
      lastWeatherRefreshAt = Date.now();
      fetchWeather(`${position.coords.latitude},${position.coords.longitude}`, "location");
      return;
    }

    const moved = distanceMetres(lastWeatherPosition, position.coords);
    if (moved < MOVEMENT_THRESHOLD_METRES || pendingRefreshTimer !== null) return;

    const elapsed = Date.now() - lastWeatherRefreshAt;
    const refresh = () => {
      pendingRefreshTimer = null;
      if (!tracking || !latestPosition) return;
      if (distanceMetres(lastWeatherPosition, latestPosition.coords) < MOVEMENT_THRESHOLD_METRES) return;
      const next = latestPosition;
      lastWeatherPosition = next.coords;
      lastWeatherRefreshAt = Date.now();
      fetchWeather(`${next.coords.latitude},${next.coords.longitude}`, "location");
    };

    if (elapsed >= MIN_WEATHER_REFRESH_INTERVAL_MS) {
      refresh();
    } else {
      pendingRefreshTimer = window.setTimeout(refresh, MIN_WEATHER_REFRESH_INTERVAL_MS - elapsed);
    }
  }

  function getPolicyState() {
    const policy = document.permissionsPolicy || document.featurePolicy;
    if (!policy?.allowsFeature) return "not-exposed";
    try {
      return policy.allowsFeature("geolocation") ? "allowed" : "blocked";
    } catch {
      return "check-failed";
    }
  }

  function locationDiagnostic(error) {
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
  }

  function handlePosition(position) {
    if (!tracking) return;
    updateLocationMeta(position);
    if (lastWeatherPosition) {
      const moved = distanceMetres(lastWeatherPosition, position.coords);
      if (moved < MOVEMENT_THRESHOLD_METRES) {
        setStatus(t("weather.trackingActive"));
        return;
      }
    }
    maybeRefreshWeather(position);
  }

  function handleLocationError(error) {
    if (!tracking) return;
    const detail = locationDiagnostic(error);
    console.warn("[Weather] Device geolocation update failed:", detail);
    if (error.code === 1) {
      stopTracking({ announce: false });
      showError(`${t("weather.locationDenied")} ${detail}`);
      return;
    }

    // First retry through the browser's network-assisted provider. Many Windows
    // laptops have no GPS chip, but Windows can still estimate location via Wi-Fi.
    // This does not use IP geolocation and therefore won't silently show a remote city.
    if ((error.code === 2 || error.code === 3) && locationMode === "high" && !balancedFallbackAttempted) {
      balancedFallbackAttempted = true;
      locationMode = "balanced";
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      watchId = null;
      setStatus("High-accuracy GPS did not respond. Trying Windows/Wi-Fi-assisted location…");
      try {
        watchId = navigator.geolocation.watchPosition(
          handlePosition,
          handleLocationError,
          BALANCED_ACCURACY_OPTIONS
        );
        return;
      } catch (fallbackError) {
        console.warn("[Weather] Balanced geolocation could not start:", fallbackError);
      }
    }

    // Never substitute an IP estimate for the user's live location.
    const message = error.code === 3 ? t("weather.locationTimeout") : t("weather.locationUnavailable");
    showError(`${message} ${detail}`);
  }

  function startTracking() {
    clearMessages();
    if (!window.isSecureContext) {
      showError(t("weather.insecureContext"));
      return;
    }
    if (!navigator.geolocation) {
      showError(t("weather.geolocationUnsupported"));
      return;
    }
    if (tracking) return;

    lastWeatherPosition = null;
    latestPosition = null;
    lastWeatherRefreshAt = 0;
    locationMode = "high";
    balancedFallbackAttempted = false;
    locationMeta.textContent = "";
    locationMeta.hidden = true;
    setTrackingUi(true);
    trackingWasActive = true;
    setStatus(t("weather.trackingWaiting"));

    // Start the native geolocation request synchronously from the user's click
    // so the browser can display its permission prompt without delay.
    if (navigator.permissions?.query) {
      navigator.permissions.query({ name: "geolocation" })
        .then((permission) => { permissionState = permission.state; })
        .catch(() => { permissionState = "query-unavailable"; });
    } else {
      permissionState = "permissions-api-unavailable";
    }

    try {
      watchId = navigator.geolocation.watchPosition(
        handlePosition,
        handleLocationError,
        HIGH_ACCURACY_OPTIONS
      );
    } catch (error) {
      stopTracking({ announce: false });
      const detail = `GPS diagnostic: synchronous-error · permission=${permissionState} · secureContext=${window.isSecureContext} · geolocationPolicy=${getPolicyState()} · browserMessage=${error?.message || "not provided"}`;
      console.error("[Weather] Geolocation could not start:", detail);
      showError(`${t("weather.locationUnavailable")} ${detail}`);
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    stopTracking({ announce: false });
    fetchWeather(input.value.trim());
  });
  locationButton.addEventListener("click", startTracking);
  stopTrackingButton.addEventListener("click", () => stopTracking());
  approximateLocationButton.addEventListener("click", () => {
    stopTracking({ announce: false });
    fetchWeather("auto:ip", "approximate");
  });

  window.addEventListener("pagehide", () => stopTracking({ announce: false }), { once: true });
  window.addEventListener("beforeunload", () => stopTracking({ announce: false }), { once: true });
})();
