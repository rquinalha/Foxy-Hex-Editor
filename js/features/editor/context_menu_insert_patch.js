(function() {
    if (typeof ContextMenuManager === 'undefined') {
        return;
    }

    ContextMenuManager.prototype.insertImportData = function(hexEditor, selection, importData) {
        const previousEditMode = hexEditor.editMode;

        try {
            if (hexEditor.editMode !== 'edit') {
                hexEditor.editMode = 'edit';
            }

            const inserted = hexEditor.insertBytesAt(
                selection.start,
                importData,
                'Importacao inserir'
            );

            if (inserted) {
                hexEditor.selectionStart = selection.start;
                hexEditor.selectionEnd = selection.start + importData.length - 1;
                hexEditor.cursorPosition = hexEditor.selectionEnd;

                if (typeof hexEditor.renderCurrentView === 'function') {
                    hexEditor.renderCurrentView(true);
                } else {
                    hexEditor.render();
                }
            }
        } finally {
            hexEditor.editMode = previousEditMode;
        }
    };

    ContextMenuManager.prototype.overwriteImportData = function(hexEditor, selection, importData) {
        const previousEditMode = hexEditor.editMode;

        try {
            if (hexEditor.editMode !== 'edit') {
                hexEditor.editMode = 'edit';
            }

            hexEditor.replaceSelectionWithBytes(
                selection.start,
                selection.start + selection.length,
                importData,
                false,
                'Importacao sobrescrever'
            );
        } finally {
            hexEditor.editMode = previousEditMode;
        }
    };
})();
