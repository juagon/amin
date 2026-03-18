@echo off
chcp 65001 >nul
title Descargar Cloudflare Tunnel

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║       DESCARGA DE CLOUDFLARE TUNNEL PARA AMIN       ║
echo  ╚══════════════════════════════════════════════════════╝
echo.
echo  Este programa descarga cloudflared.exe (~40 MB)
echo  Solo necesitas ejecutarlo UNA VEZ.
echo.

IF EXIST cloudflared.exe (
  echo  [OK] cloudflared.exe ya existe en esta carpeta.
  echo  No es necesario volver a descargarlo.
  echo.
  pause
  exit /b 0
)

echo  Descargando desde GitHub...
echo.

powershell -Command "& { $ProgressPreference='SilentlyContinue'; Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe' }"

IF EXIST cloudflared.exe (
  echo.
  echo  ╔══════════════════════════════════════════════════════╗
  echo  ║   Descarga completada! cloudflared.exe listo.       ║
  echo  ║   Ahora ejecuta: INICIAR_CON_INTERNET.bat           ║
  echo  ╚══════════════════════════════════════════════════════╝
) ELSE (
  echo.
  echo  [ERROR] No se pudo descargar. Verifica tu conexion a internet.
  echo  Si el problema persiste, descarga manualmente desde:
  echo  https://github.com/cloudflare/cloudflared/releases/latest
  echo  y guarda el archivo como cloudflared.exe en esta carpeta.
)

echo.
pause
