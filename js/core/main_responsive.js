// ðŸ”§ CORREÃ‡Ã•ES DE REDIMENSIONAMENTO - FOXY HEX EDITOR
// Sistema de redimensionamento responsivo para o editor hex

(function() {
    
    // Aguardar o hexEditor estar disponÃ­vel
    function waitForHexEditor() {
        if (window.hexEditor) {
            applyResizeFixes();
        } else {
            setTimeout(waitForHexEditor, 100);
        }
    }
    
    function applyResizeFixes() {
        
        // === CORREÃ‡ÃƒO 1: OTIMIZAR ABERTURA DA JANELA ===
        optimizeWindowOpening();
        
        // === CORREÃ‡ÃƒO 2: SISTEMA DE REDIMENSIONAMENTO RESPONSIVO ===
        const resizeSystem = createResponsiveResizeSystem();
        
        // === CORREÃ‡ÃƒO 3: MELHORAR SISTEMA DE SCROLL VIRTUAL ===
        enhanceVirtualScrolling();
        
        // === CORREÃ‡ÃƒO 4: INICIALIZAÃ‡ÃƒO RESPONSIVA ===
        enhanceInitialization();
        
        // ForÃ§ar recÃ¡lculo inicial
        setTimeout(() => {
            resizeSystem.recalculateRenderDimensions();
        }, 500);
        
        // === FUNÃ‡ÃƒO DE TESTE ===
        window.testResize = function() {
            
            const container = document.getElementById('hex-content');
            const mainArea = document.querySelector('.main-area');
            
            
            if (window.hexEditor) {
            }
            
            // ForÃ§ar recÃ¡lculo
            resizeSystem.recalculateRenderDimensions();
            
            return {
                containerHeight: container?.clientHeight,
                mainAreaHeight: mainArea?.clientHeight,
                windowHeight: window.innerHeight,
                visibleLines: window.hexEditor?.visibleLines,
                totalLines: window.hexEditor?.totalLines
            };
        };
        
    }
    
    // === CORREÃ‡ÃƒO 1: OTIMIZAR ABERTURA DA JANELA ===
    function optimizeWindowOpening() {
        // ForÃ§ar janela maximizada na abertura (se Electron)
        if (typeof require !== 'undefined') {
            try {
                const { remote, ipcRenderer } = require('electron');
                const currentWindow = remote?.getCurrentWindow() || require('@electron/remote')?.getCurrentWindow();
                
                if (currentWindow && !currentWindow.isMaximized()) {
                    currentWindow.maximize();
                }
            } catch (e) {
            }
        }
        
        // Garantir que o container ocupe toda a altura disponÃ­vel
        const container = document.getElementById('hex-editor-container');
        if (container) {
            container.style.height = '100vh';
            container.style.minHeight = '600px';
        }
        
        const mainArea = document.querySelector('.main-area');
        if (mainArea) {
            mainArea.style.height = 'calc(100vh - 160px)'; // Subtrair header + controls
            mainArea.style.minHeight = '400px';
        }
    }
    
    // === CORREÃ‡ÃƒO 2: SISTEMA DE REDIMENSIONAMENTO RESPONSIVO ===
    function createResponsiveResizeSystem() {
        let resizeTimeout;
        
        // FunÃ§Ã£o para recalcular dimensÃµes do render
        function recalculateRenderDimensions() {
            const container = document.getElementById('hex-content');
            if (!container) return;
            
            // Atualizar altura do container
            const mainArea = container.closest('.main-area');
            if (mainArea) {
                const availableHeight = mainArea.clientHeight - 50; // Margem para header
                container.style.height = `${availableHeight}px`;
            }
            
            // Recalcular parÃ¢metros de scrolling virtual
            if (window.hexEditor && typeof window.hexEditor.getDataLength === 'function' && window.hexEditor.getDataLength() > 0) {
                const containerHeight = container.clientHeight;
            const lineHeight = window.hexEditor.getEffectiveLineHeight();
            const visibleLines = Math.floor(containerHeight / lineHeight);
                
                // Atualizar propriedades do hexEditor
                window.hexEditor.visibleLines = visibleLines;
                window.hexEditor.containerHeight = containerHeight;
                
                // Recalcular scroll mÃ¡ximo
                const totalLines = Math.ceil(window.hexEditor.getDataLength() / window.hexEditor.bytesPerLine);
                window.hexEditor.totalLines = totalLines;
                window.hexEditor.maxScrollLines = Math.max(0, totalLines - visibleLines);
                
                
                // Re-renderizar com novas dimensÃµes
                if (window.hexEditor.completeRenderWithColors) {
                    window.hexEditor.completeRenderWithColors(window.hexEditor.currentScrollPercent, true);
                }
            }
        }
        
        // Handler de redimensionamento otimizado
        function handleResize() {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                recalculateRenderDimensions();
            }, 100); // Debounce de 100ms
        }
        
        // Bind eventos de redimensionamento
        window.addEventListener('resize', handleResize);
        
        // Observador de mudanÃ§as na DOM para detectar redimensionamento manual
        if (window.ResizeObserver) {
            const mainArea = document.querySelector('.main-area');
            if (mainArea) {
                const resizeObserver = new ResizeObserver(entries => {
                    for (let entry of entries) {
                        handleResize();
                    }
                });
                resizeObserver.observe(mainArea);
            }
        }
        
        return { recalculateRenderDimensions, handleResize };
    }
    
    // === CORREÃ‡ÃƒO 3: MELHORAR SISTEMA DE SCROLL VIRTUAL ===
    function enhanceVirtualScrolling() {
        if (!window.hexEditor.completeRenderWithColors) return;
        
        // Backup do mÃ©todo original
        if (!window.hexEditor._originalCompleteRender) {
            window.hexEditor._originalCompleteRender = window.hexEditor.completeRenderWithColors;
        }
        
        // MÃ©todo melhorado que se adapta Ã s dimensÃµes atuais
        window.hexEditor.completeRenderWithColors = function(percent = this.currentScrollPercent, preserveCursor = false) {
            // Verificar se dados estÃ£o disponÃ­veis
            const dataLength = typeof this.getDataLength === 'function' ? this.getDataLength() : 0;
            if (dataLength === 0 || !this.fileSize) {
                if (this._content) {
                    const noFileText = window.I18n?.t ? window.I18n.t('status.no_file') : 'Nenhum arquivo carregado';
                    this._content.innerHTML = `<div style="padding: 20px; color: #666; text-align: center;">${noFileText}</div>`;
                }
                return 0;
            }
            
            // NOVO: Recalcular dimensÃµes dinamicamente
            const container = document.getElementById('hex-content');
            if (container) {
                const newContainerHeight = container.clientHeight;
                const currentLineHeight = this.getEffectiveLineHeight();
                const newVisibleLines = Math.floor(newContainerHeight / currentLineHeight);
                
                // Atualizar apenas se houve mudanÃ§a significativa
                if (newVisibleLines > 0 && newVisibleLines !== this.visibleLines) {
                    this.visibleLines = newVisibleLines;
                    this.containerHeight = newContainerHeight;
                    this.maxScrollLines = Math.max(0, this.totalLines - this.visibleLines);
                }
            }
            
            // Continuar com lÃ³gica original
            const p = Math.max(0, Math.min(1, percent));
            const targetLine = Math.floor(p * this.maxScrollLines);
            const startLine = Math.max(0, targetLine);
            const endLine = Math.min(this.totalLines - 1, startLine + this.visibleLines);
            
            if (!this._content) return;
            
            // Clear content efficiently
            this._content.innerHTML = '';
            const fragment = document.createDocumentFragment();
            
            const selStart = Math.min(this.selectionStart, this.selectionEnd);
            const selEnd = Math.max(this.selectionStart, this.selectionEnd);
            
            // Create all lines
            for (let i = 0; i <= endLine - startLine; i++) {
                const line = startLine + i;
                const offset = line * this.bytesPerLine;
                if (offset < this.fileSize) {
                    const lineElement = this.createCompleteLineWithColors(offset, selStart, selEnd);
                    fragment.appendChild(lineElement);
                }
            }
            
            this._content.appendChild(fragment);

            // Calcular maxTextVisualUnits e atualizar scrollbar do campo texto
            const lines = Array.from(this._content.querySelectorAll('.hex-line'));
            const maxTextVisualUnits = lines.reduce((maxUnits, line) => {
                const textVisualUnits = parseInt(line.dataset?.textVisualUnits || '0', 10) || 0;
                return Math.max(maxUnits, textVisualUnits);
            }, 0);
            if (typeof this.applyTextColumnScrollbarMetrics === 'function') {
                requestAnimationFrame(() => this.applyTextColumnScrollbarMetrics(maxTextVisualUnits));
            }

            // Update thumb position
            if (this._track && this._thumb) {
                const trackHeight = this._track.clientHeight - this._thumb.clientHeight;
                this._thumb.style.top = `${p * trackHeight}px`;
            }
            
            // Update cursor position if needed
            if (!preserveCursor) {
                if (p >= 0.99) {
                    this.cursorPosition = this.fileSize - 1;
                } else {
                    const targetOffset = startLine * this.bytesPerLine;
                    this.cursorPosition = Math.max(0, Math.min(targetOffset, this.fileSize - 1));
                }
            }
            
            this.updateStatus();
            this.currentScrollPercent = p;
            
            return p;
        };
    }
    
    // === CORREÃ‡ÃƒO 4: INICIALIZAÃ‡ÃƒO RESPONSIVA ===
    function enhanceInitialization() {
        // Sobrescrever mÃ©todo de inicializaÃ§Ã£o do scroll avanÃ§ado
        if (window.hexEditor.initializeAdvancedScrolling) {
            const originalInit = window.hexEditor.initializeAdvancedScrolling;
            
            window.hexEditor.initializeAdvancedScrolling = function() {
                const container = document.getElementById('hex-content');
                if (!container) return;

                // Only initialize if we have data
                const dataLength = typeof this.getDataLength === 'function' ? this.getDataLength() : 0;
                if (dataLength === 0) {
                    // Criar container vazio mesmo sem dados para mostrar mensagem
                    this.recreateContainerWithAdvancedScrolling();
                    // Mostrar mensagem de "Nenhum arquivo carregado"
                    if (this._content) {
                        const noFileText = window.I18n?.t ? window.I18n.t('status.no_file') : 'Nenhum arquivo carregado';
                        this._content.innerHTML = `<div style="padding: 20px; color: #666; text-align: center;">${noFileText}</div>`;
                    }
                    return;
                }

                // NOVO: Calcular dimensÃµes dinamicamente baseado no container atual
                this.fileSize = dataLength;
                this.lineHeight = this.getEffectiveLineHeight();
                this.totalLines = Math.ceil(this.fileSize / this.bytesPerLine);

                // Usar dimensÃµes atuais do container
                this.containerHeight = container.clientHeight || 600; // Fallback
                this.visibleLines = Math.floor(this.containerHeight / this.lineHeight);
                this.maxScrollLines = Math.max(0, this.totalLines - this.visibleLines);


                // Chamar mÃ©todo original
                this.recreateContainerWithAdvancedScrolling();
            };
        }
    }
    
    // Iniciar aplicaÃ§Ã£o das correÃ§Ãµes
    waitForHexEditor();
    
})(); 


