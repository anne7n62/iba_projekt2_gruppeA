const apiKey = "328576f875ac77cda31866cea4f13252";

let geoEnabled = false;
let currentCoords = null;
console.log("var current", currentCoords);
// DOM-elementer
const cityInput = document.getElementById("selectCity");
const geoStatusBtn = document.getElementById("geoStatus");
const form = document.getElementById("weatherForm");
const suggestionBox = document.getElementById("suggestionBox");

function saveCoords(coords) {
  localStorage.setItem("weather.coords", JSON.stringify(coords));
  console.log("setItem, weathercoords", coords);
}

// -- SØG EFTER GEOLOKATION
document.addEventListener("DOMContentLoaded", () => {
  if (!geoStatusBtn || !cityInput) return;
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(success, error, {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0,
    });
  } else {
    geoStatusBtn.textContent = "Automatisk lokation understøttet";
    cityInput.disabled = false;
  }
});

// Geolokation: Modtager koordinator
function success(position) {
  geoEnabled = true;
  currentCoords = {
    lat: position.coords.latitude,
    lon: position.coords.longitude,
  };

  saveCoords(currentCoords);
  geoStatusBtn.textContent = "Automatisk lokation: slået til";
  cityInput.disabled = true;

  console.log(
    `Din position: ${currentCoords.lat.toFixed(2)}, ${currentCoords.lon.toFixed(
      2
    )}`
  );
}

// Geo slået fra i browser: disable knap
function error() {
  geoEnabled = false;
  currentCoords = null;
  geoStatusBtn.textContent = "Automatisk lokation: slået fra";
  cityInput.disabled = false;
}

// -- INDTAST BY SELV - KOM MED FORSLAG
cityInput?.addEventListener("input", async () => {
  const query = cityInput.value.trim();
  if (query.length < 2) {
    suggestionBox.style.display = "none";
    suggestionBox.innerHTML = "";
    return;
  }

  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
    query
  )}&limit=5&appid=${apiKey}`;
  const response = await fetch(url);
  const cities = await response.json();

  //Liste med byforslag
  if (!suggestionBox) return;
  suggestionBox.innerHTML = "";
  if (cities.length > 0) {
    suggestionBox.style.display = "block";
    cities.forEach((cityItem) => {
      const li = document.createElement("li");
      li.textContent = `${cityItem.name}, ${cityItem.country}`;
      li.addEventListener("click", () => {
        cityInput.value = cityItem.name;
        suggestionBox.style.display = "none";
        currentCoords = { lat: cityItem.lat, lon: cityItem.lon };
        saveCoords(currentCoords);
        geoEnabled = false;
        setWeather(currentCoords);
      });
      suggestionBox.appendChild(li);
    });
  } else {
    suggestionBox.style.display = "none";
  }
});

// Hvis man har godkendt geolokation i browser, kan man frit toggle til/fra
geoStatusBtn?.addEventListener("click", () => {
  if (geoEnabled) {
    // slå fra
    geoEnabled = false;
    currentCoords = null;
    geoStatusBtn.textContent = "Automatisk lokation: slået fra";
    cityInput.disabled = false;
  } else {
    // forsøger igen
    geoStatusBtn.textContent = "Geolokation: forsøger...";
    navigator.geolocation.getCurrentPosition(success, error, {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0,
    });
  }
});

// --- FORM SUBMIT ---
form?.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!currentCoords) {
    alert("Vælg en by eller slå geolokation til.");
    return;
  }
  saveCoords(currentCoords);
  window.location.href = "vejret.html";
});

////////////// VEJRET.HTML ///////////////

// DOM
const loader = document.getElementById("loader");
const statusMsg = document.getElementById("statusMsg");
const dateLabel = document.getElementById("dateLabel");
const cityLabel = document.getElementById("cityLabel");
const tempNow = document.getElementById("tempNow");
const tempRange = document.getElementById("tempRange");
const conditionText = document.getElementById("conditionText");
const iconBox = document.getElementById("weatherIcon");

const genderMale = document.getElementById("genderMale");
const genderFemale = document.getElementById("genderFemale");

const outfitList = document.getElementById("outfitList");

genderMale.addEventListener("click", () => {
  genderMale.setAttribute("aria-pressed", "true");
  genderFemale.setAttribute("aria-pressed", "false");
  localStorage.setItem("weather.gender", "mand");
  updateOutfit();
});

genderFemale.addEventListener("click", () => {
  genderMale.setAttribute("aria-pressed", "false");
  genderFemale.setAttribute("aria-pressed", "true");
  localStorage.setItem("weather.gender", "kvinde");
  updateOutfit();
});

(function restoreGender() {
  const savedGender = localStorage.getItem("weather.gender");

  if (savedGender === "kvinde") {
    genderFemale.setAttribute("aria-pressed", "true");
    genderMale.setAttribute("aria-pressed", "false");
  } else {
    genderMale.setAttribute("aria-pressed", "true");
    genderFemale.setAttribute("aria-pressed", "false");
  }
})();

// State
let lastWeather = null;

// Helpers
const round = (n) => Math.round(Number(n));
const formatDate = (d = new Date()) =>
  d.toLocaleDateString("da-DK", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

function loadCoords() {
  const raw = localStorage.getItem("weather.coords");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setLoading(on) {
  if (loader) loader.hidden = !on;
}

function currentGender() {
  return genderFemale.getAttribute("aria-pressed") === "true"
    ? "kvinde"
    : "mand";
}

function updateOutfit() {
  if (!lastWeather) return;
  const temp = lastWeather.main.temp;
  const id = lastWeather.weather[0].id;
  const desc = lastWeather.weather[0].description;
  const type = inferWeatherType(id, desc);

  const outfit = getOutfit(currentGender(), temp, type);
  outfitList.innerHTML = outfit.map((i) => `<li>${i}</li>`).join("");
}

// Ikoner (simplificeret)
const Icons = {
  sun: () => `☀️`,
  cloud: () => `☁️`,
  rain: () => `🌧`,
  snow: () => `🌨`,
  storm: () => `🌪`,
};

function inferWeatherType(id, desc = "") {
  if (id >= 200 && id < 300) return "storm";
  if (id >= 600 && id < 700) return "snow";
  if (id >= 500 && id < 600) return "rain";
  if (id === 800) return "sun";
  if (id > 800) return "cloud";
  const t = desc.toLowerCase();
  if (t.includes("regn")) return "rain";
  if (t.includes("sne")) return "snow";
  if (t.includes("torden")) return "storm";
  if (t.includes("sky")) return "cloud";
  return "sun";
}

// Render UI
function getOutfit(gender, temp, conditionType) {
  const items = [];

  // Temperature rules
  if (temp >= 18) {
    if (gender === "mand") items.push("👕T-shirt", "🩳Shorts");
    else items.push("👗Kjole");
  } else if (temp >= 12) {
    if (gender === "mand")
      items.push("🧥Let jakke", "👔Langærmet bluse", "👖Lange Bukser");
    else
      items.push("🧥Jakke", "👖Lange Bukser eller 👗strømpebukser under kjole");
  } else if (temp >= 5) {
    if (gender === "mand")
      items.push(
        "🧥Varmt overtøj",
        "🧤Vanter",
        "🧣Varmt tøj",
        "🥾Vinterstøvler"
      );
    else
      items.push(
        "🧥Varmt tøj",
        "👚Sweater",
        "👖Lange Bukser eller uld strømpebukser under kjole",
        "🥾Vinterstøvler"
      );
  } else if (temp >= 0) {
    if (gender === "mand")
      items.push("🧥Varmt overtøj", "🧤Vanter & 🧣Tørklæde", "🧶Uld");
    else
      items.push("🧥Varmt overtøj", "🧤Vanter & 🧣Tørlæde", "👖Lange Bukser");
  }

  switch (conditionType) {
    case "sun":
      items.push("Solbriller");
      break;
    case "rain":
      items.push("Regnjakke eller paraply");
      break;
    case "snow":
      items.push("Vinterstøvler");
      break;
  }

  return items;
}

function render(data) {
  const temp = data?.main?.temp;
  const min = data?.main?.temp_min;
  const max = data?.main?.temp_max;
  const w = Array.isArray(data?.weather) ? data.weather[0] : {};
  const id = w?.id ?? 800;
  const desc = w?.description ?? "";
  const type = inferWeatherType(id, desc);

  dateLabel.textContent = formatDate();
  cityLabel.textContent = data?.name ?? "—";
  tempNow.textContent = Number.isFinite(temp) ? `${round(temp)}°C` : "—";
  tempRange.textContent =
    Number.isFinite(min) && Number.isFinite(max)
      ? `Min: ${round(min)}° · Max: ${round(max)}°`
      : "—";
  conditionText.textContent = desc || "—";
  iconBox.textContent = Icons[type] ? Icons[type]() : "🌤";

  lastWeather = data;
  updateOutfit(); // <-- now paints outfit inside the same box
}

// Fetch weather from coords
async function fetchWeather(coords) {
  if (!coords) {
    statusMsg.textContent = "Ingen lokation fundet — gå tilbage.";
    return;
  }

  setLoading(true);
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${apiKey}&units=metric&lang=da`
    );
    const data = await res.json();
    render(data);
  } catch {
    statusMsg.textContent = "Kunne ikke hente vejr ❌";
  }
  setLoading(false);
}

// Init
(function () {
  const coords = loadCoords();
  if (!coords) {
    statusMsg.textContent = "Ingen gemt lokation — vælg på forrige side.";
    return;
  }
  fetchWeather(coords);
})();
