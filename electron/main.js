const { app, BrowserWindow, Menu, shell, dialog, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const fsSync = fs;

// Detectar se app esta empacotado e definir diretorio raiz correto
const isPackaged = app.isPackaged;

// Diretorio onde os arquivos de configuracao serao salvos (Portable Mode)
let LOCAL_DATA_DIR;
if (isPackaged) {
    // Se for AppImage no Linux, process.env.APPIMAGE aponta para o arquivo original
    const baseDir = process.env.APPIMAGE 
        ? path.dirname(process.env.APPIMAGE) 
        : path.dirname(app.getPath('exe'));
    LOCAL_DATA_DIR = path.join(baseDir, '.foxy-data');
} else {
    LOCAL_DATA_DIR = path.join(path.resolve(__dirname, '..'), '.foxy-data');
}

// Caminho para os icones (sempre dentro do asar ou pasta do projeto)
const APP_DIR = path.resolve(__dirname, '..');
const APP_ICON_PATH = path.join(APP_DIR, 'assets', 'icon.ico');
const APP_ICON_PNG = path.join(APP_DIR, 'assets', 'foxy.png');

// Selecionar icone de acordo com o SO
const WINDOW_ICON = process.platform === 'win32' ? APP_ICON_PATH : APP_ICON_PNG;

// FORCAR todos os dados do Electron a ficarem dentro da pasta do app (portable)
app.setPath('userData', LOCAL_DATA_DIR);
app.setPath('appData', LOCAL_DATA_DIR);
app.setPath('cache', path.join(LOCAL_DATA_DIR, 'cache'));
app.setPath('temp', path.join(LOCAL_DATA_DIR, 'temp'));
app.setPath('logs', path.join(LOCAL_DATA_DIR, 'logs'));

// Criar pasta de dados apenas quando o app estiver pronto
app.on('ready', () => {
    try {
        if (!fsSync.existsSync(LOCAL_DATA_DIR)) {
            fsSync.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
        }
    } catch (error) {
        console.error('Erro ao criar pasta de dados:', error);
    }
});

const ROOT_DIR = APP_DIR; // Alias para compatibilidade com o resto do codigo


require(path.join(__dirname, 'electron_main_handlers.js')); 

let mainWindow;
let searchWindow;
let gotoWindow;
let calcWindow;
let colorCustomizationWindow;
let highlightsWindow;
let analysisWindow;
let relativeSearchWindow;
let tableEditorWindow = null;
let aboutWindow = null;

function createWindowWebPreferences() {
    return {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true,
        webSecurity: true,
        allowRunningInsecureContent: false
    };
}

function loadAppFile(windowRef, fileName) {
    return windowRef.loadFile(path.join(ROOT_DIR, fileName));
}


function loadToolWindowFile(windowRef, fileName) {
    return loadAppFile(windowRef, path.join('tools', fileName));
}

function createWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const workArea = primaryDisplay.workAreaSize;
    
    const windowHeight = Math.floor(workArea.height * 0.95); // 95% da altura disponível
    const windowWidth = 1400;

    mainWindow = new BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        minWidth: 1200,
        minHeight: 700,
        resizable: true,
        maximizable: true,
        webPreferences: createWindowWebPreferences(),
        icon: WINDOW_ICON,
        title: 'Foxy Hex Editor'
    });

    const windowX = Math.floor((workArea.width - windowWidth) / 2);
    const windowY = Math.floor((workArea.height - windowHeight) / 2);
    mainWindow.setPosition(windowX, windowY);

    loadAppFile(mainWindow, 'index.html');

    createMenu();

    mainWindow.on('closed', () => {
        mainWindow = null;
        if (searchWindow) {
            searchWindow.close();
        }
        if (gotoWindow) {
            gotoWindow.close();
        }
        if (calcWindow) {
            calcWindow.close();
        }
        if (colorCustomizationWindow) {
            colorCustomizationWindow.close();
        }
        if (highlightsWindow) {
            highlightsWindow.close();
        }
        if (analysisWindow) {
            analysisWindow.close();
        }
        if (relativeSearchWindow) {
            relativeSearchWindow.close();
        }
        if (bookmarkWindow) {
            bookmarkWindow.close();
        }
        if (importWindow && !importWindow.isDestroyed()) {
            importWindow.close();
        }
        if (tableEditorWindow && !tableEditorWindow.isDestroyed()) {
            tableEditorWindow.close();
        }
        if (aboutWindow && !aboutWindow.isDestroyed()) {
            aboutWindow.close();
        }
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}

const { ipcMain } = require('electron');

ipcMain.on('add-recent-file', (event, filePath) => {
    addRecentFile(filePath);
});


ipcMain.on('open-search-window', (event, initialState) => {
    if (searchWindow) {
        searchWindow.focus();
        if (initialState) {
            searchWindow.webContents.send('update-initial-state', initialState);
        }
        return;
    }

    const parentBounds = mainWindow ? mainWindow.getBounds() : { x: undefined, y: undefined, width: 500, height: 800 };
    const searchWindowHeight = 800;
    const searchWindowY = typeof parentBounds.y === 'number' ? parentBounds.y : undefined;

    searchWindow = new BrowserWindow({
        width: 500,
        height: searchWindowHeight,
        minWidth: 400,
        minHeight: 720,
        y: searchWindowY,
        resizable: true,
        alwaysOnTop: false,
        backgroundColor: '#0f0f1e',
        webPreferences: createWindowWebPreferences(),
        icon: WINDOW_ICON,
        title: 'Buscar e Substituir',
        autoHideMenuBar: true
    });

    loadToolWindowFile(searchWindow, 'search_tool.html');

    searchWindow.on('closed', () => {
        searchWindow = null;
        if (mainWindow) {
            mainWindow.webContents.send('search-window-closed');
        }
    });


    searchWindow.webContents.on('did-finish-load', () => {
        if (initialState) {
            searchWindow.webContents.send('update-initial-state', initialState);
        }
    });
});

ipcMain.on('close-search-window', () => {
    if (searchWindow) {
        searchWindow.close();
    }
});


ipcMain.on('search-action', (event, data) => {
    if (mainWindow) {
        mainWindow.webContents.send('execute-search-action', data);
    }
});


ipcMain.on('search-results-update', (event, data) => {
    if (searchWindow) {
        searchWindow.webContents.send('update-search-results', data);
    }
});


ipcMain.on('open-goto-window', (event, initialState) => {
    if (gotoWindow) {
        gotoWindow.focus();
        if (initialState) {
            gotoWindow.webContents.send('update-goto-state', initialState);
        }
        return;
    }

    gotoWindow = new BrowserWindow({
        width: 450,
        height: 430,
        minHeight: 430,
        resizable: true,
        backgroundColor: '#0f0f1e',
        webPreferences: createWindowWebPreferences(),
        icon: WINDOW_ICON,
        title: 'Ir para Offset',
        autoHideMenuBar: true
    });

    loadToolWindowFile(gotoWindow, 'goto_tool.html');

    gotoWindow.on('closed', () => {
        gotoWindow = null;
        if (mainWindow) {
            mainWindow.webContents.send('goto-window-closed');
        }
    });


    gotoWindow.webContents.on('did-finish-load', () => {
        if (initialState) {
            gotoWindow.webContents.send('update-goto-state', initialState);
        }
    });
});

ipcMain.on('close-goto-window', () => {
    if (gotoWindow) {
        gotoWindow.close();
    }
});

ipcMain.on('goto-action', (event, data) => {
    if (mainWindow) {
        mainWindow.webContents.send('execute-goto-action', data);
    }
});

ipcMain.on('goto-state-update', (event, data) => {
    if (gotoWindow) {
        gotoWindow.webContents.send('update-goto-state', data);
    }
});


ipcMain.on('open-calc-window', (event) => {
    if (calcWindow) {
        calcWindow.focus();
        return;
    }

    calcWindow = new BrowserWindow({
        width: 420,
        height: 850,
        resizable: true,
        backgroundColor: '#0f0f1e',
        webPreferences: createWindowWebPreferences(),
        icon: WINDOW_ICON,
        title: 'Calculadora Hexadecimal',
        autoHideMenuBar: true
    });

    loadToolWindowFile(calcWindow, 'calc_tool.html');

    calcWindow.on('closed', () => {
        calcWindow = null;
    });
});

ipcMain.on('close-calc-window', () => {
    if (calcWindow) {
        calcWindow.close();
    }
});


ipcMain.on('open-color-customization-window', () => {
    if (colorCustomizationWindow && !colorCustomizationWindow.isDestroyed()) {
        colorCustomizationWindow.focus();
        return;
    }

    colorCustomizationWindow = new BrowserWindow({
        width: 780,
        height: 900,
        minWidth: 520,
        minHeight: 500,
        parent: mainWindow,
        modal: false,
        backgroundColor: '#0f0f1e',
        webPreferences: createWindowWebPreferences(),
        icon: WINDOW_ICON,
        title: 'Customizar Cores',
        autoHideMenuBar: true
    });

    loadToolWindowFile(colorCustomizationWindow, 'color_customization_tool.html');

    colorCustomizationWindow.on('closed', () => {
        colorCustomizationWindow = null;
    });
});

ipcMain.on('close-color-customization-window', () => {
    if (colorCustomizationWindow && !colorCustomizationWindow.isDestroyed()) {
        colorCustomizationWindow.close();
    }
});

ipcMain.on('color-tool-ready', () => {
    if (mainWindow) {
        mainWindow.webContents.send('color-tool-pull-state');
    }
});

ipcMain.on('color-tool-exec', (event, payload) => {
    if (mainWindow) {
        mainWindow.webContents.send('color-tool-run', payload);
    }
});

ipcMain.on('color-tool-push-state', (event, state) => {
    if (colorCustomizationWindow && !colorCustomizationWindow.isDestroyed()) {
        colorCustomizationWindow.webContents.send('color-tool-init', state);
    }
});


ipcMain.on('open-highlights-window', (event, initialState) => {
    if (highlightsWindow) {
        highlightsWindow.focus();
        if (initialState) {
            highlightsWindow.webContents.send('update-highlights-state', initialState);
        }
        return;
    }

    highlightsWindow = new BrowserWindow({
        width: 1000,
        height: 600,
        minWidth: 800,
        minHeight: 400,
        resizable: true,
        backgroundColor: '#0f0f1e',
        webPreferences: createWindowWebPreferences(),
        icon: WINDOW_ICON,
        title: 'Gerenciar Marcações',
        autoHideMenuBar: true
    });

    loadToolWindowFile(highlightsWindow, 'highlights_tool.html');

    highlightsWindow.on('closed', () => {
        highlightsWindow = null;
        if (mainWindow) {
            mainWindow.webContents.send('highlights-window-closed');
        }
    });


    highlightsWindow.webContents.on('did-finish-load', () => {
        if (initialState) {
            highlightsWindow.webContents.send('update-highlights-state', initialState);
        }
    });
});

ipcMain.on('close-highlights-window', () => {
    if (highlightsWindow) {
        highlightsWindow.close();
    }
});


ipcMain.on('navigate-to-highlight', (event, data) => {
    if (mainWindow) {
        mainWindow.webContents.send('execute-navigate-to-highlight', data);
    }
});

ipcMain.on('update-highlight-comment', (event, data) => {
    if (mainWindow) {
        mainWindow.webContents.send('execute-update-highlight-comment', data);
    }
});

ipcMain.on('delete-highlight', (event, data) => {
    if (mainWindow) {
        mainWindow.webContents.send('execute-delete-highlight', data);
    }
});

ipcMain.on('refresh-highlights', () => {
    if (mainWindow) {
        mainWindow.webContents.send('request-highlights-refresh');
    }
});


ipcMain.on('highlights-state-update', (event, data) => {
    if (highlightsWindow) {
        highlightsWindow.webContents.send('update-highlights-state', data);
    }
});

ipcMain.on('highlight-updated', (event, data) => {
    if (highlightsWindow) {
        highlightsWindow.webContents.send('highlight-updated', data);
    }
});

ipcMain.on('highlight-removed', (event, data) => {
    if (highlightsWindow) {
        highlightsWindow.webContents.send('highlight-removed', data);
    }
});


ipcMain.on('open-analysis-window', (event, initialState) => {
    if (analysisWindow) {
        analysisWindow.focus();
        if (initialState) {
            analysisWindow.webContents.send('update-analysis-state', initialState);
        }
        return;
    }

    analysisWindow = new BrowserWindow({
        width: 900,
        height: 900,
        minWidth: 700,
        minHeight: 500,
        resizable: true,
        backgroundColor: '#0f0f1e',
        webPreferences: createWindowWebPreferences(),
        icon: WINDOW_ICON,
        title: 'Análise de Arquivo',
        autoHideMenuBar: true
    });

    loadToolWindowFile(analysisWindow, 'analysis_tool.html');

    analysisWindow.on('closed', () => {
        analysisWindow = null;
        if (mainWindow) {
            mainWindow.webContents.send('analysis-window-closed');
        }
    });


    analysisWindow.webContents.on('did-finish-load', () => {
        if (initialState) {
            analysisWindow.webContents.send('update-analysis-state', initialState);
        }
    });
});

ipcMain.on('close-analysis-window', () => {
    if (analysisWindow) {
        analysisWindow.close();
    }
});


ipcMain.on('open-relative-search-window', (event, initialState) => {
    if (relativeSearchWindow && !relativeSearchWindow.isDestroyed()) {
        relativeSearchWindow.focus();
        if (initialState) {
            relativeSearchWindow.webContents.send('init-relative-search-window', initialState);
        }
        return;
    }

    relativeSearchWindow = new BrowserWindow({
        width: 1180,
        height: 980,
        minWidth: 980,
        minHeight: 760,
        resizable: true,
        backgroundColor: '#101624',
        webPreferences: createWindowWebPreferences(),
        icon: WINDOW_ICON,
        title: 'Busca Relativa',
        autoHideMenuBar: true
    });

    loadToolWindowFile(relativeSearchWindow, 'relative_search_tool.html');

    relativeSearchWindow.on('closed', () => {
        relativeSearchWindow = null;
    });

    relativeSearchWindow.webContents.on('did-finish-load', () => {
        if (initialState) {
            relativeSearchWindow.webContents.send('init-relative-search-window', initialState);
        }
    });
});

ipcMain.on('close-relative-search-window', () => {
    if (relativeSearchWindow && !relativeSearchWindow.isDestroyed()) {
        relativeSearchWindow.close();
    }
});


ipcMain.on('analysis-navigate-to-offset', (event, data) => {
    if (mainWindow) {
        mainWindow.webContents.send('execute-analysis-navigate', data);
    }
});

ipcMain.on('analysis-tool-ready', () => {

});

ipcMain.on('analysis-refresh-request', () => {
    if (mainWindow) {
        mainWindow.webContents.send('analysis-refresh-request');
    }
});


let bookmarkWindow = null;

ipcMain.on('open-bookmark-window', (event, initialState) => {
    if (bookmarkWindow) {
        bookmarkWindow.focus();
        if (initialState) {
            bookmarkWindow.webContents.send('init-bookmark-window', initialState);
        }
        return;
    }

    bookmarkWindow = new BrowserWindow({
        width: 480,
        height: 420,
        resizable: false,
        backgroundColor: '#1a1a2e',
        webPreferences: createWindowWebPreferences(),
        icon: WINDOW_ICON,
        title: 'Adicionar Favorito',
        autoHideMenuBar: true
    });

    loadToolWindowFile(bookmarkWindow, 'bookmark_tool.html');

    bookmarkWindow.on('closed', () => {
        bookmarkWindow = null;
    });


    bookmarkWindow.webContents.on('did-finish-load', () => {
        if (initialState) {
            bookmarkWindow.webContents.send('init-bookmark-window', initialState);
        }
    });
});

ipcMain.on('close-bookmark-window', () => {
    if (bookmarkWindow) {
        bookmarkWindow.close();
    }
});


ipcMain.on('bookmark-add-request', (event, data) => {

    const pendingBookmark = {
        title: data.title,
        comment: data.comment,
        editingId: data.editingId  // ID do bookmark sendo editado (se houver)
    };
    

    if (mainWindow) {
        mainWindow.webContents.send('get-cursor-offset-for-bookmark', pendingBookmark);
    }
});


ipcMain.on('request-current-offset', (event) => {
    if (mainWindow) {
        mainWindow.webContents.send('request-current-offset', bookmarkWindow?.webContents.id);
    }
});


ipcMain.on('bookmark-offset-response', (event, data) => {
    if (mainWindow) {

        const bookmarkData = {
            title: data.title,
            comment: data.comment,
            offset: data.offset,
            editingId: data.editingId  // ID do bookmark sendo editado
        };
        mainWindow.webContents.send('bookmark-added', bookmarkData);
    }
});

ipcMain.on('bookmark-cancelled', () => {

});


let importWindow = null;

ipcMain.on('open-import-window', (event, selectionData) => {
    if (importWindow && !importWindow.isDestroyed()) {

        importWindow.webContents.send('init-import-window', { selection: selectionData });
        importWindow.focus();
        return;
    }

    importWindow = new BrowserWindow({
        width: 540,
        height: 580,
        minWidth: 460,
        minHeight: 480,
        resizable: true,
        backgroundColor: '#1a1a2e',
        webPreferences: createWindowWebPreferences(),
        icon: WINDOW_ICON,
        title: 'Importar Seleção',
        autoHideMenuBar: true
    });

    loadToolWindowFile(importWindow, 'import_tool.html');

    importWindow.on('closed', () => {
        importWindow = null;
    });

    importWindow.webContents.on('did-finish-load', () => {
        importWindow.webContents.send('init-import-window', { selection: selectionData });
    });
});

ipcMain.on('close-import-window', () => {
    if (importWindow && !importWindow.isDestroyed()) importWindow.close();
});


ipcMain.on('open-table-editor-window', (event, initialState) => {
    if (tableEditorWindow && !tableEditorWindow.isDestroyed()) {
        tableEditorWindow.focus();
        if (initialState) {
            tableEditorWindow.webContents.send('init-table-editor-window', initialState);
        }
        return;
    }

    tableEditorWindow = new BrowserWindow({
        width: 1100,
        height: 760,
        minWidth: 900,
        minHeight: 620,
        resizable: true,
        backgroundColor: '#0f0f1e',
        webPreferences: createWindowWebPreferences(),
        icon: WINDOW_ICON,
        title: 'Editor de Tabelas',
        autoHideMenuBar: true
    });

    loadToolWindowFile(tableEditorWindow, 'table_editor_tool.html');

    tableEditorWindow.on('closed', () => {
        tableEditorWindow = null;
    });

    tableEditorWindow.webContents.on('did-finish-load', () => {
        if (initialState) {
            tableEditorWindow.webContents.send('init-table-editor-window', initialState);
        }
    });
});

ipcMain.on('close-table-editor-window', () => {
    if (tableEditorWindow && !tableEditorWindow.isDestroyed()) {
        tableEditorWindow.close();
    }
});

function openAboutWindow() {
    if (aboutWindow && !aboutWindow.isDestroyed()) {
        aboutWindow.focus();
        return;
    }

    aboutWindow = new BrowserWindow({
        width: 450,
        height: 550,
        resizable: false,
        frame: false, // Sem bordas para um look mais limpo
        transparent: true,
        backgroundColor: '#00000000',
        alwaysOnTop: true,
        webPreferences: createWindowWebPreferences(),
        icon: WINDOW_ICON,
        title: 'Sobre Foxy Hex Editor'
    });

    loadToolWindowFile(aboutWindow, 'about_tool.html');

    aboutWindow.on('closed', () => {
        aboutWindow = null;
    });
}

ipcMain.on('about-window-ready', (event) => {
    if (aboutWindow) {
        aboutWindow.webContents.send('init-about', { lang: currentMenuLang });
    }
});

ipcMain.on('open-external-link', (event, url) => {
    shell.openExternal(url);
});

ipcMain.on('table-editor-apply', (event, payload) => {
    if (mainWindow && payload) {
        mainWindow.webContents.send('apply-character-table', payload);
    }
});


ipcMain.on('import-selection-action', (event, data) => {
    if (mainWindow) {
        mainWindow.webContents.send('execute-import-selection', data);
    }
});

ipcMain.on('import-selection-cancelled', () => {

});

const recentFilesPath = path.join(LOCAL_DATA_DIR, 'recent_files.json');
const MAX_RECENT_FILES = 3;
let recentFiles = [];


function loadRecentFiles() {
    try {
        if (fsSync.existsSync(recentFilesPath)) {
            const data = fsSync.readFileSync(recentFilesPath, 'utf8');
            recentFiles = JSON.parse(data);
            recentFiles = recentFiles.filter(filePath => fsSync.existsSync(filePath));
            if (recentFiles.length > MAX_RECENT_FILES) {
                recentFiles = recentFiles.slice(0, MAX_RECENT_FILES);
            }
        }
    } catch (error) {
        recentFiles = [];
    }
}

function saveRecentFiles() {
    try {
        if (!fsSync.existsSync(LOCAL_DATA_DIR)) {
            fsSync.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
        }
        fsSync.writeFileSync(recentFilesPath, JSON.stringify(recentFiles, null, 2), 'utf8');
    } catch (error) {
        console.error('Erro ao salvar arquivos recentes:', error);
    }
}

function addRecentFile(filePath) {
    if (!filePath || typeof filePath !== 'string') return;
    
    recentFiles = recentFiles.filter(f => f !== filePath);
    recentFiles.unshift(filePath);
    if (recentFiles.length > MAX_RECENT_FILES) {
        recentFiles = recentFiles.slice(0, MAX_RECENT_FILES);
    }
    saveRecentFiles();
    createMenu();
}

function buildRecentFilesSubmenu() {
    if (recentFiles.length === 0) {
        return [{ label: 'Nenhum arquivo recente', enabled: false }];
    }
    
    return recentFiles.map((filePath, index) => {
        const fileName = path.basename(filePath);
        const displayIndex = index + 1;
        return {
            label: `${displayIndex}. ${fileName}`,
            accelerator: `Ctrl+${displayIndex}`,
            click: () => openRecentFile(filePath)
        };
    });
}

async function openRecentFile(filePath) {
    if (!mainWindow || !fsSync.existsSync(filePath)) {
        dialog.showErrorBox('Arquivo não encontrado', `O arquivo não existe mais:\n${filePath}`);
        recentFiles = recentFiles.filter(f => f !== filePath);
        saveRecentFiles();
        createMenu();
        return;
    }
    
    try {
        const stats = fsSync.statSync(filePath);
        
        mainWindow.webContents.send('open-recent-file', {
            name: path.basename(filePath),
            path: filePath,
            size: stats.size
        });
    } catch (error) {
        console.error('Erro ao abrir arquivo recente:', error);
        dialog.showErrorBox('Erro', `Não foi possível abrir o arquivo:\n${error.message}`);
    }
}

let currentMenuLang = 'pt';
const menuLangPath = path.join(LOCAL_DATA_DIR, 'menu_language.json');

function loadMenuLanguage() {
    try {
        if (fsSync.existsSync(menuLangPath)) {
            const data = fsSync.readFileSync(menuLangPath, 'utf8');
            const saved = JSON.parse(data);
            if (saved.lang === 'pt' || saved.lang === 'en') {
                currentMenuLang = saved.lang;
            }
        }
    } catch (error) {
        currentMenuLang = 'pt';
    }
}

function saveMenuLanguage() {
    try {
        if (!fsSync.existsSync(LOCAL_DATA_DIR)) {
            fsSync.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
        }
        fsSync.writeFileSync(menuLangPath, JSON.stringify({ lang: currentMenuLang }, null, 2), 'utf8');
    } catch (error) {
        console.error('Erro ao salvar idioma do menu:', error);
    }
}

const menuTranslations = {
    pt: {
        file: 'Arquivo', open: 'Abrir', save: 'Salvar', saveAs: 'Salvar Como', exit: 'Sair',
        edit: 'Editar', undo: 'Desfazer', redo: 'Refazer', cut: 'Recortar', copy: 'Copiar', paste: 'Colar', delete: 'Excluir', selectAll: 'Selecionar Tudo',
        view: 'Visualizar', reload: 'Recarregar', devTools: 'Ferramentas de Desenvolvedor', resetZoom: 'Zoom Normal', zoomIn: 'Aumentar Zoom', zoomOut: 'Diminuir Zoom', fullScreen: 'Tela Cheia',
        tools: 'Ferramentas', enableEdit: 'Habilitar Edição', insertMode: 'Inserir/Sobrescrever', findReplace: 'Buscar e Substituir', gotoOffset: 'Ir para Offset...', hexCalc: 'Calculadora Hex',
        highlights: 'Marcações', analyze: 'Analisar', bookmarks: 'Favoritos', relativeSearch: 'Busca Relativa', customizeColors: 'Customizar Cores',
        help: 'Ajuda', about: 'Sobre Foxy Hex Editor', aboutTitle: 'Sobre Foxy Hex Editor', aboutMessage: 'Foxy Hex Editor v1.0.0', aboutDetail: 'Editor Hex avançado focado em games e traduções.',
        noRecentFiles: 'Nenhum arquivo recente'
    },
    en: {
        file: 'File', open: 'Open', save: 'Save', saveAs: 'Save As', exit: 'Exit',
        edit: 'Edit', undo: 'Undo', redo: 'Redo', cut: 'Cut', copy: 'Copy', paste: 'Paste', delete: 'Delete', selectAll: 'Select All',
        view: 'View', reload: 'Reload', devTools: 'Developer Tools', resetZoom: 'Reset Zoom', zoomIn: 'Zoom In', zoomOut: 'Zoom Out', fullScreen: 'Full Screen',
        tools: 'Tools', enableEdit: 'Enable Editing', insertMode: 'Insert/Overwrite', findReplace: 'Find and Replace', gotoOffset: 'Go to Offset...', hexCalc: 'Hex Calculator',
        highlights: 'Highlights', analyze: 'Analyze', bookmarks: 'Bookmarks', relativeSearch: 'Relative Search', customizeColors: 'Customize Colors',
        help: 'Help', about: 'About Foxy Hex Editor', aboutTitle: 'About Foxy Hex Editor', aboutMessage: 'Foxy Hex Editor v1.0.0', aboutDetail: 'Advanced Hex Editor focused on games and translations.',
        noRecentFiles: 'No recent files'
    }
};

function t(key) {
    return menuTranslations[currentMenuLang][key] || key;
}

function createMenu() {
    const template = [
        {
            label: t('file'),
            submenu: [
                { label: t('open'), accelerator: 'Ctrl+O', click: () => { if (mainWindow) mainWindow.webContents.send('menu-open-file'); } },
                { label: t('save'), accelerator: 'Ctrl+S', click: () => { if (mainWindow) mainWindow.webContents.send('menu-save-file'); } },
                { label: t('saveAs'), accelerator: 'Ctrl+Shift+S', click: () => { if (mainWindow) mainWindow.webContents.send('menu-save-as-file'); } },
                { type: 'separator' },
                ...buildRecentFilesSubmenu(),
                { type: 'separator' },
                { label: t('exit'), accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q', click: () => { app.quit(); } }
            ]
        },
        {
            label: t('edit'),
            submenu: [
                { role: 'undo', label: t('undo') },
                { role: 'redo', label: t('redo') },
                { type: 'separator' },
                { role: 'cut', label: t('cut') },
                { role: 'copy', label: t('copy') },
                { role: 'paste', label: t('paste') },
                { role: 'delete', label: t('delete') },
                { type: 'separator' },
                { role: 'selectall', label: t('selectAll') }
            ]
        },
        {
            label: t('view'),
            submenu: [
                { role: 'reload', label: t('reload') },
                { role: 'toggleDevTools', label: t('devTools') },
                { type: 'separator' },
                { role: 'resetZoom', label: t('resetZoom') },
                { role: 'zoomIn', label: t('zoomIn') },
                { role: 'zoomOut', label: t('zoomOut') },
                { type: 'separator' },
                { role: 'togglefullscreen', label: t('fullScreen') }
            ]
        },
        {
            label: t('tools'),
            submenu: [
                { label: t('enableEdit'), accelerator: 'Ctrl+E', click: () => { if (mainWindow) mainWindow.webContents.send('menu-toggle-edit-mode'); } },
                { label: t('insertMode'), accelerator: 'Ctrl+I', click: () => { if (mainWindow) mainWindow.webContents.send('menu-toggle-insert-mode'); } },
                { type: 'separator' },
                { label: t('findReplace'), accelerator: 'Ctrl+F', click: () => { if (mainWindow) mainWindow.webContents.send('menu-find-replace'); } },
                { label: t('gotoOffset'), accelerator: 'Ctrl+G', click: () => { if (mainWindow) mainWindow.webContents.send('menu-goto-offset'); } },
                { label: t('hexCalc'), accelerator: 'Ctrl+H', click: () => { if (mainWindow) mainWindow.webContents.send('menu-hex-calculator'); } },
                { type: 'separator' },
                { label: t('highlights'), accelerator: 'Ctrl+M', click: () => { if (mainWindow) mainWindow.webContents.send('menu-highlights'); } },
                { label: t('analyze'), accelerator: 'Ctrl+Y', click: () => { if (mainWindow) mainWindow.webContents.send('menu-analyze'); } },
                { label: t('bookmarks'), accelerator: 'Ctrl+B', click: () => { if (mainWindow) mainWindow.webContents.send('menu-bookmarks'); } },
                { label: t('relativeSearch'), accelerator: 'Ctrl+Shift+R', click: () => { if (mainWindow) mainWindow.webContents.send('menu-relative-search'); } },
                { type: 'separator' },
                { label: t('customizeColors'), accelerator: 'Ctrl+K', click: () => { if (mainWindow) mainWindow.webContents.send('menu-customize-colors'); } }
            ]
        },
        {
            label: t('help'),
            submenu: [
                {
                    label: t('about'),
                    click: () => {
                        openAboutWindow();
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

function buildRecentFilesSubmenu() {
    if (recentFiles.length === 0) {
        return [{ label: t('noRecentFiles'), enabled: false }];
    }
    return recentFiles.map((filePath, index) => {
        const fileName = path.basename(filePath);
        const displayIndex = index + 1;
        return {
            label: `${displayIndex}. ${fileName}`,
            click: () => { openRecentFile(filePath); }
        };
    });
}

ipcMain.on('change-menu-language', (event, lang) => {
    if (lang === 'pt' || lang === 'en') {
        currentMenuLang = lang;
        saveMenuLanguage();
        createMenu();
    }
});

app.whenReady().then(() => {
    loadMenuLanguage();
    loadRecentFiles();
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});






