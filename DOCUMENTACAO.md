# [🇺🇸 English](DOCUMENTATION.md) | [🇧🇷 Português](DOCUMENTACAO.md)

# Foxy Hex Editor

Documentacao atualizada do Foxy Hex Editor, alinhada com o codigo do app nesta base.

## 1. Visao Geral

O Foxy Hex Editor e um editor hexadecimal em Electron, focado em edicao binaria, ROM hacking, tabelas de caracteres e ferramentas auxiliares para traducao.

### Caracteristicas principais

- Visualizacao em tres areas: offset, hex e texto decodificado
- Edicao em modo sobrescrever e modo inserir
- Historico de edicao com limite de 100 estados
- Suporte a arquivos grandes com modo virtual
- Multiplas abas/sessoes de arquivo
- Busca e substituicao, incluindo regex e busca em hex
- Tabelas de caracteres predefinidas e customizadas
- Sistema de favoritos e marcacoes coloridas
- Interface bilingue: PT e EN

## 2. Arquitetura

### 2.1 Tecnologias

| Componente | Tecnologia |
|------------|------------|
| Desktop | Electron 28 |
| Frontend | HTML5, CSS3, JavaScript |
| Processo principal | `electron/main.js` |
| Renderer principal | `index.html` + `js/core/*` |
| Ferramentas auxiliares | `tools/*.html` + `js/tools/renderers/*` |
| Build | `electron-builder` |

### 2.2 Estrutura de processos

- Processo principal: janelas, menu, IPC, arquivos recentes e abertura de ferramentas
- Janela principal: editor hex
- Janelas auxiliares: busca, ir para offset, calculadora, analise, buscas relativas, cores, favoritos, destaques e editor de tabelas

## 3. Estrutura de Diretorios

```text
Foxy Hex Editor/
├── assets/
│   ├── foxy.png
│   ├── icon.ico
│   ├── br.svg
│   ├── brazil-.png
│   ├── us.svg
│   ├── united-states.png
│   └── fonts/
│       ├── Arimo-mono.ttf
│       ├── roboto-mono.ttf
│       ├── jetbrains-mono.ttf
│       └── source-code-pro.ttf
├── css/
│   ├── style.css
│   ├── notifications.css
│   ├── foxy-dicas.css
│   ├── enhanced-scroll-controls.css
│   └── components/save-button.css
├── electron/
│   ├── main.js
│   └── electron_main_handlers.js
├── js/
│   ├── core/
│   │   ├── main.js
│   │   ├── main_key_handling.js
│   │   ├── main_search.js
│   │   ├── main_history.js
│   │   ├── main_bookmarks.js
│   │   ├── main_highlights.js
│   │   ├── main_analysis_core.js
│   │   ├── tab_session_manager.js
│   │   └── enhanced-large-file-handler_*.js
├── js/
│   ├── features/
│   │   ├── editor/
│   │   ├── help/
│   │   └── ui/
│   ├── integration/
│   └── tools/renderers/
├── tools/
│   ├── ...
├── index.html
├── package.json
└── README.md
```

## 4. Testes e Validacao

O projeto possui uma suite automatizada de regressao para busca e substituicao em:

- `tools/tests/search-regression.js`

Script disponivel em `package.json`:

- `npm.cmd run test:search`

Cobertura atual da suite:

- Busca de texto com tabela custom `8-bit`
- Busca chunked com tabela custom
- `Regex` com texto decodificado pela tabela ativa
- `Palavra inteira` com fronteiras baseadas no texto visivel
- Busca e substituicao com tabela custom `8-bit`
- Busca e substituicao com tabela `DTE`
- Busca e substituicao com tabela `Shift-JIS`
- Busca e substituicao com tabela `16-bit`
- Validacao dos bytes gravados apos substituicao

Observacao para Windows/PowerShell:

- Se `npm` estiver bloqueado pela policy de execucao do sistema, use `npm.cmd run test:search`

## 5. Funcionalidades Principais

### 5.1 Edicao hexadecimal

O editor trabalha com duas areas de edicao:

- Hex
- ASCII/texto decodificado

Modos de edicao:

- Visualizacao
- Edicao sobrescrevendo bytes
- Edicao inserindo bytes

### Atalhos de edicao e navegacao

| Atalho | Acao |
|--------|------|
| `Ctrl+O` | Abrir arquivo |
| `Ctrl+S` | Salvar |
| `Ctrl+Shift+S` | Salvar como |
| `Ctrl+Q` | Sair |
| `Ctrl+E` | Alternar modo de edicao |
| `Ctrl+I` | Alternar inserir/sobrescrever |
| `F2` | Alternar modo de edicao |
| `Insert` | Alternar inserir/sobrescrever |
| `Ctrl+Z` | Desfazer |
| `Ctrl+Y` | Refazer |
| `Ctrl+F` | Abrir buscar e substituir |
| `Ctrl+G` | Ir para offset |
| `Ctrl+H` | Abrir calculadora hexadecimal |
| `Ctrl+B` | Abrir favoritos |
| `F3` | Proximo resultado de busca |
| `Shift+F3` | Resultado anterior |
| `Page Up/Down` | Navegacao por pagina |
| `Home/End` | Inicio/fim da linha atual |
| `Ctrl+Home/End` | Inicio/fim do arquivo |
| `Arrow Keys` | Navegacao do cursor |

Observacao: `Home` e `End` atuam na linha atual. `Ctrl+Home` leva ao inicio do arquivo e `Ctrl+End` leva ao fim do arquivo.

### 5.2 Abas de arquivo

- O app suporta multiplas sessoes/arquivos abertos
- Cada sessao preserva cursor, selecao, favoritos, destaques, tabela ativa e estado de edicao
- A lista de abas e renderizada na barra superior de arquivos
- Clique com o botao direito em uma aba aberta para acessar um menu de contexto
- O menu de contexto permite fechar a aba atual, fechar abas a esquerda, fechar abas a direita ou fechar todas, exceto a aba selecionada

### 5.3 Arquivos grandes

Para arquivos maiores, o app entra em modo virtual.

| Parametro | Valor |
|-----------|-------|
| Threshold | 800 MB |
| Chunk de leitura | 64 KB |
| Cache | 256 chunks |
| Cache total | 16 MB |
| Viewport | cerca de 50 linhas visiveis |

Nesse modo:

- O arquivo nao precisa ser carregado inteiro em memoria
- A leitura e feita sob demanda
- A renderizacao mostra apenas a regiao visivel
- O comportamento e otimizado para manter a interface responsiva

### 5.4 Tabelas de caracteres

O editor de tabelas trabalha com:

- `.json`
- `.tbl`

Templates suportados no editor atual:

- Tabela Vazia
- ASCII 8-bit
- ASCII 16-bit BE
- ASCII 16-bit LE
- Shift-JIS
- DTE
- MTE
- DTE+MTE

### 5.4.1 Tabelas e analise de texto

- A analise usa a tabela de caracteres ativa no momento da varredura
- Se uma `.tbl` customizada estiver carregada, as strings encontradas tentam usar essa tabela para decodificacao
- Isso vale especialmente para tabelas `8-bit`, `DTE`, `MTE`, `DTE+MTE`, `Shift-JIS` e `16-bit`
- Terminadores e tags definidos na tabela tambem influenciam como as strings sao separadas no resultado

Uso recomendado para ROM hacking:

- Carregue a tabela correta antes de abrir a analise
- Se o texto parecer quebrado, revise terminadores, tags e entradas multi-byte da tabela
- Em jogos com script comprimido, a analise pode achar apenas cabecalhos de compressao ou pequenas ilhas de texto

### 5.5 Busca

Tipos suportados:

- Texto
- Hexadecimal
- Regex

Ferramenta separada:

- Busca relativa, acessada fora da janela `Buscar e Substituir`

Opcoes presentes no codigo:

- Case sensitive
- Palavras inteiras
- Busca em todas as abas para texto
- Navegacao com `F3` e `Shift+F3`

Limites atuais:

- Busca em todas as abas funciona apenas para texto
- Substituicao em todas as abas ainda nao esta disponivel
- Busca em hex e regex continua restrita ao arquivo atual

### 5.7 Analise para ROM e ISO

A ferramenta de analise foi pensada para apoiar fluxos comuns de ROM hacking e investigacao de imagens de jogo.

O que a analise procura:

- Strings decodificadas pela tabela ativa
- Regioes com concentracao de texto
- Padding em zero e bytes muito repetidos
- Entropia global e por amostragem
- Assinaturas conhecidas de compressao, como `Yaz0`, `Yay0`, `RNC`, `gzip`, `zlib` e candidatos `LZ77/LZ11`
- Estrutura basica de `ISO 9660`, quando encontrada

Como interpretar os resultados:

- `Compression Signature` indica um cabecalho reconhecido
- `Compression Hint` indica um padrao que parece cabecalho valido, mas ainda precisa de confirmacao manual
- Entropia alta sozinha nao prova compressao; tambem pode indicar audio, graficos, video ou dados binarios densos
- Regioes de texto sao bons pontos de partida para procurar ponteiros, controle de script e tabelas de nomes

Arquivos grandes:

- Arquivos grandes podem usar analise por amostragem para manter a interface responsiva
- Nessa situacao, a janela informa cobertura parcial do arquivo
- O resultado deve ser tratado como mapa inicial, nao como inventario completo

Fluxo recomendado para jogos:

- Aplicar a tabela correta
- Rodar a analise
- Abrir uma string ou cluster de texto encontrado
- Verificar se existem ponteiros, blocos de controle ou compressao ao redor
- Marcar offsets importantes com favoritos ou destaques

### 5.6 Favoritos

Favoritos sao marcadores de posicao no arquivo, com:

- Offset
- Titulo
- Comentario
- Timestamp

Funcionalidades:

- Adicionar favorito na posicao atual
- Editar titulo/comentario
- Navegar para o favorito
- Exportar e importar favoritos
- Lista na sidebar

Formato real de exportacao:

```json
{
  "filename": "bookmarks.json",
  "created": "2024-01-15T10:30:00Z",
  "bookmarks": [
    {
      "id": 1,
      "offset": 2048,
      "title": "Inicio do Texto",
      "comment": "Localizacao do script",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### 5.7 Marcacoes coloridas

O sistema de highlights atual e baseado em selecao de intervalo:

- Um highlight cobre um range continuo de bytes
- Cada highlight tem `start`, `end`, `comment`, `color`, `id` e `created`
- A selecao pode ser navegada e destacada no editor
- Destaques podem ser exportados e importados em JSON

O export atual retorna um objeto com:

- `highlights`
- `version`
- `created`

### 5.8 Analise de ROM

O modulo de analise faz:

- Detecao de formato
- Contagem e analise de seccoes
- Extracao de strings
- Calculo de entropia
- Exibicao dos resultados na sidebar e na janela de analise

Em arquivos grandes, a analise usa amostragem para manter a interface fluida.

## 6. Interface do Usuario

### 6.1 Layout principal

- Header com abrir, salvar, desfazer, refazer, analise, busca relativa, ajuda e troca de idioma
- Control bar com modo de edicao, inserir/sobrescrever, buscar, ir para offset, calculadora e cores
- Barra de abas de arquivos
- Sidebar com favoritos, historico, analise e tabela
- Area principal do editor hex
- Barra de status inferior

### 6.2 Sidebar

Abas disponiveis:

1. Favoritos
2. Historico
3. Analise
4. Tabela

### 6.3 Modais e janelas auxiliares

| Tela | Funcao | Acesso |
|------|--------|--------|
| Buscar e Substituir | Busca e replace | `Ctrl+F` |
| Ir para Offset | Navegacao direta | `Ctrl+G` |
| Calculadora Hex | Conversoes e operacoes | `Ctrl+H` |
| Favoritos | Adicionar/editar bookmark | `Ctrl+B` |
| Marcacoes | Gerenciar highlights | Toolbar / janela da ferramenta |
| Cores | Personalizar paleta | Toolbar / janela da ferramenta |
| Busca Relativa | Encontrar padroes relativos | Toolbar / menu de ferramentas |
| Analise | Resultados da analise | Botao `Analisar` / menu de ferramentas |
| Editor de Tabelas | Criar/editar tabelas | A partir da ferramenta de busca relativa |

## 7. Sistemas Internos

### 7.1 Historico

- Historico com limite de 100 estados
- Armazena snapshot, cursor e bytes modificados
- Funciona durante a sessao
- E reinicializado quando um novo arquivo e carregado ou quando o estado interno e resetado

### 7.2 Renderizacao

- O editor usa renderizacao virtual para arquivos grandes
- O scroll calcula a viewport visivel
- As cores sao aplicadas dinamicamente via CSS e JavaScript

### 7.3 Selecao

Tipos práticos de selecao:

- Cursor em byte unico
- Range continuo

Operacoes comuns:

- Copiar
- Colar
- Excluir
- Importar sobre selecao

### 7.4 Notificacoes

- `success`
- `error`
- `warning`
- `info`

Elas aparecem como toast no canto superior direito e desaparecem automaticamente.

## 8. Ferramentas Externas

### 8.1 Busca e Substituicao

Arquivo: `tools/search_tool.html`

Funcionalidades:

- Busca em janela dedicada
- Sincronizacao com a janela principal
- Navegacao por resultados
- Substituicao individual ou em massa
- Opcoes de case sensitive, regex, palavras inteiras e busca em todas as abas

Observacao importante:

- Busca em todas as abas vale apenas para texto
- Substituir em todas as abas ainda nao existe nesta versao

### 8.2 Calculadora hexadecimal

Arquivo: `tools/calc_tool.html`

Funcionalidades:

- Conversao HEX / DEC / BIN
- Operacoes aritmeticas
- Historico de calculos
- Copia do resultado

### 8.3 Analise de ROM

Arquivo: `tools/analysis_tool.html`

Funcionalidades:

- Analise detalhada em janela separada
- Seccoes de dados
- Strings encontradas
- Entropia
- Relatorio

### 8.4 Personalizacao de cores

Arquivo: `tools/color_customization_tool.html`

Funcionalidades:

- Paletas predefinidas
- Cores por byte hexadecimal
- Cores do texto decodificado
- Cores de fundo
- Fonte e tamanho do editor
- Preview em tempo real

### 8.5 Busca relativa

Arquivo: `tools/relative_search_tool.html`

Funcionalidades:

- Busca por padroes relativos
- Aplicacao de tabelas de caracteres
- Exportacao/uso de tabelas
- Busca em arquivos e ROMs com codificacao customizada

### 8.6 Editor de tabelas

Arquivo: `tools/table_editor_tool.html`

Funcionalidades:

- Criacao e edicao de tabelas
- Suporte a `.json` e `.tbl`
- Templates predefinidos

### 8.7 Marcacoes

Arquivo: `tools/highlights_tool.html`

Funcionalidades:

- Listagem de highlights
- Edicao de comentario
- Navegacao para o range
- Remocao
- Atualizacao em tempo real com a janela principal
- É possivel selecionar todo o trecho de uma marcação clicando com o botão direito do mouse sobre ela e selecionar a opção "Selecionar Marcação Inteira".

### 8.8 Favoritos

Arquivo: `tools/bookmark_tool.html`

Funcionalidades:

- Criacao e edicao de favoritos
- Offset atual
- Titulo e comentario
- Cancelamento do cadastro

## 8. Internacionalização

O app suporta PT e EN.

### 8.1 Interface

- A troca de idioma atualiza textos da interface e das janelas
- O arquivo principal usa `js/core/i18n.js`

### 8.2 Menu do Electron

- O menu tambem tem traducao PT/EN
- O idioma do menu e salvo em `menu_language.json` dentro do `userData`

## 10. Manipulacao de arquivos

### 10.1 Abertura

Fluxo para arquivos normais:

1. Dialogo de arquivo
2. Leitura do arquivo
3. Conversao para `Uint8Array`
4. Carregamento no editor

Fluxo para arquivos grandes:

1. Dialogo de arquivo
2. `EnhancedLargeFileHandler.loadLargeFile(file)`
3. Mapeamento virtual em chunks
4. Renderizacao parcial da viewport
5. Leitura sob demanda via IPC

### 10.2 Salvamento

- O app suporta salvar o arquivo atual
- O sistema de salvamento integra com os mecanismos de protecao e estado do editor
- Para arquivos grandes, a camada de integracao trabalha com chunks

### 10.3 Arquivos recentes

- Maximo de 3 arquivos
- Persistido em `recent_files.json` dentro do `userData`
- O menu `Arquivo` mostra os recentes
- Nao ha atalhos dedicados para abrir recentes no codigo atual

## 11. Extensibilidade

### 11.1 Modulos

O codigo principal foi quebrado em varios modulos para facilitar manutencao, por exemplo:

- `main_file_operations.js`
- `main_editing_operations.js`
- `main_history.js`
- `main_search.js`
- `main_bookmarks.js`
- `main_highlights.js`
- `main_analysis_core.js`
- `tab_session_manager.js`

### 11.2 Nova ferramenta

Para adicionar uma ferramenta nova:

1. Criar `tools/nova_ferramenta.html`
2. Criar `js/tools/renderers/nova_ferramenta_renderer.js`
3. Adicionar handlers no `electron/main.js`
4. Abrir a janela via menu ou botao

## 12. Formatos de arquivo

### 12.1 Tabela `.tbl`

```text
00= 
41=A
42=B
FF=[END]
```

### 12.2 Tabela `.json`

```json
{
  "name": "ASCII 8-bit",
  "type": "8-bit",
  "endianness": "BE",
  "mappings": {
    "0x00": " ",
    "0x41": "A",
    "0x42": "B"
  }
}
```

### 12.3 Favoritos `.json`

O formato real segue o exemplo da secao 5.6.

## 13. Configuracoes e arquivos de usuario

Arquivos que o app usa em `userData`:

| Arquivo | Uso |
|---------|-----|
| `recent_files.json` | Lista de arquivos recentes |
| `menu_language.json` | Idioma do menu |

## 14. Atalhos resumidos

### Gerais

- `Ctrl+O`: abrir
- `Ctrl+S`: salvar
- `Ctrl+Shift+S`: salvar como
- `Ctrl+Q`: sair

### Edição

- `Ctrl+E`: alternar modo de edicao
- `Ctrl+I`: alternar inserir/sobrescrever
- `F2`: alternar modo de edicao
- `Insert`: alternar inserir/sobrescrever
- `Ctrl+Z`: desfazer
- `Ctrl+Y`: refazer

### Ferramentas

- `Ctrl+F`: buscar e substituir
- `Ctrl+G`: ir para offset
- `Ctrl+H`: calculadora
- `Ctrl+B`: favoritos

### Busca

- `F3`: proximo resultado
- `Shift+F3`: resultado anterior

### Navegacao

- `Home`: inicio da linha atual
- `End`: fim da linha atual
- `Ctrl+Home`: inicio do arquivo
- `Ctrl+End`: fim do arquivo

---

Ultima atualizacao: abril de 2026
