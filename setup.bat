@echo off
TITLE Outlook AI Assistant Installer
echo utility to install Outlook AI Assistant...
echo.

:: Check for permissions
fltmc >nul 2>&1 || (
    echo Administrator privileges are required.
    echo Please Right-Click setup.bat and select "Run as Administrator".
    pause
    exit /b
)

:: Run PowerShell script
powershell -ExecutionPolicy Bypass -File "%~dp0install.ps1"
