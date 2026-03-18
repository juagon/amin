@echo off
title AMIN — Instalacion
cls
echo.
echo  ==========================================
echo    INTRANET AMIN v1.0 - Instalacion
echo  ==========================================
echo.

:: Verificar Node.js

node -v >prueba.txt
node -v >nul 2>&1
echo pase
if errorlevel 1 (
    echo  [ERROR] Node.js no esta instalado.
    echo.
    echo  Por favor descarga e instala Node.js desde:
    echo    https://nodejs.org  (elegir version LTS)
    echo.
    echo  Despues de instalar, vuelve a ejecutar este archivo.
    echo.
    pause
    exit /b 1
)

echo  Node.js encontrado:
node -v
echo.
echo  Instalando dependencias (solo necesario la primera vez)...
echo.
npm install

if errorlevel 1 (
    echo.
    echo  [ERROR] Fallo la instalacion. Verifica tu conexion a internet.
    pause
    exit /b 1
)

echo.
echo  ==========================================
echo    Instalacion completada exitosamente!
echo  ==========================================
echo.
echo  Ahora puedes ejecutar INICIAR.bat
echo.
pause
