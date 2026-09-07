@echo off
cd /d "%~dp0"
title Grocery POS System
cls

set "PATH=%PATH%;C:\Program Files\nodejs;%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%AppData%\npm;%LOCALAPPDATA%\Programs\node"

echo ===================================================
echo   Grocery POS System - Local Server
echo ===================================================
echo.

node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERR] ERROR: Node.js is NOT installed on this computer!
    echo.
    echo Please download and install Node.js from:
    echo https://nodejs.org/
    echo.
    goto END
)

if not exist "node_modules" (
    echo [*] First time setup: Installing packages...
    echo Please wait 1-2 minutes...
    echo.
    call npm install
)

echo.
echo [OK] Starting Grocery POS on http://localhost:3000 ...
echo.
start /b cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"

call npm run dev

:END
echo.
pause

