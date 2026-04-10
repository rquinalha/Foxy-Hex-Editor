const { ipcRenderer } = require('electron');

class AnalysisToolRenderer {
    constructor() {
        this.currentAnalysis = null;
        this.init();
    }

    init() {
        this.bindIpcListeners();
        this.bindKeyboardShortcuts();
        this.notifyReady();
    }

    bindIpcListeners() {
        ipcRenderer.on('update-analysis-state', (event, data) => {
            this.updateAnalysis(data);
        });
    }

    bindKeyboardShortcuts() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.close();
            } else if (e.key === 'F5') {
                e.preventDefault();
                this.refresh();
            }
        });
    }

    notifyReady() {
        ipcRenderer.send('analysis-tool-ready');
    }

    t(key, fallback) {
        return window.I18n?.t ? window.I18n.t(key) : fallback;
    }

    updateAnalysis(data) {
        this.currentAnalysis = data;
        this.updateStats(data);
        this.updateStringsTable(data.textStrings || []);
        this.updatePatterns(data.patterns || []);
    }

    updateStats(data) {
        const formatEl = document.getElementById('stat-format');
        const sizeEl = document.getElementById('stat-size');
        const stringsEl = document.getElementById('stat-strings');
        const entropyEl = document.getElementById('stat-entropy');
        const entropyMarker = document.getElementById('entropy-marker');
        const entropyNote = document.getElementById('entropy-note');

        const unknownText = this.t('tool.analysis.unknown', 'Unknown');

        if (formatEl) formatEl.textContent = data.format || unknownText;
        if (sizeEl) sizeEl.textContent = this.formatFileSize(data.fileSize || 0);
        if (stringsEl) stringsEl.textContent = (data.textStrings || []).length.toLocaleString();

        if (entropyEl) {
            const entropy = data.entropy || 0;
            entropyEl.textContent = `${entropy.toFixed(2)} bits`;

            if (entropyMarker) {
                const percentage = Math.min(100, Math.max(0, (entropy / 8) * 100));
                entropyMarker.style.left = `${percentage}%`;
            }
        }

        if (entropyNote) {
            const details = data.entropyDetails || null;
            if (details && details.classification) {
                const classificationLabel = details.classification === 'structured'
                    ? this.t('tool.analysis.class_structured', 'Structured')
                    : details.classification === 'text_heavy'
                        ? this.t('tool.analysis.class_text_heavy', 'Text/script')
                        : details.classification === 'compressed_likely'
                            ? this.t('tool.analysis.class_compressed_likely', 'Compression likely')
                            : details.classification === 'dense_binary'
                                ? this.t('tool.analysis.class_dense_binary', 'Dense binary')
                                : this.t('tool.analysis.class_mixed_binary', 'Mixed binary');

                const summaryText = details.classification === 'structured'
                    ? this.t('tool.analysis.summary_structured', 'Well-structured data with low variation and good local repetition.')
                    : details.classification === 'text_heavy'
                        ? this.t('tool.analysis.summary_text_heavy', 'The content appears dominated by text, scripts, or readable tables.')
                        : details.classification === 'compressed_likely'
                            ? this.t('tool.analysis.summary_compressed_likely', 'The byte distribution matches compressed or scrambled data.')
                            : details.classification === 'dense_binary'
                                ? this.t('tool.analysis.summary_dense_binary', 'The data is dense and varied, but does not strongly suggest compression.')
                                : this.t('tool.analysis.summary_mixed_binary', 'Binary file with a mix of code, data, and resources.');

                const compressionText = details.compressionLikelihood === 'likely'
                    ? this.t('tool.analysis.compression_likely', 'Compression likely')
                    : details.compressionLikelihood === 'possible'
                        ? this.t('tool.analysis.compression_possible', 'Compression uncertain')
                        : this.t('tool.analysis.compression_unlikely', 'Compression unlikely');

                const sampledText = details.sampled
                    ? ` Sampled scan: ${this.formatFileSize(details.analyzedBytes || 0)} / ${this.formatFileSize(details.sourceFileSize || 0)}.`
                    : '';
                const tableText = data.tableName ? ` Table: ${data.tableName}.` : '';

                entropyNote.textContent = `${classificationLabel} • ${compressionText}. ${summaryText}${sampledText}${tableText}`.trim();
                entropyNote.title = `ASCII ${(details.asciiRatio * 100).toFixed(1)}% | Zeros ${(details.zeroByteRatio * 100).toFixed(1)}% | Avg ${details.avgWindowEntropy.toFixed(2)} | StdDev ${details.entropyStdDev.toFixed(2)}`;
            } else {
                entropyNote.textContent = this.t('tool.analysis.entropy_default_note', 'Entropy alone is not enough to conclude compression.');
                entropyNote.title = '';
            }
        }
    }

    updateStringsTable(strings) {
        const tbody = document.getElementById('strings-tbody');
        const countEl = document.getElementById('strings-count');

        if (countEl) countEl.textContent = strings.length.toLocaleString();
        if (!tbody) return;

        if (strings.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="2" class="empty-state">
                        ${this.t('tool.analysis.no_strings', 'No text strings found')}
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = strings.map((str) => `
            <tr class="clickable-offset" data-offset="${str.offset}" data-length="${str.length}">
                <td class="offset">0x${str.offset.toString(16).toUpperCase().padStart(8, '0')}</td>
                <td class="text">${this.escapeHtml(str.text)}</td>
            </tr>
        `).join('');

        tbody.querySelectorAll('.clickable-offset').forEach(row => {
            row.addEventListener('click', () => {
                const offset = parseInt(row.dataset.offset, 10);
                const length = parseInt(row.dataset.length, 10) || 0;
                this.navigateToOffset(offset, length);
                row.style.background = 'linear-gradient(135deg, rgba(255, 107, 53, 0.4) 0%, rgba(247, 147, 30, 0.4) 100%)';
                setTimeout(() => {
                    row.style.background = '';
                }, 500);
            });
        });
    }

    updatePatterns(patterns) {
        const grid = document.getElementById('patterns-grid');
        const countEl = document.getElementById('patterns-count');

        if (countEl) countEl.textContent = patterns.length.toLocaleString();
        if (!grid) return;

        if (patterns.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    ${this.t('tool.analysis.no_patterns', 'No patterns detected')}
                </div>
            `;
            return;
        }

        const byteLabel = this.t('tool.analysis.byte', 'Byte');
        const occurrencesLabel = this.t('tool.analysis.occurrences', 'Occurrences');
        const startLabel = this.t('tool.analysis.start', 'Start');
        const lengthLabel = this.t('tool.analysis.length', 'Size');
        const positionLabel = this.t('tool.analysis.position', 'Position');
        const naLabel = this.t('tool.analysis.na', 'N/A');

        grid.innerHTML = patterns.map(pattern => {
            if (pattern.type === 'repeated') {
                return `
                    <div class="pattern-card">
                        <div class="type">${this.t('tool.analysis.repeated_byte', 'Repeated Byte')}</div>
                        <div class="details">
                            <strong>${byteLabel}:</strong> 0x${pattern.byte.toString(16).toUpperCase()}<br>
                            <strong>${occurrencesLabel}:</strong> ${pattern.count.toLocaleString()} (${pattern.percentage}%)
                        </div>
                    </div>
                `;
            }

            if (pattern.type === 'zero_padding') {
                return `
                    <div class="pattern-card">
                        <div class="type">${this.t('tool.analysis.zero_padding', 'Zero Padding')}</div>
                        <div class="details">
                            <strong>${startLabel}:</strong> 0x${pattern.start.toString(16).toUpperCase()}<br>
                            <strong>${lengthLabel}:</strong> ${pattern.length} bytes
                        </div>
                    </div>
                `;
            }

            if (pattern.type === 'compression_signature' || pattern.type === 'compression_hint') {
                return `
                    <div class="pattern-card">
                        <div class="type">${pattern.type === 'compression_signature'
                            ? this.t('tool.analysis.compression_signature', 'Compression Signature')
                            : this.t('tool.analysis.compression_hint', 'Compression Hint')}</div>
                        <div class="details">
                            <strong>${this.t('tool.analysis.name', 'Name')}:</strong> ${this.escapeHtml(pattern.name || naLabel)}<br>
                            <strong>${positionLabel}:</strong> 0x${pattern.start.toString(16).toUpperCase()}<br>
                            <strong>${lengthLabel}:</strong> ${pattern.length || naLabel} bytes
                        </div>
                    </div>
                `;
            }

            return `
                <div class="pattern-card">
                    <div class="type">${this.t('tool.analysis.pattern', 'Pattern')}</div>
                    <div class="details">
                        <strong>${positionLabel}:</strong> 0x${pattern.start?.toString(16).toUpperCase()}<br>
                        <strong>${lengthLabel}:</strong> ${pattern.length || naLabel} bytes
                    </div>
                </div>
            `;
        }).join('');
    }

    navigateToOffset(offset, length) {
        ipcRenderer.send('analysis-navigate-to-offset', { offset, length });
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    exportReport() {
        if (!this.currentAnalysis) return;

        const report = {
            ...this.currentAnalysis,
            filename: 'analysis_report.json',
            timestamp: new Date().toISOString()
        };

        ipcRenderer.invoke('show-save-dialog', {
            title: this.t('tool.analysis.export_report_title', 'Export Analysis Report'),
            defaultPath: this.t('tool.analysis.export_default_name', 'analysis_report.json'),
            filters: [
                { name: this.t('tool.analysis.export_report_name', 'JSON Report'), extensions: ['json'] }
            ]
        }).then(result => {
            if (!result.canceled && result.filePath) {
                const fs = require('fs');
                try {
                    fs.writeFileSync(result.filePath, JSON.stringify(report, null, 2), 'utf8');
                    this.showNotification(this.t('tool.analysis.export_success', 'Report exported successfully!'), 'success');
                } catch (error) {
                    this.showNotification(`${this.t('tool.analysis.export_error', 'Error exporting')}: ${error.message}`, 'error');
                }
            }
        }).catch(error => {
            this.showNotification(`${this.t('tool.analysis.dialog_error', 'Error opening dialog')}: ${error.message}`, 'error');
        });
    }

    refresh() {
        ipcRenderer.send('analysis-refresh-request');
        this.showNotification(this.t('tool.analysis.refreshing', 'Analysis being updated...'), 'info');
    }

    close() {
        ipcRenderer.send('close-analysis-window');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        const colors = {
            success: 'linear-gradient(135deg, #2ed573, #1e90ff)',
            error: 'linear-gradient(135deg, #ff4757, #ff3742)',
            info: 'linear-gradient(135deg, #4fc3f7, #357abd)'
        };

        notification.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            background: ${colors[type] || colors.info};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: slideInRight 0.3s ease;
        `;
        notification.textContent = message;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            notification.style.transition = 'all 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

const analysisTool = new AnalysisToolRenderer();
window.analysisTool = analysisTool;

