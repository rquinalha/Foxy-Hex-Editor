const POST_KEYBOARD_SHORTCUTS = {
'Ctrl+O': 'Open file',
'Ctrl+S': 'Save file',
'Ctrl+Z': 'Undo',
'Ctrl+Y': 'Redo',
'Ctrl+F': 'Focus search',
'Ctrl+G': 'Go to offset',
'Ctrl+B': 'Add bookmark',
'F2': 'Toggle edit mode',
'F3': 'Find next',
'Shift+F3': 'Find previous',
'Insert': 'Toggle insert/overwrite mode',
'Tab': 'Switch hex/ASCII panel',
'Arrows': 'Navigate cursor',
'Page Up/Down': 'Navigate by page',
'Home/End': 'Navigate to line start/end',
'Escape': 'Fechar modais'
};

const POST_DEBUG_HOSTS = new Set(['localhost', '127.0.0.1']);

function getHexEditor() {
return window.hexEditor;
}

function withHexEditor(action) {
if (typeof getHexEditor !== 'function') {
    return null;
}

const hexEditor = getHexEditor();
return hexEditor ? action(hexEditor) : null;
}

function toArrayBuffer(fileData) {
if (fileData instanceof ArrayBuffer) {
    return fileData;
}

if (fileData instanceof Uint8Array) {
    return fileData.buffer.slice(fileData.byteOffset, fileData.byteOffset + fileData.byteLength);
}

if (Array.isArray(fileData)) {
    return new Uint8Array(fileData).buffer;
}

throw new Error('Unsupported data format');
}

function syncSaveSystems(hexEditor, filePath, fileName) {
if (window.SimpleSaveProtection && window.SimpleSaveProtection.getInstance()) {
    window.SimpleSaveProtection.getInstance().setCurrentFile(filePath, fileName);
}

if (window.intelligentSave) {
    window.intelligentSave.setCurrentFile(filePath || hexEditor.currentFilePath, fileName);
}
}

function finalizeLoadedFile(hexEditor) {
setTimeout(() => {
    hexEditor.forceCompleteRender();
    setTimeout(() => {
        hexEditor.loadHighlightsFromFile();
        hexEditor.updateHighlightsButtonState();
    }, 200);
}, 10);
}

function createEditorMethodProxy(methodName) {
return () => withHexEditor((hexEditor) => hexEditor[methodName]());
}

function openFile() {
const input = document.getElementById('file-input');
if (input) {
    input.multiple = true;
    input.click();
} else {
    const newInput = document.createElement('input');
    newInput.type = 'file';
    newInput.accept = '.nes,.smc,.gb,.gba,.bin,.*';
    newInput.multiple = true;
    newInput.onchange = (e) => {
        if (e.target.files.length > 0) {
            if (window.fileTabManager?.openFiles) {
                window.fileTabManager.openFiles(Array.from(e.target.files));
            } else {
                window.hexEditor?.loadFile(e.target.files[0]);
            }
        }
    };
    newInput.click();
}
}

function saveFile() {
if (window.intelligentSave) {
    window.intelligentSave.save();
} else if (window.hexEditor && typeof window.hexEditor.save === 'function' && window.hexEditor.hasUnsavedChanges) {
    window.hexEditor.save();
} else if (!window.intelligentSave && !(window.hexEditor && typeof window.hexEditor.save === 'function')) {
    console.error('❌ Sistema de salvamento não disponível');
}
}


function switchSidebarTab(tabName) {
if (window.hexEditor && typeof window.hexEditor.switchSidebarTab === 'function') {
    window.hexEditor.switchSidebarTab(tabName);
} else {
    document.querySelectorAll('.sidebar-tab').forEach((tab) => tab.classList.remove('active'));
    event.target.classList.add('active');
    document.querySelectorAll('.sidebar .tab-content').forEach((content) => {
        content.style.display = 'none';
    });
    const targetTab = document.getElementById(`${tabName}-tab`);
    if (targetTab) {
        targetTab.style.display = 'block';
    }
}
}

function analyzeROM() {
if (window.hexEditor && typeof window.hexEditor.analyzeROM === 'function') {
    window.hexEditor.analyzeROM();
}
}

function debugHexEditor() {
if (window.hexEditor) {
    return window.hexEditor.logStatus();
}
return null;
}

const PerformanceMonitor = {
startTime: Date.now(),
operations: [],
trackOperation(name, duration) {
    this.operations.push({ name, duration, timestamp: Date.now() });
    if (this.operations.length > 100) {
        this.operations.shift();
    }
},
getStats() {
    const totalOps = this.operations.length;
    const avgDuration = totalOps > 0
        ? this.operations.reduce((sum, op) => sum + op.duration, 0) / totalOps
        : 0;

    return {
        totalOperations: totalOps,
        averageDuration: `${avgDuration.toFixed(2)}ms`,
        uptime: `${((Date.now() - this.startTime) / 1000).toFixed(1)}s`
    };
}
};

Object.assign(FoxyHexEditorComplete.prototype, {
_originalRender: FoxyHexEditorComplete.prototype.render,
render() {
    const start = performance.now();
    this._originalRender();
    const duration = performance.now() - start;
    PerformanceMonitor.trackOperation('render', duration);
},
getPerformanceStats() {
    return PerformanceMonitor.getStats();
}
});

const KeyboardShortcuts = {
shortcuts: POST_KEYBOARD_SHORTCUTS,
show() {
    const shortcuts = Object.entries(this.shortcuts)
        .map(([key, desc]) => `${key}: ${desc}`)
        .join('\n');

    window.notificationSystem.info(`🎮 Atalhos de Teclado:\n\n${shortcuts}`, 'Atalhos de Teclado');
}
};

window.showKeyboardShortcuts = () => KeyboardShortcuts.show();

const CMSIntegration = {
embedInWordPress(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error('Container not found:', containerId);
        return;
    }

    container.innerHTML = `
        <div style="border: 2px solid #ff6b35; border-radius: 8px; padding: 20px; background: #f9f9f9;">
            <h3 style="color: #ff6b35; margin-bottom: 15px;"><img src="../assets/foxy.png" alt="Foxy" style="width: 24px; height: 24px; vertical-align: middle; margin-right: 8px;"> Foxy Hex Editor</h3>
            <button onclick="window.FoxyHexEditor.open()" style="background: #ff6b35; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                Open Hex Editor
            </button>
            <p style="margin-top: 10px; font-size: 14px; color: #666;">
                Click to open the full-featured hex editor for binary file analysis.
            </p>
        </div>
    `;
},
createShortcode() {
    return '[foxy_hex_editor]';
}
};

window.addEventListener('error', (event) => {
if (event.error && event.error.message && event.error.message.includes('FoxyHex') && window.hexEditor) {
    console.error('🦊 Foxy Hex Editor Error:', event.error);
    try {
        window.hexEditor.render();
    } catch (error) {
        console.error('❌ Recovery failed:', error);
    }
}
});

const BrowserCompatibility = {
check() {
    const features = {
        arrayBuffer: !!window.ArrayBuffer,
        uint8Array: !!window.Uint8Array,
        fileReader: !!window.FileReader,
        blob: !!window.Blob,
        url: !!window.URL
    };

    const unsupported = Object.entries(features)
        .filter(([, supported]) => !supported)
        .map(([feature]) => feature);

    if (unsupported.length > 0) {
        return false;
    }

    return true;
}
};

BrowserCompatibility.check();

if (typeof module !== 'undefined' && module.exports) {
module.exports = FoxyHexEditorComplete;
} else if (typeof define === 'function' && define.amd) {
define([], () => FoxyHexEditorComplete);
}

window.loadFileFromData = function(fileData, fileName, filePath = null) {
return withHexEditor((hexEditor) => {
    try {
        if (hexEditor.currentFileName === fileName) {
            hexEditor.clearAllState();
            setTimeout(() => loadFileDataInternal(hexEditor, fileData, fileName, filePath), 50);
        } else {
            loadFileDataInternal(hexEditor, fileData, fileName, filePath);
        }

        return true;
    } catch (error) {
        console.error('❌ [GLOBAL] Error loading file:', error);
        return false;
    }
}) ?? false;
};

function loadFileDataInternal(hexEditor, fileData, fileName, filePath) {
const dataToLoad = toArrayBuffer(fileData);

hexEditor.resetToCleanState();
hexEditor.loadData(dataToLoad);
hexEditor.currentFileName = fileName || 'edited_file';
hexEditor.currentFileExtension = hexEditor.getFileExtension(fileName);

if (filePath) {
    hexEditor.currentFilePath = filePath;
}

const fileDisplay = document.getElementById('current-file');
if (fileDisplay) {
    fileDisplay.textContent = fileName || 'File loaded from Foxy Editor';
}

    syncSaveSystems(hexEditor, filePath, fileName);
    
    // Notificar main process para adicionar à lista de arquivos recentes
    if (typeof require !== 'undefined' && filePath) {
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('add-recent-file', filePath);
    }
    
    finalizeLoadedFile(hexEditor);
}

window.isHexEditorReady = () => typeof getHexEditor === 'function' && getHexEditor() !== null;
window.nav = (percent) => withHexEditor((hexEditor) => hexEditor.nav(percent));
window.nav0 = () => window.nav(0);
window.nav25 = () => window.nav(25);
window.nav50 = () => window.nav(50);
window.nav75 = () => window.nav(75);
window.nav100 = () => window.nav(100);
window.getSelection = () => withHexEditor((hexEditor) => {
const start = Math.min(hexEditor.selectionStart, hexEditor.selectionEnd);
const end = Math.max(hexEditor.selectionStart, hexEditor.selectionEnd);
return {
    start: `0x${start.toString(16)}`,
    end: `0x${end.toString(16)}`,
    size: end - start + 1,
    panel: hexEditor.activePanel
};
});
window.getCurrentPos = () => withHexEditor((hexEditor) => `0x${hexEditor.cursorPosition.toString(16)}`);
window.testColors = createEditorMethodProxy('testColors');
window.testTabWorking = createEditorMethodProxy('testTabWorking');
window.testScrollToEnd = createEditorMethodProxy('testScrollToEnd');

if (POST_DEBUG_HOSTS.has(window.location.hostname)) {
window.FoxyDebug = {
    editor: () => window.hexEditor,
    performance: () => PerformanceMonitor.getStats(),
    shortcuts: () => KeyboardShortcuts.show(),
    compatibility: () => BrowserCompatibility.check(),
    version: '1.3.5-complete-advanced'
};
}

Object.assign(FoxyHexEditorComplete.prototype, {
showTips() {
    const currentLanguage = this.getCurrentLanguage();
    const isEnglish = currentLanguage === 'en';
    const tipsSystem = isEnglish ? window.foxyDicasEn : window.foxyDicas;
    const missingMessage = isEnglish
        ? 'Sistema de dicas em inglês não encontrado!'
        : 'Sistema de dicas não encontrado!';

    if (tipsSystem) {
        tipsSystem.abrir();
        return;
    }

    console.error(`❌ ${missingMessage}`);
    if (window.notificationSystem) {
        window.notificationSystem.error(missingMessage, 'Erro');
    } else {
        alert(missingMessage);
    }
},
getCurrentLanguage() {
    if (window.I18n && window.I18n.currentLang) {
        return window.I18n.currentLang;
    }

    try {
        return localStorage.getItem('foxy-lang') || localStorage.getItem('foxy_language') || 'pt';
    } catch (e) {
        return 'pt';
    }
},
handleFileDrop(event) {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        if (window.fileTabManager && typeof window.fileTabManager.openFiles === 'function') {
            window.fileTabManager.openFiles(Array.from(files)).catch((error) => {
                window.notificationSystem.error('Erro ao carregar arquivo: ' + error.message, 'Erro de Carregamento');
            });
        } else {
            this.loadFile(files[0]).catch((error) => {
                window.notificationSystem.error('Erro ao carregar arquivo: ' + error.message, 'Erro de Carregamento');
            });
        }
    }
},
switchSidebarTab(tabName) {
    document.querySelectorAll('.sidebar-tab').forEach((tab) => {
        tab.classList.remove('active');
    });

    const activeTab = Array.from(document.querySelectorAll('.sidebar-tab'))
        .find((tab) => tab.onclick && tab.onclick.toString().includes(tabName));
    if (activeTab) {
        activeTab.classList.add('active');
    }

    document.querySelectorAll('.sidebar .tab-content').forEach((content) => {
        content.style.display = 'none';
    });

    const targetTab = document.getElementById(`${tabName}-tab`);
    if (targetTab) {
        targetTab.style.display = 'block';
    }
},
bytesToHexString(bytes, separator = ' ') {
    return Array.from(bytes)
        .map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
        .join(separator);
},
hexStringToBytes(hexString) {
    const cleanHex = hexString.replace(/\s+/g, '');
    const bytes = [];

    for (let i = 0; i < cleanHex.length; i += 2) {
        const byte = parseInt(cleanHex.substr(i, 2), 16);
        if (!isNaN(byte)) {
            bytes.push(byte);
        }
    }

    return new Uint8Array(bytes);
},
testLargeFileWarning() {
    const mockFile = {
        name: 'arquivo_teste_grande.bin',
        size: 2 * 1024 * 1024 * 1024,
        type: 'application/octet-stream'
    };

    return mockFile;
},
testLargeFileLoading() {
    const mockFile = {
        name: 'arquivo_teste_grande.bin',
        size: 2 * 1024 * 1024 * 1024,
        type: 'application/octet-stream'
    };

    this.loadFile(mockFile).catch(() => {});
},
getDebugInfo() {
    return {
    dataLength: this.getDataLength(),
        cursorPosition: this.cursorPosition,
        editMode: this.editMode,
        activePanel: this.activePanel,
        searchResults: this.searchResults.length,
        bookmarks: this.bookmarks.length,
        historyLength: this.history.length,
        hasUnsavedChanges: this.hasUnsavedChanges,
        modifiedBytes: this.modifiedBytes.size,
        currentCharTable: this.currentCharTable,
        format: this.gameAnalysis.format || 'Desconhecido'
    };
},
logStatus() {
    const info = this.getDebugInfo();
    console.table(info);
    return info;
}
});

