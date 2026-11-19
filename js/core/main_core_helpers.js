Object.assign(FoxyHexEditorComplete.prototype, {
normalizeOffsetNumber(value) {
    const normalized = Number(value);
    if (!Number.isFinite(normalized) || normalized < 0) {
        return 0;
    }
    return Math.floor(normalized);
},

getLargeFileModeThreshold() {
    return 8 * 1024 * 1024;
},

shouldUseLargeFileMode(fileOrSize) {
    const size = typeof fileOrSize === 'number' ? fileOrSize : Number(fileOrSize?.size || 0);
    return fileOrSize?.forceVirtual === true || size >= this.getLargeFileModeThreshold();
},

getOffsetDisplayBase() {
    return this.normalizeOffsetNumber(this.offsetDisplayBase || 0);
},

loadOffsetDisplayBase() {
    if (typeof window === 'undefined' || !window.localStorage) {
        this.offsetDisplayBase = 0;
        return this.offsetDisplayBase;
    }

    const saved = window.localStorage.getItem('foxyOffsetDisplayBase');
    this.offsetDisplayBase = this.normalizeOffsetNumber(saved || 0);
    return this.offsetDisplayBase;
},

saveOffsetDisplayBase() {
    if (typeof window === 'undefined' || !window.localStorage) {
        return;
    }
    window.localStorage.setItem('foxyOffsetDisplayBase', String(this.getOffsetDisplayBase()));
},

formatOffset(offset, options = {}) {
    const {
        includePrefix = true,
        pad = 8,
        useDisplayBase = false
    } = options;

    const normalizedOffset = this.normalizeOffsetNumber(offset);
    const baseValue = useDisplayBase ? this.getOffsetDisplayBase() : 0;
    const displayValue = this.normalizeOffsetNumber(normalizedOffset + baseValue);
    const hexValue = displayValue.toString(16).toUpperCase();
    const padded = hexValue.padStart(Math.max(pad, hexValue.length), '0');
    return includePrefix ? `0x${padded}` : padded;
},

formatOffsetRange(start, end, options = {}) {
    return `${this.formatOffset(start, options)} - ${this.formatOffset(end, options)}`;
},

parseOffsetInput(offsetText, options = {}) {
    const { useDisplayBase = false } = options;
    const inputValue = String(offsetText || '').trim();

    if (!inputValue) {
        return { valid: false, error: 'Digite um offset valido' };
    }

    let parsedOffset;

    const parseHexValue = (rawValue) => {
        try {
            return Number(BigInt(rawValue));
        } catch (error) {
            return Number.NaN;
        }
    };

    const parseDecimalValue = (rawValue) => Number.parseInt(rawValue, 10);

    const parseImplicitOffset = (rawValue) => {
        const hexCandidate = parseHexValue(`0x${rawValue}`);
        return Number.isFinite(hexCandidate) ? hexCandidate : Number.NaN;
    };

    if (/^0x[0-9A-Fa-f]+$/i.test(inputValue)) {
        parsedOffset = parseHexValue(inputValue);
        if (!Number.isFinite(parsedOffset)) {
            return { valid: false, error: 'Formato hexadecimal invalido' };
        }
    } else if (/^0d\d+$/i.test(inputValue)) {
        parsedOffset = parseDecimalValue(inputValue.slice(2));
    } else if (/^[0-9A-Fa-f]+$/i.test(inputValue) && /[A-F]/i.test(inputValue)) {
        parsedOffset = parseHexValue(`0x${inputValue}`);
        if (!Number.isFinite(parsedOffset)) {
            return { valid: false, error: 'Formato hexadecimal invalido' };
        }
    } else if (/^\d+$/.test(inputValue)) {
        parsedOffset = parseImplicitOffset(inputValue);
        if (!Number.isFinite(parsedOffset)) {
            return { valid: false, error: 'Formato hexadecimal invalido' };
        }
    } else {
        return {
            valid: false,
            error: 'Formato de offset invalido. Use hex (1A2B ou 0x1A2B) ou decimal explicito (0d4096)'
        };
    }

    if (!Number.isFinite(parsedOffset)) {
        return { valid: false, error: 'Offset invalido' };
    }

    return {
        valid: true,
        parsedOffset: this.normalizeOffsetNumber(parsedOffset),
        realOffset: useDisplayBase ? parsedOffset - this.getOffsetDisplayBase() : parsedOffset
    };
},

setOffsetDisplayBase(offsetBase, options = {}) {
    const normalizedBase = this.normalizeOffsetNumber(offsetBase);
    this.offsetDisplayBase = normalizedBase;
    this.saveOffsetDisplayBase();

    if (options.refresh !== false) {
        this.renderCurrentView(true);
        this.updateStatus();
    }

    if (options.syncGoTo !== false && typeof require !== 'undefined') {
        try {
            const { ipcRenderer } = require('electron');
            ipcRenderer.send('goto-state-update', {
                fileSize: this.getDataLength(),
                currentOffset: this.cursorPosition,
                offsetBase: normalizedBase
            });
        } catch (error) {
        }
    }

    return normalizedBase;
},

promptOffsetDisplayBase() {
    const currentBase = this.getOffsetDisplayBase();
    const promptValue = window.prompt(
        'Digite a base de exibicao do offset.\nUse decimal (4096) ou hex (0x1000 / 1A2B).\nDeixe vazio para resetar.',
        this.formatOffset(currentBase)
    );

    if (promptValue === null) {
        return;
    }

    if (!promptValue.trim()) {
        this.setOffsetDisplayBase(0);
        window.notificationSystem?.success('Base de offset resetada para 0x00000000.', 'Offset');
        return;
    }

    const parsed = this.parseOffsetInput(promptValue);
    if (!parsed.valid) {
        window.notificationSystem?.error(parsed.error, 'Offset');
        return;
    }

    this.setOffsetDisplayBase(parsed.parsedOffset);
    window.notificationSystem?.success(
        `Base de offset definida para ${this.formatOffset(this.getOffsetDisplayBase())}.`,
        'Offset'
    );
},

isCurrentTable16Bit() {
    const currentTable = this.charTables && this.currentCharTable
        ? this.charTables[this.currentCharTable]
        : null;
    // Reconhecer tipos 16-bit e compostos (16-bit DTE, 16-bit MTE, etc.)
    return !!(currentTable && (currentTable.type === '16-bit' || currentTable.type === 'UTF-16' ||
                               (currentTable.type && currentTable.type.includes && currentTable.type.includes('16-bit'))));
},

isCurrentTableShiftJIS() {
    const currentTable = this.charTables && this.currentCharTable
        ? this.charTables[this.currentCharTable]
        : null;
        return !!(currentTable && (((currentTable.type && currentTable.type.includes && (currentTable.type.includes('shift-jis') || currentTable.type.includes('shift_jis')))) || currentTable._isShiftJIS === true));
},

isShiftJISLeadByte(byte) {
    const value = Number(byte);
    return (value >= 0x81 && value <= 0x9F) || (value >= 0xE0 && value <= 0xFC);
},

isShiftJISTrailByte(byte) {
    const value = Number(byte);
    return (value >= 0x40 && value <= 0x7E) || (value >= 0x80 && value <= 0xFC);
},

get16BitCharStart(offset) {
    const maxPosition = Math.max(0, this.getDataLength() - 1);
    const clampedOffset = Math.max(0, Math.min(this.normalizeOffsetNumber(offset), maxPosition));
    return clampedOffset % 2 === 0 ? clampedOffset : clampedOffset - 1;
},

getShiftJISCharRange(offset) {
    const maxPosition = Math.max(0, this.getDataLength() - 1);
    const clampedOffset = Math.max(0, Math.min(this.normalizeOffsetNumber(offset), maxPosition));
    const currentTable = this.charTables && this.currentCharTable
        ? this.charTables[this.currentCharTable]
        : null;
    const mappings = (currentTable && (currentTable.mappings || currentTable.mapping)) || {};
    const byteToHex = (value) => value.toString(16).toUpperCase().padStart(2, '0');
    const byteAt = (pos) => this.getByteAt(pos);

    const currentByte = byteAt(clampedOffset);
    const currentHex = byteToHex(currentByte);

    if (clampedOffset - 1 >= 0) {
        const prevByte = byteAt(clampedOffset - 1);
        const prevHex = byteToHex(prevByte);
        const prevPairHex = prevHex + currentHex;
        if (mappings[prevPairHex]) {
            return {
                cursor: clampedOffset - 1,
                start: clampedOffset - 1,
                end: clampedOffset
            };
        }
    }

    if (clampedOffset + 1 <= maxPosition) {
        const nextByte = byteAt(clampedOffset + 1);
        const pairHex = currentHex + byteToHex(nextByte);
        if (mappings[pairHex]) {
            return {
                cursor: clampedOffset,
                start: clampedOffset,
                end: clampedOffset + 1
            };
        }
    }

    if ((currentByte >= 0x20 && currentByte <= 0x7E) || mappings[currentHex]) {
        return {
            cursor: clampedOffset,
            start: clampedOffset,
            end: clampedOffset
        };
    }

    return {
        cursor: clampedOffset,
        start: clampedOffset,
        end: clampedOffset
    };
},

getSelectionRangeForPanel(offset, panel = this.activePanel) {
    const maxPosition = Math.max(0, this.getDataLength() - 1);
    const clampedOffset = Math.max(0, Math.min(this.normalizeOffsetNumber(offset), maxPosition));

    if (this.isCurrentTable16Bit() && panel === 'hex') {
        const start = this.get16BitCharStart(clampedOffset);
        return {
            cursor: clampedOffset,
            start,
            end: Math.min(start + 1, maxPosition)
        };
    }

    if (this.isCurrentTable16Bit() && panel === 'ascii') {
        const start = this.get16BitCharStart(clampedOffset);
        return {
            cursor: start,
            start,
            end: Math.min(start + 1, maxPosition)
        };
    }

    if (this.isCurrentTableShiftJIS() && panel === 'hex') {
        return this.getShiftJISCharRange(clampedOffset);
    }

    if (this.isCurrentTableShiftJIS() && panel === 'ascii') {
        return this.getShiftJISCharRange(clampedOffset);
    }

    return {
        cursor: clampedOffset,
        start: clampedOffset,
        end: clampedOffset
    };
},

getNormalizedSelectionBounds(panel = this.activePanel, start = this.selectionStart, end = this.selectionEnd) {
    const safeStart = Math.max(0, Math.min(this.normalizeOffsetNumber(start), this.getDataLength() - 1));
    const safeEnd = Math.max(0, Math.min(this.normalizeOffsetNumber(end), this.getDataLength() - 1));
    const minOffset = Math.min(safeStart, safeEnd);
    const maxOffset = Math.max(safeStart, safeEnd);

    if (this.isCurrentTable16Bit()) {
        if (panel === 'hex' || panel === 'ascii') {
            const startRange = this.getSelectionRangeForPanel(minOffset, 'hex');
            const endRange = this.getSelectionRangeForPanel(maxOffset, panel);
            return {
                start: startRange.start,
                end: endRange.end,
                cursor: endRange.cursor
            };
        }
    }

    if (this.isCurrentTableShiftJIS()) {
        if (panel === 'ascii') {
            const startRange = this.getSelectionRangeForPanel(minOffset, 'ascii');
            const endRange = this.getSelectionRangeForPanel(maxOffset, 'ascii');
            return {
                start: startRange.start,
                end: endRange.end,
                cursor: endRange.cursor
            };
        }

        return {
            start: minOffset,
            end: maxOffset,
            cursor: maxOffset
        };
    }

    return {
        start: minOffset,
        end: maxOffset,
        cursor: maxOffset
    };
},

normalizeSelectionForCurrentTable(panel = this.activePanel || 'hex') {
    if (this.getDataLength() <= 0) {
        return this;
    }

    if (this.isCurrentTable16Bit() && panel === 'hex') {
        const normalized = this.getSelectionRangeForPanel(this.cursorPosition, 'hex');
        this.selectionStart = normalized.start;
        this.selectionEnd = normalized.end;
        this.cursorPosition = normalized.cursor;
    }

    return this;
},

getShiftJISVisualMap(offset, length) {
    const result = new Map();
    const currentTable = this.charTables && this.currentCharTable
        ? this.charTables[this.currentCharTable]
        : null;
        const isShiftJIS = !!(currentTable && (((currentTable.type && currentTable.type.includes && (currentTable.type.includes('shift-jis') || currentTable.type.includes('shift_jis')))) || currentTable._isShiftJIS === true));
    const mappings = (currentTable && (currentTable.mappings || currentTable.mapping)) || {};

    if (!isShiftJIS || length <= 0) {
        return result;
    }

    let i = 0;
    while (i < length && (offset + i) < this.getDataLength()) {
        const byteOffset = offset + i;
        const b1 = this.getByteAt(byteOffset);
        const hex1 = b1.toString(16).toUpperCase().padStart(2, '0');

        // Seguir a mesma prioridade do decoder: ASCII e entradas single-byte da tabela
        // continuam soltas; só agrupamos quando a sequência de 2 bytes existir na tabela.
        if ((b1 >= 0x20 && b1 <= 0x7E) || mappings[hex1]) {
            i += 1;
            continue;
        }

        if ((i + 1) < length && (offset + i + 1) < this.getDataLength()) {
            const b2 = this.getByteAt(byteOffset + 1);
            const hex2 = hex1 + b2.toString(16).toUpperCase().padStart(2, '0');

            if (mappings[hex2]) {
                result.set(byteOffset, { type: 'pair-start', start: byteOffset, end: byteOffset + 1 });
                result.set(byteOffset + 1, { type: 'pair-end', start: byteOffset, end: byteOffset + 1 });
                i += 2;
                continue;
            }
        }

        i += 1;
    }

    return result;
},

get16BitVisualMap(offset, length) {
    const result = new Map();

    if (!this.isCurrentTable16Bit() || length <= 0) {
        return result;
    }

    let i = 0;
    while (i < length && (offset + i) < this.getDataLength()) {
        const byteOffset = offset + i;
        const start = this.get16BitCharStart(byteOffset);
        const end = start + 1;

        if (start < offset || end >= (offset + length) || end >= this.getDataLength()) {
            i += 1;
            continue;
        }

        result.set(start, { type: 'pair-start', start, end });
        result.set(end, { type: 'pair-end', start, end });
        i = (end - offset) + 1;
    }

    return result;
},

getActive16BitDecoder() {
    const currentTable = this.charTables && this.currentCharTable
        ? this.charTables[this.currentCharTable]
        : null;

    // Reconhecer tipos 16-bit e compostos (16-bit DTE, 16-bit MTE, etc.)
    const is16bitTable = currentTable &&
        (currentTable.type === '16-bit' || currentTable.type === 'UTF-16' ||
         (currentTable.type && currentTable.type.includes && currentTable.type.includes('16-bit')));

    if (!is16bitTable) {
        if (this.charDecoder16 && !(currentTable && (((currentTable.type && currentTable.type.includes && (currentTable.type.includes('shift-jis') || currentTable.type.includes('shift_jis')))) || currentTable._isShiftJIS === true))) {
            this.charDecoder16 = null;
        }
        return null;
    }

    const mappings = currentTable.mappings || currentTable.mapping || {};
    const dte_sequences = currentTable.dte_sequences || {};
    const mte_sequences = currentTable.mte_sequences || {};
    const tag_sequences = currentTable.tag_sequences || {};
    const endianness = currentTable.endianness || currentTable._endianness || this.charDecoder16?.endianness || 'LE';
    const terminators = currentTable.terminators || this.charDecoder16?.terminators || [];
    
    const shouldRebuild = !this.charDecoder16 ||
        this.charDecoder16.endianness !== endianness ||
        this.charDecoder16.mapping !== mappings ||
        this.charDecoder16.dte_sequences !== dte_sequences ||
        this.charDecoder16.mte_sequences !== mte_sequences ||
        this.charDecoder16.tag_sequences !== tag_sequences ||
        this.charDecoder16.terminators !== terminators;

    if (shouldRebuild && typeof CharDecoder16bit !== 'undefined') {
        this.charDecoder16 = new CharDecoder16bit({
            mappings,
            dte_sequences,
            mte_sequences,
            tag_sequences,
            endianness,
            terminators
        });
    }

    return this.charDecoder16 || null;
},

getEffectiveLineHeight() {
    const cssRowHeight = getComputedStyle(document.documentElement).getPropertyValue('--editor-row-height');
    const parsedCssHeight = parseFloat(cssRowHeight);
    if (Number.isFinite(parsedCssHeight) && parsedCssHeight > 0) {
        return parsedCssHeight;
    }

    const sampleLine = document.querySelector('.hex-line');
    if (sampleLine) {
        const sampleHeight = sampleLine.getBoundingClientRect().height;
        if (Number.isFinite(sampleHeight) && sampleHeight > 0) {
            return sampleHeight;
        }
    }

    return this.lineHeight || 32;
},

getGroupedHexFontScale() {
    const configuredSize = this.colorConfig && this.colorConfig.fontSettings
        ? Number(this.colorConfig.fontSettings.size)
        : NaN;
    const fontSize = Math.max(12, Math.min(18, Number.isFinite(configuredSize) ? configuredSize : 15));
    if (fontSize <= 15) return 1;

    const maxReduction = 0.28;
    const progress = (fontSize - 15) / 3;
    const reduction = Math.max(0, Math.min(maxReduction, progress * maxReduction));
    return 1 - reduction;
},

getGroupedHexInlineStyle(groupType, pairType) {
    const style = {
        fontSize: `${this.getGroupedHexFontScale()}em`,
        letterSpacing: '0',
        paddingLeft: '3px',
        paddingRight: '3px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
    };

    if (groupType === 'utf16') {
        if (pairType === 'pair-start') {
            style.paddingLeft = '4px';
            style.paddingRight = '1px';
            style.justifyContent = 'flex-end';
        } else if (pairType === 'pair-end') {
            style.paddingLeft = '1px';
            style.paddingRight = '4px';
            style.justifyContent = 'flex-start';
        }
    }

    return style;
},

on(eventName, callback) {
    if (!this.eventListeners[eventName]) {
        this.eventListeners[eventName] = [];
    }
    this.eventListeners[eventName].push(callback);
    return this;
},

off(eventName, callback) {
    if (this.eventListeners[eventName]) {
        this.eventListeners[eventName] = this.eventListeners[eventName]
            .filter((cb) => cb !== callback);
    }
    return this;
},

emit(eventName, ...args) {
    if (this.eventListeners[eventName]) {
        this.eventListeners[eventName].forEach((callback) => {
            try {
                callback(...args);
            } catch (error) {
            }
        });
    }
    return this;
},

setDataProvider(provider) {
    this.dataProvider = provider || null;

    if (provider instanceof window.MemoryHexDataProvider) {
        this.data = provider.data;
    } else if (!provider) {
        this.data = new Uint8Array(0);
    }

    this.fileSize = provider ? provider.length : (this.data ? this.data.length : 0);
    this.totalLines = Math.ceil(this.fileSize / this.bytesPerLine);
    this.maxScrollLines = Math.max(0, this.totalLines - this.visibleLines);
    return this;
},

attachVirtualDataProvider(provider, legacyDataProxy) {
    if (legacyDataProxy !== undefined) {
        this.data = legacyDataProxy;
    }
    return this.setDataProvider(provider);
},

detachDataProvider() {
    return this.setDataProvider(null);
},

switchToMemorySnapshot(snapshot, options = {}) {
    const {
        resetState = true,
        initializeScrolling = true,
        shareSnapshot = false
    } = options;

    const restored = shareSnapshot && snapshot instanceof Uint8Array ? snapshot : new Uint8Array(snapshot || 0);

    this.exitVirtualDataMode?.();

    if (resetState && typeof this.resetToCleanState === 'function') {
        this.resetToCleanState();
    }

    this.setDataProvider(new window.MemoryHexDataProvider(restored));
    this.originalData = this.createDataSnapshot();

    if (initializeScrolling && typeof this.initializeAdvancedScrolling === 'function') {
        this.initializeAdvancedScrolling();
    }

    return restored;
},

clearToEmptyMemoryState(options = {}) {
    return this.switchToMemorySnapshot(new Uint8Array(0), options);
},

getResolvedCurrentFilePath() {
    const filePath = this.currentFilePath;
    if (!filePath || filePath === 'null') {
        return null;
    }

    if (this.currentFileName && filePath === this.currentFileName) {
        return null;
    }

    return filePath;
},

hasResolvedCurrentFilePath() {
    return !!this.getResolvedCurrentFilePath();
},

getExternalSearchThreshold() {
    return 10 * 1024 * 1024;
},

shouldUseExternalSearch(options = {}) {
    const {
        dataLength = this.getDataLength(),
        usesSpecialTableSearch = false
    } = options;

    return !!(
        dataLength > this.getExternalSearchThreshold() &&
        !usesSpecialTableSearch &&
        this.hasResolvedCurrentFilePath()
    );
},

getDataLength() {
    return this.dataProvider ? this.dataProvider.length : (this.data ? this.data.length : 0);
},

isLargeFileActive() {
    return !!(this.dataProvider && this.dataProvider.isVirtual && this.dataProvider.isVirtual());
},

renderCurrentView(preserveCursor = true) {
    if (this.isLargeFileActive() && this.enhancedLargeFileHandler && this.enhancedLargeFileHandler.isLargeFileMode) {
        return this.enhancedLargeFileHandler.renderCurrentView(preserveCursor);
    }
    return this.completeRenderWithColors(this.currentScrollPercent, preserveCursor);
},

getVirtualNavigationHandler() {
    if (this.isLargeFileActive() && this.enhancedLargeFileHandler && this.enhancedLargeFileHandler.isLargeFileMode) {
        return this.enhancedLargeFileHandler;
    }
    return null;
},

ensureLargeFileHandler() {
    if (!this.enhancedLargeFileHandler && window.EnhancedLargeFileHandler) {
        this.enhancedLargeFileHandler = new window.EnhancedLargeFileHandler(this);
    }
    return this.enhancedLargeFileHandler || null;
},

getVirtualDataLength() {
    const handler = this.getVirtualNavigationHandler();
    return handler ? handler.fileSize : 0;
},

exitVirtualDataMode() {
    const handler = this.enhancedLargeFileHandler;
    if (handler && handler.isLargeFileMode && typeof handler.restoreNormalMode === 'function') {
        handler.restoreNormalMode();
        return true;
    }
    return false;
},

dispatchVirtualNavigation(methodName) {
    const handler = this.getVirtualNavigationHandler();
    if (handler && typeof handler[methodName] === 'function') {
        handler[methodName]();
        return true;
    }
    return false;
},

clearVirtualOverlayIfPristine() {
    const handler = this.getVirtualNavigationHandler();
    if (handler && this.modifiedBytes.size === 0 && !handler.hasStructuralChanges?.() && typeof handler.clearOverlay === 'function') {
        handler.clearOverlay();
        this.hasUnsavedChanges = false;
        return true;
    }
    return false;
},

clearVirtualOverlay() {
    const handler = this.getVirtualNavigationHandler();
    if (handler && typeof handler.clearOverlay === 'function') {
        handler.clearOverlay();
        return true;
    }
    return false;
},

hasVirtualOverlayChanges() {
    const handler = this.getVirtualNavigationHandler();
    return !!(handler && typeof handler.hasOverlayChanges === 'function' && handler.hasOverlayChanges());
},

getVirtualOverlayEntries() {
    const handler = this.getVirtualNavigationHandler();
    if (!handler || typeof handler.getOverlayEntries !== 'function') {
        return [];
    }
    return handler.getOverlayEntries();
},

commitVirtualOverlayToCache(entries = null) {
    const handler = this.getVirtualNavigationHandler();
    if (!handler || typeof handler.commitOverlayToCache !== 'function') {
        return false;
    }
    handler.commitOverlayToCache(entries);
    return true;
},

hasVirtualStructuralChanges() {
    const handler = this.getVirtualNavigationHandler();
    return !!(handler && typeof handler.hasStructuralChanges === 'function' && handler.hasStructuralChanges());
},

isVirtualModeReady() {
    const handler = this.getVirtualNavigationHandler();
    return !!(handler && handler.isLargeFileMode);
},

needsDomCursorVisibilitySync() {
    return !this.isLargeFileActive();
},

syncCursorViewport() {
    if (this.needsDomCursorVisibilitySync()) {
        this.ensureCursorVisible?.();
    } else {
        this.renderCurrentView?.(true);
    }
    return this;
},

renderAtScrollPercent(scrollPercent, preserveCursor = true) {
    this.currentScrollPercent = Math.max(0, Math.min(1, Number(scrollPercent) || 0));
    if (this.isLargeFileActive()) {
        return this.renderCurrentView?.(preserveCursor);
    }
    return this.completeRenderWithColors?.(this.currentScrollPercent, preserveCursor);
},

shouldUseLightweightHistorySnapshot() {
    return this.isLargeFileActive() || this.getDataLength() >= 50 * 1024 * 1024;
},

markSavedState() {
    this.originalData = this.createDataSnapshot();
    this.hasUnsavedChanges = false;
    this.modifiedBytes.clear();
    if (this.editingBytes && this.editingBytes.size > 0) {
        this.editingBytes.clear();
    }
    this.updateButtons();
    this.renderCurrentView(true);
    return this;
},

getByteAt(offset) {
    if (this.dataProvider) {
        return this.dataProvider.getByteSync(offset);
    }
    return this.data ? this.data[offset] : undefined;
},

syncProviderDataReference() {
    if (this.dataProvider instanceof window.MemoryHexDataProvider) {
        this.data = this.dataProvider.data;
    }
    return this;
},

isDocumentEditLocked() {
    const tabs = window.fileTabManager;
    return tabs?.isSwitchingSession || window.intelligentSave?.isSessionSaving(tabs?.activeSessionId);
},

documentBytesChanged() {
    this.documentRevision = (this.documentRevision || 0) + 1;
    this.cancelDocumentSearch?.();
    const results = this.searchResults;
    if (!results?.length || this.pendingSearchInvalidation === results) return;
    this.pendingSearchInvalidation = results;
    queueMicrotask(() => {
        if (this.pendingSearchInvalidation !== results) return;
        this.pendingSearchInvalidation = null;
        if (this.searchResults !== results) return;
        this.searchResults = [];
        this.globalTabSearchGroups = [];
        this.currentSearchIndex = -1;
        this.searchNotice = 'Os dados mudaram. Execute a busca novamente.';
        this.updateSearchResults();
        this.syncSearchWindow?.();
    });
},

setByteAt(offset, value) {
    if (this.isDocumentEditLocked()) return false;
    if (this.dataProvider) {
        const changed = this.dataProvider.setByteSync(offset, value);
        if (changed) {
            this.syncProviderDataReference();
            this.documentBytesChanged();
        }
        return changed;
    }

    if (!this.data || offset < 0 || offset >= this.data.length) {
        return false;
    }

    this.data[offset] = value & 0xFF;
    return true;
},

getRangeAt(offset, length) {
    if (this.dataProvider) {
        return this.dataProvider.getRangeSync(offset, length);
    }
    return this.data.slice(offset, offset + length);
},

async getRangeAtAsync(offset, length) {
    const safeOffset = Math.max(0, Number(offset) || 0);
    const safeLength = Math.max(0, Number(length) || 0);

    if (this.dataProvider && typeof this.dataProvider.getRange === 'function') {
        return this.dataProvider.getRange(safeOffset, safeLength);
    }

    return this.getRangeAt(safeOffset, safeLength);
},

async getByteAtAsync(offset) {
    const bytes = await this.getRangeAtAsync(offset, 1);
    return bytes && bytes.length > 0 ? bytes[0] : undefined;
},

isAsciiWordByte(byte) {
    return (byte >= 48 && byte <= 57) ||
        (byte >= 65 && byte <= 90) ||
        (byte >= 97 && byte <= 122) ||
        byte === 95;
},

async matchesByteSequenceAtAsync(offset, searchBytes) {
    const bytes = searchBytes instanceof Uint8Array ? searchBytes : new Uint8Array(searchBytes || []);
    if (!bytes.length || offset < 0) {
        return false;
    }

    const range = await this.getRangeAtAsync(offset, bytes.length);
    if (!range || range.length !== bytes.length) {
        return false;
    }

    for (let i = 0; i < bytes.length; i++) {
        if (range[i] !== bytes[i]) {
            return false;
        }
    }

    return true;
},

async isWordBoundaryAtAsync(offset, length) {
    const beforeByte = offset > 0 ? await this.getByteAtAsync(offset - 1) : undefined;
    const afterByte = offset + length < this.getDataLength()
        ? await this.getByteAtAsync(offset + length)
        : undefined;

    return !this.isAsciiWordByte(beforeByte) && !this.isAsciiWordByte(afterByte);
},

async buildPreviewAtAsync(offset, length, previewRadius = 16) {
    const safeOffset = Math.max(0, Number(offset) || 0);
    const safeLength = Math.max(0, Number(length) || 0);
    const start = Math.max(0, safeOffset - previewRadius);
    const end = Math.min(this.getDataLength(), safeOffset + safeLength + previewRadius);
    const rangeLength = Math.max(0, end - start);

    if (rangeLength <= 0) {
        return '';
    }

    try {
        const bytes = await this.getRangeAtAsync(start, rangeLength);
        if (!bytes || !bytes.length) {
            return '';
        }

        const preview = this.decodeBytesWithCurrentTable?.(bytes) || '';
        return preview.replace(/\s+/g, ' ').trim();
    } catch (_) {
        return '';
    }
},

async getSelectionBytesAsync(start, end) {
    const dataLength = this.getDataLength();
    const safeStart = Math.max(0, Math.min(this.normalizeOffsetNumber(start), Math.max(0, dataLength - 1)));
    const safeEnd = Math.max(safeStart, Math.min(this.normalizeOffsetNumber(end), Math.max(0, dataLength - 1)));
    const length = Math.max(0, (safeEnd - safeStart) + 1);

    if (length <= 0) {
        return new Uint8Array(0);
    }

    return this.getRangeAtAsync(safeStart, length);
},

replaceRangeAt(offset, length, newBytes) {
    if (this.isDocumentEditLocked()) return false;
    if (this.dataProvider) {
        const changed = this.dataProvider.replaceRangeSync(offset, length, newBytes);
        if (changed) {
            this.syncProviderDataReference();
            this.documentBytesChanged();
        }
        return changed;
    }

    const bytes = newBytes instanceof Uint8Array ? newBytes : new Uint8Array(newBytes || []);
    for (let i = 0; i < length; i++) {
        const value = i < bytes.length ? bytes[i] : 0;
        if (offset + i >= 0 && offset + i < this.data.length) {
            this.data[offset + i] = value;
        }
    }
    return true;
},

insertRangeAt(offset, newBytes) {
    if (this.isDocumentEditLocked()) return false;
    if (!this.dataProvider || typeof this.dataProvider.insertRangeSync !== 'function') {
        return false;
    }
    const changed = this.dataProvider.insertRangeSync(offset, newBytes);
    if (changed) {
        this.syncProviderDataReference();
        this.documentBytesChanged();
    }
    return changed;
},

deleteRangeAt(start, end) {
    if (this.isDocumentEditLocked()) return false;
    if (!this.dataProvider || typeof this.dataProvider.deleteRangeSync !== 'function') {
        return false;
    }
    const changed = this.dataProvider.deleteRangeSync(start, end);
    if (changed) {
        this.syncProviderDataReference();
        this.documentBytesChanged();
    }
    return changed;
},

createDataSnapshot() {
    if (this.dataProvider && typeof this.dataProvider.snapshot === 'function') {
        return this.dataProvider.snapshot();
    }
    return this.data ? new Uint8Array(this.data) : new Uint8Array(0);
},

restoreDataSnapshot(snapshot) {
    if (this.dataProvider && this.dataProvider.isVirtual && this.dataProvider.isVirtual()) {
        if (typeof this.dataProvider.restoreSnapshot === 'function') {
            this.dataProvider.restoreSnapshot(snapshot);
        }
        return this;
    }

    const restored = snapshot instanceof Uint8Array ? snapshot : new Uint8Array(snapshot || 0);
    this.setDataProvider(new window.MemoryHexDataProvider(restored));
    this.dataProvider.snapshot();
    return this;
},

loadData(data) {
    let normalizedData;
    if (data instanceof ArrayBuffer) {
        normalizedData = new Uint8Array(data);
    } else if (data instanceof Uint8Array) {
        normalizedData = data;
    } else if (Array.isArray(data)) {
        normalizedData = new Uint8Array(data);
    } else {
        throw new Error('Data must be ArrayBuffer, Uint8Array, or Array');
    }

    this.setDataProvider(new window.MemoryHexDataProvider(normalizedData));
    this.originalData = this.createDataSnapshot();
    this.cursorPosition = 0;
    this.selectionStart = 0;
    this.selectionEnd = 0;
    this.currentScrollPercent = 0;
    this.clearHistory();
    this.clearSearch();
    this.bookmarks = [];
    this.modifiedBytes.clear();
    this.hasUnsavedChanges = false;

    this.initializeAdvancedScrolling();

    this.saveState('Data loaded');
        this.emit('dataLoad', this.getData());

    requestAnimationFrame(() => {
        if (this.getDataLength() > 0 && this.fileSize > 0) {
            this.completeRenderWithColors(0);
            setTimeout(() => {
                this.loadHighlightsFromFile();
                this.updateHighlightsButtonState();
            }, 200);
        }
    });

    return this;
},

getData() {
    return this.dataProvider instanceof window.MemoryHexDataProvider ? this.dataProvider.data : this.data;
},

getDataAsArrayBuffer() {
    const data = this.getData();
    if (!(data instanceof Uint8Array)) {
        throw new Error('Current data provider is virtual; a full ArrayBuffer is not available synchronously');
    }

    return data.buffer.slice(
        data.byteOffset,
        data.byteOffset + data.byteLength
    );
}
});
