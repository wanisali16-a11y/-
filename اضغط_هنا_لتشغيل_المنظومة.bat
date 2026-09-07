@echo off
cd /d "%~dp0"
chcp 65001 >nul
title POS System - Auto Launcher
cls

echo =========================================================
echo             Sahil POS System - Auto Launcher
echo             منظومة مبيعات الساحل - التشغيل التلقائي
echo =========================================================
echo.

if not exist "package.json" (
    echo [ERR] Error: Please extract the ZIP file first before running!
    echo [ERR] خطأ: يرجى فك الضغط عن ملف الـ ZIP أولاً قبل التشغيل.
    echo.
    goto ERROR_PAUSE
)

set "PATH=%PATH%;C:\Program Files\nodejs;%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%AppData%\npm;%LOCALAPPDATA%\Programs\node"

node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERR] Node.js is not installed on this computer!
    echo [ERR] تنبيه: برنامج Node.js غير مثبت على جهازك!
    echo.
    echo Opening official download page: https://nodejs.org/
    echo.
    start https://nodejs.org/
    goto ERROR_PAUSE
)

echo [OK] Node.js detected successfully.
echo [OK] تم اكتشاف برنامج Node.js بنجاح.
echo.

if not exist "node_modules" (
    echo [*] First time setup: Installing dependencies...
    echo [*] جاري تثبيت وتجهيز مكتبات المنظومة لأول مرة...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo [!] Retrying with legacy peer deps...
        call npm install --legacy-peer-deps
    )
    if not exist "node_modules" (
        echo [ERR] Failed to install npm packages. Check internet connection.
        echo [ERR] فشل تثبيت المكتبات. تأكد من الاتصال بالإنترنت.
        goto ERROR_PAUSE
    )
    echo [OK] Dependencies installed successfully.
    echo [OK] تم التثبيت بنجاح!
    echo.
)

echo [*] Starting POS application...
echo [*] Opening browser at http://localhost:3000 ...
echo.

start /b cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"

call npm run dev
if %errorlevel% neq 0 (
    echo [!] Trying fallback runner...
    call npx vite --port=3000 --host=0.0.0.0
)

if %errorlevel% neq 0 (
    echo [ERR] Error starting application.
    goto ERROR_PAUSE
)

goto END

:ERROR_PAUSE
echo.
echo =========================================================
echo Press any key to exit / اضغط أي مفتاح للإغلاق
echo =========================================================
pause

:END


