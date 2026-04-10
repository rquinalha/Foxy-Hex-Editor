// 🚀 FOXY HEX EDITOR - OPTIMIZED SCROLL SYSTEM
// Sistema otimizado de scroll para melhor performance em arquivos normais e grandes
// VERSÃO PADRÃO - Navegação fixa: roda=1 linha, setas=1 linha, page=3 linhas

class OptimizedScrollSystem {
    constructor(hexEditor) {
        this.hexEditor = hexEditor;
        this.isScrolling = false;
        this.scrollTimeout = null;
        this.lastScrollTime = 0;
        this.scrollAcceleration = 1;
        this.maxScrollSpeed = 15; // Aumentado para melhor resposta
        this.frameRequest = null;
        
        // Configurações de performance melhoradas
        this.scrollThrottleDelay = 8; // ~120fps para maior suavidade
        this.scrollBufferLines = 8; // Mais linhas de buffer para scroll mais suave
        
        // Configurações de navegação PADRÃO (fixas)
        this.wheelScrollLines = 1; // Roda do mouse: 1 linha por vez
        this.arrowScrollLines = 1; // Setas da scrollbar: 1 linha por vez
        this.pageScrollLines = 3; // Page Up/Down: 3 linhas por vez
        
        // Configurações de zoom e precisão
        this.zoomLevel = 1.0;
        this.minZoom = 0.5;
        this.maxZoom = 3.0;
        
    }

    getDataLength() {
        if (!this.hexEditor) return 0;
        if (typeof this.hexEditor.getDataLength === 'function') {
            return this.hexEditor.getDataLength();
        }
        return 0;
    }

    // Inicializar sistema
    initialize() {
        this.setupScrollEvents();
        this.setupKeyboardNavigation();
    }

    // Configurar eventos de scroll otimizados
    setupScrollEvents() {
        const container = document.getElementById('hex-content');
        if (!container) return;

        // Remover listeners existentes se houver
        if (this.wheelHandler) {
            container.removeEventListener('wheel', this.wheelHandler);
        }

        // Novo handler otimizado de wheel com navegação padrão
        this.wheelHandler = this.createStandardWheelHandler();
        container.addEventListener('wheel', this.wheelHandler, { passive: false });

        // Configurar scrollbar otimizada
        this.setupEnhancedScrollbar();
        
        // Configurar eventos de zoom
        this.setupZoomEvents();
    }

    // Criar handler padrão de wheel (1 linha por vez)
    createStandardWheelHandler() {
        return (e) => {
            e.preventDefault();
            
            // Detectar se é scroll de zoom (Ctrl + wheel)
            if (e.ctrlKey) {
                this.handleZoomScroll(e);
                return;
            }
            
            // Marcar que estamos fazendo scroll manual para evitar interferência do cursor
            this.hexEditor.isManualScrolling = true;
            this.hexEditor.preventCursorFollow = true;
            
            // Para arquivos grandes, usar fileSize; para normais, usar data.length
            const fileSize = this.getDataLength();
            
            // Calcular delta baseado em 1 linha por vez
            const totalLines = Math.ceil(fileSize / this.hexEditor.bytesPerLine);
            const visibleLines = Math.floor((this.hexEditor.visibleLines || 50) * this.zoomLevel);
            const maxScrollLines = Math.max(0, totalLines - visibleLines);
            
            // Scroll fixo de 1 linha por vez para todos os arquivos
            let delta;
            if (maxScrollLines <= 0) {
                // Arquivo cabe inteiro na tela - não fazer scroll
                delta = 0;
            } else {
                // Scroll fixo de 1 linha por vez - delta baseado em linhas scrolláveis
                const singleLineDelta = 1 / maxScrollLines;
                // Normalizar deltaY para sempre ser 1 linha por vez
                const direction = e.deltaY > 0 ? 1 : -1;
                delta = direction * singleLineDelta;
            }
            
            this.performStandardScroll(delta);
            
            // Limpar flag após um pequeno delay
            setTimeout(() => {
                this.hexEditor.isManualScrolling = false;
                this.hexEditor.preventCursorFollow = false;
            }, 150);
        };
    }

    // Executar scroll padrão
    performStandardScroll(delta) {
        // Cancelar frame anterior se existir
        if (this.frameRequest) {
            cancelAnimationFrame(this.frameRequest);
        }

        // Calcular novo scroll percent
        const newPercent = Math.max(0, Math.min(1, this.hexEditor.currentScrollPercent + delta));
        
        if (newPercent === this.hexEditor.currentScrollPercent) return;

        this.hexEditor.currentScrollPercent = newPercent;

        // Usar requestAnimationFrame para suavizar
        this.frameRequest = requestAnimationFrame(() => {
            this.renderEnhanced(newPercent);
            this.frameRequest = null;
        });
    }

    // Renderização aprimorada
    renderEnhanced(scrollPercent) {
        if (this.hexEditor.isLargeFileActive?.()) {
            // Para arquivos grandes, usar o fluxo unificado do editor
            this.hexEditor.renderAtScrollPercent?.(scrollPercent, true);
        } else {
            // Para arquivos normais, usar renderização otimizada
            this.renderNormalFileEnhanced(scrollPercent);
        }
        
        // Atualizar scrollbar
        this.updateScrollbarThumbEnhanced(scrollPercent);
    }

    // Renderização aprimorada para arquivos normais
    renderNormalFileEnhanced(scrollPercent) {
        const container = document.getElementById('hex-content');
        if (!container) return;

        const fileSize = this.getDataLength();

        const totalLines = Math.ceil(fileSize / this.hexEditor.bytesPerLine);
        const visibleLines = Math.floor((this.hexEditor.visibleLines || 50) * this.zoomLevel);
        const startLine = Math.floor(scrollPercent * Math.max(0, totalLines - visibleLines));
        const endLine = Math.min(totalLines, startLine + visibleLines + this.scrollBufferLines);

        // Usar fragment para melhor performance
        const fragment = document.createDocumentFragment();
        
        // Criar header se necessário
        if (startLine === 0) {
            const header = this.createEnhancedHeader();
            if (header) fragment.appendChild(header);
        }

        // Criar linhas visíveis
        for (let lineIndex = startLine; lineIndex < endLine; lineIndex++) {
            const offset = lineIndex * this.hexEditor.bytesPerLine;
            if (offset >= fileSize) break;

            const line = this.createEnhancedLine(offset);
            if (line) fragment.appendChild(line);
        }

        // Atualizar DOM de uma vez
        container.innerHTML = '';
        container.appendChild(fragment);

        // Atualizar status
        if (this.hexEditor.updateStatus) {
            this.hexEditor.updateStatus();
        }
        
        // Atualizar indicadores de posição
        this.updateScrollIndicators(scrollPercent, startLine, endLine, totalLines);
    }

    // Criar header aprimorado
    createEnhancedHeader() {
        const header = document.createElement('div');
        header.className = 'hex-header';
        header.style.cssText = `
            display: grid; grid-template-columns: 100px minmax(450px, 1fr) 420px; gap: 20px;
            padding: 8px 16px; font-weight: bold; color: #a0a9c0;
            border-bottom: 2px solid rgba(255, 107, 53, 0.3); margin-bottom: 4px;
            position: sticky; top: 0; background: rgba(26, 26, 46, 0.95); z-index: 5;
            font-size: ${13 * this.zoomLevel}px;
        `;

        // Offset header
        const offsetHeader = document.createElement('div');
        offsetHeader.textContent = 'Offset';
        offsetHeader.style.textAlign = 'right';

        // Bytes header
        const bytesHeader = document.createElement('div');
        bytesHeader.className = 'hex-header-bytes';
        for (let i = 0; i < 16; i++) {
            const span = document.createElement('span');
            span.textContent = i.toString(16).toUpperCase();
            span.style.fontSize = `${13 * this.zoomLevel}px`;
            bytesHeader.appendChild(span);
        }

        // ASCII header
        const asciiHeader = document.createElement('div');
        asciiHeader.textContent = 'ASCII';
        asciiHeader.style.paddingLeft = '12px';

        header.appendChild(offsetHeader);
        header.appendChild(bytesHeader);
        header.appendChild(asciiHeader);

        return header;
    }

    // Criar linha aprimorada
    createEnhancedLine(offset) {
        const fileSize = this.getDataLength();

        const line = document.createElement('div');
        line.className = 'hex-line';
        line.style.cssText = `
            display: grid; grid-template-columns: 100px minmax(450px, 1fr) 420px; gap: 20px;
            padding: 4px 16px; font-size: ${13 * this.zoomLevel}px; line-height: ${17 * this.zoomLevel}px; 
            height: ${25 * this.zoomLevel}px; border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        `;

        // Offset
        const offsetDiv = document.createElement('div');
        offsetDiv.className = 'hex-offset';
        offsetDiv.textContent = offset.toString(16).toUpperCase().padStart(8, '0');

        // Bytes
        const bytesDiv = document.createElement('div');
        bytesDiv.className = 'hex-bytes';
        
        // ASCII
        const asciiDiv = document.createElement('div');
        asciiDiv.className = 'hex-ascii';

        let asciiText = '';

        // Processar bytes da linha
        for (let i = 0; i < this.hexEditor.bytesPerLine; i++) {
            const pos = offset + i;
            
            if (pos < fileSize) {
                const byte = this.hexEditor.getByteAt(pos);
                
                // Hex byte
                const hexSpan = this.createEnhancedHexByte(byte, pos);
                bytesDiv.appendChild(hexSpan);
                
                // ASCII char
                const char = byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.';
                asciiText += char;
            } else {
                // Empty byte
                const emptySpan = document.createElement('span');
                emptySpan.className = 'hex-byte';
                emptySpan.style.visibility = 'hidden';
                bytesDiv.appendChild(emptySpan);
                asciiText += ' ';
            }
        }

        // Criar ASCII spans otimizados
        for (let i = 0; i < asciiText.length; i++) {
            const pos = offset + i;
            const charSpan = this.createEnhancedAsciiChar(asciiText[i], pos);
            asciiDiv.appendChild(charSpan);
        }

        line.appendChild(offsetDiv);
        line.appendChild(bytesDiv);
        line.appendChild(asciiDiv);

        return line;
    }

    // Criar byte hex aprimorado
    createEnhancedHexByte(byte, pos) {
        const span = document.createElement('span');
        span.className = 'hex-byte';
        span.textContent = byte.toString(16).toUpperCase().padStart(2, '0');
        span.dataset.offset = pos;
        span.dataset.panel = 'hex';
        span.style.fontSize = `${13 * this.zoomLevel}px`;
        
        // Aplicar classes baseadas no estado
        const isSelected = pos >= Math.min(this.hexEditor.selectionStart, this.hexEditor.selectionEnd) && 
                          pos <= Math.max(this.hexEditor.selectionStart, this.hexEditor.selectionEnd);
        const isCursor = pos === this.hexEditor.cursorPosition && this.hexEditor.activePanel === 'hex';
        const isModified = this.hexEditor.modifiedBytes.has(pos);
        
        if (isSelected && this.hexEditor.selectionStart !== this.hexEditor.selectionEnd) {
            span.classList.add('selected');
        }
        if (isCursor) {
            span.classList.add('selected');
        }
        if (isModified) {
            span.classList.add('modified');
        }

        return span;
    }

    // Criar char ASCII aprimorado
    createEnhancedAsciiChar(char, pos) {
        const span = document.createElement('span');
        span.className = 'ascii-char';
        span.textContent = char;
        span.dataset.offset = pos;
        span.dataset.panel = 'ascii';
        span.style.fontSize = `${13 * this.zoomLevel}px`;
        
        // Aplicar cores personalizadas ao texto
        // Aplicar cores personalizadas com prioridade sobre cores fixas
        if (this.hexEditor && this.hexEditor.colorConfig && this.hexEditor.colorConfig.textColors) {
            // Usar cores customizadas se disponíveis
            const customColor = this.hexEditor.getTextColor(char);
            span.style.color = customColor;
        } else if (this.hexEditor && this.hexEditor.applyTextColorsToSpan) {
            // Fallback para sistema antigo
            this.hexEditor.applyTextColorsToSpan(span, char);
        } else if (this.hexEditor.useCharColors && this.hexEditor.applyCharColorAdvanced) {
            // Fallback para cores fixas
            const color = this.hexEditor.applyCharColorAdvanced(char);
            span.style.color = color;
        }
        
        // Aplicar classes baseadas no estado
        const isSelected = pos >= Math.min(this.hexEditor.selectionStart, this.hexEditor.selectionEnd) && 
                          pos <= Math.max(this.hexEditor.selectionStart, this.hexEditor.selectionEnd);
        const isCursor = pos === this.hexEditor.cursorPosition && this.hexEditor.activePanel === 'ascii';
        const isModified = this.hexEditor.modifiedBytes.has(pos);
        
        if (isSelected && this.hexEditor.selectionStart !== this.hexEditor.selectionEnd) {
            span.classList.add('selected');
        }
        if (isCursor) {
            span.classList.add('selected');
        }
        if (isModified) {
            span.classList.add('modified');
        }

        return span;
    }

    // Configurar scrollbar aprimorada
    setupEnhancedScrollbar() {
        const track = document.querySelector('.scroll-track');
        const thumb = document.querySelector('.scroll-thumb');
        
        if (!track || !thumb) return;

        // Remover listeners existentes
        if (this.trackClickHandler) {
            track.removeEventListener('click', this.trackClickHandler);
        }

        // Novo handler com navegação padrão (1 linha por vez)
        this.trackClickHandler = (e) => {
            if (e.target === thumb) return;
            
            const rect = track.getBoundingClientRect();
            const percent = Math.max(0, Math.min(1, (e.clientY - rect.top) / track.clientHeight));
            
            this.performStandardScroll(percent - this.hexEditor.currentScrollPercent);
        };

        track.addEventListener('click', this.trackClickHandler);
        
        // Adicionar eventos de arrastar para o thumb
        this.setupThumbDragEvents(thumb, track);
    }

    // Configurar eventos de arrastar do thumb
    setupThumbDragEvents(thumb, track) {
        let isDragging = false;
        let startY = 0;
        let startPercent = 0;

        thumb.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isDragging = true;
            startY = e.clientY;
            startPercent = this.hexEditor.currentScrollPercent;
            thumb.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            e.preventDefault();
            const deltaY = e.clientY - startY;
            const trackHeight = track.clientHeight - thumb.clientHeight;
            const deltaPercent = deltaY / trackHeight;
            const newPercent = Math.max(0, Math.min(1, startPercent + deltaPercent));
            
            this.performStandardScroll(newPercent - this.hexEditor.currentScrollPercent);
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                thumb.style.cursor = 'grab';
            }
        });
    }

    // Atualizar thumb da scrollbar
    updateScrollbarThumbEnhanced(percent) {
        const thumb = document.querySelector('.scroll-thumb');
        if (!thumb) return;

        const track = document.querySelector('.scroll-track');
        if (!track) return;

        const thumbHeight = Math.max(40, track.clientHeight * 0.1); // Thumb adaptativo
        const trackHeight = track.clientHeight;
        const maxTop = trackHeight - thumbHeight;
        const top = percent * maxTop;

        thumb.style.top = `${Math.max(0, Math.min(maxTop, top))}px`;
        thumb.style.height = `${thumbHeight}px`;
    }

    // Configurar eventos de zoom
    setupZoomEvents() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey) {
                switch(e.key) {
                    case '=':
                    case '+':
                        e.preventDefault();
                        this.zoomIn();
                        break;
                    case '-':
                        e.preventDefault();
                        this.zoomOut();
                        break;
                    case '0':
                        e.preventDefault();
                        this.resetZoom();
                        break;
                }
            }
        });
    }

    // Handlers de zoom
    handleZoomScroll(e) {
        e.preventDefault();
        if (e.deltaY < 0) {
            this.zoomIn();
        } else {
            this.zoomOut();
        }
    }

    zoomIn() {
        this.zoomLevel = Math.min(this.maxZoom, this.zoomLevel + 0.1);
        this.performStandardScroll(0);
    }

    zoomOut() {
        this.zoomLevel = Math.max(this.minZoom, this.zoomLevel - 0.1);
        this.performStandardScroll(0);
    }

    resetZoom() {
        this.zoomLevel = 1.0;
        this.performStandardScroll(0);
    }

    // Atualizar indicadores de scroll
    updateScrollIndicators(scrollPercent, startLine, endLine, totalLines) {
        // Atualizar indicador de posição se existir
        const positionIndicator = document.getElementById('scroll-position');
        if (positionIndicator) {
            const fileSize = this.getDataLength();
            
            const currentOffset = Math.floor(scrollPercent * fileSize);
            const percentage = Math.round(scrollPercent * 100);
            positionIndicator.textContent = `Pos: ${currentOffset.toString(16).toUpperCase()} (${percentage}%)`;
        }
    }

    // Configurar navegação por teclado padrão
    setupKeyboardNavigation() {
        // Remover listener existente se houver
        if (this.keyHandler) {
            document.removeEventListener('keydown', this.keyHandler);
        }

        this.keyHandler = (e) => {
            // Verificar se o foco está em um input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            switch(e.key) {
                case 'PageUp':
                    e.preventDefault();
                    this.pageUp();
                    break;
                case 'PageDown':
                    e.preventDefault();
                    this.pageDown();
                    break;
                case 'Home':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.goToStart();
                    }
                    break;
                case 'End':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.goToEnd();
                    }
                    break;
                case 'ArrowUp':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.scrollUp();
                    }
                    break;
                case 'ArrowDown':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.scrollDown();
                    }
                    break;
            }
        };

        document.addEventListener('keydown', this.keyHandler);
    }

    // Navegação padrão (3 linhas por Page Up/Down)
    pageUp() {
        const fileSize = this.getDataLength();
        
        const totalLines = Math.ceil(fileSize / this.hexEditor.bytesPerLine);
        const visibleLines = Math.floor((this.hexEditor.visibleLines || 50) * this.zoomLevel);
        const maxScrollLines = Math.max(0, totalLines - visibleLines);
        const currentLine = Math.floor(this.hexEditor.currentScrollPercent * maxScrollLines);
        
        const targetLine = Math.max(0, currentLine - this.pageScrollLines);
        const newPercent = maxScrollLines > 0 ? targetLine / maxScrollLines : 0;
        
        this.performStandardScroll(newPercent - this.hexEditor.currentScrollPercent);
    }

    pageDown() {
        const fileSize = this.getDataLength();
        
        const totalLines = Math.ceil(fileSize / this.hexEditor.bytesPerLine);
        const visibleLines = Math.floor((this.hexEditor.visibleLines || 50) * this.zoomLevel);
        const maxScrollLines = Math.max(0, totalLines - visibleLines);
        const currentLine = Math.floor(this.hexEditor.currentScrollPercent * maxScrollLines);
        
        const targetLine = Math.min(maxScrollLines, currentLine + this.pageScrollLines);
        const newPercent = maxScrollLines > 0 ? targetLine / maxScrollLines : 0;
        
        this.performStandardScroll(newPercent - this.hexEditor.currentScrollPercent);
    }

    scrollUp() {
        const fileSize = this.getDataLength();
        
        const totalLines = Math.ceil(fileSize / this.hexEditor.bytesPerLine);
        const visibleLines = Math.floor((this.hexEditor.visibleLines || 50) * this.zoomLevel);
        const maxScrollLines = Math.max(0, totalLines - visibleLines);
        const lineDelta = maxScrollLines > 0 ? this.arrowScrollLines / maxScrollLines : 0;
        const delta = -lineDelta;
        
        this.performStandardScroll(delta);
    }

    scrollDown() {
        const fileSize = this.getDataLength();
        
        const totalLines = Math.ceil(fileSize / this.hexEditor.bytesPerLine);
        const visibleLines = Math.floor((this.hexEditor.visibleLines || 50) * this.zoomLevel);
        const maxScrollLines = Math.max(0, totalLines - visibleLines);
        const lineDelta = maxScrollLines > 0 ? this.arrowScrollLines / maxScrollLines : 0;
        const delta = lineDelta;
        
        this.performStandardScroll(delta);
    }

    goToStart() {
        this.performStandardScroll(-this.hexEditor.currentScrollPercent);
    }

    goToEnd() {
        this.performStandardScroll(1 - this.hexEditor.currentScrollPercent);
    }

    // Limpar recursos
    destroy() {
        if (this.frameRequest) {
            cancelAnimationFrame(this.frameRequest);
        }
        
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }

        const container = document.getElementById('hex-content');
        if (container && this.wheelHandler) {
            container.removeEventListener('wheel', this.wheelHandler);
        }

        if (this.keyHandler) {
            document.removeEventListener('keydown', this.keyHandler);
        }

        const track = document.querySelector('.scroll-track');
        if (track && this.trackClickHandler) {
            track.removeEventListener('click', this.trackClickHandler);
        }
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.OptimizedScrollSystem = OptimizedScrollSystem;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = OptimizedScrollSystem;
}
