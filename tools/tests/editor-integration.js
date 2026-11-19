const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = process.env.FOXY_TEST_APP_ROOT || path.resolve(__dirname, '..', '..');
const MiB = 1024 * 1024;

async function exerciseEditor(fixtures) {
    const assert = require('node:assert/strict');
    const fs = require('node:fs');
    const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
    for (let retry = 0; retry < 50 && !window.intelligentSave; retry++) await pause(100);
    const editor = window.hexEditor;
    const tabs = window.fileTabManager;
    const save = window.intelligentSave;
    const files = window.electronFileHandler;
    const open = async (item) => {
        await tabs.openFiles([item]);
        return tabs.activeSessionId;
    };
    const matches = () => editor.searchResults.map(result => result.offset);
    const search = (findValue, params = {}) => editor.performSearch({ findValue, mode: 'text', ...params });
    const waitTab = async (expected) => {
        for (let retry = 0; retry < 50 && (tabs.activeSessionId !== expected || tabs.isSwitchingSession); retry++) await pause(20);
        assert.equal(tabs.activeSessionId, expected);
    };

    const first = await open(fixtures.a);
    const second = await open(fixtures.b);
    await open(fixtures.a);
    assert.equal(tabs.activeSessionId, first);
    assert.equal(Buffer.from(editor.getData()).toString(), 'foxy first');
    const pendingImport = { selection: { start: 0, length: 1, sessionId: first, revision: editor.documentRevision || 0 },
        data: new Uint8Array([88]), insertionMode: false };
    await tabs.activateSession(second);
    assert.throws(() => editor.applySelectionImport(pendingImport), /A aba ou os dados mudaram/);
    assert.equal(Buffer.from(editor.getData()).toString(), 'foxy second');
    await tabs.activateSession(first);
    assert.throws(() => editor.applySelectionImport({ ...pendingImport,
        data: new Uint8Array(1024 * 1024 + 1), insertionMode: true }), /1 MiB/);
    assert.equal(await search('foxy', { searchAllTabs: true }), true, editor.searchNotice);
    assert.deepEqual(editor.searchResults.map(result => result.sessionId), [first, second]);
    editor.goToSearchResult(1);
    await waitTab(second);
    assert.equal(editor.searchResults.length, 2);
    await tabs.activateSession(first);
    await pause(320);

    const dialogResults = [fixtures.copy, fixtures.overlay, fixtures.empty, fixtures.failedCopy];
    files.showSaveDialog = async () => ({ filePath: dialogResults.shift(), canceled: false });
    const atomicWrite = files.writeAtomicDocument.bind(files);
    let writeStarted;
    let releaseWrite;
    const started = new Promise(resolve => { writeStarted = resolve; });
    const holdWrite = new Promise(resolve => { releaseWrite = resolve; });
    files.writeAtomicDocument = async (...args) => { writeStarted(); await holdWrite; return atomicWrite(...args); };
    const firstSave = save.saveAs();
    await started;
    assert.equal(editor.setByteAt(0, 0), false);
    assert.equal(await tabs.activateSession(second), true);
    editor.editMode = 'edit';
    assert.equal(editor.editByte(10, 68), true);
    assert.equal(await tabs.activateSession(first), undefined);
    assert.equal(await save.saveAs(), false);
    releaseWrite();
    assert.equal(await firstSave, true);
    files.writeAtomicDocument = atomicWrite;
    assert.equal(fs.readFileSync(fixtures.copy, 'utf8'), 'foxy first');
    assert.equal(tabs.getSessionById(first).fileName, 'copy.bin');
    assert.equal(tabs.getSessionById(second).fileName, 'b.bin');
    assert.equal(tabs.activeSessionId, second);
    assert.equal(Buffer.from(editor.getData()).toString(), 'foxy seconD');
    assert.equal(editor.hasUnsavedChanges, true);
    await assert.rejects(atomicWrite(fixtures.copy, async handle => {
        await handle.writeFile('incompleto');
        throw new Error('falha simulada');
    }), /falha simulada/);
    assert.equal(fs.readFileSync(fixtures.copy, 'utf8'), 'foxy first');

    const start = performance.now();
    const virtual = await open(fixtures.virtual);
    assert.ok(editor.isVirtualModeReady());
    const virtualOpenMs = Math.round(performance.now() - start);
    const handler = editor.getVirtualNavigationHandler();
    const cacheBytes = () => [...handler.chunkCache.values()].reduce((bytes, chunk) => bytes + chunk.data.byteLength, 0);
    const initialCacheBytes = cacheBytes();
    assert.ok(initialCacheBytes <= 512 * 1024);
    const boundary = 2 * 1024 * 1024 - 2;
    assert.equal(await search('foxy', { wholeWord: true }), true, editor.searchNotice);
    assert.deepEqual(matches(), [0, boundary]);
    assert.equal(await search('46 6f 58 59', { mode: 'hex' }), true, editor.searchNotice);
    assert.deepEqual(matches(), [boundary]);
    assert.equal(await search('foxy....', { mode: 'regex' }), true, editor.searchNotice);
    assert.match(editor.searchNotice, /32 MiB/);

    editor.editMode = 'edit';
    editor.editByte(0, 98);
    assert.equal(await search('foxy'), true, editor.searchNotice);
    assert.deepEqual(matches(), [boundary]);
    editor.undo();
    assert.equal(editor.getByteAt(0), 102);
    editor.redo();
    assert.equal(editor.getByteAt(0), 98);
    const writeVirtual = files.writeVirtualDocument.bind(files);
    let virtualStarted;
    let releaseVirtual;
    const virtualWriting = new Promise(resolve => { virtualStarted = resolve; });
    const holdVirtual = new Promise(resolve => { releaseVirtual = resolve; });
    files.writeVirtualDocument = async (...args) => { virtualStarted(); await holdVirtual; return writeVirtual(...args); };
    const overlaySave = save.saveAs();
    await virtualWriting;
    assert.equal(await tabs.activateSession(second), true);
    releaseVirtual();
    assert.equal(await overlaySave, true);
    files.writeVirtualDocument = writeVirtual;
    assert.equal(tabs.activeSessionId, second);
    assert.equal(await tabs.activateSession(virtual), true);
    assert.equal(fs.readFileSync(fixtures.virtual.path, { encoding: 'utf8' }).slice(0, 4), 'foxy');
    assert.equal(Buffer.from(await editor.getRangeAtAsync(0, 4)).toString(), 'boxy');

    const keep = 11 * 1024 * 1024;
    assert.equal(editor.deleteRangeAt(keep, fixtures.virtual.size), true);
    await tabs.activateSession(second);
    assert.equal(await tabs.activateSession(virtual), true);
    assert.equal(editor.getDataLength(), keep);
    assert.equal(await search('boxy....', { mode: 'regex' }), true, editor.searchNotice);
    assert.deepEqual(matches(), [0]);
    assert.equal(editor.deleteRangeAt(1, keep), true);
    await tabs.activateSession(second);
    assert.equal(await tabs.activateSession(virtual), true);
    assert.equal(editor.getDataLength(), 1);
    assert.equal(editor.getByteAt(0), 98);
    assert.equal(editor.deleteRangeAt(0, 1), true);
    assert.equal(await save.saveAs(), true);
    assert.equal(fs.statSync(fixtures.empty).size, 0);
    await tabs.activateSession(second);
    assert.equal(await tabs.activateSession(virtual), true);
    assert.equal(editor.getDataLength(), 0);

    await open(fixtures.giant);
    const giantOffset = fixtures.giant.size - 64;
    assert.equal(Buffer.from(await editor.getRangeAtAsync(giantOffset, 10)).toString(), 'find-giant');
    const canceled = search('absent');
    editor.cancelDocumentSearch();
    assert.equal(await canceled, false);
    const searchStart = performance.now();
    let ticks = 0;
    const interval = setInterval(() => ticks++, 20);
    try {
        assert.equal(await search('find-giant', { searchAllTabs: true }), true, editor.searchNotice);
        assert.deepEqual(matches(), [giantOffset]);
    } finally {
        clearInterval(interval);
    }
    const giantSearchMs = Math.round(performance.now() - searchStart);
    assert.ok(ticks > 0, 'a busca não deve bloquear a janela');
    await pause(350);
    assert.equal(editor.cursorPosition, giantOffset);
    editor.editMode = 'edit';
    assert.equal(editor.editByte(giantOffset, 70), true);
    assert.equal(await save.save(), true);
    const source = fs.openSync(fixtures.giant.path, 'r');
    try {
        const byte = Buffer.alloc(1);
        fs.readSync(source, byte, 0, 1, giantOffset);
        assert.equal(byte[0], 70);
    } finally {
        fs.closeSync(source);
    }
    const copyStart = giantOffset - 4;
    const snapshot = editor.createDataSnapshot();
    await files.exportDocumentRange(fixtures.range, fixtures.giant.path, snapshot, copyStart, 14);
    assert.equal(fs.readFileSync(fixtures.range).subarray(4).toString(), 'Find-giant');
    assert.equal(editor.getVirtualNavigationHandler().chunkCache.size <= 256, true);

    await open(fixtures.truncated);
    fs.truncateSync(fixtures.truncated.path, 1);
    assert.equal(await save.saveAs(), false);
    assert.equal(fs.existsSync(fixtures.failedCopy), false);

    await open(fixtures.external);
    editor.editMode = 'edit';
    assert.equal(editor.editByte(0, 88), true);
    fs.writeFileSync(fixtures.external.path, 'ABCY');
    assert.equal(await save.save(), false);
    assert.equal(fs.readFileSync(fixtures.external.path, 'utf8'), 'ABCY');
    assert.equal(editor.hasUnsavedChanges, true);

    await open(fixtures.overlap);
    await editor.performReplace({ findValue: 'AA', replaceValue: 'B', mode: 'text', replaceAll: true });
    assert.equal(Buffer.from(editor.getData()).toString(), 'BB');
    const currentImport = { selection: { start: 0, length: 1, sessionId: tabs.activeSessionId,
        revision: editor.documentRevision || 0 }, data: new Uint8Array([0]), insertionMode: false };
    assert.equal(editor.applySelectionImport(currentImport), 1);
    assert.equal(editor.getByteAt(0), 0);
    editor.markSavedState();
    editor.editMode = 'edit';
    editor.insertMode = false;
    editor.setCursor(0, 'hex', false);
    editor.nibblePosition = 0;
    editor.handleHexEdit('a');
    editor.handleHexEdit('0');
    assert.equal(editor.getByteAt(0), 0xa0);
    assert.equal(editor.hasUnsavedChanges, true);
    editor.addBookmarkAt(0, '<b>texto</b>', '<i>comentário</i>');
    assert.equal(document.querySelector('.bookmark-title').textContent, '<b>texto</b>');
    assert.equal(document.querySelector('.bookmark-comment').textContent, '<i>comentário</i>');
    assert.equal(document.querySelector('.bookmark-title b'), null);

    await open(fixtures.zero);
    editor.editMode = 'edit';
    assert.equal(editor.overwriteBytesAt(fixtures.zero.size - 1, new Uint8Array([0])), true);
    assert.equal((await editor.getRangeAtAsync(fixtures.zero.size - 1, 1))[0], 0);

    await open(fixtures.table);
    const table = { type: '16-bit', mappings: { '6600': 'f', '6F00': 'o', '7800': 'x', '7900': 'y' } };
    editor.charTables.custom16bit = table;
    editor.currentCharTable = 'custom16bit';
    editor.selectedCharTable = table;
    assert.equal(await search('foxy'), true, editor.searchNotice);
    assert.deepEqual(matches(), [0]);

    const boundary16 = 2 * 1024 * 1024 - 2;
    const boundaryShiftJis = 2 * 1024 * 1024 - 1;
    const expectText = (offset, value) => {
        const glyphs = [...document.querySelectorAll(`.hex-ascii [data-offset="${offset}"]`)];
        assert.equal(glyphs.map(glyph => glyph.textContent).join(''), value, `coluna de texto no offset ${offset}`);
    };
    const runTableSearch = async (term, expected) => {
        const started = performance.now();
        assert.equal(await search(term), true, editor.searchNotice);
        assert.deepEqual(editor.searchResults.map(result => [result.offset, result.length]), expected);
        return Math.round(performance.now() - started);
    };

    await open(fixtures.largeTable);
    const multiTable = editor.parseCharacterTableFile('#type=16-bit\nCAFE=fo\n7800=x\n7900=y', 'custom-16bit.tbl');
    editor.installCustomCharacterTable(multiTable, 'custom16bit');
    editor.setCharTable('custom16bit');
    const handler16 = editor.getVirtualNavigationHandler();
    await handler16.renderLargeFileContent(0);
    expectText(14, 'fo');
    expectText(16, 'x');
    await handler16.renderLargeFileContent(1);
    expectText(fixtures.largeTable.size - 6, 'fo');
    const search16Ms = await runTableSearch('foxy', [[14, 6], [boundary16, 6], [fixtures.largeTable.size - 6, 6]]);

    await open(fixtures.shiftJis);
    const shiftTable = editor.parseCharacterTableFile('#type=shift-jis\n82A0=あ\n82A2=い\n8241=Ｑ\n8282=う', 'custom-shift-jis.tbl');
    editor.installCustomCharacterTable(shiftTable, 'custom');
    editor.setCharTable('custom');
    const handlerShiftJis = editor.getVirtualNavigationHandler();
    await handlerShiftJis.renderLargeFileContent(0);
    expectText(15, 'あ');
    expectText(16, '');
    expectText(17, 'い');
    await handlerShiftJis.renderLargeFileContent(1);
    expectText(fixtures.shiftJis.size - 4, 'あ');
    const shiftSeek = 8 * 1024 * 1024 + 256;
    await handlerShiftJis.renderLargeFileContent((shiftSeek / editor.bytesPerLine + 0.25) / editor.maxScrollLines);
    expectText(shiftSeek, '');
    expectText(shiftSeek + 1, 'う');
    const searchShiftJisMs = await runTableSearch('あい', [[15, 4], [boundaryShiftJis, 4], [fixtures.shiftJis.size - 4, 4]]);
    assert.equal(await search('a'), true, editor.searchNotice);
    assert.deepEqual(matches(), [1], 'ignora um byte de continuação que coincide com A');
    assert.equal(fs.readdirSync(require('node:path').dirname(fixtures.giant.path)).filter(name => name.startsWith('.foxy-')).length, 0);
    return { virtualOpenMs, initialCacheBytes, giantSearchMs, rendererTicks: ticks, giantOffset, search16Ms, searchShiftJisMs };
}

async function runInElectron() {
    const { app, BrowserWindow } = require('electron');
    const directory = process.env.FOXY_TEST_DIRECTORY;
    app.setPath('userData', path.join(directory, 'profile'));
    require(path.join(root, 'electron/electron_main_handlers.js'));
    const makeFile = (name, size, markers) => {
        const file = path.join(directory, name);
        const handle = fs.openSync(file, 'w');
        try {
            if (size > 1024 * MiB && process.platform === 'win32') {
                spawnSync('fsutil', ['sparse', 'setflag', file], { windowsHide: true });
            }
            fs.ftruncateSync(handle, size);
            for (const [offset, value] of markers) {
                const bytes = Buffer.from(value);
                fs.writeSync(handle, bytes, 0, bytes.length, offset);
            }
        } finally {
            fs.closeSync(handle);
        }
        return { path: file, name, size };
    };
    try {
        const giantSize = 4096 * MiB + 128;
        const tableSize = 256 * MiB;
        const sequence16 = [0xca, 0xfe, 0x78, 0, 0x79, 0];
        const shiftJisText = [0x82, 0xa0, 0x82, 0xa2];
        const fixtures = {
            a: makeFile('a.bin', 10, [[0, 'foxy first']]),
            b: makeFile('b.bin', 11, [[0, 'foxy second']]),
            virtual: makeFile('virtual.bin', 64 * MiB, [[0, 'foxy tail'], [2 * MiB - 3, ' FoXY ']]),
            giant: makeFile('giant.bin', giantSize, [[giantSize - 64, 'find-giant']]),
            truncated: makeFile('truncated.bin', 9 * MiB, [[0, 'cut']]),
            external: makeFile('external.bin', 4, [[0, 'ABCD']]),
            overlap: makeFile('overlap.bin', 4, [[0, 'AAAA']]),
            zero: makeFile('zero.bin', 9 * MiB, [[9 * MiB - 1, [127]]]),
            table: makeFile('table.bin', 8, [[0, 'f\0o\0x\0y\0']]),
            largeTable: makeFile('large-table.bin', tableSize, [[14, sequence16], [2 * MiB - 2, sequence16], [tableSize - 6, sequence16]]),
            shiftJis: makeFile('shift-jis.bin', tableSize, [[1, [0x41, 0x82, 0x41]], [15, shiftJisText],
                [2 * MiB - 1, shiftJisText], [8 * MiB + 1, Buffer.alloc(512, 0x82)], [tableSize - 4, shiftJisText]]),
            copy: path.join(directory, 'copy.bin'), overlay: path.join(directory, 'overlay.bin'),
            empty: path.join(directory, 'empty.bin'), range: path.join(directory, 'range.bin'),
            failedCopy: path.join(directory, 'failed-copy.bin')
        };
        await app.whenReady();
        const window = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: true, contextIsolation: false } });
        await window.loadFile(path.join(root, 'index.html'));
        const result = await window.webContents.executeJavaScript(`(${exerciseEditor.toString()})(${JSON.stringify(fixtures)})`);
        console.log(JSON.stringify(result));
        app.exit(0);
    } catch (error) {
        console.error(error);
        app.exit(1);
    }
}

if (process.versions.electron) {
    void runInElectron();
} else {
    const parent = fs.realpathSync(os.tmpdir());
    const directory = fs.mkdtempSync(path.join(parent, 'foxy-editor-test-'));
    try {
        fs.writeFileSync(path.join(directory, 'index.js'), `require(${JSON.stringify(__filename)});`);
        const env = { ...process.env, FOXY_TEST_DIRECTORY: directory };
        delete env.ELECTRON_RUN_AS_NODE;
        const test = spawnSync(require('electron'), [directory], { env, stdio: 'inherit', timeout: 120000, windowsHide: true });
        if (test.error) throw test.error;
        assert.equal(test.status, 0, 'Os testes de integração falharam.');
    } finally {
        const resolved = fs.realpathSync(directory);
        if (path.dirname(resolved) === parent && path.basename(resolved).startsWith('foxy-editor-test-')) {
            fs.rmSync(resolved, { recursive: true, force: true, maxRetries: 4, retryDelay: 250 });
        }
    }
}
