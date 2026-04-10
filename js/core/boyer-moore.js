Object.assign(FoxyHexEditorComplete.prototype, {

boyerMooreBadCharShift(pattern, caseInsensitive = false) {
    const table = new Int32Array(256);
    const m = pattern.length;
    for (let i = 0; i < 256; i++) table[i] = m;
    for (let i = 0; i < m - 1; i++) {
        const charCode = pattern[i];
        const shiftValue = m - 1 - i;
        table[charCode] = shiftValue;
        if (caseInsensitive) {
            if (charCode >= 65 && charCode <= 90) { // A-Z
                table[charCode + 32] = shiftValue; // a-z
            } else if (charCode >= 97 && charCode <= 122) { // a-z
                table[charCode - 32] = shiftValue; // A-Z
            }
        }
    }
    return table;
},

boyerMooreSearch(buffer, pattern, badCharTable, start = 0, end = -1) {
    const n = end < 0 ? buffer.length : end;
    const m = pattern.length;
    if (m === 0 || n - start < m) return [];

    const results = [];
    let i = start;
    const limit = n - m;

    while (i <= limit) {
        let j = m - 1;
        while (j >= 0 && pattern[j] === buffer[i + j]) j--;
        if (j < 0) {
            results.push(i);
            i++;
        } else {
            i += Math.max(1, badCharTable[buffer[i + j]] - (m - 1 - j));
        }
    }
    return results;
},

boyerMooreSearchCaseInsensitive(buffer, pattern, badCharTable, start = 0, end = -1) {
    const n = end < 0 ? buffer.length : end;
    const m = pattern.length;
    if (m === 0 || n - start < m) return [];

    const results = [];
    let i = start;
    const limit = n - m;

    while (i <= limit) {
        let j = m - 1;
        while (j >= 0) {
            let db = buffer[i + j];
            let pb = pattern[j];
            if (db >= 65 && db <= 90) db += 32;
            if (pb >= 65 && pb <= 90) pb += 32;
            if (db !== pb) break;
            j--;
        }
        if (j < 0) {
            results.push(i);
            i++;
        } else {
            // Note: Since badCharTable is already populated with both cases, we can use buffer[i+j] directly
            i += Math.max(1, badCharTable[buffer[i + j]] - (m - 1 - j));
        }
    }
    return results;
},

boyerMooreSearchWithWholeWord(buffer, pattern, badCharTable, caseSensitive, start = 0, end = -1) {
    const n = end < 0 ? buffer.length : end;
    const m = pattern.length;
    if (m === 0 || n - start < m) return [];

    const results = [];
    let i = start;
    const limit = n - m;

    // Word character definition: a-z, A-Z, 0-9 (matches isalnum)
    const isWordChar = (b) => (b >= 48 && b <= 57) || (b >= 65 && b <= 90) || (b >= 97 && b <= 122);

    while (i <= limit) {
        let j = m - 1;
        let match = true;
        while (j >= 0) {
            let db = buffer[i + j];
            let pb = pattern[j];
            if (!caseSensitive) {
                if (db >= 65 && db <= 90) db += 32;
                if (pb >= 65 && pb <= 90) pb += 32;
            }
            if (db !== pb) { match = false; break; }
            j--;
        }
        if (match) {
            const beforeWord = i > 0 && isWordChar(buffer[i - 1]);
            const afterWord = i + m < n && isWordChar(buffer[i + m]);
            if (!beforeWord && !afterWord) {
                results.push(i);
            }
            i++;
        } else {
            i += Math.max(1, badCharTable[buffer[i + j]] - (m - 1 - j));
        }
    }
    return results;
},

});
