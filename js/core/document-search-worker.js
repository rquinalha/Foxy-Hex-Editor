const vm = require('node:vm');
const { createRequire } = require('node:module');
const { parentPort, workerData } = require('node:worker_threads');

const localRequire = createRequire(workerData.editorPath);
const byteSourceModule = { exports: {} };
vm.compileFunction(workerData.byteSource, ['require', 'module'])(localRequire, byteSourceModule);
const { openByteSource } = byteSourceModule.exports;

let iconvLite;
try { iconvLite = localRequire('iconv-lite'); } catch (_) {}
const context = vm.createContext({
    require: localRequire, Buffer, TextEncoder, TextDecoder, Uint8Array, iconvLite,
    window: { notificationSystem: { error(message) { throw new Error(message); } } },
    isShiftJisPair(first, second) {
        return ((first >= 0x81 && first <= 0x9f) || (first >= 0xe0 && first <= 0xfc)) &&
            second >= 0x40 && second <= 0xfc && second !== 0x7f;
    }
});
vm.runInContext('class FoxyHexEditorComplete {}', context);
for (const [filename, source] of workerData.scripts) vm.runInContext(source, context, { filename });
const Editor = vm.runInContext('FoxyHexEditorComplete', context);
const Decoder = vm.runInContext('CharDecoder16bit', context);
const createTableTextReader = vm.runInContext('createTableTextReader', context);
const limitReached = Symbol('limit');

function scanBytes(editor, data, pattern, options, from, until) {
    const { type, wholeWord, decodedWholeWord, asciiCaseInsensitive } = options;
    if (pattern.length === 0) return;
    const buffer = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    const needle = Buffer.from(pattern);
    const last = pattern.length - 1;
    const stop = Math.min(until, data.length - last);
    const lower = value => value >= 65 && value <= 90 ? value + 32 : value;
    const isWord = byte => (byte >= 48 && byte <= 57) || (lower(byte) >= 97 && lower(byte) <= 122);
    const anchor = lower(pattern[last]);
    const alternate = anchor >= 97 && anchor <= 122 ? anchor - 32 : anchor;
    let nextAnchor = -1;
    let nextAlternate = -1;
    const findByte = (byte, previous, first) => {
        if (previous >= first) return previous;
        const found = buffer.indexOf(byte, first);
        return found < 0 ? data.length : found;
    };

    for (let offset = from; offset < stop;) {
        if (asciiCaseInsensitive) {
            const first = offset + last;
            nextAnchor = findByte(anchor, nextAnchor, first);
            if (anchor !== alternate) nextAlternate = findByte(alternate, nextAlternate, first);
            offset = (anchor === alternate ? nextAnchor : Math.min(nextAnchor, nextAlternate)) - last;
            if (offset >= stop) return;
            let index = 0;
            while (index < last && lower(data[offset + index]) === lower(pattern[index])) index++;
            if (index < last) { offset++; continue; }
        } else {
            offset = buffer.indexOf(needle, offset);
            if (offset < 0 || offset >= stop) return;
        }
        const result = { offset, length: pattern.length, type };
        const boundary = !wholeWord || (decodedWholeWord ? editor.isWholeWordResultLocal(result) :
            !isWord(data[offset - 1]) && !isWord(data[offset + pattern.length]));
        if (boundary) editor.searchResults.push(result);
        offset++;
    }
}

async function searchDocument(document, options, limit) {
    const { mode, term, sensitive, wholeWord } = options;
    const { size, tableId, table } = document;
    // JavaScript regex needs the entire decoded input for anchors and unbounded matches.
    if (mode === 'regex' && size > (tableId === 'ascii' ? 32 * 1024 * 1024 : 512 * 1024)) {
        return { results: [], skipped: true };
    }

    let data;
    const editor = Object.assign(new Editor(), {
        currentCharTable: tableId,
        charTables: { [tableId]: table },
        charDecoder16: table?.type === 'UTF-16' || table?.type?.includes('16-bit') ? new Decoder(table) : null,
        getActive16BitDecoder() { return this.charDecoder16; },
        getDataLength: () => data.length,
        getByteAt: offset => data[offset],
        getRangeAt: (offset, length) => data.subarray(offset, offset + length),
        emit() {}
    });
    const tableReader = mode === 'text' && (editor.charDecoder16 || editor.isCurrentTableShiftJIS())
        ? createTableTextReader(table, !!editor.charDecoder16) : null;
    const results = [];
    let start = 0;
    let from = 0;
    let until = size;
    editor.searchResults = [];
    editor.searchResults.push = result => {
        const offset = start + result.offset;
        if (offset < from || offset >= until) return;
        if (results.length === limit) throw limitReached;
        let previewStart = Math.max(0, result.offset - 16);
        if (editor.charDecoder16) previewStart -= previewStart % 2;
        let preview = '';
        if (tableReader) {
            for (let cursor = result.offset; cursor < Math.min(data.length, result.offset + 48);) {
                const token = tableReader.read(data, cursor);
                preview += token.text;
                cursor += token.length;
            }
        } else {
            preview = editor.decodeBytesWithCurrentTable(data.subarray(previewStart, previewStart + 48));
        }
        results.push({ offset, length: result.length, type: result.type, preview: preview?.replace(/\s+/g, ' ').trim() });
    };

    let byteSearch;
    if (mode === 'hex') {
        byteSearch = [Uint8Array.from(Buffer.from(term.replace(/\s+/g, ''), 'hex')), { type: 'hex', wholeWord }];
    } else if (mode === 'text' && !tableReader) {
        const scan = editor.searchByteSequence;
        editor.searchByteSequence = (...args) => { byteSearch = args; return []; };
        if (tableId === 'ascii') {
            byteSearch = [new TextEncoder().encode(sensitive ? term : term.toLowerCase()), {
                type: 'text', asciiCaseInsensitive: !sensitive, wholeWord
            }];
        } else {
            editor.searchText(term, sensitive, wholeWord);
        }
        editor.searchByteSequence = scan;
        if (!byteSearch) return { results };
    }

    const source = document.path ? await openByteSource(document.path, document.snapshot) : null;
    const read = (offset, length) => source ? source.read(offset, length) : document.data.subarray(offset, offset + length);
    let truncated = false;
    try {
        if (mode === 'regex') {
            data = await read(0, size);
            const flags = sensitive ? 'g' : 'gi';
            if (tableId === 'ascii') {
                const printable = Buffer.allocUnsafe(data.length);
                for (let index = 0; index < data.length; index++) {
                    const byte = data[index];
                    printable[index] = byte >= 32 && byte <= 126 ? byte : 46;
                }
                for (const match of printable.toString('latin1').matchAll(new RegExp(term, flags))) {
                    if (match[0].length) editor.searchResults.push({ offset: match.index, length: match[0].length, type: 'regex' });
                }
            } else {
                const regex = new RegExp(term, flags);
                const { text, map } = editor.buildSearchableTextMap();
                for (const match of text.matchAll(regex)) {
                    if (!match[0].length) continue;
                    const first = map[match.index];
                    const last = map[match.index + match[0].length - 1];
                    editor.searchResults.push({ offset: first.offset, length: last.offset + last.length - first.offset, type: 'regex' });
                }
            }
        } else {
            const blockSize = 2 * 1024 * 1024;
            const boundary = Math.max(48, wholeWord ? editor.getWholeWordDecodeWindow() : 0);
            const contextLength = boundary + boundary % 2;
            const overlap = (byteSearch?.[0].length ?? term.length * tableReader.maxByteLength) + contextLength;
            const query = sensitive ? term : term.toLowerCase();
            let nextToken = 0;
            let afterWordCharacter = false;
            let lastProgress = 0;
            for (from = 0; from < size; from += blockSize) {
                until = Math.min(size, from + blockSize);
                start = Math.max(0, from - contextLength);
                data = await read(start, Math.min(size, until + overlap) - start);
                if (byteSearch) scanBytes(editor, data, ...byteSearch, from - start, until - start);
                else {
                    // Keep the token boundary across I/O blocks, including a Shift-JIS lead byte at the end of a block.
                    while (nextToken < until) {
                        const local = nextToken - start;
                        const token = tableReader.read(data, local);
                        nextToken += token.length;
                        if (token.searchable && !afterWordCharacter) {
                            let part = sensitive ? token.text : token.folded;
                            if (query.startsWith(part)) {
                                let matched = part.length;
                                let cursor = local + token.length;
                                while (matched < query.length && cursor < data.length) {
                                    const next = tableReader.read(data, cursor);
                                    part = sensitive ? next.text : next.folded;
                                    if (!next.searchable || !query.startsWith(part, matched)) break;
                                    matched += part.length;
                                    cursor += next.length;
                                }
                                if (matched === query.length && (!wholeWord || cursor >= data.length ||
                                    !editor.isDecodedWordChar(tableReader.read(data, cursor).text[0]))) {
                                    editor.searchResults.push({ offset: local, length: cursor - local,
                                        type: editor.charDecoder16 ? 'text_16bit' : 'text_shiftjis' });
                                }
                            }
                        }
                        afterWordCharacter = wholeWord && editor.isDecodedWordChar(token.text.at(-1));
                    }
                }
                const now = Date.now();
                if (until === size || now - lastProgress >= 250) {
                    lastProgress = now;
                    parentPort.postMessage({ progress: until });
                }
            }
        }
    } catch (error) {
        if (error !== limitReached) throw error;
        truncated = true;
    } finally {
        try { await source?.verify(); }
        finally { await source?.close(); }
    }
    return { results, truncated };
}

parentPort.on('message', async ({ document, options, limit }) => {
    try {
        const outcome = await searchDocument(document, options, limit);
        parentPort.postMessage({ outcome });
    } catch (error) {
        parentPort.postMessage({ error: error.message });
    }
});
