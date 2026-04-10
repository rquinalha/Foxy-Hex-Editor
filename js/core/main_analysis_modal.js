Object.assign(FoxyHexEditorComplete.prototype, {
showAnalysisModal() {
    // Preparar estado inicial para a janela de análise
    const analysis = window.hexEditor.gameAnalysis;
    
    const initialState = {
        format: analysis?.format || null, // null para que o renderer use a tradução correta
        fileSize: analysis?.fileSize || this.getDataLength?.() || 0,
        textStrings: analysis?.textStrings || [],
        patterns: analysis?.patterns || [],
        entropy: analysis?.entropy || 0,
        entropyDetails: analysis?.entropyDetails || null,
        sections: analysis?.sections || []
    };

    const { ipcRenderer } = require('electron');
    ipcRenderer.send('open-analysis-window', initialState);

    // Configurar listener para navegação da janela de análise se ainda não foi configurado
    if (!this._analysisIpcConfigured) {
        ipcRenderer.on('execute-analysis-navigate', (event, data) => {
            this.handleAnalysisNavigation(data);
        });
        
        ipcRenderer.on('analysis-window-closed', () => {
            // Opcional: fazer algo quando a janela for fechada
        });

        // Handler para solicitação de refresh
        ipcRenderer.on('analysis-refresh-request', () => {
            this.analyzeROM();
        });

        this._analysisIpcConfigured = true;
    }
},

handleAnalysisNavigation(data) {
    const { offset, length } = data;
    
    if (offset === undefined || offset === null) return;
    
    // Navegar para o offset com posicionamento preciso e seleção da string
    this.navigateToOffsetFromAnalysis(offset, length);
    
    // Mostrar notificação de navegação
    this.showAnalysisNavigationNotification(offset, length);
    
    // Atualizar campo de posição
    const positionInput = document.getElementById('cursor-position-input');
    if (positionInput) {
        positionInput.value = offset.toString(16).toUpperCase().padStart(8, '0');
    }
    
    // Mostrar indicador temporário no status bar
    this.showAnalysisStatusIndicator(offset, length);
},

hideAnalysisModal() {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('close-analysis-window');
},

generateAnalysisReport() {
    const container = document.getElementById('analysis-results');
if (!container) {
} else {
    const analysis = window.hexEditor.gameAnalysis;
    
    
    // Modal modernizado
    container.innerHTML = `
        <div style="
            padding: 24px; 
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            background: linear-gradient(135deg, rgba(15, 15, 35, 0.95) 0%, rgba(26, 26, 46, 0.98) 100%);
            border-radius: 12px;
            backdrop-filter: blur(10px);
        ">
            <!-- Header moderno -->
            <div style="
                margin-bottom: 32px; 
                padding: 20px; 
                background: linear-gradient(135deg, rgba(255, 107, 53, 0.15) 0%, rgba(247, 147, 30, 0.15) 100%);
                border-radius: 12px;
                border: 1px solid rgba(255, 107, 53, 0.3);
                backdrop-filter: blur(5px);
            ">
                <h2 style="
                    color: #ff6b35; 
                    margin: 0 0 16px 0; 
                    font-size: 24px; 
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                ">
                    <span style="font-size: 28px;">📊</span>
                    Análise Completa do Arquivo
                </h2>
                
                <div style="
                    display: grid; 
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
                    gap: 16px; 
                    margin-top: 16px;
                ">
                    <div style="
                        background: rgba(79, 195, 247, 0.1); 
                        padding: 12px 16px; 
                        border-radius: 8px; 
                        border-left: 4px solid #4fc3f7;
                    ">
                        <strong style="color: #4fc3f7; font-size: 14px;">Formato</strong><br>
                        <span style="color: white; font-size: 16px;">${analysis.format}</span>
                    </div>
                    
                    <div style="
                        background: rgba(129, 199, 132, 0.1); 
                        padding: 12px 16px; 
                        border-radius: 8px; 
                        border-left: 4px solid #81c784;
                    ">
                        <strong style="color: #81c784; font-size: 14px;">Tamanho</strong><br>
                        <span style="color: white; font-size: 16px;">${window.hexEditor.formatFileSize(analysis.fileSize)}</span>
                    </div>
                    
                    <div style="
                        background: rgba(255, 215, 0, 0.1); 
                        padding: 12px 16px; 
                        border-radius: 8px; 
                        border-left: 4px solid #ffd700;
                    ">
                        <strong style="color: #ffd700; font-size: 14px;">Strings</strong><br>
                        <span style="color: white; font-size: 16px;">${analysis.textStrings.length}</span>
                    </div>
                    
                    <div style="
                        background: rgba(255, 64, 129, 0.1); 
                        padding: 12px 16px; 
                        border-radius: 8px; 
                        border-left: 4px solid #ff4081;
                    ">
                        <strong style="color: #ff4081; font-size: 14px;">Entropia</strong><br>
                        <span style="color: white; font-size: 16px;">${analysis.entropy.toFixed(2)} bits</span>
                    </div>
                </div>
            </div>
            
            <!-- Strings section modernizada -->
            <div style="margin-bottom: 32px;">
                <h3 style="
                    color: #ff6b35; 
                    margin: 0 0 20px 0; 
                    font-size: 20px; 
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                ">
                    <span style="font-size: 24px;">🔤</span>
                    Strings de Texto (${analysis.textStrings.length})
                </h3>
                
                <div style="
                    background: rgba(255, 255, 255, 0.02);
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    overflow: hidden;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                ">
                    <table style="
                        width: 100%; 
                        border-collapse: collapse; 
                        font-size: 14px; 
                        table-layout: fixed;
                    ">
                        <thead>
                            <tr style="
                                background: linear-gradient(135deg, rgba(255, 107, 53, 0.2) 0%, rgba(247, 147, 30, 0.2) 100%);
                                backdrop-filter: blur(5px);
                            ">
                                <th style="
                                    border-bottom: 2px solid rgba(255, 107, 53, 0.5); 
                                    padding: 16px; 
                                    width: 140px; 
                                    color: #ffd700; 
                                    font-weight: 600;
                                    font-size: 15px;
                                    text-align: left;
                                ">
                                    📍 Offset
                                </th>
                                <th style="
                                    border-bottom: 2px solid rgba(255, 107, 53, 0.5); 
                                    padding: 16px; 
                                    color: #ffd700; 
                                    font-weight: 600;
                                    font-size: 15px;
                                    text-align: left;
                                ">
                                    📝 Conteúdo da String
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            ${analysis.textStrings.map((str, index) => `
                                <tr class="clickable-offset" 
                                    data-offset="${str.offset}" 
                                    data-length="${str.length}"
                                    style="
                                        cursor: pointer; 
                                        transition: all 0.3s ease;
                                        background: ${index % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.05)'};
                                    "
                                    onmouseover="this.style.background='rgba(255, 107, 53, 0.15)'; this.style.transform='translateX(4px)'"
                                    onmouseout="this.style.background='${index % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.05)'}'; this.style.transform='translateX(0px)'">
                                    
                                    <td style="
                                        border-bottom: 1px solid rgba(255, 255, 255, 0.1); 
                                        padding: 16px; 
                                        font-family: 'JetBrains Mono', 'Fira Code', monospace; 
                                        color: #4fc3f7; 
                                        font-weight: 600;
                                        font-size: 15px;
                                        vertical-align: top;
                                        background: rgba(79, 195, 247, 0.05);
                                    ">
                                        0x${str.offset.toString(16).toUpperCase().padStart(8, '0')}
                                    </td>
                                    
                                    <td style="
                                        border-bottom: 1px solid rgba(255, 255, 255, 0.1); 
                                        padding: 16px; 
                                        color: #ffffff; 
                                        word-wrap: break-word; 
                                        line-height: 1.6; 
                                        vertical-align: top;
                                        font-size: 14px;
                                        font-family: 'Segoe UI', system-ui, sans-serif;
                                    ">
                                        ${str.text}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Padrões section modernizada -->
            <div>
                <h3 style="
                    color: #ff6b35; 
                    margin: 0 0 20px 0; 
                    font-size: 20px; 
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                ">
                    <span style="font-size: 24px;">🔍</span>
                    Padrões de Dados (${analysis.patterns.length})
                </h3>
                
                <div style="
                    display: grid; 
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
                    gap: 16px;
                ">
                    ${analysis.patterns.map(pattern => `
                        <div style="
                            padding: 16px; 
                            background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
                            border-radius: 10px; 
                            border-left: 4px solid #4fc3f7;
                            border: 1px solid rgba(255, 255, 255, 0.1);
                            backdrop-filter: blur(5px);
                            transition: all 0.3s ease;
                        "
                        onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(79, 195, 247, 0.2)'"
                        onmouseout="this.style.transform='translateY(0px)'; this.style.boxShadow='none'">
                            <div style="color: #4fc3f7; font-weight: 600; margin-bottom: 8px; font-size: 14px;">
                                ${pattern.type === 'repeated' ? '🔄 Byte Repetido' : '📊 Padrão de Dados'}
                            </div>
                            <div style="color: white; font-size: 14px; line-height: 1.5;">
                                ${pattern.type === 'repeated' ? 
                                    `<strong>Byte:</strong> 0x${pattern.byte.toString(16).toUpperCase()}<br>
                                     <strong>Ocorrências:</strong> ${pattern.count} (${pattern.percentage}%)` :
                                    `<strong>Tipo:</strong> ${pattern.type}<br>
                                     <strong>Tamanho:</strong> ${pattern.length} bytes<br>
                                     <strong>Posição:</strong> 0x${pattern.start?.toString(16).toUpperCase()}`
                                }
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    

    
    // Ajustar tamanho do modal
    const modal = document.getElementById('analysis-modal');
    const modalContent = modal?.querySelector('.modal-content');
    if (modalContent) {
        modalContent.style.width = '85vw';
        modalContent.style.maxWidth = '700px';
        modalContent.style.maxHeight = '90vh';
    }
    
}
    
    // CRITICAL: Setup event delegation correto
    this.setupAnalysisEventDelegation();
},

setupAnalysisEventDelegation() {
    const container = document.getElementById('analysis-results');
    if (!container) return;
    
    // Remove event listeners anteriores
    if (this.analysisClickHandler) {
        container.removeEventListener('click', this.analysisClickHandler);
    }
    
    // Criar handler que fecha modal e navega para offset com seleção da string
    this.analysisClickHandler = (e) => {
        const clickableElement = e.target.closest('.clickable-offset');
        if (clickableElement && clickableElement.dataset.offset) {
            const offset = parseInt(clickableElement.dataset.offset);
            const length = parseInt(clickableElement.dataset.length) || 0;
            
            // Feedback visual imediato no elemento clicado
            const originalBackground = clickableElement.style.background;
            const originalTransform = clickableElement.style.transform;
            
            clickableElement.style.background = 'linear-gradient(135deg, rgba(255, 107, 53, 0.4) 0%, rgba(247, 147, 30, 0.4) 100%)';
            clickableElement.style.transform = 'scale(1.02)';
            clickableElement.style.boxShadow = '0 4px 20px rgba(255, 107, 53, 0.3)';
            clickableElement.style.transition = 'all 0.3s ease';
            
            // Fechar modal primeiro
            this.hideAnalysisModal();
            
            // Pequeno delay para garantir que o modal feche antes da navegação
            setTimeout(() => {
                // Navegar para o offset com posicionamento preciso e seleção da string
                this.navigateToOffsetFromAnalysis(offset, length);
                
                // Mostrar notificação de navegação
                this.showAnalysisNavigationNotification(offset, length);
                
                // Atualizar campo de posição
                const positionInput = document.getElementById('cursor-position-input');
                if (positionInput) {
                    positionInput.value = offset.toString(16).toUpperCase().padStart(8, '0');
                }
                
                // Mostrar indicador temporário no status bar
                this.showAnalysisStatusIndicator(offset, length);
            }, 100);
            
            setTimeout(() => {
                clickableElement.style.background = originalBackground;
                clickableElement.style.transform = originalTransform;
                clickableElement.style.boxShadow = '';
            }, 800);
        }
    };
    
    // Adicionar event listener
    container.addEventListener('click', this.analysisClickHandler);
},

updatePatternAnalysis(patterns) {
    const container = document.getElementById('pattern-analysis');
    if (!container) return;

    if (patterns.length === 0) {
        container.innerHTML = '<div style="color: #666; font-style: italic;">Nenhum padrão detectado</div>';
        return;
    }

    container.innerHTML = patterns.slice(0, 10).map(pattern => `
        <div class="bookmark-item" style="margin-bottom: 12px;">
            <div style="color: #4fc3f7; font-weight: bold; margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
                ${pattern.type === 'repeated' ? '🔄 Byte Repetido' : 
                  pattern.type === 'zero_padding' ? '📊 Preenchimento Zero' : '📈 Padrão'}
            </div>
            <div style="color: #fff; font-size: 12px; line-height: 1.4;">
                ${pattern.type === 'repeated' ? 
                    `<strong>Byte:</strong> 0x${pattern.byte.toString(16).toUpperCase()}<br>
                     <strong>Ocorrências:</strong> ${pattern.count.toLocaleString()} (${pattern.percentage}%)<br>
                     <strong>Frequência:</strong> ${pattern.count > 1000 ? 'Muito Alta' : pattern.count > 100 ? 'Alta' : 'Moderada'}` :
                  pattern.type === 'zero_padding' ?
                    `<strong>Início:</strong> 0x${pattern.start.toString(16).toUpperCase()}<br>
                     <strong>Tamanho:</strong> ${pattern.length} bytes<br>
                     <strong>Tipo:</strong> Preenchimento com zeros` :
                    `<strong>Tipo:</strong> ${pattern.type}<br>
                     <strong>Posição:</strong> 0x${pattern.start?.toString(16).toUpperCase()}<br>
                     <strong>Tamanho:</strong> ${pattern.length || 'N/A'} bytes`
                }
            </div>
        </div>
    `).join('');

    if (patterns.length > 10) {
        const moreDiv = document.createElement('div');
        moreDiv.style.cssText = 'color: #666; font-style: italic; text-align: center; padding: 8px; border-top: 1px solid rgba(255,255,255,0.1); margin-top: 8px;';
        moreDiv.textContent = `... e mais ${patterns.length - 10} padrões encontrados`;
        container.appendChild(moreDiv);
    }
},

updateEntropyAnalysis(entropy) {
    const container = document.getElementById('entropy-analysis');
    if (!container) return;
    
    let entropyLevel, color, description, recommendation;
    
    if (entropy < 1) {
        entropyLevel = 'Muito Baixa';
        color = '#81c784';
        description = 'Dados extremamente estruturados ou repetitivos';
        recommendation = 'Possível arquivo de configuração ou dados não comprimidos';
    } else if (entropy < 3) {
        entropyLevel = 'Baixa';
        color = '#4fc3f7';
        description = 'Dados estruturados com alguma variação';
        recommendation = 'Arquivo de texto, código fonte ou dados parcialmente comprimidos';
    } else if (entropy < 5) {
        entropyLevel = 'Média';
        color = '#ffd700';
        description = 'Dados moderadamente complexos';
        recommendation = 'Arquivo binário típico, imagem não comprimida';
    } else if (entropy < 7) {
        entropyLevel = 'Alta';
        color = '#ff9800';
        description = 'Dados altamente variados';
        recommendation = 'Arquivo comprimido, dados criptografados ou mídia comprimida';
    } else {
        entropyLevel = 'Muito Alta';
        color = '#ff6b35';
        description = 'Dados quase aleatórios';
        recommendation = 'Arquivo altamente comprimido, criptografado ou corrompido';
    }
    
    container.innerHTML = `
        <div class="bookmark-item" style="border-left-color: ${color};">
            <div style="color: ${color}; font-weight: bold; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                📈 Análise de Entropia
            </div>
            <div style="color: #fff; font-size: 12px; line-height: 1.5;">
                <div style="margin-bottom: 8px;">
                    <strong>Valor:</strong> ${entropy.toFixed(3)} bits/byte<br>
                    <strong>Nível:</strong> <span style="color: ${color}; font-weight: bold;">${entropyLevel}</span>
                </div>
                
                <div style="margin-bottom: 8px; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 4px;">
                    <strong style="color: ${color};">Interpretação:</strong><br>
                    ${description}
                </div>
                
                <div style="padding: 8px; background: rgba(255,255,255,0.03); border-radius: 4px; border-left: 3px solid ${color};">
                    <strong>Possível tipo de arquivo:</strong><br>
                    <span style="font-style: italic;">${recommendation}</span>
                </div>
            </div>
        </div>
        
        <div style="margin-top: 12px; padding: 8px; background: rgba(255,255,255,0.02); border-radius: 6px; font-size: 11px; color: #a0a9c0;">
            <strong>📊 Escala de Entropia:</strong><br>
            <div style="margin-top: 4px; display: flex; justify-content: space-between; font-size: 10px;">
                <span style="color: #81c784;">0-1: Estruturado</span>
                <span style="color: #4fc3f7;">1-3: Baixa</span>
                <span style="color: #ffd700;">3-5: Média</span>
                <span style="color: #ff9800;">5-7: Alta</span>
                <span style="color: #ff6b35;">7-8: Máxima</span>
            </div>
            
            <div style="margin-top: 6px; height: 4px; background: linear-gradient(90deg, #81c784 0%, #4fc3f7 25%, #ffd700 50%, #ff9800 75%, #ff6b35 100%); border-radius: 2px; position: relative;">
                <div style="position: absolute; top: -2px; left: ${(entropy/8)*100}%; width: 2px; height: 8px; background: white; border-radius: 1px;"></div>
            </div>
        </div>
    `;
},

exportAnalysis() {
    const analysis = {
        ...this.gameAnalysis,
        filename: 'relatorio_analise_rom.json',
        characterTable: this.charTables[this.currentCharTable].name,
        bookmarks: this.bookmarks
    };

    // Verificar se estamos no Electron
    if (typeof require !== 'undefined' && typeof process !== 'undefined') {
        const { ipcRenderer } = require('electron');
        
        // Usar diálogo nativo do Electron para salvar
        ipcRenderer.invoke('show-save-dialog', {
            title: 'Exportar Relatório de Análise',
            defaultPath: 'relatorio_analise_rom.json',
            filters: [
                { name: 'Relatório (.json)', extensions: ['json'] },
            ]
        }).then(result => {
            if (!result.canceled && result.filePath) {
                const fs = require('fs');
                try {
                    fs.writeFileSync(result.filePath, JSON.stringify(analysis, null, 2), 'utf8');
                    
                    if (window.notificationSystem) {
                        window.notificationSystem.success('Relatório de análise exportado com sucesso!', 'Exportação Concluída');
                    }
                    
                } catch (error) {
                    window.notificationSystem.error('Erro ao exportar relatório: ' + error.message, 'Erro de Exportação');
                }
            }
        }).catch(error => {
            window.notificationSystem.error('Erro ao abrir diálogo: ' + error.message, 'Erro de Diálogo');
        });
    } else {
        // Fallback para navegador (não deve acontecer no Electron)
        const blob = new Blob([JSON.stringify(analysis, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'relatorio_analise_rom.json';
        a.click();
        URL.revokeObjectURL(url);

    }
    
    this.hideAnalysisModal();
},

});

