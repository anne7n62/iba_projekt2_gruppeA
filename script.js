
const apiKey = "328576f875ac77cda31866cea4f13252";

function saveCoords(coords) {
  localStorage.setItem("weather.coords", JSON.stringify(coords));
}

// DOM-elementer
const cityInput = document.getElementById("selectCity");
const geoStatusBtn = document.getElementById("geoStatus");
const form = document.getElementById("weatherForm");
const suggestionBox = document.getElementById("suggestionBox")


// let city = document.getElementById("selectCity").value;
// const api = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;


//Geolokation variabler
// const geoStatusBtn = document.getElementById("geoStatus");
// const form = document.getElementById("weatherForm");
let geoEnabled = false;
let currentCoords = null;
console.log("var current", currentCoords);

      // GEOLOKATION
      document.addEventListener("DOMContentLoaded", () => {
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(success, error, {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 0,
          });
        } else {
          geoStatusBtn.textContent = "Geolokation ikke understøttet";
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

        //knap styling
        geoStatusBtn.textContent = "Automatisk lokation: slået til";
        cityInput.disabled = true;
        
        console.log(`Din position: ${currentCoords.lat.toFixed(
          2
        )}, ${currentCoords.lon.toFixed(2)}`);
      }

      // Geo slået fra i browser: disable knap
      function error() {
        geoEnabled = false;
        currentCoords = null;
        geoStatusBtn.textContent = "Automatisk lokation: slået fra";
        cityInput.disabled = false;
      }


      // -- INDTAST BY SELV
      // TODO - få skrevet frem i en form for dropdown istedet

cityInput.addEventListener("input", async () => {
  const query = cityInput.value.trim();
  if (query.length < 2) {
    suggestionBox.style.display = "none";
    suggestionBox.innerHTML = "";
    return;
  }

  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${apiKey}`;
  const response = await fetch(url);
  const cities = await response.json();

  suggestionBox.innerHTML = "";
  if (cities.length > 0) {
    suggestionBox.style.display = "block";
    cities.forEach(cityItem => {
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


      // Klik på geolokations-knap for at toggle
      geoStatusBtn.addEventListener("click", () => {
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
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (geoEnabled && currentCoords) {
    setWeather(currentCoords);
  } else if (currentCoords) {
    setWeather(currentCoords);
  } else {
    alert("Vælg en by eller slå geolokation til.");
  }

  //     // Gem i localStorage 
//     // localStorage.setItem("køn", køn);
//     // localStorage.setItem("lokation", JSON.stringify(lokation));

  // Gå videre til næste side - sender ikke pt data med.. 
  //window.location.href = "vejret.html";


});



// --- FETCH VEJRET OG UDSKRIV---
async function setWeather(lokation) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lokation.lat}&lon=${lokation.lon}&appid=${apiKey}&units=metric&lang=da`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log("VEJRDATA:", data);
    //vise vejret
    document.getElementById("weatherOutput").textContent =
      `${data.name}: ${data.weather[0].description}, ${data.main.temp}°C`;
  } catch (err) {
    console.error("Fejl ved hentning af vejrdata:", err);
  }
}