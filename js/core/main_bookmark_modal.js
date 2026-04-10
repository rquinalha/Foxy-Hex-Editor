Object.assign(FoxyHexEditorComplete.prototype, {
showAddBookmarkModal(existingBookmark = null) {
    // Enviar mensagem para main process abrir a janela de favoritos
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('open-bookmark-window', {
        offset: this.cursorPosition,
        title: existingBookmark?.title || '',
        comment: existingBookmark?.comment || '',
        id: existingBookmark?.id || null
    });
},
hideAddBookmarkModal() {
    // Janela é fechada automaticamente pelo renderer
    // Retornar foco para o editor
    this.focusEditor();
}
});
