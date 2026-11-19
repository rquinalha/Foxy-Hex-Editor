Object.assign(FoxyHexEditorComplete.prototype, {
applyCharColorAdvanced(character) {
if (!this.useCharColors) {
    return '#81c784'; // Verde original quando cores desativadas
}

// Special handling for tag characters to ensure they're always visible
if (character === '<' || character === '>' || character === '[' || character === ']') {
    return '#FFFFFF'; // White for tag characters
}

// Special handling for tag sequences (like <00>, <01>, etc.)
if (character.includes('<') || character.includes('>') || character.includes('[') || character.includes(']')) {
    return '#FFFFFF'; // White for tag sequences
}

if (this.isLetter(character)) {
    return '#4CAF50'; // Verde para letras
} else if (character >= '0' && character <= '9') {
    return '#2196F3'; // Azul para números
} else if (this.isSymbol(character)) {
    return '#FFD700'; // Amarelo para símbolos
} else {
    return '#FFFFFF'; // Branco para outros caracteres
}
},

applyHexByteColors(hexSpan, byte) {
    const color = this.getHexColor(byte);
    hexSpan.style.color = color;
},

getOffsetColor() {
    return (this.colorConfig && this.colorConfig.offsetColor) || '#ffd700';
},

applyOffsetColors() {
    const offsetColor = this.getOffsetColor();
    document.documentElement.style.setProperty('--editor-offset-color', offsetColor);

    document.querySelectorAll('.hex-offset, .offset').forEach((element) => {
        element.style.color = offsetColor;
    });
},

applyTextColorsToSpan(textSpan, char) {
    const color = this.getTextColor(char);
    textSpan.style.color = color;
},

isHexNullOrTerminator(byte, hexString) {
    // Verificar se é um null ou terminador comum
    const nullsAndTerminators = [0x00, 0xFF, 0xFE, 0xFD, 0xFC, 0xFB, 0xFA, 0xF9, 0xF8];
    
    return nullsAndTerminators.includes(byte) || hexString === '00';
},

getHexColor(byte) {
    const hexString = byte.toString(16).toUpperCase().padStart(2, '0');
    
    // Verificar hex customizado primeiro (definido pelo usuário)
    if (this.colorConfig.hexColors.custom[hexString]) {
        return this.colorConfig.hexColors.custom[hexString];
    }

    if (this.isHexNullOrTerminator(byte, hexString)) {
        return this.colorConfig.hexColors.special;
    }

    if (/[A-F]/.test(hexString)) {
        return this.colorConfig.hexColors.letters;
    }

    if (/^[0-9]{2}$/.test(hexString)) {
        return this.colorConfig.hexColors.numbers;
    }

    return this.colorConfig.hexColors.special;
},

getTextColor(char) {
    if (/^[0-9]+$/.test(char)) {
        return this.colorConfig.textColors.numbers;
    } else if (/^[a-zA-Z�-�]+$/.test(char)) {
        return this.colorConfig.textColors.letters;
    } else if (/^[.,!?;:'"()\-\[\]{}@#$%&*+=/\\|<>~`^]+$/.test(char)) {
        return this.colorConfig.textColors.punctuation;
    } else if (char === ' ' || char === '\t' || char === '\n') {
        return this.colorConfig.textColors.spaces;
    } else if (char.includes('<') || char.includes('>') || char.includes('[') || char.includes(']')) {
        return this.colorConfig.textColors.tags;
    }
    
    return this.colorConfig.textColors.letters; // Padrão
},

applyColorChanges() {
    this.saveColorConfig();
    this.saveHighlightColorPreference();
    this.renderColorConfig();
},

renderColorConfig() {
    this.applyOffsetColors();
    this.applyBackgroundColors();
    this.applyEditorFontSettings();
    this.completeRenderWithColors(this.currentScrollPercent, true);
},

getEditorFontCssStack(family) {
    const stacks = {
        'jetbrains-mono': '"JetBrains Mono Local", "JetBrains Mono", monospace',
        'source-code-pro': '"Source Code Pro Local", "Source Code Pro", monospace',
        'arimo': '"Arimo Local", Arimo, sans-serif',
        'roboto': '"Roboto Local", Roboto, sans-serif',
        'system-mono': 'Consolas, "Cascadia Mono", "Courier New", monospace'
    };
    return stacks[family] || stacks['jetbrains-mono'];
},

applyEditorFontSettings() {
    if (!this.colorConfig) return;
    if (!this.colorConfig.fontSettings) {
        this.colorConfig.fontSettings = { family: 'jetbrains-mono', size: 15 };
    }

    const family = this.colorConfig.fontSettings.family || 'jetbrains-mono';
    const size = Math.max(12, Math.min(18, Number(this.colorConfig.fontSettings.size) || 15));
    const root = document.documentElement;
    root.style.setProperty('--editor-font-family', this.getEditorFontCssStack(family));
    root.style.setProperty('--editor-font-size', `${size}px`);
    root.style.setProperty('--editor-line-height', `${Math.max(20, size + 5)}px`);
    root.style.setProperty('--editor-row-height', `${Math.max(32, size + 17)}px`);
},

applyBackgroundColors() {
    const bg = this.colorConfig.backgroundColors;
    const style = document.documentElement.style;
    style.setProperty('--editor-hex-background', bg.hexContent);
    style.setProperty('--editor-hex-line-background', bg.hexLine);
    style.setProperty('--editor-hex-hover-background', bg.hexLineHover);
    style.setProperty('--editor-ascii-background', bg.asciiContent);
    style.setProperty('--editor-ascii-line-background', bg.asciiLine);
    style.setProperty('--editor-ascii-hover-background', bg.asciiLineHover);
    style.setProperty('--editor-track-background', bg.track || '');
},

rgbaToHex(rgba) {
    if (rgba.startsWith('#')) return rgba;
    
    // Extrair valores RGBA
    const rgbaMatch = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!rgbaMatch) return '#000000';
    
    const r = parseInt(rgbaMatch[1]);
    const g = parseInt(rgbaMatch[2]);
    const b = parseInt(rgbaMatch[3]);
    const a = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;
    
    // Converter para hex
    const hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    return hex;
},

decodeTextAtOffset(offset, length = 16) {
    const currentTable = this.charTables && this.charTables[this.currentCharTable];
    const tagSequences = currentTable?.tag_sequences || {};
    const hasTagSequences = Object.keys(tagSequences).length > 0;

    // Fast path for ASCII table (most common case) - apenas se NÃO tiver tag sequences
    if (this.currentCharTable === 'ascii' && !hasTagSequences) {
        let result = '';
        let i = offset;
        const endOffset = Math.min(offset + length, this.getDataLength());

        while (i < endOffset) {
            const byte = this.getByteAt(i);
            result += byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.';
            i++;
        }
        return result;
    }

    if (!currentTable) {
        // Fallback to basic ASCII
        let result = '';
        const endOffset = Math.min(offset + length, this.getDataLength());
        for (let i = offset; i < endOffset; i++) {
            const byte = this.getByteAt(i);
            result += byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.';
        }
        return result;
    }

    const isShiftJIS = !!(currentTable && (((currentTable.type && currentTable.type.includes && (currentTable.type.includes('shift-jis') || currentTable.type.includes('shift_jis')))) || currentTable._isShiftJIS === true));
    if (isShiftJIS && typeof this.decodeBytesWithCurrentTable === 'function') {
        return this.decodeBytesWithCurrentTable(Array.from(this.getRangeAt(offset, length)));
    }

    let result = '';
    let i = 0;

    while (i < length && (offset + i) < this.getDataLength()) {
        const currentOffset = offset + i;
        const byte = this.getByteAt(currentOffset);
        const hexCode = byte.toString(16).toUpperCase().padStart(2, '0');

        let decoded = null;
        let sequenceLength = 1;

        // PRIORIDADE 1: Verificar tag sequences multi-byte (ex: 0F10=[NEW])
        if (hasTagSequences) {
            const maxSeqBytes = Math.min(4, length - i, this.getDataLength() - currentOffset);
            for (let len = maxSeqBytes; len >= 2; len--) {
                const hexSeq = Array.from({length: len}, (_, idx) =>
                    this.getByteAt(currentOffset + idx).toString(16).toUpperCase().padStart(2, '0')
                ).join('');
                if (tagSequences[hexSeq]) {
                    decoded = tagSequences[hexSeq];
                    sequenceLength = len;
                    break;
                }
            }
        }

        const hasDTE = !!(currentTable.dte_sequences && Object.keys(currentTable.dte_sequences).length > 0);
        const hasMTE = !!(currentTable.mte_sequences && Object.keys(currentTable.mte_sequences).length > 0);
        const is16BitType = currentTable.type === '16-bit' || currentTable.type === 'UTF-16' ||
            (currentTable.type && currentTable.type.includes && currentTable.type.includes('16-bit'));

        // PRIORIDADE 2: Check for DTE sequences
        if (!decoded && hasDTE && currentTable.dte_sequences[hexCode]) {
            decoded = currentTable.dte_sequences[hexCode];
            sequenceLength = 1; // DTE uses 1 byte to represent 2+ characters
        }
        // PRIORIDADE 3: Check for MTE sequences
        else if (!decoded && hasMTE && currentTable.mte_sequences[hexCode]) {
            decoded = currentTable.mte_sequences[hexCode];
            sequenceLength = 1; // MTE uses 1 byte to represent multiple characters
        }
        // PRIORIDADE 4: Check for original mappings
        else if (!decoded && currentTable.mappings && currentTable.mappings[hexCode]) {
            decoded = currentTable.mappings[hexCode];
            sequenceLength = 1;
        }
        // PRIORIDADE 5: Check for 16-bit sequences (incluindo DTE/MTE em 16-bit)
        else if (!decoded && is16BitType && this.getActive16BitDecoder()) {
            if (currentOffset + 1 < this.getDataLength()) {
                // Use the 16-bit decoder directly (já inclui DTE/MTE se configurado)
                const decodedText = this.getActive16BitDecoder().decode(this.getRangeAt(currentOffset, 2), 0, 1);
                if (decodedText && decodedText !== '.') {
                    decoded = decodedText;
                    sequenceLength = 2;
                }
            }
        }
        // PRIORIDADE 6: Check for regular mappings
        else if (!decoded && currentTable.mapping && currentTable.mapping[byte]) {
            decoded = currentTable.mapping[byte];
            sequenceLength = 1;
        }
        // PRIORIDADE 7: Fallback: try using hexCode as key
        else if (!decoded && currentTable.mapping && currentTable.mapping[hexCode]) {
            decoded = currentTable.mapping[hexCode];
            sequenceLength = 1;
        }

        if (decoded) {
            result += decoded;
            i += sequenceLength;
        } else {
            // Fallback to ASCII
            result += byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.';
            i += 1;
        }
    }
    
    return result;
}
});
