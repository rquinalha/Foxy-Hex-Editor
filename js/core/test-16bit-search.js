// ========================================
// TESTE DE BUSCA 16-BIT
// ========================================

function test16bitSearch() {
    
    if (!window.hexEditor) {
        console.error('❌ Hex Editor não disponível');
        return;
    }
    
    if (!window.hexEditor.charDecoder16) {
        return;
    }
    
    
    // Testar busca 16-bit
    const testTerm = "TEST";
    
    // Simular busca externa
    if (window.OffsetFix) {
        const offsetFix = new window.OffsetFix();
    } else {
        // console.error('❌ OffsetFix não disponível');
    }
}

// Exportar para uso global
window.test16bitSearch = test16bitSearch; 