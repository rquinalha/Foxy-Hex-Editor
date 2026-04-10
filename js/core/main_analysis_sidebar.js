Object.assign(FoxyHexEditorComplete.prototype, {
updateAnalysisDisplay() {
    this.updateROMInfoDisplay();
    this.updateDataSectionsDisplay(this.gameAnalysis.sections || []);
    this.updateTextStrings(this.gameAnalysis.textStrings || []);
    this.updatePatternAnalysis(this.gameAnalysis.patterns || []);
    this.updateEntropyAnalysis(this.gameAnalysis.entropy || 0);

    const entropyEl = document.getElementById('entropy-value');
    if (entropyEl) {
        entropyEl.textContent = this.gameAnalysis.entropy ? this.gameAnalysis.entropy.toFixed(2) : '0.0';
    }
},

analysisT(key, fallback, params = null) {
    if (window.I18n?.t) {
        return window.I18n.t(key, params || undefined);
    }
    return fallback;
},

updateDataSections(sections) {
    return this.updateDataSectionsDisplay(sections);
},

updateROMInfoDisplay() {
    const romTypeEl = document.getElementById('rom-type');
    const romSizeEl = document.getElementById('rom-size');
    const romFormatEl = document.getElementById('rom-format');

    const format = this.gameAnalysis.format || this.analysisT('tool.analysis.unknown', 'Unknown');
    const size = this.formatFileSize(this.getDataLength());

    if (romTypeEl) romTypeEl.textContent = format;
    if (romSizeEl) romSizeEl.textContent = size;
    if (romFormatEl) romFormatEl.textContent = format;
},

updateDataSectionsDisplay(sections) {
    const container = document.getElementById('data-sections');
    if (!container) return;

    if (!sections || sections.length === 0) {
        sections = this.generateBasicSections();
    }

    if (sections.length === 0) {
        container.innerHTML = `<div style="color: #666; font-style: italic;">${this.analysisT('sidebar.no_sections_detected', 'No sections detected')}</div>`;
        return;
    }

    const sizeLabel = this.analysisT('sidebar.size_label', 'Size');

    container.innerHTML = sections.map(section => `
        <div class="bookmark-item" onclick="hexEditor.goToOffset(${section.offset})"
             style="cursor: pointer; transition: all 0.2s ease;"
             onmouseover="this.style.background='rgba(255, 107, 53, 0.15)'"
             onmouseout="this.style.background='rgba(255, 255, 255, 0.05)'">

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <div style="color: #4fc3f7; font-weight: bold; display: flex; align-items: center; gap: 8px; font-size: 13px;">
                    ${this.getSectionIcon(section.type)} ${section.name}
                </div>
                <div style="color: #ffd700; font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: bold;">
                    0x${section.offset.toString(16).toUpperCase().padStart(8, '0')}
                </div>
            </div>

            <div style="color: #a0a9c0; font-size: 11px; margin-bottom: 6px; line-height: 1.4;">
                ${section.description || `${this.analysisT('sidebar.section', 'Section')} ${section.type}`}
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="color: #81c784; font-size: 10px; font-weight: 500;">
                    ${sizeLabel}: ${this.formatFileSize(section.size || 0)}
                </div>
                <div style="color: #ff6b35; font-size: 10px; font-weight: 500;">
                    ${this.getSectionTypeLabel(section.type)}
                </div>
            </div>
        </div>
    `).join('');
},

generateBasicSections() {
    const fileSize = this.getDataLength();
    const sections = [];

    if (fileSize === 0) return sections;

    if (fileSize < 1024) {
        sections.push({
            offset: 0,
            name: this.analysisT('sidebar.full_file', 'Full File'),
            size: fileSize,
            type: 'data',
            description: `${this.analysisT('sidebar.full_file_desc', 'Complete small file')} (${this.formatFileSize(fileSize)})`
        });
    } else if (fileSize < 64 * 1024) {
        const headerSize = Math.min(512, Math.floor(fileSize * 0.1));

        sections.push({
            offset: 0,
            name: this.analysisT('sidebar.header', 'Header'),
            size: headerSize,
            type: 'header',
            description: this.analysisT('sidebar.header_desc', 'Possible header or initial metadata')
        });

        if (fileSize > headerSize + 256) {
            sections.push({
                offset: headerSize,
                name: this.analysisT('sidebar.main_data', 'Main Data'),
                size: fileSize - headerSize,
                type: 'data',
                description: this.analysisT('sidebar.main_data_desc', 'Main file content')
            });
        }
    } else {
        const headerSize = Math.min(2048, Math.floor(fileSize * 0.05));
        const footerSize = Math.min(1024, Math.floor(fileSize * 0.02));

        sections.push({
            offset: 0,
            name: this.analysisT('sidebar.main_header', 'Main Header'),
            size: headerSize,
            type: 'header',
            description: `${this.analysisT('sidebar.main_header_desc', 'File header')} (${(headerSize / fileSize * 100).toFixed(1)}%)`
        });

        const mainDataSize = fileSize - headerSize - footerSize;
        if (mainDataSize > 0) {
            sections.push({
                offset: headerSize,
                name: this.analysisT('sidebar.data_body', 'Data Body'),
                size: mainDataSize,
                type: 'data',
                description: `${this.analysisT('sidebar.data_body_desc', 'Main content')} (${(mainDataSize / fileSize * 100).toFixed(1)}%)`
            });
        }

        if (footerSize > 0 && fileSize > headerSize + footerSize) {
            sections.push({
                offset: fileSize - footerSize,
                name: this.analysisT('sidebar.file_end', 'File End'),
                size: footerSize,
                type: 'footer',
                description: this.analysisT('sidebar.file_end_desc', 'Possible footer or trailing metadata')
            });
        }

        if (this.gameAnalysis.textStrings && this.gameAnalysis.textStrings.length > 10) {
            const firstString = this.gameAnalysis.textStrings[0];
            const lastString = this.gameAnalysis.textStrings[this.gameAnalysis.textStrings.length - 1];
            const stringsSectionSize = (lastString.offset + lastString.length) - firstString.offset;

            if (stringsSectionSize > 1024) {
                sections.push({
                    offset: firstString.offset,
                    name: this.analysisT('sidebar.string_section', 'String Section'),
                    size: stringsSectionSize,
                    type: 'strings',
                    description: this.analysisT('sidebar.string_section_desc', 'Area with {count} text strings', { count: this.gameAnalysis.textStrings.length })
                });
            }
        }
    }

    return sections.sort((a, b) => a.offset - b.offset);
},

getSectionIcon(type) {
    const icons = {
        header: '📋',
        data: '💾',
        code: '⚙️',
        graphics: '🎨',
        audio: '🔊',
        strings: '📝',
        footer: '📄',
        unknown: '📦'
    };
    return icons[type] || icons.unknown;
},

getSectionTypeLabel(type) {
    const labels = {
        header: this.analysisT('sidebar.type_header', 'HEADER'),
        data: this.analysisT('sidebar.type_data', 'DATA'),
        code: this.analysisT('sidebar.type_code', 'CODE'),
        graphics: this.analysisT('sidebar.type_graphics', 'GRAPHICS'),
        audio: this.analysisT('sidebar.type_audio', 'AUDIO'),
        strings: this.analysisT('sidebar.type_strings', 'TEXT'),
        footer: this.analysisT('sidebar.type_footer', 'FOOTER'),
        unknown: this.analysisT('sidebar.type_unknown', 'UNKNOWN')
    };
    return labels[type] || labels.unknown;
},

updateTextStrings(strings) {
    const container = document.getElementById('text-strings');
    if (!container) return;

    if (strings.length === 0) {
        container.innerHTML = `<div style="color: #666; font-style: italic;">${this.analysisT('sidebar.no_text_strings_found', 'No text strings found')}</div>`;
        return;
    }

    container.innerHTML = strings.slice(0, 25).map(str => {
        const typeLabel = str.type === '16bit'
            ? ' (16-bit)'
            : str.type === 'custom-table'
                ? ' (table)'
                : '';
        const sizeInfo = ` (${str.length} bytes)`;
        return `
<div class="bookmark-item" onclick="hexEditor.goToOffset(${str.offset})">
    <div class="bookmark-offset">0x${str.offset.toString(16).toUpperCase().padStart(8, '0')}${typeLabel}</div>
    <div class="bookmark-comment">"${str.text}"${sizeInfo}</div>
</div>
`;
    }).join('');

    if (strings.length > 25) {
        const moreDiv = document.createElement('div');
        moreDiv.style.cssText = 'color: #666; font-style: italic; text-align: center; padding: 8px;';
        moreDiv.textContent = this.analysisT('sidebar.more_strings', '... and {count} more strings', { count: strings.length - 25 });
        container.appendChild(moreDiv);
    }
}

});
