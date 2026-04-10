document.addEventListener('DOMContentLoaded', function() {
window.hexEditor = new FoxyHexEditorComplete();
window.fileTabManager = new window.FileTabSessionManager(window.hexEditor);

function enable16bitIntegration(hexEditorInstance) {
const originalSetCharTable = hexEditorInstance.setCharTable.bind(hexEditorInstance);

hexEditorInstance.setCharTable = function(tableIdOrObject) {
    let success = false;

    if (typeof tableIdOrObject === 'object' && (tableIdOrObject.type === "16-bit" || tableIdOrObject.type === "UTF-16")) {
        this.selectedCharTable = tableIdOrObject;
        this.charTables.custom16bit = tableIdOrObject;
        this.currentCharTable = 'custom16bit';
        this.charDecoder16 = new CharDecoder16bit(tableIdOrObject);
        this.updateCharGrid({ force: true });
        this.updateTableDisplay();
        this.render();
        success = true;
    } else {
        this.selectedCharTable = null;
        success = originalSetCharTable(tableIdOrObject);
        this.getActive16BitDecoder();
    }

    return success;
};
}

function bindFileInput() {
const fileInput = document.getElementById('file-input');
if (!fileInput) {
    return;
}

fileInput.multiple = true;
fileInput.onchange = null;
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length === 0) {
        return;
    }

    const files = Array.from(e.target.files);
    e.target.value = '';

    setTimeout(() => {
        if (window.fileTabManager && typeof window.fileTabManager.openFiles === 'function') {
            window.fileTabManager.openFiles(files).catch((error) => {
                console.error('[INPUT] Erro ao carregar arquivo:', error);
                if (window.notificationSystem) {
                    window.notificationSystem.error('Erro ao carregar arquivo: ' + error.message, 'Erro de Carregamento');
                } else {
                    alert('Erro ao carregar arquivo: ' + error.message);
                }
            });
        } else if (window.hexEditor && typeof window.hexEditor.loadFile === 'function') {
            window.hexEditor.loadFile(files[0]).catch((error) => {
                console.error('[INPUT] Erro ao carregar arquivo:', error);
                if (window.notificationSystem) {
                    window.notificationSystem.error('Erro ao carregar arquivo: ' + error.message, 'Erro de Carregamento');
                } else {
                    alert('Erro ao carregar arquivo: ' + error.message);
                }
            });
        } else {
            console.error('[INPUT] Hex editor nao esta pronto');
            if (window.notificationSystem) {
                window.notificationSystem.error('Editor hex nao esta pronto. Tente novamente.', 'Editor Nao Pronto');
            } else {
                alert('Editor hex nao esta pronto. Tente novamente.');
            }
        }
    }, 100);
});
}

enable16bitIntegration(window.hexEditor);

window.FoxyHexEditor = {
getInstance: () => window.hexEditor,
open: () => {
    if (window.hexEditor) {
        window.hexEditor.render();
        return window.hexEditor;
    }
    return null;
},
loadFile: (file) => {
    if (window.fileTabManager && file) {
        return window.fileTabManager.openFiles([file]);
    }
    if (window.hexEditor && file) {
        return window.hexEditor.loadFile(file);
    }
    return Promise.reject(new Error('No editor or file'));
},
loadData: (data) => {
    if (window.hexEditor) {
        return window.hexEditor.loadData(data);
    }
    return null;
},
on: (event, callback) => {
    if (window.hexEditor) {
        return window.hexEditor.on(event, callback);
    }
    return null;
},
version: '1.3.5',
build: 'Complete Edition'
};

setTimeout(() => {
    if (window.hexEditor) {
        window.hexEditor.focusEditor();
    }
}, 100);

setTimeout(() => {
    if (window.hexEditor && typeof window.hexEditor.loadColorConfig === 'function') {
        window.hexEditor.loadColorConfig();
        if (typeof window.hexEditor.applyEditorFontSettings === 'function') {
            window.hexEditor.applyEditorFontSettings();
        }
        window.hexEditor.applyHexColors();
        window.hexEditor.applyTextColors();
    }
}, 300);

bindFileInput();
});
