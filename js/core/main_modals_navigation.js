Object.assign(FoxyHexEditorComplete.prototype, {
    showGoToModal() {
        const totalSize = this.getDataLength();

        const initialState = {
            fileSize: totalSize,
            currentOffset: this.cursorPosition,
            offsetBase: this.getOffsetDisplayBase()
        };

        const { ipcRenderer } = require('electron');
        ipcRenderer.send('open-goto-window', initialState);

        if (!this._gotoIpcConfigured) {
            ipcRenderer.on('execute-goto-action', (event, data) => {
                this.handleGoToToolAction(data);
            });

            ipcRenderer.on('goto-window-closed', () => {
            });

            this._gotoIpcConfigured = true;
        }
    },

    handleGoToToolAction(data) {
        const { offsetText } = data;
        const parsed = this.parseOffsetInput(offsetText, { useDisplayBase: true });

        if (!parsed.valid) {
            this.syncGoToWindowError(parsed.error);
            return;
        }

        const totalSize = this.getDataLength();

        if (parsed.realOffset < 0 || parsed.realOffset >= totalSize) {
            this.syncGoToWindowError(`Offset fora do range (${this.formatOffsetRange(0, totalSize - 1, { useDisplayBase: true })})`);
            return;
        }

        this.navigateToOffset(parsed.realOffset);

        const { ipcRenderer } = require('electron');
        ipcRenderer.send('goto-state-update', {
            currentOffset: parsed.realOffset,
            offsetBase: this.getOffsetDisplayBase()
        });

        this.focusEditor();
    },

    syncGoToWindowError(message) {
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('goto-state-update', { error: message });
    },

    hideGoToModal() {
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('close-goto-window');

        const modal = document.getElementById('goto-modal');
        if (modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
            modal.style.zIndex = '1000';
            this.focusEditor();
        }
    },

    showHexCalculatorModal() {
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('open-calc-window');
    },

    hideHexCalculatorModal() {
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('close-calc-window');
    },

    updateGoToModalInfo() {
        const totalSize = this.getDataLength();

        const fileSizeEl = document.getElementById('goto-file-size');
        const currentOffsetEl = document.getElementById('goto-current-offset');
        const validRangeEl = document.getElementById('goto-valid-range');

        if (fileSizeEl) {
            const sizeText = `${totalSize.toLocaleString()} bytes`;
            const sizeFormatted = this.formatFileSize(totalSize);
            fileSizeEl.textContent = `${sizeText} (${sizeFormatted})`;
        }
        if (currentOffsetEl) {
            currentOffsetEl.textContent = this.formatOffset(this.cursorPosition, { useDisplayBase: true });
        }
        if (validRangeEl) {
            validRangeEl.textContent = this.formatOffsetRange(0, totalSize - 1, { useDisplayBase: true });
        }
    },

    performGoTo() {
        const gotoInput = document.getElementById('goto-input');
        if (!gotoInput) return;

        const offsetText = gotoInput.value.trim();
        if (!offsetText) return;

        const parsed = this.parseOffsetInput(offsetText, { useDisplayBase: true });
        if (!parsed.valid) {
            this.showGoToError(parsed.error);
            return;
        }

        const totalSize = this.getDataLength();

        if (parsed.realOffset < 0 || parsed.realOffset >= totalSize) {
            this.showGoToError(`Offset invÃ¡lido. Range vÃ¡lido: ${this.formatOffsetRange(0, totalSize - 1, { useDisplayBase: true })}`);
            return;
        }

        this.hideGoToModal();
        setTimeout(() => {
            this.navigateToOffset(parsed.realOffset);
            if (this.cursorPosition !== parsed.realOffset) {
                this.cursorPosition = parsed.realOffset;
                this.selectionStart = parsed.realOffset;
                this.selectionEnd = parsed.realOffset;
            }

            this.updateStatus();
            this.forceUpdatePositionInput();
            this.focusEditor();
            this.renderCurrentView(true);
        }, 100);
    },

    showGoToError(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #ff4757, #ff3742);
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10001;
        box-shadow: 0 4px 12px rgba(255, 71, 87, 0.3);
        animation: slideInRight 0.3s ease;
    `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 3000);
    },

    showGoToSuccess(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #2ed573, #1e90ff);
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10001;
        box-shadow: 0 4px 12px rgba(46, 213, 115, 0.3);
        animation: slideInRight 0.3s ease;
    `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 2000);
    },

    navigateToOffset(targetOffset) {
        const totalSize = this.getDataLength();

        targetOffset = Math.max(0, Math.min(targetOffset, totalSize - 1));
        this.cursorPosition = targetOffset;
        if (!this._isNavigatingFromSearch) {
            this.selectionStart = targetOffset;
            this.selectionEnd = targetOffset;
        }

        const targetLine = Math.floor(targetOffset / this.bytesPerLine);
        const totalLines = Math.ceil(totalSize / this.bytesPerLine);
        const visibleLines = this.visibleLines || 50;
        const maxScrollLines = Math.max(0, totalLines - visibleLines);
        let newScrollPercent = 0;

        if (maxScrollLines > 0) {
            const idealStartLine = Math.max(0, targetLine - Math.floor(visibleLines / 2));
            newScrollPercent = Math.min(1, idealStartLine / maxScrollLines);
        }

        this.currentScrollPercent = newScrollPercent;
        if (this.isLargeFileActive()) {
            this.renderAtScrollPercent?.(newScrollPercent, true);
            this.autoScrollToCursor(targetOffset);
        } else {
            this.renderAtScrollPercent?.(newScrollPercent, true);
            const currentStartLine = Math.floor(newScrollPercent * maxScrollLines);
            const currentEndLine = currentStartLine + visibleLines;
            if (targetLine < currentStartLine || targetLine >= currentEndLine) {
                const adjustedStartLine = Math.max(0, targetLine - 2);
                const adjustedScrollPercent = maxScrollLines > 0 ? adjustedStartLine / maxScrollLines : 0;
                this.currentScrollPercent = Math.min(1, adjustedScrollPercent);
                this.renderAtScrollPercent?.(this.currentScrollPercent, true);
            }
            this.ensureCursorVisible();
        }

        setTimeout(() => {
            this.renderCurrentView(true);
            if (this.needsDomCursorVisibilitySync()) {
                this.ensureCursorVisible();
            }
            this.updateStatus();
            this.forceUpdatePositionInput();
        }, 50);

        setTimeout(() => {
            this.renderCurrentView(true);
            if (this.needsDomCursorVisibilitySync()) {
                this.ensureCursorVisible();
            }
            this.updateStatus();
            this.forceUpdatePositionInput();
        }, 200);

        this.updateStatus();
        this.forceUpdatePositionInput();
    },

    updateStats() {
        const totalEditsEl = document.getElementById('total-edits');
        const bytesModifiedEl = document.getElementById('bytes-modified');
        const fileSizeEl = document.getElementById('file-size');
        const unsavedChangesEl = document.getElementById('unsaved-changes');

        if (totalEditsEl) totalEditsEl.textContent = Math.max(0, this.history.length - 1);
        if (bytesModifiedEl) bytesModifiedEl.textContent = this.modifiedBytes.size;
        if (fileSizeEl) fileSizeEl.textContent = `${this.getDataLength()} bytes`;
        if (unsavedChangesEl) unsavedChangesEl.textContent = this.hasUnsavedChanges ? this.modifiedBytes.size : 0;
    }
});
