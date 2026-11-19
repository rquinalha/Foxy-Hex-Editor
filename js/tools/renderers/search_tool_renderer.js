const { ipcRenderer } = require('electron');

// Elementos da UI
const findInput = document.getElementById('find-input');
const replaceInput = document.getElementById('replace-input');
const caseSensitive = document.getElementById('case-sensitive');
const searchMode = document.getElementById('search-mode');
const cancelButton = document.getElementById('cancel-search-btn');
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
    const hex = searchMode.value === 'hex' || (searchMode.value === 'auto' && looksLikeHexSearch(findInput?.value));
    const key = hex ? 'tool.search.isolated_sequence' : 'tool.search.whole_word';
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

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
}

function renderResultButton(result, isActive) {
    return `
        <button class="group-result-item ${isActive ? 'active' : ''}"
            data-global-index="${Number(result.globalIndex)}"
            style="width: 100%; text-align: left; margin-top: 6px; background: ${isActive ? 'rgba(255, 107, 53, 0.18)' : 'rgba(255,255,255,0.04)'}; color: #fff; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 8px; cursor: pointer;">
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #ffd166;">0x${escapeHtml(result.offsetHex)}</div>
            <div style="font-size: 12px; opacity: 0.9; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(result.preview || '(sem prévia)')}</div>
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
            mode: searchMode.value,
            regexMode: searchMode.value === 'regex',
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
    searchMode.value = data.mode || (data.regexMode ? 'regex' : 'auto');
    updateWholeWordLabel();
    if (data.wholeWord !== undefined) wholeWord.checked = data.wholeWord;
    if (data.replaceAll !== undefined) replaceAll.checked = data.replaceAll;
    if (data.searchAllTabs !== undefined && searchAllTabs) searchAllTabs.checked = data.searchAllTabs;
    
    if (data.results) {
        currentSearchResults = data.results;
        updateResultsUI();
    }
});

function updateResultsUI() {
    const i18n = window.I18n || { t: (key) => key };
    captureResultsScroll();
    const { count, currentIndex, searchTerm, flatResults, groupedResults, page, pages, notice, progress } = currentSearchResults;
    const searching = typeof progress === 'number';
    cancelButton.hidden = !searching;
    replaceBtn.disabled = searching;
    if (searching) {
        resultsDisplay.textContent = `${i18n.t('tool.search.running')} ${progress}%`;
        return;
    }
    const message = notice ? `<p role="status">${escapeHtml(notice)}</p>` : '';
    if (!count) {
        resultsDisplay.innerHTML = `${escapeHtml(i18n.t('tool.search.no_results_found'))}${message}`;
        return;
    }

    const groups = new Map();
    for (const item of flatResults || []) {
        const key = item.sessionId || item.fileName;
        if (!groups.has(key)) groups.set(key, { title: item.fileName, results: [] });
        groups.get(key).results.push(item);
    }
    const lists = Array.from(groups, ([key, group]) => {
        const total = groupedResults?.find(item => item.sessionId === key)?.total || count;
        return `<section class="search-results-group">
            <strong>${escapeHtml(group.title)} · ${total}</strong>
            ${group.results.map(result => renderResultButton(result, result.globalIndex === currentIndex)).join('')}
        </section>`;
    }).join('');
    const navigation = pages > 1 ? `<div class="button-row">
        <button class="btn" type="button" data-search-page="${page - 1}" ${page === 0 ? 'disabled' : ''}>←</button>
        <span>${page + 1} / ${pages}</span>
        <button class="btn" type="button" data-search-page="${page + 1}" ${page + 1 === pages ? 'disabled' : ''}>→</button>
    </div>` : '';
    resultsDisplay.innerHTML = `
        <div class="search-match-info">
            <span>${escapeHtml(i18n.t('tool.search.found'))} <strong>${count}</strong></span>
            <span>${Math.max(0, currentIndex + 1)} / ${count}</span>
        </div>
        <div>${escapeHtml(searchTerm)}</div>
        ${message}
        <div class="results-scroll-region">${lists}</div>
        ${navigation}
    `;
    restoreResultsScroll();
}

cancelButton.addEventListener('click', () => sendAction('cancel-search'));
searchMode.addEventListener('change', updateWholeWordLabel);

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
    const pageButton = event.target.closest('[data-search-page]');
    if (pageButton) {
        resultsScrollTop = 0;
        const region = getResultsScrollRegion();
        if (region) region.scrollTop = 0;
        sendAction('search-page', { page: Number(pageButton.dataset.searchPage) });
        return;
    }
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



