Object.assign(FoxyHexEditorComplete.prototype, {
    resolveDocumentSearchMode(term, params) {
        if (params?.regexMode) return 'regex';
        if (['text', 'hex', 'regex'].includes(params?.mode)) return params.mode;
        return /^[0-9a-f\s]+$/i.test(term) && term.replace(/\s/g, '').length % 2 === 0 ? 'hex' : 'text';
    },

    cancelDocumentSearch() {
        const job = this.documentSearchJob;
        if (!job) return;
        this.documentSearchJob = null;
        job.ipc.removeListener('document-search-update', job.receive);
        job.ipc.send('document-search-cancel', job.id);
        job.finish(null);
        this.syncSearchWindow?.();
    },

    async performDocumentSearch(term, params) {
        const tabs = window.fileTabManager;
        if (tabs.isSwitchingSession || window.intelligentSave?.saveInProgress) return false;
        this.cancelDocumentSearch();
        const mode = this.resolveDocumentSearchMode(term, params);
        const active = tabs.getSessionById(tabs.activeSessionId);
        const options = { term, mode, sensitive: !!params.caseSensitive, wholeWord: !!params.wholeWord };
        if (!active) return false;
        if (mode === 'hex' && (!/^[0-9a-f\s]+$/i.test(term) || term.replace(/\s/g, '').length % 2)) {
            window.notificationSystem?.error('Informe pares de dígitos hexadecimais.', 'Busca');
            return false;
        }
        if (term.length > 65536) {
            window.notificationSystem?.error('O padrão pode conter até 65.536 caracteres.', 'Busca');
            return false;
        }

        tabs.captureEditorStateInto(active);
        const sessions = params.searchAllTabs ? tabs.sessions.slice() : [active];
        const documents = sessions.map(session => {
            const tableId = session.currentCharTable || 'ascii';
            const table = session.selectedCharTable || this.charTables?.[tableId];
            return {
                tableId, table,
                size: session.fileSize,
                path: session.isLargeFile ? session.fileRef?.path : null,
                snapshot: session.isLargeFile ? session.snapshot : null,
                data: session.isLargeFile ? null : session.snapshot
            };
        });
        const revision = this.documentRevision || 0;
        const limit = this.getChunkedSearchResultLimit();
        this.lastSearchTerm = term;
        this.lastDocumentSearchOptions = { ...params, mode, findValue: term };
        this.searchMode = mode;
        this.searchPreviewPage = 0;
        this.searchNotice = '';
        this.searchTruncated = false;
        this.globalTabSearchActive = !!params.searchAllTabs;
        this.globalTabSearchGroups = [];
        this.searchResults = [];
        this.currentSearchIndex = -1;
        this.updateSearchResults();
        try {
            const result = await this.runDocumentSearchWorker(documents, options, limit);
            if (!result || revision !== (this.documentRevision || 0) || (!params.searchAllTabs && tabs.activeSessionId !== active.id)) return false;
            const skipped = [];
            result.forEach(({ results, skipped: skippedDocument, truncated }, index) => {
                const session = sessions[index];
                if (skippedDocument) skipped.push(session.fileName);
                if (truncated) this.searchTruncated = true;
                if (!tabs.getSessionById(session.id) || !results.length) return;
                const matches = results.map((match, position) => ({
                    ...match, fileName: session.fileName, offsetHex: match.offset.toString(16).toUpperCase().padStart(8, '0'),
                    sessionId: session.id, globalIndex: this.searchResults.length + position
                }));
                if (params.searchAllTabs) this.globalTabSearchGroups.push({ sessionId: session.id, fileName: session.fileName, total: matches.length });
                for (const match of matches) this.searchResults.push(match);
            });
            if (skipped.length) this.searchNotice = `Regex indisponível para ${skipped.length} aba(s) acima do limite (32 MiB em ASCII, 512 KiB com tabela).`;
            if (this.searchTruncated) this.searchNotice += ` Limite de ${limit.toLocaleString('pt-BR')} ocorrências atingido. A busca foi interrompida.`;
            if (this.searchResults.length) this.goToSearchResult(0);
            this.updateSearchResults();
            this.render();
            await this.syncSearchWindow?.();
            return true;
        } catch (error) {
            this.searchNotice = error.message;
            window.notificationSystem?.error(error.message, 'Busca');
            await this.syncSearchWindow?.();
            return false;
        }
    },

    runDocumentSearchWorker(documents, options, limit) {
        const { ipcRenderer } = require('electron');
        const id = require('node:crypto').randomUUID();
        return new Promise((resolve, reject) => {
            const total = documents.reduce((sum, item) => sum + item.size, 0);
            const outcomes = [];
            let completed = 0;
            let remaining = limit;
            const finish = (error, result) => {
                ipcRenderer.removeListener('document-search-update', job.receive);
                this.documentSearchJob = null;
                ipcRenderer.send('document-search-cancel', id);
                if (error) reject(error);
                else resolve(result);
            };
            const job = {
                id, ipc: ipcRenderer, finish: resolve, progress: 0,
                receive: (_event, message) => {
                    if (message.id !== id || this.documentSearchJob !== job) return;
                    if (message.error) {
                        finish(new Error(message.error));
                    } else if (message.outcome) {
                        const outcome = message.outcome;
                        completed += documents[outcomes.length].size;
                        outcomes.push(outcome);
                        remaining -= outcome.results.length;
                        if (outcome.truncated || outcomes.length === documents.length) {
                            finish(null, outcomes);
                        } else {
                            ipcRenderer.send('document-search-next', { id, document: documents[outcomes.length], limit: remaining });
                        }
                    } else {
                        job.progress = total ? Math.floor((completed + message.progress) * 100 / total) : 0;
                        this.syncSearchWindow?.();
                    }
                }
            };
            this.documentSearchJob = job;
            ipcRenderer.on('document-search-update', job.receive);
            try {
                ipcRenderer.send('document-search-start', { id, document: documents[0], options, limit });
                this.syncSearchWindow?.();
            } catch (error) {
                finish(error);
            }
        });
    }
});
