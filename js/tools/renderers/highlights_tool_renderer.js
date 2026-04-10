/**
 * Renderer Process para a janela de "Gerenciar Marcações"
 */

const { ipcRenderer } = require('electron');

let highlights = [];

// Elementos DOM
const searchInput = document.getElementById('search-input');
const tableBody = document.getElementById('highlights-table-body');
const countDisplay = document.getElementById('highlights-count');
const closeBtn = document.getElementById('close-btn');
const refreshBtn = document.getElementById('refresh-btn');

// Receber dados de marcações do processo principal
ipcRenderer.on('update-highlights-state', (event, data) => {
    highlights = data.highlights || [];
    
    // Aguardar DOM estar pronto se necessário
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            renderTable();
            updateCount();
        });
    } else {
        renderTable();
        updateCount();
    }
});

// Receber atualização de uma marcação específica
ipcRenderer.on('highlight-updated', (event, data) => {
    const index = highlights.findIndex(h => h.id === data.id);
    if (index !== -1) {
        highlights[index] = { ...highlights[index], ...data };
        renderTable();
    }
});

// Receber notificação de marcação removida
ipcRenderer.on('highlight-removed', (event, data) => {
    highlights = highlights.filter(h => String(h.id) !== String(data.id));
    renderTable();
    updateCount();
});

// Renderizar a tabela
function renderTable() {
    
    if (!tableBody) {
        console.error('[Highlights] tableBody não encontrado no renderTable!');
        return;
    }

    if (highlights.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5">
            <div class="empty-state">
                        <div class="empty-state-icon">${window.I18n ? window.I18n.t('tool.highlights.empty_title') : '🖍️'}</div>
                        <div>${window.I18n ? window.I18n.t('tool.highlights.empty_message') : 'Nenhuma marcação encontrada'}</div>
                        <div class="empty-state-subtitle">${window.I18n ? window.I18n.t('tool.highlights.empty_subtitle') : 'Use o menu de contexto para criar marcações'}</div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    // Ordenar por offset inicial
    const sortedHighlights = [...highlights].sort((a, b) => a.start - b.start);

    tableBody.innerHTML = sortedHighlights.map(highlight => {
        const startOffset = `0x${highlight.start.toString(16).toUpperCase().padStart(8, '0')}`;
        const endOffset = `0x${highlight.end.toString(16).toUpperCase().padStart(8, '0')}`;
        const size = highlight.end - highlight.start + 1;
        const comment = highlight.comment || '';

        return `
            <tr data-highlight-id="${highlight.id}" data-start="${highlight.start}" data-end="${highlight.end}">
                <td class="offset">${startOffset}</td>
                <td class="offset">${endOffset}</td>
                <td class="size">${size} ${window.I18n ? window.I18n.t('tool.highlights.bytes') : 'bytes'}</td>
                <td>
                    <input type="text" 
                           class="comment-input" 
                           value="${escapeHtml(comment)}" 
                           placeholder="${window.I18n ? window.I18n.t('tool.highlights.add_comment') : 'Adicionar comentário...'}"
                           data-highlight-id="${highlight.id}">
                </td>
                <td class="actions">
                    <button class="btn btn-navigate" data-highlight-id="${highlight.id}" type="button">${window.I18n ? window.I18n.t('tool.highlights.navigate') : '🎯 Ir'}</button>
                    <button class="btn btn-delete" data-highlight-id="${highlight.id}" type="button">${window.I18n ? window.I18n.t('tool.highlights.delete') : '🗑️ Deletar'}</button>
                </td>
            </tr>
        `;
    }).join('');

    // Configurar eventos dos elementos da tabela
    setupTableEvents();
}

// Configurar eventos da tabela
function setupTableEvents() {
    
    // Verificar se tableBody existe
    if (!tableBody) {
        console.error('[Highlights] tableBody não encontrado!');
        return;
    }
    
    // Eventos dos botões de navegação
    const navigateBtns = tableBody.querySelectorAll('.btn-navigate');
    
    navigateBtns.forEach((btn, index) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const highlightId = btn.dataset.highlightId;
            const highlight = highlights.find(h => String(h.id) === highlightId);
            if (highlight) {
                ipcRenderer.send('navigate-to-highlight', { id: highlightId, start: highlight.start, end: highlight.end });
            } else {
                console.error(`[Highlights] Highlight não encontrado: ${highlightId}`);
            }
        });
    });

    // Eventos dos botões de deletar
    const deleteBtns = tableBody.querySelectorAll('.btn-delete');
    
    deleteBtns.forEach((btn, index) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const highlightId = btn.dataset.highlightId;
            const highlight = highlights.find(h => String(h.id) === highlightId);
            if (highlight) {
                const message = `${window.I18n ? window.I18n.t('tool.highlights.confirm_delete') : 'Tem certeza que deseja deletar esta marcação?'}\n\n0x${highlight.start.toString(16).toUpperCase().padStart(8, '0')} - 0x${highlight.end.toString(16).toUpperCase().padStart(8, '0')}`;
                if (window.notificationSystem && typeof window.notificationSystem.confirm === 'function') {
                    window.notificationSystem.confirm(
                        message,
                        window.I18n ? window.I18n.t('tool.highlights.title') : 'Gerenciar Marcações',
                        () => ipcRenderer.send('delete-highlight', { id: highlightId })
                    );
                    return;
                }

                if (confirm(message)) {
                    ipcRenderer.send('delete-highlight', { id: highlightId });
                }
            } else {
                console.error(`[Highlights] Highlight não encontrado: ${highlightId}`);
            }
        });
    });

    // Eventos dos inputs de comentário
    const commentInputs = tableBody.querySelectorAll('.comment-input');
    
    commentInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            const highlightId = e.target.dataset.highlightId;
            const comment = e.target.value;
            
            // Atualizar localmente
            const highlight = highlights.find(h => String(h.id) === highlightId);
            if (highlight) {
                highlight.comment = comment;
            }
            
            // Enviar para o processo principal
            ipcRenderer.send('update-highlight-comment', { id: highlightId, comment });
        });

        // Impedir propagação do clique para não navegar
        input.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    });

    // Eventos de clique nas linhas (navegação)
    const rows = tableBody.querySelectorAll('tr[data-highlight-id]');
    rows.forEach(row => {
        row.addEventListener('click', (e) => {
            // Não navegar se clicou em input ou botão
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') {
                return;
            }
            
            const highlightId = row.dataset.highlightId;
            const start = parseInt(row.dataset.start);
            const end = parseInt(row.dataset.end);
            ipcRenderer.send('navigate-to-highlight', { id: highlightId, start, end });
        });
    });
}

// Filtrar marcações
function filterHighlights(searchTerm) {
    const rows = tableBody.querySelectorAll('tr[data-highlight-id]');
    const searchLower = searchTerm.toLowerCase();

    rows.forEach(row => {
        const startOffset = row.cells[0]?.textContent || '';
        const endOffset = row.cells[1]?.textContent || '';
        const commentInput = row.querySelector('.comment-input');
        const comment = commentInput?.value || '';

        const matchesSearch = 
            startOffset.toLowerCase().includes(searchLower) ||
            endOffset.toLowerCase().includes(searchLower) ||
            comment.toLowerCase().includes(searchLower);

        row.style.display = matchesSearch ? '' : 'none';
    });
}

// Atualizar contador
function updateCount() {
    if (countDisplay) {
        const singular = window.I18n ? window.I18n.t('tool.highlights.count_singular') : 'marcação';
        const plural = window.I18n ? window.I18n.t('tool.highlights.count_plural') : 'marcações';
        countDisplay.textContent = `(${highlights.length} ${highlights.length === 1 ? singular : plural})`;
    }
}

// Escapar HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event Listeners
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        filterHighlights(e.target.value);
    });
}

if (closeBtn) {
    closeBtn.addEventListener('click', () => {
        ipcRenderer.send('close-highlights-window');
    });
}

if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
        ipcRenderer.send('refresh-highlights');
    });
}

// Atalhos de teclado
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        ipcRenderer.send('close-highlights-window');
    }
});

// Focar no campo de busca ao carregar
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (searchInput) searchInput.focus();
    }, 100);
});
