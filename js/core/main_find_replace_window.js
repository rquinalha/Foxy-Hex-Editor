Object.assign(FoxyHexEditorComplete.prototype, {
    getSearchWindowPreviewLimit() {
        return 100;
    },

    showFindReplaceModal() {
        const findInput = document.getElementById('find-input');
        const replaceInput = document.getElementById('replace-input');
        
        const initialState = {
            findValue: findInput ? findInput.value : this.lastSearchTerm || '',
            replaceValue: replaceInput ? replaceInput.value : '',
            caseSensitive: document.getElementById('case-sensitive')?.checked || false,
            mode: this.searchToolParams?.mode || 'auto',
            regexMode: document.getElementById('regex-mode')?.checked || false,
            wholeWord: document.getElementById('whole-word')?.checked || false,
            replaceAll: document.getElementById('replace-all')?.checked || false,
            searchAllTabs: document.getElementById('search-all-tabs')?.checked || false,
            results: this.getSearchWindowResults()
        };

        const { ipcRenderer } = require('electron');
        ipcRenderer.send('open-search-window', initialState);

        // Configurar listener para comandos da janela de busca se ainda não foi configurado
        if (!this._searchIpcConfigured) {
            ipcRenderer.on('execute-search-action', (event, data) => {
                this.handleSearchToolAction(data);
            });
            
            ipcRenderer.on('search-window-closed', () => {
                this.clearSearch();
            });

            this._searchIpcConfigured = true;
        }
    },

    handleSearchToolAction(data) {
        const { action, params } = data;
        this.searchToolParams = params;
        
        // Sincronizar estados das checkboxes se necessário (opcional, já que passamos no params)
        const cs = document.getElementById('case-sensitive');
        if (cs) cs.checked = params.caseSensitive;
        
        const rm = document.getElementById('regex-mode');
        if (rm) rm.checked = params.regexMode;

        const ww = document.getElementById('whole-word');
        if (ww) ww.checked = params.wholeWord;

        const ra = document.getElementById('replace-all');
        if (ra) ra.checked = params.replaceAll;

        const sat = document.getElementById('search-all-tabs');
        if (sat) sat.checked = !!params.searchAllTabs;

        // Atualizar inputs locais para manter consistência (usados por performSearch/Replace originais)
        const findInput = document.getElementById('find-input');
        if (findInput) findInput.value = params.findValue;
        
        const replaceInput = document.getElementById('replace-input');
        if (replaceInput) replaceInput.value = params.replaceValue;

        switch (action) {
            case 'perform-search':
                this.performSearch(params);
                return;
            case 'cancel-search':
                this.cancelDocumentSearch?.();
                return;
            case 'search-page':
                this.searchPreviewPage = Math.max(0, Math.min(params.page, Math.ceil(this.searchResults.length / this.getSearchWindowPreviewLimit()) - 1));
                break;
            case 'perform-replace':
                this.performReplace(params);
                break;
            case 'find-next':
                this.findNext();
                break;
            case 'find-previous':
                this.findPrevious();
                break;
            case 'goto-search-result':
                if (typeof params.globalIndex === 'number') {
                    this.goToSearchResult(params.globalIndex);
                    this.updateSearchResults();
                }
                break;
        }

        this.syncSearchWindow();
    },

    getSearchWindowResults() {
        const pageSize = this.getSearchWindowPreviewLimit();
        const pages = Math.max(1, Math.ceil(this.searchResults.length / pageSize));
        const page = Math.min(this.searchPreviewPage || 0, pages - 1);
        const first = page * pageSize;
        const flatResults = this.searchResults.slice(first, first + pageSize).map((result, index) => ({
            ...result,
            globalIndex: first + index,
            offsetHex: result.offset.toString(16).toUpperCase().padStart(8, '0'),
            fileName: result.fileName || this.currentFileName || 'Arquivo atual'
        }));
        return {
            count: this.searchResults.length,
            currentIndex: this.currentSearchIndex,
            searchTerm: this.lastSearchTerm,
            flatResults, page, pages,
            groupedResults: this.globalTabSearchGroups || [],
            searchAllTabs: !!this.globalTabSearchActive,
            notice: this.searchNotice,
            progress: this.documentSearchJob?.progress
        };
    },

    syncSearchWindow() {
        if (!this._searchIpcConfigured) return;
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('search-results-update', this.getSearchWindowResults());
    },

    hideFindReplaceModal() {
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('close-search-window');
        
        const modal = document.getElementById('find-replace-modal');
        if (modal) {
            modal.classList.remove('show', 'pinned');
            this.isModalPinned = false;
            this.updatePinButton();
        }
    },



togglePinModal() {
const modal = document.getElementById('find-replace-modal');
const modalContent = document.getElementById('find-replace-content');

if (modal && modalContent) {
this.isModalPinned = !this.isModalPinned;

if (this.isModalPinned) {
    modal.classList.add('pinned');
    this.showDragNotification();
} else {
    modal.classList.remove('pinned');
    // Reset position when unpinning
    modalContent.style.position = '';
    modalContent.style.left = '';
    modalContent.style.top = '';
    modalContent.style.transform = '';
}

this.updatePinButton();
}
},

updatePinButton() {
const pinBtn = document.getElementById('pin-modal-btn');
const dragIndicator = document.getElementById('drag-indicator');

if (pinBtn) {
if (this.isModalPinned) {
    pinBtn.textContent = '🔒 Bloquear';
    pinBtn.style.background = 'rgba(255, 107, 53, 0.3)';
    if (dragIndicator) dragIndicator.style.display = 'inline';
} else {
    pinBtn.textContent = '⇄ Arrastar';
    pinBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    if (dragIndicator) dragIndicator.style.display = 'none';
}
}
},

showDragNotification() {
    // Remove notificação anterior se existir
    const existingNotification = document.getElementById('drag-notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Cria a notificação
    const notification = document.createElement('div');
    notification.id = 'drag-notification';
    notification.innerHTML = '<div style="font-size: 16px;">⇄ Arraste a janela para qualquer lugar da tela,<br>a interação fora da janela agora está permitida.</div>';
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, rgba(255, 107, 53, 0.9), rgba(229, 90, 43, 0.9));
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: bold;
        z-index: 100000;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(10px);
        border: 2px solid rgba(255, 255, 255, 0.2);
        animation: fadeInOut 4.5s ease-in-out;
    `;

    // Adiciona CSS para animação
    if (!document.getElementById('drag-notification-style')) {
        const style = document.createElement('style');
        style.id = 'drag-notification-style';
        style.textContent = `
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                10% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            }
            
            @keyframes fadeOut {
                0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            }
        `;
        document.head.appendChild(style);
    }

    // Adiciona ao DOM
    document.body.appendChild(notification);

    // Remove após 5 segundos (aguarda a animação terminar)
    setTimeout(() => {
        if (notification.parentNode) {
            // Adiciona classe para fade out suave
            notification.style.animation = 'fadeOut 0.5s ease-out forwards';
            // Remove após o fade out
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 500);
        }
    }, 4500);
},

setupModalClickOutside() {
const modal = document.getElementById('find-replace-modal');
const modalContent = document.getElementById('find-replace-content');

if (!modal || !modalContent) return;

// Remove existing handler
if (this.modalClickHandler) {
modal.removeEventListener('click', this.modalClickHandler);
}

// Add new handler
this.modalClickHandler = (event) => {
if (event.target === modal && !this.isModalPinned) {
    // Não fechar o modal de busca e substituição ao clicar fora
    // this.hideFindReplaceModal();
}
};

modal.addEventListener('click', this.modalClickHandler);

// Setup drag functionality
this.setupModalDrag();
},

setupModalDrag() {
const modalContent = document.getElementById('find-replace-content');
const modalHeader = modalContent?.querySelector('.modal-header');

if (!modalContent || !modalHeader) return;

// Mouse events for dragging
modalHeader.addEventListener('mousedown', (e) => {
if (this.isModalPinned) {
    this.startDrag(e);
}
});

document.addEventListener('mousemove', (e) => {
if (this.isDragging) {
    this.drag(e);
}
});

document.addEventListener('mouseup', () => {
if (this.isDragging) {
    this.stopDrag();
}
});
},

startDrag(e) {
const modalContent = document.getElementById('find-replace-content');
if (!modalContent) return;

this.isDragging = true;
this.dragStartX = e.clientX;
this.dragStartY = e.clientY;

const rect = modalContent.getBoundingClientRect();
this.modalStartX = rect.left;
this.modalStartY = rect.top;

modalContent.classList.add('dragging');
e.preventDefault();
},

drag(e) {
if (!this.isDragging) return;

const modalContent = document.getElementById('find-replace-content');
if (!modalContent) return;

const deltaX = e.clientX - this.dragStartX;
const deltaY = e.clientY - this.dragStartY;

const newX = this.modalStartX + deltaX;
const newY = this.modalStartY + deltaY;

// Keep modal within viewport bounds
const maxX = window.innerWidth - modalContent.offsetWidth;
const maxY = window.innerHeight - modalContent.offsetHeight;

const clampedX = Math.max(0, Math.min(newX, maxX));
const clampedY = Math.max(0, Math.min(newY, maxY));

modalContent.style.position = 'fixed';
modalContent.style.left = clampedX + 'px';
modalContent.style.top = clampedY + 'px';
modalContent.style.transform = 'none';
},

stopDrag() {
this.isDragging = false;

const modalContent = document.getElementById('find-replace-content');
if (modalContent) {
modalContent.classList.remove('dragging');
}
},


});


