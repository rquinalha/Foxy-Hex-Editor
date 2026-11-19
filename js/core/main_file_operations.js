function documentDiskVersion(stat) {
    return { dev: stat.dev, ino: stat.ino, size: stat.size, mtimeMs: stat.mtimeMs, ctimeMs: stat.ctimeMs };
}

function sameDocumentDiskVersion(expected, actual) {
    return !!actual && Object.keys(expected).every(key => expected[key] === actual[key]);
}

Object.assign(FoxyHexEditorComplete.prototype, {
async loadFile(file, { preserveSearch = false } = {}) {
    if (!file) {
        return Promise.reject(new Error('No file provided'));
    }

    if (typeof require === 'undefined' || typeof process === 'undefined') {
        return Promise.reject(new Error('Hex Editor so funciona no Electron'));
    }

    const filePath = this.resolveLoadedFilePath(file);
    const fs = filePath ? require('node:fs').promises : null;
    const stat = fs ? await fs.stat(filePath) : null;
    const diskVersion = stat ? documentDiskVersion(stat) : null;
    if (stat && (!stat.isFile() || stat.size !== file.size ||
        (file.diskVersion && !sameDocumentDiskVersion(file.diskVersion, diskVersion)))) {
        throw new Error('O arquivo mudou no disco. Abra-o novamente.');
    }
    const useVirtual = !!filePath && this.shouldUseLargeFileMode(file);
    const arrayBuffer = useVirtual ? null : await this.readFileAsArrayBuffer(file);
    if (fs && !useVirtual && !sameDocumentDiskVersion(diskVersion, documentDiskVersion(await fs.stat(filePath)))) {
        throw new Error('O arquivo mudou durante a abertura.');
    }
    this.currentDiskVersion = diskVersion;

    this.clearAllState();
    this.resetCharacterTableStateForNewFile();
    this.exitVirtualDataMode?.();
    if (useVirtual) {
        const source = filePath
            ? { name: file.name, path: filePath, size: file.size, forceVirtual: file.forceVirtual, diskVersion }
            : file;
        const virtualData = await this.ensureLargeFileHandler().loadLargeFile(source, { preserveSearch });
        this.syncLoadedFileContext(file);
        return virtualData;
    }

    this.resetToCleanState();
    this.loadData(arrayBuffer);
    this.syncLoadedFileContext(file);
    const loadedData = this.getData();
    this.emit('fileLoad', { file, data: loadedData });
    return loadedData;
},

resolveLoadedFilePath(file) {
    if (!file) return null;

    // Em Electron, o objeto File (e caminhos passados manualmente) deve ter a propriedade 'path'
    if (file.path && typeof file.path === 'string') {
        return file.path;
    }
    if (typeof require !== 'undefined') {
        try {
            const electron = require('electron');
            const absolutePath = electron && electron.webUtils && typeof electron.webUtils.getPathForFile === 'function'
                ? electron.webUtils.getPathForFile(file)
                : null;
            if (absolutePath && typeof absolutePath === 'string') {
                return absolutePath;
            }
        } catch (_) {
        }
    }

    // Fallback para webkitRelativePath se disponível
    if (file.webkitRelativePath && typeof file.webkitRelativePath === 'string' && file.webkitRelativePath !== '') {
        return file.webkitRelativePath;
    }

    return null;
},

async readFileAsArrayBuffer(file) {
    if (!file) {
        throw new Error('No file provided');
    }

    if (typeof file.arrayBuffer === 'function') {
        return file.arrayBuffer();
    }

    if (file.path) {
        const bytes = await require('node:fs').promises.readFile(file.path);
        return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            this.currentFileReader = null;
            resolve(event.target?.result);
        };

        reader.onabort = () => reject(new Error('A leitura foi cancelada.'));
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
        // Enviar para o main process
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
if (window.intelligentSave) {
    window.intelligentSave.save();
    return this;
}

if (!this.hasUnsavedChanges) {
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
