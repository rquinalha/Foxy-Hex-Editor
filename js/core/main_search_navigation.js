Object.assign(FoxyHexEditorComplete.prototype, {
findNext() {
    if (this.searchResults.length === 0) {
        this.performSearch();
        return false;
    }

    this.currentSearchIndex = (this.currentSearchIndex + 1) % this.searchResults.length;
    this.goToSearchResult(this.currentSearchIndex);
    this.updateSearchResults();
    if (this.syncSearchWindow) this.syncSearchWindow();
    return true;
},

findPrevious() {
    if (this.searchResults.length === 0) {
        this.performSearch();
        return false;
    }

    this.currentSearchIndex = this.currentSearchIndex <= 0 ?
        this.searchResults.length - 1 : this.currentSearchIndex - 1;
    this.goToSearchResult(this.currentSearchIndex);
    this.updateSearchResults();
    if (this.syncSearchWindow) this.syncSearchWindow();
    return true;
},

goToSearchResult(index) {
    if (index < 0 || index >= this.searchResults.length) {
        return false;
    }

    const result = this.searchResults[index];
    this.currentSearchIndex = index;
    const targetSessionId = result.sessionId || null;
    const fileTabManager = window.fileTabManager;
    const isHexResult = (result.type || '') === 'hex' || this.searchMode === 'hex';
    const targetPanel = isHexResult ? 'hex' : 'ascii';

    if (targetSessionId && fileTabManager && fileTabManager.activeSessionId !== targetSessionId) {
        const globalSearchState = this.globalTabSearchActive ? {
            active: true,
            groups: Array.isArray(this.globalTabSearchGroups) ? this.globalTabSearchGroups : [],
            skippedLargeCount: this.globalTabSearchSkippedLargeCount || 0,
            results: Array.isArray(this.searchResults) ? this.searchResults.map((item) => ({ ...item })) : [],
            currentSearchIndex: index,
            lastSearchTerm: this.lastSearchTerm || '',
            searchMode: this.searchMode || 'text'
        } : null;

        fileTabManager.activateSession(targetSessionId).then(() => {
            if (globalSearchState) {
                this.globalTabSearchActive = globalSearchState.active;
                this.globalTabSearchGroups = globalSearchState.groups;
                this.globalTabSearchSkippedLargeCount = globalSearchState.skippedLargeCount;
                this.searchResults = globalSearchState.results;
                this.currentSearchIndex = globalSearchState.currentSearchIndex;
                this.lastSearchTerm = globalSearchState.lastSearchTerm;
                this.searchMode = globalSearchState.searchMode;
            }

            this.updateSearchResults();
            this.goToSearchResult(index);
            if (this.syncSearchWindow) this.syncSearchWindow();
        }).catch((error) => {
            console.error('Erro ao ativar aba do resultado da busca:', error);
        });

        return true;
    }

    this._isNavigatingFromSearch = true;
    this.activePanel = targetPanel;
    this.navigateToOffset(result.offset);

    setTimeout(() => {
        this.activePanel = targetPanel;
        this.setCursor(result.offset, null, false);
        this.setSelection(result.offset, result.offset + result.length - 1);
        this.renderCurrentView(true);
        if (this.needsDomCursorVisibilitySync()) {
            this.ensureCursorVisible();
        }
        this.updateStatus();
        this.forceUpdatePositionInput();
    }, 100);

    setTimeout(() => {
        this.activePanel = targetPanel;
        this.renderCurrentView(true);
        if (this.needsDomCursorVisibilitySync()) {
            this.ensureCursorVisible();
        }
        this.updateStatus();
        this.forceUpdatePositionInput();
        this._isNavigatingFromSearch = false;
    }, 300);

    this.emit('searchNavigate', {
        index,
        result,
        total: this.searchResults.length
    });
    return true;
},

clearSearch() {
    this.searchResults = [];
    this.currentSearchIndex = -1;
    this.lastSearchTerm = '';
    this.searchMode = 'text';
    this.globalTabSearchActive = false;
    this.globalTabSearchGroups = [];
    this.globalTabSearchSkippedLargeCount = 0;

    const findInput = document.getElementById('find-input');
    if (findInput) findInput.value = '';

    this.updateSearchResults();
    this.render();
    this.emit('searchClear');
    return this;
},

updateSearchResults() {
    // Sincronizar o Set de resultados para busca rápida O(1) na renderização
    if (!this.searchResultsSet) this.searchResultsSet = new Set();
    this.searchResultsSet.clear();
    const activeSessionId = window.fileTabManager?.activeSessionId || null;
    const visibleResults = this.globalTabSearchActive && activeSessionId
        ? this.searchResults.filter((result) => !result.sessionId || result.sessionId === activeSessionId)
        : this.searchResults;
    for (const result of visibleResults) {
        for (let i = 0; i < result.length; i++) {
            this.searchResultsSet.add(result.offset + i);
        }
    }

    const modalResultsElement = document.getElementById('modal-search-results');
    const totalResults = document.getElementById('total-results');
    const currentMatch = document.getElementById('current-match');
    const nextBtn = document.getElementById('find-next-btn');
    const prevBtn = document.getElementById('find-prev-btn');

    const searchStatus = document.getElementById('search-status');

    if (this.searchResults.length === 0) {
        const noResultsKey = this.lastSearchTerm ? 'tool.search.no_results_found' : '';
        const noResultsText = noResultsKey ? (window.I18n?.t ? window.I18n.t(noResultsKey) : 'Nenhum resultado encontrado') : '';
        if (modalResultsElement) modalResultsElement.textContent = noResultsText;
        if (totalResults) totalResults.textContent = '0';
        if (currentMatch) currentMatch.textContent = '-';
        if (searchStatus) searchStatus.style.display = 'none';
    } else {
        const current = this.currentSearchIndex + 1;
        const total = this.searchResults.length;
        const foundText = window.I18n?.t ? window.I18n.t('tool.search.found') : 'Encontrados:';
        const resultsText = `${current}/${total} ${foundText.toLowerCase()}`;
        if (modalResultsElement) modalResultsElement.textContent = resultsText;
        if (totalResults) totalResults.textContent = total.toString();
        if (currentMatch) currentMatch.textContent = `${current}/${total}`;

        if (searchStatus) searchStatus.style.display = 'none';
    }

    const hasResults = this.searchResults.length > 0;
    if (nextBtn) nextBtn.disabled = !hasResults;
    if (prevBtn) prevBtn.disabled = !hasResults;
},

});
