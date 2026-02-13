@echo off
setlocal enabledelayedexpansion

REM ID from manifest.xml
set "ADDIN_ID=b704c768-466d-4952-8700-123456789abc"
set "MANIFEST_FILENAME=manifest.xml"

REM Get absolute path to manifest.xml in current directory
set "MANIFEST_PATH=%~dp0%MANIFEST_FILENAME%"

if not exist "%MANIFEST_PATH%" (
    echo Error: %MANIFEST_FILENAME% not found in current directory.
    pause
    exit /b 1
)

echo Found manifest at: %MANIFEST_PATH%
echo Add-in ID: %ADDIN_ID%

REM Registry Key for Outlook Developer Mode
set "REG_KEY=HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\WEF\Developer"

echo.
echo Registering to %REG_KEY%...

REM Add registry key
reg add "%REG_KEY%" /v "%ADDIN_ID%" /t REG_SZ /d "%MANIFEST_PATH%" /f

if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] Add-in registered successfully!
    echo.
    echo Instructions:
    echo 1. Close Outlook completely.
    echo 2. Reopen Outlook.
    echo 3. The 'Outlook AI Assistant' should replace the broken VSTO version.
    echo.
) else (
    echo.
    echo [ERROR] Failed to add registry key.
    echo You may need to run this script as Administrator (Right-click -> Run as Administrator).
)

pause
