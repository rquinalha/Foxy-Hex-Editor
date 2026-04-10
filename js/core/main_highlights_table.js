Object.assign(FoxyHexEditorComplete.prototype, {
    // Metodo principal - abre a janela de marcacoes
    createHighlightsManagementModal() {
        const highlightsArray = this.highlights ? Array.from(this.highlights.values()) : [];

        const initialState = {
            highlights: highlightsArray
        };

        const { ipcRenderer } = require('electron');
        ipcRenderer.send('open-highlights-window', initialState);

        if (!this._highlightsIpcConfigured) {
            this.setupHighlightsIpcListeners();
            this._highlightsIpcConfigured = true;
        }
    },

    // Configurar listeners IPC para comunicacao com a janela de marcacoes
    setupHighlightsIpcListeners() {
        const { ipcRenderer } = require('electron');

        ipcRenderer.on('execute-navigate-to-highlight', (event, data) => {
            const highlightId = parseInt(data.id, 10);
            const highlight = this.highlights.get(highlightId);
            if (highlight) {
                this.navigateToHighlight(highlight);
            }
        });

        ipcRenderer.on('execute-update-highlight-comment', (event, data) => {
            const highlightId = parseInt(data.id, 10);
            const highlight = this.highlights.get(highlightId);
            if (highlight) {
                highlight.comment = data.comment;
                this.saveHighlightsToFile();
            }
        });

        ipcRenderer.on('execute-delete-highlight', (event, data) => {
            const highlightId = parseInt(data.id, 10);
            this.removeHighlight(highlightId);
            ipcRenderer.send('highlight-removed', { id: data.id });
        });

        ipcRenderer.on('request-highlights-refresh', () => {
            this.syncHighlightsStateToWindow();
        });

        ipcRenderer.on('highlights-window-closed', () => {
            this._highlightsIpcConfigured = false;
        });
    },

    // Sincronizar estado das marcacoes para a janela
    syncHighlightsStateToWindow() {
        const { ipcRenderer } = require('electron');
        const highlightsArray = this.highlights ? Array.from(this.highlights.values()) : [];
        ipcRenderer.send('highlights-state-update', { highlights: highlightsArray });
    },

    // Metodo legado para compatibilidade
    setupHighlightsManagementEvents(modal) {
        // A janela independente lida com isso.
    },

    // Metodo para navegar ate uma marcacao
    navigateToHighlight(highlight) {
        this.navigateToOffset(highlight.start);

        if (highlight.end > highlight.start) {
            const selectionEnd = Math.min(highlight.end, this.getDataLength() - 1);
            this.setSelection(highlight.start, selectionEnd);
        }

        this.ensureCursorVisible();
        this.focusEditor();

        setTimeout(() => {
            this.completeRenderWithColors(this.currentScrollPercent, true);
        }, 50);

    },

    // Metodo para atualizar estado do botao de marcacoes
    updateHighlightsButtonState() {
        const highlightsBtn = document.getElementById('highlights-management-btn');
        const highlightsBtnMobile = document.getElementById('highlights-management-btn-mobile');

        if (highlightsBtn) {
            highlightsBtn.disabled = false;
            highlightsBtn.style.opacity = '1';
            highlightsBtn.style.cursor = 'pointer';
        }

        if (highlightsBtnMobile) {
            highlightsBtnMobile.disabled = false;
            highlightsBtnMobile.style.opacity = '1';
            highlightsBtnMobile.style.cursor = 'pointer';
        }
    },
});
