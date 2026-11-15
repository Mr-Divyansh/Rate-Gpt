import { t } from "./i18n.js";

// WeatherAPI key from environment
const WEATHERAPI_KEY = import.meta.env.VITE_WEATHERAPI_KEY || "c6f1a1969af64489958184521261511";

// Check if we're on the weather page
const currentPage = window.location.pathname.split("/").pop()?.toLowerCase() || "";

if (currentPage !== "weather.html") {
  // Not on weather page, skip initialization
  return;
}

// DOM elements
const locationInput = document.getElementById("locationInput");
const getWeatherBtn = document.getElementById("getWeatherBtn");
const weatherResult = document.getElementById("weatherResult");
const weatherError = document.getElementById("weatherError");
const weatherCity = document.getElementById("weatherCity");
const weatherTemperature = document.getElementById("weatherTemperature");
const weatherCondition = document.getElementById("weatherCondition");
const weatherDetails = document.getElementById("weatherDetails");

// Fetch weather data
async function fetchWeather(city) {
  const apiUrl = `https://api.weatherapi.com/v1/current.json?key=${WEATHERAPI_KEY}&q=${encodeURIComponent(city)}`;

  try {
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();

    // Update UI with weather data
    weatherCity.textContent = data.location.name + ", " + data.location.region + ", " + data.location.country;
    weatherTemperature.textContent = data.current.temp_c + "°C";
    weatherCondition.textContent = data.current.condition.text;
    
    // Update details
    weatherDetails.innerHTML = `
      <div class="weather-detail">
        <span class="label">Feels like</span>
        <span class="value">${data.current.feelslike_c}°C</span>
      </div>
      <div class="weather-detail">
        <span class="label">Humidity</span>
        <span class="value">${data.current.humidity}%</span>
      </div>
      <div class="weather-detail">
        <span class="label">Wind</span>
        <span class="value">${data.current.wind_kph} km/h</span>
      </div>
      <div class="weather-detail">
        <span class="label">Pressure</span>
        <span class="value">${data.current.pressure_mb} mb</span>
      </div>
    `;

    // Show result, hide error
    weatherResult.hidden = false;
    weatherError.hidden = true;
    locationInput.value = "";

  } catch (error) {
    console.error("Failed to fetch weather:", error);
    
    // Show error, hide result
    weatherError.hidden = false;
    weatherResult.hidden = true;
    
    // Show user-friendly error message
    const errorMsg = navigator.languages && navigator.languages[0] && navigator.languages[0].startsWith('hi')
      ? "Humi sewa nahein ho sakti. Kripya dobara koshish karein."
      : "Weather could not be fetched. Please try again.";
    // We'll just show the default error state
  }
}

// Event handlers
if (getWeatherBtn) {
  getWeatherBtn.addEventListener("click", () => {
    const city = locationInput.value.trim();
    if (city) {
      fetchWeather(city);
    }
  });
}

// Allow pressing Enter in the input field
if (locationInput) {
  locationInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const city = locationInput.value.trim();
      if (city) {
        fetchWeather(city);
      }
    }
  });
}