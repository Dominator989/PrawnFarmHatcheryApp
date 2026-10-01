$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

if (-not (Test-Path "$repoRoot\node_modules")) {
    Write-Host "Installing dependencies for the first time..."
    npm install
}

Write-Host "Starting Prawn Farm Hatchery App..."
Write-Host "Open http://localhost:3000 in your browser when the server is ready."
npm start
