class ChunkedHexEditorAdapter {
    constructor(hexEditor) {
        this.hexEditor = hexEditor;
        this.chunkedReader = null;
        this.originalData = null;
        this.fileSize = 0;
        this.renderer = null;
        
        this.init();
    }

    init() {
        this.renderer = new FixedChunkedRenderer(this);
        this.overrideHexEditorMethods();
    }

    shouldUseChunkedMode(file) {
        return !!(this.hexEditor && typeof this.hexEditor.shouldUseLargeFileMode === 'function'
            ? this.hexEditor.shouldUseLargeFileMode(file)
            : file && file.size > 800 * 1024 * 1024);
    }

    createVirtualProvider(virtualData) {
        const adapter = this;
        return {
            get length() {
                return adapter.fileSize;
            },
            isVirtual() {
                return true;
            },
            getByteSync(offset) {
                if (offset < 0 || offset >= adapter.fileSize) {
                    return undefined;
                }
                return virtualData[offset];
            },
            getRangeSync(offset, length) {
                const safeOffset = Math.max(0, Math.floor(Number(offset)));
                const safeLength = Math.max(0, Math.floor(Number(length)));
                const out = new Uint8Array(safeLength);
                for (let i = 0; i < safeLength; i++) {
                    const value = virtualData[safeOffset + i];
                    out[i] = value === undefined ? 0 : value;
                }
                return out;
            },
            async getRange(offset, length) {
                return adapter.chunkedReader.getBytes(offset, length);
            },
            setByteSync() {
                return false;
            },
            replaceRangeSync() {
                return false;
            },
            snapshot() {
                return { fileSize: adapter.fileSize, isVirtual: true };
            },
            restoreSnapshot() {}
        };
    }

    async loadFile(file) {

        if (file.size > 150 * 1024 * 1024 * 1024) {
            this.showLargeFileWarning(file);
            throw new Error('File too large (max 150GB)');
        }

        try {
            this.chunkedReader = new ChunkedFileReader(file);
            this.fileSize = file.size;
            
            const dataLoader = new FixedChunkedDataLoader();
            const virtualData = dataLoader.createWorkingDataProxy(this.chunkedReader, this.fileSize);
            
            if (this.renderer) {
                this.renderer.dataLoader = dataLoader;
            } else {
            }
            

            this.originalData = this.hexEditor.createDataSnapshot
                ? this.hexEditor.createDataSnapshot()
                : new Uint8Array(0);
            if (this.chunkedReader && this.hexEditor.attachVirtualDataProvider) {
                this.hexEditor.attachVirtualDataProvider(this.createVirtualProvider(virtualData), virtualData);
            }
            

            this.hexEditor.cursorPosition = 0;
            this.hexEditor.selectionStart = 0;
            this.hexEditor.selectionEnd = 0;
            this.hexEditor.clearHistory();
            this.hexEditor.clearSearch();
            this.hexEditor.bookmarks = [];
            this.hexEditor.modifiedBytes.clear();
            this.hexEditor.hasUnsavedChanges = false;
            

            if (typeof this.hexEditor.syncLoadedFileContext === 'function') {
                this.hexEditor.syncLoadedFileContext(file);
            } else {
                const currentFileEl = document.getElementById('current-file');
                if (currentFileEl) currentFileEl.textContent = file.name + ' (Fixed Chunked)';
            }
            

            await this.chunkedReader.getChunk(0);
            if (this.chunkedReader.totalChunks > 1) {
                await this.chunkedReader.getChunk(1);
            }
            
            await this.renderer.renderChunkedContentFixed();

            if (this._tabKeyHandler) {
                document.removeEventListener('keydown', this._tabKeyHandler);
            }
            this._tabKeyHandler = (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
                if (e.key === 'Tab') {
                    e.preventDefault();
                    this.hexEditor.activePanel = (this.hexEditor.activePanel === 'hex') ? 'ascii' : 'hex';
                    this.renderer.rendering = false;
                    clearTimeout(this.renderer.scrollTimeout);
                    setTimeout(() => this.renderer.renderInPlace(), 0);
                }
            };
            document.addEventListener('keydown', this._tabKeyHandler);

            
        } catch (error) {

            throw error;
        }
    }


    renderChunkedContent() {
        if (this.renderer) {
            return this.renderer.renderChunkedContentFixed();
        }
    }

    async goToOffset(offset) {
        if (offset < 0 || offset >= this.fileSize) {
            console.error(`❌ FIXED: Invalid offset: 0x${offset.toString(16)}`);
            return;
        }



        const chunkIndex = Math.floor(offset / this.chunkedReader.chunkSize);
        await this.chunkedReader.getChunk(chunkIndex);
        await this.chunkedReader.preloadAdjacentChunks(chunkIndex);

        this.setCursorAndRender(offset);
    }


    async setCursorAndRender(offset) {
        this.hexEditor.cursorPosition = offset;
        this.hexEditor.selectionStart = offset;
        this.hexEditor.selectionEnd   = offset;


        if (this.renderer && typeof this.renderer.renderInPlace === 'function') {
            await this.renderer.renderInPlace();
        } else {
            await this.renderChunkedContent();
        }
        this.hexEditor.updateStatus();
    }


    overrideHexEditorMethods() {
        const hexEditor = this.hexEditor;


        this.originalMethods = {
            loadFile: hexEditor.loadFile?.bind(hexEditor),
            renderHexContent: hexEditor.renderHexContent?.bind(hexEditor),
            createHexLine: hexEditor.createHexLine?.bind(hexEditor)
        };

        const originalLoadFile = hexEditor.loadFile?.bind(hexEditor);
        hexEditor.loadFile = (file) => {
            if (file.size > 150 * 1024 * 1024 * 1024) {
                this.showLargeFileWarning(file);
                this.showLargeFileWarning(file);
                return Promise.reject(new Error('File too large (max 150GB)'));
            }
            
            if (this.shouldUseChunkedMode(file) && file.size <= 150 * 1024 * 1024 * 1024) {
                return this.loadFile(file);
            } else {
                return originalLoadFile ? originalLoadFile(file) : Promise.resolve();
            }
        };

        hexEditor.renderHexContent = () => {
            if (this.chunkedReader && this.renderer) {
                return this.renderChunkedContent();
            } else {
                return this.originalMethods.renderHexContent ? this.originalMethods.renderHexContent() : null;
            }
        };

        const originalRender = hexEditor.render?.bind(hexEditor);
        hexEditor.render = () => {
            if (this.chunkedReader && this.renderer) {
                this.renderer.rendering = false;
                return this.renderer.renderInPlace();
            } else {
                return originalRender ? originalRender() : null;
            }
        };

        const originalCompleteRenderWithColors = hexEditor.completeRenderWithColors?.bind(hexEditor);
        hexEditor.completeRenderWithColors = (scrollPercent, force) => {
            if (this.chunkedReader && this.renderer) {
                this.renderer.rendering = false;
                if (typeof scrollPercent === 'number' && Number.isFinite(scrollPercent) &&
                    typeof this.renderer.renderAtPercent === 'function') {
                    return this.renderer.renderAtPercent(scrollPercent);
                }
                return this.renderer.renderInPlace();
            } else {
                return originalCompleteRenderWithColors ? originalCompleteRenderWithColors(scrollPercent, force) : null;
            }
        };
    }

    showLargeFileWarning(file) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
        const fileSizeGB = (file.size / (1024 * 1024 * 1024)).toFixed(2);
        
        const overlay = document.createElement('div');
        overlay.className = 'notification-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(5px);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        `;
        
        const modal = document.createElement('div');
        modal.className = 'notification-modal';
        modal.style.cssText = `
            background: linear-gradient(135deg, rgba(26, 26, 46, 0.95) 0%, rgba(22, 33, 62, 0.95) 100%);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            padding: 0;
            min-width: 450px;
            max-width: 600px;
            max-height: 80vh;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(15px);
            transform: scale(0.8) translateY(20px);
            transition: all 0.3s ease;
            font-family: 'Segoe UI', system-ui, sans-serif;
        `;
        
        modal.innerHTML = `
            <div class="notification-header" style="padding: 20px 24px 16px 24px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); display: flex; align-items: center; gap: 12px;">
                <div class="notification-icon error" style="font-size: 24px; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: linear-gradient(135deg, rgba(244, 67, 54, 0.2) 0%, rgba(244, 67, 54, 0.1) 100%); color: #F44336; border: 1px solid rgba(244, 67, 54, 0.3);">
                    ⚠️
                </div>
                <h3 class="notification-title" style="color: white; font-size: 18px; font-weight: 600; margin: 0; flex: 1;">
                    Arquivo Muito Grande
                </h3>
                <button class="notification-close" onclick="this.closest('.notification-overlay').remove()" style="background: none; border: none; color: rgba(255, 255, 255, 0.6); font-size: 20px; cursor: pointer; padding: 8px; border-radius: 6px; transition: all 0.2s ease; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
                    ×
                </button>
            </div>
            
            <div class="notification-content" style="padding: 20px 24px; color: rgba(255, 255, 255, 0.9); font-size: 14px; line-height: 1.6;">
                <p><strong>Nome do arquivo:</strong> ${file.name}</p>
                <p><strong>Tamanho:</strong> ${fileSizeMB} MB (${fileSizeGB} GB)</p>
                <p><strong>Limite máximo:</strong> 150 GB</p>
                
                <div style="margin: 16px 0; padding: 12px; background: rgba(244, 67, 54, 0.1); border: 1px solid rgba(244, 67, 54, 0.3); border-radius: 6px;">
                    <p style="margin: 0; color: #F44336; font-weight: 500;">
                        ⚠️ Este arquivo é muito grande para ser aberto no editor.
                    </p>
                </div>
                
                <p style="margin-top: 16px; font-size: 13px; color: rgba(255, 255, 255, 0.7);">
                    <strong>Razões para o limite:</strong>
                </p>
                <ul style="margin: 8px 0; padding-left: 20px; color: rgba(255, 255, 255, 0.7); font-size: 13px;">
                    <li>Performance do navegador</li>
                    <li>Uso excessivo de memória RAM</li>
                    <li>Risco de travamento do sistema</li>
                    <li>Experiência de usuário comprometida</li>
                </ul>
                
                <p style="margin-top: 16px; font-size: 13px; color: rgba(255, 255, 255, 0.7);">
                    <strong>Sugestões:</strong>
                </p>
                <ul style="margin: 8px 0; padding-left: 20px; color: rgba(255, 255, 255, 0.7); font-size: 13px;">
                    <li>Use um hex editor especializado para arquivos grandes</li>
                    <li>Divida o arquivo em partes menores</li>
                    <li>Analise apenas seções específicas do arquivo</li>
                </ul>
            </div>
            
            <div class="notification-actions" style="padding: 16px 24px 20px 24px; border-top: 1px solid rgba(255, 255, 255, 0.1); display: flex; gap: 12px; justify-content: flex-end;">
                <button onclick="this.closest('.notification-overlay').remove()" style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); color: rgba(255, 255, 255, 0.8); padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; transition: all 0.2s ease;">
                    Entendi
                </button>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        setTimeout(() => {
            overlay.style.opacity = '1';
            overlay.style.visibility = 'visible';
            modal.style.transform = 'scale(1) translateY(0)';
        }, 10);
        
        const handleKeyPress = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', handleKeyPress);
            }
        };
        document.addEventListener('keydown', handleKeyPress);
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
    }

    getStats() {
        if (!this.chunkedReader) return null;

        return {
            fileSize: this.fileSize,
            chunkSize: this.chunkedReader.chunkSize,
            totalChunks: this.chunkedReader.totalChunks,
            cachedChunks: this.chunkedReader.chunkCache.size,
            loadingChunks: this.chunkedReader.loadingPromises.size,
            ...this.chunkedReader.getCacheStats()
        };
    }
}


function createLargeFileGoToDialog() {
    return function() {
        if (!window.chunkedAdapter || !window.chunkedAdapter.chunkedReader) {
            if (window.hexEditor && window.hexEditor.showGoToDialog) {
                window.hexEditor.showGoToDialog();
            }
            return;
        }

        const maxOffset = window.chunkedAdapter.fileSize - 1;
        
        const input = prompt(
            `🚀 Large File Navigation:\n\n` +
            `File size: ${window.chunkedAdapter.fileSize.toLocaleString()} bytes\n` +
            `Max offset: 0x${maxOffset.toString(16).toUpperCase()}\n\n` +
            `Enter hex offset:`, 
            ''
        );
        
        if (input) {
            try {
                const cleanInput = input.trim().replace(/^0x/i, '');
                const offset = parseInt(cleanInput, 16);
                if (!isNaN(offset) && offset >= 0 && offset < window.chunkedAdapter.fileSize) {
                    window.chunkedAdapter.goToOffset(offset);
                } else {
                    alert(`❌ Invalid offset. Valid range: 0x00000000 - 0x${maxOffset.toString(16).toUpperCase()}`);
                }
            } catch (error) {
                alert(`❌ Invalid offset: ${error.message}`);
            }
        }
    };
}

function initializeLargeFileSystem(hexEditor) {
    if (!hexEditor) {
        console.error('❌ HexEditor instance required for large file system');
        return null;
    }


    const chunkedAdapter = new ChunkedHexEditorAdapter(hexEditor);
    

    window.showGoToDialog = createLargeFileGoToDialog();
    

    
    return chunkedAdapter;
}

if (typeof window !== 'undefined') {
    window.ChunkedFileReader = ChunkedFileReader;
    window.FixedChunkedDataLoader = FixedChunkedDataLoader;
    window.FixedChunkedRenderer = FixedChunkedRenderer;
    window.ChunkedHexEditorAdapter = ChunkedHexEditorAdapter;
    window.initializeLargeFileSystem = initializeLargeFileSystem;
    

}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ChunkedFileReader,
        FixedChunkedDataLoader,
        FixedChunkedRenderer,
        ChunkedHexEditorAdapter,
        initializeLargeFileSystem
    };
}
