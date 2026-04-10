function patchHexEditorKeyHandling() {
    const applyPatch = () => {
        if (!window.hexEditor) {
            setTimeout(applyPatch, 500);
            return;
        }

        if (window.hexEditor.handleKeyPress) {
            const originalHandler = window.hexEditor.handleKeyPress.bind(window.hexEditor);

            window.hexEditor.handleKeyPress = function (event) {
                if ((event.key === 'Control' || event.key === 'Meta') && this.activePanel === 'hex') {
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();
                    return false;
                }

                if ((event.ctrlKey || event.metaKey) && ['c', 'v', 'a'].includes(event.key.toLowerCase())) {
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();

                    if (window.contextMenuManager) {
                        const key = event.key.toLowerCase();
                        if (key === 'c') {
                            const activePanel = this.activePanel || 'hex';
                            window.contextMenuManager.copySelectionWithNotification(activePanel).catch(err => {
                                console.error('Erro ao copiar seleÃ§Ã£o:', err);
                            });
                        } else if (key === 'v') {
                            window.contextMenuManager.pasteDataWithNotification('auto');
                        } else if (key === 'a') {
                            window.contextMenuManager.selectAllWithNotification();
                        }
                    }

                    return false;
                }

                return originalHandler.call(this, event);
            };
        }

        if (window.chunkedAdapter && window.chunkedAdapter.hexEditor &&
            window.chunkedAdapter.hexEditor.handleKeyPress) {

            const originalChunkedHandler = window.chunkedAdapter.hexEditor.handleKeyPress.bind(window.chunkedAdapter.hexEditor);

            window.chunkedAdapter.hexEditor.handleKeyPress = function (event) {
                if ((event.key === 'Control' || event.key === 'Meta') && this.activePanel === 'hex') {
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();
                    return false;
                }

                if ((event.ctrlKey || event.metaKey) && ['c', 'v', 'a'].includes(event.key.toLowerCase())) {
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();

                    if (window.contextMenuManager) {
                        const key = event.key.toLowerCase();
                        if (key === 'c') {
                            const activePanel = this.activePanel || 'hex';
                            window.contextMenuManager.copySelectionWithNotification(activePanel).catch(err => {
                                console.error('Erro ao copiar seleÃ§Ã£o:', err);
                            });
                        } else if (key === 'v') {
                            window.contextMenuManager.pasteDataWithNotification('auto');
                        } else if (key === 'a') {
                            window.contextMenuManager.selectAllWithNotification();
                        }
                    }

                    return false;
                }

                return originalChunkedHandler.call(this, event);
            };
        }
    };

    applyPatch();
}

function initializeContextMenuSystem() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeContextMenuSystem);
        return;
    }

    if (!window.hexEditor) {
        setTimeout(initializeContextMenuSystem, 500);
        return;
    }

    addContextMenuStyles();
    patchHexEditorKeyHandling();

    if (!window.contextMenuManager) {
        window.contextMenuManager = new ContextMenuManager();
    }
}

if (typeof window !== 'undefined') {
    if (!window._contextMenuInitialized) {
        window._contextMenuInitialized = true;
        initializeContextMenuSystem();
    }
}
