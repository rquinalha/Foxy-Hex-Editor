Object.assign(ContextMenuManager.prototype, {
    async exportSelection() {
        const t = (key) => ContextMenuI18n.t(key);
        const hexEditor = window.hexEditor;
        if (!hexEditor) {
            this.showNotification('âŒ ' + t('editorNotFound'), 'error');
            return;
        }
        if (window.intelligentSave?.saveInProgress) {
            this.showNotification('Aguarde o salvamento antes de exportar a seleção.', 'warning');
            return;
        }

        const selection = hexEditor.getSelection();
        if (selection.length === 0) {
            this.showNotification('âš ï¸ ' + t('noSelectionToExport'), 'warning');
            return;
        }

        let start = selection.start;
        let end = selection.end;
        const currentTable = hexEditor.charTables && hexEditor.currentCharTable ? hexEditor.charTables[hexEditor.currentCharTable] : null;
        const is16bit = currentTable && (currentTable.type === '16-bit' || currentTable.type === 'UTF-16');
        const isShiftJIS = currentTable && (currentTable.type === 'shift-jis' || currentTable.type === 'shift_jis');

        if (is16bit) {
            start = start % 2 === 0 ? start : start - 1;
            end = (end % 2 === 1) ? end : end + 1;
            start = Math.max(0, start);
            end = Math.min(end, hexEditor.getDataLength() - 1);
        } else if (isShiftJIS) {
            if (start > 0) {
                const bPrev = hexEditor.getByteAt(start - 1);
                const bStart = hexEditor.getByteAt(start);
                const prevIsLead = (bPrev >= 0x81 && bPrev <= 0x9F) || (bPrev >= 0xE0 && bPrev <= 0xFC);
                const startIsTrail = (bStart >= 0x40 && bStart <= 0x7E) || (bStart >= 0x80 && bStart <= 0xFC);
                if (prevIsLead && startIsTrail) start = start - 1;
            }

            if (end + 1 < hexEditor.getDataLength()) {
                const bEnd = hexEditor.getByteAt(end);
                const bNext = hexEditor.getByteAt(end + 1);
                const endIsLead = (bEnd >= 0x81 && bEnd <= 0x9F) || (bEnd >= 0xE0 && bEnd <= 0xFC);
                const nextIsTrail = (bNext >= 0x40 && bNext <= 0x7E) || (bNext >= 0x80 && bNext <= 0xFC);
                if (endIsLead && nextIsTrail) end = end + 1;
            }
        }

        const fileService = window.electronFileHandler;
        const source = hexEditor.getVirtualNavigationHandler?.()?.file?.path;
        const snapshot = hexEditor.createDataSnapshot();
        const size = end - start + 1;
        try {
            const target = await fileService.showSaveDialog('selection_' + size + 'bytes.bin');
            if (target.canceled) return;
            const targetPath = target.filePath;
            const tabs = window.fileTabManager;
            const fs = require('node:fs').promises;
            const normalized = await fs.realpath(targetPath).catch(error => {
                if (error.code !== 'ENOENT') throw error;
                return targetPath;
            });
            if (tabs?.findSessionByFile({ path: normalized })) {
                throw new Error('Escolha um destino que não esteja aberto no editor.');
            }
            await fileService.exportDocumentRange(targetPath, source, snapshot, start, size);
            this.showNotification('Seleção exportada.', 'success');
        } catch (error) {
            this.showNotification(error.message, 'error');
        }

    },

    importSelection() {
        const t = (key) => ContextMenuI18n.t(key);
        const hexEditor = window.hexEditor;
        if (!hexEditor) {
            this.showNotification('âŒ ' + t('editorNotFound'), 'error');
            return;
        }

        const selection = hexEditor.getSelection();
        if (selection.length === 0) {
            this.showNotification('âš ï¸ ' + t('noSelectionToImport'), 'warning');
            return;
        }

        if (typeof require !== 'undefined' && typeof process !== 'undefined') {
            const { ipcRenderer } = require('electron');
            ipcRenderer.send('open-import-window', {
                ...selection,
                sessionId: window.fileTabManager?.activeSessionId,
                revision: hexEditor.documentRevision || 0,
                maxImportBytes: 1024 * 1024
            });
        } else {
            this.showImportModal(selection);
        }
    },

    showImportModal(selection) {
        const t = (key) => ContextMenuI18n.t(key);
        const existingModal = document.getElementById('import-selection-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'import-selection-modal';
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            backdrop-filter: blur(5px);
        `;

        modal.innerHTML = `
            <div class="modal-container" style="
                background: linear-gradient(135deg, rgba(26, 26, 46, 0.95) 0%, rgba(22, 33, 62, 0.95) 100%);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 12px;
                padding: 0;
                min-width: 500px;
                max-width: 600px;
                max-height: 80vh;
                display: flex;
                flex-direction: column;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(10px);
            ">
                <div class="modal-header" style="
                    background: linear-gradient(135deg, rgba(255, 107, 53, 0.1) 0%, rgba(247, 147, 30, 0.1) 100%);
                    padding: 20px 24px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-shrink: 0;
                ">
                    <h3 style="
                        color: #ffffff;
                        margin: 0;
                        font-size: 18px;
                        font-weight: 600;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    ">ðŸ“‚ ${t('importTitle')}</h3>
                    <button onclick="this.closest('.modal-overlay').remove()" style="
                        background: none;
                        border: none;
                        color: #ffffff;
                        font-size: 24px;
                        cursor: pointer;
                        padding: 0;
                        width: 30px;
                        height: 30px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 50%;
                        transition: all 0.2s ease;
                    " onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='none'">Ã—</button>
                </div>
                
                <div class="modal-content" style="
                    padding: 24px;
                    flex: 1;
                    overflow-y: auto;
                    min-height: 0;
                ">
                    <div style="margin-bottom: 20px;">
                        <div style="
                            background: rgba(255, 107, 53, 0.1);
                            border: 1px solid rgba(255, 107, 53, 0.3);
                            border-radius: 8px;
                            padding: 16px;
                            margin-bottom: 20px;
                        ">
                            <h4 style="color: #ff6b35; margin: 0 0 10px 0; font-size: 14px;">ðŸ“Š ${t('selectionInfo')}</h4>
                            <div style="color: #ffffff; font-size: 13px; line-height: 1.5;">
                                <div><strong>${t('selectionSize')}:</strong> ${selection.length} bytes</div>
                                <div><strong>${t('startPosition')}:</strong> 0x${selection.start.toString(16).padStart(8, '0').toUpperCase()}</div>
                                <div><strong>${t('endPosition')}:</strong> 0x${selection.end.toString(16).padStart(8, '0').toUpperCase()}</div>
                            </div>
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="
                            display: block;
                            color: #ffffff;
                            margin-bottom: 10px;
                            font-weight: 600;
                            font-size: 14px;
                        ">ðŸ“ ${t('selectFile')}</label>
                        <div style="
                            border: 2px dashed rgba(255, 255, 255, 0.3);
                            border-radius: 8px;
                            padding: 20px;
                            text-align: center;
                            cursor: pointer;
                            transition: all 0.2s ease;
                            background: rgba(255, 255, 255, 0.05);
                        " id="file-drop-zone" onmouseover="this.style.borderColor='rgba(255,107,53,0.5)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.3)'">
                            <div style="font-size: 48px; margin-bottom: 10px;">ðŸ“‚</div>
                            <div style="color: #ffffff; font-size: 14px; margin-bottom: 5px;">${t('clickToSelect')}</div>
                            <div style="color: #a0aec0; font-size: 12px;">${t('orDragDrop')}</div>
                            <input type="file" id="import-file-input" accept=".bin,.dat,.hex" style="display: none;">
                        </div>
                    </div>

                    <div id="file-info" style="display: none; margin-bottom: 20px;">
                        <div style="
                            background: rgba(68, 217, 145, 0.1);
                            border: 1px solid rgba(68, 217, 145, 0.3);
                            border-radius: 8px;
                            padding: 16px;
                        ">
                            <h4 style="color: #44d991; margin: 0 0 10px 0; font-size: 14px;">ðŸ“„ ${t('fileInfo')}</h4>
                            <div id="file-details" style="color: #ffffff; font-size: 13px; line-height: 1.5;"></div>
                        </div>
                    </div>

                    <div id="import-warning" style="display: none; margin-bottom: 20px;">
                        <div style="
                            background: rgba(255, 193, 7, 0.1);
                            border: 1px solid rgba(255, 193, 7, 0.3);
                            border-radius: 8px;
                            padding: 16px;
                        ">
                            <h4 style="color: #ffc107; margin: 0 0 10px 0; font-size: 14px;">âš ï¸ ${t('warning')}</h4>
                            <div id="warning-message" style="color: #ffffff; font-size: 13px; line-height: 1.5;"></div>
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="
                            display: flex;
                            align-items: center;
                            gap: 10px;
                            color: #ffffff;
                            cursor: pointer;
                            font-size: 14px;
                        ">
                            <input type="checkbox" id="insertion-mode" style="
                                width: 16px;
                                height: 16px;
                                accent-color: #ff6b35;
                            ">
                            <span>${t('insertionMode')}</span>
                        </label>
                        <div style="color: #a0aec0; font-size: 12px; margin-top: 5px; margin-left: 26px;">
                            ${t('insertionModeHelp')}
                        </div>
                    </div>
                </div>

                <div class="modal-footer" style="
                    background: rgba(0, 0, 0, 0.2);
                    padding: 20px 24px;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                    flex-shrink: 0;
                ">
                    <button id="import-btn" style="
                        background: linear-gradient(135deg, #ff6b35, #f7931e);
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 600;
                        font-size: 14px;
                        transition: all 0.2s ease;
                        opacity: 0.5;
                        pointer-events: none;
                    " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'" disabled>ðŸ“‚ ${t('import')}</button>
                    <button onclick="this.closest('.modal-overlay').remove()" style="
                        background: rgba(255, 255, 255, 0.1);
                        color: #ffffff;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        padding: 12px 24px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 600;
                        font-size: 14px;
                        transition: all 0.2s ease;
                    " onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">${t('cancel')}</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.setupImportModalEvents(modal, selection);
    },

    setupImportModalEvents(modal, selection) {
        const dropZone = modal.querySelector('#file-drop-zone');
        const fileInput = modal.querySelector('#import-file-input');
        const fileInfo = modal.querySelector('#file-info');
        const fileDetails = modal.querySelector('#file-details');
        const importWarning = modal.querySelector('#import-warning');
        const warningMessage = modal.querySelector('#warning-message');
        const importBtn = modal.querySelector('#import-btn');
        const insertionMode = modal.querySelector('#insertion-mode');

        let selectedFile = null;

        dropZone.addEventListener('click', () => fileInput.click());

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'rgba(255,107,53,0.7)';
            dropZone.style.background = 'rgba(255,107,53,0.1)';
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.style.borderColor = 'rgba(255,255,255,0.3)';
            dropZone.style.background = 'rgba(255,255,255,0.05)';
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'rgba(255,255,255,0.3)';
            dropZone.style.background = 'rgba(255,255,255,0.05)';

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelection(files[0], selection, fileInfo, fileDetails, importWarning, warningMessage, importBtn);
                selectedFile = files[0];
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelection(e.target.files[0], selection, fileInfo, fileDetails, importWarning, warningMessage, importBtn);
                selectedFile = e.target.files[0];
            }
        });

        importBtn.addEventListener('click', () => {
            if (selectedFile) {
                this.performImport(selectedFile, selection, insertionMode.checked);
                modal.remove();
            }
        });
    },

    handleFileSelection(file, selection, fileInfo, fileDetails, importWarning, warningMessage, importBtn) {
        const t = (key) => ContextMenuI18n.t(key);
        const reader = new FileReader();

        reader.onload = (e) => {
            const arrayBuffer = e.target.result;
            const fileSize = arrayBuffer.byteLength;

            fileDetails.innerHTML = `
                <div><strong>${t('fileName')}:</strong> ${file.name}</div>
                <div><strong>${t('fileSize')}:</strong> ${fileSize} bytes</div>
                <div><strong>${t('selectionSize')}:</strong> ${selection.length} bytes</div>
            `;
            fileInfo.style.display = 'block';

            if (fileSize > selection.length) {
                warningMessage.innerHTML = `
                    ${t('fileLargerThanSelection')} (${fileSize} bytes > ${selection.length} bytes).<br>
                    <br>
                    â€¢ <strong>${t('overwriteMode')}</strong><br>
                    â€¢ <strong>${t('insertModeOption')}</strong>
                `;
                importWarning.style.display = 'block';
            } else {
                importWarning.style.display = 'none';
            }

            importBtn.disabled = false;
            importBtn.style.opacity = '1';
            importBtn.style.pointerEvents = 'auto';
        };

        reader.readAsArrayBuffer(file);
    },

    async performImport(file, selection, insertionMode) {
        const t = (key) => ContextMenuI18n.t(key);
        const hexEditor = window.hexEditor;
        if (!hexEditor) {
            this.showNotification('âŒ ' + t('editorNotFound'), 'error');
            return;
        }

        try {
            const arrayBuffer = await this.readFileAsArrayBuffer(file);
            const importData = new Uint8Array(arrayBuffer);

            if (insertionMode) {
                this.insertImportData(hexEditor, selection, importData);
            } else {
                const dataToImport = importData.slice(0, selection.length);
                this.overwriteImportData(hexEditor, selection, dataToImport);
            }

            this.showNotification('âœ… ' + t('importSuccess').replace('{0}', importData.length), 'success');
        } catch (error) {
            console.error('Erro na importaÃ§Ã£o:', error);
            this.showNotification('âŒ ' + t('importError'), 'error');
        }
    },

    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsArrayBuffer(file);
        });
    }
});
