class FoxyDicasEn {
    constructor() {
        this.modalId = 'foxyDicasEnModal';
        this.titleId = 'dicasEnTitle';
        this.backBtnId = 'btnVoltarEn';
        this.currentTopic = 'inicio';
        this.history = [];
        this.topics = {
            inicio: {
                title: 'Welcome to Foxy Hex Editor!',
                icon: '<img src="assets/foxy.png" alt="Foxy" style="width:40px;height:40px;vertical-align:middle;">',
                content: `
                    <div class="dica-inicio">
                        <div class="foxy-saudacao">
                            <div class="foxy-avatar"><img src="assets/foxy.png" alt="Foxy" style="width:70px;height:70px;"></div>
                            <div class="foxy-mensagem">
                                <p>This guide covers the current features of the editor: navigation, editing, search, bookmarks, analysis, tables, highlights and colors.</p>
                            </div>
                        </div>
                        <div class="topicos-rapidos">
                            <div class="topico-card" onclick="foxyDicasEn.navegarPara('navegacao')"><span class="topico-icon">&#x1F9ED;</span><span class="topico-titulo">1. Navigation</span><span class="topico-desc">Jump to offsets and move precisely</span></div>
                            <div class="topico-card" onclick="foxyDicasEn.navegarPara('edicao')"><span class="topico-icon">&#x270F;&#xFE0F;</span><span class="topico-titulo">2. Editing</span><span class="topico-desc">Enable editing, insert and overwrite</span></div>
                            <div class="topico-card" onclick="foxyDicasEn.navegarPara('busca')"><span class="topico-icon">&#x1F50D;</span><span class="topico-titulo">3. Search</span><span class="topico-desc">Text, hex, regex and external search</span></div>
                            <div class="topico-card" onclick="foxyDicasEn.navegarPara('favoritos')"><span class="topico-icon">&#x1F516;</span><span class="topico-titulo">4. Bookmarks</span><span class="topico-desc">Save offsets with title and comment</span></div>
                            <div class="topico-card" onclick="foxyDicasEn.navegarPara('analise')"><span class="topico-icon">&#x1F4CA;</span><span class="topico-titulo">5. Analysis</span><span class="topico-desc">Understand data, strings and patterns</span></div>
                            <div class="topico-card" onclick="foxyDicasEn.navegarPara('ponteiros')"><span class="topico-icon">&#x1F58D;&#xFE0F;</span><span class="topico-titulo">6. Colors and highlights</span><span class="topico-desc">Adjust visuals and highlight ranges</span></div>
                            <div class="topico-card" onclick="foxyDicasEn.navegarPara('tabelas')"><span class="topico-icon">&#x1F4CB;</span><span class="topico-titulo">7. Tables</span><span class="topico-desc">Models from the Create/Edit Table window</span></div>
                            <div class="topico-card" onclick="foxyDicasEn.navegarPara('atalhos')"><span class="topico-icon">&#x2328;&#xFE0F;</span><span class="topico-titulo">8. Shortcuts</span><span class="topico-desc">The most useful keys and buttons</span></div>
                            <div class="topico-card" onclick="foxyDicasEn.navegarPara('solucao-problemas')"><span class="topico-icon">&#x1F527;</span><span class="topico-titulo">9. Troubleshooting</span><span class="topico-desc">Fix common issues calmly</span></div>
                        </div>
                    </div>
                `
            },
            navegacao: {
                title: 'File navigation',
                icon: '&#x1F9ED;',
                content: `
                    <div class="dica-secao">
                        <h5>Jump to an exact position</h5>
                        <ul>
                            <li><strong>Ctrl+G</strong> or the <strong>Go to Offset...</strong> button.</li>
                            <li>Enter the address in decimal or hexadecimal.</li>
                            <li>Use it when you already know the area you want to inspect or edit.</li>
                            <li>The cursor jumps directly to the requested position.</li>
                        </ul>
                    </div>
                    <div class="dica-secao">
                        <h5>How to move through the editor</h5>
                        <ul>
                            <li><strong>Arrows:</strong> move byte by byte.</li>
                            <li><strong>Page Up/Down:</strong> scroll one screen at a time.</li>
                            <li><strong>Home/End:</strong> jump to the start and end of the current line.</li>
                            <li><strong>Ctrl+Home/End:</strong> jump to the start and end of the file.</li>
                            <li><strong>Tab:</strong> switch between the Hex and Text panes.</li>
                        </ul>
                    </div>
                    <div class="dica-secao">
                        <h5>Large files</h5>
                        <ul>
                            <li>Files above 800 MB use virtual mode so the interface stays responsive.</li>
                            <li>In this mode, the app loads only the visible part that is needed.</li>
                            <li>This helps keep navigation and editing smooth even for huge files.</li>
                        </ul>
                    </div>
                    <div class="dica-secao">
                        <h5>Tab menu</h5>
                        <ul>
                            <li>Right-click an open tab to see more actions.</li>
                            <li>You can close the current tab, close tabs to the left, to the right, or close all except the selected tab.</li>
                        </ul>
                    </div>
                `
            },
            edicao: {
                title: 'Editing data',
                icon: '&#x270F;&#xFE0F;',
                content: `
                    <div class="dica-secao">
                        <h5>When editing is enabled</h5>
                        <ul>
                            <li><strong>Ctrl+E</strong> or <strong>F2</strong> turns editing on and off.</li>
                            <li>When editing is off, the file stays in view-only mode.</li>
                            <li>The Hex pane edits bytes directly; the Text pane edits the decoded content from the active table.</li>
                        </ul>
                    </div>
                    <div class="dica-secao">
                        <h5>Insert and overwrite</h5>
                        <ul>
                            <li><strong>Ctrl+I</strong> or <strong>Insert:</strong> toggles insert and overwrite.</li>
                            <li>In insert mode, new bytes push the following data forward.</li>
                            <li>In overwrite mode, you replace the existing content without shifting the file.</li>
                        </ul>
                    </div>
                    <div class="dica-secao">
                        <h5>Undo and redo</h5>
                        <ul>
                            <li><strong>Ctrl+Z:</strong> undo the last change.</li>
                            <li><strong>Ctrl+Y:</strong> redo what was undone.</li>
                            <li>The history keeps up to 100 edit states.</li>
                        </ul>
                    </div>
                    <div class="dica-secao">
                        <h5>Selection and visual feedback</h5>
                        <ul>
                            <li>Selection is shown in both the Hex and Text panes.</li>
                            <li>The status bar shows offset, selection size, current value, file mode and decoded character.</li>
                            <li>Colors and marks can be adjusted in the customization tools.</li>
                        </ul>
                    </div>
                `
            },
            busca: {
                title: 'Search and replace',
                icon: '&#x1F50D;',
                content: `
                    <div class="dica-secao">
                        <h5>What this window does</h5>
                        <ul>
                            <li><strong>Ctrl+F:</strong> opens the search and replace window for the current file.</li>
                            <li>It works with text, hex and regex inside the open tab.</li>
                            <li>The <strong>Relative Search</strong> tool is separate in the top toolbar and is not part of this window.</li>
                        </ul>
                    </div>
                    <div class="dica-secao">
                        <h5>Search types</h5>
                        <ul>
                            <li><strong>Text:</strong> search readable strings.</li>
                            <li><strong>Hex:</strong> search hexadecimal byte sequences.</li>
                            <li><strong>Regex:</strong> use more flexible patterns.</li>
                        </ul>
                    </div>
                    <div class="dica-secao">
                        <h5>Results</h5>
                        <ul>
                            <li><strong>F3:</strong> next result.</li>
                            <li><strong>Shift+F3:</strong> previous result.</li>
                            <li>Matches are highlighted in the editor.</li>
                            <li>Search across tabs applies to text and stays separate from Relative Search.</li>
                        </ul>
                    </div>
                    <div class="dica-secao">
                        <h5>Relative Search</h5>
                        <ul>
                            <li>It looks for patterns by relationships between values, not by absolute value.</li>
                            <li>Enter a text sequence or a numeric sequence and the tool compares the differences between items in the sequence.</li>
                            <li>Use <strong>Value Scan</strong> to enter numbers separated by spaces or commas.</li>
                            <li>It also supports <strong>8-bit</strong> and <strong>16-bit</strong>, with <strong>LE</strong> or <strong>BE</strong> byte order.</li>
                            <li>The selected result can generate a suggested table to apply to the Hex Editor or send to the <strong>Create/Edit Table</strong> window.</li>
                            <li>The preview can use the current table to show decoded content more accurately.</li>
                        </ul>
                    </div>
                    <div class="dica-secao">
                        <h5>Replacement</h5>
                        <ul>
                            <li>Single replace and replace-all remain available in the search window.</li>
                            <li>Search across tabs applies to text only and does not include the Relative Search tool.</li>
                            <li>If you want to change a relative pattern, use the external tool first and then apply the suggested table.</li>
                        </ul>
                    </div>
                `
            },
            favoritos: {
                title: 'Bookmarks',
                icon: '&#x1F516;',
                content: `
                    <div class="dica-secao">
                        <h5>What they are for</h5>
                        <ul>
                            <li><strong>Ctrl+B:</strong> open bookmarks.</li>
                            <li>Bookmarks are a way to mark important offsets in the file.</li>
                            <li>They help you jump back to areas you want to review or edit later.</li>
                        </ul>
                    </div>
                    <div class="dica-secao">
                        <h5>What each item stores</h5>
                        <ul>
                            <li>Each bookmark stores the offset, an optional title, a comment and the creation date.</li>
                            <li>You can add, edit, remove and jump to bookmarks.</li>
                        </ul>
                    </div>
                    <div class="dica-secao">
                        <h5>Import and export</h5>
                        <ul>
                            <li>Bookmarks can be exported and imported as JSON.</li>
                            <li>This makes it easy to back up your markers or move them to another file.</li>
                        </ul>
                    </div>
                `
            },
            analise: {
                title: 'File analysis',
                icon: '&#x1F4CA;',
                content: `
                    <div class="dica-secao">
                        <h5>What analysis shows</h5>
                        <ul>
                            <li><strong>Analyze:</strong> opens the ROM analysis panel.</li>
                            <li>The panel helps identify strings, data sections, repeated patterns and entropy.</li>
                            <li>This is useful to tell whether the file looks like text, structured data, compression or mixed binary data.</li>
                            <li>Files above 128 MB use sampling to stay responsive.</li>
                        </ul>
                    </div>
                    <div class="dica-secao">
                        <h5>Using it for ROM hacking</h5>
                        <ul>
                            <li>Before analyzing a game script, load the correct <code>.tbl</code> table so decoded strings are shown more accurately.</li>
                            <li>The analysis uses the active table to interpret custom text, including common cases with tags, terminators and simple table sequences.</li>
                            <li>If the text still looks wrong, review the table terminators, DTE/MTE entries and multi-byte pairs.</li>
                        </ul>
                    </div>
                    <div class="dica-secao">
                        <h5>Compression and useful clues</h5>
                        <ul>
                            <li>Findings such as <strong>Yaz0</strong>, <strong>Yay0</strong>, <strong>RNC</strong>, <strong>zlib</strong>, <strong>gzip</strong> and <strong>LZ77/LZ11</strong> candidates appear as compression clues.</li>
                            <li><strong>Compression Signature</strong> means a known header was detected.</li>
                            <li><strong>Compression Hint</strong> means the pattern looks like a valid header, but still needs manual confirmation.</li>
                            <li>High entropy does not always mean compression; it can also be graphics, audio or another dense binary block.</li>
                        </ul>
                    </div>
                    <div class="dica-secao">
                        <h5>Large files</h5>
                        <ul>
                            <li>For very large files, analysis may be partial and sampling-based.</li>
                            <li>In that case, use the found offsets and text clusters as a starting point to inspect similar regions manually.</li>
                            <li>The panel tells you when coverage was partial and shows which active table was used during decoding.</li>
                        </ul>
                    </div>
                `
            },
            ponteiros: {
                title: 'Colors and highlights',
                icon: '&#x1F58D;&#xFE0F;',
                content: `
                    <div class="dica-secao">
                        <h5>Color customization</h5>
                        <ul>
                            <li><strong>Hex:</strong> sets colors for bytes and specific values.</li>
                            <li><strong>Text:</strong> sets colors for decoded content.</li>
                            <li><strong>Background:</strong> changes the editor background area.</li>
                            <li><strong>Font:</strong> adjusts font family and size.</li>
                            <li><strong>Presets:</strong> saves ready-made combinations for later reuse.</li>
                        </ul>
                    </div>
                    <div class="dica-secao">
                        <h5>Highlights</h5>
                        <ul>
                            <li>Highlights are byte ranges with start, end, color and comment.</li>
                            <li>Bookmarks mark a single offset; highlights cover a whole interval.</li>
                            <li>Use them to mark headers, data blocks or any area that needs attention.</li>
                        </ul>
                    </div>
                `
            },
            tabelas: {
                title: 'Character tables',
                icon: '&#x1F4CB;',
                content: `
                    <div class="dica-secao">
                        <h5>What tables are for</h5>
                        <ul>
                            <li>Tables define how bytes are shown as characters in the Text pane.</li>
                            <li>They are important when the file uses special encodings such as 16-bit, Shift-JIS, DTE or MTE.</li>
                            <li>Without the right table, the text can look wrong or unreadable.</li>
                        </ul>
                    </div>
                    <div class="dica-secao">
                        <h5>Preset models</h5>
                        <ul>
                            <li>The ready-made models live in the <strong>Create/Edit Table</strong> window, under <strong>Preset Models</strong>.</li>
                            <li>The current models include <strong>ASCII 8-bit</strong>, <strong>ASCII 16-bit BE</strong>, <strong>ASCII 16-bit LE</strong>, <strong>Shift-JIS</strong>, <strong>DTE</strong>, <strong>MTE</strong>, <strong>DTE+MTE</strong> and <strong>Empty Table</strong>.</li>
                            <li>Use these models as a base and edit them before applying them to the hex editor.</li>
                        </ul>
                    </div>
                    <div class="dica-secao">
                        <h5>Table editor</h5>
                        <ul>
                            <li>The editor lets you create, edit and validate mappings.</li>
                            <li>It works with 8-bit, 16-bit, Shift-JIS, DTE, MTE and DTE+MTE.</li>
                        </ul>
                    </div>
                `
            },
            atalhos: {
                title: 'Keyboard shortcuts',
                icon: '&#x2328;&#xFE0F;',
                content: `
                    <div class="dica-secao">
                        <h5>Top toolbar</h5>
                        <ul>
                            <li><strong>Open:</strong> loads a file for editing.</li>
                            <li><strong>Save:</strong> writes the current changes to disk.</li>
                            <li><strong>Undo / Redo:</strong> go back or reapply changes.</li>
                            <li><strong>Relative Search:</strong> opens the external tool for relative patterns.</li>
                            <li><strong>Help:</strong> opens this guide.</li>
                        </ul>
                    </div>
                    <div class="dica-secao">
                        <h5>File</h5>
                        <ul>
                            <li><strong>Ctrl+O:</strong> open file.</li>
                            <li><strong>Ctrl+S:</strong> save.</li>
                            <li><strong>Ctrl+Shift+S:</strong> save as.</li>
                        </ul>
                    </div>
                    <div class="dica-secao">
                        <h5>Editing</h5>
                        <ul>
                            <li><strong>Ctrl+E</strong> or <strong>F2</strong>: toggle edit mode.</li>
                            <li><strong>Ctrl+I</strong> or <strong>Insert:</strong> toggle insert/overwrite.</li>
                            <li><strong>Ctrl+Z:</strong> undo.</li>
                            <li><strong>Ctrl+Y:</strong> redo.</li>
                        </ul>
                    </div>
                    <div class="dica-secao">
                        <h5>Search and tools</h5>
                        <ul>
                            <li><strong>Ctrl+F:</strong> search and replace.</li>
                            <li><strong>Ctrl+G:</strong> go to offset.</li>
                            <li><strong>Ctrl+B:</strong> open bookmarks.</li>
                            <li><strong>F3 / Shift+F3:</strong> next and previous search result.</li>
                        </ul>
                    </div>
                    <div class="dica-secao">
                        <h5>Navigation</h5>
                        <ul>
                            <li><strong>Arrows:</strong> move the cursor.</li>
                            <li><strong>Page Up/Down:</strong> scroll one page.</li>
                            <li><strong>Home/End:</strong> line start/end.</li>
                            <li><strong>Ctrl+Home/End:</strong> file start/end.</li>
                            <li><strong>Tab:</strong> switch Hex and Text.</li>
                            <li><strong>Right-click a tab:</strong> open the tab context menu.</li>
                        </ul>
                    </div>
                `
            },
            'solucao-problemas': {
                title: 'Troubleshooting',
                icon: '&#x1F527;',
                content: `
                    <div class="dica-secao">
                        <h5>File will not open</h5>
                        <ul>
                            <li>Check permissions, corruption and file size.</li>
                            <li>Large files may take longer to load.</li>
                            <li>If another program is using the file, close it before opening it here.</li>
                        </ul>
                    </div>
                    <div class="dica-secao">
                        <h5>Search finds nothing</h5>
                        <ul>
                            <li>Verify the active table, search type and case sensitivity.</li>
                            <li>If you are using regex, check the syntax.</li>
                            <li>If you are searching text, make sure the current table decodes the content correctly.</li>
                        </ul>
                    </div>
                    <div class="dica-secao">
                        <h5>Edits are not saved</h5>
                        <ul>
                            <li>Make sure edit mode is enabled.</li>
                            <li>Confirm the file is writable and there is enough disk space.</li>
                            <li>If the Save button is disabled, the file may not be open yet or it may be locked.</li>
                        </ul>
                    </div>
                    <div class="dica-secao">
                        <h5>Large file feels slow</h5>
                        <ul>
                            <li>Above 800 MB the app uses virtual mode and reduced cache.</li>
                            <li>Saving still writes the full file back to disk.</li>
                            <li>Closing other open tabs can also reduce memory usage.</li>
                        </ul>
                    </div>
                `
            }
        };

        this.init();
    }

    init() {
        this.createModal();
        this.setupEventListeners();
    }

    createModal() {
        if (document.getElementById(this.modalId)) return;
        const html = `
            <div id="${this.modalId}" class="foxy-dicas-modal" style="display:none;">
                <div class="foxy-dicas-content">
                    <div class="foxy-dicas-header">
                        <div class="foxy-dicas-title"><span id="${this.titleId}"></span></div>
                        <div class="foxy-dicas-controls">
                            <button class="foxy-dicas-btn" onclick="foxyDicasEn.voltar()" id="${this.backBtnId}" style="display:none;">&larr; Back</button>
                            <button class="foxy-dicas-btn" onclick="foxyDicasEn.fechar()">&#x2716; Close</button>
                        </div>
                    </div>
                    <div id="foxyDicasEnContent" class="foxy-dicas-body"></div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen()) this.fechar();
        });
        document.addEventListener('click', (e) => {
            const modal = document.getElementById(this.modalId);
            if (modal && e.target === modal) this.fechar();
        });
    }

    isOpen() {
        const modal = document.getElementById(this.modalId);
        return !!modal && modal.style.display === 'flex';
    }

    abrir() {
        this.currentTopic = 'inicio';
        this.history = [];
        const modal = document.getElementById(this.modalId);
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            this.atualizarConteudo();
        }
    }

    fechar() {
        const modal = document.getElementById(this.modalId);
        if (modal) modal.style.display = 'none';
        document.body.style.overflow = '';
        this.currentTopic = 'inicio';
        this.history = [];
    }

    navegarPara(topic) {
        if (!this.topics[topic]) return;
        if (this.currentTopic && this.currentTopic !== topic) this.history.push(this.currentTopic);
        this.currentTopic = topic;
        this.atualizarConteudo();
    }

    voltar() {
        if (this.history.length > 0) {
            this.currentTopic = this.history.pop();
            this.atualizarConteudo();
        }
    }

    atualizarConteudo() {
        const topic = this.topics[this.currentTopic] || this.topics.inicio;
        const titleEl = document.getElementById(this.titleId);
        const bodyEl = document.getElementById('foxyDicasEnContent');
        const backBtn = document.getElementById(this.backBtnId);
        if (titleEl) titleEl.innerHTML = `${topic.icon || ''} ${topic.title}`;
        if (bodyEl) bodyEl.innerHTML = topic.content;
        if (backBtn) backBtn.style.display = this.history.length > 0 ? 'inline-flex' : 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.foxyDicasEn = new FoxyDicasEn();
});

window.abrirDicasEn = () => {
    if (window.foxyDicasEn) window.foxyDicasEn.abrir();
};

