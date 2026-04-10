/**
 * Sistema de Internacionalização (i18n) do Foxy Hex Editor
 * Suporte: Português (PT) e English (EN)
 */

const I18n = {
    // Idioma atual
    currentLang: 'pt',

    // Armazenamento das traduções
    translations: {
        pt: {
            // Botão de idioma
            'lang.title': 'Mudar idioma',
            'lang.tooltip': 'Alterar entre Português e English',
            'lang.changed.pt': 'Idioma alterado para Português',
            'lang.changed.en': 'Idioma alterado para English',

            // Toolbar
            'toolbar.open': 'Abrir',
            'toolbar.open.tooltip': 'Abrir um arquivo para edição',
            'toolbar.save': 'Salvar',
            'toolbar.save.tooltip': 'Salvar alterações no arquivo atual',
            'toolbar.undo': 'Desfazer',
            'toolbar.undo.tooltip': 'Desfazer última ação',
            'toolbar.redo': 'Refazer',
            'toolbar.redo.tooltip': 'Refazer ação desfeita',
            'toolbar.highlights': 'Marcações',
            'toolbar.highlights.tooltip': 'Gerenciar marcações coloridas',
            'toolbar.analyze': 'Analisar',
            'toolbar.analyze.tooltip': 'Analisar a estrutura da ROM',
            'toolbar.relative_search': 'Busca Relativa',
            'toolbar.relative_search.tooltip': 'Abrir a ferramenta integrada',
            'toolbar.relative_search.no_file': 'Abra um arquivo antes de usar a Busca Relativa.',
            'toolbar.relative_search.unsaved_large': 'A aba atual tem alterações não salvas em um arquivo grande. Salve antes de abrir a Busca Relativa.',
            'toolbar.pointers': 'Ponteiros',
            'toolbar.pointers.tooltip': 'Detectar e gerenciar ponteiros',
            'toolbar.help': 'Ajuda',
            'toolbar.help.tooltip': 'Ver dicas e atalhos do editor',

            // Modo de edição
            'mode.view': 'Modo Visualização',
            'mode.edit': 'Modo Edição',
            'mode.view_only': 'Apenas Visualização',
            'mode.edit.tooltip': 'Alternar entre modo de visualização e edição',
            'mode.edit.enable': 'Habilitar Edição',
            'mode.edit.disable': 'Desabilitar Edição',
            'mode.insert': 'Inserir',
            'mode.overwrite': 'Sobrescrever',
            'mode.insert.tooltip': 'Alternar entre inserir e sobrescrever bytes',

            // Control bar
            'control.find': 'Buscar e Substituir',
            'control.find.tooltip': 'Buscar e substituir valores no arquivo',
            'control.goto': 'Ir para Offset...',
            'control.goto.tooltip': 'Navegar para um offset específico',
            'control.calc': 'Calculadora Hex',
            'control.calc.tooltip': 'Calculadora hexadecimal integrada',
            'control.colors': 'Customizar',
            'control.colors.tooltip': 'Personalizar cores e fonte do editor',

            // Sidebar
            'sidebar.bookmarks': 'Favoritos',
            'sidebar.history': 'Histórico',
            'sidebar.analysis': 'Análise',
            'sidebar.chartable': 'Tabela',
            'sidebar.add_bookmark': 'Adicionar Favorito',
            'sidebar.export_bookmarks': 'Exportar Favoritos',
            'sidebar.import_bookmarks': 'Importar Favoritos',
            'sidebar.no_bookmarks': 'Nenhum favorito ainda',
            'sidebar.no_bookmarks_hint': 'Clique em "Adicionar Favorito" para criar seu primeiro favorito',
            'sidebar.no_bookmarks_full': 'Nenhum favorito ainda<br><small>Clique em "Adicionar Favorito" para criar seu primeiro favorito</small>',
            'sidebar.edit_stats': 'Estatísticas de Edição',
            'sidebar.total_edits': 'Total de edições:',
            'sidebar.bytes_modified': 'Bytes modificados:',
            'sidebar.file_size': 'Tamanho do arquivo:',
            'sidebar.unsaved_changes': 'Alterações não salvas:',
            'sidebar.rom_info': 'Informações da ROM',
            'sidebar.rom_type': 'Tipo:',
            'sidebar.rom_size': 'Tamanho:',
            'sidebar.rom_format': 'Formato:',
            'sidebar.data_sections': 'Seções de Dados',
            'sidebar.text_strings': 'Strings de Texto',
            'sidebar.stats': 'Estatísticas',
            'sidebar.search_results': 'Resultados da busca:',
            'sidebar.current_match': 'Correspondência atual:',
            'sidebar.total_bookmarks': 'Total de favoritos:',
            'sidebar.entropy': 'Entropia:',
            'sidebar.data_patterns': 'Padrões de Dados',
            'sidebar.entropy_analysis': 'Análise de Entropia',
            'sidebar.char_table_title': 'Visualização do Mapeamento de Caracteres',
            'sidebar.table_editor': 'Criar/Editar Tabela',

            // Header
            'header.decoded_text': 'Texto',
            'sidebar.select_table': 'Selecionar Tabela',
            'sidebar.load_table': 'Carregar Tabela',
            // Status bar
            'status.position': 'Posição:',
            'status.selection': 'Seleção:',
            'status.hex': 'Hex:',
            'status.file': 'Arquivo:',
            'status.no_file': 'Nenhum arquivo carregado',
            'status.modified': 'Modificado',
            'status.not_modified': 'Não modificado',
            'status.char': 'Caractere:',
            'status.table': 'Tabela:',
            'status.search_found': 'encontrado(s)',
            'status.panel_hex': 'HEX',
            'status.panel_text': 'TEXTO',

            // Modais
            'modal.bookmark.title': 'Adicionar Favorito',
            'modal.bookmark.placeholder_title': 'Título do favorito (opcional)',
            'modal.bookmark.placeholder_comment': 'Comentário ou descrição',
            'modal.bookmark.offset': 'Offset:',
            'modal.bookmark.cancel': 'Cancelar',
            'modal.bookmark.add': 'Adicionar Favorito',

            'modal.find.title': 'Buscar e Substituir',
            'modal.find.drag': 'Arrastar',
            'modal.find.search_label': 'Buscar:',
            'modal.find.search_placeholder': 'Buscar (hex: FF AA BB ou texto: HELLO)',
            'modal.find.replace_label': 'Substituir por:',
            'modal.find.replace_placeholder': 'Substituir por (hex: 00 11 22 ou texto: WORLD)',
            'modal.find.case_sensitive': 'Diferenciar Maiúsculas',
            'modal.find.whole_word': 'Coincidir Palavra Inteira',
            'modal.find.regex': 'Regex',
            'modal.find.replace_all': 'Substituir Todos',
            'modal.find.next': 'Próximo',
            'modal.find.previous': 'Anterior',
            'modal.find.search': 'Buscar',
            'modal.find.replace': 'Substituir',
            'modal.find.cancel': 'Cancelar',

            'modal.analysis.title': 'Resultados da Análise de ROM',
            'modal.analysis.close': 'Fechar',
            'modal.analysis.export': 'Exportar Relatório',

            'modal.chartable.title': 'Seleção de Tabela de Caracteres',
            'modal.chartable.ascii': 'ASCII Padrão',
            'modal.chartable.ascii_desc': 'Conjunto de caracteres ASCII padrão (32-126)',
            'modal.chartable.nes': 'NES Padrão',
            'modal.chartable.nes_desc': 'Mapeamento de caracteres NES comum',
            'modal.chartable.snes': 'SNES Padrão',
            'modal.chartable.snes_desc': 'Codificação de texto SNES',
            'modal.chartable.gb': 'Game Boy Padrão',
            'modal.chartable.gb_desc': 'Conjunto de caracteres Game Boy',
            'modal.chartable.load': 'Carregar Tabela...',
            'modal.chartable.load_desc': 'Carregar arquivo no formato Foxy Editor em .json ou .tbl',
            'modal.chartable.cancel': 'Cancelar',
            'modal.chartable.apply': 'Aplicar',

            // Notificações
            'notif.file_opened': 'Arquivo aberto',
            'notif.file_saved': 'Arquivo salvo',
            'notif.bookmark_added': 'Favorito adicionado',
            'notif.search_complete': 'Busca concluída',
            'notif.error': 'Erro',
            'notif.warning': 'Aviso',
            'notif.success': 'Sucesso',
            'notif.info': 'Informação',
            'common.cancel': 'Cancelar',
            'common.confirm': 'Confirmar',

            // Janelas independentes (Ferramentas)
            'tool.search.title': 'Buscar e Substituir',
            'tool.search.find_label': 'Buscar:',
            'tool.search.find_placeholder': 'Hex: FF AA BB ou Texto: HELLO',
            'tool.search.replace_label': 'Substituir por:',
            'tool.search.replace_placeholder': 'Hex: 00 11 22 ou Texto: WORLD',
            'tool.search.case_sensitive': 'Diferenciar Maiúsculas',
            'tool.search.regex': 'Regex',
            'tool.search.whole_word': 'Palavra Inteira',
            'tool.search.isolated_sequence': 'Sequencia Hex',
            'tool.search.replace_all': 'Substituir Todos',
            'tool.search.no_results': 'Nenhum arquivo aberto ou busca não iniciada.',
            'tool.search.search_btn': 'Buscar',
            'tool.search.replace_btn': 'Substituir',
            'tool.search.previous_btn': 'Anterior',
            'tool.search.next_btn': 'Próximo',
            'tool.search.shortcuts': 'Atalhos: F3 (Próximo), Shift+F3 (Anterior), Enter (Buscar)',

            // Notificações de Busca
            'notif.search.title': 'Busca Integrada',
            'notif.search.completed': 'Busca externa concluída!',
            'notif.search.results_found': 'resultados encontrados.',
            'notif.search.no_results': 'Nenhum resultado encontrado na busca externa.',

            // Modal de Progresso de Busca
            'search.progress.title': '&#x1F50D; Buscando no arquivo...',
            'search.progress.starting': 'Iniciando...',
            'search.progress.label': 'Progresso: {percent}%',

            // Mensagens de Substituição
            'replace.success.title': 'Sucesso',
            'replace.success.single': 'Substituição concluída: 1 ocorrência substituída.',
            'replace.success.multiple': 'Substituição concluída: {count} ocorrência(s) substituída(s).',
            'replace.warning.no_results': 'Nenhuma ocorrência encontrada para substituir.',
            'replace.warning.title': 'Nenhum Resultado',
            'replace.error.invalid_hex': 'Formato hex inválido: deve ter número par de caracteres.',
            'replace.error.invalid_chars': 'Caracteres hex inválidos.',
            'replace.error.conversion.title': 'Erro de Conversão',
            'replace.error.conversion.16bit': 'Não foi possível converter o texto de substituição para o formato 16-bit. Verifique se todos os caracteres estão na tabela.',
            'replace.error.conversion.shiftjis': 'Não foi possível converter o texto de substituição para o formato Shift-JIS. Verifique se todos os caracteres estão na tabela.',
            'replace.error.conversion.custom': 'Não foi possível converter o texto de substituição usando a tabela customizada. Verifique se todos os caracteres estão na tabela.',
            'replace.error.format.title': 'Erro de Formato',

            // Resultados da Busca (janela independente)
            'tool.search.no_results_found': 'Nenhum resultado encontrado.',
            'tool.search.found': 'Encontrados:',
            'tool.search.current': 'Atual:',
            'tool.search.of': 'de',
            'tool.search.term': 'Termo:',
            'tabs.scroll_hint': 'Arraste a barra laranja para ver mais abas',
            'tabs.no_open_files': 'Nenhum arquivo aberto',
            'tabs.close_current': 'Fechar aba atual',
            'tabs.close_left': 'Fechar abas à esquerda',
            'tabs.close_right': 'Fechar abas à direita',
            'tabs.close_others': 'Fechar todas, exceto esta',

            // Janela Ir para Offset
            'tool.goto.title': 'Ir para Offset',
            'tool.goto.offset_label': 'Offset (HEX ou DEC):',
            'tool.goto.offset_placeholder': 'Ex: 1A2B ou 4096',
            'tool.goto.error_range': 'Offset fora do range válido',
            'tool.goto.file_size': 'Tamanho do Arquivo:',
            'tool.goto.current_offset': 'Offset Atual:',
            'tool.goto.valid_range': 'Range Válido:',
            'tool.goto.cancel': 'Cancelar',
            'tool.goto.go': 'Ir para Offset',
            'tool.goto.shortcuts': 'Atalhos: Enter (Ir), Esc (Fechar)',

            // Janela Calculadora
            'tool.calc.title': 'Calculadora Hexadecimal',
            'tool.calc.decimal': 'Decimal:',
            'tool.calc.clear': 'C',
            'tool.calc.clear_entry': 'CE',
            'tool.calc.copy': 'Copiar',
            'tool.calc.paste': 'Colar',
            'tool.calc.conversions': 'Conversões:',
            'tool.calc.to_decimal': 'Decimal',
            'tool.calc.to_hex': 'Hex',
            'tool.calc.toggle': 'Alternar',
            'tool.calc.history': 'Histórico:',
            'tool.calc.export': 'Exportar',
            'tool.calc.clear_history': 'Limpar',
            'tool.calc.no_operations': 'Nenhuma operação ainda',

            // Janela Customização de Cores
            'tool.color.title': 'Customizar',
            'tool.color.header': 'Customização',
            'tool.color.tab.hex': '&#x1F522; Hex',
            'tool.color.tab.text': '&#x1F4DD; Textos',
            'tool.color.tab.background': '&#x1F3A8; Fundo',
            'tool.color.tab.font': '&#x1F521; Fonte',
            'tool.color.tab.highlights': '&#x1F58D;&#xFE0F; Marcações',
            'tool.color.tab.presets': '&#x1F4BE; Presets',
            'tool.color.reset': '&#x1F504; Reset',
            'tool.color.add': '&#x2795; Adicionar',
            'tool.color.save': '&#x1F4BE; Salvar',
            'tool.color.export': '&#x1F4E4; Exportar',
            'tool.color.import': '&#x1F4E5; Importar',
            'tool.color.reset_all': '&#x1F5D1;&#xFE0F; Resetar Tudo',
            'tool.color.confirm_reset_title': 'Resetar cores',
            'tool.color.confirm_reset_message': 'Tem certeza que deseja resetar todas as cores para os valores padrão?',
            'tool.color.apply': '&#x2705; Aplicar',
            'tool.color.cancel': '&#x274C; Cancelar',
            // Hex Tab
            'tool.color.hex.colors_by_type': '&#x1F522; Cores por Tipo',
            'tool.color.hex.nulls': 'Nulls/Terminadores:',
            'tool.color.hex.numbers': 'Números (0-9):',
            'tool.color.hex.letters': 'Letras (A-F):',
            'tool.color.hex.special': 'Especiais:',
            'tool.color.hex.custom': '&#x1F3AF; Hex Customizados',
            // Text Tab
            'tool.color.text.title': '&#x1F4DD; Cores do Texto',
            'tool.color.text.numbers': 'Números:',
            'tool.color.text.letters': 'Letras:',
            'tool.color.text.punctuation': 'Pontuação:',
            'tool.color.text.spaces': 'Espaços:',
            'tool.color.text.tags': 'Tags:',
            'tool.color.text.dte': 'DTE:',
            'tool.color.text.mte': 'MTE:',
            // Font Tab
            'tool.color.font.title': '&#x1F521; Fonte do Editor',
            'tool.color.font.family': 'Fonte:',
            'tool.color.font.size': 'Tamanho:',
            'tool.color.font.preview': 'Pré-visualização',
            'tool.color.font.sample': '00 1A 2F AB | Texto Exemplo | あア亜',
            'tool.color.font.note': 'O tamanho é limitado para não prejudicar o layout do editor.',
            'tool.color.font.reset': 'Resetar Fonte',
            // Background Tab
            'tool.color.bg.title': '&#x1F3A8; Cores de Fundo',
            'tool.color.bg.hex_content': 'Fundo do Conteúdo:',
            'tool.color.bg.preview': 'Fundo',
            'tool.color.bg.quick_presets': '&#x26A1; Presets Rápidos de Fundo',
            // Presets
            'tool.color.preset.light': 'Tema Claro',
            'tool.color.preset.terminal': 'Verde (Matrix)',
            'tool.color.preset.black': 'Black',
            'tool.color.preset.black_name': 'Black',
            'tool.color.preset.dark': 'Escuro',
            'tool.color.preset.dark_name': 'Escuro',
            'tool.color.preset.default_name': 'Padrão',
            'tool.color.preset.colorful': 'Colorido',
            'tool.color.preset.classic_blue': 'Azul Clássico',
            'tool.color.preset.soft_gray': 'Cinza Suave',
            'tool.color.preset.midnight_purple': 'Meia Noite',
            'tool.color.presets.title': '&#x1F4BE; Presets',
            'tool.color.manage.title': '&#x1F4BE; Gerenciar Configurações',
            // Highlights Tab
            'tool.color.highlight.title': '&#x1F58D;&#xFE0F; Cores das Marcações',
            'tool.color.highlight.default': 'Padrão (Azul)',
            'tool.color.highlight.red': 'Vermelha',
            'tool.color.highlight.green': 'Verde',
            'tool.color.highlight.purple': 'Roxa',
            'tool.color.highlight.orange': 'Laranja',
            'tool.color.highlight.pink': 'Rosa',
            'tool.color.highlight.info_title': '&#x2139;&#xFE0F; Informações',
            'tool.color.highlight.how_to_use': 'Como usar:',
            'tool.color.highlight.step1': 'Selecione uma área no editor (HEX ou ASCII)',
            'tool.color.highlight.step2': 'Clique com o botão direito e escolha "�x�️ Criar Marcação"',
            'tool.color.highlight.step3': 'A cor selecionada será aplicada a todas as marcações',
            'tool.color.highlight.step4': 'As marcações são persistentes e salvas automaticamente',

            // Janela Bookmark
            'tool.bookmark.title': 'Adicionar Favorito',
            'tool.bookmark.header': '&#x1F516; Adicionar Favorito',
            'tool.bookmark.title_placeholder': 'Título do favorito (opcional)',
            'tool.bookmark.comment_placeholder': 'Comentário ou descrição',
            'tool.bookmark.offset': 'Offset',
            'tool.bookmark.cancel': '&#x274C; Cancelar',
            'tool.bookmark.add': '&#x1F516; Adicionar Favorito',
            'tool.bookmark.edit': 'Editar',
            'tool.bookmark.delete': '&#x1F5D1;&#xFE0F; Deletar',
            'tool.bookmark.default_name': 'Favorito {number}',

            // Janela Gerenciar Marcações
            'tool.highlights.title': 'Gerenciar Marcações',
            'tool.highlights.header': '&#x1F58D;&#xFE0F; Gerenciar Marcações',
            'tool.highlights.count': '(0 marcações)',
            'tool.highlights.search_placeholder': 'Buscar por offset ou comentário...',
            'tool.highlights.start_offset': 'Offset Inicial',
            'tool.highlights.end_offset': 'Offset Final',
            'tool.highlights.size': 'Tamanho',
            'tool.highlights.comment': 'Comentário',
            'tool.highlights.actions': 'Ações',
            'tool.highlights.refresh': '&#x1F504; Atualizar',
            'tool.highlights.close': 'Fechar',
            'tool.highlights.empty_title': '&#x1F58D;&#xFE0F;',
            'tool.highlights.empty_message': 'Nenhuma marcação encontrada',
            'tool.highlights.empty_subtitle': 'Use o menu de contexto para criar marcações',
            'tool.highlights.bytes': 'bytes',
            'tool.highlights.add_comment': 'Adicionar comentário...',
            'tool.highlights.navigate': '&#x1F3AF; Ir',
            'tool.highlights.delete': '&#x1F5D1;&#xFE0F; Deletar',
            'tool.highlights.confirm_delete': 'Tem certeza que deseja deletar esta marcação?',
            'tool.highlights.count_singular': 'marcação',
            'tool.highlights.count_plural': 'marcações',

            // Janela Análise Completa do Arquivo
            'tool.analysis.title': 'Análise de Arquivo',
            'tool.analysis.header': '&#x1F4DD; Análise Completa do Arquivo',
            'tool.analysis.format': 'Formato',
            'tool.analysis.size': 'Tamanho',
            'tool.analysis.strings': 'Strings',
            'tool.analysis.entropy': 'Entropia',
            'tool.analysis.strings_title': '&#x1F50D; Strings de Texto',
            'tool.analysis.patterns_title': '&#x1F50D; Padrões de Dados',
            'tool.analysis.offset': '&#x1F4DD; Offset',
            'tool.analysis.content': '&#x1F4DD; Conteúdo',
            'tool.analysis.export': '&#x1F4E4; Exportar',
            'tool.analysis.refresh': '&#x1F504; Atualizar',
            'tool.analysis.close': '&#x1F5B9; Fechar',
            'tool.analysis.unknown': 'Desconhecido',
            'tool.analysis.no_strings': 'Nenhuma string de texto encontrada',
            'tool.analysis.no_patterns': 'Nenhum padrão detectado',
            'tool.analysis.byte': 'Byte',
            'tool.analysis.occurrences': 'Ocorrências',
            'tool.analysis.start': 'Início',
            'tool.analysis.length': 'Tamanho',
            'tool.analysis.position': 'Posição',
            'tool.analysis.na': 'N/A',
            'tool.analysis.repeated_byte': '&#x1F50D; Byte Repetido',
            'tool.analysis.zero_padding': '&#x1F4DD; Preenchimento Zero',
            'tool.analysis.pattern': '&#x1F4DD; Padrão',
            'tool.analysis.class_structured': 'Estruturado',
            'tool.analysis.class_text_heavy': 'Texto/script',
            'tool.analysis.class_compressed_likely': 'Compressão provável',
            'tool.analysis.class_dense_binary': 'Binário denso',
            'tool.analysis.class_mixed_binary': 'Binário misto',
            'tool.analysis.summary_structured': 'Dados bem estruturados, com baixa variação e boa repetição local.',
            'tool.analysis.summary_text_heavy': 'O conteúdo parece dominado por texto, scripts ou tabelas legíveis.',
            'tool.analysis.summary_compressed_likely': 'A distribuição de bytes é compatível com dados comprimidos ou embaralhados.',
            'tool.analysis.summary_dense_binary': 'Os dados são densos e variados, mas não sugerem compressão com tanta força.',
            'tool.analysis.summary_mixed_binary': 'Arquivo binário com mistura de código, dados e recursos.',
            'tool.analysis.compression_likely': 'Compressão provável',
            'tool.analysis.compression_possible': 'Compressão incerta',
            'tool.analysis.compression_unlikely': 'Compressão improvável',
            'tool.analysis.entropy_default_note': 'Entropia isolada não basta para concluir compressão.',
            'tool.analysis.export_success': 'Relatório exportado com sucesso!',
            'tool.analysis.export_error': 'Erro ao exportar',
            'tool.analysis.dialog_error': 'Erro ao abrir diálogo',
            'tool.analysis.refreshing': 'Análise sendo atualizada...',
            'tool.analysis.export_report_title': 'Exportar Relatório de Análise',
            'tool.analysis.export_default_name': 'relatorio_analise.json',
            'tool.analysis.export_report_name': 'Relatório JSON',
            'sidebar.no_sections_detected': 'Nenhuma seção detectada',
            'sidebar.full_file': 'Arquivo Completo',
            'sidebar.full_file_desc': 'Arquivo pequeno completo',
            'sidebar.header': 'Cabeçalho',
            'sidebar.header_desc': 'Possível cabeçalho ou metadados iniciais',
            'sidebar.main_data': 'Dados Principais',
            'sidebar.main_data_desc': 'Conteúdo principal do arquivo',
            'sidebar.main_header': 'Cabeçalho Principal',
            'sidebar.main_header_desc': 'Cabeçalho do arquivo',
            'sidebar.data_body': 'Corpo de Dados',
            'sidebar.data_body_desc': 'Conteúdo principal',
            'sidebar.file_end': 'Final do Arquivo',
            'sidebar.file_end_desc': 'Possível rodapé ou metadados finais',
            'sidebar.string_section': 'Seção de Strings',
            'sidebar.string_section_desc': 'Área com {count} strings de texto',
            'sidebar.section': 'Seção',
            'sidebar.size_label': 'Tamanho',
            'sidebar.type_header': 'CABEÇALHO',
            'sidebar.type_data': 'DADOS',
            'sidebar.type_code': 'CÓDIGO',
            'sidebar.type_graphics': 'GRÁFICOS',
            'sidebar.type_audio': 'ÁUDIO',
            'sidebar.type_strings': 'TEXTO',
            'sidebar.type_footer': 'RODAPÉ',
            'sidebar.type_unknown': 'DESCONHECIDO',
            'sidebar.no_text_strings_found': 'Nenhuma cadeia de texto encontrada',
            'sidebar.more_strings': '... e mais {count} cadeias',

            // Janela Detecção Avançada de Ponteiros
            'tool.pointer.title': 'Detecção de Ponteiros',
            'tool.pointer.header': '&#x1F50D; Detecção Avançada de Ponteiros',
            'tool.pointer.warning': '&#x26A0;&#xFE0F; Funcionalidade experimental - pode conter erros e comportamentos inesperados',
            'tool.pointer.system_title': '&#x1F3AE; Sistema de Videogame',
            'tool.pointer.auto_detect': '&#x1F52E; Auto-Detectar',
            'tool.pointer.generic_detection': '&#x1F527; Detecção Genérica',
            'tool.pointer.auto_detect_info': '&#x1F52E; Detecção automática baseada no arquivo carregado',
            'tool.pointer.mode_title': '&#x2699;&#xFE0F; Modo de Detecção',
            'tool.pointer.mode_conservative': '&#x1F6E1;&#xFE0F; Conservador - Apenas ponteiros com alta confiança',
            'tool.pointer.mode_smart': '&#x1F9E0; Inteligente - Balanceado (recomendado)',
            'tool.pointer.mode_aggressive': '&#x26A1; Agressivo - Encontra mais candidatos',
            'tool.pointer.types_title': '&#x1F517; Tipos de Ponteiros',
            'tool.pointer.advanced_title': '&#x2699;&#xFE0F; Configurações Avançadas',
            'tool.pointer.require_alignment': 'Exigir alinhamento de ponteiros',
            'tool.pointer.skip_zeros': 'Pular ponteiros nulos (zeros)',
            'tool.pointer.check_instructions': 'Verificar padrões de instruções',
            'tool.pointer.prioritize_text_targets': 'Priorizar destinos que parecem texto',
            'tool.pointer.require_text_boundary': 'Exigir início real de texto no destino',
            'tool.pointer.min_confidence': 'Confiança mínima:',
            'tool.pointer.max_results': 'Máximo de resultados:',
            'tool.pointer.generation_systems': '{generation} Systems',
            'tool.pointer.generation': 'Geração',
            'tool.pointer.pointer_types': 'tipos de ponteiro',
            'tool.pointer.sizes': 'Tamanhos',
            'tool.pointer.generic_info': '&#x1F527; Modo genérico - suporta todos os tipos de ponteiro',
            'tool.pointer.start_detection': '&#x1F50D; Iniciar Detecção',
            'tool.pointer.quick_scan': '&#x26A1; Varredura Rápida',
            'tool.pointer.results_title': '&#x1F4CA; Resultados',
            'tool.pointer.no_results': 'Nenhum resultado ainda',
            'tool.pointer.select_settings': 'Selecione as configurações e clique em "Iniciar Detecção"',
            'tool.pointer.export': '&#x1F4BE; Exportar',
            'tool.pointer.clear': '&#x1F9F9; Limpar',
            'tool.pointer.advanced_analysis': '&#x1F9E0; Análise Avançada',

            // Pointer Tool Dynamic Content
            'tool.pointer.detecting': '&#x1F504; Detectando...',
            'tool.pointer.analyzing_file': '&#x1F50D; Analisando arquivo...',
            'tool.pointer.error_detection': '&#x26A0;&#xFE0F; Erro na detecção: {error}',
            'tool.pointer.scanning': '&#x26A1; Escaneando...',
            'tool.pointer.error_scan': '&#x26A0; Erro na varredura: {error}',
            'tool.pointer.no_pointers_criteria': 'Nenhum ponteiro encontrado com os critérios atuais',
            'tool.pointer.no_result': 'Nenhum resultado',
            'tool.pointer.pointers_found': 'ponteiros encontrados',
            'tool.pointer.stat_total': 'Total',
            'tool.pointer.stat_avg_confidence': 'Confiança Média',
            'tool.pointer.stat_types': 'Tipos',
            'tool.pointer.navigating_to': 'Navegando para ponteiro em',
            'tool.pointer.no_text_preview': 'Destino sem texto legível',
            'tool.pointer.target_file_offset': 'Alvo',
            'tool.pointer.mapping_mode': 'Mapeamento',
            'tool.pointer.text_score': 'Texto',
            'tool.pointer.no_pointers_quick': 'Nenhum ponteiro encontrado na varredura rápida',
            'tool.pointer.pointers_found_quick': 'ponteiros encontrados (varredura rápida)',
            'tool.pointer.quick_results_title': '&#x26A1; Resultados da Varredura Rápida',
            'tool.pointer.and_more': 'e mais',
            'tool.pointer.more_pointers': 'ponteiros. Execute uma detecção completa para ver todos.',
            'tool.pointer.analyzing': '&#x1F9E0; Analisando...',
            'tool.pointer.no_results_export': 'Nenhum resultado para exportar',
            'tool.pointer.exporting': 'Exportando resultados...',
            'tool.pointer.no_results_analysis': 'Nenhum resultado disponível para análise',
            'tool.pointer.error_analysis': 'Erro na análise',
            'tool.pointer.advanced_analysis_complete': '&#x1F9E0; Análise Avançada Completa',
            'tool.pointer.pointer_tables': 'Tabelas de Ponteiros',
            'tool.pointer.found': 'encontradas',
            'tool.pointer.found_m': 'encontrados',
            'tool.pointer.found_f': 'encontradas',
            'tool.pointer.entries': 'entradas',
            'tool.pointer.type': 'Tipo',
            'tool.pointer.unknown': 'Desconhecido',
            'tool.pointer.size': 'Tamanho',
            'tool.pointer.tables': 'tabelas',
            'tool.pointer.pointer_clusters': 'Clusters de Ponteiros',
            'tool.pointer.center': 'Centro',
            'tool.pointer.pointers': 'ponteiros',
            'tool.pointer.radius': 'Raio',
            'tool.pointer.density': 'Densidade',
            'tool.pointer.data_structures': 'Estruturas de Dados',
            'tool.pointer.complexity': 'Complexidade',
            'tool.pointer.detected_patterns': 'Padrões Detectados',
            'tool.pointer.recommendations': 'Recomendações',
        },
        en: {
            // Language button
            'lang.title': 'Change language',
            'lang.tooltip': 'Switch between English and Português',
            'lang.changed.pt': 'Language changed to Português',
            'lang.changed.en': 'Language changed to English',

            // Toolbar
            'toolbar.open': 'Open',
            'toolbar.open.tooltip': 'Open a file for editing',
            'toolbar.save': 'Save',
            'toolbar.save.tooltip': 'Save changes to current file',
            'toolbar.undo': 'Undo',
            'toolbar.undo.tooltip': 'Undo last action',
            'toolbar.redo': 'Redo',
            'toolbar.redo.tooltip': 'Redo undone action',
            'toolbar.highlights': 'Highlights',
            'toolbar.highlights.tooltip': 'Manage colored highlights',
            'toolbar.analyze': 'Analyze',
            'toolbar.analyze.tooltip': 'Analyze ROM structure',
            'toolbar.relative_search': 'Relative Search',
            'toolbar.relative_search.tooltip': 'Open the integrated tool',
            'toolbar.relative_search.no_file': 'Open a file before using Relative Search.',
            'toolbar.relative_search.unsaved_large': 'The current tab has unsaved changes in a large file. Save it before opening Relative Search.',
            'toolbar.pointers': 'Pointers',
            'toolbar.pointers.tooltip': 'Detect and manage pointers',
            'toolbar.help': 'Help',
            'toolbar.help.tooltip': 'View tips and editor shortcuts',

            // Edit mode
            'mode.view': 'View Mode',
            'mode.edit': 'Edit Mode',
            'mode.view_only': 'View Only',
            'mode.edit.tooltip': 'Toggle between view and edit mode',
            'mode.edit.enable': 'Enable Editing',
            'mode.edit.disable': 'Disable Editing',
            'mode.insert': 'Insert',
            'mode.overwrite': 'Overwrite',
            'mode.insert.tooltip': 'Toggle between inserting and overwriting bytes',

            // Control bar
            'control.find': 'Find and Replace',
            'control.find.tooltip': 'Search and replace values in file',
            'control.goto': 'Go to Offset...',
            'control.goto.tooltip': 'Navigate to a specific offset',
            'control.calc': 'Hex Calculator',
            'control.calc.tooltip': 'Integrated hexadecimal calculator',
            'control.colors': 'Customize',
            'control.colors.tooltip': 'Customize editor colors and font',

            // Sidebar
            'sidebar.bookmarks': 'Bookmarks',
            'sidebar.history': 'History',
            'sidebar.analysis': 'Analysis',
            'sidebar.chartable': 'Table',
            'sidebar.add_bookmark': 'Add Bookmark',
            'sidebar.export_bookmarks': 'Export Bookmarks',
            'sidebar.import_bookmarks': 'Import Bookmarks',
            'sidebar.no_bookmarks': 'No bookmarks yet',
            'sidebar.no_bookmarks_hint': 'Click "Add Bookmark" to create your first bookmark',
            'sidebar.no_bookmarks_full': 'No bookmarks yet<br><small>Click "Add Bookmark" to create your first bookmark</small>',
            'sidebar.edit_stats': 'Edit Statistics',
            'sidebar.total_edits': 'Total edits:',
            'sidebar.bytes_modified': 'Bytes modified:',
            'sidebar.file_size': 'File size:',
            'sidebar.unsaved_changes': 'Unsaved changes:',
            'sidebar.rom_info': 'ROM Information',
            'sidebar.rom_type': 'Type:',
            'sidebar.rom_size': 'Size:',
            'sidebar.rom_format': 'Format:',
            'sidebar.data_sections': 'Data Sections',
            'sidebar.text_strings': 'Text Strings',
            'sidebar.stats': 'Statistics',
            'sidebar.search_results': 'Search results:',
            'sidebar.current_match': 'Current match:',
            'sidebar.total_bookmarks': 'Total bookmarks:',
            'sidebar.entropy': 'Entropy:',
            'sidebar.data_patterns': 'Data Patterns',
            'sidebar.entropy_analysis': 'Entropy Analysis',
            'sidebar.char_table_title': 'Character Mapping Visualization',
            'sidebar.table_editor': 'Create/Edit Table',

            // Header
            'header.decoded_text': 'Text',
            'sidebar.select_table': 'Select Table',
            'sidebar.load_table': 'Load Table',
            // Status bar
            'status.position': 'Position:',
            'status.selection': 'Selection:',
            'status.hex': 'Hex:',
            'status.file': 'File:',
            'status.no_file': 'No file loaded',
            'status.modified': 'Modified',
            'status.not_modified': 'Not modified',
            'status.char': 'Char:',
            'status.table': 'Table:',
            'status.search_found': 'found',
            'status.panel_hex': 'HEX',
            'status.panel_text': 'TEXT',

            // Modals
            'modal.bookmark.title': 'Add Bookmark',
            'modal.bookmark.placeholder_title': 'Bookmark title (optional)',
            'modal.bookmark.placeholder_comment': 'Comment or description',
            'modal.bookmark.offset': 'Offset:',
            'modal.bookmark.cancel': 'Cancel',
            'modal.bookmark.add': 'Add Bookmark',

            'modal.find.title': 'Find and Replace',
            'modal.find.drag': 'Drag',
            'modal.find.search_label': 'Find:',
            'modal.find.search_placeholder': 'Search (hex: FF AA BB or text: HELLO)',
            'modal.find.replace_label': 'Replace with:',
            'modal.find.replace_placeholder': 'Replace with (hex: 00 11 22 or text: WORLD)',
            'modal.find.case_sensitive': 'Case Sensitive',
            'modal.find.whole_word': 'Match Whole Word',
            'modal.find.regex': 'Regex',
            'modal.find.replace_all': 'Replace All',
            'modal.find.next': 'Next',
            'modal.find.previous': 'Previous',
            'modal.find.search': 'Find',
            'modal.find.replace': 'Replace',
            'modal.find.cancel': 'Cancel',

            'modal.analysis.title': 'ROM Analysis Results',
            'modal.analysis.close': 'Close',
            'modal.analysis.export': 'Export Report',

            'modal.chartable.title': 'Character Table Selection',
            'modal.chartable.ascii': 'Standard ASCII',
            'modal.chartable.ascii_desc': 'Standard ASCII character set (32-126)',
            'modal.chartable.nes': 'NES Standard',
            'modal.chartable.nes_desc': 'Common NES character mapping',
            'modal.chartable.snes': 'SNES Standard',
            'modal.chartable.snes_desc': 'SNES text encoding',
            'modal.chartable.gb': 'Game Boy Standard',
            'modal.chartable.gb_desc': 'Game Boy character set',
            'modal.chartable.load': 'Load Table...',
            'modal.chartable.load_desc': 'Load file in Foxy Editor format .json or .tbl',
            'modal.chartable.cancel': 'Cancel',
            'modal.chartable.apply': 'Apply',

            // Notifications
            'notif.file_opened': 'File opened',
            'notif.file_saved': 'File saved',
            'notif.bookmark_added': 'Bookmark added',
            'notif.search_complete': 'Search complete',
            'notif.error': 'Error',
            'notif.warning': 'Warning',
            'notif.success': 'Success',
            'notif.info': 'Information',
            'common.cancel': 'Cancel',
            'common.confirm': 'Confirm',

            // Tool Windows
            'tool.search.title': 'Find and Replace',
            'tool.search.find_label': 'Find:',
            'tool.search.find_placeholder': 'Hex: FF AA BB or Text: HELLO',
            'tool.search.replace_label': 'Replace with:',
            'tool.search.replace_placeholder': 'Hex: 00 11 22 or Text: WORLD',
            'tool.search.case_sensitive': 'Case Sensitive',
            'tool.search.regex': 'Regex',
            'tool.search.whole_word': 'Whole Word',
            'tool.search.isolated_sequence': 'Hex Sequence',
            'tool.search.replace_all': 'Replace All',
            'tool.search.no_results': 'No file open or search not started.',
            'tool.search.search_btn': 'Find',
            'tool.search.replace_btn': 'Replace',
            'tool.search.previous_btn': 'Previous',
            'tool.search.next_btn': 'Next',
            'tool.search.shortcuts': 'Shortcuts: F3 (Next), Shift+F3 (Previous), Enter (Find)',

            // Search Notifications
            'notif.search.title': 'Integrated Search',
            'notif.search.completed': 'External search completed!',
            'notif.search.results_found': 'results found.',
            'notif.search.no_results': 'No results found in external search.',

            // Search Progress Modal
            'search.progress.title': '&#x1F50D; Searching file...',
            'search.progress.starting': 'Starting...',
            'search.progress.label': 'Progress: {percent}%',

            // Replacement Messages
            'replace.success.title': 'Success',
            'replace.success.single': 'Replacement complete: 1 occurrence replaced.',
            'replace.success.multiple': 'Replacement complete: {count} occurrence(s) replaced.',
            'replace.warning.no_results': 'No occurrences found to replace.',
            'replace.warning.title': 'No Results',
            'replace.error.invalid_hex': 'Invalid hex format: must have an even number of characters.',
            'replace.error.invalid_chars': 'Invalid hex characters.',
            'replace.error.conversion.title': 'Conversion Error',
            'replace.error.conversion.16bit': 'Could not convert replacement text to 16-bit format. Check if all characters are in the table.',
            'replace.error.conversion.shiftjis': 'Could not convert replacement text to Shift-JIS format. Check if all characters are in the table.',
            'replace.error.conversion.custom': 'Could not convert replacement text using custom table. Check if all characters are in the table.',
            'replace.error.format.title': 'Format Error',

            // Search Results (tool window)
            'tool.search.no_results_found': 'No results found.',
            'tool.search.found': 'Found:',
            'tool.search.current': 'Current:',
            'tool.search.of': 'of',
            'tool.search.term': 'Term:',
            'tabs.scroll_hint': 'Drag the orange bar to see more tabs',
            'tabs.no_open_files': 'No file open',
            'tabs.close_current': 'Close current tab',
            'tabs.close_left': 'Close tabs to the left',
            'tabs.close_right': 'Close tabs to the right',
            'tabs.close_others': 'Close all except this tab',

            // Go to Offset Window
            'tool.goto.title': 'Go to Offset',
            'tool.goto.offset_label': 'Offset (HEX or DEC):',
            'tool.goto.offset_placeholder': 'Ex: 1A2B or 4096',
            'tool.goto.error_range': 'Offset out of valid range',
            'tool.goto.file_size': 'File Size:',
            'tool.goto.current_offset': 'Current Offset:',
            'tool.goto.valid_range': 'Valid Range:',
            'tool.goto.cancel': 'Cancel',
            'tool.goto.go': '&#x1F3AF; Go to Offset',
            'tool.goto.shortcuts': 'Shortcuts: Enter (Go), Esc (Close)',

            // Calculator Window
            'tool.calc.title': 'Hexadecimal Calculator',
            'tool.calc.decimal': 'Decimal:',
            'tool.calc.clear': 'C',
            'tool.calc.clear_entry': 'CE',
            'tool.calc.copy': 'Copy',
            'tool.calc.paste': 'Paste',
            'tool.calc.conversions': 'Conversions:',
            'tool.calc.to_decimal': 'Decimal',
            'tool.calc.to_hex': 'Hex',
            'tool.calc.toggle': 'Toggle',
            'tool.calc.history': 'History:',
            'tool.calc.export': 'Export',
            'tool.calc.clear_history': 'Clear',
            'tool.calc.no_operations': 'No operations yet',

            // Color Customization Window
            'tool.color.title': 'Customize',
            'tool.color.header': 'Customization',
            'tool.color.tab.hex': '&#x1F522; Hex',
            'tool.color.tab.text': '&#x1F4DD; Text',
            'tool.color.tab.background': '&#x1F3A8; Background',
            'tool.color.tab.font': '&#x1F521; Font',
            'tool.color.tab.highlights': '&#x1F58D;&#xFE0F; Highlights',
            'tool.color.tab.presets': '&#x1F4BE; Presets',
            'tool.color.reset': '&#x1F504; Reset',
            'tool.color.add': '&#x2795; Add',
            'tool.color.save': '&#x1F4BE; Save',
            'tool.color.export': '&#x1F4E4; Export',
            'tool.color.import': '&#x1F4E5; Import',
            'tool.color.reset_all': '&#x1F5D1;&#xFE0F; Reset All',
            'tool.color.confirm_reset_title': 'Reset colors',
            'tool.color.confirm_reset_message': 'Are you sure you want to reset all colors to their default values?',
            'tool.color.apply': '&#x2705; Apply',
            'tool.color.cancel': '&#x274C; Cancel',
            // Hex Tab
            'tool.color.hex.colors_by_type': '&#x1F522; Colors by Type',
            'tool.color.hex.nulls': 'Nulls/Terminators:',
            'tool.color.hex.numbers': 'Numbers (0-9):',
            'tool.color.hex.letters': 'Letters (A-F):',
            'tool.color.hex.special': 'Special:',
            'tool.color.hex.custom': '&#x1F3AF; Custom Hex',
            // Text Tab
            'tool.color.text.title': '&#x1F4DD; Text Colors',
            'tool.color.text.numbers': 'Numbers:',
            'tool.color.text.letters': 'Letters:',
            'tool.color.text.punctuation': 'Punctuation:',
            'tool.color.text.spaces': 'Spaces:',
            'tool.color.text.tags': 'Tags:',
            'tool.color.text.dte': 'DTE:',
            'tool.color.text.mte': 'MTE:',
            // Font Tab
            'tool.color.font.title': '&#x1F521; Editor Font',
            'tool.color.font.family': 'Font:',
            'tool.color.font.size': 'Size:',
            'tool.color.font.preview': 'Preview',
            'tool.color.font.sample': '00 1A 2F AB | Sample Text | あア亜',
            'tool.color.font.note': 'Size is limited to avoid harming the layout of the editor.',
            'tool.color.font.reset': 'Reset Font',
            // Background Tab
            'tool.color.bg.title': '&#x1F3A8; Background Colors',
            'tool.color.bg.hex_content': 'Content Background:',
            'tool.color.bg.preview': 'Background',
            'tool.color.bg.quick_presets': '&#x26A1; Quick Background Presets',
            // Presets
            'tool.color.preset.light': 'Light Theme',
            'tool.color.preset.terminal': 'Green (Matrix)',
            'tool.color.preset.black': 'Black',
            'tool.color.preset.black_name': 'Black',
            'tool.color.preset.dark': 'Dark',
            'tool.color.preset.dark_name': 'Dark',
            'tool.color.preset.default_name': 'Default',
            'tool.color.preset.colorful': 'Colorful',
            'tool.color.preset.classic_blue': 'Classic Blue',
            'tool.color.preset.soft_gray': 'Soft Gray',
            'tool.color.preset.midnight_purple': 'Midnight',
            'tool.color.presets.title': '&#x1F4BE; Presets',
            'tool.color.manage.title': '&#x1F4BE; Manage Settings',
            // Highlights Tab
            'tool.color.highlight.title': '&#x1F58D;&#xFE0F; Highlight Colors',
            'tool.color.highlight.default': 'Default (Blue)',
            'tool.color.highlight.red': 'Red',
            'tool.color.highlight.green': 'Green',
            'tool.color.highlight.purple': 'Purple',
            'tool.color.highlight.orange': 'Orange',
            'tool.color.highlight.pink': 'Pink',
            'tool.color.highlight.info_title': '&#x2139;&#xFE0F; Information',
            'tool.color.highlight.how_to_use': 'How to use:',
            'tool.color.highlight.step1': 'Select an area in the editor (HEX or ASCII)',
            'tool.color.highlight.step2': 'Right-click and choose "&#x1F58D;&#xFE0F; Create Highlight"',
            'tool.color.highlight.step3': 'The selected color will be applied to all highlights',
            'tool.color.highlight.step4': 'Highlights are persistent and saved automatically',

            // Bookmark Window
            'tool.bookmark.title': 'Add Bookmark',
            'tool.bookmark.header': '&#x1F516; Add Bookmark',
            'tool.bookmark.title_placeholder': 'Bookmark title (optional)',
            'tool.bookmark.comment_placeholder': 'Comment or description',
            'tool.bookmark.offset': 'Offset',
            'tool.bookmark.cancel': '&#x274C; Cancel',
            'tool.bookmark.add': '&#x1F516; Add Bookmark',
            'tool.bookmark.edit': 'Edit',
            'tool.bookmark.delete': '&#x1F5D1;&#xFE0F; Delete',
            'tool.bookmark.default_name': 'Bookmark {number}',

            // Highlights Management Window
            'tool.highlights.title': 'Manage Highlights',
            'tool.highlights.header': '&#x1F58D;&#xFE0F; Manage Highlights',
            'tool.highlights.count': '(0 highlights)',
            'tool.highlights.search_placeholder': 'Search by offset or comment...',
            'tool.highlights.start_offset': 'Start Offset',
            'tool.highlights.end_offset': 'End Offset',
            'tool.highlights.size': 'Size',
            'tool.highlights.comment': 'Comment',
            'tool.highlights.actions': 'Actions',
            'tool.highlights.refresh': '&#x1F504; Refresh',
            'tool.highlights.close': 'Close',
            'tool.highlights.empty_title': '&#x1F58D;&#xFE0F;',
            'tool.highlights.empty_message': 'No highlights found',
            'tool.highlights.empty_subtitle': 'Use the context menu to create highlights',
            'tool.highlights.bytes': 'bytes',
            'tool.highlights.add_comment': 'Add comment...',
            'tool.highlights.navigate': '&#x1F3AF; Go',
            'tool.highlights.delete': '&#x1F5D1;&#xFE0F; Delete',
            'tool.highlights.confirm_delete': 'Are you sure you want to delete this highlight?',
            'tool.highlights.count_singular': 'highlight',
            'tool.highlights.count_plural': 'highlights',

            // File Analysis Window
            'tool.analysis.title': 'File Analysis',
            'tool.analysis.header': 'Complete File Analysis',
            'tool.analysis.format': 'Format',
            'tool.analysis.size': 'Size',
            'tool.analysis.strings': 'Strings',
            'tool.analysis.entropy': 'Entropy',
            'tool.analysis.strings_title': 'Text Strings',
            'tool.analysis.patterns_title': 'Data Patterns',
            'tool.analysis.offset': 'Offset',
            'tool.analysis.content': 'Content',
            'tool.analysis.export': 'Export',
            'tool.analysis.refresh': 'Refresh',
            'tool.analysis.close': 'Close',
            'tool.analysis.unknown': 'Unknown',
            'tool.analysis.no_strings': 'No text strings found',
            'tool.analysis.no_patterns': 'No patterns detected',
            'tool.analysis.byte': 'Byte',
            'tool.analysis.occurrences': 'Occurrences',
            'tool.analysis.start': 'Start',
            'tool.analysis.length': 'Size',
            'tool.analysis.position': 'Position',
            'tool.analysis.na': 'N/A',
            'tool.analysis.repeated_byte': 'Repeated Byte',
            'tool.analysis.zero_padding': 'Zero Padding',
            'tool.analysis.pattern': 'Pattern',
            'tool.analysis.class_structured': 'Structured',
            'tool.analysis.class_text_heavy': 'Text/script',
            'tool.analysis.class_compressed_likely': 'Compression likely',
            'tool.analysis.class_dense_binary': 'Dense binary',
            'tool.analysis.class_mixed_binary': 'Mixed binary',
            'tool.analysis.summary_structured': 'Well-structured data with low variation and good local repetition.',
            'tool.analysis.summary_text_heavy': 'The content appears dominated by text, scripts, or readable tables.',
            'tool.analysis.summary_compressed_likely': 'The byte distribution matches compressed or scrambled data.',
            'tool.analysis.summary_dense_binary': 'The data is dense and varied, but does not strongly suggest compression.',
            'tool.analysis.summary_mixed_binary': 'Binary file with a mix of code, data, and resources.',
            'tool.analysis.compression_likely': 'Compression likely',
            'tool.analysis.compression_possible': 'Compression uncertain',
            'tool.analysis.compression_unlikely': 'Compression unlikely',
            'tool.analysis.entropy_default_note': 'Entropy alone is not enough to conclude compression.',
            'tool.analysis.export_success': 'Report exported successfully!',
            'tool.analysis.export_error': 'Error exporting',
            'tool.analysis.dialog_error': 'Error opening dialog',
            'tool.analysis.refreshing': 'Analysis being updated...',
            'tool.analysis.export_report_title': 'Export Analysis Report',
            'tool.analysis.export_default_name': 'analysis_report.json',
            'tool.analysis.export_report_name': 'JSON Report',
            'sidebar.no_sections_detected': 'No sections detected',
            'sidebar.full_file': 'Full File',
            'sidebar.full_file_desc': 'Complete small file',
            'sidebar.header': 'Header',
            'sidebar.header_desc': 'Possible header or initial metadata',
            'sidebar.main_data': 'Main Data',
            'sidebar.main_data_desc': 'Main file content',
            'sidebar.main_header': 'Main Header',
            'sidebar.main_header_desc': 'File header',
            'sidebar.data_body': 'Data Body',
            'sidebar.data_body_desc': 'Main content',
            'sidebar.file_end': 'File End',
            'sidebar.file_end_desc': 'Possible footer or trailing metadata',
            'sidebar.string_section': 'String Section',
            'sidebar.string_section_desc': 'Area with {count} text strings',
            'sidebar.section': 'Section',
            'sidebar.size_label': 'Size',
            'sidebar.type_header': 'HEADER',
            'sidebar.type_data': 'DATA',
            'sidebar.type_code': 'CODE',
            'sidebar.type_graphics': 'GRAPHICS',
            'sidebar.type_audio': 'AUDIO',
            'sidebar.type_strings': 'TEXT',
            'sidebar.type_footer': 'FOOTER',
            'sidebar.type_unknown': 'UNKNOWN',
            'sidebar.no_text_strings_found': 'No text strings found',
            'sidebar.more_strings': '... and {count} more strings',

            // Advanced Pointer Detection Window
            'tool.pointer.title': 'Pointer Detection',
            'tool.pointer.header': '&#x1F50D; Advanced Pointer Detection',
            'tool.pointer.warning': '&#x26A0;&#xFE0F; Experimental feature - may contain bugs and unexpected behavior',
            'tool.pointer.system_title': '&#x1F3AE; Game System',
            'tool.pointer.auto_detect': '&#x1F52E; Auto-Detect',
            'tool.pointer.generic_detection': '&#x1F527; Generic Detection',
            'tool.pointer.auto_detect_info': '&#x1F52E; Auto-detection based on loaded file',
            'tool.pointer.mode_title': '&#x2699;&#xFE0F; Detection Mode',
            'tool.pointer.mode_conservative': '&#x1F6E1;&#xFE0F; Conservative - Only high confidence pointers',
            'tool.pointer.mode_smart': '&#x1F9E0; Smart - Balanced (recommended)',
            'tool.pointer.mode_aggressive': '&#x26A1; Aggressive - Finds more candidates',
            'tool.pointer.types_title': '&#x1F517; Pointer Types',
            'tool.pointer.advanced_title': '&#x2699;&#xFE0F; Advanced Settings',
            'tool.pointer.require_alignment': 'Require pointer alignment',
            'tool.pointer.skip_zeros': 'Skip null pointers (zeros)',
            'tool.pointer.check_instructions': 'Check instruction patterns',
            'tool.pointer.prioritize_text_targets': 'Prioritize targets that look like text',
            'tool.pointer.require_text_boundary': 'Require a real text start at the destination',
            'tool.pointer.min_confidence': 'Minimum confidence:',
            'tool.pointer.max_results': 'Maximum results:',
            'tool.pointer.generation_systems': '{generation} Systems',
            'tool.pointer.generation': 'Generation',
            'tool.pointer.pointer_types': 'pointer types',
            'tool.pointer.sizes': 'Sizes',
            'tool.pointer.generic_info': '&#x1F527; Generic mode - supports all pointer types',
            'tool.pointer.start_detection': '&#x1F50D; Start Detection',
            'tool.pointer.quick_scan': '&#x26A1; Quick Scan',
            'tool.pointer.results_title': '&#x1F4CA; Results',
            'tool.pointer.no_results': 'No results yet',
            'tool.pointer.select_settings': 'Select settings and click "Start Detection"',
            'tool.pointer.export': '&#x1F4BE; Export',
            'tool.pointer.clear': '&#x1F9F9; Clear',
            'tool.pointer.advanced_analysis': '&#x1F9E0; Advanced Analysis',

            // Pointer Tool Dynamic Content
            'tool.pointer.detecting': '&#x1F504; Detecting...',
            'tool.pointer.analyzing_file': '&#x1F50D; Analyzing file...',
            'tool.pointer.error_detection': '�R Detection error: {error}',
            'tool.pointer.scanning': '&#x26A1; Scanning...',
            'tool.pointer.error_scan': '�R Scan error: {error}',
            'tool.pointer.no_pointers_criteria': 'No pointers found with current criteria',
            'tool.pointer.no_result': 'No results',
            'tool.pointer.pointers_found': 'pointers found',
            'tool.pointer.stat_total': 'Total',
            'tool.pointer.stat_avg_confidence': 'Avg Confidence',
            'tool.pointer.stat_types': 'Types',
            'tool.pointer.navigating_to': 'Navigating to pointer at',
            'tool.pointer.no_text_preview': 'Destination without readable text',
            'tool.pointer.target_file_offset': 'Target',
            'tool.pointer.mapping_mode': 'Mapping',
            'tool.pointer.text_score': 'Text',
            'tool.pointer.no_pointers_quick': 'No pointers found in quick scan',
            'tool.pointer.pointers_found_quick': 'pointers found (quick scan)',
            'tool.pointer.quick_results_title': '&#x26A1; Quick Scan Results',
            'tool.pointer.and_more': 'and',
            'tool.pointer.more_pointers': 'more pointers. Run a full detection to see all.',
            'tool.pointer.analyzing': '&#x1F9E0; Analyzing...',
            'tool.pointer.no_results_export': 'No results to export',
            'tool.pointer.exporting': 'Exporting results...',
            'tool.pointer.no_results_analysis': 'No results available for analysis',
            'tool.pointer.error_analysis': 'Analysis error',
            'tool.pointer.advanced_analysis_complete': '&#x1F9E0; Advanced Analysis Complete',
            'tool.pointer.pointer_tables': 'Pointer Tables',
            'tool.pointer.found': 'found',
            'tool.pointer.found_m': 'found',
            'tool.pointer.found_f': 'found',
            'tool.pointer.entries': 'entries',
            'tool.pointer.type': 'Type',
            'tool.pointer.unknown': 'Unknown',
            'tool.pointer.size': 'Size',
            'tool.pointer.tables': 'tables',
            'tool.pointer.pointer_clusters': 'Pointer Clusters',
            'tool.pointer.center': 'Center',
            'tool.pointer.pointers': 'pointers',
            'tool.pointer.radius': 'Radius',
            'tool.pointer.density': 'Density',
            'tool.pointer.data_structures': 'Data Structures',
            'tool.pointer.complexity': 'Complexity',
            'tool.pointer.detected_patterns': 'Detected Patterns',
            'tool.pointer.recommendations': 'Recommendations',
        }
    },

    /**
     * Obtém uma tradução pelo chave
     * @param {string} key - Chave da tradução
     * @param {string} lang - Idioma opcional (usa currentLang se não especificado)
     * @returns {string} Texto traduzido ou a chave se não encontrada
     */
    t(key, lang = null) {
        const targetLang = lang || this.currentLang;
        const translations = this.translations[targetLang];
        const decodeEntities = (value) => {
            const text = String(value || '');
            if (!text.includes('&') || typeof document === 'undefined' || !document.createElement) {
                return text;
            }
            const textarea = document.createElement('textarea');
            textarea.innerHTML = text;
            return textarea.value;
        };

        if (translations && translations[key]) {
            return decodeEntities(translations[key]);
        }

        // Fallback para português se não encontrar no idioma atual
        if (targetLang !== 'pt' && this.translations.pt[key]) {
            return decodeEntities(this.translations.pt[key]);
        }

        // Retorna a chave se não encontrar tradução
        return key;
    },

    /**
     * Altera o idioma atual
     * @param {string} lang - 'pt' ou 'en'
     */
    setLanguage(lang) {
        if (lang !== 'pt' && lang !== 'en') {
            return false;
        }

        this.currentLang = lang;

        // Salva preferência
        try {
            localStorage.setItem('foxy-lang', lang);
        } catch (e) {
        }

        return true;
    },

    /**
     * Carrega o idioma salvo
     */
    loadSavedLanguage() {
        try {
            const saved = localStorage.getItem('foxy-lang');
            if (saved && (saved === 'pt' || saved === 'en')) {
                this.currentLang = saved;
                return saved;
            }
        } catch (e) {
        }
        return this.currentLang;
    },

    /**
     * Alterna entre PT e EN
     * @returns {string} Novo idioma
     */
    toggle() {
        const newLang = this.currentLang === 'pt' ? 'en' : 'pt';
        this.setLanguage(newLang);
        return newLang;
    },

    /**
     * Atualiza o atributo lang do HTML
     */
    updateHtmlLang() {
        document.documentElement.lang = this.currentLang === 'pt' ? 'pt-BR' : 'en';
    },

    /**
     * Aplica traduções automáticas nos elementos com data-i18n
     * Atualiza textos, placeholders e atributos title conforme o idioma atual
     */
    applyTranslations() {
        // Aplica textos
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (key) {
                const translated = this.t(key);
                const shouldUseHtml = el.hasAttribute('data-i18n-html') ||
                    (typeof key === 'string' && key.startsWith('tool.pointer.') && typeof translated === 'string' && translated.includes('&#x'));
                if (shouldUseHtml) {
                    el.innerHTML = translated;
                } else {
                    el.textContent = translated;
                }
            }
        });

        // Aplica placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (key) {
                el.placeholder = this.t(key);
            }
        });

        // Aplica tooltips (title)
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            if (key) {
                el.title = this.t(key);
            }
        });

        this.updateHtmlLang();
        document.dispatchEvent(new CustomEvent('i18n-updated', {
            detail: { lang: this.currentLang }
        }));
    }
};

// Carrega idioma salvo ao iniciar
I18n.loadSavedLanguage();

// Expõe globalmente
window.I18n = I18n;

// Sincroniza idioma com o menu principal (main process) após DOM estar pronto
document.addEventListener('DOMContentLoaded', () => {
    if (typeof require !== 'undefined') {
        try {
            const { ipcRenderer } = require('electron');
            // Envia o idioma atual para o main process sincronizar o menu
            setTimeout(() => {
                ipcRenderer.send('change-menu-language', I18n.currentLang);
            }, 100);
        } catch (e) {
            // Não está no Electron, ignora
        }
    }
});


