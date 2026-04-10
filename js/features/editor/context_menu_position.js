Object.assign(ContextMenuManager.prototype, {
    goToPosition() {
        const t = (key) => ContextMenuI18n.t(key);
        const positionInput = document.getElementById('cursor-position-input');
        const hexEditor = window.hexEditor;

        if (!positionInput || !hexEditor) {
            this.showNotification('Ã¢ÂÅ’ ' + t('editorNotFound'), 'error');
            return;
        }

        const position = positionInput.value;
        if (!position || position === '00000000') {
            this.showNotification('Ã¢Å¡Â Ã¯Â¸Â ' + t('invalidPosition'), 'warning');
            return;
        }

        try {
            const offset = parseInt(position, 16);
            const dataLength = typeof hexEditor.getDataLength === 'function'
                ? hexEditor.getDataLength()
                : 0;
            if (isNaN(offset)) {
                this.showNotification('Ã¢ÂÅ’ ' + t('invalidPosition'), 'error');
                return;
            }

            if (offset >= dataLength) {
                this.showNotification('Ã¢ÂÅ’ ' + t('positionOutOfRange'), 'error');
                return;
            }

            hexEditor.setCursor(offset, null, false);
            this.showNotification('Ã°Å¸Å½Â¯ ' + t('navigatingTo').replace('{0}', position), 'success');
        } catch (err) {
            console.error('Erro ao ir para posiÃƒÂ§ÃƒÂ£o:', err);
            this.showNotification('Ã¢ÂÅ’ ' + t('invalidPosition'), 'error');
        }
    },

    addBookmarkAtPosition() {
        const t = (key) => ContextMenuI18n.t(key);
        const positionInput = document.getElementById('cursor-position-input');
        const hexEditor = window.hexEditor;

        if (!positionInput || !hexEditor) {
            this.showNotification('Ã¢ÂÅ’ ' + t('editorNotFound'), 'error');
            return;
        }

        const position = positionInput.value;
        if (!position || position === '00000000') {
            this.showNotification('Ã¢Å¡Â Ã¯Â¸Â ' + t('invalidPosition'), 'warning');
            return;
        }

        try {
            const offset = parseInt(position, 16);
            const dataLength = typeof hexEditor.getDataLength === 'function'
                ? hexEditor.getDataLength()
                : 0;
            if (isNaN(offset)) {
                this.showNotification('Ã¢ÂÅ’ ' + t('invalidPosition'), 'error');
                return;
            }

            if (offset >= dataLength) {
                this.showNotification('Ã¢ÂÅ’ ' + t('positionOutOfRange'), 'error');
                return;
            }

            const currentPosition = hexEditor.cursorPosition;
            hexEditor.setCursor(offset, null, false);
            hexEditor.showAddBookmarkModal();

            setTimeout(() => {
                hexEditor.setCursor(currentPosition, null, false);
            }, 100);

            this.showNotification('Ã°Å¸â€â€“ ' + t('bookmarkAdded') + ' 0x' + position, 'success');
        } catch (err) {
            console.error('Erro ao adicionar bookmark:', err);
            this.showNotification('Ã¢ÂÅ’ ' + t('invalidPosition'), 'error');
        }
    }
});

