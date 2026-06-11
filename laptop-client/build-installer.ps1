param(
    [string]$Configuration = "Release",
    [string]$PublishRoot = "$PSScriptRoot\publish",
    [string]$InstallerDir = "$PSScriptRoot\installer",
    [string]$WiXPath = "C:\Program Files\WiX Toolset v4\bin"
)

$ErrorActionPreference = 'Stop'

Write-Host "=== Project X Laptop Client Installer Build ==="
Write-Host "Configuration: $Configuration"
Write-Host ""

$projects = @{
    LockScreenApp = "$PSScriptRoot\LockScreenApp\LockScreenApp.csproj"
    StartupAgent = "$PSScriptRoot\StartupAgent\StartupAgent.csproj"
}

$publishFolders = @{}
foreach ($projectName in $projects.Keys) {
    $folder = Join-Path $PublishRoot $projectName
    $publishFolders[$projectName] = $folder
    if (Test-Path $folder) {
        Remove-Item $folder -Recurse -Force
    }
    New-Item -ItemType Directory -Path $folder | Out-Null
}

foreach ($projectName in $projects.Keys) {
    $project = $projects[$projectName]
    $publishPath = $publishFolders[$projectName]
    Write-Host "Publishing $projectName to $publishPath"
    dotnet publish $project -c $Configuration -o $publishPath -p:PublishSingleFile=true -p:PublishTrimmed=false -p:RuntimeIdentifier=win-x64
}

$generatedWxs = Join-Path $InstallerDir 'GeneratedComponents.wxs'
Write-Host "Generating WiX component list at $generatedWxs"

$settings = New-Object System.Xml.XmlWriterSettings
$settings.Indent = $true
$settings.OmitXmlDeclaration = $false
$settings.Encoding = [System.Text.Encoding]::UTF8

$xml = [System.Xml.XmlWriter]::Create($generatedWxs, $settings)
$xml.WriteStartDocument()
$xml.WriteStartElement('Wix', 'http://schemas.microsoft.com/wix/2006/wi')

$xml.WriteStartElement('Fragment')
$xml.WriteStartElement('DirectoryRef')
$xml.WriteAttributeString('Id', 'INSTALLFOLDER')

$componentIds = @()
foreach ($publishFolder in $publishFolders.Values) {
    Get-ChildItem -Path $publishFolder -File | Sort-Object Name | ForEach-Object {
        $fileId = "fil_" + ($_.Name -replace '[^A-Za-z0-9]', '_')
        $componentId = "cmp_" + ($_.Name -replace '[^A-Za-z0-9]', '_')
        $componentIds += $componentId

        $xml.WriteStartElement('Component')
        $xml.WriteAttributeString('Id', $componentId)
        $xml.WriteAttributeString('Guid', '*')

        $xml.WriteStartElement('File')
        $xml.WriteAttributeString('Id', $fileId)
        $xml.WriteAttributeString('Source', $_.FullName)
        $xml.WriteAttributeString('KeyPath', 'yes')
        $xml.WriteEndElement()

        $xml.WriteEndElement()
    }
}

$xml.WriteEndElement() # DirectoryRef
$xml.WriteEndElement() # Fragment

$xml.WriteStartElement('Fragment')
$xml.WriteStartElement('ComponentGroup')
$xml.WriteAttributeString('Id', 'ProductComponents')
foreach ($componentId in $componentIds) {
    $xml.WriteStartElement('ComponentRef')
    $xml.WriteAttributeString('Id', $componentId)
    $xml.WriteEndElement()
}
$xml.WriteEndElement() # ComponentGroup
$xml.WriteEndElement() # Fragment
$xml.WriteEndElement() # Wix
$xml.WriteEndDocument()
$xml.Flush()
$xml.Close()

$installerOutput = Join-Path $InstallerDir 'ProjectX-LaptopClient.msi'
$wxsFile = Join-Path $InstallerDir 'ProjectXLockScreenInstaller.wxs'
$generatedFile = $generatedWxs
$wixObj = Join-Path $InstallerDir 'ProjectXLockScreenInstaller.wixobj'

$candleExe = Join-Path $WiXPath 'candle.exe'
$lightExe = Join-Path $WiXPath 'light.exe'

if (-not (Test-Path $candleExe)) {
    $candleExe = Get-Command candle.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
}
if (-not (Test-Path $lightExe)) {
    $lightExe = Get-Command light.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
}

if (-not $candleExe -or -not $lightExe) {
    throw "WiX tools not found. Install from https://wixtoolset.org/releases/"
}

Write-Host ""
Write-Host "Building MSI..."
& $candleExe "$wxsFile" "$generatedFile" -out "$wixObj"
& $lightExe "$wixObj" -out "$installerOutput"

Write-Host ""
Write-Host "✓ Done! MSI ready to distribute:"
Write-Host "  $installerOutput"
