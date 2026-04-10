(function() {
    if (typeof EnhancedLargeFileHandler === 'undefined') {
        return;
    }

    const originalLoadLargeFile = EnhancedLargeFileHandler.prototype.loadLargeFile;

    function ensureStructuralState(handler) {
        if (!Array.isArray(handler.virtualSegments) || handler.virtualSegments.length === 0) {
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

    EnhancedLargeFileHandler.prototype.loadLargeFile = async function(file) {
        const result = await originalLoadLargeFile.call(this, file);
        this.sourceFileSize = file.size;
        this.virtualSegments = [{
            type: 'source',
            start: 0,
            length: file.size
        }];
        return result;
    };

    EnhancedLargeFileHandler.prototype.locateSegment = function(virtualOffset, allowEnd = false) {
        ensureStructuralState(this);

        if (virtualOffset < 0 || (!allowEnd && virtualOffset >= this.fileSize) || (allowEnd && virtualOffset > this.fileSize)) {
            return null;
        }

        let cursor = 0;
        for (let i = 0; i < this.virtualSegments.length; i++) {
            const segment = this.virtualSegments[i];
            const segmentEnd = cursor + segment.length;
            if (virtualOffset < segmentEnd) {
                return {
                    index: i,
                    segment,
                    segmentStart: cursor,
                    offset: virtualOffset - cursor
                };
            }
            cursor = segmentEnd;
        }

        if (allowEnd && virtualOffset === this.fileSize) {
            return {
                index: this.virtualSegments.length,
                segment: null,
                segmentStart: this.fileSize,
                offset: 0
            };
        }

        return null;
    };

    EnhancedLargeFileHandler.prototype.getSourceBytes = async function(offset, length) {
        if (offset < 0 || offset >= this.sourceFileSize) {
            return new Uint8Array(0);
        }

        const actualLength = Math.min(length, this.sourceFileSize - offset);
        const canBulkReadFromDisk =
            actualLength >= 1024 * 1024 &&
            this.file &&
            this.file.path &&
            window.electronFileHandler &&
            typeof window.electronFileHandler.readFileChunkSafe === 'function';

        if (canBulkReadFromDisk) {
            try {
                const bulkData = await window.electronFileHandler.readFileChunkSafe(this.file.path, offset, actualLength);
                if (bulkData instanceof Uint8Array && bulkData.length === actualLength) {
                    return bulkData;
                }
            } catch (_bulkReadError) {
                // Fallback para o caminho baseado no cache/chunks menores se a leitura direta falhar.
            }
        }

        const result = new Uint8Array(actualLength);
        let resultOffset = 0;
        let currentOffset = offset;
        let remaining = actualLength;

        while (remaining > 0) {
            const chunkIndex = Math.floor(currentOffset / this.chunkSize);
            const chunk = await this.getChunk(chunkIndex);
            if (!chunk) break;

            const byteIndexInChunk = currentOffset % this.chunkSize;
            const bytesToCopy = Math.min(remaining, chunk.data.length - byteIndexInChunk);
            result.set(chunk.data.slice(byteIndexInChunk, byteIndexInChunk + bytesToCopy), resultOffset);
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

    EnhancedLargeFileHandler.prototype.getByteSync = function(index) {
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
        return 0x00;
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
                break;
            }

            const availableInSegment = location.segment.length - location.offset;
            const bytesToCopy = Math.min(actualLength - writeOffset, availableInSegment);

            if (location.segment.type === 'insert') {
                result.set(location.segment.data.slice(location.offset, location.offset + bytesToCopy), writeOffset);
            } else {
                const baseOffset = location.segment.start + location.offset;
                const sourceBytes = await this.getSourceBytes(baseOffset, bytesToCopy);
                result.set(sourceBytes, writeOffset);

                for (const [overlayBaseOffset, value] of this.modifiedOverlay.entries()) {
                    if (overlayBaseOffset >= baseOffset && overlayBaseOffset < baseOffset + bytesToCopy) {
                        result[writeOffset + (overlayBaseOffset - baseOffset)] = value;
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
            const merged = new Uint8Array(existing.length + bytes.length);
            merged.set(existing.slice(0, location.offset), 0);
            merged.set(bytes, location.offset);
            merged.set(existing.slice(location.offset), location.offset + bytes.length);
            location.segment.data = merged;
            location.segment.length = merged.length;
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
            modifiedOverlay: new Map(this.modifiedOverlay),
            virtualSegments: this.virtualSegments.map((segment) => (
                segment.type === 'insert'
                    ? { type: 'insert', data: new Uint8Array(segment.data), length: segment.length }
                    : { type: 'source', start: segment.start, length: segment.length }
            ))
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

        if (snapshot && Array.isArray(snapshot.virtualSegments) && snapshot.virtualSegments.length > 0) {
            this.virtualSegments = snapshot.virtualSegments.map((segment) => (
                segment.type === 'insert'
                    ? { type: 'insert', data: new Uint8Array(segment.data), length: segment.length }
                    : { type: 'source', start: segment.start, length: segment.length }
            ));
        }

        this.fileSize = snapshot && typeof snapshot.fileSize === 'number' ? snapshot.fileSize : this.sourceFileSize;
        this.hexEditor.fileSize = this.fileSize;
        this.hexEditor.totalLines = Math.ceil(this.fileSize / this.hexEditor.bytesPerLine);
        this.hexEditor.maxScrollLines = Math.max(0, this.hexEditor.totalLines - this.hexEditor.visibleLines);
    };

    EnhancedLargeFileHandler.prototype.rebaseToCurrentState = function() {
        ensureStructuralState(this);

        const rebuiltSegments = [];
        let sourceCursor = 0;
        for (const segment of this.virtualSegments) {
            if (segment.type === 'insert') {
                if (segment.length > 0) {
                    rebuiltSegments.push({
                        type: 'source',
                        start: sourceCursor,
                        length: segment.length
                    });
                    sourceCursor += segment.length;
                }
            } else if (segment.length > 0) {
                rebuiltSegments.push({
                    type: 'source',
                    start: sourceCursor,
                    length: segment.length
                });
                sourceCursor += segment.length;
            }
        }

        this.sourceFileSize = this.fileSize;
        this.virtualSegments = rebuiltSegments.length > 0 ? rebuiltSegments : [{
            type: 'source',
            start: 0,
            length: this.fileSize
        }];
        this.modifiedOverlay.clear();
        this.clearCache();
        this.file = {
            ...(this.file || {}),
            size: this.fileSize
        };
        this.hexEditor.fileSize = this.fileSize;
    };
})();
