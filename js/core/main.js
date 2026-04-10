class FoxyHexEditorComplete {
constructor() {
// === CORE PROPERTIES ===
this.data = new Uint8Array(0);
this.originalData = new Uint8Array(0);

Object.defineProperty(this, 'fileData', {
    get: () => this.data,
    set: (value) => { this.data = value; }
});
this.cursorPosition = 0;
this.selectionStart = 0;
this.selectionEnd = 0;
this.offsetDisplayBase = 0;
this.bytesPerLine = 16;
this.activePanel = 'hex'; // 'hex' ou 'ascii'
this.editMode = 'view'; // 'view' ou 'edit'
this.insertMode = false;

// === ARQUIVO ATUAL ===
this.currentFileName = null; // Nome do arquivo atual
this.currentFileExtension = null; // Extensão do arquivo atual

// === VIRTUAL SCROLLING ===
this.virtualScrollEnabled = true;
this.visibleLines = 50;
this.scrollOffset = 0;
this.lastScrollPosition = 0;
this.scrollTimeout = null;
this.cursorVisibleTimeout = null;
this.renderRequestId = null;
this.isUserScrolling = false;
this.preventCursorFollow = false;

// === ADVANCED SCROLLING SYSTEM ===
this.currentScrollPercent = 0;
this.isDraggingThumb = false;
this.dragStartY = 0;
this.dragStartPercent = 0;
this.selectionState = {
    isDragging: false,
    startPos: 0,
    activePanel: 'hex'
};

// === EDITING SYSTEM ===
this.history = [];
this.historyIndex = -1;
this.maxHistorySize = 100;
this.modifiedBytes = new Set();
this.hasUnsavedChanges = false;
this.nibblePosition = 0; // Posição do nibble atual (0 = high nibble, 1 = low nibble)
this.editingBytes = new Set(); // Bytes que estão sendo editados (destacados em preto)

// === BOOKMARKS ===
this.bookmarks = [];
this.currentBookmarkId = 0;
this.bookmarksSet = new Set(); // Cache para busca rápida O(1) na renderização

// === SEARCH ===
this.searchResults = [];
this.searchResultsSet = new Set(); // Cache para busca rápida O(1) na renderização
this.currentSearchIndex = -1;
this.lastSearchTerm = '';
this.searchMode = 'text';
this.globalTabSearchActive = false;
this.globalTabSearchGroups = [];
this.globalTabSearchSkippedLargeCount = 0;



// === CHARACTER TABLES ===
this.currentCharTable = 'ascii';
this.charTables = this.initCharTables();
this.selectedCharTable = null;
this.charDecoder16 = null; // 16-bit decoder instance


// === COLOR SETTINGS ===
this.useCharColors = true; // Toggle for character colors

// === GAME ANALYSIS ===
this.gameAnalysis = {};

// === EVENT SYSTEM ===
this.eventListeners = {};

// === MOUSE SELECTION ===
this.isSelecting = false;

// === HIGHLIGHT SYSTEM ===
this.highlights = new Map(); // Map<id, {start, end, color, id}>
this.highlightsMap = new Map(); // Cache para busca rápida O(1) na renderização: offset -> highlight
this.highlightIdCounter = 0;
this.selectedHighlight = null; // Marcação selecionada para remoção
this.highlightColors = HIGHLIGHT_THEMES;

// Cores personalizáveis para marcações
this.highlightColorPresets = HIGHLIGHT_COLOR_PRESETS;

// Cor atual selecionada para marcações
this.currentHighlightColor = 'default';

// === PERSISTENCE SYSTEM ===
this.persistenceEnabled = true;
this.dataFolder = './data/highlights/';
this.currentHighlightFile = null; // Caminho do arquivo .foxy atual

// === MODAL CONTROL ===
this.isModalPinned = false;
this.modalClickHandler = null;
this.isDragging = false;
this.dragStartX = 0;
this.dragStartY = 0;
this.modalStartX = 0;
this.modalStartY = 0;

// === FILE LOADING FIX PROPERTIES ===
this.loadingTimeout = null;
this.currentFileReader = null;
this.forceFileReload = false;

this.init();
}

init() {
this.setupCharTables();
this.loadOffsetDisplayBase();
// Ensure ASCII is the default table
this.currentCharTable = 'ascii';
this.updateTableDisplay();



// Setup global tab handler immediately (only once)
if (!this._tabHandlerConfigured) {
    this.setupGlobalTabHandler();
    this._tabHandlerConfigured = true;
}

    this.bindEvents();
    // Removed loadSampleData() - app opens clean
    this.saveState('Estado inicial');
    this.render();

    // Initialize color toggle and load color configuration
    this.loadColorConfig();
    this.updateColorToggle();
    
    // Carregar preferência de cor de marcação
    this.loadHighlightColorPreference();

    // Initialize enhanced drag selection if available
    if (typeof EnhancedDragSelection !== 'undefined') {
        this.enhancedDragSelection = new EnhancedDragSelection(this);
        // Delay initialization to ensure DOM is ready
        setTimeout(() => {
            this.enhancedDragSelection.initialize();
        }, 200);
    }


// New system auto-initializes via DOMContentLoaded
this.pointerFunctions = null;


   // Adicionar estilos CSS para sistema de highlights
    this.addHighlightStyles();

    // Inicializar sistema de persistência
    this.ensureDataFolder();

    // Atualizar estado inicial do botão de marcações
    this.updateHighlightsButtonState();

    // Initialize advanced scrolling system (creates container even without file)
    this.initializeAdvancedScrolling();

    // Listen for language changes to update "no file" message
    document.addEventListener('i18n-updated', () => {
        if (this.getDataLength() === 0 && this._content) {
            const noFileText = window.I18n?.t ? window.I18n.t('status.no_file') : 'Nenhum arquivo carregado';
            this._content.innerHTML = `<div style="padding: 20px; color: #666; text-align: center;">${noFileText}</div>`;
        }
    });

}

// === ADVANCED SCROLLING SYSTEM ===

initializeAdvancedScrolling() {
const container = document.getElementById('hex-content');
if (!container) return;

// Only initialize if we have data
if (this.getDataLength() === 0) {
    // Create container anyway to show "no file" message
    if (!container.__foxyAdvancedScrollReady) {
        this.recreateContainerWithAdvancedScrolling();
        container.__foxyAdvancedScrollReady = true;
    }
    // Show "no file" message
    if (this._content) {
        const noFileText = window.I18n?.t ? window.I18n.t('status.no_file') : 'Nenhum arquivo carregado';
        this._content.innerHTML = `<div style="padding: 20px; color: #666; text-align: center;">${noFileText}</div>`;
    }
    return;
}

// Store original container properties
this._originalContainerHeight = container.clientHeight;
this._originalContainerStyle = container.style.cssText;

// Calculate scroll parameters
this.fileSize = this.getDataLength();
this.lineHeight = this.getEffectiveLineHeight();
this.totalLines = Math.ceil(this.fileSize / this.bytesPerLine);
this.containerHeight = container.clientHeight;
this.visibleLines = Math.floor(this.containerHeight / this.lineHeight);
this.maxScrollLines = Math.max(0, this.totalLines - this.visibleLines);

if (container.__foxyAdvancedScrollReady) {
    this._content = document.getElementById('complete-content') || this._content;
    this._scrollbar = document.getElementById('complete-scrollbar') || this._scrollbar;
    if (this._scrollbar) {
        this._upBtn = this._scrollbar.children[0] || this._upBtn;
        this._track = this._scrollbar.children[1] || this._track;
        this._downBtn = this._scrollbar.children[2] || this._downBtn;
        this._thumb = this._track ? this._track.firstElementChild || this._thumb : this._thumb;
    }
    return;
}

// Recreate container with advanced scrolling
this.recreateContainerWithAdvancedScrolling();
container.__foxyAdvancedScrollReady = true;
}

recreateContainerWithAdvancedScrolling() {
const container = document.getElementById('hex-content');
if (!container) return;

// Clear and recreate container
container.innerHTML = '';
container.style.cssText = `
    height: 100%;
    min-height: 0;
    overflow: hidden;
    position: relative;
    background: rgba(26, 26, 46, 0.4);
    font-family: 'JetBrains Mono', monospace;
    outline: none;
`;
container.setAttribute('tabindex', '0');

// Create content area
const content = document.createElement('div');
content.id = 'complete-content';
content.style.cssText = `
    position: absolute;
    top: 0; left: 0; right: 20px; height: 100%;
    overflow: hidden;
`;

// Create custom scrollbar
const scrollbar = document.createElement('div');
scrollbar.id = 'complete-scrollbar';
scrollbar.style.cssText = `
    position: absolute; right: 0; top: 0; width: 20px; height: 100%;
    background: rgba(15, 15, 35, 0.9);
    border-left: 1px solid rgba(255, 255, 255, 0.1);
    z-index: 1000;
`;

const track = document.createElement('div');
track.style.cssText = `
    position: absolute; top: 20px; left: 2px; right: 2px; bottom: 20px;
    background: rgba(255, 255, 255, 0.1); border-radius: 8px; cursor: pointer;
`;

const thumb = document.createElement('div');
thumb.style.cssText = `
    position: absolute; left: 0; right: 0; height: 50px;
    background: linear-gradient(135deg, #ff6b35, #f7931e);
    border-radius: 8px; cursor: grab;
`;

const upBtn = document.createElement('div');
upBtn.innerHTML = '▲';
upBtn.style.cssText = `
    position: absolute; top: 0; left: 0; right: 0; height: 20px;
    background: rgba(255, 255, 255, 0.1); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    color: white; font-size: 12px;
`;

const downBtn = document.createElement('div');
downBtn.innerHTML = '▼';
downBtn.style.cssText = `
    position: absolute; bottom: 0; left: 0; right: 0; height: 20px;
    background: rgba(255, 255, 255, 0.1); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    color: white; font-size: 12px;
`;

// Assemble scrollbar
track.appendChild(thumb);
scrollbar.appendChild(upBtn);
scrollbar.appendChild(track);
scrollbar.appendChild(downBtn);
container.appendChild(content);
container.appendChild(scrollbar);

// Store references
this._content = content;
this._scrollbar = scrollbar;
this._track = track;
this._thumb = thumb;
this._upBtn = upBtn;
this._downBtn = downBtn;

// Bind scrollbar events
this.bindScrollbarEvents();

// Bind advanced content events after content is created
setTimeout(() => {
    this.bindAdvancedContentEvents();
}, 100);
}

bindScrollbarEvents() {
// Wheel events com navegação padrão (1 linha por vez)
const container = document.getElementById('hex-content');
if (!container) return;

if (this._wheelHandler) {
    container.removeEventListener('wheel', this._wheelHandler);
}

this._wheelHandler = (e) => {
    e.preventDefault();
    
    // Detectar se é scroll de zoom (Ctrl + wheel)
    if (e.ctrlKey) {
        this.handleZoomScroll(e);
        return;
    }
    
    // Marcar que estamos fazendo scroll manual para evitar interferência do cursor
    const eventTarget = e.target instanceof Element ? e.target : null;
    const isTextColumnHover = !!(eventTarget && eventTarget.closest('.hex-ascii-viewport, .decoded-text-header, #text-column-scrollbar'));
    const horizontalIntent = Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey;
    if (isTextColumnHover && horizontalIntent && typeof this.scrollTextColumnBy === 'function') {
        const horizontalDelta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if (this.scrollTextColumnBy(horizontalDelta)) {
            return;
        }
    }

    this.isManualScrolling = true;
    this.preventCursorFollow = true;
    
    // Calcular delta baseado em 1 linha por vez
    const totalLines = Math.ceil(this.getDataLength() / this.bytesPerLine);
    const visibleLines = this.visibleLines || 50;
    const maxScrollLines = Math.max(0, totalLines - visibleLines);
    
    // Scroll fixo de 1 linha por vez para todos os arquivos
    let delta;
    if (maxScrollLines <= 0) {
        // Arquivo cabe inteiro na tela - não fazer scroll
        delta = 0;
    } else {
        // Scroll fixo de 1 linha por vez - delta baseado em linhas scrolláveis
        const singleLineDelta = 1 / maxScrollLines;
        // Normalizar deltaY para sempre ser 1 linha por vez
        const direction = e.deltaY > 0 ? 1 : -1;
        delta = direction * singleLineDelta;
    }
    
    this.currentScrollPercent = Math.max(0, Math.min(1, this.currentScrollPercent + delta));
    this.completeRenderWithColors(this.currentScrollPercent, true);
    
    // Limpar flag após um pequeno delay
    setTimeout(() => {
        this.isManualScrolling = false;
        this.preventCursorFollow = false;
    }, 150);
};

container.addEventListener('wheel', this._wheelHandler, { passive: false });



// Função para handle de zoom
this.handleZoomScroll = function(e) {
    e.preventDefault();
    if (e.deltaY < 0) {
        this.zoomIn();
    } else {
        this.zoomOut();
    }
};

// Funções de zoom
this.zoomIn = function() {
    if (!this.zoomLevel) this.zoomLevel = 1.0;
    this.zoomLevel = Math.min(3.0, this.zoomLevel + 0.1);
    this.completeRenderWithColors(this.currentScrollPercent, true);
};

this.zoomOut = function() {
    if (!this.zoomLevel) this.zoomLevel = 1.0;
    this.zoomLevel = Math.max(0.5, this.zoomLevel - 0.1);
    this.completeRenderWithColors(this.currentScrollPercent, true);
};

// Scrollbar button events com navegação padrão (1 linha por vez)
this._upBtn.onclick = () => {
    const totalLines = Math.ceil(this.getDataLength() / this.bytesPerLine);
    const visibleLines = this.visibleLines || 50;
    const maxScrollLines = Math.max(0, totalLines - visibleLines);
    
    if (maxScrollLines > 0) {
        const singleLineDelta = 1 / maxScrollLines;  // CORREÇÃO: usar maxScrollLines, não totalLines
        this.currentScrollPercent = Math.max(0, this.currentScrollPercent - singleLineDelta);
        this.completeRenderWithColors(this.currentScrollPercent, true);
    }
};

this._downBtn.onclick = () => {
    const totalLines = Math.ceil(this.getDataLength() / this.bytesPerLine);
    const visibleLines = this.visibleLines || 50;
    const maxScrollLines = Math.max(0, totalLines - visibleLines);
    
    if (maxScrollLines > 0) {
        const singleLineDelta = 1 / maxScrollLines;  // CORREÇÃO: usar maxScrollLines, não totalLines
        this.currentScrollPercent = Math.min(1, this.currentScrollPercent + singleLineDelta);
        this.completeRenderWithColors(this.currentScrollPercent, true);
    }
};

// Track click events
this._track.onclick = (e) => {
    if (e.target === this._thumb) return;
    const rect = this._track.getBoundingClientRect();
    const percent = (e.clientY - rect.top) / this._track.clientHeight;
    this.currentScrollPercent = Math.max(0, Math.min(1, percent));
    this.completeRenderWithColors(this.currentScrollPercent, true);
};

// Thumb drag events
this._thumb.onmousedown = (e) => {
    e.preventDefault();
    this.isDraggingThumb = true;
    this.dragStartY = e.clientY;
    this.dragStartPercent = this.currentScrollPercent;
    this._thumb.style.cursor = 'grabbing';
};

if (this._documentMouseMoveHandler) {
    document.removeEventListener('mousemove', this._documentMouseMoveHandler);
}
if (this._documentMouseUpHandler) {
    document.removeEventListener('mouseup', this._documentMouseUpHandler);
}

this._documentMouseMoveHandler = (e) => {
    if (this.isDraggingThumb) {
        e.preventDefault();
        const deltaY = e.clientY - this.dragStartY;
        const trackHeight = this._track.clientHeight - this._thumb.clientHeight;
        const deltaPercent = deltaY / trackHeight;
        this.currentScrollPercent = Math.max(0, Math.min(1, this.dragStartPercent + deltaPercent));
        this.completeRenderWithColors(this.currentScrollPercent, true);
    }
};

this._documentMouseUpHandler = (e) => {
    if (this.isDraggingThumb) {
        this.isDraggingThumb = false;
        this._thumb.style.cursor = 'grab';
    }
    
    if (this.selectionState.isDragging) {
        this.selectionState.isDragging = false;
    }
};

document.addEventListener('mousemove', this._documentMouseMoveHandler);
document.addEventListener('mouseup', this._documentMouseUpHandler);
}

// === ADVANCED RENDERING SYSTEM ===

completeRenderWithColors(percent = this.currentScrollPercent, preserveCursor = false) {
// Verificação de segurança para evitar erros quando dados não estão carregados
if (this.getDataLength() === 0 || !this.fileSize) {
    if (this._content) {
        const noFileText = window.I18n?.t ? window.I18n.t('status.no_file') : 'Nenhum arquivo carregado';
        this._content.innerHTML = `<div style="padding: 20px; color: #666; text-align: center;">${noFileText}</div>`;
    }
    return 0;
}

const p = Math.max(0, Math.min(1, percent));
const targetLine = Math.floor(p * this.maxScrollLines);
const startLine = Math.max(0, Math.min(targetLine, this.totalLines - this.visibleLines));
const endLine = Math.min(this.totalLines - 1, startLine + this.visibleLines - 1);

if (!this._content) return;

if (typeof this.resetTextColumnScrollMetrics === 'function') {
    this.resetTextColumnScrollMetrics();
}

// Clear content efficiently
this._content.innerHTML = '';
const fragment = document.createDocumentFragment();

const selStart = Math.min(this.selectionStart, this.selectionEnd);
const selEnd = Math.max(this.selectionStart, this.selectionEnd);



// Pre-calculate line count to avoid repeated calculations
const lineCount = endLine - startLine + 1;
const lines = new Array(lineCount);

// Create all lines in parallel
for (let i = 0; i < lineCount; i++) {
    const line = startLine + i;
    const offset = line * this.bytesPerLine;
    if (offset < this.fileSize) {
        lines[i] = this.createCompleteLineWithColors(offset, selStart, selEnd);
    }
}

// Append all lines at once
lines.forEach(line => {
    if (line) fragment.appendChild(line);
});

if (typeof this.resetTextColumnScrollMetrics === 'function') {
    this.resetTextColumnScrollMetrics();
    lines.forEach((line) => {
        if (!line) return;
        const textVisualUnits = parseInt(line.dataset?.textVisualUnits || '0', 10) || 0;
        this.registerTextColumnScrollUnits(textVisualUnits);
    });
}

const maxTextVisualUnits = lines.reduce((maxUnits, line) => {
    if (!line) return maxUnits;
    const textVisualUnits = parseInt(line.dataset?.textVisualUnits || '0', 10) || 0;
    return Math.max(maxUnits, textVisualUnits);
}, 0);

this._content.appendChild(fragment);

// Usar requestAnimationFrame para garantir que o DOM esteja completamente renderizado
if (typeof this.applyTextColumnScrollbarMetrics === 'function') {
    requestAnimationFrame(() => {
        this.applyTextColumnScrollbarMetrics(maxTextVisualUnits);
    });
} else if (typeof this.updateTextColumnScrollbar === 'function') {
    this.updateTextColumnScrollbar();
}

// Update thumb position
if (this._track && this._thumb) {
    const trackHeight = this._track.clientHeight - this._thumb.clientHeight;
    this._thumb.style.top = `${p * trackHeight}px`;
}

// Update cursor position if needed
if (!preserveCursor) {
    const maxPosition = this.getDataLength() - 1;
    if (p >= 0.99) {
        this.cursorPosition = maxPosition;
    } else {
        const targetOffset = startLine * this.bytesPerLine;
        this.cursorPosition = Math.max(0, Math.min(targetOffset, maxPosition));
    }
}

this.updateStatus();
this.currentScrollPercent = p;

// Aplicar cores customizadas após renderização para garantir que não sejam sobrescritas
if (this.colorConfig && this.colorConfig.textColors) {
    setTimeout(() => {
        this.applyTextColors();
    }, 10);
}

return p;
}

createCompleteLineWithColors(offset, selStart, selEnd) {
// Verificação de segurança para evitar erros quando dados não estão carregados
if (this.getDataLength() === 0 || !this.fileSize) {
    // console.warn('⚠️ Dados não disponíveis para renderização');
    const emptyLine = document.createElement('div');
    emptyLine.style.cssText = `
        display: grid; grid-template-columns: 100px 1fr 420px; gap: 20px;
        padding: 4px 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        color: #666;
    `;
    emptyLine.innerHTML = `
        <div>00000000</div>
        <div style="color: #666;">Nenhum arquivo carregado</div>
        <div style="color: #666;">Nenhum arquivo carregado</div>
    `;
    return emptyLine;
}

const line = document.createElement('div');
line.className = 'hex-line';

// NOVA LÓGICA: Decodificar texto dinamicamente baseado na tabela atual
const maxBytesToDecode = Math.min(this.bytesPerLine, this.fileSize - offset);
let decodedText = '';
let actualBytesProcessed = 0;

        // Determinar se é uma tabela especial
        const currentTable = this.charTables && this.charTables[this.currentCharTable];
        const is16BitType = currentTable && currentTable.type && currentTable.type.includes && currentTable.type.includes('16-bit');
        const is16bit = currentTable && (currentTable.type === '16-bit' || currentTable.type === 'UTF-16' || is16BitType);
        const isDTE = currentTable && (currentTable.type === 'DTE' || currentTable.type === 'DTE+MTE' || (currentTable.type && currentTable.type.includes && currentTable.type.includes('DTE')));
        const isMTE = currentTable && (currentTable.type === 'MTE' || currentTable.type === 'DTE+MTE' || (currentTable.type && currentTable.type.includes && currentTable.type.includes('MTE')));
        const isMixed = currentTable && (currentTable.type === 'DTE+MTE' || (currentTable.type && currentTable.type.includes && currentTable.type.includes('DTE+MTE')));
const isShiftJIS = currentTable && (((currentTable.type && currentTable.type.includes && (currentTable.type.includes('shift-jis') || currentTable.type.includes('shift_jis')))) || currentTable._isShiftJIS === true);
        const hasTagSequences8 = !!(currentTable && currentTable.tag_sequences && Object.keys(currentTable.tag_sequences).length > 0);
        const hasDTESequences8 = !!(currentTable && currentTable.dte_sequences && Object.keys(currentTable.dte_sequences).length > 0);
        const hasMTESequences8 = !!(currentTable && currentTable.mte_sequences && Object.keys(currentTable.mte_sequences).length > 0);
        const isSpecial8bit = currentTable && !is16bit && !isShiftJIS && (hasTagSequences8 || hasDTESequences8 || hasMTESequences8);
        const active16BitDecoder = is16bit ? this.getActive16BitDecoder() : null;
        const shiftJISVisualMap = isShiftJIS ? this.getShiftJISVisualMap(offset, this.bytesPerLine) : new Map();


if (is16bit && active16BitDecoder) {
    // Para tabelas 16-bit: decodificar em pares de bytes
    const maxChars = Math.floor(maxBytesToDecode / 2);
    decodedText = active16BitDecoder.decode(this.getRangeAt(offset, maxChars * 2), 0, maxChars);
    actualBytesProcessed = maxChars * 2;
} else if (isSpecial8bit) {
    // Para 8-bit com TAG/DTE/MTE combinados, usar fluxo unificado:
    // TAG > DTE > MTE > mappings > mapping processado > ASCII
    let i = 0;
    const tagSequences = currentTable?.tag_sequences || {};
    const hasTagSequences = Object.keys(tagSequences).length > 0;

    while (i < maxBytesToDecode && offset + i < this.fileSize) {
        let matched = false;

        // PRIORIDADE 1: Verificar tag sequences multi-byte
        if (hasTagSequences) {
            const maxSeqBytes = Math.min(4, maxBytesToDecode - i, this.fileSize - offset - i);
            for (let len = maxSeqBytes; len >= 2; len--) {
                const hexSeq = Array.from({length: len}, (_, idx) =>
                    this.getByteAt(offset + i + idx).toString(16).toUpperCase().padStart(2, '0')
                ).join('');
                if (tagSequences[hexSeq]) {
                    decodedText += tagSequences[hexSeq];
                    i += len;
                    matched = true;
                    break;
                }
            }
        }

        if (matched) continue;

        const byte = this.getByteAt(offset + i);
        const hexCode = byte.toString(16).toUpperCase().padStart(2, '0');

        if (tagSequences[hexCode]) {
            decodedText += tagSequences[hexCode];
        } else if (currentTable.dte_sequences && currentTable.dte_sequences[hexCode]) {
            decodedText += currentTable.dte_sequences[hexCode];
        } else if (currentTable.mte_sequences[hexCode]) {
            decodedText += currentTable.mte_sequences[hexCode];
        } else if (currentTable.mappings && currentTable.mappings[hexCode]) {
            decodedText += currentTable.mappings[hexCode];
        } else if (currentTable.mapping && currentTable.mapping[byte]) {
            decodedText += currentTable.mapping[byte];
        } else if (currentTable.mapping && currentTable.mapping[hexCode]) {
            // Fallback: try using hexCode as key (for tables that weren't processed by processFoxyTable)
            decodedText += currentTable.mapping[hexCode];
        } else {
            decodedText += byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.';
        }
        i++;
    }
    actualBytesProcessed = i;
} else if (isShiftJIS) {
    // Para Shift-JIS: respeitar TAG/DTE/MTE antes do mapeamento nativo
    let i = 0;
    const chars = [];
    const tagSequences = currentTable?.tag_sequences || {};
    const hasTagSequences = Object.keys(tagSequences).length > 0;
    while (i < maxBytesToDecode && (offset + i) < this.fileSize) {
        const b1 = this.getByteAt(offset + i);
        const hex1 = b1.toString(16).toUpperCase().padStart(2, '0');

        if (hasTagSequences) {
            const maxSeqBytes = Math.min(4, maxBytesToDecode - i, this.fileSize - offset - i);
            let matched = false;
            for (let len = maxSeqBytes; len >= 2; len--) {
                const hexSeq = Array.from({ length: len }, (_, idx) =>
                    this.getByteAt(offset + i + idx).toString(16).toUpperCase().padStart(2, '0')
                ).join('');
                if (tagSequences[hexSeq]) {
                    chars.push(tagSequences[hexSeq]);
                    i += len;
                    matched = true;
                    break;
                }
            }
            if (matched) {
                continue;
            }
        }

        if (tagSequences[hex1]) {
            chars.push(tagSequences[hex1]);
            i += 1;
            continue;
        }
        if (currentTable?.dte_sequences?.[hex1]) {
            chars.push(currentTable.dte_sequences[hex1]);
            i += 1;
            continue;
        }
        if (currentTable?.mte_sequences?.[hex1]) {
            chars.push(currentTable.mte_sequences[hex1]);
            i += 1;
            continue;
        }

        // ASCII de 1 byte
        if (b1 >= 0x20 && b1 <= 0x7E) {
            chars.push(String.fromCharCode(b1));
            i += 1;
            continue;
        }
        // Katakana meia-largura (1 byte)
        if (b1 >= 0xA1 && b1 <= 0xDF) {
            if (currentTable && currentTable.mappings && currentTable.mappings[hex1]) {
                chars.push(currentTable.mappings[hex1]);
            } else {
                chars.push('.');
            }
            i += 1;
            continue;
        }
        // Caracteres de 2 bytes
        if ((i + 1) < maxBytesToDecode && (offset + i + 1) < this.fileSize) {
            const b2 = this.getByteAt(offset + i + 1);
            const validLead = this.isShiftJISLeadByte ? this.isShiftJISLeadByte(b1) : false;
            const validTrail = this.isShiftJISTrailByte ? this.isShiftJISTrailByte(b2) : false;
            if (validLead && validTrail) {
                const hex2 = b1.toString(16).toUpperCase().padStart(2, '0') +
                             b2.toString(16).toUpperCase().padStart(2, '0');
                if (tagSequences[hex2]) {
                    chars.push(tagSequences[hex2]);
                } else if (currentTable?.dte_sequences?.[hex2]) {
                    chars.push(currentTable.dte_sequences[hex2]);
                } else if (currentTable?.mte_sequences?.[hex2]) {
                    chars.push(currentTable.mte_sequences[hex2]);
                } else if (currentTable && currentTable.mappings && currentTable.mappings[hex2]) {
                    chars.push(currentTable.mappings[hex2]);
                } else {
                    chars.push('.');
                }
                i += 2;
                continue;
            }
        }
        // Byte isolado não mapeado
        chars.push('.');
        i += 1;
    }
    decodedText = chars.join('');
    actualBytesProcessed = i;
} else {
    // Para tabelas 8-bit normais: usar método existente
    decodedText = this.decodeTextAtOffset(offset, 16);
    
    // NOTA: Não truncamos mais o texto aqui porque tag sequences podem gerar
    // textos mais longos que 16 caracteres (ex: [NEW] consome 2 bytes mas tem 5 caracteres)
    // O renderizador lida com isso via _getCharForBytePos
}

// CALCULAR LARGURA DINÂMICA PARA ASCII
const baseAsciiWidth = 420; // Largura base atual
const charWidth = 12; // Largura por caractere
const padding = 40; // Padding extra
const calculatedAsciiWidth = Math.max(baseAsciiWidth, (decodedText.length * charWidth) + padding);

// Aplicar grid com largura dinâmica e fonte customizada
const fontSize = this.colorConfig?.fontSettings?.size || 15;
line.style.cssText = `
    display: grid; grid-template-columns: 100px minmax(0, 1fr) minmax(0, var(--text-column-width, 420px)); gap: 20px;
    padding: 4px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    font-size: ${fontSize}px;
    line-height: var(--editor-line-height);
    height: var(--editor-row-height);
    min-height: var(--editor-row-height);
    align-items: center;
    box-sizing: border-box;
    overflow: hidden;
`;

// Check if this line has bookmarks (optimized)
const hasBookmark = this.bookmarks && this.bookmarks.length > 0 && 
    this.bookmarks.some(b => b.offset >= offset && b.offset < offset + this.bytesPerLine);

const offsetDiv = document.createElement('div');
offsetDiv.textContent = offset.toString(16).toUpperCase().padStart(8, '0');
offsetDiv.style.cssText = `color: ${this.getOffsetColor()}; font-weight: bold; text-align: right; padding-right: 8px; position: relative;`;

// Add bookmark indicator to offset (simplified)
if (hasBookmark) {
    const bookmarkIcon = document.createElement('span');
    bookmarkIcon.textContent = '🔖';
    bookmarkIcon.style.cssText = `
        position: absolute;
        left: -8px;
        top: 0;
        font-size: 12px;
        color: #ff6b35;
    `;
    offsetDiv.appendChild(bookmarkIcon);
}

const bytesDiv = document.createElement('div');
bytesDiv.className = 'hex-bytes';
bytesDiv.style.cssText = 'display: flex; gap: 2px; flex-wrap: nowrap; align-items: center; min-width: 0; overflow: hidden;';
const insertCaretEnabled = this.canUseInsertCursor && this.canUseInsertCursor();
let hexEndCaretPlaced = false;

const asciiDiv = document.createElement('div');
asciiDiv.className = 'hex-ascii';
asciiDiv.style.cssText = `
    letter-spacing: 0.1px; padding-left: 12px; padding-right: 8px;
    border-left: 2px solid rgba(129, 199, 132, 0.3); display: inline-flex;
    font-size: inherit; font-family: inherit;
    height: 100%;
    min-height: 100%;
    line-height: var(--editor-line-height);
    align-items: center;
    width: max-content; min-width: max-content;
    white-space: nowrap; overflow: visible;
`;

for (let i = 0; i < 16; i++) {
    const pos = offset + i;
    
    if (pos < this.fileSize) {
        if (insertCaretEnabled) {
            const activeCaret = this.createInsertCaretSpan(pos, 'hex');
            if (activeCaret) {
                bytesDiv.appendChild(activeCaret);
            }
        }

        const byte = this.getByteAt(pos);
        
        let charIndex, char;
        if (is16bit) {
            // For 16-bit, only process even bytes (low bytes) and skip odd bytes (high bytes)
            if (i % 2 === 0) {
                // This is a low byte, calculate character index
                charIndex = Math.floor(i / 2);
                char = charIndex < decodedText.length ? decodedText[charIndex] : '.';
            } else {
                // This is a high byte, skip it in ASCII display
                char = '';
            }
        } else {
            // For 8-bit, each character takes 1 byte
            // MAS se houver tag sequences, o decodedText pode ter caracteres multi-byte
            // Nesse caso, usamos uma abordagem diferente
            const currentTable = this.charTables && this.charTables[this.currentCharTable];
            const hasTagSequences = currentTable?.tag_sequences && Object.keys(currentTable.tag_sequences).length > 0;
            
            if (hasTagSequences) {
                // Não usamos mais _getCharForBytePos aqui - o charToOffsetMap cuida da renderização
                // Esta variável 'char' é apenas para o loop de hex spans
                // O texto real é renderizado via charToOffsetMap mais abaixo
                char = '';
            } else {
                charIndex = i;
                char = charIndex < decodedText.length ? decodedText[charIndex] : '.';
            }
        }
        
        // HEX ELEMENT
        const hexSpan = document.createElement('span');
        hexSpan.className = 'hex-byte';
        hexSpan.textContent = byte.toString(16).toUpperCase().padStart(2, '0');
        hexSpan.dataset.offset = pos;
        hexSpan.dataset.panel = 'hex';
        hexSpan.style.cssText = `
            width: 24px; text-align: center; padding: 0 2px; border-radius: 3px;
            cursor: pointer; color: #4fc3f7; font-weight: 500; user-select: none;
            transition: all 0.1s ease; font-family: inherit; font-size: inherit;
        `;
        
        // === APLICAR CORES ESPECÍFICAS AOS BYTES HEX ===
        this.applyHexByteColors(hexSpan, byte);

        const shiftJISInfo = shiftJISVisualMap.get(pos);
        if (shiftJISInfo) {
            hexSpan.classList.add(shiftJISInfo.type === 'pair-start' ? 'shiftjis-pair-start' : 'shiftjis-pair-end');
            const groupedStyle = this.getGroupedHexInlineStyle('shiftjis', shiftJISInfo.type);
            Object.assign(hexSpan.style, groupedStyle);
        }

        if (is16bit) {
            const pairStart = this.get16BitCharStart(pos);
            const pairEnd = Math.min(pairStart + 1, this.getDataLength() - 1);
            if (pairEnd > pairStart) {
                const pairType = pos === pairStart ? 'pair-start' : 'pair-end';
                hexSpan.classList.add(pairType === 'pair-start' ? 'utf16-pair-start' : 'utf16-pair-end');
                const groupedStyle = this.getGroupedHexInlineStyle('utf16', pairType);
                Object.assign(hexSpan.style, groupedStyle);
            }
        }

        let isSelected = pos >= selStart && pos <= selEnd && selStart !== selEnd;
        let isCursor = !insertCaretEnabled && pos === this.cursorPosition;
        
        // Verificar se o byte foi modificado ou está sendo editado
        const isModified = this.modifiedBytes.has(pos);
        const isEditing = this.editingBytes.has(pos);
        

        
        if (this.activePanel === 'hex') {
            if (isSelected) {
                hexSpan.style.background = 'linear-gradient(135deg, rgba(255, 107, 53, 0.6), rgba(247, 147, 30, 0.6))';
                hexSpan.style.color = 'white';
                hexSpan.style.fontWeight = 'bold';
                hexSpan.style.boxShadow = '0 0 8px rgba(255, 107, 53, 0.8)';
                hexSpan.style.display = 'flex';
                hexSpan.style.alignItems = 'center';
                hexSpan.style.justifyContent = 'center';
                hexSpan.style.padding = '0';
            }
            
            if (isCursor) {
                hexSpan.style.background = 'linear-gradient(135deg, #ff6b35, #f7931e)';
                hexSpan.style.color = 'white';
                hexSpan.style.fontWeight = 'bold';
                hexSpan.style.boxShadow = '0 0 12px rgba(255, 107, 53, 1)';
                hexSpan.style.border = '2px solid #ff6b35';
                hexSpan.style.display = 'flex';
                hexSpan.style.alignItems = 'center';
                hexSpan.style.justifyContent = 'center';
                hexSpan.style.padding = '0';
            }
        }
        
        // Aplicar destaque de edição (prioridade alta - preto durante digitação)
        if (isEditing) {
            hexSpan.style.background = '#000000';
            hexSpan.style.color = '#ffffff';
            hexSpan.style.fontWeight = 'bold';
            hexSpan.style.boxShadow = '0 0 8px rgba(0, 0, 0, 0.8)';
            hexSpan.style.animation = 'editingPulse 1s ease-in-out infinite';
        }
        // Aplicar destaque de modificação (prioridade menor que seleção, cursor e edição)
        else if (isModified && !isSelected && !isCursor && !isEditing) {
            hexSpan.style.background = 'linear-gradient(135deg, rgba(255, 215, 0, 0.4), rgba(255, 193, 7, 0.4))';
            hexSpan.style.color = '#ffd700';
            hexSpan.style.fontWeight = 'bold';
            hexSpan.style.boxShadow = '0 0 6px rgba(255, 215, 0, 0.6)';
            hexSpan.style.animation = 'modifiedPulse 2s ease-in-out infinite';
        }
        
        // Bookmark indicator for individual bytes (optimized)
        if (this.bookmarks && this.bookmarks.length > 0 && this.bookmarks.some(b => b.offset === pos)) {
            hexSpan.style.borderTop = '2px solid #ff6b35';
        }
        
        // === APLICAR HIGHLIGHTS (MARCA-TEXTO) ===
        const highlight = this.getHighlightAt(pos);
        if (highlight) {
            const colors = this.getHighlightColors(highlight);
            hexSpan.style.background = colors.background;
            hexSpan.style.color = colors.text;
            hexSpan.style.fontWeight = 'bold';
            hexSpan.style.boxShadow = colors.shadow;
            hexSpan.style.border = colors.border;
            hexSpan.style.borderRadius = '3px';

            if (this.activePanel === 'hex') {
                if (isSelected) {
                    hexSpan.style.background = 'linear-gradient(135deg, rgba(255, 107, 53, 0.6), rgba(247, 147, 30, 0.6))';
                    hexSpan.style.color = 'white';
                    hexSpan.style.fontWeight = 'bold';
                    hexSpan.style.boxShadow = `${colors.shadow}, 0 0 8px rgba(255, 107, 53, 0.8)`;
                    hexSpan.style.border = colors.border;
                }

                if (isCursor) {
                    hexSpan.style.background = 'linear-gradient(135deg, #ff6b35, #f7931e)';
                    hexSpan.style.color = 'white';
                    hexSpan.style.fontWeight = 'bold';
                    hexSpan.style.boxShadow = `${colors.shadow}, 0 0 12px rgba(255, 107, 53, 1)`;
                    hexSpan.style.border = colors.border;
                }
            }
            
            hexSpan.dataset.highlightId = highlight.id;
        }

        if (shiftJISInfo) {
            if (shiftJISInfo.type === 'pair-start') {
                hexSpan.style.paddingLeft = '10px';
                hexSpan.style.paddingRight = '2px';
            } else {
                hexSpan.style.paddingLeft = '2px';
                hexSpan.style.paddingRight = '10px';
            }
        }
        
        bytesDiv.appendChild(hexSpan);
    } else {
        if (insertCaretEnabled && !hexEndCaretPlaced && this.isInsertCaretActiveAt(pos, 'hex')) {
            const lineEndCaret = this.createInsertCaretSpan(pos, 'hex');
            if (lineEndCaret) {
                bytesDiv.appendChild(lineEndCaret);
            }
            hexEndCaretPlaced = true;
        }
        const emptyHex = document.createElement('span');
        emptyHex.style.cssText = 'width: 24px; visibility: hidden;';
        bytesDiv.appendChild(emptyHex);
    }
}

if (insertCaretEnabled && !hexEndCaretPlaced) {
    const lineEndCaret = this.createInsertCaretSpan(Math.min(offset + 16, this.fileSize), 'hex');
    if (lineEndCaret) {
        bytesDiv.appendChild(lineEndCaret);
    }
}

// NOVA LÓGICA: Criar mapeamento de caracteres para offsets
const charToOffsetMap = [];

if (is16bit) {
    // Verificar se há DTE/MTE/Tags na tabela 16-bit (hex de 4 dígitos)
    const hasDTE16 = !!(currentTable?.dte_sequences && Object.keys(currentTable.dte_sequences).some(k => k.length === 4));
    const hasMTE16 = !!(currentTable?.mte_sequences && Object.keys(currentTable.mte_sequences).some(k => k.length === 4));
    const hasTags16 = !!(currentTable?.tag_sequences && Object.keys(currentTable.tag_sequences).some(k => k.length === 4));
    
    if ((hasDTE16 || hasMTE16 || hasTags16) && active16BitDecoder?.decodeWithMapping) {
        // Usar decodeWithMapping para DTE/MTE/Tags (cada caractere pode ter offset diferente)
        const maxChars = Math.floor(maxBytesToDecode / 2);
        const decoded = active16BitDecoder.decodeWithMapping(
            this.getRangeAt(offset, maxChars * 2), 
            0, 
            maxChars
        );
        
        for (let i = 0; i < decoded.mapping.length; i++) {
            const m = decoded.mapping[i];
            if (offset + m.byteOffset < this.fileSize) {
                charToOffsetMap.push({
                    char: m.char,
                    offset: offset + m.byteOffset,
                    length: m.byteLength,
                    isTag: m.isTag || false,
                    isDTE: m.isDTE || false,
                    isMTE: m.isMTE || false
                });
            }
        }
    } else {
        // Para 16-bit normal, cada caractere representa 2 bytes
        for (let i = 0; i < decodedText.length; i++) {
            const byteOffset = offset + (i * 2);
            if (byteOffset < this.fileSize) {
                charToOffsetMap.push({
                    char: decodedText[i],
                    offset: byteOffset,
                    length: 2 // 2 bytes por caractere
                });
            }
        }
    }
} else if (isShiftJIS) {
    // Para Shift-JIS, gerar mapeamento respeitando TAG/DTE/MTE e sequências de 1 ou 2 bytes
    let i = 0;
    const tagSequences = currentTable?.tag_sequences || {};
    const hasTagSequences = Object.keys(tagSequences).length > 0;
    while (i < Math.min(16, this.fileSize - offset)) {
        const pos = offset + i;
        const b1 = this.getByteAt(pos);
        const hex1 = b1.toString(16).toUpperCase().padStart(2, '0');

        if (hasTagSequences) {
            const maxSeqBytes = Math.min(4, 16 - i, this.fileSize - pos);
            let matched = false;
            for (let len = maxSeqBytes; len >= 2; len--) {
                const hexSeq = Array.from({ length: len }, (_, idx) =>
                    this.getByteAt(pos + idx).toString(16).toUpperCase().padStart(2, '0')
                ).join('');
                if (tagSequences[hexSeq]) {
                    charToOffsetMap.push({ char: tagSequences[hexSeq], offset: pos, length: len, isTag: true, isDTE: false, isMTE: false });
                    i += len;
                    matched = true;
                    break;
                }
            }
            if (matched) {
                continue;
            }
        }

        if (tagSequences[hex1]) {
            charToOffsetMap.push({ char: tagSequences[hex1], offset: pos, length: 1, isTag: true, isDTE: false, isMTE: false });
            i += 1;
            continue;
        }
        if (currentTable?.dte_sequences?.[hex1]) {
            charToOffsetMap.push({ char: currentTable.dte_sequences[hex1], offset: pos, length: 1, isTag: false, isDTE: true, isMTE: false });
            i += 1;
            continue;
        }
        if (currentTable?.mte_sequences?.[hex1]) {
            charToOffsetMap.push({ char: currentTable.mte_sequences[hex1], offset: pos, length: 1, isTag: false, isDTE: false, isMTE: true });
            i += 1;
            continue;
        }

        // ASCII 1 byte
        if (b1 >= 0x20 && b1 <= 0x7E) {
            charToOffsetMap.push({ char: String.fromCharCode(b1), offset: pos, length: 1 });
            i += 1;
            continue;
        }
        // Half-width katakana 1 byte
        if (b1 >= 0xA1 && b1 <= 0xDF) {
            const ch = (currentTable && currentTable.mappings && currentTable.mappings[hex1]) ? currentTable.mappings[hex1] : '.';
            charToOffsetMap.push({ char: ch, offset: pos, length: 1 });
            i += 1;
            continue;
        }
        // 2 bytes
        if ((i + 1) < Math.min(16, this.fileSize - offset)) {
            const b2 = this.getByteAt(pos + 1);
            const validLead = this.isShiftJISLeadByte ? this.isShiftJISLeadByte(b1) : false;
            const validTrail = this.isShiftJISTrailByte ? this.isShiftJISTrailByte(b2) : false;
            if (validLead && validTrail) {
                const hex2 = b1.toString(16).toUpperCase().padStart(2, '0') +
                             b2.toString(16).toUpperCase().padStart(2, '0');
                if (tagSequences[hex2]) {
                    charToOffsetMap.push({ char: tagSequences[hex2], offset: pos, length: 2, isTag: true, isDTE: false, isMTE: false });
                } else if (currentTable?.dte_sequences?.[hex2]) {
                    charToOffsetMap.push({ char: currentTable.dte_sequences[hex2], offset: pos, length: 2, isTag: false, isDTE: true, isMTE: false });
                } else if (currentTable?.mte_sequences?.[hex2]) {
                    charToOffsetMap.push({ char: currentTable.mte_sequences[hex2], offset: pos, length: 2, isTag: false, isDTE: false, isMTE: true });
                } else {
                    const ch = (currentTable && currentTable.mappings && currentTable.mappings[hex2]) ? currentTable.mappings[hex2] : '.';
                    charToOffsetMap.push({ char: ch, offset: pos, length: 2 });
                }
                i += 2;
                continue;
            }
        }
        // Não mapeado
        charToOffsetMap.push({ char: '.', offset: pos, length: 1 });
        i += 1;
    }
} else {
    // Para 8-bit, usar o mesmo modelo conceitual do 16-bit:
    // gerar um mapa unificado por caractere com flags de TAG/DTE/MTE.
    let i = 0;
    const tagSequences = currentTable?.tag_sequences || {};
    const hasTagSequences = Object.keys(tagSequences).length > 0;
    
    while (i < Math.min(16, this.fileSize - offset)) {
        const byteOffset = offset + i;
        if (byteOffset >= this.fileSize) break;
        
        if (hasTagSequences) {
            const maxSeqBytes = Math.min(4, 16 - i, this.fileSize - byteOffset);
            let matched = false;
            
            for (let len = maxSeqBytes; len >= 2; len--) {
                const hexSeq = Array.from({ length: len }, (_, idx) =>
                    this.getByteAt(byteOffset + idx).toString(16).toUpperCase().padStart(2, '0')
                ).join('');
                
                if (tagSequences[hexSeq]) {
                    charToOffsetMap.push({
                        char: tagSequences[hexSeq],
                        offset: byteOffset,
                        length: len,
                        isTag: true,
                        isDTE: false,
                        isMTE: false
                    });
                    i += len;
                    matched = true;
                    break;
                }
            }
            
            if (matched) continue;
        }
        
        const byte = this.getByteAt(byteOffset);
        const hexCode = byte.toString(16).toUpperCase().padStart(2, '0');
        let char = '.';
        let isTag = false;
        let isDTE = false;
        let isMTE = false;
        
        if (tagSequences[hexCode]) {
            char = tagSequences[hexCode];
            isTag = true;
        } else if (currentTable?.dte_sequences?.[hexCode]) {
            char = currentTable.dte_sequences[hexCode];
            isDTE = true;
        } else if (currentTable?.mte_sequences?.[hexCode]) {
            char = currentTable.mte_sequences[hexCode];
            isMTE = true;
        } else if (currentTable?.mappings?.[hexCode]) {
            char = currentTable.mappings[hexCode];
            isTag = /^(\[.*\]|<.*>|\{.*\}|\(.*\))$/.test(char);
        } else if (currentTable?.mapping?.[byte]) {
            char = currentTable.mapping[byte];
            isTag = /^(\[.*\]|<.*>|\{.*\}|\(.*\))$/.test(char);
        } else if (currentTable?.mapping?.[hexCode]) {
            char = currentTable.mapping[hexCode];
            isTag = /^(\[.*\]|<.*>|\{.*\}|\(.*\))$/.test(char);
        } else {
            char = byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.';
        }
        
        charToOffsetMap.push({
            char,
            offset: byteOffset,
            length: 1,
            isTag,
            isDTE,
            isMTE
        });
        i++;
    }
}

// RENDERIZAR ASCII COM MAPEAMENTO CORRETO
let asciiEndCaretPlaced = false;
let visibleCharCount = 0;
for (let i = 0; i < charToOffsetMap.length; i++) {
    const charInfo = charToOffsetMap[i];
    visibleCharCount += String(charInfo.char || '').length;
    if (insertCaretEnabled) {
        const activeCaret = this.createInsertCaretSpan(charInfo.offset, 'ascii');
        if (activeCaret) {
            asciiDiv.appendChild(activeCaret);
        }
    }
    const asciiSpan = document.createElement('span');
    asciiSpan.className = 'ascii-char';
    asciiSpan.textContent = charInfo.char;
    asciiSpan.dataset.offset = charInfo.offset;
    asciiSpan.dataset.panel = 'ascii';
    asciiSpan.dataset.charLength = charInfo.char.length; // Comprimento do caractere visual
    asciiSpan.dataset.byteLength = charInfo.length; // Comprimento em bytes
    asciiSpan.dataset.charStartOffset = String(charInfo.offset);
    asciiSpan.dataset.charEndOffset = String(charInfo.offset + charInfo.length - 1);
    
    // Aplicar cores personalizadas ao texto (prioridade sobre cores fixas)
    // Se for uma tag sequence (isTag=true), usar cor de tags diretamente
    // Se for DTE ou MTE, usar cores específicas
    let customColor;
    if (charInfo.isTag && this.colorConfig && this.colorConfig.textColors) {
        customColor = this.colorConfig.textColors.tags;
    } else if (charInfo.isDTE && this.colorConfig && this.colorConfig.textColors) {
        customColor = this.colorConfig.textColors.dte || '#9C27B0';
    } else if (charInfo.isMTE && this.colorConfig && this.colorConfig.textColors) {
        customColor = this.colorConfig.textColors.mte || '#E91E63';
    } else {
        customColor = this.getTextColor(charInfo.char);
    }
    const fallbackColor = this.applyCharColorAdvanced(charInfo.char);
    
    // Usar cor customizada se disponível, senão usar fallback
    const finalColor = this.colorConfig && this.colorConfig.textColors ? customColor : fallbackColor;
    
    const visualCellWidth = 12;
    asciiSpan.style.cssText = `
        width: ${visualCellWidth}px; 
        min-width: ${visualCellWidth}px;
        text-align: center; cursor: pointer;
        padding: ${charInfo.length === 2 ? '0 0.5px' : '0 1px'}; border-radius: 2px; user-select: none;
        transition: all 0.1s ease;
        color: ${finalColor};
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-weight: 500;
        line-height: 1;
        height: calc(var(--editor-row-height) - 8px);
        min-height: calc(var(--editor-row-height) - 8px);
        vertical-align: middle;
        margin-right: ${charInfo.length === 2 ? '0.5px' : '1px'};
        box-sizing: border-box;
        font-family: inherit; font-size: inherit;
    `;

    if (charInfo.isTag && String(charInfo.char).length > 1) {
        asciiSpan.classList.add('ascii-token');
        asciiSpan.style.width = 'max-content';
        asciiSpan.style.minWidth = 'max-content';
        asciiSpan.style.paddingLeft = '3px';
        asciiSpan.style.paddingRight = '3px';
        asciiSpan.style.marginRight = '2px';
        asciiSpan.style.overflow = 'visible';
        asciiSpan.style.position = 'relative';
        asciiSpan.style.zIndex = '2';
        asciiSpan.style.flexShrink = '0';
    } else if ((charInfo.isDTE || charInfo.isMTE) && String(charInfo.char).length > 1) {
        asciiSpan.style.width = '12px';
        asciiSpan.style.minWidth = '12px';
        asciiSpan.style.overflow = 'visible';
        asciiSpan.style.position = 'relative';
        asciiSpan.style.zIndex = '2';
    }
    
    // LÓGICA DE SELEÇÃO CORRIGIDA
    let isSelected = false;
    let isCursor = false;
    
    if (this.activePanel === 'ascii') {
        // Para seleção, verificar se o offset do caractere está dentro da seleção
        isSelected = charInfo.offset >= selStart && charInfo.offset <= selEnd && selStart !== selEnd;
        isCursor = !insertCaretEnabled && charInfo.offset === this.cursorPosition;
        
        if (isSelected) {
            asciiSpan.style.background = 'linear-gradient(135deg, rgba(255, 107, 53, 0.6), rgba(247, 147, 30, 0.6))';
            asciiSpan.style.color = 'white';
            asciiSpan.style.fontWeight = 'bold';
            asciiSpan.style.boxShadow = '0 0 8px rgba(255, 107, 53, 0.8)';
            asciiSpan.style.display = 'flex';
            asciiSpan.style.alignItems = 'center';
            asciiSpan.style.justifyContent = 'center';
        }
        
        if (isCursor) {
            asciiSpan.style.background = 'linear-gradient(135deg, #ff6b35, #f7931e)';
            asciiSpan.style.color = 'white';
            asciiSpan.style.fontWeight = 'bold';
            asciiSpan.style.boxShadow = '0 0 10px rgba(255, 107, 53, 1)';
            asciiSpan.style.border = '2px solid #ff6b35';
            asciiSpan.style.display = 'flex';
            asciiSpan.style.alignItems = 'center';
            asciiSpan.style.justifyContent = 'center';
        }
    }
    
    // Verificar se o byte foi modificado (para 16-bit/Shift-JIS 2 bytes, verificar ambos os bytes)
    let isModified = false;
    if (charInfo.length === 2) {
        // Para caracteres 16-bit, verificar se qualquer um dos bytes foi modificado
        isModified = this.modifiedBytes.has(charInfo.offset) || this.modifiedBytes.has(charInfo.offset + 1);
    } else {
        // Para caracteres 8-bit, verificar apenas o byte atual
        isModified = this.modifiedBytes.has(charInfo.offset);
    }
    

    
    // Aplicar destaque de modificação (prioridade menor que seleção e cursor)
    if (isModified && !isSelected && !isCursor) {
        asciiSpan.style.background = 'linear-gradient(135deg, rgba(255, 215, 0, 0.4), rgba(255, 193, 7, 0.4))';
        asciiSpan.style.color = '#ffd700';
        asciiSpan.style.fontWeight = 'bold';
        asciiSpan.style.boxShadow = '0 0 6px rgba(255, 215, 0, 0.6)';
        asciiSpan.style.animation = 'modifiedPulse 2s ease-in-out infinite';
    }
    

    // Se algum dos bytes está em edição, refletir visualmente no ASCII
    const isAsciiEditing = this.editingBytes.has(charInfo.offset) || (charInfo.length === 2 && this.editingBytes.has(charInfo.offset + 1));
    if (isAsciiEditing) {
        asciiSpan.classList.add('editing');
    }
    
    // === APLICAR HIGHLIGHTS (MARCA-TEXTO) ===
    const highlight = this.getHighlightAt(charInfo.offset);
    if (highlight) {
        const colors = this.getHighlightColors(highlight);
        asciiSpan.style.background = colors.background;
        asciiSpan.style.color = colors.text;
        asciiSpan.style.fontWeight = 'bold';
        asciiSpan.style.boxShadow = colors.shadow;
        asciiSpan.style.border = colors.border;
        asciiSpan.style.borderRadius = '3px';

        if (this.activePanel === 'ascii') {
            if (isSelected) {
                asciiSpan.style.background = 'linear-gradient(135deg, rgba(255, 107, 53, 0.6), rgba(247, 147, 30, 0.6))';
                asciiSpan.style.color = 'white';
                asciiSpan.style.fontWeight = 'bold';
                asciiSpan.style.boxShadow = `${colors.shadow}, 0 0 8px rgba(255, 107, 53, 0.8)`;
                asciiSpan.style.border = colors.border;
            }

            if (isCursor) {
                asciiSpan.style.background = 'linear-gradient(135deg, #ff6b35, #f7931e)';
                asciiSpan.style.color = 'white';
                asciiSpan.style.fontWeight = 'bold';
                asciiSpan.style.boxShadow = `${colors.shadow}, 0 0 10px rgba(255, 107, 53, 1)`;
                asciiSpan.style.border = colors.border;
            }
        }
        
        asciiSpan.dataset.highlightId = highlight.id;
    }

    asciiDiv.appendChild(asciiSpan);
}

if (insertCaretEnabled && !asciiEndCaretPlaced) {
    const lastChar = charToOffsetMap[charToOffsetMap.length - 1];
    const endOffset = lastChar
        ? Math.min(lastChar.offset + (lastChar.length || 1), this.fileSize)
        : Math.min(offset, this.fileSize);
    const activeCaret = this.createInsertCaretSpan(endOffset, 'ascii');
    if (activeCaret) {
        asciiDiv.appendChild(activeCaret);
        asciiEndCaretPlaced = true;
    }
}

const asciiViewport = document.createElement('div');
asciiViewport.className = 'hex-ascii-viewport';
asciiViewport.style.cssText = 'height: 100%; display: flex; align-items: center; min-width: 0; overflow: hidden;';
asciiDiv.dataset.visualCharCount = String(visibleCharCount);
asciiDiv.dataset.visualScrollUnits = String(visibleCharCount);
if (typeof this.registerTextColumnScrollUnits === 'function') {
    this.registerTextColumnScrollUnits(visibleCharCount);
}
line.dataset.textVisualUnits = String(visibleCharCount);
asciiViewport.appendChild(asciiDiv);

line.appendChild(offsetDiv);
line.appendChild(bytesDiv);
line.appendChild(asciiViewport);

return line;
}

// === ADVANCED COLOR SYSTEM ===


// === SISTEMA DE CUSTOMIZAÇÃO DE CORES ===
colorConfig = {
    offsetColor: '#ffd700',
    hexColors: {
        nulls: '#ff6b35',
        numbers: '#4fc3f7',
        letters: '#4fc3f7',
        special: '#4fc3f7',
        custom: {}
    },
    textColors: {
        numbers: '#2196F3',
        letters: '#4CAF50',
        punctuation: '#FFD700',
        spaces: '#666666',
        tags: '#FFFFFF',
        dte: '#9C27B0',
        mte: '#E91E63'
    },
    backgroundColors: {
        hexContent: 'rgba(26, 26, 46, 0.4)',
        hexLine: 'transparent',
        hexLineHover: 'rgba(255, 107, 53, 0.08)',
        asciiContent: 'rgba(26, 26, 46, 0.4)',
        asciiLine: 'transparent',
        asciiLineHover: 'rgba(255, 107, 53, 0.08)'
    },
    fontSettings: {
        family: 'jetbrains-mono',
        size: 15
    }
};
}
