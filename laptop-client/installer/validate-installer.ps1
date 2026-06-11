param(
    [string]$MsiPath = "$PSScriptRoot\ProjectX-LaptopClient.msi",
    [string]$InstallDir = "$env:TEMP\ProjectXInstallerValidate"
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $MsiPath)) {
    throw "The MSI file was not found at: $MsiPath"
}

if (Test-Path $InstallDir) {
    Remove-Item -Recurse -Force -Path $InstallDir
}

New-Item -ItemType Directory -Path $InstallDir | Out-Null

Write-Host "Installing MSI to $InstallDir"
$installArgs = @(
    '/i',
    "`"$MsiPath`"",
    '/qn',
    '/norestart',
    "INSTALLFOLDER=`"$InstallDir`""
)
$install = Start-Process -FilePath msiexec.exe -ArgumentList $installArgs -Wait -PassThru
if ($install.ExitCode -ne 0) {
    throw "MSI installation failed with exit code $($install.ExitCode)."
}

$expectedExe = Join-Path $InstallDir 'LockScreenApp.exe'
if (-not (Test-Path $expectedExe)) {
    throw "Installed product did not contain expected file: $expectedExe"
}

Write-Host "Installed product verified. Uninstalling now."
$uninstallArgs = @(
    '/x',
    "`"$MsiPath`"",
    '/qn',
    '/norestart'
)
$uninstall = Start-Process -FilePath msiexec.exe -ArgumentList $uninstallArgs -Wait -PassThru
if ($uninstall.ExitCode -ne 0) {
    throw "MSI uninstall failed with exit code $($uninstall.ExitCode)."
}

if (Test-Path $InstallDir) {
    Remove-Item -Recurse -Force -Path $InstallDir
}

Write-Host "Installer validation completed successfully."
