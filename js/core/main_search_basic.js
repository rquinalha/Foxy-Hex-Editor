Object.assign(FoxyHexEditorComplete.prototype, {
buildSearchableTextMap() {
const dataLength = this.getDataLength();
const table = typeof this.getCurrentCharacterTable === 'function'
    ? this.getCurrentCharacterTable()
    : (this.charTables && this.currentCharTable ? this.charTables[this.currentCharTable] : null);
const textParts = [];
const map = [];
const pushDecoded = (decoded, offset, length) => {
    const safeText = String(decoded ?? '.');
    for (let i = 0; i < safeText.length; i++) {
        textParts.push(safeText[i]);
        map.push({ offset, length });
    }
};

if (!table || this.currentCharTable === 'ascii') {
    for (let offset = 0; offset < dataLength; offset++) {
        const byte = this.getByteAt(offset);
        pushDecoded(byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.', offset, 1);
    }
    return { text: textParts.join(''), map };
}

const is16BitType = table.type === '16-bit' || table.type === 'UTF-16' ||
    (table.type && table.type.includes && table.type.includes('16-bit'));
const active16BitDecoder = (is16BitType && typeof this.getActive16BitDecoder === 'function')
    ? this.getActive16BitDecoder()
    : null;

if (is16BitType && active16BitDecoder) {
    for (let offset = 0; offset < dataLength; offset += 2) {
        const remaining = dataLength - offset;
        const length = remaining >= 2 ? 2 : 1;
        const bytes = this.getRangeAt(offset, length);
        let decoded = '.';
        if (length === 2 && typeof active16BitDecoder.decode === 'function') {
            decoded = active16BitDecoder.decode(bytes, 0, 1) || '.';
        }
        pushDecoded(decoded, offset, length);
    }
    return { text: textParts.join(''), map };
}

const isShiftJIS = !!(table && ((table.type === 'shift-jis' || table.type === 'shift_jis') || table._isShiftJIS === true));
const sequenceEntries = [];
const pushEntry = (hex, value) => {
    const text = String(value ?? '');
    if (!hex || !text || text === '.') return;
    const normalizedHex = String(hex).toUpperCase();
    if (!/^[0-9A-F]+$/.test(normalizedHex) || normalizedHex.length % 2 !== 0) return;
    sequenceEntries.push({
        hex: normalizedHex,
        length: normalizedHex.length / 2,
        text
    });
};

Object.entries(table.tag_sequences || {}).forEach(([hex, value]) => pushEntry(hex, value));
Object.entries(table.dte_sequences || {}).forEach(([hex, value]) => pushEntry(hex, value));
Object.entries(table.mte_sequences || {}).forEach(([hex, value]) => pushEntry(hex, value));
Object.entries(table.mappings || {}).forEach(([hex, value]) => pushEntry(hex, value));
if (table.mapping) {
    Object.entries(table.mapping).forEach(([key, value]) => {
        if (/^\d+$/.test(key)) {
            pushEntry(Number(key).toString(16).toUpperCase().padStart(2, '0'), value);
        } else if (/^[0-9A-F]{2,8}$/i.test(key)) {
            pushEntry(key, value);
        }
    });
}
sequenceEntries.sort((a, b) => b.length - a.length);

let offset = 0;
while (offset < dataLength) {
    let matched = null;
    for (const entry of sequenceEntries) {
        if (offset + entry.length > dataLength) continue;
        const bytes = this.getRangeAt(offset, entry.length);
        const hex = Array.from(bytes, (b) => b.toString(16).toUpperCase().padStart(2, '0')).join('');
        if (hex === entry.hex) {
            matched = entry;
            break;
        }
    }

    if (matched) {
        pushDecoded(matched.text, offset, matched.length);
        offset += matched.length;
        continue;
    }

    const b1 = this.getByteAt(offset);
    const hex1 = b1.toString(16).toUpperCase().padStart(2, '0');

    if (isShiftJIS && offset + 1 < dataLength) {
        const b2 = this.getByteAt(offset + 1);
        const pairHex = hex1 + b2.toString(16).toUpperCase().padStart(2, '0');
        const pairMapped = (table.mappings && table.mappings[pairHex]) ||
            (table.tag_sequences && table.tag_sequences[pairHex]) ||
            (table.dte_sequences && table.dte_sequences[pairHex]) ||
            (table.mte_sequences && table.mte_sequences[pairHex]);
        if (pairMapped) {
            pushDecoded(pairMapped, offset, 2);
            offset += 2;
            continue;
        }
        if (typeof iconvLite !== 'undefined' && iconvLite && typeof isShiftJisPair === 'function' && isShiftJisPair(b1, b2)) {
            const decodedPair = iconvLite.decode(Buffer.from([b1, b2]), 'shift_jis');
            if (decodedPair && decodedPair !== '?') {
                pushDecoded(decodedPair, offset, 2);
                offset += 2;
                continue;
            }
        }
    }

    const singleMapped = (table.mappings && table.mappings[hex1]) ||
        (table.tag_sequences && table.tag_sequences[hex1]) ||
        (table.dte_sequences && table.dte_sequences[hex1]) ||
        (table.mte_sequences && table.mte_sequences[hex1]) ||
        (table.mapping && (table.mapping[b1] || table.mapping[hex1]));
    if (singleMapped) {
        pushDecoded(singleMapped, offset, 1);
        offset += 1;
        continue;
    }

    if (b1 >= 32 && b1 <= 126) {
        pushDecoded(String.fromCharCode(b1), offset, 1);
        offset += 1;
        continue;
    }

    if (isShiftJIS && typeof iconvLite !== 'undefined' && iconvLite) {
        const decodedSingle = iconvLite.decode(Buffer.from([b1]), 'shift_jis');
        pushDecoded(decodedSingle && decodedSingle !== '?' ? decodedSingle : '.', offset, 1);
        offset += 1;
        continue;
    }

    pushDecoded('.', offset, 1);
    offset += 1;
}

return { text: textParts.join(''), map };
},

isSimpleByteSearchTable(table = null) {
const currentTable = table || (typeof this.getCurrentCharacterTable === 'function'
    ? this.getCurrentCharacterTable()
    : (this.charTables && this.currentCharTable ? this.charTables[this.currentCharTable] : null));

if (!currentTable || this.currentCharTable === 'ascii' || this.charDecoder16) {
    return false;
}

if ((currentTable.type === 'shift-jis' || currentTable.type === 'shift_jis') || currentTable._isShiftJIS === true) {
    return false;
}

if (Object.keys(currentTable.tag_sequences || {}).length > 0 ||
    Object.keys(currentTable.dte_sequences || {}).length > 0 ||
    Object.keys(currentTable.mte_sequences || {}).length > 0) {
    return false;
}

const entries = [];
if (currentTable.mappings && typeof currentTable.mappings === 'object') {
    entries.push(...Object.entries(currentTable.mappings));
}
if (currentTable.mapping && typeof currentTable.mapping === 'object') {
    entries.push(...Object.entries(currentTable.mapping));
}

if (entries.length === 0) {
    return false;
}

return entries.every(([key, value]) => {
    const normalizedKey = /^\d+$/.test(String(key))
        ? Number(key).toString(16).toUpperCase().padStart(2, '0')
        : String(key).replace(/^0x/i, '').trim().toUpperCase();
    return /^[0-9A-F]{2}$/.test(normalizedKey) && typeof value === 'string' && value.length === 1;
});
},

getDirectByteCompatibleSearchBytes(text, caseSensitive = false, table = null) {
const currentTable = table || (typeof this.getCurrentCharacterTable === 'function'
    ? this.getCurrentCharacterTable()
    : (this.charTables && this.currentCharTable ? this.charTables[this.currentCharTable] : null));

if (!currentTable || this.currentCharTable === 'ascii' || this.charDecoder16) {
    return null;
}

if ((currentTable.type === 'shift-jis' || currentTable.type === 'shift_jis') || currentTable._isShiftJIS === true) {
    return null;
}

const encoded = typeof this.textToCustomTableBytes === 'function'
    ? this.textToCustomTableBytes(text, caseSensitive)
    : null;
if (!Array.isArray(encoded) || encoded.length !== text.length) {
    return null;
}

for (let i = 0; i < text.length; i++) {
    const originalCode = text.charCodeAt(i);
    if (originalCode > 0xFF) {
        return null;
    }

    if (caseSensitive) {
        if (encoded[i] !== originalCode) {
            return null;
        }
        continue;
    }

    const lowerCode = text[i].toLowerCase().charCodeAt(0);
    const upperCode = text[i].toUpperCase().charCodeAt(0);
    if (lowerCode > 0xFF || upperCode > 0xFF) {
        return null;
    }

    const byte = encoded[i];
    if (byte !== originalCode && byte !== lowerCode && byte !== upperCode) {
        return null;
    }
}

return new Uint8Array(encoded);
},

isDecodedWordChar(char) {
if (!char) return false;
try {
    return /[\p{L}\p{N}_]/u.test(char);
} catch (_) {
    return /[A-Za-z0-9_]/.test(char);
}
},

isWholeWordResult(result, searchable = null) {
if (!result || typeof result.offset !== 'number' || typeof result.length !== 'number') {
    return false;
}

const searchableText = searchable || this.buildSearchableTextMap();
const text = searchableText?.text || '';
const map = searchableText?.map || [];
if (!text || !Array.isArray(map) || map.length === 0) {
    return false;
}

const matchStart = result.offset;
const matchEndExclusive = result.offset + result.length;
let startIndex = -1;
let endIndex = -1;

for (let i = 0; i < map.length; i++) {
    const entry = map[i];
    if (!entry) continue;
    const entryStart = entry.offset;
    const entryEnd = entry.offset + entry.length;
    if (startIndex === -1 && entryStart >= matchStart) {
        startIndex = i;
    }
    if (entryStart < matchEndExclusive) {
        endIndex = i;
    }
    if (entryStart >= matchEndExclusive && startIndex !== -1) {
        break;
    }
    if (entryEnd > matchEndExclusive && startIndex !== -1) {
        break;
    }
}

if (startIndex === -1 || endIndex === -1 || startIndex > endIndex) {
    return false;
}

const beforeChar = startIndex > 0 ? text[startIndex - 1] : '';
const afterChar = endIndex + 1 < text.length ? text[endIndex + 1] : '';
return !this.isDecodedWordChar(beforeChar) && !this.isDecodedWordChar(afterChar);
},

getWholeWordDecodeWindow() {
if (this.charDecoder16) {
    return 2;
}

const table = typeof this.getCurrentCharacterTable === 'function'
    ? this.getCurrentCharacterTable()
    : (this.charTables && this.currentCharTable ? this.charTables[this.currentCharTable] : null);

if (!table || this.currentCharTable === 'ascii') {
    return 1;
}

let maxBytes = 1;
const considerEntries = (entries) => {
    Object.keys(entries || {}).forEach((key) => {
        const normalizedKey = /^\d+$/.test(String(key))
            ? Number(key).toString(16).toUpperCase().padStart(2, '0')
            : String(key).replace(/^0x/i, '').trim().toUpperCase();
        if (/^[0-9A-F]+$/.test(normalizedKey) && normalizedKey.length % 2 === 0) {
            maxBytes = Math.max(maxBytes, normalizedKey.length / 2);
        }
    });
};

considerEntries(table.mappings);
considerEntries(table.mapping);
considerEntries(table.tag_sequences);
considerEntries(table.dte_sequences);
considerEntries(table.mte_sequences);

if ((table.type === 'shift-jis' || table.type === 'shift_jis') || table._isShiftJIS === true) {
    maxBytes = Math.max(maxBytes, 2);
}

return Math.min(Math.max(maxBytes, 1), 16);
},

getDecodedBoundaryCharacter(offset, side = 'before') {
const dataLength = this.getDataLength();
if (typeof offset !== 'number' || offset < 0 || offset > dataLength) {
    return '';
}

if (!this.charDecoder16 && this.currentCharTable === 'ascii') {
    if (side === 'before') {
        if (offset <= 0) return '';
        const byte = this.getByteAt(offset - 1);
        return byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '';
    }
    if (offset >= dataLength) return '';
    const byte = this.getByteAt(offset);
    return byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '';
}

const windowSize = this.getWholeWordDecodeWindow();
const start = side === 'before' ? Math.max(0, offset - windowSize) : offset;
const end = side === 'before' ? offset : Math.min(dataLength, offset + windowSize);
const length = end - start;
if (length <= 0) {
    return '';
}

const bytes = Array.from(this.getRangeAt(start, length) || []);
if (bytes.length === 0) {
    return '';
}

let decoded = '';
if (typeof this.decodeBytesWithCurrentTable === 'function') {
    decoded = this.decodeBytesWithCurrentTable(bytes) || '';
} else {
    decoded = String.fromCharCode(...bytes.filter((byte) => byte >= 32 && byte <= 126));
}

if (!decoded) {
    return '';
}

return side === 'before'
    ? (decoded[decoded.length - 1] || '')
    : (decoded[0] || '');
},

isWholeWordResultLocal(result) {
if (!result || typeof result.offset !== 'number' || typeof result.length !== 'number') {
    return false;
}

const beforeChar = this.getDecodedBoundaryCharacter(result.offset, 'before');
const afterChar = this.getDecodedBoundaryCharacter(result.offset + result.length, 'after');
return !this.isDecodedWordChar(beforeChar) && !this.isDecodedWordChar(afterChar);
},

searchByteSequence(searchBytes, options = {}) {
const {
    type = 'hex',
    wholeWord = false,
    asciiCaseInsensitive = false,
    decodedWholeWord = false
} = options;

if (!searchBytes || searchBytes.length === 0) {
    return [];
}

const dataLength = this.getDataLength();
const patternLength = searchBytes.length;

if (dataLength < patternLength) return [];

const badCharTable = this.boyerMooreBadCharShift(searchBytes, asciiCaseInsensitive);
const isWordChar = (b) => (b >= 48 && b <= 57) || (b >= 65 && b <= 90) || (b >= 97 && b <= 122);

const chunkSize = 4 * 1024 * 1024;
const overlap = patternLength - 1;

for (let chunkStart = 0; chunkStart < dataLength; chunkStart += chunkSize) {
    const chunkEnd = Math.min(chunkStart + chunkSize + overlap, dataLength);
    const chunkLen = chunkEnd - chunkStart;

    const chunk = this.getRangeAt(chunkStart, chunkLen);
    if (!chunk || chunk.length < patternLength) continue;

    let i = 0;
    const limit = chunkLen - patternLength;

    while (i <= limit) {
        let j = patternLength - 1;
        let match = true;
        while (j >= 0) {
            let db = chunk[i + j];
            let pb = searchBytes[j];
            if (asciiCaseInsensitive) {
                if (db >= 65 && db <= 90) db += 32;
                if (pb >= 65 && pb <= 90) pb += 32;
            }
            if (db !== pb) { match = false; break; }
            j--;
        }
        if (match) {
            if (wholeWord) {
                if (decodedWholeWord) {
                    const candidate = {
                        offset: chunkStart + i,
                        length: patternLength,
                        type
                    };
                    if (!this.isWholeWordResultLocal(candidate)) { i++; continue; }
                } else {
                    let beforeWord = false;
                    if (i > 0) {
                        beforeWord = isWordChar(chunk[i - 1]);
                    } else if (chunkStart > 0) {
                        beforeWord = isWordChar(this.getByteAt(chunkStart - 1));
                    }
                    
                    const afterWord = i + patternLength < chunkLen && isWordChar(chunk[i + patternLength]);
                    if (beforeWord || afterWord) { i++; continue; }
                }
            }

            this.searchResults.push({
                offset: chunkStart + i,
                length: patternLength,
                type
            });
            i++;
        } else {
            i += Math.max(1, badCharTable[chunk[i + j]] - (patternLength - 1 - j));
        }
    }
}

this.emit('searchComplete', this.searchResults);
return this.searchResults;
},

searchHex(pattern) {
const cleanHex = pattern.replace(/\s+/g, '');

if (cleanHex.length % 2 !== 0) {
    window.notificationSystem.error('Padrão hex inválido: deve ter número par de caracteres', 'Erro de Busca');
    return [];
}

const searchBytes = [];
for (let i = 0; i < cleanHex.length; i += 2) {
const byte = parseInt(cleanHex.substr(i, 2), 16);
if (isNaN(byte)) {
    window.notificationSystem.error('Caracteres hex inválidos', 'Erro de Busca');
    return [];
}
searchBytes.push(byte);
}

return this.searchByteSequence(new Uint8Array(searchBytes), { type: 'hex' });
},

searchRegex(pattern, flags = 'gi') {
try {
const regex = new RegExp(pattern, flags);
const searchable = this.buildSearchableTextMap();
const { text, map } = searchable;
let match;

while ((match = regex.exec(text)) !== null) {
    if (typeof match.index !== 'number' || !match[0] || match[0].length <= 0) {
        if (!flags.includes('g')) break;
        regex.lastIndex += 1;
        continue;
    }
    const startEntry = map[match.index];
    const endEntry = map[match.index + match[0].length - 1];
    if (!startEntry || !endEntry) {
        if (!flags.includes('g')) break;
        continue;
    }
    const endOffsetExclusive = endEntry.offset + endEntry.length;
    this.searchResults.push({
        offset: startEntry.offset,
        length: Math.max(1, endOffsetExclusive - startEntry.offset),
        type: 'regex',
        match: match[0]
    });

    if (flags.includes('g') && match[0].length === 0) {
        regex.lastIndex += 1;
    }

    if (!flags.includes('g')) break;
}

this.emit('searchComplete', this.searchResults);
return this.searchResults;

} catch (error) {
window.notificationSystem.error('Padrão regex inválido: ' + error.message, 'Erro de Busca');
return [];
}
},

dataToString() {
return this.buildSearchableTextMap().text;
},

isWordBoundary(offset, length) {
return this.isWholeWordResultLocal({ offset, length });
},
});
