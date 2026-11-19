
class IntelligentSaveSystem {
    constructor(hexEditor) {
        this.hexEditor = hexEditor;
        this.currentFilePath = null;
        this.lastSaveTimestamp = null;
        this.saveInProgress = false;
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

    async save() {
        if (!this.hexEditor.hasUnsavedChanges) return true;
        return this.saveToDisk(!this.canSaveDirectly());
    }

    async saveAs() {
        return this.saveToDisk(true);
    }

    isSessionSaving(sessionId) {
        return this.saveInProgress && this.savingSessionId === sessionId;
    }

    async saveToDisk(chooseDestination) {
        const tabs = window.fileTabManager;
        const editor = this.hexEditor;
        if (this.saveInProgress || tabs?.isSwitchingSession) return false;
        const session = tabs?.getSessionById(tabs.activeSessionId);
        if (!session && !editor.currentFileName) return false;

        this.saveInProgress = true;
        this.savingSessionId = tabs?.activeSessionId;
        this.updateSaveButton();
        const fileService = window.electronFileHandler;
        try {
            if (!fileService?.isElectronEnvironment()) throw new Error('Electron indisponível.');
            const fs = require('node:fs').promises;
            const path = require('node:path');
            const sourcePath = editor.getResolvedCurrentFilePath();
            const sourceName = editor.currentFileName;
            const sourceVersion = editor.currentDiskVersion;
            const snapshot = editor.createDataSnapshot();
            const handler = editor.getVirtualNavigationHandler?.();
            const virtual = handler && { sourcePath: handler.file.path, snapshot, structural: handler.hasStructuralChanges() };
            let targetPath = sourcePath;
            if (chooseDestination) {
                const result = await fileService.showSaveDialog(sourcePath || sourceName || 'arquivo.bin');
                if (!result || result.canceled) return false;
                const parent = await fs.realpath(path.dirname(result.filePath));
                targetPath = await fs.realpath(result.filePath).catch(error => {
                    if (error.code !== 'ENOENT') throw error;
                    return path.join(parent, path.basename(result.filePath));
                });
            }

            // Finish any open or tab switch that began while the dialog was open.
            while (tabs?.isSwitchingSession) await tabs.sessionSwitchPromise;
            const targetSession = tabs?.findSessionByFile({ path: targetPath });
            if (targetSession && targetSession !== session) {
                throw new Error('O destino já está aberto em outra aba.');
            }
            this.savingTargetKey = tabs?.getSessionFileKey({ path: targetPath });
            const sameFile = !!sourcePath && (tabs
                ? tabs.getSessionFileKey({ path: sourcePath }) === this.savingTargetKey
                : sourcePath === targetPath);
            const fileName = chooseDestination ? path.basename(targetPath) : sourceName;
            if (virtual) await fileService.writeVirtualDocument(virtual, targetPath, sameFile);
            else await fileService.writeAtomicDocument(targetPath, handle => handle.writeFile(snapshot), sameFile ? sourceVersion : null);
            const savedVersion = documentDiskVersion(await fs.stat(targetPath));

            while (tabs?.isSwitchingSession) await tabs.sessionSwitchPromise;
            if (session && tabs.activeSessionId !== session.id) {
                this.finishInactiveSave(tabs, session, snapshot, targetPath, fileName, savedVersion);
            } else {
                editor.currentDiskVersion = savedVersion;
                if (virtual) {
                    editor.getVirtualNavigationHandler().rebaseToCurrentState(targetPath, fileName, savedVersion);
                    // Old virtual history refers to offsets in the previous file on disk.
                    editor.clearHistory();
                    editor.saveState('Arquivo salvo');
                }
                this.setCurrentFile(targetPath, fileName);
                editor.currentFileExtension = editor.getFileExtension(fileName);
                editor.markSavedState();
                fileService.currentFile = { name: fileName, path: targetPath, size: editor.getDataLength() };
                const fileDisplay = document.getElementById('current-file');
                if (fileDisplay) fileDisplay.textContent = fileName;
                if (session) tabs.captureEditorStateInto(session);
            }

            tabs?.renderTabs();
            window.SimpleSaveProtection?.refreshTitle?.();
            window.ipcRenderer?.send('add-recent-file', targetPath);
            this.lastSaveTimestamp = Date.now();
            if (chooseDestination) this.showNotification(`Arquivo salvo como: ${fileName}`, 'success');
            return true;
        } catch (error) {
            this.showNotification(`Erro ao salvar: ${error.message}`, 'error');
            return false;
        } finally {
            this.saveInProgress = false;
            this.savingSessionId = undefined;
            this.savingTargetKey = undefined;
            this.updateSaveButton();
        }
    }

    finishInactiveSave(tabs, session, snapshot, targetPath, fileName, savedVersion) {
        const size = snapshot.isVirtual ? snapshot.fileSize : snapshot.length;
        const fileRef = { name: fileName, path: targetPath, size, forceVirtual: !!snapshot.isVirtual, diskVersion: savedVersion };
        if (snapshot.isVirtual) {
            snapshot = {
                isVirtual: true, fileSize: size, sourceFileSize: size, diskVersion: savedVersion,
                modifiedOverlay: new Map(), virtualSegments: [{ type: 'source', start: 0, length: size }]
            };
            session.history = [{
                isLightweight: true, snapshot, description: 'Arquivo salvo', timestamp: new Date(),
                cursorPosition: session.cursorPosition, modifiedBytes: new Set()
            }];
            session.historyIndex = 0;
        }
        Object.assign(session, {
            fileRef, fileKey: tabs.getSessionFileKey(fileRef), filePath: targetPath, fileName,
            currentFileName: fileName, currentFileExtension: this.hexEditor.getFileExtension(fileName),
            fileSize: size, diskVersion: savedVersion, snapshot, originalData: snapshot, hasUnsavedChanges: false, modifiedBytes: []
        });
    }

    updateSaveButton() {
        const saveBtn = document.getElementById('save-btn');
        const saveAsBtn = document.getElementById('save-as-btn');

        if (!saveBtn) return;

        if (this.hexEditor.hasUnsavedChanges === true && !this.saveInProgress) {
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

        if (saveAsBtn) {
            saveAsBtn.disabled = this.saveInProgress || !this.hexEditor.currentFileName;
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
