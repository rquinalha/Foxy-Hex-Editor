Object.assign(ContextMenuManager.prototype, {
    createHighlight() {
        const t = (key) => ContextMenuI18n.t(key);
        const hexEditor = window.hexEditor;
        if (!hexEditor) {
            this.showNotification('âŒ ' + t('editorNotFound'), 'error');
            return;
        }

        if (hexEditor.createHighlight) {
            hexEditor.createHighlight();
            this.showNotification('🖍️ ' + t('highlightCreated'), 'success');
        } else {
            this.showNotification('âŒ ' + t('highlightSystemNotAvailable'), 'error');
        }
    },

    clearAllHighlights() {
        const t = (key) => ContextMenuI18n.t(key);
        const hexEditor = window.hexEditor;
        if (!hexEditor) {
            this.showNotification('âŒ ' + t('editorNotFound'), 'error');
            return;
        }

        if (hexEditor.clearAllHighlights) {
            hexEditor.clearAllHighlights();
            this.showNotification('🧹 ' + t('allHighlightsCleared'), 'success');
        } else {
            this.showNotification('âŒ ' + t('highlightSystemNotAvailable'), 'error');
        }
    },

    removeCurrentHighlight(highlight) {
        const t = (key) => ContextMenuI18n.t(key);
        const hexEditor = window.hexEditor;
        if (!hexEditor) {
            this.showNotification('âŒ ' + t('editorNotFound'), 'error');
            return;
        }

        if (hexEditor.removeHighlight && highlight && highlight.id) {
            hexEditor.removeHighlight(highlight.id);
            this.showNotification('🗑️ ' + t('highlightRemoved'), 'success');
        } else {
            this.showNotification('âŒ ' + t('highlightError'), 'error');
        }
    },

    selectWholeHighlight(highlight) {
        const t = (key) => ContextMenuI18n.t(key);
        const hexEditor = window.hexEditor;
        if (!hexEditor || !highlight || !highlight.id || !hexEditor.handleHighlightDoubleClick) {
            this.showNotification('âŒ ' + t('cannotSelectHighlight'), 'error');
            return;
        }

        const clickOffset = this.contextTargetInfo && Number.isInteger(this.contextTargetInfo.offset)
            ? this.contextTargetInfo.offset
            : highlight.start;
        const panel = this.contextTargetInfo && this.contextTargetInfo.panel
            ? this.contextTargetInfo.panel
            : (hexEditor.activePanel || 'hex');

        hexEditor.handleHighlightDoubleClick(highlight.id, clickOffset, panel);
    }
});
