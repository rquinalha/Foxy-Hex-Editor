Object.assign(ContextMenuManager.prototype, {
    captureContextTarget(event) {
        const target = event.target && event.target.closest
            ? event.target.closest('[data-offset], [data-panel]')
            : null;

        if (!target) {
            this.contextTargetInfo = null;
            return;
        }

        const offsetValue = target.dataset ? target.dataset.offset : undefined;
        const panelValue = target.dataset ? target.dataset.panel : undefined;
        const offset = Number.parseInt(offsetValue, 10);
        const hexEditor = window.hexEditor;
        const highlight = hexEditor && Number.isInteger(offset) && hexEditor.getHighlightAt
            ? hexEditor.getHighlightAt(offset)
            : null;

        this.contextTargetInfo = {
            offset: Number.isInteger(offset) ? offset : null,
            panel: panelValue || null,
            highlight
        };

        this.syncContextTargetWithEditor();
    },

    syncContextTargetWithEditor() {
        const hexEditor = window.hexEditor;
        const context = this.contextTargetInfo;

        if (!hexEditor || !context || !Number.isInteger(context.offset) || !context.panel) {
            return;
        }

        const selectionStart = Number.isInteger(hexEditor.selectionStart) ? hexEditor.selectionStart : context.offset;
        const selectionEnd = Number.isInteger(hexEditor.selectionEnd) ? hexEditor.selectionEnd : context.offset;
        const selectionMin = Math.min(selectionStart, selectionEnd);
        const selectionMax = Math.max(selectionStart, selectionEnd);
        const hasRangeSelection = selectionMin !== selectionMax;
        const clickedInsideSelection = context.offset >= selectionMin && context.offset <= selectionMax;

        if (hasRangeSelection && clickedInsideSelection) {
            hexEditor.activePanel = context.panel;
            return;
        }

        const targetRange = typeof hexEditor.getSelectionRangeForPanel === 'function'
            ? hexEditor.getSelectionRangeForPanel(context.offset, context.panel)
            : { start: context.offset, end: context.offset, cursor: context.offset };

        hexEditor.selectionStart = targetRange.start;
        hexEditor.selectionEnd = targetRange.end;
        hexEditor.cursorPosition = targetRange.cursor;
        hexEditor.activePanel = context.panel;

        if (typeof hexEditor.completeRenderWithColors === 'function') {
            hexEditor.completeRenderWithColors(hexEditor.currentScrollPercent, true);
        } else if (typeof hexEditor.renderCurrentView === 'function') {
            hexEditor.renderCurrentView(true);
        } else if (typeof hexEditor.render === 'function') {
            hexEditor.render();
        }

        if (typeof hexEditor.updateStatus === 'function') {
            hexEditor.updateStatus();
        }
    },

    generateMenuItems() {
        const hexEditor = window.hexEditor;
        const hasSelection = hexEditor && hexEditor.selectionStart !== hexEditor.selectionEnd;
        const canEdit = hexEditor && hexEditor.editMode === 'edit';
        const activePanel = (this.contextTargetInfo && this.contextTargetInfo.panel) || (hexEditor && hexEditor.activePanel) || 'hex';
        const isHexPanel = activePanel === 'hex';
        const isAsciiPanel = activePanel === 'ascii';
        const t = (key) => ContextMenuI18n.t(key);

        let currentHighlight = null;
        if (hexEditor && hexEditor.cursorPosition !== undefined) {
            currentHighlight = hexEditor.getHighlightAt ? hexEditor.getHighlightAt(hexEditor.cursorPosition) : null;
        }
        if (this.contextTargetInfo && this.contextTargetInfo.highlight) {
            currentHighlight = this.contextTargetInfo.highlight;
        }

        return [
            {
                icon: '📋',
                label: t('copy'),
                enabled: hasSelection,
                action: () => this.copySelectionWithNotification(isAsciiPanel ? 'ascii' : 'hex')
            },
            {
                icon: '📍',
                label: t('copyPosition'),
                enabled: !!(hexEditor && hexEditor.copyPositionValue),
                action: () => hexEditor?.copyPositionValue()
            },
            {
                icon: '📥',
                label: t('paste'),
                enabled: canEdit,
                action: () => this.pasteData('auto')
            },
            { type: 'separator' },
            {
                icon: '📄',
                label: t('copyAsHex'),
                enabled: hasSelection && isHexPanel,
                action: () => this.copySelectionWithNotification('hex')
            },
            {
                icon: '🔤',
                label: t('copyAsText'),
                enabled: hasSelection && isAsciiPanel,
                action: () => this.copySelectionWithNotification('ascii')
            },
            { type: 'separator' },
            {
                icon: '🧪',
                label: t('pasteAsHex'),
                enabled: canEdit && isHexPanel,
                action: () => this.pasteData('hex')
            },
            {
                icon: '✏️',
                label: t('pasteAsText'),
                enabled: canEdit && isAsciiPanel,
                action: () => this.pasteData('ascii')
            },
            { type: 'separator' },
            {
                icon: '🎯',
                label: t('selectAll'),
                enabled: true,
                action: () => this.selectAll()
            },
            { type: 'separator' },
            {
                icon: '💾',
                label: t('exportSelection'),
                enabled: hasSelection,
                action: () => this.exportSelection()
            },
            {
                icon: '📂',
                label: t('importSelection'),
                enabled: hasSelection,
                action: () => this.importSelection()
            },
            { type: 'separator' },
            {
                icon: '🖍️',
                label: t('createHighlight'),
                enabled: hasSelection,
                action: () => this.createHighlight()
            },
            ...(currentHighlight ? [{
                icon: '🔲',
                label: t('selectWholeHighlight'),
                enabled: true,
                action: () => this.selectWholeHighlight(currentHighlight)
            }] : []),
            ...(currentHighlight ? [{
                icon: '🗑️',
                label: t('removeHighlight'),
                enabled: true,
                action: () => this.removeCurrentHighlight(currentHighlight)
            }] : []),
            {
                icon: '🧹',
                label: t('clearAllHighlights'),
                enabled: hexEditor && hexEditor.highlights && hexEditor.highlights.size > 0,
                action: () => this.clearAllHighlights()
            },
            { type: 'separator' },
            {
                icon: '🔖',
                label: t('addBookmark'),
                enabled: !!(hexEditor && typeof hexEditor.getDataLength === 'function' && hexEditor.getDataLength() > 0),
                action: () => hexEditor?.showAddBookmarkModal()
            }
        ];
    },

    generatePositionMenuItems() {
        const positionInput = document.getElementById('cursor-position-input');
        const currentValue = positionInput ? positionInput.value : '00000000';
        const hexEditor = window.hexEditor;
        const t = (key) => ContextMenuI18n.t(key);

        return [
            {
                icon: '📍',
                label: t('copyPosition'),
                enabled: true,
                action: () => {
                    if (window.hexEditor && window.hexEditor.copyPositionValue) {
                        window.hexEditor.copyPositionValue();
                    } else {
                        this.showNotification('❌ ' + t('copyError'), 'error');
                    }
                }
            },
            {
                icon: '📥',
                label: t('pastePosition'),
                enabled: true,
                action: () => window.hexEditor?.pastePositionValue?.()
            },
            { type: 'separator' },
            {
                icon: '🎯',
                label: t('gotoPosition'),
                enabled: !!(hexEditor && typeof hexEditor.getDataLength === 'function' && hexEditor.getDataLength() > 0),
                action: () => this.goToPosition()
            },
            {
                icon: '🔖',
                label: t('addBookmarkAtPosition'),
                enabled: !!(hexEditor && typeof hexEditor.getDataLength === 'function' && hexEditor.getDataLength() > 0 && currentValue !== '00000000'),
                action: () => this.addBookmarkAtPosition()
            }
        ];
    }
});
