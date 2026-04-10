// === SISTEMA COMPLETO SHIFT-JIS PARA FOXY HEX EDITOR ===
// Versão otimizada - varredura apenas quando necessário

(function() {
    
    // === MAPEAMENTO SHIFT-JIS EXPANDIDO ===
    const SHIFT_JIS_MAP = {
        // Katakana completo
        "8259": "カ", "825A": "キ", "825B": "ク", "825C": "ケ", "825D": "コ",
        "825E": "サ", "825F": "シ", "8260": "ス", "8261": "セ", "8262": "ソ",
        "8263": "タ", "8264": "チ", "8265": "ツ", "8266": "テ", "8267": "ト",
        "8268": "ナ", "8269": "ニ", "826A": "ヌ", "826B": "ネ", "826C": "ノ",
        "826D": "ハ", "826E": "ヒ", "826F": "フ", "8270": "ヘ", "8271": "ホ",
        "8272": "マ", "8273": "ミ", "8274": "ム", "8275": "メ", "8276": "モ",
        "8277": "ヤ", "8278": "ユ", "8279": "ヨ",
        "827A": "ラ", "827B": "リ", "827C": "ル", "827D": "レ", "827E": "ロ",
        "8280": "ワ", "8281": "ヲ", "8282": "ン", "8283": "ヴ", "8284": "ヵ", "8285": "ヶ",
        
        // Katakana pequenos e com marcas
        "824F": "ァ", "8250": "ア", "8251": "ィ", "8252": "イ", "8253": "ゥ", 
        "8254": "ウ", "8255": "ェ", "8256": "エ", "8257": "ォ", "8258": "オ",
        
        // Half-width katakana
        "8140": "ｦ", "8141": "ｧ", "8142": "ｨ", "8143": "ｩ", "8144": "ｪ",
        "8145": "ｫ", "8146": "ｯ", "8147": "ｱ", "8148": "ｲ", "8149": "ｳ",
        "814A": "ｴ", "814B": "ｵ", "814C": "ｶ", "814D": "ｷ", "814E": "ｸ",
        "814F": "ｹ", "8150": "ｺ", "8151": "ｻ", "8152": "ｼ", "8153": "ｽ",
        "8154": "ｾ", "8155": "ｿ", "8156": "ﾀ", "8157": "ﾁ", "8158": "ﾂ",
        "8159": "ﾃ", "815A": "ﾄ", "815B": "ﾅ", "815C": "ﾆ", "815D": "ﾇ",
        "815E": "ﾈ", "815F": "ﾉ", "8160": "ﾊ", "8161": "ﾋ", "8162": "ﾌ",
        "8163": "ﾍ", "8164": "ﾎ", "8165": "ﾏ", "8166": "ﾐ", "8167": "ﾑ",
        "8168": "ﾒ", "8169": "ﾓ", "816A": "ﾔ", "816B": "ﾕ", "816C": "ﾖ",
        "816D": "ﾗ", "816E": "ﾘ", "816F": "ﾙ", "8170": "ﾚ", "8171": "ﾛ",
        "8172": "ﾜ", "8173": "ﾝ", "8174": "ﾞ", "8175": "ﾟ",
        
        // Hiragana básico
        "829F": "あ", "82A0": "い", "82A1": "う", "82A2": "え", "82A3": "お",
        "82A4": "か", "82A5": "き", "82A6": "く", "82A7": "け", "82A8": "こ",
        "82A9": "さ", "82AA": "し", "82AB": "す", "82AC": "せ", "82AD": "そ",
        "82AE": "た", "82AF": "ち", "82B0": "つ", "82B1": "て", "82B2": "と",
        "82B3": "な", "82B4": "に", "82B5": "ぬ", "82B6": "ね", "82B7": "の",
        "82B8": "は", "82B9": "ひ", "82BA": "ふ", "82BB": "へ", "82BC": "ほ",
        "82BD": "ま", "82BE": "み", "82BF": "む", "82C0": "め", "82C1": "も",
        "82C2": "や", "82C3": "ゆ", "82C4": "よ",
        "82C5": "ら", "82C6": "り", "82C7": "る", "82C8": "れ", "82C9": "ろ",
        "82CA": "わ", "82CB": "ゐ", "82CC": "ゑ", "82CD": "を", "82CE": "ん",
        
        // Kanji comuns
        "88EA": "一", "93F1": "二", "8E4F": "三", "8E6C": "四", "8CE0": "五",
        "98Z1": "六", "8E75": "七", "94AA": "八", "8BE3": "九", "8F5C": "十",
        "9843": "山", "90EC": "川", "93c0": "田", "90lC": "人", "93FA": "日",
        "8C8E": "月", "89CE": "火", "9085": "水", "96D8": "木", "8B64": "金",
        "9379": "土", "93FA": "日", "967B": "本", "8D91": "国", "89BC": "家",
        "9286": "学", "8DZ0": "校", "90E6": "生", "8Fo6": "先", "90E5": "年",
        
        // Símbolos e pontuação japonesa
        "8142": "。", "8143": "「", "8144": "」", "8145": "、", "8146": "・",
        "8149": "！", "814A": "\"", "814C": "＄", "814D": "％", "814E": "＆",
        "8175": "＝", "8176": "―", "8180": "（", "8181": "）", "8183": "［",
        "8184": "］", "8185": "｛", "8186": "｝", "8187": "〈", "8188": "〉",
        "8189": "《", "818A": "》", "818B": "「", "818C": "」", "818D": "『",
        "818E": "』", "818F": "【", "8190": "】",
        
        // Números em largura completa
        "824F": "０", "8250": "１", "8251": "２", "8252": "３", "8253": "４",
        "8254": "５", "8255": "６", "8256": "７", "8257": "８", "8258": "９",
        
        // Letras romanas em largura completa
        "8260": "Ａ", "8261": "Ｂ", "8262": "Ｃ", "8263": "Ｄ", "8264": "Ｅ",
        "8265": "Ｆ", "8266": "Ｇ", "8267": "Ｈ", "8268": "Ｉ", "8269": "Ｊ",
        "826A": "Ｋ", "826B": "Ｌ", "826C": "Ｍ", "826D": "Ｎ", "826E": "Ｏ",
        "826F": "Ｐ", "8270": "Ｑ", "8271": "Ｒ", "8272": "Ｓ", "8273": "Ｔ",
        "8274": "Ｕ", "8275": "Ｖ", "8276": "Ｗ", "8277": "Ｘ", "8278": "Ｙ",
        "8279": "Ｚ",
        "8281": "ａ", "8282": "ｂ", "8283": "ｃ", "8284": "ｄ", "8285": "ｅ",
        "8286": "ｆ", "8287": "ｇ", "8288": "ｈ", "8289": "ｉ", "828A": "ｊ",
        "828B": "ｋ", "828C": "ｌ", "828D": "ｍ", "828E": "ｎ", "828F": "ｏ",
        "8290": "ｐ", "8291": "ｑ", "8292": "ｒ", "8293": "ｓ", "8294": "ｔ",
        "8295": "ｕ", "8296": "ｖ", "8297": "ｗ", "8298": "ｘ", "8299": "ｙ",
        "829A": "ｚ"
    };
    
    // === CLASSE PRINCIPAL DO SISTEMA SHIFT-JIS ===
    class ShiftJISSystem {
        constructor() {
            this.isActive = false;
            this.mapping = new Map(Object.entries(SHIFT_JIS_MAP));
            this.customMappings = new Map();
            this.processedElements = new Set();
            this.stats = {
                processed: 0,
                replaced: 0,
                errors: 0
            };
        }
        
        // === DECODIFICAÇÃO SHIFT-JIS ===
        decodeShiftJIS(data, offset = 0, length = 16) {
            let result = '';
            let i = offset;
            let processed = 0;
            
            while (i < data.length && processed < length) {
                const byte1 = data[i];
                
                // Verificar se é lead byte Shift-JIS
                if ((byte1 >= 0x81 && byte1 <= 0x9F) || (byte1 >= 0xE0 && byte1 <= 0xFC)) {
                    // Caractere de 2 bytes
                    if (i + 1 < data.length) {
                        const byte2 = data[i + 1];
                        const hexCode = byte1.toString(16).toUpperCase().padStart(2, '0') + 
                                       byte2.toString(16).toUpperCase().padStart(2, '0');
                        
                        // Verificar mapping customizado primeiro, depois padrão
                        if (this.customMappings.has(hexCode)) {
                            result += this.customMappings.get(hexCode);
                        } else if (this.mapping.has(hexCode)) {
                            result += this.mapping.get(hexCode);
                        } else {
                            result += `[${hexCode}]`;
                        }
                        i += 2;
                        processed++;
                    } else {
                        result += '.';
                        i += 1;
                        processed++;
                    }
                } else {
                    // Caractere ASCII de 1 byte
                    if (byte1 >= 0x20 && byte1 <= 0x7E) {
                        result += String.fromCharCode(byte1);
                    } else {
                        result += '.';
                    }
                    i += 1;
                    processed++;
                }
            }
            
            return result;
        }
        
        // === DETECÇÃO AUTOMÁTICA DE SHIFT-JIS ===
        detectShiftJIS(data) {
            if (!data || data.length < 2) return false;
            
            let shiftJISBytes = 0;
            let totalBytes = 0;
            
            for (let i = 0; i < Math.min(data.length, 1000); i++) {
                const byte = data[i];
                
                // Contar lead bytes Shift-JIS
                if ((byte >= 0x81 && byte <= 0x9F) || (byte >= 0xE0 && byte <= 0xFC)) {
                    if (i + 1 < data.length) {
                        const byte2 = data[i + 1];
                        if ((byte2 >= 0x40 && byte2 <= 0x7E) || (byte2 >= 0x80 && byte2 <= 0xFC)) {
                            shiftJISBytes += 2;
                            i++; // Pular o trail byte
                        }
                    }
                }
                totalBytes++;
            }
            
            const percentage = (shiftJISBytes / totalBytes) * 100;
            
            return percentage > 20; // Se mais de 20% são bytes Shift-JIS
        }
        
        // === PROCESSAMENTO DE ELEMENTOS DOM ===
        processElement(element) {
            if (this.processedElements.has(element)) return false;
            
            try {
                const text = element.textContent;
                if (!text) return false;
                
                // Verificar se contém padrões que parecem ser decodificação ASCII incorreta de Shift-JIS
                const shiftJISPatterns = [
                    /\.[Y-Z]\.[\\\|]/g,  // .Y.\ - padrão comum
                    /\.[A-Z]\.[\\\|]/g,  // .X.\ - variações
                    /\.\w\.\w/g,        // .X.Y - padrão geral
                ];
                
                let hasShiftJISPattern = false;
                for (const pattern of shiftJISPatterns) {
                    if (pattern.test(text)) {
                        hasShiftJISPattern = true;
                        break;
                    }
                }
                
                if (hasShiftJISPattern) {
                    // Tentar extrair offset do elemento
                    let offset = this.extractOffset(element);
                    
                    if (offset !== null && window.hexEditor && typeof window.hexEditor.getRangeAt === 'function' && typeof window.hexEditor.getDataLength === 'function' && offset < window.hexEditor.getDataLength()) {
                        // Decodificar usando a API unificada do editor
                        const decodedBytes = window.hexEditor.getRangeAt(offset, 16);
                        const decodedText = this.decodeShiftJIS(decodedBytes, 0, 16);
                        
                        if (decodedText !== text) {
                            // Aplicar estilo japonês
                            element.style.fontFamily = "'Noto Sans JP', 'Hiragino Sans', 'Meiryo', 'MS PGothic', 'Yu Gothic', monospace";
                            element.style.fontSize = "14px";
                            element.style.lineHeight = "1.4";
                            
                            // Substituir texto
                            element.textContent = decodedText;
                            
                            this.stats.replaced++;
                            
                            this.processedElements.add(element);
                            return true;
                        }
                    } else {
                        // Fallback: substituição por padrão
                        let newText = text;
                        
                        // Substituições conhecidas
                        const commonReplacements = {
                            '.Y.\\': 'カケ',
                            '.Z.\\': 'コケ',
                            '.X.\\': 'クケ',
                            '.W.\\': 'キケ'
                        };
                        
                        for (const [pattern, replacement] of Object.entries(commonReplacements)) {
                            if (newText.includes(pattern)) {
                                newText = newText.replace(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement);
                                this.stats.replaced++;
                            }
                        }
                        
                        if (newText !== text) {
                            element.style.fontFamily = "'Noto Sans JP', 'Hiragino Sans', 'Meiryo', monospace";
                            element.textContent = newText;
                            this.processedElements.add(element);
                            return true;
                        }
                    }
                }
                
                this.stats.processed++;
                return false;
                
            } catch (error) {
                this.stats.errors++;
                // console.warn('⚠️ Erro processando elemento:', error);
                return false;
            }
        }
        
        // === EXTRAIR OFFSET DO ELEMENTO ===
        extractOffset(element) {
            // Tentar múltiplas formas de extrair o offset
            
            // Método 1: data-offset direto
            if (element.hasAttribute('data-offset')) {
                return parseInt(element.getAttribute('data-offset'));
            }
            
            // Método 2: buscar em filhos
            const dataOffsetChild = element.querySelector('[data-offset]');
            if (dataOffsetChild) {
                return parseInt(dataOffsetChild.getAttribute('data-offset'));
            }
            
            // Método 3: buscar em parent
            let parent = element.parentElement;
            while (parent) {
                if (parent.hasAttribute('data-offset')) {
                    return parseInt(parent.getAttribute('data-offset'));
                }
                const parentChild = parent.querySelector('[data-offset]');
                if (parentChild) {
                    return parseInt(parentChild.getAttribute('data-offset'));
                }
                parent = parent.parentElement;
            }
            
            // Método 4: tentar extrair do texto do elemento irmão (offset hex)
            const siblings = element.parentElement?.children;
            if (siblings) {
                for (const sibling of siblings) {
                    const text = sibling.textContent;
                    if (/^[0-9A-F]{8}$/i.test(text)) {
                        return parseInt(text, 16);
                    }
                }
            }
            
            return null;
        }
        
        // === VARREDURA COMPLETA DO DOM ===
        scanDOM() {
            
            const selectors = [
                '[data-panel="ascii"]',
                '[class*="ascii"]',
                '[class*="text"]',
                '[id*="ascii"]',
                '[id*="text"]',
                'span[data-offset]',
                'div[style*="grid"]',
                '.hex-line',
                '[class*="line"]',
                'span, div, p' // Seletor mais amplo
            ];
            
            let processedCount = 0;
            let modifiedCount = 0;
            
            for (const selector of selectors) {
                try {
                    const elements = document.querySelectorAll(selector);
                    
                    for (const element of elements) {
                        processedCount++;
                        if (this.processElement(element)) {
                            modifiedCount++;
                        }
                    }
                } catch (error) {
                    console.warn(`⚠️ Erro com seletor ${selector}:`, error);
                }
            }
            
            return modifiedCount > 0;
        }
        
        // === ATIVAR SISTEMA ===
        activate() {
            if (this.isActive) {
                return;
            }
            
            
            // Auto-detectar se há dados Shift-JIS
            if (window.hexEditor && typeof window.hexEditor.getRangeAt === 'function' && typeof window.hexEditor.getDataLength === 'function' && window.hexEditor.getDataLength() > 0) {
                const sampleLength = Math.min(window.hexEditor.getDataLength(), 1000);
                const isShiftJIS = this.detectShiftJIS(window.hexEditor.getRangeAt(0, sampleLength));
            }
            
            this.isActive = true;
        }
        
        // === DESATIVAR SISTEMA ===
        deactivate() {
            if (!this.isActive) return;
            
            this.isActive = false;
        }
        
        // === CARREGAR TABELA CUSTOMIZADA ===
        loadCustomTable(tableData) {
            if (!tableData || !tableData.mappings) {
                // console.error('❌ Dados de tabela inválidos');
                return false;
            }
            
            let loadedCount = 0;
            for (const [hex, char] of Object.entries(tableData.mappings)) {
                if (/^[0-9A-Fa-f]+$/.test(hex)) {
                    this.customMappings.set(hex.toUpperCase(), char);
                    loadedCount++;
                }
            }
            
            
            // Fazer varredura apenas quando uma tabela é carregada
            if (this.isActive && loadedCount > 0) {
                this.processedElements.clear();
                this.scanDOM();
            }
            
            return true;
        }
        
        // === ESTATÍSTICAS ===
        getStats() {
            return {
                ...this.stats,
                isActive: this.isActive,
                mappingSize: this.mapping.size,
                customMappingSize: this.customMappings.size,
                processedElementsCount: this.processedElements.size
            };
        }
    }
    
    // === INSTÂNCIA GLOBAL ===
    window.shiftJISSystem = new ShiftJISSystem();
    
    // === FUNÇÕES DE CONVENIÊNCIA ===
    window.activateShiftJIS = () => window.shiftJISSystem.activate();
    window.deactivateShiftJIS = () => window.shiftJISSystem.deactivate();
    window.loadShiftJISTable = (tableData) => window.shiftJISSystem.loadCustomTable(tableData);
    window.getShiftJISStats = () => window.shiftJISSystem.getStats();
    window.scanShiftJIS = () => window.shiftJISSystem.scanDOM();
    
    // === AUTO-ATIVAÇÃO ===
    function autoActivate() {
        if (!window.hexEditor) {
            setTimeout(autoActivate, 500);
            return;
        }
        
        window.shiftJISSystem.activate();
    }
    
    // Iniciar auto-ativação
    autoActivate();
    
})();
