@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Mission Rescue needs Node.js 20 or newer: https://nodejs.org
  echo Mission Rescue potrzebuje Node.js 20 lub nowszego: https://nodejs.org
  pause
  exit /b 1
)
if not exist "missions\weekly-report\mission.json" node tools\mission-rescue.mjs demo-reset
node tools\server.mjs --open
pause
