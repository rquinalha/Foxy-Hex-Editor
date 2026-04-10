Object.assign(FoxyHexEditorComplete.prototype, {
handleKeyPress(event) {
const key = event.key;
const hasCommandKey = event.ctrlKey || event.metaKey;

// Check if we're in an input field or textarea
const activeElement = document.activeElement;
if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
    // Don't handle navigation keys when in input fields
    if (['PageUp', 'PageDown', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) {
        return;
    }

    // Se estamos em um campo de input, nao processar outras teclas do hex editor
    return;
}

// Check if modal de favoritos esta aberto
const bookmarkModal = document.getElementById('bookmark-modal');
if (bookmarkModal && bookmarkModal.classList.contains('show')) {
    // Se o modal de favoritos esta aberto, nao processar teclas de navegacao
    if (['PageUp', 'PageDown', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Tab'].includes(key)) {
        return;
    }

    // Permitir Escape para fechar o modal
    if (key === 'Escape') {
        event.preventDefault();
        this.hideAddBookmarkModal();
        return;
    }

    // Permitir Enter para adicionar favorito
    if (key === 'Enter' && hasCommandKey) {
        event.preventDefault();
        this.addBookmark();
        return;
    }
}

// Check if modal "Ir para" esta aberto
const gotoModal = document.getElementById('goto-modal');
if (gotoModal && gotoModal.classList.contains('show')) {
    if (key === 'Escape') {
        event.preventDefault();
        this.hideGoToModal();
        return;
    }

    if (key === 'Enter') {
        event.preventDefault();
        this.performGoTo();
        return;
    }

    // Se o modal "Ir para" esta aberto, nao processar teclas de navegacao
    if (['PageUp', 'PageDown', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Tab'].includes(key)) {
        return;
    }
}

if (hasCommandKey && event.shiftKey && key.toLowerCase() === 's') {
    event.preventDefault();
    if (typeof saveAsFile === 'function') {
        saveAsFile();
    } else if (window.intelligentSave && typeof window.intelligentSave.saveAs === 'function') {
        window.intelligentSave.saveAs();
    } else if (this.save) {
        this.save();
    }
    return;
}

if (hasCommandKey) {
    switch (key.toLowerCase()) {
        case 'o':
            event.preventDefault();
            if (typeof openFile === 'function') {
                openFile();
            } else {
                document.getElementById('file-input')?.click();
            }
            return;
        case 's':
            event.preventDefault();
            this.save();
            return;
        case 'z':
            event.preventDefault();
            this.undo();
            return;
        case 'y':
            event.preventDefault();
            this.redo();
            return;
        case 'f':
            event.preventDefault();
            this.showFindReplaceModal();
            this.showFindReplaceNotification();
            return;
        case 'b':
            event.preventDefault();
            this.showAddBookmarkModal();
            return;
        case 'g':
            event.preventDefault();
            this.showGoToModal();
            return;
        case 'e':
            event.preventDefault();
            this.toggleEditMode();
            return;
        case 'i':
            event.preventDefault();
            this.toggleInsertMode();
            return;
        case 'a':
            event.preventDefault();
            this.selectAll();
            return;
        case 'c':
            event.preventDefault();
            this.copySelection();
            return;
        case 'v':
            event.preventDefault();
            this.pasteData();
            return;
    }
}

switch (key) {
    case 'F2':
        event.preventDefault();
        this.toggleEditMode();
        return;
    case 'F3':
        event.preventDefault();
        if (event.shiftKey) {
            this.findPrevious();
        } else {
            this.findNext();
        }
        return;
    case 'Insert':
        event.preventDefault();
        this.toggleInsertMode();
        return;
}

// Navigation
switch (key) {
    case 'ArrowLeft':
        event.preventDefault();
        const leftStep = this.isCurrentTable16Bit() && this.activePanel === 'hex' ? -2 : -1;
        if (event.shiftKey) {
            this.extendSelection(leftStep);
        } else {
            this.moveCursor(leftStep);
        }
        this.autoScrollToCursor(this.cursorPosition);
        this.autoScrollTextColumnToCursor(this.cursorPosition);
        break;
    case 'ArrowRight':
        event.preventDefault();
        const rightStep = this.isCurrentTable16Bit() && this.activePanel === 'hex' ? 2 : 1;
        if (event.shiftKey) {
            this.extendSelection(rightStep);
        } else {
            this.moveCursor(rightStep);
        }
        this.autoScrollToCursor(this.cursorPosition);
        this.autoScrollTextColumnToCursor(this.cursorPosition);
        break;
    case 'ArrowUp':
        event.preventDefault();
        if (event.shiftKey) {
            this.extendSelection(-this.bytesPerLine);
        } else {
            this.moveCursor(-this.bytesPerLine);
        }
        this.autoScrollToCursor(this.cursorPosition);
        this.autoScrollTextColumnToCursor(this.cursorPosition);
        break;
    case 'ArrowDown':
        event.preventDefault();
        if (event.shiftKey) {
            this.extendSelection(this.bytesPerLine);
        } else {
            this.moveCursor(this.bytesPerLine);
        }
        this.autoScrollToCursor(this.cursorPosition);
        this.autoScrollTextColumnToCursor(this.cursorPosition);
        break;
    case 'Home':
        event.preventDefault();
        if (event.shiftKey) {
            const lineStart = Math.floor(this.cursorPosition / this.bytesPerLine) * this.bytesPerLine;
            this.extendSelectionTo(lineStart);
        } else {
            const lineStart = Math.floor(this.cursorPosition / this.bytesPerLine) * this.bytesPerLine;
            if (this.canUseInsertCursor()) {
                this.setInsertCursor(lineStart, this.activePanel || 'hex');
            } else {
                this.setCursor(lineStart, null, false);
            }
        }
        this.autoScrollTextColumnToCursor(this.cursorPosition);
        break;
    case 'End':
        event.preventDefault();
        if (event.shiftKey) {
            const lineEnd = Math.floor(this.cursorPosition / this.bytesPerLine) * this.bytesPerLine + this.bytesPerLine - 1;
            this.extendSelectionTo(lineEnd);
        } else {
            const lineStart = Math.floor(this.cursorPosition / this.bytesPerLine) * this.bytesPerLine;
            const lineEndExclusive = Math.min(lineStart + this.bytesPerLine, this.getDataLength());
            if (this.canUseInsertCursor()) {
                this.setInsertCursor(lineEndExclusive, this.activePanel || 'hex');
            } else {
                this.setCursor(Math.max(0, lineEndExclusive - 1), null, false);
            }
        }
        this.autoScrollTextColumnToCursor(this.cursorPosition);
        break;
    case 'PageUp':
        event.preventDefault();
        if (!this.dispatchVirtualNavigation('largeFilePageUp')) {
            const container = document.getElementById('hex-content');
            if (container) {
                const visibleLines = Math.floor(container.clientHeight / this.getEffectiveLineHeight());
                this.moveCursor(-this.bytesPerLine * visibleLines);
            } else {
                this.moveCursor(-this.bytesPerLine * 10);
            }
        }
        break;
    case 'PageDown':
        event.preventDefault();
        if (!this.dispatchVirtualNavigation('largeFilePageDown')) {
            const containerDown = document.getElementById('hex-content');
            if (containerDown) {
                const visibleLines = Math.floor(containerDown.clientHeight / this.getEffectiveLineHeight());
                this.moveCursor(this.bytesPerLine * visibleLines);
            } else {
                this.moveCursor(this.bytesPerLine * 10);
            }
        }
        break;
    case 'Tab':
        event.preventDefault();
        break;
}

// Editing
if (this.editMode === 'edit') {
    if (this.activePanel === 'hex') {
        if (/^[0-9A-Fa-f]$/.test(key)) {
            event.preventDefault();
            this.handleHexEdit(key);
        }
    } else if (this.activePanel === 'ascii') {
        if (key.length === 1 && !hasCommandKey && !event.altKey) {
            event.preventDefault();
            this.handleAsciiEdit(key);
        }
    }

    if (key === 'Backspace') {
        event.preventDefault();
        const is16BitAscii = this.activePanel === 'ascii' && this.isCurrentTable16Bit && this.isCurrentTable16Bit();
        const isShiftJISAscii = this.activePanel === 'ascii' && this.isCurrentTableShiftJIS && this.isCurrentTableShiftJIS();
        if (this.selectionStart !== this.selectionEnd) {
            this.deleteSelection();
        } else if (is16BitAscii && this.insertMode) {
            const targetStart = Math.max(0, this.get16BitCharStart(this.cursorPosition) - 2);
            if (this.delete16BitCharAt(targetStart)) {
                this.setCursor(targetStart, 'ascii', false);
            }
        } else if (is16BitAscii) {
            this.clear16BitCharAt(this.cursorPosition);
        } else if (isShiftJISAscii && this.insertMode) {
            const previousPos = Math.max(0, this.cursorPosition - 1);
            const previousRange = this.getShiftJISCharRange(previousPos);
            if (this.deleteShiftJISCharAt(previousRange.start)) {
                this.setCursor(previousRange.start, 'ascii', false);
            }
        } else if (isShiftJISAscii) {
            this.clearShiftJISCharAt(this.cursorPosition);
        } else if (this.insertMode) {
            if (this.cursorPosition > 0) {
                this.deleteByteAt(this.cursorPosition - 1);
                this.setInsertCursor(this.cursorPosition - 1, this.activePanel || 'hex');
            }
        } else {
            this.editByte(this.cursorPosition, 0x00, 'Clear byte');
        }
    } else if (key === 'Delete') {
        event.preventDefault();
        const is16BitAscii = this.activePanel === 'ascii' && this.isCurrentTable16Bit && this.isCurrentTable16Bit();
        const isShiftJISAscii = this.activePanel === 'ascii' && this.isCurrentTableShiftJIS && this.isCurrentTableShiftJIS();
        if (this.selectionStart !== this.selectionEnd) {
            this.deleteSelection();
        } else if (is16BitAscii && this.insertMode) {
            if (this.delete16BitCharAt(this.cursorPosition)) {
                this.setCursor(this.get16BitCharStart(this.cursorPosition), 'ascii', false);
            }
        } else if (is16BitAscii) {
            this.clear16BitCharAt(this.cursorPosition);
        } else if (isShiftJISAscii && this.insertMode) {
            const currentRange = this.getShiftJISCharRange(this.cursorPosition);
            if (this.deleteShiftJISCharAt(currentRange.start)) {
                this.setCursor(currentRange.start, 'ascii', false);
            }
        } else if (isShiftJISAscii) {
            this.clearShiftJISCharAt(this.cursorPosition);
        } else if (this.insertMode) {
            this.deleteByteAt(this.cursorPosition);
        } else {
            this.editByte(this.cursorPosition, 0x00, 'Clear byte');
        }
    }
}
},
});
