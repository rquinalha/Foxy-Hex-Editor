/**
 * Renderer Process para a janela de "Ir para Offset"
 */

const { ipcRenderer } = require('electron');

const offsetInput = document.getElementById('offset-input');
const fileSizeDisplay = document.getElementById('file-size');
const currentOffsetDisplay = document.getElementById('current-offset');
const validRangeDisplay = document.getElementById('valid-range');
const offsetBaseDisplay = document.getElementById('offset-base');
const errorMsg = document.getElementById('error-msg');
const gotoBtn = document.getElementById('goto-btn');
const cancelBtn = document.getElementById('cancel-btn');

let state = {
    fileSize: 0,
    currentOffset: 0,
    offsetBase: 0,
    validRange: '0x00000000 - 0x00000000'
};

// Sincronização inicial
ipcRenderer.on('update-goto-state', (event, data) => {
    state = { ...state, ...data };
    
    // Feedback de erro se existir
    if (data.error && errorMsg) {
        errorMsg.textContent = data.error;
        errorMsg.style.display = 'block';
        offsetInput.classList.add('error');
        setTimeout(() => {
            errorMsg.style.display = 'none';
            offsetInput.classList.remove('error');
        }, 3000);
    }
    
    updateUI();
});

function updateUI() {
    if (fileSizeDisplay) {
        const sizeText = `${state.fileSize.toLocaleString()} bytes`;
        fileSizeDisplay.textContent = sizeText;
    }
    if (currentOffsetDisplay) {
        const currentDisplay = state.currentOffset + state.offsetBase;
        const currentHex = currentDisplay.toString(16).toUpperCase();
        currentOffsetDisplay.textContent = `0x${currentHex.padStart(Math.max(8, currentHex.length), '0')}`;
    }
    if (validRangeDisplay) {
        const rangeStart = state.offsetBase;
        const rangeEnd = Math.max(state.offsetBase, state.offsetBase + Math.max(0, state.fileSize - 1));
        validRangeDisplay.textContent = `0x${rangeStart.toString(16).toUpperCase().padStart(8, '0')} - 0x${rangeEnd.toString(16).toUpperCase().padStart(8, '0')}`;
    }
    if (offsetBaseDisplay) {
        const baseHex = state.offsetBase.toString(16).toUpperCase();
        offsetBaseDisplay.textContent = `0x${baseHex.padStart(Math.max(8, baseHex.length), '0')}`;
    }
}

// Ações
function performGoTo() {
    const value = offsetInput.value.trim();
    if (!value) return;

    // Validar se o offset está no range antes de enviar
    // O backend validará novamente, mas é bom dar feedback local
    ipcRenderer.send('goto-action', { offsetText: value });
}

// Event Listeners
gotoBtn.addEventListener('click', performGoTo);

cancelBtn.addEventListener('click', () => {
    ipcRenderer.send('close-goto-window');
});

offsetInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        performGoTo();
    } else if (e.key === 'Escape') {
        ipcRenderer.send('close-goto-window');
    }
});

// Mensagens de erro do processo principal
ipcRenderer.on('goto-error', (event, message) => {
    if (errorMsg) {
        errorMsg.textContent = message;
        errorMsg.style.display = 'block';
        offsetInput.classList.add('error');
        
        setTimeout(() => {
            errorMsg.style.display = 'none';
            offsetInput.classList.remove('error');
        }, 3000);
    }
});

// Focar o input ao carregar
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => offsetInput.focus(), 100);
});
