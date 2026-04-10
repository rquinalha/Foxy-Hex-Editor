Object.assign(FoxyHexEditorComplete.prototype, {
forceUpdatePositionInput() {
const cursorPosEl = document.getElementById('cursor-position-input');
if (cursorPosEl) {
    cursorPosEl.value = this.formatOffset(this.cursorPosition, { includePrefix: false, useDisplayBase: true });
    cursorPosEl.classList.remove('error');

    const event = new Event('input', { bubbles: true });
    cursorPosEl.dispatchEvent(event);
}
},

goToPosition() {
const positionInput = document.getElementById('cursor-position-input');
if (!positionInput) return;

const inputValue = positionInput.value.trim();
if (!inputValue) return;

const parsed = this.parseOffsetInput(inputValue, { useDisplayBase: true });
if (!parsed.valid) {
positionInput.classList.add('error');
return;
}

if (parsed.realOffset < 0 || parsed.realOffset >= this.getDataLength()) {
positionInput.classList.add('error');
return;
}

this.setCursor(parsed.realOffset);
this.render();
this.updateStatus();
positionInput.classList.remove('error');
},

handlePositionInputEnter() {
const positionInput = document.getElementById('cursor-position-input');
if (!positionInput) return;

const inputValue = positionInput.value.trim();
if (!inputValue) {
    this.showPositionError('Digite um offset válido');
    return;
}

let parsedOffset;

if (inputValue.startsWith('0x') || inputValue.startsWith('0X')) {
    try {
        parsedOffset = Number(BigInt(inputValue));
    } catch (e) {
        this.showPositionError('Formato hexadecimal inválido');
        return;
    }
} else if (/^[0-9A-Fa-f]+$/.test(inputValue)) {
    try {
        parsedOffset = Number(BigInt('0x' + inputValue));
    } catch (e) {
        this.showPositionError('Formato hexadecimal inválido');
        return;
    }
} else if (/^\d+$/.test(inputValue)) {
    parsedOffset = parseInt(inputValue, 10);
} else {
    this.showPositionError('Formato de offset invalido. Use hex (1000 ou 0x1000) ou decimal explicito (0d4096)');
    return;
}

if (isNaN(parsedOffset) || parsedOffset < 0 || parsedOffset >= this.getDataLength()) {
    this.showPositionError(`Offset inválido. Range válido: 0x00000000 - 0x${(this.getDataLength() - 1).toString(16).toUpperCase()}`);
    return;
}

positionInput.classList.remove('error');
this.setCursor(parsedOffset, null, true);
this.navigateToOffset(parsedOffset);
this.updateStatus();
this.focusEditor();
// Mensagem removida - não notificar
},

showPositionError(message) {
const positionInput = document.getElementById('cursor-position-input');
if (positionInput) {
    positionInput.classList.add('error');
}

const notification = document.createElement('div');
notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #ff4757, #ff3742);
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    z-index: 10001;
    box-shadow: 0 4px 12px rgba(255, 71, 87, 0.3);
    animation: slideInRight 0.3s ease;
`;
notification.textContent = message;

document.body.appendChild(notification);

setTimeout(() => {
    if (notification.parentNode) {
        notification.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }
}, 3000);
},

showPositionSuccess(message) {
const notification = document.createElement('div');
notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #27ae60, #2ecc71);
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    z-index: 10001;
    box-shadow: 0 4px 12px rgba(39, 174, 96, 0.3);
    animation: slideInRight 0.3s ease;
`;
notification.textContent = message;

document.body.appendChild(notification);

setTimeout(() => {
    if (notification.parentNode) {
        notification.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }
}, 2000);
},

copyPositionValue() {
const positionInput = document.getElementById('cursor-position-input');
if (!positionInput) {
    this.showPositionError('Campo de posição não encontrado');
    return;
}

const positionValue = positionInput.value;
if (!positionValue || positionValue === '00000000') {
    this.showPositionError('Nenhuma posição válida para copiar');
    return;
}

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(positionValue).then(() => {
            const lang = (window.I18n && window.I18n.currentLang) || 'pt';
            const msg = lang === 'en' ? `Position ${positionValue} copied (Ctrl+C)` : `Posição ${positionValue} copiada (Ctrl+C)`;
            this.showPositionSuccess(msg);
        }).catch(() => {
        this.fallbackCopyPosition(positionValue);
    });
} else {
    this.fallbackCopyPosition(positionValue);
}
},

fallbackCopyPosition(text) {
const textarea = document.createElement('textarea');
textarea.value = text;
textarea.style.position = 'fixed';
textarea.style.left = '-9999px';
textarea.style.opacity = '0';
document.body.appendChild(textarea);
textarea.select();
document.execCommand('copy');
    document.body.removeChild(textarea);
    const lang = (window.I18n && window.I18n.currentLang) || 'pt';
    const msg = lang === 'en' ? `Position ${text} copied (Ctrl+C)` : `Posição ${text} copiada (Ctrl+C)`;
    this.showPositionSuccess(msg);
},

showPositionInputActive() {
const statusLeft = document.querySelector('.status-left');
if (statusLeft) {
    const indicator = document.createElement('span');
    indicator.id = 'position-input-indicator';
    indicator.style.cssText = `
        color: #ff6b35;
        font-weight: bold;
        margin-left: 8px;
        animation: pulse 1s infinite;
    `;
    indicator.textContent = '📋 Campo de Posição Ativo';
    statusLeft.appendChild(indicator);
}
},

hidePositionInputActive() {
const indicator = document.getElementById('position-input-indicator');
if (indicator) {
    indicator.remove();
}
},

showFindReplaceNotification() {
    // Notificação removida - não é necessário avisar que a janela foi aberta
},

showHighlightsManagementModal() {
    this.createHighlightsManagementModal();
},

pastePositionValue() {
const positionInput = document.getElementById('cursor-position-input');
if (!positionInput) {
    this.showPositionError('Campo de posição não encontrado');
    return;
}

if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.readText().then((text) => {
        this.processPastedPositionValue(text);
    }).catch(() => {
        this.fallbackPastePosition();
    });
} else {
    this.fallbackPastePosition();
}
},

fallbackPastePosition() {
const textarea = document.createElement('textarea');
textarea.style.position = 'fixed';
textarea.style.left = '-9999px';
textarea.style.opacity = '0';
document.body.appendChild(textarea);
textarea.focus();

const pasteEvent = new KeyboardEvent('keydown', {
    key: 'v',
    code: 'KeyV',
    ctrlKey: true,
    bubbles: true
});
textarea.dispatchEvent(pasteEvent);

setTimeout(() => {
    const pastedText = textarea.value;
    document.body.removeChild(textarea);
    this.processPastedPositionValue(pastedText);
}, 100);
},

processPastedPositionValue(text) {
const positionInput = document.getElementById('cursor-position-input');
if (!positionInput || !text) {
    this.showPositionError('Nenhum valor válido para colar');
    return;
}

const cleanText = text.trim().toUpperCase();
let processedValue = '';

if (cleanText.startsWith('0X')) {
    processedValue = cleanText.substring(2);
} else if (cleanText.match(/^[0-9A-F]+$/)) {
    processedValue = cleanText;
} else if (cleanText.match(/^\d+$/)) {
    const decimalValue = parseInt(cleanText, 10);
    if (!isNaN(decimalValue) && decimalValue >= 0) {
        processedValue = decimalValue.toString(16).toUpperCase();
    }
} else {
    this.showPositionError('Formato invalido. Use hex (1234 ou 0x1234) ou decimal explicito (0d4096)');
    return;
}

if (processedValue.length > 8) {
    this.showPositionError('Valor muito grande. Máximo: 0xFFFFFFFF');
    return;
}

processedValue = processedValue.padStart(8, '0');
positionInput.value = processedValue;
    positionInput.select();
    positionInput.focus();

    const lang = (window.I18n && window.I18n.currentLang) || 'pt';
    const msg = lang === 'en' ? `Value pasted: 0x${processedValue}` : `Valor colado: 0x${processedValue}`;
    this.showPositionSuccess(msg);
},

showCopySuccessNotification(text, panel, byteLength = null) {
    const lang = (window.I18n && window.I18n.currentLang) || 'pt';
    const isEn = lang === 'en';
    const panelText = panel === 'ascii' ? (isEn ? 'TEXT' : 'TEXTO') : 'HEX';
    const copiedText = isEn ? 'bytes copied' : 'bytes copiados';
    const preview = text.length > 50 ? text.substring(0, 50) + '...' : text;
    const escapedPreview = String(preview)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    const bytes = Number.isInteger(byteLength) ? byteLength : Math.ceil(text.length / (panel === 'ascii' ? 1 : 3));

    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #28a745, #20c997);
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10001;
        box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
        animation: slideInRight 0.3s ease;
        max-width: 300px;
    `;
    notification.innerHTML = `
        <div style="margin-bottom: 4px;">📋 ${bytes} ${copiedText} (${panelText})</div>
    <div style="font-size: 12px; opacity: 0.9; font-family: monospace;">${escapedPreview}</div>
`;

document.body.appendChild(notification);

setTimeout(() => {
    if (notification.parentNode) {
        notification.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }
}, 3000);
},

showAnalysisNavigationNotification(offset, length = 0) {
const lang = (window.I18n && window.I18n.currentLang) || 'pt';
const isEn = lang === 'en';

const notification = document.createElement('div');
notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #ff6b35, #f7931e);
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    z-index: 10001;
    box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
    animation: slideInRight 0.3s ease;
    max-width: 300px;
`;

const bytesSelectedText = isEn ? 'bytes selected' : 'bytes selecionados';
const navigatingText = isEn ? 'Navigating to String' : 'Navegando para String';
const selectionText = length > 0 ? ` (${length} ${bytesSelectedText})` : '';
notification.innerHTML = `
    <div style="margin-bottom: 4px;">🎯 ${navigatingText}${selectionText}</div>
    <div style="font-size: 12px; opacity: 0.9; font-family: monospace;">Offset: 0x${offset.toString(16).toUpperCase().padStart(8, '0')}</div>
`;

document.body.appendChild(notification);

setTimeout(() => {
    if (notification.parentNode) {
        notification.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }
}, 2000);
},

showAnalysisStatusIndicator(offset, length = 0) {
const lang = (window.I18n && window.I18n.currentLang) || 'pt';
const isEn = lang === 'en';
const statusLeft = document.querySelector('.status-left');
if (!statusLeft) return;

const existingIndicator = document.getElementById('analysis-navigation-indicator');
if (existingIndicator) {
    existingIndicator.remove();
}

const indicator = document.createElement('span');
indicator.id = 'analysis-navigation-indicator';
indicator.style.cssText = `
    background: linear-gradient(135deg, #ff6b35, #f7931e);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    margin-left: 8px;
    animation: pulse 1s ease-in-out;
`;

const analysisText = isEn ? 'Analysis' : 'Análise';
const selectionText = length > 0 ? ` (${length} bytes)` : '';
indicator.innerHTML = `📊 ${analysisText}: 0x${offset.toString(16).toUpperCase().padStart(8, '0')}${selectionText}`;

statusLeft.appendChild(indicator);

setTimeout(() => {
    if (indicator.parentNode) {
        indicator.style.animation = 'fadeOut 0.5s ease forwards';
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.remove();
            }
        }, 500);
    }
}, 3000);
},

navigateToOffsetFromAnalysis(offset, length = 0) {
const validOffset = Math.max(0, Math.min(offset, this.getDataLength() - 1));

if (length > 0) {
    const selectionEnd = Math.min(validOffset + length - 1, this.getDataLength() - 1);
    this.setSelection(validOffset, selectionEnd);
}

this.setCursor(validOffset, 'ascii', true);
this.navigateToOffset(validOffset);
this.ensureCursorVisible();
this.focusEditor();

setTimeout(() => {
    this.completeRenderWithColors(this.currentScrollPercent, true);
}, 50);
},

goToPosition() {
const positionInput = document.getElementById('cursor-position-input');
if (!positionInput) return;

const inputValue = positionInput.value.trim();
if (!inputValue) return;

const parsed = this.parseOffsetInput(inputValue, { useDisplayBase: true });
if (!parsed.valid) {
positionInput.classList.add('error');
return;
}

if (parsed.realOffset < 0 || parsed.realOffset >= this.getDataLength()) {
positionInput.classList.add('error');
return;
}

this.setCursor(parsed.realOffset);
this.render();
this.updateStatus();
positionInput.classList.remove('error');
},

handlePositionInputEnter() {
const positionInput = document.getElementById('cursor-position-input');
if (!positionInput) return;

const inputValue = positionInput.value.trim();
if (!inputValue) {
    this.showPositionError('Digite um offset valido');
    return;
}

const parsed = this.parseOffsetInput(inputValue, { useDisplayBase: true });
if (!parsed.valid) {
    this.showPositionError(parsed.error);
    return;
}

if (parsed.realOffset < 0 || parsed.realOffset >= this.getDataLength()) {
    this.showPositionError(`Offset invalido. Range valido: ${this.formatOffsetRange(0, this.getDataLength() - 1, { useDisplayBase: true })}`);
    return;
}

positionInput.classList.remove('error');
this.setCursor(parsed.realOffset, null, true);
this.navigateToOffset(parsed.realOffset);
this.updateStatus();
this.focusEditor();
},

processPastedPositionValue(text) {
const positionInput = document.getElementById('cursor-position-input');
if (!positionInput || !text) {
    this.showPositionError('Nenhum valor valido para colar');
    return;
}

const cleanText = text.trim();
const parsed = this.parseOffsetInput(cleanText, { useDisplayBase: true });

if (!parsed.valid) {
    this.showPositionError('Formato invalido. Use hex (1234 ou 0x1234) ou decimal explicito (0d4096)');
    return;
}

positionInput.value = this.formatOffset(parsed.realOffset, { includePrefix: false, useDisplayBase: true });
positionInput.select();
positionInput.focus();

const lang = (window.I18n && window.I18n.currentLang) || 'pt';
const msg = lang === 'en'
    ? `Value pasted: ${positionInput.value}`
    : `Valor colado: ${positionInput.value}`;
this.showPositionSuccess(msg);
}
});
