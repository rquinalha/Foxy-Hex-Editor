const { ipcRenderer } = require('electron');

class HexCalculatorRenderer {
    constructor() {
        this.currentValue = '0';
        this.previousValue = null;
        this.operator = null;
        this.waitingForOperand = false;
        this.isDecimalMode = false;
        this.operationHistory = [];

        this.display = document.getElementById('hex-calc-display');
        this.historyLabel = document.getElementById('hex-calc-history');
        this.modeIndicator = document.getElementById('hex-calc-mode-indicator');
        this.historyList = document.getElementById('hex-calc-history-list');

        this.init();
    }

    init() {
        this.updateDisplay();
        this.bindKeys();
    }

    bindKeys() {
        window.addEventListener('keydown', (e) => {
            const key = e.key;
            
            if (/[0-9A-Fa-f]/.test(key) && key.length === 1) {
                this.appendDigit(key);
            } else if (['+', '-', '*', '/'].includes(key)) {
                this.setOperator(key);
            } else if (key === 'Enter' || key === '=') {
                this.calculate();
            } else if (key === 'Backspace') {
                this.backspace();
            } else if (key === 'Escape') {
                this.clear();
            } else if (key === 'Tab') {
                e.preventDefault();
                this.toggleMode();
            }
        });
    }

    updateDisplay() {
        if (this.display) this.display.value = this.currentValue;
        if (this.modeIndicator) {
            this.modeIndicator.textContent = this.isDecimalMode ? 'DEC' : 'HEX';
            this.modeIndicator.style.background = this.isDecimalMode ? '#4CAF50' : '#ff6b35';
        }
        if (this.historyLabel) {
            if (this.isDecimalMode) {
                const decimalValue = parseInt(this.currentValue, 10);
                this.historyLabel.textContent = isNaN(decimalValue) ? 'Hex: Inválido' : `Hex: 0x${decimalValue.toString(16).toUpperCase()}`;
            } else {
                const decimalValue = parseInt(this.currentValue, 16);
                this.historyLabel.textContent = isNaN(decimalValue) ? 'Decimal: Inválido' : `Decimal: ${decimalValue}`;
            }
        }
    }

    appendDigit(digit) {
        if (this.isDecimalMode && !/^[0-9]$/.test(digit)) return;
        if (!this.isDecimalMode && !/^[0-9A-Fa-f]$/.test(digit)) return;

        if (this.waitingForOperand) {
            this.currentValue = digit.toUpperCase();
            this.waitingForOperand = false;
        } else {
            this.currentValue = this.currentValue === '0' ? digit.toUpperCase() : this.currentValue + digit.toUpperCase();
        }
        this.updateDisplay();
    }

    appendValue(value) {
        if (this.waitingForOperand) {
            this.currentValue = value.toUpperCase();
            this.waitingForOperand = false;
        } else {
            this.currentValue = this.currentValue === '0' ? value.toUpperCase() : this.currentValue + value.toUpperCase();
        }
        this.updateDisplay();
    }

    clear() {
        this.currentValue = '0';
        this.previousValue = null;
        this.operator = null;
        this.waitingForOperand = false;
        this.updateDisplay();
    }

    clearEntry() {
        this.currentValue = '0';
        this.updateDisplay();
    }

    backspace() {
        this.currentValue = this.currentValue.length > 1 ? this.currentValue.slice(0, -1) : '0';
        this.updateDisplay();
    }

    setOperator(operator) {
        const value = parseInt(this.currentValue, this.isDecimalMode ? 10 : 16);
        if (isNaN(value)) return;

        if (this.previousValue === null) {
            this.previousValue = value;
        } else if (this.operator) {
            const result = this.performCalculation();
            this.previousValue = result;
            this.currentValue = result.toString(this.isDecimalMode ? 10 : 16).toUpperCase();
        }

        this.operator = operator;
        this.waitingForOperand = true;
        this.updateDisplay();
    }

    calculate() {
        if (this.previousValue === null || !this.operator) return;

        const secondValue = parseInt(this.currentValue, this.isDecimalMode ? 10 : 16);
        const result = this.performCalculation();
        
        const prevStr = this.previousValue.toString(this.isDecimalMode ? 10 : 16).toUpperCase();
        const secondStr = secondValue.toString(this.isDecimalMode ? 10 : 16).toUpperCase();
        const resultStr = result.toString(this.isDecimalMode ? 10 : 16).toUpperCase();
        
        this.addToHistory(`${prevStr} ${this.operator} ${secondStr} = ${resultStr}`, resultStr);

        this.currentValue = resultStr;
        this.previousValue = null;
        this.operator = null;
        this.waitingForOperand = true;
        this.updateDisplay();
    }

    performCalculation() {
        const secondValue = parseInt(this.currentValue, this.isDecimalMode ? 10 : 16);
        switch (this.operator) {
            case '+': return this.previousValue + secondValue;
            case '-': return this.previousValue - secondValue;
            case '*': return this.previousValue * secondValue;
            case '/': return secondValue === 0 ? this.previousValue : Math.floor(this.previousValue / secondValue);
            default: return secondValue;
        }
    }

    toggleMode() {
        if (this.isDecimalMode) this.convertToHex();
        else this.convertToDecimal();
    }

    convertToDecimal() {
        const val = parseInt(this.currentValue, 16);
        if (!isNaN(val)) {
            this.currentValue = val.toString(10);
            this.isDecimalMode = true;
            this.updateDisplay();
        }
    }

    convertToHex() {
        const val = parseInt(this.currentValue, 10);
        if (!isNaN(val)) {
            this.currentValue = val.toString(16).toUpperCase();
            this.isDecimalMode = false;
            this.updateDisplay();
        }
    }

    addToHistory(op, res) {
        this.operationHistory.unshift({ op, res, mode: this.isDecimalMode ? 'DEC' : 'HEX' });
        this.operationHistory = this.operationHistory.slice(0, 20);
        this.updateHistoryUI();
    }

    updateHistoryUI() {
        if (!this.historyList) return;
        this.historyList.innerHTML = this.operationHistory.map(h => `
            <div style="margin-bottom: 6px; padding: 6px; background: rgba(255,255,255,0.05); border-radius: 4px; font-size: 11px;">
                <div style="color: #ff6b35; margin-bottom: 2px;">${h.mode}: ${h.op}</div>
                <div style="color: #4CAF50; font-weight: bold; cursor: pointer;" onclick="calc.copyValue('${h.res}')">Resultado: ${h.res}</div>
            </div>
        `).join('') || '<div style="color: #a0a9c0; text-align: center; font-style: italic;">Nenhuma operação</div>';
    }

    copyValue(v) {
        const { clipboard } = require('electron');
        clipboard.writeText(v);
        // Feedback visual
        const originalText = this.display.value;
        this.display.value = "COPIADO!";
        setTimeout(() => this.display.value = originalText, 500);
    }

    copyToClipboard() {
        const { clipboard } = require('electron');
        clipboard.writeText(this.currentValue);
    }

    pasteFromClipboard() {
        const { clipboard } = require('electron');
        const text = clipboard.readText();
        const clean = text.replace(/[^0-9A-Fa-f]/g, '');
        if (clean) {
            this.currentValue = clean.toUpperCase();
            this.isDecimalMode = /[A-Fa-f]/.test(clean) ? false : this.isDecimalMode;
            this.updateDisplay();
        }
    }

    clearHistory() {
        this.operationHistory = [];
        this.updateHistoryUI();
    }

    async exportHistory() {
        if (this.operationHistory.length === 0) {
            window.showWarning?.('Não há histórico para exportar.', 'Aviso');
            return;
        }

        let content = "=== FOXY HEX EDITOR - HISTÓRICO DA CALCULADORA ===\n\n";
        this.operationHistory.forEach((h, index) => {
            content += `[${h.mode}] ${h.op}\n`;
        });

        try {
            const saveResult = await ipcRenderer.invoke('show-save-dialog', {
                title: 'Exportar Histórico',
                defaultPath: 'historico_calculadora.txt',
                filters: [{ name: 'Arquivo de Texto', extensions: ['txt'] }]
            });

            if (saveResult && !saveResult.canceled && saveResult.filePath) {
                const writeResult = await ipcRenderer.invoke('write-file-direct', {
                    filePath: saveResult.filePath,
                    data: Array.from(Buffer.from(content, 'utf8'))
                });

                if (writeResult.success) {
                    window.showSuccess?.('Histórico exportado com sucesso!', 'Sucesso');
                } else {
                    window.showError?.('Erro ao exportar histórico: ' + writeResult.error, 'Erro');
                }
            }
        } catch (error) {
            console.error('Erro ao exportar:', error);
            window.showError?.('Erro ao abrir diálogo de salvamento.', 'Erro');
        }
    }
}

const calc = new HexCalculatorRenderer();
window.calc = calc;
