const { ipcMain } = require('electron');
const { readFileSync } = require('node:fs');
const { resolve, join } = require('node:path');
const { pathToFileURL } = require('node:url');
const { Worker } = require('node:worker_threads');

const root = resolve(__dirname, '..');
const editorPath = join(root, 'index.html');
const editorUrl = pathToFileURL(editorPath).href;
const directory = join(root, 'js', 'core');
const jobs = new Map();
let workerFiles;

function createWorker() {
    if (!workerFiles) {
        const read = name => readFileSync(join(directory, name), 'utf8');
        workerFiles = {
            entry: read('document-search-worker.js'),
            workerData: {
                editorPath,
                byteSource: read('file-byte-source.js'),
                scripts: ['char_decoder_16bit.js', 'boyer-moore.js', 'main_search_basic.js', 'main_search_table_codecs.js',
                    'main_search_table_searches.js', 'main_search_algorithms.js', 'main_table_codec.js',
                    'table-text-reader.js'].map(name => [name, read(name)])
            }
        };
    }
    return new Worker(workerFiles.entry, { eval: true, workerData: workerFiles.workerData });
}

ipcMain.on('document-search-start', (event, request) => {
    if (event.senderFrame?.url !== editorUrl) return;
    const sender = event.sender;
    jobs.get(sender.id)?.stop();
    const { id, document, options, limit } = request;
    const send = message => {
        if (!sender.isDestroyed()) sender.send('document-search-update', { id, ...message });
    };
    let worker;
    try {
        worker = createWorker();
    } catch (error) {
        send({ error: error.message });
        return;
    }
    const key = sender.id;
    const job = {
        id,
        busy: false,
        stop() {
            if (jobs.get(key) !== job) return;
            jobs.delete(key);
            clearTimeout(job.timeout);
            sender.removeListener('destroyed', job.stop);
            void worker.terminate();
        },
        run(document, limit) {
            if (job.busy) return;
            job.busy = true;
            if (options.mode === 'regex') {
                job.timeout = setTimeout(() => fail('A expressão regular excedeu o tempo de busca.'), 30000);
            }
            try { worker.postMessage({ document, options, limit }); }
            catch (error) { fail(error.message); }
        }
    };
    const fail = error => {
        if (jobs.get(key) !== job) return;
        job.stop();
        send({ error });
    };
    jobs.set(key, job);
    sender.once('destroyed', job.stop);
    worker.on('message', message => {
        if (jobs.get(key) !== job) return;
        if (message.error) {
            fail(message.error);
            return;
        }
        if (message.outcome) {
            clearTimeout(job.timeout);
            job.busy = false;
        }
        send(message);
    });
    worker.once('error', error => fail(error.message));
    worker.once('exit', () => fail('O processo de busca foi encerrado.'));
    job.run(document, limit);
});

ipcMain.on('document-search-next', (event, { id, document, limit }) => {
    if (event.senderFrame?.url !== editorUrl) return;
    const job = jobs.get(event.sender.id);
    if (job?.id === id) job.run(document, limit);
});

ipcMain.on('document-search-cancel', (event, id) => {
    if (event.senderFrame?.url !== editorUrl) return;
    const job = jobs.get(event.sender.id);
    if (job?.id === id) job.stop();
});
