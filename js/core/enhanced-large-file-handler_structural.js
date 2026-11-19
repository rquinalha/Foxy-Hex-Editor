(function() {
    if (typeof EnhancedLargeFileHandler === 'undefined') {
        return;
    }

    const sharedInsertData = new WeakSet();

    function ensureStructuralState(handler) {
        if (!Array.isArray(handler.virtualSegments)) {
            handler.virtualSegments = [{
                type: 'source',
                start: 0,
                length: handler.sourceFileSize || handler.fileSize || 0
            }];
        }

        if (typeof handler.sourceFileSize !== 'number') {
            handler.sourceFileSize = handler.fileSize || 0;
        }
    }

    EnhancedLargeFileHandler.prototype.locateSegment = function(virtualOffset, allowEnd = false) {
        ensureStructuralState(this);

        if (virtualOffset < 0 || (!allowEnd && virtualOffset >= this.fileSize) || (allowEnd && virtualOffset > this.fileSize)) {
            return null;
        }

        if (allowEnd && virtualOffset === this.fileSize) {
            return { index: this.virtualSegments.length, segment: null, segmentStart: this.fileSize, offset: 0 };
        }

        if (this.indexedSegments !== this.virtualSegments) {
            let end = 0;
            this.segmentEnds = this.virtualSegments.map(segment => end += segment.length);
            this.indexedSegments = this.virtualSegments;
        }
        let start = 0;
        let end = this.segmentEnds.length;
        while (start < end) {
            const middle = Math.floor((start + end) / 2);
            if (this.segmentEnds[middle] <= virtualOffset) start = middle + 1;
            else end = middle;
        }
        const segment = this.virtualSegments[start];
        if (segment) {
            const segmentStart = this.segmentEnds[start] - segment.length;
            return { index: start, segment, segmentStart, offset: virtualOffset - segmentStart };
        }
        return null;
    };

    EnhancedLargeFileHandler.prototype.getSourceBytes = async function(offset, length) {
        if (offset < 0 || offset >= this.sourceFileSize) {
            return new Uint8Array(0);
        }

        const actualLength = Math.min(length, this.sourceFileSize - offset);
        if (actualLength >= 1024 * 1024 && this.file?.path && window.electronFileHandler) {
            const bytes = await window.electronFileHandler.readFileChunkSafe(this.file.path, offset, actualLength);
            if (bytes.length !== actualLength) throw new Error('Leitura incompleta do arquivo de origem.');
            return bytes;
        }

        const result = new Uint8Array(actualLength);
        let resultOffset = 0;
        let currentOffset = offset;
        let remaining = actualLength;

        while (remaining > 0) {
            const chunkIndex = Math.floor(currentOffset / this.chunkSize);
            const chunk = await this.getChunk(chunkIndex);
            if (!chunk) throw new Error('Falha ao ler bloco do arquivo de origem.');

            const byteIndexInChunk = currentOffset % this.chunkSize;
            const bytesToCopy = Math.min(remaining, chunk.data.length - byteIndexInChunk);
            if (bytesToCopy <= 0) throw new Error('Leitura incompleta do arquivo de origem.');
            result.set(chunk.data.subarray(byteIndexInChunk, byteIndexInChunk + bytesToCopy), resultOffset);
            resultOffset += bytesToCopy;
            currentOffset += bytesToCopy;
            remaining -= bytesToCopy;
        }

        return result;
    };

    EnhancedLargeFileHandler.prototype.getBaseByteSync = function(index) {
        if (index < 0 || index >= this.sourceFileSize) {
            return undefined;
        }

        const chunkIndex = Math.floor(index / this.chunkSize);
        if (this.chunkCache.has(chunkIndex)) {
            const chunk = this.chunkCache.get(chunkIndex);
            const byteIndexInChunk = index % this.chunkSize;
            this.updateAccessOrder(chunkIndex);
            return chunk.data[byteIndexInChunk];
        }

        this.loadChunkInBackground(chunkIndex);
        return 0x00;
    };

    EnhancedLargeFileHandler.prototype.getByteSync = function(index, missingValue = 0x00) {
        ensureStructuralState(this);

        if (index < 0 || index >= this.fileSize) {
            return undefined;
        }

        const location = this.locateSegment(index);
        if (!location || !location.segment) {
            return undefined;
        }

        if (location.segment.type === 'insert') {
            return location.segment.data[location.offset];
        }

        const baseOffset = location.segment.start + location.offset;
        if (this.modifiedOverlay.has(baseOffset)) {
            return this.modifiedOverlay.get(baseOffset);
        }

        const chunkIndex = Math.floor(baseOffset / this.chunkSize);
        if (this.chunkCache.has(chunkIndex)) {
            const chunk = this.chunkCache.get(chunkIndex);
            const byteIndexInChunk = baseOffset % this.chunkSize;
            this.loadStats.cacheHits++;
            this.updateAccessOrder(chunkIndex);
            return chunk.data[byteIndexInChunk];
        }

        this.loadStats.cacheMisses++;
        this.loadChunkInBackground(chunkIndex);
        return missingValue;
    };

    EnhancedLargeFileHandler.prototype.getBytes = async function(offset, length) {
        ensureStructuralState(this);

        if (offset < 0 || offset >= this.fileSize) {
            return new Uint8Array(0);
        }

        const actualLength = Math.min(length, this.fileSize - offset);
        const result = new Uint8Array(actualLength);
        let writeOffset = 0;
        let currentOffset = offset;

        while (writeOffset < actualLength) {
            const location = this.locateSegment(currentOffset);
            if (!location || !location.segment) {
                throw new Error('Intervalo incompleto no arquivo virtual.');
            }

            const availableInSegment = location.segment.length - location.offset;
            const bytesToCopy = Math.min(actualLength - writeOffset, availableInSegment);

            if (location.segment.type === 'insert') {
                result.set(location.segment.data.subarray(location.offset, location.offset + bytesToCopy), writeOffset);
            } else {
                const baseOffset = location.segment.start + location.offset;
                const sourceBytes = await this.getSourceBytes(baseOffset, bytesToCopy);
                if (sourceBytes.length !== bytesToCopy) throw new Error('Leitura incompleta do arquivo virtual.');
                result.set(sourceBytes, writeOffset);

                if (this.modifiedOverlay.size < bytesToCopy) {
                    for (const [offset, value] of this.modifiedOverlay) {
                        if (offset >= baseOffset && offset < baseOffset + bytesToCopy) result[writeOffset + offset - baseOffset] = value;
                    }
                } else {
                    for (let index = 0; index < bytesToCopy; index++) {
                        const value = this.modifiedOverlay.get(baseOffset + index);
                        if (value !== undefined) result[writeOffset + index] = value;
                    }
                }
            }

            writeOffset += bytesToCopy;
            currentOffset += bytesToCopy;
        }

        return result;
    };

    EnhancedLargeFileHandler.prototype.recordEdit = function(position, newValue) {
        ensureStructuralState(this);

        if (position < 0 || position >= this.fileSize) {
            return;
        }

        const location = this.locateSegment(position);
        if (!location || !location.segment) {
            return;
        }

        const safeValue = Math.max(0, Math.min(255, newValue | 0));
        if (location.segment.type === 'insert') {
            if (location.segment.data[location.offset] === safeValue) return;
            if (sharedInsertData.has(location.segment.data)) location.segment.data = new Uint8Array(location.segment.data);
            location.segment.data[location.offset] = safeValue;
            return;
        }

        const baseOffset = location.segment.start + location.offset;
        this.modifiedOverlay.set(baseOffset, safeValue);
    };

    EnhancedLargeFileHandler.prototype.insertBytes = function(position, newBytes) {
        ensureStructuralState(this);

        const bytes = newBytes instanceof Uint8Array ? newBytes : new Uint8Array(newBytes || []);
        const safePosition = Math.max(0, Math.min(this.hexEditor.normalizeOffsetNumber(position), this.fileSize));
        if (bytes.length === 0) {
            return true;
        }

        const location = this.locateSegment(safePosition, true);
        const insertSegment = { type: 'insert', data: new Uint8Array(bytes), length: bytes.length };

        if (!location || !location.segment) {
            this.virtualSegments.push(insertSegment);
        } else if (location.segment.type === 'insert') {
            const existing = location.segment.data;
            if (existing.length + bytes.length <= 4096) {
                const merged = new Uint8Array(existing.length + bytes.length);
                merged.set(existing.subarray(0, location.offset));
                merged.set(bytes, location.offset);
                merged.set(existing.subarray(location.offset), location.offset + bytes.length);
                location.segment.data = merged;
                location.segment.length = merged.length;
            } else {
                const pieces = [existing.subarray(0, location.offset), bytes, existing.subarray(location.offset)]
                    .filter(piece => piece.length)
                    .map(piece => ({ type: 'insert', data: new Uint8Array(piece), length: piece.length }));
                this.virtualSegments.splice(location.index, 1, ...pieces);
            }
        } else if (location.offset === 0) {
            this.virtualSegments.splice(location.index, 0, insertSegment);
        } else if (location.offset === location.segment.length) {
            this.virtualSegments.splice(location.index + 1, 0, insertSegment);
        } else {
            const before = { type: 'source', start: location.segment.start, length: location.offset };
            const after = {
                type: 'source',
                start: location.segment.start + location.offset,
                length: location.segment.length - location.offset
            };
            this.virtualSegments.splice(location.index, 1, before, insertSegment, after);
        }

        this.indexedSegments = null;
        this.fileSize += bytes.length;
        this.hexEditor.fileSize = this.fileSize;
        this.hexEditor.totalLines = Math.ceil(this.fileSize / this.hexEditor.bytesPerLine);
        this.hexEditor.maxScrollLines = Math.max(0, this.hexEditor.totalLines - this.hexEditor.visibleLines);
        return true;
    };

    EnhancedLargeFileHandler.prototype.deleteRange = function(start, end) {
        ensureStructuralState(this);

        const safeStart = Math.max(0, Math.min(this.hexEditor.normalizeOffsetNumber(start), this.fileSize));
        const safeEnd = Math.max(safeStart, Math.min(this.hexEditor.normalizeOffsetNumber(end), this.fileSize));
        if (safeEnd <= safeStart) {
            return true;
        }

        let cursor = 0;
        const nextSegments = [];
        for (const segment of this.virtualSegments) {
            const segmentStart = cursor;
            const segmentEnd = cursor + segment.length;
            cursor = segmentEnd;

            if (segmentEnd <= safeStart || segmentStart >= safeEnd) {
                nextSegments.push(segment);
                continue;
            }

            const keepBefore = Math.max(0, safeStart - segmentStart);
            const keepAfter = Math.max(0, segmentEnd - safeEnd);

            if (keepBefore > 0) {
                if (segment.type === 'insert') {
                    nextSegments.push({
                        type: 'insert',
                        data: segment.data.slice(0, keepBefore),
                        length: keepBefore
                    });
                } else {
                    nextSegments.push({
                        type: 'source',
                        start: segment.start,
                        length: keepBefore
                    });
                }
            }

            if (segment.type === 'source') {
                const deleteBaseStart = segment.start + keepBefore;
                const deleteBaseEnd = segment.start + segment.length - keepAfter;
                for (const basePos of Array.from(this.modifiedOverlay.keys())) {
                    if (basePos >= deleteBaseStart && basePos < deleteBaseEnd) {
                        this.modifiedOverlay.delete(basePos);
                    }
                }
            }

            if (keepAfter > 0) {
                if (segment.type === 'insert') {
                    nextSegments.push({
                        type: 'insert',
                        data: segment.data.slice(segment.length - keepAfter),
                        length: keepAfter
                    });
                } else {
                    nextSegments.push({
                        type: 'source',
                        start: segment.start + segment.length - keepAfter,
                        length: keepAfter
                    });
                }
            }
        }

        this.virtualSegments = nextSegments.filter((segment) => segment.length > 0);
        this.fileSize -= (safeEnd - safeStart);
        this.hexEditor.fileSize = this.fileSize;
        this.hexEditor.totalLines = Math.ceil(this.fileSize / this.hexEditor.bytesPerLine);
        this.hexEditor.maxScrollLines = Math.max(0, this.hexEditor.totalLines - this.hexEditor.visibleLines);
        return true;
    };

    EnhancedLargeFileHandler.prototype.hasStructuralChanges = function() {
        ensureStructuralState(this);
        return this.fileSize !== this.sourceFileSize || this.virtualSegments.some((segment) => segment.type === 'insert');
    };

    EnhancedLargeFileHandler.prototype.createSnapshot = function() {
        ensureStructuralState(this);

        return {
            isVirtual: true,
            fileSize: this.fileSize,
            sourceFileSize: this.sourceFileSize,
            diskVersion: this.file?.diskVersion,
            modifiedOverlay: new Map(this.modifiedOverlay),
            virtualSegments: this.virtualSegments.map(segment => {
                if (segment.type === 'insert') sharedInsertData.add(segment.data);
                return { ...segment };
            })
        };
    };

    EnhancedLargeFileHandler.prototype.restoreSnapshot = function(snapshot) {
        ensureStructuralState(this);

        this.modifiedOverlay.clear();
        this.virtualSegments = [{
            type: 'source',
            start: 0,
            length: this.sourceFileSize
        }];
        this.fileSize = this.sourceFileSize;

        if (snapshot && snapshot.modifiedOverlay) {
            for (const [offset, value] of snapshot.modifiedOverlay.entries()) {
                this.modifiedOverlay.set(offset, value);
            }
        }

        if (snapshot && Array.isArray(snapshot.virtualSegments)) {
            this.virtualSegments = snapshot.virtualSegments.map(segment => {
                if (segment.type === 'insert') sharedInsertData.add(segment.data);
                return { ...segment };
            });
        }

        this.fileSize = snapshot && typeof snapshot.fileSize === 'number' ? snapshot.fileSize : this.sourceFileSize;
        this.hexEditor.fileSize = this.fileSize;
        this.hexEditor.totalLines = Math.ceil(this.fileSize / this.hexEditor.bytesPerLine);
        this.hexEditor.maxScrollLines = Math.max(0, this.hexEditor.totalLines - this.hexEditor.visibleLines);
    };

    EnhancedLargeFileHandler.prototype.rebaseToCurrentState = function(filePath, fileName, diskVersion) {
        this.sourceFileSize = this.fileSize;
        this.totalChunks = Math.ceil(this.fileSize / this.chunkSize);
        this.virtualSegments = [{ type: 'source', start: 0, length: this.fileSize }];
        this.modifiedOverlay.clear();
        this.clearCache();
        this.file = { name: fileName, path: filePath, size: this.fileSize, forceVirtual: true, diskVersion };
        this.hexEditor.fileSize = this.fileSize;
    };
})();
