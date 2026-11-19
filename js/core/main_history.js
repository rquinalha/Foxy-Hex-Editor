Object.assign(FoxyHexEditorComplete.prototype, {
toggleEditMode() {
    this.editMode = this.editMode === 'view' ? 'edit' : 'view';
    this.updateModeUI();
    this.render();
},

toggleInsertMode() {
    const hadSelection = Number.isInteger(this.selectionStart)
        && Number.isInteger(this.selectionEnd)
        && this.selectionStart !== this.selectionEnd;
    const preservedSelection = hadSelection
        ? {
            start: this.selectionStart,
            end: this.selectionEnd,
            cursor: this.cursorPosition
        }
        : null;

    this.insertMode = !this.insertMode;

    if (this.insertMode && this.editMode !== 'edit') {
        this.editMode = 'edit';
    }

    this.updateModeUI();

    const dataLength = this.getDataLength();
    const panel = this.activePanel || 'hex';

    if (preservedSelection) {
        this.selectionStart = preservedSelection.start;
        this.selectionEnd = preservedSelection.end;
        this.cursorPosition = preservedSelection.cursor;
        this.renderCurrentView(true);
        this.updateStatus();
    } else if (this.insertMode) {
        this.setInsertCursor(this.clampCursorPosition(this.cursorPosition, true), panel);
    } else if (dataLength > 0) {
        this.setCursor(Math.min(this.cursorPosition, dataLength - 1), panel, false);
    } else {
        this.render();
        this.updateStatus();
    }
},

updateModeUI() {
    const indicator = document.getElementById('mode-indicator');
    const icon = document.getElementById('mode-icon');
    const text = document.getElementById('mode-text');
    const toggle = document.getElementById('edit-toggle');
    const toggleText = document.getElementById('edit-toggle-text');
    const insertToggleText = document.getElementById('insert-mode-toggle-text');
    if (!indicator || !icon || !text || !toggle) return;

    const i18n = window.I18n || { t: (key) => key };

    if (this.editMode === 'view') {
        indicator.className = 'mode-indicator view';
        icon.textContent = '👁️';
        text.textContent = i18n.t('mode.view');
        if (toggleText) toggleText.textContent = i18n.t('mode.edit.enable');
        if (insertToggleText) insertToggleText.textContent = this.insertMode ? i18n.t('mode.insert') : i18n.t('mode.overwrite');
    } else {
        indicator.className = 'mode-indicator edit';
        if (this.insertMode) {
            icon.textContent = '➕';
            text.textContent = i18n.t('mode.insert');
        } else {
            icon.textContent = '✏️';
            text.textContent = i18n.t('mode.edit');
        }
        if (toggleText) toggleText.textContent = i18n.t('mode.view_only');
        if (insertToggleText) insertToggleText.textContent = this.insertMode ? i18n.t('mode.insert') : i18n.t('mode.overwrite');
    }

    if (this.editMode === 'view') {
        icon.textContent = '\u{1F441}\uFE0F';
    } else {
        icon.textContent = this.insertMode ? '\u2795' : '\u270F\uFE0F';
    }
},

moveCursor(delta) {
    if (this.getDataLength() === 0 && !this.canUseInsertCursor()) {
        return;
    }

    const newPosition = this.cursorPosition + delta;
    const clampedPosition = this.clampCursorPosition(newPosition, this.canUseInsertCursor());
    if (this.canUseInsertCursor()) {
        this.setInsertCursor(clampedPosition, this.activePanel || 'hex');
    } else {
        this.setCursor(clampedPosition, null, false);
    }
    this.focusEditor();
},

focusEditor() {
    const hexContent = document.getElementById('hex-content');
    if (hexContent) {
        hexContent.focus();
    }
},

isCursorVisible() {
    const container = document.getElementById('hex-content');
    if (!container || this.getDataLength() === 0) return true;

    const maxPosition = this.getDataLength() - 1;
    const validCursorPosition = Math.max(0, Math.min(this.cursorPosition, maxPosition));
    const cursorLine = Math.floor(validCursorPosition / this.bytesPerLine);
const lineHeight = this.getEffectiveLineHeight();
    const containerHeight = container.clientHeight;
    const scrollTop = container.scrollTop;
    const cursorTop = cursorLine * lineHeight;

    return cursorTop >= scrollTop && cursorTop <= scrollTop + containerHeight - lineHeight;
},

saveState(description, options = {}) {
    if (this.historyIndex < this.history.length - 1) {
        this.history = this.history.slice(0, this.historyIndex + 1);
    }

    const isLarge = this.shouldUseLightweightHistorySnapshot?.();
    let state;
    if (isLarge) {
        state = {
            isLightweight: true,
            snapshot: this.createDataSnapshot(),
            change: options.change || null,
            description,
            timestamp: new Date(),
            cursorPosition: this.cursorPosition,
            modifiedBytes: new Set(this.modifiedBytes)
        };
    } else {
        state = {
            data: this.createDataSnapshot(),
            description,
            timestamp: new Date(),
            cursorPosition: this.cursorPosition,
            modifiedBytes: new Set(this.modifiedBytes)
        };
    }

    this.history.push(state);
    this.historyIndex++;

    // Bound the memory retained by undo snapshots, including structural edits.
    let historyBytes = 0;
    const buffers = new Set();
    for (let index = this.history.length - 1; index >= 0; index--) {
        const entry = this.history[index];
        const snapshot = entry.data || entry.snapshot;
        const arrays = snapshot instanceof Uint8Array
            ? [snapshot]
            : (snapshot?.virtualSegments || []).filter(segment => segment.type === 'insert').map(segment => segment.data);
        historyBytes += (snapshot?.modifiedOverlay?.size || 0) * 48;
        for (const bytes of arrays) {
            if (!buffers.has(bytes.buffer)) {
                historyBytes += bytes.buffer.byteLength;
                buffers.add(bytes.buffer);
            }
        }
        if (index < this.historyIndex && (historyBytes > 32 * 1024 * 1024 || this.history.length - index > this.maxHistorySize)) {
            this.history.splice(0, index + 1);
            this.historyIndex -= index + 1;
            break;
        }
    }

    this.updateHistoryUI();
    this.updateButtons();
    this.emit('stateChange', state);
    return this;
},

restoreState(state) {
    this.documentBytesChanged?.();
    if (this.editingBytes && this.editingBytes.size > 0) {
        this.editingBytes.clear();
    }
    this.nibblePosition = 0;

    if (state && state.isLightweight) {
        this.cursorPosition = state.cursorPosition;
        this.modifiedBytes = new Set(state.modifiedBytes);
        this.restoreDataSnapshot(state.snapshot);
        this.hasUnsavedChanges = this.modifiedBytes.size > 0 || !!this.hasVirtualStructuralChanges?.() || !!this.hasVirtualOverlayChanges?.();
        this.render();
        return this;
    }

    this.restoreDataSnapshot(state.data);
    this.cursorPosition = state.cursorPosition;
    this.modifiedBytes = new Set(state.modifiedBytes);
    this.hasUnsavedChanges = state.data !== this.originalData;
    if (!this.hasUnsavedChanges) this.modifiedBytes.clear();
    this.render();
    return this;
},

clearHistory() {
    this.history = [];
    this.historyIndex = -1;
    this.modifiedBytes.clear();
    if (this.editingBytes && this.editingBytes.size > 0) {
        this.editingBytes.clear();
    }
    this.hasUnsavedChanges = false;
    return this;
},

undo() {
    if (this.isDocumentEditLocked?.()) return this;
    if (this.historyIndex > 0) {
        this.historyIndex--;
        const state = this.history[this.historyIndex];
        this.restoreState(state);
        this.updateHistoryUI();
        this.updateButtons();
        if (window.intelligentSave) {
            window.intelligentSave.updateSaveButton();
        }
        if (window.foxySaveManager && window.foxySaveManager.updateSaveButtonIndicator) {
            window.foxySaveManager.updateSaveButtonIndicator();
        }
        this.emit('undo', state);
    }
    this.render();
    return this;
},

redo() {
    if (this.isDocumentEditLocked?.()) return this;
    if (this.historyIndex < this.history.length - 1) {
        this.historyIndex++;
        const state = this.history[this.historyIndex];
        this.restoreState(state);
        this.updateHistoryUI();
        this.updateButtons();
        if (window.intelligentSave) {
            window.intelligentSave.updateSaveButton();
        }
        if (window.foxySaveManager && window.foxySaveManager.updateSaveButtonIndicator) {
            window.foxySaveManager.updateSaveButtonIndicator();
        }
        this.emit('redo', state);
    }
    this.render();
    return this;
},

updateHistoryUI() {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;

    historyList.innerHTML = '';
    this.history.forEach((state, index) => {
        const item = document.createElement('div');
        item.className = `history-item ${index === this.historyIndex ? 'current' : ''}`;
        item.innerHTML = `
            <div><strong>${state.description}</strong></div>
            <div style="font-size: 10px; color: #666;">${state.timestamp.toLocaleTimeString()}</div>
        `;
        item.addEventListener('click', () => this.goToHistoryState(index));
        historyList.appendChild(item);
    });

    const currentItem = historyList.querySelector('.current');
    if (currentItem) {
        currentItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
},

goToHistoryState(index) {
    if (this.isDocumentEditLocked?.()) return this;
    if (index >= 0 && index < this.history.length) {
        this.historyIndex = index;
        const state = this.history[index];
        this.restoreState(state);
        this.updateHistoryUI();
        this.updateButtons();
    }
},

updateButtons() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    const saveBtn = document.getElementById('save-btn');

    if (undoBtn) undoBtn.disabled = this.historyIndex <= 0;
    if (redoBtn) redoBtn.disabled = this.historyIndex >= this.history.length - 1;

    if (saveBtn) {
        const hasUnsavedChanges = this.hasUnsavedChanges;
        const hasModifiedBytes = this.modifiedBytes ? this.modifiedBytes.size > 0 : false;
        const hasChanges = hasUnsavedChanges || hasModifiedBytes;

        if (hasModifiedBytes && !hasUnsavedChanges) {
            this.hasUnsavedChanges = true;
        }

        saveBtn.disabled = !hasChanges;
        if (hasChanges) {
            saveBtn.classList.add('has-changes');
        } else {
            saveBtn.classList.remove('has-changes');
        }
    }

    // Atualizar estado dos botões da sidebar de favoritos
    if (typeof this.updateBookmarkSidebarButtons === 'function') {
        this.updateBookmarkSidebarButtons();
    }
}
});
