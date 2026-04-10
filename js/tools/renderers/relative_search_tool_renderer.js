const { ipcRenderer, shell } = require('electron');
const fs = require('fs');

const $ = (id) => document.getElementById(id);
const ui = {
    title: $('title-text'),
    subtitle: $('subtitle-text'),
    aboutTitle: $('about-title'),
    aboutAuthor: $('about-author'),
    aboutLink: $('about-link'),
    searchInput: $('search-input'),
    searchType: $('search-type'),
    widthSelect: $('width-select'),
    endiannessSelect: $('endianness-select'),
    previewWidth: $('preview-width'),
    charSequence: $('char-sequence'),
    wildcardInput: $('wildcard-input'),
    wildcardEnabled: $('wildcard-enabled'),
    dedupeResults: $('dedupe-results'),
    preferCurrentTable: $('prefer-current-table'),
    searchBtn: $('search-btn'),
    closeBtn: $('close-btn'),
    sourceMetrics: $('source-metrics'),
    selectionPanel: $('selection-panel'),
    applyTableBtn: $('apply-table-btn'),
    openTableEditorBtn: $('open-table-editor-btn'),
    summaryText: $('summary-text'),
    notesText: $('notes-text'),
    resultList: $('result-list'),
    resultsBody: $('results-body'),
    statusText: $('status-text'),
    footerFile: $('footer-file')
};

const texts = {
    pt: {
        title: 'Busca Relativa',
        subtitle: 'Ferramenta integrada para localizar padrões relativos no arquivo da aba atual.',
        aboutTitle: '',
        aboutAuthor: '',
        aboutLink: '',
        labels: {
            search: 'Texto ou sequência',
            type: 'Tipo de busca',
            width: 'Largura',
            endianness: 'Ordem dos bytes',
            preview: 'Visualização',
            sequence: 'Sequência de caracteres personalizada',
            wildcard: 'Curinga',
            wildcardEnabled: 'Usar curinga',
            dedupe: 'Ocultar repetidos',
            preferTable: 'Usar tabela atual na visualização'
        },
        buttons: { search: 'Buscar', close: 'Fechar', apply: 'Aplicar no Editor Hex', editor: 'Criar/Editar Tabela' },
        searchTypeOptions: { relative: 'Busca relativa', valueScan: 'Value scan relative' },
        sections: { source: 'Arquivo atual', selected: 'Resultado selecionado', actions: 'Ações', results: 'Resultados' },
        placeholders: { search: 'Ex.: HELLO ou 12 15 18 15' },
        notes: 'A busca usa o arquivo da aba atual. Se houver alterações não salvas, a ferramenta tenta usar o conteúdo atual aberto no editor.',
        emptySelection: 'Nenhum resultado selecionado ainda.',
        noSearch: 'Nenhuma busca executada.',
        noResults: 'Nenhum resultado.',
        ready: 'Pronto.',
        noFile: 'Sem arquivo carregado',
        invalidSearch: 'Digite um termo válido para buscar.',
        invalidValueScan: 'No modo Value Scan, informe números separados por espaço ou vírgula.',
        invalidCustom: 'A sequência personalizada precisa conter todos os caracteres usados no termo.',
        noSource: 'Não foi possível carregar o conteúdo da aba atual para busca.',
        snapshotTooLarge: 'Salve a aba atual antes da busca porque o snapshot em memória está grande demais.',
        resultCount: (count, ms) => `${count} resultado(s) encontrado(s) em ${ms} ms.`,
        sourceFromSnapshot: 'Snapshot em memÃ³ria',
        sourceFromDisk: 'Arquivo em disco',
        unsaved: 'Com alterações não salvas',
        saved: 'Sem alterações não salvas',
        file: 'Arquivo',
        path: 'Caminho',
        size: 'Tamanho',
        source: 'Origem',
        state: 'Estado',
        selection: 'Seleção',
        table: 'Tabela ativa',
        offset: 'Offset',
        preview: 'Visualização',
        mapping: 'Mapeamento sugerido',
        mode: (width, align) => `${width}-bit | alinhamento ${align}`,
        tableReady: 'Tabela pronta',
        noTable: 'Sem tabela',
        entries: 'entradas',
        tableApplied: 'Tabela aplicada ao Editor Hex.',
        tableSent: 'Tabela enviada ao Editor de Tabelas.'
    },
    en: {
        title: 'Relative Search',
        subtitle: 'Tool for locating relative patterns in the active tab file.',
        aboutTitle: '',
        aboutAuthor: '',
        aboutLink: '',
        labels: {
            search: 'Text or sequence',
            type: 'Search type',
            width: 'Width',
            endianness: 'Endianness',
            preview: 'Preview',
            sequence: 'Custom character sequence',
            wildcard: 'Wildcard',
            wildcardEnabled: 'Enable wildcard',
            dedupe: 'Hide repeated',
            preferTable: 'Use current table in preview'
        },
        buttons: { search: 'Search', close: 'Close', apply: 'Apply in Hex Editor', editor: 'Create/Edit Table' },
        searchTypeOptions: { relative: 'Relative search', valueScan: 'Value scan relative' },
        sections: { source: 'Current file', selected: 'Selected result', actions: 'Actions', results: 'Results' },
        placeholders: { search: 'Example: HELLO or 12 15 18 15' },
        notes: 'The search uses the active tab file. If there are unsaved changes, the tool tries to use the current content open in the editor.',
        emptySelection: 'No result selected yet.',
        noSearch: 'No search executed yet.',
        noResults: 'No results.',
        ready: 'Ready.',
        noFile: 'No file loaded',
        invalidSearch: 'Enter a valid search term.',
        invalidValueScan: 'In Value Scan mode, enter numbers separated by spaces or commas.',
        invalidCustom: 'The custom sequence must contain every character used in the term.',
        noSource: 'Could not load the active tab contents for searching.',
        snapshotTooLarge: 'Save the current tab before searching because the in-memory snapshot is too large.',
        resultCount: (count, ms) => `${count} result(s) found in ${ms} ms.`,
        sourceFromSnapshot: 'In-memory snapshot',
        sourceFromDisk: 'Disk file',
        unsaved: 'With unsaved changes',
        saved: 'No unsaved changes',
        file: 'File',
        path: 'Path',
        size: 'Size',
        source: 'Source',
        state: 'State',
        selection: 'Selection',
        table: 'Active table',
        offset: 'Offset',
        preview: 'Preview',
        mapping: 'Suggested mapping',
        mode: (width, align) => `${width}-bit | alignment ${align}`,
        tableReady: 'Table ready',
        noTable: 'No table',
        entries: 'entries',
        tableApplied: 'Table applied to Hex Editor.',
        tableSent: 'Table sent to Table Editor.'
    }
};

texts.pt.sourceFromSnapshot = 'Snapshot em mem\u00f3ria';

const state = {
    lang: 'pt',
    fileName: null,
    filePath: null,
    fileSize: 0,
    hasUnsavedChanges: false,
    snapshotRequired: false,
    snapshotTooLarge: false,
    snapshotData: null,
    currentTable: null,
    selectionStart: 0,
    selectionEnd: 0,
    sourceBytes: null,
    results: [],
    selectedIndex: -1
};

const T = (key) => {
    const langPack = texts[state.lang] || texts.pt;
    return key.split('.').reduce((acc, part) => acc?.[part], langPack);
};

function tx(key, ...args) {
    const value = T(key);
    return typeof value === 'function' ? value(...args) : value;
}

function esc(text) {
    return String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function compactPreview(text, maxLength = 64) {
    const normalized = String(text ?? '').replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, Math.max(0, maxLength - 3))}...`;
}

function setStatus(message) {
    ui.statusText.textContent = message;
}

function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function unitHex(value, widthBits, endianness) {
    if (widthBits === 8) {
        return (value & 0xFF).toString(16).toUpperCase().padStart(2, '0');
    }
    const normalized = value & 0xFFFF;
    const high = ((normalized >> 8) & 0xFF).toString(16).toUpperCase().padStart(2, '0');
    const low = (normalized & 0xFF).toString(16).toUpperCase().padStart(2, '0');
    return endianness === 'LE' ? `${low}${high}` : `${high}${low}`;
}

function applyTranslations() {
    ui.title.textContent = tx('title');
    ui.subtitle.textContent = tx('subtitle');
    ui.aboutTitle.textContent = tx('aboutTitle');
    ui.aboutAuthor.textContent = tx('aboutAuthor');
    ui.aboutLink.textContent = tx('aboutLink');
    $('label-search-input').textContent = tx('labels.search');
    ui.searchInput.placeholder = tx('placeholders.search');
    $('label-search-type').textContent = tx('labels.type');
    $('label-width').textContent = tx('labels.width');
    $('label-endianness').textContent = tx('labels.endianness');
    $('label-preview').textContent = tx('labels.preview');
    $('label-char-sequence').textContent = tx('labels.sequence');
    $('label-wildcard').textContent = tx('labels.wildcard');
    $('label-wildcard-enabled').textContent = tx('labels.wildcardEnabled');
    $('label-dedupe').textContent = tx('labels.dedupe');
    $('label-prefer-table').textContent = tx('labels.preferTable');
    ui.searchType.options[0].textContent = tx('searchTypeOptions.relative');
    ui.searchType.options[1].textContent = tx('searchTypeOptions.valueScan');
    ui.searchBtn.textContent = tx('buttons.search');
    ui.closeBtn.textContent = tx('buttons.close');
    ui.applyTableBtn.textContent = tx('buttons.apply');
    ui.openTableEditorBtn.textContent = tx('buttons.editor');
    $('source-title').textContent = tx('sections.source');
    $('selection-title').textContent = tx('sections.selected');
    $('actions-title').textContent = tx('sections.actions');
    $('results-title').textContent = tx('sections.results');
    ui.notesText.textContent = tx('notes');
    $('th-offset').textContent = tx('offset');
    $('th-align').textContent = tx('source');
    $('th-preview').textContent = tx('preview');
    $('th-table').textContent = tx('table');
}

function renderSourceInfo() {
    const rows = [
        [tx('file'), state.fileName || tx('noFile')],
        [tx('path'), state.filePath || '-'],
        [tx('size'), formatBytes(state.fileSize || 0)],
        [tx('source'), state.snapshotRequired ? tx('sourceFromSnapshot') : tx('sourceFromDisk')],
        [tx('state'), state.hasUnsavedChanges ? tx('unsaved') : tx('saved')],
        [tx('selection'), `${state.selectionStart || 0} - ${state.selectionEnd || 0}`],
        [tx('table'), state.currentTable?.name || 'ASCII']
    ];
    ui.sourceMetrics.innerHTML = rows.map(([label, value]) => `<div class="metric"><span>${esc(label)}</span><span>${esc(value)}</span></div>`).join('');
    ui.footerFile.textContent = state.fileName || tx('noFile');
}

async function ensureSourceBytes() {
    if (state.sourceBytes instanceof Uint8Array) return state.sourceBytes;
    if (state.snapshotTooLarge) throw new Error(tx('snapshotTooLarge'));
    if (Array.isArray(state.snapshotData)) {
        state.sourceBytes = Uint8Array.from(state.snapshotData);
        return state.sourceBytes;
    }
    if (state.filePath) {
        state.sourceBytes = new Uint8Array(fs.readFileSync(state.filePath));
        return state.sourceBytes;
    }
    throw new Error(tx('noSource'));
}

function parsePattern(config) {
    const raw = String(ui.searchInput.value || '').trim();
    if (!raw) throw new Error(tx('invalidSearch'));
    if (config.type === 'value-scan') {
        const values = raw.split(/[\s,;]+/).filter(Boolean).map(Number);
        if (!values.length || values.some((v) => !Number.isFinite(v))) throw new Error(tx('invalidValueScan'));
        return { raw, length: values.length, values, wildcardChar: null, customSequence: '' };
    }

    const wildcardChar = config.useWildcard ? String(ui.wildcardInput.value || '*').slice(0, 1) : null;
    const chars = Array.from(raw);
    const customSequence = String(ui.charSequence.value || '');
    const charIndex = new Map();
    if (customSequence.trim()) {
        Array.from(customSequence).forEach((char, index) => {
            if (!charIndex.has(char)) charIndex.set(char, index);
        });
        const invalid = chars.find((char) => char !== wildcardChar && !charIndex.has(char));
        if (invalid) throw new Error(tx('invalidCustom'));
    }

    const values = chars.map((char) => {
        if (wildcardChar && char === wildcardChar) return null;
        return charIndex.size ? charIndex.get(char) : char.codePointAt(0);
    });
    return { raw, length: chars.length, values, wildcardChar, customSequence };
}

function buildDiffPattern(pattern) {
    const validIndices = [];
    pattern.values.forEach((value, index) => {
        if (value !== null && value !== undefined) validIndices.push(index);
    });
    if (!validIndices.length) throw new Error(tx('invalidSearch'));
    const relations = validIndices.map((index, position) => {
        const previousIndex = validIndices[(position - 1 + validIndices.length) % validIndices.length];
        return { index, previousIndex, expected: pattern.values[index] - pattern.values[previousIndex] };
    });
    return { validIndices, relations };
}

function readUnit(bytes, offset, widthBits, endianness) {
    if (widthBits === 8) {
        return bytes[offset];
    }
    if (offset + 1 >= bytes.length) {
        return null;
    }
    return endianness === 'LE'
        ? (bytes[offset] | (bytes[offset + 1] << 8))
        : ((bytes[offset] << 8) | bytes[offset + 1]);
}

function matchesAt(bytes, startOffset, widthBits, endianness, diffPattern) {
    for (const relation of diffPattern.relations) {
        const currentOffset = startOffset + (relation.index * (widthBits === 16 ? 2 : 1));
        const previousOffset = startOffset + (relation.previousIndex * (widthBits === 16 ? 2 : 1));
        const current = readUnit(bytes, currentOffset, widthBits, endianness);
        const previous = readUnit(bytes, previousOffset, widthBits, endianness);
        if (current === null || previous === null) {
            return false;
        }
        if ((current - previous) !== relation.expected) {
            return false;
        }
    }
    return true;
}

function readMatchUnits(bytes, startOffset, patternLength, widthBits, endianness) {
    const units = [];
    const step = widthBits === 16 ? 2 : 1;
    for (let i = 0; i < patternLength; i++) {
        const value = readUnit(bytes, startOffset + (i * step), widthBits, endianness);
        if (value === null || value === undefined) {
            return null;
        }
        units.push(value);
    }
    return units;
}

function decodePreview(bytes, widthBits, endianness, generatedTable = null) {
    const table = ui.preferCurrentTable.checked ? state.currentTable : generatedTable;
    if (!table) {
        return Array.from(bytes).map((byte) => (byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.')).join('');
    }
    const mappings = table.mappings || {};
    const basic = table.mapping || {};
    if (widthBits === 16) {
        let text = '';
        for (let i = 0; i + 1 < bytes.length; i += 2) {
            const value = endianness === 'LE' ? (bytes[i] | (bytes[i + 1] << 8)) : ((bytes[i] << 8) | bytes[i + 1]);
            text += mappings[unitHex(value, 16, endianness)] || '.';
        }
        return text;
    }
    return Array.from(bytes).map((byte) => mappings[unitHex(byte, 8, endianness)] || basic[byte] || (byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.')).join('');
}

function buildTable(matchUnits, config, pattern, diffPattern) {
    if (config.type !== 'relative' || !diffPattern.validIndices.length) return null;
    const firstIndex = diffPattern.validIndices[0];
    const sourceValue = matchUnits[firstIndex];
    const patternValue = pattern.values[firstIndex];
    if (sourceValue === undefined || patternValue === null || patternValue === undefined) return null;
    const distance = sourceValue - patternValue;
    const modulo = config.widthBits === 16 ? 0x10000 : 0x100;
    const table = {
        name: `${state.fileName || 'Relative'} Relative Table`,
        type: config.widthBits === 16 ? '16-bit' : '8-bit',
        endianness: config.endianness,
        mappings: {}
    };
    const chars = pattern.customSequence ? Array.from(pattern.customSequence) : Array.from({ length: 0x7E - 0x20 + 1 }, (_, i) => String.fromCharCode(0x20 + i));
    chars.forEach((char, index) => {
        const base = pattern.customSequence ? index : char.codePointAt(0);
        const value = ((base + distance) % modulo + modulo) % modulo;
        table.mappings[unitHex(value, config.widthBits, config.endianness)] = char;
    });
    return table;
}

function tableSummary(table) {
    return table ? `${tx('tableReady')} | ${Object.keys(table.mappings || {}).length} ${tx('entries')}` : tx('noTable');
}

function resultDedupKey(result) {
    if (Array.isArray(result.matchUnits) && result.matchUnits.length) {
        return `${result.modeLabel}|${result.matchUnits.join(',')}`;
    }
    return `${result.modeLabel}|${result.preview}`;
}

function renderSelection() {
    const selected = state.results[state.selectedIndex] || null;
    if (!selected) {
        ui.selectionPanel.innerHTML = `<p>${esc(tx('emptySelection'))}</p>`;
        ui.applyTableBtn.disabled = true;
        ui.openTableEditorBtn.disabled = true;
        return;
    }

    const mappingPreview = selected.table
        ? Object.entries(selected.table.mappings).slice(0, 8).map(([hex, char]) => `${hex}=${char}`).join(', ')
        : tx('noTable');

    ui.selectionPanel.innerHTML = `
        <p><strong>${esc(tx('offset'))}:</strong> <span class="mono">0x${selected.offset.toString(16).toUpperCase().padStart(8, '0')}</span></p>
        <p><strong>${esc(tx('source'))}:</strong> ${esc(selected.modeLabel)}</p>
        <p><strong>${esc(tx('preview'))}:</strong> ${esc(compactPreview(selected.preview))}</p>
        <p><strong>${esc(tx('table'))}:</strong> ${esc(tableSummary(selected.table))}</p>
        <p><strong>${esc(tx('mapping'))}:</strong> ${esc(mappingPreview)}</p>
    `;
    const enabled = !!selected.table;
    ui.applyTableBtn.disabled = !enabled;
    ui.openTableEditorBtn.disabled = !enabled;
}

function renderResults() {
    if (!state.results.length) {
        ui.resultList.classList.remove('has-results');
        ui.resultsBody.innerHTML = `<tr><td colspan="4">${esc(tx('noResults'))}</td></tr>`;
        renderSelection();
        return;
    }

    ui.resultList.classList.add('has-results');
    ui.resultsBody.innerHTML = state.results.map((result, index) => `
        <tr class="result-row ${index === state.selectedIndex ? 'active' : ''}" data-index="${index}">
            <td class="mono">0x${result.offset.toString(16).toUpperCase().padStart(8, '0')}</td>
            <td>${esc(result.modeLabel)}</td>
            <td>${esc(result.preview)}</td>
            <td>${esc(tableSummary(result.table))}</td>
        </tr>
    `).join('');

    ui.resultsBody.querySelectorAll('.result-row').forEach((row) => {
        row.addEventListener('click', () => {
            state.selectedIndex = Number(row.dataset.index);
            renderResults();
        });
    });

    renderSelection();
}

function dedupe(results) {
    const seen = new Set();
    return results.filter((result) => {
        const key = resultDedupKey(result);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

async function runSearch() {
    ui.searchBtn.disabled = true;
    try {
        const bytes = await ensureSourceBytes();
        const config = {
            type: ui.searchType.value,
            widthBits: Number(ui.widthSelect.value),
            endianness: ui.endiannessSelect.value
        };
        const pattern = parsePattern({
            type: config.type,
            useWildcard: ui.wildcardEnabled.checked
        });
        const diffPattern = buildDiffPattern(pattern);
        const startedAt = Date.now();
        let results = [];
        const widthBytes = config.widthBits === 16 ? 2 : 1;
        const alignments = widthBytes === 2 ? [0, 1] : [0];
        const patternByteLength = pattern.length * widthBytes;
        const radius = Math.max(8, Number(ui.previewWidth.value) || 28);

        alignments.forEach((alignment) => {
            const maxOffset = bytes.length - patternByteLength;
            if (maxOffset < alignment) return;

            for (let offset = alignment; offset <= maxOffset; offset += widthBytes) {
                if (!matchesAt(bytes, offset, config.widthBits, config.endianness, diffPattern)) continue;

                const previewStart = Math.max(0, offset - (radius * widthBytes));
                const previewEnd = Math.min(bytes.length, offset + (radius * widthBytes));
                const matchUnits = readMatchUnits(bytes, offset, pattern.length, config.widthBits, config.endianness);
                const generatedTable = buildTable(matchUnits, config, pattern, diffPattern);

                results.push({
                    offset,
                    modeLabel: tx('mode', config.widthBits, alignment),
                    preview: decodePreview(bytes.slice(previewStart, previewEnd), config.widthBits, config.endianness, generatedTable),
                    table: generatedTable,
                    matchUnits
                });
            }
        });

        if (ui.dedupeResults.checked) {
            results = dedupe(results);
        }

        state.results = results.sort((a, b) => a.offset - b.offset);
        state.selectedIndex = state.results.length ? 0 : -1;
        const elapsed = Date.now() - startedAt;
        ui.summaryText.textContent = tx('resultCount', state.results.length, elapsed);
        setStatus(tx('resultCount', state.results.length, elapsed));
        renderResults();
    } catch (error) {
        state.results = [];
        state.selectedIndex = -1;
        ui.summaryText.textContent = error.message || tx('noSource');
        setStatus(error.message || tx('noSource'));
        renderResults();
    } finally {
        ui.searchBtn.disabled = false;
    }
}

function selectedTable() {
    return state.results[state.selectedIndex]?.table || null;
}

function applySelectedTable() {
    const table = selectedTable();
    if (!table) {
        setStatus(tx('noTable'));
        return;
    }

    ipcRenderer.send('table-editor-apply', {
        content: JSON.stringify(table, null, 2),
        format: 'json',
        fileName: `${table.name.replace(/[\\/:*?"<>|]/g, '_')}.json`
    });
    setStatus(tx('tableApplied'));
}

function openSelectedTableInEditor() {
    const table = selectedTable();
    if (!table) {
        setStatus(tx('noTable'));
        return;
    }

    ipcRenderer.send('open-table-editor-window', {
        lang: state.lang,
        currentTable: table
    });
    setStatus(tx('tableSent'));
}

function initialize(payload = {}) {
    Object.assign(state, payload);
    state.lang = state.lang === 'en' ? 'en' : 'pt';
    state.sourceBytes = null;
    state.results = [];
    state.selectedIndex = -1;
    applyTranslations();
    renderSourceInfo();
    ui.summaryText.textContent = tx('noSearch');
    renderResults();
    setStatus(tx('ready'));
}

ui.searchBtn.addEventListener('click', runSearch);
ui.closeBtn.addEventListener('click', () => ipcRenderer.send('close-relative-search-window'));
ui.applyTableBtn.addEventListener('click', applySelectedTable);
ui.openTableEditorBtn.addEventListener('click', openSelectedTableInEditor);
ui.searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        runSearch();
    }
});
ui.aboutLink.addEventListener('click', (event) => {
    event.preventDefault();
    shell.openExternal(ui.aboutLink.href);
});

ipcRenderer.on('init-relative-search-window', (event, payload) => {
    initialize(payload);
});

initialize();
