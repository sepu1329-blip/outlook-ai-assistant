@echo off
TITLE Outlook AI Assistant Installer (CMD Only)
echo Installing Outlook AI Assistant...
echo.

:: 1. Setup Directories
set "INSTALL_DIR=%LOCALAPPDATA%\OutlookAIAddin"
set "MANIFEST_URL=https://sepu1329-blip.github.io/outlook-ai-assistant/manifest.xml"
set "MANIFEST_PATH=%INSTALL_DIR%\manifest.xml"

if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
echo Created directory: %INSTALL_DIR%

:: 2. Download Manifest (Using curl, standard in Win10/11)
echo Downloading manifest...
curl -L -o "%MANIFEST_PATH%" "%MANIFEST_URL%"

if not exist "%MANIFEST_PATH%" (
    echo Error: Failed to download manifest.
    echo Please check internet connection.
    pause
    exit /b
)
echo Manifest downloaded.

:: 3. Add to Registry (Trusted Catalog)
set "CATALOG_ID={12345678-ABCD-1234-ABCD-1234567890AB}"
set "REG_KEY=HKCU\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\%CATALOG_ID%"

echo Updating Registry...
:: /f forces overwrite without prompt
reg add "%REG_KEY%" /v "Url" /t REG_SZ /d "%INSTALL_DIR%" /f >nul
reg add "%REG_KEY%" /v "Flags" /t REG_DWORD /d 1 /f >nul
reg add "%REG_KEY%" /v "Id" /t REG_SZ /d "%CATALOG_ID%" /f >nul

if %ERRORLEVEL% equ 0 (
    echo Registry updated successfully.
    echo.
    echo Installation Complete!
    echo 1. Restart Outlook.
    echo 2. Go to 'Get Add-ins' - 'My add-ins' - 'Shared Folder' (or 'Trusted Catalogs').
) else (
    echo Failed to update registry.
    echo Please run this script as Administrator.
)

pause
