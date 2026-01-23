import { BASE_URL, currencyMap } from './config.js';
import '../sass/style.sass';
import { shiftDate, adjustToWorkday, formatDate } from './utils.js';
import { buildCustomSelect, refreshCustomSelect } from './ui.js';

// DOM Elements
const fromSelect = document.getElementById('fromCurrency');
const toSelect = document.getElementById('toCurrency');
const resultContainer = document.getElementById('resultContainer');
const historySection = document.getElementById('historySection');
const histBtnText = document.getElementById('histBtnText');
const errorMsg = document.getElementById('errorMsg');

// State
let lastHistoryPair = "";
let globalCurrentRate = 0;

function init() {
    const sortedCurrencies = Object.entries(currencyMap).sort((a, b) => a[1].name.localeCompare(b[1].name));

    sortedCurrencies.forEach(([code, data]) => {
        fromSelect.add(new Option(data.name, code));
        toSelect.add(new Option(data.name, code));
    });

    fromSelect.value = "USD";
    toSelect.value = "PLN";

    // Callback resetujący widok przy zmianie waluty
    const onSelectionChange = () => {
        resultContainer.style.display = 'none';
        if (historySection.style.display === 'block') {
            historySection.style.display = 'none';
            histBtnText.innerText = "Pokaż historię ceny";
        }
    };

    buildCustomSelect(fromSelect, 'fromCurrency-custom', sortedCurrencies, onSelectionChange);
    buildCustomSelect(toSelect, 'toCurrency-custom', sortedCurrencies, onSelectionChange);

    document.getElementById('convertBtn').addEventListener('click', convertCurrency);
    document.getElementById('swapBtn').addEventListener('click', swapCurrencies);
    document.getElementById('historyBtn').addEventListener('click', toggleHistory);
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // Init Theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('themeToggle').innerText = '☀️';
    }
}

function toggleTheme() {
    const body = document.body;
    const btn = document.getElementById('themeToggle');

    body.classList.toggle('dark-mode');

    if (body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
        btn.innerText = '☀️';
    } else {
        localStorage.setItem('theme', 'light');
        btn.innerText = '🌙';
    }
}

async function convertCurrency() {
    const amount = parseFloat(document.getElementById('amount').value);
    const from = fromSelect.value;
    const to = toSelect.value;

    if (!amount || amount <= 0) {
        document.getElementById('resultValue').innerText = "Podaj kwotę większą od zera";
        document.getElementById('rateInfo').innerText = "";
        resultContainer.style.display = 'block';
        return;
    }

    setLoading(true);
    errorMsg.style.display = 'none';
    resultContainer.style.display = 'none';

    if (historySection.style.display === 'block' && lastHistoryPair !== `${from}-${to}`) {
        historySection.style.display = 'none';
        histBtnText.innerText = "Pokaż historię ceny";
    }

    try {
        if (from === to) {
            globalCurrentRate = 1;
            showResult(amount, 1, from, to);
            return;
        }

        const response = await fetch(`${BASE_URL}/latest?amount=${amount}&from=${from}&to=${to}`);
        const data = await response.json();

        if (!data.rates || !data.rates[to]) throw new Error("Brak kursu");

        const resultVal = data.rates[to];
        globalCurrentRate = resultVal / amount;

        showResult(resultVal, globalCurrentRate, from, to);

    } catch (error) {
        console.error(error);
        errorMsg.innerText = "Błąd połączenia. Sprawdź internet lub spróbuj później.";
        errorMsg.style.display = 'block';
    } finally {
        setLoading(false);
    }
}

function showResult(value, rate, from, to) {
    const formattedValue = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: to }).format(value);
    document.getElementById('resultValue').innerText = formattedValue;
    document.getElementById('rateInfo').innerText = `Kurs: 1 ${from} = ${rate.toFixed(4)} ${to}`;
    resultContainer.style.display = 'block';
}

async function toggleHistory() {
    const from = fromSelect.value;
    const to = toSelect.value;
    const currentPair = `${from}-${to}`;

    if (from === to) {
        alert("Wybierz dwie różne waluty.");
        return;
    }

    if (historySection.style.display === 'block' && lastHistoryPair === currentPair) {
        historySection.style.display = 'none';
        histBtnText.innerText = "Pokaż historię ceny";
        return;
    }

    historySection.style.display = 'block';
    histBtnText.innerText = "Ukryj historię ceny";
    document.getElementById('histLabel').innerText = `${from} ➝ ${to}`;

    if (globalCurrentRate === 0 || lastHistoryPair !== currentPair) {
        await fetchCurrentRateBeforeHistory(from, to);
    }

    if (lastHistoryPair !== currentPair) {
        lastHistoryPair = currentPair;
        await fetchHistoryData(from, to);
    }
}

async function fetchCurrentRateBeforeHistory(from, to) {
    try {
        const res = await fetch(`${BASE_URL}/latest?from=${from}&to=${to}`);
        const data = await res.json();
        if (data.rates && data.rates[to]) {
            globalCurrentRate = data.rates[to];
        }
    } catch (e) { console.error("Błąd pobierania kursu bazowego"); }
}

async function fetchHistoryData(from, to) {
    const listEl = document.getElementById('historyList');
    const loader = document.getElementById('histLoader');

    listEl.innerHTML = '';
    loader.style.display = 'block';

    const today = new Date();
    const periods = [
        { label: '24 godziny temu', date: shiftDate(today, -1) },
        { label: '7 dni temu', date: shiftDate(today, -7) },
        { label: '30 dni temu', date: shiftDate(today, -30) },
        { label: '6 miesięcy temu', date: shiftDate(today, -180) },
        { label: '1 rok temu', date: shiftDate(today, -365) },
        { label: '5 lat temu', date: shiftDate(today, -365 * 5) }
    ];

    try {
        const promises = periods.map(p => {
            let adjustedDate = adjustToWorkday(p.date);
            const dateStr = formatDate(adjustedDate);

            const url = `${BASE_URL}/${dateStr}?from=${from}&to=${to}`;
            return fetch(url).then(r => r.ok ? r.json() : { period: p, error: true }).then(d => ({ period: p, data: d }));
        });

        const results = await Promise.all(promises);
        loader.style.display = 'none';

        results.forEach(res => {
            const { period, data } = res;
            let valHtml = '<span style="color:#cbd5e1;">Brak danych</span>';
            let trendHtml = '';

            if (data && data.rates && data.rates[to]) {
                const histRate = data.rates[to];
                const diffPercent = ((histRate - globalCurrentRate) / globalCurrentRate) * 100;

                valHtml = `${histRate.toFixed(4)} ${to}`;

                if (diffPercent > 0.001) {
                    trendHtml = `<div class="trend-tag trend-up">▲ +${diffPercent.toFixed(2)}%</div>`;
                } else if (diffPercent < -0.001) {
                    trendHtml = `<div class="trend-tag trend-down">▼ ${diffPercent.toFixed(2)}%</div>`;
                } else {
                    trendHtml = `<div class="trend-tag" style="background:#f1f5f9; color:#64748b">0.00%</div>`;
                }
            }

            const li = document.createElement('li');
            li.className = 'history-item';
            li.innerHTML = `
                <div class="hist-left">
                    <div class="hist-label">${period.label}</div>
                    <span class="hist-date">${formatDate(period.date)}</span>
                </div>
                <div class="hist-right">
                    <span class="hist-value">${valHtml}</span>
                    ${trendHtml}
                </div>
            `;
            listEl.appendChild(li);
        });

    } catch (e) {
        loader.style.display = 'none';
        listEl.innerHTML = '<li style="text-align:center; color:red">Błąd pobierania historii</li>';
    }
}

function setLoading(isLoading) {
    const btn = document.getElementById('convertBtn');
    const text = document.getElementById('btnText');
    const loader = document.getElementById('btnLoader');
    btn.disabled = isLoading;
    text.style.display = isLoading ? 'none' : 'block';
    loader.style.display = isLoading ? 'block' : 'none';
}

function swapCurrencies() {
    const temp = fromSelect.value;
    fromSelect.value = toSelect.value;
    toSelect.value = temp;

    refreshCustomSelect('fromCurrency-custom', fromSelect.value);
    refreshCustomSelect('toCurrency-custom', toSelect.value);

    resultContainer.style.display = 'none';
    historySection.style.display = 'none';
    histBtnText.innerText = "Pokaż historię ceny";
    lastHistoryPair = "";
}

// Uruchomienie aplikacji
init();