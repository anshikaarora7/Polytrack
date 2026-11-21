# PolyTrack - Build Backend Safely Without File Lock
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " PolyTrack Backend Safe Build Tool       " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Stop any running PolyTrackAPI process locking the binary (fixes MSB3021/MSB3027)
$existing = Get-Process -Name "PolyTrackAPI" -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "[INFO] Releasing file lock on PolyTrackAPI.exe (PID: $($existing.Id -join ', '))..." -ForegroundColor Yellow
    $existing | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 600
    Write-Host "[OK] Process stopped. Binary unlocked." -ForegroundColor Green
}

Write-Host "[INFO] Running dotnet build..." -ForegroundColor Cyan
dotnet build
