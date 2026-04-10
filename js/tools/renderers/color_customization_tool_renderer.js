const { ipcRenderer } = require('electron');

window.ColorTool = {
    exec(method, args) {
        ipcRenderer.send('color-tool-exec', { method, args: args || [] });
    },
    confirmResetAllColors() {
        const message = window.I18n
            ? window.I18n.t('tool.color.confirm_reset_message')
            : 'Tem certeza que deseja resetar todas as cores para os valores padrão?';
        const title = window.I18n
            ? window.I18n.t('tool.color.confirm_reset_title')
            : 'Resetar cores';

        if (window.notificationSystem && typeof window.notificationSystem.confirm === 'function') {
            window.notificationSystem.confirm(
                message,
                title,
                () => this.exec('loadPreset', ['default'])
            );
            return;
        }

        if (window.confirm(message)) {
            this.exec('loadPreset', ['default']);
        }
    },
    close() {
        ipcRenderer.send('close-color-customization-window');
    },
    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach((btn) => btn.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach((panel) => panel.classList.remove('active'));
        const tabButton = document.querySelector(`[data-tab="${tabName}"]`);
        if (tabButton) tabButton.classList.add('active');
        const tabPanel = document.getElementById(`${tabName}-tab`);
        if (tabPanel) tabPanel.classList.add('active');
    },
    addCustomHex() {
        const hexInput = document.getElementById('custom-hex-input');
        const colorInput = document.getElementById('custom-hex-color');
        if (!hexInput || !colorInput) return;
        this.exec('addCustomHex', [hexInput.value.trim().toUpperCase(), colorInput.value]);
        hexInput.value = '';
        hexInput.focus();
    }
};

function setupCustomHexDelegation() {
    const list = document.getElementById('custom-hex-list');
    if (!list) return;
    list.addEventListener('change', (e) => {
        const target = e.target;
        if (target && target.type === 'color' && target.closest('.custom-hex-item')) {
            const hex = target.closest('.custom-hex-item').dataset.hex;
            ColorTool.exec('updateCustomHexColor', [hex, target.value]);
        }
    });
    list.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-btn')) {
            const row = e.target.closest('.custom-hex-item');
            if (row && row.dataset.hex) {
                ColorTool.exec('removeCustomHex', [row.dataset.hex]);
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setupCustomHexDelegation();
    ipcRenderer.send('color-tool-ready');
});

ipcRenderer.on('color-tool-init', (event, state) => {
    if (typeof window.populateColorCustomizationUI === 'function') {
        window.populateColorCustomizationUI(document, state);
    }
});
