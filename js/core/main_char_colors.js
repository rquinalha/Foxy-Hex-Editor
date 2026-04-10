Object.assign(FoxyHexEditorComplete.prototype, {
applyCharColor(charSpan, character) {
if (!this.useCharColors) {
    charSpan.style.color = '#81c784';
    return;
}

if (character === '<' || character === '>' || character === '[' || character === ']') {
    charSpan.style.color = '#FFFFFF';
    return;
}

if (character.includes('<') || character.includes('>') || character.includes('[') || character.includes(']')) {
    charSpan.style.color = '#FFFFFF';
    return;
}

if (this.isLetter(character)) {
    charSpan.style.color = '#4CAF50';
} else if (character >= '0' && character <= '9') {
    charSpan.style.color = '#2196F3';
} else if (this.isSymbol(character)) {
    charSpan.style.color = '#FFD700';
} else {
    charSpan.style.color = '#FFFFFF';
}
},

isLetter(character) {
if ((character >= 'A' && character <= 'Z') || (character >= 'a' && character <= 'z')) {
    return true;
}

const accentedLetters = [
    'á', 'à', 'â', 'ã', 'ä', 'å', 'ā', 'ă', 'ą', 'ǎ', 'ǟ', 'ǡ', 'ǻ', 'ȁ', 'ȃ', 'ȧ', 'ḁ', 'ḃ', 'ḅ', 'ḇ',
    'é', 'è', 'ê', 'ë', 'ē', 'ĕ', 'ė', 'ę', 'ě', 'ȅ', 'ȇ', 'ȩ', 'ḗ', 'ḙ', 'ḛ', 'ḝ', 'ḟ',
    'í', 'ì', 'î', 'ï', 'ĩ', 'ī', 'ĭ', 'į', 'ǐ', 'ȉ', 'ȋ', 'ḭ', 'ḯ',
    'ó', 'ò', 'ô', 'õ', 'ö', 'ō', 'ŏ', 'ő', 'ǒ', 'ǫ', 'ǭ', 'ǿ', 'ȍ', 'ȏ', 'ȫ', 'ȭ', 'ȯ', 'ȱ', 'ṍ', 'Ṏ', 'ṑ', 'ṓ',
    'ú', 'ù', 'û', 'ü', 'ũ', 'ū', 'ŭ', 'ů', 'ű', 'ų', 'ǔ', 'ǖ', 'ǘ', 'ǚ', 'ǜ', 'ȕ', 'ȗ', 'ṳ', 'ṵ', 'ṷ', 'ṹ', 'ṻ',
    'ý', 'ÿ', 'ŷ', 'ȳ', 'ỳ', 'ỵ', 'ỷ', 'ỹ',
    'ñ', 'ń', 'ņ', 'ň', 'ṅ', 'ṇ', 'ṉ', 'ṋ',
    'ç', 'ć', 'ĉ', 'ċ', 'č', 'ḉ',
    'Á', 'À', 'Â', 'Ã', 'Ä', 'Å', 'Ā', 'Ă', 'Ą', 'Ǎ', 'Ǟ', 'Ǡ', 'Ǻ', 'Ȁ', 'Ȃ', 'Ȧ', 'Ḁ', 'Ḃ', 'Ḅ', 'Ḇ',
    'É', 'È', 'Ê', 'Ë', 'Ē', 'Ĕ', 'Ė', 'Ę', 'Ě', 'Ȅ', 'Ȇ', 'Ȩ', 'Ḗ', 'Ḙ', 'Ḛ', 'Ḝ', 'Ḟ',
    'Í', 'Ì', 'Î', 'Ï', 'Ĩ', 'Ī', 'Ĭ', 'Į', 'Ǐ', 'Ȉ', 'Ȋ', 'Ḭ', 'Ḯ',
    'Ó', 'Ò', 'Ô', 'Õ', 'Ö', 'Ō', 'Ŏ', 'Ő', 'Ǒ', 'Ǫ', 'Ǭ', 'Ǿ', 'Ȍ', 'Ȏ', 'Ȫ', 'Ȭ', 'Ȯ', 'Ȱ', 'Ṍ', 'Ṏ', 'Ṑ', 'Ṓ',
    'Ú', 'Ù', 'Û', 'Ü', 'Ũ', 'Ū', 'Ŭ', 'Ů', 'Ű', 'Ų', 'Ǔ', 'Ǖ', 'Ǘ', 'Ǚ', 'Ǜ', 'Ȕ', 'Ȗ', 'Ṳ', 'Ṵ', 'Ṷ', 'Ṹ', 'Ṻ',
    'Ý', 'Ÿ', 'Ŷ', 'Ȳ', 'Ỳ', 'Ỵ', 'Ỷ', 'Ỹ',
    'Ñ', 'Ń', 'Ņ', 'Ň', 'Ṅ', 'Ṇ', 'Ṉ', 'Ṋ',
    'Ç', 'Ć', 'Ĉ', 'Ċ', 'Č', 'Ḉ'
];

return accentedLetters.includes(character);
},

isSymbol(character) {
const symbols = [
    '!', '"', '#', '$', '%', '&', "'", '(', ')', '*', '+', ',', '-', '.', '/',
    ':', ';', '<', '=', '>', '?', '@',
    '[', '\\', ']', '^', '_', '`',
    '{', '|', '}', '~',
    '¡', '¢', '£', '¤', '¥', '¦', '§', '¨', '©', 'ª', '«', '¬', '®', '¯',
    '°', '±', '²', '³', '´', 'µ', '¶', '·', '¸', '¹', 'º', '»', '¼', '½', '¾', '¿',
    '×', '÷', '‰', '†', '‡', '•', '‣', '․', '‥', '…', '‧', '‿', '⁀', '⁁', '⁂', '⁃', '⁄', '⁅', '⁆', '⁇', '⁈', '⁉', '⁊', '⁋', '⁌', '⁍', '⁎', '⁏', '⁐', '⁑', '⁒', '⁓', '⁔', '⁕', '⁖', '⁗', '⁘', '⁙', '⁚', '⁛', '⁜', '⁝', '⁞'
];

if (character === '<' || character === '>' || character === '[' || character === ']') {
    return true;
}

return symbols.includes(character);
},

toggleCharColors() {
this.useCharColors = !this.useCharColors;
this.updateColorToggle();
this.completeRenderWithColors(this.currentScrollPercent, true);
this.emit('colorToggle', this.useCharColors);
},

updateColorToggle() {
const toggle = document.getElementById('color-toggle');
if (toggle) {
    if (this.useCharColors) {
        toggle.classList.add('active');
        toggle.innerHTML = '<span class="color-toggle-icon">🎨</span>Cores Ativas';
    } else {
        toggle.classList.remove('active');
        toggle.innerHTML = '<span class="color-toggle-icon">⚪</span>Cores Desativadas';
    }
}
}
});
