@echo off
chcp 65001 > nul
echo ==========================================
echo      SYNKRA - SCRIPT DE CORRECAO
echo ==========================================
echo.
echo [1/3] Limpando ambiente (Opcional - Taskkill desativado para evitar conflitos)...
rem taskkill /F /IM node.exe /T 2>nul
echo Servidores anteriores ignorados.
echo.

echo [2/3] Regenerando Prisma Client (Aplica correcoes de Schema)...
call npx prisma generate
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao gerar Prisma Client.
    pause
    exit /b %errorlevel%
)
echo Prisma Client gerado com SUCESSO!
echo.

echo [3/3] Iniciando Servidor Synkra...
echo A página deve carregar sem erro 500 agora.
echo.
call npm run dev
pause
