// 🔧 CORREÇÃO DO CTRL+V EM MODAIS - INTEGRAÇÃO COMPLETA
// Este arquivo corrige o problema de Ctrl+V não funcionar nos modais
// E adiciona menu de contexto personalizado e notificações

class ModalPasteManager {
    constructor() {
        this.isEnabled = false;
        this.modalKeyHandler = null;
        this.originalHandlers = new Map();
        this.contextMenuManager = null;
    }

    enable() {
        if (this.isEnabled) return;
        this.isEnabled = true;
        
        // Handler específico para modais com máxima prioridade
        this.modalKeyHandler = (e) => {
            const activeElement = document.activeElement;
            const isInModal = activeElement && (
                activeElement.closest('#find-replace-modal') ||
                activeElement.closest('#bookmark-modal') ||
                activeElement.closest('#goto-modal') ||
                activeElement.closest('#hex-calculator-modal') ||
                activeElement.closest('#analysis-modal') ||
                activeElement.closest('#char-table-modal')
            );
            
            if (!isInModal) return;
            
            const isInputField = activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA';
            if (!isInputField) return;
            
            // Permitir Ctrl+V/C/A naturalmente em campos de input
            if ((e.ctrlKey || e.metaKey) && ['v', 'c', 'a', 'x'].includes(e.key.toLowerCase())) {
                e.stopPropagation(); // Impede que chegue aos handlers globais
                
                // Adicionar notificação de feedback
                this.showCopyPasteNotification(e.key.toLowerCase(), activeElement);
                
                // NÃO chamar preventDefault - deixar o navegador processar
                return;
            }
        };
        
        // Adicionar com máxima prioridade
        document.addEventListener('keydown', this.modalKeyHandler, true);
        
        // Configurar observador de modais
        this.setupModalObserver();
        
        // Configurar menu de contexto personalizado
        this.setupModalContextMenu();
        
        // Bloquear menu de contexto na sidebar
        this.blockSidebarContextMenu();
        
        // Remover handlers problemáticos dos modais (aguardar um pouco)
        setTimeout(() => {
            this.removeProblematicModalHandlers();
        }, 1000);
    }

    setupModalObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target;
                    if (target.classList && target.classList.contains('modal')) {
                        if (target.classList.contains('show')) {
                            this.configureModalInputs(target);
                            
                            // Configurar menu de contexto para o modal recém-aberto
                            this.setupContextMenuForModal(target);
                        }
                    }
                }
            });
        });
        
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => observer.observe(modal, { attributes: true }));
    }

    setupContextMenuForModal(modal) {
        if (!modal || modal._contextMenuSetup) return; // Evitar configuração duplicada
        
        
        // Marcar como configurado
        modal._contextMenuSetup = true;
        
        // Configurar menu de contexto para o modal específico
        modal.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Verificar se o clique foi em um campo de input
            const target = e.target;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                this.showModalInputContextMenu(e.clientX, e.clientY, target);
            } else {
                // Não mostrar menu de contexto para áreas não digitáveis
                // Apenas bloquear o menu do navegador
            }
        });
        
        // Configurar menu de contexto para inputs dentro do modal
        this.setupContextMenuForModalInputs(modal);
        
        // Observar mudanças nos inputs do modal (para inputs adicionados dinamicamente)
        const inputObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') {
                                this.setupContextMenuForInput(node);
                            }
                            
                            // Verificar inputs dentro do nó adicionado
                            const inputs = node.querySelectorAll ? node.querySelectorAll('input, textarea') : [];
                            inputs.forEach(input => this.setupContextMenuForInput(input));
                        }
                    });
                }
            });
        });
        
        inputObserver.observe(modal, { 
            childList: true, 
            subtree: true 
        });
    }

    setupContextMenuForModalInputs(modal) {
        const inputs = modal.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            this.setupContextMenuForInput(input);
        });
    }

    setupContextMenuForInput(input) {
        if (!input || input._contextMenuSetup) return; // Evitar configuração duplicada
        
        input._contextMenuSetup = true;
        
        input.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Verificar se o clique foi em um campo de input
            const target = e.target;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                this.showModalInputContextMenu(e.clientX, e.clientY, target);
            } else {
                // Não mostrar menu de contexto para áreas não digitáveis
                // Apenas bloquear o menu do navegador
            }
        });
    }

    configureModalInputs(modal) {
        const inputs = modal.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            if (input._pasteFixed) return;
            input._pasteFixed = true;
            
            // Handler local para garantir que paste funciona
            const localHandler = (e) => {
                if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'a', 'x'].includes(e.key.toLowerCase())) {
                    e.stopPropagation();
                }
            };
            
            input.addEventListener('keydown', localHandler, true);
        });
    }

    removeProblematicModalHandlers() {
        
        // Em vez de clonar os modais (que remove todos os event listeners),
        // vamos apenas adicionar nossos handlers com maior prioridade
        // para interceptar os eventos antes dos handlers problemáticos
        
        const modalIds = [
            'bookmark-modal',
            'hex-calculator-modal', 
            'analysis-modal',
            'find-replace-modal',
            'goto-modal',
            'char-table-modal'
        ];
        
        modalIds.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                // Adicionar handler de keydown com máxima prioridade para permitir Ctrl+V/C/A
                modal.addEventListener('keydown', (e) => {
                    const activeElement = document.activeElement;
                    const isInputField = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');
                    
                    if (isInputField && (e.ctrlKey || e.metaKey) && ['v', 'c', 'a', 'x'].includes(e.key.toLowerCase())) {
                        e.stopPropagation();
                        // NÃO chamar preventDefault - deixar o navegador processar
                        return;
                    }
                }, true); // true = capture phase (executa antes dos outros handlers)
            }
        });
    }

    setupModalContextMenu() {
        
        // Configurar menu de contexto para todos os modais existentes
        this.setupContextMenuForExistingModals();
        
        // Configurar observador para modais que podem ser criados dinamicamente
        this.setupModalContextMenuObserver();
    }

    setupContextMenuForExistingModals() {
        const modalIds = [
            'bookmark-modal',
            'hex-calculator-modal', 
            'analysis-modal',
            'find-replace-modal',
            'goto-modal',
            'char-table-modal'
        ];
        
        modalIds.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                this.setupContextMenuForModal(modal);
            }
        });
    }

    setupModalContextMenuObserver() {
        // Observador para detectar quando modais são adicionados ao DOM
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Verificar se o nó adicionado é um modal
                            if (node.classList && node.classList.contains('modal')) {
                                this.setupContextMenuForModal(node);
                            }
                            
                            // Verificar se há modais dentro do nó adicionado
                            const modals = node.querySelectorAll ? node.querySelectorAll('.modal') : [];
                            modals.forEach(modal => {
                                this.setupContextMenuForModal(modal);
                            });
                        }
                    });
                }
            });
        });
        
        // Observar mudanças no body
        observer.observe(document.body, { 
            childList: true, 
            subtree: true 
        });
    }

    showModalInputContextMenu(x, y, input) {
        const items = [
            { text: 'Copiar', icon: '', action: () => this.copyInputContent(input) },
            { text: 'Colar', icon: '', action: () => this.pasteToInput(input) },
            { text: 'Recortar', icon: '', action: () => this.cutInputContent(input) },
            { text: 'Selecionar Tudo', icon: '', action: () => this.selectAllInput(input) }
        ];
        
        this.showContextMenu(x, y, items);
    }

    showModalGeneralContextMenu(x, y, modalId) {
        const items = [
            { text: 'Buscar e Substituir', icon: '', action: () => this.openFindReplaceModal() },
            { text: 'Ir para Offset', icon: '', action: () => this.openGoToModal() },
            { text: 'Calculadora Hex', icon: '', action: () => this.openHexCalculatorModal() },
            { text: 'Adicionar Favorito', icon: '', action: () => this.openBookmarkModal() },
            { text: 'Análise ROM', icon: '', action: () => this.openAnalysisModal() }
        ];
        
        this.showContextMenu(x, y, items);
    }

    showContextMenu(x, y, items) {
        
        // Remover menu existente
        const existingMenu = document.getElementById('modal-context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
        
        // Criar menu
        const menu = document.createElement('div');
        menu.id = 'modal-context-menu';
        menu.className = 'context-menu';
        menu.style.cssText = `
            position: fixed;
            background: linear-gradient(135deg, rgba(26, 26, 46, 0.95) 0%, rgba(22, 33, 62, 0.95) 100%);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            padding: 8px 0;
            min-width: 160px;
            max-width: 250px;
            z-index: 99999;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
            user-select: none;
            font-family: 'Segoe UI', system-ui, sans-serif;
            font-size: 13px;
            max-height: 80vh;
            overflow-y: auto;
            overflow-x: hidden;
            display: block;
            visibility: visible;
            opacity: 1;
        `;
        
        // Adicionar itens
        items.forEach(item => {
            if (item.separator) {
                const separator = document.createElement('div');
                separator.style.cssText = `
                    height: 1px;
                    background: rgba(255, 255, 255, 0.1);
                    margin: 4px 8px;
                `;
                menu.appendChild(separator);
            } else {
                const menuItem = document.createElement('div');
                menuItem.className = 'context-menu-item';
                menuItem.style.cssText = `
                    padding: 8px 16px;
                    color: white;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                `;
                
                // Criar ícone e texto separadamente para evitar duplicação
                const iconSpan = document.createElement('span');
                iconSpan.textContent = item.icon;
                iconSpan.style.cssText = `
                    font-size: 14px;
                    margin-right: 8px;
                `;
                
                const textSpan = document.createElement('span');
                textSpan.textContent = item.text;
                
                menuItem.appendChild(iconSpan);
                menuItem.appendChild(textSpan);
                
                menuItem.addEventListener('mouseenter', () => {
                    menuItem.style.background = 'linear-gradient(135deg, rgba(255, 107, 53, 0.2) 0%, rgba(247, 147, 30, 0.2) 100%)';
                    menuItem.style.color = '#ff6b35';
                });
                
                menuItem.addEventListener('mouseleave', () => {
                    menuItem.style.background = 'transparent';
                    menuItem.style.color = 'white';
                });
                
                menuItem.addEventListener('click', () => {
                    item.action();
                    this.hideContextMenu();
                });
                
                menu.appendChild(menuItem);
            }
        });
        
        // Posicionar menu
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        
        // Adicionar ao DOM primeiro para poder calcular as dimensões
        document.body.appendChild(menu);
        
        // Garantir que o menu não saia da tela
        const rect = menu.getBoundingClientRect();
        let adjustedX = x;
        let adjustedY = y;
        
        if (rect.right > window.innerWidth) {
            adjustedX = x - rect.width;
        }
        if (rect.bottom > window.innerHeight) {
            adjustedY = y - rect.height;
        }
        
        // Aplicar posição ajustada
        menu.style.left = adjustedX + 'px';
        menu.style.top = adjustedY + 'px';
        
        // Fechar menu ao clicar fora
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                this.hideContextMenu();
                document.removeEventListener('mousedown', closeMenu);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('mousedown', closeMenu);
        }, 100);
    }

    hideContextMenu() {
        const menu = document.getElementById('modal-context-menu');
        if (menu) {
            menu.remove();
        }
    }

    // Funções de ação do menu de contexto
    copyInputContent(input) {
        input.select();
        document.execCommand('copy');
        this.showNotification('', 'success');
    }

    async pasteToInput(input) {
        try {
            const text = await navigator.clipboard.readText();
            input.focus();
            input.value = text;
            this.showNotification('', 'success');
        } catch (err) {
            this.showNotification('', 'error');
        }
    }

    cutInputContent(input) {
        input.select();
        document.execCommand('cut');
        this.showNotification('', 'success');
    }

    selectAllInput(input) {
        input.select();
        this.showNotification('', 'success');
    }

    searchFromInput(input) {
        if (window.hexEditor && window.hexEditor.showFindReplaceModal) {
            window.hexEditor.showFindReplaceModal();
            setTimeout(() => {
                const findInput = document.getElementById('find-input');
                if (findInput) {
                    findInput.value = input.value;
                    findInput.focus();
                }
            }, 100);
        }
    }

    goToFromInput(input) {
        if (window.hexEditor && window.hexEditor.showGoToModal) {
            window.hexEditor.showGoToModal();
            setTimeout(() => {
                const gotoInput = document.getElementById('goto-input');
                if (gotoInput) {
                    gotoInput.value = input.value;
                    gotoInput.focus();
                }
            }, 100);
        }
    }

    openFindReplaceModal() {
        if (window.hexEditor && window.hexEditor.showFindReplaceModal) {
            window.hexEditor.showFindReplaceModal();
        }
    }

    openGoToModal() {
        if (window.hexEditor && window.hexEditor.showGoToModal) {
            window.hexEditor.showGoToModal();
        }
    }

    openHexCalculatorModal() {
        if (window.hexEditor && window.hexEditor.showHexCalculatorModal) {
            window.hexEditor.showHexCalculatorModal();
        }
    }

    openBookmarkModal() {
        if (window.hexEditor && window.hexEditor.showAddBookmarkModal) {
            window.hexEditor.showAddBookmarkModal();
        }
    }

    openAnalysisModal() {
        if (window.hexEditor && window.hexEditor.showAnalysisModal) {
            window.hexEditor.showAnalysisModal();
        }
    }

    showCopyPasteNotification(key, element) {
        let message = '';
        let type = 'success';
        
        switch (key) {
            case 'c':
                message = '';
                break;
            case 'v':
                message = '';
                break;
            case 'a':
                message = '';
                break;
            case 'x':
                message = '';
                break;
            default:
                return;
        }
        
        this.showNotification(message, type);
    }

    showNotification(message, type) {
        // Remover notificações existentes para evitar spam
        const existingNotifs = document.querySelectorAll('.modal-notification');
        existingNotifs.forEach(notif => notif.remove());

        const notif = document.createElement('div');
        notif.className = 'modal-notification';
        notif.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10003;
            background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#f39c12'};
            color: white; padding: 12px 20px; border-radius: 8px;
            font-family: 'Segoe UI', system-ui, sans-serif; font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: modalSlideIn 0.3s ease-out;
            max-width: 350px; word-wrap: break-word;
            border-left: 4px solid ${type === 'success' ? '#2ecc71' : type === 'error' ? '#c0392b' : '#e67e22'};
        `;
        notif.textContent = message;
        
        // Adicionar animação CSS se não existir
        if (!document.getElementById('modal-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'modal-notification-styles';
            style.textContent = `
                @keyframes modalSlideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes modalSlideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notif);
        
        // Auto-remover após 2 segundos
        setTimeout(() => {
            notif.style.animation = 'modalSlideOut 0.3s ease-in forwards';
            setTimeout(() => {
                if (notif.parentNode) {
                    notif.remove();
                }
            }, 300);
        }, 2000);
    }

    testPaste() {
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText('TESTE PASTE FUNCIONANDO!').then(() => {
                
                if (window.hexEditor && window.hexEditor.showFindReplaceModal) {
                    window.hexEditor.showFindReplaceModal();
                    
                    setTimeout(() => {
                        const findInput = document.getElementById('find-input');
                        if (findInput) {
                            findInput.focus();
                            findInput.select();
                            
                            // Mostrar instrução visual
                            this.showTestNotification();
                        }
                    }, 300);
                }
            }).catch(err => {
            });
        } else {
        }
    }

    showTestNotification() {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 50%; left: 50%; 
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #27ae60, #2ecc71);
            color: white; padding: 20px; border-radius: 8px;
            font-size: 16px; font-weight: bold; z-index: 10002;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            text-align: center; min-width: 300px;
        `;
        notification.innerHTML = `
            
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    debugCurrentState() {
        
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        }
        
        // Testar clipboard
        if (navigator.clipboard) {
            navigator.clipboard.readText()
                .then(text => {
                })
                .catch(() => {
                });
        }
    }
    
    blockSidebarContextMenu() {
        
        // Selecionar a sidebar
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) {
            return;
        }
        
        // Adicionar event listener para bloquear menu de contexto
        sidebar.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
        
        // Também bloquear em elementos filhos específicos da sidebar
        const sidebarElements = sidebar.querySelectorAll('.sidebar-tabs, .sidebar-content, .tab-content, .bookmark-actions-container, .bookmarks-list, .history-list, .analysis-section, .char-table-viewer, .char-grid');
        sidebarElements.forEach(element => {
            element.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
    }
}

// Função de inicialização
function initModalPasteFix() {
    
    // Aguardar hexEditor estar disponível
    if (!window.hexEditor) {
        setTimeout(initModalPasteFix, 500);
        return;
    }
    
    // Criar e habilitar manager
    if (!window.modalPasteManager) {
        window.modalPasteManager = new ModalPasteManager();
    }
    
    window.modalPasteManager.enable();
    
    // Funções globais para teste e debug
    window.testModalPaste = () => {
        window.modalPasteManager.testPaste();
    };
    
    window.debugModalPaste = () => {
        window.modalPasteManager.debugCurrentState();
    };
    
    // Função para testar menu de contexto
    window.testModalContextMenu = () => {
        if (window.hexEditor && window.hexEditor.showFindReplaceModal) {
            window.hexEditor.showFindReplaceModal();
            setTimeout(() => {
                const findInput = document.getElementById('find-input');
                if (findInput) {
                    findInput.focus();
                    }
            }, 300);
        }
    };

    // Função para testar menu de contexto diretamente
    window.testContextMenuDirect = () => {
        
        const items = [
            { text: 'Copiar', icon: '', action: () => {
            }},
            { text: 'Colar', icon: '', action: () => {
            }},
            { text: 'Recortar', icon: '', action: () => {
            }},
            { text: 'Selecionar Tudo', icon: '', action: () => {
            }}
        ];
        
        if (window.modalPasteManager) {
            window.modalPasteManager.showContextMenu(100, 100, items);
        }
    };

    // Função para forçar reconfiguração do menu de contexto
    window.forceModalContextMenuSetup = () => {
        
        if (window.modalPasteManager) {
            // Limpar configurações existentes
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                modal._contextMenuSetup = false;
            });
            
            const inputs = document.querySelectorAll('input, textarea');
            inputs.forEach(input => {
                input._contextMenuSetup = false;
            });
            
            // Reconfigurar
            window.modalPasteManager.setupContextMenuForExistingModals();
        }
    };
    
}

// Executar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModalPasteFix);
} else {
    initModalPasteFix();
} 