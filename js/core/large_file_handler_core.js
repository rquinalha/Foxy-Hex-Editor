class ChunkedFileReader {
    constructor(file, chunkSize = 16 * 1024 * 1024) { // 16MB chunks
        this.file = file;
        this.chunkSize = chunkSize;
        this.totalChunks = Math.ceil(file.size / chunkSize);
        this.chunkCache = new Map(); // LRU cache
        this.maxCachedChunks = 8; // Máximo 8 chunks na memória (128MB)
        this.loadingPromises = new Map(); // Evita carregar o mesmo chunk múltiplas vezes
        this.accessOrder = []; // Para LRU

    }

    async getByte(offset) {
        if (offset < 0 || offset >= this.file.size) {
            return undefined;
        }

        const chunkIndex = Math.floor(offset / this.chunkSize);
        const chunk = await this.getChunk(chunkIndex);

        if (!chunk) return undefined;

        const byteIndexInChunk = offset % this.chunkSize;
        return chunk.data[byteIndexInChunk];
    }

    async getBytes(offset, length) {
        if (offset < 0 || offset >= this.file.size) {
            return new Uint8Array(0);
        }

        const actualLength = Math.min(length, this.file.size - offset);
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
            throw error;
        }
    }

    async loadChunk(chunkIndex) {
        const start = chunkIndex * this.chunkSize;
        const end = Math.min(start + this.chunkSize, this.file.size);


        try {
            const blob = this.file.slice(start, end);
            const arrayBuffer = await blob.arrayBuffer();
            const data = new Uint8Array(arrayBuffer);
            
            const chunk = {
                index: chunkIndex,
                start: start,
                end: end,
                data: data,
                loadTime: Date.now()
            };
            
            // Adicionar ao cache
            this.addToCache(chunkIndex, chunk);
            
            return chunk;
            
        } catch (error) {
            // console.error(`❌ Failed to load chunk ${chunkIndex}:`, error);
            throw error;
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

    async preloadAdjacentChunks(chunkIndex) {
        const adjacentChunks = [
            chunkIndex - 1,
            chunkIndex + 1
        ].filter(index => index >= 0 && index < this.totalChunks);

        adjacentChunks.forEach(async (index) => {
            if (!this.chunkCache.has(index) && !this.loadingPromises.has(index)) {
                try {
                    await this.getChunk(index);
                } catch (error) {

                }
            }
        });
    }


    getCacheStats() {
        return {
            cachedChunks: this.chunkCache.size,
            maxChunks: this.maxCachedChunks,
            totalChunks: this.totalChunks,
            loadingChunks: this.loadingPromises.size,
            cacheHitRate: this.calculateHitRate()
        };
    }

    calculateHitRate() {

        return this.chunkCache.size / this.totalChunks;
    }
}


class FixedChunkedDataLoader {
    constructor() {
        this.chunkedReader = null;
        this.dataCache = new Map(); // Cache para dados já carregados
        this.debugging = false; // Mudar para true para debug
    }


    createWorkingDataProxy(chunkedReader, fileSize) {
        this.chunkedReader = chunkedReader;

        return new Proxy({}, {
            get: (target, prop) => {
                if (prop === 'length') {
                    return fileSize;
                }
                
                if (prop === 'slice') {
                    return async (start, end) => {
                        const actualEnd = end !== undefined ? end : fileSize;
                        const length = actualEnd - start;
                        return await chunkedReader.getBytes(start, length);
                    };
                }
                

                if (typeof prop === 'string' && /^\d+$/.test(prop)) {
                    const index = parseInt(prop);
                    if (index >= 0 && index < fileSize) {
                        return this.getSyncByte(index);
                    }
                    return undefined;
                }
                

                if (prop === 'constructor') return Uint8Array;
                if (prop === 'byteLength') return fileSize;
                if (prop === 'buffer') return { byteLength: fileSize };
                
                return target[prop];
    }
        });
    }


    getSyncByte(index) {
        if (!this.chunkedReader) {
            return 0x00;
        }
        
        const chunkIndex = Math.floor(index / this.chunkedReader.chunkSize);

        if (this.chunkedReader.chunkCache.has(chunkIndex)) {
            const chunk = this.chunkedReader.chunkCache.get(chunkIndex);
            const byteIndexInChunk = index % this.chunkedReader.chunkSize;
            const byte = chunk.data[byteIndexInChunk];
            
            if (this.debugging && Math.random() < 0.001) {
            }
            
            return byte;
        }

        this.loadChunkInBackground(chunkIndex);

        return 0x00;
    }

    async loadChunkInBackground(chunkIndex) {
        if (!this.chunkedReader) {
            return;
        }
        
        try {
            await this.chunkedReader.getChunk(chunkIndex);
            
            if (window.hexEditor && window.chunkedAdapter) {
                setTimeout(() => {
                    if (window.chunkedAdapter.renderer) {
                        window.chunkedAdapter.renderer.renderChunkedContentFixed();
                    }
                }, 10);
            }
        } catch (error) {
            console.error(`❌ Background chunk load failed: ${chunkIndex}`, error);
        }
    }

    async preloadRegion(startOffset, endOffset) {
        if (!this.chunkedReader) {
            return;
        }
        
        const startChunk = Math.floor(startOffset / this.chunkedReader.chunkSize);
        const endChunk = Math.floor(endOffset / this.chunkedReader.chunkSize);


        const loadPromises = [];
        for (let chunkIndex = startChunk; chunkIndex <= endChunk; chunkIndex++) {
            if (chunkIndex >= 0 && chunkIndex < this.chunkedReader.totalChunks) {
                loadPromises.push(this.chunkedReader.getChunk(chunkIndex));
            }
        }

        try {
            await Promise.all(loadPromises);
        } catch (error) {
            console.error(`❌ Preload failed:`, error);
        }
    }
}


class FixedChunkedRenderer {
    constructor(chunkedAdapter) {
        this.chunkedAdapter = chunkedAdapter;
        this.dataLoader = new FixedChunkedDataLoader();
        this.currentRenderStart = 0;
        this.currentRenderEnd = 0;
        this.rendering = false;
        this.scrollTimeout = null;

        this.isProgrammaticScroll = false;
        this.currentScrollTop = 0;
        this.currentVirtualHeight = 0;
        this.currentTotalLines = 0;
    }


    async renderChunkedContentFixed() {
        if (this.rendering) return;
        this.rendering = true;

        try {
            const container = document.getElementById('hex-content');
            if (!container) return;

            const hexEditor = this.chunkedAdapter.hexEditor;
            const totalLines = Math.ceil(this.chunkedAdapter.fileSize / hexEditor.bytesPerLine);

            const maxHeight = 20000000;
            const virtualHeight = Math.min(totalLines * 25, maxHeight);
            this.currentVirtualHeight = virtualHeight;
            this.currentTotalLines = totalLines;

            const currentLine = Math.floor(hexEditor.cursorPosition / hexEditor.bytesPerLine);
            const visibleLines = Math.max(20, Math.ceil((container.clientHeight || 600) / 25));
            const startLine = Math.max(0, currentLine - Math.floor(visibleLines / 2));

            const virtualTop = (startLine / totalLines) * virtualHeight;
            this.currentScrollTop = virtualTop;

            const endLine = Math.min(totalLines - 1, startLine + visibleLines + 3);

            await this._renderAtScrollTop(container, virtualTop, startLine, endLine, hexEditor, totalLines, virtualHeight, true);
        } finally {
            this.rendering = false;
        }
    }

    async renderInPlace() {
        if (this.rendering) return;
        this.rendering = true;

        try {
            const container = document.getElementById('hex-content');
            if (!container) return;

            const hexEditor = this.chunkedAdapter.hexEditor;
            const totalLines = this.currentTotalLines || Math.ceil(this.chunkedAdapter.fileSize / hexEditor.bytesPerLine);
            const virtualHeight = this.currentVirtualHeight || Math.min(totalLines * 25, 20000000);
            const scrollTop = this.currentScrollTop;


            const lineHeight = 25;
            const startLine = Math.max(0, Math.floor(scrollTop / (virtualHeight / totalLines)));
            const visibleLines = Math.max(20, Math.ceil((container.clientHeight || 600) / lineHeight));
            const endLine = Math.min(totalLines - 1, startLine + visibleLines + 3);

            const startOffset = startLine * hexEditor.bytesPerLine;
            const endOffset = Math.min((endLine + 1) * hexEditor.bytesPerLine, this.chunkedAdapter.fileSize);
            await this.dataLoader.preloadRegion(startOffset, endOffset);

            await this._renderAtScrollTop(container, scrollTop, startLine, endLine, hexEditor, totalLines, virtualHeight, false);
        } finally {
            this.rendering = false;
        }
    }

    async renderAtPercent(percent = 0) {
        if (this.rendering) return;
        this.rendering = true;

        try {
            const container = document.getElementById('hex-content');
            if (!container) return;

            const hexEditor = this.chunkedAdapter.hexEditor;
            const totalLines = Math.ceil(this.chunkedAdapter.fileSize / hexEditor.bytesPerLine);
            const lineHeight = 25;
            const visibleLines = Math.max(20, Math.ceil((container.clientHeight || 600) / lineHeight));
            const maxScrollLines = Math.max(0, totalLines - visibleLines);
            const p = Math.max(0, Math.min(1, Number(percent) || 0));
            const startLine = Math.max(0, Math.min(maxScrollLines, Math.floor(p * maxScrollLines)));
            const endLine = Math.min(totalLines - 1, startLine + visibleLines + 3);
            const virtualHeight = this.currentVirtualHeight || Math.min(totalLines * lineHeight, 20000000);
            const scrollTop = (startLine / Math.max(1, totalLines)) * virtualHeight;

            this.currentScrollTop = scrollTop;
            this.currentVirtualHeight = virtualHeight;
            this.currentTotalLines = totalLines;

            await this._renderAtScrollTop(container, scrollTop, startLine, endLine, hexEditor, totalLines, virtualHeight, true);
        } finally {
            this.rendering = false;
        }
    }


    async _renderAtScrollTop(container, scrollTop, startLine, endLine, hexEditor, totalLines, virtualHeight, moveViewport) {

        const startOffset = startLine * hexEditor.bytesPerLine;
        const endOffset   = Math.min((endLine + 1) * hexEditor.bytesPerLine, this.chunkedAdapter.fileSize);
        await this.dataLoader.preloadRegion(startOffset, endOffset);


        container.innerHTML = '';

        const scrollContainer = document.createElement('div');
        scrollContainer.style.cssText = `height:${virtualHeight}px;position:relative;width:100%;`;

        const contentArea = document.createElement('div');
        const virtualTop = (startLine / totalLines) * virtualHeight;
        contentArea.style.cssText = `position:absolute;width:100%;top:${virtualTop}px;`;


        for (let line = startLine; line <= endLine; line++) {
            const offset = line * hexEditor.bytesPerLine;
            if (offset < this.chunkedAdapter.fileSize) {
                const lineElement = await this.createGuaranteedDataLine(offset, hexEditor);
                contentArea.appendChild(lineElement);
            }
        }

        scrollContainer.appendChild(contentArea);
        container.appendChild(scrollContainer);


        const targetScrollTop = moveViewport ? virtualTop : scrollTop;
        this.isProgrammaticScroll = true;
        container.scrollTop = targetScrollTop;
        requestAnimationFrame(() => { this.isProgrammaticScroll = false; });


        container.onscroll = (e) => this.handleFixedScroll(e);

        container.setAttribute('tabindex', '0');
        if (document.activeElement !== container) {
            container.focus({ preventScroll: true });
        }

        this.currentRenderStart = startLine;
        this.currentRenderEnd   = endLine;
        this.currentScrollTop = targetScrollTop;
        this.currentVirtualHeight = virtualHeight;
        this.currentTotalLines = totalLines;

        const lineHeight = 25;
        const visibleLines = Math.max(20, Math.ceil((container.clientHeight || 600) / lineHeight));
        const maxScrollLines = Math.max(0, totalLines - visibleLines);
        hexEditor.visibleLines = visibleLines;
        hexEditor.maxScrollLines = maxScrollLines;
        hexEditor.currentScrollPercent = maxScrollLines > 0
            ? Math.max(0, Math.min(1, startLine / maxScrollLines))
            : 0;
    }

    async createGuaranteedDataLine(offset, hexEditor) {
        const bytesPerLine = hexEditor.bytesPerLine;
        const lineData = await this.chunkedAdapter.chunkedReader.getBytes(offset, bytesPerLine);

        const line = document.createElement('div');
        line.className = 'hex-line';
        line.style.cssText = `
            display: grid; grid-template-columns: 100px minmax(450px, 1fr) 420px;
            gap: 20px; padding: 4px 16px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        `;


        const offsetDiv = document.createElement('div');
        offsetDiv.textContent = offset.toString(16).toUpperCase().padStart(8, '0');
        offsetDiv.style.cssText = 'color:#ffd700;font-weight:bold;text-align:right;padding-right:8px;';
        line.appendChild(offsetDiv);


        const bytesDiv = document.createElement('div');
        bytesDiv.className = 'hex-bytes';
        bytesDiv.style.cssText = 'display:flex;gap:2px;flex-wrap:nowrap;';


        const asciiDiv = document.createElement('div');
        asciiDiv.className = 'hex-ascii';
        asciiDiv.style.cssText = `
            display:flex; letter-spacing:0.1px; padding-left:12px;
            border-left:2px solid rgba(129,199,132,0.3);
        `;

        for (let i = 0; i < bytesPerLine; i++) {
            const byteOffset = offset + i;

            if (i < lineData.length && byteOffset < this.chunkedAdapter.fileSize) {
                const byte = lineData[i];
                const isCursor = byteOffset === hexEditor.cursorPosition;
                const isSelected = byteOffset >= Math.min(hexEditor.selectionStart, hexEditor.selectionEnd) && 
                                   byteOffset <= Math.max(hexEditor.selectionStart, hexEditor.selectionEnd);
                const activePanel = hexEditor.activePanel || 'hex';


                const hexSpan = document.createElement('span');
                hexSpan.textContent = byte.toString(16).toUpperCase().padStart(2, '0');
                hexSpan.dataset.offset = byteOffset;
                hexSpan.dataset.panel = 'hex';
                if (isCursor && activePanel === 'hex') {
                    hexSpan.style.cssText = 'width:24px;text-align:center;padding:0 2px;border-radius:3px;cursor:pointer;flex-shrink:0;background:linear-gradient(135deg,#ff6b35,#f7931e);color:white;font-weight:bold;user-select:none;';
                } else if (isSelected) {
                    hexSpan.style.cssText = 'width:24px;text-align:center;padding:0 2px;border-radius:3px;cursor:pointer;flex-shrink:0;background:rgba(255,255,255,0.2);color:#fff;font-weight:bold;user-select:none;';
                } else {
                    hexSpan.className = 'hex-byte';
                    hexSpan.style.cssText = `
                        width:24px;text-align:center;padding:0 2px;border-radius:3px;
                        cursor:pointer;color:#4fc3f7;font-weight:500;flex-shrink:0;user-select:none;
                        font-family:inherit; font-size:inherit;
                    `;
                }
                

                if (hexEditor.getHighlightAt) {
                    const h = hexEditor.getHighlightAt(byteOffset);
                    if (h && !isSelected && !(isCursor && activePanel === 'hex')) {
                        hexSpan.style.background = h.color || 'rgba(0, 150, 255, 0.5)';
                        hexSpan.style.color = 'white';
                    }
                }

                hexSpan.addEventListener('click', (e) => {
                    e.stopPropagation();
                    hexEditor.cursorPosition = byteOffset;
                    if (e.shiftKey) {
                        hexEditor.selectionEnd = byteOffset;
                    } else {
                        hexEditor.selectionStart = byteOffset;
                        hexEditor.selectionEnd   = byteOffset;
                    }
                    hexEditor.activePanel    = 'hex';
                    hexEditor.updateStatus?.();
                    this.renderInPlace();
                });

                bytesDiv.appendChild(hexSpan);


                const char = (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '.';
                const asciiSpan = document.createElement('span');
                asciiSpan.textContent = char;
                asciiSpan.dataset.offset = byteOffset;
                asciiSpan.dataset.panel = 'ascii';
                if (isCursor && activePanel === 'ascii') {
                    asciiSpan.style.cssText = 'width:10px;text-align:center;cursor:pointer;border-radius:2px;background:linear-gradient(135deg,#ff6b35,#f7931e);color:white;font-weight:bold;user-select:none;';
                } else if (isSelected) {
                    asciiSpan.style.cssText = 'width:10px;text-align:center;cursor:pointer;border-radius:2px;background:rgba(255,255,255,0.2);color:#fff;font-weight:bold;user-select:none;';
                } else {
                    asciiSpan.style.cssText = 'width:10px;text-align:center;cursor:pointer;border-radius:2px;color:#81c784;user-select:none;';
                }
                

                if (hexEditor.getHighlightAt) {
                    const h = hexEditor.getHighlightAt(byteOffset);
                    if (h && !isSelected && !(isCursor && activePanel === 'ascii')) {
                        asciiSpan.style.background = h.color || 'rgba(0, 150, 255, 0.5)';
                        asciiSpan.style.color = 'white';
                    }
                }

                asciiSpan.addEventListener('click', (e) => {
                    e.stopPropagation();
                    hexEditor.cursorPosition = byteOffset;
                    if (e.shiftKey) {
                        hexEditor.selectionEnd = byteOffset;
                    } else {
                        hexEditor.selectionStart = byteOffset;
                        hexEditor.selectionEnd   = byteOffset;
                    }
                    hexEditor.activePanel    = 'ascii';
                    hexEditor.updateStatus?.();
                    this.renderInPlace();
                });

                asciiDiv.appendChild(asciiSpan);
            } else {

                const emptyHex = document.createElement('span');
                emptyHex.style.cssText = 'width:24px;visibility:hidden;';
                bytesDiv.appendChild(emptyHex);

                const emptyAscii = document.createElement('span');
                emptyAscii.style.cssText = 'width:10px;visibility:hidden;';
                asciiDiv.appendChild(emptyAscii);
            }
        }

        line.appendChild(bytesDiv);
        line.appendChild(asciiDiv);
        return line;
    }


    handleFixedScroll(event) {
        if (this.isProgrammaticScroll) return;

        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => {
            this.processScrollEvent(event);
        }, 80);
    }

    async processScrollEvent(event) {
        if (this.rendering) return;
        this.rendering = true;

        try {
            const container = event.target;
            const scrollTop    = container.scrollTop;
            const scrollHeight = container.scrollHeight;
            const clientHeight = container.clientHeight;
            if (scrollHeight <= clientHeight) return;


            this.currentScrollTop = scrollTop;

            const hexEditor   = this.chunkedAdapter.hexEditor;
            const totalLines  = this.currentTotalLines || Math.ceil(this.chunkedAdapter.fileSize / hexEditor.bytesPerLine);
            const virtualHeight = this.currentVirtualHeight || Math.min(totalLines * 25, 20000000);


            const unitsPerLine = virtualHeight / totalLines; // pixels por linha no virtual scroll
            const startLine = Math.max(0, Math.floor(scrollTop / unitsPerLine));
            const visibleLines = Math.max(20, Math.ceil(clientHeight / 25));
            const endLine = Math.min(totalLines - 1, startLine + visibleLines + 3);


            const topOffset = startLine * hexEditor.bytesPerLine;
            if (!hexEditor.activePanel) {
                hexEditor.cursorPosition = topOffset;
                hexEditor.updateStatus?.();
            } else {
                hexEditor.updateStatus?.();
            }


            await this._renderAtScrollTop(container, scrollTop, startLine, endLine, hexEditor, totalLines, virtualHeight, false);
        } finally {
            this.rendering = false;
        }
    }
}

