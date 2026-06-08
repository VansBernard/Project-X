<#
Run this script locally in your repository root (PowerShell).

It will:
- verify you're in a git repo
- untrack `backend/.env`, commit the change, and push

Optional: it can print instructions for purging the file from history using BFG/git-filter-repo.

WARNING: Do NOT run this on a machine without git remote access configured.
#>

Write-Host "Checking git repository..."
try {
    git rev-parse --is-inside-work-tree > $null 2>&1
} catch {
    Write-Error "This directory is not a git repository. Run this script from your repo root."
    exit 1
}

Write-Host "Untracking backend/.env and committing..."
git rm --cached backend/.env
git add .gitignore
git commit -m "Remove backend .env from repository"

Write-Host "Attempting to push to the default remote..."
git push

Write-Host "If you want to purge the file from history, follow these steps (manual):"
Write-Host "1) Install BFG: https://rtyley.github.io/bfg-repo-cleaner/"
Write-Host "2) Create a mirror clone: git clone --mirror git@github.com:your/repo.git repo-mirror.git"
Write-Host "3) Run: bfg --delete-files backend/.env repo-mirror.git"
Write-Host "4) Cleanup and force-push:"
Write-Host "   cd repo-mirror.git"
Write-Host "   git reflog expire --expire=now --all && git gc --prune=now --aggressive"
Write-Host "   git push --force"

Write-Host "Done. Rotate any secrets that may have been exposed after this operation."
