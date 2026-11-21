param(
    [switch]$Dev
)

# PolyTrack - Launch Next.js Web Frontend
Write-Host "========================================" -ForegroundColor Green
Write-Host " Starting PolyTrack Web Frontend...     " -ForegroundColor Green
Write-Host " App URL:   http://localhost:3000       " -ForegroundColor Green
Write-Host " Login URL: http://localhost:3000/login " -ForegroundColor Green
Write-Host " Default Demo Credentials:              " -ForegroundColor Green
Write-Host "   Email:    admin@polytrack.com        " -ForegroundColor Yellow
Write-Host "   Password: Admin@123456               " -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Green

$env:PATH = "$PSScriptRoot\.tools\bin;C:\Users\Anshika\AppData\Roaming\npm;" + $env:PATH
Set-Location "$PSScriptRoot\polytrack-frontend"

if ($Dev) {
    Write-Host "[MODE] Running Dev Server (Turbopack with hot-reloading)..." -ForegroundColor Cyan
    pnpm run dev
} else {
    if (-not (Test-Path "$PSScriptRoot\polytrack-frontend\.next")) {
        Write-Host "[BUILD] First-time production build in progress..." -ForegroundColor Yellow
        pnpm run build
    }
    Write-Host "[MODE] Running Fast Production Server (Instant <50ms page loads)..." -ForegroundColor Cyan
    Write-Host "(Pass -Dev flag if you want development hot-reload mode instead)" -ForegroundColor DarkGray
    pnpm run start
}
