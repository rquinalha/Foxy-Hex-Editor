@echo off
setlocal EnableExtensions
pushd "%~dp0" || exit /b 1

where node >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Instale o Node.js para gerar o executavel.
    goto failed
)

if not exist "node_modules" (
    call npm ci --include=dev
    if errorlevel 1 goto failed
)

call npm run portable
if errorlevel 1 goto failed
popd
exit /b 0

:failed
echo [ERRO] Falha ao gerar o Foxy Hex Editor portavel.
popd
exit /b 1
