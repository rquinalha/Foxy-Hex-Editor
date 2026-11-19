const COLOR_PRESET_KEY = 'customColorPresets';

function isColorConfigObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readThemeColor(value, allowAlpha = false) {
    if (typeof value === 'string' && /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(value)) {
        return value.length === 4 ? value.replace(/[\da-f]/gi, digit => digit.repeat(2)) : value;
    }
    if (allowAlpha && typeof value === 'string' && /^(transparent|rgba?\([0-9.,\s]+\))$/i.test(value)
        && CSS.supports('color', value)) return value;
    throw new Error('Cor inválida na configuração.');
}

Object.assign(FoxyHexEditorComplete.prototype, {
normalizeColorConfig(config) {
    const groups = ['hexColors', 'textColors', 'backgroundColors'];
    if (!isColorConfigObject(config) || !groups.every(key => isColorConfigObject(config[key]))) {
        throw new Error('O arquivo precisa conter as seções de cores hexadecimais, de texto e de fundo.');
    }

    const theme = structuredClone(this.defaultColorConfig);
    if (Object.hasOwn(config, 'offsetColor')) theme.offsetColor = readThemeColor(config.offsetColor);
    for (const group of groups) {
        const allowAlpha = group === 'backgroundColors';
        for (const key of Object.keys(theme[group])) {
            if (key !== 'custom' && Object.hasOwn(config[group], key)) {
                theme[group][key] = readThemeColor(config[group][key], allowAlpha);
            }
        }
    }
    if (Object.hasOwn(config.backgroundColors, 'track')) {
        theme.backgroundColors.track = readThemeColor(config.backgroundColors.track, true);
    }
    if (Object.hasOwn(config.hexColors, 'custom')) {
        if (!isColorConfigObject(config.hexColors.custom)) throw new Error('Cores por byte inválidas.');
        for (const [hex, color] of Object.entries(config.hexColors.custom)) {
            if (!/^[0-9a-f]{2}$/i.test(hex)) throw new Error('Byte inválido na configuração de cores.');
            theme.hexColors.custom[hex.toUpperCase()] = readThemeColor(color);
        }
    }
    if (Object.hasOwn(config, 'fontSettings')) {
        const font = config.fontSettings;
        const families = ['jetbrains-mono', 'source-code-pro', 'arimo', 'roboto', 'system-mono'];
        const size = Number(font?.size);
        if (!families.includes(font?.family) || !Number.isInteger(size) || size < 12 || size > 18) {
            throw new Error('Fonte ou tamanho inválido na configuração.');
        }
        theme.fontSettings = { family: font.family, size };
    }
    return theme;
},

setColorTheme(config) {
    this.colorConfig = config;
    this.originalHexColors = { ...config.hexColors };
    this.originalTextColors = { ...config.textColors };
    this.originalBackgroundColors = { ...config.backgroundColors };
    this.originalOffsetColor = config.offsetColor;
    this.renderColorConfig();
},

getCustomColorPresets() {
    try {
        const presets = JSON.parse(localStorage.getItem(COLOR_PRESET_KEY) || '{}');
        return isColorConfigObject(presets) ? presets : {};
    } catch {
        return {};
    }
},

getColorThemeForExport() {
    return { ...this.colorConfig, highlightColor: this.currentHighlightColor };
},

previewImportedColorTheme(config) {
    const theme = this.normalizeColorConfig(config);
    if (typeof config.highlightColor === 'string' && Object.hasOwn(this.highlightColorPresets, config.highlightColor)) {
        this.currentHighlightColor = config.highlightColor;
    }
    this.setColorTheme(theme);
},

loadPreset(presetName) {
    const presets = {
        default: this.defaultColorConfig,
        black: {
            offsetColor: '#ffd700',
            hexColors: {
                nulls: '#ff6b35',
                numbers: '#ffffff',
                letters: '#ffffff',
                special: '#ffffff',
                custom: {}
            },
            textColors: {
                numbers: '#ffffff',
                letters: '#ffffff',
                punctuation: '#ffffff',
                spaces: '#666666',
                tags: '#ffffff',
                dte: '#9C27B0',
                mte: '#E91E63'
            },
            backgroundColors: {
                hexContent: '#000000',
                hexLine: 'transparent',
                hexLineHover: 'rgba(255, 255, 255, 0.1)',
                asciiContent: '#000000',
                asciiLine: 'transparent',
                asciiLineHover: 'rgba(255, 255, 255, 0.1)'
            },
            fontSettings: { family: 'jetbrains-mono', size: 15 }
        },
        dark: {
            offsetColor: '#ffd700',
            hexColors: {
                nulls: '#ff6b35',
                numbers: '#4a9eff',
                letters: '#e2e8f0',
                special: '#a855f7',
                custom: {}
            },
            textColors: {
                numbers: '#4a9eff',
                letters: '#e2e8f0',
                punctuation: '#fbbf24',
                spaces: '#64748b',
                tags: '#a855f7',
                dte: '#9C27B0',
                mte: '#E91E63'
            },
            backgroundColors: {
                hexContent: 'rgba(15, 15, 35, 0.8)',
                hexLine: 'transparent',
                hexLineHover: 'rgba(255, 107, 53, 0.1)',
                asciiContent: 'rgba(15, 15, 35, 0.8)',
                asciiLine: 'transparent',
                asciiLineHover: 'rgba(255, 107, 53, 0.1)'
            },
            fontSettings: { family: 'jetbrains-mono', size: 15 }
        },
        colorful: {
            offsetColor: '#ffd700',
            hexColors: {
                nulls: '#ff6b35',
                numbers: '#4ade80',
                letters: '#fbbf24',
                special: '#a855f7',
                custom: {}
            },
            textColors: {
                numbers: '#4ade80',
                letters: '#fbbf24',
                punctuation: '#f87171',
                spaces: '#94a3b8',
                tags: '#a855f7',
                dte: '#9C27B0',
                mte: '#E91E63'
            },
            backgroundColors: {
                hexContent: 'rgba(26, 26, 46, 0.4)',
                hexLine: 'transparent',
                hexLineHover: 'rgba(255, 107, 53, 0.08)',
                asciiContent: 'rgba(26, 26, 46, 0.4)',
                asciiLine: 'transparent',
                asciiLineHover: 'rgba(255, 107, 53, 0.08)'
            },
            fontSettings: { family: 'jetbrains-mono', size: 15 }
        },
        'light-theme': {
            offsetColor: '#b8860b',
            hexColors: {
                nulls: '#ff6b35',
                numbers: '#2196F3',
                letters: '#4CAF50',
                special: '#9C27B0',
                custom: {}
            },
            textColors: {
                numbers: '#2196F3',
                letters: '#4CAF50',
                punctuation: '#FF9800',
                spaces: '#666666',
                tags: '#9C27B0',
                dte: '#7B1FA2',
                mte: '#C2185B'
            },
            backgroundColors: {
                hexContent: '#ffffff',
                hexLine: 'transparent',
                hexLineHover: 'rgba(255, 107, 53, 0.1)',
                asciiContent: '#ffffff',
                asciiLine: 'transparent',
                asciiLineHover: 'rgba(255, 107, 53, 0.1)'
            },
            fontSettings: { family: 'jetbrains-mono', size: 15 }
        },
        'terminal-green': {
            offsetColor: '#00ff41',
            hexColors: {
                nulls: '#00ff41',
                numbers: '#00cc00',
                letters: '#00ff41',
                special: '#00ff41',
                custom: {}
            },
            textColors: {
                numbers: '#00ff41',
                letters: '#00ff41',
                punctuation: '#008f11',
                spaces: '#003b00',
                tags: '#00ff41',
                dte: '#00cc00',
                mte: '#009900'
            },
            backgroundColors: {
                hexContent: '#051005',
                hexLine: 'transparent',
                hexLineHover: 'rgba(0, 255, 65, 0.15)',
                asciiContent: '#051005',
                asciiLine: 'transparent',
                asciiLineHover: 'rgba(0, 255, 65, 0.15)'
            },
            fontSettings: { family: 'jetbrains-mono', size: 15 }
        },
        'classic-blue': {
            offsetColor: '#ffcc00',
            hexColors: {
                nulls: '#ffcc00',
                numbers: '#ffffff',
                letters: '#ffffff',
                special: '#00ffff',
                custom: {}
            },
            textColors: {
                numbers: '#ffffff',
                letters: '#ffffff',
                punctuation: '#ffcc00',
                spaces: '#888888',
                tags: '#00ffff',
                dte: '#ff00ff',
                mte: '#ff69b4'
            },
            backgroundColors: {
                hexContent: '#000080',
                hexLine: 'transparent',
                hexLineHover: 'rgba(255, 255, 255, 0.15)',
                asciiContent: '#000080',
                asciiLine: 'transparent',
                asciiLineHover: 'rgba(255, 255, 255, 0.15)'
            },
            fontSettings: { family: 'jetbrains-mono', size: 15 }
        },
        'soft-gray': {
            offsetColor: '#ffd700',
            hexColors: {
                nulls: '#ff6b35',
                numbers: '#e2e8f0',
                letters: '#e2e8f0',
                special: '#94a3b8',
                custom: {}
            },
            textColors: {
                numbers: '#60a5fa',
                letters: '#e2e8f0',
                punctuation: '#fbbf24',
                spaces: '#475569',
                tags: '#94a3b8',
                dte: '#a855f7',
                mte: '#f472b6'
            },
            backgroundColors: {
                hexContent: '#2d3748',
                hexLine: 'transparent',
                hexLineHover: 'rgba(255, 255, 255, 0.05)',
                asciiContent: '#2d3748',
                asciiLine: 'transparent',
                asciiLineHover: 'rgba(255, 255, 255, 0.05)'
            },
            fontSettings: { family: 'jetbrains-mono', size: 15 }
        },
        'midnight-purple': {
            offsetColor: '#fbbf24',
            hexColors: {
                nulls: '#a855f7',
                numbers: '#e2e8f0',
                letters: '#e2e8f0',
                special: '#f472b6',
                custom: {}
            },
            textColors: {
                numbers: '#e2e8f0',
                letters: '#e2e8f0',
                punctuation: '#a855f7',
                spaces: '#4c1d95',
                tags: '#f472b6',
                dte: '#9333ea',
                mte: '#db2777'
            },
            backgroundColors: {
                hexContent: '#1a0b2e',
                hexLine: 'transparent',
                hexLineHover: 'rgba(168, 85, 247, 0.1)',
                asciiContent: '#1a0b2e',
                asciiLine: 'transparent',
                asciiLineHover: 'rgba(168, 85, 247, 0.1)'
            },
            fontSettings: { family: 'jetbrains-mono', size: 15 }
        }
    };
    
    if (Object.hasOwn(presets, presetName)) {
        this.setColorTheme(structuredClone(presets[presetName]));
    }
},

loadBackgroundOnlyPreset(presetName) {
    const presets = {
        default: {
            backgroundColors: {
                hexContent: 'rgba(26, 26, 46, 0.4)',
                hexLine: 'transparent',
                hexLineHover: 'rgba(255, 107, 53, 0.08)',
                asciiContent: 'rgba(26, 26, 46, 0.4)',
                asciiLine: 'transparent',
                asciiLineHover: 'rgba(255, 107, 53, 0.08)'
            }
        },
        black: {
            backgroundColors: {
                hexContent: '#000000',
                hexLine: 'transparent',
                hexLineHover: 'rgba(255, 255, 255, 0.1)',
                asciiContent: '#000000',
                asciiLine: 'transparent',
                asciiLineHover: 'rgba(255, 255, 255, 0.1)'
            }
        },
        dark: {
            backgroundColors: {
                hexContent: 'rgba(15, 15, 35, 0.8)',
                hexLine: 'transparent',
                hexLineHover: 'rgba(255, 107, 53, 0.1)',
                asciiContent: 'rgba(15, 15, 35, 0.8)',
                asciiLine: 'transparent',
                asciiLineHover: 'rgba(255, 107, 53, 0.1)'
            }
        },
        colorful: {
            backgroundColors: {
                hexContent: 'rgba(26, 26, 46, 0.4)',
                hexLine: 'transparent',
                hexLineHover: 'rgba(255, 107, 53, 0.08)',
                asciiContent: 'rgba(26, 26, 46, 0.4)',
                asciiLine: 'transparent',
                asciiLineHover: 'rgba(255, 107, 53, 0.08)'
            }
        },
        'light-theme': {
            backgroundColors: {
                hexContent: '#ffffff',
                hexLine: 'transparent',
                hexLineHover: 'rgba(255, 107, 53, 0.1)',
                asciiContent: '#ffffff',
                asciiLine: 'transparent',
                asciiLineHover: 'rgba(255, 107, 53, 0.1)'
            }
        },
        'terminal-green': {
            backgroundColors: {
                hexContent: '#051005',
                hexLine: 'transparent',
                hexLineHover: 'rgba(0, 255, 65, 0.15)',
                asciiContent: '#051005',
                asciiLine: 'transparent',
                asciiLineHover: 'rgba(0, 255, 65, 0.15)'
            }
        },
        'classic-blue': {
            backgroundColors: {
                hexContent: '#000080',
                hexLine: 'transparent',
                hexLineHover: 'rgba(255, 255, 255, 0.15)',
                asciiContent: '#000080',
                asciiLine: 'transparent',
                asciiLineHover: 'rgba(255, 255, 255, 0.15)'
            }
        },
        'soft-gray': {
            backgroundColors: {
                hexContent: '#2d3748',
                hexLine: 'transparent',
                hexLineHover: 'rgba(255, 255, 255, 0.05)',
                asciiContent: '#2d3748',
                asciiLine: 'transparent',
                asciiLineHover: 'rgba(255, 255, 255, 0.05)'
            }
        },
        'midnight-purple': {
            backgroundColors: {
                hexContent: '#1a0b2e',
                hexLine: 'transparent',
                hexLineHover: 'rgba(168, 85, 247, 0.1)',
                asciiContent: '#1a0b2e',
                asciiLine: 'transparent',
                asciiLineHover: 'rgba(168, 85, 247, 0.1)'
            }
        }
    };

    if (presets[presetName]) {
        this.colorConfig.backgroundColors = JSON.parse(JSON.stringify(presets[presetName].backgroundColors));
        this.originalBackgroundColors = { ...this.colorConfig.backgroundColors };
        this.loadColorConfigToUI();
        this.updateColorPreviews();
        this.applyBackgroundColors();
        this.completeRenderWithColors(this.currentScrollPercent, true);
    }
},

saveCustomPreset(name) {
    if (typeof name !== 'string' || !name.trim()) return;
    const presets = this.getCustomColorPresets();
    localStorage.setItem(COLOR_PRESET_KEY, JSON.stringify({ ...presets, [name.trim()]: this.getColorThemeForExport() }));
},

loadCustomPreset(name) {
    const presets = this.getCustomColorPresets();
    if (!Object.hasOwn(presets, name)) return;
    try {
        this.previewImportedColorTheme(presets[name]);
    } catch (error) {
        this.showNotification(error.message, 'error');
    }
},

exportColorConfig() {
    // Verificar se estamos no Electron
    if (typeof require !== 'undefined' && typeof process !== 'undefined') {
        const { ipcRenderer } = require('electron');
        
        const config = JSON.stringify(this.getColorThemeForExport(), null, 2);
        
        // Usar diálogo nativo do Electron
        ipcRenderer.invoke('show-save-dialog', {
            title: 'Exportar Configuração de Cores',
            defaultPath: 'hex-editor-colors.json',
            filters: [
                { name: 'Cores Customizadas', extensions: ['json'] }
            ]
        }).then(result => {
            if (!result.canceled && result.filePath) {
                const fs = require('fs');
                try {
                    fs.writeFileSync(result.filePath, config, 'utf8');
                    if (window.notificationSystem) {
                        window.notificationSystem.success('Configuração exportada com sucesso!', 'Exportação Concluída');
                    } else {
                        alert('Configuração exportada com sucesso!');
                    }
                } catch (error) {
                    if (window.notificationSystem) {
                        window.notificationSystem.error('Erro ao exportar configuração: ' + error.message, 'Erro de Exportação');
                    } else {
                        alert('Erro ao exportar configuração: ' + error.message);
                    }
                }
            }
        }).catch(error => {
            if (window.notificationSystem) {
                window.notificationSystem.error('Erro ao abrir diálogo: ' + error.message, 'Erro de Diálogo');
            } else {
                alert('Erro ao abrir diálogo: ' + error.message);
            }
        });
    } else {
        // Fallback para navegador
        const config = JSON.stringify(this.getColorThemeForExport(), null, 2);
        const blob = new Blob([config], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'hex-editor-colors.json';
        a.click();
        
        URL.revokeObjectURL(url);
    }
},

async importColorConfig(isCurrent = () => true) {
    const { ipcRenderer } = require('electron');
    try {
        const result = await ipcRenderer.invoke('show-open-dialog', {
            title: 'Importar Configuração de Cores',
            filters: [{ name: 'Cores Customizadas', extensions: ['json'] }]
        });
        if (result.canceled || !result.filePaths.length || !isCurrent()) return;
        const content = await require('node:fs/promises').readFile(result.filePaths[0], 'utf8');
        if (!isCurrent()) return;
        this.previewImportedColorTheme(JSON.parse(content.replace(/^\uFEFF/, '')));
    } catch (error) {
        if (isCurrent()) this.showNotification('Erro ao importar configuração: ' + error.message, 'error');
    }
},

resetAllColors() {
    this.currentHighlightColor = 'default';
    this.loadPreset('default');
},

saveColorConfig() {
    localStorage.setItem('hexEditorColorConfig', JSON.stringify(this.colorConfig));
},

loadColorConfig() {
    try {
        const saved = localStorage.getItem('hexEditorColorConfig');
        if (saved) {
            this.setColorTheme(this.normalizeColorConfig(JSON.parse(saved)));
            return;
        }
    } catch {
        // Uma configuração incompleta ou inválida não deve impedir a abertura.
    }
    this.loadPreset('default');
},

});

