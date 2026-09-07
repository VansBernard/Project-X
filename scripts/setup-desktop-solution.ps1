# Run from repository root
# Creates a solution and adds desktop projects.

dotnet new sln -n ProjectX.DesktopSolution

dotnet sln ProjectX.DesktopSolution.sln add "apps/desktop/ProjectX.Desktop/ProjectX.Desktop.csproj"

dotnet sln ProjectX.DesktopSolution.sln add "apps/desktop/ProjectX.LockScreen/ProjectX.LockScreen.csproj"

Write-Host "Solution created: ProjectX.DesktopSolution.sln"
