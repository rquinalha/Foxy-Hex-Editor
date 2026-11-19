const { ipcMain, dialog } = require('electron');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const os = require('os');
require('./document_search');


const chunkSaveCache = new Map();




ipcMain.handle('ping', () => {
    return { success: true, message: 'pong' };
});


ipcMain.handle('read-file', async (event, filePath) => {
    try {
        const data = await fs.readFile(filePath);
        return { success: true, data: data };
    } catch (error) {
        return { success: false, error: error.message };
    }
});


ipcMain.handle('get-file-info', async (event, filePath) => {
    try {
        const stats = await fs.stat(filePath);
        return {
            success: true,
            size: stats.size,
            lastModified: stats.mtime.getTime()
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});


ipcMain.handle('file-exists', async (event, filePath) => {
    try {
        await fs.access(filePath);
        return { success: true, exists: true };
    } catch (error) {
        return { success: true, exists: false };
    }
});


ipcMain.handle('get-temp-dir', () => {
    try {
        const { app } = require('electron');
        return { success: true, path: app.getPath('temp') };
    } catch (error) {
        return { success: false, error: error.message };
    }
});


ipcMain.handle('show-open-dialog', async (event, options = {}) => {
    try {
        const result = await dialog.showOpenDialog({
            title: options.title || 'Abrir Arquivo',
            defaultPath: options.defaultPath || '',
            filters: options.filters || [
                { name: 'Todos os arquivos', extensions: ['*'] }
            ],
            properties: process.platform === 'win32' ? ['openFile', 'dontAddToRecent'] : ['openFile']
        });
        
        return result;
    } catch (error) {
        return { canceled: true, error: error.message };
    }
});


ipcMain.handle('show-save-dialog', async (event, options = {}) => {
    try {
        const result = await dialog.showSaveDialog({
            title: 'Salvar Arquivo',
            properties: process.platform === 'win32' ? ['dontAddToRecent'] : [],
            defaultPath: options.defaultPath || 'arquivo_editado.bin',
            filters: options.filters || [
                { name: 'Todos os arquivos', extensions: ['*'] },
                { name: 'Arquivos binários', extensions: ['bin', 'rom', 'nes', 'smc', 'gb', 'gba'] }
            ]
        });
        
        return result;
    } catch (error) {
        return { canceled: true, error: error.message };
    }
});


ipcMain.handle('write-file-direct', async (event, { filePath, data }) => {
    try {
        
        if (!data || (!Array.isArray(data) && !ArrayBuffer.isView(data))) {
            throw new Error('Dados inválidos para salvamento direto (esperado Array ou TypedArray)');
        }
        
        
        const maxDirectSize = 500 * 1024 * 1024; // 500MB
        if (data.length > maxDirectSize) {
            throw new Error(`Arquivo muito grande para salvamento direto (${formatBytes(data.length)}). Use salvamento em chunks.`);
        }
        

        const buffer = Buffer.from(data);
        

        await fs.writeFile(filePath, buffer);
        
        return { success: true };
        
    } catch (error) {
        console.error('❌ [MAIN] Erro no salvamento direto:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('init-chunked-save', async (event, { filePath, totalSize, chunkSize }) => {
    try {
        
        const saveId = filePath;
        chunkSaveCache.set(saveId, {
            filePath: filePath,
            totalSize: totalSize,
            chunkSize: chunkSize,
            receivedChunks: 0,
            tempFilePath: filePath + '.tmp',
            startTime: Date.now()
        });
        
        await fs.writeFile(filePath + '.tmp', Buffer.alloc(0));
        
        return { success: true };
        
    } catch (error) {
        console.error('❌ [MAIN] Erro ao inicializar salvamento em chunks:', error);
        return { success: false, error: error.message };
    }
});


ipcMain.handle('save-chunk', async (event, { filePath, chunkIndex, chunkData, isLastChunk }) => {
    try {
        const saveId = filePath;
        const saveInfo = chunkSaveCache.get(saveId);
        
        if (!saveInfo) {
            throw new Error('Salvamento em chunks não inicializado');
        }
        
        if (!chunkData || (!Array.isArray(chunkData) && !ArrayBuffer.isView(chunkData))) {
            throw new Error('Dados do chunk inválidos (esperado Array ou TypedArray)');
        }
        
        const chunkBuffer = Buffer.from(chunkData);
        
        const fileHandle = await fs.open(saveInfo.tempFilePath, 'a');
        
        try {
            await fileHandle.write(chunkBuffer);
            
            saveInfo.receivedChunks++;
            
            
            if (isLastChunk) {
            }
            
        } finally {
            await fileHandle.close();
        }
        
        return { success: true };
        
    } catch (error) {
        console.error(`❌ [MAIN] Erro ao salvar chunk ${chunkIndex}:`, error);
        return { success: false, error: error.message };
    }
});


ipcMain.handle('finalize-chunked-save', async (event, { filePath }) => {
    try {
        const saveId = filePath;
        const saveInfo = chunkSaveCache.get(saveId);
        
        if (!saveInfo) {
            throw new Error('Salvamento em chunks não encontrado');
        }
        
        

        const tempStats = await fs.stat(saveInfo.tempFilePath);
        
        if (tempStats.size !== saveInfo.totalSize) {
            throw new Error(`Tamanho do arquivo não confere: esperado ${formatBytes(saveInfo.totalSize)}, obtido ${formatBytes(tempStats.size)}`);
        }
        
        await fs.rename(saveInfo.tempFilePath, filePath);
        
        const endTime = Date.now();
        const duration = (endTime - saveInfo.startTime) / 1000;
        const speed = (saveInfo.totalSize / (1024 * 1024)) / duration; // MB/s
        
        
        chunkSaveCache.delete(saveId);
        
        return { success: true };
        
    } catch (error) {
        console.error('❌ [MAIN] Erro ao finalizar salvamento em chunks:', error);
        
        try {
            const saveInfo = chunkSaveCache.get(filePath);
            if (saveInfo && saveInfo.tempFilePath) {
                await fs.unlink(saveInfo.tempFilePath);
            }
        } catch (cleanupError) {
            console.error('❌ [MAIN] Erro ao limpar arquivo temporário:', cleanupError);
        }
        
        chunkSaveCache.delete(filePath);
        
        return { success: false, error: error.message };
    }
});


ipcMain.handle('write-at-offset', async (event, { filePath, offset, data }) => {
    try {
        if (!data || (!Array.isArray(data) && !ArrayBuffer.isView(data))) {
            throw new Error('Dados inválidos (esperado array ou TypedArray)');
        }
        if (typeof offset !== 'number' || offset < 0) {
            throw new Error('Offset inválido');
        }
        const buffer = Buffer.from(data);
        const fileHandle = await fs.open(filePath, 'r+');
        try {
            await fileHandle.write(buffer, 0, buffer.length, offset);
        } finally {
            await fileHandle.close();
        }
        return { success: true };
    } catch (error) {
        console.error('❌ [MAIN] Erro no write-at-offset:', error);
        return { success: false, error: error.message };
    }
});


ipcMain.handle('cleanup-failed-save', async (event, { filePath }) => {
    try {
        const saveId = filePath;
        const saveInfo = chunkSaveCache.get(saveId);
        
        if (saveInfo && saveInfo.tempFilePath) {

            try {
                await fs.unlink(saveInfo.tempFilePath);
            } catch (unlinkError) {
            }
        }
        

        chunkSaveCache.delete(saveId);
        
        return { success: true };
        
    } catch (error) {
        console.error('❌ [MAIN] Erro na limpeza:', error);
        return { success: false, error: error.message };
    }
});


ipcMain.handle('read-file-chunk', async (event, filePath, start, length) => {
    try {
        const fileHandle = await fs.open(filePath, 'r');
        const buffer = Buffer.alloc(length);
        
        try {
            const { bytesRead } = await fileHandle.read(buffer, 0, length, start);
            const data = new Uint8Array(buffer.slice(0, bytesRead));
            return { success: true, data: data };
        } finally {
            await fileHandle.close();
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
});


function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}


setInterval(() => {
    if (chunkSaveCache.size > 0) {
        

        const now = Date.now();
        const timeout = 10 * 60 * 1000; // 10 minutos
        
        for (const [saveId, saveInfo] of chunkSaveCache.entries()) {
            if (now - saveInfo.startTime > timeout) {
                
                if (saveInfo.tempFilePath) {
                    fsSync.unlink(saveInfo.tempFilePath, (err) => {
                        if (err) {
                        }
                    });
                }
                
                chunkSaveCache.delete(saveId);
            }
        }
    }
}, 60000); // Verificar a cada minuto


process.on('exit', () => {
    

    for (const [saveId, saveInfo] of chunkSaveCache.entries()) {
        if (saveInfo.tempFilePath) {
            try {
                fsSync.unlinkSync(saveInfo.tempFilePath);
            } catch (error) {
            }
        }
    }
    
    chunkSaveCache.clear();
});


module.exports = {
    formatBytes,
    chunkSaveCache
};
