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
        'loadPreset', 'loadBackgroundOnlyPreset', 'saveCustomPreset', 'loadCustomPreset',
        'exportColorConfig', 'importColorConfig', 'resetAllColors',
        'applyColorChanges'
    ]);

    let session = null;

    function capture(editor) {
        return structuredClone({
            colorConfig: editor.colorConfig,
            currentHighlightColor: editor.currentHighlightColor,
            originalHexColors: editor.originalHexColors,
            originalTextColors: editor.originalTextColors,
            originalBackgroundColors: editor.originalBackgroundColors,
            originalOffsetColor: editor.originalOffsetColor
        });
    }

    function pushState() {
        const he = window.hexEditor;
        if (!he) return;
        ipcRenderer.send('color-tool-push-state', {
            colorConfig: he.colorConfig,
            currentHighlightColor: he.currentHighlightColor,
            customPresetNames: Object.keys(he.getCustomColorPresets())
        });
    }

    ipcRenderer.on('color-tool-pull-state', () => {
        const editor = window.hexEditor;
        if (!editor) return;
        session = { baseline: capture(editor) };
        pushState();
    });

    ipcRenderer.on('color-tool-closed', () => {
        if (!session) return;
        const { baseline } = session;
        session = null;
        const editor = window.hexEditor;
        if (editor && JSON.stringify(baseline) !== JSON.stringify(capture(editor))) {
            Object.assign(editor, baseline);
            editor.renderColorConfig();
        }
    });

    ipcRenderer.on('color-tool-run', async (event, payload) => {
        const he = window.hexEditor;
        const active = session;
        if (!he || !active || !payload) return;
        const { method, args } = payload;
        if (!ALLOWED.has(method)) return;
        if (method === 'importColorConfig') {
            await he.importColorConfig(() => session === active);
        } else {
            he[method](...(Array.isArray(args) ? args : []));
        }
        if (session !== active || method === 'exportColorConfig') {
            return;
        }
        if (method === 'applyColorChanges') active.baseline = capture(he);
        pushState();
    });
})();
