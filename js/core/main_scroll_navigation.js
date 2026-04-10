Object.assign(FoxyHexEditorComplete.prototype, {
autoScrollToCursor(position) {
// Ensure we have valid data before proceeding
if (this.getDataLength() === 0) {
    return;
}

// Não mover cursor durante scroll manual
if (this.isManualScrolling || this.preventCursorFollow) {
    return;
}

// Ensure position is within bounds - use consistent data source
const maxPosition = this.getDataLength() - 1;
position = Math.max(0, Math.min(position, maxPosition));
    
const currentLine = Math.floor(position / this.bytesPerLine);
const currentStartLine = Math.floor(this.currentScrollPercent * this.maxScrollLines);
const currentEndLine = currentStartLine + this.visibleLines;
const edgeMargin = Math.max(1, Math.floor((this.visibleLines || 50) / 6));

let needsScroll = false;
let newScrollPercent = this.currentScrollPercent;

// Validate scroll lines before proceeding
if (this.maxScrollLines <= 0) {
    this.completeRenderWithColors(0, true);
    return;
}

// Check if cursor is outside visible area - posicionar exatamente na linha correta
if (currentLine < currentStartLine + edgeMargin) {
    // Cursor está acima da área visível, scroll para mostrar exatamente a linha do cursor
    const targetStartLine = Math.max(0, currentLine - edgeMargin);
    newScrollPercent = targetStartLine / this.maxScrollLines;
    needsScroll = true;
} else if (currentLine >= currentEndLine - edgeMargin) {
    // Cursor está abaixo da área visível, scroll para mostrar a linha do cursor na parte inferior
    const targetStartLine = Math.max(0, Math.min(this.maxScrollLines, currentLine - (this.visibleLines - edgeMargin - 1)));
    newScrollPercent = targetStartLine / this.maxScrollLines;
    needsScroll = true;
}

// Clamp scroll percent to valid range
newScrollPercent = Math.max(0, Math.min(1, newScrollPercent));

// Only update scroll if needed
if (needsScroll) {
    this.currentScrollPercent = newScrollPercent;
    this.completeRenderWithColors(newScrollPercent, true);
} else {
    // Just re-render with current scroll position to update cursor
    this.completeRenderWithColors(this.currentScrollPercent, true);
}
},

autoScrollTextColumnToCursor(position) {
    if (!this.activePanel || this.activePanel !== 'ascii') return;

    // Encontrar a linha atual do cursor
    const cursorLine = Math.floor(position / this.bytesPerLine);

    // Encontrar o elemento ASCII da linha atual
    const asciiElements = document.querySelectorAll('.hex-line .hex-ascii');
    if (!asciiElements || asciiElements.length === 0) return;

    // Encontrar o elemento da linha atual (considerando scroll virtual)
    let asciiElement = null;
    for (const el of asciiElements) {
        const line = el.closest('.hex-line');
        if (line) {
            const lineIndex = Math.floor(parseInt(line.querySelector('[data-offset]')?.dataset.offset || '0') / this.bytesPerLine);
            if (lineIndex === cursorLine) {
                asciiElement = el;
                break;
            }
        }
    }
    if (!asciiElement) return;

    // Obter a largura do viewport do campo texto
    const viewport = document.querySelector('.hex-ascii-viewport');
    if (!viewport) return;

    const viewportWidth = viewport.clientWidth;
    const currentScrollLeft = this.textColumnScrollLeft || 0;

    // Encontrar o span que contém o cursor
    const spans = asciiElement.querySelectorAll('.ascii-char');
    let cursorSpan = null;
    let cursorOffsetLeft = 0;

    for (const span of spans) {
        const spanOffset = parseInt(span.dataset.offset || '-1');
        if (spanOffset === position) {
            cursorSpan = span;
            cursorOffsetLeft = span.offsetLeft;
            break;
        }
    }

    // Se não encontrou o span específico, estimar baseado na posição
    if (!cursorSpan && spans.length > 0) {
        const lineOffset = cursorLine * this.bytesPerLine;
        const charIndexInLine = position - lineOffset;
        if (charIndexInLine >= 0 && charIndexInLine < spans.length) {
            cursorSpan = spans[charIndexInLine];
            cursorOffsetLeft = cursorSpan ? cursorSpan.offsetLeft : 0;
        }
    }

    if (!cursorSpan) return;

    // Calcular a posição do cursor considerando o scroll atual
    const spanWidth = cursorSpan.offsetWidth;
    const cursorRight = cursorOffsetLeft + spanWidth;

    // Margem de segurança (pixels)
    const margin = 30;

    // Verificar se o cursor está além da área visível à direita
    if (cursorRight > currentScrollLeft + viewportWidth - margin) {
        // Scroll para mostrar o cursor com margem à direita
        const newScrollLeft = Math.max(0, cursorRight - viewportWidth + margin);
        this.setTextColumnScrollLeft(newScrollLeft);
    }
    // Verificar se o cursor está antes da área visível à esquerda
    else if (cursorOffsetLeft < currentScrollLeft + margin) {
        const newScrollLeft = Math.max(0, cursorOffsetLeft - margin);
        this.setTextColumnScrollLeft(newScrollLeft);
    }
},

setupGlobalTabHandler() {

const container = document.getElementById('hex-content');
if (!container) {
    
}

// Remove old listeners
if (container && container._allListeners) {
    const oldListeners = container._allListeners;
    oldListeners.forEach(listener => {
        document.removeEventListener('keydown', listener, true);
        document.removeEventListener('keydown', listener, false);
        window.removeEventListener('keydown', listener, true);
        window.removeEventListener('keydown', listener, false);
        if (container) {
            container.removeEventListener('keydown', listener, true);
            container.removeEventListener('keydown', listener, false);
        }
    });
    
}

const self = this; // Store reference to this

function globalTabHandler(e) {
    // Capturar TAB em qualquer lugar da página
    if (e.key === 'Tab') {

        
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        const oldPanel = self.activePanel;
        const currentTable = self.charTables && self.charTables[self.currentCharTable];
        const isShiftJIS = currentTable && (currentTable.type === 'shift-jis' || currentTable.type === 'shift_jis');
        const is16bit = currentTable && (currentTable.type === '16-bit' || currentTable.type === 'UTF-16');
        
        // Ajustar seleção/cursor antes de alternar, para manter grupos Shift-JIS coerentes
        if (is16bit && self.getDataLength() > 0) {
            const currentBounds = self.getNormalizedSelectionBounds(oldPanel);
            if (oldPanel === 'hex') {
                self.selectionStart = currentBounds.start;
                self.selectionEnd = currentBounds.end;
                self.cursorPosition = currentBounds.end;
            } else {
                const hexBounds = self.getNormalizedSelectionBounds('hex', currentBounds.start, currentBounds.end);
                self.selectionStart = hexBounds.start;
                self.selectionEnd = hexBounds.end;
                self.cursorPosition = hexBounds.end;
            }
        } else if (isShiftJIS && self.getDataLength() > 0) {
            const currentBounds = self.getNormalizedSelectionBounds(oldPanel);
            if (oldPanel === 'ascii') {
                const hexBounds = self.getNormalizedSelectionBounds('hex', currentBounds.start, currentBounds.end);
                self.selectionStart = hexBounds.start;
                self.selectionEnd = hexBounds.end;
                self.cursorPosition = hexBounds.end;
            } else {
                const asciiBounds = self.getNormalizedSelectionBounds('ascii', currentBounds.start, currentBounds.end);
                self.selectionStart = asciiBounds.start;
                self.selectionEnd = asciiBounds.end;
                self.cursorPosition = asciiBounds.start;
            }
        /*
            const pos = Math.max(0, Math.min(self.cursorPosition || 0, self.getDataLength() - 1));
            const b1 = self.getByteAt(pos);
            const isAscii = b1 >= 0x20 && b1 <= 0x7E;
            const isHalfWidth = b1 >= 0xA1 && b1 <= 0xDF;
            const hasNext = pos + 1 < self.getDataLength();
            const prevExists = pos > 0;
            const isLead = ((b1 >= 0x81 && b1 <= 0x9F) || (b1 >= 0xE0 && b1 <= 0xFC)) && hasNext;
            const isTrailValid = (byte) => (byte >= 0x40 && byte <= 0x7E) || (byte >= 0x80 && byte <= 0xFC);
            
            if (oldPanel === 'ascii') {
                // Indo para HEX: se for char de 2 bytes, selecionar o par
                if (is16bit) {
                    // Para 16-bit, selecionar sempre 2 bytes a partir do offset (que já aponta para o início lógico)
                    const base = pos;
                    self.selectionStart = base;
                    self.selectionEnd = Math.min(base + 1, self.getDataLength() - 1);
                } else if (isLead) {
                    const b2 = self.getByteAt(pos + 1);
                    if (isTrailValid(b2)) {
                        self.selectionStart = pos;
                        self.selectionEnd = pos + 1;
                    } else {
                        self.selectionStart = pos;
                        self.selectionEnd = pos;
                    }
                } else {
                    // ASCII simples ou half-width
                    self.selectionStart = pos;
                    self.selectionEnd = pos;
                }
            } else if (oldPanel === 'hex') {
                // Indo para ASCII: focar no início do caractere
                let start = pos;
                if (is16bit) {
                    // Se cursor caiu no segundo byte do par, alinhar ao primeiro
                    start = pos % 2 === 0 ? pos : pos - 1;
                } else if (prevExists) {
                    const prev = self.getByteAt(pos - 1);
                    const prevIsLead = (prev >= 0x81 && prev <= 0x9F) || (prev >= 0xE0 && prev <= 0xFC);
                    if (prevIsLead && isTrailValid(b1)) {
                        start = pos - 1;
                    }
                }
                // ASCII/half-width
                if (isAscii || isHalfWidth) {
                    start = pos;
                }
                self.selectionStart = start;
                self.selectionEnd = start;
                self.cursorPosition = start;
            }
        */
        }
        
        self.activePanel = self.activePanel === 'hex' ? 'ascii' : 'hex';
        self.completeRenderWithColors(self.currentScrollPercent, true);
        
        // Atualizar indicador na status bar
        const activePanelEl = document.getElementById('active-panel-indicator');
        if (activePanelEl) {
            if (self.activePanel === 'hex') {
                activePanelEl.textContent = window.I18n?.t ? window.I18n.t('status.panel_hex') : 'HEX';
                activePanelEl.classList.remove('panel-text');
                activePanelEl.classList.add('panel-hex');
            } else {
                activePanelEl.textContent = window.I18n?.t ? window.I18n.t('status.panel_text') : 'TEXTO';
                activePanelEl.classList.remove('panel-hex');
                activePanelEl.classList.add('panel-text');
            }
        }
        
        return false;
    }
}

// Bind with proper context and multiple event listeners
const boundHandler = globalTabHandler.bind(this);

// Add multiple event listeners to ensure capture
document.addEventListener('keydown', boundHandler, true);
document.addEventListener('keydown', boundHandler, false);
window.addEventListener('keydown', boundHandler, true);
window.addEventListener('keydown', boundHandler, false);

if (container) {
    container.addEventListener('keydown', boundHandler, true);
    container.addEventListener('keydown', boundHandler, false);
}

// Store all listeners for cleanup
container._allListeners = [boundHandler];


},

nav(percent) {
const p = Math.max(0, Math.min(100, percent)) / 100;
this.currentScrollPercent = p;
this.completeRenderWithColors(p);
},

nav0() { this.nav(0); },

nav25() { this.nav(25); },

nav50() { this.nav(50); },

nav75() { this.nav(75); },

nav100() { this.nav(100); },

testColors() {


this.cursorPosition = 0x20;
this.activePanel = 'ascii';
this.completeRenderWithColors(0, true);


},

testTabWorking() {


this.cursorPosition = 0x10;
this.activePanel = 'hex';
this.completeRenderWithColors(0, true);


setTimeout(() => {
    this.activePanel = 'ascii';
    this.completeRenderWithColors(0, true);
    
    
    setTimeout(() => {
        this.activePanel = 'hex';
        this.completeRenderWithColors(0, true);

    }, 1000);
}, 1000);
},

testTabHandler() {


// Simular um evento TAB
const testEvent = new KeyboardEvent('keydown', {
    key: 'Tab',
    code: 'Tab',
    keyCode: 9,
    which: 9,
    bubbles: true,
    cancelable: true
});

document.dispatchEvent(testEvent);

},

testScrollToEnd() {

const lastOffset = this.fileSize - 1;


this.nav100();

setTimeout(() => {
    
}, 100);
},

ensureCursorVisible() {
if (this.getDataLength() === 0) return;

// Não interferir durante scroll manual ou quando prevenção está ativa
if (this.isManualScrolling || this.preventCursorFollow) {
    return;
}

// CORREÇÃO: Para arquivos grandes, usar scroll percentual
const totalSize = this.getDataLength();
    
if (!this.needsDomCursorVisibilitySync()) {
    // Para arquivos grandes, usar scroll percentual
    const targetPercent = (this.cursorPosition / totalSize) * 100;
    const adjustedPercent = Math.max(0, Math.min(targetPercent, 99.5));
    this.currentScrollPercent = adjustedPercent / 100;
    
    // CORREÇÃO: Usar renderização específica para arquivos grandes
    this.renderCurrentView(true);
} else {
    // Para arquivos menores, usar auto-scroll normal
    this.autoScrollToCursor(this.cursorPosition);
}

// Garantir que o editor tenha foco
this.focusEditor();
},

formatFileSize(bytes) {
if (bytes === 0) return '0 B';
const k = 1024;
const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
const i = Math.floor(Math.log(bytes) / Math.log(k));
return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
},

isValidOffset(offset) {
return offset >= 0 && offset < this.getDataLength();
},

clampOffset(offset) {
return Math.max(0, Math.min(offset, this.getDataLength() - 1));
},

pageUp() {
    if (this.dispatchVirtualNavigation('largeFilePageUp')) {
        return;
    }

    const totalLines = Math.ceil(this.getDataLength() / this.bytesPerLine);
    const visibleLines = this.visibleLines || 50;
    const pageScrollLines = 3; // 3 linhas por vez (padrão)
    
    const maxScrollLines = Math.max(0, totalLines - visibleLines);
    const currentLine = Math.floor(this.currentScrollPercent * maxScrollLines);
    
    const targetLine = Math.max(0, currentLine - pageScrollLines);
    const newPercent = maxScrollLines > 0 ? targetLine / maxScrollLines : 0;
    
    this.currentScrollPercent = newPercent;
    this.completeRenderWithColors(this.currentScrollPercent, true);
    
},

pageDown() {
    if (this.dispatchVirtualNavigation('largeFilePageDown')) {
        return;
    }

    const totalLines = Math.ceil(this.getDataLength() / this.bytesPerLine);
    const visibleLines = this.visibleLines || 50;
    const pageScrollLines = 3; // 3 linhas por vez (padrão)
    
    const maxScrollLines = Math.max(0, totalLines - visibleLines);
    const currentLine = Math.floor(this.currentScrollPercent * maxScrollLines);
    
    const targetLine = Math.min(maxScrollLines, currentLine + pageScrollLines);
    const newPercent = maxScrollLines > 0 ? targetLine / maxScrollLines : 0;
    
    this.currentScrollPercent = newPercent;
    this.completeRenderWithColors(this.currentScrollPercent, true);
    
},

goToStart() {
    if (this.dispatchVirtualNavigation('largeFileGoToStart')) {
        return;
    }

    if (this.canUseInsertCursor()) {
        this.setInsertCursor(0, this.activePanel || 'hex');
    } else {
        this.setCursor(0, null, false);
    }
    this.currentScrollPercent = 0;
    this.autoScrollToCursor(this.cursorPosition);
    this.focusEditor();
},

goToEnd() {
    if (this.dispatchVirtualNavigation('largeFileGoToEnd')) {
        return;
    }

    const lastOffset = Math.max(0, this.getDataLength() - 1);
    if (this.canUseInsertCursor()) {
        this.setInsertCursor(this.getDataLength(), this.activePanel || 'hex');
    } else {
        this.setCursor(lastOffset, null, false);
    }
    this.currentScrollPercent = 1;
    this.autoScrollToCursor(this.cursorPosition);
    this.focusEditor();
}
});

