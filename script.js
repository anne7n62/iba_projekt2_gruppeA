const apiKey = "328576f875ac77cda31866cea4f13252";
let city = document.getElementById("selectCity").value;
const api = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;