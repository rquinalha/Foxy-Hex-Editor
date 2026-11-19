function createTableTextReader(table, fixedWidth) {
    const singles = new Array(256);
    const pairs = new Array(65536);
    const prefixes = new Uint8Array(256);
    const longer = new Map();
    const unknownByte = { text: '.', length: 1, searchable: false };
    const unknownPair = { text: '.', length: 2, searchable: false };
    let maxByteLength = 2;

    function register(key, text, searchable = true) {
        const hex = String(key).toUpperCase();
        if (!/^(?:[0-9A-F]{2}){1,16}$/.test(hex)) return;
        const length = hex.length / 2;
        if ((fixedWidth && length !== 2) || typeof text !== 'string' || !text.length) return;
        const token = { text, length, searchable, folded: text.toLowerCase() };
        const index = parseInt(hex.slice(0, 4), 16);
        if (length === 1) singles[index] = token;
        else if (length === 2) {
            prefixes[index >>> 8] = 1;
            pairs[index] = token;
        }
        else {
            prefixes[index >>> 8] = 1;
            const list = longer.get(index) || new Map();
            list.set(hex, { token, suffix: hex.slice(4).match(/../g).map(byte => parseInt(byte, 16)) });
            longer.set(index, list);
            maxByteLength = Math.max(maxByteLength, length);
        }
    }

    if (!fixedWidth) {
        for (let byte = 0x20; byte <= 0x7e; byte++) {
            register(byte.toString(16), String.fromCharCode(byte));
        }
    }
    for (const entries of [table.mappings || table.mapping, table.mte_sequences, table.dte_sequences, table.tag_sequences]) {
        for (const [hex, text] of Object.entries(entries || {})) register(hex, text);
    }
    for (const hex of table.terminators || []) register(hex, '.', false);
    if (fixedWidth) {
        return {
            maxByteLength,
            read(bytes, offset) {
                if (offset + 1 >= bytes.length) return unknownByte;
                return pairs[bytes[offset] * 256 + bytes[offset + 1]] || unknownPair;
            }
        };
    }

    for (const [prefix, entries] of longer) {
        longer.set(prefix, [...entries.values()].sort((a, b) => b.token.length - a.token.length));
    }
    const decoder = new TextDecoder('shift_jis', { fatal: true });
    const isLead = byte => (byte >= 0x81 && byte <= 0x9f) || (byte >= 0xe0 && byte <= 0xfc);
    const isTrail = byte => byte >= 0x40 && byte <= 0xfc && byte !== 0x7f;
    function decode(bytes, offset, length, unknown) {
        try {
            const text = decoder.decode(bytes.subarray(offset, offset + length));
            return text ? { text, length, searchable: true, folded: text.toLowerCase() } : unknown;
        } catch (_) {
            return unknown;
        }
    }
    return {
        maxByteLength,
        read(bytes, offset) {
            const first = bytes[offset];
            const lead = isLead(first) && !singles[first];
            if ((prefixes[first] || lead) && offset + 1 < bytes.length) {
                const second = bytes[offset + 1];
                const index = first * 256 + second;
                const entries = longer.size ? longer.get(index) : null;
                if (entries) {
                    for (const { token, suffix } of entries) {
                        if (suffix.every((byte, position) => bytes[offset + position + 2] === byte)) return token;
                    }
                }
                if (pairs[index]) return pairs[index];
                if (lead && isTrail(second)) {
                    return pairs[index] = decode(bytes, offset, 2, unknownPair);
                }
            }
            if (singles[first]) return singles[first];
            if (first >= 0xa1 && first <= 0xdf) return singles[first] = decode(bytes, offset, 1, unknownByte);
            return unknownByte;
        }
    };
}
