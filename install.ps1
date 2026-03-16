# Outlook Add-in Installer
# This script adds a local directory as a Trusted Catalog in Outlook.

$ErrorActionPreference = "Stop"

# 1. Setup Directories
$installDir = "$env:LOCALAPPDATA\OutlookAIAddin"
$manifestUrl = "https://sepu1329-blip.github.io/outlook-ai-assistant/manifest.xml"
$manifestPath = "$installDir\manifest.xml"

Write-Host "Installing Outlook AI Assistant..." -ForegroundColor Cyan

# Create directory
if (-not (Test-Path $installDir)) {
    New-Item -ItemType Directory -Path $installDir | Out-Null
    Write-Host "Created installation directory: $installDir"
}

# 2. Download Manifest
try {
    Write-Host "Downloading manifest from GitHub..."
    Invoke-WebRequest -Uri $manifestUrl -OutFile $manifestPath
    Write-Host "Manifest downloaded successfully." -ForegroundColor Green
} catch {
    Write-Host "Error downloading manifest. Please check your internet connection." -ForegroundColor Red
    Pause
    exit
}

# 3. Add to Registry (Trusted Catalog)
$registryPath = "HKCU:\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs"
$catalogId = "{b704c768-466d-4952-8700-123456789abc}" # Same as Id in manifest, but can be random for the catalog itself. Let's use a unique one for the catalog entry.
$catalogId = "{12345678-ABCD-1234-ABCD-1234567890AB}" 

$keyPath = "$registryPath\$catalogId"

try {
    if (-not (Test-Path $registryPath)) {
        New-Item -Path $registryPath -Force | Out-Null
    }
    
    if (-not (Test-Path $keyPath)) {
        New-Item -Path $keyPath -Force | Out-Null
    }

    Set-ItemProperty -Path $keyPath -Name "Url" -Value $installDir
    Set-ItemProperty -Path $keyPath -Name "Flags" -Value 1 # 1 = Trusted
    Set-ItemProperty -Path $keyPath -Name "Id" -Value $catalogId

    Write-Host "Registry updated successfully." -ForegroundColor Green
} catch {
    Write-Host "Failed to update registry. You might need Administrator privileges." -ForegroundColor Red
    Write-Error $_
    Pause
    exit
}

Write-Host ""
Write-Host "Installation Complete!" -ForegroundColor Green
Write-Host "1. Restart Outlook."
Write-Host "2. Go to 'Get Add-ins' -> 'My add-ins' -> 'Reference' (or 'Shared Folder')."
Write-Host "3. You should see 'Outlook AI Assistant'."
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
