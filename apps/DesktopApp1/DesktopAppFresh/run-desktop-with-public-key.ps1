param(
    [Parameter(Mandatory = $true)]
    [string]$PublicKeyBase64
)

# Set the public key env var for this run only
$env:PROJECTX_LICENSE_PUBLIC_KEY_BASE64 = $PublicKeyBase64

Write-Host "Starting DesktopAppFresh with PROJECTX_LICENSE_PUBLIC_KEY_BASE64 set..."

# Run the WPF app from the project folder
Push-Location $PSScriptRoot
try {
    dotnet run --project DesktopAppFresh.csproj
} finally {
    Pop-Location
}
