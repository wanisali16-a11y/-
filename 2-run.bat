@echo off
cd /d "%~dp0"
title POS System - Step 2 Run
cls

set "PATH=%PATH%;C:\Program Files\nodejs;%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%AppData%\npm;%LOCALAPPDATA%\Programs\node"

echo ===================================================
echo   Grocery POS System - Starting Application
echo ===================================================
echo.

node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERR] ERROR: Node.js was not found on your computer!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo.
    goto END
)

echo Opening browser at http://localhost:3000 ...
echo.
start /b cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"

call npm run dev

:END
echo.
pause

