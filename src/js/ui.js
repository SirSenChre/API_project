import { currencyMap } from './config.js';

export function buildCustomSelect(nativeSelect, wrapperId, dataList, onChangeCallback) {
    const wrapper = document.getElementById(wrapperId);
    const customSelect = document.createElement("div");
    customSelect.className = "custom-select";
    
    const trigger = document.createElement("div");
    trigger.className = "custom-select-trigger";
    trigger.innerHTML = getOptionHtml(nativeSelect.value);
    
    const optionsDiv = document.createElement("div");
    optionsDiv.className = "custom-options";
    
    dataList.forEach(([code, data]) => {
        const optionDiv = document.createElement("div");
        optionDiv.className = `custom-option ${code === nativeSelect.value ? 'selected' : ''}`;
        optionDiv.dataset.value = code;
        optionDiv.innerHTML = `<img src="https://flagcdn.com/w40/${data.flag}.png" class="flag-img"> <span>${data.name} <small style="color:#94a3b8">(${code})</small></span>`;
        
        optionDiv.addEventListener("click", function() {
            nativeSelect.value = this.dataset.value;
            trigger.innerHTML = getOptionHtml(nativeSelect.value);
            optionsDiv.querySelectorAll(".selected").forEach(opt => opt.classList.remove("selected"));
            this.classList.add("selected");
            customSelect.classList.remove("open");
            
            // Wywołujemy funkcję zwrotną (callback), jeśli została podana
            if (onChangeCallback) onChangeCallback();
        });
        optionsDiv.appendChild(optionDiv);
    });

    customSelect.appendChild(trigger);
    customSelect.appendChild(optionsDiv);
    wrapper.appendChild(customSelect);

    trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        document.querySelectorAll('.custom-select').forEach(el => el !== customSelect && el.classList.remove('open'));
        customSelect.classList.toggle("open");
    });
}

export function refreshCustomSelect(wrapperId, newValue) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;
    wrapper.querySelector('.custom-select-trigger').innerHTML = getOptionHtml(newValue);
    wrapper.querySelectorAll('.custom-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.value === newValue);
    });
}

// Funkcja pomocnicza, nieweksportowana, używana tylko wewnątrz tego pliku
function getOptionHtml(code) {
    const data = currencyMap[code];
    return `<div style="display:flex; align-items:center;"><img src="https://flagcdn.com/w40/${data.flag}.png" class="flag-img"><span>${code} - ${data.name}</span></div><div style="font-size:0.8rem; color:#94a3b8">▼</div>`;
}

// Obsługa zamykania selecta przy kliknięciu w tło
window.addEventListener('click', function(e) {
    if (!e.target.closest('.custom-select')) {
        document.querySelectorAll('.custom-select').forEach(el => el.classList.remove('open'));
    }
});