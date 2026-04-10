Object.assign(FoxyHexEditorComplete.prototype, {
changeCharTable() {
const select = document.getElementById('char-table-select');
if (!select) return;

if (select.value === 'custom') {
this.showCharTableModal();
} else {
this.currentCharTable = select.value;
this.getActive16BitDecoder();
this.normalizeSelectionForCurrentTable();
this.updateCharGrid({ force: true });
this.render();
this.updateStatus();
}
},

showCharTableModal() {
const modal = document.getElementById('char-table-modal');
if (modal) {
modal.classList.add('show');
}
},

hideCharTableModal() {
const modal = document.getElementById('char-table-modal');
if (modal) {
modal.classList.remove('show');
}
},

selectCharTable(tableId) {
document.querySelectorAll('#char-table-list .analysis-section').forEach(section => {
section.style.borderLeftColor = '#ff6b35';
});

event.target.closest('.analysis-section').style.borderLeftColor = '#ffd700';
this.selectedCharTable = tableId;
},

applyCharTable() {
if (this.selectedCharTable) {
    this.currentCharTable = this.selectedCharTable;
    const select = document.getElementById('char-table-select');
    if (select) select.value = this.selectedCharTable;

    this.getActive16BitDecoder();
    this.normalizeSelectionForCurrentTable();
    this.updateCharGrid({ force: true });
    this.updateTableDisplay();
    this.render();
    this.updateStatus();
}
this.hideCharTableModal();
},

loadCustomCharTable() {
    const applyLoadedTable = (content, fileLabel) => {
        const ext = String(fileLabel || '').toLowerCase().split('.').pop();
        const data = this.parseCharacterTableFile(content, fileLabel);

        if (!this.validateFoxyTableFormat(data)) {
            window.notificationSystem.error('Formato de tabela inválido.\n\nUse um arquivo .json ou .tbl com mapeamentos válidos.', 'Formato Inválido');
            return;
        }

        // Armazenar formato original da tabela
        data._originalFormat = ext === 'json' ? 'json' : 'tbl';
        data._isImported = true;

        this.installCustomCharacterTable(data, 'custom');
        this.currentCharTable = 'custom';
        this.getActive16BitDecoder();
        this.normalizeSelectionForCurrentTable();
        this.updateCharGrid({ force: true });
        this.updateTableDisplay();
        this.render();
        this.updateStatus();
        this.hideCharTableModal();
    };

    if (typeof require !== 'undefined' && typeof process !== 'undefined') {
        const { ipcRenderer } = require('electron');

        ipcRenderer.invoke('show-open-dialog', {
            title: 'Carregar Tabela',
            filters: [
                { name: 'Tabela', extensions: ['json', 'tbl'] },
            ]
        }).then(result => {
            if (!result.canceled && result.filePaths.length > 0) {
                const filePath = result.filePaths[0];
                const fs = require('fs');
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    applyLoadedTable(content, filePath);
                } catch (error) {
                    window.notificationSystem.error('Erro ao carregar tabela: ' + error.message, 'Erro de Carregamento');
                }
            }
        }).catch(error => {
            window.notificationSystem.error('Erro ao abrir diálogo: ' + error.message, 'Erro de Diálogo');
        });
    } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.tbl';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    applyLoadedTable(e.target.result, file.name);
                } catch (error) {
                    window.notificationSystem.error('Erro ao carregar tabela: ' + error.message, 'Erro de Carregamento');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }
},

validateFoxyTableFormat(data) {
if (!data.name || !data.type || !data.mappings) {
    return false;
}

// Tipos válidos base (e compostos)
const validTypes = ['8-bit', '16-bit', 'UTF-16', 'DTE', 'MTE', 'DTE+MTE', 'shift-jis', 'shift_jis'];
const isValidType = validTypes.includes(data.type) || 
                    (data.type && data.type.includes && 
                     (data.type.includes('8-bit') || data.type.includes('16-bit')));
if (!isValidType) {
    return false;
}

// Verificar se há mapeamentos ou DTE/MTE sequences
const hasMappings = typeof data.mappings === 'object' && Object.keys(data.mappings).length > 0;
const hasDTE = data.dte_sequences && Object.keys(data.dte_sequences).length > 0;
const hasMTE = data.mte_sequences && Object.keys(data.mte_sequences).length > 0;

if (!hasMappings && !hasDTE && !hasMTE) {
    return false;
}

return true;
},

processFoxyTable(data) {
const table = {};

if (data.type === '16-bit' || data.type === 'UTF-16') {
    table._is16bit = true;
    table._endianness = data.endianness || 'LE';
    table._mappings = {};

    Object.entries(data.mappings).forEach(([hexCode, character]) => {
        if (hexCode.length === 4) {
            const codeValue = parseInt(hexCode, 16);
            table._mappings[codeValue] = character;
        }
    });

    for (let i = 0; i < 256; i++) {
        if (i >= 32 && i <= 126) {
            table[i] = String.fromCharCode(i);
        } else {
            table[i] = '.';
        }
    }
} else if (data.type === 'shift-jis' || data.type === 'shift_jis' || (data.type && data.type.includes && (data.type.includes('shift-jis') || data.type.includes('shift_jis')))) {
    table._isShiftJIS = true;
    table._mappings = data.mappings || {};
    table._originalType = data.type;
    table.mappings = data.mappings || {};

    for (let i = 0; i < 256; i++) {
        const hexCode = i.toString(16).toUpperCase().padStart(2, '0');
        if (data.mappings && data.mappings[hexCode]) {
            table[i] = data.mappings[hexCode];
        } else if (i >= 32 && i <= 126) {
            table[i] = String.fromCharCode(i);
        } else {
            table[i] = '.';
        }
    }

    table._doubleByteMap = {};
    Object.entries(data.mappings || {}).forEach(([hexCode, char]) => {
        if (hexCode.length === 4) {
            table._doubleByteMap[hexCode] = char;
        }
    });
} else {
    Object.entries(data.mappings).forEach(([hexCode, character]) => {
        let byteValue;

        if (hexCode.length === 2) {
            byteValue = parseInt(hexCode, 16);
        } else {
            return;
        }

        if (character.startsWith('\\') && character.length === 2) {
            switch (character[1]) {
                case '\\': table[byteValue] = '\\'; break;
                case 'n': table[byteValue] = '\n'; break;
                case 'r': table[byteValue] = '\r'; break;
                case 't': table[byteValue] = '\t'; break;
                default: table[byteValue] = character;
            }
        } else if (character.startsWith('<') && character.endsWith('>')) {
            table[byteValue] = character;
        } else {
            table[byteValue] = character;
        }

        if (data.type === 'DTE' || data.type === 'MTE' || data.type === 'DTE+MTE') {
            table[hexCode] = character;
        }
    });
}

return table;
},

isShiftJISTable(table) {
    if (!table) return false;

    if (table.type === 'shift-jis' || table.type === 'shift_jis' || (table.type && table.type.includes && (table.type.includes('shift-jis') || table.type.includes('shift_jis')))) {
        return true;
    }

    if (table.mappings) {
        const has4DigitHex = Object.keys(table.mappings).some(key =>
            key.length === 4 && /^[0-9A-Fa-f]{4}$/.test(key)
        );

        const hasJapaneseChars = Object.values(table.mappings).some(char =>
            /[\u3040-\u309F\u30A0-\u30FF\uFF00-\uFFEF]/.test(char)
        );

        return has4DigitHex && hasJapaneseChars;
    }

    return false;
},

debugShiftJISTable() {
    const currentTable = this.charTables[this.currentCharTable];
    if (currentTable) {
    }
},

});
