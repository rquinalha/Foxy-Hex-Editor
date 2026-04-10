// 🦊 FOXY HEX EDITOR - PROTEÇÃO SIMPLES CONTRA PERDA DE DADOS
// Versão simplificada: apenas aviso beforeunload + asterisco no título

class SimpleSaveProtection {
    constructor(hexEditor) {
        this.hexEditor = hexEditor;
        this.isExiting = false;
        this.originalTitle = document.title;
        
        // Melhorar detecção do Electron
        this.isElectron = this.detectElectronEnvironment();
        
        this.init();
    }

    // Detecção melhorada do ambiente Electron
    detectElectronEnvironment() {
        const electronDetected = (
            (typeof require !== 'undefined' && typeof process !== 'undefined' && process.versions && process.versions.electron) ||
            (typeof window !== 'undefined' && window.electronFileHandler && window.electronFileHandler.isElectronEnvironment()) ||
            (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.includes('Electron'))
        );
        
        return electronDetected;
    }

    init() {
        this.setupBeforeUnloadProtection();
        this.setupTitleIndicator();
    }

    // === PROTEÇÃO BEFOREUNLOAD ===
    setupBeforeUnloadProtection() {
        // Só configurar proteção se estiver no Electron
        if (!this.isElectron) {
            return;
        }

        const beforeUnloadHandler = (e) => {
            if (this.hexEditor.hasUnsavedChanges && !this.isExiting) {
                e.preventDefault();
                // Em vez de bloquear, mostrar modal customizado
                if (window.notificationSystem && typeof window.notificationSystem.confirm === 'function') {
                    window.notificationSystem.confirm(
                        '⚠️ Você possui alterações não salvas. Deseja sair do app e perder as alterações?',
                        'Alterações não salvas',
                        () => {
                            this.isExiting = true;
                            // Remover o listener para evitar loop
                            window.removeEventListener('beforeunload', beforeUnloadHandler);
                            // Fechar a janela
                            if (typeof window.close === 'function') {
                                window.close();
                            } else {
                                // Fallback para navegador
                                window.location.href = 'about:blank';
                            }
                        },
                        () => {
                            this.isExiting = false;
                        }
                    );
                }
                // Impede o fechamento imediato
                return false;
            }
        };

        window.addEventListener('beforeunload', beforeUnloadHandler);
    }

    // === INDICADOR NO TÍTULO ===
    setupTitleIndicator() {
        // Monitorar mudanças no hex editor
        this.updateTitleIndicator();
        
        // Observar mudanças no hasUnsavedChanges
        const originalHasUnsavedChanges = Object.getOwnPropertyDescriptor(this.hexEditor, 'hasUnsavedChanges');
        
        if (originalHasUnsavedChanges && originalHasUnsavedChanges.configurable) {
            let hasUnsavedChanges = this.hexEditor.hasUnsavedChanges;
            const self = this; // Capturar referência da instância
            
            Object.defineProperty(this.hexEditor, 'hasUnsavedChanges', {
                get() {
                    return hasUnsavedChanges;
                },
                set(value) {
                    hasUnsavedChanges = value;
                    self.updateTitleIndicator(); // Usar self em vez de this
                },
                configurable: true
            });
        }
        
        // Monitorar edições do hex editor
        if (this.hexEditor.editByte) {
            const originalEditByte = this.hexEditor.editByte.bind(this.hexEditor);
            const self = this; // Capturar referência da instância
            
            this.hexEditor.editByte = (offset, value) => {
                const result = originalEditByte(offset, value);
                self.updateTitleIndicator(); // Usar self em vez de this
                return result;
            };
        }

        if (this.hexEditor.setByte) {
            const originalSetByte = this.hexEditor.setByte.bind(this.hexEditor);
            const self = this; // Capturar referência da instância
            
            this.hexEditor.setByte = (offset, value) => {
                const result = originalSetByte(offset, value);
                self.updateTitleIndicator(); // Usar self em vez de this
                return result;
            };
        }
    }

    updateTitleIndicator() {
        const hasUnsavedChanges = this.hexEditor.hasUnsavedChanges;
        const hasModifiedBytes = this.hexEditor.modifiedBytes ? this.hexEditor.modifiedBytes.size > 0 : false;
        
        const hasChanges = hasUnsavedChanges || hasModifiedBytes;
        
        if (hasChanges) {
            // Adicionar asterisco se não estiver presente
            if (!document.title.includes('*')) {
                document.title = this.originalTitle + ' *';
            }
        } else {
            // Remover asterisco se estiver presente
            if (document.title.includes(' *')) {
                document.title = this.originalTitle;
            }
        }
    }

    // === UTILITÁRIOS ===
    setCurrentFile(filePath, fileName) {
        // Esta função é chamada pelo main.js mas não é necessária na versão simplificada
        // Apenas para compatibilidade
    }

    hasUnsavedChanges() {
        return this.hexEditor.hasUnsavedChanges;
    }

    resetExitFlag() {
        this.isExiting = false;
    }
}

// === INICIALIZAÇÃO ===
let simpleSaveProtection;

document.addEventListener('DOMContentLoaded', function() {
    const initProtection = () => {
        if (window.hexEditor && window.hexEditor.hasUnsavedChanges !== undefined) {
            simpleSaveProtection = new SimpleSaveProtection(window.hexEditor);
        } else {
            setTimeout(initProtection, 100);
        }
    };
    
    setTimeout(initProtection, 200);
});

// === API EXTERNA ===
window.SimpleSaveProtection = {
    hasChanges: () => {
        return simpleSaveProtection ? simpleSaveProtection.hasUnsavedChanges() : false;
    },
    isReady: () => !!simpleSaveProtection,
    getInstance: () => simpleSaveProtection,
    refreshTitle: () => {
        if (simpleSaveProtection) {
            simpleSaveProtection.updateTitleIndicator();
        }
    }
}; 
