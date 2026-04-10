Object.assign(FoxyHexEditorComplete.prototype, {
getHighlightAt(offset) {
    if (!this.highlightsMap) this.highlightsMap = new Map();
    return this.highlightsMap.get(offset) || null;
},

updateHighlightsMap() {
    if (!this.highlightsMap) this.highlightsMap = new Map();
    this.highlightsMap.clear();
    for (const highlight of this.highlights.values()) {
        for (let i = highlight.start; i <= highlight.end; i++) {
            this.highlightsMap.set(i, highlight);
        }
    }
},

getHighlightColors(highlight) {
    if (this.selectedHighlight && this.selectedHighlight.id === highlight.id) {
        return this.highlightColors.selected;
    }
    return this.highlightColorPresets[this.currentHighlightColor];
},

applyHighlightStyle(element, colors) {
    element.style.background = colors.background;
    element.style.color = colors.text;
    element.style.fontWeight = 'bold';
    element.style.boxShadow = colors.shadow;
    element.style.borderRadius = '3px';
    element.style.border = colors.border;
    element.style.transition = 'all 0.2s ease';
},

createHighlight() {
    const start = Math.min(this.selectionStart, this.selectionEnd);
    const end = Math.max(this.selectionStart, this.selectionEnd);
    if (start === end) return;

    const overlapping = this.findOverlappingHighlights(start, end);
    overlapping.forEach((highlight) => {
        this.highlights.delete(highlight.id);
    });

    const highlightId = ++this.highlightIdCounter;
    const highlight = {
        id: highlightId,
        start,
        end,
        color: 'default',
        comment: '',
        created: Date.now()
    };

    this.highlights.set(highlightId, highlight);
    this.updateHighlightsMap();
    this.completeRenderWithColors(this.currentScrollPercent, true);
    this.saveHighlightsToFile();
    this.updateHighlightsButtonState();
    this.selectionStart = start;
    this.selectionEnd = start;
    if (this.syncHighlightsStateToWindow) {
        this.syncHighlightsStateToWindow();
    }
},

findOverlappingHighlights(start, end) {
    const overlapping = [];
    for (const [id, highlight] of this.highlights) {
        if (!(end < highlight.start || start > highlight.end)) {
            overlapping.push(highlight);
        }
    }
    return overlapping;
},

removeHighlight(highlightId) {
    if (this.highlights.has(highlightId)) {
        this.highlights.delete(highlightId);
        this.updateHighlightsMap();
        this.selectedHighlight = null;
        this.completeRenderWithColors(this.currentScrollPercent, true);
        this.saveHighlightsToFile();

        if (this.highlights.size === 0) {
            this.removeHighlightFile();
        }

        this.updateHighlightsButtonState();
        if (this.syncHighlightsStateToWindow) {
            this.syncHighlightsStateToWindow();
        }
    }
},

clearSelectedHighlight() {
    if (this.selectedHighlight) {
        this.selectedHighlight = null;
        this.completeRenderWithColors(this.currentScrollPercent, true);
    }
},

isHighlighted(offset) {
    return this.getHighlightAt(offset) !== null;
},

getAllHighlights() {
    return Array.from(this.highlights.values());
},

clearAllHighlights() {
    this.highlights.clear();
    this.updateHighlightsMap();
    this.selectedHighlight = null;

    document.querySelectorAll('.highlight-selected').forEach((el) => {
        el.classList.remove('highlight-selected');
    });

    this.completeRenderWithColors(this.currentScrollPercent, true);
    this.removeHighlightFile();
    this.updateHighlightsButtonState();
    if (this.syncHighlightsStateToWindow) {
        this.syncHighlightsStateToWindow();
    }
},

exportHighlights() {
    return {
        highlights: Array.from(this.highlights.values()),
        version: '1.3.5',
        created: Date.now()
    };
},

importHighlights(data) {
    if (data.highlights && Array.isArray(data.highlights)) {
        this.highlights.clear();

        data.highlights.forEach((highlight) => {
            this.highlights.set(highlight.id, highlight);
            this.highlightIdCounter = Math.max(this.highlightIdCounter, highlight.id);
        });

        this.updateHighlightsMap();
        this.completeRenderWithColors(this.currentScrollPercent, true);
    }
},

handleHighlightDoubleClick(highlightId, clickOffset, panel = null) {
    const highlight = this.highlights.get(highlightId);
    if (highlight) {
        this.selectionStart = highlight.start;
        this.selectionEnd = highlight.end;
        this.cursorPosition = clickOffset;
        if (panel) {
            this.activePanel = panel;
        }
        this.selectedHighlight = highlight;
        this.completeRenderWithColors(this.currentScrollPercent, true);
        this.updateStatus();
        this.addHighlightSelectionClass(highlight);
        this.showSelectionNotification(highlight);
    }
},

addHighlightStyles() {
    if (document.getElementById('highlight-styles')) return;

    const style = document.createElement('style');
    style.id = 'highlight-styles';
    style.textContent = `
        /* Estilos para highlights (marca-texto) */
        .highlight-context-menu {
            font-family: 'JetBrains Mono', monospace;
            font-size: 13px;
        }

        .context-menu-item {
            padding: 8px 16px;
            cursor: pointer;
            color: white;
            transition: background-color 0.2s ease;
            border-radius: 4px;
            margin: 2px 8px;
        }

        .context-menu-item:hover {
            background-color: rgba(255, 255, 255, 0.1);
        }

        .context-menu-item:active {
            background-color: rgba(255, 255, 255, 0.2);
        }

        @keyframes highlight-pulse {
            0% { box-shadow: 0 0 8px rgba(0, 191, 255, 0.8); }
            100% { box-shadow: 0 0 16px rgba(0, 191, 255, 1.0); }
        }

        .highlight-selected {
            animation: highlight-pulse 1.5s ease-in-out infinite alternate;
        }

        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;

    document.head.appendChild(style);
},

addHighlightSelectionClass(highlight) {
    document.querySelectorAll('.highlight-selected').forEach((el) => {
        el.classList.remove('highlight-selected');
    });

    for (let i = highlight.start; i <= highlight.end; i++) {
        const hexElement = document.querySelector(`[data-offset="${i}"][data-panel="hex"]`);
        if (hexElement) {
            hexElement.classList.add('highlight-selected');
        }
    }

    for (let i = highlight.start; i <= highlight.end; i++) {
        const asciiElement = document.querySelector(`[data-offset="${i}"][data-panel="ascii"]`);
        if (asciiElement) {
            asciiElement.classList.add('highlight-selected');
        }
    }
},

clearHighlightSelection() {
    if (this.selectedHighlight) {
        this.selectedHighlight = null;
        document.querySelectorAll('.highlight-selected').forEach((el) => {
            el.classList.remove('highlight-selected');
        });
    }
},

showSelectionNotification(highlight) {
    const selectionSize = Math.abs(highlight.end - highlight.start) + 1;
    const startHex = highlight.start.toString(16).toUpperCase().padStart(8, '0');
    const endHex = highlight.end.toString(16).toUpperCase().padStart(8, '0');
    const notification = document.createElement('div');
    notification.id = 'highlight-selection-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, rgba(0, 255, 127, 0.9), rgba(0, 250, 154, 0.9));
        color: #000;
        padding: 12px 20px;
        border-radius: 8px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 14px;
        font-weight: bold;
        z-index: 10000;
        box-shadow: 0 4px 20px rgba(0, 255, 127, 0.4);
        border: 2px solid #00ff7f;
        animation: slideInRight 0.5s ease-out;
    `;

    const lang = (window.I18n && window.I18n.currentLang) || 'pt';
    const isEn = lang === 'en';
    const titleText = isEn ? 'Selected Area!' : 'Área Selecionada!';
    const sizeText = isEn ? 'Size' : 'Tamanho';

    notification.innerHTML = `
        🎯 <strong>${titleText}</strong><br>
        📍 Offset: 0x${startHex} - 0x${endHex}<br>
        📏 ${sizeText}: ${selectionSize} bytes
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.5s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 500);
        }
    }, 3000);
},

ensureDataFolder() {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            return true;
        }

        if (typeof require !== 'undefined') {
            const fs = require('fs');
            if (!fs.existsSync(this.dataFolder)) {
                fs.mkdirSync(this.dataFolder, { recursive: true });
            }
            return true;
        }

        return false;
    } catch (error) {
        return false;
    }
},

generateHighlightFilename() {
    if (!this.currentFileName) return null;
    const baseName = this.currentFileName.replace(/\\/g, '_').replace(/\//g, '_');
    const extension = this.currentFileName.split('.').pop();
    return `${baseName}.${extension}.foxy`;
},

saveHighlightsToFile() {
    if (!this.persistenceEnabled || !this.currentFileName) return;

    try {
        const filename = this.generateHighlightFilename();
        if (!filename) return;

        const highlightData = {
            version: '1.3.5',
            filename: this.currentFileName,
            filepath: this.getResolvedCurrentFilePath?.() || '',
            filesize: this.getDataLength(),
            created: new Date().toISOString(),
            highlights: Array.from(this.highlights.values())
        };

        const jsonData = JSON.stringify(highlightData, null, 2);

        if (typeof window !== 'undefined' && window.localStorage) {
            const key = `highlights_${this.currentFileName}`;
            localStorage.setItem(key, jsonData);
            this.currentHighlightFile = key;
            return;
        }

        if (typeof require !== 'undefined') {
            const fs = require('fs');
            const path = require('path');
            this.ensureDataFolder();
            const filePath = path.join(this.dataFolder, filename);
            fs.writeFileSync(filePath, jsonData, 'utf8');
            this.currentHighlightFile = filePath;
        }
    } catch (error) {
        console.error('❌ Erro ao salvar marcações:', error);
    }
},

loadHighlightsFromFile() {
    if (!this.persistenceEnabled || !this.currentFileName) return;

    try {
        const filename = this.generateHighlightFilename();
        if (!filename) return;

        let highlightData = null;

        if (typeof window !== 'undefined' && window.localStorage) {
            const key = `highlights_${this.currentFileName}`;
            const savedData = localStorage.getItem(key);
            if (savedData) {
                highlightData = JSON.parse(savedData);
                this.currentHighlightFile = key;
            }
        }

        if (!highlightData && typeof require !== 'undefined') {
            const fs = require('fs');
            const path = require('path');
            const filePath = path.join(this.dataFolder, filename);
            if (fs.existsSync(filePath)) {
                const fileContent = fs.readFileSync(filePath, 'utf8');
                highlightData = JSON.parse(fileContent);
                this.currentHighlightFile = filePath;
            }
        }

        if (highlightData && highlightData.highlights) {
            this.highlights.clear();
            this.highlightIdCounter = 0;

            highlightData.highlights.forEach((highlight) => {
                this.highlights.set(highlight.id, highlight);
                this.highlightIdCounter = Math.max(this.highlightIdCounter, highlight.id);
            });

            this.updateHighlightsMap();
            this.completeRenderWithColors(this.currentScrollPercent, true);
            this.updateHighlightsButtonState();
            if (this.syncHighlightsStateToWindow) {
                this.syncHighlightsStateToWindow();
            }
        }
    } catch (error) {
        console.error('❌ Erro ao carregar marcações:', error);
    }
},

removeHighlightFile() {
    if (!this.currentHighlightFile) return;

    try {
        if (typeof window !== 'undefined' && window.localStorage && this.currentHighlightFile.startsWith('highlights_')) {
            localStorage.removeItem(this.currentHighlightFile);
            this.currentHighlightFile = null;
            return;
        }

        if (typeof require !== 'undefined') {
            const fs = require('fs');
            if (fs.existsSync(this.currentHighlightFile)) {
                fs.unlinkSync(this.currentHighlightFile);
                this.currentHighlightFile = null;
            }
        }
    } catch (error) {
        console.error('❌ Erro ao remover arquivo de marcações:', error);
    }
},

addHighlight(start, end, color = 'default') {
    if (start === end) return null;

    const overlapping = this.findOverlappingHighlights(start, end);
    overlapping.forEach((highlight) => {
        this.highlights.delete(highlight.id);
    });

    const highlightId = ++this.highlightIdCounter;
    const highlight = {
        id: highlightId,
        start,
        end,
        color,
        created: Date.now()
    };

    this.highlights.set(highlightId, highlight);
    this.updateHighlightsMap();
    this.completeRenderWithColors(this.currentScrollPercent, true);
    this.saveHighlightsToFile();
    if (this.syncHighlightsStateToWindow) {
        this.syncHighlightsStateToWindow();
    }
    return highlightId;
},

highlightSearchResults(searchTerm) {
    const results = [];
    let pos = 0;

    while (pos < this.getDataLength()) {
        const found = this.searchInData(searchTerm, pos);
        if (found !== -1) {
            results.push({ start: found, end: found + searchTerm.length - 1 });
            pos = found + 1;
        } else {
            break;
        }
    }

    const highlightIds = [];
    results.forEach((result) => {
        const id = this.addHighlight(result.start, result.end);
        if (id) highlightIds.push(id);
    });

    return highlightIds;
},

searchInData(searchTerm, startPos = 0) {
    if (this.getDataLength() === 0) return -1;

    const searchBytes = new TextEncoder().encode(searchTerm);
    const searchLength = searchBytes.length;

    for (let i = startPos; i <= this.getDataLength() - searchLength; i++) {
        let match = true;
        for (let j = 0; j < searchLength; j++) {
            if (this.getByteAt(i + j) !== searchBytes[j]) {
                match = false;
                break;
            }
        }
        if (match) {
            return i;
        }
    }

    return -1;
}
});
