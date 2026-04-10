class HexCalculator {
    constructor() {
        this.currentValue = '0';
        this.previousValue = null;
        this.operator = null;
        this.waitingForOperand = false;
        this.display = null;
        this.history = null;
        this.modeIndicator = null;
        this.historyList = null;
        this.isDecimalMode = false; // Novo: controla se estamos em modo decimal ou hex
        this.operationHistory = []; // Array para armazenar o histórico de operações
        
        this.init();
    }
    
    init() {
        this.display = document.getElementById('hex-calc-display');
        this.history = document.getElementById('hex-calc-history');
        this.modeIndicator = document.getElementById('hex-calc-mode-indicator');
        this.historyList = document.getElementById('hex-calc-history-list');
        
        // Garantir que o valor inicial está correto
        this.currentValue = '0';
        this.isDecimalMode = false; // Iniciar em modo hexadecimal
        
        this.updateDisplay();
        this.setupDisplayEvents();
        this.updateHistoryDisplay();
        
        // Forçar atualização inicial do histórico
        if (this.history) {
            this.history.textContent = 'Decimal: 0';
        }
    }
    
    updateDisplay() {
        if (this.display) {
            this.display.value = this.currentValue;
        }
        if (this.modeIndicator) {
            this.modeIndicator.textContent = this.isDecimalMode ? 'DEC' : 'HEX';
            this.modeIndicator.style.background = this.isDecimalMode ? '#4CAF50' : '#ff6b35';
        }
        if (this.history) {
            // Melhorar a exibição do histórico para suportar tanto hex quanto decimal
            if (this.isDecimalMode) {
                // Se estamos em modo decimal, mostrar o valor hex equivalente
                const decimalValue = parseInt(this.currentValue, 10);
                if (!isNaN(decimalValue)) {
                    const hexValue = decimalValue.toString(16).toUpperCase();
                    this.history.textContent = `Hex: 0x${hexValue}`;
                } else {
                    this.history.textContent = 'Hex: Inválido';
                }
            } else {
                // Se estamos em modo hex, mostrar o valor decimal
                const decimalValue = parseInt(this.currentValue, 16);
                if (!isNaN(decimalValue)) {
                    this.history.textContent = `Decimal: ${decimalValue}`;
                } else {
                    this.history.textContent = 'Decimal: Inválido';
                }
            }
        }
    }
    
    setupDisplayEvents() {
        if (this.display) {
            // Permitir seleção e cópia
            this.display.addEventListener('click', () => {
                this.display.select();
            });
            
            // Permitir colar valores
            this.display.addEventListener('paste', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const pastedText = (e.clipboardData || window.clipboardData).getData('text');
                this.processPastedValue(pastedText);
            });
            
            // Permitir entrada manual (dígitos decimais e hex)
            this.display.addEventListener('input', (e) => {
                e.stopPropagation();
                const value = e.target.value;
                
                // Detectar se é decimal ou hex baseado no conteúdo
                if (/[A-Fa-f]/.test(value)) {
                    // Contém letras hex, filtrar apenas caracteres hex válidos
                    const filteredValue = value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
                    if (filteredValue !== value.toUpperCase()) {
                        e.target.value = filteredValue;
                    }
                    this.currentValue = filteredValue || '0';
                    this.isDecimalMode = false;
                } else {
                    // Apenas números, tratar como decimal
                    const filteredValue = value.replace(/[^0-9]/g, '');
                    if (filteredValue !== value) {
                        e.target.value = filteredValue;
                    }
                    this.currentValue = filteredValue || '0';
                    this.isDecimalMode = true;
                }
                
                this.updateDisplay();
            });
            
            // Permitir teclas especiais
            this.display.addEventListener('keydown', (e) => {
                e.stopPropagation();
                switch (e.key) {
                    case 'Enter':
                        e.preventDefault();
                        this.calculate();
                        break;
                    case 'Escape':
                        e.preventDefault();
                        this.clearEntry();
                        break;
                    case 'Backspace':
                        e.preventDefault();
                        this.backspace();
                        break;
                    case 'Delete':
                        e.preventDefault();
                        this.clearEntry();
                        break;
                }
            });
            
            // Interceptar Ctrl+C e Ctrl+V globalmente quando o display está focado
            this.display.addEventListener('focus', () => {
                this.isDisplayFocused = true;
                this.setupGlobalShortcuts();
            });
            
                         this.display.addEventListener('blur', () => {
                 this.isDisplayFocused = false;
                 this.removeGlobalShortcuts();
                 
                 // NÃO adicionar ao histórico quando o usuário termina de digitar (apenas cálculos)
             });
        }
    }
    
    setupGlobalShortcuts() {
        // Remover handlers existentes
        this.removeGlobalShortcuts();
        
        // Adicionar handler global para Ctrl+C e Ctrl+V
        this.globalShortcutHandler = (e) => {
            if (!this.isDisplayFocused) return;
            
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'c':
                        e.preventDefault();
                        e.stopPropagation();
                        this.copyToClipboard();
                        break;
                    case 'v':
                        e.preventDefault();
                        e.stopPropagation();
                        this.pasteFromClipboard();
                        break;
                }
            }
        };
        
        document.addEventListener('keydown', this.globalShortcutHandler, true);
    }
    
    removeGlobalShortcuts() {
        if (this.globalShortcutHandler) {
            document.removeEventListener('keydown', this.globalShortcutHandler, true);
            this.globalShortcutHandler = null;
        }
    }
    
    destroy() {
        // Limpar handlers globais
        this.removeGlobalShortcuts();
        this.isDisplayFocused = false;
    }
    
    appendDigit(digit) {
        // Verificar se o dígito é válido para o modo atual
        if (this.isDecimalMode) {
            // Em modo decimal, aceitar apenas 0-9
            if (!/^[0-9]$/.test(digit)) {
                this.showNotification('Em modo decimal, use apenas dígitos 0-9!');
                return;
            }
        } else {
            // Em modo hex, aceitar 0-9 e A-F
            if (!/^[0-9A-Fa-f]$/.test(digit)) {
                this.showNotification('Em modo hexadecimal, use dígitos 0-9 ou A-F!');
                return;
            }
            digit = digit.toUpperCase(); // Converter para maiúscula
        }
        
        if (this.waitingForOperand) {
            this.currentValue = digit;
            this.waitingForOperand = false;
        } else {
            if (this.currentValue === '0') {
                this.currentValue = digit;
            } else {
                this.currentValue += digit;
            }
        }
        this.updateDisplay();
    }
    
    appendValue(value) {
        // Verificar se o valor é válido para o modo atual
        if (this.isDecimalMode) {
            // Em modo decimal, aceitar apenas 0-9
            if (!/^[0-9]+$/.test(value)) {
                this.showNotification('Em modo decimal, use apenas dígitos 0-9!');
                return;
            }
        } else {
            // Em modo hex, aceitar 0-9 e A-F
            if (!/^[0-9A-Fa-f]+$/.test(value)) {
                this.showNotification('Em modo hexadecimal, use dígitos 0-9 ou A-F!');
                return;
            }
            value = value.toUpperCase(); // Converter para maiúscula
        }
        
        if (this.waitingForOperand) {
            this.currentValue = value;
            this.waitingForOperand = false;
        } else {
            if (this.currentValue === '0') {
                this.currentValue = value;
            } else {
                this.currentValue += value;
            }
        }
        
                 // NÃO adicionar ao histórico para valores especiais (apenas cálculos)
        
        this.updateDisplay();
    }
    
    clear() {
        this.currentValue = '0';
        this.previousValue = null;
        this.operator = null;
        this.waitingForOperand = false;
        this.isDecimalMode = false; // Resetar para modo hex padrão
        this.updateDisplay();
    }
    
    clearEntry() {
        this.currentValue = '0';
        this.waitingForOperand = false;
        // Manter o modo atual (decimal ou hex)
        this.updateDisplay();
    }
    
    backspace() {
        if (this.currentValue.length > 1) {
            this.currentValue = this.currentValue.slice(0, -1);
        } else {
            this.currentValue = '0';
        }
        this.updateDisplay();
    }
    
    setOperator(operator) {
        const inputValue = this.isDecimalMode ? 
            parseInt(this.currentValue, 10) : 
            parseInt(this.currentValue, 16);
        
        if (isNaN(inputValue)) {
            this.showNotification('Erro: Valor inválido para operação!');
            return;
        }
        
        if (this.previousValue === null) {
            this.previousValue = inputValue;
        } else if (this.operator) {
            const result = this.performCalculation();
            // Manter o resultado no modo atual
            this.currentValue = this.isDecimalMode ? 
                result.toString() : 
                result.toString(16).toUpperCase();
            this.previousValue = result;
        }
        
        this.waitingForOperand = true;
        this.operator = operator;
        this.updateDisplay();
    }
    
    calculate() {
        if (this.previousValue === null || this.operator === null) {
            return;
        }
        
        // Capturar o segundo valor ANTES de fazer o cálculo
        const secondValue = this.isDecimalMode ? 
            parseInt(this.currentValue, 10) : 
            parseInt(this.currentValue, 16);
        
        const result = this.performCalculation();
        // Manter o resultado no modo atual
        this.currentValue = this.isDecimalMode ? 
            result.toString() : 
            result.toString(16).toUpperCase();
        
        // Adicionar ao histórico com formato correto baseado no modo
        let operation;
        if (this.isDecimalMode) {
            // Modo decimal: mostrar em decimal
            operation = `${this.previousValue} ${this.operator} ${secondValue} = ${result}`;
        } else {
            // Modo hex: mostrar em hex
            const prevHex = this.previousValue.toString(16).toUpperCase();
            const secHex = secondValue.toString(16).toUpperCase();
            const resultHex = result.toString(16).toUpperCase();
            operation = `${prevHex} ${this.operator} ${secHex} = ${resultHex}`;
        }
        
        this.addToHistory(operation, this.currentValue, this.isDecimalMode ? 'DEC' : 'HEX');
        
        this.previousValue = null;
        this.operator = null;
        this.waitingForOperand = true;
        this.updateDisplay();
    }
    
    performCalculation() {
        const inputValue = this.isDecimalMode ? 
            parseInt(this.currentValue, 10) : 
            parseInt(this.currentValue, 16);
        const previousValue = this.previousValue;
        
        if (isNaN(inputValue)) {
            this.showNotification('Erro: Valor inválido para cálculo!');
            return previousValue;
        }
        
        switch (this.operator) {
            case '+':
                return previousValue + inputValue;
            case '-':
                return previousValue - inputValue;
            case '*':
                return previousValue * inputValue;
            case '/':
                if (inputValue === 0) {
                    this.showNotification('Erro: Divisão por zero!');
                    return previousValue;
                }
                return Math.floor(previousValue / inputValue);
            default:
                return inputValue;
        }
    }
    
    convertToDecimal() {
        try {
            // Se já estamos em modo decimal, não fazer nada
            if (this.isDecimalMode) {
                this.showNotification('Já está em modo decimal!');
                return;
            }
            
            // Verificar se o valor atual é válido
            if (!this.isValidValue()) {
                this.showNotification('Erro: Valor hexadecimal inválido!');
                return;
            }
            
            // Converter de hex para decimal
            const decimalValue = parseInt(this.currentValue, 16);
            const oldValue = this.currentValue;
            this.currentValue = decimalValue.toString();
            this.isDecimalMode = true;
            
            // NÃO adicionar ao histórico (apenas conversões, não cálculos)
            
            this.updateDisplay();
            this.showNotification('Convertido para decimal!');
        } catch (error) {
            this.showNotification('Erro na conversão para decimal!');
        }
    }
    
    convertToHex() {
        try {
            // Se já estamos em modo hex, não fazer nada
            if (!this.isDecimalMode) {
                this.showNotification('Já está em modo hexadecimal!');
                return;
            }
            
            // Verificar se o valor atual é válido
            if (!this.isValidValue()) {
                this.showNotification('Erro: Valor decimal inválido!');
                return;
            }
            
            // Converter de decimal para hex
            const decimalValue = parseInt(this.currentValue, 10);
            const oldValue = this.currentValue;
            this.currentValue = decimalValue.toString(16).toUpperCase();
            this.isDecimalMode = false;
            
            // NÃO adicionar ao histórico (apenas conversões, não cálculos)
            
            this.updateDisplay();
            this.showNotification('Convertido para hexadecimal!');
        } catch (error) {
            this.showNotification('Erro na conversão para hexadecimal!');
        }
    }
    
    // Método para alternar entre modos (útil para atalhos de teclado)
    toggleMode() {
        if (this.isDecimalMode) {
            this.convertToHex();
        } else {
            this.convertToDecimal();
        }
    }
    
    // Método para validar se o valor atual é válido no modo atual
    isValidValue() {
        if (this.isDecimalMode) {
            return /^[0-9]+$/.test(this.currentValue) && !isNaN(parseInt(this.currentValue, 10));
        } else {
            return /^[0-9A-Fa-f]+$/.test(this.currentValue) && !isNaN(parseInt(this.currentValue, 16));
        }
    }
    
    // Método para adicionar entrada ao histórico
    addToHistory(operation, result, mode) {
        const historyEntry = {
            id: Date.now() + Math.random(),
            operation: operation,
            result: result,
            mode: mode,
            resultHex: this.isDecimalMode ? parseInt(result, 10).toString(16).toUpperCase() : result,
            resultDec: this.isDecimalMode ? result : parseInt(result, 16).toString()
        };
        
        this.operationHistory.unshift(historyEntry); // Adicionar no início
        
        // Manter apenas os últimos 50 itens
        if (this.operationHistory.length > 50) {
            this.operationHistory = this.operationHistory.slice(0, 50);
        }
        
        this.updateHistoryDisplay();
    }
    
    // Método para atualizar a exibição do histórico
    updateHistoryDisplay() {
        if (!this.historyList) return;
        
        if (this.operationHistory.length === 0) {
            this.historyList.innerHTML = '<div style="color: #a0a9c0; text-align: center; font-style: italic;">Nenhuma operação ainda</div>';
            return;
        }
        
        const historyHTML = this.operationHistory.map(entry => {
            const resultHex = entry.resultHex || '0';
            const resultDec = entry.resultDec || '0';
            
            return `
                <div class="history-entry" data-entry-id="${entry.id}" style="margin-bottom: 8px; padding: 6px; border-radius: 4px; background: rgba(255, 255, 255, 0.05); cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(255, 255, 255, 0.1)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.05)'">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span style="color: #4CAF50; font-size: 12px;">${entry.mode}</span>
                    </div>
                    <div style="color: #a0a9c0; font-size: 12px; margin-bottom: 4px;">${entry.operation}</div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #ff6b35; font-weight: bold; font-size: 14px;" onclick="hexEditor.hexCalculator.copyFromHistory('${entry.id}', 'hex')" title="Copiar valor Hex">0x${resultHex}</span>
                        <span style="color: #4CAF50; font-weight: bold; font-size: 14px;" onclick="hexEditor.hexCalculator.copyFromHistory('${entry.id}', 'dec')" title="Copiar valor Decimal">${resultDec}</span>
                    </div>
                </div>
            `;
        }).join('');
        
        this.historyList.innerHTML = historyHTML;
    }
    
    // Método para copiar valor do histórico
    copyFromHistory(entryId, type) {
        const entry = this.operationHistory.find(e => e.id.toString() === entryId);
        if (!entry) return;
        
        let valueToCopy = '';
        if (type === 'hex') {
            valueToCopy = entry.resultHex || '0';
        } else if (type === 'dec') {
            valueToCopy = entry.resultDec || '0';
        }
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(valueToCopy).then(() => {
                this.showNotification(`Valor ${type === 'hex' ? 'hexadecimal' : 'decimal'} copiado: ${valueToCopy}`);
            }).catch(() => {
                this.fallbackCopy(valueToCopy);
            });
        } else {
            this.fallbackCopy(valueToCopy);
        }
    }
    
    // Método para limpar o histórico
    clearHistory() {
        this.operationHistory = [];
        this.updateHistoryDisplay();
        this.showNotification('Histórico limpo!');
    }
    
    // Método para exportar o histórico
    exportHistory() {
        if (this.operationHistory.length === 0) {
            this.showNotification('Nenhum histórico para exportar!');
            return;
        }
        
        const historyText = this.operationHistory.map(entry => {
            const resultHex = entry.resultHex || '0';
            const resultDec = entry.resultDec || '0';
            return `${entry.mode} | ${entry.operation} | Hex: 0x${resultHex} | Dec: ${resultDec}`;
        }).join('\n');
        
        const fullText = `=== Histórico da Calculadora Hexadecimal ===\n${historyText}`;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(fullText).then(() => {
                this.showNotification('Histórico exportado para a área de transferência!');
            }).catch(() => {
                this.fallbackCopy(fullText);
            });
        } else {
            this.fallbackCopy(fullText);
        }
    }
    
    copyToClipboard() {
        // Se o display está focado, copiar o texto selecionado ou todo o valor
        if (this.isDisplayFocused && this.display) {
            const selectedText = this.display.value.substring(this.display.selectionStart, this.display.selectionEnd);
            const textToCopy = selectedText || this.currentValue;
            
            if (navigator.clipboard) {
                navigator.clipboard.writeText(textToCopy).then(() => {
                    this.showNotification('Valor copiado para a área de transferência!');
                }).catch(() => {
                    this.fallbackCopy(textToCopy);
                });
            } else {
                this.fallbackCopy(textToCopy);
            }
        } else {
            // Copiar o valor atual
            const text = this.currentValue;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text).then(() => {
                    this.showNotification('Valor copiado para a área de transferência!');
                }).catch(() => {
                    this.fallbackCopy(text);
                });
            } else {
                this.fallbackCopy(text);
            }
        }
    }
    
    pasteFromClipboard() {
        if (navigator.clipboard) {
            navigator.clipboard.readText().then(text => {
                this.processPastedValue(text);
                // Se o display está focado, inserir o valor no campo
                if (this.isDisplayFocused && this.display) {
                    this.display.focus();
                }
            }).catch(() => {
                this.showNotification('Erro ao acessar a área de transferência!');
            });
        } else {
            this.showNotification('Área de transferência não suportada neste navegador!');
        }
    }
    
    fallbackCopy(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            this.showNotification('Valor copiado para a área de transferência!');
        } catch (err) {
            this.showNotification('Erro ao copiar valor!');
        }
        document.body.removeChild(textArea);
    }
    
    processPastedValue(text) {
        // Remover espaços e caracteres especiais, mas manter dígitos decimais e hex
        const cleanText = text.replace(/[^0-9A-Fa-f]/g, '');
        
        if (cleanText.length === 0) {
            this.showNotification('Nenhum valor válido encontrado!');
            return;
        }
        
        // Verificar se é um valor hexadecimal válido (contém A-F)
        if (/[A-Fa-f]/.test(cleanText)) {
            // É hexadecimal
            this.currentValue = cleanText.toUpperCase();
            this.isDecimalMode = false;
            this.waitingForOperand = false;
            
                         // NÃO adicionar ao histórico (apenas cálculos)
            
            this.updateDisplay();
            this.showNotification('Valor hexadecimal colado com sucesso!');
        } else if (/^[0-9]+$/.test(cleanText)) {
            // É decimal
            this.currentValue = cleanText;
            this.isDecimalMode = true;
            this.waitingForOperand = false;
            
                         // NÃO adicionar ao histórico (apenas cálculos)
            
            this.updateDisplay();
            this.showNotification('Valor decimal colado com sucesso!');
        } else {
            this.showNotification('Valor inválido! Use apenas dígitos (0-9) ou hexadecimais (0-9, A-F)');
        }
    }
    
    showNotification(message) {
        // Criar notificação temporária
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #ff6b35, #f7931e);
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            z-index: 10001;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            animation: slideInRight 0.3s ease-out;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 2000);
    }
    
    // Método para processar teclas de atalho
    handleKeyPress(key) {
        // Dígitos (decimais e hexadecimais)
        if (/^[0-9A-Fa-f]$/.test(key)) {
            this.appendDigit(key);
            return true;
        }
        
        // Operadores
        switch (key) {
            case '+':
            case '-':
            case '*':
            case '/':
                this.setOperator(key);
                return true;
                
            case '=':
            case 'Enter':
                this.calculate();
                return true;
                
            case 'Escape':
                // Fechar modal - será tratado pelo main.js
                return false;
                
            case 'Backspace':
                this.backspace();
                return true;
                
            case 'Delete':
                this.clearEntry();
                return true;
                
            case 'c':
            case 'C':
                this.copyToClipboard();
                return true;
                
            case 'v':
            case 'V':
                this.pasteFromClipboard();
                return true;
                
            case 'Tab':
                this.toggleMode();
                return true;
        }
        
        return false;
    }
}

// Adicionar estilos de animação se não existirem
if (!document.querySelector('#hex-calc-animations')) {
    const style = document.createElement('style');
    style.id = 'hex-calc-animations';
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
} 