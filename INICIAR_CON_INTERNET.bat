@echo off
chcp 65001 >nul
title Intranet AMIN — Acceso por Internet (Cloudflare Tunnel)

echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║         INTRANET AMIN — MODO INTERNET (EXTRANET)            ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.

:: ── Verificar Node.js ────────────────────────────────────────────
where node >nul 2>&1
IF ERRORLEVEL 1 (
  echo  [ERROR] Node.js no esta instalado.
  echo  Ejecuta primero INSTALAR.bat o descarga Node.js desde nodejs.org
  echo.
  pause
  exit /b 1
)

:: ── Verificar cloudflared.exe ────────────────────────────────────
IF NOT EXIST cloudflared.exe (
  echo  [ERROR] cloudflared.exe no encontrado en esta carpeta.
  echo  Ejecuta primero DESCARGAR_CLOUDFLARE.bat
  echo.
  pause
  exit /b 1
)

:: ── Verificar dependencias Node ───────────────────────────────────
IF NOT EXIST node_modules (
  echo  Instalando dependencias por primera vez...
  npm install
  echo.
)

:: ── Iniciar servidor Node.js en segundo plano ─────────────────────
echo  [1/2] Iniciando servidor local en puerto 3000...
start /B node server.js

:: Esperar que el servidor arranque
timeout /t 3 /nobreak >nul

:: ── Iniciar tunel Cloudflare ──────────────────────────────────────
echo  [2/2] Creando tunel a internet...
echo.
echo  ┌─────────────────────────────────────────────────────────────┐
echo  │  Busca abajo la linea que dice:                            │
echo  │                                                             │
echo  │   https://xxxxxxxx.trycloudflare.com                       │
echo  │                                                             │
echo  │  Esa es tu URL publica. Comparte ese enlace con tus        │
echo  │  clientes para que accedan al portal.                      │
echo  │                                                             │
echo  │  IMPORTANTE: La URL cambia cada vez que reinicies.         │
echo  │  Para una URL FIJA, ejecuta CONFIGURAR_URL_PERMANENTE.bat  │
echo  └─────────────────────────────────────────────────────────────┘
echo.

cloudflared.exe tunnel --url http://localhost:3000

:: Si cloudflared se cierra, también detener el servidor
echo.
echo  El tunel se cerro. Deteniendo servidor...
taskkill /f /im node.exe >nul 2>&1
echo  Servidor detenido.
pause
