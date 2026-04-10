const { ipcRenderer } = require('electron');

// Elementos da UI
const findInput = document.getElementById('find-input');
const replaceInput = document.getElementById('replace-input');
const caseSensitive = document.getElementById('case-sensitive');
const regexMode = document.getElementById('regex-mode');
const wholeWord = document.getElementById('whole-word');
const replaceAll = document.getElementById('replace-all');
const searchAllTabs = document.getElementById('search-all-tabs');
const resultsDisplay = document.getElementById('results-display');
const wholeWordLabel = document.getElementById('whole-word-label');

const findBtn = document.getElementById('find-btn');
const replaceBtn = document.getElementById('replace-btn');

// Estado interno
let currentSearchResults = {
    count: 0,
    currentIndex: -1,
    searchTerm: '',
    flatResults: [],
    groupedResults: [],
    skippedLargeCount: 0,
    searchAllTabs: false
};
let resultsScrollTop = 0;

function looksLikeHexSearch(value) {
    const trimmed = (value || '').trim();
    if (!trimmed) return false;
    const hexPattern = /^[0-9A-Fa-f\s]+$/;
    return (hexPattern.test(trimmed) && trimmed.includes(' ')) ||
        (hexPattern.test(trimmed) && trimmed.length % 2 === 0 && trimmed.length > 0);
}

function updateWholeWordLabel() {
    if (!wholeWordLabel) return;
    const i18n = window.I18n || { t: (k) => k };
    const key = looksLikeHexSearch(findInput?.value) ? 'tool.search.isolated_sequence' : 'tool.search.whole_word';
    wholeWordLabel.textContent = i18n.t(key);
}

function getResultsScrollRegion() {
    return resultsDisplay.querySelector('.results-scroll-region');
}

function captureResultsScroll() {
    const region = getResultsScrollRegion();
    if (region) {
        resultsScrollTop = region.scrollTop;
    }
}

function restoreResultsScroll() {
    const region = getResultsScrollRegion();
    if (region) {
        region.scrollTop = resultsScrollTop;
    }
}

function renderResultButton(result, isActive) {
    return `
        <button class="group-result-item ${isActive ? 'active' : ''}"
            data-global-index="${result.globalIndex}"
            style="width: 100%; text-align: left; margin-top: 6px; background: ${isActive ? 'rgba(255, 107, 53, 0.18)' : 'rgba(255,255,255,0.04)'}; color: #fff; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 8px; cursor: pointer;">
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #ffd166;">0x${result.offsetHex}</div>
            <div style="font-size: 12px; opacity: 0.9; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${result.preview}</div>
        </button>
    `;
}

// --- FunÃ§Ãµes de ComunicaÃ§Ã£o ---

// Enviar aÃ§Ã£o para o processo principal
function sendAction(action, data = {}) {
    ipcRenderer.send('search-action', {
        action,
        params: {
            findValue: findInput.value,
            replaceValue: replaceInput.value,
            caseSensitive: caseSensitive.checked,
            regexMode: regexMode.checked,
            wholeWord: wholeWord.checked,
            replaceAll: replaceAll.checked,
            searchAllTabs: !!searchAllTabs?.checked,
            ...data
        }
    });
}

// Ouvir atualizaÃ§Ãµes de resultados vindas do editor hex correio
ipcRenderer.on('update-search-results', (event, data) => {
    currentSearchResults = data;
    updateResultsUI();
});

// Ouvir estado inicial (se necessÃ¡rio)
ipcRenderer.on('update-initial-state', (event, data) => {
    if (data.findValue) findInput.value = data.findValue;
    updateWholeWordLabel();
    if (data.replaceValue) replaceInput.value = data.replaceValue;
    if (data.caseSensitive !== undefined) caseSensitive.checked = data.caseSensitive;
    if (data.regexMode !== undefined) regexMode.checked = data.regexMode;
    if (data.wholeWord !== undefined) wholeWord.checked = data.wholeWord;
    if (data.replaceAll !== undefined) replaceAll.checked = data.replaceAll;
    if (data.searchAllTabs !== undefined && searchAllTabs) searchAllTabs.checked = data.searchAllTabs;
    
    if (data.results) {
        currentSearchResults = data.results;
        updateResultsUI();
    }
});

function updateResultsUI() {
    const i18n = window.I18n || { t: (k) => k };
    captureResultsScroll();
    
    if (currentSearchResults.count === 0) {
        resultsDisplay.innerHTML = i18n.t('tool.search.no_results_found');
        return;
    }

    const { count, currentIndex, searchTerm, flatResults, groupedResults, skippedLargeCount, searchAllTabs: isGlobalSearch } = currentSearchResults;
    const current = currentIndex >= 0 ? currentIndex + 1 : 0;

    if (isGlobalSearch && Array.isArray(groupedResults) && groupedResults.length > 0) {
        const groupsHtml = groupedResults.map((group) => {
            const items = group.results.map((result) => renderResultButton(result, result.globalIndex === currentIndex)).join('');

            return `
                <div style="margin-top: 10px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 10px;">
                    <div style="display: flex; justify-content: space-between; gap: 8px; font-size: 12px; color: #ffb347; font-weight: 700;">
                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${group.fileName}</span>
                        <span>${group.total}</span>
                    </div>
                    ${items}
                </div>
            `;
        }).join('');

        const skippedHtml = skippedLargeCount > 0
            ? `<div style="margin-top: 8px; font-size: 11px; color: #aab3cc;">${skippedLargeCount} aba(s) de arquivo grande ignorada(s) nesta busca.</div>`
            : '';

        resultsDisplay.innerHTML = `
            <div class="search-match-info">
                <span>${i18n.t('tool.search.found')} <strong>${count}</strong></span>
                <span>${i18n.t('tool.search.current')} <strong>${current}</strong> ${i18n.t('tool.search.of')} ${count}</span>
            </div>
            <div style="font-size: 11px; margin-top: 5px; opacity: 0.8;">${i18n.t('tool.search.term')} "${searchTerm}"</div>
            <div class="results-scroll-region">
                ${groupsHtml}
            </div>
            ${skippedHtml}
        `;
        restoreResultsScroll();
        return;
    }

    if (Array.isArray(flatResults) && flatResults.length > 0) {
        const fileName = flatResults[0]?.fileName || 'Arquivo atual';
        const itemsHtml = flatResults.map((result) => renderResultButton(result, result.globalIndex === currentIndex)).join('');

        resultsDisplay.innerHTML = `
            <div class="search-match-info">
                <span>${i18n.t('tool.search.found')} <strong>${count}</strong></span>
                <span>${i18n.t('tool.search.current')} <strong>${current}</strong> ${i18n.t('tool.search.of')} ${count}</span>
            </div>
            <div style="font-size: 11px; margin-top: 5px; opacity: 0.8;">${i18n.t('tool.search.term')} "${searchTerm}"</div>
            <div class="results-scroll-region">
                <div style="margin-top: 10px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 10px;">
                    <div style="display: flex; justify-content: space-between; gap: 8px; font-size: 12px; color: #ffb347; font-weight: 700;">
                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${fileName}</span>
                        <span>${flatResults.length}</span>
                    </div>
                    ${itemsHtml}
                </div>
            </div>
        `;
        restoreResultsScroll();
        return;
    }

    resultsDisplay.innerHTML = `
        <div class="search-match-info">
            <span>${i18n.t('tool.search.found')} <strong>${count}</strong></span>
            <span>${i18n.t('tool.search.current')} <strong>${current}</strong> ${i18n.t('tool.search.of')} ${count}</span>
        </div>
        <div style="font-size: 11px; margin-top: 5px; opacity: 0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${i18n.t('tool.search.term')} "${searchTerm}"
        </div>
    `;
    restoreResultsScroll();
}

// --- Event Listeners ---

findBtn.addEventListener('click', () => {
    if (!findInput.value) return;
    sendAction('perform-search');
});

replaceBtn.addEventListener('click', () => {
    if (!findInput.value) return;
    sendAction('perform-replace');
});

resultsDisplay.addEventListener('click', (event) => {
    const target = event.target.closest('[data-global-index]');
    if (!target) {
        return;
    }

    captureResultsScroll();

    const globalIndex = Number(target.dataset.globalIndex);
    if (Number.isNaN(globalIndex)) {
        return;
    }

    sendAction('goto-search-result', { globalIndex });
});

resultsDisplay.addEventListener('scroll', (event) => {
    const region = event.target.closest('.results-scroll-region');
    if (region) {
        resultsScrollTop = region.scrollTop;
    }
}, true);

// Atalhos de teclado
window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        if (e.ctrlKey || e.altKey) {
            sendAction('perform-replace');
        } else {
            sendAction('perform-search');
        }
    } else if (e.key === 'F3') {
        if (e.shiftKey) {
            sendAction('find-previous');
        } else {
            sendAction('find-next');
        }
    } else if (e.key === 'Escape') {
        ipcRenderer.send('close-search-window');
    }
});

// Auto-seleÃ§Ã£o ao focar
findInput.addEventListener('focus', () => findInput.select());
findInput.addEventListener('input', updateWholeWordLabel);
findInput.addEventListener('change', updateWholeWordLabel);
findInput.addEventListener('keyup', updateWholeWordLabel);
findInput.addEventListener('paste', () => setTimeout(updateWholeWordLabel, 0));
replaceInput.addEventListener('focus', () => replaceInput.select());

// Notificar que a janela estÃ¡ pronta
ipcRenderer.send('search-ready');



