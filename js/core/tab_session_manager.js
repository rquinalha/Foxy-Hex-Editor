class FileTabSessionManager {
    constructor(hexEditor) {
        this.hexEditor = hexEditor;
        this.sessions = [];
        this.activeSessionId = null;
        this.isSwitchingSession = false;
        this.tabsListEl = document.getElementById('file-tabs-list');
        this.tabsBarEl = this.tabsListEl?.closest('.file-tabs-bar') || null;
        this.updateTabsOverflowHint = this.updateTabsOverflowHint.bind(this);
        this.handleI18nUpdated = this.handleI18nUpdated.bind(this);
        this.handleGlobalPointerDown = this.handleGlobalPointerDown.bind(this);
        this.handleGlobalKeyDown = this.handleGlobalKeyDown.bind(this);
        this.contextMenuEl = null;
        this.contextMenuSessionId = null;
        window.addEventListener('resize', this.updateTabsOverflowHint);
        document.addEventListener('i18n-updated', this.handleI18nUpdated);
        document.addEventListener('pointerdown', this.handleGlobalPointerDown);
        document.addEventListener('keydown', this.handleGlobalKeyDown);
        window.addEventListener('blur', () => this.hideTabContextMenu());
        this.ensureTabContextMenu();
        this.renderTabs();
    }

    handleI18nUpdated() {
        this.renderTabs();
        this.refreshTabContextMenuText();
    }

    getTabContextMenuText() {
        const resolve = (key, fallback) => {
            if (!window.I18n?.t) {
                return fallback;
            }
            const value = window.I18n.t(key);
            return value === key ? fallback : value;
        };

        return {
            closeCurrent: resolve('tabs.close_current', 'Fechar aba atual'),
            closeLeft: resolve('tabs.close_left', 'Fechar abas a esquerda'),
            closeRight: resolve('tabs.close_right', 'Fechar abas a direita'),
            closeOthers: resolve('tabs.close_others', 'Fechar todas, exceto esta')
        };
    }

    ensureTabContextMenu() {
        if (this.contextMenuEl || typeof document === 'undefined') {
            return;
        }

        const menu = document.createElement('div');
        menu.className = 'file-tab-context-menu hidden';

        const createAction = (action) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'file-tab-context-menu-item';
            button.dataset.action = action;
            button.addEventListener('click', async (event) => {
                event.preventDefault();
                event.stopPropagation();
                const sessionId = this.contextMenuSessionId;
                this.hideTabContextMenu();
                if (!sessionId) {
                    return;
                }

                if (action === 'close-left') {
                    await this.closeTabsToLeft(sessionId);
                } else if (action === 'close-right') {
                    await this.closeTabsToRight(sessionId);
                } else if (action === 'close-others') {
                    await this.closeOtherTabs(sessionId);
                } else if (action === 'close-current') {
                    await this.closeSession(sessionId);
                }
            });
            menu.appendChild(button);
        };

        createAction('close-current');
        createAction('close-left');
        createAction('close-right');
        createAction('close-others');

        document.body.appendChild(menu);
        this.contextMenuEl = menu;
        this.refreshTabContextMenuText();
    }

    refreshTabContextMenuText() {
        if (!this.contextMenuEl) {
            return;
        }

        const text = this.getTabContextMenuText();
        const labels = {
            'close-current': { icon: '✕', label: text.closeCurrent },
            'close-left': { icon: '←', label: text.closeLeft },
            'close-right': { icon: '→', label: text.closeRight },
            'close-others': { icon: '⊙', label: text.closeOthers }
        };

        this.contextMenuEl.querySelectorAll('.file-tab-context-menu-item').forEach((item) => {
            const config = labels[item.dataset.action];
            if (!config) {
                item.textContent = item.dataset.action;
                return;
            }

            item.innerHTML = `
                <span class="file-tab-context-menu-icon">${config.icon}</span>
                <span class="file-tab-context-menu-label">${config.label}</span>
            `;
        });
    }

    handleGlobalPointerDown(event) {
        if (!this.contextMenuEl || this.contextMenuEl.classList.contains('hidden')) {
            return;
        }

        if (!this.contextMenuEl.contains(event.target)) {
            this.hideTabContextMenu();
        }
    }

    handleGlobalKeyDown(event) {
        if (event.key === 'Escape') {
            this.hideTabContextMenu();
        }
    }

    hideTabContextMenu() {
        if (!this.contextMenuEl) {
            return;
        }

        this.contextMenuEl.classList.add('hidden');
        this.contextMenuSessionId = null;
    }

    showTabContextMenu(sessionId, event) {
        if (!this.contextMenuEl || !sessionId) {
            return;
        }

        const sessionIndex = this.sessions.findIndex((session) => session.id === sessionId);
        if (sessionIndex === -1) {
            return;
        }

        const hasLeft = sessionIndex > 0;
        const hasRight = sessionIndex < this.sessions.length - 1;
        this.contextMenuSessionId = sessionId;

        this.contextMenuEl.querySelector('[data-action="close-current"]')?.toggleAttribute('disabled', this.sessions.length === 0);
        this.contextMenuEl.querySelector('[data-action="close-left"]')?.toggleAttribute('disabled', !hasLeft);
        this.contextMenuEl.querySelector('[data-action="close-right"]')?.toggleAttribute('disabled', !hasRight);
        this.contextMenuEl.querySelector('[data-action="close-others"]')?.toggleAttribute('disabled', this.sessions.length <= 1);

        this.contextMenuEl.classList.remove('hidden');

        const menuRect = this.contextMenuEl.getBoundingClientRect();
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
        const left = Math.min(event.clientX, Math.max(8, viewportWidth - menuRect.width - 8));
        const top = Math.min(event.clientY, Math.max(8, viewportHeight - menuRect.height - 8));

        this.contextMenuEl.style.left = `${Math.max(8, left)}px`;
        this.contextMenuEl.style.top = `${Math.max(8, top)}px`;
    }

    async closeTabsByIds(sessionIds) {
        for (const sessionId of sessionIds) {
            if (!this.getSessionById(sessionId)) {
                continue;
            }
            await this.closeSession(sessionId);
        }
    }

    async closeTabsToLeft(sessionId) {
        const sessionIndex = this.sessions.findIndex((session) => session.id === sessionId);
        if (sessionIndex <= 0) {
            return;
        }
        const idsToClose = this.sessions.slice(0, sessionIndex).map((session) => session.id);
        await this.closeTabsByIds(idsToClose);
    }

    async closeTabsToRight(sessionId) {
        const sessionIndex = this.sessions.findIndex((session) => session.id === sessionId);
        if (sessionIndex === -1 || sessionIndex >= this.sessions.length - 1) {
            return;
        }
        const idsToClose = this.sessions.slice(sessionIndex + 1).map((session) => session.id);
        await this.closeTabsByIds(idsToClose);
    }

    async closeOtherTabs(sessionId) {
        const idsToClose = this.sessions
            .filter((session) => session.id !== sessionId)
            .map((session) => session.id);
        await this.closeTabsByIds(idsToClose);
    }

    createSessionId() {
        return `session_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
    }

    cloneValue(value) {
        if (typeof structuredClone === 'function') {
            try {
                return structuredClone(value);
            } catch (error) {
                // fallback below
            }
        }

        if (value instanceof Uint8Array) {
            return new Uint8Array(value);
        }

        if (value instanceof Map) {
            return new Map(Array.from(value.entries(), ([key, inner]) => [key, this.cloneValue(inner)]));
        }

        if (value instanceof Set) {
            return new Set(Array.from(value.values(), (inner) => this.cloneValue(inner)));
        }

        if (Array.isArray(value)) {
            return value.map((inner) => this.cloneValue(inner));
        }

        if (value && typeof value === 'object') {
            const cloned = {};
            Object.keys(value).forEach((key) => {
                cloned[key] = this.cloneValue(value[key]);
            });
            return cloned;
        }

        return value;
    }

    getSessionTitle(session) {
        return session.fileName || session.currentFileName || 'Sem título';
    }

    getSessionFileKey(fileLike) {
        const path = fileLike?.path || fileLike?.webkitRelativePath || '';
        const name = fileLike?.name || '';
        const size = Number(fileLike?.size || 0);
        return `${path}::${name}::${size}`;
    }

    findSessionByFile(fileLike) {
        const targetKey = this.getSessionFileKey(fileLike);
        return this.sessions.find((session) => session.fileKey === targetKey) || null;
    }

    getSessionById(sessionId) {
        return this.sessions.find((session) => session.id === sessionId) || null;
    }

    updateSessionVisualMetaFromEditor(session) {
        const editor = this.hexEditor;
        if (!editor || !session) {
            return;
        }

        session.fileName = editor.currentFileName || session.fileName || 'Sem título';
        session.filePath = editor.getResolvedCurrentFilePath?.() || session.filePath || null;
        session.currentFileName = editor.currentFileName || session.currentFileName || session.fileName;
        session.currentFileExtension = editor.currentFileExtension || session.currentFileExtension || '';
        session.fileSize = typeof editor.getDataLength === 'function' ? editor.getDataLength() : session.fileSize;
        session.hasUnsavedChanges = !!editor.hasUnsavedChanges;
        session.fileRef = {
            name: session.fileName,
            path: session.filePath,
            size: session.fileSize
        };
        session.fileKey = this.getSessionFileKey(session.fileRef);
    }

    createSearchContext(session, data) {
        const editor = this.hexEditor;
        const tableStore = Object.assign({}, editor.charTables || {});

        if (session.currentCharTable === 'custom' && session.selectedCharTable) {
            tableStore.custom = this.cloneValue(session.selectedCharTable);
        }
        if (session.currentCharTable === 'custom16bit' && session.selectedCharTable) {
            tableStore.custom16bit = this.cloneValue(session.selectedCharTable);
        }

        let charDecoder16 = null;
        const activeTable = tableStore[session.currentCharTable];
        if (session.currentCharTable === 'custom16bit' && session.selectedCharTable) {
            charDecoder16 = new CharDecoder16bit(session.selectedCharTable);
        } else if (activeTable && (activeTable.type === '16-bit' || activeTable.type === 'UTF-16' || 
                                  (activeTable.type && activeTable.type.includes && activeTable.type.includes('16-bit')))) {
            charDecoder16 = new CharDecoder16bit(activeTable);
        }

        return {
            charTables: tableStore,
            currentCharTable: session.currentCharTable || 'ascii',
            selectedCharTable: this.cloneValue(session.selectedCharTable || null),
            charDecoder16,
            searchResults: [],
            emit() { return null; },
            getDataLength() { return data.length; },
            getByteAt(offset) { return data[offset]; },
            getRangeAt(offset, length) { return data.slice(offset, offset + length); },
            getCurrentCharacterTable: editor.getCurrentCharacterTable,
            isCurrentTableShiftJIS: editor.isCurrentTableShiftJIS,
            decodeBytesWithCurrentTable: editor.decodeBytesWithCurrentTable,
            searchText: editor.searchText,
            searchTextShiftJIS: editor.searchTextShiftJIS,
            searchTextCustomTable: editor.searchTextCustomTable,
            searchText16bit: editor.searchText16bit,
            textToShiftJISBytes: editor.textToShiftJISBytes,
            textToCustomTableBytes: editor.textToCustomTableBytes,
            isWordBoundary: editor.isWordBoundary,
            isWordBoundary16bit: editor.isWordBoundary16bit
        };
    }

    buildSearchPreview(searchContext, data, offset, length) {
        const currentTable = searchContext.getCurrentCharacterTable.call(searchContext);
        const is16bit = !!(currentTable && (currentTable.type === '16-bit' || currentTable.type === 'UTF-16'));
        const previewRadius = is16bit ? 8 : 16;
        const start = Math.max(0, offset - previewRadius);
        const end = Math.min(data.length, offset + length + previewRadius);
        const bytes = data.slice(start, end);
        let preview = searchContext.decodeBytesWithCurrentTable.call(searchContext, bytes) || '';
        preview = preview.replace(/\s+/g, ' ').trim();
        return preview || '(sem prévia)';
    }

    async searchTextAcrossSessions(searchTerm, caseSensitive = false, wholeWord = false) {
        const activeSession = this.getSessionById(this.activeSessionId);
        if (activeSession) {
            this.captureEditorStateInto(activeSession);
        }

        const groups = [];
        const flatResults = [];
        let skippedLargeCount = 0;

        for (const session of this.sessions) {
            if (session.isLargeFile || !(session.snapshot instanceof Uint8Array)) {
                skippedLargeCount++;
                continue;
            }

            const data = session.snapshot;
            const searchContext = this.createSearchContext(session, data);
            const results = searchContext.searchText.call(searchContext, searchTerm, caseSensitive, wholeWord) || [];

            if (!results.length) {
                continue;
            }

            const group = {
                sessionId: session.id,
                fileName: this.getSessionTitle(session),
                total: results.length,
                results: []
            };

            results.forEach((result) => {
                const globalIndex = flatResults.length;
                const enrichedResult = {
                    sessionId: session.id,
                    fileName: this.getSessionTitle(session),
                    offset: result.offset,
                    offsetHex: result.offset.toString(16).toUpperCase().padStart(8, '0'),
                    length: result.length,
                    type: result.type || 'text',
                    preview: this.buildSearchPreview(searchContext, data, result.offset, result.length),
                    globalIndex
                };

                flatResults.push(enrichedResult);
                group.results.push(enrichedResult);
            });

            groups.push(group);
        }

        return { groups, flatResults, skippedLargeCount };
    }

    getSessionCustomTableState(editor, currentCharTable) {
        if (!editor || !currentCharTable) {
            return null;
        }

        if (currentCharTable === 'custom16bit') {
            return this.cloneValue(
                editor.charTables?.custom16bit ||
                (editor.selectedCharTable && typeof editor.selectedCharTable === 'object' ? editor.selectedCharTable : null) ||
                (typeof editor.getCurrentCharacterTable === 'function' ? editor.getCurrentCharacterTable() : null)
            );
        }

        if (currentCharTable === 'custom') {
            return this.cloneValue(
                editor.charTables?.custom ||
                (typeof editor.getCurrentCharacterTable === 'function' ? editor.getCurrentCharacterTable() : null)
            );
        }

        return null;
    }

    captureEditorStateInto(session) {
        const editor = this.hexEditor;
        if (!editor || !session) {
            return session;
        }

        session.snapshot = this.cloneValue(editor.createDataSnapshot());
        session.originalData = this.cloneValue(editor.originalData);
        this.updateSessionVisualMetaFromEditor(session);
        session.isLargeFile = !!editor.isLargeFileActive?.();

        if (session.isLargeFile || (session.fileRef && editor.hasResolvedCurrentFilePath?.())) {
            session.fileRef = {
                name: session.fileName,
                path: session.filePath,
                size: session.fileSize
            };
        }

        session.cursorPosition = editor.cursorPosition || 0;
        session.selectionStart = editor.selectionStart || 0;
        session.selectionEnd = editor.selectionEnd || 0;
        session.currentScrollPercent = editor.currentScrollPercent || 0;
        session.activePanel = editor.activePanel || 'hex';
        session.editMode = editor.editMode || 'view';
        session.insertMode = !!editor.insertMode;
        session.nibblePosition = editor.nibblePosition || 0;
        session.modifiedBytes = Array.from(editor.modifiedBytes || []);
        session.bookmarks = this.cloneValue(editor.bookmarks || []);
        session.currentBookmarkId = editor.currentBookmarkId || 0;
        session.highlights = this.cloneValue(Array.from((editor.highlights || new Map()).values()));
        session.highlightIdCounter = editor.highlightIdCounter || 0;
        session.currentHighlightColor = editor.currentHighlightColor || 'default';
        session.selectedHighlightId = editor.selectedHighlight?.id || null;
        session.history = this.cloneValue(editor.history || []);
        session.historyIndex = typeof editor.historyIndex === 'number' ? editor.historyIndex : -1;
        session.searchResults = this.cloneValue(editor.searchResults || []);
        session.currentSearchIndex = typeof editor.currentSearchIndex === 'number' ? editor.currentSearchIndex : -1;
        session.lastSearchTerm = editor.lastSearchTerm || '';
        session.gameAnalysis = this.cloneValue(editor.gameAnalysis || {});
        session.currentCharTable = editor.currentCharTable || 'ascii';
        session.selectedCharTable = this.getSessionCustomTableState(editor, session.currentCharTable);
        session.fileKey = session.fileKey || this.getSessionFileKey(session.fileRef || {
            path: session.filePath,
            name: session.fileName,
            size: session.fileSize
        });

        return session;
    }

    ensureCustomTableState(session) {
        const editor = this.hexEditor;
        if (!editor || !session) {
            return;
        }

        if (session.currentCharTable === 'custom16bit' && session.selectedCharTable) {
            const custom16BitTable = this.cloneValue(session.selectedCharTable);
            editor.charTables.custom16bit = custom16BitTable;
            editor.selectedCharTable = custom16BitTable;
            editor.currentCharTable = 'custom16bit';
            editor.charDecoder16 = new CharDecoder16bit(custom16BitTable);
            const select = document.getElementById('char-table-select');
            if (select) select.value = 'custom16bit';
            return;
        }

        if (session.currentCharTable === 'custom' && session.selectedCharTable) {
            editor.charTables.custom = this.cloneValue(session.selectedCharTable);
            editor.selectedCharTable = null;
            editor.currentCharTable = 'custom';
            editor.charDecoder16 = null;
            editor.getActive16BitDecoder?.();
            const select = document.getElementById('char-table-select');
            if (select) select.value = 'custom';
        } else if (session.currentCharTable && editor.charTables?.[session.currentCharTable]) {
            editor.selectedCharTable = null;
            editor.setCharTable(session.currentCharTable);
        } else {
            editor.selectedCharTable = null;
            editor.setCharTable?.('ascii');
        }
    }

    applySessionState(session) {
        const editor = this.hexEditor;
        if (!editor || !session) {
            return;
        }

        editor.currentFileName = session.fileName || 'Sem título';
        editor.currentFilePath = session.filePath || null;
        editor.currentFileExtension = session.currentFileExtension || editor.getFileExtension?.(session.fileName || '') || '';
        editor.originalData = this.cloneValue(session.originalData) || this.cloneValue(session.snapshot);
        editor.cursorPosition = session.cursorPosition || 0;
        editor.selectionStart = session.selectionStart || 0;
        editor.selectionEnd = session.selectionEnd || 0;
        editor.currentScrollPercent = session.currentScrollPercent || 0;
        editor.activePanel = session.activePanel || 'hex';
        editor.editMode = session.editMode || 'view';
        editor.insertMode = !!session.insertMode;
        editor.nibblePosition = session.nibblePosition || 0;
        editor.modifiedBytes = new Set(session.modifiedBytes || []);
        editor.hasUnsavedChanges = !!session.hasUnsavedChanges;
        editor.bookmarks = this.cloneValue(session.bookmarks || []);
        editor.currentBookmarkId = session.currentBookmarkId || 0;
        editor.bookmarksSet = new Set();
        editor.highlights = new Map((session.highlights || []).map((highlight) => [highlight.id, this.cloneValue(highlight)]));
        editor.highlightIdCounter = session.highlightIdCounter || 0;
        editor.currentHighlightColor = session.currentHighlightColor || editor.currentHighlightColor || 'default';
        editor.selectedHighlight = null;

        if (session.selectedHighlightId != null && editor.highlights.has(session.selectedHighlightId)) {
            editor.selectedHighlight = editor.highlights.get(session.selectedHighlightId);
        }

        editor.history = this.cloneValue(session.history || []);
        editor.historyIndex = typeof session.historyIndex === 'number' ? session.historyIndex : -1;
        if (!editor.globalTabSearchActive) {
            editor.searchResults = this.cloneValue(session.searchResults || []);
            editor.searchResultsSet = new Set((session.searchResults || []).map((result) => result.offset));
            editor.currentSearchIndex = typeof session.currentSearchIndex === 'number' ? session.currentSearchIndex : -1;
            editor.lastSearchTerm = session.lastSearchTerm || '';
        }
        editor.gameAnalysis = this.cloneValue(session.gameAnalysis || {});

        this.ensureCustomTableState(session);
        editor.updateSearchResults?.();
        const shouldShowCharGrid = !!(editor.currentCharTable && editor.currentCharTable !== 'ascii');

        editor.updateHighlightsMap?.();
        editor.updateCharGrid?.({ force: shouldShowCharGrid });
        editor.updateTableDisplay?.();
        editor.updateBookmarksList?.();
        editor.updateBookmarkSidebarButtons?.();
        editor.updateAnalysisDisplay?.();
        editor.updateHistoryUI?.();
        editor.updateModeUI?.();
        editor.updateStatus?.();
        editor.updateStats?.();
        editor.updateButtons?.();
        editor.renderCurrentView?.(true);
        editor.forceUpdatePositionInput?.();
        editor.focusEditor?.();

        const currentFileEl = document.getElementById('current-file');
        if (currentFileEl) {
            currentFileEl.textContent = editor.currentFileName || 'Nenhum arquivo carregado';
        }

        if (window.intelligentSave) {
            window.intelligentSave.setCurrentFile(editor.getResolvedCurrentFilePath?.() || null, editor.currentFileName || null);
            window.intelligentSave.updateSaveButton?.();
        }

        if (window.electronFileHandler) {
            window.electronFileHandler.currentFile = {
                name: editor.currentFileName,
                size: editor.getDataLength(),
                path: editor.getResolvedCurrentFilePath?.() || null
            };
        }
    }

    async restoreSession(session) {
        const editor = this.hexEditor;
        if (!editor || !session) {
            return;
        }

        if (session.isLargeFile && session.fileRef) {
            await editor.loadFile(session.fileRef);
            editor.restoreDataSnapshot?.(this.cloneValue(session.snapshot));
        } else {
            const snapshot = this.cloneValue(session.snapshot);
            editor.switchToMemorySnapshot?.(snapshot, {
                resetState: true,
                initializeScrolling: true
            });
        }

        this.applySessionState(session);
    }

    async activateSession(sessionId) {
        const nextSession = this.sessions.find((session) => session.id === sessionId);
        if (!nextSession || this.activeSessionId === sessionId || this.isSwitchingSession) {
            return;
        }

        const currentSession = this.sessions.find((session) => session.id === this.activeSessionId);
        if (currentSession) {
            this.captureEditorStateInto(currentSession);
        }

        this.isSwitchingSession = true;
        try {
            this.activeSessionId = nextSession.id;
            await this.restoreSession(nextSession);
            this.updateSessionVisualMetaFromEditor(nextSession);
            this.renderTabs();
        } finally {
            this.isSwitchingSession = false;
        }
    }

    createSessionFromCurrentFile(fileRef = null) {
        const session = {
            id: this.createSessionId(),
            fileRef,
            fileName: this.hexEditor?.currentFileName || fileRef?.name || 'Sem título',
            filePath: this.hexEditor?.getResolvedCurrentFilePath?.() || fileRef?.path || null,
            fileSize: this.hexEditor?.getDataLength?.() || fileRef?.size || 0,
            isLargeFile: !!this.hexEditor?.isLargeFileActive?.(),
            fileKey: this.getSessionFileKey(fileRef || {
                path: this.hexEditor?.getResolvedCurrentFilePath?.() || null,
                name: this.hexEditor?.currentFileName || 'Sem título',
                size: this.hexEditor?.getDataLength?.() || 0
            })
        };

        return this.captureEditorStateInto(session);
    }

    applyCharacterTableToAllSessions(tableData, tableId = 'custom') {
        const editor = this.hexEditor;
        if (!editor || !tableData) {
            return null;
        }

        const normalizedTable = typeof editor.normalizeCharacterTable === 'function'
            ? editor.normalizeCharacterTable(tableData, tableData.name || tableId)
            : tableData;
        const is16BitTable = !!(normalizedTable &&
            (normalizedTable.type === '16-bit' || normalizedTable.type === 'UTF-16' ||
             (normalizedTable.type && normalizedTable.type.includes && normalizedTable.type.includes('16-bit'))));
        const effectiveTableId = is16BitTable ? 'custom16bit' : tableId;
        const installedTable = editor.installCustomCharacterTable(normalizedTable, effectiveTableId);
        const tableState = this.cloneValue(installedTable);
        const activeSession = this.getSessionById(this.activeSessionId);

        if (activeSession) {
            this.captureEditorStateInto(activeSession);
        }

        this.sessions.forEach((session) => {
            session.currentCharTable = effectiveTableId;
            session.selectedCharTable = this.cloneValue(tableState);
        });

        if (effectiveTableId === 'custom16bit') {
            editor.selectedCharTable = this.cloneValue(tableState);
            editor.currentCharTable = 'custom16bit';
            editor.charDecoder16 = typeof CharDecoder16bit !== 'undefined'
                ? new CharDecoder16bit(tableState)
                : editor.charDecoder16;
        } else {
            editor.selectedCharTable = null;
            editor.currentCharTable = effectiveTableId;
            editor.charDecoder16 = null;
        }
        editor.getActive16BitDecoder?.();
        editor.updateCharGrid?.({ force: true });
        editor.updateTableDisplay?.();
        editor.render?.();
        editor.updateStatus?.();

        if (activeSession) {
            activeSession.currentCharTable = effectiveTableId;
            activeSession.selectedCharTable = this.cloneValue(tableState);
            this.captureEditorStateInto(activeSession);
            this.updateSessionVisualMetaFromEditor(activeSession);
        }

        this.renderTabs?.();

        return tableState;
    }

    async openFiles(fileList) {
        const files = Array.from(fileList || []).filter(Boolean);
        if (!files.length || !this.hexEditor) {
            return;
        }

        const activeSession = this.sessions.find((session) => session.id === this.activeSessionId);
        if (activeSession) {
            this.captureEditorStateInto(activeSession);
        }

        this.isSwitchingSession = true;
        try {
            let lastOpenedSession = null;

            for (const file of files) {
                if (Number(file.size || 0) === 0) {
                    if (window.notificationSystem) {
                        window.notificationSystem.error(`O arquivo ${file.name} está vazio.`, 'Arquivo Vazio');
                    }
                    continue;
                }

                const existingSession = this.findSessionByFile(file);
                if (existingSession) {
                    lastOpenedSession = existingSession;
                    continue;
                }

                await this.hexEditor.loadFile(file);
                const session = this.createSessionFromCurrentFile(file);
                this.sessions.push(session);
                lastOpenedSession = session;
            }

            if (lastOpenedSession) {
                this.activeSessionId = lastOpenedSession.id;
            }

            this.renderTabs();
        } finally {
            this.isSwitchingSession = false;
        }

        const active = this.sessions.find((session) => session.id === this.activeSessionId);
        if (active) {
            this.updateSessionVisualMetaFromEditor(active);
            this.renderTabs();
        }
    }

    async closeSession(sessionId) {
        const sessionIndex = this.sessions.findIndex((session) => session.id === sessionId);
        if (sessionIndex === -1) {
            return;
        }

        const session = this.sessions[sessionIndex];
        if (session.id === this.activeSessionId) {
            this.captureEditorStateInto(session);
        }

        if (session.hasUnsavedChanges) {
            const confirmed = window.confirm(`Fechar "${this.getSessionTitle(session)}" e perder as alterações não salvas?`);
            if (!confirmed) {
                return;
            }
        }

        this.sessions.splice(sessionIndex, 1);

        if (this.activeSessionId === sessionId) {
            const fallbackSession = this.sessions[Math.max(0, sessionIndex - 1)] || this.sessions[0] || null;
            this.activeSessionId = null;

            if (fallbackSession) {
                await this.activateSession(fallbackSession.id);
            } else {
                this.clearEditorState();
            }
        }

        this.renderTabs();
    }

    clearEditorState() {
        const editor = this.hexEditor;
        if (!editor) {
            return;
        }

        editor.clearToEmptyMemoryState?.({
            resetState: true,
            initializeScrolling: true
        });
        editor.currentFileName = '';
        editor.currentFilePath = null;
        editor.currentFileExtension = '';
        editor.originalData = new Uint8Array(0);
        editor.currentCharTable = 'ascii';
        editor.selectedCharTable = null;
        editor.getActive16BitDecoder?.();
        editor.updateCharGrid?.();
        editor.updateTableDisplay?.();
        editor.updateStatus?.();
        editor.updateStats?.();
        editor.updateButtons?.();
        editor.updateModeUI?.();
        editor.renderCurrentView?.(true);

        const currentFileEl = document.getElementById('current-file');
        if (currentFileEl) {
            currentFileEl.textContent = 'Nenhum arquivo carregado';
        }

        this.updateTabsOverflowHint();
    }

    updateTabsOverflowHint() {
        if (!this.tabsListEl || !this.tabsBarEl) {
            return;
        }

        const hintText = window.I18n?.t ? window.I18n.t('tabs.scroll_hint') : 'Drag the orange bar to see more tabs';
        this.tabsBarEl.setAttribute('data-scroll-hint', hintText);
        const hasOverflow = this.tabsListEl.scrollWidth > this.tabsListEl.clientWidth + 4;
        this.tabsBarEl.classList.toggle('show-scroll-hint', hasOverflow);
    }

    renderTabs() {
        if (!this.tabsListEl) {
            return;
        }

        this.tabsListEl.innerHTML = '';

        if (!this.sessions.length) {
            const empty = document.createElement('div');
            empty.className = 'file-tabs-empty';
            empty.textContent = window.I18n?.t ? window.I18n.t('tabs.no_open_files') : 'Nenhum arquivo aberto';
            this.tabsListEl.appendChild(empty);
            this.updateTabsOverflowHint();
            return;
        }

        this.sessions.forEach((session) => {
            const tab = document.createElement('div');
            tab.className = `file-tab${session.id === this.activeSessionId ? ' active' : ''}`;
            tab.title = session.filePath || this.getSessionTitle(session);
            tab.addEventListener('click', () => {
                this.activateSession(session.id);
            });
            tab.addEventListener('contextmenu', (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.showTabContextMenu(session.id, event);
            });

            if (session.hasUnsavedChanges) {
                const dirty = document.createElement('span');
                dirty.className = 'file-tab-dirty';
                tab.appendChild(dirty);
            }

            const name = document.createElement('span');
            name.className = 'file-tab-name';
            name.textContent = this.getSessionTitle(session);
            tab.appendChild(name);

            const close = document.createElement('span');
            close.className = 'file-tab-close';
            close.textContent = '×';
            close.title = 'Fechar arquivo';
            close.addEventListener('click', (event) => {
                event.stopPropagation();
                this.closeSession(session.id);
            });
            tab.appendChild(close);

            this.tabsListEl.appendChild(tab);
        });

        requestAnimationFrame(() => this.updateTabsOverflowHint());
    }
}

window.FileTabSessionManager = FileTabSessionManager;

FileTabSessionManager.prototype.captureBinarySnapshot = function(snapshot) {
    if (snapshot instanceof Uint8Array) {
        return snapshot;
    }

    return this.cloneValue(snapshot);
};

FileTabSessionManager.prototype.captureOriginalDataState = function(editor, snapshot) {
    const originalData = editor?.originalData;

    if (originalData instanceof Uint8Array) {
        if (snapshot instanceof Uint8Array && originalData === snapshot) {
            return snapshot;
        }
        return originalData;
    }

    return this.cloneValue(originalData);
};

FileTabSessionManager.prototype.captureEditorStateInto = function(session) {
    const editor = this.hexEditor;
    if (!editor || !session) {
        return session;
    }

    const snapshot = editor.createDataSnapshot();
    session.snapshot = this.captureBinarySnapshot(snapshot);
    session.originalData = this.captureOriginalDataState(editor, session.snapshot);
    this.updateSessionVisualMetaFromEditor(session);
    session.isLargeFile = !!editor.isLargeFileActive?.();

    if (session.isLargeFile || (session.fileRef && editor.hasResolvedCurrentFilePath?.())) {
        session.fileRef = {
            name: session.fileName,
            path: session.filePath,
            size: session.fileSize
        };
    }

    session.cursorPosition = editor.cursorPosition || 0;
    session.selectionStart = editor.selectionStart || 0;
    session.selectionEnd = editor.selectionEnd || 0;
    session.currentScrollPercent = editor.currentScrollPercent || 0;
    session.activePanel = editor.activePanel || 'hex';
    session.editMode = editor.editMode || 'view';
    session.insertMode = !!editor.insertMode;
    session.nibblePosition = editor.nibblePosition || 0;
    session.modifiedBytes = Array.from(editor.modifiedBytes || []);
    session.bookmarks = this.cloneValue(editor.bookmarks || []);
    session.currentBookmarkId = editor.currentBookmarkId || 0;
    session.highlights = this.cloneValue(Array.from((editor.highlights || new Map()).values()));
    session.highlightIdCounter = editor.highlightIdCounter || 0;
    session.currentHighlightColor = editor.currentHighlightColor || 'default';
    session.selectedHighlightId = editor.selectedHighlight?.id || null;
    session.history = this.cloneValue(editor.history || []);
    session.historyIndex = typeof editor.historyIndex === 'number' ? editor.historyIndex : -1;
    session.searchResults = this.cloneValue(editor.searchResults || []);
    session.currentSearchIndex = typeof editor.currentSearchIndex === 'number' ? editor.currentSearchIndex : -1;
    session.lastSearchTerm = editor.lastSearchTerm || '';
    session.gameAnalysis = this.cloneValue(editor.gameAnalysis || {});
    session.currentCharTable = editor.currentCharTable || 'ascii';
    session.selectedCharTable = this.getSessionCustomTableState(editor, session.currentCharTable);
    session.fileKey = session.fileKey || this.getSessionFileKey(session.fileRef || {
        path: session.filePath,
        name: session.fileName,
        size: session.fileSize
    });

    return session;
};

FileTabSessionManager.prototype.confirmCloseWithUnsavedChanges = function(session) {
    const message = `Fechar "${this.getSessionTitle(session)}" e perder as alterações não salvas?`;

    return new Promise((resolve) => {
        if (window.notificationSystem && typeof window.notificationSystem.confirm === 'function') {
            window.notificationSystem.confirm(
                message,
                'Alterações não salvas',
                () => resolve(true),
                () => resolve(false)
            );
            return;
        }

        resolve(window.confirm(message));
    });
};

FileTabSessionManager.prototype.closeSession = async function(sessionId) {
    const sessionIndex = this.sessions.findIndex((session) => session.id === sessionId);
    if (sessionIndex === -1) {
        return;
    }

    const session = this.sessions[sessionIndex];
    const isActiveSession = session.id === this.activeSessionId;

    if (isActiveSession) {
        this.updateSessionVisualMetaFromEditor(session);
        session.hasUnsavedChanges = !!this.hexEditor?.hasUnsavedChanges;
        session.fileName = this.hexEditor?.currentFileName || session.fileName;
    }

    if (session.hasUnsavedChanges) {
        const confirmed = await this.confirmCloseWithUnsavedChanges(session);
        if (!confirmed) {
            return;
        }
    }

    this.sessions.splice(sessionIndex, 1);

    if (isActiveSession) {
        const fallbackSession = this.sessions[Math.max(0, sessionIndex - 1)] || this.sessions[0] || null;
        this.activeSessionId = null;

        if (fallbackSession) {
            await this.activateSession(fallbackSession.id);
        } else {
            this.clearEditorState();
        }
    }

    this.renderTabs();
};
