Object.assign(FoxyHexEditorComplete.prototype, {
// === GAME ANALYSIS METHODS ===

async analyzeROM() {
    this._showAnalysisProgressModal();
    this._updateAnalysisProgress(0);

    const analysis = {
        fileSize: this.getDataLength(),
        format: null, // null para que o renderer use a tradução correta
        sections: [],
        textStrings: [],
        patterns: [],
        entropy: 0,
        entropyDetails: null,
        scanMode: 'full',
        tableName: null,
        timestamp: new Date()
    };

    // ROM format detection and analysis
    if (this.getDataLength() >= 4) {
        if (this.getByteAt(0) === 0x4E && this.getByteAt(1) === 0x45 && 
            this.getByteAt(2) === 0x53 && this.getByteAt(3) === 0x1A) {
            analysis.format = 'NES ROM (iNES format)';
            analysis.sections = this.analyzeNESROM();
        } else if (
            this.getDataLength() >= 0x8006 &&
            this.getByteAt(0x8000) === 0x01 &&
            this.getByteAt(0x8001) === 0x43 &&
            this.getByteAt(0x8002) === 0x44 &&
            this.getByteAt(0x8003) === 0x30 &&
            this.getByteAt(0x8004) === 0x30 &&
            this.getByteAt(0x8005) === 0x31
        ) {
            analysis.format = 'ISO 9660 disc image';
            analysis.sections = [
                {
                    name: 'System Area',
                    offset: 0,
                    size: 0x8000,
                    type: 'header',
                    description: 'Reserved lead-in before the primary volume descriptor.'
                },
                {
                    name: 'Primary Volume Descriptor',
                    offset: 0x8000,
                    size: 2048,
                    type: 'data',
                    description: 'Main ISO-9660 descriptor block with filesystem metadata.'
                }
            ];
        } else if (this.getDataLength() >= 0x8000) {
            const snesAnalysis = this.analyzeSNESROM();
            if (snesAnalysis) {
                analysis.format = 'SNES ROM';
                analysis.sections = snesAnalysis;
            }
        }
    }

    const dataLen = this.getDataLength();
    const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB chunks
    const ANALYSIS_FULL_SCAN_LIMIT = 128 * 1024 * 1024; // acima disso usa amostragem
    const SAMPLE_CHUNK_SIZE = dataLen > 512 * 1024 * 1024 ? 768 * 1024 : 1 * 1024 * 1024;
    const SAMPLE_CHUNKS = dataLen > 512 * 1024 * 1024 ? 160 : 128;
    const useSampledAnalysis = !!this.isLargeFileActive?.() || dataLen > ANALYSIS_FULL_SCAN_LIMIT;
    analysis.scanMode = useSampledAnalysis ? 'sampled' : 'full';
    
    // Limits
    const MAX_STRINGS = 20000;
    const MAX_PATTERNS = 10000;

    // Pattern state
    const byteCounts = new Float64Array(256);
    let zeroStart = -1;
    let zeroLength = 0;

    // Text state
    const currentTable = this.charTables && this.currentCharTable ? this.charTables[this.currentCharTable] : null;
    analysis.tableName = currentTable?.name || null;
    let is16bit = false;
    let isShiftJIS = false;
    let isCustom8bit = false;
    if (currentTable) {
        is16bit = (currentTable.type === '16-bit' || currentTable.type === 'UTF-16');
        isShiftJIS = ((currentTable.type === 'shift-jis' || currentTable.type === 'shift_jis') || currentTable._isShiftJIS === true);
        isCustom8bit = !is16bit && !isShiftJIS && this.currentCharTable !== 'ascii';
    }
    
    let currentString = '';
    let stringStart = -1;
    let shiftJisSkip = false;
    let text16Skip = false;
    let customTableSkip = 0;

    // Fetch chunk through the unified editor API
    const getChunkAsync = async (offset, length) => this.getRangeAtAsync(offset, length);

    const analysisPasses = [];
    if (useSampledAnalysis) {
        const effectiveChunkSize = Math.min(SAMPLE_CHUNK_SIZE, dataLen);
        const sampleCount = Math.min(SAMPLE_CHUNKS, Math.max(1, Math.ceil(dataLen / effectiveChunkSize)));
        const maxStart = Math.max(0, dataLen - effectiveChunkSize);

        if (sampleCount === 1 || maxStart === 0) {
            analysisPasses.push({ offset: 0, length: effectiveChunkSize });
        } else {
            for (let i = 0; i < sampleCount; i++) {
                const ratio = i / (sampleCount - 1);
                const offset = Math.floor(maxStart * ratio);
                analysisPasses.push({ offset, length: effectiveChunkSize });
            }
        }
    } else {
        for (let offset = 0; offset < dataLen; offset += CHUNK_SIZE) {
            analysisPasses.push({
                offset,
                length: Math.min(CHUNK_SIZE, dataLen - offset)
            });
        }
    }

    let analyzedBytes = 0;

    for (let passIndex = 0; passIndex < analysisPasses.length; passIndex++) {
        const { offset, length } = analysisPasses[passIndex];
        analyzedBytes += length;
        
        let chunk = await getChunkAsync(offset, length);
        const view = ArrayBuffer.isView(chunk) ? chunk : new Uint8Array(chunk);

        if (useSampledAnalysis) {
            zeroStart = -1;
            zeroLength = 0;
            currentString = '';
            stringStart = -1;
            shiftJisSkip = false;
            text16Skip = false;
            customTableSkip = 0;
        }
        
        for (let i = 0; i < length; i++) {
            const b1 = view[i];
            const globalOffset = offset + i;
            
            // 1. Patterns & Entropy
            byteCounts[b1]++;
            if (b1 === 0) {
                if (zeroStart === -1) zeroStart = globalOffset;
                zeroLength++;
            } else {
                if (zeroLength >= 8 && analysis.patterns.length < MAX_PATTERNS) {
                    analysis.patterns.push({
                        type: 'zero_padding',
                        start: zeroStart,
                        length: zeroLength
                    });
                }
                zeroStart = -1;
                zeroLength = 0;
            }

            const signature = this.detectCompressionSignature?.(view, i, globalOffset, dataLen);
            if (signature && analysis.patterns.length < MAX_PATTERNS) {
                const signatureKey = `${signature.type}:${signature.start}:${signature.name || ''}`;
                if (!analysis.patterns.some((pattern) => `${pattern.type}:${pattern.start}:${pattern.name || ''}` === signatureKey)) {
                    analysis.patterns.push(signature);
                }
            }
            
            // 2. Text Search
            if (analysis.textStrings.length < MAX_STRINGS) {
                if (customTableSkip > 0) {
                    customTableSkip--;
                    continue;
                }
                if (is16bit && this.charDecoder16) {
                    if (text16Skip) {
                        text16Skip = false;
                        continue;
                    }
                    if (i + 1 < length) {
                        const b2 = view[i+1];
                        let hexCode = this.charDecoder16.endianness === "LE" ?
                            b1.toString(16).padStart(2,'0').toUpperCase() + b2.toString(16).padStart(2,'0').toUpperCase() :
                            b2.toString(16).padStart(2,'0').toUpperCase() + b1.toString(16).padStart(2,'0').toUpperCase();
                        
                        if (this.charDecoder16.terminators.includes(hexCode)) {
                            if (currentString.length >= 2) {
                                analysis.textStrings.push({ offset: stringStart, text: currentString, length: currentString.length * 2, type: '16bit' });
                            }
                            currentString = '';
                            stringStart = -1;
                        } else {
                            const char = this.charDecoder16.mapping[hexCode];
                            if (char !== undefined && char !== '.' && char.length > 0) {
                                if (stringStart === -1) stringStart = globalOffset;
                                currentString += char;
                            } else {
                                if (currentString.length >= 2) {
                                    analysis.textStrings.push({ offset: stringStart, text: currentString, length: currentString.length * 2, type: '16bit' });
                                }
                                currentString = '';
                                stringStart = -1;
                            }
                        }
                        text16Skip = true; 
                    }
                } 
                else if (isShiftJIS) {
                    if (shiftJisSkip) { shiftJisSkip = false; continue; }
                    if (b1 >= 0x20 && b1 <= 0x7E) {
                        if (stringStart === -1) stringStart = globalOffset;
                        currentString += String.fromCharCode(b1);
                    } else if (b1 >= 0xA1 && b1 <= 0xDF) {
                        if (stringStart === -1) stringStart = globalOffset;
                        const key = b1.toString(16).toUpperCase().padStart(2, '0');
                        const ch = this.charTables[this.currentCharTable].mappings[key] || '.';
                        currentString += ch;
                    } else if ((b1 >= 0x81 && b1 <= 0x9F) || (b1 >= 0xE0 && b1 <= 0xFC)) {
                        if (i + 1 < length) {
                            const b2 = view[i+1];
                            const validTrail = (b2 >= 0x40 && b2 <= 0x7E) || (b2 >= 0x80 && b2 <= 0xFC);
                            if (validTrail) {
                                if (stringStart === -1) stringStart = globalOffset;
                                const key2 = b1.toString(16).toUpperCase().padStart(2, '0') + b2.toString(16).toUpperCase().padStart(2, '0');
                                const ch = this.charTables[this.currentCharTable].mappings[key2] || '.';
                                currentString += ch;
                                shiftJisSkip = true;
                            } else {
                                if (currentString.length >= 2) analysis.textStrings.push({ offset: stringStart, text: currentString, length: globalOffset - stringStart, type: 'shift-jis' });
                                currentString = ''; stringStart = -1;
                            }
                        }
                    } else {
                        if (currentString.length >= 2) analysis.textStrings.push({ offset: stringStart, text: currentString, length: globalOffset - stringStart, type: 'shift-jis' });
                        currentString = ''; stringStart = -1;
                    }
                } 
                else {
                    const singleByteHex = b1.toString(16).toUpperCase().padStart(2, '0');
                    const doubleByteHex = i + 1 < length
                        ? singleByteHex + view[i + 1].toString(16).toUpperCase().padStart(2, '0')
                        : null;
                    const isCustomTerminator = isCustom8bit && Array.isArray(currentTable?.terminators) && currentTable.terminators.includes(singleByteHex);
                    const isCustomDoubleTerminator = isCustom8bit && !!doubleByteHex && Array.isArray(currentTable?.terminators) && currentTable.terminators.includes(doubleByteHex);
                    const customDecodedDouble = isCustom8bit && doubleByteHex
                        ? (
                            currentTable?.tag_sequences?.[doubleByteHex] ||
                            currentTable?.dte_sequences?.[doubleByteHex] ||
                            currentTable?.mte_sequences?.[doubleByteHex] ||
                            currentTable?.mappings?.[doubleByteHex] ||
                            ''
                        )
                        : '';
                    const customDecoded = isCustom8bit && typeof this.decodeBytesWithCurrentTable === 'function'
                        ? this.decodeBytesWithCurrentTable([b1])
                        : '';

                    if (isCustomDoubleTerminator) {
                        if (currentString.length >= 2) {
                            analysis.textStrings.push({
                                offset: stringStart,
                                text: currentString,
                                length: currentString.length,
                                type: 'custom-table'
                            });
                        }
                        currentString = '';
                        stringStart = -1;
                        customTableSkip = 1;
                    } else if (isCustomTerminator) {
                        if (currentString.length >= 2) {
                            analysis.textStrings.push({
                                offset: stringStart,
                                text: currentString,
                                length: currentString.length,
                                type: 'custom-table'
                            });
                        }
                        currentString = '';
                        stringStart = -1;
                    } else if (isCustom8bit && customDecodedDouble && customDecodedDouble !== '.' && customDecodedDouble !== '..') {
                        if (stringStart === -1) stringStart = globalOffset;
                        currentString += customDecodedDouble;
                        customTableSkip = 1;
                    } else if (isCustom8bit && customDecoded && customDecoded !== '.' && customDecoded !== '..') {
                        if (stringStart === -1) stringStart = globalOffset;
                        currentString += customDecoded;
                    } else if (b1 >= 32 && b1 <= 126) {
                        if (stringStart === -1) stringStart = globalOffset;
                        currentString += String.fromCharCode(b1);
                    } else {
                        if (currentString.length >= 4) {
                            analysis.textStrings.push({
                                offset: stringStart,
                                text: currentString,
                                length: currentString.length,
                                type: isCustom8bit ? 'custom-table' : 'ascii'
                            });
                        }
                        currentString = '';
                        stringStart = -1;
                    }
                }
            }
        }
        
        if (useSampledAnalysis) {
            if (zeroLength >= 8 && analysis.patterns.length < MAX_PATTERNS) {
                analysis.patterns.push({ type: 'zero_padding', start: zeroStart, length: zeroLength });
            }
            if (currentString.length >= 4 && !is16bit && !isShiftJIS && analysis.textStrings.length < MAX_STRINGS) {
                analysis.textStrings.push({
                    offset: stringStart,
                    text: currentString,
                    length: currentString.length,
                    type: isCustom8bit ? 'custom-table' : 'ascii'
                });
            } else if (currentString.length >= 2 && analysis.textStrings.length < MAX_STRINGS) {
                analysis.textStrings.push({ offset: stringStart, text: currentString, length: currentString.length * (is16bit ? 2 : 1), type: is16bit ? '16bit' : 'shift-jis' });
            }
        }

        let progress = ((passIndex + 1) / analysisPasses.length) * 100;
        this._updateAnalysisProgress(progress);
        await new Promise(r => setTimeout(r, 0));
    }
    
    // Finalizações do estado pendente
    if (zeroLength >= 8 && analysis.patterns.length < MAX_PATTERNS) {
        analysis.patterns.push({ type: 'zero_padding', start: zeroStart, length: zeroLength });
    }
    if (currentString.length >= 4 && !is16bit && !isShiftJIS && analysis.textStrings.length < MAX_STRINGS) {
        analysis.textStrings.push({
            offset: stringStart,
            text: currentString,
            length: currentString.length,
            type: isCustom8bit ? 'custom-table' : 'ascii'
        });
    } else if (currentString.length >= 2 && analysis.textStrings.length < MAX_STRINGS) {
        analysis.textStrings.push({ offset: stringStart, text: currentString, length: currentString.length * (is16bit ? 2 : 1), type: is16bit ? '16bit' : 'shift-jis' });
    }
    
    for (let b = 0; b < 256; b++) {
        const count = byteCounts[b];
        if (count > 10) {
            analysis.patterns.push({
                type: 'repeated',
                byte: b,
                count: count,
                percentage: ((count / Math.max(1, analyzedBytes || dataLen)) * 100).toFixed(2)
            });
        }
    }
    analysis.patterns.sort((a, b) => (b.count || 0) - (a.count || 0));
    
    let entropy = 0;
    for (let count of byteCounts) {
        if (count > 0) {
            const p = count / Math.max(1, analyzedBytes || dataLen);
            entropy -= p * Math.log2(p);
        }
    }
    analysis.entropy = entropy;
    analysis.entropyDetails = await this.buildEntropyDetails(byteCounts, Math.max(1, analyzedBytes || dataLen), getChunkAsync, entropy);
    if (analysis.entropyDetails) {
        analysis.entropyDetails.sampled = useSampledAnalysis;
        analysis.entropyDetails.analyzedBytes = analyzedBytes;
        analysis.entropyDetails.sourceFileSize = dataLen;
        analysis.entropyDetails.coverageRatio = dataLen > 0 ? analyzedBytes / dataLen : 1;
    }
    if (analysis.textStrings.length > 0) {
        analysis.textStrings.sort((a, b) => a.offset - b.offset);
        const extraSections = this.buildTextSectionsFromAnalysis?.(analysis.textStrings, dataLen) || [];
        if (extraSections.length > 0) {
            analysis.sections = [...analysis.sections, ...extraSections].sort((a, b) => a.offset - b.offset);
        }
    }

    this._updateAnalysisProgress(100);
    setTimeout(() => this._hideAnalysisProgressModal(), 500);

    this.gameAnalysis = analysis;
    this.updateAnalysisDisplay();
    this.showAnalysisModal();
    this.emit('analysisComplete', analysis);
    return analysis;
},

async analyzeGameStructure() {
    return await this.analyzeROM();
},

detectCompressionSignature(view, index, globalOffset, dataLen) {
    if (!view || index < 0 || index >= view.length) return null;

    const matchBytes = (...bytes) => bytes.every((byte, offset) => view[index + offset] === byte);

    if (index + 4 <= view.length && matchBytes(0x59, 0x61, 0x7A, 0x30)) {
        return { type: 'compression_signature', name: 'Yaz0', start: globalOffset, length: 16, note: 'Nintendo Yaz0 header detected.' };
    }
    if (index + 4 <= view.length && matchBytes(0x59, 0x61, 0x79, 0x30)) {
        return { type: 'compression_signature', name: 'Yay0', start: globalOffset, length: 16, note: 'Nintendo Yay0 header detected.' };
    }
    if (index + 4 <= view.length && view[index] === 0x52 && view[index + 1] === 0x4E && view[index + 2] === 0x43 && (view[index + 3] === 0x01 || view[index + 3] === 0x02)) {
        return { type: 'compression_signature', name: `RNC v${view[index + 3]}`, start: globalOffset, length: 18, note: 'RNC compression header detected.' };
    }
    if (index + 3 <= view.length && matchBytes(0x1F, 0x8B, 0x08)) {
        return { type: 'compression_signature', name: 'GZIP', start: globalOffset, length: 10, note: 'GZIP header detected.' };
    }
    if (index + 2 <= view.length && view[index] === 0x78 && [0x01, 0x5E, 0x9C, 0xDA].includes(view[index + 1])) {
        return { type: 'compression_signature', name: 'ZLIB/DEFLATE', start: globalOffset, length: 6, note: 'Common zlib/deflate header detected.' };
    }
    if (index + 4 <= view.length && (view[index] === 0x10 || view[index] === 0x11)) {
        const unpackedSize = view[index + 1] | (view[index + 2] << 8) | (view[index + 3] << 16);
        if (unpackedSize >= 32 && unpackedSize <= Math.max(0x8000, dataLen * 4)) {
            return {
                type: 'compression_hint',
                name: `LZ${view[index] === 0x10 ? '77' : '11'} candidate`,
                start: globalOffset,
                length: 4,
                note: `Nintendo-style 0x${view[index].toString(16).toUpperCase()} stream header candidate.`
            };
        }
    }

    return null;
},

buildTextSectionsFromAnalysis(strings, fileSize) {
    if (!Array.isArray(strings) || strings.length < 4) return [];

    const sections = [];
    const maxGap = Math.max(0x400, Math.floor(fileSize * 0.0025));
    let clusterStart = strings[0].offset;
    let clusterEnd = strings[0].offset + strings[0].length;
    let clusterCount = 1;

    const pushCluster = () => {
        if (clusterCount >= 4 && (clusterEnd - clusterStart) >= 64) {
            sections.push({
                offset: clusterStart,
                size: clusterEnd - clusterStart,
                type: 'strings',
                name: `Text Cluster ${sections.length + 1}`,
                description: `${clusterCount} decoded strings grouped in this region`
            });
        }
    };

    for (let i = 1; i < strings.length; i++) {
        const entry = strings[i];
        if (entry.offset - clusterEnd <= maxGap) {
            clusterEnd = Math.max(clusterEnd, entry.offset + entry.length);
            clusterCount++;
        } else {
            pushCluster();
            clusterStart = entry.offset;
            clusterEnd = entry.offset + entry.length;
            clusterCount = 1;
        }
    }

    pushCluster();
    return sections.slice(0, 12);
},

calculateEntropyFromCounts(byteCounts, totalBytes) {
    if (!totalBytes || totalBytes <= 0) return 0;

    let entropy = 0;
    for (const count of byteCounts) {
        if (count > 0) {
            const p = count / totalBytes;
            entropy -= p * Math.log2(p);
        }
    }
    return entropy;
},

async sampleWindowEntropies(dataLen, getChunkAsync, windowSize = 4096, maxWindows = 64) {
    if (!dataLen || dataLen <= 0) {
        return [];
    }

    const effectiveWindowSize = Math.min(windowSize, dataLen);
    const sampleCount = Math.min(maxWindows, Math.max(1, Math.ceil(dataLen / effectiveWindowSize)));
    const maxStart = Math.max(0, dataLen - effectiveWindowSize);
    const starts = [];

    if (sampleCount === 1 || maxStart === 0) {
        starts.push(0);
    } else {
        for (let i = 0; i < sampleCount; i++) {
            const ratio = i / (sampleCount - 1);
            starts.push(Math.floor(maxStart * ratio));
        }
    }

    const windows = [];
    for (const start of starts) {
        const chunk = await getChunkAsync(start, effectiveWindowSize);
        const view = ArrayBuffer.isView(chunk) ? chunk : new Uint8Array(chunk);
        const counts = new Uint32Array(256);
        let asciiCount = 0;
        let zeroCount = 0;

        for (let i = 0; i < view.length; i++) {
            const byte = view[i];
            counts[byte]++;
            if (byte === 0x00) zeroCount++;
            if ((byte >= 0x20 && byte <= 0x7E) || byte === 0x09 || byte === 0x0A || byte === 0x0D) {
                asciiCount++;
            }
        }

        windows.push({
            start,
            size: view.length,
            entropy: this.calculateEntropyFromCounts(counts, view.length),
            asciiRatio: view.length > 0 ? asciiCount / view.length : 0,
            zeroRatio: view.length > 0 ? zeroCount / view.length : 0
        });
    }

    return windows;
},

async buildEntropyDetails(byteCounts, dataLen, getChunkAsync, globalEntropy) {
    if (!dataLen || dataLen <= 0) {
        return {
            value: 0,
            classification: 'empty',
            label: 'Sem dados',
            summary: 'Arquivo vazio ou sem dados suficientes para análise.',
            compressionLikelihood: 'unknown'
        };
    }

    const windows = await this.sampleWindowEntropies(dataLen, getChunkAsync);
    const zeroByteRatio = byteCounts[0] / dataLen;
    const printableAsciiCount = byteCounts.slice(0x20, 0x7F).reduce((sum, count) => sum + count, 0) + byteCounts[0x09] + byteCounts[0x0A] + byteCounts[0x0D];
    const asciiRatio = printableAsciiCount / dataLen;
    let uniqueByteCount = 0;
    let dominantByteCount = 0;

    for (const count of byteCounts) {
        if (count > 0) uniqueByteCount++;
        if (count > dominantByteCount) dominantByteCount = count;
    }

    const uniqueByteRatio = uniqueByteCount / 256;
    const dominantByteRatio = dominantByteCount / dataLen;
    const windowEntropies = windows.map((window) => window.entropy);
    const avgWindowEntropy = windowEntropies.length > 0
        ? windowEntropies.reduce((sum, value) => sum + value, 0) / windowEntropies.length
        : globalEntropy;
    const minWindowEntropy = windowEntropies.length > 0 ? Math.min(...windowEntropies) : globalEntropy;
    const maxWindowEntropy = windowEntropies.length > 0 ? Math.max(...windowEntropies) : globalEntropy;
    const entropyStdDev = windowEntropies.length > 0
        ? Math.sqrt(windowEntropies.reduce((sum, value) => sum + Math.pow(value - avgWindowEntropy, 2), 0) / windowEntropies.length)
        : 0;
    const highEntropyWindowRatio = windows.length > 0
        ? windows.filter((window) => window.entropy >= 7.2).length / windows.length
        : 0;
    const lowEntropyWindowRatio = windows.length > 0
        ? windows.filter((window) => window.entropy <= 4.5).length / windows.length
        : 0;

    let classification = 'mixed_binary';
    let label = 'Binário misto';
    let summary = 'Arquivo binário com mistura de código, dados e recursos.';
    let compressionLikelihood = 'unlikely';

    if (zeroByteRatio >= 0.35 || dominantByteRatio >= 0.28 || globalEntropy < 4.0) {
        classification = 'structured';
        label = 'Estruturado';
        summary = 'Dados bem estruturados, com padding, tabelas ou repetições. Compressão é improvável.';
        compressionLikelihood = 'unlikely';
    } else if (asciiRatio >= 0.45 && globalEntropy < 6.2) {
        classification = 'text_heavy';
        label = 'Texto/script';
        summary = 'Há bastante texto legível ou scripts embutidos. O arquivo não parece predominantemente comprimido.';
        compressionLikelihood = 'unlikely';
    } else if (
        globalEntropy >= 7.35 &&
        avgWindowEntropy >= 7.1 &&
        entropyStdDev <= 0.55 &&
        asciiRatio <= 0.18 &&
        zeroByteRatio <= 0.12 &&
        uniqueByteRatio >= 0.70 &&
        dominantByteRatio <= 0.10 &&
        highEntropyWindowRatio >= 0.65
    ) {
        classification = 'compressed_likely';
        label = 'Compressão provável';
        summary = 'A distribuição de bytes é consistentemente muito alta em quase todas as janelas. Isso parece compressão, criptografia ou mídia já codificada.';
        compressionLikelihood = 'likely';
    } else if (
        globalEntropy >= 6.9 &&
        avgWindowEntropy >= 6.6 &&
        asciiRatio <= 0.28 &&
        zeroByteRatio <= 0.20 &&
        highEntropyWindowRatio >= 0.40
    ) {
        classification = 'dense_binary';
        label = 'Binário denso';
        summary = 'Os dados são densos e variados, mas não há evidência forte o bastante para afirmar compressão. Pode ser executável, gráficos, áudio ou recursos de jogo.';
        compressionLikelihood = 'possible';
    }

    return {
        value: globalEntropy,
        classification,
        label,
        summary,
        compressionLikelihood,
        zeroByteRatio,
        asciiRatio,
        uniqueByteCount,
        uniqueByteRatio,
        dominantByteRatio,
        avgWindowEntropy,
        minWindowEntropy,
        maxWindowEntropy,
        entropyStdDev,
        highEntropyWindowRatio,
        lowEntropyWindowRatio,
        sampledWindows: windows.length
    };
},

_showAnalysisProgressModal() {
    if (document.getElementById('analysis-progress-modal')) return;
    
    const modal = document.createElement('div');
    modal.id = 'analysis-progress-modal';
    const i18n = window.I18n || { t: (k) => k };
    const title = i18n.t('tool.analysis.title') || 'Análise de Arquivo';
    const startingText = i18n.t('search.progress.starting') || 'Iniciando análise...';
    
    modal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.8); display: flex; justify-content: center;
                    align-items: center; z-index: 9999999;">
            <div style="background: linear-gradient(135deg, #1a1a2e, #16213e);
                        padding: 30px; border-radius: 12px; text-align: center;
                        min-width: 300px; border: 1px solid rgba(255, 255, 255, 0.1);
                        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5); color: #ffffff;">
                <h3 style="color: #ff6b35; margin-bottom: 20px;">${title}</h3>
                <div style="width: 100%; height: 20px;
                     background: rgba(26, 26, 46, 0.8); border-radius: 10px; margin: 20px 0;
                     overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.2);">
                    <div id="analysis-progress-fill" style="height: 100%; background: #ff6b35;
                         width: 0%; transition: width 0.3s; pointer-events: none;"></div>
                </div>
                <p id="analysis-progress-text" style="color: #ffffff;">${startingText}</p>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
},

_updateAnalysisProgress(percent) {
    const fill = document.getElementById('analysis-progress-fill');
    const text = document.getElementById('analysis-progress-text');
    if (fill && text) {
        const validPercent = Math.max(0, Math.min(100, Math.round(percent)));
        fill.style.width = validPercent + '%';
        const i18n = window.I18n || { t: (k) => k };
        const labelTemplate = i18n.t('search.progress.label') || '{percent}% concluído';
        text.textContent = labelTemplate.replace('{percent}', validPercent);
    }
},

_hideAnalysisProgressModal() {
    const modal = document.getElementById('analysis-progress-modal');
    if (modal) {
        modal.remove();
    }
}

});
