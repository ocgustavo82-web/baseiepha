@echo off
chcp 65001 >nul
title Geoportal de Minas Gerais - WebGIS Interativo

echo ========================================================
echo    INICIANDO O GEOPORTAL DE MINAS GERAIS (WEBGIS)
echo ========================================================
echo.

cd /d "%~dp0"

:: Verificar se o Node.js está disponível
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Node.js detectado.
    echo [OK] Iniciando servidor local na porta 8080...
    echo.
    echo O Geoportal sera aberto no seu navegador padrao:
    echo http://localhost:8080
    echo.
    start "" "http://localhost:8080"
    node server.js
) else (
    echo [AVISO] Node.js nao encontrado no PATH do sistema.
    echo [INFO] Abrindo o Geoportal diretamente no seu navegador...
    start "" "%~dp0index.html"
)

pause
