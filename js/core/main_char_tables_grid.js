Object.assign(FoxyHexEditorComplete.prototype, {
clearCharGrid() {
const grid = document.getElementById('char-grid');
if (!grid) return;
grid.innerHTML = '';
},

updateCharGrid(options = {}) {
const grid = document.getElementById('char-grid');
if (!grid) return;
const force = !!options.force;
if (!force) {
    this.clearCharGrid();
    return;
}

const container = document.getElementById('char-table-container');
const isJapaneseChar = (value) => /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uFF66-\uFF9F]/.test(String(value || ''));
const getSidebarCharColor = (value) => isJapaneseChar(value) ? '#FF9800' : '#FFFFFF';

grid.innerHTML = '';
const currentTable = this.charTables[this.currentCharTable];

let maxContentLength = 1;
if (currentTable) {
    if (currentTable.mapping) {
        Object.values(currentTable.mapping).forEach(char => {
            if (char && char.length > maxContentLength) {
                maxContentLength = char.length;
            }
        });
    }

    if (currentTable.mte_sequences) {
        Object.values(currentTable.mte_sequences).forEach(sequence => {
            if (sequence && sequence.length > maxContentLength) {
                maxContentLength = sequence.length;
            }
        });
    }

    if (currentTable.dte_sequences) {
        Object.values(currentTable.dte_sequences).forEach(sequence => {
            if (sequence && sequence.length > maxContentLength) {
                maxContentLength = sequence.length;
            }
        });
    }

    if (currentTable.tag_sequences) {
        Object.values(currentTable.tag_sequences).forEach(sequence => {
            if (sequence && sequence.length > maxContentLength) {
                maxContentLength = sequence.length;
            }
        });
    }

    if (this.charDecoder16 && this.charDecoder16.mapping) {
        Object.values(this.charDecoder16.mapping).forEach(character => {
            if (character && character.length > maxContentLength) {
                maxContentLength = character.length;
            }
        });
    }

    Object.values(this.charTables).forEach(table => {
        if (table && table.mapping) {
            Object.values(table.mapping).forEach(char => {
                if (char && char.length > maxContentLength) {
                    maxContentLength = char.length;
                }
            });
        }
    });
}

const gap = 10;
const availableWidth = Math.max(140, (container ? container.clientWidth : grid.clientWidth) - 24);
let preferredCellWidth = 30;
let maxGridColumns = 16;

if (maxContentLength >= 5) {
    preferredCellWidth = 52;
    maxGridColumns = 8;
} else if (maxContentLength >= 3) {
    preferredCellWidth = 40;
    maxGridColumns = 10;
}

let gridColumns = Math.floor((availableWidth + gap) / (preferredCellWidth + gap));
gridColumns = Math.max(4, Math.min(maxGridColumns, gridColumns));

grid.style.gridTemplateColumns = `repeat(${gridColumns}, minmax(0, 1fr))`;

if (currentTable && (currentTable.type === '16-bit' || currentTable.type === 'UTF-16')) {
    if (this.charDecoder16 && this.charDecoder16.mapping) {
        const mappings = this.charDecoder16.mapping;

        for (let i = 0; i < 256; i++) {
            const cell = document.createElement('div');
            cell.className = 'char-cell';

            let foundChar = null;
            let foundHexCode = null;

            for (const [hexCode, character] of Object.entries(mappings)) {
                if (hexCode.length === 4) {
                    const codeValue = parseInt(hexCode, 16);
                    let highByte;

                    if (this.charDecoder16.endianness === "LE") {
                        highByte = (codeValue >> 8) & 0xFF;
                    } else {
                        highByte = codeValue & 0xFF;
                    }

                    if (highByte === i) {
                        foundChar = character;
                        foundHexCode = hexCode;
                        break;
                    }
                }
            }

            if (foundChar !== null && foundChar !== undefined) {
                cell.textContent = foundChar;
                cell.title = `0x${foundHexCode} = "${foundChar}"`;
                cell.style.color = getSidebarCharColor(foundChar);
            } else {
                cell.textContent = '.';
                cell.title = `0x${i.toString(16).toUpperCase().padStart(2, '0')} = "."`;
            }

            cell.onclick = () => this.selectCharCell(i);
            grid.appendChild(cell);
        }
    } else {
        for (let i = 0; i < 256; i++) {
            const cell = document.createElement('div');
            cell.className = 'char-cell';
            cell.textContent = '.';
            cell.title = `0x${i.toString(16).toUpperCase().padStart(2, '0')} = "."`;
            cell.onclick = () => this.selectCharCell(i);
            grid.appendChild(cell);
        }
    }
} else if (currentTable && (currentTable.type === 'DTE' || currentTable.type === 'DTE+MTE')) {
    const table = currentTable.mapping || {};
    const dteSequences = currentTable.dte_sequences || {};
    const mteSequences = currentTable.mte_sequences || {};

    for (let i = 0; i < 256; i++) {
        const cell = document.createElement('div');
        cell.className = 'char-cell';

        const hexCode = i.toString(16).toUpperCase().padStart(2, '0');
        let char = table[i] || '?';
        let title = `0x${hexCode} = "${char}"`;

        if (dteSequences[hexCode]) {
            const sequence = dteSequences[hexCode];
            char = sequence;
            title = `0x${hexCode} = "${sequence}" (DTE)`;
            cell.classList.add('dte-cell');
            cell.classList.add('shift-jis-2byte');
        } else if (mteSequences[hexCode]) {
            const sequence = mteSequences[hexCode];
            char = sequence;
            title = `0x${hexCode} = "${sequence}" (MTE)`;
            cell.classList.add('mte-cell');
            cell.classList.add('shift-jis-2byte');
        } else if (currentTable.mappings && currentTable.mappings[hexCode]) {
            char = currentTable.mappings[hexCode];
            title = `0x${hexCode} = "${char}" (original)`;
            cell.style.color = getSidebarCharColor(char);
        } else if (table[i]) {
            char = table[i];
            cell.style.color = getSidebarCharColor(char);
        } else {
            char = '.';
        }

        cell.textContent = char;
        cell.title = title;
        cell.onclick = () => this.selectCharCell(i);
        grid.appendChild(cell);
    }
} else if (currentTable && currentTable.type === 'MTE') {
    const table = currentTable.mapping || {};
    const mteSequences = currentTable.mte_sequences || {};

    for (let i = 0; i < 256; i++) {
        const cell = document.createElement('div');
        cell.className = 'char-cell';

        const hexCode = i.toString(16).toUpperCase().padStart(2, '0');
        let char = table[i] || '?';
        let title = `0x${hexCode} = "${char}"`;

        if (mteSequences[hexCode]) {
            const sequence = mteSequences[hexCode];
            char = sequence;
            title = `0x${hexCode} = "${sequence}" (MTE)`;
            cell.classList.add('mte-cell');
            cell.classList.add('shift-jis-2byte');
        } else if (currentTable.mappings && currentTable.mappings[hexCode]) {
            char = currentTable.mappings[hexCode];
            title = `0x${hexCode} = "${char}" (original)`;
            cell.style.color = getSidebarCharColor(char);
        } else if (table[i]) {
            char = table[i];
            cell.style.color = getSidebarCharColor(char);
        } else {
            char = '.';
        }

        cell.textContent = char;
        cell.title = title;
        cell.onclick = () => this.selectCharCell(i);
        grid.appendChild(cell);
    }
} else if (this.isShiftJISTable(currentTable)) {
    const mappings = currentTable.mappings || {};
    const shiftJisColumns = Math.max(4, Math.min(8, Math.floor((availableWidth + gap) / (34 + gap))));
    grid.style.gridTemplateColumns = `repeat(${shiftJisColumns}, minmax(0, 1fr))`;

    const singleByteChars = {};
    const doubleByteChars = {};

    Object.entries(mappings).forEach(([hexCode, character]) => {
        if (hexCode.length === 2) {
            singleByteChars[hexCode] = character;
        } else if (hexCode.length === 4) {
            doubleByteChars[hexCode] = character;
        }
    });

    for (let i = 32; i <= 126; i++) {
        const hexCode = i.toString(16).toUpperCase().padStart(2, '0');
        const cell = document.createElement('div');
        cell.className = 'char-cell';

        let char = String.fromCharCode(i);
        let title = `0x${hexCode} = "${char}" (ASCII)`;
        let cellColor = '#ffffff';

        if (singleByteChars[hexCode]) {
            char = singleByteChars[hexCode];
            title = `0x${hexCode} = "${char}" (Shift-JIS 1-byte)`;
            cellColor = getSidebarCharColor(char);
        }

        cell.textContent = char;
        cell.title = title;
        cell.style.color = cellColor;
        cell.onclick = () => this.selectCharCell(i);
        grid.appendChild(cell);
    }

    Object.entries(doubleByteChars).forEach(([hexCode, character]) => {
        const cell = document.createElement('div');
        cell.className = 'char-cell shift-jis-2byte';

        const char = character;
        const title = `0x${hexCode} = "${char}" (Shift-JIS 2-byte)`;

        cell.textContent = char;
        cell.title = title;
        cell.style.color = getSidebarCharColor(char);
        cell.style.fontSize = '14px';
        cell.style.fontWeight = 'bold';

        const bytePos = parseInt(hexCode.substring(0, 2), 16);
        cell.onclick = () => this.selectCharCell(bytePos);

        grid.appendChild(cell);
    });

    const totalCells = grid.children.length;
    const targetCells = shiftJisColumns * Math.max(12, Math.ceil(grid.children.length / shiftJisColumns));

    for (let i = totalCells; i < targetCells; i++) {
        const cell = document.createElement('div');
        cell.className = 'char-cell empty-cell';
        cell.textContent = '·';
        cell.title = 'Célula vazia';
        cell.style.color = '#666666';
        cell.style.opacity = '0.3';
        grid.appendChild(cell);
    }
} else if (currentTable && currentTable.mapping) {
    const table = currentTable.mapping;
    for (let i = 0; i < 256; i++) {
        const cell = document.createElement('div');
        cell.className = 'char-cell';
        const hexCode = i.toString(16).toUpperCase().padStart(2, '0');
        let char = table[i] || '?';

        cell.textContent = char;
        cell.title = `0x${hexCode} = "${table[i] || '?'}"`;
        cell.style.color = getSidebarCharColor(char);
        cell.onclick = () => this.selectCharCell(i);
        grid.appendChild(cell);
    }
} else {
    const table = currentTable ? currentTable.mapping : null;

    for (let i = 0; i < 256; i++) {
        const cell = document.createElement('div');
        cell.className = 'char-cell';

        const hexCode = i.toString(16).toUpperCase().padStart(2, '0');
        let char = '?';
        let title = `0x${hexCode} = "?"`;
        if (table && table[i]) {
            char = table[i];
            title = `0x${hexCode} = "${char}"`;
            cell.style.color = getSidebarCharColor(char);
        } else {
            char = '.';
            title = `0x${hexCode} = "."`;
        }

        cell.textContent = char;
        cell.title = title;
        cell.onclick = () => this.selectCharCell(i);
        grid.appendChild(cell);
    }
}

},

updateTableDisplay() {
const tableDisplay = document.getElementById('current-table');
if (tableDisplay && this.charTables && this.charTables[this.currentCharTable]) {
    const currentTable = this.charTables[this.currentCharTable];
    let displayText = currentTable.name || 'Unknown';

    if ((currentTable.type === 'MTE' || currentTable.type === 'DTE+MTE') && currentTable.mte_sequences) {
        const mteCount = Object.keys(currentTable.mte_sequences).length;
        if (mteCount > 0) {
            displayText += ` (${mteCount} MTE)`;
        }
    }

    if ((currentTable.type === 'DTE' || currentTable.type === 'DTE+MTE') && currentTable.dte_sequences) {
        const dteCount = Object.keys(currentTable.dte_sequences).length;
        if (dteCount > 0) {
            displayText += ` (${dteCount} DTE)`;
        }
    }

    if (currentTable.type === 'DTE+MTE') {
        const dteCount = Object.keys(currentTable.dte_sequences || {}).length;
        const mteCount = Object.keys(currentTable.mte_sequences || {}).length;
        if (dteCount > 0 && mteCount > 0) {
            displayText += ` (${dteCount} DTE + ${mteCount} MTE)`;
        }
    }

    // Mostrar contagem de tag sequences se existirem
    if (currentTable.tag_sequences && Object.keys(currentTable.tag_sequences).length > 0) {
        const tagCount = Object.keys(currentTable.tag_sequences).length;
        displayText += ` (${tagCount} TAG)`;
    }

    if ((currentTable.type === 'shift-jis' || currentTable.type === 'shift_jis') && currentTable.mappings) {
        const mappingsCount = Object.keys(currentTable.mappings).length;
        if (mappingsCount > 0) {
            displayText += ` (${mappingsCount} Shift-JIS)`;
        }
    }

    tableDisplay.textContent = displayText;
}
},

selectCharCell(byteValue) {
document.querySelectorAll('.char-cell').forEach(cell => cell.classList.remove('selected'));

const cells = document.querySelectorAll('.char-cell');
if (cells[byteValue]) {
cells[byteValue].classList.add('selected');
}

const currentTable = this.charTables[this.currentCharTable];
if (currentTable && (currentTable.type === 'MTE' || currentTable.type === 'DTE+MTE') && currentTable.mte_sequences) {
    const hexCode = byteValue.toString(16).toUpperCase().padStart(2, '0');
    const mteSequence = currentTable.mte_sequences[hexCode];
    if (mteSequence) {
    }
}

if (currentTable && (currentTable.type === 'DTE' || currentTable.type === 'DTE+MTE') && currentTable.dte_sequences) {
    const hexCode = byteValue.toString(16).toUpperCase().padStart(2, '0');
    const dteSequence = currentTable.dte_sequences[hexCode];
    if (dteSequence) {
    }
}

this.goToByteValue(byteValue);
},

goToByteValue(byteValue) {
for (let i = 0; i < this.getDataLength(); i++) {
if (this.getByteAt(i) === byteValue) {
    this.setCursor(i, null, false);
    this.ensureCursorVisible();
    break;
}
}
}
});
