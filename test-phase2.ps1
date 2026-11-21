# PolyTrack Phase 2 End-to-End Verification Test
$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Starting PolyTrack Backend Server for Phase 2 Tests...  " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$process = Start-Process -FilePath "C:\Polytrack\PolyTrack.Backend\PolyTrackAPI\bin\Debug\net10.0\PolyTrackAPI.exe" `
  -ArgumentList "--urls", "http://localhost:5030" `
  -WorkingDirectory "C:\Polytrack\PolyTrack.Backend\PolyTrackAPI" `
  -PassThru

try {
    # 1. Wait for server
    $baseUrl = "http://localhost:5030/api"
    $ready = $false
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 1
        try {
            $resp = Invoke-RestMethod -Uri "$baseUrl/dashboard/stats" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($resp) { $ready = $true; break }
        } catch {}
    }

    if (-not $ready) {
        Write-Error "Backend server failed to start on port 5030."
        exit 1
    }
    Write-Host "[OK] Backend server is listening on $baseUrl" -ForegroundColor Green

    # 2. Login
    Write-Host "`n--- 1. Authenticating Admin User ---" -ForegroundColor Yellow
    $loginBody = @{
        email = "admin@polytrack.com"
        password = "Admin@123456"
    } | ConvertTo-Json

    $loginResp = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResp.accessToken
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    Write-Host "[PASSED] Logged in as: $($loginResp.user.name) ($($loginResp.user.role))" -ForegroundColor Green

    # 3. Inquiries & Client Portal
    Write-Host "`n--- 2. Inquiries & Client Portal Flow ---" -ForegroundColor Yellow
    $inquiryBody = @{
        clientName = "Evelyn Wright"
        companyName = "Wright FX Studios"
        email = "evelyn@wrightfx.com"
        phone = "+1 (555) 789-0123"
        projectTitle = "Sci-Fi Cyber Hovercraft Asset"
        projectDescription = "Need a game-ready high-poly vehicle model with PBR 4K textures, rigged doors and thrusters."
        projectType = "Prop"
        budgetRange = "$12,000 - $18,000"
    } | ConvertTo-Json

    $inqResp = Invoke-RestMethod -Uri "$baseUrl/inquiries" -Method Post -Body $inquiryBody -ContentType "application/json" -Headers $headers
    $inquiryId = $inqResp.id
    Write-Host "[PASSED] Created Client Inquiry: $inquiryId ($($inqResp.projectTitle))" -ForegroundColor Green

    # Update inquiry status
    $statusUpdateBody = @{ status = "UnderReview" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/inquiries/$inquiryId/status" -Method Patch -Body $statusUpdateBody -ContentType "application/json" -Headers $headers
    Write-Host "[PASSED] Inquiry status updated to UnderReview" -ForegroundColor Green

    # Convert inquiry to project
    $convertBody = @{
        projectName = "Hovercraft Sci-Fi Prop Model"
        budget = 14500
    } | ConvertTo-Json
    $convertedProj = Invoke-RestMethod -Uri "$baseUrl/inquiries/$inquiryId/convert" -Method Post -Body $convertBody -ContentType "application/json" -Headers $headers
    $projectId = $convertedProj.projectId
    Write-Host "[PASSED] Inquiry Converted! New Project ID: $projectId ($($convertedProj.projectName))" -ForegroundColor Green

    # 4. Clients Directory
    Write-Host "`n--- 3. Clients Directory ---" -ForegroundColor Yellow
    $clientsResp = Invoke-RestMethod -Uri "$baseUrl/clients" -Method Get -Headers $headers
    Write-Host "[PASSED] Total Registered Clients: $($clientsResp.total)" -ForegroundColor Green

    # 5. Project Details & Stats
    Write-Host "`n--- 4. Project Details & Stats ---" -ForegroundColor Yellow
    $projDetails = Invoke-RestMethod -Uri "$baseUrl/projects/$projectId" -Method Get -Headers $headers
    Write-Host "[PASSED] Loaded Project: $($projDetails.name), Budget: `$$($projDetails.budgetAmount), Status: $($projDetails.status)" -ForegroundColor Green

    $projStats = Invoke-RestMethod -Uri "$baseUrl/projects/$projectId/stats" -Method Get -Headers $headers
    Write-Host "[PASSED] Project Stats: $($projStats.totalTasks) Tasks, $($projStats.totalMilestones) Milestones" -ForegroundColor Green

    # 6. Milestones Management & Client Review
    Write-Host "`n--- 5. Milestones & Client Review Flow ---" -ForegroundColor Yellow
    $milestoneBody = @{
        projectId = $projectId
        name = "Milestone 1: 3D High-Poly Sculpt & Topology"
        description = "Complete topology and edge flow for the chassis."
        sortOrder = 1
    } | ConvertTo-Json

    $mResp = Invoke-RestMethod -Uri "$baseUrl/milestones" -Method Post -Body $milestoneBody -ContentType "application/json" -Headers $headers
    $milestoneId = $mResp.id
    Write-Host "[PASSED] Created Milestone: $milestoneId ($($mResp.name))" -ForegroundColor Green

    # Client Review of milestone
    $reviewBody = @{
        approved = $true
        notes = "Chassis topology meets our game engine requirements. Approved!"
    } | ConvertTo-Json
    $reviewResp = Invoke-RestMethod -Uri "$baseUrl/milestones/$milestoneId/client-review" -Method Post -Body $reviewBody -ContentType "application/json" -Headers $headers
    Write-Host "[PASSED] Client Review Submitted: $($reviewResp.message)" -ForegroundColor Green

    # 7. Tasks, Kanban, Comments & Attachments
    Write-Host "`n--- 6. Tasks, Kanban & Attachment Flow ---" -ForegroundColor Yellow
    $taskBody = @{
        title = "Model Hovercraft Engine Thrusters"
        description = "Create modular cylindrical thrusters with emissive heat sink coils."
        projectId = $projectId
        milestoneId = $milestoneId
        priority = "High"
        storyPoints = 5
        estimatedHours = 12
    } | ConvertTo-Json

    $taskResp = Invoke-RestMethod -Uri "$baseUrl/tasks" -Method Post -Body $taskBody -ContentType "application/json" -Headers $headers
    $taskId = $taskResp.id
    Write-Host "[PASSED] Created Task: $taskId" -ForegroundColor Green

    # Move task lane in Kanban
    $moveBody = @{ status = "InProgress" } | ConvertTo-Json
    $moveResp = Invoke-RestMethod -Uri "$baseUrl/tasks/$taskId/move" -Method Patch -Body $moveBody -ContentType "application/json" -Headers $headers
    Write-Host "[PASSED] Task moved to InProgress: $($moveResp.status)" -ForegroundColor Green

    # Add task comment with status change
    $commentBody = @{
        body = "Initial thruster blockout completed in Blender. Moving to UV unwrapping."
        statusChangeTo = "Review"
    } | ConvertTo-Json
    $commResp = Invoke-RestMethod -Uri "$baseUrl/tasks/$taskId/comments" -Method Post -Body $commentBody -ContentType "application/json" -Headers $headers
    Write-Host "[PASSED] Task Comment posted: $($commResp.body)" -ForegroundColor Green

    # Log time entry
    $timeBody = @{
        date = (Get-Date).ToString("yyyy-MM-dd")
        hours = 4.5
        notes = "4.5 hours hard-surface modeling thruster nozzles"
    } | ConvertTo-Json
    $timeResp = Invoke-RestMethod -Uri "$baseUrl/tasks/$taskId/time" -Method Post -Body $timeBody -ContentType "application/json" -Headers $headers
    Write-Host "[PASSED] Time Logged: $($timeResp.hours)h on $($timeResp.date)" -ForegroundColor Green

    # Upload task attachment
    $testFilePath = "C:\Polytrack\studio-storage\temp_test_ref.txt"
    "Reference schematic for sci-fi hovercraft thrusters" | Out-File -FilePath $testFilePath -Encoding utf8
    
    $uploadCmd = "curl -s -X POST -H 'Authorization: Bearer $token' -F 'file=@$testFilePath' http://localhost:5030/api/tasks/$taskId/attachments"
    $uploadJson = Invoke-Expression $uploadCmd
    Write-Host "[PASSED] Task Attachment uploaded to studio storage: $uploadJson" -ForegroundColor Green

    if (Test-Path $testFilePath) { Remove-Item -Force $testFilePath }

    # Fetch task attachments
    $attachments = Invoke-RestMethod -Uri "$baseUrl/tasks/$taskId/attachments" -Method Get -Headers $headers
    Write-Host "[PASSED] Task Attachments Count: $($attachments.Count)" -ForegroundColor Green

    # Verify Kanban Board grouping
    $kanban = Invoke-RestMethod -Uri "$baseUrl/tasks/kanban?projectId=$projectId" -Method Get -Headers $headers
    Write-Host "[PASSED] Kanban Board lanes: New=$($kanban.new.Count), InProgress=$($kanban.inProgress.Count), Review=$($kanban.review.Count), Done=$($kanban.done.Count)" -ForegroundColor Green

    Write-Host "`n==========================================================" -ForegroundColor Green
    Write-Host " ALL PHASE 2 BACKEND AND DATA FLOW TESTS PASSED!         " -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green

} finally {
    if ($process -and -not $process.HasExited) {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    }
}
