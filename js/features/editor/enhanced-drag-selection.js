// 🖱️ FOXY HEX EDITOR - ENHANCED DRAG SELECTION
// Sistema aprimorado de seleção por arrastar para arquivos normais e grandes

class EnhancedDragSelection {
    constructor(hexEditor) {
        this.hexEditor = hexEditor;
        this.isDragging = false;
        this.startPos = 0;
        this.currentPos = 0;
        this.activePanel = null;
        this.autoScrollInterval = null;
        this.autoScrollSpeed = 50; // ms entre scrolls automáticos
        
        // Bind methods
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        
    }

    // Inicializar sistema de drag selection
    initialize() {
        // Adicionar listeners globais
        document.addEventListener('mouseup', this.handleMouseUp);
        document.addEventListener('mousemove', this.handleMouseMove);
        
        // Interceptar eventos de mouse no conteúdo
        this.setupContentListeners();
    }

    // Configurar listeners no conteúdo
    setupContentListeners() {
        const content = document.querySelector('.hex-content');
        if (!content) return;

        // Remover listeners existentes se houver
        content.removeEventListener('mousedown', this.handleContentMouseDown);
        
        // Adicionar novo listener
        this.handleContentMouseDown = (e) => {
            if (e.button !== 0) return; // Apenas botão esquerdo
            
            const target = e.target;
            const offset = target.dataset?.offset;
            const panel = target.dataset?.panel;
            
            if (!offset || !panel) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            // Verificar se é Shift+Click para estender seleção
            if (e.shiftKey) {
                // Shift+Click: estender seleção do ponto atual até o novo ponto
                const pos = parseInt(offset);
                
                // Preservar selectionStart atual e apenas atualizar selectionEnd
                // Isso permite estender a seleção do cursor atual até o novo ponto
                this.hexEditor.selectionEnd = pos;
                this.hexEditor.cursorPosition = pos;
                this.hexEditor.activePanel = panel;
                
                // Mostrar dica visual na primeira vez
                if (!this.hexEditor.shiftClickHintShown) {
                    this.hexEditor.showShiftClickHint();
                    this.hexEditor.shiftClickHintShown = true;
                }
                
                // Re-render para mostrar seleção estendida
                if (this.hexEditor.completeRenderWithColors) {
                    this.hexEditor.completeRenderWithColors(this.hexEditor.currentScrollPercent, true);
                } else if (this.hexEditor.render) {
                    this.hexEditor.render();
                }
                
                // CRÍTICO: Atualizar status e emitir evento de seleção
                if (this.hexEditor.updateStatus) {
                    this.hexEditor.updateStatus();
                }
                
                if (this.hexEditor.emit) {
                    this.hexEditor.emit('selectionChange', {
                        start: this.hexEditor.selectionStart,
                        end: this.hexEditor.selectionEnd
                    });
                }
                
                // Não iniciar drag selection em Shift+Click
                return;
            }
            
            this.startDragSelection(parseInt(offset), panel, e);
        };
        
        content.addEventListener('mousedown', this.handleContentMouseDown);
    }

    // Iniciar seleção por arrastar
    startDragSelection(pos, panel, event) {
        this.isDragging = true;
        this.startPos = pos;
        this.currentPos = pos;
        this.activePanel = panel;
        
        // Configurar seleção no hex editor
        this.hexEditor.selectionStart = pos;
        this.hexEditor.selectionEnd = pos;
        this.hexEditor.cursorPosition = pos;
        this.hexEditor.activePanel = panel;
        
        // Adicionar classe visual durante drag
        document.body.classList.add('drag-selecting');
        
        // Re-render para mostrar seleção inicial
        if (this.hexEditor.completeRenderWithColors) {
            this.hexEditor.completeRenderWithColors(this.hexEditor.currentScrollPercent, true);
        } else if (this.hexEditor.render) {
            this.hexEditor.render();
        }
        
    }

    // Atualizar seleção durante drag
    updateDragSelection(pos, panel) {
        if (!this.isDragging || this.activePanel !== panel) return;
        
        this.currentPos = pos;
        
        // Atualizar seleção no hex editor
        const startPos = Math.min(this.startPos, pos);
        const endPos = Math.max(this.startPos, pos);
        
        this.hexEditor.selectionStart = startPos;
        this.hexEditor.selectionEnd = endPos;
        this.hexEditor.cursorPosition = pos;
        
        // Re-render para mostrar seleção atualizada
        if (this.hexEditor.completeRenderWithColors) {
            this.hexEditor.completeRenderWithColors(this.hexEditor.currentScrollPercent, true);
        } else if (this.hexEditor.render) {
            this.hexEditor.render();
        }
        
        // Auto-scroll se necessário
        this.handleAutoScroll(pos);
    }

    // Auto-scroll durante drag
    handleAutoScroll(pos) {
        const content = document.querySelector('.hex-content');
        if (!content) return;
        
        const rect = content.getBoundingClientRect();
        const mouseY = event.clientY;
        const scrollMargin = 50; // pixels da borda para iniciar auto-scroll
        
        let scrollDirection = 0;
        
        // Determinar direção do scroll
        if (mouseY < rect.top + scrollMargin) {
            scrollDirection = -1; // Scroll para cima
        } else if (mouseY > rect.bottom - scrollMargin) {
            scrollDirection = 1; // Scroll para baixo
        }
        
        // Parar auto-scroll anterior
        if (this.autoScrollInterval) {
            clearInterval(this.autoScrollInterval);
            this.autoScrollInterval = null;
        }
        
        // Iniciar novo auto-scroll se necessário
        if (scrollDirection !== 0) {
            this.autoScrollInterval = setInterval(() => {
                if (!this.isDragging) {
                    clearInterval(this.autoScrollInterval);
                    this.autoScrollInterval = null;
                    return;
                }
                
                // Scroll baseado no sistema atual
                if (this.hexEditor.isLargeFileActive?.()) {
                    // Para arquivos grandes
                    const currentPercent = this.hexEditor.currentScrollPercent;
                    const scrollStep = scrollDirection * 0.02; // 2% por step
                    const newPercent = Math.max(0, Math.min(1, currentPercent + scrollStep));
                    
                    if (newPercent !== currentPercent) {
                        this.hexEditor.renderAtScrollPercent?.(newPercent, true);
                    }
                } else {
                    // Para arquivos normais
                    const scrollStep = scrollDirection * 25; // 25px por step
                    content.scrollTop += scrollStep;
                }
            }, this.autoScrollSpeed);
        }
    }

    // Handler global de mouse move
    handleMouseMove(event) {
        if (!this.isDragging) return;
        
        const target = event.target;
        const offset = target.dataset?.offset;
        const panel = target.dataset?.panel;
        
        if (offset && panel === this.activePanel) {
            this.updateDragSelection(parseInt(offset), panel);
        }
    }

    // Handler global de mouse up
    handleMouseUp(event) {
        if (!this.isDragging) return;
        
        this.stopDragSelection();
    }

    // Parar seleção por arrastar
    stopDragSelection() {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        
        // Remover classe visual
        document.body.classList.remove('drag-selecting');
        
        // Limpar auto-scroll
        if (this.autoScrollInterval) {
            clearInterval(this.autoScrollInterval);
            this.autoScrollInterval = null;
        }
        
        // Emitir evento de mudança de seleção
        if (this.hexEditor.emit) {
            this.hexEditor.emit('selectionChange', {
                start: this.hexEditor.selectionStart,
                end: this.hexEditor.selectionEnd
            });
        }
        
        // Atualizar status
        if (this.hexEditor.updateStatus) {
            this.hexEditor.updateStatus();
        }
        
    }

    // Limpar recursos
    destroy() {
        document.removeEventListener('mouseup', this.handleMouseUp);
        document.removeEventListener('mousemove', this.handleMouseMove);
        
        const content = document.querySelector('.hex-content');
        if (content && this.handleContentMouseDown) {
            content.removeEventListener('mousedown', this.handleContentMouseDown);
        }
        
        if (this.autoScrollInterval) {
            clearInterval(this.autoScrollInterval);
        }
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.EnhancedDragSelection = EnhancedDragSelection;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedDragSelection;
}
