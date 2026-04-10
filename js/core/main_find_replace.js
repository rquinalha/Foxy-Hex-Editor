Object.assign(FoxyHexEditorComplete.prototype, {
// === FIND & REPLACE ===
    async performReplace(params = null) {
        const findInput = document.getElementById('find-input');
        const replaceInput = document.getElementById('replace-input');
        const caseSensitiveEnabled = params?.caseSensitive ?? (document.getElementById('case-sensitive')?.checked || false);
        const regexModeEnabled = params?.regexMode ?? (document.getElementById('regex-mode')?.checked || false);
        const wholeWordEnabled = params?.wholeWord ?? (document.getElementById('whole-word')?.checked || false);
        const replaceAll = params?.replaceAll ?? (document.getElementById('replace-all')?.checked || false);
        const searchAllTabs = params?.searchAllTabs ?? (document.getElementById('search-all-tabs')?.checked || false);

        const findValue = typeof params?.findValue === 'string'
            ? params.findValue.trim()
            : (findInput ? findInput.value.trim() : this.lastSearchTerm);
        const replaceValue = typeof params?.replaceValue === 'string'
            ? params.replaceValue.trim()
            : (replaceInput ? replaceInput.value.trim() : '');

        if (searchAllTabs) {
            window.notificationSystem.warning('Substituir em todas as abas ainda nao esta disponivel nesta fase.', 'Busca Multi-Abas');
            return;
        }

        if (!findValue) {
            window.notificationSystem.error('Por favor, insira um termo para buscar.', 'Campo Obrigatorio');
            return;
        }

        if (!replaceValue) {
            window.notificationSystem.error('Por favor, insira um valor para substituir.', 'Campo Obrigatorio');
            return;
        }

        const previousEditMode = this.editMode;
        let temporarilyEnabledEditMode = false;

        if (this.editMode !== 'edit') {
            this.editMode = 'edit';
            temporarilyEnabledEditMode = true;
            if (typeof this.updateModeUI === 'function') {
                this.updateModeUI();
            }
        }

        try {
            const shouldRefreshResults =
                this.searchResults.length === 0 ||
                this.lastSearchTerm !== findValue;

            if (shouldRefreshResults) {
                await this.performSearch({
                    findValue,
                    caseSensitive: caseSensitiveEnabled,
                    wholeWord: wholeWordEnabled,
                    regexMode: regexModeEnabled,
                    searchAllTabs: false
                });
            }

            if (this.searchResults.length === 0) {
                const i18n = window.I18n || { t: (k) => k };
                window.notificationSystem.warning(i18n.t('replace.warning.no_results'), i18n.t('replace.warning.title'));
                return;
            }

            let replaceBytes = [];
            const hexPattern = /^[0-9A-Fa-f\s]+$/;

            if (hexPattern.test(replaceValue) && replaceValue.includes(' ')) {
                const cleanHex = replaceValue.replace(/\s+/g, '');
                if (cleanHex.length % 2 !== 0) {
                    const i18n = window.I18n || { t: (k) => k };
                    window.notificationSystem.error(i18n.t('replace.error.invalid_hex'), i18n.t('replace.error.format.title'));
                    return;
                }
                for (let i = 0; i < cleanHex.length; i += 2) {
                    const byte = parseInt(cleanHex.substr(i, 2), 16);
                    if (isNaN(byte)) {
                        const i18n = window.I18n || { t: (k) => k };
                        window.notificationSystem.error(i18n.t('replace.error.invalid_chars'), i18n.t('replace.error.format.title'));
                        return;
                    }
                    replaceBytes.push(byte);
                }
            } else if (hexPattern.test(replaceValue) && replaceValue.length % 2 === 0) {
                for (let i = 0; i < replaceValue.length; i += 2) {
                    const byte = parseInt(replaceValue.substr(i, 2), 16);
                    if (isNaN(byte)) {
                        const i18n = window.I18n || { t: (k) => k };
                        window.notificationSystem.error(i18n.t('replace.error.invalid_chars'), i18n.t('replace.error.format.title'));
                        return;
                    }
                    replaceBytes.push(byte);
                }
            } else {
                const currentTable = this.charTables && this.currentCharTable ? this.charTables[this.currentCharTable] : null;
                const isShiftJIS = currentTable && ((currentTable.type === 'shift-jis' || currentTable.type === 'shift_jis') || currentTable._isShiftJIS === true);

                if (this.charDecoder16) {
                    replaceBytes = (typeof this.encodeTextWithCurrentTable === 'function'
                        ? this.encodeTextWithCurrentTable(replaceValue, true)
                        : this.textTo16bitBytes(replaceValue));
                    if (!replaceBytes || replaceBytes.length === 0) {
                        const i18n = window.I18n || { t: (k) => k };
                        window.notificationSystem.error(i18n.t('replace.error.conversion.16bit'), i18n.t('replace.error.conversion.title'));
                        return;
                    }
                } else if (isShiftJIS) {
                    replaceBytes = this.textToShiftJISBytes(replaceValue, true) || this.textToShiftJISBytes(replaceValue, false);
                    if (!replaceBytes || replaceBytes.length === 0) {
                        const i18n = window.I18n || { t: (k) => k };
                        window.notificationSystem.error(i18n.t('replace.error.conversion.shiftjis'), i18n.t('replace.error.conversion.title'));
                        return;
                    }
                } else if (currentTable && (currentTable.mappings || currentTable.mapping)) {
                    replaceBytes = (typeof this.encodeTextWithCurrentTable === 'function'
                        ? this.encodeTextWithCurrentTable(replaceValue, true)
                        : null)
                        || (typeof this.encodeTextWithCurrentTable === 'function'
                            ? this.encodeTextWithCurrentTable(replaceValue, false)
                            : null)
                        || this.textToCustomTableBytes(replaceValue, true)
                        || this.textToCustomTableBytes(replaceValue, false);
                    if (!replaceBytes || replaceBytes.length === 0) {
                        const i18n = window.I18n || { t: (k) => k };
                        window.notificationSystem.error(i18n.t('replace.error.conversion.custom'), i18n.t('replace.error.conversion.title'));
                        return;
                    }
                } else {
                    replaceBytes = Array.from(new TextEncoder().encode(replaceValue));
                }
            }

            let replacedCount = 0;

            if (replaceAll) {
                for (let i = this.searchResults.length - 1; i >= 0; i--) {
                    const result = this.searchResults[i];
                    if (this.replaceAtOffset(result.offset, result.length, replaceBytes)) {
                        replacedCount++;
                    }
                }
            } else {
                const targetIndex = (this.currentSearchIndex >= 0 && this.currentSearchIndex < this.searchResults.length)
                    ? this.currentSearchIndex
                    : 0;
                if (targetIndex >= 0 && targetIndex < this.searchResults.length) {
                    const result = this.searchResults[targetIndex];
                    if (this.replaceAtOffset(result.offset, result.length, replaceBytes)) {
                        replacedCount = 1;
                        this.currentSearchIndex = targetIndex;
                    }
                }
            }

            this.render();
            this.updateSearchResults();
            if (this.syncSearchWindow) this.syncSearchWindow();

            if (replacedCount === 0) {
                const i18n = window.I18n || { t: (k) => k };
                window.notificationSystem.warning(i18n.t('replace.warning.no_results'), i18n.t('replace.warning.title'));
            } else if (replaceAll) {
                const i18n = window.I18n || { t: (k) => k };
                window.notificationSystem.success(i18n.t('replace.success.multiple').replace('{count}', replacedCount), i18n.t('replace.success.title'));
            } else {
                const i18n = window.I18n || { t: (k) => k };
                window.notificationSystem.success(i18n.t('replace.success.single'), i18n.t('replace.success.title'));
            }

            if (replaceAll) {
                this.searchResults = [];
                this.currentSearchIndex = -1;
                this.updateSearchResults();
                if (this.syncSearchWindow) this.syncSearchWindow();
            } else {
                if (this.currentSearchIndex >= 0 && this.currentSearchIndex < this.searchResults.length) {
                    this.searchResults.splice(this.currentSearchIndex, 1);
                    if (this.currentSearchIndex >= this.searchResults.length) {
                        this.currentSearchIndex = this.searchResults.length - 1;
                    }
                }
                this.updateSearchResults();
                if (this.syncSearchWindow) this.syncSearchWindow();
            }
        } finally {
            if (temporarilyEnabledEditMode) {
                this.editMode = previousEditMode;
                if (typeof this.updateModeUI === 'function') {
                    this.updateModeUI();
                }
            }
        }
    },
// === SEARCH HIGHLIGHTING ===
getSearchHighlight(offset) {
if (!this.searchResultsSet || this.searchResultsSet.size === 0) return null;

if (this.searchResultsSet.has(offset)) {
    return {
        current: this.currentSearchIndex >= 0 && 
                 this.searchResults[this.currentSearchIndex] && 
                 offset >= this.searchResults[this.currentSearchIndex].offset && 
                 offset < this.searchResults[this.currentSearchIndex].offset + this.searchResults[this.currentSearchIndex].length
    };
}
return null;
},

// === REPLACE METHODS ===
replaceAtOffset(offset, length, newBytes) {
if (offset < 0 || offset + length > this.getDataLength()) {
return false;
}

const payload = this.normalizeByteArray ? this.normalizeByteArray(newBytes) : new Uint8Array(newBytes || []);
const replacementEnd = offset + length;
const replaced = this.replaceSelectionWithBytes(
    offset,
    replacementEnd,
    payload,
    true,
    'Replace match'
);

if (!replaced) {
return false;
}

this.hasUnsavedChanges = true;
this.emit('dataChanged', {
    offset,
    length,
    newBytes: payload,
    insertMode: !!this.insertMode
});

return true;
},

recordChange(offset, oldBytes, newBytes) {
const change = {
offset,
oldBytes,
newBytes,
timestamp: Date.now()
};

// Remove any future history if we're not at the end
if (this.historyIndex < this.history.length - 1) {
this.history = this.history.slice(0, this.historyIndex + 1);
}

this.history.push(change);
this.historyIndex++;

// Limit history size
if (this.history.length > this.maxHistorySize) {
this.history.shift();
this.historyIndex--;
}
}

});



