@echo off
cd /d "%~dp0"
title POS System - Step 1 Setup
cls

set "PATH=%PATH%;C:\Program Files\nodejs;%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%AppData%\npm;%LOCALAPPDATA%\Programs\node"

echo ===================================================
echo   Grocery POS System - Installing Packages
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

echo [OK] Node.js is detected!
echo.
echo [*] Installing system dependencies (npm install)...
echo Please wait 1-2 minutes...
echo.

call npm install

echo.
echo ===================================================
echo   Setup finished!
echo   Now double-click "2-run.bat" to open the system.
echo ===================================================

:END
echo.
pause

