@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Foxy Hex Editor - Build System

set "GREEN=[OK]"
set "BLUE=[INFO]"
set "RED=[ERROR]"
set "YELLOW=[WARNING]"
set "LANG=EN"

:lang_selection
cls
echo ========================================================
echo   SELECT YOUR LANGUAGE / SELECIONE SEU IDIOMA
echo ========================================================
echo.
echo  [1] English
echo  [2] Portugues
echo  [0] Exit / Sair
echo.
set "lang_opt="
set /p "lang_opt=Choice/Escolha: "
set "lang_opt=!lang_opt: =!"

if "!lang_opt!"=="1" (
    set "LANG=EN"
    goto menu
)
if "!lang_opt!"=="2" (
    set "LANG=PT"
    goto menu
)
if "!lang_opt!"=="0" goto end

call :show_invalid_option
goto lang_selection

:menu
cls
if /i "!LANG!"=="PT" (
    echo ========================================================
    echo             FOXY HEX EDITOR - SISTEMA DE BUILD
    echo ========================================================
    echo.
    echo  [1] Build para Windows ^(Portavel^)
    echo  [2] Build para Linux ^(AppImage^)
    echo  [3] Build para Ambos ^(Windows Portavel + Linux AppImage^)
    echo  [9] Trocar Idioma ^(Change Language^)
    echo  [0] Sair
    echo.
    echo ========================================================
    set "opt="
    set /p "opt=Escolha uma opcao: "
) else (
    echo ========================================================
    echo             FOXY HEX EDITOR - BUILD SYSTEM
    echo ========================================================
    echo.
    echo  [1] Build for Windows ^(Portable^)
    echo  [2] Build for Linux ^(AppImage^)
    echo  [3] Build for Both ^(Windows Portable + Linux AppImage^)
    echo  [9] Change Language ^(Trocar Idioma^)
    echo  [0] Exit
    echo.
    echo ========================================================
    set "opt="
    set /p "opt=Choose an option: "
)

set "opt=!opt: =!"

if "!opt!"=="0" goto end
if "!opt!"=="9" goto lang_selection
if "!opt!"=="1" goto build_win_portable
if "!opt!"=="2" goto build_linux
if "!opt!"=="3" goto build_all

call :show_invalid_option
goto menu

:check_node
echo.
if /i "!LANG!"=="PT" (
    echo !BLUE! Verificando ambiente...
) else (
    echo !BLUE! Checking environment...
)

node --version >nul 2>&1
if errorlevel 1 (
    if /i "!LANG!"=="PT" (
        echo !RED! Node.js nao encontrado. Por favor, instale o Node.js.
    ) else (
        echo !RED! Node.js not found. Please install Node.js.
    )
    exit /b 1
)

if /i "!LANG!"=="PT" (
    echo !GREEN! Node.js detectado.
) else (
    echo !GREEN! Node.js detected.
)
exit /b 0

:install_deps
if /i "!LANG!"=="PT" (
    echo !BLUE! Verificando modulos compartilhados...
) else (
    echo !BLUE! Checking shared modules...
)

if not exist "node_modules\electron\package.json" (
    if /i "!LANG!"=="PT" (
        echo !RED! Modulos Electron nao encontrados.
        echo !BLUE! Rode: D:\Claude\_electron_shared\Instalar-Modulos.bat
        echo !BLUE! Depois: D:\Claude\_electron_shared\Ligar-Apps.bat
    ) else (
        echo !RED! Electron modules not found.
        echo !BLUE! Run: D:\Claude\_electron_shared\Instalar-Modulos.bat
        echo !BLUE! Then: D:\Claude\_electron_shared\Ligar-Apps.bat
    )
    exit /b 1
)

if /i "!LANG!"=="PT" (
    echo !GREEN! Modulos compartilhados OK.
) else (
    echo !GREEN! Shared modules OK.
)
exit /b 0

:prepare_build
call :check_node
if errorlevel 1 (
    pause
    exit /b 1
)

call :install_deps
if errorlevel 1 (
    pause
    exit /b 1
)

exit /b 0

:build_win_portable
call :prepare_build
if errorlevel 1 goto menu

echo.
if /i "!LANG!"=="PT" (
    echo !BLUE! Iniciando build para Windows Portavel ^(x64^)...
) else (
    echo !BLUE! Starting build for Windows Portable ^(x64^)...
)

call npx electron-builder --win portable --x64 --publish=never
if errorlevel 1 (
    if /i "!LANG!"=="PT" (
        echo !RED! Build portavel falhou.
    ) else (
        echo !RED! Portable build failed.
    )
    pause
    goto menu
)

if /i "!LANG!"=="PT" (
    echo !GREEN! Build portavel concluido com sucesso!
    echo !BLUE! Arquivo disponivel na pasta: .\dist\
) else (
    echo !GREEN! Portable build completed successfully!
    echo !BLUE! File available in folder: .\dist\
)
pause
goto menu

:build_linux
call :prepare_build
if errorlevel 1 goto menu

echo.
if /i "!LANG!"=="PT" (
    echo !YELLOW! Nota: Build para Linux requer WSL2 ou ambiente Linux nativo.
    echo !BLUE! Iniciando build para Linux ^(AppImage^)...
) else (
    echo !YELLOW! Note: Build for Linux requires WSL2 or native Linux environment.
    echo !BLUE! Starting build for Linux ^(AppImage^)...
)

call npx electron-builder --linux AppImage --x64 --publish=never
if errorlevel 1 (
    if /i "!LANG!"=="PT" (
        echo !RED! Build para Linux falhou.
        echo !BLUE! Dica: No WSL, instale: sudo apt install -y dpkg fakeroot rpm
    ) else (
        echo !RED! Build for Linux failed.
        echo !BLUE! Tip: On WSL, install: sudo apt install -y dpkg fakeroot rpm
    )
    pause
    goto menu
)

if /i "!LANG!"=="PT" (
    echo !GREEN! Build para Linux concluido com sucesso!
    echo !BLUE! Arquivos disponiveis na pasta: .\dist\
) else (
    echo !GREEN! Build for Linux completed successfully!
    echo !BLUE! Files available in folder: .\dist\
)
pause
goto menu

:build_all
call :prepare_build
if errorlevel 1 goto menu

echo.
if /i "!LANG!"=="PT" (
    echo !BLUE! Iniciando build multiplataforma ^(Windows Portavel + Linux AppImage^)...
) else (
    echo !BLUE! Starting multiplatform build ^(Windows Portable + Linux AppImage^)...
)

call npx electron-builder --win portable --linux AppImage --x64 --publish=never
if errorlevel 1 (
    if /i "!LANG!"=="PT" (
        echo !YELLOW! Alguns builds podem ter falhado ^(verifique os logs acima^).
    ) else (
        echo !YELLOW! Some builds may have failed ^(check the logs above^).
    )
    pause
    goto menu
)

if /i "!LANG!"=="PT" (
    echo !GREEN! Todos os builds concluidos com sucesso!
) else (
    echo !GREEN! All builds completed successfully!
)
pause
goto menu

:show_invalid_option
echo.
if /i "!LANG!"=="PT" (
    echo !YELLOW! Opcao invalida. Tente novamente.
    timeout /t 1 >nul
) else (
    echo !YELLOW! Invalid option. Please try again.
    timeout /t 1 >nul
)
exit /b 0

:end
endlocal
exit /b 0
