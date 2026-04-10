(function() {
    let iconvLite = null;
    try {
        if (typeof require !== 'undefined') {
            iconvLite = require('iconv-lite');
        }
    } catch (_) {}

    function parseHexBytes(hex) {
        const clean = String(hex || '').replace(/\s+/g, '').toUpperCase();
        if (!/^[0-9A-F]+$/.test(clean) || clean.length % 2 !== 0) {
            return null;
        }

        const bytes = [];
        for (let i = 0; i < clean.length; i += 2) {
            bytes.push(parseInt(clean.slice(i, i + 2), 16));
        }
        return bytes;
    }

    function bytesToHex(bytes) {
        return Array.from(bytes || [])
            .map((byte) => byte.toString(16).toUpperCase().padStart(2, '0'))
            .join('');
    }

    function looksLikeJapanese(text) {
        return /[\u3040-\u30FF\u3400-\u9FFF\uFF61-\uFF9F]/.test(text || '');
    }

    function isValidShiftJisDecoded(text) {
        if (!text) return false;
        if (text.includes('\uFFFD')) return false;
        if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text)) return false;
        return true;
    }

    function isShiftJisPair(byte1, byte2) {
        const lead = (byte1 >= 0x81 && byte1 <= 0x9F) || (byte1 >= 0xE0 && byte1 <= 0xFC);
        const trail = (byte2 >= 0x40 && byte2 <= 0x7E) || (byte2 >= 0x80 && byte2 <= 0xFC);
        return lead && trail;
    }

    function inferTableEndiannessFromMappings(mappings = {}, fallback = 'BE') {
        let likelyBE = 0;
        let likelyLE = 0;

        Object.entries(mappings).forEach(([hexCode, value]) => {
            const key = String(hexCode || '').replace(/^0x/i, '').trim().toUpperCase();
            const text = String(value ?? '');
            if (!/^[0-9A-F]{4}$/.test(key) || text.length !== 1) return;

            const charCode = text.charCodeAt(0);
            if (charCode < 0x20 || charCode > 0x7E) return;

            const firstByte = parseInt(key.slice(0, 2), 16);
            const secondByte = parseInt(key.slice(2, 4), 16);

            if (firstByte === 0x00 && secondByte === charCode) {
                likelyBE++;
            } else if (firstByte === charCode && secondByte === 0x00) {
                likelyLE++;
            }
        });

        if (likelyLE > likelyBE) return 'LE';
        if (likelyBE > likelyLE) return 'BE';
        return fallback;
    }

    function decodeEscapes(value) {
        return String(value || '')
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\\\/g, '\\');
    }

    Object.assign(FoxyHexEditorComplete.prototype, {
        parseCharacterTableFile(content, fileName = '') {
            const ext = String(fileName || '').toLowerCase().split('.').pop();
            if (ext === 'json') {
                return this.normalizeCharacterTable(JSON.parse(content), fileName);
            }
            if (ext === 'tbl') {
                return this.normalizeCharacterTable(this.parseTblCharacterTable(content, fileName), fileName);
            }

            const trimmed = String(content || '').trim();
            if (trimmed.startsWith('{')) {
                return this.normalizeCharacterTable(JSON.parse(trimmed), fileName);
            }
            return this.normalizeCharacterTable(this.parseTblCharacterTable(content, fileName), fileName);
        },

        parseTblCharacterTable(content, fileName = '') {
            const lines = String(content || '').replace(/^\uFEFF/, '').split(/\r?\n/);
            const data = {
                name: fileName ? String(fileName).replace(/\.[^.]+$/, '') : 'Custom TBL',
                type: null,
                endianness: null,
                mappings: {},
                tag_sequences: {},
                dte_sequences: {},
                mte_sequences: {},
                terminators: []
            };

            for (const rawLine of lines) {
                const line = String(rawLine || '');
                const trimmedLine = line.trim();
                if (!trimmedLine) continue;

                if (/^(;|\/\/)/.test(trimmedLine)) continue;

                const directiveMatch = trimmedLine.match(/^(?:#|!|@)?([A-Za-z_][A-Za-z0-9_\-]*)\s*[:=]\s*(.+)$/);
                if (directiveMatch && !/^[0-9A-Fa-f]{2,8}\s*=/.test(trimmedLine)) {
                    const key = directiveMatch[1].toLowerCase();
                    const value = directiveMatch[2].trim();

                    if (key === 'name' || key === 'table' || key === 'tablename') {
                        data.name = value;
                        continue;
                    }
                    if (key === 'type' || key === 'format' || key === 'encoding') {
                        const normalized = value.toLowerCase();
                        if (normalized.includes('shift')) {
                            data.type = 'shift-jis';
                        } else if (normalized.includes('16')) {
                            data.type = '16-bit';
                        } else if (normalized.includes('dte+mte')) {
                            data.type = 'DTE+MTE';
                        } else if (normalized === 'dte' || normalized === 'mte' || normalized === '8-bit') {
                            data.type = value;
                        }
                        continue;
                    }
                    if (key === 'endian' || key === 'endianness' || key === 'byteorder') {
                        data.endianness = /be/i.test(value) ? 'BE' : 'LE';
                        continue;
                    }
                    if (key === 'terminator' || key === 'terminators' || key === 'end') {
                        value.split(/[,\s]+/).map((item) => item.trim()).filter(Boolean).forEach((item) => {
                            data.terminators.push(item.toUpperCase());
                        });
                        continue;
                    }
                }

                const eqIndex = line.indexOf('=');
                if (eqIndex <= 0) continue;

                const hexCode = line.slice(0, eqIndex).trim().replace(/^0x/i, '').toUpperCase();
                let value = line.slice(eqIndex + 1);
                if (!/^[0-9A-F]{2,8}$/.test(hexCode)) continue;

                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }

                const decodedValue = decodeEscapes(value);
                
                // Tag sequences: hex codes that map to tags like [NEW], {PAGE}, <ICON>
                // Pode ser multi-byte (0F10) ou single-byte (48)
                const isTagSequence = /^[\[<\{(].*[\]>\}]$/.test(decodedValue);
                
                
                if (isTagSequence) {
                    // Qualquer hex code que mapeie para uma tag - store in tag_sequences
                    // Isso inclui tags multi-byte (0F10=[NEW]) e single-byte (48=<PAGE>)
                    data.tag_sequences[hexCode] = decodedValue;
                    // Também adicionar ao mappings para compatibilidade
                    data.mappings[hexCode] = decodedValue;
                } else if (hexCode.length === 2 && decodedValue.length === 2) {
                    // Single-byte hex (8-bit) mapping to 2 chars - DTE
                    data.dte_sequences[hexCode] = decodedValue;
                    data.mappings[hexCode] = decodedValue;
                } else if (hexCode.length === 2 && decodedValue.length > 2) {
                    // Single-byte hex (8-bit) mapping to 3+ chars - MTE
                    data.mte_sequences[hexCode] = decodedValue;
                    data.mappings[hexCode] = decodedValue;
                } else if (hexCode.length === 4 && decodedValue.length === 2) {
                    // Two-byte hex (16-bit) mapping to 2 chars - DTE 16-bit
                    data.dte_sequences[hexCode] = decodedValue;
                    data.mappings[hexCode] = decodedValue;
                } else if (hexCode.length === 4 && decodedValue.length > 2) {
                    // Two-byte hex (16-bit) mapping to 3+ chars - MTE 16-bit
                    data.mte_sequences[hexCode] = decodedValue;
                    data.mappings[hexCode] = decodedValue;
                } else {
                    // Normal mapping
                    data.mappings[hexCode] = decodedValue;
                }
            }

            return data;
        },

        normalizeCharacterTable(data, fileName = '') {
            if (!data || typeof data !== 'object') {
                throw new Error('Tabela inválida');
            }

            // Primeiro, extrair tags/DTE/MTE de mappings que já foram processados
            const extractedTagSequences = {};
            const extractedDteSequences = {};
            const extractedMteSequences = {};
            const remainingMappings = {};
            
            Object.entries(data.mappings || {}).forEach(([hexCode, value]) => {
                const normalizedKey = String(hexCode).replace(/^0x/i, '').trim().toUpperCase();
                if (!/^[0-9A-F]{2,8}$/.test(normalizedKey)) return;
                
                const decodedValue = decodeEscapes(value);
                const valueLength = String(decodedValue).length;
                
                // Detectar se é uma tag (independente do tamanho)
                const isTag = /^[\[<\{(].*[\]>\}]$/.test(decodedValue);
                
                if (isTag) {
                    // Tag: vai para tag_sequences
                    extractedTagSequences[normalizedKey] = decodedValue;
                } else if (normalizedKey.length === 2 && valueLength === 2) {
                    // 8-bit DTE
                    extractedDteSequences[normalizedKey] = decodedValue;
                } else if (normalizedKey.length === 2 && valueLength >= 3) {
                    // 8-bit MTE
                    extractedMteSequences[normalizedKey] = decodedValue;
                } else if (normalizedKey.length === 4 && valueLength === 2) {
                    // 16-bit DTE
                    extractedDteSequences[normalizedKey] = decodedValue;
                } else if (normalizedKey.length === 4 && valueLength >= 3) {
                    // 16-bit MTE
                    extractedMteSequences[normalizedKey] = decodedValue;
                } else {
                    remainingMappings[normalizedKey] = decodedValue;
                }
            });

            const normalized = {
                name: data.name || (fileName ? String(fileName).replace(/\.[^.]+$/, '') : 'Custom'),
                type: data.type || null,
                endianness: /^(BE|LE)$/i.test(String(data.endianness || ''))
                    ? (/BE/i.test(data.endianness) ? 'BE' : 'LE')
                    : inferTableEndiannessFromMappings(data.mappings, 'BE'),
                mappings: remainingMappings,
                terminators: Array.isArray(data.terminators) ? data.terminators.map((item) => String(item).toUpperCase()) : [],
                tag_sequences: { ...(data.tag_sequences || {}), ...extractedTagSequences },
                dte_sequences: { ...(data.dte_sequences || {}), ...extractedDteSequences },
                mte_sequences: { ...(data.mte_sequences || {}), ...extractedMteSequences },
                _originalFormat: data._originalFormat || 'tbl',
                _isImported: data._isImported || false
            };

            if (normalized.type && normalized.type.includes && normalized.type.includes('shift-jis')) {
                Object.assign(normalized.mappings, normalized.dte_sequences || {}, normalized.mte_sequences || {});
                normalized.dte_sequences = {};
                normalized.mte_sequences = {};
            }
            

            if (!normalized.type) {
                const allMappings = { ...remainingMappings, ...normalized.dte_sequences, ...normalized.mte_sequences };
                const keys = Object.keys(allMappings);
                const hasTwoByte = keys.some((key) => key.length === 4);
                const hasEightBit = keys.some((key) => key.length === 2);
                const shiftJisLike = keys.some((key) => key.length === 4 && isShiftJisPair(parseInt(key.slice(0, 2), 16), parseInt(key.slice(2, 4), 16))) &&
                    Object.values(remainingMappings).some((value) => looksLikeJapanese(value));

                // Detectar DTE/MTE para 8-bit e 16-bit
                let hasDTE = false;
                let hasMTE = false;
                Object.entries(allMappings).forEach(([hexCode, value]) => {
                    const valueLength = String(value).length;
                    if ((hexCode.length === 2 || hexCode.length === 4)) {
                        if (valueLength === 2) hasDTE = true;
                        if (valueLength >= 3) hasMTE = true;
                    }
                });

                if (shiftJisLike) {
                    normalized.type = 'shift-jis';
                } else if (hasTwoByte && !hasEightBit) {
                    // 16-bit: verificar se é DTE, MTE, ou DTE+MTE (usando tipos compostos)
                    if (hasDTE && hasMTE) {
                        normalized.type = '16-bit DTE+MTE';
                    } else if (hasDTE) {
                        normalized.type = '16-bit DTE';
                    } else if (hasMTE) {
                        normalized.type = '16-bit MTE';
                    } else {
                        normalized.type = '16-bit';
                    }
                } else if (hasEightBit && !hasTwoByte) {
                    // 8-bit: verificar se é DTE, MTE, ou DTE+MTE (usando tipos compostos)
                    if (hasDTE && hasMTE) {
                        normalized.type = '8-bit DTE+MTE';
                    } else if (hasDTE) {
                        normalized.type = '8-bit DTE';
                    } else if (hasMTE) {
                        normalized.type = '8-bit MTE';
                    } else {
                        normalized.type = '8-bit';
                    }
                } else if (hasDTE && hasMTE) {
                    normalized.type = 'DTE+MTE';
                } else if (hasDTE) {
                    normalized.type = 'DTE';
                } else if (hasMTE) {
                    normalized.type = 'MTE';
                }
            }

            if (normalized.type === 'shift_jis') {
                normalized.type = 'shift-jis';
            } else if (normalized.type && normalized.type.startsWith && normalized.type.startsWith('shift_jis')) {
                normalized.type = normalized.type.replace('shift_jis', 'shift-jis');
            }

            if (normalized.type && normalized.type.includes && normalized.type.includes('shift-jis')) {
                this.enrichShiftJisMappings(normalized);
            }
            

            return normalized;
        },

        enrichShiftJisMappings(table) {
            if (!table || table._shiftJisExpanded) return table;

            table.mappings = table.mappings || {};

            if (iconvLite) {
                for (let byte = 0x20; byte <= 0x7E; byte++) {
                    const hex = byte.toString(16).toUpperCase().padStart(2, '0');
                    if (!table.mappings[hex]) {
                        const decoded = iconvLite.decode(Buffer.from([byte]), 'shift_jis');
                        if (isValidShiftJisDecoded(decoded)) {
                            table.mappings[hex] = decoded;
                        }
                    }
                }

                for (let byte = 0xA1; byte <= 0xDF; byte++) {
                    const hex = byte.toString(16).toUpperCase().padStart(2, '0');
                    if (!table.mappings[hex]) {
                        const decoded = iconvLite.decode(Buffer.from([byte]), 'shift_jis');
                        if (isValidShiftJisDecoded(decoded) && decoded !== '?') {
                            table.mappings[hex] = decoded;
                        }
                    }
                }

                const leadRanges = [[0x81, 0x9F], [0xE0, 0xFC]];
                const trailRanges = [[0x40, 0x7E], [0x80, 0xFC]];
                for (const [leadStart, leadEnd] of leadRanges) {
                    for (let lead = leadStart; lead <= leadEnd; lead++) {
                        for (const [trailStart, trailEnd] of trailRanges) {
                            for (let trail = trailStart; trail <= trailEnd; trail++) {
                                const hex = lead.toString(16).toUpperCase().padStart(2, '0') +
                                    trail.toString(16).toUpperCase().padStart(2, '0');
                                if (!table.mappings[hex]) {
                                    const decoded = iconvLite.decode(Buffer.from([lead, trail]), 'shift_jis');
                                    if (isValidShiftJisDecoded(decoded) && decoded !== '?') {
                                        table.mappings[hex] = decoded;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            table._shiftJisExpanded = true;
            table._isShiftJIS = true;
            return table;
        },

        installCustomCharacterTable(tableData, tableId = 'custom') {
            const data = this.normalizeCharacterTable(tableData, tableData.name || tableId);

            // Verificar se é tipo 16-bit (incluindo tipos compostos como "16-bit DTE")
            const is16BitType = data.type === '16-bit' || data.type === 'UTF-16' || 
                               (data.type && data.type.includes && data.type.includes('16-bit')) ||
                               data.type === 'DTE' || data.type === 'MTE' || data.type === 'DTE+MTE';
            
            if (is16BitType) {
                this.charDecoder16 = new CharDecoder16bit(data);
                this.charTables[tableId] = {
                    name: data.name || 'Custom 16-bit',
                    type: data.type,
                    endianness: data.endianness || 'LE',
                    _endianness: data.endianness || 'LE',
                    terminators: data.terminators || [],
                    mappings: data.mappings || {},
                    tag_sequences: data.tag_sequences || {},
                    dte_sequences: data.dte_sequences || {},
                    mte_sequences: data.mte_sequences || {},
                    _originalFormat: data._originalFormat || 'tbl',
                    _isImported: data._isImported || false
                };
            } else if (data.type === 'shift-jis' || (data.type && data.type.includes && data.type.includes('shift-jis'))) {
                this.charDecoder16 = null;
                this.enrichShiftJisMappings(data);
                this.charTables[tableId] = {
                    name: data.name || 'Custom Shift-JIS',
                    type: data.type || 'shift-jis',
                    endianness: data.endianness || 'LE',
                    terminators: data.terminators || [],
                    mappings: data.mappings || {},
                    tag_sequences: data.tag_sequences || {},
                    dte_sequences: data.dte_sequences || {},
                    mte_sequences: data.mte_sequences || {},
                    _isShiftJIS: true,
                    _originalFormat: data._originalFormat || 'tbl',
                    _isImported: data._isImported || false
                };
            } else {
                const processedTable = this.processFoxyTable(data);
                this.charDecoder16 = null;
                this.charTables[tableId] = {
                    name: data.name || 'Custom',
                    type: data.type || '8-bit',
                    mapping: processedTable,
                    mappings: data.mappings || {},
                    endianness: data.endianness || 'LE',
                    terminators: data.terminators || [],
                    tag_sequences: data.tag_sequences || {},
                    dte_sequences: data.dte_sequences || {},
                    mte_sequences: data.mte_sequences || {},
                    _originalFormat: data._originalFormat || 'tbl',
                    _isImported: data._isImported || false
                };
            }

            return this.charTables[tableId];
        },

        getCurrentCharacterTable() {
            return this.charTables && this.currentCharTable ? this.charTables[this.currentCharTable] : null;
        },

        isCurrentTableShiftJIS() {
            const table = this.getCurrentCharacterTable();
            return !!(table && (((table.type && table.type.includes && (table.type.includes('shift-jis') || table.type.includes('shift_jis')))) || table._isShiftJIS === true));
        },

        decodeBytesWithCurrentTable(inputBytes) {
            const bytes = inputBytes instanceof Uint8Array ? inputBytes : new Uint8Array(inputBytes || []);
            const table = this.getCurrentCharacterTable();
            if (!table || bytes.length === 0) return '';

            const is16BitType = table.type === '16-bit' || table.type === 'UTF-16' ||
                (table.type && table.type.includes && table.type.includes('16-bit'));
            const active16BitDecoder = (is16BitType && typeof this.getActive16BitDecoder === 'function')
                ? this.getActive16BitDecoder()
                : null;

            if (is16BitType && active16BitDecoder) {
                return active16BitDecoder.decode(bytes, 0, Infinity);
            }

            if (this.isCurrentTableShiftJIS()) {
                let result = '';
                let i = 0;
                const tagSequences = table.tag_sequences || {};
                while (i < bytes.length) {
                    const b1 = bytes[i];
                    const hex1 = b1.toString(16).toUpperCase().padStart(2, '0');

                    if (Object.keys(tagSequences).length > 0) {
                        const maxSeqBytes = Math.min(4, bytes.length - i);
                        let matched = false;
                        for (let len = maxSeqBytes; len >= 2; len--) {
                            const hexSeq = bytes.slice(i, i + len)
                                .map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
                                .join('');
                            if (tagSequences[hexSeq]) {
                                result += tagSequences[hexSeq];
                                i += len;
                                matched = true;
                                break;
                            }
                        }
                        if (matched) {
                            continue;
                        }
                    }

                    const specialSingleByte = tagSequences[hex1] ||
                        (table.dte_sequences && table.dte_sequences[hex1]) ||
                        (table.mte_sequences && table.mte_sequences[hex1]);
                    if (specialSingleByte) {
                        result += specialSingleByte;
                        i += 1;
                        continue;
                    }

                    if (b1 >= 0x20 && b1 <= 0x7E) {
                        result += String.fromCharCode(b1);
                        i += 1;
                        continue;
                    }
                    if (table.mappings && table.mappings[hex1]) {
                        result += table.mappings[hex1];
                        i += 1;
                        continue;
                    }

                    if (i + 1 < bytes.length) {
                        const b2 = bytes[i + 1];
                        const hex2 = hex1 + b2.toString(16).toUpperCase().padStart(2, '0');
                        const specialDoubleByte = tagSequences[hex2] ||
                            (table.dte_sequences && table.dte_sequences[hex2]) ||
                            (table.mte_sequences && table.mte_sequences[hex2]);
                        if (specialDoubleByte) {
                            result += specialDoubleByte;
                            i += 2;
                            continue;
                        }
                        if (table.mappings && table.mappings[hex2]) {
                            result += table.mappings[hex2];
                            i += 2;
                            continue;
                        }
                        if (iconvLite && isShiftJisPair(b1, b2)) {
                            const decoded = iconvLite.decode(Buffer.from([b1, b2]), 'shift_jis');
                            if (decoded && decoded !== '?') {
                                result += decoded;
                                i += 2;
                                continue;
                            }
                        }
                    }

                    if (iconvLite) {
                        const decoded = iconvLite.decode(Buffer.from([b1]), 'shift_jis');
                        result += decoded && decoded !== '?' ? decoded : '.';
                        i += 1;
                    } else {
                        result += '.';
                        i += 1;
                    }
                }
                return result;
            }

            let result = '';
            let i = 0;
            const tagSequences = table.tag_sequences || {};
            const hasTagSequences = Object.keys(tagSequences).length > 0;
            
            while (i < bytes.length) {
                let matched = false;
                
                // PRIORIDADE 1: Verificar tag sequences multi-byte (maior prioridade, maior match primeiro)
                if (hasTagSequences) {
                    // Tentar o maior match possível (até 4 bytes = 8 hex chars)
                    const maxBytes = Math.min(4, bytes.length - i);
                    for (let len = maxBytes; len >= 2; len--) {
                        const hexSeq = bytes.slice(i, i + len)
                            .map(b => b.toString(16).toUpperCase().padStart(2, '0'))
                            .join('');
                        if (tagSequences[hexSeq]) {
                            result += tagSequences[hexSeq];
                            i += len;
                            matched = true;
                            break;
                        }
                    }
                }
                
                if (matched) continue;
                
                // PRIORIDADE 2: Verificar DTE/MTE e mappings normais
                const byte = bytes[i];
                const hex = byte.toString(16).toUpperCase().padStart(2, '0');
                const char = (table.tag_sequences && table.tag_sequences[hex]) ||
                    (table.dte_sequences && table.dte_sequences[hex]) ||
                    (table.mte_sequences && table.mte_sequences[hex]) ||
                    (table.mappings && table.mappings[hex]) ||
                    (table.mapping && (table.mapping[byte] || table.mapping[hex])) ||
                    (byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.');
                result += char;
                i++;
            }
            return result;
        },

        encodeTextWithCurrentTable(text, caseSensitive = true) {
            const sourceText = String(text || '');
            if (!sourceText) return [];

            const table = this.getCurrentCharacterTable();
            if (!table) {
                return Array.from(new TextEncoder().encode(sourceText));
            }

            const active16BitDecoder = ((table.type === '16-bit' || table.type === 'UTF-16') && typeof this.getActive16BitDecoder === 'function')
                ? this.getActive16BitDecoder()
                : null;

            if ((table.type === '16-bit' || table.type === 'UTF-16') && active16BitDecoder) {
                const reverse = new Map();
                for (const [hex, char] of Object.entries(active16BitDecoder.mapping || {})) {
                    reverse.set(caseSensitive ? char : char.toLowerCase(), hex);
                }

                const bytes = [];
                for (const char of Array.from(sourceText)) {
                    const key = caseSensitive ? char : char.toLowerCase();
                    const hex = reverse.get(key);
                    if (!hex) return null;
                    const pair = parseHexBytes(hex);
                    if (!pair || pair.length !== 2) return null;
                    bytes.push(...pair);
                }
                return bytes;
            }

            if (this.isCurrentTableShiftJIS()) {
                const reverseEntries = [];
                const pushReverseEntry = (char, bytes) => {
                    if (!char || !bytes || bytes.length === 0) return;
                    reverseEntries.push({ char, bytes });
                };

                Object.entries(table.tag_sequences || {}).forEach(([hex, char]) => pushReverseEntry(char, parseHexBytes(hex)));
                Object.entries(table.dte_sequences || {}).forEach(([hex, char]) => pushReverseEntry(char, parseHexBytes(hex)));
                Object.entries(table.mte_sequences || {}).forEach(([hex, char]) => pushReverseEntry(char, parseHexBytes(hex)));
                Object.entries(table.mappings || {}).forEach(([hex, char]) => pushReverseEntry(char, parseHexBytes(hex)));

                reverseEntries.sort((a, b) => b.char.length - a.char.length);

                const bytes = [];
                let index = 0;
                while (index < sourceText.length) {
                    let matched = null;
                    for (const preferExactCase of caseSensitive ? [true] : [true, false]) {
                        for (const entry of reverseEntries) {
                            const slice = sourceText.slice(index, index + entry.char.length);
                            if (!slice) continue;

                            if (preferExactCase) {
                                if (slice === entry.char) {
                                    matched = entry;
                                    break;
                                }
                                continue;
                            }

                            const expected = entry.char.toLowerCase();
                            const actual = slice.toLowerCase();
                            if (expected && actual === expected) {
                                matched = entry;
                                break;
                            }
                        }
                        if (matched) {
                            break;
                        }
                    }

                    if (matched) {
                        bytes.push(...matched.bytes);
                        index += matched.char.length;
                        continue;
                    }

                    const char = sourceText[index];
                    if (iconvLite) {
                        const encoded = iconvLite.encode(char, 'shift_jis');
                        if (encoded && encoded.length > 0) {
                            bytes.push(...Array.from(encoded));
                            index += 1;
                            continue;
                        }
                    }
                    return null;
                }
                return bytes;
            }

            const reverseEntries = [];
            const pushReverseEntry = (char, bytes) => {
                if (!char || !bytes || bytes.length === 0) return;
                reverseEntries.push({ char, bytes });
            };

            // Tag sequences têm prioridade (mapeamento inverso: tag -> bytes)
            Object.entries(table.tag_sequences || {}).forEach(([hex, char]) => pushReverseEntry(char, parseHexBytes(hex)));
            Object.entries(table.dte_sequences || {}).forEach(([hex, char]) => pushReverseEntry(char, parseHexBytes(hex)));
            Object.entries(table.mte_sequences || {}).forEach(([hex, char]) => pushReverseEntry(char, parseHexBytes(hex)));
            Object.entries(table.mappings || {}).forEach(([hex, char]) => pushReverseEntry(char, parseHexBytes(hex)));

            if (table.mapping) {
                Object.entries(table.mapping).forEach(([key, char]) => {
                    if (/^\d+$/.test(key)) {
                        pushReverseEntry(char, [parseInt(key, 10)]);
                    } else if (/^[0-9A-F]{2}$/i.test(key)) {
                        pushReverseEntry(char, [parseInt(key, 16)]);
                    }
                });
            }

            reverseEntries.sort((a, b) => b.char.length - a.char.length);

            const bytes = [];
            let index = 0;
            while (index < sourceText.length) {
                let matched = null;
                for (const preferExactCase of caseSensitive ? [true] : [true, false]) {
                    for (const entry of reverseEntries) {
                        const slice = sourceText.slice(index, index + entry.char.length);
                        if (!slice) continue;

                        if (preferExactCase) {
                            if (slice === entry.char) {
                                matched = entry;
                                break;
                            }
                            continue;
                        }

                        const expected = entry.char.toLowerCase();
                        const actual = slice.toLowerCase();
                        if (expected && actual === expected) {
                            matched = entry;
                            break;
                        }
                    }
                    if (matched) {
                        break;
                    }
                }

                if (matched) {
                    bytes.push(...matched.bytes);
                    index += matched.char.length;
                    continue;
                }

                const charCode = sourceText.charCodeAt(index);
                if (charCode >= 0 && charCode <= 0xFF) {
                    bytes.push(charCode);
                    index += 1;
                    continue;
                }

                return null;
            }

            return bytes;
        },

        getSelectionDecodedText(selection) {
            if (!selection) return '';
            const data = selection.data instanceof Uint8Array ? selection.data : new Uint8Array(selection.data || []);
            return this.decodeBytesWithCurrentTable(data);
        }
    });
})();
