const cityInput = document.getElementById('cityInput');
const getWeatherBtn = document.getElementById('getWeatherBtn');
const weatherInfoDiv = document.getElementById('weatherInfo');
const errorMessageDiv = document.getElementById('errorMessage');
const suggestionsList = document.getElementById('suggestionsList');

const apiKey = '6106d55d1d6137b6f01a702927844c68'; // OpenWeather
const unsplashKey = 'vGJcE5dGPk1tqVPR9V74W2MMy8d0mNMIJACqXdIbmVA'; // Unsplash

let selectedCoords = null; 
let debounceTimer = null;
let activeSuggestionIndex = -1;

function clearSuggestions() {
    suggestionsList.innerHTML = '';
    suggestionsList.classList.remove('show');
    activeSuggestionIndex = -1;
}

// ---- AUTOCOMPLETADO ----
cityInput.addEventListener('input', () => {
    const query = cityInput.value.trim();

    errorMessageDiv.textContent = '';
    selectedCoords = null; 
    clearSuggestions();

    if (query.length < 2) return;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=6&appid=${apiKey}`;

        fetch(geoUrl)
            .then(res => {
                if (!res.ok) throw new Error('Error al solicitar sugerencias');
                return res.json();
            })
            .then(data => {
                clearSuggestions();
                if (!Array.isArray(data) || data.length === 0) return;

                data.forEach(item => {
                    const li = document.createElement('li');
                    li.textContent = `${item.name}${item.state ? ', ' + item.state : ''}, ${item.country}`;
                    li.setAttribute('role', 'option');
                    li.dataset.lat = item.lat;
                    li.dataset.lon = item.lon;
                    li.addEventListener('click', () => {
                        cityInput.value = li.textContent;
                        selectedCoords = { lat: item.lat, lon: item.lon };
                        clearSuggestions();
                        cityInput.focus();
                    });
                    suggestionsList.appendChild(li);
                });

                suggestionsList.classList.add('show');
            })
            .catch(err => console.error('Error al obtener sugerencias:', err));
    }, 300);
});

document.addEventListener('click', (e) => {
    if (!suggestionsList.contains(e.target) && e.target !== cityInput) {
        clearSuggestions();
    }
});

// Navegación con teclado
cityInput.addEventListener('keydown', (e) => {
    const items = suggestionsList.querySelectorAll('li');
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeSuggestionIndex = (activeSuggestionIndex + 1) % items.length;
        updateActive(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeSuggestionIndex = (activeSuggestionIndex - 1 + items.length) % items.length;
        updateActive(items);
    } else if (e.key === 'Enter') {
        if (activeSuggestionIndex >= 0 && items[activeSuggestionIndex]) {
            e.preventDefault();
            items[activeSuggestionIndex].click();
        }
    } else if (e.key === 'Escape') {
        clearSuggestions();
    }
});

function updateActive(items) {
    items.forEach((it, idx) => {
        it.classList.toggle('active', idx === activeSuggestionIndex);
        if (idx === activeSuggestionIndex) {
            it.scrollIntoView({ block: 'nearest' });
        }
    });
}

// ---- OBTENER CLIMA ----
getWeatherBtn.addEventListener('click', () => {
    const cityText = cityInput.value.trim();

    if (!cityText) {
        errorMessageDiv.textContent = 'Por favor, ingresa el nombre de una ciudad.';
        weatherInfoDiv.innerHTML = '';
        weatherInfoDiv.classList.remove('show');
        return;
    }

    let apiUrl = '';
    if (selectedCoords) {
        apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${selectedCoords.lat}&lon=${selectedCoords.lon}&appid=${apiKey}&units=metric&lang=es`;
    } else {
        apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityText)}&appid=${apiKey}&units=metric&lang=es`;
    }

    fetch(apiUrl)
        .then(response => {
            if (!response.ok) throw new Error('Ciudad no encontrada.');
            return response.json();
        })
        .then(data => displayWeather(data))
        .catch(error => {
            console.error('Error fetch:', error);
            errorMessageDiv.textContent = `Error: ${error.message}`;
            weatherInfoDiv.innerHTML = '';
            weatherInfoDiv.classList.remove('show');
        });
});

function displayWeather(data) {
    errorMessageDiv.textContent = '';

    const cityName = data.name;
    const temperature = data.main.temp;
    const humidity = data.main.humidity;
    const windSpeed = data.wind.speed;
    const description = data.weather[0].description;
    const iconCode = data.weather[0].icon;
    const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

    const weatherHTML = `
        <h2>Clima en ${cityName}</h2>
        <img src="${iconUrl}" alt="Ícono del clima" id="weatherIcon">
        <p><strong>Temperatura:</strong> ${temperature.toFixed(1)}°C</p>
        <p><strong>Descripción:</strong> ${description}</p>
        <p><strong>Humedad:</strong> ${humidity}%</p>
        <p><strong>Velocidad del viento:</strong> ${windSpeed} m/s</p>
    `;

    weatherInfoDiv.innerHTML = weatherHTML;
    weatherInfoDiv.classList.add('show');

    const iconImg = document.getElementById('weatherIcon');
    if (iconImg) {
        iconImg.classList.add('animate');
        setTimeout(() => iconImg.classList.remove('animate'), 700);
    }

    // --- CAMBIO DE FONDO POR CIUDAD ---
    setBackground(cityName);
}

// ---- CAMBIO DE FONDO (Unsplash por CIUDAD) ----
async function setBackground(city) {
    try {
        const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(city)}&orientation=landscape&client_id=${unsplashKey}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('No se encontró imagen de la ciudad.');
        const imgData = await res.json();
        const imgUrl = imgData.urls.full;

        document.body.style.backgroundImage = `url(${imgUrl})`;
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";
        document.body.style.transition = "background-image 0.7s ease-in-out";
    } catch (err) {
        console.error('Error Unsplash:', err);
        // fallback genérico
        const fallbackUrl = `https://api.unsplash.com/photos/random?query=city landscape&orientation=landscape&client_id=${unsplashKey}`;
        const res = await fetch(fallbackUrl);
        const imgData = await res.json();
        document.body.style.backgroundImage = `url(${imgData.urls.full})`;
    }
}
