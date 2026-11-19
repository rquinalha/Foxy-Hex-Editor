Object.assign(FoxyHexEditorComplete.prototype, {
    getChunkedSearchResultLimit() {
        return 50000;
    },

    async performSearch(params = null) {
        params ??= this.lastDocumentSearchOptions || null;
        const findInput = document.getElementById('find-input');
        let searchTerm = typeof params?.findValue === 'string'
            ? params.findValue.trim()
            : (findInput ? findInput.value.trim() : this.lastSearchTerm);

        if (!searchTerm) {
            this.clearSearch();
            return;
        }

        const caseSensitive = params?.caseSensitive ?? (document.getElementById('case-sensitive')?.checked || false);
        const wholeWord = params?.wholeWord ?? (document.getElementById('whole-word')?.checked || false);
        const regexMode = params?.regexMode ?? (document.getElementById('regex-mode')?.checked || false);
        const searchAllTabs = params?.searchAllTabs ?? (document.getElementById('search-all-tabs')?.checked || false);

        if (this.performDocumentSearch && window.fileTabManager) {
            return this.performDocumentSearch(searchTerm, { ...params, caseSensitive, wholeWord, regexMode, searchAllTabs });
        }

        this.lastSearchTerm = searchTerm;
        this.searchResults = [];
        this.currentSearchIndex = -1;
        this.globalTabSearchActive = false;
        this.globalTabSearchGroups = [];
        this.globalTabSearchSkippedLargeCount = 0;

        const fileSize = this.getDataLength();
        const currentTable = this.charTables && this.currentCharTable ? this.charTables[this.currentCharTable] : null;
        const isCustom16Bit = !!this.charDecoder16;
        const isShiftJIS = !!(currentTable && ((currentTable.type === 'shift-jis' || currentTable.type === 'shift_jis') || currentTable._isShiftJIS === true));
        const isCustom8Bit = !!(currentTable && (currentTable.mappings || currentTable.mapping) && this.currentCharTable !== 'ascii');
        const directByteSearchBytes = isCustom8Bit && typeof this.getDirectByteCompatibleSearchBytes === 'function'
            ? this.getDirectByteCompatibleSearchBytes(searchTerm, caseSensitive, currentTable)
            : null;
        const usesAsciiCompatibleTablePath = !!directByteSearchBytes;
        const usesGameTableSearch = isCustom16Bit || isShiftJIS || (isCustom8Bit && !usesAsciiCompatibleTablePath);
        const hexPattern = /^[0-9A-Fa-f\s]+$/;
        const isHexSearch = (hexPattern.test(searchTerm) && searchTerm.includes(' ')) ||
            (hexPattern.test(searchTerm) && searchTerm.length % 2 === 0 && searchTerm.length > 0);

        if (isHexSearch) {
            this.searchMode = 'hex';
            if (this.shouldUseExternalSearch?.({ dataLength: fileSize, usesSpecialTableSearch: false })) {
                await this.performIntegratedExternalHexSearch(searchTerm, wholeWord);
                return;
            }
            if (fileSize > this.getExternalSearchThreshold?.()) {
                await this.chunkedHexSearch(searchTerm);
            } else {
                this.searchHex(searchTerm);
            }

            this.updateSearchResults();
            if (this.searchResults.length > 0) {
                this.currentSearchIndex = 0;
                this.goToSearchResult(0);
            }

            this.render();
            if (this.syncSearchWindow) {
                this.syncSearchWindow();
            }
            return;
        }

        if (this.shouldUseExternalSearch?.({
            dataLength: fileSize,
            usesSpecialTableSearch: usesGameTableSearch
        })) {
            await this.performIntegratedExternalSearch(searchTerm, caseSensitive, wholeWord, regexMode);
            return;
        }

        if (regexMode) {
            this.searchMode = 'regex';
            this.searchRegex(searchTerm, caseSensitive ? 'g' : 'gi');
        } else {
            this.searchMode = 'text';
            if (fileSize > this.getExternalSearchThreshold?.()) {
                await this.chunkedTextSearch(searchTerm, caseSensitive, wholeWord);
            } else {
                this.searchText(searchTerm, caseSensitive, wholeWord);
            }
        }

        this.updateSearchResults();
        if (this.searchResults.length > 0) {
            this.currentSearchIndex = 0;
            this.goToSearchResult(0);
        }

        this.render();
        
        if (this.syncSearchWindow) {
            this.syncSearchWindow();
        }
    },

performFastSearch(searchTerm, caseSensitive, wholeWord) {
    const hexPattern = /^[0-9A-Fa-f\s]+$/;
    const isHex = (hexPattern.test(searchTerm) && searchTerm.includes(' ')) ||
        (hexPattern.test(searchTerm) && searchTerm.length % 2 === 0 && searchTerm.length > 0);

    if (isHex) {
        this.searchMode = 'hex';
        this.searchHex(searchTerm);
    } else {
        this.searchMode = 'text';
        this.fastTextSearch(searchTerm, caseSensitive, wholeWord).then(() => {
            this.updateSearchResults();
            if (this.searchResults.length > 0) {
                this.currentSearchIndex = 0;
                this.goToSearchResult(0);
            }
            this.render();
        }).catch(() => {
            this.searchText(searchTerm, caseSensitive, wholeWord);
            this.updateSearchResults();
            if (this.searchResults.length > 0) {
                this.currentSearchIndex = 0;
                this.goToSearchResult(0);
            }
            this.render();
        });
        return;
    }

    this.updateSearchResults();
    if (this.searchResults.length > 0) {
        this.currentSearchIndex = 0;
        this.goToSearchResult(0);
    }
    this.render();
},

async chunkedTextSearch(text, caseSensitive = false, wholeWord = false) {
    const currentTable = this.charTables && this.currentCharTable ? this.charTables[this.currentCharTable] : null;
    const isShiftJIS = !!(currentTable && ((currentTable.type === 'shift-jis' || currentTable.type === 'shift_jis') || currentTable._isShiftJIS === true));
    const isCustomTable = !!(currentTable && (currentTable.mappings || currentTable.mapping) && this.currentCharTable !== 'ascii');
    const directByteSearchBytes = isCustomTable && typeof this.getDirectByteCompatibleSearchBytes === 'function'
        ? this.getDirectByteCompatibleSearchBytes(text, caseSensitive, currentTable)
        : null;
    const useSimpleBytePath = !!directByteSearchBytes;
    const useDecodedWholeWord = wholeWord && (isShiftJIS || (isCustomTable && !useSimpleBytePath));

    if (this.charDecoder16) {
        return this.searchText16bit(text, caseSensitive, wholeWord);
    }

    const searchBytes = isShiftJIS
        ? new Uint8Array(this.textToShiftJISBytes(text, caseSensitive) || [])
        : directByteSearchBytes
            ? directByteSearchBytes
            : isCustomTable
                ? new Uint8Array(this.textToCustomTableBytes(text, caseSensitive) || [])
            : new TextEncoder().encode(caseSensitive ? text : text.toLowerCase());
    if (!searchBytes || searchBytes.length === 0) {
        return [];
    }
    const searchLen = searchBytes.length;
    const dataLen = this.getDataLength();
    const chunkSize = 4 * 1024 * 1024;
    const overlap = searchLen - 1;
    const resultLimit = this.getChunkedSearchResultLimit();
    let truncated = false;
    const canRenderProgress = typeof document !== 'undefined' &&
        document &&
        typeof document.getElementById === 'function' &&
        typeof document.createElement === 'function' &&
        document.body;

    if (canRenderProgress && !document.getElementById('search-progress-modal')) {
        this.showSearchProgressModal();
        this.updateSearchProgress(0);
    }

    const badCharTable = this.boyerMooreBadCharShift(searchBytes, !caseSensitive);
    const isWordChar = (b) => (b >= 48 && b <= 57) || (b >= 65 && b <= 90) || (b >= 97 && b <= 122);

    outerLoop:
    for (let chunkStart = 0; chunkStart < dataLen; chunkStart += chunkSize) {
        const chunkEnd = Math.min(chunkStart + chunkSize + overlap, dataLen);
        const chunkLen = chunkEnd - chunkStart;

        const chunk = this.getRangeAt(chunkStart, chunkLen);
        if (!chunk || chunk.length === 0) break;

        const actualLen = chunk.length;

        let i = 0;
        const limit = actualLen - searchLen;

        while (i <= limit) {
            let j = searchLen - 1;
            let match = true;
            while (j >= 0) {
                let db = chunk[i + j];
                let pb = searchBytes[j];
                if (!caseSensitive) {
                    if (db >= 65 && db <= 90) db += 32;
                    if (pb >= 65 && pb <= 90) pb += 32;
                }
                if (db !== pb) { match = false; break; }
                j--;
            }
            if (match) {
                const absoluteOffset = chunkStart + i;
                if (wholeWord) {
                    if (useDecodedWholeWord) {
                        const candidate = {
                            offset: absoluteOffset,
                            length: searchLen,
                            type: isShiftJIS ? 'text_shiftjis' : 'text_custom'
                        };
                        if (!this.isWholeWordResultLocal(candidate)) { i++; continue; }
                    } else {
                    let beforeWord = false;
                    if (i > 0) {
                        beforeWord = isWordChar(chunk[i - 1]);
                    } else if (chunkStart > 0) {
                        beforeWord = isWordChar(this.getByteAt(chunkStart - 1));
                    }
                    
                    const afterWord = i + searchLen < actualLen && isWordChar(chunk[i + searchLen]);
                    if (beforeWord || afterWord) { i++; continue; }
                    }
                }

                if (this.searchResults.length >= resultLimit) {
                    truncated = true;
                    break outerLoop;
                }

                this.searchResults.push({
                    offset: absoluteOffset,
                    length: searchLen,
                    type: isShiftJIS ? 'text_shiftjis' : (isCustomTable ? 'text_custom' : 'text')
                });
                i++;
            } else {
                i += Math.max(1, badCharTable[chunk[i + j]] - (searchLen - 1 - j));
            }
        }

        const progress = Math.round(((chunkStart + chunkLen) / dataLen) * 100);
        if (canRenderProgress) {
            this.updateSearchProgress(progress);
        }

        if (chunkStart % (10 * 1024 * 1024) === 0) {
            if (typeof setTimeout === 'function') {
                await new Promise(resolve => setTimeout(resolve, 0));
            } else {
                await Promise.resolve();
            }
        }
    }

    if (canRenderProgress) {
        this.updateSearchProgress(100);
        if (typeof setTimeout === 'function') {
            setTimeout(() => this.hideSearchProgressModal(), 500);
        } else {
            this.hideSearchProgressModal();
        }
    }

    if (truncated && window.notificationSystem) {
        window.notificationSystem.warning(`Resultados limitados aos primeiros ${resultLimit} matches para evitar travamento.`, 'Busca Grande');
    }

    this.emit('searchComplete', this.searchResults);
    return this.searchResults;
},

async chunkedHexSearch(pattern) {
    const cleanHex = pattern.replace(/\s+/g, '');
    if (cleanHex.length % 2 !== 0) return [];

    const searchBytes = [];
    for (let i = 0; i < cleanHex.length; i += 2) {
        searchBytes.push(parseInt(cleanHex.substr(i, 2), 16));
    }
    const searchPattern = new Uint8Array(searchBytes);

    const searchLen = searchPattern.length;
    const dataLen = this.getDataLength();
    const chunkSize = 4 * 1024 * 1024;
    const overlap = searchLen - 1;
    const resultLimit = this.getChunkedSearchResultLimit();
    let truncated = false;
    const canRenderProgress = typeof document !== 'undefined' &&
        document &&
        typeof document.getElementById === 'function' &&
        typeof document.createElement === 'function' &&
        document.body;

    if (canRenderProgress && !document.getElementById('search-progress-modal')) {
        this.showSearchProgressModal();
        this.updateSearchProgress(0);
    }

        const badCharTable = this.boyerMooreBadCharShift(searchPattern);

    outerLoop:
    for (let chunkStart = 0; chunkStart < dataLen; chunkStart += chunkSize) {
        const chunkEnd = Math.min(chunkStart + chunkSize + overlap, dataLen);
        const chunkLen = chunkEnd - chunkStart;

        const chunk = this.getRangeAt(chunkStart, chunkLen);
        if (!chunk || chunk.length === 0) break;

        let i = 0;
        const limit = chunkLen - searchLen;

        while (i <= limit) {
            let j = searchLen - 1;
            while (j >= 0 && searchPattern[j] === chunk[i + j]) j--;
            if (j < 0) {
                const absoluteOffset = chunkStart + i;

                if (this.searchResults.length >= resultLimit) {
                    truncated = true;
                    break outerLoop;
                }

                this.searchResults.push({
                    offset: absoluteOffset,
                    length: searchLen,
                    type: 'hex'
                });
                i++;
            } else {
                i += Math.max(1, badCharTable[chunk[i + j]] - (searchLen - 1 - j));
            }
        }

        const progress = Math.round(((chunkStart + chunkLen) / dataLen) * 100);
        if (canRenderProgress) {
            this.updateSearchProgress(progress);
        }

        if (chunkStart % (10 * 1024 * 1024) === 0) {
            if (typeof setTimeout === 'function') {
                await new Promise(resolve => setTimeout(resolve, 0));
            } else {
                await Promise.resolve();
            }
        }
    }

    if (canRenderProgress) {
        this.updateSearchProgress(100);
        if (typeof setTimeout === 'function') {
            setTimeout(() => this.hideSearchProgressModal(), 500);
        } else {
            this.hideSearchProgressModal();
        }
    }

    if (truncated && window.notificationSystem) {
        window.notificationSystem.warning(`Resultados limitados aos primeiros ${resultLimit} matches para evitar travamento.`, 'Busca HEX Grande');
    }

    this.emit('searchComplete', this.searchResults);
    return this.searchResults;
},

showSearchProgressModal() {
    const modal = document.createElement('div');
    modal.id = 'search-progress-modal';
    const i18n = window.I18n || { t: (k) => k };
    modal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.8); display: flex; justify-content: center;
                    align-items: center; z-index: 999999;">
            <div style="background: linear-gradient(135deg, #1a1a2e, #16213e);
                        padding: 30px; border-radius: 12px; text-align: center;
                        min-width: 300px; border: 1px solid rgba(255, 255, 255, 0.1);
                        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5); color: #ffffff;">
                <h3 style="color: #ff6b35; margin-bottom: 20px;">${i18n.t('search.progress.title')}</h3>
                <div id="search-progress-bar" style="width: 100%; height: 20px;
                     background: rgba(26, 26, 46, 0.8); border-radius: 10px; margin: 20px 0;
                     overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.2);">
                    <div id="search-progress-fill" style="height: 100%; background: #ff6b35;
                         width: 0%; transition: width 0.3s;"></div>
                </div>
                <p id="search-progress-text" style="color: #ffffff;">${i18n.t('search.progress.starting')}</p>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
},

updateSearchProgress(percent) {
    const fill = document.getElementById('search-progress-fill');
    const text = document.getElementById('search-progress-text');
    if (fill && text) {
        const validPercent = Math.max(0, Math.min(100, Math.round(percent)));
        fill.style.width = validPercent + '%';
        const i18n = window.I18n || { t: (k) => k };
        text.textContent = i18n.t('search.progress.label').replace('{percent}', validPercent);
    }
},

hideSearchProgressModal() {
    const modal = document.getElementById('search-progress-modal');
    if (modal) {
        modal.remove();
    }
},

async verifyExternalHexResults(results, searchBytes, wholeWord = false, maxResults = 50000) {
    const verified = [];
    const seenOffsets = new Set();
    const patternLength = searchBytes.length;

    for (const result of results || []) {
        if (!result || typeof result.offset !== 'number' || result.offset < 0) {
            continue;
        }

        if (seenOffsets.has(result.offset)) {
            continue;
        }

        const exactMatch = await this.matchesByteSequenceAtAsync(result.offset, searchBytes);
        if (!exactMatch) {
            continue;
        }

        if (wholeWord && !(await this.isWordBoundaryAtAsync(result.offset, patternLength))) {
            continue;
        }

        const preview = await this.buildPreviewAtAsync(result.offset, patternLength, 16);
        verified.push({
            offset: result.offset,
            context: preview || ''
        });
        seenOffsets.add(result.offset);

        if (verified.length >= maxResults) {
            break;
        }
    }

    return verified;
},

finalizeExternalSearchResults(results, options = {}) {
    const {
        type = 'text',
        length = 0,
        title = 'Busca',
        successMessage = null,
        noResultsMessage = null
    } = options;

    this.searchResults = (results || []).map((result) => ({
        offset: result.offset,
        length: typeof result.length === 'number' ? result.length : length,
        type,
        context: result.context || ''
    }));

    this.updateSearchResults();

    if (this.searchResults.length > 0) {
        this.currentSearchIndex = 0;
        this.goToSearchResult(0);
        if (window.notificationSystem && typeof successMessage === 'function') {
            window.notificationSystem.success(successMessage(this.searchResults.length), title);
        }
    } else if (window.notificationSystem && noResultsMessage) {
        window.notificationSystem.info(noResultsMessage, title);
    }

    this.render();
    if (this.syncSearchWindow) this.syncSearchWindow();

    setTimeout(() => {
        this.render();
        this.renderCurrentView(true);
        this.updateStatus();
        this.forceUpdatePositionInput();
    }, 100);
},

async runExternalSearchWithProgress(executeSearch, onError) {
    this.showSearchProgressModal();
    this.updateSearchProgress(0);

    const progressInterval = setInterval(() => {
        const currentProgress = parseInt(document.getElementById('search-progress-fill')?.style.width || '0');
        if (currentProgress < 90) {
            this.updateSearchProgress(currentProgress + Math.random() * 10);
        }
    }, 200);

    try {
        const result = await executeSearch();
        clearInterval(progressInterval);
        this.updateSearchProgress(100);
        await new Promise((resolve) => setTimeout(resolve, 500));
        this.hideSearchProgressModal();
        return result;
    } catch (error) {
        clearInterval(progressInterval);
        this.hideSearchProgressModal();
        if (typeof onError === 'function') {
            await onError(error);
        } else {
            throw error;
        }
        return null;
    }
},

async performIntegratedExternalSearch(searchTerm, caseSensitive = false, wholeWord = false, regexMode = false) {
    const filePath = this.getResolvedCurrentFilePath?.();
    if (!filePath) {
        console.error('Caminho completo do arquivo n�o dispon�vel');
        return;
    }
    const searchResult = await this.runExternalSearchWithProgress(
        () => this.performNativeExternalSearch(
            filePath,
            searchTerm,
            caseSensitive,
            wholeWord
        ),
        async (error) => {
            console.error('Erro na busca externa integrada:', error);
            this.performFastSearch(searchTerm, caseSensitive, wholeWord);
        }
    );
    if (!searchResult) {
        return;
    }
    const i18n = window.I18n || { t: (k) => k };
    this.finalizeExternalSearchResults(searchResult.results, {
        type: 'text',
        length: searchTerm.length,
        title: i18n.t('notif.search.title'),
        successMessage: (count) => i18n.t('notif.search.completed') + ' ' + count + ' ' + i18n.t('notif.search.results_found'),
        noResultsMessage: i18n.t('notif.search.no_results')
    });
},
async performIntegratedExternalHexSearch(searchTerm, wholeWord = false, maxResults = 50000) {
    const filePath = this.getResolvedCurrentFilePath?.();
    if (!filePath) {
        await this.chunkedHexSearch(searchTerm);
        return;
    }
    const cleanHex = searchTerm.replace(/\s+/g, '');
    const searchBytes = Uint8Array.from(cleanHex.match(/.{1,2}/g)?.map((pair) => parseInt(pair, 16)) || []);
    const searchResult = await this.runExternalSearchWithProgress(
        () => this.performNativeExternalHexSearch(
            filePath,
            searchTerm,
            wholeWord,
            maxResults
        ),
        async (error) => {
            console.error('Erro na busca HEX externa integrada:', error);
            await this.chunkedHexSearch(searchTerm);
        }
    );
    if (!searchResult) {
        return;
    }
    const verifiedResults = await this.verifyExternalHexResults(
        searchResult.results,
        searchBytes,
        wholeWord,
        maxResults
    );
    this.finalizeExternalSearchResults(verifiedResults, {
        type: 'hex',
        length: searchTerm.replace(/\s+/g, '').length / 2,
        title: 'Busca HEX Grande',
        successMessage: (count) => 'Busca HEX conclu�da! ' + count + ' resultados encontrados.',
        noResultsMessage: 'Nenhum resultado encontrado na busca HEX.'
    });
},
async performNativeExternalSearch(filePath, searchTerm, caseSensitive = false, wholeWord = false, maxResults = 50000) {
    try {
        if (window.OffsetFix) {
            const offsetFix = new window.OffsetFix();
            const is16bit = this.charDecoder16 !== null;
            const charDecoder16 = this.charDecoder16;

            return await offsetFix.performBinarySearch(
                filePath,
                searchTerm,
                caseSensitive,
                wholeWord,
                maxResults,
                is16bit,
                charDecoder16
            );
        }

        throw new Error('OffsetFix n�o dispon�vel');
    } catch (error) {
        console.error('Erro na busca externa nativa:', error);
        throw error;
    }
},

async performNativeExternalHexSearch(filePath, searchTerm, wholeWord = false, maxResults = 50000) {
    try {
        if (window.OffsetFix) {
            const offsetFix = new window.OffsetFix();
            return await offsetFix.performBinaryHexSearch(filePath, searchTerm, wholeWord, maxResults);
        }

        throw new Error('OffsetFix n�o dispon�vel');
    } catch (error) {
        console.error('Erro na busca HEX externa nativa:', error);
        throw error;
    }
}
});
