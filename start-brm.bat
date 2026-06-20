@echo off
REM ============================================================
REM  BRM - Script de inicializacao do ambiente local
REM  Sobe: PostgreSQL (se parado) -> Backend -> Frontend
REM  Mata processos fantasmas nas portas 3001 e 5173 antes
REM ============================================================
chcp 65001 >nul
title BRM Launcher

REM ---- Configuracoes (edite se necessario) --------------------
set "PROJECT_DIR=%~dp0"
set "PG_BIN=C:\Program Files\PostgreSQL\18\bin"
set "PG_DATA=C:\Program Files\PostgreSQL\18\data"
set "PG_PORT=5523"
set "BACKEND_PORT=3001"
set "FRONTEND_PORT=5173"
set "FRONTEND_URL=http://localhost:5173"
REM -------------------------------------------------------------

echo.
echo ============================================================
echo   BRM - Iniciando ambiente de desenvolvimento
echo ============================================================
echo.

cd /d "%PROJECT_DIR%"

REM ============================================================
REM  0) Limpa processos fantasmas nas portas do back e front
REM ============================================================
echo [0/3] Liberando portas %BACKEND_PORT% e %FRONTEND_PORT%...
for %%P in (%BACKEND_PORT% %FRONTEND_PORT%) do (
    for /f "tokens=5" %%A in ('netstat -ano ^| findstr ":%%P " ^| findstr "LISTENING"') do (
        echo       Matando processo fantasma PID %%A na porta %%P...
        taskkill /PID %%A /F >nul 2>&1
    )
)
echo       Portas liberadas.
echo.

REM ============================================================
REM  1) PostgreSQL
REM ============================================================
echo [1/3] Verificando PostgreSQL na porta %PG_PORT%...

netstat -ano | findstr ":%PG_PORT% " | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo       PostgreSQL ja esta rodando. OK.
    goto pg_done
)

echo       PostgreSQL parado. Iniciando...
if not exist "%PG_BIN%\pg_ctl.exe" (
    echo.
    echo   [ERRO] pg_ctl.exe nao encontrado em:
    echo          %PG_BIN%
    echo   Edite PG_BIN no topo deste script.
    pause
    exit /b 1
)

"%PG_BIN%\pg_ctl.exe" start -D "%PG_DATA%" -w -t 30 >nul 2>&1
if errorlevel 1 (
    echo.
    echo   [ERRO] Falha ao iniciar PostgreSQL.
    echo   Rode manualmente:
    echo     "%PG_BIN%\pg_ctl.exe" start -D "%PG_DATA%"
    pause
    exit /b 1
)
echo       PostgreSQL iniciado.

:pg_done
echo.

REM ============================================================
REM  2) Backend
REM ============================================================
echo [2/3] Subindo Backend na porta %BACKEND_PORT%...
start "BRM Backend" cmd /k "cd /d %PROJECT_DIR% && npm run server:dev"
echo       Aguardando backend responder...

set TRIES=0
:wait_backend
set /a TRIES=TRIES+1
netstat -ano | findstr ":%BACKEND_PORT% " | findstr "LISTENING" >nul
if %errorlevel% equ 0 goto backend_ok
if %TRIES% geq 60 goto backend_timeout
timeout /t 1 /nobreak >nul
goto wait_backend

:backend_timeout
echo   [AVISO] Backend nao respondeu em 60s. Verifique a janela "BRM Backend".
echo   Continuando mesmo assim...
goto backend_done

:backend_ok
echo       Backend no ar (levou %TRIES%s).

:backend_done
echo.

REM ============================================================
REM  3) Frontend
REM ============================================================
echo [3/3] Subindo Frontend na porta %FRONTEND_PORT%...
start "BRM Frontend" cmd /k "cd /d %PROJECT_DIR% && npm run dev"
echo       Aguardando frontend responder...

set TRIES=0
:wait_frontend
set /a TRIES=TRIES+1
netstat -ano | findstr ":%FRONTEND_PORT% " | findstr "LISTENING" >nul
if %errorlevel% equ 0 goto frontend_ok
if %TRIES% geq 60 goto frontend_timeout
timeout /t 1 /nobreak >nul
goto wait_frontend

:frontend_timeout
echo   [AVISO] Frontend demorou. Abrindo navegador mesmo assim.
goto open_browser

:frontend_ok
echo       Frontend no ar (levou %TRIES%s).

:open_browser
echo.
echo ============================================================
echo   Tudo pronto! Abrindo %FRONTEND_URL%
echo ============================================================
echo.
echo   Login: admin@brm.com  /  admin123
echo.
echo   Para parar tudo: rode stop-brm.bat
echo.
timeout /t 2 /nobreak >nul
start "" "%FRONTEND_URL%"

exit /b 0
