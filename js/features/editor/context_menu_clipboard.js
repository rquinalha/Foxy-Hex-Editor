Object.assign(ContextMenuManager.prototype, {
    async copySelectionWithNotification(format) {
        const t = (key) => ContextMenuI18n.t(key);
        const hexEditor = window.hexEditor;
        if (!hexEditor) {
            this.showNotification('❌ ' + t('editorNotFound'), 'error');
            return;
        }

        const selection = hexEditor.getSelection();
        if (selection.length === 0) {
            this.showNotification('⚠️ ' + t('noSelection'), 'warning');
            return;
        }

        if (hexEditor.copySelection) {
            try {
                await hexEditor.copySelection();
            } catch (err) {
                console.error(t('copyError') + ':', err);
                this.showNotification('❌ ' + t('copyError'), 'error');
            }
            return;
        }

        let textToCopy = '';
        const fallbackData = await hexEditor.readClipboardSelection(selection);
        if (!fallbackData) return;

        if (format === 'ascii') {
            if (hexEditor.getSelectionDecodedText) {
                textToCopy = hexEditor.getSelectionDecodedText({ data: fallbackData });
            } else if (hexEditor.decodeBytesWithCurrentTable) {
                textToCopy = hexEditor.decodeBytesWithCurrentTable(fallbackData);
            } else {
                textToCopy = Array.from(fallbackData)
                    .map(byte => byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.')
                    .join('');
            }
        } else {
            textToCopy = Array.from(fallbackData)
                .map(byte => byte.toString(16).toUpperCase().padStart(2, '0'))
                .join(' ');
        }

        this.copyToClipboard(textToCopy);
        this.showNotification(`📋 ${selection.length} ${t('bytesCopied')} (Ctrl+C)`, 'success');
    },

    async pasteDataWithNotification(format) {
        const t = (key) => ContextMenuI18n.t(key);
        const hexEditor = window.hexEditor;
        if (!hexEditor || hexEditor.editMode !== 'edit') {
            this.showNotification('🔺 ' + t('editorNotEditMode'), 'warning');
            return;
        }

        try {
            let text = '';
            if (navigator.clipboard && window.isSecureContext) {
                text = await navigator.clipboard.readText();
            } else {
                text = prompt(t('pasteDataPrompt')) || '';
            }

            if (!text.trim()) {
                this.showNotification('⚠️ ' + t('clipboardEmpty'), 'warning');
                return;
            }

            const bytes = this.parseClipboardBytes(hexEditor, format, text);
            if (bytes.length === 0) {
                this.showNotification('⚠️ ' + t('noValidData'), 'warning');
                return;
            }

            this.applyPasteBytes(hexEditor, bytes);
            const mode = this.describeClipboardMode(hexEditor, format);
            this.showNotification(`📥 ${bytes.length} ${t('bytesPasted')} (${mode})`, 'success');
        } catch (err) {
            console.error(t('pasteError') + ':', err);
            this.showNotification('❌ ' + t('pasteError'), 'error');
        }
    },

    selectAllWithNotification() {
        const t = (key) => ContextMenuI18n.t(key);
        const hexEditor = window.hexEditor;
        const dataLength = hexEditor && typeof hexEditor.getDataLength === 'function'
            ? hexEditor.getDataLength()
            : 0;
        if (!hexEditor || dataLength <= 0) {
            this.showNotification('❌ ' + t('editorNotFound'), 'error');
            return;
        }

        hexEditor.selectionStart = 0;
        hexEditor.selectionEnd = dataLength - 1;
        if (typeof hexEditor.renderCurrentView === 'function') {
            hexEditor.renderCurrentView(true);
        } else {
            hexEditor.render();
        }
        this.showNotification(`🎯 ${dataLength} ${t('bytesSelected')} (Ctrl+A)`, 'success');
    },

    async copySelection(format) {
        const t = (key) => ContextMenuI18n.t(key);
        const hexEditor = window.hexEditor;
        if (!hexEditor) {
            this.showNotification('❌ ' + t('editorNotFound'), 'error');
            return;
        }

        const selection = hexEditor.getSelection();
        if (selection.length === 0) {
            this.showNotification('⚠️ ' + t('noSelection'), 'warning');
            return;
        }

        let textToCopy = '';
        const selData = await hexEditor.readClipboardSelection(selection);
        if (!selData) return;

        if (format === 'ascii') {
            if (hexEditor.getSelectionDecodedText) {
                textToCopy = hexEditor.getSelectionDecodedText({ data: selData });
            } else if (hexEditor.decodeBytesWithCurrentTable) {
                textToCopy = hexEditor.decodeBytesWithCurrentTable(selData);
            } else {
                textToCopy = Array.from(selData)
                    .map(byte => byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.')
                    .join('');
            }
        } else {
            textToCopy = Array.from(selData)
                .map(byte => byte.toString(16).toUpperCase().padStart(2, '0'))
                .join(' ');
        }

        this.copyToClipboard(textToCopy);
        const currentTable = hexEditor.getCurrentCharacterTable ? hexEditor.getCurrentCharacterTable() : null;
        const friendlyTableName = currentTable && currentTable.name
            ? String(currentTable.name).split(/[\\/]/).pop()
            : '';
        const copyLabel = format === 'ascii'
            ? (friendlyTableName ? `TEXTO (${friendlyTableName})` : 'TEXTO')
            : format.toUpperCase();
        this.showNotification(`📋 ${selection.length} ${t('bytesCopiedAs')} ${copyLabel}`, 'success');
    },

    async pasteData(format) {
        const t = (key) => ContextMenuI18n.t(key);
        const hexEditor = window.hexEditor;
        if (!hexEditor || hexEditor.editMode !== 'edit') {
            this.showNotification('🔺 ' + t('editorNotEditMode'), 'warning');
            return;
        }

        try {
            let text = '';
            if (navigator.clipboard && window.isSecureContext) {
                text = await navigator.clipboard.readText();
            } else {
                text = prompt(t('pasteDataPrompt')) || '';
            }

            if (!text.trim()) {
                this.showNotification('⚠️ ' + t('clipboardEmpty'), 'warning');
                return;
            }

            const bytes = this.parseClipboardBytes(hexEditor, format, text);
            if (bytes.length === 0) {
                this.showNotification('⚠️ ' + t('noValidData'), 'warning');
                return;
            }

            this.applyPasteBytes(hexEditor, bytes);
            const mode = this.describeClipboardMode(hexEditor, format);
            this.showNotification(`📥 ${bytes.length} ${t('bytesPasted')} (${mode})`, 'success');
        } catch (err) {
            console.error(t('pasteError') + ':', err);
            this.showNotification('❌ ' + t('pasteError'), 'error');
        }
    },

    selectAll() {
        const t = (key) => ContextMenuI18n.t(key);
        const hexEditor = window.hexEditor;
        const dataLength = hexEditor && typeof hexEditor.getDataLength === 'function'
            ? hexEditor.getDataLength()
            : 0;
        if (!hexEditor || dataLength <= 0) {
            this.showNotification('❌ ' + t('editorNotFound'), 'error');
            return;
        }

        hexEditor.selectionStart = 0;
        hexEditor.selectionEnd = dataLength - 1;
        if (typeof hexEditor.renderCurrentView === 'function') {
            hexEditor.renderCurrentView(true);
        } else {
            hexEditor.render();
        }
        this.showNotification(`🎯 ${dataLength} ${t('bytesSelected')}`, 'success');
    },

    parseClipboardBytes(hexEditor, format, text) {
        const currentTable = hexEditor && hexEditor.charTables && hexEditor.currentCharTable ? hexEditor.charTables[hexEditor.currentCharTable] : null;
        const is16bit = currentTable && (currentTable.type === '16-bit' || currentTable.type === 'UTF-16');
        const isShiftJIS = currentTable && ((currentTable.type === 'shift-jis' || currentTable.type === 'shift_jis') || currentTable._isShiftJIS === true);

        const tryParseHex = (value) => {
            try {
                if (hexEditor && typeof hexEditor.parseHexString === 'function') {
                    return hexEditor.parseHexString(value);
                }
                const clean = (value || '').replace(/[^0-9A-Fa-f]/g, '');
                if (clean.length % 2 !== 0) return [];
                const out = [];
                for (let i = 0; i < clean.length; i += 2) {
                    const b = parseInt(clean.substr(i, 2), 16);
                    if (isNaN(b)) return [];
                    out.push(b);
                }
                return out;
            } catch {
                return [];
            }
        };

        const tryEncodeTextByTable = (value) => {
            if (!value) return [];
            if (typeof hexEditor.encodeTextWithCurrentTable === 'function') {
                const encoded = hexEditor.encodeTextWithCurrentTable(value, true)
                    || hexEditor.encodeTextWithCurrentTable(value, false);
                if (encoded && encoded.length > 0) {
                    return Array.isArray(encoded) ? encoded : Array.from(encoded);
                }
            }
            if (is16bit && typeof hexEditor.textTo16bitBytes === 'function') {
                const arr = hexEditor.textTo16bitBytes(value);
                return Array.isArray(arr) ? arr : (arr ? Array.from(arr) : []);
            }
            if (isShiftJIS && typeof hexEditor.textToShiftJISBytes === 'function') {
                const arr = hexEditor.textToShiftJISBytes(value, true) || hexEditor.textToShiftJISBytes(value, false);
                return Array.isArray(arr) ? arr : (arr ? Array.from(arr) : []);
            }
            if (!is16bit && !isShiftJIS) {
                return Array.from(new TextEncoder().encode(value));
            }
            return [];
        };

        if (format === 'ascii') {
            return tryEncodeTextByTable(text);
        }
        if (format === 'hex') {
            return tryParseHex(text);
        }

        const parsedHex = tryParseHex(text);
        return parsedHex && parsedHex.length > 0 ? parsedHex : tryEncodeTextByTable(text);
    },

    describeClipboardMode(hexEditor, format) {
        const currentTable = hexEditor && hexEditor.charTables && hexEditor.currentCharTable ? hexEditor.charTables[hexEditor.currentCharTable] : null;
        const is16bit = currentTable && (currentTable.type === '16-bit' || currentTable.type === 'UTF-16');
        const isShiftJIS = currentTable && ((currentTable.type === 'shift-jis' || currentTable.type === 'shift_jis') || currentTable._isShiftJIS === true);
        return is16bit ? 'UTF-16/16-bit' : (isShiftJIS ? 'Shift-JIS' : (format === 'hex' ? 'HEX' : 'UTF-8/ASCII'));
    },

    applyPasteBytes(hexEditor, bytes) {
        const isInsertMode = !!hexEditor.insertMode;
        const hasSelection = Number.isInteger(hexEditor.selectionStart)
            && Number.isInteger(hexEditor.selectionEnd)
            && hexEditor.selectionStart !== hexEditor.selectionEnd;
        const selectionBounds = hasSelection && typeof hexEditor.getNormalizedSelectionBounds === 'function'
            ? hexEditor.getNormalizedSelectionBounds(hexEditor.activePanel || 'hex')
            : null;
        const basePosition = selectionBounds
            ? selectionBounds.start
            : (typeof hexEditor.clampCursorPosition === 'function'
                ? hexEditor.clampCursorPosition(hexEditor.cursorPosition, isInsertMode)
                : hexEditor.cursorPosition);

        if (isInsertMode) {
            this.insertBytes(hexEditor, bytes);
        } else {
            this.overwriteBytes(hexEditor, bytes);
        }

        if (isInsertMode && typeof hexEditor.setInsertCursor === 'function') {
            hexEditor.setInsertCursor(basePosition + bytes.length, hexEditor.activePanel || null);
        } else if (typeof hexEditor.setCursor === 'function') {
            const lastBytePosition = Math.max(0, basePosition + Math.max(0, bytes.length - 1));
            hexEditor.setCursor(lastBytePosition, hexEditor.activePanel || null, false);
        }
    },

    insertBytes(hexEditor, bytes) {
        const hasSelection = Number.isInteger(hexEditor.selectionStart)
            && Number.isInteger(hexEditor.selectionEnd)
            && hexEditor.selectionStart !== hexEditor.selectionEnd;

        if (hasSelection && typeof hexEditor.replaceSelectionWithBytes === 'function') {
            const normalized = typeof hexEditor.getNormalizedSelectionBounds === 'function'
                ? hexEditor.getNormalizedSelectionBounds(hexEditor.activePanel || 'hex')
                : {
                    start: Math.min(hexEditor.selectionStart, hexEditor.selectionEnd),
                    end: Math.max(hexEditor.selectionStart, hexEditor.selectionEnd)
                };

            return hexEditor.replaceSelectionWithBytes(
                normalized.start,
                normalized.end + 1,
                bytes,
                true,
                'Context menu paste insert'
            );
        }

        return hexEditor.insertBytesAt(hexEditor.cursorPosition, bytes, 'Context menu paste insert');
    },

    overwriteBytes(hexEditor, bytes) {
        const hasSelection = Number.isInteger(hexEditor.selectionStart)
            && Number.isInteger(hexEditor.selectionEnd)
            && hexEditor.selectionStart !== hexEditor.selectionEnd;

        if (hasSelection && typeof hexEditor.replaceSelectionWithBytes === 'function') {
            const start = Math.min(hexEditor.selectionStart, hexEditor.selectionEnd);
            const end = Math.max(hexEditor.selectionStart, hexEditor.selectionEnd) + 1;
            return hexEditor.replaceSelectionWithBytes(start, end, bytes, false, 'Context menu paste overwrite');
        }

        return hexEditor.overwriteBytesAt(hexEditor.cursorPosition, bytes, 'Context menu paste overwrite');
    }
});
