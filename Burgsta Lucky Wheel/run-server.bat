@echo off
echo.
echo ============================================
echo   تشغيل خادم محلي للعبة عجلة الحظ - Burgsta
echo ============================================
echo.

REM التحقق من وجود Python
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo Python موجود، سيتم تشغيل الخادم على المنفذ 8000
    echo.
    echo لفتح اللعبة، اذهب إلى:
    echo http://localhost:8000
    echo.
    echo اضغط Ctrl+C للإيقاف
    echo.
    python -m http.server 8000
) else (
    echo Python غير موجود على النظام
    echo.
    echo يمكنك استخدام Live Server في VS Code أو أي خادم محلي آخر
    echo.
    echo أو افتح الملف index.html مباشرة في المتصفح
    echo.
    pause
    start index.html
)

pause