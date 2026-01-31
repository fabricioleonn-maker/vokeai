@echo off
echo ========================================
echo   PRISMA CLIENT REGENERATION SCRIPT
echo ========================================
echo.

echo [1/4] Stopping dev server...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

echo [2/4] Cleaning Prisma cache...
if exist node_modules\.prisma rmdir /s /q node_modules\.prisma
if exist node_modules\@prisma\engines rmdir /s /q node_modules\@prisma\engines

echo [3/4] Generating Prisma Client...
call npx prisma generate
if errorlevel 1 (
    echo.
    echo ERROR: Prisma generate failed!
    echo Try running manually: npx prisma generate
    pause
    exit /b 1
)

echo [4/4] Restarting dev server...
start cmd /k "npm run dev"

echo.
echo ========================================
echo   SUCCESS! Prisma Client regenerated
echo ========================================
echo.
echo Chat and Dashboard should now work!
echo.
pause
