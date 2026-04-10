Object.assign(FoxyHexEditorComplete.prototype, {
canUseInsertCursor() {
    return this.editMode === 'edit' && this.insertMode;
},

getMaxCursorPosition(allowInsertBoundary = this.canUseInsertCursor()) {
    const dataLength = this.getDataLength();
    if (dataLength <= 0) {
        return 0;
    }
    return allowInsertBoundary ? dataLength : dataLength - 1;
},

clampCursorPosition(position, allowInsertBoundary = this.canUseInsertCursor()) {
    const normalized = this.normalizeOffsetNumber(position);
    return Math.max(0, Math.min(normalized, this.getMaxCursorPosition(allowInsertBoundary)));
},

setInsertCursor(position, panel = null) {
    const targetPanel = panel || this.activePanel || 'hex';
    const clampedPosition = this.clampCursorPosition(position, true);
    const oldPosition = this.cursorPosition;

    this.cursorPosition = clampedPosition;
    this.selectionStart = clampedPosition;
    this.selectionEnd = clampedPosition;
    this.activePanel = targetPanel;

    if (oldPosition !== this.cursorPosition) {
        this.nibblePosition = 0;
        if (this.editingBytes.size > 0) {
            this.editingBytes.clear();
        }
    }

    this.emit('cursorMove', this.cursorPosition);
    this.updateBookmarksList();
    this.renderCurrentView(true);
    this.updateStatus();
    return this;
},

isInsertCaretActiveAt(position, panel = this.activePanel) {
    return this.canUseInsertCursor() &&
        this.selectionStart === this.selectionEnd &&
        this.cursorPosition === position &&
        this.activePanel === panel;
},

createInsertCaretSpan(position, panel = 'hex') {
    if (!this.isInsertCaretActiveAt(position, panel)) {
        return null;
    }

    const span = document.createElement('span');
    span.className = `insert-caret insert-caret-${panel}`;
    span.dataset.offset = position;
    span.dataset.panel = panel;
    span.dataset.insertCaret = 'true';
    span.style.cssText = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 0;
        min-width: 0;
        margin-right: 0;
        cursor: default;
        user-select: none;
        line-height: 1;
        overflow: visible;
        position: relative;
        left: ${position % this.bytesPerLine === 0 ? '0' : '-1px'};
        z-index: 2;
        pointer-events: none;
        height: 1.1em;
        border-left: 2px solid #ff9f1c;
        box-shadow: 0 0 12px rgba(255, 159, 28, 1);
        transition: border-color 0.12s ease, box-shadow 0.12s ease;
    `;

    return span;
},

resolveInsertCursorPosition(target, event, fallbackOffset = null) {
    const baseOffset = Number.isFinite(Number(fallbackOffset))
        ? Number(fallbackOffset)
        : Number(target?.dataset?.offset);

    if (!Number.isFinite(baseOffset)) {
        return this.clampCursorPosition(0, true);
    }

    const panel = target?.dataset?.panel || this.activePanel || 'hex';
    const rect = target && typeof target.getBoundingClientRect === 'function'
        ? target.getBoundingClientRect()
        : null;
    const clientX = typeof event?.clientX === 'number' ? event.clientX : null;
    const clickedRightHalf = !!(rect && clientX !== null && clientX > (rect.left + rect.width / 2));

    if (panel === 'ascii') {
        const charStart = Number(target?.dataset?.charStartOffset);
        const charEnd = Number(target?.dataset?.charEndOffset);
        const start = Number.isFinite(charStart) ? charStart : baseOffset;
        const end = Number.isFinite(charEnd) ? charEnd : start;
        return this.clampCursorPosition(clickedRightHalf ? end + 1 : start, true);
    }

    return this.clampCursorPosition(clickedRightHalf ? baseOffset + 1 : baseOffset, true);
},

setCursor(position, panel = null, preserveSelection = false) {
    const oldPosition = this.cursorPosition;
    const targetPanel = panel || this.activePanel || 'hex';
    const dataLength = this.getDataLength();

    if (this.canUseInsertCursor() && !preserveSelection) {
        const clampedPosition = this.clampCursorPosition(position, true);
        if (clampedPosition === dataLength) {
            return this.setInsertCursor(clampedPosition, targetPanel);
        }
    }

    const maxPosition = Math.max(0, dataLength > 0 ? dataLength - 1 : 0);
    const normalized = this.getSelectionRangeForPanel(position, targetPanel);
    this.cursorPosition = Math.max(0, Math.min(normalized.cursor, maxPosition));

    if (oldPosition !== this.cursorPosition) {
        this.nibblePosition = 0;
        if (this.editingBytes.size > 0) {
            this.editingBytes.clear();
        }
    }

    if (panel) this.activePanel = panel;

    if (!preserveSelection) {
        this.selectionStart = normalized.start;
        this.selectionEnd = normalized.end;
    }

    this.emit('cursorMove', this.cursorPosition);
    this.updateBookmarksList();

    this.renderCurrentView(true);

    this.updateStatus();
    return this;
},

getCursor() {
    return this.cursorPosition;
},

setSelection(start, end) {
    if (this.isCurrentTable16Bit() && (this.activePanel === 'hex' || this.activePanel === 'ascii')) {
        const panel = this.activePanel === 'ascii' ? 'ascii' : 'hex';
        const normalizedStart = this.getSelectionRangeForPanel(start, panel);
        const normalizedEnd = this.getSelectionRangeForPanel(end, panel);
        this.selectionStart = normalizedStart.start;
        this.selectionEnd = normalizedEnd.end;
    } else if (this.isCurrentTableShiftJIS() && this.activePanel === 'ascii') {
        const normalizedStart = this.getSelectionRangeForPanel(start, 'ascii');
        const normalizedEnd = this.getSelectionRangeForPanel(end, 'ascii');
        this.selectionStart = normalizedStart.start;
        this.selectionEnd = normalizedEnd.end;
    } else {
        this.selectionStart = Math.max(0, Math.min(start, this.getDataLength()));
        this.selectionEnd = Math.max(0, Math.min(end, this.getDataLength()));
    }
    this.emit('selectionChange', {
        start: this.selectionStart,
        end: this.selectionEnd
    });
    this.updateStatus();
    return this;
},

getSelection() {
    const start = Math.min(this.selectionStart, this.selectionEnd);
    const end = Math.max(this.selectionStart, this.selectionEnd);
    const isCollapsed = start === end && this.canUseInsertCursor();
    return {
        start,
        end,
        length: isCollapsed ? 0 : (end - start + 1),
        data: isCollapsed ? new Uint8Array(0) : this.getRangeAt(start, end - start + 1)
    };
},

async getSelectionAsync() {
    const start = Math.min(this.selectionStart, this.selectionEnd);
    const end = Math.max(this.selectionStart, this.selectionEnd);
    const isCollapsed = start === end && this.canUseInsertCursor();
    return {
        start,
        end,
        length: isCollapsed ? 0 : (end - start + 1),
        data: isCollapsed ? new Uint8Array(0) : await this.getSelectionBytesAsync(start, end)
    };
},

goToOffset(offset) {
    const validOffset = Math.max(0, Math.min(offset, this.getDataLength() - 1));
    this.setCursor(validOffset, null, true);
    this.autoScrollToCursor(this.cursorPosition);
    this.focusEditor();
    this.updateStatus();
    this.renderCurrentView(true);
    return this;
},

extendSelection(delta) {
    const newPosition = this.cursorPosition + delta;
    const clampedPosition = Math.max(0, Math.min(newPosition, this.getDataLength() - 1));
    const targetPanel = this.activePanel || 'hex';
    const normalized = this.getSelectionRangeForPanel(clampedPosition, targetPanel);

    if (this.selectionStart === this.selectionEnd) {
        const currentRange = this.getSelectionRangeForPanel(this.cursorPosition, targetPanel);
        this.selectionStart = currentRange.start;
    }

    this.cursorPosition = normalized.cursor;
    this.selectionEnd = ((targetPanel === 'hex' && this.isCurrentTable16Bit()) ||
        (targetPanel === 'ascii' && (this.isCurrentTable16Bit() || this.isCurrentTableShiftJIS())))
        ? normalized.end
        : normalized.cursor;
    this.autoScrollToCursor(this.cursorPosition);
    this.autoScrollTextColumnToCursor(this.cursorPosition);
    this.renderCurrentView(true);
    this.emit('selectionChange', {
        start: this.selectionStart,
        end: this.selectionEnd
    });
    this.updateStatus();
    return this;
},

extendSelectionTo(position) {
    const clampedPosition = Math.max(0, Math.min(position, this.getDataLength() - 1));
    const targetPanel = this.activePanel || 'hex';
    const normalized = this.getSelectionRangeForPanel(clampedPosition, targetPanel);

    if (this.selectionStart === this.selectionEnd) {
        const currentRange = this.getSelectionRangeForPanel(this.cursorPosition, targetPanel);
        this.selectionStart = currentRange.start;
    }

    this.cursorPosition = normalized.cursor;
    this.selectionEnd = ((targetPanel === 'hex' && this.isCurrentTable16Bit()) ||
        (targetPanel === 'ascii' && (this.isCurrentTable16Bit() || this.isCurrentTableShiftJIS())))
        ? normalized.end
        : normalized.cursor;
    this.autoScrollToCursor(this.cursorPosition);
    this.autoScrollTextColumnToCursor(this.cursorPosition);
    this.renderCurrentView(true);
    this.emit('selectionChange', {
        start: this.selectionStart,
        end: this.selectionEnd
    });
    this.updateStatus();
    return this;
},

clearSelection() {
    if (this.canUseInsertCursor()) {
        this.selectionStart = this.cursorPosition;
        this.selectionEnd = this.cursorPosition;
    } else {
        const normalized = this.getSelectionRangeForPanel(this.cursorPosition, this.activePanel || 'hex');
        this.selectionStart = normalized.start;
        this.selectionEnd = normalized.end;
    }
    this.renderCurrentView(true);
    this.emit('selectionChange', {
        start: this.selectionStart,
        end: this.selectionEnd
    });
    this.updateStatus();
    return this;
},

startSelection(offset, panel, event) {
    if (event.button !== 0) return;
    event.preventDefault();
    this.isSelecting = true;

    let actualOffset = offset;
    if (event.target && event.target.dataset && event.target.dataset.offset) {
        actualOffset = parseInt(event.target.dataset.offset);
    }

    const normalized = this.getSelectionRangeForPanel(actualOffset, panel);
    this.selectionStart = normalized.start;
    this.selectionEnd = normalized.end;
    this.cursorPosition = normalized.cursor;
    this.activePanel = panel;
    event.target.setPointerCapture(event.pointerId);
    this.renderCurrentView(true);
    this.updateStatus();
},

updateSelection(offset, panel, event) {
    if (!this.isSelecting) return;

    let actualOffset = offset;
    if (event.target && event.target.dataset && event.target.dataset.offset) {
        actualOffset = parseInt(event.target.dataset.offset);
    }

    const clampedOffset = Math.max(0, Math.min(actualOffset, this.getDataLength() - 1));
    const normalized = this.getSelectionRangeForPanel(clampedOffset, panel);
    this.selectionEnd = ((panel === 'hex' && this.isCurrentTable16Bit()) ||
        (panel === 'ascii' && (this.isCurrentTable16Bit() || this.isCurrentTableShiftJIS())))
        ? normalized.end
        : normalized.cursor;
    this.cursorPosition = normalized.cursor;
    this.activePanel = panel;

    // Edge-scrolling horizontal durante arraste no campo texto
    if (panel === 'ascii' && event.clientX !== undefined) {
        const viewport = document.querySelector('.hex-ascii-viewport');
        if (viewport) {
            const rect = viewport.getBoundingClientRect();
            const edgeThreshold = 30; // pixels da borda
            const currentScrollLeft = this.textColumnScrollLeft || 0;
            const maxScrollLeft = parseInt(document.getElementById('text-column-scrollbar')?.dataset.maxScrollLeft || '0', 10) || 0;

            // Se mouse está próximo à borda direita, scroll para direita
            if (event.clientX > rect.right - edgeThreshold && currentScrollLeft < maxScrollLeft) {
                const scrollAmount = 20; // pixels por frame
                this.setTextColumnScrollLeft(Math.min(maxScrollLeft, currentScrollLeft + scrollAmount));
            }
            // Se mouse está próximo à borda esquerda, scroll para esquerda
            else if (event.clientX < rect.left + edgeThreshold && currentScrollLeft > 0) {
                const scrollAmount = 20;
                this.setTextColumnScrollLeft(Math.max(0, currentScrollLeft - scrollAmount));
            }
        }
    }

    this.autoScrollTextColumnToCursor(this.cursorPosition);
    this.completeRenderWithColors(this.currentScrollPercent, true);
    this.updateStatus();
},

stopSelection() {
    if (!this.isSelecting) return;
    this.isSelecting = false;
    this.emit('selectionChange', {
        start: this.selectionStart,
        end: this.selectionEnd
    });
},

selectAll() {
    this.selectionStart = 0;
    this.selectionEnd = this.getDataLength() - 1;
    this.cursorPosition = this.getDataLength() - 1;
    this.completeRenderWithColors(this.currentScrollPercent, true);
    this.autoScrollToCursor(this.cursorPosition);
    this.emit('selectionChange', {
        start: this.selectionStart,
        end: this.selectionEnd
    });
    this.updateStatus();
    return this;
},

async copySelection() {
    const selection = this.getSelection();
    if (selection.length === 0) return;

    let textToCopy = '';
    
    // Suporte para arquivos grandes onde selection.data é uma Promise
    let selData = selection.data;
    if (selData instanceof Promise) {
        selData = await selData;
    }

    if (this.activePanel === 'hex') {
        textToCopy = Array.from(selData)
            .map((byte) => byte.toString(16).toUpperCase().padStart(2, '0'))
            .join(' ');
    } else if (this.activePanel === 'ascii') {
        if (typeof this.getSelectionDecodedText === 'function') {
            textToCopy = this.getSelectionDecodedText({ data: selData });
        } else if (typeof this.decodeBytesWithCurrentTable === 'function') {
            textToCopy = this.decodeBytesWithCurrentTable(selData);
        } else {
            textToCopy = Array.from(selData)
                .map((byte) => byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.')
                .join('');
        }
    }

    try {
        await navigator.clipboard.writeText(textToCopy);
        this.showCopySuccessNotification(textToCopy, this.activePanel, selection.length);
    } catch (err) {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        this.showCopySuccessNotification(textToCopy, this.activePanel, selection.length);
    }

    return this;
},

pasteData() {
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        return;
    }

    if (this.editMode === 'edit') {
        this.pasteHexData();
        return;
    }

    this.pasteToSearch();
},

pasteHexData() {
    navigator.clipboard.readText().then((text) => {
        const hexBytes = this.parseHexString(text);
        if (hexBytes.length > 0) {
            if (this.insertMode) {
                this.insertBytesAt(this.cursorPosition, hexBytes, 'Paste hex data');
            } else {
                this.overwriteBytesAt(this.cursorPosition, hexBytes, 'Paste hex data');
            }
            this.setCursor(this.cursorPosition + hexBytes.length, null, false);
            if (window.notificationSystem) {
                window.notificationSystem.success(`📥 Colado como HEX (${hexBytes.length} bytes)`, 'Colagem');
            }
        } else {
            const currentTable = this.charTables && this.currentCharTable ? this.charTables[this.currentCharTable] : null;
            let bytes = null;
            if (this.charDecoder16 && (currentTable && (currentTable.type === '16-bit' || currentTable.type === 'UTF-16'))) {
                bytes = this.textTo16bitBytes(text);
            } else if (currentTable && ((currentTable.type === 'shift-jis' || currentTable.type === 'shift_jis') || currentTable._isShiftJIS === true)) {
                bytes = this.textToShiftJISBytes(text, true) || this.textToShiftJISBytes(text, false);
            }

            if (Array.isArray(bytes) ? bytes.length > 0 : (bytes && bytes.length > 0)) {
                if (this.insertMode) {
                    this.insertBytesAt(this.cursorPosition, bytes, 'Paste text as encoded bytes');
                } else {
                    this.overwriteBytesAt(this.cursorPosition, bytes, 'Paste text as encoded bytes');
                }
                this.setCursor(this.cursorPosition + bytes.length, null, false);
                if (window.notificationSystem) {
                    const mode = this.charDecoder16 ? 'UTF-16/16-bit' : 'Shift-JIS';
                    window.notificationSystem.success(`📥 Colado como ${mode} (${bytes.length} bytes)`, 'Colagem');
                }
            } else if (!this.charDecoder16 && (!currentTable || (currentTable.type !== 'shift-jis' && currentTable.type !== 'shift_jis'))) {
                const utf8 = Array.from(new TextEncoder().encode(text));
                if (this.insertMode) {
                    this.insertBytesAt(this.cursorPosition, utf8, 'Paste UTF-8 text');
                } else {
                    this.overwriteBytesAt(this.cursorPosition, utf8, 'Paste UTF-8 text');
                }
                this.setCursor(this.cursorPosition + utf8.length, null, false);
                if (window.notificationSystem) {
                    window.notificationSystem.warning(`📥 Colado como UTF-8 (${utf8.length} bytes)`, 'Colagem');
                }
            }
        }
    }).catch(() => {});
},

pasteToSearch() {
    navigator.clipboard.readText().then((text) => {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = text;
            searchInput.focus();
            searchInput.select();
        }
    }).catch(() => {
        window.notificationSystem.error('Falha ao ler a área de transferência. Por favor, cole manualmente.', 'Erro de Clipboard');
    });
},

parseHexString(text) {
    const cleanText = text.replace(/^(hex|0x|\\x)/i, '').replace(/\s+/g, '');
    const bytes = [];
    for (let i = 0; i < cleanText.length; i += 2) {
        const hexByte = cleanText.substr(i, 2);
        if (hexByte.length === 2 && /^[0-9A-Fa-f]{2}$/.test(hexByte)) {
            bytes.push(parseInt(hexByte, 16));
        }
    }
    return bytes;
}
});
