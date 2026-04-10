const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..', '..');

class FoxyHexEditorComplete {
    constructor(data = []) {
        this.data = data instanceof Uint8Array ? data : new Uint8Array(data);
        this.searchResults = [];
        this.currentSearchIndex = -1;
        this.currentCharTable = 'ascii';
        this.charDecoder16 = null;
        this.charTables = {
            ascii: {
                name: 'ASCII',
                type: '8-bit',
                mapping: {},
                mappings: {},
                tag_sequences: {},
                dte_sequences: {},
                mte_sequences: {}
            }
        };
        this.editMode = 'view';
        this.insertMode = false;
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 100;
        this.hasUnsavedChanges = false;
        this.searchResultsSet = new Set();
    }

    getDataLength() {
        return this.data.length;
    }

    getByteAt(offset) {
        return this.data[offset];
    }

    getRangeAt(offset, length) {
        return this.data.slice(offset, offset + length);
    }

    emit(name, payload) {
        this.lastEvent = { name, payload };
    }

    getActive16BitDecoder() {
        return this.charDecoder16;
    }

    processFoxyTable(tableData) {
        const table = {};
        Object.entries(tableData?.mappings || {}).forEach(([hex, value]) => {
            if (/^[0-9A-F]{2}$/i.test(hex)) {
                table[parseInt(hex, 16)] = value;
            }
        });
        return table;
    }

    normalizeByteArray(bytes) {
        return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
    }

    replaceSelectionWithBytes(start, end, bytes) {
        const payload = this.normalizeByteArray(bytes);
        const before = this.data.slice(0, start);
        const after = this.data.slice(end);
        const next = new Uint8Array(before.length + payload.length + after.length);
        next.set(before, 0);
        next.set(payload, before.length);
        next.set(after, before.length + payload.length);
        this.data = next;
        return true;
    }

    showSearchProgressModal() {}
    updateSearchProgress() {}
    hideSearchProgressModal() {}
    render() {}
    updateSearchResults() {
        this.searchResultsSet = new Set();
        for (const result of this.searchResults || []) {
            for (let index = 0; index < result.length; index++) {
                this.searchResultsSet.add(result.offset + index);
            }
        }
    }
    goToSearchResult(index) {
        this.currentSearchIndex = index;
    }
    clearSearch() {
        this.searchResults = [];
        this.currentSearchIndex = -1;
        this.updateSearchResults();
    }
    syncSearchWindow() {}
    updateModeUI() {}
}

const context = vm.createContext({
    FoxyHexEditorComplete,
    console,
    require,
    Buffer,
    TextEncoder,
    Uint8Array,
    Int32Array,
    Array,
    Map,
    Object,
    String,
    Number,
    Math,
    RegExp,
    Set,
    window: {
        notificationSystem: {
            error() {},
            warning() {},
            info() {},
            success() {}
        }
    },
    document: {
        getElementById() {
            return null;
        }
    }
});
context.globalThis = context;

[
    'js/core/boyer-moore.js',
    'js/core/main_table_codec.js',
    'js/core/main_search_basic.js',
    'js/core/main_search_table_codecs.js',
    'js/core/main_search_table_searches.js',
    'js/core/main_search_algorithms.js',
    'js/core/main_search.js',
    'js/core/main_find_replace.js'
].forEach((relativePath) => {
    const absolutePath = path.join(repoRoot, relativePath);
    const source = fs.readFileSync(absolutePath, 'utf8');
    vm.runInContext(source, context, { filename: absolutePath });
});

function createEditor(bytes) {
    return new context.FoxyHexEditorComplete(new Uint8Array(bytes));
}

function createLargeData(totalSize, fillerByte = 0x20) {
    return new Uint8Array(totalSize).fill(fillerByte);
}

function writeBytes(target, offset, bytes) {
    target.set(bytes, offset);
    return offset;
}

function toHex(byte) {
    return byte.toString(16).toUpperCase().padStart(2, '0');
}

function resetSearch(editor) {
    editor.searchResults = [];
    editor.currentSearchIndex = -1;
}

function assertOffsets(results, expectedOffsets, label) {
    assert.deepStrictEqual(
        results.map((result) => result.offset),
        expectedOffsets,
        label
    );
}

function assertBytes(editor, expectedBytes, label) {
    assert.deepStrictEqual(Array.from(editor.data), expectedBytes, label);
}

function createAsciiCustomTable() {
    const mappings = {
        '81': 'w',
        '82': 'h',
        '83': 'a',
        '84': 't'
    };
    return {
        name: 'Custom ASCII Search',
        type: '8-bit',
        mapping: Object.fromEntries(Object.entries(mappings).map(([hex, value]) => [parseInt(hex, 16), value])),
        mappings,
        tag_sequences: {},
        dte_sequences: {},
        mte_sequences: {}
    };
}

function createStandardAsciiTable() {
    const mappings = {};
    for (let byte = 0x20; byte <= 0x7E; byte++) {
        mappings[byte.toString(16).toUpperCase()] = String.fromCharCode(byte);
    }
    return {
        name: 'Imported ASCII',
        type: '8-bit',
        mapping: Object.fromEntries(Object.entries(mappings).map(([hex, value]) => [parseInt(hex, 16), value])),
        mappings,
        tag_sequences: {},
        dte_sequences: {},
        mte_sequences: {}
    };
}

function createPeLikeCaseTable() {
    return {
        name: 'PE-like Case Table',
        type: '8-bit',
        mapping: {
            0x26: 'W',
            0x17: 'H',
            0x10: 'A',
            0x23: 'T',
            0x46: 'w',
            0x37: 'h',
            0x30: 'a',
            0x43: 't',
            0xEF: ' '
        },
        mappings: {
            '26': 'W',
            '17': 'H',
            '10': 'A',
            '23': 'T',
            '46': 'w',
            '37': 'h',
            '30': 'a',
            '43': 't',
            'EF': ' '
        },
        tag_sequences: {},
        dte_sequences: {},
        mte_sequences: {}
    };
}

function createDteTable() {
    return {
        name: 'Custom DTE Search',
        type: '8-bit DTE',
        mapping: {},
        mappings: {
            '80': 'th',
            '81': 'e',
            '82': 're'
        },
        tag_sequences: {},
        dte_sequences: {
            '80': 'th',
            '82': 're'
        },
        mte_sequences: {}
    };
}

function createShiftJisTable() {
    return {
        name: 'Custom Shift-JIS Search',
        type: 'shift-jis',
        mapping: {},
        mappings: {
            '8140': 'あ',
            '8141': 'い'
        },
        tag_sequences: {},
        dte_sequences: {},
        mte_sequences: {},
        _isShiftJIS: true
    };
}

function create16BitDecoder() {
    const mapping = {
        '4100': 'A',
        '4200': 'B',
        '2000': ' ',
        '5800': 'X'
    };

    return {
        mapping,
        decode(bytes, start = 0, count = 1) {
            const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
            let result = '';
            for (let index = 0; index < count; index++) {
                const offset = start + (index * 2);
                if (offset + 1 >= source.length) break;
                const hex = toHex(source[offset]) + toHex(source[offset + 1]);
                result += mapping[hex] || '.';
            }
            return result;
        }
    };
}

async function testCustomAsciiSearch() {
    const editor = createEditor([
        0x58,
        0x81, 0x82, 0x83, 0x84,
        0x20,
        0x81, 0x82, 0x83, 0x84,
        0x58,
        0x20,
        0x81, 0x82, 0x83, 0x84
    ]);
    editor.charTables.custom = createAsciiCustomTable();
    editor.currentCharTable = 'custom';

    resetSearch(editor);
    assertOffsets(editor.searchText('what', true, false), [1, 6, 12], 'custom text search should find all encoded matches');

    resetSearch(editor);
    assertOffsets(await editor.chunkedTextSearch('what', true, false), [1, 6, 12], 'chunked custom text search should find all encoded matches');

    resetSearch(editor);
    assertOffsets(editor.searchText('what', true, true), [12], 'whole-word custom search should ignore partial word matches');

    const mixedCaseEditor = createEditor([
        0x20,
        0x57, 0x68, 0x61, 0x74,
        0x20,
        0x57, 0x48, 0x41, 0x54,
        0x20,
        0x77, 0x68, 0x61, 0x74,
        0x20
    ]);
    mixedCaseEditor.charTables.custom = createStandardAsciiTable();
    mixedCaseEditor.currentCharTable = 'custom';

    resetSearch(mixedCaseEditor);
    assertOffsets(
        mixedCaseEditor.searchText('What', false, true),
        [1, 6, 11],
        'case-insensitive whole-word search with imported ASCII table should match mixed case words'
    );

    resetSearch(mixedCaseEditor);
    assertOffsets(
        await mixedCaseEditor.chunkedTextSearch('What', false, true),
        [1, 6, 11],
        'chunked case-insensitive whole-word search with imported ASCII table should match mixed case words'
    );

    const peLikeEditor = createEditor([
        0xEF,
        0x46, 0x37, 0x30, 0x43,
        0xEF,
        0x26, 0x17, 0x10, 0x23,
        0xEF
    ]);
    peLikeEditor.charTables.custom = createPeLikeCaseTable();
    peLikeEditor.currentCharTable = 'custom';

    const peLikeBytes = Array.from(peLikeEditor.textToCustomTableBytes('what', false) || []);
    assert.deepStrictEqual(
        peLikeBytes,
        [0x46, 0x37, 0x30, 0x43],
        'case-insensitive encoding should prefer the exact case typed by the user for custom tables'
    );

    resetSearch(editor);
    assertOffsets(editor.searchRegex('wh.t', 'g'), [1, 6, 12], 'regex should search decoded custom-table text');
}

async function testCustomAsciiReplace() {
    const editor = createEditor([
        0x81, 0x82, 0x83, 0x84,
        0x20,
        0x81, 0x82, 0x83, 0x84
    ]);
    editor.charTables.custom = createAsciiCustomTable();
    editor.currentCharTable = 'custom';

    await editor.performReplace({
        findValue: 'what',
        replaceValue: 'thaw',
        caseSensitive: true,
        replaceAll: false
    });
    assertBytes(editor, [
        0x84, 0x82, 0x83, 0x81,
        0x20,
        0x81, 0x82, 0x83, 0x84
    ], 'single replace should write bytes encoded with the active custom table');

    resetSearch(editor);
    assertOffsets(editor.searchText('thaw', true, false), [0], 'replaced custom text should be searchable with the active table');

    resetSearch(editor);
    await editor.performReplace({
        findValue: 'what',
        replaceValue: 'thaw',
        caseSensitive: true,
        replaceAll: true
    });
    assertBytes(editor, [
        0x84, 0x82, 0x83, 0x81,
        0x20,
        0x84, 0x82, 0x83, 0x81
    ], 'replace all should encode every replacement with the active custom table');
}

function testDteSearch() {
    const editor = createEditor([
        0x80, 0x81, 0x82,
        0x20,
        0x80, 0x81, 0x82,
        0x58
    ]);
    editor.charTables.custom = createDteTable();
    editor.currentCharTable = 'custom';

    resetSearch(editor);
    assertOffsets(editor.searchText('there', true, false), [0, 4], 'DTE search should encode multi-character mappings');

    resetSearch(editor);
    assertOffsets(editor.searchText('there', true, true), [0], 'whole-word DTE search should use decoded text boundaries');

    resetSearch(editor);
    assertOffsets(editor.searchRegex('there', 'g'), [0, 4], 'regex should map DTE decoded matches back to byte offsets');
}

async function testDteReplace() {
    const editor = createEditor([
        0x80, 0x81, 0x82,
        0x20,
        0x80, 0x81, 0x82
    ]);
    editor.charTables.custom = createDteTable();
    editor.currentCharTable = 'custom';

    await editor.performReplace({
        findValue: 'there',
        replaceValue: 'the',
        caseSensitive: true,
        replaceAll: true
    });
    assertBytes(editor, [
        0x80, 0x81,
        0x20,
        0x80, 0x81
    ], 'DTE replace should honor multi-character table encoding when writing bytes');

    resetSearch(editor);
    assertOffsets(editor.searchText('the', true, true), [0, 3], 'replaced DTE text should remain searchable through the table');
}

function testShiftJisSearch() {
    const editor = createEditor([
        0x81, 0x40, 0x81, 0x41,
        0x20,
        0x81, 0x40, 0x81, 0x41,
        0x58
    ]);
    editor.charTables.custom = createShiftJisTable();
    editor.currentCharTable = 'custom';

    resetSearch(editor);
    assertOffsets(editor.searchText('あい', true, false), [0, 5], 'Shift-JIS search should respect the active table');

    resetSearch(editor);
    assertOffsets(editor.searchText('あい', true, true), [0], 'whole-word Shift-JIS search should use decoded boundaries');

    resetSearch(editor);
    assertOffsets(editor.searchRegex('あい', 'g'), [0, 5], 'regex should work on decoded Shift-JIS text');
}

async function testShiftJisReplace() {
    const editor = createEditor([
        0x81, 0x40, 0x81, 0x41,
        0x20,
        0x81, 0x40, 0x81, 0x41
    ]);
    editor.charTables.custom = createShiftJisTable();
    editor.currentCharTable = 'custom';

    await editor.performReplace({
        findValue: 'あい',
        replaceValue: 'いあ',
        caseSensitive: true,
        replaceAll: false
    });
    assertBytes(editor, [
        0x81, 0x41, 0x81, 0x40,
        0x20,
        0x81, 0x40, 0x81, 0x41
    ], 'single replace should write bytes encoded with the active Shift-JIS table');

    resetSearch(editor);
    assertOffsets(editor.searchText('いあ', true, false), [0], 'replaced Shift-JIS text should be searchable with the active table');

    resetSearch(editor);
    await editor.performReplace({
        findValue: 'あい',
        replaceValue: 'いあ',
        caseSensitive: true,
        replaceAll: true
    });
    assertBytes(editor, [
        0x81, 0x41, 0x81, 0x40,
        0x20,
        0x81, 0x41, 0x81, 0x40
    ], 'replace all should encode every Shift-JIS replacement with the active table');
}

function test16BitSearch() {
    const editor = createEditor([
        0x41, 0x00, 0x42, 0x00,
        0x20, 0x00,
        0x41, 0x00, 0x42, 0x00,
        0x58, 0x00
    ]);
    editor.charDecoder16 = create16BitDecoder();
    editor.charTables.custom16 = {
        name: 'Custom 16-bit Search',
        type: '16-bit',
        mapping: {},
        mappings: editor.charDecoder16.mapping,
        tag_sequences: {},
        dte_sequences: {},
        mte_sequences: {}
    };
    editor.currentCharTable = 'custom16';

    resetSearch(editor);
    assertOffsets(editor.searchText('AB', true, false), [0, 6], '16-bit search should use the active decoder');

    resetSearch(editor);
    assertOffsets(editor.searchText('AB', true, true), [0], 'whole-word 16-bit search should use decoded boundaries');

    resetSearch(editor);
    assertOffsets(editor.searchRegex('AB', 'g'), [0, 6], 'regex should work on decoded 16-bit text');
}

async function test16BitReplace() {
    const editor = createEditor([
        0x41, 0x00, 0x58, 0x00,
        0x20, 0x00,
        0x41, 0x00, 0x58, 0x00
    ]);
    editor.charDecoder16 = create16BitDecoder();
    editor.charTables.custom16 = {
        name: 'Custom 16-bit Search',
        type: '16-bit',
        mapping: {},
        mappings: editor.charDecoder16.mapping,
        tag_sequences: {},
        dte_sequences: {},
        mte_sequences: {}
    };
    editor.currentCharTable = 'custom16';

    await editor.performReplace({
        findValue: 'AX',
        replaceValue: 'BX',
        caseSensitive: true,
        replaceAll: false
    });
    assertBytes(editor, [
        0x42, 0x00, 0x58, 0x00,
        0x20, 0x00,
        0x41, 0x00, 0x58, 0x00
    ], 'single replace should write bytes encoded with the active 16-bit table');

    resetSearch(editor);
    assertOffsets(editor.searchText('BX', true, false), [0], 'replaced 16-bit text should be searchable with the active decoder');

    resetSearch(editor);
    await editor.performReplace({
        findValue: 'AX',
        replaceValue: 'BX',
        caseSensitive: true,
        replaceAll: true
    });
    assertBytes(editor, [
        0x42, 0x00, 0x58, 0x00,
        0x20, 0x00,
        0x42, 0x00, 0x58, 0x00
    ], 'replace all should encode every 16-bit replacement with the active decoder');
}

async function testLargeDteChunkedSearch() {
    const data = createLargeData(12 * 1024 * 1024, 0x20);
    const offsets = [
        1024,
        5 * 1024 * 1024 + 123,
        10 * 1024 * 1024 + 321
    ];
    offsets.forEach((offset) => writeBytes(data, offset, [0x80, 0x81, 0x82]));

    const editor = createEditor(data);
    editor.charTables.custom = createDteTable();
    editor.currentCharTable = 'custom';

    resetSearch(editor);
    assertOffsets(
        await editor.chunkedTextSearch('there', true, true),
        offsets,
        'large chunked DTE whole-word search should find sparse matches without missing chunk boundaries'
    );
}

async function testLarge16BitChunkedSearch() {
    const data = createLargeData(12 * 1024 * 1024, 0x20);
    const offsets = [
        4096,
        4 * 1024 * 1024 + 512,
        8 * 1024 * 1024 + 1024
    ].map((offset) => offset % 2 === 0 ? offset : offset + 1);
    offsets.forEach((offset) => {
        writeBytes(data, offset - 2, [0x20, 0x00]);
        writeBytes(data, offset, [0x41, 0x00, 0x42, 0x00]);
        writeBytes(data, offset + 4, [0x20, 0x00]);
    });

    const editor = createEditor(data);
    editor.charDecoder16 = create16BitDecoder();
    editor.charTables.custom16 = {
        name: 'Custom 16-bit Search',
        type: '16-bit',
        mapping: {},
        mappings: editor.charDecoder16.mapping,
        tag_sequences: {},
        dte_sequences: {},
        mte_sequences: {}
    };
    editor.currentCharTable = 'custom16';

    resetSearch(editor);
    assertOffsets(
        await editor.chunkedTextSearch('AB', true, true),
        offsets,
        'large chunked 16-bit whole-word search should find sparse matches'
    );
}

async function main() {
    await testCustomAsciiSearch();
    await testCustomAsciiReplace();
    testDteSearch();
    await testDteReplace();
    testShiftJisSearch();
    await testShiftJisReplace();
    test16BitSearch();
    await test16BitReplace();
    await testLargeDteChunkedSearch();
    await testLarge16BitChunkedSearch();
    console.log('Search regression suite passed.');
}

main().catch((error) => {
    console.error('Search regression suite failed.');
    console.error(error && error.stack ? error.stack : error);
    process.exit(1);
});
