Unicode true
Name "Foxy Hex Editor"
OutFile "${PORTABLE_OUTPUT}"
Icon "${PORTABLE_ICON}"
VIProductVersion "${PORTABLE_VERSION}"
VIAddVersionKey "ProductName" "Foxy Hex Editor"
VIAddVersionKey "FileDescription" "Foxy Hex Editor Portable"
VIAddVersionKey "FileVersion" "${PORTABLE_VERSION}"
VIAddVersionKey "LegalCopyright" "Foxy Hex Editor Contributors"
RequestExecutionLevel user
SilentInstall silent
SetCompressor zlib

Section
    ClearErrors
    CreateDirectory "$EXEDIR\.foxy-data\runtime"
    IfErrors setupFailed

    GetTempFileName $1 "$EXEDIR\.foxy-data\runtime"
    IfErrors setupFailed
    Delete "$1"
    IfErrors setupFailed
    CreateDirectory "$1"
    IfErrors setupFailed
    StrCpy $INSTDIR "$1"

    SetOutPath "$INSTDIR"
    File /r "${PORTABLE_PAYLOAD}\*.*"
    IfErrors extractFailed

    ExecWait '"$INSTDIR\${PORTABLE_APP_EXE}" "--foxy-portable-exe=$EXEPATH"' $0
    IfErrors extractFailed
    Goto cleanup

extractFailed:
    MessageBox MB_OK|MB_ICONSTOP "Nao foi possivel extrair ou iniciar o Foxy Hex Editor em:$\r$\n$INSTDIR"
    StrCpy $0 1
cleanup:
    SetOutPath "$EXEDIR"
    RMDir /r "$INSTDIR"
    RMDir "$EXEDIR\.foxy-data\runtime"
    SetErrorLevel $0
    Goto done

setupFailed:
    MessageBox MB_OK|MB_ICONSTOP "O Foxy Hex Editor precisa de permissao de gravacao nesta pasta:$\r$\n$EXEDIR"
    SetErrorLevel 1
done:
SectionEnd
