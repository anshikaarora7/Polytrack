# Projects API — Full Implementation Guide
## 3D Studio Management System · Sprint 2

---

## What you will build

By the end of this guide you will have:

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/projects | GET | Get all projects (with filters) |
| /api/projects/{id} | GET | Get single project with full details |
| /api/projects | POST | Create a new project |
| /api/projects/{id} | PUT | Update a project |
| /api/projects/{id} | DELETE | Soft delete a project |
| /api/projects/{id}/members | GET | Get project team members |
| /api/projects/{id}/members | POST | Add member to project |
| /api/projects/{id}/members/{userId} | DELETE | Remove member from project |
| /api/projects/{id}/stats | GET | Get project stats for dashboard |

---

## Step 1 — Create DTOs

DTOs (Data Transfer Objects) are what your API sends and receives.
Never expose raw EF models directly to the API — always use DTOs.

### Create folder structure

```
StudioAPI/DTOs/Projects/
├── CreateProjectDto.cs
├── UpdateProjectDto.cs
├── ProjectResponseDto.cs
└── ProjectListItemDto.cs
```

---

### `StudioAPI/DTOs/Projects/CreateProjectDto.cs`

```csharp
using System.ComponentModel.DataAnnotations;

namespace StudioAPI.DTOs.Projects;

public class CreateProjectDto
{
    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    [MaxLength(30)]
    public string? ProjectCode { get; set; }

    public Guid? ClientId { get; set; }

    public string? ProjectType { get; set; }

    [Required]
    public string Status { get; set; } = "draft";

    [Required]
    public string Priority { get; set; } = "normal";

    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }

    public decimal? BudgetAmount { get; set; }
    public string Currency { get; set; } = "INR";
}
```

---

### `StudioAPI/DTOs/Projects/UpdateProjectDto.cs`

```csharp
using System.ComponentModel.DataAnnotations;

namespace StudioAPI.DTOs.Projects;

public class UpdateProjectDto
{
    [MaxLength(255)]
    public string? Name { get; set; }

    public string? Description { get; set; }

    public Guid? ClientId { get; set; }

    public Guid? ProjectManagerId { get; set; }

    public string? ProjectType { get; set; }
    public string? Status { get; set; }
    public string? Priority { get; set; }

    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }

    public decimal? BudgetAmount { get; set; }
    public string? Currency { get; set; }

    public int? CompletionPercent { get; set; }
}
```

---

### `StudioAPI/DTOs/Projects/ProjectResponseDto.cs`

```csharp
namespace StudioAPI.DTOs.Projects;

public class ProjectResponseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ProjectCode { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public string? ProjectType { get; set; }

    // Dates
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }

    // Budget
    public decimal? BudgetAmount { get; set; }
    public string? Currency { get; set; }

    // Progress
    public int CompletionPercent { get; set; }

    // Related entities
    public ProjectClientDto? Client { get; set; }
    public ProjectManagerDto? ProjectManager { get; set; }
    public List<ProjectMemberDto> Members { get; set; } = new();
    public int MilestoneCount { get; set; }
    public int TaskCount { get; set; }
    public int AssetCount { get; set; }

    // Meta
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class ProjectListItemDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ProjectCode { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public string? ProjectType { get; set; }
    public DateTime? EndDate { get; set; }
    public int CompletionPercent { get; set; }
    public string? ClientName { get; set; }
    public string? ProjectManagerName { get; set; }
    public int TaskCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ProjectClientDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? CompanyName { get; set; }
}

public class ProjectManagerDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}

public class ProjectMemberDto
{
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? RoleInProject { get; set; }
}

public class AddMemberDto
{
    public Guid UserId { get; set; }
    public string? RoleInProject { get; set; }
}

public class ProjectStatsDto
{
    public int TotalTasks { get; set; }
    public int CompletedTasks { get; set; }
    public int InProgressTasks { get; set; }
    public int OverdueTasks { get; set; }
    public int TotalAssets { get; set; }
    public int ApprovedAssets { get; set; }
    public int TotalMilestones { get; set; }
    public int CompletedMilestones { get; set; }
    public double TotalHoursLogged { get; set; }
}
```

---

## Step 2 — Create the Projects Controller

Create `StudioAPI/Controllers/ProjectsController.cs`:

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudioAPI.DTOs.Projects;
using StudioAPI.Infrastructure.Data;
using StudioAPI.Infrastructure.Models;
using System.Security.Claims;

namespace StudioAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]  // All endpoints require login
public class ProjectsController : ControllerBase
{
    private readonly StudioDbContext _db;

    public ProjectsController(StudioDbContext db)
    {
        _db = db;
    }

    // Helper: get current user ID from JWT token
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue("userId")!);

    private string CurrentUserRole =>
        User.FindFirstValue(ClaimTypes.Role)!;

    // ─────────────────────────────────────────────────────────
    // GET /api/projects
    // Query params: status, priority, projectType, search
    // ─────────────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? status,
        [FromQuery] string? priority,
        [FromQuery] string? projectType,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var query = _db.Projects
            .Include(p => p.Client)
            .Include(p => p.ProjectManager)
            .Include(p => p.Tasks)
            .AsQueryable();

        // If artist → only show projects they are members of
        if (CurrentUserRole == "artist")
        {
            query = query.Where(p =>
                p.ProjectMembers.Any(m => m.UserId == CurrentUserId));
        }

        // If client → only show their own projects
        if (CurrentUserRole == "client")
        {
            var client = await _db.Clients
                .FirstOrDefaultAsync(c => c.UserId == CurrentUserId);
            if (client != null)
                query = query.Where(p => p.ClientId == client.Id);
            else
                return Ok(new { data = new List<object>(), total = 0 });
        }

        // Filters
        if (!string.IsNullOrEmpty(status))
            query = query.Where(p => p.Status.ToString() == status);

        if (!string.IsNullOrEmpty(priority))
            query = query.Where(p => p.Priority.ToString() == priority);

        if (!string.IsNullOrEmpty(projectType))
            query = query.Where(p => p.ProjectType.ToString() == projectType);

        if (!string.IsNullOrEmpty(search))
            query = query.Where(p =>
                p.Name.ToLower().Contains(search.ToLower()) ||
                (p.ProjectCode != null && p.ProjectCode.ToLower().Contains(search.ToLower())));

        var total = await query.CountAsync();

        var projects = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new ProjectListItemDto
            {
                Id                 = p.Id,
                Name               = p.Name,
                ProjectCode        = p.ProjectCode,
                Status             = p.Status.ToString(),
                Priority           = p.Priority.ToString(),
                ProjectType        = p.ProjectType.ToString(),
                EndDate            = p.EndDate.HasValue
                                        ? p.EndDate.Value.ToDateTime(TimeOnly.MinValue)
                                        : null,
                CompletionPercent  = p.CompletionPercent,
                ClientName         = p.Client != null ? p.Client.ContactName : null,
                ProjectManagerName = p.ProjectManager != null ? p.ProjectManager.Name : null,
                TaskCount          = p.Tasks.Count,
                CreatedAt          = p.CreatedAt
            })
            .ToListAsync();

        return Ok(new { data = projects, total, page, pageSize });
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/projects/{id}
    // ─────────────────────────────────────────────────────────
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var project = await _db.Projects
            .Include(p => p.Client)
            .Include(p => p.ProjectManager)
            .Include(p => p.ProjectMembers)
                .ThenInclude(m => m.User)
            .Include(p => p.Milestones)
            .Include(p => p.Tasks)
            .Include(p => p.Assets)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (project == null)
            return NotFound(new { message = "Project not found" });

        // Artists can only see projects they're members of
        if (CurrentUserRole == "artist" &&
            !project.ProjectMembers.Any(m => m.UserId == CurrentUserId))
            return Forbid();

        var response = new ProjectResponseDto
        {
            Id                = project.Id,
            Name              = project.Name,
            Description       = project.Description,
            ProjectCode       = project.ProjectCode,
            Status            = project.Status.ToString(),
            Priority          = project.Priority.ToString(),
            ProjectType       = project.ProjectType?.ToString(),
            StartDate         = project.StartDate.HasValue
                                    ? project.StartDate.Value.ToDateTime(TimeOnly.MinValue)
                                    : null,
            EndDate           = project.EndDate.HasValue
                                    ? project.EndDate.Value.ToDateTime(TimeOnly.MinValue)
                                    : null,
            BudgetAmount      = project.BudgetAmount,
            Currency          = project.Currency,
            CompletionPercent = project.CompletionPercent,
            MilestoneCount    = project.Milestones.Count,
            TaskCount         = project.Tasks.Count,
            AssetCount        = project.Assets.Count,
            CreatedAt         = project.CreatedAt,
            UpdatedAt         = project.UpdatedAt,
            Client = project.Client == null ? null : new ProjectClientDto
            {
                Id          = project.Client.Id,
                Name        = project.Client.ContactName,
                CompanyName = project.Client.CompanyName
            },
            ProjectManager = project.ProjectManager == null ? null : new ProjectManagerDto
            {
                Id    = project.ProjectManager.Id,
                Name  = project.ProjectManager.Name,
                Email = project.ProjectManager.Email
            },
            Members = project.ProjectMembers.Select(m => new ProjectMemberDto
            {
                UserId        = m.UserId,
                Name          = m.User.Name,
                Email         = m.User.Email,
                Role          = m.User.Role.ToString(),
                RoleInProject = m.RoleInProject
            }).ToList()
        };

        return Ok(response);
    }

    // ─────────────────────────────────────────────────────────
    // POST /api/projects
    // Only admin + project_manager can create
    // ─────────────────────────────────────────────────────────
    [HttpPost]
    [Authorize(Roles = "admin,project_manager")]
    public async Task<IActionResult> Create([FromBody] CreateProjectDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var project = new Project
        {
            Id               = Guid.NewGuid(),
            Name             = dto.Name,
            Description      = dto.Description,
            ProjectCode      = dto.ProjectCode,
            ClientId         = dto.ClientId,
            ProjectManagerId = CurrentUserId,
            BudgetAmount     = dto.BudgetAmount,
            Currency         = dto.Currency,
            CreatedBy        = CurrentUserId,
            CreatedAt        = DateTime.UtcNow,
            UpdatedAt        = DateTime.UtcNow,
            CompletionPercent = 0
        };

        // Parse enums safely
        if (Enum.TryParse<ProjectStatus>(dto.Status, true, out var status))
            project.Status = status;
        else
            project.Status = ProjectStatus.Draft;

        if (Enum.TryParse<PriorityLevel>(dto.Priority, true, out var priority))
            project.Priority = priority;
        else
            project.Priority = PriorityLevel.Normal;

        if (!string.IsNullOrEmpty(dto.ProjectType) &&
            Enum.TryParse<ProjectType>(dto.ProjectType, true, out var projectType))
            project.ProjectType = projectType;

        if (dto.StartDate.HasValue)
            project.StartDate = DateOnly.FromDateTime(dto.StartDate.Value);

        if (dto.EndDate.HasValue)
            project.EndDate = DateOnly.FromDateTime(dto.EndDate.Value);

        _db.Projects.Add(project);

        // Log to activity feed
        _db.ActivityFeeds.Add(new ActivityFeed
        {
            Id          = Guid.NewGuid(),
            ProjectId   = project.Id,
            ActorId     = CurrentUserId,
            EntityType  = ActivityEntity.Project,
            EntityId    = project.Id,
            Action      = "created",
            Description = $"Project \"{project.Name}\" was created",
            CreatedAt   = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById),
            new { id = project.Id },
            new { id = project.Id, message = "Project created successfully" });
    }

    // ─────────────────────────────────────────────────────────
    // PUT /api/projects/{id}
    // ─────────────────────────────────────────────────────────
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "admin,project_manager")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateProjectDto dto)
    {
        var project = await _db.Projects.FindAsync(id);

        if (project == null)
            return NotFound(new { message = "Project not found" });

        // Track old status for activity feed
        var oldStatus = project.Status.ToString();

        // Only update fields that were provided
        if (dto.Name != null) project.Name = dto.Name;
        if (dto.Description != null) project.Description = dto.Description;
        if (dto.ClientId.HasValue) project.ClientId = dto.ClientId;
        if (dto.ProjectManagerId.HasValue) project.ProjectManagerId = dto.ProjectManagerId;
        if (dto.BudgetAmount.HasValue) project.BudgetAmount = dto.BudgetAmount;
        if (dto.Currency != null) project.Currency = dto.Currency;
        if (dto.CompletionPercent.HasValue)
            project.CompletionPercent = (short)dto.CompletionPercent.Value;

        if (dto.StartDate.HasValue)
            project.StartDate = DateOnly.FromDateTime(dto.StartDate.Value);
        if (dto.EndDate.HasValue)
            project.EndDate = DateOnly.FromDateTime(dto.EndDate.Value);

        if (!string.IsNullOrEmpty(dto.Status) &&
            Enum.TryParse<ProjectStatus>(dto.Status, true, out var status))
            project.Status = status;

        if (!string.IsNullOrEmpty(dto.Priority) &&
            Enum.TryParse<PriorityLevel>(dto.Priority, true, out var priority))
            project.Priority = priority;

        if (!string.IsNullOrEmpty(dto.ProjectType) &&
            Enum.TryParse<ProjectType>(dto.ProjectType, true, out var projectType))
            project.ProjectType = projectType;

        project.UpdatedAt = DateTime.UtcNow;

        // Log status change to activity feed
        if (dto.Status != null && dto.Status != oldStatus)
        {
            _db.ActivityFeeds.Add(new ActivityFeed
            {
                Id          = Guid.NewGuid(),
                ProjectId   = project.Id,
                ActorId     = CurrentUserId,
                EntityType  = ActivityEntity.Project,
                EntityId    = project.Id,
                Action      = "status_changed",
                Description = $"Project status changed from {oldStatus} to {dto.Status}",
                CreatedAt   = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = "Project updated successfully" });
    }

    // ─────────────────────────────────────────────────────────
    // DELETE /api/projects/{id}
    // Only admin can delete
    // ─────────────────────────────────────────────────────────
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var project = await _db.Projects.FindAsync(id);

        if (project == null)
            return NotFound(new { message = "Project not found" });

        // Soft delete — set status to cancelled instead of removing from DB
        project.Status    = ProjectStatus.Cancelled;
        project.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(new { message = "Project cancelled successfully" });
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/projects/{id}/members
    // ─────────────────────────────────────────────────────────
    [HttpGet("{id:guid}/members")]
    public async Task<IActionResult> GetMembers(Guid id)
    {
        var members = await _db.ProjectMembers
            .Include(m => m.User)
            .Where(m => m.ProjectId == id)
            .Select(m => new ProjectMemberDto
            {
                UserId        = m.UserId,
                Name          = m.User.Name,
                Email         = m.User.Email,
                Role          = m.User.Role.ToString(),
                RoleInProject = m.RoleInProject
            })
            .ToListAsync();

        return Ok(members);
    }

    // ─────────────────────────────────────────────────────────
    // POST /api/projects/{id}/members
    // ─────────────────────────────────────────────────────────
    [HttpPost("{id:guid}/members")]
    [Authorize(Roles = "admin,project_manager")]
    public async Task<IActionResult> AddMember(Guid id, [FromBody] AddMemberDto dto)
    {
        var project = await _db.Projects.FindAsync(id);
        if (project == null)
            return NotFound(new { message = "Project not found" });

        var user = await _db.Users.FindAsync(dto.UserId);
        if (user == null)
            return NotFound(new { message = "User not found" });

        // Check if already a member
        var existing = await _db.ProjectMembers
            .FirstOrDefaultAsync(m => m.ProjectId == id && m.UserId == dto.UserId);

        if (existing != null)
            return Conflict(new { message = "User is already a project member" });

        _db.ProjectMembers.Add(new ProjectMember
        {
            Id            = Guid.NewGuid(),
            ProjectId     = id,
            UserId        = dto.UserId,
            RoleInProject = dto.RoleInProject,
            AddedAt       = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(new { message = $"{user.Name} added to project" });
    }

    // ─────────────────────────────────────────────────────────
    // DELETE /api/projects/{id}/members/{userId}
    // ─────────────────────────────────────────────────────────
    [HttpDelete("{id:guid}/members/{userId:guid}")]
    [Authorize(Roles = "admin,project_manager")]
    public async Task<IActionResult> RemoveMember(Guid id, Guid userId)
    {
        var member = await _db.ProjectMembers
            .FirstOrDefaultAsync(m => m.ProjectId == id && m.UserId == userId);

        if (member == null)
            return NotFound(new { message = "Member not found in project" });

        _db.ProjectMembers.Remove(member);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Member removed from project" });
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/projects/{id}/stats
    // ─────────────────────────────────────────────────────────
    [HttpGet("{id:guid}/stats")]
    public async Task<IActionResult> GetStats(Guid id)
    {
        var project = await _db.Projects.FindAsync(id);
        if (project == null)
            return NotFound(new { message = "Project not found" });

        var tasks = await _db.Tasks
            .Where(t => t.ProjectId == id)
            .ToListAsync();

        var assets = await _db.Assets
            .Where(a => a.ProjectId == id)
            .ToListAsync();

        var milestones = await _db.Milestones
            .Where(m => m.ProjectId == id)
            .ToListAsync();

        var totalHours = await _db.TimeEntries
            .Where(t => t.ProjectId == id)
            .SumAsync(t => (double?)t.Hours) ?? 0;

        var stats = new ProjectStatsDto
        {
            TotalTasks          = tasks.Count,
            CompletedTasks      = tasks.Count(t => t.Status == TaskStatus.Done),
            InProgressTasks     = tasks.Count(t => t.Status == TaskStatus.InProgress),
            OverdueTasks        = tasks.Count(t =>
                                    t.DueDate.HasValue &&
                                    t.DueDate.Value < DateOnly.FromDateTime(DateTime.UtcNow) &&
                                    t.Status != TaskStatus.Done),
            TotalAssets         = assets.Count,
            ApprovedAssets      = assets.Count(a => a.Status == AssetStatus.Approved),
            TotalMilestones     = milestones.Count,
            CompletedMilestones = milestones.Count(m => m.Status == MilestoneStatus.Completed),
            TotalHoursLogged    = totalHours
        };

        return Ok(stats);
    }
}
```

---

## Step 3 — Build and test

### Run the API

```powershell
cd StudioAPI
dotnet build
dotnet run
```

---

### Test every endpoint in Postman

First, login to get your token:
```
POST https://localhost:7xxx/api/auth/login
Body: { "email": "admin@studio.local", "password": "admin123" }
```

Copy the `accessToken`. For every request below, add header:
```
Authorization: Bearer YOUR_TOKEN_HERE
```

---

#### Test 1 — Create a project
```
POST https://localhost:7xxx/api/projects
Body:
{
  "name": "Medieval Environment Pack",
  "description": "Full medieval castle environment with props",
  "projectCode": "PROJ-001",
  "projectType": "environment",
  "status": "active",
  "priority": "high",
  "startDate": "2024-01-15",
  "endDate": "2024-03-15",
  "budgetAmount": 5000,
  "currency": "INR"
}
Expected: 201 Created with project id
```

---

#### Test 2 — Get all projects
```
GET https://localhost:7xxx/api/projects
Expected: 200 OK with list containing your project

With filters:
GET https://localhost:7xxx/api/projects?status=active
GET https://localhost:7xxx/api/projects?search=medieval
GET https://localhost:7xxx/api/projects?priority=high
```

---

#### Test 3 — Get single project
```
GET https://localhost:7xxx/api/projects/{id}
(use the id from Test 1 response)
Expected: 200 OK with full project details
```

---

#### Test 4 — Update project
```
PUT https://localhost:7xxx/api/projects/{id}
Body:
{
  "status": "planning",
  "completionPercent": 10
}
Expected: 200 OK
```

---

#### Test 5 — Get project stats
```
GET https://localhost:7xxx/api/projects/{id}/stats
Expected: 200 OK with all counts (zeros for now, will fill as you add tasks/assets)
```

---

#### Test 6 — Add a member
```
POST https://localhost:7xxx/api/projects/{id}/members
Body:
{
  "userId": "UUID_OF_AN_ARTIST_USER",
  "roleInProject": "Lead Artist"
}
Expected: 200 OK
```

To get a user UUID first, query the DB in pgAdmin:
```sql
SELECT id, name, role FROM users;
```

---

## Step 4 — Create a few test users in pgAdmin

Before testing members, create some test users:

```sql
-- Artist user (password: artist123)
INSERT INTO users (id, name, email, password_hash, role)
VALUES (
  gen_random_uuid(),
  'Raj Artist',
  'raj@studio.local',
  '$2a$12$PASTE_BCRYPT_HASH_OF_artist123',
  'artist'
);

-- Project Manager (password: pm123)
INSERT INTO users (id, name, email, password_hash, role)
VALUES (
  gen_random_uuid(),
  'Priya PM',
  'priya@studio.local',
  '$2a$12$PASTE_BCRYPT_HASH_OF_pm123',
  'project_manager'
);
```

Generate hashes the same way as before — run BCrypt.HashPassword() for each password.

---

## What you now have

```
✅ GET    /api/projects              — list with filters + pagination
✅ GET    /api/projects/{id}         — full project details
✅ POST   /api/projects              — create project
✅ PUT    /api/projects/{id}         — update project
✅ DELETE /api/projects/{id}         — soft delete (sets to cancelled)
✅ GET    /api/projects/{id}/members — list team members
✅ POST   /api/projects/{id}/members — add member
✅ DELETE /api/projects/{id}/members/{userId} — remove member
✅ GET    /api/projects/{id}/stats   — dashboard stats
✅ Role-based access (admin, pm, artist, client all see correct data)
✅ Activity feed logging on create + status change
```

---

## Next step after this

Once all Postman tests pass, build:
1. Tasks controller (same pattern)
2. Then React projects list page

Message me when all 6 Postman tests pass.

