class BaseHexDataProvider {
    get length() {
        return 0;
    }

    isVirtual() {
        return false;
    }

    getByteSync(_offset) {
        return undefined;
    }

    setByteSync(_offset, _value) {
        return false;
    }

    getRangeSync(offset, length) {
        const safeLength = Math.max(0, Math.floor(Number(length)));
        const out = new Uint8Array(safeLength);
        for (let i = 0; i < safeLength; i++) {
            const value = this.getByteSync(offset + i);
            out[i] = value === undefined ? 0 : value;
        }
        return out;
    }

    async getRange(offset, length) {
        return this.getRangeSync(offset, length);
    }

    replaceRangeSync(offset, length, newBytes) {
        const bytes = newBytes instanceof Uint8Array ? newBytes : new Uint8Array(newBytes || []);
        for (let i = 0; i < length; i++) {
            const value = i < bytes.length ? bytes[i] : 0;
            if (!this.setByteSync(offset + i, value)) {
                return false;
            }
        }
        return true;
    }

    insertRangeSync(_offset, _newBytes) {
        return false;
    }

    deleteRangeSync(_start, _end) {
        return false;
    }

    snapshot() {
        return null;
    }
}

class MemoryHexDataProvider extends BaseHexDataProvider {
    constructor(data) {
        super();
        this.data = data instanceof Uint8Array ? data : new Uint8Array(data || 0);
    }

    get length() {
        return this.data.length;
    }

    getByteSync(offset) {
        if (offset < 0 || offset >= this.data.length) {
            return undefined;
        }
        return this.data[offset];
    }

    setByteSync(offset, value) {
        if (offset < 0 || offset >= this.data.length) {
            return false;
        }
        this.data[offset] = value & 0xFF;
        return true;
    }

    getRangeSync(offset, length) {
        const start = Math.max(0, Math.floor(Number(offset)));
        const end = Math.max(start, Math.min(this.data.length, start + Math.max(0, Math.floor(Number(length)))));
        return this.data.slice(start, end);
    }

    insertByteSync(position, value = 0x00) {
        const safePos = Math.max(0, Math.min(Math.floor(Number(position)), this.data.length));
        const out = new Uint8Array(this.data.length + 1);
        out.set(this.data.slice(0, safePos));
        out[safePos] = value & 0xFF;
        out.set(this.data.slice(safePos), safePos + 1);
        this.data = out;
        return true;
    }

    insertRangeSync(position, newBytes) {
        const bytes = newBytes instanceof Uint8Array ? newBytes : new Uint8Array(newBytes || []);
        const safePos = Math.max(0, Math.min(Math.floor(Number(position)), this.data.length));
        if (bytes.length === 0) {
            return true;
        }

        const out = new Uint8Array(this.data.length + bytes.length);
        out.set(this.data.slice(0, safePos), 0);
        out.set(bytes, safePos);
        out.set(this.data.slice(safePos), safePos + bytes.length);
        this.data = out;
        return true;
    }

    deleteByteSync(position) {
        if (position < 0 || position >= this.data.length) {
            return false;
        }
        const out = new Uint8Array(this.data.length - 1);
        out.set(this.data.slice(0, position));
        out.set(this.data.slice(position + 1), position);
        this.data = out;
        return true;
    }

    deleteRangeSync(start, end) {
        const safeStart = Math.max(0, Math.min(Math.floor(Number(start)), this.data.length));
        const safeEnd = Math.max(safeStart, Math.min(Math.floor(Number(end)), this.data.length));
        const out = new Uint8Array(this.data.length - (safeEnd - safeStart));
        out.set(this.data.slice(0, safeStart));
        out.set(this.data.slice(safeEnd), safeStart);
        this.data = out;
        return true;
    }

    snapshot() {
        return new Uint8Array(this.data);
    }
}

class ChunkedOverlayDataProvider extends BaseHexDataProvider {
    constructor(handler) {
        super();
        this.handler = handler;
    }

    get length() {
        return this.handler ? this.handler.fileSize : 0;
    }

    isVirtual() {
        return true;
    }

    getByteSync(offset) {
        if (!this.handler) {
            return undefined;
        }
        return this.handler.getByteSync(offset);
    }

    setByteSync(offset, value) {
        if (!this.handler || offset < 0 || offset >= this.length) {
            return false;
        }
        this.handler.recordEdit(offset, value & 0xFF);
        return true;
    }

    insertRangeSync(offset, newBytes) {
        if (!this.handler) {
            return false;
        }
        return this.handler.insertBytes(offset, newBytes);
    }

    deleteRangeSync(start, end) {
        if (!this.handler) {
            return false;
        }
        return this.handler.deleteRange(start, end);
    }

    getRangeSync(offset, length) {
        if (!this.handler) {
            return new Uint8Array(0);
        }
        const out = new Uint8Array(Math.max(0, Math.floor(Number(length))));
        for (let i = 0; i < out.length; i++) {
            const value = this.handler.getByteSync(offset + i);
            out[i] = value === undefined ? 0 : value;
        }
        return out;
    }

    async getRange(offset, length) {
        if (!this.handler) {
            return new Uint8Array(0);
        }
        return this.handler.getBytes(offset, length);
    }

    snapshot() {
        return this.handler ? this.handler.createSnapshot() : {
            isVirtual: true,
            modifiedOverlay: new Map()
        };
    }

    restoreSnapshot(snapshot) {
        if (!this.handler) {
            return;
        }
        this.handler.restoreSnapshot(snapshot);
    }
}

window.BaseHexDataProvider = BaseHexDataProvider;
window.MemoryHexDataProvider = MemoryHexDataProvider;
window.ChunkedOverlayDataProvider = ChunkedOverlayDataProvider;
