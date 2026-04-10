Object.assign(FoxyHexEditorComplete.prototype, {
async loadFile(file) {
    if (!file) {
        return Promise.reject(new Error('No file provided'));
    }

    if (typeof require === 'undefined' || typeof process === 'undefined') {
        return Promise.reject(new Error('Hex Editor so funciona no Electron'));
    }

    const previousFileName = this.currentFileName;
    const resolvedFilePath = this.resolveLoadedFilePath(file);

    this.currentFileName = file.name;
    this.currentFilePath = resolvedFilePath;

    this.clearAllState();
    this.resetCharacterTableStateForNewFile();

    this.exitVirtualDataMode?.();

    const isSameFile = previousFileName === file.name;
    if (isSameFile) {
        this.forceFileReload = true;
    }

    if (file.size === 0) {
        console.error('File is empty');
        return Promise.reject(new Error('O arquivo esta vazio. Por favor, selecione um arquivo valido.'));
    }

    if (this.shouldUseLargeFileMode(file)) {
        const handler = this.ensureLargeFileHandler?.();

        return handler.loadLargeFile(file).then((virtualData) => {
            this.syncLoadedFileContext(file);
            return virtualData;
        });
    }

    const arrayBuffer = await this.readFileAsArrayBuffer(file);
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('FileReader returned empty result');
    }

    return new Promise((resolve, reject) => {
        if (this.loadingTimeout) {
            clearTimeout(this.loadingTimeout);
        }

        this.loadingTimeout = setTimeout(() => {
            this.loadingTimeout = null;

            try {
                this.resetToCleanState();
                this.loadData(arrayBuffer);
                this.syncLoadedFileContext(file);

                const loadedData = this.getData();
                this.emit('fileLoad', { file, data: loadedData });
                resolve(loadedData);
            } catch (error) {
                console.error('[HEX] Erro ao processar arquivo:', error);
                reject(error);
            }
        }, isSameFile ? 100 : 0);
    });
},

resolveLoadedFilePath(file) {
    if (file?.path) {
        return file.path;
    }

    if (file?.webkitRelativePath) {
        return file.webkitRelativePath;
    }

    return file?.name || null;
},

async readFileAsArrayBuffer(file) {
    if (!file) {
        throw new Error('No file provided');
    }

    if (typeof file.arrayBuffer === 'function') {
        return file.arrayBuffer();
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            this.currentFileReader = null;
            resolve(event.target?.result);
        };

        reader.onerror = () => {
            console.error('[HEX] Erro ao ler arquivo:', reader.error);
            this.currentFileReader = null;
            reject(reader.error || new Error('Erro desconhecido ao ler arquivo'));
        };

        if (this.currentFileReader) {
            this.currentFileReader.abort();
            this.currentFileReader = null;
        }

        this.currentFileReader = reader;
        reader.readAsArrayBuffer(file);
    });
},

syncLoadedFileContext(file) {
    const filePath = this.resolveLoadedFilePath(file);
    const currentFileEl = document.getElementById('current-file');

    this.currentFileName = file.name;
    this.currentFileExtension = this.getFileExtension(file.name);
    this.currentFilePath = filePath;

    if (currentFileEl) {
        currentFileEl.textContent = file.name;
    }

    if (window.SimpleSaveProtection && window.SimpleSaveProtection.getInstance()) {
        const saveProtection = window.SimpleSaveProtection.getInstance();
        saveProtection.setCurrentFile(filePath, file.name);
    }

    if (window.intelligentSave) {
        window.intelligentSave.setCurrentFile(filePath, file.name);
    }

    if (window.electronFileHandler) {
        window.electronFileHandler.currentFile = {
            name: file.name,
            size: this.getDataLength ? this.getDataLength() : file.size,
            path: filePath || null
        };
    }

    if (typeof require !== 'undefined' && filePath) {
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('add-recent-file', filePath);
    }
},

resetCharacterTableStateForNewFile() {
    this.currentCharTable = 'ascii';
    this.selectedCharTable = null;
    this.charDecoder16 = null;

    const select = document.getElementById('char-table-select');
    if (select) {
        select.value = 'ascii';
    }

    this.clearCharGrid?.();
    this.updateTableDisplay?.();
},

clearAllState() {
    if (this.renderRequestId) {
        cancelAnimationFrame(this.renderRequestId);
        this.renderRequestId = null;
    }

    if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
    if (this.cursorVisibleTimeout) clearTimeout(this.cursorVisibleTimeout);
    if (this.loadingTimeout) clearTimeout(this.loadingTimeout);

    if (this.currentFileReader) {
        this.currentFileReader.abort();
        this.currentFileReader = null;
    }

    this.isSelecting = false;
    this.isUserScrolling = false;
    this.isDraggingThumb = false;
    this.editingBytes.clear();
    this.modifiedBytes.clear();
    this.forceFileReload = false;
},

resetToCleanState() {
    this.cursorPosition = 0;
    this.selectionStart = 0;
    this.selectionEnd = 0;
    this.currentScrollPercent = 0;
    this.activePanel = 'hex';
    this.nibblePosition = 0;

    this.modifiedBytes.clear();
    this.editingBytes.clear();
    this.searchResults = [];
    this.searchResultsSet = new Set();
    this.currentSearchIndex = -1;
    this.lastSearchTerm = '';
    
    this.bookmarks = [];
    this.bookmarksSet = new Set();
    this.highlights.clear();
    this.highlightsMap = new Map();
    this.highlightIdCounter = 0;

    this.hasUnsavedChanges = false;
    this.isSelecting = false;
    this.isUserScrolling = false;
    this.history = [];
    this.historyIndex = -1;
},

forceCompleteRender() {
    const container = document.getElementById('hex-content');
    if (container) {
        container.innerHTML = '';
        container.scrollTop = 0;
    }

    this.initializeAdvancedScrolling();
    this.completeRenderWithColors(0, false);
    this.updateStatus();
    this.updateStats();
    this.updateButtons();
    this.updateModeUI();
    this.updateBookmarksList();
    this.updateBookmarkSidebarButtons();

    setTimeout(() => {
        this.focusEditor();
    }, 100);
},

save() {
if (this.getDataLength() === 0) {
window.notificationSystem.warning('Nenhum dado para salvar. Por favor, carregue um arquivo primeiro.', 'Nenhum Dado');
return this;
}

if (!this.hasUnsavedChanges) {
return this;
}

if (window.intelligentSave) {
    window.intelligentSave.save();
    return this;
}

const blob = new Blob([this.getData()], { type: 'application/octet-stream' });
const url = URL.createObjectURL(blob);
const tempLink = document.createElement('a');
tempLink.style.display = 'none';
tempLink.href = url;
tempLink.download = this.currentFileName || 'arquivo_editado.bin';
document.body.appendChild(tempLink);
tempLink.click();
document.body.removeChild(tempLink);
URL.revokeObjectURL(url);
this.originalData = new Uint8Array(this.getData());
this.hasUnsavedChanges = false;
this.modifiedBytes.clear();
this.updateButtons();
this.render();
this.emit('save', this.getData());
return this;
},



importData() {
    if (typeof require !== 'undefined' && typeof process !== 'undefined') {
        const { ipcRenderer } = require('electron');

        ipcRenderer.invoke('show-open-dialog', {
            title: 'Importar Dados',
            filters: [
                { name: 'Dados (.json)', extensions: ['json'] },
            ]
        }).then(result => {
            if (!result.canceled && result.filePaths.length > 0) {
                const filePath = result.filePaths[0];
                const fs = require('fs');
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    const importData = JSON.parse(content);

                    if (importData.data && Array.isArray(importData.data)) {
                        this.loadData(new Uint8Array(importData.data));

                        if (importData.bookmarks) {
                            this.setBookmarks(importData.bookmarks);
                        }

                        if (importData.charTable && this.charTables[importData.charTable]) {
                            this.setCharTable(importData.charTable);
                        }

                        if (window.notificationSystem) {
                            window.notificationSystem.success('Dados importados com sucesso!', 'Importacao Concluida');
                        }
                    } else {
                        throw new Error('Formato de dados invalido');
                    }
                } catch (error) {
                    window.notificationSystem.error('Erro ao importar dados: ' + error.message, 'Erro de Importacao');
                }
            }
        }).catch(error => {
            window.notificationSystem.error('Erro ao abrir dialogo: ' + error.message, 'Erro de Dialogo');
        });
    } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importData = JSON.parse(e.target.result);

                    if (importData.data && Array.isArray(importData.data)) {
                        this.loadData(new Uint8Array(importData.data));

                        if (importData.bookmarks) {
                            this.setBookmarks(importData.bookmarks);
                        }

                        if (importData.charTable && this.charTables[importData.charTable]) {
                            this.setCharTable(importData.charTable);
                        }
                    } else {
                        throw new Error('Invalid export format');
                    }
                } catch (error) {
                    window.notificationSystem.error('Erro ao importar dados: ' + error.message, 'Erro de Importacao');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }
}
});
