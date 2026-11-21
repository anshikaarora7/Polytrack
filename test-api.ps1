# PolyTrack - API Automated Smoke Test
param (
    [string]$BaseUrl = "http://localhost:5030/api"
)

Write-Host "Testing PolyTrack API at $BaseUrl..." -ForegroundColor Cyan

# 1. Login
Write-Host "1. Testing POST /auth/login..." -NoNewline
try {
    $login = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -ContentType "application/json" `
        -Body '{"email":"admin@polytrack.com","password":"Admin@123456"}'
    Write-Host " OK (User: $($login.user.name), Role: $($login.user.role))" -ForegroundColor Green
} catch {
    Write-Host " FAILED: $_" -ForegroundColor Red
    exit 1
}

$token = $login.accessToken
$refreshToken = $login.refreshToken
$headers = @{ Authorization = "Bearer $token" }

# 2. Token Refresh
Write-Host "2. Testing POST /auth/refresh (rotating refresh token)..." -NoNewline
try {
    $refresh = Invoke-RestMethod -Uri "$BaseUrl/auth/refresh" -Method Post -ContentType "application/json" `
        -Body (@{ refreshToken = $refreshToken } | ConvertTo-Json)
    Write-Host " OK (Rotated refresh token received)" -ForegroundColor Green
} catch {
    Write-Host " FAILED: $_" -ForegroundColor Red
    exit 1
}

# 3. Dashboard Stats
Write-Host "3. Testing GET /dashboard/stats..." -NoNewline
try {
    $stats = Invoke-RestMethod -Uri "$BaseUrl/dashboard/stats" -Headers $headers
    Write-Host " OK (Projects: $($stats.totalProjects), Tasks: $($stats.totalTasks), Assets: $($stats.totalAssets))" -ForegroundColor Green
} catch {
    Write-Host " FAILED: $_" -ForegroundColor Red
    exit 1
}

# 4. Projects List
Write-Host "4. Testing GET /projects..." -NoNewline
try {
    $projects = Invoke-RestMethod -Uri "$BaseUrl/projects" -Headers $headers
    Write-Host " OK (Count: $($projects.data.Count))" -ForegroundColor Green
} catch {
    Write-Host " FAILED: $_" -ForegroundColor Red
    exit 1
}

# 5. Tasks Kanban
Write-Host "5. Testing GET /tasks/kanban..." -NoNewline
try {
    $kanban = Invoke-RestMethod -Uri "$BaseUrl/tasks/kanban" -Headers $headers
    Write-Host " OK (Kanban retrieved)" -ForegroundColor Green
} catch {
    Write-Host " FAILED: $_" -ForegroundColor Red
    exit 1
}

# 6. Assets Search
Write-Host "6. Testing GET /assets/search..." -NoNewline
try {
    $assets = Invoke-RestMethod -Uri "$BaseUrl/assets/search" -Headers $headers
    Write-Host " OK (Found: $($assets.data.Count) assets)" -ForegroundColor Green
} catch {
    Write-Host " FAILED: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`nAll Phase 1 Foundation API tests passed successfully!" -ForegroundColor Green
