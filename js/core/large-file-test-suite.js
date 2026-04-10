class LargeFileTestSuite {
    constructor() {
        this.testResults = [];
        this.currentTest = null;
        this.startTime = null;
        
    }


    async runAllTests() {
        this.testResults = [];

        const tests = [
            { name: 'File Size Limits', fn: () => this.testFileSizeLimits() },
            { name: 'Enhanced Handler Initialization', fn: () => this.testEnhancedHandlerInit() },
            { name: 'Chunked Loading Performance', fn: () => this.testChunkedLoadingPerformance() },
            { name: 'Virtual Scrolling', fn: () => this.testVirtualScrolling() },
            { name: 'Memory Management', fn: () => this.testMemoryManagement() },
            { name: 'UI Responsiveness', fn: () => this.testUIResponsiveness() },
            { name: 'Error Handling', fn: () => this.testErrorHandling() }
        ];

        for (const test of tests) {
            await this.runTest(test.name, test.fn);
        }

        this.generateTestReport();
        return this.testResults;
    }


    async runTest(testName, testFn) {
        this.currentTest = testName;
        this.startTime = performance.now();

        try {
            const result = await testFn();
            const duration = performance.now() - this.startTime;
            
            this.testResults.push({
                name: testName,
                status: 'PASS',
                duration: Math.round(duration),
                result: result,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            const duration = performance.now() - this.startTime;
            
            this.testResults.push({
                name: testName,
                status: 'FAIL',
                duration: Math.round(duration),
                error: error.message,
                timestamp: new Date().toISOString()
            });
            
            console.error(`❌ ${testName}: FAIL (${Math.round(duration)}ms)`, error);
        }
    }

    testFileSizeLimits() {
        const tests = [
            { size: 50 * 1024 * 1024, shouldUseEnhanced: false }, // 50MB - normal
            { size: 150 * 1024 * 1024, shouldUseEnhanced: true }, // 150MB - enhanced
            { size: 1024 * 1024 * 1024, shouldUseEnhanced: true }, // 1GB - enhanced
            { size: 1.5 * 1024 * 1024 * 1024, shouldUseEnhanced: true }, // 1.5GB - enhanced (limite)
            { size: 2 * 1024 * 1024 * 1024, shouldUseEnhanced: false } // 2GB - rejeitado
        ];

        const results = tests.map(test => {
            const mockFile = { size: test.size, name: `test_${test.size}.bin` };
            
            if (window.hexEditor && window.hexEditor.enhancedLargeFileHandler) {
                const handler = window.hexEditor.enhancedLargeFileHandler;
                const shouldUse = handler.shouldUseLargeFileMode(mockFile);
                const isWithinLimit = test.size <= 1.5 * 1024 * 1024 * 1024;
                
                return {
                    size: test.size,
                    expected: test.shouldUseEnhanced && isWithinLimit,
                    actual: shouldUse,
                    withinLimit: isWithinLimit,
                    pass: (test.shouldUseEnhanced && isWithinLimit) === shouldUse
                };
            }
            
            return { size: test.size, pass: false, error: 'Handler not available' };
        });

        const allPass = results.every(r => r.pass);
        if (!allPass) {
            throw new Error(`File size limit tests failed: ${JSON.stringify(results)}`);
        }

        return { allPass, details: results };
    }

    testEnhancedHandlerInit() {
        if (!window.EnhancedLargeFileHandler) {
            throw new Error('EnhancedLargeFileHandler class not available');
        }

        if (!window.hexEditor) {
            throw new Error('hexEditor instance not available');
        }


        const handler = new window.EnhancedLargeFileHandler(window.hexEditor);
        
        const requiredProperties = [
            'chunkSize', 'maxCachedChunks', 'virtualScrollBuffer',
            'file', 'fileSize', 'totalChunks', 'chunkCache',
            'loadingPromises', 'accessOrder', 'isLargeFileMode'
        ];

        const missingProperties = requiredProperties.filter(prop => !(prop in handler));
        if (missingProperties.length > 0) {
            throw new Error(`Missing properties: ${missingProperties.join(', ')}`);
        }

        const requiredMethods = [
            'shouldUseLargeFileMode', 'loadLargeFile', 'getByteSync',
            'getBytes', 'getChunk', 'loadChunk', 'renderLargeFileContent'
        ];

        const missingMethods = requiredMethods.filter(method => typeof handler[method] !== 'function');
        if (missingMethods.length > 0) {
            throw new Error(`Missing methods: ${missingMethods.join(', ')}`);
        }

        return { 
            initialized: true, 
            chunkSize: handler.chunkSize,
            maxCachedChunks: handler.maxCachedChunks,
            virtualScrollBuffer: handler.virtualScrollBuffer
        };
    }

    async testChunkedLoadingPerformance() {
        if (!window.EnhancedLargeFileHandler) {
            throw new Error('EnhancedLargeFileHandler not available');
        }

        // Simular arquivo de 200MB
        const mockFileData = new ArrayBuffer(200 * 1024 * 1024);
        const mockFile = new File([mockFileData], 'test_200mb.bin', { type: 'application/octet-stream' });
        
        const handler = new window.EnhancedLargeFileHandler(window.hexEditor);
        
        const startTime = performance.now();
        
        // Simular configuração para arquivo grande
        handler.file = mockFile;
        handler.fileSize = mockFile.size;
        handler.totalChunks = Math.ceil(mockFile.size / handler.chunkSize);
        
        const setupTime = performance.now() - startTime;
        
        // Teste de cálculos básicos
        const expectedChunks = Math.ceil(mockFile.size / handler.chunkSize);
        if (handler.totalChunks !== expectedChunks) {
            throw new Error(`Chunk calculation error: expected ${expectedChunks}, got ${handler.totalChunks}`);
        }

        return {
            fileSize: mockFile.size,
            chunkSize: handler.chunkSize,
            totalChunks: handler.totalChunks,
            setupTime: Math.round(setupTime),
            chunksPerSecond: Math.round(handler.totalChunks / (setupTime / 1000))
        };
    }

    testVirtualScrolling() {
        const container = document.getElementById('hex-content');
        if (!container) {
            throw new Error('hex-content container not found');
        }

        // Simular arquivo grande
        const fileSize = 500 * 1024 * 1024; // 500MB
        const bytesPerLine = 16;
        const totalLines = Math.ceil(fileSize / bytesPerLine);
        const containerHeight = container.clientHeight || 600;
        const lineHeight = 25;
        const visibleLines = Math.floor(containerHeight / lineHeight);
        const virtualScrollBuffer = 50;

        // Verificar cálculos de virtual scrolling
        const calculations = {
            fileSize,
            totalLines,
            visibleLines,
            virtualScrollBuffer,
            maxScrollLines: Math.max(0, totalLines - visibleLines),
            memoryEfficiency: Math.round((visibleLines + virtualScrollBuffer) / totalLines * 100)
        };

        // Eficiência deve ser muito alta para arquivos grandes
        if (calculations.memoryEfficiency > 5) { // Mais de 5% seria ineficiente
        }

        return calculations;
    }

    testMemoryManagement() {
        if (!window.EnhancedLargeFileHandler) {
            throw new Error('EnhancedLargeFileHandler not available');
        }

        const handler = new window.EnhancedLargeFileHandler(window.hexEditor);
        
        // Teste de cache LRU
        const maxCachedChunks = handler.maxCachedChunks;
        const chunkSize = handler.chunkSize;
        const maxMemoryUsage = maxCachedChunks * chunkSize;

        // Simular adição de chunks ao cache
        for (let i = 0; i < maxCachedChunks + 5; i++) {
            const mockChunk = {
                index: i,
                data: new Uint8Array(chunkSize),
                loadTime: Date.now()
            };
            handler.addToCache(i, mockChunk);
        }

        // Verificar se cache não excedeu o limite
        if (handler.chunkCache.size > maxCachedChunks) {
            throw new Error(`Cache size exceeded: ${handler.chunkCache.size} > ${maxCachedChunks}`);
        }

        // Verificar se access order está funcionando
        if (handler.accessOrder.length !== handler.chunkCache.size) {
            throw new Error(`Access order mismatch: ${handler.accessOrder.length} != ${handler.chunkCache.size}`);
        }

        return {
            maxCachedChunks,
            chunkSize,
            maxMemoryUsage: Math.round(maxMemoryUsage / (1024 * 1024)), // MB
            currentCacheSize: handler.chunkCache.size,
            accessOrderSize: handler.accessOrder.length,
            memoryEfficient: handler.chunkCache.size <= maxCachedChunks
        };
    }

    async testUIResponsiveness() {
        const measurements = [];
        const testDuration = 1000; // 1 segundo
        const startTime = performance.now();

        // Simular operações de UI
        while (performance.now() - startTime < testDuration) {
            const opStart = performance.now();
            
            // Simular renderização
            if (window.hexEditor && window.hexEditor.render) {
                window.hexEditor.render();
            }
            
            const opDuration = performance.now() - opStart;
            measurements.push(opDuration);
            
            // Pequeno delay para não sobrecarregar
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        const avgResponseTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
        const maxResponseTime = Math.max(...measurements);
        const responsiveOps = measurements.filter(t => t < 16.67).length; // 60 FPS = 16.67ms
        const responsivePercentage = (responsiveOps / measurements.length) * 100;

        return {
            totalOperations: measurements.length,
            avgResponseTime: Math.round(avgResponseTime * 100) / 100,
            maxResponseTime: Math.round(maxResponseTime * 100) / 100,
            responsivePercentage: Math.round(responsivePercentage),
            targetFPS: 60,
            isResponsive: responsivePercentage > 80
        };
    }

    async testErrorHandling() {
        const errors = [];

        // Teste 1: Arquivo muito grande
        try {
            const hugeMockFile = { 
                size: 3 * 1024 * 1024 * 1024, // 3GB
                name: 'huge_file.bin' 
            };
            
            if (window.hexEditor) {
                await window.hexEditor.loadFile(hugeMockFile);
                errors.push('Should have rejected file > 1.5GB');
            }
        } catch (error) {
            // Esperado - arquivo muito grande
        }

        // Teste 2: Arquivo vazio
        try {
            const emptyMockFile = { 
                size: 0, 
                name: 'empty_file.bin' 
            };
            
            if (window.hexEditor) {
                await window.hexEditor.loadFile(emptyMockFile);
                errors.push('Should have rejected empty file');
            }
        } catch (error) {
            // Esperado - arquivo vazio
        }

        // Teste 3: Arquivo null/undefined
        try {
            if (window.hexEditor) {
                await window.hexEditor.loadFile(null);
                errors.push('Should have rejected null file');
            }
        } catch (error) {
            // Esperado - arquivo null
        }

        if (errors.length > 0) {
            throw new Error(`Error handling failed: ${errors.join(', ')}`);
        }

        return {
            testedScenarios: 3,
            allErrorsHandledCorrectly: true,
            errorTypes: ['file_too_large', 'empty_file', 'null_file']
        };
    }

    generateTestReport() {
        const passedTests = this.testResults.filter(t => t.status === 'PASS').length;
        const failedTests = this.testResults.filter(t => t.status === 'FAIL').length;
        const totalDuration = this.testResults.reduce((sum, t) => sum + t.duration, 0);

        const report = {
            summary: {
                total: this.testResults.length,
                passed: passedTests,
                failed: failedTests,
                successRate: Math.round((passedTests / this.testResults.length) * 100),
                totalDuration: totalDuration,
                timestamp: new Date().toISOString()
            },
            details: this.testResults,
            recommendations: this.generateRecommendations()
        };

        console.table(report.summary);
        
        if (failedTests > 0) {
            console.error('❌ Failed Tests:');
            this.testResults.filter(t => t.status === 'FAIL').forEach(test => {
                console.error(`  - ${test.name}: ${test.error}`);
            });
        }

        if (report.recommendations.length > 0) {
            // report.recommendations.forEach(rec => console.log(`  - ${rec}`));
        }

        return report;
    }

    generateRecommendations() {
        const recommendations = [];
        const failedTests = this.testResults.filter(t => t.status === 'FAIL');

        if (failedTests.length > 0) {
            recommendations.push('Investigate and fix failed tests before production use');
        }

        const slowTests = this.testResults.filter(t => t.duration > 1000);
        if (slowTests.length > 0) {
            recommendations.push('Optimize performance for slow operations');
        }

        const uiTest = this.testResults.find(t => t.name === 'UI Responsiveness');
        if (uiTest && uiTest.result && uiTest.result.responsivePercentage < 80) {
            recommendations.push('Improve UI responsiveness - consider reducing render frequency');
        }

        const memoryTest = this.testResults.find(t => t.name === 'Memory Management');
        if (memoryTest && memoryTest.result && !memoryTest.result.memoryEfficient) {
            recommendations.push('Review memory management settings');
        }

        return recommendations;
    }

    // Teste rápido para validação básica
    async quickTest() {
        
        const quickTests = [
            { name: 'Enhanced Handler Available', fn: () => this.testEnhancedHandlerInit() },
            { name: 'File Size Limits', fn: () => this.testFileSizeLimits() }
        ];

        let passed = 0;
        for (const test of quickTests) {
            try {
                await test.fn();
                passed++;
            } catch (error) {
                // console.error(`❌ ${test.name}: FAIL`, error.message);
            }
        }

        const success = passed === quickTests.length;
        
        return { success, passed, total: quickTests.length };
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.LargeFileTestSuite = LargeFileTestSuite;
    
    // Função de conveniência para executar testes
    window.testLargeFileSystem = async function(quick = false) {
        const testSuite = new LargeFileTestSuite();
        return quick ? await testSuite.quickTest() : await testSuite.runAllTests();
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LargeFileTestSuite;
}