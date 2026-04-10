function saveFile() {
    if (window.intelligentSave) {
        window.intelligentSave.save();
    } else if (window.hexEditor && typeof window.hexEditor.save === 'function') {
        // Fallback para sistema antigo
        if (window.hexEditor.hasUnsavedChanges) {
            window.hexEditor.save();
        }
    } else {
        // console.error('❌ Sistema de salvamento não disponível');
    }
}


function saveAsFile() {
    if (window.intelligentSave) {
        window.intelligentSave.saveAs();
    } else if (window.hexEditor && typeof window.hexEditor.save === 'function') {
        // Fallback para sistema antigo
        if (window.hexEditor.hasUnsavedChanges) {
            window.hexEditor.save();
        }
    } else {
        // console.error('❌ Sistema de salvamento não disponível');
    }
}

const originalLoadFileFromData = window.loadFileFromData;

window.loadFileFromData = function(fileData, fileName, filePath = null) {
    

    const result = originalLoadFileFromData(fileData, fileName, filePath);
    

    if (result && window.intelligentSave && filePath) {
        setTimeout(() => {
            window.intelligentSave.setCurrentFile(filePath, fileName);
        }, 100);
    }
    
    return result;
};


if (typeof FoxyHexEditorComplete !== 'undefined') {
    const originalUpdateButtons = FoxyHexEditorComplete.prototype.updateButtons;
    
    FoxyHexEditorComplete.prototype.updateButtons = function() {

        if (originalUpdateButtons) {
            originalUpdateButtons.call(this);
        }
        

        if (window.intelligentSave) {
            window.intelligentSave.updateSaveButton();
        }
    };
}


document.addEventListener('DOMContentLoaded', function() {

    const initIntelligentSave = () => {
        if (window.hexEditor) {
            window.intelligentSave = new IntelligentSaveSystem(window.hexEditor);
            

            window.intelligentSave.setupChangeMonitoring();
            

            setTimeout(() => {
                if (window.intelligentSave) {
                    window.intelligentSave.updateSaveButton();
                }
            }, 100);
            
        } else {
            setTimeout(initIntelligentSave, 100);
        }
    };
    
    setTimeout(initIntelligentSave, 200);
});



window.debugSaveSystem = function() {
    
    const saveBtn = document.getElementById('save-btn');
    const saveAsBtn = document.getElementById('save-as-btn');
};


window.testSaveInterfaces = function() {
    if (window.intelligentSave) {
        window.intelligentSave.testAllSizes();
    } else {
        // console.error('❌ Sistema inteligente não disponível');
    }
};


window.testSaveInterface = function(sizeInMB) {
    if (window.intelligentSave) {
        return window.intelligentSave.testSaveInterface(sizeInMB);
    } else {
        // console.error('❌ Sistema inteligente não disponível');
        return null;
    }
};
