function createFixedTableSystem() {
    
    // === CORREÇÃO 1: DETECTOR DE TIPOS MELHORADO ===
    window.hexEditor.getTableInfo = function() {
        const currentTable = this.charTables && this.charTables[this.currentCharTable];
        
        if (!currentTable) {
            return { type: 'ascii', is16bit: false, isDTE: false, isMTE: false, isShiftJIS: false };
        }
        
        // Verificar se DTE/MTE é 16-bit baseado nas chaves hex (4 dígitos = 16-bit)
        const dteKeys = Object.keys(currentTable.dte_sequences || {});
        const mteKeys = Object.keys(currentTable.mte_sequences || {});
        const allDteMteKeys = [...dteKeys, ...mteKeys];
        const is16BitDTE = allDteMteKeys.some(key => key.length === 4);
        const is16BitType = currentTable.type && currentTable.type.includes && currentTable.type.includes('16-bit');
        
        const isShiftJISType = !!(currentTable.type && currentTable.type.includes && (currentTable.type.includes('shift-jis') || currentTable.type.includes('shift_jis')));

        return {
            type: currentTable.type || '8-bit',
            is16bit: currentTable.type === '16-bit' || currentTable.type === 'UTF-16' || is16BitDTE || is16BitType ||
                     currentTable.type === 'DTE' || currentTable.type === 'MTE' || currentTable.type === 'DTE+MTE',
            isDTE: currentTable.type === 'DTE' || currentTable.type === 'DTE+MTE' || dteKeys.length > 0,
            isMTE: currentTable.type === 'MTE' || currentTable.type === 'DTE+MTE' || mteKeys.length > 0,
            isShiftJIS: isShiftJISType || currentTable._isShiftJIS === true,
            isMixed: currentTable.type === 'DTE+MTE' || (dteKeys.length > 0 && mteKeys.length > 0),
            endianness: currentTable.endianness || this.charDecoder16?.endianness || 'LE',
            table: currentTable
        };
    };
    
    // === CORREÇÃO 2: DECODIFICADOR 16-BIT CORRIGIDO ===
    window.hexEditor.decode16BitText = function(data, offset, maxChars) {
        const tableInfo = this.getTableInfo();
        if (!tableInfo.is16bit) return null;
        
        let result = '';
        let charCount = 0;
        let byteIndex = 0;
        
        
        while (charCount < maxChars && (offset + byteIndex + 1) < data.length) {
            const byte1 = data[offset + byteIndex];
            const byte2 = data[offset + byteIndex + 1];
            
            // Construir código hex baseado no endianness
            const hexCode = tableInfo.endianness === 'LE'
                ? byte2.toString(16).padStart(2, '0').toUpperCase() +
                  byte1.toString(16).padStart(2, '0').toUpperCase()
                : byte1.toString(16).padStart(2, '0').toUpperCase() +
                  byte2.toString(16).padStart(2, '0').toUpperCase();
            
            // Verificar terminadores
            if (this.charDecoder16?.terminators?.includes(hexCode) || 
                tableInfo.table.terminators?.includes(hexCode)) {
                break;
            }
            
            // Buscar caractere no mapeamento
            let char = null;
            if (this.charDecoder16?.mapping?.[hexCode]) {
                char = this.charDecoder16.mapping[hexCode];
            } else if (tableInfo.table.mappings?.[hexCode]) {
                char = tableInfo.table.mappings[hexCode];
            }
            
            if (char && char !== '.') {
                result += char;
            } else {
                result += '.';
            }
            
            charCount++;
            byteIndex += 2;
        }
        
        return result;
    };
    
    // === CORREÇÃO 3: DECODIFICADOR DTE CORRIGIDO ===
    window.hexEditor.decodeDTEText = function(data, offset, maxBytes) {
        const tableInfo = this.getTableInfo();
        if (!tableInfo.isDTE) return null;

        let result = '';
        let byteIndex = 0;
        const tagSequences = tableInfo.table.tag_sequences || {};
        const hasTagSequences = Object.keys(tagSequences).length > 0;

        while (byteIndex < maxBytes && (offset + byteIndex) < data.length) {
            let matched = false;

            // PRIORIDADE 1: Verificar tag sequences multi-byte
            if (hasTagSequences) {
                const maxSeqBytes = Math.min(4, maxBytes - byteIndex, data.length - offset - byteIndex);
                for (let len = maxSeqBytes; len >= 2; len--) {
                    const hexSeq = Array.from({length: len}, (_, i) =>
                        data[offset + byteIndex + i].toString(16).toUpperCase().padStart(2, '0')
                    ).join('');
                    if (tagSequences[hexSeq]) {
                        result += tagSequences[hexSeq];
                        byteIndex += len;
                        matched = true;
                        break;
                    }
                }
            }

            if (matched) continue;

            const byte = data[offset + byteIndex];
            const hexCode = byte.toString(16).toUpperCase().padStart(2, '0');

            let char = null;
            let isDTESequence = false;

            // Verificar sequências DTE primeiro
            if (tableInfo.table.dte_sequences?.[hexCode]) {
                char = tableInfo.table.dte_sequences[hexCode];
                isDTESequence = true;
            } else if (tableInfo.table.mappings?.[hexCode]) {
                // Verificar mappings originais primeiro
                char = tableInfo.table.mappings[hexCode];
            } else if (tableInfo.table.mapping?.[byte]) {
                char = tableInfo.table.mapping[byte];
            } else if (tableInfo.table.mapping?.[hexCode]) {
                // Fallback: try using hexCode as key (for tables that weren't processed by processFoxyTable)
                char = tableInfo.table.mapping[hexCode];
            } else if (byte >= 32 && byte <= 126) {
                char = String.fromCharCode(byte);
            } else {
                char = '.';
            }

            result += char;
            byteIndex++;
        }

        return result;
    };
    
    // === CORREÇÃO 4: DECODIFICADOR MISTO DTE+MTE ===
    window.hexEditor.decodeMixedText = function(data, offset, maxBytes) {
        const tableInfo = this.getTableInfo();
        if (!tableInfo.isMixed) return null;

        let result = '';
        let byteIndex = 0;
        const tagSequences = tableInfo.table.tag_sequences || {};
        const hasTagSequences = Object.keys(tagSequences).length > 0;

        while (byteIndex < maxBytes && (offset + byteIndex) < data.length) {
            let matched = false;

            // PRIORIDADE 1: Verificar tag sequences multi-byte
            if (hasTagSequences) {
                const maxSeqBytes = Math.min(4, maxBytes - byteIndex, data.length - offset - byteIndex);
                for (let len = maxSeqBytes; len >= 2; len--) {
                    const hexSeq = Array.from({length: len}, (_, i) =>
                        data[offset + byteIndex + i].toString(16).toUpperCase().padStart(2, '0')
                    ).join('');
                    if (tagSequences[hexSeq]) {
                        result += tagSequences[hexSeq];
                        byteIndex += len;
                        matched = true;
                        break;
                    }
                }
            }

            if (matched) continue;

            const byte = data[offset + byteIndex];
            const hexCode = byte.toString(16).toUpperCase().padStart(2, '0');

            let char = null;
            let isSpecialSequence = false;

            // Prioridade: DTE > MTE > mappings originais > mapping processado > ASCII
            if (tableInfo.table.dte_sequences?.[hexCode]) {
                char = tableInfo.table.dte_sequences[hexCode];
                isSpecialSequence = true;
            } else if (tableInfo.table.mte_sequences?.[hexCode]) {
                char = tableInfo.table.mte_sequences[hexCode];
                isSpecialSequence = true;
            } else if (tableInfo.table.mappings?.[hexCode]) {
                // Verificar mappings originais
                char = tableInfo.table.mappings[hexCode];
            } else if (tableInfo.table.mapping?.[byte]) {
                char = tableInfo.table.mapping[byte];
            } else if (tableInfo.table.mapping?.[hexCode]) {
                // Fallback: try using hexCode as key (for tables that weren't processed by processFoxyTable)
                char = tableInfo.table.mapping[hexCode];
            } else if (byte >= 32 && byte <= 126) {
                char = String.fromCharCode(byte);
            } else {
                char = '.';
            }

            result += char;
            byteIndex++;
        }

        return result;
    };
    
    // === CORREÇÃO 5: DECODIFICADOR MTE CORRIGIDO ===
    window.hexEditor.decodeMTEText = function(data, offset, maxBytes) {
        const tableInfo = this.getTableInfo();
        if (!tableInfo.isMTE) return null;

        let result = '';
        let byteIndex = 0;
        const tagSequences = tableInfo.table.tag_sequences || {};
        const hasTagSequences = Object.keys(tagSequences).length > 0;

        while (byteIndex < maxBytes && (offset + byteIndex) < data.length) {
            let matched = false;

            // PRIORIDADE 1: Verificar tag sequences multi-byte
            if (hasTagSequences) {
                const maxSeqBytes = Math.min(4, maxBytes - byteIndex, data.length - offset - byteIndex);
                for (let len = maxSeqBytes; len >= 2; len--) {
                    const hexSeq = Array.from({length: len}, (_, i) =>
                        data[offset + byteIndex + i].toString(16).toUpperCase().padStart(2, '0')
                    ).join('');
                    if (tagSequences[hexSeq]) {
                        result += tagSequences[hexSeq];
                        byteIndex += len;
                        matched = true;
                        break;
                    }
                }
            }

            if (matched) continue;

            const byte = data[offset + byteIndex];
            const hexCode = byte.toString(16).toUpperCase().padStart(2, '0');

            let char = null;
            let isMTESequence = false;

            // Verificar sequências MTE primeiro
            if (tableInfo.table.mte_sequences?.[hexCode]) {
                char = tableInfo.table.mte_sequences[hexCode];
                isMTESequence = true;
            } else if (tableInfo.table.mappings?.[hexCode]) {
                // Verificar mappings originais primeiro
                char = tableInfo.table.mappings[hexCode];
            } else if (tableInfo.table.mapping?.[byte]) {
                char = tableInfo.table.mapping[byte];
            } else if (tableInfo.table.mapping?.[hexCode]) {
                // Fallback: try using hexCode as key (for tables that weren't processed by processFoxyTable)
                char = tableInfo.table.mapping[hexCode];
            } else if (byte >= 32 && byte <= 126) {
                char = String.fromCharCode(byte);
            } else {
                char = '.';
            }

            result += char;
            byteIndex++;
        }

        return result;
    };
    
    // === CORREÇÃO 5.5: DECODIFICADOR SHIFT-JIS ===
    window.hexEditor.decodeShiftJISText = function(data, offset, maxBytes) {
        const tableInfo = this.getTableInfo();
        if (!tableInfo.isShiftJIS) return null;

        const bytes = Array.from(data).slice(offset, offset + maxBytes);
        if (typeof this.decodeBytesWithCurrentTable === 'function') {
            return this.decodeBytesWithCurrentTable(bytes);
        }

        return null;
    };
    
    // Função auxiliar para decodificar Shift-JIS de 2 bytes
    window.hexEditor.decodeShiftJIS = function(codePoint) {
        const shiftJISMap = {
            0x8140: 'ï½¦', 0x8141: 'ï½§', 0x8142: 'ï½¨', 0x8143: 'ï½©', 0x8144: 'ï½ª',
            0x8145: 'ï½«', 0x8146: 'ï½¯', 0x8147: 'ï½±', 0x8148: 'ï½²', 0x8149: 'ï½³',
            0x814A: 'ï½´', 0x814B: 'ï½µ', 0x814C: 'ï½¶', 0x814D: 'ï½·', 0x814E: 'ï½¸',
            0x814F: 'ï½¹', 0x8150: 'ï½º', 0x8151: 'ï½»', 0x8152: 'ï½¼', 0x8153: 'ï½½',
            0x8154: 'ï½¾', 0x8155: 'ï½¿', 0x8156: 'ï¾€', 0x8157: 'ï¾', 0x8158: 'ï¾‚',
            0x8159: 'ï¾ƒ', 0x815A: 'ï¾„', 0x815B: 'ï¾…', 0x815C: 'ï¾†', 0x815D: 'ï¾‡',
            0x815E: 'ï¾ˆ', 0x815F: 'ï¾‰', 0x8160: 'ï¾Š', 0x8161: 'ï¾‹', 0x8162: 'ï¾Œ',
            0x8163: 'ï¾', 0x8164: 'ï¾Ž', 0x8165: 'ï¾', 0x8166: 'ï¾', 0x8167: 'ï¾‘',
            0x8168: 'ï¾’', 0x8169: 'ï¾“', 0x816A: 'ï¾”', 0x816B: 'ï¾•', 0x816C: 'ï¾–',
            0x816D: 'ï¾—', 0x816E: 'ï¾˜', 0x816F: 'ï¾™', 0x8170: 'ï¾š', 0x8171: 'ï¾›',
            0x8172: 'ï¾œ', 0x8173: 'ï¾', 0x8174: 'ï¾ž', 0x8175: 'ï¾Ÿ',
            0x824F: 'ã‚¡', 0x8250: 'ã‚¢', 0x8251: 'ã‚£', 0x8252: 'ã‚¤', 0x8253: 'ã‚¥',
            0x8254: 'ã‚¦', 0x8255: 'ã‚§', 0x8256: 'ã‚¨', 0x8257: 'ã‚©', 0x8258: 'ã‚ª',
            0x8259: 'ã‚«', 0x825A: 'ã‚­', 0x825B: 'ã‚¯', 0x825C: 'ã‚±', 0x825D: 'ã‚³',
            0x825E: 'ã‚µ', 0x825F: 'ã‚·', 0x8260: 'ã‚¹', 0x8261: 'ã‚»', 0x8262: 'ã‚½',
            0x8263: 'ã‚¿', 0x8264: 'ãƒ', 0x8265: 'ãƒ„', 0x8266: 'ãƒ†', 0x8267: 'ãƒˆ',
            0x8268: 'ãƒŠ', 0x8269: 'ãƒ‹', 0x826A: 'ãƒŒ', 0x826B: 'ãƒ', 0x826C: 'ãƒŽ',
            0x826D: 'ãƒ', 0x826E: 'ãƒ’', 0x826F: 'ãƒ•', 0x8270: 'ãƒ˜', 0x8271: 'ãƒ›',
            0x8272: 'ãƒž', 0x8273: 'ãƒŸ', 0x8274: 'ãƒ ', 0x8275: 'ãƒ¡', 0x8276: 'ãƒ¢',
            0x8277: 'ãƒ¤', 0x8278: 'ãƒ¦', 0x8279: 'ãƒ¨', 0x827A: 'ãƒ©', 0x827B: 'ãƒª',
            0x827C: 'ãƒ«', 0x827D: 'ãƒ¬', 0x827E: 'ãƒ­', 0x8280: 'ãƒ¯', 0x8281: 'ãƒ²',
            0x8282: 'ãƒ³', 0x8283: 'ãƒ´', 0x8284: 'ãƒµ', 0x8285: 'ãƒ¶'
        };
        
        return shiftJISMap[codePoint] || '?';
    };
    
    // Função auxiliar para decodificar katakana de meia largura
    window.hexEditor.decodeShiftJISHalfWidth = function(byte) {
        const halfWidthMap = {
            0xA1: 'ï½¡', 0xA2: 'ï½¢', 0xA3: 'ï½£', 0xA4: 'ï½¤', 0xA5: 'ï½¥',
            0xA6: 'ï½¦', 0xA7: 'ï½§', 0xA8: 'ï½¨', 0xA9: 'ï½©', 0xAA: 'ï½ª',
            0xAB: 'ï½«', 0xAC: 'ï½¯', 0xAD: 'ï½±', 0xAE: 'ï½²', 0xAF: 'ï½³',
            0xB0: 'ï½´', 0xB1: 'ï½µ', 0xB2: 'ï½¶', 0xB3: 'ï½·', 0xB4: 'ï½¸',
            0xB5: 'ï½¹', 0xB6: 'ï½º', 0xB7: 'ï½»', 0xB8: 'ï½¼', 0xB9: 'ï½½',
            0xBA: 'ï½¾', 0xBB: 'ï½¿', 0xBC: 'ï¾€', 0xBD: 'ï¾', 0xBE: 'ï¾‚',
            0xBF: 'ï¾ƒ', 0xC0: 'ï¾„', 0xC1: 'ï¾…', 0xC2: 'ï¾†', 0xC3: 'ï¾‡',
            0xC4: 'ï¾ˆ', 0xC5: 'ï¾‰', 0xC6: 'ï¾Š', 0xC7: 'ï¾‹', 0xC8: 'ï¾Œ',
            0xC9: 'ï¾', 0xCA: 'ï¾Ž', 0xCB: 'ï¾', 0xCC: 'ï¾', 0xCD: 'ï¾‘',
            0xCE: 'ï¾’', 0xCF: 'ï¾“', 0xD0: 'ï¾”', 0xD1: 'ï¾•', 0xD2: 'ï¾–',
            0xD3: 'ï¾—', 0xD4: 'ï¾˜', 0xD5: 'ï¾™', 0xD6: 'ï¾š', 0xD7: 'ï¾›',
            0xD8: 'ï¾œ', 0xD9: 'ï¾', 0xDA: 'ï¾ž', 0xDB: 'ï¾Ÿ'
        };
        
        return halfWidthMap[byte] || '?';
    };
    
    // === CORREÇÃO 5: FUNÇÃO UNIFICADA DE DECODIFICAÇÃO ===
    window.hexEditor.decodeTextAtOffsetFixed = function(offset, length = 16) {
        const tableInfo = this.getTableInfo();
        const dataLength = typeof this.getDataLength === 'function' ? this.getDataLength() : 0;
        const getByte = (pos) => this.getByteAt(pos);
        const getRange = (start, len) => this.getRangeAt(start, len);
        
        
        if (tableInfo.is16bit) {
            const maxChars = Math.floor(length / 2);
            return this.decode16BitText(getRange(offset, maxChars * 2), 0, maxChars) || '';
        } else if (tableInfo.isShiftJIS) {
            return this.decodeShiftJISText(getRange(offset, length), 0, length) || '';
        } else if (tableInfo.isMixed || tableInfo.isDTE || tableInfo.isMTE || Object.keys(tableInfo.table?.tag_sequences || {}).length > 0) {
            let result = '';
            let i = offset;
            const endOffset = Math.min(offset + length, dataLength);
            const tagSequences = tableInfo.table?.tag_sequences || {};
            const hasTagSequences = Object.keys(tagSequences).length > 0;

            while (i < endOffset) {
                let matched = false;

                if (hasTagSequences) {
                    const maxSeqBytes = Math.min(4, endOffset - i);
                    for (let len = maxSeqBytes; len >= 2; len--) {
                        const hexSeq = Array.from({length: len}, (_, idx) =>
                            getByte(i + idx).toString(16).toUpperCase().padStart(2, '0')
                        ).join('');
                        if (tagSequences[hexSeq]) {
                            result += tagSequences[hexSeq];
                            i += len;
                            matched = true;
                            break;
                        }
                    }
                }

                if (matched) continue;

                const byte = getByte(i);
                const hexCode = byte.toString(16).toUpperCase().padStart(2, '0');
                if (tagSequences[hexCode]) {
                    result += tagSequences[hexCode];
                } else if (tableInfo.table?.dte_sequences?.[hexCode]) {
                    result += tableInfo.table.dte_sequences[hexCode];
                } else if (tableInfo.table?.mte_sequences?.[hexCode]) {
                    result += tableInfo.table.mte_sequences[hexCode];
                } else if (tableInfo.table?.mappings?.[hexCode]) {
                    result += tableInfo.table.mappings[hexCode];
                } else if (tableInfo.table?.mapping?.[byte]) {
                    result += tableInfo.table.mapping[byte];
                } else if (tableInfo.table?.mapping?.[hexCode]) {
                    result += tableInfo.table.mapping[hexCode];
                } else {
                    result += byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.';
                }
                i++;
            }
            return result;
        } else {
            // Fallback para ASCII/8-bit com suporte a tag sequences
            let result = '';
            let i = offset;
            const endOffset = Math.min(offset + length, dataLength);
            const tagSequences = tableInfo.table?.tag_sequences || {};
            const hasTagSequences = Object.keys(tagSequences).length > 0;

            while (i < endOffset) {
                let matched = false;

                // PRIORIDADE 1: Verificar tag sequences multi-byte
                if (hasTagSequences) {
                    const maxSeqBytes = Math.min(4, endOffset - i);
                    for (let len = maxSeqBytes; len >= 2; len--) {
                        const hexSeq = Array.from({length: len}, (_, idx) =>
                            getByte(i + idx).toString(16).toUpperCase().padStart(2, '0')
                        ).join('');
                        if (tagSequences[hexSeq]) {
                            result += tagSequences[hexSeq];
                            i += len;
                            matched = true;
                            break;
                        }
                    }
                }

                if (matched) continue;

                const byte = getByte(i);
                const hexCode = byte.toString(16).toUpperCase().padStart(2, '0');
                if (tagSequences[hexCode]) {
                    result += tagSequences[hexCode];
                } else if (tableInfo.table?.dte_sequences?.[hexCode]) {
                    result += tableInfo.table.dte_sequences[hexCode];
                } else if (tableInfo.table?.mte_sequences?.[hexCode]) {
                    result += tableInfo.table.mte_sequences[hexCode];
                } else if (tableInfo.table?.mappings?.[hexCode]) {
                    result += tableInfo.table.mappings[hexCode];
                } else if (tableInfo.table?.mapping?.[byte]) {
                    result += tableInfo.table.mapping[byte];
                } else if (tableInfo.table?.mapping?.[hexCode]) {
                    result += tableInfo.table.mapping[hexCode];
                } else {
                    result += byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.';
                }
                i++;
            }
            return result;
        }
    };
    
    // === CORREÇÃO 6: GERADOR DE CARACTERES COM METADADOS ===
    window.hexEditor.generateCharacterMap = function(offset, length = 16) {
        const tableInfo = this.getTableInfo();
        const characters = [];
        const dataLength = typeof this.getDataLength === 'function' ? this.getDataLength() : 0;
        const getByte = (pos) => this.getByteAt(pos);
        
        if (tableInfo.is16bit) {
            // Processar em pares de bytes
            let byteIndex = 0;
            let charIndex = 0;
            
            while (byteIndex < length - 1 && (offset + byteIndex + 1) < dataLength) {
                const byte1 = getByte(offset + byteIndex);
                const byte2 = getByte(offset + byteIndex + 1);
                
                const hexCode = tableInfo.endianness === 'LE'
                    ? byte2.toString(16).padStart(2, '0').toUpperCase() +
                      byte1.toString(16).padStart(2, '0').toUpperCase()
                    : byte1.toString(16).padStart(2, '0').toUpperCase() +
                      byte2.toString(16).padStart(2, '0').toUpperCase();
                
                let char = '.';
                let isSpecialSequence = false;
                let sequenceType = '16-bit';
                
                // PRIORIDADE 1: Verificar sequências DTE primeiro (maior prioridade)
                if ((tableInfo.isDTE || tableInfo.isMixed) && tableInfo.table.dte_sequences?.[hexCode]) {
                    char = tableInfo.table.dte_sequences[hexCode];
                    isSpecialSequence = true;
                    sequenceType = 'DTE';
                }
                // PRIORIDADE 2: Verificar sequÃªncias MTE
                else if ((tableInfo.isMTE || tableInfo.isMixed) && tableInfo.table.mte_sequences?.[hexCode]) {
                    char = tableInfo.table.mte_sequences[hexCode];
                    isSpecialSequence = true;
                    sequenceType = 'MTE';
                }
                // PRIORIDADE 3: Verificar mapeamentos normais
                else if (this.charDecoder16?.mapping?.[hexCode]) {
                    char = this.charDecoder16.mapping[hexCode];
                } else if (tableInfo.table.mappings?.[hexCode]) {
                    char = tableInfo.table.mappings[hexCode];
                }
                
                characters.push({
                    char: char,
                    type: sequenceType,
                    startOffset: offset + byteIndex,
                    endOffset: offset + byteIndex + 1,
                    byteLength: 2,
                    charIndex: charIndex,
                    hexCode: hexCode,
                    bytes: [byte1, byte2],
                    isSpecialSequence: isSpecialSequence
                });
                
                byteIndex += 2;
                charIndex++;
            }
            
        } else if (tableInfo.isShiftJIS) {
            // Processar Shift-JIS com suporte a TAG/DTE/MTE e sequências de 1 ou 2 bytes
            let byteIndex = 0;
            let charIndex = 0;
            const tagSequences = tableInfo.table?.tag_sequences || {};
            const hasTagSequences = Object.keys(tagSequences).length > 0;
            
            while (byteIndex < length && (offset + byteIndex) < dataLength) {
                const byte = getByte(offset + byteIndex);
                const hexCode = byte.toString(16).toUpperCase().padStart(2, '0');
                let hexCode2 = null;
                
                let char = '.';
                let byteLength = 1;
                let sequenceType = 'shift-jis';
                let isSpecialSequence = false;

                if (hasTagSequences) {
                    const maxSeqBytes = Math.min(4, length - byteIndex, dataLength - offset - byteIndex);
                    let matched = false;
                    for (let len = maxSeqBytes; len >= 2; len--) {
                        const hexSeq = Array.from({length: len}, (_, i) =>
                            getByte(offset + byteIndex + i).toString(16).toUpperCase().padStart(2, '0')
                        ).join('');
                        if (tagSequences[hexSeq]) {
                            char = tagSequences[hexSeq];
                            byteLength = len;
                            sequenceType = 'TAG';
                            isSpecialSequence = true;
                            characters.push({
                                char: char,
                                type: sequenceType,
                                startOffset: offset + byteIndex,
                                endOffset: offset + byteIndex + len - 1,
                                byteLength: len,
                                charIndex: charIndex,
                                hexCode: hexSeq,
                                bytes: Array.from({length: len}, (_, i) => getByte(offset + byteIndex + i)),
                                isSpecialSequence: true
                            });
                            byteIndex += len;
                            charIndex++;
                            matched = true;
                            break;
                        }
                    }
                    if (matched) {
                        continue;
                    }
                }

                if (tagSequences[hexCode]) {
                    char = tagSequences[hexCode];
                    sequenceType = 'TAG';
                    isSpecialSequence = true;
                } else if (tableInfo.table.dte_sequences?.[hexCode]) {
                    char = tableInfo.table.dte_sequences[hexCode];
                    sequenceType = 'DTE';
                    isSpecialSequence = true;
                } else if (tableInfo.table.mte_sequences?.[hexCode]) {
                    char = tableInfo.table.mte_sequences[hexCode];
                    sequenceType = 'MTE';
                    isSpecialSequence = true;
                } else if (byte >= 32 && byte <= 126) {
                    char = String.fromCharCode(byte);
                    sequenceType = 'ascii';
                } else if (byte === 0) {
                    char = 'Â·';
                } else if (byte === 9) { // Tab
                    char = '→';
                } else if (byte === 10 || byte === 13) { // LF/CR
                    char = '↩';
                } else if (byte >= 0x81 && (offset + byteIndex + 1) < dataLength) {
                    // Caractere japonês de 2 bytes
                    const byte2 = getByte(offset + byteIndex + 1);
                    // Construir o código hex no formato correto para Shift-JIS
                    hexCode2 = byte.toString(16).toUpperCase().padStart(2, '0') + 
                        byte2.toString(16).toUpperCase().padStart(2, '0');
                    
                    if (tagSequences[hexCode2]) {
                        char = tagSequences[hexCode2];
                        isSpecialSequence = true;
                        sequenceType = 'TAG';
                    } else if (tableInfo.table.dte_sequences?.[hexCode2]) {
                        char = tableInfo.table.dte_sequences[hexCode2];
                        isSpecialSequence = true;
                        sequenceType = 'DTE';
                    } else if (tableInfo.table.mte_sequences?.[hexCode2]) {
                        char = tableInfo.table.mte_sequences[hexCode2];
                        isSpecialSequence = true;
                        sequenceType = 'MTE';
                    } else if (tableInfo.table.mappings?.[hexCode2]) {
                        char = tableInfo.table.mappings[hexCode2];
                        isSpecialSequence = true;
                    } else {
                        // Usar decodificação padrão Shift-JIS
                        const codePoint = (byte << 8) | byte2;
                        char = this.decodeShiftJIS(codePoint);
                    }
                    byteLength = 2;
                    sequenceType = 'shift-jis-2byte';
                    byteIndex++; // Pular próximo byte
                } else if (byte >= 0xA1 && byte <= 0xDF) {
                    // Katakana de meia largura (1 byte)
                    if (tableInfo.table.mappings?.[hexCode]) {
                        char = tableInfo.table.mappings[hexCode];
                        isSpecialSequence = true;
                    } else {
                        char = this.decodeShiftJISHalfWidth(byte);
                    }
                    sequenceType = 'shift-jis-half';
                }
                
                characters.push({
                    char: char,
                    type: sequenceType,
                    startOffset: offset + byteIndex - (byteLength === 2 ? 1 : 0),
                    endOffset: offset + byteIndex + 1,
                    byteLength: byteLength,
                    charIndex: charIndex,
                    hexCode: byteLength === 2 ? hexCode2 : hexCode,
                    bytes: byteLength === 2 ? [byte, getByte(offset + byteIndex + 1)] : [byte],
                    isSpecialSequence: isSpecialSequence
                });
                
                byteIndex++;
                charIndex++;
            }
            
        } else if (tableInfo.isDTE || tableInfo.isMTE) {
            // Processar byte por byte com sequências especiais
            let byteIndex = 0;
            const tagSequences = tableInfo.table?.tag_sequences || {};
            const hasTagSequences = Object.keys(tagSequences).length > 0;

            while (byteIndex < length && (offset + byteIndex) < dataLength) {
                let matched = false;

                // PRIORIDADE 1: Verificar tag sequences multi-byte
                if (hasTagSequences) {
                    const maxSeqBytes = Math.min(4, length - byteIndex, dataLength - offset - byteIndex);
                    for (let len = maxSeqBytes; len >= 2; len--) {
                        const hexSeq = Array.from({length: len}, (_, i) =>
                            getByte(offset + byteIndex + i).toString(16).toUpperCase().padStart(2, '0')
                        ).join('');
                        if (tagSequences[hexSeq]) {
                            const bytes = Array.from({length: len}, (_, i) => getByte(offset + byteIndex + i));
                            characters.push({
                                char: tagSequences[hexSeq],
                                type: 'TAG',
                                startOffset: offset + byteIndex,
                                endOffset: offset + byteIndex + len - 1,
                                byteLength: len,
                                charIndex: byteIndex,
                                hexCode: hexSeq,
                                bytes: bytes,
                                isSpecialSequence: true
                            });
                            byteIndex += len;
                            matched = true;
                            break;
                        }
                    }
                }

                if (matched) continue;

                const byte = getByte(offset + byteIndex);
                const hexCode = byte.toString(16).toUpperCase().padStart(2, '0');

                let char = '.';
                let isSpecialSequence = false;
                let sequenceType = null;

                if (tagSequences[hexCode]) {
                    char = tagSequences[hexCode];
                    isSpecialSequence = true;
                    sequenceType = 'TAG';
                } else if (tableInfo.table.dte_sequences?.[hexCode]) {
                    char = tableInfo.table.dte_sequences[hexCode];
                    isSpecialSequence = true;
                    sequenceType = 'DTE';
                } else if (tableInfo.table.mte_sequences?.[hexCode]) {
                    char = tableInfo.table.mte_sequences[hexCode];
                    isSpecialSequence = true;
                    sequenceType = 'MTE';
                } else if (tableInfo.table.mappings?.[hexCode]) {
                    char = tableInfo.table.mappings[hexCode];
                } else if (tableInfo.table.mapping?.[byte]) {
                    char = tableInfo.table.mapping[byte];
                } else if (tableInfo.table.mapping?.[hexCode]) {
                    char = tableInfo.table.mapping[hexCode];
                } else if (byte >= 32 && byte <= 126) {
                    char = String.fromCharCode(byte);
                }

                characters.push({
                    char: char,
                    type: sequenceType || tableInfo.type,
                    startOffset: offset + byteIndex,
                    endOffset: offset + byteIndex,
                    byteLength: 1,
                    charIndex: byteIndex,
                    hexCode: hexCode,
                    bytes: [byte],
                    isSpecialSequence: isSpecialSequence
                });

                byteIndex++;
            }

        } else {
            // Processar como 8-bit normal com suporte a tag sequences
            let i = 0;
            const tagSequences = tableInfo.table?.tag_sequences || {};
            const hasTagSequences = Object.keys(tagSequences).length > 0;

            while (i < length && (offset + i) < dataLength) {
                let matched = false;

                // PRIORIDADE 1: Verificar tag sequences multi-byte
                if (hasTagSequences) {
                    const maxSeqBytes = Math.min(4, length - i, dataLength - offset - i);
                    for (let len = maxSeqBytes; len >= 2; len--) {
                        const hexSeq = Array.from({length: len}, (_, idx) =>
                            getByte(offset + i + idx).toString(16).toUpperCase().padStart(2, '0')
                        ).join('');
                        if (tagSequences[hexSeq]) {
                            const bytes = Array.from({length: len}, (_, idx) => getByte(offset + i + idx));
                            characters.push({
                                char: tagSequences[hexSeq],
                                type: 'TAG',
                                startOffset: offset + i,
                                endOffset: offset + i + len - 1,
                                byteLength: len,
                                charIndex: i,
                                hexCode: hexSeq,
                                bytes: bytes,
                                isSpecialSequence: true
                            });
                            i += len;
                            matched = true;
                            break;
                        }
                    }
                }

                if (matched) continue;

                const byte = getByte(offset + i);
                const hexCode = byte.toString(16).toUpperCase().padStart(2, '0');
                let char = '.';
                let type = '8-bit';
                let isSpecialSequence = false;

                if (tagSequences[hexCode]) {
                    char = tagSequences[hexCode];
                    type = 'TAG';
                    isSpecialSequence = true;
                } else if (tableInfo.table?.dte_sequences?.[hexCode]) {
                    char = tableInfo.table.dte_sequences[hexCode];
                    type = 'DTE';
                    isSpecialSequence = true;
                } else if (tableInfo.table?.mte_sequences?.[hexCode]) {
                    char = tableInfo.table.mte_sequences[hexCode];
                    type = 'MTE';
                    isSpecialSequence = true;
                } else if (tableInfo.table?.mappings?.[hexCode]) {
                    char = tableInfo.table.mappings[hexCode];
                } else if (tableInfo.table?.mapping?.[byte]) {
                    char = tableInfo.table.mapping[byte];
                } else if (tableInfo.table?.mapping?.[hexCode]) {
                    char = tableInfo.table.mapping[hexCode];
                } else if (byte >= 32 && byte <= 126) {
                    char = String.fromCharCode(byte);
                }

                characters.push({
                    char: char,
                    type: type,
                    startOffset: offset + i,
                    endOffset: offset + i,
                    byteLength: 1,
                    charIndex: i,
                    hexCode: hexCode,
                    bytes: [byte],
                    isSpecialSequence: isSpecialSequence
                });

                i++;
            }
        }
        
        return characters;
    };
    
    // === CORREÇÃO 7: BACKUP E OVERRIDE DO RENDERER ===
    if (!window.hexEditor._originalCreateCompleteLineWithColors) {
        window.hexEditor._originalCreateCompleteLineWithColors = window.hexEditor.createCompleteLineWithColors;
    }
    
    window.hexEditor.createCompleteLineWithColors = function(offset, selStart, selEnd) {
        const tableInfo = this.getTableInfo();
        const dataLength = typeof this.getDataLength === 'function' ? this.getDataLength() : 0;
        
        // O renderer principal em main.js ja trata ASCII, TAG, DTE, MTE,
        // Shift-JIS e 16-bit usando as metricas visuais corretas do editor.
        // O renderer de compatibilidade abaixo preserva uma implementacao
        // antiga, mas altera altura de linha, espacamento e largura do campo
        // texto. Para manter o layout consistente, sempre delegamos ao fluxo
        // principal.
        if (
            tableInfo.type === 'ascii' ||
            tableInfo.is16bit ||
            tableInfo.isShiftJIS ||
            tableInfo.isDTE ||
            tableInfo.isMTE ||
            tableInfo.isMixed ||
            Object.keys(tableInfo.table?.tag_sequences || {}).length > 0 ||
            (!tableInfo.isDTE && !tableInfo.isMTE)
        ) {
            return this._originalCreateCompleteLineWithColors.call(this, offset, selStart, selEnd);
        }
        
        
        const line = document.createElement('div');
        
        // Gerar mapa de caracteres
        const characters = this.generateCharacterMap(offset, 16);
        
        // Layout responsivo com fonte customizada
        const maxCharWidth = Math.max(...characters.map(c => c.char.length * 10), 420);
        const fontSize = this.colorConfig?.fontSettings?.size || 15;
        const lineHeight = Math.max(17, fontSize + 2);
        const rowHeight = Math.max(25, fontSize + 10);
        line.style.cssText = `
            display: grid; grid-template-columns: 100px 1fr ${maxCharWidth + 40}px; gap: 20px;
            padding: 4px 16px; font-size: ${fontSize}px; line-height: ${lineHeight}px; height: ${rowHeight}px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        `;
        
        // === COLUNA OFFSET ===
        const offsetDiv = document.createElement('div');
        offsetDiv.textContent = this.formatOffset(offset, { includePrefix: false, useDisplayBase: true });
        offsetDiv.style.cssText = `color: ${this.getOffsetColor()}; font-weight: bold; text-align: right; position: relative;`;
        
        // Bookmarks
        const hasBookmark = this.bookmarks && this.bookmarks.some(b => 
            b.offset >= offset && b.offset < offset + this.bytesPerLine);
        
        if (hasBookmark) {
            const bookmarkIcon = document.createElement('span');
            bookmarkIcon.textContent = 'ðŸ”–';
            bookmarkIcon.style.cssText = `
                position: absolute; left: -8px; top: 0;
                font-size: 12px; color: #ff6b35;
            `;
            offsetDiv.appendChild(bookmarkIcon);
        }
        
        // === COLUNA BYTES ===
        const bytesDiv = document.createElement('div');
        bytesDiv.style.cssText = 'display: flex; gap: 2px; flex-wrap: nowrap;';
        let hexEndCaretPlaced = false;
        
        for (let i = 0; i < 16; i++) {
            const pos = offset + i;
            
            if (pos < dataLength) {
                const byte = this.getByteAt(pos);
                
                const hexSpan = document.createElement('span');
                hexSpan.textContent = byte.toString(16).toUpperCase().padStart(2, '0');
                hexSpan.dataset.offset = pos;
                hexSpan.dataset.panel = 'hex';
                
                // Encontrar caractere correspondente
                const charInfo = characters.find(c => 
                    pos >= c.startOffset && pos <= c.endOffset);
                
                if (charInfo) {
                    hexSpan.dataset.charStartOffset = charInfo.startOffset;
                    hexSpan.dataset.charEndOffset = charInfo.endOffset;
                    hexSpan.dataset.charType = charInfo.type;
                    hexSpan.dataset.charText = charInfo.char;
                    hexSpan.dataset.charByteLength = charInfo.byteLength;
                    hexSpan.dataset.isSpecialSequence = charInfo.isSpecialSequence;
                }
                
                hexSpan.style.cssText = `
                    width: 24px; text-align: center; padding: 0 2px; border-radius: 3px;
                    cursor: pointer; color: #4fc3f7; font-weight: 500; user-select: none;
                    transition: all 0.1s ease;
                    font-family: var(--editor-font-family, 'JetBrains Mono', monospace);
                    font-size: var(--editor-font-size, 15px);
                `;
                
                // === MARCAÇÃO VISUAL DOS PARES DE BYTES 16-BIT ===
                if (charInfo && charInfo.byteLength >= 2) {
                    if (pos === charInfo.startOffset) {
                        hexSpan.style.borderLeft = '2px solid rgba(255, 107, 53, 0.5)';
                    }
                    if (pos === charInfo.endOffset) {
                        hexSpan.style.borderRight = '2px solid rgba(255, 107, 53, 0.5)';
                    }

                    // Destacar sequências especiais (apenas TAG e Shift-JIS)
                    if (charInfo.isSpecialSequence) {
                        if (charInfo.type === 'TAG') {
                            hexSpan.style.backgroundColor = 'rgba(255, 152, 0, 0.3)'; // Laranja para TAG
                        } else if (charInfo.type === 'shift-jis-2byte' || charInfo.type === 'shift-jis-half') {
                            hexSpan.style.backgroundColor = 'rgba(76, 175, 80, 0.2)'; // Verde
                        }
                        // Nota: DTE e MTE não recebem background, apenas cor do texto
                    }
                }
                
                if (this.canUseInsertCursor && this.canUseInsertCursor()) {
                    const activeCaret = this.createInsertCaretSpan(pos, 'hex');
                    if (activeCaret) {
                        bytesDiv.appendChild(activeCaret);
                    }
                }

                // Estados visuais
                const isSelected = pos >= selStart && pos <= selEnd && selStart !== selEnd;
                const isCursor = !(this.canUseInsertCursor && this.canUseInsertCursor()) && pos === this.cursorPosition;
                
                if (this.activePanel === 'hex') {
                    if (isSelected) {
                        hexSpan.style.background = 'linear-gradient(135deg, rgba(255, 107, 53, 0.6), rgba(247, 147, 30, 0.6))';
                        hexSpan.style.color = 'white';
                        hexSpan.style.fontWeight = 'bold';
                        hexSpan.style.boxShadow = '0 0 8px rgba(255, 107, 53, 0.8)';
                    }
                    
                    if (isCursor) {
                        hexSpan.style.background = 'linear-gradient(135deg, #ff6b35, #f7931e)';
                        hexSpan.style.color = 'white';
                        hexSpan.style.fontWeight = 'bold';
                        hexSpan.style.boxShadow = '0 0 12px rgba(255, 107, 53, 1)';
                        hexSpan.style.border = '2px solid #ff6b35';
                    }
                }
                
                // Bookmark individual
                if (this.bookmarks && this.bookmarks.some(b => b.offset === pos)) {
                    hexSpan.style.borderTop = '2px solid #ff6b35';
                }
                
                bytesDiv.appendChild(hexSpan);
            } else {
                if (this.canUseInsertCursor && this.canUseInsertCursor() && !hexEndCaretPlaced && this.isInsertCaretActiveAt(pos, 'hex')) {
                    const activeCaret = this.createInsertCaretSpan(pos, 'hex');
                    if (activeCaret) {
                        bytesDiv.appendChild(activeCaret);
                    }
                    hexEndCaretPlaced = true;
                }
                const emptyHex = document.createElement('span');
                emptyHex.style.cssText = 'width: 24px; visibility: hidden;';
                bytesDiv.appendChild(emptyHex);
            }
        }

        if (this.canUseInsertCursor && this.canUseInsertCursor() && !hexEndCaretPlaced) {
            const activeCaret = this.createInsertCaretSpan(Math.min(offset + 16, dataLength), 'hex');
            if (activeCaret) {
                bytesDiv.appendChild(activeCaret);
            }
        }
        
        // === COLUNA ASCII/TEXTO ===
        const asciiDiv = document.createElement('div');
        asciiDiv.className = 'hex-ascii';
        asciiDiv.style.cssText = `
            letter-spacing: 0.1px; padding-left: 12px;
            border-left: 2px solid rgba(129, 199, 132, 0.3); 
            display: flex; flex-wrap: nowrap; align-items: center;
            white-space: nowrap; width: max-content; min-width: max-content;
        `;
        const visualScrollUnits = characters.reduce(
            (total, char) => total + String(char.char || '').length,
            0
        );
        asciiDiv.dataset.visualCharCount = String(visualScrollUnits);
        asciiDiv.dataset.visualScrollUnits = String(visualScrollUnits);
        if (typeof this.registerTextColumnScrollUnits === 'function') {
            this.registerTextColumnScrollUnits(visualScrollUnits);
        }
        line.dataset.textVisualUnits = String(visualScrollUnits);
        
        for (let i = 0; i < characters.length; i++) {
            const char = characters[i];

            if (this.canUseInsertCursor && this.canUseInsertCursor()) {
                const activeCaret = this.createInsertCaretSpan(char.startOffset, 'ascii');
                if (activeCaret) {
                    asciiDiv.appendChild(activeCaret);
                }
            }
            
            const asciiSpan = document.createElement('span');
            asciiSpan.textContent = char.char;
            asciiSpan.dataset.offset = char.startOffset;
            asciiSpan.dataset.panel = 'ascii';
            asciiSpan.dataset.charStartOffset = char.startOffset;
            asciiSpan.dataset.charEndOffset = char.endOffset;
            asciiSpan.dataset.charType = char.type;
            asciiSpan.dataset.charText = char.char;
            asciiSpan.dataset.charByteLength = char.byteLength;
            asciiSpan.dataset.isSpecialSequence = char.isSpecialSequence;
            
            // Aplicar cores personalizadas ao texto
            if (this.applyTextColorsToSpan) {
                this.applyTextColorsToSpan(asciiSpan, char.char);
            }
            
            // Largura dinâmica baseada no tipo
            let charWidth;
            if (char.type === '16-bit' || char.type === 'UTF-16') {
                charWidth = Math.max(20, char.char.length * 10); // Reduzido para 16-bit
            } else if (char.isSpecialSequence) {
                charWidth = Math.max(20, char.char.length * 10);
            } else {
                charWidth = 12;
            }
            
            // Cores baseadas no tipo - priorizar configurações do usuário
            let charColor = '#81c784'; // Verde padrão
            
            // Se tiver cores customizadas configuradas, usar elas
            if (this.colorConfig && this.colorConfig.textColors) {
                if (char.isSpecialSequence && char.type === 'TAG') {
                    charColor = this.colorConfig.textColors.tags; // Cor de tags do usuário
                } else if (char.isSpecialSequence && char.type === 'DTE') {
                    charColor = this.colorConfig.textColors.dte || '#9C27B0'; // Cor DTE do usuário
                } else if (char.isSpecialSequence && char.type === 'MTE') {
                    charColor = this.colorConfig.textColors.mte || '#E91E63'; // Cor MTE do usuário
                } else if (char.type === '16-bit' || char.type === 'UTF-16') {
                    charColor = this.colorConfig.textColors.numbers || '#FF6B35';
                } else {
                    charColor = this.getTextColor(char.char);
                }
            } else if (char.isSpecialSequence && char.type === 'TAG') {
                charColor = '#FF9800'; // Fallback: Laranja para TAG sequences
            } else if (char.isSpecialSequence && char.type === 'DTE') {
                charColor = '#9C27B0'; // Fallback: Roxo para DTE
            } else if (char.isSpecialSequence && char.type === 'MTE') {
                charColor = '#E91E63'; // Fallback: Rosa para MTE
            } else if (char.isSpecialSequence && (char.type === 'shift-jis-2byte' || char.type === 'shift-jis-half')) {
                charColor = '#4CAF50'; // Fallback: Verde para Shift-JIS
            } else if (char.type === '16-bit' || char.type === 'UTF-16') {
                charColor = '#FF6B35'; // Fallback: Laranja para 16-bit
            } else if (this.useCharColors && this.applyCharColorAdvanced) {
                charColor = this.applyCharColorAdvanced(char.char);
            }
            
            asciiSpan.style.cssText = `
                width: ${charWidth}px; text-align: center; cursor: pointer;
                padding: ${(char.type === '16-bit' || char.type === 'UTF-16') ? '0 0.5px' : '0 1px'}; border-radius: 2px; user-select: none;
                color: ${charColor}; display: inline-block; font-weight: 500;
                transition: all 0.1s ease; margin-right: ${(char.type === '16-bit' || char.type === 'UTF-16') ? '0.5px' : '1px'}; min-height: 16px;
                line-height: 16px;
                font-family: var(--editor-font-family, 'JetBrains Mono', monospace);
                font-size: var(--editor-font-size, 15px);
            `;
            
            
            // Estados visuais
            const isSelected = (char.startOffset >= selStart && char.endOffset <= selEnd) && selStart !== selEnd;
            const isCursor = !(this.canUseInsertCursor && this.canUseInsertCursor()) &&
                (this.cursorPosition >= char.startOffset && this.cursorPosition <= char.endOffset);
            
            if (this.activePanel === 'ascii') {
                if (isSelected) {
                    asciiSpan.style.background = 'linear-gradient(135deg, rgba(255, 107, 53, 0.6), rgba(247, 147, 30, 0.6))';
                    asciiSpan.style.color = 'white';
                    asciiSpan.style.fontWeight = 'bold';
                    asciiSpan.style.boxShadow = '0 0 8px rgba(255, 107, 53, 0.8)';
                }
                
                if (isCursor) {
                    asciiSpan.style.background = 'linear-gradient(135deg, #ff6b35, #f7931e)';
                    asciiSpan.style.color = 'white';
                    asciiSpan.style.fontWeight = 'bold';
                    asciiSpan.style.boxShadow = '0 0 10px rgba(255, 107, 53, 1)';
                    asciiSpan.style.border = '2px solid #ff6b35';
                }
            }
            
            // Tooltip informativo
            let tooltipText = `"${char.char}" | ${char.type} | ${char.byteLength} byte${char.byteLength > 1 ? 's' : ''} | 0x${char.startOffset.toString(16).toUpperCase()}`;
            if (char.isSpecialSequence) {
                tooltipText += ` | ${char.type} Sequence`;
            }
            asciiSpan.title = tooltipText;
            
            asciiDiv.appendChild(asciiSpan);
        }

        if (this.canUseInsertCursor && this.canUseInsertCursor()) {
            const lastChar = characters[characters.length - 1];
            const endOffset = lastChar
                ? Math.min(lastChar.endOffset + 1, dataLength)
                : Math.min(offset, dataLength);
            const activeCaret = this.createInsertCaretSpan(endOffset, 'ascii');
            if (activeCaret) {
                asciiDiv.appendChild(activeCaret);
            }
        }
        
        line.appendChild(offsetDiv);
        line.appendChild(bytesDiv);
        asciiDiv.style.willChange = 'transform';
        const asciiViewport = document.createElement('div');
        asciiViewport.className = 'hex-ascii-viewport';
        asciiViewport.appendChild(asciiDiv);
        line.appendChild(asciiViewport);
        
        return line;
    };
    
    // === CORREÇÃO 8: CLICK HANDLER CORRIGIDO ===
    if (!window.hexEditor._originalContentClickHandler) {
        window.hexEditor._originalContentClickHandler = window.hexEditor._contentClickHandler;
    }
    
    window.hexEditor._contentClickHandler = function(e) {
        const target = e.target;
        const panel = target.dataset?.panel;
        
        if (!panel) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const charStartOffset = parseInt(target.dataset.charStartOffset);
        const charEndOffset = parseInt(target.dataset.charEndOffset);
        const charType = target.dataset.charType;
        const charText = target.dataset.charText;
        const charByteLength = parseInt(target.dataset.charByteLength) || 1;

        if (this.canUseInsertCursor && this.canUseInsertCursor() && !e.shiftKey) {
            const insertPos = this.resolveInsertCursorPosition(target, e, parseInt(target.dataset.offset, 10));
            this.setInsertCursor(insertPos, panel);
            this.focusEditor();
            return;
        }
        
        
        // Seleção inteligente
        if (!isNaN(charStartOffset) && !isNaN(charEndOffset)) {
            if (e.shiftKey) {
                // Shift+click para estender seleção
                this.selectionEnd = charEndOffset;
                this.cursorPosition = charStartOffset;
            } else {
                // Click normal para selecionar caractere completo
                this.selectionStart = charStartOffset;
                this.selectionEnd = charEndOffset;
                this.cursorPosition = charStartOffset;
            }
            
            this.activePanel = panel;
            this.completeRenderWithColors(this.currentScrollPercent, true);
            
            // Mostrar notificação para tipos especiais
            if (charType === 'DTE' || charType === 'MTE' || charType === '16-bit' || charType === 'UTF-16') {
                this.showTableNotification(charType, charText, charByteLength, charStartOffset);
            }
            
            this.focusEditor();
            
        } else {
            // Fallback para offset simples
            const offset = parseInt(target.dataset.offset);
            if (!isNaN(offset)) {
                if (e.shiftKey) {
                    this.selectionEnd = offset;
                    this.cursorPosition = offset;
                } else {
                    this.selectionStart = offset;
                    this.selectionEnd = offset;
                    this.cursorPosition = offset;
                }
                this.activePanel = panel;
                this.completeRenderWithColors(this.currentScrollPercent, true);
                this.focusEditor();
            }
        }
    }.bind(window.hexEditor);
    
    // === CORREÇÃO 9: NOTIFICAÇÃO MELHORADA ===
    window.hexEditor.showTableNotification = function(type, text, byteLength, offset) {
        const colors = {
            'DTE': '#9C27B0',
            'MTE': '#E91E63',
            '16-bit': '#FF6B35'
        };
        const color = colors[type] || '#81C784';
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 120px; right: 20px;
            background: linear-gradient(135deg, ${color}90, ${color}70);
            color: white; padding: 12px 16px; border-radius: 8px;
            font-size: 13px; font-weight: 500; z-index: 10001;
            box-shadow: 0 4px 16px ${color}40; max-width: 280px;
            animation: slideInRight 0.3s ease; border: 1px solid ${color}50;
        `;
        
        notification.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 4px;">ðŸ“‹ ${type} Character Selected</div>
            <div style="font-size: 12px; opacity: 0.95; margin-bottom: 2px;">"${text}"</div>
            <div style="font-size: 11px; opacity: 0.8;">
                ${byteLength} byte${byteLength > 1 ? 's' : ''} â€¢ 0x${offset.toString(16).toUpperCase()}
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease forwards';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 3000);
    };
    
    // Re-bind click handler
    const content = window.hexEditor._content;
    if (content) {
        content.removeEventListener('click', window.hexEditor._contentClickHandler);
        content.addEventListener('click', window.hexEditor._contentClickHandler);
    }
    
}

// === FUNÇÃO DE TESTE ===
function testTableFix() {
    
    const tableInfo = window.hexEditor.getTableInfo();
    const sample16 = window.hexEditor.getRangeAt ? window.hexEditor.getRangeAt(0, 16) : new Uint8Array(0);
    
    if (tableInfo.is16bit) {
        const decoded = window.hexEditor.decode16BitText(sample16, 0, 8);
    }
    
    if (tableInfo.isDTE) {
        const decoded = window.hexEditor.decodeDTEText(sample16, 0, 16);
    }
    
    if (tableInfo.isMTE) {
        const decoded = window.hexEditor.decodeMTEText(sample16, 0, 16);
    }
    
    const characters = window.hexEditor.generateCharacterMap(0, 16);
    
    for (let i = 0; i < Math.min(5, characters.length); i++) {
        const char = characters[i];
    }
    
    // Forçar re-render
    window.hexEditor.render();
    
}

// === FUNÇÃO DE RESTAURAÇÃO ===
function restoreOriginalTableSystem() {
    
    if (window.hexEditor._originalCreateCompleteLineWithColors) {
        window.hexEditor.createCompleteLineWithColors = window.hexEditor._originalCreateCompleteLineWithColors;
        
        if (window.hexEditor._originalContentClickHandler) {
            window.hexEditor._contentClickHandler = window.hexEditor._originalContentClickHandler;
            
            const content = window.hexEditor._content;
            if (content) {
                content.removeEventListener('click', window.hexEditor._contentClickHandler);
                content.addEventListener('click', window.hexEditor._contentClickHandler);
            }
        }
        
        window.hexEditor.render();
    } else {
        // console.warn('⚠️ Backup do sistema original não encontrado');
    }
}

// === FUNÇÃO DE DEPURAÇÃO ===
function debugTableSystem() {
    
    const editor = window.hexEditor;
    
    
    const tableInfo = editor.getTableInfo();
    
    if (editor.charTables && editor.charTables[editor.currentCharTable]) {
        const currentTable = editor.charTables[editor.currentCharTable];
        
        if (currentTable.mappings) {
            const mappingCount = Object.keys(currentTable.mappings).length;
        }
        
        if (currentTable.dte_sequences) {
            const dteCount = Object.keys(currentTable.dte_sequences).length;
        }
        
        if (currentTable.mte_sequences) {
            const mteCount = Object.keys(currentTable.mte_sequences).length;
        }
        
        if (currentTable.terminators) {
        }
    }
    
    if (editor.charDecoder16) {
    }
    
    // Testar decodificação nos primeiros bytes
    if (editor.data && editor.data.length > 0) {
        
        const testOffset = 0;
        const testLength = Math.min(16, editor.data.length);
        
        //     .map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(' ')}`);
        
        const decoded = editor.decodeTextAtOffsetFixed(testOffset, testLength);
        
        const characters = editor.generateCharacterMap(testOffset, testLength);
        
        characters.slice(0, 3).forEach((char, i) => {
        });
    }
    
}

// === INICIALIZAÇÃO AUTOMÁTICA ===
function initTableFix() {
    if (window.hexEditor && typeof window.hexEditor === 'object') {
        createFixedTableSystem();
        
        // Disponibilizar funções globais
        window.testTableFix = testTableFix;
        window.restoreOriginalTableSystem = restoreOriginalTableSystem;
        window.debugTableSystem = debugTableSystem;
        
        
        return true;
    }
    return false;
}

// Aguardar editor estar pronto
(function waitForEditor() {
    if (!initTableFix()) {
        setTimeout(waitForEditor, 100);
    }
})();

