@echo off
chcp 65001 >nul
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\run-experiments.ps1"
echo.
echo Press any key to close this window.
pause >nul
