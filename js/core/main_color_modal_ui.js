Object.assign(FoxyHexEditorComplete.prototype, {
showColorCustomizationModal() {
    try {
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('open-color-customization-window');
    } catch (e) {
    }
},

hideColorCustomizationModal() {
    try {
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('close-color-customization-window');
    } catch (e) {}
},

notifyColorToolWindow() {
    try {
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('color-tool-push-state', {
            colorConfig: JSON.parse(JSON.stringify(this.colorConfig)),
            currentHighlightColor: this.currentHighlightColor
        });
    } catch (e) {}
},

switchColorTab(tabName) {
    // Remover classe active de todas as tabs
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
    
    // Adicionar classe active na tab selecionada - com verificação de segurança
    const tabButton = document.querySelector(`[data-tab="${tabName}"]`);
    if (tabButton) tabButton.classList.add('active');
    
    const tabPanel = document.getElementById(`${tabName}-tab`);
    if (tabPanel) tabPanel.classList.add('active');
},

loadColorConfigToUI() {
    if (!document.getElementById('hex-nulls-color')) return;
    if (!this.colorConfig.offsetColor) {
        this.colorConfig.offsetColor = '#ffd700';
    }
    const offsetColor = document.getElementById('offset-color');
    if (offsetColor) offsetColor.value = this.colorConfig.offsetColor;
    // Carregar cores hex - com verificação de segurança
    const hexNullsColor = document.getElementById('hex-nulls-color');
    if (hexNullsColor) hexNullsColor.value = this.colorConfig.hexColors.nulls;
    
    const hexNumbersColor = document.getElementById('hex-numbers-color');
    if (hexNumbersColor) hexNumbersColor.value = this.colorConfig.hexColors.numbers;
    
    const hexLettersColor = document.getElementById('hex-letters-color');
    if (hexLettersColor) hexLettersColor.value = this.colorConfig.hexColors.letters;
    
    const hexSpecialColor = document.getElementById('hex-special-color');
    if (hexSpecialColor) hexSpecialColor.value = this.colorConfig.hexColors.special;
    
    // Carregar cores de texto - com verificação de segurança
    const textNumbersColor = document.getElementById('text-numbers-color');
    if (textNumbersColor) textNumbersColor.value = this.colorConfig.textColors.numbers;
    
    const textLettersColor = document.getElementById('text-letters-color');
    if (textLettersColor) textLettersColor.value = this.colorConfig.textColors.letters;
    
    const textPunctuationColor = document.getElementById('text-punctuation-color');
    if (textPunctuationColor) textPunctuationColor.value = this.colorConfig.textColors.punctuation;
    
    const textSpacesColor = document.getElementById('text-spaces-color');
    if (textSpacesColor) textSpacesColor.value = this.colorConfig.textColors.spaces;
    
    const textTagsColor = document.getElementById('text-tags-color');
    if (textTagsColor) textTagsColor.value = this.colorConfig.textColors.tags;

    const textDteColor = document.getElementById('text-dte-color');
    if (textDteColor) textDteColor.value = this.colorConfig.textColors.dte || '#9C27B0';

    const textMteColor = document.getElementById('text-mte-color');
    if (textMteColor) textMteColor.value = this.colorConfig.textColors.mte || '#E91E63';

    const fontFamily = document.getElementById('editor-font-family');
    if (fontFamily) fontFamily.value = (this.colorConfig.fontSettings && this.colorConfig.fontSettings.family) || 'jetbrains-mono';

    const fontSize = document.getElementById('editor-font-size');
    if (fontSize) fontSize.value = (this.colorConfig.fontSettings && this.colorConfig.fontSettings.size) || 15;
    
    // Carregar cores de fundo se os elementos existirem
    if (this.colorConfig.backgroundColors) {
        const bg = this.colorConfig.backgroundColors;
        if (document.getElementById('bg-hex-content-color')) {
            document.getElementById('bg-hex-content-color').value = this.rgbaToHex(bg.hexContent);
        }
        if (document.getElementById('bg-hex-line-color')) {
            document.getElementById('bg-hex-line-color').value = this.rgbaToHex(bg.hexLine);
        }
        if (document.getElementById('bg-hex-line-hover-color')) {
            document.getElementById('bg-hex-line-hover-color').value = this.rgbaToHex(bg.hexLineHover);
        }
        if (document.getElementById('bg-ascii-content-color')) {
            document.getElementById('bg-ascii-content-color').value = this.rgbaToHex(bg.asciiContent);
        }
        if (document.getElementById('bg-ascii-line-color')) {
            document.getElementById('bg-ascii-line-color').value = this.rgbaToHex(bg.asciiLine);
        }
        if (document.getElementById('bg-ascii-line-hover-color')) {
            document.getElementById('bg-ascii-line-hover-color').value = this.rgbaToHex(bg.asciiLineHover);
        }
    }
    
    // Carregar hex customizados
    this.updateCustomHexList();
    
    // Inicializar interface de cores de marcação
    this.initializeHighlightColorUI();
},

updateColorPreviews() {
    if (!document.getElementById('hex-nulls-preview')) return;
    // Atualizar previews hex - com verificação de segurança
    const hexNullsPreview = document.getElementById('hex-nulls-preview');
    if (hexNullsPreview) hexNullsPreview.style.color = this.colorConfig.hexColors.nulls;
    
    const hexNumbersPreview = document.getElementById('hex-numbers-preview');
    if (hexNumbersPreview) hexNumbersPreview.style.color = this.colorConfig.hexColors.numbers;
    
    const hexLettersPreview = document.getElementById('hex-letters-preview');
    if (hexLettersPreview) hexLettersPreview.style.color = this.colorConfig.hexColors.letters;
    
    const hexSpecialPreview = document.getElementById('hex-special-preview');
    if (hexSpecialPreview) hexSpecialPreview.style.color = this.colorConfig.hexColors.special;
    
    // Atualizar previews de texto - com verificação de segurança
    const textNumbersPreview = document.getElementById('text-numbers-preview');
    if (textNumbersPreview) textNumbersPreview.style.color = this.colorConfig.textColors.numbers;
    
    const textLettersPreview = document.getElementById('text-letters-preview');
    if (textLettersPreview) textLettersPreview.style.color = this.colorConfig.textColors.letters;
    
    const textPunctuationPreview = document.getElementById('text-punctuation-preview');
    if (textPunctuationPreview) textPunctuationPreview.style.color = this.colorConfig.textColors.punctuation;
    
    const textSpacesPreview = document.getElementById('text-spaces-preview');
    if (textSpacesPreview) textSpacesPreview.style.color = this.colorConfig.textColors.spaces;
    
    const textTagsPreview = document.getElementById('text-tags-preview');
    if (textTagsPreview) textTagsPreview.style.color = this.colorConfig.textColors.tags;

    const textDtePreview = document.getElementById('text-dte-preview');
    if (textDtePreview) textDtePreview.style.color = this.colorConfig.textColors.dte || '#9C27B0';

    const textMtePreview = document.getElementById('text-mte-preview');
    if (textMtePreview) textMtePreview.style.color = this.colorConfig.textColors.mte || '#E91E63';

    const fontPreview = document.getElementById('font-preview-sample');
    if (fontPreview && this.getEditorFontCssStack) {
        const fontSettings = this.colorConfig.fontSettings || { family: 'jetbrains-mono', size: 15 };
        fontPreview.style.fontFamily = this.getEditorFontCssStack(fontSettings.family);
        fontPreview.style.fontSize = `${fontSettings.size}px`;
        fontPreview.style.lineHeight = `${Math.max(18, fontSettings.size + 4)}px`;
    }
    
    // Atualizar previews de fundo se existirem
    if (this.colorConfig.backgroundColors) {
        const bg = this.colorConfig.backgroundColors;
        if (document.getElementById('bg-hex-content-preview')) {
            document.getElementById('bg-hex-content-preview').style.background = bg.hexContent;
        }
        if (document.getElementById('bg-hex-line-preview')) {
            document.getElementById('bg-hex-line-preview').style.background = bg.hexLine;
        }
        if (document.getElementById('bg-hex-line-hover-preview')) {
            document.getElementById('bg-hex-line-hover-preview').style.background = bg.hexLineHover;
        }
        if (document.getElementById('bg-ascii-content-preview')) {
            document.getElementById('bg-ascii-content-preview').style.background = bg.asciiContent;
        }
        if (document.getElementById('bg-ascii-line-preview')) {
            document.getElementById('bg-ascii-line-preview').style.background = bg.asciiLine;
        }
        if (document.getElementById('bg-ascii-line-hover-preview')) {
            document.getElementById('bg-ascii-line-hover-preview').style.background = bg.asciiLineHover;
        }
    }
},

updateHexColor(type, color) {
    this.colorConfig.hexColors[type] = color;
    this.updateColorPreviews();
    this.applyHexColors();
    
    // Forçar re-renderização para mostrar as mudanças imediatamente
    this.completeRenderWithColors(this.currentScrollPercent, true);
},

updateTextColor(type, color) {
    this.colorConfig.textColors[type] = color;
    this.updateColorPreviews();
    this.applyTextColors();
    
    // Forçar re-renderização para mostrar as mudanças imediatamente
    this.completeRenderWithColors(this.currentScrollPercent, true);
},

resetHexColor(type) {
    // Usar as cores originais do preset ativo (se disponíveis) ou fallback para padrão
    const presetColors = this.originalHexColors || {
        nulls: '#ff6b35',
        numbers: '#ffffff',
        letters: '#ffffff',
        special: '#ffffff'
    };
    
    this.colorConfig.hexColors[type] = presetColors[type];
    const colorInput = document.getElementById(`hex-${type}-color`);
    if (colorInput) colorInput.value = presetColors[type];
    this.updateColorPreviews();
    this.applyHexColors();
    
    // Forçar re-renderização para mostrar as mudanças imediatamente
    this.completeRenderWithColors(this.currentScrollPercent, true);
},

resetTextColor(type) {
    const defaultColors = {
        numbers: '#2196F3',
        letters: '#ffffff',
        punctuation: '#ffd700',
        spaces: '#666666',
        tags: '#9C27B0',
        dte: '#9C27B0',
        mte: '#E91E63'
    };
    
    this.colorConfig.textColors[type] = defaultColors[type];
    document.getElementById(`text-${type}-color`).value = defaultColors[type];
    this.updateColorPreviews();
    this.applyTextColors();
    
    // Forçar re-renderização para mostrar as mudanças imediatamente
    this.completeRenderWithColors(this.currentScrollPercent, true);
},

updateOffsetColor(color) {
    this.colorConfig.offsetColor = color;
    this.updateColorPreviews();
    this.applyOffsetColors();
    this.completeRenderWithColors(this.currentScrollPercent, true);
},

resetOffsetColor() {
    const defaultOffsetColor = this.originalOffsetColor || '#ffd700';
    this.colorConfig.offsetColor = defaultOffsetColor;
    const offsetColor = document.getElementById('offset-color');
    if (offsetColor) offsetColor.value = defaultOffsetColor;
    this.updateColorPreviews();
    this.applyOffsetColors();
    this.completeRenderWithColors(this.currentScrollPercent, true);
},

selectHighlightColor(colorName) {
    // Remover seleção anterior
    document.querySelectorAll('.color-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Selecionar nova cor
    const selectedOption = document.querySelector(`[data-color="${colorName}"]`);
    if (selectedOption) {
        selectedOption.classList.add('selected');
    }
    
    // Atualizar cor atual
    this.currentHighlightColor = colorName;
    
    // Aplicar nova cor a todas as marcações existentes
    this.applyHighlightColors();
    
    // Salvar preferência
    this.saveHighlightColorPreference();
    
    // Mostrar notificação
    this.showNotification(`Cor das marcações alterada para: ${this.getHighlightColorDisplayName(colorName)}`, 'success');
},

getHighlightColorDisplayName(colorName) {
    const names = {
        default: 'Padrão (Azul)',
        red: 'Vermelho',
        green: 'Verde',
        purple: 'Roxo',
        orange: 'Laranja',
        pink: 'Rosa'
    };
    return names[colorName] || colorName;
},

applyHighlightColors() {
    // Re-renderizar para aplicar novas cores
    if (this.highlights.size > 0) {
        this.completeRenderWithColors(this.currentScrollPercent, true);
    }
},

saveHighlightColorPreference() {
    try {
        localStorage.setItem('foxyHighlightColor', this.currentHighlightColor);
    } catch (e) {
    }
},

loadHighlightColorPreference() {
    try {
        const savedColor = localStorage.getItem('foxyHighlightColor');
        if (savedColor && this.highlightColorPresets[savedColor]) {
            this.currentHighlightColor = savedColor;
        }
    } catch (e) {
    }
},

initializeHighlightColorUI() {
    if (!document.querySelector('.color-option')) return;
    // Selecionar cor atual
    const currentOption = document.querySelector(`[data-color="${this.currentHighlightColor}"]`);
    if (currentOption) {
        currentOption.classList.add('selected');
    }
},

addCustomHex(hexVal, colorVal) {
    let hex;
    let color;
    if (typeof hexVal === 'string' && colorVal != null) {
        hex = hexVal.toUpperCase();
        color = colorVal;
    } else {
        const hexInput = document.getElementById('custom-hex-input');
        const colorInput = document.getElementById('custom-hex-color');
        if (!hexInput || !colorInput) return;
        hex = hexInput.value.toUpperCase();
        color = colorInput.value;
    }

    if (hex.match(/^[0-9A-F]{2}$/)) {
        // Garantir que hexColors.custom existe
        if (!this.colorConfig.hexColors.custom) {
            this.colorConfig.hexColors.custom = {};
        }
        this.colorConfig.hexColors.custom[hex] = color;
        this.updateCustomHexList();
        this.applyHexColors();
        
        // Forçar re-renderização para mostrar as mudanças imediatamente
        this.completeRenderWithColors(this.currentScrollPercent, true);

        const hexInput = document.getElementById('custom-hex-input');
        if (hexInput) {
            hexInput.value = '';
            hexInput.focus();
        }
    } else {
        alert('Por favor, insira um valor hex válido (ex: 00, FF, AB)');
    }
},

removeCustomHex(hex) {
    delete this.colorConfig.hexColors.custom[hex];
    this.updateCustomHexList();
    this.applyHexColors();
    
    // Forçar re-renderização para mostrar as mudanças imediatamente
    this.completeRenderWithColors(this.currentScrollPercent, true);
},

updateCustomHexList() {
    const container = document.getElementById('custom-hex-list');
    if (!container) return;
    container.innerHTML = '';
    
    Object.entries(this.colorConfig.hexColors.custom).forEach(([hex, color]) => {
        const item = document.createElement('div');
        item.className = 'custom-hex-item';
        item.innerHTML = `
            <span class="hex-value">${hex}</span>
            <input type="color" value="${color}" onchange="hexEditor.updateCustomHexColor('${hex}', this.value)">
            <span class="color-preview" style="color: ${color}">${hex}</span>
            <button class="remove-btn" onclick="hexEditor.removeCustomHex('${hex}')">X</button>
        `;
        container.appendChild(item);
    });
},

updateCustomHexColor(hex, color) {
    this.colorConfig.hexColors.custom[hex] = color;
    this.applyHexColors();
    
    // Forçar re-renderização para mostrar as mudanças imediatamente
    this.completeRenderWithColors(this.currentScrollPercent, true);
},

applyHexColors() {
    // Aplicar cores em tempo real aos bytes hex
    document.querySelectorAll('.hex-byte').forEach(span => {
        const offset = parseInt(span.dataset.offset);
        if (!isNaN(offset) && offset >= 0 && offset < this.getDataLength()) {
            const byte = this.getByteAt(offset);
            const color = this.getHexColor(byte);
            span.style.color = color;
        }
    });
},

applyTextColors() {
    // Aplicar cores em tempo real ao texto decodificado
    document.querySelectorAll('[data-panel="ascii"]').forEach(span => {
        const char = span.textContent;
        const color = this.getTextColor(char);
        span.style.color = color;
    });
},

updateBackgroundColor(type, color) {
    if (!this.colorConfig.backgroundColors) {
        this.colorConfig.backgroundColors = {};
    }
    
    // Converter hex para rgba se necessário
    this.colorConfig.backgroundColors[type] = color;
    
    this.applyBackgroundColors();
    
    // Forçar re-renderização para mostrar as mudanças imediatamente
    this.completeRenderWithColors(this.currentScrollPercent, true);
},

updateBackgroundColorHex(type, color) {
    if (!this.colorConfig.backgroundColors) {
        this.colorConfig.backgroundColors = {};
    }
    
    this.colorConfig.backgroundColors[type] = color;
    this.applyBackgroundColors();
    
    // Forçar re-renderização para mostrar as mudanças imediatamente
    this.completeRenderWithColors(this.currentScrollPercent, true);
},

updateEditorFontFamily(family) {
    if (!this.colorConfig.fontSettings) {
        this.colorConfig.fontSettings = { family: 'jetbrains-mono', size: 15 };
    }

    const allowed = ['jetbrains-mono', 'source-code-pro', 'arimo', 'roboto', 'system-mono'];
    this.colorConfig.fontSettings.family = allowed.includes(family) ? family : 'jetbrains-mono';
    this.applyEditorFontSettings();
    this.updateColorPreviews();
    this.completeRenderWithColors(this.currentScrollPercent, true);
},

updateEditorFontSize(size) {
    if (!this.colorConfig.fontSettings) {
        this.colorConfig.fontSettings = { family: 'jetbrains-mono', size: 15 };
    }

    const parsed = Number(size);
    this.colorConfig.fontSettings.size = Math.max(12, Math.min(18, Number.isFinite(parsed) ? parsed : 15));
    this.applyEditorFontSettings();
    this.updateColorPreviews();
    this.completeRenderWithColors(this.currentScrollPercent, true);
},

resetEditorFont() {
    this.colorConfig.fontSettings = {
        family: 'jetbrains-mono',
        size: 15
    };
    this.loadColorConfigToUI();
    this.applyEditorFontSettings();
    this.updateColorPreviews();
    this.completeRenderWithColors(this.currentScrollPercent, true);
},

resetBackgroundColor(type) {
    const defaultBackgroundColors = {
        hexContent: '#1a1a2e',
        hexLine: 'transparent',
        hexLineHover: 'rgba(255, 107, 53, 0.08)',
        asciiContent: '#1a1a2e',
        asciiLine: 'transparent',
        asciiLineHover: 'rgba(255, 107, 53, 0.08)'
    };
    
    if (defaultBackgroundColors[type]) {
        this.colorConfig.backgroundColors[type] = defaultBackgroundColors[type];
        this.loadColorConfigToUI();
        this.applyBackgroundColors();
        
        // Forçar re-renderização para mostrar as mudanças imediatamente
        this.completeRenderWithColors(this.currentScrollPercent, true);
    }
},

hexToRgba(hex, alpha = 1) {
    // Remover # se presente
    hex = hex.replace('#', '');
    
    // Converter hex para rgb
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
},

});
