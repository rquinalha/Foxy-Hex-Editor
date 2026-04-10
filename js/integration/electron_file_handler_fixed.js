/**
 * Electron File Handler - CORRIGIDO para salvamento de arquivos grandes
 * Suporte completo para arquivos de até 800MB com transferência em chunks
 */

// Inicializar ipcRenderer no objeto window sem criar binding global duplicado
(function initIpcOnWindow() {
    try {
        if (typeof window !== 'undefined' && !window.ipcRenderer) {
            let electronMod = null;
            try { electronMod = typeof require !== 'undefined' ? require('electron') : null; } catch { }
            if (!electronMod && typeof window.require === 'function') {
                try { electronMod = window.require('electron'); } catch { }
            }
            if (electronMod && electronMod.ipcRenderer) {
                window.ipcRenderer = electronMod.ipcRenderer;
            }
        }
    } catch (e) {
        // Ignorar falhas em ambiente não-Electron
    }
})();

class ElectronFileHandler {
    constructor() {
        // Melhorar detecção do Electron
        this.isElectron = (typeof require !== 'undefined' &&
            typeof process !== 'undefined' &&
            process.versions &&
            process.versions.electron) ||
            (typeof window !== 'undefined' &&
                window.process &&
                window.process.type);
        this.currentFile = null;
        this.fileBuffer = null;
        this.chunkSize = 1024 * 1024; // 1MB chunks para leitura
        this.saveChunkSize = 32 * 1024 * 1024; // 32MB chunks para salvamento (evita limite do Array)

        if (this.isElectron) {
        } else {
        }
    }

    // Verifica se está rodando no Electron
    isElectronEnvironment() {
        return this.isElectron;
    }

    getElectronInMemoryLimit() {
        return 800 * 1024 * 1024;
    }

    getBrowserFileLimit() {
        return 100 * 1024 * 1024;
    }

    shouldUseChunkedFileMode(fileOrSize) {
        const size = typeof fileOrSize === 'number' ? fileOrSize : Number(fileOrSize?.size || 0);
        return size > this.getElectronInMemoryLimit();
    }

    showSaveProgressModal(title = 'Salvando arquivo...') {
        if (typeof document === 'undefined') return;
        if (document.getElementById('save-progress-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'save-progress-modal';
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                        background: rgba(0,0,0,0.8); display: flex; justify-content: center;
                        align-items: center; z-index: 9999999;">
                <div style="background: linear-gradient(135deg, #1a1a2e, #16213e);
                            padding: 30px; border-radius: 12px; text-align: center;
                            min-width: 360px; border: 1px solid rgba(255, 255, 255, 0.1);
                            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5); color: #ffffff;">
                    <h3 id="save-progress-title" style="color: #ff6b35; margin-bottom: 20px;">${title}</h3>
                    <div style="width: 100%; height: 20px;
                         background: rgba(26, 26, 46, 0.8); border-radius: 10px; margin: 20px 0;
                         overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.2);">
                        <div id="save-progress-fill" style="height: 100%; background: #ff6b35;
                             width: 0%; transition: width 0.2s;"></div>
                    </div>
                    <p id="save-progress-text" style="color: #ffffff; margin: 0;">Iniciando...</p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    updateSaveProgress(percent, message = null, title = null) {
        if (typeof document === 'undefined') return;
        const fill = document.getElementById('save-progress-fill');
        const text = document.getElementById('save-progress-text');
        const titleEl = document.getElementById('save-progress-title');

        if (fill) {
            fill.style.width = `${Math.max(0, Math.min(100, Math.round(percent)))}%`;
        }
        if (text && message) {
            text.textContent = message;
        }
        if (titleEl && title) {
            titleEl.textContent = title;
        }
    }

    hideSaveProgressModal(delayMs = 0) {
        if (typeof document === 'undefined') return;
        const modal = document.getElementById('save-progress-modal');
        if (!modal) return;

        const remove = () => {
            if (modal.parentNode) modal.remove();
        };

        if (delayMs > 0) {
            setTimeout(remove, delayMs);
        } else {
            remove();
        }
    }

    // Carrega arquivo usando APIs nativas do Electron
    async loadFileElectron(filePath) {
        if (!this.isElectron || !window.ipcRenderer) {
            throw new Error('Este método só funciona no Electron');
        }

        try {
            // Obter informações do arquivo
            const fileInfo = await window.ipcRenderer.invoke('get-file-info', filePath);

            if (!fileInfo.success) {
                throw new Error(`Erro ao ler arquivo: ${fileInfo.error}`);
            }


            // Para arquivos pequenos (< 800MB), carregar tudo na memória
            if (!this.shouldUseChunkedFileMode(fileInfo.size)) {
                const result = await window.ipcRenderer.invoke('read-file', filePath);
                if (result.success) {
                    this.fileBuffer = result.data;
                    this.currentFile = {
                        name: filePath.split('/').pop().split('\\').pop(),
                        size: fileInfo.size,
                        path: filePath
                    };
                    return this.createFileObject();
                }
            } else {
                // Para arquivos grandes, usar carregamento por chunks
                return this.loadLargeFileElectron(filePath, fileInfo.size);
            }

        } catch (error) {
            console.error('❌ Erro ao carregar arquivo no Electron:', error);
            throw error;
        }
    }

    // Carregamento otimizado para arquivos grandes
    async loadLargeFileElectron(filePath, fileSize) {

        this.currentFile = {
            name: filePath.split('/').pop().split('\\').pop(),
            size: fileSize,
            path: filePath
        };

        // Criar um objeto File simulado para compatibilidade
        const fileObject = this.createFileObject();

        // Configurar sistema de chunks
        this.setupChunkedSystem(filePath, fileSize);

        return fileObject;
    }

    // Cria objeto File simulado para compatibilidade
    createFileObject() {
        const file = {
            name: this.currentFile.name,
            size: this.currentFile.size,
            type: 'application/octet-stream',
            lastModified: Date.now(),
            path: this.currentFile.path
        };

        // Adicionar método readAsArrayBuffer para compatibilidade
        file.arrayBuffer = async () => {
            if (this.fileBuffer) {
                return this.fileBuffer.buffer;
            } else {
                // Para arquivos grandes, retornar buffer vazio
                return new ArrayBuffer(0);
            }
        };

        return file;
    }

    // ========================================================================
    // SISTEMA DE SALVAMENTO CORRIGIDO PARA ARQUIVOS GRANDES
    // ========================================================================

    // CORRIGIDO: Salva arquivo modificado com suporte a arquivos grandes
    async saveFileElectron(filePath, data) {
        if (!this.isElectron || !window.ipcRenderer) {
            throw new Error('Este método só funciona no Electron');
        }

        try {

            // Verificar se os dados são válidos
            if (!data) {
                throw new Error('Dados inválidos para salvamento');
            }

            // Verificar se o caminho é válido
            if (!filePath || typeof filePath !== 'string') {
                throw new Error('Caminho do arquivo inválido');
            }

            // Determinar tamanho dos dados
            let dataSize = 0;
            if (data instanceof ArrayBuffer) {
                dataSize = data.byteLength;
            } else if (data instanceof Uint8Array) {
                dataSize = data.length;
            } else if (Array.isArray(data)) {
                dataSize = data.length;
            } else {
                throw new Error(`Formato de dados não suportado: ${data.constructor.name}`);
            }


            // CORREÇÃO: Usar método adequado baseado no tamanho
            if (dataSize > 500 * 1024 * 1024) { // > 500MB - usar chunks
                return await this.saveFileInChunks(filePath, data);
            } else { // <= 500MB - método direto otimizado
                return await this.saveFileDirectOptimized(filePath, data);
            }

        } catch (error) {
            console.error('❌ [ELECTRON] Erro ao salvar arquivo:', error);
            throw new Error(`Falha ao salvar arquivo: ${error.message}`);
        }
    }

    // NOVO: Escrever bytes em offsets específicos (patch) sem reescrever o arquivo todo
    async writeAtOffset(filePath, offset, uint8Data) {
        if (!this.isElectron || !ipcRenderer) {
            throw new Error('Este método só funciona no Electron');
        }
        if (!(uint8Data instanceof Uint8Array)) {
            throw new Error('uint8Data deve ser Uint8Array');
        }
        const result = await window.ipcRenderer.invoke('write-at-offset', { filePath, offset, data: uint8Data });
        if (!result || !result.success) {
            throw new Error(result?.error || 'Falha ao escrever em offset');
        }
        return true;
    }

    // NOVO: Salvamento direto otimizado para arquivos médios (até 500MB)
    buildContiguousRanges(entries) {
        if (!Array.isArray(entries) || entries.length === 0) {
            return [];
        }

        const sortedEntries = [...entries].sort((a, b) => a[0] - b[0]);
        const ranges = [];
        let start = sortedEntries[0][0];
        let previous = sortedEntries[0][0];
        let buffer = [sortedEntries[0][1]];

        for (let i = 1; i < sortedEntries.length; i++) {
            const [position, value] = sortedEntries[i];
            if (position === previous + 1) {
                buffer.push(value);
            } else {
                ranges.push({ offset: start, data: new Uint8Array(buffer) });
                start = position;
                buffer = [value];
            }
            previous = position;
        }

        ranges.push({ offset: start, data: new Uint8Array(buffer) });
        return ranges;
    }

    async applyOverlayEntries(filePath, overlayEntries) {
        if (!Array.isArray(overlayEntries) || overlayEntries.length === 0) {
            return true;
        }

        const ranges = this.buildContiguousRanges(overlayEntries);
        for (const range of ranges) {
            await this.writeAtOffset(filePath, range.offset, range.data);
        }

        return true;
    }

    async saveFileDirectOptimized(filePath, data) {
        try {
            if (!window.ipcRenderer) {
                throw new Error('ipcRenderer não disponível');
            }

            // Conversão otimizada que evita criar arrays gigantes
            let dataToSend;
            if (data instanceof Uint8Array || data instanceof ArrayBuffer || Array.isArray(data)) {
                dataToSend = data;
            } else {
                throw new Error(`Formato não suportado para salvamento direto: ${data.constructor.name}`);
            }


            // Usar IPC direto para arrays menores
            const result = await window.ipcRenderer.invoke('write-file-direct', {
                filePath: filePath,
                data: dataToSend
            });

            if (result && result.success) {
                return true;
            } else {
                const errorMsg = result?.error || 'Erro desconhecido no salvamento direto';
                throw new Error(errorMsg);
            }

        } catch (error) {
            console.error('❌ [ELECTRON] Erro no salvamento direto otimizado:', error);
            throw error;
        }
    }

    // NOVO: Salvamento em chunks para arquivos grandes (> 500MB)
    async saveFileInChunks(filePath, data) {
        try {
            if (!window.ipcRenderer) {
                throw new Error('ipcRenderer não disponível');
            }


            // Converter dados para Uint8Array se necessário
            let uint8Data;
            if (data instanceof Uint8Array) {
                uint8Data = data;
            } else if (data instanceof ArrayBuffer) {
                uint8Data = new Uint8Array(data);
            } else if (Array.isArray(data)) {
                uint8Data = new Uint8Array(data);
            } else {
                throw new Error(`Formato não suportado para chunks: ${data.constructor.name}`);
            }

            const totalSize = uint8Data.length;
            const totalChunks = Math.ceil(totalSize / this.saveChunkSize);
            this.showSaveProgressModal('Salvando arquivo...');
            this.updateSaveProgress(0, 'Preparando salvamento...');


            // Iniciar processo de salvamento em chunks
            const initResult = await window.ipcRenderer.invoke('init-chunked-save', {
                filePath: filePath,
                totalSize: totalSize,
                chunkSize: this.saveChunkSize
            });

            if (!initResult || !initResult.success) {
                throw new Error(`Falha ao inicializar salvamento em chunks: ${initResult?.error || 'Erro desconhecido'}`);
            }


            // Enviar chunks sequencialmente
            for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                const start = chunkIndex * this.saveChunkSize;
                const end = Math.min(start + this.saveChunkSize, totalSize);
                const chunkData = uint8Data.slice(start, end);


                // Usar chunkData diretamente (Uint8Array)
                const chunkResult = await window.ipcRenderer.invoke('save-chunk', {
                    filePath: filePath,
                    chunkIndex: chunkIndex,
                    chunkData: chunkData,
                    isLastChunk: chunkIndex === totalChunks - 1
                });

                if (!chunkResult || !chunkResult.success) {
                    throw new Error(`Falha ao salvar chunk ${chunkIndex}: ${chunkResult?.error || 'Erro desconhecido'}`);
                }

                const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
                const writtenMB = (end / (1024 * 1024)).toFixed(1);
                const totalMB = (totalSize / (1024 * 1024)).toFixed(1);
                this.updateSaveProgress(progress, `Salvando ${writtenMB} MB de ${totalMB} MB`);
            }

            // Finalizar salvamento
            const finalizeResult = await window.ipcRenderer.invoke('finalize-chunked-save', {
                filePath: filePath
            });

            if (!finalizeResult || !finalizeResult.success) {
                throw new Error(`Falha ao finalizar salvamento: ${finalizeResult?.error || 'Erro desconhecido'}`);
            }

            this.updateSaveProgress(100, 'Concluído');
            this.hideSaveProgressModal(500);
            return true;

        } catch (error) {
            console.error('❌ [ELECTRON] Erro no salvamento em chunks:', error);

            // Tentar limpar arquivo parcial em caso de erro
            if (window.ipcRenderer) {
                try {
                    await window.ipcRenderer.invoke('cleanup-failed-save', { filePath: filePath });
                } catch (cleanupError) {
                    console.error('❌ [ELECTRON] Erro ao limpar arquivo parcial:', cleanupError);
                }
            }

            throw error;
        }
    }

    // CORRIGIDO: Mostra diálogo de salvar arquivo no Electron
    async showSaveDialog(defaultFileName = null) {
        if (!this.isElectron || !window.ipcRenderer) {
            throw new Error('Este método só funciona no Electron');
        }

        try {

            const options = {};
            if (defaultFileName) {
                options.defaultPath = defaultFileName;
            }

            const result = await window.ipcRenderer.invoke('show-save-dialog', options);


            if (result.canceled) {
                return { canceled: true };
            }

            return result;
        } catch (error) {
            console.error('❌ [ELECTRON] Erro ao abrir diálogo de salvar:', error);
            throw new Error(`Falha ao abrir diálogo: ${error.message}`);
        }
    }

    // NOVO: Método para verificar se arquivo existe
    async fileExists(filePath) {
        if (!this.isElectron || !window.ipcRenderer) {
            return false;
        }

        try {
            const result = await window.ipcRenderer.invoke('file-exists', filePath);
            return result && result.exists;
        } catch (error) {
            console.error('❌ [ELECTRON] Erro ao verificar se arquivo existe:', error);
            return false;
        }
    }

    // NOVO: Método para obter informações do arquivo
    async getFileInfo(filePath) {
        if (!this.isElectron || !window.ipcRenderer) {
            throw new Error('Este método só funciona no Electron');
        }

        try {
            const result = await window.ipcRenderer.invoke('get-file-info', filePath);
            if (result.success) {
                return {
                    size: result.size,
                    lastModified: result.lastModified,
                    exists: true
                };
            } else {
                return { exists: false };
            }
        } catch (error) {
            console.error('❌ [ELECTRON] Erro ao obter informações do arquivo:', error);
            return { exists: false };
        }
    }

    async readFileChunkSafe(filePath, start, length) {
        if (!this.isElectron || !window.ipcRenderer) {
            throw new Error('Leitura de chunk so funciona no Electron');
        }

        const safeStart = Math.max(0, Math.floor(Number(start)));
        const safeLength = Math.max(0, Math.floor(Number(length)));

        try {
            const result = await window.ipcRenderer.invoke('read-file-chunk', filePath, safeStart, safeLength);
            if (!result || !result.success) {
                throw new Error(result?.error || 'Falha ao ler chunk');
            }

            if (result.data instanceof Uint8Array) {
                return result.data;
            }

            if (result.data instanceof ArrayBuffer) {
                return new Uint8Array(result.data);
            }

            if (Array.isArray(result.data)) {
                return new Uint8Array(result.data);
            }

            return new Uint8Array(0);
        } catch (error) {
            console.error('[ELECTRON] Erro ao ler chunk seguro:', error);
            throw error;
        }
    }

    async copyFile(sourcePath, targetPath, _useProgressBar = false) {
        if (!this.isElectron) {
            throw new Error('Copia de arquivo so funciona no Electron');
        }

        try {
            const fsNative = require('fs').promises;
            await fsNative.copyFile(sourcePath, targetPath);
            return true;
        } catch (error) {
            console.error('❌ [ELECTRON] Erro ao copiar arquivo:', error);
            throw error;
        }
    }

    async saveLargeFileAsWithOverlay(sourcePath, targetPath, overlayEntries, useProgressBar = false) {
        await this.copyFile(sourcePath, targetPath, useProgressBar);

        if (!Array.isArray(overlayEntries) || overlayEntries.length === 0) {
            return true;
        }

        return this.applyOverlayEntries(targetPath, overlayEntries);
    }

    async saveLargeFileAsTransformed(sourcePath, targetPath, handler) {
        if (!handler || typeof handler.getBytes !== 'function') {
            throw new Error('Handler de arquivo grande inválido');
        }

        const totalSize = handler.fileSize || 0;
        this.showSaveProgressModal('Salvando arquivo...');
        this.updateSaveProgress(0, 'Preparando reconstrução do arquivo...');
        const initResult = await window.ipcRenderer.invoke('init-chunked-save', {
            filePath: targetPath,
            totalSize,
            chunkSize: this.saveChunkSize
        });

        if (!initResult || !initResult.success) {
            throw new Error(initResult?.error || 'Falha ao iniciar salvamento transformado');
        }

        const totalChunks = Math.ceil(totalSize / this.saveChunkSize);
        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
            const start = chunkIndex * this.saveChunkSize;
            const length = Math.min(this.saveChunkSize, totalSize - start);
            const chunkData = await handler.getBytes(start, length);
            const chunkResult = await window.ipcRenderer.invoke('save-chunk', {
                filePath: targetPath,
                chunkIndex,
                chunkData,
                isLastChunk: chunkIndex === totalChunks - 1
            });

            if (!chunkResult || !chunkResult.success) {
                throw new Error(chunkResult?.error || `Falha ao salvar chunk ${chunkIndex}`);
            }

            const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
            const writtenMB = ((start + length) / (1024 * 1024)).toFixed(1);
            const totalMB = (totalSize / (1024 * 1024)).toFixed(1);
            this.updateSaveProgress(progress, `Reconstruindo ${writtenMB} MB de ${totalMB} MB`);
        }

        const finalizeResult = await window.ipcRenderer.invoke('finalize-chunked-save', {
            filePath: targetPath
        });

        if (!finalizeResult || !finalizeResult.success) {
            throw new Error(finalizeResult?.error || 'Falha ao finalizar salvamento transformado');
        }

        this.updateSaveProgress(100, 'Concluído');
        this.hideSaveProgressModal(500);

        return true;
    }

    async saveLargeFileWithStructureChanges(filePath, handler) {
        if (!this.isElectron) {
            throw new Error('Salvamento estrutural só funciona no Electron');
        }

        const fsNative = require('fs').promises;
        const tempPath = `${filePath}.foxy-struct-${Date.now()}.tmp`;
        const backupPath = `${filePath}.foxy-backup-${Date.now()}.bak`;
        await this.saveLargeFileAsTransformed(filePath, tempPath, handler);

        try {
            this.showSaveProgressModal('Finalizando salvamento...');
            this.updateSaveProgress(100, 'Trocando arquivo temporário pelo final...');
            await fsNative.rename(filePath, backupPath);
            await fsNative.rename(tempPath, filePath);
            await fsNative.unlink(backupPath);
            this.hideSaveProgressModal(400);
        } catch (error) {
            this.hideSaveProgressModal();
            try {
                await fsNative.access(filePath);
            } catch (_missingCurrent) {
                try {
                    await fsNative.rename(backupPath, filePath);
                } catch (_restoreError) {
                }
            }
            throw error;
        }
        return true;
    }

    // Verifica se arquivo é muito grande (sem limite no Electron para arquivos até 800MB)
    isFileTooLarge(fileSize) {
        if (this.isElectron) {
            return this.shouldUseChunkedFileMode(fileSize);
        } else {
            return fileSize > this.getBrowserFileLimit();
        }
    }

    // Mostra aviso para arquivos muito grandes (apenas no Electron)
    showLargeFileWarning(file) {
        if (!this.isElectron) {
            return true;
        }

        if (!this.shouldUseChunkedFileMode(file)) {
            return false;
        }

        return true;
    }

    // ========================================================================
    // MÉTODOS UTILITÁRIOS
    // ========================================================================

    // Formatar bytes em formato legível
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    // ========================================================================
    // MÉTODOS PARA CHUNKS (compatibilidade com sistema existente)
    // ========================================================================

    // Configura sistema de chunks para arquivos grandes
    setupChunkedSystem(filePath, fileSize) {
        // Substituir métodos do hex editor para trabalhar com chunks
        if (window.hexEditor) {
            this.overrideHexEditorForChunks(filePath, fileSize);
        }
    }

    // Substitui métodos do hex editor para trabalhar com chunks
    overrideHexEditorForChunks(filePath, fileSize) {
        const hexEditor = window.hexEditor;

        // Armazenar métodos originais
        this.originalMethods = {
            loadFile: hexEditor.loadFile?.bind(hexEditor),
            renderHexContent: hexEditor.renderHexContent?.bind(hexEditor),
            getByteAt: hexEditor.getByteAt?.bind(hexEditor)
        };

        // Substituir getByteAt para ler chunks do arquivo
        hexEditor.getByteAt = async (offset) => {
            if (offset >= fileSize) return 0;

            try {
                // Calcular chunk necessário
                const chunkIndex = Math.floor(offset / this.chunkSize);
                const chunkOffset = offset % this.chunkSize;

                // Ler chunk específico
                const chunk = await this.readChunk(filePath, chunkIndex);
                return chunk[chunkOffset] || 0;
            } catch (error) {
                console.error('Erro ao ler byte:', error);
                return 0;
            }
        };

        // Substituir renderHexContent para renderizar chunks
        hexEditor.renderHexContent = async () => {
            return this.renderChunkedContent(filePath, fileSize);
        };
    }

    // Lê um chunk específico do arquivo
    async readChunk(filePath, chunkIndex) {
        if (!ipcRenderer) {
            return new Uint8Array(this.chunkSize);
        }

        const start = chunkIndex * this.chunkSize;
        const end = Math.min(start + this.chunkSize, this.currentFile.size);

        try {
            // Implementar leitura de chunk via IPC
            const result = await ipcRenderer.invoke('read-file-chunk', filePath, start, end - start);
            if (result.success) {
                return result.data;
            }
        } catch (error) {
            console.error('Erro ao ler chunk:', error);
        }

        return new Uint8Array(this.chunkSize);
    }

    // Renderiza conteúdo em chunks
    async renderChunkedContent(filePath, fileSize) {
        const visibleStart = window.hexEditor?.cursorPosition || 0;
        const visibleEnd = Math.min(visibleStart + (16 * 100), fileSize); // 100 linhas hex

        const chunks = [];
        for (let offset = visibleStart; offset < visibleEnd; offset += this.chunkSize) {
            const chunkIndex = Math.floor(offset / this.chunkSize);
            const chunk = await this.readChunk(filePath, chunkIndex);
            chunks.push(chunk);
        }

        return this.renderHexLines(chunks, visibleStart);
    }

    // Renderiza linhas hex a partir dos chunks
    renderHexLines(chunks, startOffset) {
        const lines = [];
        let currentOffset = startOffset;

        for (const chunk of chunks) {
            for (let i = 0; i < chunk.length; i += 16) {
                const lineBytes = chunk.slice(i, i + 16);
                const line = this.createHexLine(currentOffset + i, lineBytes);
                lines.push(line);
            }
            currentOffset += chunk.length;
        }

        return lines.join('\n');
    }

    // Cria uma linha hex
    createHexLine(offset, bytes) {
        const offsetHex = offset.toString(16).padStart(8, '0').toUpperCase();
        const hexPart = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
        const asciiPart = Array.from(bytes).map(b =>
            (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.'
        ).join('');

        return `${offsetHex}: ${hexPart.padEnd(47)} |${asciiPart}|`;
    }

    // ========================================================================
    // MÉTODOS DE DEBUG E TESTE
    // ========================================================================

    // Método para debug do sistema
    debug() {

        // Testar IPC básico
        if (this.isElectron && window.ipcRenderer) {
            window.ipcRenderer.invoke('ping').then(result => {
            }).catch(error => {
            });
        }
    }

    // Método para testar salvamento com diferentes tamanhos
    async testSave(sizeInMB = 1) {
        if (!this.isElectron || !window.ipcRenderer) {
            console.error('❌ Teste só funciona no Electron');
            return;
        }

        try {

            // Criar dados de teste do tamanho especificado
            const dataSize = sizeInMB * 1024 * 1024;
            const testData = new Uint8Array(dataSize);

            // Preencher com padrão reconhecível
            for (let i = 0; i < dataSize; i++) {
                testData[i] = i % 256;
            }

            // Obter diretório temporário
            const result = await window.ipcRenderer.invoke('get-temp-dir');
            if (result.success) {
                const testFile = `${result.path}/foxy_test_${sizeInMB}mb_${Date.now()}.bin`;

                const startTime = performance.now();

                await this.saveFileElectron(testFile, testData);

                const endTime = performance.now();
                const duration = (endTime - startTime) / 1000;
                const speed = (sizeInMB / duration).toFixed(2);

                return testFile;
            }
        } catch (error) {
            console.error('❌ [TEST] Erro no teste:', error);
            throw error;
        }
    }
}

// ============================================================================
// INTEGRAÇÃO E INICIALIZAÇÃO
// ============================================================================

// Criar instância global
window.electronFileHandler = new ElectronFileHandler();

// CORREÇÃO: Melhorar integração com sistema de salvamento
window.electronFileHandler.integrateWithSaveSystem = function () {

    // Verificar se o sistema inteligente está disponível
    if (window.intelligentSave) {

        // Adicionar método de verificação ao sistema inteligente
        window.intelligentSave.isElectronAvailable = () => {
            return this.isElectronEnvironment();
        };

        // Adicionar método de salvamento direto ao sistema inteligente
        window.intelligentSave.saveDirectlyElectron = async (filePath, data) => {
            return await this.saveFileElectron(filePath, data);
        };

    } else {
        setTimeout(() => this.integrateWithSaveSystem(), 1000);
    }
};

// CORREÇÃO: Funcionalidades de debug global
window.debugElectronHandler = function () {
    if (window.electronFileHandler) {
        window.electronFileHandler.debug();
    } else {
        // console.error('❌ ElectronFileHandler não encontrado');
    }
};

window.testElectronSave = function (sizeInMB = 1) {
    if (window.electronFileHandler) {
        return window.electronFileHandler.testSave(sizeInMB);
    } else {
        // console.error('❌ ElectronFileHandler não encontrado');
        return Promise.reject(new Error('ElectronFileHandler não encontrado'));
    }
};

// NOVO: Teste específico para arquivos de 750MB
window.testLargeFileSave = function () {
    return window.testElectronSave(750);
};

// Integrar automaticamente quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function () {
    if (window.electronFileHandler && window.electronFileHandler.isElectronEnvironment()) {
        setTimeout(() => {
            window.electronFileHandler.integrateWithSaveSystem();
        }, 500);
    }
});

// Log de inicialização

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ElectronFileHandler;
}
