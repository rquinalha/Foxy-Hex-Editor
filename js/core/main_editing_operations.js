// FOXY HEX EDITOR - EDITING & HISTORY SYSTEM (Parte 4)

Object.assign(FoxyHexEditorComplete.prototype, {

getFileExtension(filename) {
if (!filename) return null;
const lastDotIndex = filename.lastIndexOf('.');
if (lastDotIndex === -1) return null;
return filename.substring(lastDotIndex + 1).toLowerCase();
},

normalizeByteArray(bytes) {
    if (bytes instanceof Uint8Array) {
        return bytes;
    }
    if (Array.isArray(bytes)) {
        return new Uint8Array(bytes);
    }
    return new Uint8Array(bytes || []);
},

refreshDataMetrics() {
    this.fileSize = this.getDataLength();
    this.totalLines = Math.ceil(this.fileSize / this.bytesPerLine);
    this.maxScrollLines = Math.max(0, this.totalLines - this.visibleLines);
},

normalizeEditableRange(start, end = start) {
    const dataLength = this.getDataLength();
    const safeStart = Math.max(0, Math.min(this.normalizeOffsetNumber(start), dataLength));
    const safeEnd = Math.max(safeStart, Math.min(this.normalizeOffsetNumber(end), dataLength));
    return { start: safeStart, end: safeEnd, length: safeEnd - safeStart };
},

shiftModifiedBytesForInsert(position, insertedLength) {
    const shifted = new Set();
    for (const pos of this.modifiedBytes) {
        shifted.add(pos >= position ? pos + insertedLength : pos);
    }
    for (let i = 0; i < insertedLength; i++) {
        shifted.add(position + i);
    }
    this.modifiedBytes = shifted;
},

shiftModifiedBytesForDelete(start, end) {
    const shifted = new Set();
    const deletedLength = end - start;
    for (const pos of this.modifiedBytes) {
        if (pos < start) {
            shifted.add(pos);
        } else if (pos >= end) {
            shifted.add(pos - deletedLength);
        }
    }
    this.modifiedBytes = shifted;
},

markModifiedRange(start, length) {
    for (let i = 0; i < length; i++) {
        const position = start + i;
        if (position < this.getDataLength()) {
            this.modifiedBytes.add(position);
        }
    }
},

updateSelectionAfterByteMutation(start, length) {
    this.selectionStart = start;
    this.selectionEnd = length > 0 ? start + length - 1 : start;
    this.cursorPosition = this.selectionEnd;
},

get16BitCharByteLength(position) {
    const start = this.get16BitCharStart(position);
    return Math.max(0, Math.min(2, this.getDataLength() - start));
},

getShiftJISCharByteRange(position) {
    const range = this.getShiftJISCharRange(position);
    return {
        start: range.start,
        end: range.end,
        length: Math.max(0, (range.end - range.start) + 1)
    };
},

insertBytesAt(position, bytes, description = 'Insert bytes') {
    if (this.editMode !== 'edit') return false;

    const payload = this.normalizeByteArray(bytes);
    if (payload.length === 0) return true;

    const safePosition = this.normalizeEditableRange(position).start;
    const inserted = this.insertRangeAt(safePosition, payload);
    if (!inserted) return false;

    this.shiftModifiedBytesForInsert(safePosition, payload.length);
    this.hasUnsavedChanges = true;
    this.refreshDataMetrics();
    this.saveState(`${description}: ${payload.length} bytes at 0x${safePosition.toString(16).toUpperCase()}`);
    this.renderCurrentView(true);
    return true;
},

deleteRangeInternal(start, end, description = 'Delete bytes') {
    if (this.editMode !== 'edit') return false;

    const normalizedRange = this.normalizeEditableRange(start, end);
    const safeStart = normalizedRange.start;
    const safeEnd = normalizedRange.end;
    if (normalizedRange.length === 0) return true;

    const deleted = this.deleteRangeAt(safeStart, safeEnd);
    if (!deleted) return false;

    this.shiftModifiedBytesForDelete(safeStart, safeEnd);
    this.hasUnsavedChanges = true;
    this.refreshDataMetrics();
    this.saveState(`${description}: ${safeEnd - safeStart} bytes from 0x${safeStart.toString(16).toUpperCase()}`);
    this.renderCurrentView(true);
    return true;
},

overwriteBytesAt(position, bytes, description = 'Overwrite bytes') {
    if (this.editMode !== 'edit') return false;

    const payload = this.normalizeByteArray(bytes);
    if (payload.length === 0) return true;

    const safePosition = Math.max(0, this.normalizeOffsetNumber(position));
    let changed = false;
    for (let i = 0; i < payload.length; i++) {
        const targetPos = safePosition + i;
        if (targetPos >= this.getDataLength()) break;
        const oldValue = this.getByteAt(targetPos);
        const newValue = payload[i];
        if (oldValue === newValue) continue;
        if (!this.setByteAt(targetPos, newValue)) continue;
        this.modifiedBytes.add(targetPos);
        changed = true;
    }

    if (!changed) return false;

    this.hasUnsavedChanges = true;
    this.saveState(`${description}: ${payload.length} bytes at 0x${safePosition.toString(16).toUpperCase()}`);
    this.renderCurrentView(true);
    return true;
},

replaceSelectionWithBytes(start, end, bytes, insertionMode, description = 'Replace selection') {
    const payload = this.normalizeByteArray(bytes);
    const normalizedRange = this.normalizeEditableRange(start, end);
    const safeStart = normalizedRange.start;
    const safeEnd = normalizedRange.end;

    if (insertionMode) {
        const deleted = this.deleteRangeInternal(safeStart, safeEnd, `${description} remove selection`);
        if (!deleted && safeEnd > safeStart) return false;
        const inserted = this.insertBytesAt(safeStart, payload, `${description} insert`);
        if (!inserted) return false;
    } else {
        const overwriteLength = Math.max(0, safeEnd - safeStart);
        const overwritePayload = payload.slice(0, overwriteLength);
        const overwritten = this.overwriteBytesAt(safeStart, overwritePayload, description);
        if (!overwritten && overwritePayload.length > 0) return false;
    }

    this.updateSelectionAfterByteMutation(safeStart, insertionMode ? payload.length : Math.min(payload.length, normalizedRange.length));
    this.renderCurrentView(true);
    return true;
},

editByte(position, newValue, description = 'Edit byte') {
if (this.editMode !== 'edit' || position >= this.getDataLength()) {
    return false;
}

const oldValue = this.getByteAt(position);
if (oldValue === newValue) return false;

if (!this.setByteAt(position, newValue)) {
    return false;
}
this.modifiedBytes.add(position);
this.hasUnsavedChanges = true;

this.saveState(
    `${description} at 0x${position.toString(16).toUpperCase()}: 0x${oldValue.toString(16).toUpperCase()} -> 0x${newValue.toString(16).toUpperCase()}`,
    { change: { position, oldValue, newValue } }
);
this.emit('dataChange', { position, oldValue, newValue });
this.render();
return true;
},

handleHexEdit(char) {
if (this.editMode !== 'edit') return;

const hexChar = char.toUpperCase();
if (!/[0-9A-F]/.test(hexChar)) return;

if (this.insertMode && this.selectionStart !== this.selectionEnd) {
    const normalized = this.getNormalizedSelectionBounds(this.activePanel || 'hex');
    this.deleteRangeInternal(normalized.start, normalized.end + 1, 'Replace selection for hex insert');
    this.setInsertCursor(normalized.start, 'hex');
}

if (this.insertMode) {
    const insertPosition = this.clampCursorPosition(this.cursorPosition, true);

    if (this.nibblePosition === 0) {
        if (!this.insertByteAt(insertPosition, 0x00)) {
            return;
        }

        const newByte = parseInt(hexChar, 16) << 4;
        this.nibblePosition = 1;
        this.editingBytes.add(insertPosition);
        this.setByteAt(insertPosition, newByte);
        this.renderCurrentView(true);
        return;
    }

    const targetPosition = Math.max(0, Math.min(insertPosition, this.getDataLength() - 1));
    const currentByte = this.getByteAt(targetPosition) || 0;
    const newByte = (currentByte & 0xF0) | parseInt(hexChar, 16);
    this.nibblePosition = 0;

    setTimeout(() => {
        this.editingBytes.delete(targetPosition);
        this.renderCurrentView(true);
    }, 100);

    this.editByte(targetPosition, newByte, 'Hex insert');
    this.setInsertCursor(targetPosition + 1, 'hex');
    return;
}

const position = this.cursorPosition;
let currentByte = this.getByteAt(position);
let newByte;

const currentTable = this.charTables && this.charTables[this.currentCharTable];
const is16bit = currentTable && (currentTable.type === '16-bit' || currentTable.type === 'UTF-16');
const is16bitHexMode = is16bit && this.activePanel === 'hex';

if (this.nibblePosition === 0) {
    newByte = (parseInt(hexChar, 16) << 4) | (currentByte & 0x0F);
    this.nibblePosition = 1;
    this.editingBytes.add(position);

    if (is16bit) {
        const pairPosition = position % 2 === 0 ? position + 1 : position - 1;
        if (pairPosition >= 0 && pairPosition < this.getDataLength()) {
            this.editingBytes.add(pairPosition);
        }
    }

    this.setByteAt(position, newByte);
    this.completeRenderWithColors(this.currentScrollPercent, true);
} else {
    newByte = (currentByte & 0xF0) | parseInt(hexChar, 16);
    this.nibblePosition = 0;

    setTimeout(() => {
        this.editingBytes.delete(position);

        if (is16bit) {
            const pairPosition = position % 2 === 0 ? position + 1 : position - 1;
            if (pairPosition >= 0 && pairPosition < this.getDataLength()) {
                this.editingBytes.delete(pairPosition);
            }
        }

        this.completeRenderWithColors(this.currentScrollPercent, true);
    }, 100);

    this.editByte(position, newByte, 'Hex edit');

    if (this.insertMode) {
        this.insertByteAt(position + 1, 0x00);
        this.moveCursor(1);
    } else if (is16bitHexMode) {
        const pairStart = this.get16BitCharStart(position);
        const pairEnd = Math.min(pairStart + 1, this.getDataLength() - 1);

        if (position < pairEnd) {
            this.selectionStart = pairStart;
            this.selectionEnd = pairEnd;
            this.setCursor(position + 1, 'hex', true);
        } else {
            const nextPairStart = Math.min(pairEnd + 1, this.getDataLength() - 1);
            this.setCursor(nextPairStart, 'hex', false);
        }
    } else {
        this.moveCursor(1);
    }

}
},

handleAsciiEdit(char) {
if (this.editMode !== 'edit') return;

const currentTable = this.charTables && this.charTables[this.currentCharTable];
const is16bit = currentTable && (currentTable.type === '16-bit' || currentTable.type === 'UTF-16');
const isShiftJIS = this.isCurrentTableShiftJIS && this.isCurrentTableShiftJIS();

if (is16bit) {
    const encodedBytes = typeof this.encodeTextWithCurrentTable === 'function'
        ? this.encodeTextWithCurrentTable(char, true)
        : this.textTo16bitBytes(char);

    if (!encodedBytes || encodedBytes.length < 2) return;

    const hasSelection = this.selectionStart !== this.selectionEnd;

    const basePosition = this.get16BitCharStart
        ? (this.insertMode && !hasSelection
            ? this.clampCursorPosition(this.cursorPosition, true)
            : this.get16BitCharStart(this.cursorPosition))
        : (this.cursorPosition % 2 === 0 ? this.cursorPosition : this.cursorPosition - 1);
    const pairEnd = Math.min(basePosition + 1, this.getDataLength() - 1);

    this.editingBytes.add(basePosition);
    if (pairEnd !== basePosition) {
        this.editingBytes.add(pairEnd);
    }

    const payload = encodedBytes instanceof Uint8Array ? encodedBytes : new Uint8Array(encodedBytes);
    const selectionStart = hasSelection ? Math.min(this.selectionStart, this.selectionEnd) : basePosition;
    const selectionEnd = hasSelection ? Math.max(this.selectionStart, this.selectionEnd) + 1 : pairEnd + 1;

    let changed;
    if (this.insertMode) {
        changed = hasSelection
            ? this.replaceSelectionWithBytes(
                selectionStart,
                selectionEnd,
                payload.slice(0, 2),
                true,
                '16-bit text insert'
            )
            : this.insertBytesAt(basePosition, payload.slice(0, 2), '16-bit text insert');
    } else {
        changed = this.overwriteBytesAt(basePosition, payload.slice(0, 2), '16-bit text edit');
    }

    setTimeout(() => {
        this.editingBytes.delete(basePosition);
        this.editingBytes.delete(pairEnd);
        this.completeRenderWithColors(this.currentScrollPercent, true);
    }, 120);

    if (!changed) {
        return;
    }

    const nextCharStart = this.insertMode
        ? Math.min(basePosition + 2, this.getDataLength())
        : Math.min(basePosition + 2, Math.max(0, this.getDataLength() - 1));
    if (this.insertMode) {
        this.setInsertCursor(nextCharStart, 'ascii');
    } else {
        this.setCursor(nextCharStart, 'ascii', false);
    }
    return;
}

if (isShiftJIS) {
    const encodedBytes = typeof this.encodeTextWithCurrentTable === 'function'
        ? this.encodeTextWithCurrentTable(char, true)
        : this.textToShiftJISBytes(char, true);

    if (!encodedBytes || encodedBytes.length === 0) return;

    const hasSelection = this.selectionStart !== this.selectionEnd;
    const insertBase = this.clampCursorPosition(this.cursorPosition, true);
    const charRange = (this.insertMode && !hasSelection)
        ? { start: insertBase, end: insertBase - 1 }
        : this.getShiftJISCharByteRange(this.cursorPosition);
    const payload = encodedBytes instanceof Uint8Array ? encodedBytes : new Uint8Array(encodedBytes);
    const selectionStart = hasSelection ? Math.min(this.selectionStart, this.selectionEnd) : charRange.start;
    const selectionEnd = hasSelection ? Math.max(this.selectionStart, this.selectionEnd) + 1 : charRange.end + 1;

    for (let pos = charRange.start; pos <= charRange.end; pos++) {
        if (pos >= 0) {
            this.editingBytes.add(pos);
        }
    }

    let changed;
    if (this.insertMode) {
        changed = hasSelection
            ? this.replaceSelectionWithBytes(
                selectionStart,
                selectionEnd,
                payload,
                true,
                'Shift-JIS text insert'
            )
            : this.insertBytesAt(charRange.start, payload, 'Shift-JIS text insert');
    } else {
        changed = this.replaceSelectionWithBytes(
            charRange.start,
            charRange.end + 1,
            payload,
            false,
            'Shift-JIS text edit'
        );
    }

    setTimeout(() => {
        for (let pos = charRange.start; pos <= charRange.end; pos++) {
            this.editingBytes.delete(pos);
        }
        this.completeRenderWithColors(this.currentScrollPercent, true);
    }, 120);

    if (!changed) {
        return;
    }

    const nextCharStart = this.insertMode
        ? Math.min(charRange.start + payload.length, this.getDataLength())
        : Math.min(charRange.start + payload.length, Math.max(0, this.getDataLength() - 1));
    if (this.insertMode) {
        this.setInsertCursor(nextCharStart, 'ascii');
    } else {
        this.setCursor(nextCharStart, 'ascii', false);
    }
    return;
}

const charCode = char.charCodeAt(0);
if (charCode > 255) return;

if (this.insertMode) {
    this.insertByteAt(this.cursorPosition, charCode);
    this.setInsertCursor(this.cursorPosition + 1, 'ascii');
} else {
    this.editByte(this.cursorPosition, charCode, 'ASCII edit');
    this.moveCursor(1);
}
},

insertByteAt(position, value = 0x00) {
if (this.editMode !== 'edit') return false;
return this.insertBytesAt(position, [value], `Insert byte 0x${value.toString(16).toUpperCase()}`);
},

deleteByteAt(position) {
if (this.editMode !== 'edit' || position >= this.getDataLength()) return false;
const deletedValue = this.getByteAt(position);
return this.deleteRangeInternal(position, position + 1, `Delete byte 0x${deletedValue.toString(16).toUpperCase()} at 0x${position.toString(16).toUpperCase()}`);
},

delete16BitCharAt(position) {
if (this.editMode !== 'edit' || position >= this.getDataLength()) return false;
const start = this.get16BitCharStart(position);
const length = this.get16BitCharByteLength(start);
if (length <= 0) return false;
return this.deleteRangeInternal(start, start + length, `Delete 16-bit char at 0x${start.toString(16).toUpperCase()}`);
},

deleteShiftJISCharAt(position) {
if (this.editMode !== 'edit' || position >= this.getDataLength()) return false;
const range = this.getShiftJISCharByteRange(position);
if (range.length <= 0) return false;
return this.deleteRangeInternal(range.start, range.end + 1, `Delete Shift-JIS char at 0x${range.start.toString(16).toUpperCase()}`);
},

clear16BitCharAt(position) {
if (this.editMode !== 'edit' || position >= this.getDataLength()) return false;
const start = this.get16BitCharStart(position);
const length = this.get16BitCharByteLength(start);
if (length <= 0) return false;
return this.overwriteBytesAt(start, new Uint8Array(length).fill(0x00), `Clear 16-bit char at 0x${start.toString(16).toUpperCase()}`);
},

clearShiftJISCharAt(position) {
if (this.editMode !== 'edit' || position >= this.getDataLength()) return false;
const range = this.getShiftJISCharByteRange(position);
if (range.length <= 0) return false;
return this.overwriteBytesAt(range.start, new Uint8Array(range.length).fill(0x00), `Clear Shift-JIS char at 0x${range.start.toString(16).toUpperCase()}`);
},

insertBytes() {
const count = prompt('Quantos bytes inserir?', '1');
const value = prompt('Valor do byte (hex):', '00');

if (count && value) {
    const numBytes = parseInt(count);
    const byteValue = parseInt(value, 16);

    if (!isNaN(numBytes) && !isNaN(byteValue) && numBytes > 0 && byteValue >= 0 && byteValue <= 255) {
        for (let i = 0; i < numBytes; i++) {
            this.insertByteAt(this.cursorPosition + i, byteValue);
        }
    }
}
},

deleteSelection() {
if (this.selectionStart !== this.selectionEnd) {
    const normalized = this.getNormalizedSelectionBounds(this.activePanel || 'hex');
    const start = normalized.start;
    const endExclusive = normalized.end + 1;
    const length = Math.max(0, endExclusive - start);

    if (this.insertMode) {
        this.deleteRangeInternal(start, endExclusive, 'Delete selection (insert mode)');
        this.selectionStart = start;
        this.selectionEnd = start;
        this.setInsertCursor(start, this.activePanel || 'hex');
    } else {
        this.overwriteBytesAt(start, new Uint8Array(length).fill(0x00), 'Clear selection');
        this.selectionStart = start;
        this.selectionEnd = start;
        this.setCursor(start, this.activePanel || 'hex', false);
    }

    this.renderCurrentView(true);
}
}

});
