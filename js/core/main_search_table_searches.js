Object.assign(FoxyHexEditorComplete.prototype, {
// Shift-JIS text search using current table mappings
searchTextShiftJIS(text, caseSensitive = false, wholeWord = false) {
    const currentTable = this.charTables && this.currentCharTable ? this.charTables[this.currentCharTable] : null;
    if (!currentTable || !currentTable.mappings || !text) return [];

    // Convert the search text into Shift-JIS bytes using table mappings
    const searchBytes = this.textToShiftJISBytes(text, caseSensitive);
    if (!searchBytes || searchBytes.length === 0) return [];

    // Whole word check is not strictly defined for Shift-JIS; accept as found
    return this.searchByteSequence(searchBytes, {
        type: 'text_shiftjis',
        wholeWord,
        decodedWholeWord: !!wholeWord
    });
},

// Search text using custom 8-bit table
searchTextCustomTable(text, caseSensitive = false, wholeWord = false) {
    const currentTable = this.charTables && this.currentCharTable ? this.charTables[this.currentCharTable] : null;
    if (!currentTable || (!currentTable.mappings && !currentTable.mapping) || !text) return [];

    // Convert the search text into bytes using custom table mappings
    const searchBytes = this.textToCustomTableBytes(text, caseSensitive);
    if (!searchBytes || searchBytes.length === 0) return [];

    return this.searchByteSequence(searchBytes, {
        type: 'text_custom',
        wholeWord,
        decodedWholeWord: !!wholeWord
    });
},

searchText16bit(text, caseSensitive = false, wholeWord = false) {

if (!this.charDecoder16 || !text || text.length === 0) {
    return [];
}

// Normalize search text based on case sensitivity
const searchText = caseSensitive ? text : text.toLowerCase();
const searchLength = text.length;

// Search through the data byte by byte
for (let i = 0; i <= this.getDataLength() - (searchLength * 2); i += 2) {
    let match = true;
    let decodedText = '';
    
    // Try to decode characters starting from this position
    for (let j = 0; j < searchLength; j++) {
        const byteOffset = i + (j * 2);
        if (byteOffset + 1 >= this.getDataLength()) {
            match = false;
            break;
        }
        
        // Decode one character using the 16-bit decoder
        const decodedChar = this.charDecoder16.decode(this.getRangeAt(byteOffset, 2), 0, 1);
        if (!decodedChar || decodedChar === '.') {
            match = false;
            break;
        }
        
        // Compare with search text character
        const searchChar = searchText[j];
        const decodedCharNormalized = caseSensitive ? decodedChar : decodedChar.toLowerCase();
        
        if (decodedCharNormalized !== searchChar) {
            match = false;
            break;
        }
        
        decodedText += decodedChar;
    }
    
    if (match) {
        
        // Check for whole word match if required
        if (wholeWord) {
            const isWordBoundary = this.isWholeWordResultLocal({
                offset: i,
                length: searchLength * 2
            });
            if (!isWordBoundary) {
                continue; // Skip this match if it's not a whole word
            }
        }
        
        this.searchResults.push({
            offset: i,
            length: searchLength * 2, // 2 bytes per character
            type: 'text_16bit'
        });
    }
}

this.emit('searchComplete', this.searchResults);
return this.searchResults;
},

textTo16bitPattern(text, caseSensitive = false) {
if (!this.charDecoder16) {

return null;
}
const pattern = [];
const searchText = text;
for (let i = 0; i < searchText.length; i++) {
const char = searchText[i];
let found = false;
for (const [hex, mappedChar] of Object.entries(this.charDecoder16.mapping)) {
    if (
        (caseSensitive && mappedChar === char) ||
        (!caseSensitive && mappedChar.toLowerCase() === char.toLowerCase())
    ) {
        // Gera o padrão usando o hex da tabela
        const byte1 = parseInt(hex.substr(0, 2), 16);
        const byte2 = parseInt(hex.substr(2, 2), 16);
        pattern.push(byte1, byte2);
        found = true;
        break;
    }
}
if (!found) {
    
    return null;
}
}
return pattern;
},

isWordBoundary16bit(offset, length) {
// Check if the match is at a word boundary for 16-bit characters
// A word boundary means:
// - Before the match: not a word character (space, punctuation, start of data)
// - After the match: not a word character (space, punctuation, end of data)

const isWordChar16bit = (byteOffset) => {
if (byteOffset + 1 >= this.getDataLength()) return false;

// Use the 16-bit decoder to get the character
const decodedChar = this.charDecoder16.decode(this.getRangeAt(byteOffset, 2), 0, 1);
if (!decodedChar || decodedChar === '.') return false;

// Word characters: letters, numbers, underscore
return /[a-zA-Z0-9_]/.test(decodedChar);
};

// Check character before the match
const beforeOffset = offset > 1 ? offset - 2 : -1;
const beforeIsWord = beforeOffset >= 0 ? isWordChar16bit(beforeOffset) : false;

// Check character after the match
const afterOffset = offset + length;
const afterIsWord = afterOffset + 1 < this.getDataLength() ? isWordChar16bit(afterOffset) : false;

// Word boundary: before is not word char AND after is not word char
return !beforeIsWord && !afterIsWord;
},
});

