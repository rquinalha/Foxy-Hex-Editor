(function () {
    if (typeof require === 'undefined') return;
    let ipcRenderer;
    try {
        ipcRenderer = require('electron').ipcRenderer;
    } catch (e) {
        return;
    }

    const ALLOWED = new Set([
        'updateOffsetColor', 'resetOffsetColor',
        'updateHexColor', 'resetHexColor', 'updateTextColor', 'resetTextColor',
        'updateBackgroundColor', 'resetBackgroundColor',
        'removeCustomHex', 'updateCustomHexColor', 'addCustomHex',
        'updateEditorFontFamily', 'updateEditorFontSize', 'resetEditorFont',
        'selectHighlightColor',
        'loadPreset', 'loadBackgroundOnlyPreset', 'saveCustomPreset', 'exportColorConfig', 'importColorConfig', 'resetAllColors',
        'applyColorChanges'
    ]);

    function pushState() {
        const he = window.hexEditor;
        if (!he) return;
        ipcRenderer.send('color-tool-push-state', {
            colorConfig: JSON.parse(JSON.stringify(he.colorConfig)),
            currentHighlightColor: he.currentHighlightColor
        });
    }

    ipcRenderer.on('color-tool-pull-state', () => {
        pushState();
    });

    ipcRenderer.on('color-tool-run', (event, payload) => {
        const he = window.hexEditor;
        if (!he || !payload || typeof payload.method !== 'string') return;
        const { method, args } = payload;
        if (!ALLOWED.has(method)) return;
        const fn = he[method];
        if (typeof fn !== 'function') return;
        fn.apply(he, args || []);
        if (method === 'importColorConfig' || method === 'exportColorConfig') {
            return;
        }
        pushState();
    });
})();
