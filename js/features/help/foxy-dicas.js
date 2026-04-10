class FoxyDicas {
    constructor() {
        this.modalId = 'foxyDicasModal';
        this.titleId = 'dicasTitle';
        this.backBtnId = 'btnVoltar';
        this.currentTopic = 'inicio';
        this.history = [];
        this.topics = {
            inicio: {
                title: 'Bem-vindo(a) ao Foxy Hex Editor!',
                icon: '<img src="assets/foxy.png" alt="Foxy" style="width:40px;height:40px;vertical-align:middle;">',
                content: `
                    <div class="dica-inicio">
                        <div class="foxy-saudacao">
                            <div class="foxy-avatar"><img src="assets/foxy.png" alt="Foxy" style="width:70px;height:70px;"></div>
                            <div class="foxy-mensagem">
                                <p>Este guia resume os recursos atuais do editor: navega&ccedil;&atilde;o, edi&ccedil;&atilde;o, busca, favoritos, an&aacute;lise, tabelas, marcas e cores.</p>
                            </div>
                        </div>
                        <div class="topicos-rapidos">
                            <div class="topico-card" onclick="foxyDicas.navegarPara('navegacao')"><span class="topico-icon">&#x1F9ED;</span><span class="topico-titulo">1. Navega&ccedil;&atilde;o</span><span class="topico-desc">Ir para offsets e se mover com precis&atilde;o</span></div>
                            <div class="topico-card" onclick="foxyDicas.navegarPara('edicao')"><span class="topico-icon">&#x270F;&#xFE0F;</span><span class="topico-titulo">2. Edi&ccedil;&atilde;o</span><span class="topico-desc">Ativar edi&ccedil;&atilde;o, inserir e sobrescrever</span></div>
                            <div class="topico-card" onclick="foxyDicas.navegarPara('busca')"><span class="topico-icon">&#x1F50D;</span><span class="topico-titulo">3. Busca</span><span class="topico-desc">Texto, hex, regex e busca externa</span></div>
                            <div class="topico-card" onclick="foxyDicas.navegarPara('favoritos')"><span class="topico-icon">&#x1F516;</span><span class="topico-titulo">4. Favoritos</span><span class="topico-desc">Salvar offsets com t&iacute;tulo e coment&aacute;rio</span></div>
                            <div class="topico-card" onclick="foxyDicas.navegarPara('analise')"><span class="topico-icon">&#x1F4CA;</span><span class="topico-titulo">5. An&aacute;lise</span><span class="topico-desc">Entender dados, strings e padr&otilde;es</span></div>
                            <div class="topico-card" onclick="foxyDicas.navegarPara('ponteiros')"><span class="topico-icon">&#x1F58D;&#xFE0F;</span><span class="topico-titulo">6. Cores e marca&ccedil;&otilde;es</span><span class="topico-desc">Ajustar visual e destacar intervalos</span></div>
                            <div class="topico-card" onclick="foxyDicas.navegarPara('tabelas')"><span class="topico-icon">&#x1F4CB;</span><span class="topico-titulo">7. Tabelas</span><span class="topico-desc">Modelos da janela Criar/Editar Tabela</span></div>
                            <div class="topico-card" onclick="foxyDicas.navegarPara('atalhos')"><span class="topico-icon">&#x2328;&#xFE0F;</span><span class="topico-titulo">8. Atalhos</span><span class="topico-desc">Teclas e bot&otilde;es mais &uacute;teis</span></div>
                            <div class="topico-card" onclick="foxyDicas.navegarPara('solucao-problemas')"><span class="topico-icon">&#x1F527;</span><span class="topico-titulo">9. Problemas</span><span class="topico-desc">Solu&ccedil;&otilde;es para erros comuns</span></div>
                        </div>
                    </div>
                `
            },
            navegacao: {
                title: 'Navega&ccedil;&atilde;o pelo arquivo',
                icon: '&#x1F9ED;',
                content: `
                    <div class="dica-secao">
                        <h5>Ir para um ponto exato do arquivo</h5>
                        <ul>
                            <li><strong>Ctrl+G</strong> ou <strong>Ir para Offset...</strong>.</li>
                            <li>Digite o endere&ccedil;o em decimal ou hexadecimal.</li>
                            <li>Use isso quando j&aacute; souber o trecho que quer conferir ou editar.</li>
                            <li>O cursor vai direto para a posi&ccedil;&atilde;o informada.</li>
                        </ul>
                    </div>
                    <div class="dica-secao">
                        <h5>Como se mover no editor</h5>
                        <ul>
                            <li><strong>Setas:</strong> movem o cursor byte a byte.</li>
                            <li><strong>Page Up/Down:</strong> rolam uma tela por vez.</li>
                            <li><strong>Home/End:</strong> v&atilde;o para o in&iacute;cio e o fim da linha atual.</li>
                            <li><strong>Ctrl+Home/End:</strong> v&atilde;o para o in&iacute;cio e o fim do arquivo.</li>
                            <li><strong>Tab:</strong> alterna entre Hex e Texto.</li>
                        </ul>
                    </div>
                    <div class="dica-secao">
                        <h5>Arquivos grandes</h5>
                        <ul>
                            <li>Acima de 800 MB o editor usa modo virtual para n&atilde;o travar a interface.</li>
                            <li>Nesse modo, o app carrega apenas o trecho necess&aacute;rio na tela.</li>
                            <li>Isso ajuda a manter navega&ccedil;&atilde;o e edi&ccedil;&atilde;o fluindo mesmo em arquivos enormes.</li>
                        </ul>
                    </div>
                `
            },
            edicao: {
                title: 'Editando dados',
                icon: '&#x270F;&#xFE0F;',
                content: `
                    <div class="dica-secao">
                        <h5>Quando a edi&ccedil;&atilde;o est&aacute; ligada</h5>
                        <ul>
                            <li><strong>Ctrl+E</strong> ou <strong>F2</strong> liga e desliga a edi&ccedil;&atilde;o.</li>
                            <li>Quando a edi&ccedil;&atilde;o est&aacute; desligada, o arquivo fica apenas para visualiza&ccedil;&atilde;o.</li>
                            <li>O painel Hex altera bytes diretamente; o painel Texto altera o conte&uacute;do decodificado pela tabela ativa.</li>
                        </ul>
                    </div>
                    <div class="dica-secao">
                        <h5>Inserir e sobrescrever</h5>
                        <ul>
                            <li><strong>Ctrl+I</strong> ou <strong>Insert</strong> alterna entre inserir e sobrescrever.</li>
                            <li>No modo inserir, os bytes novos empurram os dados seguintes para frente.</li>
                            <li>No modo sobrescrever, voc&ecirc; troca o conte&uacute;do sem deslocar o arquivo.</li>
                        </ul>
                    </div>
                    <div class="dica-secao">
                        <h5>Desfazer e refazer</h5>
                        <ul>
                            <li><strong>Ctrl+Z</strong> desfaz a &uacute;ltima altera&ccedil;&atilde;o.</li>
                            <li><strong>Ctrl+Y</strong> refaz o que foi desfeito.</li>
                            <li>O hist&oacute;rico guarda at&eacute; 100 estados de edi&ccedil;&atilde;o.</li>
                        </ul>
                    </div>
                `
            },
            busca: {
                title: 'Busca e substitui&ccedil;&atilde;o',
                icon: '&#x1F50D;',
                content: `
                    <div class="dica-secao">
                        <h5>O que esta janela faz</h5>
                        <ul>
                            <li><strong>Ctrl+F</strong> abre a janela de busca e substitui&ccedil;&atilde;o do arquivo atual.</li>
                            <li>Ela trabalha com texto, hexadecimal e regex dentro da aba aberta.</li>
                            <li>A ferramenta <strong>Busca Relativa</strong> fica separada na barra superior.</li>
                        </ul>
                    </div>
                    <div class="dica-secao">
                        <h5>Tipos de busca</h5>
                        <ul>
                            <li><strong>Texto:</strong> strings leg&iacute;veis.</li>
                            <li><strong>Hex:</strong> sequ&ecirc;ncias de bytes em hexadecimal.</li>
                            <li><strong>Regex:</strong> padr&otilde;es mais flex&iacute;veis.</li>
                        </ul>
                    </div>
                    <div class="dica-secao">
                        <h5>Resultados</h5>
                        <ul>
                            <li><strong>F3</strong> pr&oacute;ximo resultado.</li>
                            <li><strong>Shift+F3</strong> resultado anterior.</li>
                            <li>Os achados ficam destacados no editor.</li>
                        </ul>
                    </div>
                `
            },
            favoritos: {
                title: 'Favoritos',
                icon: '&#x1F516;',
                content: `
                    <div class="dica-secao">
                        <h5>Para que servem</h5>
                        <ul>
                            <li><strong>Ctrl+B</strong> abre a janela de favoritos.</li>
                            <li>Favoritos servem para marcar offsets importantes no arquivo.</li>
                            <li>Isso ajuda a voltar rapidamente a trechos que voc&ecirc; quer revisar ou editar depois.</li>
                        </ul>
                    </div>
                    <div class="dica-secao">
                        <h5>O que cada item guarda</h5>
                        <ul>
                            <li>Cada favorito salva o offset, um t&iacute;tulo opcional, um coment&aacute;rio e a data de cria&ccedil;&atilde;o.</li>
                            <li>Voc&ecirc; pode adicionar, editar, remover e navegar pelos favoritos.</li>
                        </ul>
                    </div>
                `
            },
            analise: {
                title: 'An&aacute;lise do arquivo',
                icon: '&#x1F4CA;',
                content: `
                    <div class="dica-secao">
                        <h5>O que a an&aacute;lise mostra</h5>
                        <ul>
                            <li><strong>Analisar:</strong> abre o painel de an&aacute;lise da ROM.</li>
                            <li>O painel ajuda a identificar strings, se&ccedil;&otilde;es de dados, padr&otilde;es repetidos e entropia.</li>
                            <li>Isso &eacute; &uacute;til para perceber se o arquivo parece texto, dados organizados, compress&atilde;o ou bin&aacute;rio misto.</li>
                            <li>Arquivos acima de 128 MB usam amostragem para manter a resposta r&aacute;pida.</li>
                        </ul>
                    </div>
                    <div class="dica-secao">
                        <h5>Uso com ROM hacking</h5>
                        <ul>
                            <li>Antes de analisar script de jogo, carregue a tabela <code>.tbl</code> correta para ver as strings decodificadas com mais precis&atilde;o.</li>
                            <li>A an&aacute;lise usa a tabela ativa para interpretar texto custom, inclusive cen&aacute;rios comuns com tags, terminadores e sequ&ecirc;ncias simples.</li>
                            <li>Se o texto sair estranho, revise terminadores, entradas DTE/MTE e pares multi-byte da tabela.</li>
                        </ul>
                    </div>
                    <div class="dica-secao">
                        <h5>Compress&atilde;o e pistas &uacute;teis</h5>
                        <ul>
                            <li>Achados como <strong>Yaz0</strong>, <strong>Yay0</strong>, <strong>RNC</strong>, <strong>zlib</strong>, <strong>gzip</strong> e candidatos <strong>LZ77/LZ11</strong> aparecem como pistas de compress&atilde;o.</li>
                            <li><strong>Compression Signature</strong> quer dizer que um cabe&ccedil;alho conhecido foi detectado.</li>
                            <li><strong>Compression Hint</strong> quer dizer que existe um padr&atilde;o parecido com cabe&ccedil;alho, mas ainda precisa de confirma&ccedil;&atilde;o manual.</li>
                            <li>Entropia alta nem sempre significa compress&atilde;o; pode ser gr&aacute;fico, &aacute;udio ou outro bloco bin&aacute;rio denso.</li>
                        </ul>
                    </div>
                    <div class="dica-secao">
                        <h5>Arquivos grandes</h5>
                        <ul>
                            <li>Se o arquivo for muito grande, a an&aacute;lise pode ser parcial por amostragem.</li>
                            <li>Nesse caso, use os offsets e clusters de texto encontrados como ponto de partida para investigar regi&otilde;es parecidas manualmente.</li>
                            <li>O painel informa quando a cobertura foi parcial e mostra a tabela ativa usada na leitura.</li>
                        </ul>
                    </div>
                `
            },
            ponteiros: {
                title: 'Cores e marca&ccedil;&otilde;es',
                icon: '&#x1F58D;&#xFE0F;',
                content: `
                    <div class="dica-secao">
                        <h5>Personaliza&ccedil;&atilde;o de cores</h5>
                        <ul>
                            <li><strong>Hex:</strong> define cores para bytes e valores espec&iacute;ficos.</li>
                            <li><strong>Texto:</strong> define cores para o conte&uacute;do decodificado.</li>
                            <li><strong>Fundo:</strong> altera a cor de fundo da &aacute;rea do editor.</li>
                            <li><strong>Fonte:</strong> ajusta fam&iacute;lia e tamanho da fonte.</li>
                            <li><strong>Predefini&ccedil;&otilde;es:</strong> salva combina&ccedil;&otilde;es prontas para reaplicar depois.</li>
                        </ul>
                    </div>
                    <div class="dica-secao">
                        <h5>Marca&ccedil;&otilde;es</h5>
                        <ul>
                            <li>Marca&ccedil;&otilde;es s&atilde;o intervalos de bytes com in&iacute;cio, fim, cor e coment&aacute;rio.</li>
                            <li>Favoritos marcam um &uacute;nico offset; marca&ccedil;&otilde;es cobrem um trecho inteiro.</li>
                            <li>Use isso para destacar &aacute;reas importantes, como cabe&ccedil;alhos, blocos de dados ou regi&otilde;es que precisam de aten&ccedil;&atilde;o.</li>
                        </ul>
                    </div>
                `
            },
            tabelas: {
                title: 'Tabelas de caracteres',
                icon: '&#x1F4CB;',
                content: `
                    <div class="dica-secao">
                        <h5>Para que servem</h5>
                        <ul>
                            <li>As tabelas definem como bytes viram caracteres no painel Texto.</li>
                            <li>Elas s&atilde;o importantes quando o arquivo usa codifica&ccedil;&otilde;es especiais, como 16-bit, Shift-JIS, DTE ou MTE.</li>
                            <li>Sem a tabela correta, o texto pode parecer estranho ou ileg&iacute;vel.</li>
                        </ul>
                    </div>
                    <div class="dica-secao">
                        <h5>Modelos prontos</h5>
                        <ul>
                            <li>Os modelos atuais incluem ASCII 8-bit, ASCII 16-bit BE/LE, Shift-JIS, DTE, MTE, DTE+MTE e Tabela Vazia.</li>
                            <li>Use esses modelos como base e ajuste o conte&uacute;do antes de aplicar no editor.</li>
                        </ul>
                    </div>
                `
            },
            atalhos: {
                title: 'Atalhos de teclado',
                icon: '&#x2328;&#xFE0F;',
                content: `
                    <div class="dica-secao">
                        <h5>Atalhos principais</h5>
                        <ul>
                            <li><strong>Ctrl+O</strong> abrir arquivo</li>
                            <li><strong>Ctrl+S</strong> salvar</li>
                            <li><strong>Ctrl+F</strong> buscar</li>
                            <li><strong>Ctrl+G</strong> ir para offset</li>
                            <li><strong>Ctrl+B</strong> favoritos</li>
                            <li><strong>Ctrl+E</strong> alternar edi&ccedil;&atilde;o</li>
                            <li><strong>Ctrl+I</strong> inserir/sobrescrever</li>
                            <li><strong>F3</strong> pr&oacute;ximo resultado</li>
                        </ul>
                    </div>
                `
            },
            'solucao-problemas': {
                title: 'Solu&ccedil;&atilde;o de problemas',
                icon: '&#x1F527;',
                content: `
                    <div class="dica-secao">
                        <h5>Dicas r&aacute;pidas</h5>
                        <ul>
                            <li>Se o texto parecer quebrado, revise a tabela ativa.</li>
                            <li>Se a busca n&atilde;o achar texto, confirme se o tipo de busca est&aacute; correto.</li>
                            <li>Se o arquivo grande ficar lento, feche outras abas e aguarde a leitura virtual.</li>
                            <li>Se uma altera&ccedil;&atilde;o n&atilde;o puder ser salva, verifique permiss&atilde;o de escrita.</li>
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
                            <button class="foxy-dicas-btn" onclick="foxyDicas.voltar()" id="${this.backBtnId}" style="display:none;">&larr; Voltar</button>
                            <button class="foxy-dicas-btn" onclick="foxyDicas.fechar()">&#x2716; Fechar</button>
                        </div>
                    </div>
                    <div id="foxyDicasContent" class="foxy-dicas-body"></div>
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
        const bodyEl = document.getElementById('foxyDicasContent');
        const backBtn = document.getElementById(this.backBtnId);
        if (titleEl) titleEl.innerHTML = `${topic.icon || ''} ${topic.title}`;
        if (bodyEl) bodyEl.innerHTML = topic.content;
        if (backBtn) backBtn.style.display = this.history.length > 0 ? 'inline-flex' : 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.foxyDicas = new FoxyDicas();
});

window.abrirDicas = () => {
    if (window.foxyDicas) window.foxyDicas.abrir();
};
