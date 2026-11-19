const fs = require('node:fs').promises;

async function readExactly(handle, bytes, start, length, position) {
    while (length > 0) {
        const { bytesRead } = await handle.read(bytes, start, length, position);
        if (!bytesRead) throw new Error('Leitura incompleta do arquivo de origem.');
        start += bytesRead;
        position += bytesRead;
        length -= bytesRead;
    }
}

function lowerBound(items, offset, key) {
    let start = 0;
    let end = items.length;
    while (start < end) {
        const middle = Math.floor((start + end) / 2);
        if (key(items[middle]) < offset) start = middle + 1;
        else end = middle;
    }
    return start;
}

async function openByteSource(filePath, snapshot) {
    const handle = await fs.open(filePath, 'r');
    try {
        const initial = await handle.stat();
        if (initial.size !== snapshot.sourceFileSize ||
            (snapshot.diskVersion && Object.keys(snapshot.diskVersion).some(key => snapshot.diskVersion[key] !== initial[key]))) {
            throw new Error('O arquivo de origem mudou no disco.');
        }

        let end = 0;
        const segments = snapshot.virtualSegments.map(segment => ({ ...segment, end: end += segment.length }));
        const patches = [...snapshot.modifiedOverlay].sort(([a], [b]) => a - b);
        return {
            async read(position, length) {
                const data = new Uint8Array(length);
                let index = lowerBound(segments, position + 1, segment => segment.end);
                for (let written = 0; written < length; index++) {
                    const segment = segments[index];
                    if (!segment) throw new Error('Intervalo incompleto no arquivo virtual.');
                    const local = position - (segment.end - segment.length);
                    const amount = Math.min(length - written, segment.length - local);
                    if (segment.type === 'insert') {
                        data.set(segment.data.subarray(local, local + amount), written);
                    } else {
                        const source = segment.start + local;
                        await readExactly(handle, data, written, amount, source);
                        for (let patch = lowerBound(patches, source, entry => entry[0]);
                            patch < patches.length && patches[patch][0] < source + amount; patch++) {
                            const [offset, value] = patches[patch];
                            data[written + offset - source] = value;
                        }
                    }
                    written += amount;
                    position += amount;
                }
                return data;
            },
            async verify() {
                const current = await fs.stat(filePath);
                if (current.size !== initial.size || current.mtimeMs !== initial.mtimeMs || current.ctimeMs !== initial.ctimeMs ||
                    current.ino !== initial.ino || current.dev !== initial.dev) {
                    throw new Error('O arquivo de origem mudou durante a operação.');
                }
            },
            close: () => handle.close()
        };
    } catch (error) {
        await handle.close();
        throw error;
    }
}

module.exports = { openByteSource, readExactly };
