@echo off
chcp 65001 >nul
title Configurar URL Permanente — Intranet AMIN

echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║         CONFIGURAR URL FIJA (REQUIERE CUENTA CLOUDFLARE)   ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.
echo  Este proceso configura una URL FIJA como:
echo     https://intranet.amin.com.co  (si tienes ese dominio)
echo     https://amin-intranet.cloudflareaccess.com  (gratis)
echo.
echo  Requisitos:
echo    - Cuenta gratuita en cloudflare.com
echo    - (Opcional) Dominio propio registrado en Cloudflare
echo.
echo  ═══════════════════════════════════════════════════════════════
echo  PASO 1: Iniciar sesion en Cloudflare
echo  ═══════════════════════════════════════════════════════════════
echo.
echo  Se abrira el navegador para que inicies sesion.
echo  Presiona cualquier tecla para continuar...
pause >nul

cloudflared.exe tunnel login

echo.
echo  ═══════════════════════════════════════════════════════════════
echo  PASO 2: Crear el tunel con nombre fijo
echo  ═══════════════════════════════════════════════════════════════
echo.
set /p TUNNEL_NAME="Escribe un nombre para el tunel (ej: amin-intranet): "

cloudflared.exe tunnel create %TUNNEL_NAME%

echo.
echo  ═══════════════════════════════════════════════════════════════
echo  PASO 3: Crear archivo de configuracion
echo  ═══════════════════════════════════════════════════════════════
echo.

:: Obtener el ID del tunel creado
FOR /F "tokens=*" %%i IN ('cloudflared.exe tunnel list ^| findstr %TUNNEL_NAME%') DO SET TUNNEL_INFO=%%i
echo Tunel creado. Generando config.yml...

echo tunnel: %TUNNEL_NAME% > config.yml
echo credentials-file: %USERPROFILE%\.cloudflared\%TUNNEL_NAME%.json >> config.yml
echo ingress: >> config.yml
echo   - service: http://localhost:3000 >> config.yml

echo.
echo  config.yml generado!
echo.
echo  ═══════════════════════════════════════════════════════════════
echo  PASO 4: Asignar dominio (opcional)
echo  ═══════════════════════════════════════════════════════════════
echo.
echo  Si tienes un dominio en Cloudflare, ejecuta:
echo.
echo     cloudflared.exe tunnel route dns %TUNNEL_NAME% intranet.TUDOMINIO.com
echo.
echo  (Reemplaza TUDOMINIO.com con tu dominio real)
echo.
echo  ═══════════════════════════════════════════════════════════════
echo  PASO 5: Probar el tunel fijo
echo  ═══════════════════════════════════════════════════════════════
echo.
echo  Ahora puedes iniciarlo con el archivo INICIAR_TUNEL_FIJO.bat
echo  que se creara a continuacion...
echo.

:: Crear el BAT para iniciar el tunel fijo
echo @echo off > INICIAR_TUNEL_FIJO.bat
echo chcp 65001 ^>nul >> INICIAR_TUNEL_FIJO.bat
echo title Intranet AMIN — Tunel Fijo >> INICIAR_TUNEL_FIJO.bat
echo echo Iniciando servidor... >> INICIAR_TUNEL_FIJO.bat
echo start /B node server.js >> INICIAR_TUNEL_FIJO.bat
echo timeout /t 3 /nobreak ^>nul >> INICIAR_TUNEL_FIJO.bat
echo echo Iniciando tunel fijo %TUNNEL_NAME%... >> INICIAR_TUNEL_FIJO.bat
echo cloudflared.exe tunnel --config config.yml run %TUNNEL_NAME% >> INICIAR_TUNEL_FIJO.bat

echo  INICIAR_TUNEL_FIJO.bat creado.
echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║  Configuracion completada!                                  ║
echo  ║  Usa INICIAR_TUNEL_FIJO.bat para arrancar con URL fija.    ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.
pause
