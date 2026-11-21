import { t } from "./i18n.js";

(() => {
  // Weather is a standalone page; do not run this module elsewhere.
  if ((location.pathname.split("/").pop() || "").toLowerCase() !== "weather.html") return;

  const API_KEY = import.meta.env.VITE_WEATHERAPI_KEY?.trim() ?? "";
  const form = document.getElementById("weatherSearchForm");
  const input = document.getElementById("locationInput");
  const searchButton = document.getElementById("getWeatherBtn");
  const locationButton = document.getElementById("useMyLocationBtn");
  const approximateButton = document.getElementById("useApproxLocationBtn");
  const suggestions = document.getElementById("weatherSuggestions");
  const result = document.getElementById("weatherResult");
  const errorBox = document.getElementById("weatherError");
  const status = document.getElementById("weatherStatus");
  const city = document.getElementById("weatherCity");
  const temperature = document.getElementById("weatherTemperature");
  const condition = document.getElementById("weatherCondition");
  const feelsLike = document.getElementById("weatherFeelsLike");
  const details = document.getElementById("weatherDetails");
  const updated = document.getElementById("weatherUpdated");
  const sourceLabel = document.getElementById("weatherSourceLabel");
  const weatherIcon = document.getElementById("weatherIcon");

  if (![form,input,searchButton,locationButton,approximateButton,suggestions,result,errorBox,status,city,temperature,condition,feelsLike,details,updated,sourceLabel,weatherIcon].every(Boolean)) return;

  const API = "https://api.weatherapi.com/v1";
  let searchController = null;
  let weatherController = null;
  let suggestionTimer = null;
  let matches = [];
  let activeIndex = -1;
  let sequence = 0;

  const setStatus = (message) => { status.textContent = message; status.hidden = !message; };
  const clearMessages = () => { errorBox.textContent = ""; errorBox.hidden = true; setStatus(""); };
  const showError = (message) => { errorBox.textContent = message; errorBox.hidden = false; setStatus(""); };
  const setBusy = (busy) => {
    searchButton.disabled = busy;
    locationButton.disabled = busy;
    approximateButton.disabled = busy;
    searchButton.textContent = busy ? t("weather.loading") : t("weather.fetch");
  };
  const label = (place) => [place.name,place.region,place.country].filter(Boolean).join(", ");

  function closeSuggestions() {
    suggestions.replaceChildren();
    suggestions.hidden = true;
    input.setAttribute("aria-expanded","false");
    input.removeAttribute("aria-activedescendant");
    matches = [];
    activeIndex = -1;
  }

  function renderSuggestions(places) {
    closeSuggestions();
    matches = places;
    places.slice(0,7).forEach((place,index) => {
      const li = document.createElement("li");
      const option = document.createElement("button");
      option.type = "button";
      option.className = "weather-suggestion";
      option.id = `weather-suggestion-${index}`;
      option.setAttribute("role","option");
      option.setAttribute("aria-selected","false");
      const name = document.createElement("strong");
      name.textContent = place.name || t("weather.unknownPlace");
      const detail = document.createElement("span");
      detail.textContent = [place.region,place.country].filter(Boolean).join(" · ");
      option.append(name,detail);
      option.addEventListener("click",() => selectPlace(place));
      li.append(option);
      suggestions.append(li);
    });
    if (places.length) {
      suggestions.hidden = false;
      input.setAttribute("aria-expanded","true");
    }
  }

  function focusSuggestion(index) {
    if (!matches.length) return;
    activeIndex = (index + matches.length) % matches.length;
    const options = suggestions.querySelectorAll('[role="option"]');
    options.forEach((option,i) => {
      const selected = i === activeIndex;
      option.setAttribute("aria-selected",String(selected));
      if (selected) {
        input.setAttribute("aria-activedescendant",option.id);
        option.scrollIntoView({block:"nearest"});
      }
    });
  }

  async function request(endpoint, query, signal) {
    if (!API_KEY) throw new Error("not-configured");
    const url = new URL(`${API}/${endpoint}`);
    url.searchParams.set("key",API_KEY);
    url.searchParams.set("q",query);
    if (endpoint === "current.json") url.searchParams.set("aqi","no");
    const response = await fetch(url,{signal,headers:{Accept:"application/json"}});
    const data = await response.json().catch(() => null);
    const code = data?.error?.code;
    if (!response.ok || data?.error) {
      if (code === 1006) throw new Error("place-not-found");
      if ([2006,2007,2008,2009].includes(code)) throw new Error("service-unavailable");
      throw new Error("request-failed");
    }
    return data;
  }

  function detail(labelText,value) {
    const card = document.createElement("div");
    card.className = "weather-detail";
    const name = document.createElement("span");
    name.className = "label";
    name.textContent = labelText;
    const amount = document.createElement("span");
    amount.className = "value";
    amount.textContent = value;
    card.append(name,amount);
    return card;
  }

  function renderWeather(data,source,accuracy) {
    const place = data.location;
    const current = data.current;
    city.textContent = label(place);
    temperature.textContent = `${current.temp_c}°C`;
    condition.textContent = current.condition?.text || t("weather.conditionUnavailable");
    feelsLike.textContent = `${t("weather.feelsLike")}: ${current.feelslike_c}°C`;
    if (current.condition?.icon) {
      weatherIcon.src = current.condition.icon.startsWith("//") ? `https:${current.condition.icon}` : current.condition.icon;
      weatherIcon.alt = current.condition.text || t("weather.weatherIcon");
      weatherIcon.hidden = false;
    } else {
      weatherIcon.removeAttribute("src");
      weatherIcon.hidden = true;
    }
    details.replaceChildren(
      detail(t("weather.humidity"),`${current.humidity}%`),
      detail(t("weather.wind"),`${current.wind_kph} km/h`),
      detail(t("weather.pressure"),`${current.pressure_mb} mb`),
      detail(t("weather.uv"),String(current.uv ?? "—"))
    );
    updated.textContent = place.localtime ? `${t("weather.localTime")}: ${place.localtime}` : "";
    sourceLabel.textContent = source === "device" ? t("weather.deviceLocation")
      : source === "approximate" ? t("weather.approximateLabel") : t("weather.searchResult");
    result.hidden = false;
    if (source === "device" && Number.isFinite(accuracy)) setStatus(t("weather.locationAccuracy",{meters:Math.round(accuracy)}));
    else if (source === "approximate") setStatus(t("weather.approxLocationSuccess"));
    else setStatus("");
  }

  async function fetchWeather(query,source,accuracy = null) {
    const currentSequence = ++sequence;
    weatherController?.abort();
    const controller = new AbortController();
    weatherController = controller;
    const timeout = setTimeout(() => controller.abort(),12000);
    setBusy(true);
    errorBox.hidden = true;
    setStatus(t("weather.loading"));
    try {
      const data = await request("current.json",query,controller.signal);
      if (currentSequence !== sequence) return false;
      if (!data?.location || !data?.current) throw new Error("request-failed");
      renderWeather(data,source,accuracy);
      return true;
    } catch (error) {
      if (currentSequence !== sequence) return false;
      if (error.name === "AbortError") showError(t("weather.timeout"));
      else if (error.message === "not-configured") showError(t("weather.notConfigured"));
      else if (error.message === "place-not-found") showError(t("weather.placeNotFound"));
      else if (error.message === "service-unavailable") showError(t("weather.serviceUnavailable"));
      else showError(t("weather.fetchFailed"));
      return false;
    } finally {
      clearTimeout(timeout);
      if (currentSequence === sequence) {
        weatherController = null;
        setBusy(false);
      }
    }
  }

  async function searchPlaces(query) {
    if (query.trim().length < 2) { closeSuggestions(); return []; }
    if (!API_KEY) { showError(t("weather.notConfigured")); return []; }
    searchController?.abort();
    const controller = new AbortController();
    searchController = controller;
    const timeout = setTimeout(() => controller.abort(),12000);
    setStatus(t("weather.searchingPlaces"));
    errorBox.hidden = true;
    try {
      const places = await request("search.json",query.trim(),controller.signal);
      if (searchController !== controller) return [];
      const found = Array.isArray(places) ? places.filter(p => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon))) : [];
      renderSuggestions(found.slice(0,7));
      setStatus(found.length ? t("weather.chooseMatch") : t("weather.noPlacesFound"));
      return found;
    } catch (error) {
      if (searchController !== controller || error.name === "AbortError") return [];
      closeSuggestions();
      showError(error.message === "service-unavailable" ? t("weather.serviceUnavailable") : t("weather.searchFailed"));
      return [];
    } finally {
      clearTimeout(timeout);
      if (searchController === controller) searchController = null;
    }
  }

  async function selectPlace(place) {
    closeSuggestions();
    input.value = label(place);
    await fetchWeather(`${place.lat},${place.lon}`,"search");
  }

  function getPosition(options) {
    return new Promise((resolve,reject) => navigator.geolocation.getCurrentPosition(resolve,reject,options));
  }

  async function useDeviceLocation() {
    clearMessages();
    closeSuggestions();
    if (!isSecureContext) { showError(t("weather.insecureContext")); return; }
    if (!navigator.geolocation?.getCurrentPosition) { showError(t("weather.geolocationUnsupported")); return; }

    setBusy(true);
    setStatus(t("weather.locatingWeather"));
    try {
      // Weather only needs a useful nearby location, not turn-by-turn GPS precision.
      // Ask the browser for its network-assisted/cached position first. High-accuracy
      // GPS can take 10–20 seconds on desktop PCs that have no GPS hardware.
      // A short timeout keeps the button responsive; users can retry or choose the
      // clearly-labelled approximate-IP option if their browser cannot locate them.
      const position = await getPosition({
        enableHighAccuracy: false,
        timeout: 6000,
        maximumAge: 300000,
      });
      const {latitude,longitude,accuracy} = position.coords;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error("invalid-position");
      await fetchWeather(`${latitude},${longitude}`,"device",accuracy);
    } catch (error) {
      if (error.code === 1) showError(t("weather.locationDenied"));
      else if (error.code === 3) showError(t("weather.locationTimeout"));
      else showError(t("weather.locationUnavailable"));
    } finally { setBusy(false); }
  }

  form.addEventListener("submit",async event => {
    event.preventDefault();
    const query = input.value.trim();
    if (!query) { showError(t("weather.enterPlace")); return; }
    const found = await searchPlaces(query);
    if (found.length === 1) await selectPlace(found[0]);
    else if (found.length > 1) setStatus(t("weather.chooseMatch"));
  });
  input.addEventListener("input",() => {
    clearTimeout(suggestionTimer);
    const query = input.value.trim();
    if (query.length < 2) { closeSuggestions(); clearMessages(); return; }
    suggestionTimer = setTimeout(() => searchPlaces(query),280);
  });
  input.addEventListener("keydown",async event => {
    if (event.key === "ArrowDown" && matches.length) { event.preventDefault(); focusSuggestion(activeIndex + 1); }
    else if (event.key === "ArrowUp" && matches.length) { event.preventDefault(); focusSuggestion(activeIndex - 1); }
    else if (event.key === "Escape") closeSuggestions();
    else if (event.key === "Enter" && matches.length) {
      event.preventDefault();
      await selectPlace(matches[activeIndex >= 0 ? activeIndex : 0]);
    }
  });
  document.addEventListener("click",event => {
    if (!event.target.closest(".weather-search-control")) closeSuggestions();
  });
  locationButton.addEventListener("click",useDeviceLocation);
  approximateButton.addEventListener("click",async () => {
    clearMessages();
    closeSuggestions();
    await fetchWeather("auto:ip","approximate");
  });
  window.addEventListener("pagehide",() => {
    searchController?.abort();
    weatherController?.abort();
    clearTimeout(suggestionTimer);
  },{once:true});
})();