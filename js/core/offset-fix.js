class OffsetFix {
    constructor() {
        this.debugMode = true;
    }

    _buildBadCharTable(pattern, caseInsensitive = false) {
        const table = new Int32Array(256);
        const m = pattern.length;
        for (let i = 0; i < 256; i++) table[i] = m;
        for (let i = 0; i < m - 1; i++) {
            const charCode = pattern[i];
            const shiftValue = m - 1 - i;
            table[charCode] = shiftValue;
            if (caseInsensitive) {
                if (charCode >= 65 && charCode <= 90) { // A-Z
                    table[charCode + 32] = shiftValue; // a-z
                } else if (charCode >= 97 && charCode <= 122) { // a-z
                    table[charCode - 32] = shiftValue; // A-Z
                }
            }
        }
        return table;
    }

    _searchBufferBoyerMoore(buffer, pattern, caseSensitive, wholeWord, startOffset, endOffset, prevByte = null) {
        const n = endOffset < 0 ? buffer.length : endOffset;
        const m = pattern.length;
        if (m === 0 || n - startOffset < m) return [];

        const results = [];
        const badChar = this._buildBadCharTable(pattern, !caseSensitive);
        let i = startOffset;
        const limit = n - m;

        const isWordChar = (b) => (b >= 48 && b <= 57) || (b >= 65 && b <= 90) || (b >= 97 && b <= 122);

        while (i <= limit) {
            let j = m - 1;
            let match = true;
            while (j >= 0) {
                let db = buffer[i + j];
                let pb = pattern[j];
                if (!caseSensitive) {
                    if (db >= 65 && db <= 90) db += 32;
                    if (pb >= 65 && pb <= 90) pb += 32;
                }
                if (db !== pb) { match = false; break; }
                j--;
            }
            if (match) {
                if (wholeWord) {
                    let beforeWord = false;
                    if (i > 0) {
                        beforeWord = isWordChar(buffer[i - 1]);
                    } else if (prevByte !== null) {
                        beforeWord = isWordChar(prevByte);
                    }
                    
                    const afterWord = i + m < n && isWordChar(buffer[i + m]);
                    if (beforeWord || afterWord) { i++; continue; }
                }
                results.push(i);
                i++;
            } else {
                i += Math.max(1, badChar[buffer[i + j]] - (m - 1 - j));
            }
        }
        return results;
    }

    async performBinarySearch(filePath, searchTerm, caseSensitive = false, wholeWord = false, maxResults = 50000, is16bit = false, charDecoder16 = null) {
        try {
            const fs = window.require('fs');

            if (!fs.existsSync(filePath)) {
                throw new Error(`Arquivo não encontrado: ${filePath}`);
            }

            const fileStats = fs.statSync(filePath);
            const fileSize = fileStats.size;

            const startTime = Date.now();
            const results = [];

            const searchBytes = Buffer.from(searchTerm, 'utf8');
            const searchLen = searchBytes.length;

            if (searchLen === 0) {
                return { results: [], total: 0, duration: 0, throughput: '0.00' };
            }

            const chunkSize = 4 * 1024 * 1024;
            const overlap = Math.max(0, searchLen - 1);
            const fileHandle = await fs.promises.open(filePath, 'r');

            try {
                let position = 0;
                let totalScanned = 0;
                let lastByteOfPrevChunk = null;

                while (position < fileSize) {
                    const bytesToRead = Math.min(chunkSize + overlap, fileSize - position);
                    const buffer = Buffer.alloc(bytesToRead);
                    const { bytesRead } = await fileHandle.read(buffer, 0, bytesToRead, position);

                    if (bytesRead === 0) break;

                    const isLastChunk = (position + bytesRead >= fileSize);
                    const acceptEnd = isLastChunk ? bytesRead : Math.max(1, bytesRead - overlap);

                    const matches = this._searchBufferBoyerMoore(
                        buffer, searchBytes, caseSensitive, wholeWord, 0, bytesRead, lastByteOfPrevChunk
                    );

                    for (const matchOffset of matches) {
                        if (matchOffset >= acceptEnd) continue;

                        const absoluteOffset = position + matchOffset;
                        const contextStart = Math.max(0, matchOffset - 20);
                        const contextEnd = Math.min(bytesRead, matchOffset + searchLen + 20);
                        const context = buffer.toString('utf8', contextStart, contextEnd);

                        results.push({ offset: absoluteOffset, context });

                        if (results.length >= maxResults) break;
                    }

                    if (results.length >= maxResults) break;

                    if (acceptEnd > 0) {
                        lastByteOfPrevChunk = buffer[acceptEnd - 1];
                    }

                    totalScanned += acceptEnd;
                    position += acceptEnd;

                    if (totalScanned % (10 * 1024 * 1024) === 0) {
                        await new Promise(resolve => setTimeout(resolve, 1));
                    }
                }

                const duration = (Date.now() - startTime) / 1000;
                const throughputMBs = duration > 0 ? (fileSize / 1024 / 1024 / duration).toFixed(2) : '0.00';

                return {
                    results: results,
                    total: results.length,
                    duration: duration,
                    throughput: throughputMBs
                };

            } finally {
                fileHandle.close();
            }

        } catch (error) {
            console.error('Erro na busca binária corrigida:', error);
            throw error;
        }
    }

    async performBinaryHexSearch(filePath, hexPattern, wholeWord = false, maxResults = 50000) {
        try {
            const fs = window.require('fs');

            if (!fs.existsSync(filePath)) {
                throw new Error(`Arquivo não encontrado: ${filePath}`);
            }

            const cleanHex = (hexPattern || '').replace(/\s+/g, '');
            if (!cleanHex || cleanHex.length % 2 !== 0) {
                return { results: [], total: 0, duration: 0, throughput: '0.00' };
            }

            const searchBuffer = Buffer.from(cleanHex, 'hex');
            const searchLength = searchBuffer.length;
            const fileStats = fs.statSync(filePath);
            const fileSize = fileStats.size;
            const startTime = Date.now();
            const results = [];

            const chunkSize = 4 * 1024 * 1024;
            const overlap = Math.max(0, searchLength - 1);
            const fileHandle = await fs.promises.open(filePath, 'r');

            try {
                let position = 0;
                let totalScanned = 0;
                let lastByteOfPrevChunk = null;

                while (position < fileSize) {
                    const bytesToRead = Math.min(chunkSize + overlap, fileSize - position);
                    const buffer = Buffer.alloc(bytesToRead);
                    const { bytesRead } = await fileHandle.read(buffer, 0, bytesToRead, position);

                    if (bytesRead === 0) break;

                    const isLastChunk = (position + bytesRead >= fileSize);
                    const acceptEnd = isLastChunk ? bytesRead : Math.max(1, bytesRead - overlap);

                    const matches = this._searchBufferBoyerMoore(
                        buffer, searchBuffer, true, wholeWord, 0, bytesRead, lastByteOfPrevChunk
                    );

                    for (const matchOffset of matches) {
                        if (matchOffset >= acceptEnd) continue;

                        const absoluteOffset = position + matchOffset;
                        const contextStart = Math.max(0, matchOffset - 20);
                        const contextEnd = Math.min(bytesRead, matchOffset + searchLength + 20);
                        const context = buffer.toString('utf8', contextStart, contextEnd);

                        results.push({ offset: absoluteOffset, context });

                        if (results.length >= maxResults) break;
                    }

                    if (results.length >= maxResults) break;

                    if (acceptEnd > 0) {
                        lastByteOfPrevChunk = buffer[acceptEnd - 1];
                    }

                    totalScanned += acceptEnd;
                    position += acceptEnd;

                    if (totalScanned % (10 * 1024 * 1024) === 0) {
                        await new Promise(resolve => setTimeout(resolve, 1));
                    }
                }

                const duration = (Date.now() - startTime) / 1000;
                const throughputMBs = duration > 0 ? (fileSize / 1024 / 1024 / duration).toFixed(2) : '0.00';
                return { results, total: results.length, duration, throughput: throughputMBs };
            } finally {
                fileHandle.close();
            }
        } catch (error) {
            console.error('Erro na busca binária HEX:', error);
            throw error;
        }
    }

    isWordBoundary(buffer, start, length) {
        const isWordChar = (byte) => {
            return (byte >= 48 && byte <= 57) ||
                   (byte >= 65 && byte <= 90) ||
                   (byte >= 97 && byte <= 122);
        };

        if (start > 0 && isWordChar(buffer[start - 1])) return false;
        if (start + length < buffer.length && isWordChar(buffer[start + length])) return false;

        return true;
    }

    isWordBoundary16bit(buffer, start, length, charDecoder16) {
        const isWordChar16bit = (byteOffset) => {
            if (byteOffset + 1 >= buffer.length) return false;
            const decodedChar = charDecoder16.decode(buffer, byteOffset, 1);
            if (!decodedChar) return false;
            return /[a-zA-Z0-9]/.test(decodedChar);
        };

        if (start > 1 && isWordChar16bit(start - 2)) return false;
        if (start + length < buffer.length - 1 && isWordChar16bit(start + length)) return false;

        return true;
    }
}

window.OffsetFix = OffsetFix;
