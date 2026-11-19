Object.assign(FoxyHexEditorComplete.prototype, {

// Helper: atualiza o estado desabilitado dos botões da sidebar de favoritos
updateBookmarkSidebarButtons() {
    const hasFile = typeof this.getDataLength === 'function' ? this.getDataLength() > 0 : !!(this.data && this.data.length > 0);
    const hasBookmarks = this.bookmarks && this.bookmarks.length > 0;

    const addBtn = document.getElementById('sidebar-add-bookmark-btn');
    const exportBtn = document.getElementById('sidebar-export-bookmarks-btn');

    if (addBtn) addBtn.disabled = !hasFile;
    if (exportBtn) exportBtn.disabled = !hasBookmarks;
},

addBookmark() {
    const titleInput = document.getElementById('bookmark-title');
    const commentInput = document.getElementById('bookmark-comment');
    const title = titleInput?.value.trim() || '';
    const comment = commentInput?.value.trim() || '';

    const defaultTitleTemplate = window.I18n?.t
        ? window.I18n.t('tool.bookmark.default_name')
        : 'Bookmark {number}';
    const defaultTitle = defaultTitleTemplate.replace('{number}', String(this.currentBookmarkId + 1));

    this.addBookmarkAt(this.cursorPosition, title || defaultTitle, comment);
    this.hideAddBookmarkModal();
},

addBookmarkAt(offset, title, comment = '') {
    const existing = this.bookmarks.find((b) => b.offset === offset);
    if (existing) {
        existing.title = title;
        existing.comment = comment;
        existing.timestamp = new Date();
    } else {
        const bookmark = {
            id: this.currentBookmarkId++,
            offset,
            title,
            comment,
            timestamp: new Date()
        };
        this.bookmarks.push(bookmark);
        this.bookmarks.sort((a, b) => a.offset - b.offset);
    }

    this.updateBookmarksList();
    this.updateBookmarkSidebarButtons();
    this.updateStats();
    this.render();
    this.emit('bookmarkAdd', { offset, title, comment });
    return this;
},

removeBookmark(id) {
    const index = this.bookmarks.findIndex((b) => b.id === id);
    if (index !== -1) {
        const bookmark = this.bookmarks.splice(index, 1)[0];
        this.updateBookmarksList();
        this.updateBookmarkSidebarButtons();
        this.updateStats();
        this.render();
        this.emit('bookmarkRemove', bookmark);
        return bookmark;
    }
    return null;
},

getBookmarks() {
    return this.bookmarks;
},

setBookmarks(bookmarks) {
    this.bookmarks = bookmarks || [];
    this.currentBookmarkId = Math.max(...this.bookmarks.map((b) => b.id || 0), 0) + 1;
    this.updateBookmarksList();
    this.updateBookmarkSidebarButtons();
    this.updateStats();
    this.render();
    this.emit('bookmarksChange', this.bookmarks);
    return this;
},

goToBookmark(offset) {
    this.navigateToOffset(offset);

    setTimeout(() => {
        const bookmarkElements = document.querySelectorAll(`[data-offset="${offset}"]`);
        bookmarkElements.forEach((el) => {
            el.style.animation = 'pulse 0.5s ease-in-out 3';
        });
    }, 100);

    this.emit('bookmarkNavigate', { offset });
    return this;
},

clearBookmarks() {
    this.bookmarks = [];
    this.updateBookmarksList();
    this.updateBookmarkSidebarButtons();
    this.updateStats();
    this.render();
    this.emit('bookmarksChange', this.bookmarks);
    return this;
},

updateBookmarksList() {
    // Sincronizar o Set de favoritos para busca rápida O(1) na renderização
    if (!this.bookmarksSet) this.bookmarksSet = new Set();
    this.bookmarksSet.clear();
    this.bookmarks.forEach(b => this.bookmarksSet.add(b.offset));

    const container = document.getElementById('bookmarks-list');
    if (!container) return;

    // Se não há bookmarks, renderizar mensagem completa com dica
    if (this.bookmarks.length === 0) {
        const fullText = window.I18n?.t ? window.I18n.t('sidebar.no_bookmarks_full') : 'Nenhum favorito ainda<br><small>Clique em "Adicionar Favorito" para criar seu primeiro favorito</small>';
        container.innerHTML = `
            <div class="empty-bookmarks" data-i18n="sidebar.no_bookmarks_full" data-i18n-html>
                ${fullText}
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    this.bookmarks.forEach((bookmark) => {
        const item = document.createElement('div');
        item.className = 'bookmark-item';
        if (bookmark.offset === this.cursorPosition) {
            item.classList.add('current');
        }

        item.innerHTML = [
            '<div class="bookmark-offset"></div>',
            '<div class="bookmark-title" style="font-weight:bold;color:#fff;margin:4px 0"></div>',
            '<div class="bookmark-actions">',
            '<button class="bookmark-action bookmark-edit" data-i18n-title="tool.bookmark.edit">✏️</button>',
            '<button class="bookmark-action bookmark-delete" data-i18n-title="tool.bookmark.delete">🗑️</button>',
            '</div>'
        ].join('');
        item.querySelector('.bookmark-offset').textContent = '0x' + bookmark.offset.toString(16).toUpperCase().padStart(8, '0');
        item.querySelector('.bookmark-title').textContent = bookmark.title;
        if (bookmark.comment) {
            const comment = document.createElement('div');
            comment.className = 'bookmark-comment';
            comment.textContent = bookmark.comment;
            item.insertBefore(comment, item.querySelector('.bookmark-actions'));
        }
        const editButton = item.querySelector('.bookmark-edit');
        editButton.title = window.I18n?.t('tool.bookmark.edit') || 'Editar';
        editButton.addEventListener('click', () => this.editBookmark(bookmark.id));
        const deleteButton = item.querySelector('.bookmark-delete');
        deleteButton.title = window.I18n?.t('tool.bookmark.delete') || 'Excluir';
        deleteButton.addEventListener('click', () => this.removeBookmark(bookmark.id));

        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('bookmark-action')) {
                this.goToBookmark(bookmark.offset);
            }
        });

        container.appendChild(item);
    });
},

editBookmark(id) {
    const bookmark = this.bookmarks.find((b) => b.id === id);
    if (!bookmark) return;

    this.setCursor(bookmark.offset, null, false);
    // Passar o bookmark existente para preencher a janela de edição
    this.showAddBookmarkModal(bookmark);
    // NÃO removemos o bookmark aqui - será substituído quando adicionar novo
},

exportBookmarks() {
    if (typeof require !== 'undefined' && typeof process !== 'undefined') {
        const { ipcRenderer } = require('electron');
        const data = {
            filename: 'bookmarks.json',
            created: new Date().toISOString(),
            bookmarks: this.bookmarks
        };

        ipcRenderer.invoke('show-save-dialog', {
            title: 'Exportar Favoritos',
            defaultPath: 'favoritos.json',
            filters: [{ name: 'Favorito', extensions: ['json'] }]
        }).then((result) => {
            if (!result.canceled && result.filePath) {
                const fs = require('fs');
                try {
                    fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf8');
                    if (window.notificationSystem) {
                        window.notificationSystem.success(`Exportados ${this.bookmarks.length} favoritos com sucesso!`, 'Favoritos Exportados');
                    }
                } catch (error) {
                    window.notificationSystem.error('Erro ao exportar favoritos: ' + error.message, 'Erro de Exportação');
                }
            }
        }).catch((error) => {
            window.notificationSystem.error('Erro ao abrir diálogo: ' + error.message, 'Erro de Diálogo');
        });
    } else {
        const data = {
            filename: 'bookmarks.json',
            created: new Date().toISOString(),
            bookmarks: this.bookmarks
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bookmarks.json';
        a.click();
        URL.revokeObjectURL(url);
    }
},

importBookmarks() {
    if (typeof require !== 'undefined' && typeof process !== 'undefined') {
        const { ipcRenderer } = require('electron');
        ipcRenderer.invoke('show-open-dialog', {
            title: 'Importar Favoritos',
            filters: [{ name: 'Favorito', extensions: ['json'] }]
        }).then((result) => {
            if (!result.canceled && result.filePaths.length > 0) {
                const filePath = result.filePaths[0];
                const fs = require('fs');
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    const data = JSON.parse(content);
                    if (data.bookmarks && Array.isArray(data.bookmarks)) {
                        this.setBookmarks(data.bookmarks);
                        if (window.notificationSystem) {
                            window.notificationSystem.success(`Importados ${data.bookmarks.length} favoritos com sucesso!`, 'Favoritos Importados');
                        }
                    } else {
                        throw new Error('Formato de favoritos inválido');
                    }
                } catch (error) {
                    window.notificationSystem.error('Erro ao importar favoritos: ' + error.message, 'Erro de Importação');
                }
            }
        }).catch((error) => {
            window.notificationSystem.error('Erro ao abrir diálogo: ' + error.message, 'Erro de Diálogo');
        });
    } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                try {
                    const data = JSON.parse(loadEvent.target.result);
                    if (data.bookmarks && Array.isArray(data.bookmarks)) {
                        this.setBookmarks(data.bookmarks);
                    }
                } catch (error) {
                    window.notificationSystem.error('Erro ao importar favoritos: ' + error.message, 'Erro de Importação');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }
}
});
