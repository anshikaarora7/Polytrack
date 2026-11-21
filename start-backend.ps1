# PolyTrack - Launch ASP.NET Core Web API
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Starting PolyTrack.Backend Web API...  " -ForegroundColor Cyan
Write-Host " Endpoint: http://localhost:5030        " -ForegroundColor Cyan
Write-Host " Swagger:  http://localhost:5030/swagger" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Check if PostgreSQL is accessible on port 5432
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.Connect("127.0.0.1", 5432)
    $tcp.Close()
    Write-Host "[OK] PostgreSQL is active on port 5432." -ForegroundColor Green
} catch {
    Write-Host "[WARNING] Could not connect to PostgreSQL on port 5432." -ForegroundColor Yellow
    Write-Host "Ensure the PostgreSQL service ('postgresql-x64-18') is running." -ForegroundColor Yellow
}

# Automatically stop any previously running PolyTrackAPI process to prevent MSBuild file locking errors (MSB3021/MSB3027)
$existing = Get-Process -Name "PolyTrackAPI" -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "[INFO] Stopping existing PolyTrackAPI process (PID: $($existing.Id -join ', '))..." -ForegroundColor DarkYellow
    $existing | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 600
}

Set-Location "$PSScriptRoot\PolyTrack.Backend\PolyTrackAPI"
dotnet run --launch-profile http
