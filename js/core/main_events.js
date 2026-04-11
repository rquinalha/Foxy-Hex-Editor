Object.assign(FoxyHexEditorComplete.prototype, {
bindEvents() {
if (this._documentEventsBound) return;

document.addEventListener('keydown', (e) => {
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        switch(e.key) {
            case 'PageUp':
                e.preventDefault();
                if (!this.dispatchVirtualNavigation('largeFilePageUp')) {
                    this.pageUp();
                }
                this.clearHighlightSelection();
                return;
            case 'PageDown':
                e.preventDefault();
                if (!this.dispatchVirtualNavigation('largeFilePageDown')) {
                    this.pageDown();
                }
                this.clearHighlightSelection();
                return;
            case 'Home':
                if (e.ctrlKey) {
                    e.preventDefault();
                    if (!this.dispatchVirtualNavigation('largeFileGoToStart')) {
                        this.goToStart();
                    }
                    this.clearHighlightSelection();
                    return;
                }
                break;
            case 'End':
                if (e.ctrlKey) {
                    e.preventDefault();
                    if (!this.dispatchVirtualNavigation('largeFileGoToEnd')) {
                        this.goToEnd();
                    }
                    this.clearHighlightSelection();
                    return;
                }
                break;
            case 'ArrowUp':
            case 'ArrowDown':
            case 'ArrowLeft':
            case 'ArrowRight':
                this.clearHighlightSelection();
                break;
        }
    }

    this.handleKeyPress(e);
});

document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.id === 'cursor-position-input') {
            e.preventDefault();
            e.stopPropagation();
            this.copyPositionValue();
        }
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.id === 'cursor-position-input') {
            e.preventDefault();
            e.stopPropagation();
            this.pastePositionValue();
        }
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        e.stopPropagation();
        this.showFindReplaceModal();
        this.showFindReplaceNotification();
    }
});

document.addEventListener('drop', (e) => {
e.preventDefault();
this.handleFileDrop(e);
});
document.addEventListener('dragover', (e) => {
e.preventDefault();
e.dataTransfer.dropEffect = 'copy';
});
document.addEventListener('dragenter', (e) => {
e.preventDefault();
});

this.bindAdvancedContentEvents = () => {
    const content = this._content;
    if (!content) {
        setTimeout(() => this.bindAdvancedContentEvents(), 100);
        return;
    }

if (this._contentClickHandler) {
    content.removeEventListener('click', this._contentClickHandler);
}
if (this._contentMouseDownHandler) {
    content.removeEventListener('mousedown', this._contentMouseDownHandler);
}
if (this._contentMouseMoveHandler) {
    content.removeEventListener('mousemove', this._contentMouseMoveHandler);
}
if (this._contentDoubleClickHandler) {
    content.removeEventListener('dblclick', this._contentDoubleClickHandler);
}

    this._contentClickHandler = (e) => {
        const target = e.target;
        const offset = target.dataset?.offset;
        const panel = target.dataset?.panel;

        if (!offset || !panel) return;

        e.preventDefault();
        e.stopPropagation();

        // IGNORAR Shift+Click - já tratado pelo handler de mousedown
        if (e.shiftKey) {
            return;
        }

        const pos = parseInt(offset);
        const highlightId = target.dataset?.highlightId ? parseInt(target.dataset.highlightId) : null;

        if (highlightId) {
            this.handleHighlightDoubleClick(highlightId, pos, panel);
            return;
        }

        if (e.detail === 2 && target.dataset.highlightId) {
            this.handleHighlightDoubleClick(parseInt(target.dataset.highlightId), pos, panel);
            return;
        }

        const currentTable = this.charTables && this.charTables[this.currentCharTable];
        const is16bit = currentTable && (currentTable.type === '16-bit' || currentTable.type === 'UTF-16' ||
            (currentTable.type && currentTable.type.includes && currentTable.type.includes('16-bit')));
        const isShiftJIS = currentTable && ((currentTable.type === 'shift-jis' || currentTable.type === 'shift_jis') || currentTable._isShiftJIS === true);
        const usesGroupedSelection = (panel === 'hex' && (is16bit || isShiftJIS)) || (panel === 'ascii' && (is16bit || isShiftJIS));

        // Click normal (sem Shift) - definir nova seleção
        if (usesGroupedSelection) {
            const targetRange = this.getSelectionRangeForPanel(pos, panel);
            this.selectionStart = targetRange.start;
            this.selectionEnd = targetRange.end;
            this.cursorPosition = targetRange.cursor;
        } else {
            this.selectionStart = pos;
            this.selectionEnd = pos;
            this.cursorPosition = pos;
        }

        this.activePanel = panel;
        this.completeRenderWithColors(this.currentScrollPercent, true);
        this.focusEditor();

        if (e.detail === 1) {
            this.selectedHighlight = null;

            document.querySelectorAll('.highlight-selected').forEach(el => {
                el.classList.remove('highlight-selected');
            });
        }
    };

    this._contentMouseDownHandler = (e) => {
        const target = e.target;
        const offset = target.dataset?.offset;
        const panel = target.dataset?.panel;

        if (!offset || !panel || e.button !== 0) return;

        e.preventDefault();
        e.stopPropagation();

        const pos = parseInt(offset);
        const currentTable = this.charTables && this.charTables[this.currentCharTable];
        const is16bit = currentTable && (currentTable.type === '16-bit' || currentTable.type === 'UTF-16' ||
            (currentTable.type && currentTable.type.includes && currentTable.type.includes('16-bit')));
        const isShiftJIS = currentTable && ((currentTable.type === 'shift-jis' || currentTable.type === 'shift_jis') || currentTable._isShiftJIS === true);
        const usesGroupedSelection = (panel === 'hex' && (is16bit || isShiftJIS)) || (panel === 'ascii' && (is16bit || isShiftJIS));

            if (e.shiftKey) {
            const targetRange = this.getSelectionRangeForPanel(pos, panel);
            this.selectionEnd = usesGroupedSelection
                ? targetRange.end
                : targetRange.cursor;
            this.cursorPosition = targetRange.cursor;
            this.activePanel = panel;

            if (!this.shiftClickHintShown && typeof this.showShiftClickHint === 'function') {
                this.showShiftClickHint();
                this.shiftClickHintShown = true;
            }

            this.selectionState.isDragging = false;
        } else {
            this.selectionState.isDragging = true;
            this.selectionState.startPos = usesGroupedSelection
                ? this.getSelectionRangeForPanel(pos, panel).start
                : pos;
            this.selectionState.activePanel = panel;

            const targetRange = this.getSelectionRangeForPanel(pos, panel);
            this.selectionStart = targetRange.start;
            this.selectionEnd = targetRange.end;
            this.cursorPosition = targetRange.cursor;
            this.activePanel = panel;
        }

        this.completeRenderWithColors(this.currentScrollPercent, true);
        this.updateStatus();
    };

    this._contentMouseMoveHandler = (e) => {
        if (!this.selectionState.isDragging) return;

        const target = e.target;
        const offset = target.dataset?.offset;
        const panel = target.dataset?.panel;

        if (!offset || panel !== this.selectionState.activePanel) return;

        e.preventDefault();

        const pos = parseInt(offset);
        const currentTable = this.charTables && this.charTables[this.currentCharTable];
        const is16bit = currentTable && (currentTable.type === '16-bit' || currentTable.type === 'UTF-16' ||
            (currentTable.type && currentTable.type.includes && currentTable.type.includes('16-bit')));
        const isShiftJIS = currentTable && ((currentTable.type === 'shift-jis' || currentTable.type === 'shift_jis') || currentTable._isShiftJIS === true);
        const usesGroupedSelection = (panel === 'hex' && (is16bit || isShiftJIS)) || (panel === 'ascii' && (is16bit || isShiftJIS));
        const targetRange = this.getSelectionRangeForPanel(pos, panel);

        this.selectionEnd = usesGroupedSelection
            ? targetRange.end
            : targetRange.cursor;
        this.cursorPosition = targetRange.cursor;

        this.completeRenderWithColors(this.currentScrollPercent, true);
    };

    this._contentDoubleClickHandler = (e) => {
        const target = e.target;
        const offset = target.dataset?.offset;
        if (!offset) return;

        const pos = parseInt(offset);
        const highlightId = target.dataset?.highlightId;
        const highlight = highlightId
            ? this.highlights.get(parseInt(highlightId))
            : (this.getHighlightAt ? this.getHighlightAt(pos) : null);

        if (!highlight) return;

        e.preventDefault();
        e.stopPropagation();
        this.handleHighlightDoubleClick(highlight.id, pos, target.dataset?.panel || null);
    };

    const originalContentClickHandler = this._contentClickHandler;
    this._contentClickHandler = (e) => {
        const target = e.target;
        const offset = target?.dataset?.offset;
        const panel = target?.dataset?.panel;

        if (this.canUseInsertCursor() && offset && panel && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            const insertPos = this.resolveInsertCursorPosition(target, e, parseInt(offset, 10));
            this.setInsertCursor(insertPos, panel);
            this.focusEditor();
            return;
        }

        return originalContentClickHandler(e);
    };

    const originalContentMouseDownHandler = this._contentMouseDownHandler;
    this._contentMouseDownHandler = (e) => {
        const target = e.target;
        const offset = target?.dataset?.offset;
        const panel = target?.dataset?.panel;

        return originalContentMouseDownHandler(e);
    };

content.addEventListener('click', this._contentClickHandler);
content.addEventListener('mousedown', this._contentMouseDownHandler);
content.addEventListener('mousemove', this._contentMouseMoveHandler);
if (!this._documentEventsBound) {
    document.addEventListener('mouseup', () => {
        if (this.selectionState && this.selectionState.isDragging) {
            this.selectionState.isDragging = false;
        }
    });
}
};

const searchInput = document.getElementById('search-input');
if (searchInput) {
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        this.performSearch();
    }
});
}

document.addEventListener('keydown', (e) => {
if (e.key === 'Escape') {
    if (window.hexEditor) {
        window.hexEditor.hideAddBookmarkModal();
        window.hexEditor.hideCharTableModal();
        window.hexEditor.hideFindReplaceModal();
        window.hexEditor.hideAnalysisModal();
        window.hexEditor.hideGoToModal();
    }
}
});

document.addEventListener('DOMContentLoaded', () => {
    const bookmarkModal = document.getElementById('bookmark-modal');
    if (bookmarkModal) {
        bookmarkModal.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        bookmarkModal.addEventListener('show', () => {
            setTimeout(() => {
                const titleInput = document.getElementById('bookmark-title');
                if (titleInput) {
                    titleInput.focus();
                    titleInput.select();
                }
            }, 100);
        });

        bookmarkModal.addEventListener('keydown', (e) => {
            e.stopPropagation();
        });

        bookmarkModal.addEventListener('keyup', (e) => {
            e.stopPropagation();
        });

        bookmarkModal.addEventListener('keypress', (e) => {
            e.stopPropagation();
        });
    }

    const hexCalculatorModal = document.getElementById('hex-calculator-modal');
    if (hexCalculatorModal) {
        hexCalculatorModal.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        hexCalculatorModal.addEventListener('keydown', (e) => {
            e.stopPropagation();
        });

        hexCalculatorModal.addEventListener('keyup', (e) => {
            e.stopPropagation();
        });

        hexCalculatorModal.addEventListener('keypress', (e) => {
            e.stopPropagation();
        });
    }

    const analysisModal = document.getElementById('analysis-modal');
    if (analysisModal) {
        analysisModal.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        analysisModal.addEventListener('keydown', (e) => {
            e.stopPropagation();
        });

        analysisModal.addEventListener('keyup', (e) => {
            e.stopPropagation();
        });

        analysisModal.addEventListener('keypress', (e) => {
            e.stopPropagation();
        });
    }

    const findReplaceModal = document.getElementById('find-replace-modal');
    if (findReplaceModal) {
        findReplaceModal.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        findReplaceModal.addEventListener('keydown', (e) => {
            e.stopPropagation();
        });

        findReplaceModal.addEventListener('keyup', (e) => {
            e.stopPropagation();
        });

        findReplaceModal.addEventListener('keypress', (e) => {
            e.stopPropagation();
        });
    }
});

document.addEventListener('keydown', (e) => {
this.handleModalShortcuts(e);
});

document.addEventListener('click', (e) => {
if (e.target.classList.contains('modal')) {
    if (e.target.id === 'bookmark-modal') {
        return;
    }
    if (e.target.id === 'hex-calculator-modal') {
        return;
    }
    if (e.target.id === 'analysis-modal') {
        return;
    }
    if (e.target.id === 'find-replace-modal') {
        return;
    }
    if (e.target.id === 'goto-modal') {
        return;
    }
    e.target.classList.remove('show');
    e.target.style.display = 'none';
}
});

this._documentEventsBound = true;
},

handleModalShortcuts(e) {
const findReplaceModal = document.getElementById('find-replace-modal');
const hexCalculatorModal = document.getElementById('hex-calculator-modal');
const gotoModal = document.getElementById('goto-modal');
const bookmarkModal = document.getElementById('bookmark-modal');
const analysisModal = document.getElementById('analysis-modal');
const charTableModal = document.getElementById('char-table-modal');

const isFindReplaceVisible = findReplaceModal && findReplaceModal.classList.contains('show');
const isHexCalculatorVisible = hexCalculatorModal && hexCalculatorModal.classList.contains('show');
const isGotoVisible = gotoModal && gotoModal.classList.contains('show');
const isBookmarkVisible = bookmarkModal && bookmarkModal.classList.contains('show');
const isAnalysisVisible = analysisModal && analysisModal.classList.contains('show');
const isCharTableVisible = charTableModal && charTableModal.classList.contains('show');

const activeElement = document.activeElement;
if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
    return;
}

if (isFindReplaceVisible) {
    switch (e.key) {
        case 'F3':
            e.preventDefault();
            if (e.shiftKey) {
                this.findPrevious();
            } else {
                this.findNext();
            }
            break;

        case 'Enter':
            e.preventDefault();
            this.performSearch();
            break;

        case 'Escape':
            if (this.isModalPinned) {
                this.togglePinModal();
            } else {
                this.hideFindReplaceModal();
            }
            break;
    }
}

if (isHexCalculatorVisible) {
    if (this.hexCalculator && this.hexCalculator.handleKeyPress(e.key)) {
        e.preventDefault();
        return;
    }

    switch (e.key) {
        case 'Escape':
            e.preventDefault();
            this.hideHexCalculatorModal();
            break;

        case 'c':
        case 'C':
            if (e.ctrlKey) {
                e.preventDefault();
                if (this.hexCalculator) {
                    this.hexCalculator.copyToClipboard();
                }
            }
            break;

        case 'v':
        case 'V':
            if (e.ctrlKey) {
                e.preventDefault();
                if (this.hexCalculator) {
                    this.hexCalculator.pasteFromClipboard();
                }
            }
            break;
    }
}

if (isGotoVisible) {
    switch (e.key) {
        case 'Escape':
            e.preventDefault();
            this.hideGoToModal();
            break;

        case 'Enter':
            e.preventDefault();
            this.performGoTo();
            break;
    }
}

if (isBookmarkVisible || isAnalysisVisible || isCharTableVisible) {
    switch (e.key) {
        case 'Escape':
            e.preventDefault();
            if (isBookmarkVisible) {
                this.hideAddBookmarkModal();
            } else if (isAnalysisVisible) {
                this.hideAnalysisModal();
            } else if (isCharTableVisible) {
                this.hideCharTableModal();
            }
            break;
    }
}
}
});
