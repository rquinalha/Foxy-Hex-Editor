// Sistema de traduções para o menu de contexto
const ContextMenuI18n = {
    currentLang: (typeof window !== 'undefined' && window.I18n && window.I18n.currentLang) ? window.I18n.currentLang : 'pt',

    translations: {
        pt: {
            // Menu items
            copy: 'Copiar (Ctrl+C)',
            copyPosition: 'Copiar Posição',
            paste: 'Colar (Ctrl+V)',
            copyAsHex: 'Copiar como Hex',
            copyAsText: 'Copiar como Texto',
            pasteAsHex: 'Colar como Hex',
            pasteAsText: 'Colar como Texto',
            selectAll: 'Selecionar Tudo (Ctrl+A)',
            exportSelection: 'Exportar Seleção (.bin)',
            importSelection: 'Importar Seleção',
            createHighlight: 'Criar Marcação',
            selectWholeHighlight: 'Selecionar Marcação Inteira',
            removeHighlight: 'Remover Marcação Atual',
            clearAllHighlights: 'Limpar Todas as Marcações',
            addBookmark: 'Adicionar Favorito',
            // Position menu
            pastePosition: 'Colar Posição',
            gotoPosition: 'Ir para esta Posição',
            addBookmarkAtPosition: 'Adicionar Favorito nesta Posição',
            convertToDecimal: 'Converter para Decimal',
            convertToHex: 'Converter para Hexadecimal',
            // Tooltips
            disabledLargeFile: 'Desabilitado para arquivos grandes (> 800MB)',
            // Notifications
            editorNotFound: 'Editor não encontrado',
            noSelection: 'Nenhuma seleção',
            noSelectionToExport: 'Nenhuma seleção para exportar',
            noSelectionToImport: 'Nenhuma seleção para importar',
            editorNotEditMode: 'Editor não está em modo de edição',
            clipboardEmpty: 'Clipboard vazio ou sem dados',
            noValidData: 'Nenhum dado válido encontrado',
            importDisabledLargeFile: 'Importar Seleção está desabilitado para arquivos grandes',
            bytesCopied: 'bytes copiados',
            bytesCopiedAs: 'bytes copiados como',
            bytesPasted: 'bytes colados',
            bytesSelected: 'bytes selecionados',
            positionCopied: 'Posição copiada',
            positionPasted: 'Posição colada',
            highlightCreated: 'Marcação criada com sucesso!',
            highlightRemoved: 'Marcação removida com sucesso!',
            allHighlightsCleared: 'Todas as marcações foram removidas',
            bookmarkAdded: 'Adicionando favorito na posição',
            exportComplete: 'Exportação concluída!',
            importComplete: 'Importação concluída!',
            copyError: 'Erro ao copiar seleção',
            pasteError: 'Erro ao colar dados',
            highlightError: 'Erro ao remover marcação',
            importError: 'Erro ao importar arquivo',
            exportStreamError: 'Exportação via Stream concluída!',
            exportCancelled: 'Exportação cancelada ou falhou.',
            selectionTooLarge: 'Seleção muito grande (>500MB) para navegadores sem File Stream API.',
            cannotSelectHighlight: 'Não foi possível selecionar a marcação',
            positionNotFound: 'Campo de posição não encontrado',
            invalidPosition: 'Posição inválida',
            positionTooLong: 'Posição muito longa (máximo 8 caracteres hex)',
            positionOutOfRange: 'Posição fora do arquivo',
            conversionError: 'Erro na conversão',
            // Modal
            importTitle: 'Importar Seleção',
            selectionInfo: 'Informações da Seleção',
            selectionSize: 'Tamanho da seleção',
            startPosition: 'Posição inicial',
            endPosition: 'Posição final',
            selectFile: 'Selecionar Arquivo para Importar',
            clickToSelect: 'Clique para selecionar arquivo',
            orDragDrop: 'ou arraste e solte aqui',
            fileInfo: 'Informações do Arquivo',
            fileName: 'Nome',
            fileSize: 'Tamanho',
            warning: 'Aviso',
            insertionMode: 'Modo Inserção (empurrar dados existentes)',
            insertionModeHelp: 'Se marcado, insere os dados importados na posição inicial da seleção e empurra os dados existentes para frente. Se não marcado, os dados importados sobrescreverão apenas o trecho selecionado.',
            cancel: 'Cancelar',
            import: 'Importar',
            // Import warnings
            fileLargerThanSelection: 'O arquivo importado é maior que a seleção.',
            overwriteMode: 'Sobrescrever: Apenas os primeiros bytes serão importados',
            insertModeOption: 'Inserir: Insere todo o arquivo na posição da seleção e empurra os dados existentes',
            // Other
            pasteDataPrompt: 'Cole os dados:',
            pastePositionPrompt: 'Cole a posição:',
            highlightSystemNotAvailable: 'Sistema de marcações não disponível',
            insertionNotAllowedLarge: 'Inserção indisponível no estado atual do arquivo.',
            importSuccess: 'Importação concluída! {0} bytes processados',
            exportingStream: 'Exportando {0} bytes via stream...',
            navigatingTo: 'Indo para posição 0x{0}',
            decimalToHex: '{0} (decimal) = {1} (hex) copiado',
            hexToDecimal: '{0} (hex) = {1} (decimal) copiado'
        },
        en: {
            // Menu items
            copy: 'Copy (Ctrl+C)',
            copyPosition: 'Copy Position',
            paste: 'Paste (Ctrl+V)',
            copyAsHex: 'Copy as Hex',
            copyAsText: 'Copy as Text',
            pasteAsHex: 'Paste as Hex',
            pasteAsText: 'Paste as Text',
            selectAll: 'Select All (Ctrl+A)',
            exportSelection: 'Export Selection (.bin)',
            importSelection: 'Import Selection',
            createHighlight: 'Create Highlight',
            selectWholeHighlight: 'Select Whole Highlight',
            removeHighlight: 'Remove Current Highlight',
            clearAllHighlights: 'Clear All Highlights',
            addBookmark: 'Add Bookmark',
            // Position menu
            pastePosition: 'Paste Position',
            gotoPosition: 'Go to this Position',
            addBookmarkAtPosition: 'Add Bookmark at this Position',
            convertToDecimal: 'Convert to Decimal',
            convertToHex: 'Convert to Hexadecimal',
            // Tooltips
            disabledLargeFile: 'Disabled for large files (> 800MB)',
            // Notifications
            editorNotFound: 'Editor not found',
            noSelection: 'No selection',
            noSelectionToExport: 'No selection to export',
            noSelectionToImport: 'No selection to import',
            editorNotEditMode: 'Editor is not in edit mode',
            clipboardEmpty: 'Clipboard empty or no data',
            noValidData: 'No valid data found',
            importDisabledLargeFile: 'Import Selection is disabled for large files',
            bytesCopied: 'bytes copied',
            bytesCopiedAs: 'bytes copied as',
            bytesPasted: 'bytes pasted',
            bytesSelected: 'bytes selected',
            positionCopied: 'Position copied',
            positionPasted: 'Position pasted',
            highlightCreated: 'Highlight created successfully!',
            highlightRemoved: 'Highlight removed successfully!',
            allHighlightsCleared: 'All highlights were removed',
            bookmarkAdded: 'Adding bookmark at position',
            exportComplete: 'Export completed!',
            importComplete: 'Import completed!',
            copyError: 'Error copying selection',
            pasteError: 'Error pasting data',
            highlightError: 'Error removing highlight',
            importError: 'Error importing file',
            exportStreamError: 'Stream export completed!',
            exportCancelled: 'Export cancelled or failed.',
            selectionTooLarge: 'Selection too large (>500MB) for browsers without File Stream API.',
            cannotSelectHighlight: 'Could not select highlight',
            positionNotFound: 'Position field not found',
            invalidPosition: 'Invalid position',
            positionTooLong: 'Position too long (max 8 hex characters)',
            positionOutOfRange: 'Position out of file range',
            conversionError: 'Conversion error',
            // Modal
            importTitle: 'Import Selection',
            selectionInfo: 'Selection Information',
            selectionSize: 'Selection size',
            startPosition: 'Start position',
            endPosition: 'End position',
            selectFile: 'Select File to Import',
            clickToSelect: 'Click to select file',
            orDragDrop: 'or drag and drop here',
            fileInfo: 'File Information',
            fileName: 'Name',
            fileSize: 'Size',
            warning: 'Warning',
            insertionMode: 'Insert Mode (push existing data)',
            insertionModeHelp: 'If checked, inserts the imported data at the selection start and pushes existing data forward. If unchecked, imported data will only overwrite the selected section.',
            cancel: 'Cancel',
            import: 'Import',
            // Import warnings
            fileLargerThanSelection: 'The imported file is larger than the selection.',
            overwriteMode: 'Overwrite: Only the first bytes will be imported',
            insertModeOption: 'Insert: Inserts the whole file at the selection position and pushes existing data forward',
            // Other
            pasteDataPrompt: 'Paste data:',
            pastePositionPrompt: 'Paste position:',
            highlightSystemNotAvailable: 'Highlight system not available',
            insertionNotAllowedLarge: 'Insertion is unavailable in the current file state.',
            importSuccess: 'Import completed! {0} bytes processed',
            exportingStream: 'Exporting {0} bytes via stream...',
            navigatingTo: 'Navigating to position 0x{0}',
            decimalToHex: '{0} (decimal) = {1} (hex) copied',
            hexToDecimal: '{0} (hex) = {1} (decimal) copied'
        }
    },

    t(key) {
        // Update current language from global I18n if available
        if (typeof window !== 'undefined' && window.I18n && window.I18n.currentLang) {
            this.currentLang = window.I18n.currentLang;
        }
        const translations = this.translations[this.currentLang];
        return translations && translations[key] ? translations[key] : key;
    }
};

// 1. CSS
function addContextMenuStyles() {
    if (document.getElementById('context-menu-styles')) return; // Evitar duplicaÃ§Ã£o

    const style = document.createElement('style');
    style.id = 'context-menu-styles';
    style.textContent = `
        .context-menu {
            position: fixed;
            background: linear-gradient(135deg, rgba(26, 26, 46, 0.95) 0%, rgba(22, 33, 62, 0.95) 100%);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            padding: 8px 0;
            min-width: 200px;
            max-width: 300px;
            z-index: 10000;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
            display: none;
            user-select: none;
            font-family: 'Segoe UI', system-ui, sans-serif;
            font-size: 13px;
            max-height: 80vh;
            overflow-y: auto;
            overflow-x: hidden;
        }
        
        .context-menu::-webkit-scrollbar {
            width: 6px;
        }
        
        .context-menu::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
        }
        
        .context-menu::-webkit-scrollbar-thumb {
            background: rgba(255, 107, 53, 0.5);
            border-radius: 3px;
        }
        
        .context-menu::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 107, 53, 0.7);
        }
        .context-menu-item {
            padding: 8px 16px;
            color: white;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .context-menu-item:hover {
            background: linear-gradient(135deg, rgba(255, 107, 53, 0.2) 0%, rgba(247, 147, 30, 0.2) 100%);
            color: #ff6b35;
        }
        .context-menu-item.disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .context-menu-separator {
            height: 1px;
            background: rgba(255, 255, 255, 0.1);
            margin: 4px 8px;
        }
    `;
    document.head.appendChild(style);
}

// 2. Classe principal do Context Menu
class ContextMenuManager {
    constructor() {
        this.menu = null;
        this.isInitialized = false;
        this._keydownHandler = null;
        this._keypressHandler = null;
        this._documentHandler = null;
        this._windowHandler = null;
        this.contextTargetInfo = null;
        this.init();
    }

    init() {
        if (this.isInitialized) return;

        this.createMenu();
        this.bindEvents();
        this.isInitialized = true;
    }

    createMenu() {
        if (this.menu) this.menu.remove();
        this.menu = document.createElement('div');
        this.menu.className = 'context-menu';
        this.menu.id = 'hex-context-menu';

        // Adicionar scroll automÃ¡tico se necessÃ¡rio
        this.menu.style.maxHeight = '80vh';
        this.menu.style.overflowY = 'auto';
        this.menu.style.overflowX = 'hidden';

        document.body.appendChild(this.menu);
    }

    bindEvents() {
        // ESC para fechar menu
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.menu.style.display === 'block') {
                this.hide();
            }
        });

        // Click fora do menu para fechar
        document.addEventListener('mousedown', (e) => {
            if (this.menu.style.display !== 'block') return;
            if (this.menu.contains(e.target)) return;
            if (e.button === 0) this.hide();
        }, true);

        // Menu de contexto no hex editor
        const hexContent = document.getElementById('hex-content');
        if (hexContent) {
            hexContent.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.captureContextTarget(e);
                this.show(e.clientX, e.clientY);
            });
        }

        // *** INTERCEPTAÃ‡ÃƒO GLOBAL MELHORADA ***
        this.setupGlobalKeyboardInterception();


    }

    setupGlobalKeyboardInterception() {
        // *** INTERCEPTAÃ‡ÃƒO ESPECÃFICA PARA CTRL SOZINHO ***
        const interceptCtrlAndCombinations = (e) => {
            // Verificar se estamos no hex editor
            const hexContent = document.getElementById('hex-content');
            const activeElement = document.activeElement;

            const isInHexEditor = hexContent && (
                hexContent.contains(activeElement) ||
                activeElement === hexContent ||
                activeElement === document.body ||
                activeElement === document.documentElement ||
                (activeElement && (
                    activeElement.closest('#hex-content') ||
                    activeElement.classList.contains('hex-cell') ||
                    activeElement.classList.contains('ascii-cell')
                ))
            );

            if (!isInHexEditor) return;

            // *** 1. BLOQUEAR CTRL SOZINHO NO PAINEL HEX ***
            if ((e.key === 'Control' || e.key === 'Meta') && this.isInHexEditingMode()) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                return false;
            }

            // *** 2. INTERCEPTAR CTRL+C/V/A COM NOTIFICAÃ‡ÃƒO ***
            if (e.ctrlKey || e.metaKey) {
                const key = e.key.toLowerCase();

                // Verificar se o campo de posiÃ§Ã£o estÃ¡ ativo
                const positionInput = document.getElementById('cursor-position-input');
                const isPositionInputActive = positionInput && (
                    positionInput === activeElement ||
                    positionInput.contains(activeElement)
                );

                if (key === 'c' || key === 'v' || key === 'a' || key === 'f') {
                    // Se o campo de posiÃ§Ã£o estÃ¡ ativo, deixar o main.js lidar com Ctrl+C e Ctrl+V
                    if (isPositionInputActive && (key === 'c' || key === 'v')) {
                        return; // NÃ£o interceptar, deixar o main.js processar
                    }

                    // Interceptar Ctrl+F globalmente
                    if (key === 'f') {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        if (window.hexEditor && window.hexEditor.showFindReplaceModal) {
                            window.hexEditor.showFindReplaceModal();
                            if (window.hexEditor.showFindReplaceNotification) {
                                window.hexEditor.showFindReplaceNotification();
                            }
                        }
                        return false;
                    }


                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();

                    // Executar aÃ§Ã£o COM notificaÃ§Ã£o
                    if (key === 'c') {
                        // Determinar formato baseado no painel ativo
                        const activePanel = window.hexEditor ? window.hexEditor.activePanel : 'hex';
                        this.copySelectionWithNotification(activePanel).catch(err => {
                            console.error('Erro ao copiar seleÃ§Ã£o:', err);
                        });
                    } else if (key === 'v') {
                        this.pasteDataWithNotification('auto');
                    } else if (key === 'a') {
                        this.selectAllWithNotification();
                    }

                    return false;
                }
            }
        };

        // *** INTERCEPTAÃ‡ÃƒO EM MÃšLTIPLOS PONTOS ***

        // 1. Document com mÃ¡xima prioridade
        if (this._documentHandler) {
            document.removeEventListener('keydown', this._documentHandler, true);
        }
        this._documentHandler = interceptCtrlAndCombinations.bind(this);
        document.addEventListener('keydown', this._documentHandler, true);

        // 2. Window tambÃ©m
        if (this._windowHandler) {
            window.removeEventListener('keydown', this._windowHandler, true);
        }
        this._windowHandler = interceptCtrlAndCombinations.bind(this);
        window.addEventListener('keydown', this._windowHandler, true);

        // 3. Hex content direto
        const hexContent = document.getElementById('hex-content');
        if (hexContent) {
            if (this._keydownHandler) {
                hexContent.removeEventListener('keydown', this._keydownHandler, true);
            }

            this._keydownHandler = interceptCtrlAndCombinations.bind(this);
            hexContent.addEventListener('keydown', this._keydownHandler, true);

            // *** INTERCEPTAÃ‡ÃƒO TAMBÃ‰M NO KEYPRESS PARA CTRL ***
            if (this._keypressHandler) {
                hexContent.removeEventListener('keypress', this._keypressHandler, true);
            }

            this._keypressHandler = (e) => {
                // Bloquear qualquer processamento de Ctrl no keypress tambÃ©m
                if ((e.key === 'Control' || e.key === 'Meta') && this.isInHexEditingMode()) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    return false;
                }
            };

            hexContent.addEventListener('keypress', this._keypressHandler, true);
        }

    }

    isInHexEditingMode() {
        // Verificar se estamos no painel hex (nÃ£o ASCII)
        return window.hexEditor && window.hexEditor.activePanel === 'hex';
    }

    show(x, y) {
        this.hide();
        const items = this.generateMenuItems();
        this.renderMenu(items);
        this.positionMenu(x, y);
        this.menu.style.display = 'block';
    }

    showPositionContextMenu(x, y) {
        this.hide();
        const items = this.generatePositionMenuItems();
        this.renderMenu(items);
        this.positionMenuForStatusBar(x, y);
        this.menu.style.display = 'block';
    }

    hide() {
        this.menu.style.display = 'none';
        this.contextTargetInfo = null;
    }

    renderMenu(items) {
        const t = (key) => ContextMenuI18n.t(key);
        this.menu.innerHTML = '';
        items.forEach(item => {
            if (item.type === 'separator') {
                const sep = document.createElement('div');
                sep.className = 'context-menu-separator';
                this.menu.appendChild(sep);
            } else {
                const menuItem = document.createElement('div');
                menuItem.className = `context-menu-item ${!item.enabled ? 'disabled' : ''}`;
                menuItem.innerHTML = `${item.icon} ${item.label}`;

                // Adicionar tooltip para itens desabilitados
                if (!item.enabled) {
                    if (item.label === t('importSelection')) {
                        menuItem.title = t('disabledLargeFile');
                    }
                }

                if (item.enabled) {
                    menuItem.onclick = () => {
                        item.action();
                        this.hide();
                    };
                } else {
                    // Mostrar notificaÃ§Ã£o quando clicar em item desabilitado
                    menuItem.onclick = () => {
                        if (item.label === t('importSelection')) {
                            this.showNotification('âš ï¸ ' + t('importDisabledLargeFile'), 'warning');
                        }
                        this.hide();
                    };
                }
                this.menu.appendChild(menuItem);
            }
        });
    }

    positionMenu(x, y) {
        this.ensureMenuFitsInViewport(x, y);
    }

    positionMenuForStatusBar(x, y) {
        this.ensureMenuFitsInViewport(x, y, true);
    }

    ensureMenuFitsInViewport(x, y, isStatusBar = false) {
        // Primeiro, mostrar o menu temporariamente para calcular suas dimensÃµes
        this.menu.style.display = 'block';
        this.menu.style.visibility = 'hidden';
        this.menu.style.position = 'fixed';

        // ForÃ§ar o cÃ¡lculo das dimensÃµes
        const rect = this.menu.getBoundingClientRect();
        const menuWidth = rect.width;
        const menuHeight = rect.height;

        // Obter dimensÃµes da viewport
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Margens de seguranÃ§a
        const margin = 10;
        const statusBarHeight = isStatusBar ? 60 : 0;

        // Calcular posiÃ§Ã£o inicial
        let finalX = x;
        let finalY = y;

        // === AJUSTE HORIZONTAL ===
        // Se o menu sair pela direita
        if (x + menuWidth + margin > viewportWidth) {
            finalX = viewportWidth - menuWidth - margin;
        }

        // Se o menu sair pela esquerda
        if (finalX < margin) {
            finalX = margin;
        }

        // === AJUSTE VERTICAL ===
        // Se o menu sair pela parte inferior
        if (y + menuHeight + margin > viewportHeight - statusBarHeight) {
            // Tentar posicionar acima do ponto de clique
            finalY = y - menuHeight - margin;

            // Se ainda sair por cima, posicionar no topo da tela
            if (finalY < margin) {
                finalY = margin;
            }
        }

        // Se o menu sair pela parte superior
        if (finalY < margin) {
            finalY = margin;
        }

        // Garantir que nÃ£o fique escondido pelo rodapÃ© (para status bar)
        if (isStatusBar && finalY + menuHeight > viewportHeight - statusBarHeight) {
            finalY = viewportHeight - statusBarHeight - menuHeight - margin;
        }

        // Aplicar posiÃ§Ã£o final
        this.menu.style.left = Math.max(0, finalX) + 'px';
        this.menu.style.top = Math.max(0, finalY) + 'px';
        this.menu.style.visibility = 'visible';

        // VerificaÃ§Ã£o final de seguranÃ§a
        this.ensureMenuIsFullyVisible();

    }

    ensureMenuIsFullyVisible() {
        // VerificaÃ§Ã£o adicional apÃ³s o posicionamento
        setTimeout(() => {
            const rect = this.menu.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let needsAdjustment = false;
            let newX = rect.left;
            let newY = rect.top;

            // Verificar se alguma parte estÃ¡ fora da tela
            if (rect.left < 0) {
                newX = 10;
                needsAdjustment = true;
            }

            if (rect.right > viewportWidth) {
                newX = viewportWidth - rect.width - 10;
                needsAdjustment = true;
            }

            if (rect.top < 0) {
                newY = 10;
                needsAdjustment = true;
            }

            if (rect.bottom > viewportHeight) {
                newY = viewportHeight - rect.height - 10;
                needsAdjustment = true;
            }

            // Aplicar ajustes se necessÃ¡rio
            if (needsAdjustment) {
                this.menu.style.left = Math.max(0, newX) + 'px';
                this.menu.style.top = Math.max(0, newY) + 'px';
            }
        }, 0);
    }

    copyToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).catch(() => {
                this.fallbackCopyToClipboard(text);
            });
        } else {
            this.fallbackCopyToClipboard(text);
        }
    }

    fallbackCopyToClipboard(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }

    showNotification(message, type) {
        // Remover notificaÃ§Ãµes existentes para evitar spam
        const existingNotifs = document.querySelectorAll('.hex-notification');
        existingNotifs.forEach(notif => notif.remove());

        const notif = document.createElement('div');
        notif.className = 'hex-notification';
        notif.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10001;
            background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#f39c12'};
            color: white; padding: 12px 20px; border-radius: 8px;
            font-family: 'Segoe UI', system-ui, sans-serif; font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease-out;
            max-width: 350px; word-wrap: break-word;
            border-left: 4px solid ${type === 'success' ? '#2ecc71' : type === 'error' ? '#c0392b' : '#e67e22'};
        `;
        notif.textContent = message;

        // Adicionar animaÃ§Ã£o CSS se nÃ£o existir
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notif);

        // Auto-remover apÃ³s 3 segundos
        setTimeout(() => {
            notif.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => {
                if (notif.parentNode) {
                    notif.remove();
                }
            }, 300);
        }, 3000);
    }

}

