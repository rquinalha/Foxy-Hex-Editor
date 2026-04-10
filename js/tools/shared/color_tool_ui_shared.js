/**
 * Sincroniza o estado do hexEditor com a UI da janela de cores (mesma lógica de loadColorConfigToUI + previews).
 */
(function () {
    function rgbaToHex(rgba) {
        if (!rgba || rgba.startsWith('#')) return rgba || '#000000';
        const rgbaMatch = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (!rgbaMatch) return '#000000';
        const r = parseInt(rgbaMatch[1], 10);
        const g = parseInt(rgbaMatch[2], 10);
        const b = parseInt(rgbaMatch[3], 10);
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    function renderCustomHexList(container, customMap) {
        if (!container) return;
        container.innerHTML = '';
        Object.entries(customMap || {}).forEach(([hex, color]) => {
            const item = document.createElement('div');
            item.className = 'custom-hex-item';
            item.dataset.hex = hex;
            item.innerHTML = `
                <span class="hex-value">${hex}</span>
                <input type="color" value="${color}">
                <span class="color-preview" style="color: ${color}">${hex}</span>
                <button type="button" class="remove-btn">X</button>
            `;
            container.appendChild(item);
        });
    }

    window.populateColorCustomizationUI = function populateColorCustomizationUI(root, state) {
        if (!root || !state || !state.colorConfig) return;
        const cfg = state.colorConfig;
        const currentHighlightColor = state.currentHighlightColor || 'default';
        const fontSettings = cfg.fontSettings || {
            family: 'jetbrains-mono',
            size: 15
        };

        const offsetColor = root.getElementById('offset-color');
        if (offsetColor) offsetColor.value = cfg.offsetColor || '#ffd700';

        const hexNullsColor = root.getElementById('hex-nulls-color');
        if (hexNullsColor) hexNullsColor.value = cfg.hexColors.nulls;

        const hexNumbersColor = root.getElementById('hex-numbers-color');
        if (hexNumbersColor) hexNumbersColor.value = cfg.hexColors.numbers;

        const hexLettersColor = root.getElementById('hex-letters-color');
        if (hexLettersColor) hexLettersColor.value = cfg.hexColors.letters;

        const hexSpecialColor = root.getElementById('hex-special-color');
        if (hexSpecialColor) hexSpecialColor.value = cfg.hexColors.special;

        const textNumbersColor = root.getElementById('text-numbers-color');
        if (textNumbersColor) textNumbersColor.value = cfg.textColors.numbers;

        const textLettersColor = root.getElementById('text-letters-color');
        if (textLettersColor) textLettersColor.value = cfg.textColors.letters;

        const textPunctuationColor = root.getElementById('text-punctuation-color');
        if (textPunctuationColor) textPunctuationColor.value = cfg.textColors.punctuation;

        const textSpacesColor = root.getElementById('text-spaces-color');
        if (textSpacesColor) textSpacesColor.value = cfg.textColors.spaces;

        const textTagsColor = root.getElementById('text-tags-color');
        if (textTagsColor) textTagsColor.value = cfg.textColors.tags;

        if (cfg.backgroundColors) {
            const bg = cfg.backgroundColors;
            if (root.getElementById('bg-hex-content-color')) {
                root.getElementById('bg-hex-content-color').value = rgbaToHex(bg.hexContent);
            }
            if (root.getElementById('bg-hex-line-color')) {
                root.getElementById('bg-hex-line-color').value = rgbaToHex(bg.hexLine);
            }
            if (root.getElementById('bg-hex-line-hover-color')) {
                root.getElementById('bg-hex-line-hover-color').value = rgbaToHex(bg.hexLineHover);
            }
            if (root.getElementById('bg-ascii-content-color')) {
                root.getElementById('bg-ascii-content-color').value = rgbaToHex(bg.asciiContent);
            }
            if (root.getElementById('bg-ascii-line-color')) {
                root.getElementById('bg-ascii-line-color').value = rgbaToHex(bg.asciiLine);
            }
            if (root.getElementById('bg-ascii-line-hover-color')) {
                root.getElementById('bg-ascii-line-hover-color').value = rgbaToHex(bg.asciiLineHover);
            }
        }

        renderCustomHexList(root.getElementById('custom-hex-list'), cfg.hexColors.custom);

        const hexNullsPreview = root.getElementById('hex-nulls-preview');
        if (hexNullsPreview) hexNullsPreview.style.color = cfg.hexColors.nulls;

        const hexNumbersPreview = root.getElementById('hex-numbers-preview');
        if (hexNumbersPreview) hexNumbersPreview.style.color = cfg.hexColors.numbers;

        const hexLettersPreview = root.getElementById('hex-letters-preview');
        if (hexLettersPreview) hexLettersPreview.style.color = cfg.hexColors.letters;

        const hexSpecialPreview = root.getElementById('hex-special-preview');
        if (hexSpecialPreview) hexSpecialPreview.style.color = cfg.hexColors.special;

        const textNumbersPreview = root.getElementById('text-numbers-preview');
        if (textNumbersPreview) textNumbersPreview.style.color = cfg.textColors.numbers;

        const textLettersPreview = root.getElementById('text-letters-preview');
        if (textLettersPreview) textLettersPreview.style.color = cfg.textColors.letters;

        const textPunctuationPreview = root.getElementById('text-punctuation-preview');
        if (textPunctuationPreview) textPunctuationPreview.style.color = cfg.textColors.punctuation;

        const textSpacesPreview = root.getElementById('text-spaces-preview');
        if (textSpacesPreview) textSpacesPreview.style.color = cfg.textColors.spaces;

        const textTagsPreview = root.getElementById('text-tags-preview');
        if (textTagsPreview) textTagsPreview.style.color = cfg.textColors.tags;

        const fontFamilySelect = root.getElementById('editor-font-family');
        if (fontFamilySelect) fontFamilySelect.value = fontSettings.family || 'jetbrains-mono';

        const fontSizeInput = root.getElementById('editor-font-size');
        if (fontSizeInput) fontSizeInput.value = fontSettings.size || 15;

        const fontSizeDisplay = root.getElementById('font-size-display');
        if (fontSizeDisplay) fontSizeDisplay.textContent = `${fontSettings.size || 15}px`;

        const fontPreviewSample = root.getElementById('font-preview-sample');
        if (fontPreviewSample) {
            const previewFonts = {
                'jetbrains-mono': '"JetBrains Mono Local", "JetBrains Mono", monospace',
                'source-code-pro': '"Source Code Pro Local", "Source Code Pro", monospace',
                'roboto-mono': '"Roboto Mono Local", "Roboto Mono", monospace',
                'system-mono': 'Consolas, "Cascadia Mono", "Courier New", monospace'
            };
            fontPreviewSample.style.fontFamily = previewFonts[fontSettings.family] || previewFonts['jetbrains-mono'];
            fontPreviewSample.style.fontSize = `${fontSettings.size || 15}px`;
            fontPreviewSample.style.lineHeight = `${Math.max(18, (fontSettings.size || 15) + 4)}px`;
        }

        if (cfg.backgroundColors) {
            const bg = cfg.backgroundColors;
            if (root.getElementById('bg-hex-content-preview')) {
                root.getElementById('bg-hex-content-preview').style.background = bg.hexContent;
            }
            if (root.getElementById('bg-hex-line-preview')) {
                root.getElementById('bg-hex-line-preview').style.background = bg.hexLine;
            }
            if (root.getElementById('bg-hex-line-hover-preview')) {
                root.getElementById('bg-hex-line-hover-preview').style.background = bg.hexLineHover;
            }
            if (root.getElementById('bg-ascii-content-preview')) {
                root.getElementById('bg-ascii-content-preview').style.background = bg.asciiContent;
            }
            if (root.getElementById('bg-ascii-line-preview')) {
                root.getElementById('bg-ascii-line-preview').style.background = bg.asciiLine;
            }
            if (root.getElementById('bg-ascii-line-hover-preview')) {
                root.getElementById('bg-ascii-line-hover-preview').style.background = bg.asciiLineHover;
            }
        }

        root.querySelectorAll('.color-option').forEach((option) => {
            option.classList.remove('selected');
        });
        const currentOption = root.querySelector(`[data-color="${currentHighlightColor}"]`);
        if (currentOption) currentOption.classList.add('selected');
    };
})();
