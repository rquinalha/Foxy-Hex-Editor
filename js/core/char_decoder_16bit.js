// === 16-BIT CHARACTER DECODER ===
class CharDecoder16bit {
    constructor(tableJson) {
        this.mapping = tableJson.mappings || {};
        this.dte_sequences = tableJson.dte_sequences || {};
        this.mte_sequences = tableJson.mte_sequences || {};
        this.tag_sequences = tableJson.tag_sequences || {};
        this.terminators = (tableJson.terminators || []).map((t) => t.toUpperCase());
        this.endianness = tableJson.endianness || "LE";
    }

    decode(data, offset = 0, maxLength = Infinity) {
        let result = '';
        let i = offset;

        while (i + 1 < data.length && result.length < maxLength) {
            const byte1 = data[i];
            const byte2 = data[i + 1];
            const hexCode =
                byte1.toString(16).padStart(2, '0').toUpperCase() +
                byte2.toString(16).padStart(2, '0').toUpperCase();

            if (this.terminators.includes(hexCode)) {
                break;
            }

            // Prioridade 1: Verificar tag sequences (hex 16-bit -> tag como [NEW])
            if (this.tag_sequences[hexCode]) {
                result += this.tag_sequences[hexCode];
                i += 2;
                continue;
            }

            // Prioridade 2: Verificar DTE sequences (hex 16-bit -> 2 caracteres)
            if (this.dte_sequences[hexCode]) {
                result += this.dte_sequences[hexCode];
                i += 2;
                continue;
            }

            // Prioridade 3: Verificar MTE sequences (hex 16-bit -> 3+ caracteres)
            if (this.mte_sequences[hexCode]) {
                result += this.mte_sequences[hexCode];
                i += 2;
                continue;
            }

            // Prioridade 4: Mapeamentos normais
            const char = this.mapping[hexCode];
            result += char !== undefined ? char : '.';
            i += 2;
        }

        return result;
    }

    // Método que retorna o texto decodificado + mapeamento de cada caractere para offset
    decodeWithMapping(data, offset = 0, maxLength = Infinity) {
        const result = '';
        const mapping = []; // Array de { char, byteOffset, byteLength }
        let i = offset;

        while (i + 1 < data.length && result.length < maxLength) {
            const byte1 = data[i];
            const byte2 = data[i + 1];
            const hexCode =
                byte1.toString(16).padStart(2, '0').toUpperCase() +
                byte2.toString(16).padStart(2, '0').toUpperCase();

            if (this.terminators.includes(hexCode)) {
                break;
            }

            // Prioridade 1: Verificar tag sequences (hex 16-bit -> tag como [NEW])
            if (this.tag_sequences[hexCode]) {
                const tag = this.tag_sequences[hexCode];
                for (let c = 0; c < tag.length; c++) {
                    mapping.push({
                        char: tag[c],
                        byteOffset: i,
                        byteLength: 2,
                        isTag: true
                    });
                }
                i += 2;
                continue;
            }

            // Prioridade 2: Verificar DTE sequences (hex 16-bit -> 2 caracteres)
            if (this.dte_sequences[hexCode]) {
                const chars = this.dte_sequences[hexCode];
                for (let c = 0; c < chars.length; c++) {
                    mapping.push({
                        char: chars[c],
                        byteOffset: i,
                        byteLength: 2,
                        isDTE: true
                    });
                }
                i += 2;
                continue;
            }

            // Prioridade 3: Verificar MTE sequences (hex 16-bit -> 3+ caracteres)
            if (this.mte_sequences[hexCode]) {
                const chars = this.mte_sequences[hexCode];
                for (let c = 0; c < chars.length; c++) {
                    mapping.push({
                        char: chars[c],
                        byteOffset: i,
                        byteLength: 2,
                        isMTE: true
                    });
                }
                i += 2;
                continue;
            }

            // Prioridade 4: Mapeamentos normais (1 caractere = 2 bytes)
            const char = this.mapping[hexCode];
            mapping.push({
                char: char !== undefined ? char : '.',
                byteOffset: i,
                byteLength: 2
            });
            i += 2;
        }

        return {
            text: mapping.map(m => m.char).join(''),
            mapping
        };
    }

    debugBytes(data, offset = 0, count = 5) {
        for (let i = 0; i < count * 2 && offset + i + 1 < data.length; i += 2) {
            const byte1 = data[offset + i];
            const byte2 = data[offset + i + 1];
            const hexCode =
                byte1.toString(16).padStart(2, '0').toUpperCase() +
                byte2.toString(16).padStart(2, '0').toUpperCase();

            const char = this.mapping[hexCode] || '.';
            void char;
        }
    }

    encode(text) {
        const result = [];

        for (const char of text) {
            let found = false;

            for (const [hexCode, mappedChar] of Object.entries(this.mapping)) {
                if (mappedChar === char) {
                    const firstByte = parseInt(hexCode.slice(0, 2), 16);
                    const secondByte = parseInt(hexCode.slice(2, 4), 16);
                    result.push(firstByte, secondByte);
                    found = true;
                    break;
                }
            }

            if (!found) {
                result.push(0x00, 0x00);
            }
        }

        return new Uint8Array(result);
    }

    static validateTable(tableJson) {
        const errors = [];

        if (!tableJson.mappings || typeof tableJson.mappings !== 'object') {
            errors.push('Campo "mappings" obrigatorio');
        }

        if (!tableJson.endianness || !['LE', 'BE'].includes(tableJson.endianness)) {
            errors.push('Campo "endianness" deve ser "LE" ou "BE"');
        }

        if (tableJson.mappings) {
            for (const [hexCode, char] of Object.entries(tableJson.mappings)) {
                if (!/^[0-9A-Fa-f]{4}$/.test(hexCode)) {
                    errors.push(`Hex code invalido: "${hexCode}" (deve ter 4 digitos hex)`);
                }

                if (typeof char !== 'string') {
                    errors.push(`Caractere invalido para "${hexCode}": deve ser string`);
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

const exampleTableLE = {
    name: "Exemplo LE",
    type: "16-bit",
    endianness: "LE",
    mappings: {
        "4100": "A",
        "4200": "B",
        "4300": "C"
    }
};

const exampleTableBE = {
    name: "Exemplo BE",
    type: "16-bit",
    endianness: "BE",
    mappings: {
        "0041": "A",
        "0042": "B",
        "0043": "C"
    }
};

function testCharDecoder16bit() {
    const decoderLE = new CharDecoder16bit(exampleTableLE);
    const dataLE = new Uint8Array([0x41, 0x00, 0x42, 0x00, 0x43, 0x00]);
    const resultLE = decoderLE.decode(dataLE, 0, 3);

    const decoderBE = new CharDecoder16bit(exampleTableBE);
    const dataBE = new Uint8Array([0x00, 0x41, 0x00, 0x42, 0x00, 0x43]);
    const resultBE = decoderBE.decode(dataBE, 0, 3);

    const encodedLE = decoderLE.encode("ABC");
    const encodedBE = decoderBE.encode("ABC");

    return { resultLE, resultBE, encodedLE, encodedBE };
}

if (typeof window !== 'undefined') {
    window.testCharDecoder16bit = testCharDecoder16bit;
}
