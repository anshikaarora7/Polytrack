param(
    [string]$BackendUrl = "http://localhost:5030",
    [string]$FrontendUrl = "http://localhost:3000"
)

# Disable PowerShell progress bar overhead (speeds up web requests by 10x)
$ProgressPreference = 'SilentlyContinue'

$BackendUrl = $BackendUrl.TrimEnd('/')
$FrontendUrl = $FrontendUrl.TrimEnd('/')

function Assert-Step($name, $condition, $details) {
    if ($condition) {
        Write-Host " [PASS] $name - $details" -ForegroundColor Green
        return @{ Name = $name; Status = "PASS"; Details = $details }
    } else {
        Write-Host " [FAIL] $name - $details" -ForegroundColor Red
        return @{ Name = $name; Status = "FAIL"; Details = $details }
    }
}

Write-Host "`n=== PolyTrack Full-Stack End-to-End Audit ===" -ForegroundColor Cyan
Write-Host "Backend Target:  $BackendUrl" -ForegroundColor DarkGray
Write-Host "Frontend Target: $FrontendUrl`n" -ForegroundColor DarkGray

# Pre-flight quick probe (fails immediately in <1s if backend is not started)
try {
    $preflight = curl.exe -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "$BackendUrl/swagger/index.html"
    if ($preflight -ne "200") {
        Write-Host " [ABORT] Backend API is not running at $BackendUrl (HTTP status: $preflight)." -ForegroundColor Red
        Write-Host " Please start the backend in a separate terminal first:" -ForegroundColor Yellow
        Write-Host "   cd C:\Polytrack" -ForegroundColor White
        Write-Host "   .\start-backend.ps1`n" -ForegroundColor White
        return
    }
} catch {
    Write-Host " [ABORT] Could not connect to backend at $BackendUrl." -ForegroundColor Red
    return
}

# 1. Test 5 Seeded Roles
$roles = @(
    @{ Role = "Admin"; Email = "admin@polytrack.com"; Expected = "Admin" },
    @{ Role = "ProjectManager"; Email = "pm@polytrack.com"; Expected = "ProjectManager" },
    @{ Role = "Artist"; Email = "artist@polytrack.com"; Expected = "Artist" },
    @{ Role = "Reviewer"; Email = "reviewer@polytrack.com"; Expected = "Reviewer" },
    @{ Role = "Client"; Email = "client@polytrack.com"; Expected = "Client" }
)

$tokens = @{}
foreach ($r in $roles) {
    try {
        $res = Invoke-RestMethod -Uri "$BackendUrl/api/auth/login" -Method Post `
            -Body (@{ email = $r.Email; password = "Admin@123456" } | ConvertTo-Json) `
            -ContentType "application/json" -TimeoutSec 5
        $tokens[$r.Role] = $res.accessToken
        Assert-Step "Auth ($($r.Role))" ($res.user.role -eq $r.Expected) "Role verified: $($res.user.role), Name: $($res.user.name)" | Out-Null
    } catch {
        Assert-Step "Auth ($($r.Role))" $false $_.Message | Out-Null
    }
}

# 2. Public Client Inquiry Submission & Conversion
try {
    $inqData = @{
        clientName = "CyberWorks Studio"
        companyName = "CyberWorks Interactive"
        email = "producer@cyberworks.io"
        projectTitle = "Holographic Cyber City Assets"
        projectDescription = "Need 15 high-poly modular buildings with emissive shaders."
        projectType = "Environment"
        budgetRange = "Range15kTo30k"
    } | ConvertTo-Json
    $inq = Invoke-RestMethod -Uri "$BackendUrl/api/inquiries" -Method Post -Body $inqData -ContentType "application/json" -TimeoutSec 5
    Assert-Step "Public Inquiry Submit" ($inq.id -ne $null) "Inquiry ID: $($inq.id)" | Out-Null

    $convertData = @{
        projectName = "Holographic Cyber City"
        budgetAmount = 28000
    } | ConvertTo-Json
    $hPm = @{ Authorization = "Bearer " + $tokens["ProjectManager"] }
    $conv = Invoke-RestMethod -Uri "$BackendUrl/api/inquiries/$($inq.id)/convert" -Method Post -Body $convertData -Headers $hPm -ContentType "application/json" -TimeoutSec 5
    Assert-Step "PM Inquiry Conversion" ($conv.projectId -ne $null) "Project Code: $($conv.projectCode)" | Out-Null
} catch {
    Assert-Step "Inquiry Flow" $false $_.Message | Out-Null
}

# 3. Kanban Drag-and-Drop / Move, Comments & Time Logging
try {
    $hArtist = @{ Authorization = "Bearer " + $tokens["Artist"] }
    $tasks = Invoke-RestMethod -Uri "$BackendUrl/api/tasks" -Headers $hArtist -TimeoutSec 5
    $targetTask = $tasks.data[0]

    # Move to InProgress
    $move1 = Invoke-RestMethod -Uri "$BackendUrl/api/tasks/$($targetTask.id)/move" -Method Patch -Body '{"status":"InProgress"}' -Headers $hArtist -ContentType "application/json" -TimeoutSec 5
    Assert-Step "Kanban Move (InProgress)" ($move1.status -eq "InProgress") "Status: $($move1.status)" | Out-Null

    # Add Comment
    $comm = Invoke-RestMethod -Uri "$BackendUrl/api/tasks/$($targetTask.id)/comments" -Method Post -Body '{"body":"Working on detailed textures.","statusChangeTo":"Review"}' -Headers $hArtist -ContentType "application/json" -TimeoutSec 5
    Assert-Step "Task Comment with Status" ($comm.id -ne $null) "Comment ID: $($comm.id)" | Out-Null

    # Log Time
    $tLog = Invoke-RestMethod -Uri "$BackendUrl/api/tasks/$($targetTask.id)/time" -Method Post -Body '{"date":"2026-11-21","hours":4.0,"notes":"Texturing pass"}' -Headers $hArtist -ContentType "application/json" -TimeoutSec 5
    Assert-Step "Artist Time Logging" ($tLog.message -like "*success*") "Hours logged: 4.0h" | Out-Null
} catch {
    Assert-Step "Kanban Flow" $false $_.Message | Out-Null
}

# 4. Asset Creation -> Upload -> Submit -> Review -> Download
try {
    $projects = Invoke-RestMethod -Uri "$BackendUrl/api/projects" -Headers $hArtist -TimeoutSec 5
    $targetProjectId = $projects.data[0].id

    $newAsset = Invoke-RestMethod -Uri "$BackendUrl/api/assets" -Method Post -Body (@{
        projectId = $targetProjectId
        name = "Sci-Fi Energy Capsule $(Get-Random)"
        category = "Prop"
        description = "Energy power core asset"
        tags = @("prop", "scifi")
    } | ConvertTo-Json) -Headers $hArtist -ContentType "application/json" -TimeoutSec 5
    Assert-Step "Asset Creation" ($newAsset.id -ne $null) "Asset ID: $($newAsset.id)" | Out-Null

    # Upload version file
    $tempFile = "C:\Polytrack\test_core.blend"
    Set-Content $tempFile "POLYTRACK-BINARY-V1-CORE"
    $upRes = curl.exe -s --max-time 5 -X POST "$BackendUrl/api/assets/$($newAsset.id)/upload" `
        -H "Authorization: Bearer $($tokens["Artist"])" `
        -F "file=@$tempFile" `
        -F "notes=V1 Base mesh" `
        -F "polygonCount=18500"
    $upJson = $upRes | ConvertFrom-Json
    Assert-Step "Asset Version Upload" ($upJson.versionNumber -eq 1) "Uploaded V1" | Out-Null

    # Submit for review
    $sub = Invoke-RestMethod -Uri "$BackendUrl/api/assets/$($newAsset.id)/submit" -Method Post -Headers $hArtist -TimeoutSec 5
    Assert-Step "Submit Asset for Review" ($sub.message -like "*submitted*") "Status: Submitted" | Out-Null

    # Reviewer Approves
    $hReviewer = @{ Authorization = "Bearer " + $tokens["Reviewer"] }
    $rev = Invoke-RestMethod -Uri "$BackendUrl/api/assets/$($newAsset.id)/review" -Method Post -Body '{"approved":true,"notes":"Looks great!"}' -Headers $hReviewer -ContentType "application/json" -TimeoutSec 5
    Assert-Step "Reviewer Approval" ($rev.message -like "*approved*") "Status: Approved" | Out-Null

    # Download version file
    $outFile = "C:\Polytrack\downloaded_core.blend"
    curl.exe -s --max-time 5 -H "Authorization: Bearer $($tokens["Artist"])" "$BackendUrl/api/assets/$($newAsset.id)/download/$($upJson.id)" -o $outFile
    $downContent = Get-Content $outFile
    Assert-Step "Version File Download" ($downContent -eq "POLYTRACK-BINARY-V1-CORE") "File verified" | Out-Null

    Remove-Item $tempFile, $outFile -ErrorAction SilentlyContinue
} catch {
    Assert-Step "Asset Flow" $false $_.Message | Out-Null
}

# 5. Dashboard Stats, Deadlines, Recent Assets, Timesheets
try {
    $hAdmin = @{ Authorization = "Bearer " + $tokens["Admin"] }
    $stats = Invoke-RestMethod -Uri "$BackendUrl/api/dashboard/stats" -Headers $hAdmin -TimeoutSec 5
    $deadlines = Invoke-RestMethod -Uri "$BackendUrl/api/dashboard/upcoming-deadlines" -Headers $hAdmin -TimeoutSec 5
    $recentAssets = Invoke-RestMethod -Uri "$BackendUrl/api/dashboard/recent-assets" -Headers $hAdmin -TimeoutSec 5
    $timesheets = Invoke-RestMethod -Uri "$BackendUrl/api/dashboard/timesheets" -Headers $hAdmin -TimeoutSec 5

    Assert-Step "Dashboard Stats" ($stats.totalProjects -gt 0 -and $stats.totalTasks -gt 0) "Projects: $($stats.totalProjects), Tasks: $($stats.totalTasks), Assets: $($stats.totalAssets)" | Out-Null
    Assert-Step "Upcoming Deadlines" ($deadlines -ne $null) "Found: $($deadlines.Count) deadlines" | Out-Null
    Assert-Step "Recent Assets" ($recentAssets.Count -gt 0) "Found: $($recentAssets.Count) recent assets" | Out-Null
    Assert-Step "Weekly Timesheets" ($timesheets.totalHours -ge 0) "Total logged hours: $($timesheets.totalHours)h" | Out-Null
} catch {
    Assert-Step "Dashboard Endpoints" $false $_.Message | Out-Null
}

# 6. Frontend Web Endpoints & Blender Addon Zip
try {
    $webDash = Invoke-WebRequest -Uri "$FrontendUrl/dashboard" -UseBasicParsing -TimeoutSec 5
    $webInquiry = Invoke-WebRequest -Uri "$FrontendUrl/inquiry" -UseBasicParsing -TimeoutSec 5
    $webLogin = Invoke-WebRequest -Uri "$FrontendUrl/login" -UseBasicParsing -TimeoutSec 5
    $webAddon = Invoke-WebRequest -Uri "$FrontendUrl/downloads/polytrack_blender_addon.zip" -UseBasicParsing -TimeoutSec 5

    Assert-Step "Frontend /dashboard" ($webDash.StatusCode -eq 200) "HTTP 200" | Out-Null
    Assert-Step "Frontend /inquiry" ($webInquiry.StatusCode -eq 200) "HTTP 200 (Public Client Portal)" | Out-Null
    Assert-Step "Frontend /login" ($webLogin.StatusCode -eq 200) "HTTP 200" | Out-Null
    Assert-Step "Blender Addon Zip" ($webAddon.StatusCode -eq 200 -and $webAddon.Content.Length -gt 1000) "HTTP 200 ($($webAddon.Content.Length) bytes)" | Out-Null
} catch {
    Assert-Step "Frontend Endpoints" $false $_.Message | Out-Null
}

Write-Host "`nAll Audit Assertions Completed!" -ForegroundColor Cyan
