@echo off
title Intranet AMIN — Servidor
cls
echo.
echo  ==========================================
echo    INTRANET AMIN v1.0
echo    Hotel Dreams / Coco Home
echo  ==========================================
echo.

:: Verificar Node.js
node -v >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Node.js no encontrado.
    echo  Ejecuta primero INSTALAR.bat
    pause
    exit /b 1
)

:: Verificar que se instalaron dependencias
if not exist "node_modules\" (
    echo  [AVISO] Dependencias no instaladas.
    echo  Ejecuta primero INSTALAR.bat
    pause
    exit /b 1
)

echo  Iniciando servidor...
echo.
node server.js

echo.
echo  El servidor se detuvo.
pause
