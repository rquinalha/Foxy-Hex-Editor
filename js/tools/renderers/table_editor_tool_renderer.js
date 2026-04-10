const { ipcRenderer } = require('electron');
const fs = require('fs');
const iconvLite = require('iconv-lite');

const templateList = document.getElementById('template-list');
const tableEditor = document.getElementById('table-editor');
const tableFormat = document.getElementById('table-format');
const tableName = document.getElementById('table-name');
const metaName = document.getElementById('meta-name');
const metaType = document.getElementById('meta-type');
const metaEndianness = document.getElementById('meta-endianness');
const statusText = document.getElementById('status-text');
const titleEl = document.getElementById('table-editor-title');
const subtitleEl = document.getElementById('table-editor-subtitle');
const modelsTitleEl = document.getElementById('table-editor-models-title');
const labelNameEl = document.getElementById('table-editor-label-name');
const labelTypeEl = document.getElementById('table-editor-label-type');
const labelEndiannessEl = document.getElementById('table-editor-label-endianness');
const footerInfoEl = document.getElementById('table-editor-footer-info');
const currentBtn = document.getElementById('current-btn');
const exportBtn = document.getElementById('export-btn');
const applyBtn = document.getElementById('apply-btn');
const closeBtn = document.getElementById('close-btn');
const applyAllOpenFilesCheckbox = document.getElementById('apply-all-open-files');
const applyAllOpenFilesLabel = document.getElementById('apply-all-open-files-label');

let activeTemplateId = 'blank';
let currentState = { lang: 'pt', currentTable: null };

const translations = {
    pt: {
        windowTitle: 'Editor de Tabelas - Foxy Hex Editor',
        title: 'Editor de Tabelas',
        subtitle: 'Crie, edite, aplique e exporte tabelas `.json` e `.tbl` no formato Thingy.',
        namePlaceholder: 'Nome da tabela',
        defaultTableName: 'Nova Tabela',
        blankButton: 'Tabela Vazia',
        currentButton: 'Usar Tabela Atual',
        exportButton: 'Exportar',
        applyButton: 'Aplicar no Editor Hex',
        applyAllOpenFiles: 'Aplicar em todos os arquivos abertos',
        closeButton: 'Fechar',
        modelsTitle: 'Modelos',
        labelName: 'Nome',
        labelType: 'Tipo',
        labelEndianness: 'Endianness',
        footerInfo: 'Modelos: ASCII 8/16-bit, Shift-JIS, DTE, MTE, DTE+MTE, Tabela Vazia',
        statusReady: 'Selecione um modelo ou comece do zero.',
        statusSelected: 'Modelo selecionado:',
        statusLoaded: 'Modelo carregado no editor:',
        statusNoCurrent: 'Nenhuma tabela atual disponível no app.',
        statusCurrentLoaded: 'Tabela atual carregada no editor.',
        statusExportCancelled: 'Exportação cancelada.',
        statusExported: 'Tabela exportada para',
        statusApplied: 'Tabela enviada para aplicação no Editor Hex.',
        statusAppliedAll: 'Tabela enviada para aplicação em todos os arquivos abertos.',
        templates: {
            blank: { title: 'Tabela Vazia', desc: 'Modelo vazio para criar do zero.' },
            custom: { title: 'Tabela Customizada', desc: 'Tabela carregada do arquivo.' },
            ascii8: { title: 'ASCII 8-bit', desc: 'Tabela ASCII completa de 20 a 7E.' },
            ascii16be: { title: 'ASCII 16-bit BE', desc: 'ASCII 16-bit completo de 0020 a 007E.' },
            ascii16le: { title: 'ASCII 16-bit LE', desc: 'ASCII 16-bit completo de 2000 a 7E00.' },
            shiftjis: { title: 'Shift-JIS', desc: 'Tabela Shift-JIS completa gerada automaticamente.' },
            dte: { title: 'DTE', desc: 'ASCII base completo com tokens DTE prontos.' },
            mte: { title: 'MTE', desc: 'ASCII base completo com tokens MTE prontos.' },
            dtemte: { title: 'DTE+MTE', desc: 'ASCII base completo com DTE e MTE prontos.' }
        }
    },
    en: {
        windowTitle: 'Table Editor - Foxy Hex Editor',
        title: 'Table Editor',
        subtitle: 'Create, edit, apply, and export `.json` and `.tbl` tables in Thingy format.',
        namePlaceholder: 'Table name',
        defaultTableName: 'New Table',
        blankButton: 'Blank Template',
        currentButton: 'Use Current Table',
        exportButton: 'Export',
        applyButton: 'Apply in Hex Editor',
        applyAllOpenFiles: 'Apply to all open files',
        closeButton: 'Close',
        modelsTitle: 'Templates',
        labelName: 'Name',
        labelType: 'Type',
        labelEndianness: 'Endianness',
        footerInfo: 'Templates: ASCII 8/16-bit, Shift-JIS, DTE, MTE, DTE+MTE, Blank',
        statusReady: 'Choose a template or start from scratch.',
        statusSelected: 'Selected template:',
        statusLoaded: 'Template loaded into editor:',
        statusNoCurrent: 'No current table available in the app.',
        statusCurrentLoaded: 'Current table loaded into the editor.',
        statusExportCancelled: 'Export cancelled.',
        statusExported: 'Table exported to',
        statusApplied: 'Table sent to Hex Editor.',
        statusAppliedAll: 'Table sent to all open files.',
        templates: {
            blank: { title: 'Blank', desc: 'Empty template to start from scratch.' },
            custom: { title: 'Custom Table', desc: 'Table loaded from file.' },
            ascii8: { title: 'ASCII 8-bit', desc: 'Complete ASCII table from 20 to 7E.' },
            ascii16be: { title: 'ASCII 16-bit BE', desc: 'Complete 16-bit ASCII table from 0020 to 007E.' },
            ascii16le: { title: 'ASCII 16-bit LE', desc: 'Complete 16-bit ASCII table from 2000 to 7E00.' },
            shiftjis: { title: 'Shift-JIS', desc: 'Automatically generated full Shift-JIS table.' },
            dte: { title: 'DTE', desc: 'Complete ASCII base with ready DTE tokens.' },
            mte: { title: 'MTE', desc: 'Complete ASCII base with ready MTE tokens.' },
            dtemte: { title: 'DTE+MTE', desc: 'Complete ASCII base with ready DTE and MTE tokens.' }
        }
    }
};

function ensureApplyAllToggle() {
    if (document.getElementById('apply-all-open-files')) {
        return;
    }

    const topbar = document.querySelector('.topbar');
    if (!topbar || !applyBtn) {
        return;
    }

    const toggleLabel = document.createElement('label');
    toggleLabel.className = 'apply-all-toggle';
    toggleLabel.htmlFor = 'apply-all-open-files';
    toggleLabel.style.display = 'inline-flex';
    toggleLabel.style.alignItems = 'center';
    toggleLabel.style.gap = '8px';
    toggleLabel.style.fontSize = '12px';
    toggleLabel.style.color = '#e5e7eb';
    toggleLabel.style.userSelect = 'none';
    toggleLabel.style.padding = '9px 12px';
    toggleLabel.style.borderRadius = '8px';
    toggleLabel.style.border = '1px solid rgba(255,255,255,0.14)';
    toggleLabel.style.background = 'rgba(15,23,42,0.85)';
    toggleLabel.style.whiteSpace = 'nowrap';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'apply-all-open-files';
    checkbox.style.accentColor = '#ff8a3d';

    const labelText = document.createElement('span');
    labelText.id = 'apply-all-open-files-label';
    labelText.textContent = uiText().applyAllOpenFiles;

    toggleLabel.appendChild(checkbox);
    toggleLabel.appendChild(labelText);
    applyBtn.insertAdjacentElement('afterend', toggleLabel);
}

function getUiLang() {
    return currentState.lang === 'en' ? 'en' : 'pt';
}

function uiText() {
    return translations[getUiLang()];
}

function templateLabel(id, field) {
    const template = uiText().templates[id];
    if (!template) {
        // Fallback para template nÃ£o encontrado
        return id === 'custom' ? (field === 'title' ? 'Tabela Customizada' : 'Tabela carregada do arquivo.') : id;
    }
    return template[field];
}

function buildAscii8Mappings() {
    const mappings = {};
    for (let code = 0x20; code <= 0x7E; code++) {
        mappings[code.toString(16).toUpperCase().padStart(2, '0')] = String.fromCharCode(code);
    }
    return mappings;
}

function buildAscii16Mappings(endianness) {
    const mappings = {};
    for (let code = 0x20; code <= 0x7E; code++) {
        const high = '00';
        const low = code.toString(16).toUpperCase().padStart(2, '0');
        const hex = endianness === 'LE' ? `${low}${high}` : `${high}${low}`;
        mappings[hex] = String.fromCharCode(code);
    }
    return mappings;
}

function buildShiftJisMappings() {
    const mappings = {};
    const isValidDecoded = (decoded) => {
        if (!decoded) return false;
        if (decoded.includes('\uFFFD')) return false;
        if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(decoded)) return false;
        return true;
    };

    for (let code = 0x20; code <= 0x7E; code++) {
        const hex = code.toString(16).toUpperCase().padStart(2, '0');
        const decoded = iconvLite.decode(Buffer.from([code]), 'shift_jis');
        if (isValidDecoded(decoded)) {
            mappings[hex] = decoded;
        }
    }

    for (let code = 0xA1; code <= 0xDF; code++) {
        const hex = code.toString(16).toUpperCase().padStart(2, '0');
        const decoded = iconvLite.decode(Buffer.from([code]), 'shift_jis');
        if (isValidDecoded(decoded) && decoded !== '?') {
            mappings[hex] = decoded;
        }
    }

    const leadRanges = [[0x81, 0x9F], [0xE0, 0xFC]];
    const trailRanges = [[0x40, 0x7E], [0x80, 0xFC]];
    for (const [leadStart, leadEnd] of leadRanges) {
        for (let lead = leadStart; lead <= leadEnd; lead++) {
            for (const [trailStart, trailEnd] of trailRanges) {
                for (let trail = trailStart; trail <= trailEnd; trail++) {
                    const decoded = iconvLite.decode(Buffer.from([lead, trail]), 'shift_jis');
                    if (!isValidDecoded(decoded) || decoded === '?') continue;
                    const hex = lead.toString(16).toUpperCase().padStart(2, '0') +
                        trail.toString(16).toUpperCase().padStart(2, '0');
                    mappings[hex] = decoded;
                }
            }
        }
    }

    return mappings;
}

const ascii8Mappings = buildAscii8Mappings();
const ascii16BeMappings = buildAscii16Mappings('BE');
const ascii16LeMappings = buildAscii16Mappings('LE');
const shiftJisMappings = buildShiftJisMappings();

const templates = [
    { id: 'blank', type: '8-bit', endianness: 'BE', mappings: {} },
    { id: 'ascii8', type: '8-bit', endianness: 'BE', mappings: ascii8Mappings },
    { id: 'ascii16be', type: '16-bit', endianness: 'BE', mappings: ascii16BeMappings },
    { id: 'ascii16le', type: '16-bit', endianness: 'LE', mappings: ascii16LeMappings },
    { id: 'shiftjis', type: 'shift-jis', endianness: 'BE', mappings: shiftJisMappings },
    { id: 'dte', type: 'DTE', endianness: 'BE', mappings: ascii8Mappings, dte_sequences: { 'F0': 'th', 'F1': 'he', 'F2': 'in' } },
    { id: 'mte', type: 'MTE', endianness: 'BE', mappings: ascii8Mappings, mte_sequences: { 'E0': 'the', 'E1': 'ing', 'E2': 'tion' } },
    { id: 'dtemte', type: 'DTE+MTE', endianness: 'BE', mappings: ascii8Mappings, dte_sequences: { 'F0': 'th', 'F1': 'he' }, mte_sequences: { 'E0': 'the', 'E1': 'ing' } }
];

function escapeJsonValue(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function applyUiTranslations() {
    const text = uiText();
    document.title = text.windowTitle;
    titleEl.textContent = text.title;
    subtitleEl.textContent = text.subtitle;
    tableName.placeholder = text.namePlaceholder;
    modelsTitleEl.textContent = text.modelsTitle;
    labelNameEl.textContent = text.labelName;
    labelTypeEl.textContent = text.labelType;
    labelEndiannessEl.textContent = text.labelEndianness;
    footerInfoEl.textContent = text.footerInfo;
    currentBtn.textContent = text.currentButton;
    exportBtn.textContent = text.exportButton;
    applyBtn.textContent = text.applyButton;
    const applyAllLabel = document.getElementById('apply-all-open-files-label');
    if (applyAllLabel) applyAllLabel.textContent = text.applyAllOpenFiles;
    closeBtn.textContent = text.closeButton;

    if (!statusText.textContent || statusText.dataset.stateKey === 'ready') {
        statusText.dataset.stateKey = 'ready';
        statusText.textContent = text.statusReady;
    }
}

function buildJsonTemplate(template) {
    // Ordenar chaves hexadecimais numericamente
    const sortHex = (a, b) => {
        const lenDiff = a.length - b.length;
        if (lenDiff !== 0) return lenDiff;
        return a.localeCompare(b);
    };

    const mappings = Object.entries(template.mappings || {})
        .sort(([hexA], [hexB]) => sortHex(hexA, hexB))
        .map(([hex, value]) => `    "${hex}": "${escapeJsonValue(value)}"`)
        .join(',\n');
    const dte = Object.keys(template.dte_sequences || {}).length
        ? `,\n  "dte_sequences": {\n${Object.entries(template.dte_sequences)
            .sort(([hexA], [hexB]) => sortHex(hexA, hexB))
            .map(([hex, value]) => `    "${hex}": "${escapeJsonValue(value)}"`).join(',\n')}\n  }`
        : '';
    const tags = Object.keys(template.tag_sequences || {}).length
        ? `,\n  "tag_sequences": {\n${Object.entries(template.tag_sequences)
            .sort(([hexA], [hexB]) => sortHex(hexA, hexB))
            .map(([hex, value]) => `    "${hex}": "${escapeJsonValue(value)}"`).join(',\n')}\n  }`
        : '';
    const mte = Object.keys(template.mte_sequences || {}).length
        ? `,\n  "mte_sequences": {\n${Object.entries(template.mte_sequences)
            .sort(([hexA], [hexB]) => sortHex(hexA, hexB))
            .map(([hex, value]) => `    "${hex}": "${escapeJsonValue(value)}"`).join(',\n')}\n  }`
        : '';
    const needsEndianness = template.type === '16-bit' || template.type === 'shift-jis' || 
                          (template.type && template.type.includes && template.type.includes('16-bit')) ||
                          template.type === 'DTE' || template.type === 'MTE' || template.type === 'DTE+MTE';
    const endianness = needsEndianness ? `,\n  "endianness": "${template.endianness || 'BE'}"` : '';

    return `{\n  "name": "${escapeJsonValue(template.title || template.name || uiText().defaultTableName)}",\n  "type": "${template.type || '8-bit'}"${endianness},\n  "mappings": {\n${mappings}\n  }${tags}${dte}${mte}\n}\n`;
}

function buildTblTemplate(template) {
    const lines = [
        `# name=${template.title || template.name || uiText().defaultTableName}`,
        `# type=${template.type || '8-bit'}`,
        `# endianness=${template.endianness || 'BE'}`
    ];

    // Ordenar chaves hexadecimais numericamente
    const sortHex = (a, b) => {
        const lenDiff = a.length - b.length;
        if (lenDiff !== 0) return lenDiff;
        return a.localeCompare(b);
    };

    Object.entries(template.mappings || {})
        .sort(([hexA], [hexB]) => sortHex(hexA, hexB))
        .forEach(([hex, value]) => lines.push(`${hex}=${value}`));
    Object.entries(template.tag_sequences || {})
        .sort(([hexA], [hexB]) => sortHex(hexA, hexB))
        .forEach(([hex, value]) => lines.push(`${hex}=${value}`));
    Object.entries(template.dte_sequences || {})
        .sort(([hexA], [hexB]) => sortHex(hexA, hexB))
        .forEach(([hex, value]) => lines.push(`${hex}=${value}`));
    Object.entries(template.mte_sequences || {})
        .sort(([hexA], [hexB]) => sortHex(hexA, hexB))
        .forEach(([hex, value]) => lines.push(`${hex}=${value}`));
    return lines.join('\n') + '\n';
}

function normalizeTableModel(data = {}) {
    return {
        title: data.title || data.name || metaName.value.trim() || tableName.value.trim() || uiText().defaultTableName,
        name: data.name || data.title || metaName.value.trim() || tableName.value.trim() || uiText().defaultTableName,
        type: data.type || metaType.textContent || '8-bit',
        endianness: data.endianness || metaEndianness.textContent || 'BE',
        mappings: { ...(data.mappings || {}) },
        tag_sequences: { ...(data.tag_sequences || {}) },
        dte_sequences: { ...(data.dte_sequences || {}) },
        mte_sequences: { ...(data.mte_sequences || {}) }
    };
}

function inferTableEndiannessFromEntries(entries = {}, fallback = 'BE') {
    let likelyBE = 0;
    let likelyLE = 0;

    Object.entries(entries).forEach(([hexCode, value]) => {
        const key = String(hexCode || '').replace(/^0x/i, '').trim().toUpperCase();
        const text = String(value ?? '');
        if (!/^[0-9A-F]{4}$/.test(key) || text.length !== 1) return;

        const charCode = text.charCodeAt(0);
        if (charCode < 0x20 || charCode > 0x7E) return;

        const firstByte = parseInt(key.slice(0, 2), 16);
        const secondByte = parseInt(key.slice(2, 4), 16);

        if (firstByte === 0x00 && secondByte === charCode) {
            likelyBE++;
        } else if (firstByte === charCode && secondByte === 0x00) {
            likelyLE++;
        }
    });

    if (likelyLE > likelyBE) return 'LE';
    if (likelyBE > likelyLE) return 'BE';
    return fallback;
}

function parseTblContent(content) {
    const lines = String(content || '').replace(/^\uFEFF/, '').split(/\r?\n/);
    const data = {
        name: metaName.value.trim() || tableName.value.trim() || uiText().defaultTableName,
        type: metaType.textContent || '8-bit',
        endianness: null,
        mappings: {},
        tag_sequences: {},
        dte_sequences: {},
        mte_sequences: {}
    };

    for (const rawLine of lines) {
        const line = String(rawLine || '');
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        const directiveMatch = trimmedLine.match(/^#\s*([A-Za-z_][A-Za-z0-9_\-]*)\s*=\s*(.+)$/);
        if (directiveMatch) {
            const key = directiveMatch[1].toLowerCase();
            const value = directiveMatch[2].trim();
            if (key === 'name') data.name = value;
            if (key === 'type') data.type = value;
            if (key === 'endianness') data.endianness = value.toUpperCase() === 'LE' ? 'LE' : 'BE';
            continue;
        }

        const eqIndex = line.indexOf('=');
        if (eqIndex <= 0) continue;

        const hexCode = line.slice(0, eqIndex).trim().replace(/^0x/i, '').toUpperCase();
        const value = line.slice(eqIndex + 1);
        if (!/^[0-9A-F]{2,8}$/.test(hexCode)) continue;

        const hexLength = hexCode.length;
        const valueLength = String(value).length;
        const isTagSequence = /^(\[.*\]|<.*>|\{.*\}|\(.*\))$/.test(value);

        if (isTagSequence) {
            data.tag_sequences[hexCode] = value;
            continue;
        }

        const isShiftJisType = data.type === 'shift-jis' || data.type === 'shift_jis' ||
            (data.type && data.type.startsWith && data.type.startsWith('shift-jis'));

        if (isShiftJisType) {
            data.mappings[hexCode] = value;
        }
        // Detectar DTE/MTE baseado no tamanho do valor (2 chars = DTE, 3+ = MTE)
        // Funciona para 8-bit (2 hex) e 16-bit (4 hex)
        else if (data.type === 'DTE+MTE' || data.type === '16-bit' || data.type === '8-bit') {
            // 8-bit: hex de 2 digitos
            if (hexLength === 2) {
                if (valueLength === 2) {
                    data.dte_sequences[hexCode] = value;
                } else if (valueLength >= 3) {
                    data.mte_sequences[hexCode] = value;
                } else {
                    data.mappings[hexCode] = value;
                }
            }
            // 16-bit: hex de 4 digitos
            else if (hexLength === 4) {
                if (valueLength === 2) {
                    data.dte_sequences[hexCode] = value;
                } else if (valueLength >= 3) {
                    data.mte_sequences[hexCode] = value;
                } else {
                    data.mappings[hexCode] = value;
                }
            }
            // Outros tamanhos: mapeamentos normais
            else {
                data.mappings[hexCode] = value;
            }
        } else if (data.type === 'DTE') {
            // Para DTE puro, qualquer entrada que resulte em 2 chars vai para dte_sequences
            if ((hexLength === 2 || hexLength === 4) && valueLength === 2) {
                data.dte_sequences[hexCode] = value;
            } else {
                data.mappings[hexCode] = value;
            }
        } else if (data.type === 'MTE') {
            // Para MTE puro, qualquer entrada que resulte em 3+ chars vai para mte_sequences
            if ((hexLength === 2 || hexLength === 4) && valueLength >= 3) {
                data.mte_sequences[hexCode] = value;
            } else {
                data.mappings[hexCode] = value;
            }
        } else {
            data.mappings[hexCode] = value;
        }
    }

    if (!data.endianness) {
        const allEntries = {
            ...(data.mappings || {}),
            ...(data.dte_sequences || {}),
            ...(data.mte_sequences || {})
        };
        data.endianness = inferTableEndiannessFromEntries(allEntries, 'BE');
    }

    return normalizeTableModel(data);
}

function parseEditorContent() {
    const content = String(tableEditor.value || '').trim();
    if (!content) {
        return normalizeTableModel();
    }

    if (tableFormat.value === 'json' || content.startsWith('{')) {
        const parsed = JSON.parse(content);
        return normalizeTableModel(parsed);
    }

    return parseTblContent(content);
}

function rewriteEditorFromModel(model) {
    const normalized = normalizeTableModel(model);
    metaName.value = normalized.title;
    tableName.value = normalized.title;
    metaType.textContent = normalized.type;
    metaEndianness.textContent = normalized.endianness;
    tableEditor.value = tableFormat.value === 'tbl'
        ? buildTblTemplate(normalized)
        : buildJsonTemplate(normalized);
    return normalized;
}

function syncMeta() {
    tableName.value = metaName.value;
}

function setStatus(text) {
    statusText.textContent = text;
    delete statusText.dataset.stateKey;
}

function showEditorErrorDialog(message) {
    const existing = document.getElementById('table-editor-error-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'table-editor-error-overlay';
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(6, 10, 20, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        padding: 24px;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
        width: min(520px, calc(100vw - 48px));
        background: #1a2238;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 14px;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
        overflow: hidden;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
        padding: 16px 20px;
        font-size: 20px;
        font-weight: 700;
        color: #ff8a80;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    `;
    header.textContent = getUiLang() === 'en' ? 'Table Error' : 'Erro de Tabela';

    const body = document.createElement('div');
    body.style.cssText = `
        padding: 20px;
        color: #f4f7ff;
        line-height: 1.5;
        white-space: pre-wrap;
    `;
    body.textContent = message;

    const footer = document.createElement('div');
    footer.style.cssText = `
        display: flex;
        justify-content: flex-end;
        padding: 0 20px 20px;
    `;

    const okBtn = document.createElement('button');
    okBtn.textContent = 'OK';
    okBtn.style.cssText = `
        min-width: 88px;
        padding: 10px 18px;
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 10px;
        background: linear-gradient(135deg, #ff6b35, #f7931e);
        color: #fff;
        font-weight: 700;
        cursor: pointer;
    `;

    const closeDialog = () => overlay.remove();
    okBtn.addEventListener('click', closeDialog);
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) closeDialog();
    });

    footer.appendChild(okBtn);
    dialog.appendChild(header);
    dialog.appendChild(body);
    dialog.appendChild(footer);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    okBtn.focus();
}

function renderTemplates() {
    // Adicionar template 'custom' temporariamente se for uma tabela importada
    const displayTemplates = [...templates];
    if (activeTemplateId === 'custom' && !displayTemplates.find(t => t.id === 'custom')) {
        displayTemplates.unshift({ id: 'custom', type: '8-bit', endianness: 'BE', mappings: {} });
    }

    templateList.innerHTML = displayTemplates.map((template) => `
        <div class="template-card ${template.id === activeTemplateId ? 'active' : ''}" data-id="${template.id}">
            <strong>${templateLabel(template.id, 'title')}</strong>
            <span>${templateLabel(template.id, 'desc')}</span>
        </div>
    `).join('');

    templateList.querySelectorAll('.template-card').forEach((card) => {
        card.addEventListener('click', () => {
            activeTemplateId = card.dataset.id;
            renderTemplates();
            const template = templates.find((item) => item.id === activeTemplateId);
            if (template) {
                const selectedTitle = templateLabel(template.id, 'title');
                metaName.value = selectedTitle;
                tableName.value = selectedTitle;
                metaType.textContent = template.type || '8-bit';
                metaEndianness.textContent = template.endianness || 'BE';
                setStatus(`${uiText().statusSelected} ${selectedTitle}`);
                applyTemplate();
            }
        });
    });
}

function applyTemplate() {
    const template = templates.find((item) => item.id === activeTemplateId) || templates[0];
    const fallbackTitle = templateLabel(template.id, 'title');
    const hydratedTitle = metaName.value.trim() || fallbackTitle;
    const hydrated = {
        ...template,
        title: hydratedTitle,
        name: hydratedTitle,
        type: metaType.textContent,
        endianness: metaEndianness.textContent
    };
    rewriteEditorFromModel(hydrated);
    setStatus(`${uiText().statusLoaded} ${hydrated.title}`);
}

function loadBlank() {
    activeTemplateId = 'blank';
    renderTemplates();
    const defaultName = uiText().defaultTableName;
    metaName.value = defaultName;
    tableName.value = defaultName;
    metaType.textContent = '8-bit';
    metaEndianness.textContent = 'BE';
    applyTemplate();
}

function formatCurrentTableFromApp() {
    const table = currentState.currentTable;
    if (!table) {
        setStatus(uiText().statusNoCurrent);
        return;
    }

    const normalizedMappings = { ...(table.mappings || {}) };
    if (table.mapping) {
        Object.entries(table.mapping).forEach(([key, value]) => {
            if (typeof value !== 'string' || !value || value === '.') return;
            if (/^\d+$/.test(key)) {
                normalizedMappings[Number(key).toString(16).toUpperCase().padStart(2, '0')] = value;
            } else if (/^[0-9A-F]{2,4}$/i.test(key)) {
                normalizedMappings[String(key).toUpperCase()] = value;
            }
        });
    }

    // Verificar se Ã© uma tabela customizada (importada de arquivo)
    const isCustomTable = currentState.isCustomTable || table._isImported;
    const templateId = isCustomTable ? 'custom' : 'blank';
    activeTemplateId = templateId;

    // Definir o formato baseado no formato original da tabela ou padrÃ£o
    const originalFormat = currentState.tableFormat || table._originalFormat || 'tbl';
    tableFormat.value = originalFormat;

    const template = {
        id: templateId,
        title: isCustomTable ? uiText().templates.custom.title : (table.name || uiText().defaultTableName),
        name: table.name || uiText().defaultTableName,
        type: table.type || '8-bit',
        endianness: table.endianness || 'BE',
        mappings: normalizedMappings,
        tag_sequences: table.tag_sequences || {},
        dte_sequences: table.dte_sequences || {},
        mte_sequences: table.mte_sequences || {}
    };

    renderTemplates(); // Re-renderizar para mostrar o template custom selecionado
    rewriteEditorFromModel(template);
    setStatus(isCustomTable ? uiText().templates.custom.desc : uiText().statusCurrentLoaded);
}

async function exportCurrentTable() {
    const ext = tableFormat.value;
    const defaultPath = `${(tableName.value || 'table').trim().replace(/[\\/:*?"<>|]/g, '_') || 'table'}.${ext}`;
    const result = await ipcRenderer.invoke('show-save-dialog', {
        defaultPath,
        filters: [{ name: ext === 'json' ? 'JSON' : 'Thingy TBL', extensions: [ext] }]
    });

    if (result.canceled || !result.filePath) {
        setStatus(uiText().statusExportCancelled);
        return;
    }

    fs.writeFileSync(result.filePath, tableEditor.value, 'utf8');
    setStatus(`${uiText().statusExported} ${result.filePath}`);
}

function findUnsupportedShiftJisSequences() {
    const content = String(tableEditor.value || '');
    const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/);
    const isJson = tableFormat.value === 'json' || content.trim().startsWith('{');

    let model;
    try {
        model = parseEditorContent();
    } catch (_) {
        return [];
    }

    const isShiftJisType = !!(model?.type && String(model.type).toLowerCase().includes('shift-jis'));
    if (!isShiftJisType) return [];

    const issues = [];

    if (isJson) {
        Object.entries(model.mappings || {}).forEach(([hexCode, value]) => {
            const text = String(value ?? '');
            const isTag = /^(\[.*\]|<.*>|\{.*\}|\(.*\))$/.test(text);
            if (!isTag && text.length >= 2) {
                issues.push(`${hexCode}=${text}`);
            }
        });
        return issues;
    }

    for (const rawLine of lines) {
        const line = String(rawLine || '');
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const eqIndex = line.indexOf('=');
        if (eqIndex <= 0) continue;

        const hexCode = line.slice(0, eqIndex).trim().replace(/^0x/i, '').toUpperCase();
        const value = line.slice(eqIndex + 1);
        if (!/^[0-9A-F]{2,8}$/.test(hexCode)) continue;

        const isTag = /^(\[.*\]|<.*>|\{.*\}|\(.*\))$/.test(value);
        if (!isTag && String(value).length >= 2) {
            issues.push(`${hexCode}=${value}`);
        }
    }

    return issues;
}

function applyInApp() {
    const unsupportedShiftJisEntries = findUnsupportedShiftJisSequences();
    if (unsupportedShiftJisEntries.length > 0) {
        const preview = unsupportedShiftJisEntries.slice(0, 3).join(', ');
        const extra = unsupportedShiftJisEntries.length > 3
            ? ` (+${unsupportedShiftJisEntries.length - 3})`
            : '';
        const message = `Tabelas Shift-JIS aceitam apenas TAG por enquanto. Remova entradas DTE/MTE como ${preview}${extra}.`;
        showEditorErrorDialog(message);
        return;
    }

    ipcRenderer.send('table-editor-apply', {
        content: tableEditor.value,
        format: tableFormat.value,
        fileName: `${(tableName.value || 'table').trim() || 'table'}.${tableFormat.value}`,
        applyToAllOpenFiles: !!document.getElementById('apply-all-open-files')?.checked
    });
    const shouldApplyToAll = !!document.getElementById('apply-all-open-files')?.checked;
    setStatus(shouldApplyToAll ? uiText().statusAppliedAll : uiText().statusApplied);
}

function detectAndUpdateTableType() {
    try {
        if (isEditingIncompleteTag()) {
            return;
        }

        const model = parseEditorContent();
        const mappings = model.mappings || {};
        const allEntries = { ...mappings, ...(model.dte_sequences || {}), ...(model.mte_sequences || {}) };
        
        let hasDTE = false;
        let hasMTE = false;
        let has8bit = false;
        let has16bit = false;
        let likelyBE = 0;
        let likelyLE = 0;
        const isShiftJisBase = !!(model.type && model.type.toLowerCase().includes('shift-jis'));
        let hasShiftJisLeadTrail = false;
        
        // Analisar mapeamentos para detectar tipo e endianness
        Object.entries(allEntries).forEach(([hexCode, value]) => {
            const hexLength = hexCode.length;
            const valueLength = String(value).length;
            
            // Detectar 8-bit vs 16-bit baseado no tamanho do hex
            if (hexLength === 2) {
                has8bit = true;
                
                if (!isShiftJisBase) {
                    if (valueLength === 2) {
                        hasDTE = true;
                    }
                    else if (valueLength >= 3) {
                        hasMTE = true;
                    }
                }
            } else if (hexLength === 4) {
                has16bit = true;
                
                if (!isShiftJisBase) {
                    if (valueLength === 2) {
                        hasDTE = true;
                    }
                    else if (valueLength >= 3) {
                        hasMTE = true;
                    }
                }
                
                // Detectar endianness baseado em ASCII comuns
                // BE: 0020=space, 0041=A, 0042=B, etc
                // LE: 2000=space, 4100=A, 4200=B, etc
                const firstByte = parseInt(hexCode.slice(0, 2), 16);
                const secondByte = parseInt(hexCode.slice(2, 4), 16);
                const validLead = (firstByte >= 0x81 && firstByte <= 0x9F) || (firstByte >= 0xE0 && firstByte <= 0xFC);
                const validTrail = (secondByte >= 0x40 && secondByte <= 0x7E) || (secondByte >= 0x80 && secondByte <= 0xFC);
                if (validLead && validTrail) {
                    hasShiftJisLeadTrail = true;
                }
                const char = String(value);
                
                // Verificar se Ã© ASCII printable
                if (char.length === 1) {
                    const charCode = char.charCodeAt(0);
                    if (charCode >= 32 && charCode <= 126) {
                        // BE: high byte = 00, low byte = ASCII
                        if (firstByte === 0 && secondByte === charCode) {
                            likelyBE++;
                        }
                        // LE: high byte = ASCII, low byte = 00
                        else if (secondByte === 0 && firstByte === charCode) {
                            likelyLE++;
                        }
                    }
                }
            }
        });
        
        // Determinar novo tipo (usando tipos compostos para 16-bit)
        let newType = model.type || '8-bit';
        
        // Se tem hex 16-bit (4 digitos), Ã© 16-bit
        if (isShiftJisBase || hasShiftJisLeadTrail) {
            newType = 'shift-jis';
        } else if (has16bit && !has8bit) {
            // Base type Ã© 16-bit, mas vamos verificar DTE/MTE
            if (hasDTE && hasMTE) {
                newType = '16-bit DTE+MTE';
            } else if (hasDTE) {
                newType = '16-bit DTE';
            } else if (hasMTE) {
                newType = '16-bit MTE';
            } else {
                newType = '16-bit';
            }
        } else if (has8bit && !has16bit) {
            // 8-bit com DTE/MTE
            if (hasDTE && hasMTE) {
                newType = '8-bit DTE+MTE';
            } else if (hasDTE) {
                newType = '8-bit DTE';
            } else if (hasMTE) {
                newType = '8-bit MTE';
            } else {
                newType = '8-bit';
            }
        } else if (hasDTE && hasMTE) {
            newType = 'DTE+MTE';
        } else if (hasDTE) {
            newType = 'DTE';
        } else if (hasMTE) {
            newType = 'MTE';
        }
        
        // Atualizar tipo se mudou
        if (newType !== metaType.textContent) {
            metaType.textContent = newType;
            updateTypeInEditorContent(newType);
        }
        
        // Detectar e atualizar endianness para tabelas 16-bit
        if (has16bit && (likelyBE > likelyLE) && metaEndianness.textContent !== 'BE') {
            metaEndianness.textContent = 'BE';
            updateEndiannessInEditorContent('BE');
        } else if (has16bit && (likelyLE > likelyBE) && metaEndianness.textContent !== 'LE') {
            metaEndianness.textContent = 'LE';
            updateEndiannessInEditorContent('LE');
        }
        
        // Se nÃ£o Ã© um modelo built-in, mudar para Tabela Customizada
        const builtInTemplates = ['blank', 'ascii8', 'ascii16be', 'ascii16le', 'shiftjis', 'dte', 'mte', 'dtemte'];
        if (builtInTemplates.includes(activeTemplateId)) {
            activeTemplateId = 'custom';
            renderTemplates();
        }
    } catch (_) {
        // Ignorar erros de parsing durante digitaÃ§Ã£o
    }
}

function updateEndiannessInEditorContent(newEndianness) {
    const content = tableEditor.value;
    const isJson = tableFormat.value === 'json' || content.trim().startsWith('{');
    const selectionStart = tableEditor.selectionStart;
    const selectionEnd = tableEditor.selectionEnd;
    
    if (isJson) {
        // Para JSON: substituir "endianness": "..."
        const updatedContent = content.replace(/"endianness"\s*:\s*"[^"]*"/, `"endianness": "${newEndianness}"`);
        if (updatedContent !== content) {
            tableEditor.value = updatedContent;
            restoreEditorSelection(selectionStart, selectionEnd);
        }
    } else {
        // Para TBL: substituir # endianness=...
        const lines = content.split('\n');
        let endianLineIndex = -1;
        
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim().match(/^#\s*endianness\s*=/i)) {
                endianLineIndex = i;
                break;
            }
        }
        
        if (endianLineIndex >= 0) {
            lines[endianLineIndex] = `# endianness=${newEndianness}`;
            tableEditor.value = lines.join('\n');
            restoreEditorSelection(selectionStart, selectionEnd);
        }
    }
}

function updateTypeInEditorContent(newType) {
    const content = tableEditor.value;
    const isJson = tableFormat.value === 'json' || content.trim().startsWith('{');
    const selectionStart = tableEditor.selectionStart;
    const selectionEnd = tableEditor.selectionEnd;
    
    if (isJson) {
        // Para JSON: substituir "type": "..."
        const updatedContent = content.replace(/"type"\s*:\s*"[^"]*"/, `"type": "${newType}"`);
        if (updatedContent !== content) {
            tableEditor.value = updatedContent;
            restoreEditorSelection(selectionStart, selectionEnd);
        }
    } else {
        // Para TBL: substituir # type=...
        const lines = content.split('\n');
        let typeLineIndex = -1;
        
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim().match(/^#\s*type\s*=/i)) {
                typeLineIndex = i;
                break;
            }
        }
        
        if (typeLineIndex >= 0) {
            lines[typeLineIndex] = `# type=${newType}`;
            tableEditor.value = lines.join('\n');
            restoreEditorSelection(selectionStart, selectionEnd);
        }
    }
}

function restoreEditorSelection(selectionStart, selectionEnd) {
    if (typeof selectionStart !== 'number' || typeof selectionEnd !== 'number') return;
    const max = tableEditor.value.length;
    const start = Math.min(selectionStart, max);
    const end = Math.min(selectionEnd, max);
    tableEditor.setSelectionRange(start, end);
}

function isEditingIncompleteTag() {
    const content = tableEditor.value || '';
    const cursor = typeof tableEditor.selectionStart === 'number' ? tableEditor.selectionStart : 0;
    const lineStart = content.lastIndexOf('\n', Math.max(0, cursor - 1)) + 1;
    const lineEndIndex = content.indexOf('\n', cursor);
    const lineEnd = lineEndIndex === -1 ? content.length : lineEndIndex;
    const currentLine = content.slice(lineStart, lineEnd);

    if (!currentLine.includes('=')) return false;

    const value = currentLine.slice(currentLine.indexOf('=') + 1);
    const trimmedValue = value.trim();
    if (!trimmedValue) return false;

    const openers = ['<', '[', '{', '('];
    const closers = ['>', ']', '}', ')'];

    for (let i = 0; i < openers.length; i++) {
        const open = openers[i];
        const close = closers[i];
        const openIndex = trimmedValue.indexOf(open);
        if (openIndex !== -1) {
            const closeIndex = trimmedValue.indexOf(close, openIndex + 1);
            if (closeIndex === -1) {
                return true;
            }
        }
    }

    return false;
}

// Debounce helper
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

currentBtn.addEventListener('click', formatCurrentTableFromApp);
exportBtn.addEventListener('click', exportCurrentTable);
applyBtn.addEventListener('click', applyInApp);
closeBtn.addEventListener('click', () => ipcRenderer.send('close-table-editor-window'));
tableFormat.addEventListener('change', () => {
    try {
        const model = parseEditorContent();
        rewriteEditorFromModel(model);
    } catch (_) {
        const fallback = currentState.currentTable
            ? normalizeTableModel(currentState.currentTable)
            : normalizeTableModel();
        rewriteEditorFromModel(fallback);
    }
});
metaName.addEventListener('input', syncMeta);
tableName.addEventListener('input', () => { metaName.value = tableName.value; });

// Detectar tipo automaticamente enquanto edita (com debounce de 500ms)
tableEditor.addEventListener('input', debounce(detectAndUpdateTableType, 500));

ipcRenderer.on('init-table-editor-window', (event, state) => {
    currentState = state || currentState;
    ensureApplyAllToggle();
    applyUiTranslations();
    renderTemplates();
    // Verificar se Ã© uma tabela customizada do usuÃ¡rio (carregada de arquivo)
    // ou uma tabela padrÃ£o do sistema (ascii, nes, snes, gb)
    const isSystemTable = currentState.currentTable && !currentState.isCustomTable && 
                          !currentState.currentTable._isImported;
    if (currentState.currentTable && !isSystemTable) {
        formatCurrentTableFromApp();
    } else {
        loadBlank();
    }
});

ensureApplyAllToggle();
applyUiTranslations();
renderTemplates();
loadBlank();
