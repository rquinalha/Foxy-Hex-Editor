const { ipcRenderer } = require('electron');

let selectionData = null;
let selectedFile = null;
let fileArrayBuffer = null;

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileInfo = document.getElementById('file-info');
const fileDetails = document.getElementById('file-details');
const importWarning = document.getElementById('import-warning');
const warningMsg = document.getElementById('warning-message');
const importBtn = document.getElementById('import-btn');
const cancelBtn = document.getElementById('cancel-btn');
const insertMode = document.getElementById('insertion-mode');

const i18n = {
    pt: {
        headerTitle: 'Importar Selecao',
        selInfo: 'Informacoes da Selecao',
        selSize: 'Tamanho da selecao:',
        selStart: 'Posicao inicial:',
        selEnd: 'Posicao final:',
        selectFile: 'Selecionar Arquivo para Importar',
        clickSelect: 'Clique para selecionar arquivo',
        dragDrop: 'ou arraste e solte aqui',
        fileInfo: 'Informacoes do Arquivo',
        warning: 'Aviso',
        insertMode: 'Modo Insercao (empurrar dados existentes)',
        insertHint: 'Se marcado, substitui a selecao pelos dados importados e insere apenas o excedente sem apagar o resto do arquivo. Se nao marcado, os dados importados sobrescrevem apenas o trecho selecionado.',
        btnImport: 'Importar',
        btnCancel: 'Cancelar',
        fileName: 'Nome:',
        fileSize: 'Tamanho:',
        fileSizeSel: 'Tamanho da selecao:',
        warnLarger: (fs, sl, excess) => `O arquivo importado (${fs} bytes) e maior que a selecao (${sl} bytes).<br><strong>Opcoes:</strong><br>- <strong>Sobrescrever:</strong> Apenas os primeiros ${sl} bytes serao importados<br>- <strong>Inserir:</strong> Substitui a selecao e insere apenas ${excess} byte(s) excedente(s), empurrando o restante`
    },
    en: {
        headerTitle: 'Import Selection',
        selInfo: 'Selection Information',
        selSize: 'Selection size:',
        selStart: 'Start position:',
        selEnd: 'End position:',
        selectFile: 'Select File to Import',
        clickSelect: 'Click to select file',
        dragDrop: 'or drag and drop here',
        fileInfo: 'File Information',
        warning: 'Warning',
        insertMode: 'Insert Mode (push existing data)',
        insertHint: 'If checked, the current selection is replaced and only the extra imported bytes are inserted, pushing the remaining data forward. If unchecked, imported data only overwrites the selected section.',
        btnImport: 'Import',
        btnCancel: 'Cancel',
        fileName: 'Name:',
        fileSize: 'Size:',
        fileSizeSel: 'Selection size:',
        warnLarger: (fs, sl, excess) => `The imported file (${fs} bytes) is larger than the selection (${sl} bytes).<br><strong>Options:</strong><br>- <strong>Overwrite:</strong> Only the first ${sl} bytes will be imported<br>- <strong>Insert:</strong> Replaces the selection and inserts only the extra ${excess} byte(s), pushing the remaining data forward`
    }
};

function getLang() {
    if (window.I18n && window.I18n.currentLang) return window.I18n.currentLang;
    try {
        const saved = localStorage.getItem('foxy_language');
        if (saved === 'en' || saved === 'pt') return saved;
    } catch {}
    return 'pt';
}

function t(key, ...args) {
    const lang = getLang();
    const bundle = i18n[lang] || i18n.pt;
    const value = bundle[key];
    if (typeof value === 'function') return value(...args);
    return value || key;
}

function applyTranslations() {
    document.getElementById('header-title').textContent = t('headerTitle');
    document.getElementById('lbl-sel-info').textContent = t('selInfo');
    document.getElementById('lbl-sel-size').textContent = t('selSize');
    document.getElementById('lbl-sel-start').textContent = t('selStart');
    document.getElementById('lbl-sel-end').textContent = t('selEnd');
    document.getElementById('lbl-select-file').textContent = t('selectFile');
    document.getElementById('lbl-click-select').textContent = t('clickSelect');
    document.getElementById('lbl-drag-drop').textContent = t('dragDrop');
    document.getElementById('lbl-file-info').textContent = t('fileInfo');
    document.getElementById('lbl-warning').textContent = t('warning');
    document.getElementById('lbl-insert-mode').textContent = t('insertMode');
    document.getElementById('lbl-insert-hint').textContent = t('insertHint');
    document.getElementById('lbl-btn-import').textContent = t('btnImport');
    document.getElementById('lbl-btn-cancel').textContent = t('btnCancel');
    document.title = `${t('headerTitle')} - Foxy Hex Editor`;
}

ipcRenderer.on('init-import-window', (event, data) => {
    selectionData = data.selection;
    applyTranslations();
    document.getElementById('sel-size').textContent = `${selectionData.length} bytes`;
    document.getElementById('sel-start').textContent = '0x' + selectionData.start.toString(16).toUpperCase().padStart(8, '0');
    document.getElementById('sel-end').textContent = '0x' + selectionData.end.toString(16).toUpperCase().padStart(8, '0');
});

dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFileSelected(files[0]);
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFileSelected(e.target.files[0]);
});

function handleFileSelected(file) {
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        fileArrayBuffer = e.target.result;
        const fileSize = fileArrayBuffer.byteLength;
        const selLength = selectionData ? selectionData.length : 0;
        const excess = Math.max(0, fileSize - selLength);

        fileDetails.innerHTML = `
            <div><strong>${t('fileName')}</strong> ${file.name}</div>
            <div><strong>${t('fileSize')}</strong> ${fileSize} bytes</div>
            <div><strong>${t('fileSizeSel')}</strong> ${selLength} bytes</div>
        `;
        fileInfo.style.display = 'block';

        if (fileSize > selLength) {
            warningMsg.innerHTML = t('warnLarger', fileSize, selLength, excess);
            importWarning.style.display = 'block';
        } else {
            importWarning.style.display = 'none';
        }

        importBtn.disabled = false;
        importBtn.classList.add('enabled');
    };
    reader.readAsArrayBuffer(file);
}

importBtn.addEventListener('click', () => {
    if (!fileArrayBuffer || !selectionData) return;

    const importData = Array.from(new Uint8Array(fileArrayBuffer));
    ipcRenderer.send('import-selection-action', {
        selection: selectionData,
        data: importData,
        insertionMode: insertMode.checked
    });

    window.close();
});

cancelBtn.addEventListener('click', () => {
    ipcRenderer.send('import-selection-cancelled');
    window.close();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        ipcRenderer.send('import-selection-cancelled');
        window.close();
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && importBtn.classList.contains('enabled')) {
        importBtn.click();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    if (window.I18n) {
        I18n.loadSavedLanguage();
    }
    applyTranslations();
});
