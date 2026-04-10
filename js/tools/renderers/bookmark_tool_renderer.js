// 🎯 Bookmark Tool Renderer - Comunicação com processo principal
const { ipcRenderer } = require('electron');

// Estado inicial recebido do processo principal
let initialState = null;
let editingBookmarkId = null;

// Elementos do DOM
const titleInput = document.getElementById('bookmark-title');
const commentInput = document.getElementById('bookmark-comment');
const offsetDisplay = document.getElementById('bookmark-offset');

// Inicialização
ipcRenderer.on('init-bookmark-window', (event, state) => {
    initialState = state;
    
    // Guardar ID se estiver editando
    if (state.id !== undefined && state.id !== null) {
        editingBookmarkId = state.id;
        // Atualizar título da janela
        document.title = 'Editar Favorito - Foxy Hex Editor';
        const header = document.querySelector('.header');
        if (header) {
            header.textContent = '✏️ Editar Favorito';
        }
        // Atualizar texto do botão
        const addButton = document.querySelector('button.primary');
        if (addButton) {
            addButton.innerHTML = '💾 Salvar Favorito';
        }
    }
    
    // Preencher o offset
    if (state.offset !== undefined) {
        offsetDisplay.textContent = '0x' + state.offset.toString(16).toUpperCase().padStart(8, '0');
    }
    
    // Preencher dados existentes se estiver editando
    if (state.title) {
        titleInput.value = state.title;
    }
    if (state.comment) {
        commentInput.value = state.comment;
    }
});

// Atualizar offset quando receber do main
ipcRenderer.on('update-offset', (event, offset) => {
    if (offset !== undefined) {
        offsetDisplay.textContent = '0x' + offset.toString(16).toUpperCase().padStart(8, '0');
    }
});

// Fechar janela
function closeWindow() {
    window.close();
}

// Cancelar
function cancelBookmark() {
    ipcRenderer.send('bookmark-cancelled');
    closeWindow();
}

// Adicionar favorito
function addBookmark() {
    const title = titleInput.value.trim();
    const comment = commentInput.value.trim();
    
    const bookmarkData = {
        title: title,
        comment: comment,
        editingId: editingBookmarkId  // ID do bookmark sendo editado (se houver)
    };
    
    // Enviar solicitacao para adicionar favorito - offset sera obtido no main
    ipcRenderer.send('bookmark-add-request', bookmarkData);
    
    // Limpar inputs para permitir adicionar outro favorito
    titleInput.value = '';
    commentInput.value = '';
    
    // Se estava editando, fechar janela. Se criando novo, manter aberto
    if (editingBookmarkId !== null) {
        editingBookmarkId = null;
        closeWindow();  // Fechar ao terminar edição
    } else {
        // Manter foco no campo de título para adicionar próximo favorito
        titleInput.focus();
    }
}

// Atalhos de teclado
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        cancelBookmark();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        addBookmark();
    }
});

// Focar no input de título ao iniciar
window.addEventListener('DOMContentLoaded', () => {
    titleInput.focus();
});
