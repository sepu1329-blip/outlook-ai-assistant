$ErrorActionPreference = "Stop"

$manifestPath = Join-Path $PSScriptRoot "manifest.xml"

# Force absolute path
$manifestPath = (Resolve-Path $manifestPath).Path

if (-not (Test-Path $manifestPath)) {
    Write-Error "manifest.xml not found."
    exit 1
}

# Read Manifest ID
[xml]$manifest = Get-Content $manifestPath
$addinId = $manifest.OfficeApp.Id

if ([string]::IsNullOrWhiteSpace($addinId)) {
    Write-Error "Could not find Add-in ID in manifest.xml"
    exit 1
}

Write-Host "Found Add-in ID: $addinId" -ForegroundColor Cyan

# Registry Path for Outlook Desktop Developer Mode
$registryPath = "HKCU:\Software\Microsoft\Office\16.0\WEF\Developer"

if (-not (Test-Path $registryPath)) {
    Write-Host "Creating Registry Key: $registryPath"
    New-Item -Path $registryPath -Force | Out-Null
}

# Add/Update the key
# Name = Add-in ID, Value = Path to manifest
New-ItemProperty -Path $registryPath -Name $addinId -Value $manifestPath -PropertyType String -Force | Out-Null

Write-Host ""
Write-Host "Successfully registered Add-in!" -ForegroundColor Green
Write-Host "  Key: $addinId"
Write-Host "  Value: $manifestPath"
Write-Host ""
Write-Host "Instructions:" -ForegroundColor Yellow
Write-Host "1. Close Outlook completely."
Write-Host "2. Reopen Outlook."
Write-Host "3. Look for 'Outlook AI Assistant' in the Ribbon or under 'Get Add-ins' -> 'Admin Managed' or 'Custom'."
Write-Host "4. If it doesn't appear immediately, wait a few seconds or check the 'All Apps' list."
