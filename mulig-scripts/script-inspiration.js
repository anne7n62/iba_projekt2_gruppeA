const apiKey = "328576f875ac77cda31866cea4f13252";
const apiBase = "https://api.openweathermap.org/data/2.5/weather";

const cityInput = document.getElementById("cityInput");
const suggestionList = document.getElementById("suggestionList");
const geoButton = document.getElementById("geoButton");

const cityName = document.getElementById("cityName");
const temperature = document.getElementById("temperature");
const description = document.getElementById("description");
const weatherIcon = document.getElementById("weatherIcon");
const feelsLike = document.getElementById("feelsLike");
const windSpeed = document.getElementById("windSpeed");
const tempMax = document.getElementById("tempMax");
const tempMin = document.getElementById("tempMin");

// Fetch weather by city name
async function fetchWeather(city) {
  try {
    const response = await fetch(`${apiBase}?q=${city}&appid=${apiKey}&units=metric&lang=da`);
    const data = await response.json();

    if (data.cod !== 200) {
      cityName.textContent = "City not found";
      temperature.textContent = "";
      description.textContent = "";
      weatherIcon.src = "";
      feelsLike.textContent = "";
      windSpeed.textContent = "";
      tempMax.textContent = "";
      tempMin.textContent = "";
      return;
    }

    updateWeatherUI(data);
  } catch (error) {
    console.error("Error fetching weather:", error);
  }
}

// Update the UI
function updateWeatherUI(data) {
  cityName.textContent = `${data.name}, ${data.sys.country}`;
  temperature.textContent = `${Math.round(data.main.temp)}°C`;
  description.textContent = data.weather[0].description;
  weatherIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;

  feelsLike.textContent = `${Math.round(data.main.feels_like)}°C`;
  windSpeed.textContent = `${Math.round(data.wind.speed)} m/s`;
  tempMax.textContent = `${Math.round(data.main.temp_max)}°C`;
  tempMin.textContent = `${Math.round(data.main.temp_min)}°C`;
}

// Geolocation
geoButton.addEventListener("click", () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(position => {
      const { latitude, longitude } = position.coords;
      fetch(`${apiBase}?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric&lang=da`)
        .then(res => res.json())
        .then(data => updateWeatherUI(data))
        .catch(err => console.error("Geolocation fetch error:", err));
    });
  } else {
    alert("Geolocation not supported by this browser.");
  }
});

// City suggestions (basic list)
const cities = ["Copenhagen", "Aarhus", "Odense", "Aalborg", "Esbjerg", "Kolding", "Horsens", "Vejle", "Roskilde"];

cityInput.addEventListener("input", () => {
  const query = cityInput.value.toLowerCase();
  suggestionList.innerHTML = "";
  if (!query) {
    suggestionList.style.display = "none";
    return;
  }

  const filteredCities = cities.filter(city => city.toLowerCase().startsWith(query));
  if (filteredCities.length > 0) {
    suggestionList.style.display = "block";
    filteredCities.forEach(city => {
      const li = document.createElement("li");
      li.textContent = city;
      li.addEventListener("click", () => {
        cityInput.value = city;
        suggestionList.style.display = "none";
        fetchWeather(city);
      });
      suggestionList.appendChild(li);
    });
  } else {
    suggestionList.style.display = "none";
  }
});

// Trigger search on Enter key
cityInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    fetchWeather(cityInput.value);
    suggestionList.style.display = "none";
  }
});
