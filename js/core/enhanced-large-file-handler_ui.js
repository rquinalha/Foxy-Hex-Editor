EnhancedLargeFileHandler.prototype.autoScrollLargeFile = function(position) {
        if (!this.isLargeFileMode) {
            return this.hexEditor.autoScrollToCursor?.(position);
        }

        if (this.hexEditor.isManualScrolling || this.hexEditor.preventCursorFollow) {
            return;
        }

        position = Math.max(0, Math.min(position, this.fileSize - 1));
        
        const currentLine = Math.floor(position / this.hexEditor.bytesPerLine);
        const currentStartLine = Math.floor(this.hexEditor.currentScrollPercent * this.hexEditor.maxScrollLines);
        const currentEndLine = currentStartLine + this.hexEditor.visibleLines;

        let needsScroll = false;
        let newScrollPercent = this.hexEditor.currentScrollPercent;

        const edgeMargin = Math.max(1, Math.floor((this.hexEditor.visibleLines || 50) / 6));

        if (currentLine < currentStartLine + edgeMargin) {
            const targetStartLine = Math.max(0, currentLine - edgeMargin);
            newScrollPercent = this.hexEditor.maxScrollLines > 0 ? targetStartLine / this.hexEditor.maxScrollLines : 0;
            needsScroll = true;
        } else if (currentLine >= currentEndLine - edgeMargin) {
            const targetStartLine = Math.min(
                this.hexEditor.maxScrollLines,
                Math.max(0, currentLine - (this.hexEditor.visibleLines - edgeMargin - 1))
            );
            newScrollPercent = this.hexEditor.maxScrollLines > 0 ? targetStartLine / this.hexEditor.maxScrollLines : 0;
            needsScroll = true;
        }

        if (needsScroll) {
            this.hexEditor.currentScrollPercent = newScrollPercent;
            this.scheduleRender(newScrollPercent, true);
        } else {
            this.scheduleRender(this.hexEditor.currentScrollPercent, true);
        }

};

EnhancedLargeFileHandler.prototype.renderLargeFileInterface = async function() {
        this.hexEditor.initializeAdvancedScrolling();
        

        await this.renderAtPercent(0, false);


};

EnhancedLargeFileHandler.prototype.updateUI = function(file) {
        const currentFileEl = document.getElementById('current-file');
        if (currentFileEl) {
            currentFileEl.textContent = file.name;
        }


        this.hexEditor.updateButtons();


};

EnhancedLargeFileHandler.prototype.renderCurrentView = function(preserveCursor = true) {
        return this.scheduleRender(this.hexEditor.currentScrollPercent, preserveCursor);
};

EnhancedLargeFileHandler.prototype.renderAtPercent = function(percent, preserveCursor = true) {
        const nextPercent = Math.max(0, Math.min(1, percent));
        this.hexEditor.currentScrollPercent = nextPercent;
        return this.scheduleRender(nextPercent, preserveCursor);
};

EnhancedLargeFileHandler.prototype.clearCache = function() {
        this.chunkCache.clear();
        this.loadingPromises.clear();
        this.accessOrder = [];
        this.loadStats = {
            chunksLoaded: 0,
            cacheHits: 0,
            cacheMisses: 0,
            totalLoadTime: 0
        };


};

EnhancedLargeFileHandler.prototype.recordEdit = function(position, newValue) {
        if (position < 0 || position >= this.fileSize) return;
        const safeValue = Math.max(0, Math.min(255, newValue | 0));
        this.modifiedOverlay.set(position, safeValue);

};

EnhancedLargeFileHandler.prototype.hasOverlayChanges = function() {
        return this.modifiedOverlay.size > 0;

};

EnhancedLargeFileHandler.prototype.getOverlayByte = function(position) {
        return this.modifiedOverlay.has(position) ? this.modifiedOverlay.get(position) : null;

};

EnhancedLargeFileHandler.prototype.getOverlayEntries = function() {
        // Retornar como array simples para envio via IPC/salvamento
        return Array.from(this.modifiedOverlay.entries());

};

EnhancedLargeFileHandler.prototype.commitOverlayToCache = function(entries = null) {
        const sourceEntries = Array.isArray(entries) ? entries : this.getOverlayEntries();
        if (!sourceEntries || sourceEntries.length === 0) {
            return;
        }

        for (const [position, value] of sourceEntries) {
            const chunkIndex = Math.floor(position / this.chunkSize);
            const chunk = this.chunkCache.get(chunkIndex);
            if (!chunk || !chunk.data) {
                continue;
            }

            const byteIndexInChunk = position % this.chunkSize;
            if (byteIndexInChunk >= 0 && byteIndexInChunk < chunk.data.length) {
                chunk.data[byteIndexInChunk] = value & 0xFF;
            }
        }

};

EnhancedLargeFileHandler.prototype.clearOverlay = function() {
        this.modifiedOverlay.clear();


};

EnhancedLargeFileHandler.prototype.showFileTooLargeError = function(file) {
        const fileSizeGB = (file.size / (1024 * 1024 * 1024)).toFixed(2);
        
        if (window.notificationSystem) {
            window.notificationSystem.error(
                `Arquivo muito grande: ${fileSizeGB} GB\n\nLimite máximo: 1.5 GB\n\nPara arquivos maiores, use um editor hex especializado.`,
                'Arquivo Muito Grande'
            );
        } else {
            alert(`❌ Arquivo muito grande: ${fileSizeGB} GB\n\nLimite máximo: 1.5 GB`);
        }


};

EnhancedLargeFileHandler.prototype.formatFileSize = function(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];


};

EnhancedLargeFileHandler.prototype.getStats = function() {
        return {
            isLargeFileMode: this.isLargeFileMode,
            fileSize: this.fileSize,
            formattedFileSize: this.formatFileSize(this.fileSize),
            chunkSize: this.chunkSize,
            totalChunks: this.totalChunks,
            cachedChunks: this.chunkCache.size,
            maxCachedChunks: this.maxCachedChunks,
            loadingChunks: this.loadingPromises.size,
            cacheHitRate: this.loadStats.cacheHits / (this.loadStats.cacheHits + this.loadStats.cacheMisses) * 100,
            ...this.loadStats
        };


};

EnhancedLargeFileHandler.prototype.setupContainerWithScrollbar = function(container) {

        if (container.querySelector('#large-file-scrollbar')) {
            return;
        }

        container.style.cssText = `
            height: 100%;
            min-height: 0;
            overflow: hidden;
            position: relative;
            font-family: var(--editor-font-family);
            outline: none;
        `;
        container.setAttribute('tabindex', '0');

        const contentArea = document.createElement('div');
        contentArea.id = 'large-file-content';
        contentArea.style.cssText = `
            position: absolute;
            top: 0; left: 0; right: 20px;
            overflow: visible;
        `;
        this.setupContentDelegatedEvents(contentArea);

        const scrollbar = document.createElement('div');
        scrollbar.id = 'large-file-scrollbar';
        scrollbar.style.cssText = `
            position: absolute; right: 0; top: 0; width: 20px; height: 100%;
            border-left: 1px solid rgba(255, 255, 255, 0.1);
            z-index: 1000;
        `;

        const track = document.createElement('div');
        track.id = 'large-file-track';
        track.style.cssText = `
            position: absolute; top: 20px; left: 2px; right: 2px; bottom: 20px;
            background: rgba(255, 255, 255, 0.1); border-radius: 8px; cursor: pointer;
        `;

        const thumb = document.createElement('div');
        thumb.id = 'large-file-thumb';
        thumb.style.cssText = `
            position: absolute; left: 0; right: 0; height: 50px;
            background: linear-gradient(135deg, #ff6b35, #f7931e);
            border-radius: 8px; cursor: grab;
        `;

        const upBtn = document.createElement('div');
        upBtn.innerHTML = '▲';
        upBtn.style.cssText = `
            position: absolute; top: 0; left: 0; right: 0; height: 20px;
            background: rgba(255, 255, 255, 0.1); cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            color: white; font-size: 12px;
        `;
        upBtn.textContent = '▲';
        upBtn.style.fontWeight = 'bold';
        upBtn.textContent = String.fromCharCode(0x25B2);

        const downBtn = document.createElement('div');
        downBtn.innerHTML = '▼';
        downBtn.style.cssText = `
            position: absolute; bottom: 0; left: 0; right: 0; height: 20px;
            background: rgba(255, 255, 255, 0.1); cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            color: white; font-size: 12px;
        `;
        downBtn.textContent = '▼';
        downBtn.style.fontWeight = 'bold';
        downBtn.textContent = String.fromCharCode(0x25BC);

        track.appendChild(thumb);
        scrollbar.appendChild(upBtn);
        scrollbar.appendChild(track);
        scrollbar.appendChild(downBtn);

        container.innerHTML = '';
        container.appendChild(contentArea);
        container.appendChild(scrollbar);

        this.setupScrollbarEvents(container, track, thumb, upBtn, downBtn);


};

EnhancedLargeFileHandler.prototype.setupContentDelegatedEvents = function(contentArea) {
        if (!contentArea || contentArea.__largeFileDelegatedEventsBound) {
            return;
        }

        const getTargetInfo = (eventTarget) => {
            const target = eventTarget && eventTarget.closest
                ? eventTarget.closest('[data-offset][data-panel]')
                : null;

            if (!target) {
                return null;
            }

            const offset = Number(target.dataset.offset);
            const panel = target.dataset.panel;
            if (!Number.isFinite(offset) || !panel) {
                return null;
            }

            return { target, offset, panel };
        };

        contentArea.addEventListener('click', (e) => {
            const info = getTargetInfo(e.target);
            if (!info || this.dragState.isDragging || this.dragState.isPending) {
                return;
            }

            const highlightId = info.target.dataset?.highlightId ? parseInt(info.target.dataset.highlightId) : null;
            if (highlightId) {
                this.hexEditor.handleHighlightDoubleClick(highlightId, info.offset, info.panel);
                return;
            }

            if (this.hexEditor.canUseInsertCursor && this.hexEditor.canUseInsertCursor()) {
                const insertPos = this.hexEditor.resolveInsertCursorPosition(info.target, e, info.offset);
                this.hexEditor.setInsertCursor(insertPos, info.panel);
                return;
            }

            this.hexEditor.setCursor(info.offset, info.panel, false);
        });

        contentArea.addEventListener('dblclick', (e) => {
            const info = getTargetInfo(e.target);
            if (!info) {
                return;
            }

            const highlightId = info.target.dataset?.highlightId;
            const highlight = highlightId
                ? this.hexEditor.highlights?.get(parseInt(highlightId))
                : (this.hexEditor.getHighlightAt ? this.hexEditor.getHighlightAt(info.offset) : null);

            if (!highlight) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();
            this.hexEditor.handleHighlightDoubleClick(highlight.id, info.offset, info.panel);
        });

        contentArea.addEventListener('mousedown', (e) => {
            if (e.button !== 0) {
                return;
            }

            const info = getTargetInfo(e.target);
            if (!info) {
                return;
            }

            if (e.shiftKey) {
                const normalized = this.hexEditor.getSelectionRangeForPanel(info.offset, info.panel);
                this.hexEditor.selectionEnd = info.panel === 'hex' && this.hexEditor.isCurrentTable16Bit()
                    ? normalized.end
                    : normalized.cursor;
                this.hexEditor.cursorPosition = normalized.cursor;
                this.hexEditor.activePanel = info.panel;

                if (!this.hexEditor.shiftClickHintShown && typeof this.hexEditor.showShiftClickHint === 'function') {
                    this.hexEditor.showShiftClickHint();
                    this.hexEditor.shiftClickHintShown = true;
                }

                this.hexEditor.renderCurrentView(true);
                return;
            }

            this.dragState.isPending = true;
            this.dragState.startClientX = e.clientX;
            this.dragState.startClientY = e.clientY;
            this.dragState.pendingPos = info.offset;
            this.dragState.pendingPanel = info.panel;

            const onMouseMove = (mv) => {
                const dx = Math.abs(mv.clientX - this.dragState.startClientX);
                const dy = Math.abs(mv.clientY - this.dragState.startClientY);
                if (this.dragState.isPending && (dx > 3 || dy > 3)) {
                    mv.preventDefault();
                    this.startDragSelection(this.dragState.pendingPos, this.dragState.pendingPanel, mv);
                    this.dragState.isPending = false;
                    document.removeEventListener('mousemove', onMouseMove);
                }
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                if (this.dragState.isPending) {
                    this.dragState.isPending = false;
                }
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp, { once: true });
        });

        contentArea.addEventListener('mousemove', (e) => {
            const info = getTargetInfo(e.target);
            if (!info || !this.dragState.isDragging || this.dragState.activePanel !== info.panel) {
                return;
            }

            this.updateDragSelection(info.offset, info.panel, e);
        });

        contentArea.addEventListener('mouseover', (e) => {
            const info = getTargetInfo(e.target);
            if (!info || !this.dragState.isDragging || this.dragState.activePanel !== info.panel) {
                return;
            }

            this.handleDragAutoScroll(info.offset);
        });

        contentArea.__largeFileDelegatedEventsBound = true;
};

EnhancedLargeFileHandler.prototype.setupScrollbarEvents = function(container, track, thumb, upBtn, downBtn) {

        upBtn.addEventListener('click', () => {
            const totalLines = Math.ceil(this.fileSize / this.hexEditor.bytesPerLine);
            const visibleLines = this.hexEditor.visibleLines || 50;
            const maxScrollLines = Math.max(0, totalLines - visibleLines);
            
            if (maxScrollLines > 0) {
                const singleLineDelta = 1 / maxScrollLines;
                const newPercent = Math.max(0, this.hexEditor.currentScrollPercent - singleLineDelta);
                this.renderAtPercent(newPercent, true);
            }
        });


        downBtn.addEventListener('click', () => {
            const totalLines = Math.ceil(this.fileSize / this.hexEditor.bytesPerLine);
            const visibleLines = this.hexEditor.visibleLines || 50;
            const maxScrollLines = Math.max(0, totalLines - visibleLines);
            
            if (maxScrollLines > 0) {
                const singleLineDelta = 1 / maxScrollLines;
                const newPercent = Math.min(1, this.hexEditor.currentScrollPercent + singleLineDelta);
                this.renderAtPercent(newPercent, true);
            }
        });


        track.addEventListener('click', (e) => {
            if (e.target === thumb) return;
            const rect = track.getBoundingClientRect();
            const percent = (e.clientY - rect.top) / track.clientHeight;
            const newPercent = Math.max(0, Math.min(1, percent));
            this.renderAtPercent(newPercent, true);
        });


        let isDragging = false;
        let dragStartY = 0;
        let dragStartPercent = 0;

        thumb.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isDragging = true;
            dragStartY = e.clientY;
            dragStartPercent = this.hexEditor.currentScrollPercent;
            thumb.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const deltaY = e.clientY - dragStartY;
            const trackHeight = track.clientHeight - thumb.clientHeight;
            const deltaPercent = deltaY / trackHeight;
            const newPercent = Math.max(0, Math.min(1, dragStartPercent + deltaPercent));
            this.renderAtPercent(newPercent, true);
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                thumb.style.cursor = 'grab';
            }
        });


};

EnhancedLargeFileHandler.prototype.updateScrollbarThumb = function(percent) {
        const thumb = document.getElementById('large-file-thumb');
        const track = document.getElementById('large-file-track');
        
        if (thumb && track) {
            const trackHeight = track.clientHeight - thumb.clientHeight;
            thumb.style.top = `${percent * trackHeight}px`;
        }


};

EnhancedLargeFileHandler.prototype.restoreNormalMode = function() {
        if (!this.isLargeFileMode) return;


        if (this.originalMethods.completeRenderWithColors) {
            this.hexEditor.completeRenderWithColors = this.originalMethods.completeRenderWithColors;
        }
        this.hexEditor.detachDataProvider?.();
        this.hexEditor.fileSize = 0;
        this.hexEditor.totalLines = 0;
        this.hexEditor.maxScrollLines = 0;

        const container = document.getElementById('hex-content');
        if (container) {
            container.innerHTML = '';
            container.style.cssText = '';
            container.setAttribute('tabindex', '0');
            delete container.__foxyAdvancedScrollReady;
        }

        this.hexEditor._content = null;
        this.hexEditor._scrollbar = null;
        this.hexEditor._track = null;
        this.hexEditor._thumb = null;
        this.hexEditor._upBtn = null;
        this.hexEditor._downBtn = null;

        this.isLargeFileMode = false;
        this.file = null;
        this.fileSize = 0;
        this.sourceFileSize = 0;
        this.totalChunks = 0;
        this.modifiedOverlay.clear();
        this.virtualSegments = [];
        this.hexEditor.dataProvider = null;
        if (this.renderState && this.renderState.frameId !== null) {
            cancelAnimationFrame(this.renderState.frameId);
            this.renderState.frameId = null;
            this.renderState.pendingPromise = null;
            this.renderState.isRendering = false;
            this.renderState.needsAnotherPass = false;
        }
        this.clearCache();
        
        this.stopDragSelection();
        
        this.cleanupOptimizedScroll();


        if (this.hexEditor) {
            if (typeof this.hexEditor.updateButtons === 'function') {
                this.hexEditor.updateButtons();
            }
            if (typeof this.hexEditor.updateHistoryUI === 'function') {
                this.hexEditor.updateHistoryUI();
            }
        }


};

EnhancedLargeFileHandler.prototype.startDragSelection = function(pos, panel, event) {
        if (!this.isLargeFileMode) return;
        
        event.preventDefault();
        event.stopPropagation();
        
        this.dragState.isDragging = true;
        this.dragState.startPos = pos;
        this.dragState.currentPos = pos;
        this.dragState.activePanel = panel;
        
        const normalized = this.hexEditor.getSelectionRangeForPanel(pos, panel);
        this.hexEditor.selectionStart = normalized.start;
        this.hexEditor.selectionEnd = normalized.end;
        this.hexEditor.cursorPosition = normalized.cursor;
        this.hexEditor.activePanel = panel;
        
        document.addEventListener('mouseup', this.stopDragSelection.bind(this), { once: true });
        
        this.renderCurrentView();
        
    

};

EnhancedLargeFileHandler.prototype.updateDragSelection = function(pos, panel, event) {
        if (!this.dragState.isDragging || this.dragState.activePanel !== panel) return;
        if (this.dragState.currentPos === pos) return;
        
        this.dragState.currentPos = pos;
        
        const startPos = Math.min(this.dragState.startPos, pos);
        const endPos = Math.max(this.dragState.startPos, pos);
        
        const normalizedStart = this.hexEditor.getSelectionRangeForPanel(startPos, panel);
        const normalizedEnd = this.hexEditor.getSelectionRangeForPanel(endPos, panel);

        this.hexEditor.selectionStart = normalizedStart.start;
        this.hexEditor.selectionEnd = panel === 'hex' && this.hexEditor.isCurrentTable16Bit()
            ? normalizedEnd.end
            : normalizedEnd.cursor;
        this.hexEditor.cursorPosition = normalizedEnd.cursor;
        

        this.scheduleRender(this.hexEditor.currentScrollPercent, true);
    

};

EnhancedLargeFileHandler.prototype.handleDragAutoScroll = function(pos) {
        if (!this.dragState.isDragging) return;
        
        const currentLine = Math.floor(pos / this.hexEditor.bytesPerLine);
        const visibleStartLine = Math.floor(this.hexEditor.currentScrollPercent * this.hexEditor.maxScrollLines);
        const visibleEndLine = visibleStartLine + this.hexEditor.visibleLines;
        
        const scrollMargin = 3;
        let needsScroll = false;
        let newScrollPercent = this.hexEditor.currentScrollPercent;
        

        if (currentLine <= visibleStartLine + scrollMargin) {
            const targetLine = Math.max(0, visibleStartLine - 2);
            newScrollPercent = this.hexEditor.maxScrollLines > 0 ? targetLine / this.hexEditor.maxScrollLines : 0;
            needsScroll = true;
        }
        else if (currentLine >= visibleEndLine - scrollMargin) {
            const targetLine = Math.min(this.hexEditor.maxScrollLines, visibleStartLine + 2);
            newScrollPercent = this.hexEditor.maxScrollLines > 0 ? targetLine / this.hexEditor.maxScrollLines : 0;
            needsScroll = true;
        }
        
        if (needsScroll) {
            this.scheduleRender(newScrollPercent, true);
            
            this.updateDragSelection(pos, this.dragState.activePanel, null);
        }
    
};

EnhancedLargeFileHandler.prototype.stopDragSelection = function() {
        if (!this.dragState.isDragging) return;
        
        this.dragState.isDragging = false;
        
        if (this.dragState.autoScrollInterval) {
            clearInterval(this.dragState.autoScrollInterval);
            this.dragState.autoScrollInterval = null;
        }
        
        if (this.hexEditor.emit) {
            this.hexEditor.emit('selectionChange', {
                start: this.hexEditor.selectionStart,
                end: this.hexEditor.selectionEnd
            });
        }
        
        if (this.hexEditor.updateStatus) {
            this.hexEditor.updateStatus();
        }

};

EnhancedLargeFileHandler.prototype.setupOptimizedLargeFileScroll = function() {
        const container = document.getElementById('hex-content');
        if (!container) return;


        this.setupEnhancedLargeFileKeyboardNavigation();
        

};

EnhancedLargeFileHandler.prototype.handleLargeFileZoomScroll = function(e) {
        e.preventDefault();
        if (e.deltaY < 0) {
            this.zoomInLargeFile();
        } else {
            this.zoomOutLargeFile();
        }

};

EnhancedLargeFileHandler.prototype.zoomInLargeFile = function() {
        if (!this.zoomLevel) this.zoomLevel = 1.0;
        this.zoomLevel = Math.min(2.0, this.zoomLevel + 0.1);
        this.renderCurrentView();

};

EnhancedLargeFileHandler.prototype.zoomOutLargeFile = function() {
        if (!this.zoomLevel) this.zoomLevel = 1.0;
        this.zoomLevel = Math.max(0.5, this.zoomLevel - 0.1);
        this.renderCurrentView();

};

EnhancedLargeFileHandler.prototype.setupEnhancedLargeFileKeyboardNavigation = function() {
        if (this.largeFileKeyHandler) {
            document.removeEventListener('keydown', this.largeFileKeyHandler);
        }

        this.largeFileKeyHandler = (e) => {

            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }


            if (!this.isLargeFileMode) return;

            switch(e.key) {
                case 'PageUp':
                    e.preventDefault();
                    this.largeFilePageUp();
                    break;
                case 'PageDown':
                    e.preventDefault();
                    this.largeFilePageDown();
                    break;
                case 'Home':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.largeFileGoToStart();
                    }
                    break;
                case 'End':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.largeFileGoToEnd();
                    }
                    break;
                case 'ArrowUp':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.largeFileScrollUp();
                    }
                    break;
                case 'ArrowDown':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.largeFileScrollDown();
                    }
                    break;
            }
        };

        document.addEventListener('keydown', this.largeFileKeyHandler);


};

EnhancedLargeFileHandler.prototype.largeFilePageUp = function() {
        const totalLines = Math.ceil(this.fileSize / this.hexEditor.bytesPerLine);
        const visibleLines = this.hexEditor.visibleLines || 50;
        const maxScrollLines = Math.max(0, totalLines - visibleLines);
        const currentLine = Math.floor(this.hexEditor.currentScrollPercent * maxScrollLines);
        
        const pageScrollLines = Math.max(1, visibleLines - 2);
        const targetLine = Math.max(0, currentLine - pageScrollLines);
        const newPercent = maxScrollLines > 0 ? targetLine / maxScrollLines : 0;
        
        this.renderAtPercent(newPercent, true);

};

EnhancedLargeFileHandler.prototype.largeFilePageDown = function() {
        const totalLines = Math.ceil(this.fileSize / this.hexEditor.bytesPerLine);
        const visibleLines = this.hexEditor.visibleLines || 50;
        const maxScrollLines = Math.max(0, totalLines - visibleLines);
        const currentLine = Math.floor(this.hexEditor.currentScrollPercent * maxScrollLines);
        
        const pageScrollLines = Math.max(1, visibleLines - 2);
        const targetLine = Math.min(maxScrollLines, currentLine + pageScrollLines);
        const newPercent = maxScrollLines > 0 ? targetLine / maxScrollLines : 0;
        
        this.renderAtPercent(newPercent, true);

};

EnhancedLargeFileHandler.prototype.largeFileScrollUp = function() {
        const totalLines = Math.ceil(this.fileSize / this.hexEditor.bytesPerLine);
        const visibleLines = this.hexEditor.visibleLines || 50;
        const maxScrollLines = Math.max(0, totalLines - visibleLines);
        const lineDelta = maxScrollLines > 0 ? 1 / maxScrollLines : 0;
        const delta = -lineDelta;
        
        this.renderAtPercent(Math.max(0, this.hexEditor.currentScrollPercent + delta), true);

};

EnhancedLargeFileHandler.prototype.largeFileScrollDown = function() {
        const totalLines = Math.ceil(this.fileSize / this.hexEditor.bytesPerLine);
        const visibleLines = this.hexEditor.visibleLines || 50;
        const maxScrollLines = Math.max(0, totalLines - visibleLines);
        const lineDelta = maxScrollLines > 0 ? 1 / maxScrollLines : 0;
        const delta = lineDelta;
        
        this.renderAtPercent(Math.min(1, this.hexEditor.currentScrollPercent + delta), true);

};

EnhancedLargeFileHandler.prototype.largeFileGoToStart = function() {
        if (this.hexEditor) {
            if (this.hexEditor.canUseInsertCursor && this.hexEditor.canUseInsertCursor()) {
                this.hexEditor.setInsertCursor(0, this.hexEditor.activePanel || 'hex');
            } else if (typeof this.hexEditor.setCursor === 'function') {
                this.hexEditor.setCursor(0, null, false);
            }
        }
        this.renderAtPercent(0, true);
        if (this.hexEditor && typeof this.hexEditor.focusEditor === 'function') {
            this.hexEditor.focusEditor();
        }
};

EnhancedLargeFileHandler.prototype.largeFileGoToEnd = function() {
        if (this.hexEditor) {
            const dataLength = typeof this.hexEditor.getDataLength === 'function' ? this.hexEditor.getDataLength() : 0;
            const lastOffset = Math.max(0, dataLength - 1);
            if (this.hexEditor.canUseInsertCursor && this.hexEditor.canUseInsertCursor()) {
                this.hexEditor.setInsertCursor(dataLength, this.hexEditor.activePanel || 'hex');
            } else if (typeof this.hexEditor.setCursor === 'function') {
                this.hexEditor.setCursor(lastOffset, null, false);
            }
        }
        this.renderAtPercent(1, true);
        if (this.hexEditor && typeof this.hexEditor.focusEditor === 'function') {
            this.hexEditor.focusEditor();
        }
};

EnhancedLargeFileHandler.prototype.cleanupOptimizedScroll = function() {
        if (this.largeFileKeyHandler) {
            document.removeEventListener('keydown', this.largeFileKeyHandler);
        }
};

if (typeof window !== 'undefined') {
    window.EnhancedLargeFileHandler = EnhancedLargeFileHandler;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedLargeFileHandler;
}
