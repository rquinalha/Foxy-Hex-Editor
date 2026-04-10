Object.assign(FoxyHexEditorComplete.prototype, {
// Convert Unicode text to Shift-JIS bytes using current table mappings
textToShiftJISBytes(text, caseSensitive = false) {
    const currentTable = this.charTables && this.currentCharTable ? this.charTables[this.currentCharTable] : null;
    if (!currentTable || !text) return null;

    if (typeof this.encodeTextWithCurrentTable === 'function') {
        const encoded = this.encodeTextWithCurrentTable(text, caseSensitive);
        if (Array.isArray(encoded) && encoded.length > 0) {
            return encoded;
        }
    }

    // Normalizar texto para evitar equivalÃªncias de largura/forma
    try {
        if (typeof text.normalize === 'function') {
            text = text.normalize('NFKC');
        }
    } catch(_) {}

    // Build reverse map: character -> array of byte sequences (prefer exact case)
    // mappings: { '824F': 'ã‚¡', ... } and also single-byte 'A1': 'ï½¡' etc.
    const reverse = new Map();
    for (const [hex, ch] of Object.entries(currentTable.mappings)) {
        const key = caseSensitive ? ch : (typeof ch === 'string' ? ch.toLowerCase() : ch);
        const bytes = [];
        if (hex.length === 2) {
            bytes.push(parseInt(hex, 16));
        } else if (hex.length === 4) {
            bytes.push(parseInt(hex.substr(0, 2), 16), parseInt(hex.substr(2, 2), 16));
        } else {
            continue;
        }
        if (!reverse.has(key)) reverse.set(key, []);
        reverse.get(key).push(bytes);
    }

    const out = [];
    for (let i = 0; i < text.length; i++) {
        const ch = caseSensitive ? text[i] : text[i].toLowerCase();
        const options = reverse.get(ch);
        if (!options || options.length === 0) {
            return null; // unknown char in mapping
        }
        // Choose the first mapping available
        for (const b of options[0]) out.push(b);
    }
    return out;
},

// Convert Unicode text to bytes using custom 8-bit table mappings
textToCustomTableBytes(text, caseSensitive = false) {
    const currentTable = this.charTables && this.currentCharTable ? this.charTables[this.currentCharTable] : null;
    if (!currentTable || (!currentTable.mappings && !currentTable.mapping) || !text) return null;

    if (typeof this.encodeTextWithCurrentTable === 'function') {
        const encoded = this.encodeTextWithCurrentTable(text, caseSensitive);
        if (Array.isArray(encoded) && encoded.length > 0) {
            return encoded;
        }
    }

    // Build reverse map: character -> byte value
    const reverse = new Map();
    
    // Handle both new format (mappings) and old format (mapping)
    if (currentTable.mappings) {
        // New format: mappings is an object like { "4D": "Ã", "4E": "Ã‰", ... }
        for (const [hex, ch] of Object.entries(currentTable.mappings)) {
            const key = caseSensitive ? ch : (typeof ch === 'string' ? ch.toLowerCase() : ch);
            const byteValue = parseInt(hex, 16);
            if (!isNaN(byteValue)) {
                reverse.set(key, byteValue);
            }
        }
    } else if (currentTable.mapping) {
        // Old format: mapping is an array or object indexed by byte values
        if (Array.isArray(currentTable.mapping)) {
            currentTable.mapping.forEach((ch, byteValue) => {
                if (ch) {
                    const key = caseSensitive ? ch : (typeof ch === 'string' ? ch.toLowerCase() : ch);
                    reverse.set(key, byteValue);
                }
            });
        } else {
            // mapping is an object like { 77: "Ã", 78: "Ã‰", ... }
            for (const [byteValue, ch] of Object.entries(currentTable.mapping)) {
                if (ch) {
                    const key = caseSensitive ? ch : (typeof ch === 'string' ? ch.toLowerCase() : ch);
                    reverse.set(key, parseInt(byteValue));
                }
            }
        }
    }

    const out = [];
    for (let i = 0; i < text.length; i++) {
        const ch = caseSensitive ? text[i] : text[i].toLowerCase();
        const byteValue = reverse.get(ch);
        if (byteValue === undefined) {
            // Character not found in table - try fallback to ASCII
            const asciiValue = text.charCodeAt(i);
            if (asciiValue < 256) {
                out.push(asciiValue);
            } else {
                return null; // unknown char in mapping
            }
        } else {
            out.push(byteValue);
        }
    }
    return out;
},

// New function for converting text to 16-bit bytes for replacement
textTo16bitBytes(text) {
    if (!this.charDecoder16 || !text || text.length === 0) {
        return null;
    }

    if (typeof this.charDecoder16.encode === 'function') {
        const encoded = this.charDecoder16.encode(text);
        return encoded instanceof Uint8Array ? Array.from(encoded) : Array.from(encoded || []);
    }

    return null;
},
});

