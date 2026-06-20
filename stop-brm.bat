@echo off
REM ============================================================
REM  BRM - Encerra tudo de forma limpa
REM  Ordem: Backend -> Frontend -> PostgreSQL
REM  Nao mexe no navegador - feche a aba manualmente.
REM  PRECISA rodar como Administrador (por causa do servico do PG)
REM ============================================================
chcp 65001 >nul
title BRM Stop

REM Verifica admin via fsutil (mais confiavel que net session)
fsutil dirty query %SystemDrive% >nul 2>&1
if errorlevel 1 (
    echo.
    echo [AVISO] Execute este script como Administrador
    echo         ^(botao direito -^> Executar como administrador^)
    echo.
    pause
    exit /b 1
)

set "BACKEND_PORT=3001"
set "FRONTEND_PORT=5173"
set "PG_SERVICE=postgresql-x64-18"

echo.
echo ============================================================
echo   BRM - Encerrando ambiente
echo ============================================================
echo.

REM ---- Backend e Frontend -------------------------------------
echo [1/3] Parando Backend (porta %BACKEND_PORT%) e Frontend (porta %FRONTEND_PORT%)...
for %%P in (%BACKEND_PORT% %FRONTEND_PORT%) do (
    for /f "tokens=5" %%A in ('netstat -ano ^| findstr ":%%P " ^| findstr "LISTENING"') do (
        echo       Matando PID %%A na porta %%P...
        taskkill /PID %%A /F >nul 2>&1
    )
)

REM Fecha as janelas de console "BRM Backend" e "BRM Frontend"
taskkill /FI "WINDOWTITLE eq BRM Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq BRM Frontend*" /F >nul 2>&1

echo       Back e front encerrados.
echo.

REM ---- Aguarda sockets fecharem -------------------------------
echo [2/3] Aguardando 3s para sockets fecharem...
timeout /t 3 /nobreak >nul
echo.

REM ---- PostgreSQL (shutdown educado via servico) --------------
echo [3/3] Parando PostgreSQL (%PG_SERVICE%)...
net stop %PG_SERVICE% >nul 2>&1
if errorlevel 1 (
    echo       PostgreSQL ja estava parado ou falha ao parar.
) else (
    echo       PostgreSQL parado de forma limpa.
)

echo.
echo ============================================================
echo   Tudo encerrado. Voce pode fechar a aba do navegador
echo   manualmente em http://localhost:%FRONTEND_PORT%
echo ============================================================
echo.
timeout /t 3 /nobreak >nul
exit /b 0
