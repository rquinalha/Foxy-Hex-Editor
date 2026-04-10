Object.assign(FoxyHexEditorComplete.prototype, {
initCharTables() {
return {
    ascii: {
        name: 'ASCII',
        type: '8-bit',
        mapping: this.createASCIITable(),
        mappings: {},
        tag_sequences: {},
        dte_sequences: {},
        mte_sequences: {}
    },
    nes_standard: { name: 'NES Standard', mapping: this.createNESTable() },
    snes_standard: { name: 'SNES Standard', mapping: this.createSNESTable() },
    gb_standard: { name: 'Game Boy', mapping: this.createGBTable() }
};
},

createASCIITable() {
const table = {};
for (let i = 0; i < 256; i++) {
    if (i >= 32 && i <= 126) {
        table[i] = String.fromCharCode(i);
    } else {
        table[i] = '.';
    }
}
return table;
},

createNESTable() {
const table = this.createASCIITable();
table[0x00] = '[END]';
table[0x01] = '[LF]';
table[0x02] = '[WAIT]';
table[0x03] = '[START]';
return table;
},

createSNESTable() {
return this.createASCIITable();
},

createGBTable() {
return this.createASCIITable();
},

setupCharTables() {
if (!this.charTables || Object.keys(this.charTables).length === 0) {
    this.charTables = this.initCharTables();
}
},

setCharTable(tableId) {
if (this.charTables[tableId]) {
    
    this.currentCharTable = tableId;
    this.getActive16BitDecoder();
    this.normalizeSelectionForCurrentTable();
    this.updateCharGrid();
    this.updateTableDisplay();
    this.emit('charTableChange', { 
        tableId, 
        table: this.charTables[tableId] 
    });
    this.render();
    return true;
}

return false;
},

loadSampleData() {
const sampleData = new Uint8Array([
    // NES Header
    0x4E, 0x45, 0x53, 0x1A, 0x02, 0x01, 0x01, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    // Code section
    0xA9, 0x10, 0x8D, 0x00, 0x20, 0xA9, 0x01, 0x8D,
    0x01, 0x20, 0x4C, 0x00, 0x80, 0xEA, 0xEA, 0xEA,
    // Text string "HELLO WORLD!"
    0x48, 0x45, 0x4C, 0x4C, 0x4F, 0x20, 0x57, 0x4F,
    0x52, 0x4C, 0x44, 0x21, 0x00, 0xFF, 0xFF, 0xFF,
    // Additional data
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10
]);

this.loadData(sampleData);

// Add sample bookmarks
this.addBookmarkAt(0x00, 'NES Header', 'Start of iNES header');
this.addBookmarkAt(0x10, 'PRG ROM Start', 'Beginning of program code');
this.addBookmarkAt(0x20, 'Text Data', 'String: "HELLO WORLD!"');
this.addBookmarkAt(0x30, 'Data Section', 'Additional game data');
},

detectROMFormat(force = false) {
// Only detect if forced or if no table is currently set
if (!force && this.currentCharTable !== 'ascii') {
    
    return 'Unknown';
}
let format = 'Desconhecido';
let analysis = {
    format: 'Desconhecido',
    sections: [],
    textStrings: [],
    entropy: 0
};

if (this.getDataLength() >= 4) {
    // NES ROM detection
    if (this.getByteAt(0) === 0x4E && this.getByteAt(1) === 0x45 && 
        this.getByteAt(2) === 0x53 && this.getByteAt(3) === 0x1A) {
        format = 'NES ROM (iNES format)';
        analysis.format = format;
        analysis.sections = this.analyzeNESROM();
        this.setCharTable('nes_standard');
    }
    // SNES ROM detection (more specific)
    else if (this.getDataLength() >= 0x8000) {
        const snesAnalysis = this.analyzeSNESROM();
        if (snesAnalysis && snesAnalysis.length > 0) {
            format = 'SNES ROM';
            analysis.format = format;
            analysis.sections = snesAnalysis;
            this.setCharTable('snes_standard');
        } else {
            // If not a real SNES ROM, keep ASCII as default
            this.setCharTable('ascii');
        }
    }
    // Game Boy ROM detection
    else if (this.getDataLength() >= 0x150 && 
             this.getByteAt(0x104) === 0xCE && this.getByteAt(0x105) === 0xED && 
             this.getByteAt(0x106) === 0x66 && this.getByteAt(0x107) === 0x66) {
        format = 'Game Boy ROM';
        analysis.format = format;
        this.setCharTable('gb_standard');
    } else {
        // Default to ASCII for unknown formats
        this.setCharTable('ascii');
    }
} else {
    // Small files default to ASCII
    this.setCharTable('ascii');
}

this.gameAnalysis = analysis;
        this.updateROMInfoDisplay();
return format;
},

analyzeNESROM() {
const sections = [];

if (this.getDataLength() >= 16) {
    sections.push({
        offset: 0x00,
        name: 'iNES Header',
        size: 16,
        type: 'header',
        description: 'iNES ROM header containing metadata'
    });
    
    const prgSize = this.getByteAt(4) * 16384; // 16KB units
    const chrSize = this.getByteAt(5) * 8192;  // 8KB units
    
    if (prgSize > 0) {
        sections.push({
            offset: 0x10,
            name: 'PRG ROM',
            size: prgSize,
            type: 'code',
            description: `Program code (${prgSize} bytes)`
        });
    }
    
    if (chrSize > 0) {
        sections.push({
            offset: 0x10 + prgSize,
            name: 'CHR ROM',
            size: chrSize,
            type: 'graphics',
            description: `Character graphics (${chrSize} bytes)`
        });
    }
}

return sections;
},

analyzeSNESROM() {
// More specific SNES ROM analysis
const headerLocations = [0x7FC0, 0xFFC0, 0x40FFC0];

for (const location of headerLocations) {
    if (this.getDataLength() > location + 32) {
        const title = this.extractSNESTitle(location);
        // More strict validation for SNES ROM
        if (title && title.length > 5 && title.length <= 21 && 
            /^[A-Za-z0-9\s\-_\.]+$/.test(title)) {
            
            // Additional SNES ROM validation
            const romType = this.getByteAt(location + 21);
            const romSize = this.getByteAt(location + 23);
            const sramSize = this.getByteAt(location + 24);
            
            // Check if ROM type and sizes are reasonable
            if (romType <= 0x0F && romSize <= 0x0F && sramSize <= 0x0F) {
                return [{
                    offset: location,
                    name: 'SNES Header',
                    size: 32,
                    type: 'header',
                    title: title,
                    description: `SNES ROM header: ${title}`
                }];
            }
        }
    }
}

return null;
},

extractSNESTitle(offset) {
const titleBytes = this.getRangeAt(offset, 21);
let title = '';

for (let i = 0; i < titleBytes.length; i++) {
    const byte = titleBytes[i];
    if (byte >= 32 && byte <= 126) {
        title += String.fromCharCode(byte);
    } else if (byte === 0) {
        break;
    }
}

return title.trim();
},
});
