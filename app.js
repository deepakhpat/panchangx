// App State
let db = null;
let selectedDistrictId = 'pune';
let selectedYear = 2026;
let selectedMonth = 5; // June by default (monsoon start)
let activeDateStr = ''; // YYYY-MM-DD
let selectedForecastYear = 2026;
let selectedForecastMonth = 5;
let weatherData = null;

// DOM Elements
const loader = document.getElementById('loader');
const loaderMsg = document.getElementById('loader-msg');
const districtSelect = document.getElementById('district-select');
const geoBtn = document.getElementById('geo-btn');
const forecastMonthSelect = document.getElementById('forecast-month-select');
const forecastYearSelect = document.getElementById('forecast-year-select');
const forecastTableBody = document.getElementById('forecast-table-body');

// Daily Widget Elements
const todayGregorian = document.getElementById('today-gregorian');
const todayMonthPaksha = document.getElementById('today-month-paksha');
const todayTithi = document.getElementById('today-tithi');
const todayTithiEnd = document.getElementById('today-tithi-end');
const todayNakshatra = document.getElementById('today-nakshatra');
const todayNakshatraEnd = document.getElementById('today-nakshatra-end');
const todayYoga = document.getElementById('today-yoga');
const todayKaran = document.getElementById('today-karan');
const todaySunNak = document.getElementById('today-sun-nak');
const todayVahan = document.getElementById('today-vahan');
const todaySunrise = document.getElementById('today-sunrise');
const todaySunset = document.getElementById('today-sunset');
const shakaYear = document.getElementById('shaka-year');

// Weather Elements
const weatherTemp = document.getElementById('weather-temp');
const weatherRainProb = document.getElementById('weather-rain-prob');
const weatherHumidity = document.getElementById('weather-humidity');
const weatherWind = document.getElementById('weather-wind');
const advisoryDate = document.getElementById('advisory-date');

// Advisory Elements
const vahanAlertBlock = document.getElementById('vahan-alert-block');
const vahanIcon = document.getElementById('vahan-icon');
const vahanTitle = document.getElementById('vahan-title');
const vahanDescription = document.getElementById('vahan-description');
const recommendationsList = document.getElementById('recommendations-list');

// Calendar Elements
const currentMonthLabel = document.getElementById('current-month-label');
const prevMonthBtn = document.getElementById('prev-month-btn');
const nextMonthBtn = document.getElementById('next-month-btn');
const calendarGridContainer = document.getElementById('calendar-grid-container');

// Vahan Table Elements
const vahansTableBody = document.getElementById('vahans-table-body');

// Emojis for Vahans
const VAHAN_EMOJIS = {
    "घोडा": "🐎",
    "कोल्हा": "🦊",
    "बेडूक": "🐸",
    "मेंढा": "🐑",
    "मोर": "🦚",
    "उंदीर": "🐭",
    "म्हैस": "🐂",
    "गाढव": "🫏",
    "हत्ती": "🐘",
    "लागू नाही": "🚫"
};

// Weather Code Mapping (WMO codes to Marathi and Emoji)
const WEATHER_CODES = {
    0: { desc: "स्वच्छ आकाश", emoji: "☀️" },
    1: { desc: "मुख्यतः स्वच्छ", emoji: "🌤️" },
    2: { desc: "अंशतः ढगाळ", emoji: "⛅" },
    3: { desc: "ढगाळ हवामान", emoji: "☁️" },
    45: { desc: "धुके", emoji: "🌫️" },
    48: { desc: "धुके (रिमझिम)", emoji: "🌫️" },
    51: { desc: "रिमझिम पाऊस (हलका)", emoji: "🌦️" },
    53: { desc: "रिमझिम पाऊस (मध्यम)", emoji: "🌦️" },
    55: { desc: "रिमझिम पाऊस (दाट)", emoji: "🌦️" },
    61: { desc: "पाऊस (हलका)", emoji: "🌧️" },
    63: { desc: "पाऊस (मध्यम)", emoji: "🌧️" },
    65: { desc: "पाऊस (जोरदार)", emoji: "🌧️" },
    71: { desc: "बर्फवृष्टी (हलकी)", emoji: "🌨️" },
    73: { desc: "बर्फवृष्टी (मध्यम)", emoji: "🌨️" },
    75: { desc: "बर्फवृष्टी (जोरदार)", emoji: "🌨️" },
    80: { desc: "पावसाच्या सरी (हलक्या)", emoji: "🌦️" },
    81: { desc: "पावसाच्या सरी (मध्यम)", emoji: "🌧️" },
    82: { desc: "पावसाच्या सरी (जोरदार/मुसळधार)", emoji: "⛈️" },
    95: { desc: "वादळी पाऊस", emoji: "⛈️" },
    96: { desc: "वादळी पाऊस गारांसह", emoji: "⛈️" },
    99: { desc: "तीव्र वादळी पाऊस गारांसह", emoji: "⛈️" }
};

// Rain level definitions from Vahan
const RAIN_INTENSITIES = {
    "Very Heavy (मुसळधार पाऊस)": "heavy",
    "Heavy (भरपूर पाऊस)": "heavy",
    "Medium (मध्यम पाऊस)": "medium",
    "Very Good (उत्तम पाऊस)": "medium",
    "Low/Uneven (कमी किंवा ओढ देणारा पाऊस)": "low",
    "Low/Crop damage (अल्प पाऊस / उंदरांचा प्रादुर्भाव)": "low",
    "Scant/Dry (अल्प पाऊस / कोरडे हवामान)": "scant",
    "लागू नाही": "none"
};

// Marathi months
const MONTHS_MR = [
    "जानेवारी", "फेब्रुवारी", "मार्च", "एप्रिल", "मे", "जून",
    "जुलै", "ऑगस्ट", "सप्टेंबर", "ऑक्टोबर", "नोव्हेंबर", "डिसेंबर"
];

// Initialize App
async function init() {
    try {
        loaderMsg.textContent = "पंचांग डेटाबेस लोड करत आहे...";
        const response = await fetch('panchang_database.json');
        if (!response.ok) {
            throw new Error("डेटाबेस फाईल सापडली नाही! कृपया आधी डेटाबेस तयार करा.");
        }
        db = await response.json();
        
        // Populate District Dropdown
        districtSelect.innerHTML = '';
        db.districts.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.id;
            opt.textContent = `${d.name_mr} (${d.name_en})`;
            districtSelect.appendChild(opt);
        });
        
        // Setup default date to today or start of 2026 if today is outside database
        const today = new Date();
        const y = today.getFullYear();
        if (y === 2026 || y === 2027) {
            selectedYear = y;
            selectedMonth = today.getMonth();
            activeDateStr = formatDate(today);
        } else {
            selectedYear = 2026;
            selectedMonth = 5; // June 2026
            activeDateStr = "2026-06-01";
        }
        
        selectedDistrictId = districtSelect.value;
        
        // Event Listeners
        districtSelect.addEventListener('change', handleDistrictChange);
        geoBtn.addEventListener('click', handleGeolocation);
        prevMonthBtn.addEventListener('click', () => navigateMonth(-1));
        nextMonthBtn.addEventListener('click', () => navigateMonth(1));
        forecastMonthSelect.addEventListener('change', handleForecastPeriodChange);
        forecastYearSelect.addEventListener('change', handleForecastPeriodChange);

        setupForecastSelectors();
        
        // Initial Render
        await updateDashboard();
        
        // Hide loader
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 500);
        
    } catch (err) {
        console.error(err);
        loaderMsg.innerHTML = `<span style="color:#ff8a80;">त्रुटी: ${err.message}</span>`;
    }
}

// Format Date to YYYY-MM-DD
function formatDate(date) {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
}

// Handle District Dropdown Change
async function handleDistrictChange(e) {
    selectedDistrictId = e.target.value;
    await updateDashboard();
}

// Geolocation Handler
function handleGeolocation() {
    if (!navigator.geolocation) {
        alert("तुमच्या ब्राउझरमध्ये जिओलोकेशन उपलब्ध नाही.");
        return;
    }
    
    geoBtn.disabled = true;
    geoBtn.innerHTML = "🛰️ शोधत आहे...";
    
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            // Find closest district
            let minDistance = Infinity;
            let closestId = 'pune';
            
            db.districts.forEach(d => {
                const dist = Math.hypot(d.lat - lat, d.lon - lon);
                if (dist < minDistance) {
                    minDistance = dist;
                    closestId = d.id;
                }
            });
            
            districtSelect.value = closestId;
            selectedDistrictId = closestId;
            
            alert(`तुमचे स्थान शोधले! सर्वात जवळचा जिल्हा: ${districtSelect.options[districtSelect.selectedIndex].text}`);
            
            geoBtn.disabled = false;
            geoBtn.innerHTML = "🛰️ जवळचे स्थान शोधा";
            await updateDashboard();
        },
        (error) => {
            console.error(error);
            alert("स्थान शोधण्यात अडचण आली. कृपया मॅन्युअली जिल्हा निवडा.");
            geoBtn.disabled = false;
            geoBtn.innerHTML = "🛰️ जवळचे स्थान शोधा";
        }
    );
}

// Navigate Calendar Month
async function navigateMonth(dir) {
    selectedMonth += dir;
    if (selectedMonth > 11) {
        selectedMonth = 0;
        selectedYear++;
    } else if (selectedMonth < 0) {
        selectedMonth = 11;
        selectedYear--;
    }
    
    // Boundary check
    if (selectedYear < 2026) {
        selectedYear = 2026;
        selectedMonth = 0;
    } else if (selectedYear > 2027) {
        selectedYear = 2027;
        selectedMonth = 11;
    }
    
    // Maintain activeDateStr within the selected month if possible, otherwise default to 1st
    const activeDate = new Date(activeDateStr);
    if (activeDate.getFullYear() !== selectedYear || activeDate.getMonth() !== selectedMonth) {
        activeDateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
    }
    
    await updateDashboard();
}

// Fetch Weather Data from Open-Meteo
async function fetchWeather(lat, lon) {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=16&timezone=auto`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("हवामान डेटा लोड करण्यात अडचण आली.");
        return await res.json();
    } catch (err) {
        console.warn("Weather fetch error: ", err);
        return null;
    }
}

// Update App Dashboard
async function updateDashboard() {
    if (!db) return;
    
    const district = db.districts.find(d => d.id === selectedDistrictId);
    if (!district) return;
    
    // Fetch Weather (async in background or wait)
    weatherData = await fetchWeather(district.lat, district.lon);
    
    // Renders
    renderDailyPanchang();
    renderCalendar();
    renderVahanTable();
    renderWeatherAndAdvisory();
    renderForecastTable();
}

// Render Daily Widget Content
function renderDailyPanchang() {
    const record = db.panchang[selectedDistrictId][selectedYear][activeDateStr];
    if (!record) return;
    
    // Set text values
    const dateObj = new Date(activeDateStr);
    todayGregorian.textContent = `${dateObj.getDate()} ${MONTHS_MR[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
    
    shakaYear.textContent = `शके ${record.shaka}`;
    todayMonthPaksha.textContent = `${record.month_mr} - ${record.paksha}`;
    todayTithi.textContent = record.tithi_name;
    todayTithiEnd.textContent = `समाप्ती वेळ: ${record.tithi_end}`;
    todayNakshatra.textContent = record.nak_name;
    todayNakshatraEnd.textContent = `समाप्ती वेळ: ${record.nak_end}`;
    todayYoga.textContent = record.yoga_name;
    todayKaran.textContent = record.karan_name;
    todaySunNak.textContent = record.sun_nak;
    
    const vahanEmoji = VAHAN_EMOJIS[record.vahan] || '🐄';
    todayVahan.textContent = `${vahanEmoji} ${record.vahan}`;
    
    todaySunrise.textContent = record.sunrise;
    todaySunset.textContent = record.sunset;
}

// Render Calendar Widget Grid
function renderCalendar() {
    currentMonthLabel.textContent = `${MONTHS_MR[selectedMonth]} ${selectedYear}`;
    
    // Clear days
    const existingDays = calendarGridContainer.querySelectorAll('.calendar-day, .weekday-header');
    existingDays.forEach(el => {
        if (!el.classList.contains('weekday-header')) el.remove();
    });
    
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const startDayIndex = firstDay.getDay(); // 0 = Sunday, 6 = Saturday
    const totalDays = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    
    // Render Empty Days before first of month
    for (let i = 0; i < startDayIndex; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day empty';
        calendarGridContainer.appendChild(emptyCell);
    }
    
    // Render Month Days
    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
        const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        const record = db.panchang[selectedDistrictId][selectedYear][dateStr];
        
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        if (dateStr === activeDateStr) {
            dayCell.classList.add('today');
        }
        
        dayCell.addEventListener('click', () => {
            const oldToday = calendarGridContainer.querySelector('.calendar-day.today');
            if (oldToday) oldToday.classList.remove('today');
            dayCell.classList.add('today');
            activeDateStr = dateStr;
            updateDashboard();
        });
        
        const numSpan = document.createElement('span');
        numSpan.className = 'day-num';
        numSpan.textContent = dayNum;
        
        const tithiSpan = document.createElement('span');
        tithiSpan.className = 'day-tithi';
        if (record) {
            tithiSpan.textContent = record.tithi_name;
        }
        
        const indicators = document.createElement('div');
        indicators.className = 'day-indicators';
        
        // Rain forecast dot color
        if (record && record.vahan_rain !== "लागू नाही") {
            const dot = document.createElement('div');
            const rainClass = RAIN_INTENSITIES[record.vahan_rain] || 'none';
            if (rainClass !== 'none') {
                dot.className = `indicator-dot rain-${rainClass}`;
                indicators.appendChild(dot);
            }
        }
        
        dayCell.appendChild(numSpan);
        dayCell.appendChild(tithiSpan);
        dayCell.appendChild(indicators);
        
        calendarGridContainer.appendChild(dayCell);
    }
}

// Render Ingress Vahan Table
function renderVahanTable() {
    vahansTableBody.innerHTML = '';
    
    const vahansYear = db.monsoon_vahans[selectedYear];
    if (!vahansYear) return;
    
    Object.keys(vahansYear).forEach(key => {
        const v = vahansYear[key];
        
        const tr = document.createElement('tr');
        
        const tdNak = document.createElement('td');
        tdNak.style.fontWeight = 'bold';
        tdNak.textContent = v.marathi_name;
        
        const tdDate = document.createElement('td');
        tdDate.className = 'date-text';
        const dt = new Date(v.ingress_time_ist);
        tdDate.textContent = `${dt.getDate()} ${MONTHS_MR[dt.getMonth()]} (${dt.getHours()}:${String(dt.getMinutes()).padStart(2, '0')})`;
        
        const tdVahan = document.createElement('td');
        const vEmoji = VAHAN_EMOJIS[v.vahan_marathi] || '🐄';
        const vClass = RAIN_INTENSITIES[v.vahan_rain] || 'none';
        
        const vBadge = document.createElement('span');
        vBadge.className = `vahan-badge ${v.vahan_english.toLowerCase()}`;
        vBadge.innerHTML = `${vEmoji} ${v.vahan_marathi}`;
        tdVahan.appendChild(vBadge);
        
        const tdRain = document.createElement('td');
        tdRain.className = `rain-level ${vClass}`;
        tdRain.textContent = v.vahan_rain.split(' (')[1]?.replace(')', '') || v.vahan_rain;
        
        const tdDesc = document.createElement('td');
        tdDesc.textContent = v.vahan_desc;
        
        tr.appendChild(tdNak);
        tr.appendChild(tdDate);
        tr.appendChild(tdVahan);
        tr.appendChild(tdRain);
        tr.appendChild(tdDesc);
        
        vahansTableBody.appendChild(tr);
    });
}

// Forecast selectors and monthly advisory table
function setupForecastSelectors() {
    forecastMonthSelect.innerHTML = '';
    MONTHS_MR.forEach((label, index) => {
        const opt = document.createElement('option');
        opt.value = index;
        opt.textContent = label;
        forecastMonthSelect.appendChild(opt);
    });

    forecastYearSelect.innerHTML = '';
    const years = Object.keys(db.monsoon_vahans).map(Number).filter(y => y >= 2026 && y <= 2027);
    years.forEach(y => {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        forecastYearSelect.appendChild(opt);
    });

    selectedForecastYear = selectedYear;
    selectedForecastMonth = selectedMonth;
    forecastMonthSelect.value = selectedForecastMonth;
    forecastYearSelect.value = selectedForecastYear;
}

function handleForecastPeriodChange() {
    selectedForecastYear = Number(forecastYearSelect.value);
    selectedForecastMonth = Number(forecastMonthSelect.value);
    renderForecastTable();
}

function getForecastWeatherForDate(dateStr) {
    if (!weatherData || !weatherData.daily || !Array.isArray(weatherData.daily.time)) {
        return null;
    }

    const idx = weatherData.daily.time.indexOf(dateStr);
    if (idx === -1) {
        return null;
    }

    const maxT = weatherData.daily.temperature_2m_max[idx];
    const minT = weatherData.daily.temperature_2m_min[idx];
    const rainProb = weatherData.daily.precipitation_probability_max[idx] || 0;
    const code = weatherData.daily.weathercode[idx];
    const w = WEATHER_CODES[code] || { desc: 'कोरडे हवामान', emoji: '☀️' };
    return {
        tempAvg: Math.round((maxT + minT) / 2),
        tempMax: maxT,
        tempMin: minT,
        rainProbability: rainProb,
        wind: '१०-१५',
        weatherCode: code,
        weatherText: `${w.emoji} ${w.desc}`,
        weatherDesc: w.desc,
        weatherEmoji: w.emoji,
    };
}

function getAgricultureGuidance(record, weather) {
    const adviceItems = [];

    if (!weather) {
        adviceItems.push({
            icon: '🌙',
            label: 'पंचांग',
            text: record.vahan_rain !== 'लागू नाही' ? `वाहनानुसार ${record.vahan_rain} अंदाज आहे.` : 'वाहन माहिती उपलब्ध नाही.'
        });
        adviceItems.push({
            icon: '🌦️',
            label: 'हवामान',
            text: 'हवामान अंदाज उपलब्ध नाही.'
        });
        return adviceItems;
    }

    const avgTemp = weather.tempAvg;
    const rainProb = weather.rainProbability;
    const code = weather.weatherCode;
    const vahanRisk = RAIN_INTENSITIES[record.vahan_rain] || 'none';

    if (rainProb >= 70) {
        adviceItems.push({ icon: '🌧️', label: 'पाऊस', text: 'उच्च पाऊस जोखीम; निचरा व्यवस्थित करा आणि जमीन पाण्याची साचू नये याची काळजी घ्या.' });
        if (avgTemp >= 22 && avgTemp <= 30) {
            adviceItems.push({ icon: '🦠', label: 'रोग', text: 'उत्सर्जित दमटताामुळे फवारणी व पाणीजन्य रोगाचा धोका आहे. पिकाची निरीक्षण करा.' });
        }
        if (avgTemp > 30) {
            adviceItems.push({ icon: '⚠️', label: 'तापमान', text: 'उच्च तापमान व जास्त पाऊसामुळे तणाव-रोगाचा धोका वाढतो. रोगनियंत्रणासाठी नियमित निरीक्षण आवश्यक.' });
        }
    }

    if (rainProb <= 20) {
        if (avgTemp >= 34) {
            adviceItems.push({ icon: '☀️', label: 'शुष्क', text: 'उच्च तापमान आणि कमी पाऊस; दुष्काळाचा ताण आणि कीटकाचा धोका वाढतो. सिंचन व माती ओलावा सुनिश्चित करा.' });
        } else {
            adviceItems.push({ icon: '💧', label: 'ओलावा', text: 'कमी पाऊस; पीकांचे प्रतिकारशक्ति वाढवण्यासाठी मलजल वितरण आणि मातीचा आर्द्रता नियंत्रण करावे.' });
        }
    }

    if (code === 82 || code === 95 || code === 96 || code === 99) {
        adviceItems.push({ icon: '⛈️', label: 'वादळ', text: 'वादळी पावसाची शक्यता आहे; पिकांचे संरक्षण आणि हस्तगत उत्पादने सुरक्षित ठेवा.' });
    }

    if (vahanRisk === 'heavy') {
        adviceItems.push({ icon: '🌙', label: 'पंचांग', text: 'परंपरागत वाहनानुसार मुसळधार पाऊस अपेक्षित आहे; पिकांच्या संरक्षणासाठी त्वरित तयारी करा.' });
    }

    if (vahanRisk === 'low' || vahanRisk === 'scant') {
        adviceItems.push({ icon: '🐛', label: 'कीटक', text: 'पिकांमध्ये कोरडेपणा किंवा कीटकाचा धोका असू शकतो; कीटक नियंत्रण आणि सिंचन योग्य ठिकाणी ठेवा.' });
    }

    if (adviceItems.length === 0) {
        adviceItems.push({ icon: '🌿', label: 'सामान्य', text: 'सामान्य हवामान स्थिती; नियमित निरीक्षण आणि पाण्याचे संतुलन राखा.' });
    }

    return adviceItems;
}

function renderForecastTable() {
    forecastTableBody.innerHTML = '';
    const districtPanchang = db.panchang[selectedDistrictId]?.[String(selectedForecastYear)];
    if (!districtPanchang) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 6;
        td.textContent = 'या वर्षासाठी पंचांग डेटा उपलब्ध नाही.';
        tr.appendChild(td);
        forecastTableBody.appendChild(tr);
        return;
    }

    const daysInMonth = new Date(selectedForecastYear, selectedForecastMonth + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${selectedForecastYear}-${String(selectedForecastMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const record = districtPanchang[dateStr];
        const row = document.createElement('tr');
        if (!record) {
            const td = document.createElement('td');
            td.colSpan = 6;
            td.textContent = `${dateStr} साठी पंचांग डेटा उपलब्ध नाही.`;
            row.appendChild(td);
            forecastTableBody.appendChild(row);
            continue;
        }

        const weather = getForecastWeatherForDate(dateStr);
        const guidance = getAgricultureGuidance(record, weather);

        const tdDate = document.createElement('td');
        tdDate.textContent = `${day} ${MONTHS_MR[selectedForecastMonth]}`;

        const tdTithi = document.createElement('td');
        tdTithi.innerHTML = `${record.tithi_name}<br><strong>${record.nak_name}</strong>`;

        const tdSun = document.createElement('td');
        tdSun.innerHTML = `${record.sunrise} / ${record.sunset}`;

        const tdWeather = document.createElement('td');
        tdWeather.innerHTML = weather ? `${weather.weatherEmoji} ${weather.tempAvg}°C<br>${weather.rainProbability}% पाऊस` : 'हवामान अंदाज उपलब्ध नाही';

        const tdVahan = document.createElement('td');
        tdVahan.innerHTML = `${VAHAN_EMOJIS[record.vahan] || '🚫'} ${record.vahan}<br>${record.vahan_rain}`;

        const tdAdvice = document.createElement('td');
        let adviceHtml = '';

        if (Array.isArray(guidance)) {
            adviceHtml = guidance.map(item => `
                <div class="advice-line">
                    <span class="advice-icon">${item.icon}</span>
                    <span class="advice-label">${item.label}</span>
                    <span class="advice-text">${item.text}</span>
                </div>
            `).join('');
        } else if (typeof guidance === 'string') {
            const lines = guidance.split('<br>');
            adviceHtml = lines.map((line, index) => {
                const icon = index === 0 ? '🌙' : '🌦️';
                const label = index === 0 ? 'पंचांग' : 'हवामान';
                return `
                    <div class="advice-line">
                        <span class="advice-icon">${icon}</span>
                        <span class="advice-label">${label}</span>
                        <span class="advice-text">${line.trim()}</span>
                    </div>
                `;
            }).join('');
        }

        tdAdvice.innerHTML = adviceHtml;

row.appendChild(tdDate);
row.appendChild(tdAdvice);
row.appendChild(tdWeather);
row.appendChild(tdVahan);
row.appendChild(tdTithi);
row.appendChild(tdSun);

        forecastTableBody.appendChild(row);
    }
}

// Render Weather Metrics & Generates Hybrid Advisory
function renderWeatherAndAdvisory() {
    const record = db.panchang[selectedDistrictId][selectedYear][activeDateStr];
    if (!record) return;
    
    // Label header
    const activeDateObj = new Date(activeDateStr);
    const todayStr = formatDate(new Date());
    if (activeDateStr === todayStr) {
        advisoryDate.textContent = "आजचे हवामान व सल्ला";
    } else {
        advisoryDate.textContent = `${activeDateObj.getDate()} ${MONTHS_MR[activeDateObj.getMonth()]} चा अंदाज`;
    }

    // Set Default / Fallback Weather Display
    let temp = '--';
    let humidity = '--';
    let wind = '--';
    let rainProb = 0;
    let weatherCode = null;
    
    // Extract Weather Data from Open-Meteo payload based on activeDateStr
    if (weatherData) {
        const todayStr = formatDate(new Date());
        let dailyIndex = -1;

        if (weatherData.daily && Array.isArray(weatherData.daily.time)) {
            dailyIndex = weatherData.daily.time.indexOf(activeDateStr);
        }

        if (activeDateStr === todayStr && weatherData.current_weather) {
            // Live current weather
            temp = Math.round(weatherData.current_weather.temperature);
            humidity = '--';
            wind = weatherData.current_weather.windspeed;
            weatherCode = weatherData.current_weather.weathercode;

            if (dailyIndex !== -1 && weatherData.daily.precipitation_probability_max) {
                rainProb = weatherData.daily.precipitation_probability_max[dailyIndex] || 0;
            }
        } else if (dailyIndex !== -1) {
            const maxT = weatherData.daily.temperature_2m_max[dailyIndex];
            const minT = weatherData.daily.temperature_2m_min[dailyIndex];
            temp = Math.round((maxT + minT) / 2);
            rainProb = weatherData.daily.precipitation_probability_max[dailyIndex] || 0;
            weatherCode = weatherData.daily.weathercode[dailyIndex];
            humidity = 'साधारण ६०-८०'; // estimated average for daily forecast
            wind = '१०-१५'; // estimated avg
        }
    }
    
    // Display weather metrics
    const wConfig = WEATHER_CODES[weatherCode] || { desc: "कोरडे हवामान", emoji: "☀️" };
    weatherTemp.innerHTML = `${wConfig.emoji} ${temp}°C <span style="font-size:0.75rem; display:block; font-weight:normal;">(${wConfig.desc})</span>`;
    weatherRainProb.textContent = `${rainProb}%`;
    weatherHumidity.textContent = isNaN(humidity) ? humidity : `${humidity}%`;
    weatherWind.textContent = isNaN(wind) ? `${wind} km/h` : `${wind} km/h`;

    if (!weatherData) {
        const fallback = document.createElement('li');
        fallback.textContent = "हवामान सर्व्हर उपलब्ध नाही. कृपया पुन्हा थोड्या वेळात प्रयत्न करा.";
        fallback.className = 'warning';
        recommendationsList.appendChild(fallback);
        return;
    }

    if (!weatherCode && temp === '--') {
        const fallback = document.createElement('li');
        fallback.textContent = "आजच्या हवेचा डेटा पूर्णपणे मिळाला नाही. कृपया पुढील अंदाजासाठी थोड्यावेळाने पहा.";
        fallback.className = 'warning';
        recommendationsList.appendChild(fallback);
        return;
    }

    // Render Vahan Alert block inside Advisory card
    if (record.vahan !== "लागू नाही") {
        vahanAlertBlock.style.display = 'flex';
        const vEmoji = VAHAN_EMOJIS[record.vahan] || '🐘';
        vahanIcon.textContent = vEmoji;
        vahanTitle.textContent = `${record.sun_nak} नक्षत्र: ${record.vahan} वाहन`;
        vahanDescription.textContent = `पारंपरिक भाकीत: ${record.vahan_desc} (${record.vahan_rain})`;
    } else {
        vahanAlertBlock.style.display = 'none';
    }

    // Clean list
    recommendationsList.innerHTML = '';
    
    // Generates advice suggestions array
    const suggestions = [];
    
    // Rule Engine incorporating weather data + traditional vahan forecasts
    const rainLevelType = RAIN_INTENSITIES[record.vahan_rain] || 'none';
    
    // 1. High Rain warnings
    if (rainProb >= 60 || rainLevelType === 'heavy') {
        suggestions.push({
            icon: '🌧️',
            label: 'पाऊस',
            text: "शेतात अतिरिक्त पाणी साचून राहू नये म्हणून पाण्याचा निचरा होण्यासाठी तातडीने चर खोदावेत (Drain excess water).",
            warn: true
        });
        suggestions.push({
            icon: '🧪',
            label: 'फवारणी',
            text: "कीटकनाशकांची फवारणी किंवा खते देण्याची कामे तूर्तास पुढे ढकलावीत, अन्यथा पावसामुळे ते वाहून जाईल (Postpone chemical sprays).",
            warn: true
        });
        suggestions.push({
            icon: '🌾',
            label: 'पीक',
            text: "कापणी केलेले पीक सुरक्षित जागेवर हलवावे किंवा प्लॅस्टिक कागदाने झाकून ठेवावे (Protect harvested crops).",
            warn: true
        });
    }
    
    // 2. Light to Medium Rain
    if ((rainProb > 20 && rainProb < 60) || rainLevelType === 'medium') {
        suggestions.push({
            icon: '🌱',
            label: 'पेरणी',
            text: "पेरणीपूर्व मशागत किंवा पेरणीसाठी अनुकूल काळ आहे. वाफसा तपासूनच बियाणे पेरावे (Suitable for sowing).",
            warn: false
        });
        suggestions.push({
            icon: '🪴',
            label: 'मशागत',
            text: "उगवून आलेल्या कोवळ्या पिकांची आंतरमशागत (कोळपणी/खुरपणी) करावी (Intercultivation/Weeding).",
            warn: false
        });
        suggestions.push({
            icon: '🦠',
            label: 'रोग',
            text: "हवेत दमटपणा वाढल्याने पिकांवर बुरशीजन्य रोगांचा प्रादुर्भाव होऊ शकतो, पानांचे निरीक्षण करावे (Watch for fungal diseases).",
            warn: true
        });
    }

    // 3. Dry Spell / Low Rain
    if (rainProb <= 20 || rainLevelType === 'scant' || rainLevelType === 'low') {
        suggestions.push({
            icon: '💧',
            label: 'सिंचन',
            text: "पावसाची ओढ असल्याने उपलब्ध पाण्याचे नियोजन करा. तुषार (Sprinkler) किंवा ठिबक (Drip) सिंचन पद्धतीचा वापर करावा (Use drip/sprinkler).",
            warn: false
        });
        suggestions.push({
            icon: '🐛',
            label: 'कीटक',
            text: "कोरड्या हवेमुळे पिकांवर रसशोषक किडींचा (मावा, तुडतुडे, फुलकिडे) प्रादुर्भाव वाढण्याची दाट शक्यता आहे. कामगंध सापळे लावावेत (Watch for sucking pests).",
            warn: true
        });
        suggestions.push({
            icon: '🌿',
            label: 'मल्च',
            text: "मातीमधील ओलावा टिकवून ठेवण्यासाठी सेंद्रिय पालापाचोळ्याचे अच्छादन (Mulching) करावे (Implement mulching).",
            warn: false
        });
    }

    // 4. Moon Nakshatra specific agricultural tips
    if (record.nak_name === "रोहिणी" || record.nak_name === "मृगशीर्ष") {
        suggestions.push({
            icon: '🌙',
            label: 'नक्षत्र',
            text: "खरीप हंगामाच्या पिकांसाठी (सोयाबीन, कापूस, बाजरी) गादीवाफ्यावर रोपवाटिका तयार करण्याची ही उत्तम वेळ आहे (Prepare Kharif nurseries).",
            warn: false
        });
    } else if (record.nak_name === "आर्द्रा" || record.nak_name === "पुनर्वसू") {
        suggestions.push({
            icon: '🌾',
            label: 'लागवड',
            text: "भात पुनर्लागवड (Rice transplanting) करण्यासाठी शेतात चिखल करून चोपण तयार ठेवावी.",
            warn: false
        });
    }
    
    // Render recommendations to DOM
    suggestions.forEach(s => {
        const li = document.createElement('li');
        if (s.warn) {
            li.className = 'warning';
        }
        li.innerHTML = `<span class="advice-icon">${s.icon}</span><span class="advice-text">${s.text}</span>`;
        recommendationsList.appendChild(li);
    });
}

// Start application
document.addEventListener('DOMContentLoaded', init);
