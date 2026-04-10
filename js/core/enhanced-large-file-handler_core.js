
class EnhancedLargeFileHandler {
    constructor(hexEditor) {
        this.hexEditor = hexEditor;
        this.chunkSize = 64 * 1024; // 64KB chunks: carregamento instantâneo via IPC e menos sobrecarga do V8
        this.maxCachedChunks = 256; // 16MB de cache total na memória RAM, sem "engasgos"
        this.virtualScrollBuffer = 5; // Linhas extras de buffer (fora da tela visível)
        this.file = null;
        this.fileSize = 0;
        this.sourceFileSize = 0;
        this.totalChunks = 0;
        this.chunkCache = new Map();
        this.loadingPromises = new Map();
        this.accessOrder = [];
        this.isLargeFileMode = false;
        
        this.modifiedOverlay = new Map();
        this.virtualSegments = [];
        
        this.loadStats = {
            chunksLoaded: 0,
            cacheHits: 0,
            cacheMisses: 0,
            totalLoadTime: 0
        };

        this.dragState = {
            isDragging: false,
            isPending: false,
            startPos: 0,
            currentPos: 0,
            activePanel: null,
            autoScrollInterval: null,
            startClientX: 0,
            startClientY: 0,
            moveListener: null
        };
        this.renderState = {
            frameId: null,
            pendingPromise: null,
            pendingPercent: 0,
            preserveCursor: true,
            isRendering: false,
            needsAnotherPass: false
        };
        
    }

    async window_electronFileHandlerRead(path, start, length) {
        if (!window.electronFileHandler || !window.electronFileHandler.isElectronEnvironment()) {
            throw new Error('Electron não disponível para leitura de chunk');
        }
        const result = await window.electronFileHandlerReadChunkSafe(path, start, length);
        return result;
    }

    shouldUseLargeFileMode(file) {
        return !!(this.hexEditor && typeof this.hexEditor.shouldUseLargeFileMode === 'function'
            ? this.hexEditor.shouldUseLargeFileMode(file)
            : file && file.size > 800 * 1024 * 1024);
    }

    async loadLargeFile(file) {
        if (!this.shouldUseLargeFileMode(file)) {
            throw new Error('File not suitable for large file mode');
        }


        this.file = file;
        this.fileSize = file.size;
        this.sourceFileSize = file.size;
        this.totalChunks = Math.ceil(file.size / this.chunkSize);
        this.isLargeFileMode = true;
        this.modifiedOverlay.clear();
        this.virtualSegments = [{ type: 'source', start: 0, length: file.size }];

        this.clearCache();

        this.setupLargeFileMode();

        await this.preloadInitialChunks();

        const virtualData = this.createVirtualDataProxy();

        this.hexEditor.attachVirtualDataProvider(
            new window.ChunkedOverlayDataProvider(this),
            virtualData
        );
        this.hexEditor.fileSize = file.size;
        this.hexEditor.currentFileName = file.name;
        this.hexEditor.currentFileExtension = this.hexEditor.getFileExtension(file.name);
        this.hexEditor.currentFilePath = file.path || file.webkitRelativePath || file.name;

        this.hexEditor.cursorPosition = 0;
        this.hexEditor.selectionStart = 0;
        this.hexEditor.selectionEnd = 0;
        this.hexEditor.currentScrollPercent = 0;
        this.hexEditor.clearHistory();
        this.hexEditor.clearSearch();
        this.hexEditor.bookmarks = [];
        this.hexEditor.modifiedBytes.clear();
        if (this.hexEditor.editingBytes && this.hexEditor.editingBytes.size > 0) {
            this.hexEditor.editingBytes.clear();
        }
        this.hexEditor.hasUnsavedChanges = false;
        this.hexEditor.originalData = this.hexEditor.createDataSnapshot();

        this.hexEditor.totalLines = Math.ceil(file.size / this.hexEditor.bytesPerLine);
        this.hexEditor.maxScrollLines = Math.max(0, this.hexEditor.totalLines - this.hexEditor.visibleLines);

        await this.renderLargeFileInterface();

        this.updateUI(file);

        if (typeof this.hexEditor.loadHighlightsFromFile === 'function') {
            this.hexEditor.loadHighlightsFromFile();
        }
        if (typeof this.hexEditor.updateHighlightsButtonState === 'function') {
            this.hexEditor.updateHighlightsButtonState();
        }

        if (this.hexEditor && typeof this.hexEditor.saveState === 'function') {
            this.hexEditor.saveState('Data loaded (large file)');
            if (typeof this.hexEditor.updateHistoryUI === 'function') {
                this.hexEditor.updateHistoryUI();
            }
            if (typeof this.hexEditor.updateButtons === 'function') {
                this.hexEditor.updateButtons();
            }
        }

        if (typeof require !== 'undefined' && file.path) {
            const { ipcRenderer } = require('electron');
            ipcRenderer.send('add-recent-file', file.path);
        }

        return virtualData;
    }

    setupLargeFileMode() {
        this.originalMethods = {
            completeRenderWithColors: this.hexEditor.completeRenderWithColors?.bind(this.hexEditor)
        };

        this.setupOptimizedLargeFileScroll();

        this.hexEditor.completeRenderWithColors = (percent, preserveCursor) => {
            return this.renderLargeFileContent(percent, preserveCursor);
        };

    }

    createVirtualDataProxy() {
        const self = this;
        
        return new Proxy({}, {
            get(target, prop) {
                if (prop === 'length') {
                    return self.fileSize;
                }
                
                if (prop === 'slice') {
                    return async (start, end) => {
                        const actualEnd = end !== undefined ? end : self.fileSize;
                        const length = actualEnd - start;
                        return await self.getBytes(start, length);
                    };
                }
                

                if (typeof prop === 'string' && /^\d+$/.test(prop)) {
                    const index = parseInt(prop);
                    if (index >= 0 && index < self.fileSize) {
                        return self.getByteSync(index);
                    }
                    return undefined;
                }
                

                if (prop === 'constructor') return Uint8Array;
                if (prop === 'byteLength') return self.fileSize;
                if (prop === 'buffer') return { byteLength: self.fileSize };
                
                return target[prop];
            }
        });
    }


    getByteSync(index) {
        if (index < 0 || index >= this.sourceFileSize) {
            return undefined;
        }

        const location = this.locateSegment(index);
        if (!location || !location.segment) {
            return undefined;
        }

        if (location.segment.type === 'insert') {
            return location.segment.data[location.offset];
        }

        const baseOffset = location.segment.start + location.offset;
        if (this.modifiedOverlay.has(baseOffset)) {
            return this.modifiedOverlay.get(baseOffset);
        }

        const chunkIndex = Math.floor(baseOffset / this.chunkSize);
        
        if (this.chunkCache.has(chunkIndex)) {
            const chunk = this.chunkCache.get(chunkIndex);
            const byteIndexInChunk = baseOffset % this.chunkSize;
            this.loadStats.cacheHits++;
            this.updateAccessOrder(chunkIndex);
            return chunk.data[byteIndexInChunk];
        }

        this.loadStats.cacheMisses++;
        this.loadChunkInBackground(chunkIndex);

        return 0x00;
    }


    getBaseByteSync(index) {
        if (index < 0 || index >= this.fileSize) {
            return undefined;
        }

        const chunkIndex = Math.floor(index / this.chunkSize);


        if (this.chunkCache.has(chunkIndex)) {
            const chunk = this.chunkCache.get(chunkIndex);
            const byteIndexInChunk = index % this.chunkSize;
            this.updateAccessOrder(chunkIndex);
            return chunk.data[byteIndexInChunk];
        }


        this.loadChunkInBackground(chunkIndex);
        return 0x00;
    }


    async getBytes(offset, length) {
        if (offset < 0 || offset >= this.fileSize) {
            return new Uint8Array(0);
        }

        const actualLength = Math.min(length, this.fileSize - offset);
        const result = new Uint8Array(actualLength);

        let resultOffset = 0;
        let currentOffset = offset;
        let remaining = actualLength;

        while (remaining > 0) {
            const chunkIndex = Math.floor(currentOffset / this.chunkSize);
            const chunk = await this.getChunk(chunkIndex);
            
            if (!chunk) break;
            
            const byteIndexInChunk = currentOffset % this.chunkSize;
            const bytesToCopy = Math.min(remaining, chunk.data.length - byteIndexInChunk);
            
            result.set(
                chunk.data.slice(byteIndexInChunk, byteIndexInChunk + bytesToCopy),
                resultOffset
            );
            
            resultOffset += bytesToCopy;
            currentOffset += bytesToCopy;
            remaining -= bytesToCopy;
        }

        if (this.modifiedOverlay.size > 0) {
            for (const [pos, value] of this.modifiedOverlay.entries()) {
                if (pos >= offset && pos < offset + result.length) {
                    const localIndex = pos - offset;
                    result[localIndex] = value;
                }
            }
        }

        return result;
    }


    async getChunk(chunkIndex) {
        if (chunkIndex < 0 || chunkIndex >= this.totalChunks) {
            return null;
        }


        if (this.chunkCache.has(chunkIndex)) {
            this.updateAccessOrder(chunkIndex);
            return this.chunkCache.get(chunkIndex);
        }


        if (this.loadingPromises.has(chunkIndex)) {
            return await this.loadingPromises.get(chunkIndex);
        }


        const loadPromise = this.loadChunk(chunkIndex);
        this.loadingPromises.set(chunkIndex, loadPromise);

        try {
            const chunk = await loadPromise;
            this.loadingPromises.delete(chunkIndex);
            return chunk;
        } catch (error) {
            this.loadingPromises.delete(chunkIndex);
            console.error(`❌ Failed to load chunk ${chunkIndex}:`, error);
            return null;
        }
    }

    async loadChunk(chunkIndex) {
        const start = chunkIndex * this.chunkSize;
        const end = Math.min(start + this.chunkSize, this.fileSize);

        const startTime = performance.now();

        try {
            let data;

            if (window.electronFileHandler && window.electronFileHandler.isElectronEnvironment() && this.file && this.file.path) {
                const read = await window.electronFileHandler.readFileChunkSafe(this.file.path, start, end - start);
                data = read;
            } else {
                const blob = this.file.slice(start, end);
                const arrayBuffer = await blob.arrayBuffer();
                data = new Uint8Array(arrayBuffer);
            }
            
            const chunk = {
                index: chunkIndex,
                start: start,
                end: end,
                data: data,
                loadTime: Date.now()
            };
            

            this.addToCache(chunkIndex, chunk);
            
            const loadTime = performance.now() - startTime;
            this.loadStats.chunksLoaded++;
            this.loadStats.totalLoadTime += loadTime;
            
            return chunk;
            
        } catch (error) {
            console.error(`❌ Failed to load chunk ${chunkIndex}:`, error);
            throw error;
        }
    }


    async loadChunkInBackground(chunkIndex) {
        try {
            await this.getChunk(chunkIndex);
            

            if (this.isLargeFileMode) {
                this.scheduleRender(this.hexEditor.currentScrollPercent, true);
            }
        } catch (error) {
            console.error(`❌ Background chunk load failed: ${chunkIndex}`, error);
        }
    }


    addToCache(chunkIndex, chunk) {

        while (this.chunkCache.size >= this.maxCachedChunks) {
            const oldestChunk = this.accessOrder.shift();
            this.chunkCache.delete(oldestChunk);
        }

        this.chunkCache.set(chunkIndex, chunk);
        this.updateAccessOrder(chunkIndex);
    }

    updateAccessOrder(chunkIndex) {
        const existingIndex = this.accessOrder.indexOf(chunkIndex);
        if (existingIndex !== -1) {
            this.accessOrder.splice(existingIndex, 1);
        }
        this.accessOrder.push(chunkIndex);
    }


    async preloadInitialChunks() {
        
        const chunksToPreload = Math.min(4, this.totalChunks); // Carregar até 4 chunks (128MB)
        const loadPromises = [];

        for (let i = 0; i < chunksToPreload; i++) {
            loadPromises.push(this.getChunk(i));
        }

        try {
            await Promise.all(loadPromises);
        } catch (error) {
            console.error('❌ Failed to preload initial chunks:', error);
        }
    }


    async renderLargeFileContent(percent = 0, preserveCursor = false) {
        if (!this.isLargeFileMode || !this.file) {
            return this.originalMethods.completeRenderWithColors?.call(this.hexEditor, percent, preserveCursor);
        }

        const container = document.getElementById('hex-content');
        if (!container) return 0;

        const p = Math.max(0, Math.min(1, percent));
        const targetLine = Math.floor(p * this.hexEditor.maxScrollLines);
        const startLine = Math.max(0, targetLine);
        const endLine = Math.min(this.hexEditor.totalLines - 1, startLine + this.hexEditor.visibleLines + this.virtualScrollBuffer);

        this.setupContainerWithScrollbar(container);

        const contentArea = container.querySelector('#large-file-content');
        if (contentArea) {
            contentArea.innerHTML = '';
        }
        const fragment = document.createDocumentFragment();
        if (typeof this.hexEditor.resetTextColumnScrollMetrics === 'function') {
            this.hexEditor.resetTextColumnScrollMetrics();
        }
        let maxTextVisualUnits = 0;

        const selStart = Math.min(this.hexEditor.selectionStart, this.hexEditor.selectionEnd);
        const selEnd = Math.max(this.hexEditor.selectionStart, this.hexEditor.selectionEnd);

        const startOffset = startLine * this.hexEditor.bytesPerLine;
        const endOffset = Math.min((endLine + 1) * this.hexEditor.bytesPerLine, this.fileSize);
        await this.preloadRegion(startOffset, endOffset);

        for (let line = startLine; line <= endLine; line++) {
            const offset = line * this.hexEditor.bytesPerLine;
            if (offset < this.fileSize) {
                const lineElement = await this.createEnhancedLine(offset, selStart, selEnd);
                if (lineElement) {
                    const textVisualUnits = parseInt(lineElement.dataset?.textVisualUnits || '0', 10) || 0;
                    maxTextVisualUnits = Math.max(maxTextVisualUnits, textVisualUnits);
                    if (typeof this.hexEditor.registerTextColumnScrollUnits === 'function') {
                        this.hexEditor.registerTextColumnScrollUnits(textVisualUnits);
                    }
                    fragment.appendChild(lineElement);
                }
            }
        }

        if (contentArea) {
            contentArea.appendChild(fragment);
        } else {
            container.appendChild(fragment);
        }

        const textScrollbar = document.getElementById('text-column-scrollbar');
        const textScrollbarWrap = document.getElementById('text-column-scrollbar-wrap');
        const maxVisibleChars = 34;
        const unitWidth = 13;

        // Medir a largura real renderizada dos elementos .hex-ascii para detectar overflow real
        let maxActualContentWidth = 0;
        if (typeof this.hexEditor.getTextColumnContentWidth === 'function') {
            document.querySelectorAll('.hex-ascii').forEach((element) => {
                const actualWidth = this.hexEditor.getTextColumnContentWidth(element);
                maxActualContentWidth = Math.max(maxActualContentWidth, actualWidth);
            });
        }

        const overflowChars = Math.max(0, maxTextVisualUnits - maxVisibleChars);
        const charBasedContentWidth = (maxVisibleChars * unitWidth) + (overflowChars * unitWidth);

        // Priorizar a largura real medida do DOM sobre cálculo baseado em caracteres
        const virtualContentWidth = Math.max(charBasedContentWidth, maxActualContentWidth);
        const viewportPixelWidth = maxVisibleChars * unitWidth;

        // Detectar overflow: se largura real > viewport OU cálculo por caracteres indicar overflow
        const hasOverflow = maxActualContentWidth > viewportPixelWidth || charBasedContentWidth > viewportPixelWidth;
        const maxScrollLeft = Math.max(0, virtualContentWidth - viewportPixelWidth);

        if (textScrollbar) {
            textScrollbar.style.pointerEvents = hasOverflow ? 'auto' : 'none';
            textScrollbar.setAttribute('aria-hidden', hasOverflow ? 'false' : 'true');
            textScrollbar.dataset.maxScrollLeft = String(maxScrollLeft);
            textScrollbar.dataset.viewportWidth = String(maxVisibleChars * unitWidth);
            textScrollbar.dataset.contentWidth = String((maxVisibleChars * unitWidth) + maxScrollLeft);
            if (!hasOverflow) {
                this.hexEditor.textColumnScrollLeft = 0;
            } else {
                const currentValue = Math.min(maxScrollLeft, Math.max(0, this.hexEditor.textColumnScrollLeft || 0));
                this.hexEditor.textColumnScrollLeft = currentValue;
            }
        }

        if (textScrollbarWrap) {
            textScrollbarWrap.classList.toggle('has-overflow', hasOverflow);
        }

        if (typeof this.hexEditor.applyTextColumnScroll === 'function') {
            this.hexEditor.applyTextColumnScroll();
        }
        if (typeof this.hexEditor.updateTextColumnScrollbarThumb === 'function') {
            this.hexEditor.updateTextColumnScrollbarThumb();
        }

        if (typeof this.hexEditor.applyTextColumnScrollbarMetrics === 'function') {
            this.hexEditor.applyTextColumnScrollbarMetrics(maxTextVisualUnits);
            requestAnimationFrame(() => this.hexEditor.applyTextColumnScrollbarMetrics(maxTextVisualUnits));
        } else {
            this.hexEditor.updateTextColumnScrollbar?.();
            requestAnimationFrame(() => this.hexEditor.updateTextColumnScrollbar?.());
        }

        this.updateScrollbarThumb(p);

        if (!preserveCursor) {
            if (p >= 0.99) {
                this.hexEditor.cursorPosition = this.fileSize - 1;
            } else {
                const targetOffset = startLine * this.hexEditor.bytesPerLine;
                this.hexEditor.cursorPosition = Math.max(0, Math.min(targetOffset, this.fileSize - 1));
            }
        }

        this.hexEditor.updateStatus();
        this.hexEditor.currentScrollPercent = p;

        return p;
    }

    scheduleRender(percent = this.hexEditor.currentScrollPercent, preserveCursor = true) {
        const p = Math.max(0, Math.min(1, percent));
        this.renderState.pendingPercent = p;
        this.renderState.preserveCursor = preserveCursor;

        if (this.renderState.frameId !== null) {
            return this.renderState.pendingPromise || Promise.resolve(p);
        }

        this.renderState.pendingPromise = new Promise((resolve) => {
            this.renderState.frameId = requestAnimationFrame(async () => {
                this.renderState.frameId = null;
                try {
                    const result = await this.performScheduledRender();
                    resolve(result);
                } catch (error) {
                    console.error('❌ Scheduled large file render failed:', error);
                    resolve(this.renderState.pendingPercent);
                }
            });
        });

        return this.renderState.pendingPromise;
    }

    async performScheduledRender() {
        if (this.renderState.isRendering) {
            this.renderState.needsAnotherPass = true;
            return this.renderState.pendingPercent;
        }

        this.renderState.isRendering = true;
        try {
            const result = await this.renderLargeFileContent(
                this.renderState.pendingPercent,
                this.renderState.preserveCursor
            );

            if (this.renderState.needsAnotherPass) {
                this.renderState.needsAnotherPass = false;
                return await this.performScheduledRender();
            }

            return result;
        } finally {
            this.renderState.isRendering = false;
            this.renderState.pendingPromise = null;
        }
    }


    async createEnhancedLine(offset, selStart, selEnd) {
        const bytesPerLine = this.hexEditor.bytesPerLine;
        const lineData = await this.getBytes(offset, bytesPerLine);

        if (!lineData || lineData.length === 0) {
            return null;
        }

        const line = document.createElement('div');
        line.className = 'hex-line';
        line.style.cssText = `
            display: grid; grid-template-columns: 100px 1fr 420px; gap: 20px;
            padding: 4px 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        `;


        const offsetDiv = document.createElement('div');
        offsetDiv.textContent = this.hexEditor.formatOffset(offset, { includePrefix: false, useDisplayBase: true });
        offsetDiv.className = 'offset';
        offsetDiv.style.cssText = `color:${this.hexEditor.getOffsetColor()};font-weight:bold;text-align:right;padding-right:8px;position:relative;`;


        const allBookmarks = (this.hexEditor && Array.isArray(this.hexEditor.bookmarks)) ? this.hexEditor.bookmarks : [];
        const lineBookmarks = allBookmarks.length > 0
            ? allBookmarks.filter(b => b && typeof b.offset === 'number' && b.offset >= offset && b.offset < offset + bytesPerLine)
            : [];
        if (lineBookmarks.length > 0) {
            const bookmarkIcon = document.createElement('span');
            bookmarkIcon.textContent = '🔖';
            bookmarkIcon.className = 'bookmark-icon';
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
        bytesDiv.style.cssText = 'display: flex; gap: 2px; flex-wrap: nowrap;';
        const insertCaretEnabled = this.hexEditor.canUseInsertCursor && this.hexEditor.canUseInsertCursor();
        let hexEndCaretPlaced = false;


        const asciiDiv = document.createElement('div');
        asciiDiv.className = 'hex-ascii';
        asciiDiv.style.cssText = `
            letter-spacing: 0.1px; padding-left: 12px;
            border-left: 2px solid rgba(129, 199, 132, 0.3); display: flex;
        `;

        let asciiText = '';
        const currentTable = this.hexEditor.charTables && this.hexEditor.currentCharTable
            ? this.hexEditor.charTables[this.hexEditor.currentCharTable]
            : null;
        const is16bit = currentTable && (currentTable.type === '16-bit' || currentTable.type === 'UTF-16');
        const isShiftJIS = currentTable && (currentTable.type === 'shift-jis' || currentTable.type === 'shift_jis');
        const active16BitDecoder = is16bit ? this.hexEditor.getActive16BitDecoder() : null;
        const shiftJISVisualMap = isShiftJIS ? this.hexEditor.getShiftJISVisualMap(offset, bytesPerLine) : new Map();
        const visual16BitMap = is16bit ? this.hexEditor.get16BitVisualMap(offset, bytesPerLine) : new Map();


        const bookmarkedOffsets = lineBookmarks.length > 0
            ? new Set(lineBookmarks.map(b => b.offset))
            : null;

        for (let i = 0; i < bytesPerLine; i++) {
            const pos = offset + i;
            
            if (i < lineData.length && pos < this.fileSize) {
                if (insertCaretEnabled) {
                    const activeCaret = this.hexEditor.createInsertCaretSpan(pos, 'hex');
                    if (activeCaret) {
                        bytesDiv.appendChild(activeCaret);
                    }
                }

                let byte = lineData[i];
                const overlayValue = this.modifiedOverlay.get(pos);
                if (overlayValue !== undefined) {
                    byte = overlayValue;
                }
                
                const hexSpan = document.createElement('span');
                hexSpan.textContent = byte.toString(16).toUpperCase().padStart(2, '0');
                hexSpan.dataset.offset = pos;
                hexSpan.dataset.panel = 'hex';
                hexSpan.className = 'hex-byte';
                hexSpan.style.cssText = `
                    width: 24px; text-align: center; padding: 0 2px; border-radius: 3px;
                    cursor: pointer; color: #4fc3f7; font-weight: 500; user-select: none;
                    transition: all 0.1s ease; font-family: inherit; font-size: inherit;
                    box-sizing: border-box;
                `;

                let byteColor = '#4fc3f7'; // Cor padrão fallback
                if (this.hexEditor && this.hexEditor.getHexColor) {
                    byteColor = this.hexEditor.getHexColor(byte);
                }
                
                hexSpan.style.color = byteColor;
                const shiftJISInfo = shiftJISVisualMap.get(pos);
                if (shiftJISInfo) {
                    hexSpan.classList.add(shiftJISInfo.type === 'pair-start' ? 'shiftjis-pair-start' : 'shiftjis-pair-end');
                    hexSpan.style.width = '30px';
                    hexSpan.style.minWidth = '30px';
                    hexSpan.style.maxWidth = '30px';
                    hexSpan.style.boxSizing = 'border-box';
                    const groupedStyle = this.hexEditor.getGroupedHexInlineStyle('shiftjis', shiftJISInfo.type);
                    Object.assign(hexSpan.style, groupedStyle);
                }

                const visual16BitInfo = visual16BitMap.get(pos);
                if (visual16BitInfo) {
                    hexSpan.classList.add(visual16BitInfo.type === 'pair-start' ? 'utf16-pair-start' : 'utf16-pair-end');
                    hexSpan.style.width = '30px';
                    hexSpan.style.minWidth = '30px';
                    hexSpan.style.maxWidth = '30px';
                    hexSpan.style.boxSizing = 'border-box';
                    const groupedStyle = this.hexEditor.getGroupedHexInlineStyle('utf16', visual16BitInfo.type);
                    Object.assign(hexSpan.style, groupedStyle);
                }

                const isEditingHex = this.hexEditor && this.hexEditor.editingBytes && this.hexEditor.editingBytes.has(pos);
                const isModifiedHex = (this.hexEditor && this.hexEditor.modifiedBytes && this.hexEditor.modifiedBytes.has(pos)) || this.modifiedOverlay.has(pos);

                if (isEditingHex) {
                    hexSpan.style.background = '#000000';
                    hexSpan.style.color = '#ffffff';
                    hexSpan.style.fontWeight = 'bold';
                    hexSpan.style.boxShadow = '0 0 8px rgba(0, 0, 0, 0.8)';
                    hexSpan.style.animation = 'editingPulse 1s ease-in-out infinite';
                }
                else if (isModifiedHex) {
                    hexSpan.style.background = 'linear-gradient(135deg, rgba(255, 215, 0, 0.4), rgba(255, 193, 7, 0.4))';
                    hexSpan.style.color = '#ffd700';
                    hexSpan.style.fontWeight = 'bold';
                    hexSpan.style.boxShadow = '0 0 6px rgba(255, 215, 0, 0.6)';
                    hexSpan.style.animation = 'modifiedPulse 2s ease-in-out infinite';
                }

                const isSelected = selStart !== selEnd && pos >= selStart && pos <= selEnd;
                const isCursor = !insertCaretEnabled && pos === this.hexEditor.cursorPosition;

                if (this.hexEditor.activePanel === 'hex') {
                    if (isSelected) {
                        hexSpan.style.background = 'linear-gradient(135deg, rgba(255, 107, 53, 0.6), rgba(247, 147, 30, 0.6))';
                        hexSpan.style.color = 'white';
                        hexSpan.style.fontWeight = 'bold';
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

                if (this.hexEditor.getHighlightAt) {
                    const h = this.hexEditor.getHighlightAt(pos);
                    if (h) {
                        hexSpan.dataset.highlightId = h.id;
                        if (this.hexEditor.getHighlightColors && this.hexEditor.applyHighlightStyle) {
                            const colors = this.hexEditor.getHighlightColors(h);
                            this.hexEditor.applyHighlightStyle(hexSpan, colors);
                            if (this.hexEditor.activePanel === 'hex') {
                                if (isSelected) {
                                    hexSpan.style.background = 'linear-gradient(135deg, rgba(255, 107, 53, 0.6), rgba(247, 147, 30, 0.6))';
                                    hexSpan.style.color = 'white';
                                    hexSpan.style.fontWeight = 'bold';
                                    hexSpan.style.boxShadow = `${colors.shadow}, 0 0 8px rgba(255, 107, 53, 0.8)`;
                                    hexSpan.style.border = colors.border;
                                    hexSpan.style.display = 'flex';
                                    hexSpan.style.alignItems = 'center';
                                    hexSpan.style.justifyContent = 'center';
                                    hexSpan.style.padding = '0';
                                }

                                if (isCursor) {
                                    hexSpan.style.background = 'linear-gradient(135deg, #ff6b35, #f7931e)';
                                    hexSpan.style.color = 'white';
                                    hexSpan.style.fontWeight = 'bold';
                                    hexSpan.style.boxShadow = `${colors.shadow}, 0 0 12px rgba(255, 107, 53, 1)`;
                                    hexSpan.style.border = colors.border;
                                    hexSpan.style.display = 'flex';
                                    hexSpan.style.alignItems = 'center';
                                    hexSpan.style.justifyContent = 'center';
                                    hexSpan.style.padding = '0';
                                }
                            }
                        } else {
                            hexSpan.style.background = h.color || 'rgba(0, 150, 255, 0.5)';
                            hexSpan.style.color = 'white';
                        }
                    }
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

                if (bookmarkedOffsets && bookmarkedOffsets.has(pos)) {
                    hexSpan.classList.add('bookmarked');
                }

                bytesDiv.appendChild(hexSpan);

                if (!is16bit) {
                    let char = '.';
                    const hexCode = byte.toString(16).toUpperCase().padStart(2, '0');
                    if (currentTable && currentTable.mapping) {
                        char = currentTable.mapping[byte]
                            || currentTable.mapping[hexCode]
                            || '.';
                    } else {
                        char = byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.';
                    }
                    asciiText += char;
                }
            } else {
                if (insertCaretEnabled && !hexEndCaretPlaced && this.hexEditor.isInsertCaretActiveAt(pos, 'hex')) {
                    const activeCaret = this.hexEditor.createInsertCaretSpan(pos, 'hex');
                    if (activeCaret) {
                        bytesDiv.appendChild(activeCaret);
                    }
                    hexEndCaretPlaced = true;
                }
                const emptyHex = document.createElement('span');
                emptyHex.style.cssText = 'width: 24px; visibility: hidden;';
                bytesDiv.appendChild(emptyHex);
            }
        }

        if (insertCaretEnabled && !hexEndCaretPlaced) {
            const lineEndCaretOffset = Math.min(offset + bytesPerLine, this.fileSize);
            const activeCaret = this.hexEditor.createInsertCaretSpan(lineEndCaretOffset, 'hex');
            if (activeCaret) {
                bytesDiv.appendChild(activeCaret);
            }
        }

        if (is16bit && active16BitDecoder) {
            const maxChars = Math.min(bytesPerLine / 2, Math.floor(lineData.length / 2));
            asciiText = active16BitDecoder.decode(lineData, 0, maxChars);
        }

        for (let i = 0; i < asciiText.length; i++) {
            const char = asciiText[i];
            const pos = offset + i;

            if (insertCaretEnabled) {
                const activeCaret = this.hexEditor.createInsertCaretSpan(pos, 'ascii');
                if (activeCaret) {
                    asciiDiv.appendChild(activeCaret);
                }
            }
            
            const asciiSpan = document.createElement('span');
            asciiSpan.textContent = char;
            asciiSpan.dataset.offset = pos;
            asciiSpan.dataset.panel = 'ascii';
            asciiSpan.className = 'ascii-char';
            asciiSpan.style.cssText = `
                width: ${Math.max(12, char.length * 8)}px; 
                text-align: center; cursor: pointer;
                padding: 0 1px; border-radius: 2px; user-select: none;
                transition: all 0.1s ease;
                color: #81c784;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-weight: 500;
                line-height: 1;
                min-height: 20px;
                vertical-align: middle;
                margin-right: 1px;
                font-family: inherit; font-size: inherit;
            `;

            let charColor = '#81c784'; // Verde padrão
            if (this.hexEditor && this.hexEditor.colorConfig && this.hexEditor.colorConfig.textColors) {
                charColor = this.hexEditor.getTextColor(char);
            } else if (this.hexEditor && this.hexEditor.applyTextColorsToSpan) {
                this.hexEditor.applyTextColorsToSpan(asciiSpan, char);
                charColor = asciiSpan.style.color || '#81c784';
            } else if (this.hexEditor && this.hexEditor.applyCharColorAdvanced && this.hexEditor.useCharColors) {
                charColor = this.hexEditor.applyCharColorAdvanced(char);
            }
            
            asciiSpan.style.color = charColor;

            if (this.hexEditor.activePanel === 'ascii') {
                const isSelected = selStart !== selEnd && pos >= selStart && pos <= selEnd;
                const isCursor = !insertCaretEnabled && pos === this.hexEditor.cursorPosition;

                if (isSelected) {
                    asciiSpan.style.background = 'linear-gradient(135deg, rgba(255, 107, 53, 0.6), rgba(247, 147, 30, 0.6))';
                    asciiSpan.style.color = 'white';
                    asciiSpan.style.display = 'flex';
                    asciiSpan.style.alignItems = 'center';
                    asciiSpan.style.justifyContent = 'center';
                }
                
                if (isCursor) {
                    asciiSpan.style.background = 'linear-gradient(135deg, #ff6b35, #f7931e)';
                    asciiSpan.style.color = 'white';
                    asciiSpan.style.boxShadow = '0 0 10px rgba(255, 107, 53, 1)';
                    asciiSpan.style.border = '2px solid #ff6b35';
                    asciiSpan.style.display = 'flex';
                    asciiSpan.style.alignItems = 'center';
                    asciiSpan.style.justifyContent = 'center';
                    asciiSpan.style.padding = '0';
                }
            }

            if (this.hexEditor.getHighlightAt) {
                const h = this.hexEditor.getHighlightAt(pos);
                const isSelected = selStart !== selEnd && pos >= selStart && pos <= selEnd;
                const isCursor = !insertCaretEnabled && pos === this.hexEditor.cursorPosition;
                if (h) {
                    asciiSpan.dataset.highlightId = h.id;
                    if (this.hexEditor.getHighlightColors && this.hexEditor.applyHighlightStyle) {
                        const colors = this.hexEditor.getHighlightColors(h);
                        this.hexEditor.applyHighlightStyle(asciiSpan, colors);
                        if (this.hexEditor.activePanel === 'ascii') {
                            if (isSelected) {
                                asciiSpan.style.background = 'linear-gradient(135deg, rgba(255, 107, 53, 0.6), rgba(247, 147, 30, 0.6))';
                                asciiSpan.style.color = 'white';
                                asciiSpan.style.boxShadow = `${colors.shadow}, 0 0 8px rgba(255, 107, 53, 0.8)`;
                                asciiSpan.style.border = colors.border;
                                asciiSpan.style.display = 'flex';
                                asciiSpan.style.alignItems = 'center';
                                asciiSpan.style.justifyContent = 'center';
                            }

                            if (isCursor) {
                                asciiSpan.style.background = 'linear-gradient(135deg, #ff6b35, #f7931e)';
                                asciiSpan.style.color = 'white';
                                asciiSpan.style.boxShadow = `${colors.shadow}, 0 0 10px rgba(255, 107, 53, 1)`;
                                asciiSpan.style.border = colors.border;
                                asciiSpan.style.display = 'flex';
                                asciiSpan.style.alignItems = 'center';
                                asciiSpan.style.justifyContent = 'center';
                                asciiSpan.style.padding = '0';
                            }
                        }
                    } else {
                        asciiSpan.style.background = h.color || 'rgba(0, 150, 255, 0.5)';
                        asciiSpan.style.color = 'white';
                    }
                }
            }

            const isEditingAscii = this.hexEditor && this.hexEditor.editingBytes && this.hexEditor.editingBytes.has(pos);
            const isModifiedAscii = (this.hexEditor && this.hexEditor.modifiedBytes && this.hexEditor.modifiedBytes.has(pos)) || this.modifiedOverlay.has(pos);

            if (isEditingAscii) {
                asciiSpan.style.background = '#000000';
                asciiSpan.style.color = '#ffffff';
                asciiSpan.style.fontWeight = 'bold';
                asciiSpan.style.boxShadow = '0 0 8px rgba(0, 0, 0, 0.8)';
                asciiSpan.style.animation = 'editingPulse 1s ease-in-out infinite';
            }
            else if (isModifiedAscii) {
                asciiSpan.style.background = 'linear-gradient(135deg, rgba(255, 215, 0, 0.4), rgba(255, 193, 7, 0.4))';
                asciiSpan.style.color = '#ffd700';
                asciiSpan.style.fontWeight = 'bold';
                asciiSpan.style.boxShadow = '0 0 6px rgba(255, 215, 0, 0.6)';
                asciiSpan.style.animation = 'modifiedPulse 2s ease-in-out infinite';
            }

            asciiDiv.appendChild(asciiSpan);
        }

        if (insertCaretEnabled) {
            const lineEndAsciiOffset = Math.min(offset + asciiText.length, this.fileSize);
            const activeCaret = this.hexEditor.createInsertCaretSpan(lineEndAsciiOffset, 'ascii');
            if (activeCaret) {
                asciiDiv.appendChild(activeCaret);
            }
        }

        asciiDiv.dataset.visualCharCount = String(asciiText.length);
        asciiDiv.dataset.visualScrollUnits = String(asciiText.length);
        line.dataset.textVisualUnits = String(asciiText.length);

        line.appendChild(offsetDiv);
        line.appendChild(bytesDiv);
        asciiDiv.style.willChange = 'transform';
        const asciiViewport = document.createElement('div');
        asciiViewport.className = 'hex-ascii-viewport';
        asciiViewport.appendChild(asciiDiv);
        line.appendChild(asciiViewport);

        return line;
    }


}
