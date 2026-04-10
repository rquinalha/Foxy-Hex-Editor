Object.assign(FoxyHexEditorComplete.prototype, {
searchText(text, caseSensitive = false, wholeWord = false) {
let searchBytes, dataToSearch;

if (this.charDecoder16) {
return this.searchText16bit(text, caseSensitive, wholeWord);
}

    const currentTable = this.charTables && this.currentCharTable ? this.charTables[this.currentCharTable] : null;
    const isShiftJIS = currentTable && ((currentTable.type === 'shift-jis' || currentTable.type === 'shift_jis') || currentTable._isShiftJIS === true);
    if (isShiftJIS) {
        return this.searchTextShiftJIS(text, caseSensitive, wholeWord);
    }

    const directByteSearchBytes = currentTable &&
        (currentTable.mappings || currentTable.mapping) &&
        (typeof this.getDirectByteCompatibleSearchBytes === 'function'
            ? this.getDirectByteCompatibleSearchBytes(text, caseSensitive, currentTable)
            : null);
    const useSimpleBytePath = !!directByteSearchBytes;
    const shouldUseSpecialCustomSearch = currentTable &&
        (currentTable.mappings || currentTable.mapping) &&
        !useSimpleBytePath;

    if (shouldUseSpecialCustomSearch) {
        return this.searchTextCustomTable(text, caseSensitive, wholeWord);
    }

if (useSimpleBytePath) {
searchBytes = directByteSearchBytes;
    dataToSearch = null;
} else if (caseSensitive) {
searchBytes = new TextEncoder().encode(text);
    dataToSearch = null;
} else {
searchBytes = new TextEncoder().encode(text.toLowerCase());
dataToSearch = null;
}

if (!searchBytes || searchBytes.length === 0) {
    return [];
}

return this.searchByteSequence(searchBytes, {
    type: 'text',
    wholeWord,
    asciiCaseInsensitive: !caseSensitive
});
},
});
