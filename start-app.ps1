$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

$port = 3000
$existingConnections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($existingConnections) {
    foreach ($connection in $existingConnections) {
        $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "Stopping stale app process on port $port (PID $($connection.OwningProcess))..."
            Stop-Process -Id $connection.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
}

if (-not (Test-Path "$repoRoot\node_modules")) {
    Write-Host "Installing dependencies for the first time..."
    npm install
}

Write-Host "Starting Prawn Farm Hatchery App..."
Write-Host "Open http://localhost:3000 in your browser when the server is ready."
npm start
