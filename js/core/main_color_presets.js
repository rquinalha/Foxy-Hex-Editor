Object.assign(FoxyHexEditorComplete.prototype, {
loadPreset(presetName) {
    const presets = {
        default: {
            offsetColor: '#ffd700',
            hexColors: {
                nulls: '#ff6b35',
                numbers: '#4fc3f7',
                letters: '#4fc3f7',
                special: '#4fc3f7',
                custom: {}
            },
            textColors: {
                numbers: '#2196F3',
                letters: '#4CAF50',
                punctuation: '#FFD700',
                spaces: '#666666',
                tags: '#FFFFFF',
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
            fontSettings: {
                family: 'jetbrains-mono',
                size: 15
            }
        },
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
    
    if (presets[presetName]) {
        // Salvar cores originais do preset para uso no reset
        this.originalHexColors = {
            nulls: presets[presetName].hexColors.nulls,
            numbers: presets[presetName].hexColors.numbers,
            letters: presets[presetName].hexColors.letters,
            special: presets[presetName].hexColors.special
        };
        this.originalOffsetColor = presets[presetName].offsetColor || '#ffd700';
        
        this.colorConfig = JSON.parse(JSON.stringify(presets[presetName]));
        this.loadColorConfigToUI();
        this.updateColorPreviews();
        this.applyOffsetColors();
        this.applyBackgroundColors();
        if (typeof this.applyEditorFontSettings === 'function') {
            this.applyEditorFontSettings();
        }
        this.notifyColorToolWindow();
        
        // Forçar re-renderização para mostrar as mudanças imediatamente
        this.completeRenderWithColors(this.currentScrollPercent, true);
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
        this.loadColorConfigToUI();
        this.updateColorPreviews();
        this.applyBackgroundColors();
        this.notifyColorToolWindow();
        this.completeRenderWithColors(this.currentScrollPercent, true);
    }
},

saveCustomPreset() {
    const name = prompt('Digite um nome para salvar esta configuração:');
    if (name) {
        const customPresets = JSON.parse(localStorage.getItem('customColorPresets') || '{}');
        customPresets[name] = JSON.parse(JSON.stringify(this.colorConfig));
        localStorage.setItem('customColorPresets', JSON.stringify(customPresets));
        alert(`Configuração "${name}" salva com sucesso!`);
    }
},

exportColorConfig() {
    // Verificar se estamos no Electron
    if (typeof require !== 'undefined' && typeof process !== 'undefined') {
        const { ipcRenderer } = require('electron');
        
        const config = JSON.stringify(this.colorConfig, null, 2);
        
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
        const config = JSON.stringify(this.colorConfig, null, 2);
        const blob = new Blob([config], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'hex-editor-colors.json';
        a.click();
        
        URL.revokeObjectURL(url);
    }
},

importColorConfig() {
    // Verificar se estamos no Electron
    if (typeof require !== 'undefined' && typeof process !== 'undefined') {
        const { ipcRenderer } = require('electron');
        
        // Usar diálogo nativo do Electron
        ipcRenderer.invoke('show-open-dialog', {
            title: 'Importar Configuração de Cores',
            filters: [
                { name: 'Cores Customizadas', extensions: ['json'] }
            ]
        }).then(result => {
            if (!result.canceled && result.filePaths.length > 0) {
                const filePath = result.filePaths[0];
                
                // Ler o arquivo usando fs
                const fs = require('fs');
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    const config = JSON.parse(content);
                    if (!config.offsetColor) {
                        config.offsetColor = '#ffd700';
                    }
                    if (!config.fontSettings) {
                        config.fontSettings = { family: 'jetbrains-mono', size: 15 };
                    }
                    this.colorConfig = config;
                    this.loadColorConfigToUI();
                    this.updateColorPreviews();
                    this.applyOffsetColors();
                    if (typeof this.applyEditorFontSettings === 'function') {
                        this.applyEditorFontSettings();
                    }
                    this.notifyColorToolWindow();
                    
                    if (window.notificationSystem) {
                        window.notificationSystem.success('Configuração importada com sucesso!', 'Importação Concluída');
                    } else {
                        alert('Configuração importada com sucesso!');
                    }
                } catch (error) {
                    if (window.notificationSystem) {
                        window.notificationSystem.error('Erro ao importar configuração: ' + error.message, 'Erro de Importação');
                    } else {
                        alert('Erro ao importar configuração: ' + error.message);
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
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const config = JSON.parse(e.target.result);
                        if (!config.offsetColor) {
                            config.offsetColor = '#ffd700';
                        }
                        if (!config.fontSettings) {
                            config.fontSettings = { family: 'jetbrains-mono', size: 15 };
                        }
                        this.colorConfig = config;
                        this.loadColorConfigToUI();
                        this.updateColorPreviews();
                        this.applyOffsetColors();
                        if (typeof this.applyEditorFontSettings === 'function') {
                            this.applyEditorFontSettings();
                        }
                        alert('Configuração importada com sucesso!');
                    } catch (error) {
                        alert('Erro ao importar configuração. Verifique se o arquivo é válido.');
                    }
                };
                reader.readAsText(file);
            }
        };
        
        input.click();
    }
},

resetAllColors() {
    if (window.notificationSystem && typeof window.notificationSystem.confirm === 'function') {
        window.notificationSystem.confirm(
            'Tem certeza que deseja resetar todas as cores para os valores padrão?',
            'Resetar cores',
            () => this.loadPreset('default')
        );
        return;
    }

    if (confirm('Tem certeza que deseja resetar todas as cores para os valores padrão?')) {
        this.loadPreset('default');
    }
},

saveColorConfig() {
    localStorage.setItem('hexEditorColorConfig', JSON.stringify(this.colorConfig));
},

loadColorConfig() {
    const saved = localStorage.getItem('hexEditorColorConfig');
    if (saved) {
        try {
            this.colorConfig = JSON.parse(saved);
            if (!this.colorConfig.offsetColor) {
                this.colorConfig.offsetColor = '#ffd700';
            }
            if (!this.colorConfig.fontSettings) {
                this.colorConfig.fontSettings = { family: 'jetbrains-mono', size: 15 };
            }
            this.originalHexColors = {
                nulls: this.colorConfig.hexColors?.nulls || '#ff6b35',
                numbers: this.colorConfig.hexColors?.numbers || '#4fc3f7',
                letters: this.colorConfig.hexColors?.letters || '#4fc3f7',
                special: this.colorConfig.hexColors?.special || '#4fc3f7'
            };
            this.originalOffsetColor = this.colorConfig.offsetColor || '#ffd700';
            this.applyOffsetColors();
            // Garantir que as cores de fundo sejam aplicadas
            if (this.colorConfig.backgroundColors) {
                this.applyBackgroundColors();
            }
            if (typeof this.applyEditorFontSettings === 'function') {
                this.applyEditorFontSettings();
            }
        } catch (error) {
            this.loadPreset('default');
        }
    } else {
        // Se não há configuração salva, carregar preset padrão
        this.loadPreset('default');
    }
},

});

