
class IntelligentSaveSystem {
    constructor(hexEditor) {
        this.hexEditor = hexEditor;
        this.currentFilePath = null;
        this.lastSaveTimestamp = null;
        this.saveInProgress = false;
    }


    async saveLargeFileOverlayPatches() {
        if (!window.electronFileHandler || !window.electronFileHandler.isElectronEnvironment()) {
            throw new Error('Electron não disponí­vel para aplicar patches');
        }
        const currentFilePath = this.getResolvedCurrentFilePath();
        if (!currentFilePath) {
            throw new Error('Caminho do arquivo não definido');
        }

        const handler = this.getLargeFileHandler();
        if (!this.hexEditor.isVirtualModeReady?.() || !this.hexEditor.hasVirtualOverlayChanges?.()) {
            return true;
        }

        const entries = this.hexEditor.getVirtualOverlayEntries?.() || [];
        if (entries.length === 0) return true;

        await window.electronFileHandler.applyOverlayEntries(currentFilePath, entries);

        this.hexEditor.commitVirtualOverlayToCache?.(entries);
        this.hexEditor.clearVirtualOverlay?.();
        return true;
    }

    async reloadLargeFileAfterStructuralSave(filePath, fileName) {
        const handler = this.getLargeFileHandler();
        if (!this.hexEditor.isVirtualModeReady?.()) {
            return;
        }

        await this.hexEditor.loadFile({
            name: fileName,
            size: this.hexEditor.getVirtualDataLength?.() || 0,
            path: filePath
        });
    }

    setCurrentFile(filePath, fileName) {
        if (filePath === '' || filePath === 'null') {
            this.currentFilePath = null;
        } else {
            this.currentFilePath = filePath;
        }

        this.hexEditor.currentFileName = fileName;

        if (this.hexEditor.currentFilePath !== filePath) {
            this.hexEditor.currentFilePath = filePath;
        }

        this.updateSaveButton();
    }

    canSaveDirectly() {
        const currentFilePath = this.hexEditor.getResolvedCurrentFilePath?.() || this.currentFilePath;
        return !!(
            currentFilePath &&
            currentFilePath !== 'null' &&
            currentFilePath !== '' &&
            this.hexEditor.hasUnsavedChanges
        );
    }

    willUseChunks(dataSize) {
        if (!window.electronFileHandler || !window.electronFileHandler.isElectronEnvironment()) {
            return false;
        }

        const sizeMB = dataSize / (1024 * 1024);
        return sizeMB >= 200;
    }

    shouldUseProgressBar(dataSize) {
        return this.willUseChunks(dataSize);
    }

    getCurrentDataSize() {
        return this.hexEditor.getDataLength?.() || this.hexEditor.fileSize || 0;
    }

    getResolvedCurrentFilePath() {
        return this.hexEditor.getResolvedCurrentFilePath?.() || this.currentFilePath || null;
    }

    getLargeFileHandler() {
        return this.hexEditor.getVirtualNavigationHandler?.() || null;
    }

    resolveCurrentLargeFileSourcePath(handler) {
        return this.getResolvedCurrentFilePath()
            || this.hexEditor.currentFilePath
            || (handler && handler.file && handler.file.path)
            || (window.electronFileHandler.currentFile && window.electronFileHandler.currentFile.path)
            || null;
    }

    async saveSmallFileData(targetPath, data, useProgressBar) {
        await window.electronFileHandler.saveFileElectron(targetPath, data, !!useProgressBar);
    }

    async saveCurrentLargeFile(handler, targetPath) {
        if (this.hexEditor.hasVirtualStructuralChanges?.()) {
            await window.electronFileHandler.saveLargeFileWithStructureChanges(targetPath, handler);
            await this.reloadLargeFileAfterStructuralSave(targetPath, this.hexEditor.currentFileName);
            return;
        }

        if (this.hexEditor.hasVirtualOverlayChanges?.()) {
            await this.saveLargeFileOverlayPatches();
            return;
        }

        return true;
    }

    async saveLargeFileAsToPath(handler, targetPath, useProgressBar) {
        const sourcePath = this.resolveCurrentLargeFileSourcePath(handler);
        if (!sourcePath) {
            const fallbackData = this.hexEditor.getData();
            if (fallbackData && fallbackData.length > 0) {
                await this.saveSmallFileData(targetPath, fallbackData, true);
                return;
            }

            throw new Error('Arquivo fonte não encontrado e dados não disponí­veis');
        }

        const overlayEntries = this.hexEditor.hasVirtualOverlayChanges?.()
            ? (this.hexEditor.getVirtualOverlayEntries?.() || [])
            : [];

        if (this.hexEditor.hasVirtualStructuralChanges?.()) {
            await window.electronFileHandler.saveLargeFileAsTransformed(sourcePath, targetPath, handler, useProgressBar);
            return;
        }

        if (overlayEntries.length > 0) {
            await window.electronFileHandler.saveLargeFileAsWithOverlay(sourcePath, targetPath, overlayEntries, useProgressBar);
            return;
        }

        await window.electronFileHandler.copyFile(sourcePath, targetPath, useProgressBar);
    }

    async save() {
        if (this.saveInProgress) {
            return false;
        }

        if (!this.hexEditor.hasUnsavedChanges) {
            this.showNotification('Nenhuma alteração para salvar', 'info');
            return true;
        }

        if (!this.canSaveDirectly()) {
            return this.saveAs();
        }

        this.saveInProgress = true;

        try {
            if (!window.electronFileHandler || !window.electronFileHandler.isElectronEnvironment()) {
                throw new Error('Electron não disponível');
            }

            const handler = this.getLargeFileHandler();
            const currentDataSize = this.getCurrentDataSize();
            const useProgressBar = this.shouldUseProgressBar(currentDataSize);
            const currentFilePath = this.getResolvedCurrentFilePath();

            if (handler) {
                await this.saveCurrentLargeFile(handler, currentFilePath);
            } else {
                const fileData = this.hexEditor.getData();
                await this.saveSmallFileData(currentFilePath, fileData, useProgressBar);
            }

            this.hexEditor.markSavedState();
            this.lastSaveTimestamp = Date.now();

            this.saveInProgress = false;
            return true;
        } catch (error) {
            this.showNotification(`Erro ao salvar: ${error.message}. Tentando Save As...`, 'warning');
            this.saveInProgress = false;
            return this.saveAs();
        }
    }

    async saveAs() {
        try {
            if (!window.electronFileHandler || !window.electronFileHandler.isElectronEnvironment()) {
                if (this.hexEditor.save) {
                    return this.hexEditor.save();
                }
                this.showNotification('Sistema de salvamento não disponível', 'error');
                return false;
            }

            const result = await window.electronFileHandler.showSaveDialog(this.hexEditor.currentFileName || 'arquivo_editado.bin');
            if (result.canceled) {
                return false;
            }

            const currentDataSize = this.getCurrentDataSize();
            const useProgressBar = this.shouldUseProgressBar(currentDataSize);
            const newFileName = result.filePath.split(/[\\/]/).pop();
            const handler = this.getLargeFileHandler();

            if (handler) {
                await this.saveLargeFileAsToPath(handler, result.filePath, useProgressBar);
            } else if (useProgressBar) {
                const data = this.hexEditor.getData();
                await this.saveSmallFileData(result.filePath, data, true);
            } else {
                const data = this.hexEditor.getData();
                await this.saveSmallFileData(result.filePath, data, false);
            }

            if (handler) {
                await this.reloadLargeFileAfterStructuralSave(result.filePath, newFileName);
            } else {
                this.setCurrentFile(result.filePath, newFileName);
                this.hexEditor.markSavedState();
            }

            if (window.electronFileHandler) {
                window.electronFileHandler.currentFile = {
                    name: newFileName,
                    size: this.hexEditor.getDataLength ? this.hexEditor.getDataLength() : 0,
                    path: result.filePath
                };
            }

            this.setCurrentFile(result.filePath, newFileName);
            this.hexEditor.clearHistory();
            this.hexEditor.updateHistoryUI();
            this.hexEditor.updateButtons();

            if (window.SimpleSaveProtection && window.SimpleSaveProtection.refreshTitle) {
                window.SimpleSaveProtection.refreshTitle();
            }

            const fileDisplay = document.getElementById('current-file');
            if (fileDisplay) {
                fileDisplay.textContent = newFileName;
            }

            if (window.fileTabManager && window.fileTabManager.activeSessionId) {
                const activeSession = window.fileTabManager.getSessionById(window.fileTabManager.activeSessionId);
                if (activeSession) {
                    window.fileTabManager.captureEditorStateInto(activeSession);
                    window.fileTabManager.updateSessionVisualMetaFromEditor(activeSession);
                    window.fileTabManager.renderTabs();
                }
            }

            this.showNotification(`Arquivo salvo como: ${newFileName}`, 'success');
            return true;
        } catch (error) {
            console.error('[SAVE] Erro no Save As:', error);
            this.showNotification(`Erro ao salvar como: ${error.message}`, 'error');
            return false;
        }
    }

    updateSaveButton() {
        const saveBtn = document.getElementById('save-btn');
        const saveAsBtn = document.getElementById('save-as-btn');

        if (!saveBtn || !saveAsBtn) {
            return;
        }

        if (this.hexEditor.hasUnsavedChanges === true) {
            saveBtn.disabled = false;
            saveBtn.classList.add('has-changes');

            if (this.canSaveDirectly()) {
                saveBtn.title = `Sobrescrever arquivo: ${this.hexEditor.currentFileName}`;
            } else {
                saveBtn.title = 'Salvar arquivo com novo nome';
            }
        } else {
            saveBtn.disabled = true;
            saveBtn.classList.remove('has-changes');
            saveBtn.title = 'Nenhuma alteracao para salvar';
        }

        if (this.hexEditor.hasUnsavedChanges === true) {
            saveAsBtn.disabled = false;
            saveAsBtn.classList.add('has-changes');
            saveAsBtn.title = 'Salvar arquivo com novo nome';
        } else {
            saveAsBtn.disabled = true;
            saveAsBtn.classList.remove('has-changes');
            saveAsBtn.title = 'Nenhuma alteracao para salvar';
        }
    }

    setupChangeMonitoring() {
        if (!this.hexEditor.hasOwnProperty('hasUnsavedChanges')) {
            this.hexEditor.hasUnsavedChanges = false;
        }

        const currentValue = this.hexEditor.hasUnsavedChanges;

        Object.defineProperty(this.hexEditor, 'hasUnsavedChanges', {
            get: function() {
                return this._hasUnsavedChanges !== undefined ? this._hasUnsavedChanges : false;
            },
            set: function(value) {
                this._hasUnsavedChanges = value;

                if (window.intelligentSave) {
                    setTimeout(() => {
                        window.intelligentSave.updateSaveButton();
                    }, 10);
                }
            },
            configurable: true,
            enumerable: true
        });

        this.hexEditor.hasUnsavedChanges = currentValue;
    }

    showNotification(message, type = 'info') {
        if (window.notificationSystem) {
            if (type === 'success') {
                window.notificationSystem.success(message, 'Salvamento');
            } else if (type === 'error') {
                window.notificationSystem.error(message, 'Erro de Salvamento');
            } else if (type === 'warning') {
                window.notificationSystem.warning(message, 'Aviso de Salvamento');
            } else {
                window.notificationSystem.info(message, 'Salvamento');
            }
        }
    }

    testSaveInterface(sizeInMB) {
        const dataSize = sizeInMB * 1024 * 1024;
        const willUseChunks = this.willUseChunks(dataSize);
        const useProgressBar = this.shouldUseProgressBar(dataSize);

        return {
            size: sizeInMB,
            willUseChunks,
            useProgressBar,
            interface: useProgressBar ? 'progress-bar' : 'traditional'
        };
    }

    testAllSizes() {
        const sizes = [1, 10, 25, 49, 50, 75, 100, 200, 500, 1024];

        sizes.forEach((size) => {
            this.testSaveInterface(size);
        });
    }
}
