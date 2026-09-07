# Removes build artifacts under apps/desktop
Get-ChildItem -Path "apps/desktop" -Recurse -Force -Directory | Where-Object { $_.Name -in @('bin','obj') } | ForEach-Object { Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue }
Write-Host "Cleaned bin/obj under apps/desktop" 
