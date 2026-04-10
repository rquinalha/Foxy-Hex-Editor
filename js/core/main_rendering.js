Object.assign(FoxyHexEditorComplete.prototype, {
resetTextColumnScrollMetrics() {
this._textColumnScrollMetrics = {
    maxUnits: 0
};
},

registerTextColumnScrollUnits(units = 0) {
const numericUnits = Math.max(0, parseInt(units, 10) || 0);
if (!this._textColumnScrollMetrics) {
    this.resetTextColumnScrollMetrics();
}
this._textColumnScrollMetrics.maxUnits = Math.max(this._textColumnScrollMetrics.maxUnits || 0, numericUnits);
},

getMaxTextColumnScrollUnits() {
let maxUnits = 0;
document.querySelectorAll('.hex-ascii').forEach((element) => {
    const visibleText = element.textContent || '';
    maxUnits = Math.max(maxUnits, visibleText.length);
});
return maxUnits;
},

getTextColumnViewportWidth() {
const viewport = document.querySelector('.hex-ascii-viewport');
if (viewport && viewport.clientWidth > 0) {
    return Math.ceil(viewport.clientWidth);
}

const header = document.querySelector('.decoded-text-header');
if (header && header.clientWidth > 0) {
    return Math.ceil(header.clientWidth);
}

return 420;
},

ensureTextColumnScrollbar() {
const scrollbar = document.getElementById('text-column-scrollbar');
if (!scrollbar || scrollbar.dataset.bound === '1') {
    return scrollbar;
}

const thumb = document.getElementById('text-column-scrollbar-thumb');
const setFromClientX = (clientX) => {
    const maxScrollLeft = parseInt(scrollbar.dataset.maxScrollLeft || '0', 10) || 0;
    const trackWidth = Math.max(0, scrollbar.clientWidth || 0);
    const thumbWidth = Math.max(24, thumb ? thumb.offsetWidth || 0 : 0);
    const travelWidth = Math.max(0, trackWidth - thumbWidth);
    if (maxScrollLeft <= 0 || travelWidth <= 0) {
        this.setTextColumnScrollLeft(0);
        return;
    }

    const rect = scrollbar.getBoundingClientRect();
    const relativeX = Math.max(0, Math.min(travelWidth, clientX - rect.left - (thumbWidth / 2)));
    const ratio = relativeX / travelWidth;
    this.setTextColumnScrollLeft(Math.round(ratio * maxScrollLeft));
};

if (thumb) {
    thumb.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        thumb.setPointerCapture?.(event.pointerId);
        scrollbar.dataset.dragging = '1';
        const moveHandler = (moveEvent) => {
            setFromClientX(moveEvent.clientX);
        };
        const upHandler = () => {
            scrollbar.dataset.dragging = '0';
            window.removeEventListener('pointermove', moveHandler);
            window.removeEventListener('pointerup', upHandler);
        };
        window.addEventListener('pointermove', moveHandler);
        window.addEventListener('pointerup', upHandler);
    });
}

scrollbar.addEventListener('pointerdown', (event) => {
    if (event.target === thumb) {
        return;
    }
    event.preventDefault();
    setFromClientX(event.clientX);
});

// Scroll horizontal com roda do mouse
scrollbar.addEventListener('wheel', (event) => {
    event.preventDefault();
    const delta = event.deltaY || event.deltaX;
    const scrollAmount = delta > 0 ? 30 : -30; // 30 pixels por tick
    const currentScrollLeft = this.textColumnScrollLeft || 0;
    this.setTextColumnScrollLeft(currentScrollLeft + scrollAmount);
}, { passive: false });

scrollbar.dataset.bound = '1';
return scrollbar;
},

setTextColumnScrollLeft(nextScrollLeft = 0) {
const scrollbar = document.getElementById('text-column-scrollbar');
const maxScrollLeft = Math.max(0, parseInt(scrollbar?.dataset.maxScrollLeft || '0', 10) || 0);
this.textColumnScrollLeft = Math.min(Math.max(0, nextScrollLeft), maxScrollLeft);
this.applyTextColumnScroll();
this.updateTextColumnScrollbarThumb();
},

applyTextColumnScroll() {
const scrollLeft = Math.max(0, this.textColumnScrollLeft || 0);
document.querySelectorAll('.hex-ascii').forEach((element) => {
    element.style.transform = `translateX(${-scrollLeft}px)`;
});
},

updateTextColumnScrollbarThumb() {
const scrollbar = document.getElementById('text-column-scrollbar');
const thumb = document.getElementById('text-column-scrollbar-thumb');
if (!scrollbar || !thumb) {
    return;
}

const viewportWidth = Math.max(1, parseInt(scrollbar.dataset.viewportWidth || '0', 10) || 1);
const contentWidth = Math.max(viewportWidth, parseInt(scrollbar.dataset.contentWidth || '0', 10) || viewportWidth);
const maxScrollLeft = Math.max(0, parseInt(scrollbar.dataset.maxScrollLeft || '0', 10) || 0);
const trackWidth = Math.max(0, scrollbar.clientWidth || 0);

if (trackWidth <= 0 || maxScrollLeft <= 0 || contentWidth <= viewportWidth) {
    thumb.style.width = `${Math.max(24, Math.round(trackWidth * 0.12))}px`;
    thumb.style.transform = 'translateX(0px)';
    return;
}

const thumbWidth = Math.max(24, Math.round((viewportWidth / contentWidth) * trackWidth));
const travelWidth = Math.max(0, trackWidth - thumbWidth);
const ratio = maxScrollLeft > 0 ? (this.textColumnScrollLeft || 0) / maxScrollLeft : 0;
const thumbLeft = Math.round(travelWidth * ratio);

thumb.style.width = `${thumbWidth}px`;
thumb.style.transform = `translateX(${thumbLeft}px)`;
},


getTextColumnContentWidth(element) {
if (!element) {
    return 0;
}

// Forçar reflow para garantir que scrollWidth esteja atualizado
const forceReflow = element.offsetHeight;

// Usar scrollWidth que inclui todo o conteúdo, mesmo o overflow
const scrollWidth = Math.ceil(element.scrollWidth || 0);
const offsetWidth = Math.ceil(element.offsetWidth || 0);

// Calcular largura baseada na soma dos filhos (para caso scrollWidth não inclua tudo)
let childrenWidth = 0;
for (const child of element.children || []) {
    const childWidth = Math.ceil(child.offsetWidth || 0);
    const marginLeft = parseFloat(child.style.marginLeft || '0') || 0;
    const marginRight = parseFloat(child.style.marginRight || '0') || 0;
    childrenWidth += childWidth + marginLeft + marginRight;
}

// Retornar o maior valor encontrado
return Math.max(scrollWidth, offsetWidth, childrenWidth);
},

getTextColumnCharacterCount(element) {
if (!element) {
    return 0;
}

const explicitCount = parseInt(element.dataset.visualCharCount || '', 10);
if (!Number.isNaN(explicitCount) && explicitCount > 0) {
    return explicitCount;
}

let characterCount = 0;
for (const child of element.children || []) {
    const text = child.textContent || '';
    characterCount += text.length;
}

return characterCount;
},

applyTextColumnScrollbarMetrics(maxUnitsInRow = null) {
const scrollbar = this.ensureTextColumnScrollbar();
const wrap = document.getElementById('text-column-scrollbar-wrap');
if (!scrollbar) {
    return;
}

const viewportWidth = this.getTextColumnViewportWidth();
const maxVisibleChars = 34;
const unitWidth = Math.max(8, Math.round(viewportWidth / maxVisibleChars));
const measuredUnits = this.getMaxTextColumnScrollUnits();
const requestedUnits = Math.max(0, parseInt(maxUnitsInRow, 10) || 0);
const safeMaxUnitsInRow = Math.max(measuredUnits, requestedUnits);

// Medir a largura real renderizada dos elementos .hex-ascii para detectar overflow real
let maxActualContentWidth = 0;
const asciiElements = document.querySelectorAll('.hex-ascii');
asciiElements.forEach((element) => {
    const actualWidth = this.getTextColumnContentWidth(element);
    maxActualContentWidth = Math.max(maxActualContentWidth, actualWidth);
});

// Usar a maior largura entre a calculada por caracteres e a largura real medida
const overflowChars = Math.max(0, safeMaxUnitsInRow - maxVisibleChars);
const overflowWidth = overflowChars * unitWidth;
const charBasedContentWidth = viewportWidth + overflowWidth;

// Priorizar a largura real medida do DOM sobre cálculo baseado em caracteres
// Isso é crucial quando tags como <page> ocupam mais espaço visual do que o byte count sugere
const virtualContentWidth = Math.max(charBasedContentWidth, maxActualContentWidth);

// Detectar overflow: se largura real > viewport OU cálculo por caracteres indicar overflow
const hasOverflow = maxActualContentWidth > viewportWidth || charBasedContentWidth > viewportWidth;
const maxScrollLeft = Math.max(0, virtualContentWidth - viewportWidth);
if (wrap) {
    wrap.classList.toggle('has-overflow', hasOverflow);
}
scrollbar.style.pointerEvents = hasOverflow ? 'auto' : 'none';
scrollbar.setAttribute('aria-hidden', hasOverflow ? 'false' : 'true');
scrollbar.dataset.maxScrollLeft = String(maxScrollLeft);
scrollbar.dataset.viewportWidth = String(viewportWidth);
scrollbar.dataset.contentWidth = String(virtualContentWidth);

if (!hasOverflow) {
    this.textColumnScrollLeft = 0;
}

this.textColumnScrollLeft = Math.min(Math.max(0, this.textColumnScrollLeft || 0), maxScrollLeft);
this.applyTextColumnScroll();
this.updateTextColumnScrollbarThumb();
},

updateTextColumnScrollbar() {
this.applyTextColumnScrollbarMetrics(this.getMaxTextColumnScrollUnits());
},

scrollTextColumnBy(deltaX = 0) {
const scrollbar = this.ensureTextColumnScrollbar();
if (!scrollbar) {
    return false;
}

this.updateTextColumnScrollbar();

const maxScrollLeft = parseInt(scrollbar.dataset.maxScrollLeft || '0', 10) || 0;

if (maxScrollLeft <= 0) {
    return false;
}

const nextScrollLeft = Math.min(maxScrollLeft, Math.max(0, (this.textColumnScrollLeft || 0) + deltaX));

if (nextScrollLeft === (this.textColumnScrollLeft || 0)) {
    return true;
}

this.setTextColumnScrollLeft(nextScrollLeft);
return true;
},

render() {
this.completeRenderWithColors(this.currentScrollPercent, true);
this.updateStatus();
this.updateStats();
this.updateButtons();
this.updateModeUI();
this.emit('render');
},

renderHexContent() {
const container = document.getElementById('hex-content');
if (!container) return;
this.resetTextColumnScrollMetrics();

const dataLength = this.getDataLength();
const totalLines = Math.ceil(dataLength / this.bytesPerLine);
const lineHeight = this.getEffectiveLineHeight();
const containerHeight = container.clientHeight;
const visibleLines = Math.ceil(containerHeight / lineHeight) + 10;

const scrollTop = container.scrollTop;
const startLine = Math.max(0, Math.floor(scrollTop / lineHeight) - 5);
let endLine = Math.min(totalLines - 1, startLine + visibleLines);

if (this.cursorPosition >= dataLength - this.bytesPerLine) {
    endLine = totalLines - 1;
}

container.innerHTML = '';

const spacerTop = document.createElement('div');
spacerTop.style.height = `${startLine * lineHeight}px`;
spacerTop.style.width = '100%';
container.appendChild(spacerTop);

const fragment = document.createDocumentFragment();
this.resetTextColumnScrollMetrics();
for (let line = startLine; line <= endLine; line++) {
    const offset = line * this.bytesPerLine;
    const lineElement = this.createHexLine(offset);
    const textVisualUnits = parseInt(lineElement?.dataset?.textVisualUnits || '0', 10) || 0;
    this.registerTextColumnScrollUnits(textVisualUnits);
    fragment.appendChild(lineElement);
}
container.appendChild(fragment);

const spacerBottom = document.createElement('div');
spacerBottom.style.height = `${(totalLines - endLine - 1) * lineHeight}px`;
spacerBottom.style.width = '100%';
container.appendChild(spacerBottom);

container.style.height = `${totalLines * lineHeight}px`;
container.scrollTop = scrollTop;
requestAnimationFrame(() => this.updateTextColumnScrollbar());

if (this.cursorPosition > 0) {
    const cursorLine = Math.floor(this.cursorPosition / this.bytesPerLine);
    const cursorTop = cursorLine * lineHeight;

    if (cursorTop < scrollTop || cursorTop > scrollTop + containerHeight - lineHeight) {
        this.ensureCursorVisible();
    }
}
},

createHexLine(offset) {
const line = document.createElement('div');
line.className = 'hex-line';
line.dataset.offset = offset;
line.dataset.line = Math.floor(offset / this.bytesPerLine);

const hasBookmark = this.bookmarks.some(b =>
    b.offset >= offset && b.offset < offset + this.bytesPerLine
);

const offsetDiv = document.createElement('div');
offsetDiv.className = 'hex-offset';
if (hasBookmark) offsetDiv.classList.add('bookmarked');
offsetDiv.textContent = this.formatOffset(offset, { includePrefix: false, useDisplayBase: true });
offsetDiv.style.color = this.getOffsetColor();
line.appendChild(offsetDiv);

const bytesDiv = document.createElement('div');
bytesDiv.className = 'hex-bytes';
const insertCaretEnabled = this.canUseInsertCursor();
let hexEndCaretPlaced = false;

let asciiText = '';
let ascii16BitMapping = []; // Mapeamento 16-bit com informações DTE/MTE/TAG
const currentTable = this.charTables && this.currentCharTable ? this.charTables[this.currentCharTable] : null;
const currentTableType = this.charTables && this.currentCharTable && this.charTables[this.currentCharTable]
    ? this.charTables[this.currentCharTable].type
    : '';
const is16bit = currentTableType &&
               (currentTableType === '16-bit' ||
                currentTableType === 'UTF-16' ||
                currentTableType.includes('16-bit'));
const isShiftJIS = !!(currentTable && (((currentTable.type && currentTable.type.includes && (currentTable.type.includes('shift-jis') || currentTable.type.includes('shift_jis')))) || currentTable._isShiftJIS === true));

const shiftJISVisualMap = this.getShiftJISVisualMap(offset, this.bytesPerLine);
const visual16BitMap = is16bit ? this.get16BitVisualMap(offset, this.bytesPerLine) : new Map();
const active16BitDecoder = is16bit ? this.getActive16BitDecoder() : null;

if (is16bit && active16BitDecoder) {
    const maxChars = Math.min(this.bytesPerLine / 2, Math.floor((this.getDataLength() - offset) / 2));
    const data = this.getRangeAt(offset, maxChars * 2);
    // Usar decodeWithMapping para obter informações de tipo (DTE/MTE/TAG)
    if (active16BitDecoder.decodeWithMapping) {
        const result = active16BitDecoder.decodeWithMapping(data, 0, maxChars);
        asciiText = result.text;
        ascii16BitMapping = result.mapping;
    } else {
        asciiText = active16BitDecoder.decode(data, 0, maxChars);
    }
} else if (isShiftJIS) {
    asciiText = this.decodeTextAtOffset(offset, this.bytesPerLine);
}

for (let i = 0; i < this.bytesPerLine; i++) {
    const byteOffset = offset + i;

    if (byteOffset < this.getDataLength()) {
        if (insertCaretEnabled) {
            const beforeCaret = this.createInsertCaretSpan(byteOffset, 'hex');
            if (beforeCaret) {
                bytesDiv.appendChild(beforeCaret);
            }
        }

        const byte = this.getByteAt(byteOffset);
        const byteHighlight = this.getHighlightAt ? this.getHighlightAt(byteOffset) : null;

        const byteSpan = document.createElement('span');
        byteSpan.className = 'hex-byte';
        byteSpan.textContent = byte.toString(16).toUpperCase().padStart(2, '0');
        byteSpan.dataset.offset = byteOffset;

        byteSpan.addEventListener('click', () => {
            const shouldGroupInHex = this.isCurrentTable16Bit() || this.isCurrentTableShiftJIS();
            if (shouldGroupInHex) {
                const targetRange = this.getSelectionRangeForPanel(byteOffset, 'hex');
                this.selectionStart = targetRange.start;
                this.selectionEnd = targetRange.end;
                this.cursorPosition = targetRange.cursor;
                this.activePanel = 'hex';
                this.renderCurrentView(true);
                this.updateStatus();
            } else {
                this.setCursor(byteOffset, 'hex', false);
            }
            if (byteHighlight) {
                this.selectedHighlight = byteHighlight;
                this.addHighlightSelectionClass(byteHighlight);
            }
        });
        byteSpan.addEventListener('pointerdown', (e) => this.startSelection(byteOffset, 'hex', e));
        byteSpan.addEventListener('pointerover', (e) => this.updateSelection(byteOffset, 'hex', e));
        byteSpan.addEventListener('pointerup', (e) => this.stopSelection());

        this.applyHexByteColors(byteSpan, byte);

        const shiftJISInfo = shiftJISVisualMap.get(byteOffset);
        if (shiftJISInfo) {
            byteSpan.classList.add(shiftJISInfo.type === 'pair-start' ? 'shiftjis-pair-start' : 'shiftjis-pair-end');
            const groupedStyle = this.getGroupedHexInlineStyle('shiftjis', shiftJISInfo.type);
            Object.assign(byteSpan.style, groupedStyle);
        }

        const visual16BitInfo = visual16BitMap.get(byteOffset);
        if (visual16BitInfo) {
            byteSpan.classList.add(visual16BitInfo.type === 'pair-start' ? 'utf16-pair-start' : 'utf16-pair-end');
            const groupedStyle = this.getGroupedHexInlineStyle('utf16', visual16BitInfo.type);
            Object.assign(byteSpan.style, groupedStyle);
        }

        if (!insertCaretEnabled && byteOffset === this.cursorPosition && this.activePanel === 'hex') {
            byteSpan.classList.add('selected');
        }

        if (this.selectionStart !== this.selectionEnd &&
            byteOffset >= Math.min(this.selectionStart, this.selectionEnd) &&
            byteOffset <= Math.max(this.selectionStart, this.selectionEnd)) {
            byteSpan.classList.add('selected');
        }

        if (this.modifiedBytes.has(byteOffset)) {
            byteSpan.classList.add('modified');
        }

        const searchHighlight = this.getSearchHighlight(byteOffset);
        if (searchHighlight) {
            if (searchHighlight.current) {
                byteSpan.classList.add('search-current');
            } else {
                byteSpan.classList.add('search-highlight');
            }
        }

        if (this.bookmarksSet && this.bookmarksSet.has(byteOffset)) {
            byteSpan.classList.add('bookmarked');
        }

        if (byteHighlight) {
            byteSpan.dataset.highlightId = byteHighlight.id;
            const isSelected = byteOffset >= Math.min(this.selectionStart, this.selectionEnd) &&
                byteOffset <= Math.max(this.selectionStart, this.selectionEnd) &&
                this.selectionStart !== this.selectionEnd;
            const isCursor = !insertCaretEnabled && byteOffset === this.cursorPosition;
            if (this.getHighlightColors && this.applyHighlightStyle) {
                const colors = this.getHighlightColors(byteHighlight);
                this.applyHighlightStyle(byteSpan, colors);
            }
            if (this.activePanel === 'hex') {
                if (isSelected) {
                    byteSpan.style.background = 'linear-gradient(135deg, rgba(255, 107, 53, 0.6), rgba(247, 147, 30, 0.6))';
                    byteSpan.style.color = 'white';
                    byteSpan.style.fontWeight = 'bold';
                }
                if (isCursor) {
                    byteSpan.style.background = 'linear-gradient(135deg, #ff6b35, #f7931e)';
                    byteSpan.style.color = 'white';
                    byteSpan.style.fontWeight = 'bold';
                    byteSpan.style.boxShadow = '0 0 12px rgba(255, 107, 53, 1)';
                }
            }
            byteSpan.addEventListener('dblclick', () => this.handleHighlightDoubleClick(byteHighlight.id, byteOffset, 'hex'));
        }

        bytesDiv.appendChild(byteSpan);

        if (!is16bit && !isShiftJIS) {
            let char = '.';
            const hexCode = byte.toString(16).toUpperCase().padStart(2, '0');
            if (currentTable) {
                char = (currentTable.tag_sequences && currentTable.tag_sequences[hexCode]) ||
                    (currentTable.dte_sequences && currentTable.dte_sequences[hexCode]) ||
                    (currentTable.mte_sequences && currentTable.mte_sequences[hexCode]) ||
                    (currentTable.mappings && currentTable.mappings[hexCode]) ||
                    (currentTable.mapping && (currentTable.mapping[byte] || currentTable.mapping[hexCode])) ||
                    '.';
            } else {
                char = byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.';
            }

            asciiText += char;
        }
    } else {
            if (insertCaretEnabled && !hexEndCaretPlaced && this.isInsertCaretActiveAt(byteOffset, 'hex')) {
                const endCaret = this.createInsertCaretSpan(byteOffset, 'hex');
                if (endCaret) {
                    bytesDiv.appendChild(endCaret);
                }
                hexEndCaretPlaced = true;
            }
            const emptySpan = document.createElement('span');
            emptySpan.className = 'hex-byte';
            emptySpan.style.visibility = 'hidden';
            bytesDiv.appendChild(emptySpan);
            asciiText += ' ';
    }
}

if (insertCaretEnabled && !hexEndCaretPlaced) {
    const lineEndCaretOffset = Math.min(offset + this.bytesPerLine, this.getDataLength());
    const endCaret = this.createInsertCaretSpan(lineEndCaretOffset, 'hex');
    if (endCaret) {
        bytesDiv.appendChild(endCaret);
    }
}

line.appendChild(bytesDiv);

const asciiDiv = document.createElement('div');
asciiDiv.className = 'hex-ascii';
asciiDiv.style.willChange = 'transform';
asciiDiv.dataset.visualCharCount = String(asciiText.length);
asciiDiv.dataset.visualScrollUnits = String(asciiText.length);
if (typeof this.registerTextColumnScrollUnits === 'function') {
    this.registerTextColumnScrollUnits(asciiText.length);
}
line.dataset.textVisualUnits = String(asciiText.length);

if (is16bit && active16BitDecoder) {
for (let i = 0; i < asciiText.length; i++) {
    const byteOffset = offset + (i * 2);

        if (byteOffset < this.getDataLength()) {
        if (insertCaretEnabled) {
            const beforeCaret = this.createInsertCaretSpan(byteOffset, 'ascii');
            if (beforeCaret) {
                asciiDiv.appendChild(beforeCaret);
            }
        }
        const charHighlight16 = this.getHighlightAt ? this.getHighlightAt(byteOffset) : null;
        const charSpan = document.createElement('span');
        charSpan.className = 'ascii-char ascii-16bit';
        charSpan.textContent = asciiText[i];
        charSpan.dataset.offset = byteOffset;
        const charValue = asciiText[i];
        
        // Determinar cor baseada no tipo de sequência (DTE/MTE/TAG/normal)
        let finalColor;
        const mappingInfo = ascii16BitMapping[i];
        if (this.colorConfig && this.colorConfig.textColors && mappingInfo) {
            if (mappingInfo.isTag) {
                finalColor = this.colorConfig.textColors.tags;
            } else if (mappingInfo.isDTE) {
                finalColor = this.colorConfig.textColors.dte || '#9C27B0';
            } else if (mappingInfo.isMTE) {
                finalColor = this.colorConfig.textColors.mte || '#E91E63';
            } else {
                finalColor = this.getTextColor(charValue);
            }
        } else {
            finalColor = this.colorConfig && this.colorConfig.textColors
                ? this.getTextColor(charValue)
                : (this.applyCharColorAdvanced ? this.applyCharColorAdvanced(charValue) : '#81c784');
        }
        
        charSpan.style.cssText = `
            width: 10px;
            text-align: center;
            cursor: pointer;
            padding: 0 0.5px;
            margin: 0 0.5px;
            border-radius: 2px;
            user-select: none;
            transition: all 0.1s ease;
            color: ${finalColor};
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-weight: 500;
            line-height: 1;
            min-height: 20px;
            vertical-align: middle;
            font-family: inherit;
            font-size: inherit;
        `;

        charSpan.addEventListener('click', () => {
            this.setCursor(byteOffset, 'ascii', false);
            if (charHighlight16) {
                this.selectedHighlight = charHighlight16;
                this.addHighlightSelectionClass(charHighlight16);
            }
        });
        charSpan.addEventListener('pointerdown', (e) => this.startSelection(byteOffset, 'ascii', e));
        charSpan.addEventListener('pointerover', (e) => this.updateSelection(byteOffset, 'ascii', e));
        charSpan.addEventListener('pointerup', (e) => this.stopSelection());

        if (!insertCaretEnabled && byteOffset === this.cursorPosition && this.activePanel === 'ascii') {
            charSpan.classList.add('selected');
        }

        if (this.selectionStart !== this.selectionEnd &&
            byteOffset >= Math.min(this.selectionStart, this.selectionEnd) &&
            byteOffset <= Math.max(this.selectionStart, this.selectionEnd)) {
            charSpan.classList.add('selected');
        }

        if (this.modifiedBytes.has(byteOffset) || this.modifiedBytes.has(byteOffset + 1)) {
            charSpan.classList.add('modified');
        }

        if (this.editingBytes && (this.editingBytes.has(byteOffset) || this.editingBytes.has(byteOffset + 1))) {
            charSpan.classList.add('editing');
        }

        const searchHighlight = this.getSearchHighlight(byteOffset);
        if (searchHighlight) {
            if (searchHighlight.current) {
                charSpan.classList.add('search-current');
            } else {
                charSpan.classList.add('search-highlight');
            }
        }

        if (charHighlight16) {
            charSpan.dataset.highlightId = charHighlight16.id;
            const isSelected = byteOffset >= Math.min(this.selectionStart, this.selectionEnd) &&
                byteOffset <= Math.max(this.selectionStart, this.selectionEnd) &&
                this.selectionStart !== this.selectionEnd;
            const isCursor = !insertCaretEnabled && byteOffset === this.cursorPosition;
            if (this.getHighlightColors && this.applyHighlightStyle) {
                const colors = this.getHighlightColors(charHighlight16);
                this.applyHighlightStyle(charSpan, colors);
            }
            if (this.activePanel === 'ascii') {
                if (isSelected) {
                    charSpan.style.background = 'linear-gradient(135deg, rgba(255, 107, 53, 0.6), rgba(247, 147, 30, 0.6))';
                    charSpan.style.color = 'white';
                }
                if (isCursor) {
                    charSpan.style.background = 'linear-gradient(135deg, #ff6b35, #f7931e)';
                    charSpan.style.color = 'white';
                    charSpan.style.boxShadow = '0 0 10px rgba(255, 107, 53, 1)';
                }
            }
            charSpan.addEventListener('dblclick', () => this.handleHighlightDoubleClick(charHighlight16.id, byteOffset, 'ascii'));
        }

        asciiDiv.appendChild(charSpan);
    }
}
if (insertCaretEnabled) {
    const endCaretOffset = Math.min(offset + (asciiText.length * 2), this.getDataLength());
    const endCaret = this.createInsertCaretSpan(endCaretOffset, 'ascii');
    if (endCaret) {
        asciiDiv.appendChild(endCaret);
    }
}
} else {
const charToOffsetMap = [];
const lineLength = Math.min(this.bytesPerLine, this.getDataLength() - offset);
const tagSequences = currentTable?.tag_sequences || {};
const hasTagSequences = Object.keys(tagSequences).length > 0;

if (isShiftJIS) {
    let i = 0;
    while (i < lineLength) {
        const pos = offset + i;
        const b1 = this.getByteAt(pos);
        const hex1 = b1.toString(16).toUpperCase().padStart(2, '0');

        if (hasTagSequences) {
            const maxSeqBytes = Math.min(4, lineLength - i);
            let matched = false;
            for (let len = maxSeqBytes; len >= 2; len--) {
                const hexSeq = Array.from({ length: len }, (_, idx) =>
                    this.getByteAt(pos + idx).toString(16).toUpperCase().padStart(2, '0')
                ).join('');
                if (tagSequences[hexSeq]) {
                    charToOffsetMap.push({
                        char: tagSequences[hexSeq],
                        offset: pos,
                        length: len,
                        isTag: true,
                        isDTE: false,
                        isMTE: false
                    });
                    i += len;
                    matched = true;
                    break;
                }
            }
            if (matched) continue;
        }

        if (tagSequences[hex1]) {
            charToOffsetMap.push({ char: tagSequences[hex1], offset: pos, length: 1, isTag: true, isDTE: false, isMTE: false });
            i += 1;
            continue;
        }
        if (currentTable?.dte_sequences?.[hex1]) {
            charToOffsetMap.push({ char: currentTable.dte_sequences[hex1], offset: pos, length: 1, isTag: false, isDTE: true, isMTE: false });
            i += 1;
            continue;
        }
        if (currentTable?.mte_sequences?.[hex1]) {
            charToOffsetMap.push({ char: currentTable.mte_sequences[hex1], offset: pos, length: 1, isTag: false, isDTE: false, isMTE: true });
            i += 1;
            continue;
        }

        if (b1 >= 0x20 && b1 <= 0x7E) {
            charToOffsetMap.push({ char: String.fromCharCode(b1), offset: pos, length: 1, isTag: false, isDTE: false, isMTE: false });
            i += 1;
            continue;
        }

        if (currentTable?.mappings?.[hex1]) {
            charToOffsetMap.push({ char: currentTable.mappings[hex1], offset: pos, length: 1, isTag: false, isDTE: false, isMTE: false });
            i += 1;
            continue;
        }

        if (i + 1 < lineLength) {
            const b2 = this.getByteAt(pos + 1);
            const validLead = this.isShiftJISLeadByte ? this.isShiftJISLeadByte(b1) : false;
            const validTrail = this.isShiftJISTrailByte ? this.isShiftJISTrailByte(b2) : false;
            if (validLead && validTrail) {
                const hex2 = hex1 + b2.toString(16).toUpperCase().padStart(2, '0');
                if (tagSequences[hex2]) {
                    charToOffsetMap.push({ char: tagSequences[hex2], offset: pos, length: 2, isTag: true, isDTE: false, isMTE: false });
                } else if (currentTable?.dte_sequences?.[hex2]) {
                    charToOffsetMap.push({ char: currentTable.dte_sequences[hex2], offset: pos, length: 2, isTag: false, isDTE: true, isMTE: false });
                } else if (currentTable?.mte_sequences?.[hex2]) {
                    charToOffsetMap.push({ char: currentTable.mte_sequences[hex2], offset: pos, length: 2, isTag: false, isDTE: false, isMTE: true });
                } else {
                    const mappedChar = currentTable?.mappings?.[hex2] || '.';
                    charToOffsetMap.push({ char: mappedChar, offset: pos, length: 2, isTag: false, isDTE: false, isMTE: false });
                }
                i += 2;
                continue;
            }
        }

        charToOffsetMap.push({ char: '.', offset: pos, length: 1, isTag: false, isDTE: false, isMTE: false });
        i += 1;
    }
} else {
    let i = 0;
    while (i < lineLength) {
        const byteOffset = offset + i;
        const byte = this.getByteAt(byteOffset);
        const hexCode = byte.toString(16).toUpperCase().padStart(2, '0');

        if (hasTagSequences) {
            const maxSeqBytes = Math.min(4, lineLength - i);
            let matched = false;
            for (let len = maxSeqBytes; len >= 2; len--) {
                const hexSeq = Array.from({ length: len }, (_, idx) =>
                    this.getByteAt(byteOffset + idx).toString(16).toUpperCase().padStart(2, '0')
                ).join('');
                if (tagSequences[hexSeq]) {
                    charToOffsetMap.push({
                        char: tagSequences[hexSeq],
                        offset: byteOffset,
                        length: len,
                        isTag: true,
                        isDTE: false,
                        isMTE: false
                    });
                    i += len;
                    matched = true;
                    break;
                }
            }
            if (matched) continue;
        }

        let char = '.';
        let isTag = false;
        let isDTE = false;
        let isMTE = false;

        if (tagSequences[hexCode]) {
            char = tagSequences[hexCode];
            isTag = true;
        } else if (currentTable?.dte_sequences?.[hexCode]) {
            char = currentTable.dte_sequences[hexCode];
            isDTE = true;
        } else if (currentTable?.mte_sequences?.[hexCode]) {
            char = currentTable.mte_sequences[hexCode];
            isMTE = true;
        } else if (currentTable?.mappings?.[hexCode]) {
            char = currentTable.mappings[hexCode];
            isTag = /^(\[.*\]|<.*>|\{.*\}|\(.*\))$/.test(char);
        } else if (currentTable?.mapping?.[byte]) {
            char = currentTable.mapping[byte];
            isTag = /^(\[.*\]|<.*>|\{.*\}|\(.*\))$/.test(char);
        } else if (currentTable?.mapping?.[hexCode]) {
            char = currentTable.mapping[hexCode];
            isTag = /^(\[.*\]|<.*>|\{.*\}|\(.*\))$/.test(char);
        } else {
            char = byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.';
        }

        charToOffsetMap.push({
            char,
            offset: byteOffset,
            length: 1,
            isTag,
            isDTE,
            isMTE
        });
        i += 1;
    }
}

let asciiEndCaretPlaced = false;
for (const charInfo of charToOffsetMap) {
    if (insertCaretEnabled) {
        const activeCaret = this.createInsertCaretSpan(charInfo.offset, 'ascii');
        if (activeCaret) {
            asciiDiv.appendChild(activeCaret);
        }
    }

    const asciiSpan = document.createElement('span');
    asciiSpan.className = 'ascii-char';
    asciiSpan.textContent = charInfo.char;
    asciiSpan.dataset.offset = charInfo.offset;
    asciiSpan.dataset.panel = 'ascii';
    asciiSpan.dataset.charLength = charInfo.char.length;
    asciiSpan.dataset.byteLength = charInfo.length;
    asciiSpan.dataset.charStartOffset = String(charInfo.offset);
    asciiSpan.dataset.charEndOffset = String(charInfo.offset + charInfo.length - 1);

    let customColor;
    if (charInfo.isTag && this.colorConfig?.textColors) {
        customColor = this.colorConfig.textColors.tags;
    } else if (charInfo.isDTE && this.colorConfig?.textColors) {
        customColor = this.colorConfig.textColors.dte || '#9C27B0';
    } else if (charInfo.isMTE && this.colorConfig?.textColors) {
        customColor = this.colorConfig.textColors.mte || '#E91E63';
    } else {
        customColor = this.getTextColor(charInfo.char);
    }
    const fallbackColor = this.applyCharColorAdvanced ? this.applyCharColorAdvanced(charInfo.char) : customColor;
    const finalColor = this.colorConfig?.textColors ? customColor : fallbackColor;

    asciiSpan.style.cssText = `
        width: ${Math.max(12, charInfo.char.length * 8)}px;
        text-align: center; cursor: pointer;
        padding: ${charInfo.length === 2 ? '0 0.5px' : '0 1px'}; border-radius: 2px; user-select: none;
        transition: all 0.1s ease;
        color: ${finalColor};
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-weight: 500;
        line-height: 1;
        min-height: 20px;
        vertical-align: middle;
        margin-right: ${charInfo.length === 2 ? '0.5px' : '1px'};
        font-family: inherit; font-size: inherit;
    `;

    let isSelected = false;
    let isCursor = false;
    if (this.activePanel === 'ascii') {
        isSelected = charInfo.offset >= Math.min(this.selectionStart, this.selectionEnd) &&
            charInfo.offset <= Math.max(this.selectionStart, this.selectionEnd) &&
            this.selectionStart !== this.selectionEnd;
        isCursor = !insertCaretEnabled && charInfo.offset === this.cursorPosition;

        if (isSelected) {
            asciiSpan.style.background = 'linear-gradient(135deg, rgba(255, 107, 53, 0.6), rgba(247, 147, 30, 0.6))';
            asciiSpan.style.color = 'white';
            asciiSpan.style.fontWeight = 'bold';
            asciiSpan.style.boxShadow = '0 0 8px rgba(255, 107, 53, 0.8)';
            asciiSpan.style.display = 'flex';
            asciiSpan.style.alignItems = 'center';
            asciiSpan.style.justifyContent = 'center';
        }

        if (isCursor) {
            asciiSpan.style.background = 'linear-gradient(135deg, #ff6b35, #f7931e)';
            asciiSpan.style.color = 'white';
            asciiSpan.style.fontWeight = 'bold';
            asciiSpan.style.boxShadow = '0 0 10px rgba(255, 107, 53, 1)';
            asciiSpan.style.border = '2px solid #ff6b35';
            asciiSpan.style.display = 'flex';
            asciiSpan.style.alignItems = 'center';
            asciiSpan.style.justifyContent = 'center';
        }
    }

    const isModified = charInfo.length === 2
        ? (this.modifiedBytes.has(charInfo.offset) || this.modifiedBytes.has(charInfo.offset + 1))
        : this.modifiedBytes.has(charInfo.offset);
    if (isModified && !isSelected && !isCursor) {
        asciiSpan.style.background = 'linear-gradient(135deg, rgba(255, 215, 0, 0.4), rgba(255, 193, 7, 0.4))';
        asciiSpan.style.color = '#ffd700';
        asciiSpan.style.fontWeight = 'bold';
        asciiSpan.style.boxShadow = '0 0 6px rgba(255, 215, 0, 0.6)';
        asciiSpan.style.animation = 'modifiedPulse 2s ease-in-out infinite';
    }

    const isAsciiEditing = this.editingBytes.has(charInfo.offset) || (charInfo.length === 2 && this.editingBytes.has(charInfo.offset + 1));
    if (isAsciiEditing) {
        asciiSpan.classList.add('editing');
    }

    asciiSpan.addEventListener('click', () => {
        this.setCursor(charInfo.offset, 'ascii', false);
        const highlight = this.getHighlightAt ? this.getHighlightAt(charInfo.offset) : null;
        if (highlight) {
            this.selectedHighlight = highlight;
            this.addHighlightSelectionClass(highlight);
        }
    });
    asciiSpan.addEventListener('pointerdown', (e) => this.startSelection(charInfo.offset, 'ascii', e));
    asciiSpan.addEventListener('pointerover', (e) => this.updateSelection(charInfo.offset, 'ascii', e));
    asciiSpan.addEventListener('pointerup', () => this.stopSelection());

    const searchHighlight = this.getSearchHighlight(charInfo.offset);
    if (searchHighlight) {
        asciiSpan.classList.add(searchHighlight.current ? 'search-current' : 'search-highlight');
    }

    const highlight = this.getHighlightAt ? this.getHighlightAt(charInfo.offset) : null;
    if (highlight) {
        const colors = this.getHighlightColors(highlight);
        asciiSpan.style.background = colors.background;
        asciiSpan.style.color = colors.text;
        asciiSpan.style.fontWeight = 'bold';
        asciiSpan.style.boxShadow = colors.shadow;
        asciiSpan.style.border = colors.border;
        asciiSpan.style.borderRadius = '3px';

        if (this.activePanel === 'ascii') {
            if (isSelected) {
                asciiSpan.style.background = 'linear-gradient(135deg, rgba(255, 107, 53, 0.6), rgba(247, 147, 30, 0.6))';
                asciiSpan.style.color = 'white';
                asciiSpan.style.fontWeight = 'bold';
                asciiSpan.style.boxShadow = `${colors.shadow}, 0 0 8px rgba(255, 107, 53, 0.8)`;
                asciiSpan.style.border = colors.border;
            }

            if (isCursor) {
                asciiSpan.style.background = 'linear-gradient(135deg, #ff6b35, #f7931e)';
                asciiSpan.style.color = 'white';
                asciiSpan.style.fontWeight = 'bold';
                asciiSpan.style.boxShadow = `${colors.shadow}, 0 0 10px rgba(255, 107, 53, 1)`;
                asciiSpan.style.border = colors.border;
            }
        }

        asciiSpan.dataset.highlightId = highlight.id;
        asciiSpan.addEventListener('dblclick', () => this.handleHighlightDoubleClick(highlight.id, charInfo.offset, 'ascii'));
    }

    asciiDiv.appendChild(asciiSpan);
}

if (insertCaretEnabled && !asciiEndCaretPlaced) {
    const lastChar = charToOffsetMap[charToOffsetMap.length - 1];
    const endOffset = lastChar
        ? Math.min(lastChar.offset + (lastChar.length || 1), this.getDataLength())
        : Math.min(offset, this.getDataLength());
    const activeCaret = this.createInsertCaretSpan(endOffset, 'ascii');
    if (activeCaret) {
        asciiDiv.appendChild(activeCaret);
        asciiEndCaretPlaced = true;
    }
}

}
const asciiViewport = document.createElement('div');
asciiViewport.className = 'hex-ascii-viewport';
asciiViewport.appendChild(asciiDiv);
line.appendChild(asciiViewport);

return line;
},

handleScroll() {
const container = document.getElementById('hex-content');
if (!container) return;

this.isUserScrolling = true;

clearTimeout(this.scrollTimeout);
this.scrollTimeout = setTimeout(() => {
    this.isUserScrolling = false;
}, 500);

if (this.getDataLength() > 10000) {
    clearTimeout(this.renderTimeout);
    this.renderTimeout = setTimeout(() => {
        this.completeRenderWithColors(this.currentScrollPercent, true);
    }, 50);
}
},

updateStatus() {
const pos = this.cursorPosition;
const isInsertBoundary = this.canUseInsertCursor() && pos >= this.getDataLength();
const byte = isInsertBoundary ? 0 : (this.getByteAt(pos) || 0);
let char = '.';

if (this.charTables && this.currentCharTable && this.charTables[this.currentCharTable]) {
    const currentTable = this.charTables[this.currentCharTable];

    const active16BitDecoder = (currentTable.type === '16-bit' || currentTable.type === 'UTF-16')
        ? this.getActive16BitDecoder()
        : null;

    const isShiftJIS = !!(currentTable && (((currentTable.type && currentTable.type.includes && (currentTable.type.includes('shift-jis') || currentTable.type.includes('shift_jis')))) || currentTable._isShiftJIS === true));

    if ((currentTable.type === '16-bit' || currentTable.type === 'UTF-16') && active16BitDecoder) {
        if (!isInsertBoundary && pos + 1 < this.getDataLength()) {
            const decoded = active16BitDecoder.decode(this.getRangeAt(pos, 2), 0, 1);
            char = decoded || '.';
        }
    } else if (!isInsertBoundary && isShiftJIS && typeof this.decodeBytesWithCurrentTable === 'function') {
        const maxLen = Math.min(2, Math.max(1, this.getDataLength() - pos));
        char = this.decodeBytesWithCurrentTable(Array.from(this.getRangeAt(pos, maxLen))) || '.';
    } else if (!isInsertBoundary) {
        const hexCode = byte.toString(16).toUpperCase().padStart(2, '0');
        char = (currentTable.tag_sequences && currentTable.tag_sequences[hexCode]) ||
            (currentTable.dte_sequences && currentTable.dte_sequences[hexCode]) ||
            (currentTable.mte_sequences && currentTable.mte_sequences[hexCode]) ||
            (currentTable.mappings && currentTable.mappings[hexCode]) ||
            (currentTable.mapping && (currentTable.mapping[byte] || currentTable.mapping[hexCode])) ||
            '.';
    }
} else {
    char = byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.';
}

const cursorPosEl = document.getElementById('cursor-position-input');
if (cursorPosEl && !cursorPosEl.matches(':focus')) {
cursorPosEl.value = this.formatOffset(pos, { includePrefix: false, useDisplayBase: true });
cursorPosEl.classList.remove('error');
}

const selectionSizeEl = document.getElementById('selection-size');
if (selectionSizeEl) {
    const selectionSize = (this.selectionStart === this.selectionEnd && this.canUseInsertCursor())
        ? 0
        : (Math.abs(this.selectionEnd - this.selectionStart) + 1);
    const bytesSuffix = (window.I18n && window.I18n.currentLang === 'en') ? 'bytes' : 'bytes';
    selectionSizeEl.textContent = `${selectionSize} ${bytesSuffix}`;
}

const currentValueEl = document.getElementById('current-value');
if (currentValueEl) {
    const selectionSize = (this.selectionStart === this.selectionEnd && this.canUseInsertCursor())
        ? 0
        : (Math.abs(this.selectionEnd - this.selectionStart) + 1);
    const hexSize = selectionSize.toString(16).toUpperCase().padStart(2, '0');
    currentValueEl.textContent = `0x${hexSize}`;
}

const charInfoEl = document.getElementById('char-info');
if (charInfoEl) {
    let charDisplay = char;

    if (isInsertBoundary) {
        charDisplay = 'EOF';
    } else if (char === '.') {
        if (byte === 0) {
            charDisplay = 'NULL';
        } else if (byte < 32) {
            charDisplay = `CTRL (${byte})`;
        } else if (byte > 126) {
            charDisplay = `EXT (${byte})`;
        }
    }

    charInfoEl.textContent = charDisplay;
}

const modStatusEl = document.getElementById('modification-status');
if (modStatusEl) {
    const modKey = this.hasUnsavedChanges ? 'status.modified' : 'status.not_modified';
    modStatusEl.textContent = window.I18n?.t ? window.I18n.t(modKey) : (this.hasUnsavedChanges ? 'Modificado' : 'Não modificado');
    modStatusEl.style.color = this.hasUnsavedChanges ? '#ff6b35' : '#a0a9c0';
}

const totalBookmarksEl = document.getElementById('total-bookmarks');
if (totalBookmarksEl) {
totalBookmarksEl.textContent = this.bookmarks.length.toString();
}

const currentTableEl = document.getElementById('current-table');
if (currentTableEl) {
    const tableName = this.currentCharTable || 'ASCII';
    currentTableEl.textContent = tableName.toUpperCase();
}

const activePanelEl = document.getElementById('active-panel-indicator');
if (activePanelEl) {
    if (this.getDataLength() === 0) {
        activePanelEl.classList.remove('visible');
    } else {
        activePanelEl.classList.add('visible');
        if (this.activePanel === 'hex') {
            activePanelEl.textContent = window.I18n?.t ? window.I18n.t('status.panel_hex') : 'HEX';
            activePanelEl.setAttribute('data-i18n', 'status.panel_hex');
            activePanelEl.classList.remove('panel-text');
            activePanelEl.classList.add('panel-hex');
        } else {
            const panelText = window.I18n?.t ? window.I18n.t('status.panel_text') : 'TEXTO';
            activePanelEl.textContent = panelText;
            activePanelEl.setAttribute('data-i18n', 'status.panel_text');
            activePanelEl.classList.remove('panel-hex');
            activePanelEl.classList.add('panel-text');
        }
    }
}
}
});
