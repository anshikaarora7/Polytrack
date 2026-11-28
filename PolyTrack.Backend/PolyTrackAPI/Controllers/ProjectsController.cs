using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PolyTrackAPI.Core.Constants;
using PolyTrackAPI.DTOs.Projects;
using PolyTrackAPI.Infrastructure.Data;
using PolyTrackAPI.Infrastructure.Models;
using System.Security.Claims;

namespace PolyTrackAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProjectsController : ControllerBase
{
    private readonly StudioDbContext _db;

    public ProjectsController(StudioDbContext db)
    {
        _db = db;
    }

    private Guid CurrentUserId =>
        Guid.TryParse(User.FindFirstValue("userId"), out var id) ? id : Guid.Empty;

    private string CurrentUserRole =>
        User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

    // ── GET /api/projects ─────────────────────────────────────
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
            .Include(p => p.ProjectMembers)
            .AsQueryable();

        if (CurrentUserRole == "artist")
            query = query.Where(p =>
                p.ProjectMembers.Any(m => m.UserId == CurrentUserId));

        if (CurrentUserRole == "client")
        {
            var client = await _db.Clients
                .FirstOrDefaultAsync(c => c.UserId == CurrentUserId);
            if (client != null)
                query = query.Where(p => p.ClientId == client.Id);
            else
                return Ok(new { data = new List<object>(), total = 0 });
        }

        if (!string.IsNullOrEmpty(status))
            query = query.Where(p => p.Status.ToString() == status);

        if (!string.IsNullOrEmpty(priority))
            query = query.Where(p => p.Priority.ToString() == priority);

        if (!string.IsNullOrEmpty(projectType))
            query = query.Where(p => p.ProjectType.ToString() == projectType);

        if (!string.IsNullOrEmpty(search))
            query = query.Where(p =>
                p.Name.ToLower().Contains(search.ToLower()) ||
                (p.ProjectCode != null &&
                 p.ProjectCode.ToLower().Contains(search.ToLower())));

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

    // ── GET /api/projects/{id} ────────────────────────────────
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var project = await _db.Projects
            .Include(p => p.Client)
            .Include(p => p.ProjectManager)
            .Include(p => p.ProjectMembers).ThenInclude(m => m.User)
            .Include(p => p.Milestones)
            .Include(p => p.Tasks)
            .Include(p => p.Assets)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (project == null)
            return NotFound(new { message = "Project not found" });

        if (CurrentUserRole == "artist" &&
            CurrentUserId != Guid.Empty &&
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

    // ── POST /api/projects ────────────────────────────────────
    [HttpPost]
    [Authorize(Roles = Roles.LeadsAndAbove)]
    public async Task<IActionResult> Create([FromBody] CreateProjectDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var project = new Project
        {
            Id                = Guid.NewGuid(),
            Name              = dto.Name,
            Description       = dto.Description,
            ProjectCode       = dto.ProjectCode,
            ClientId          = dto.ClientId,
            ProjectManagerId  = CurrentUserId,
            BudgetAmount      = dto.BudgetAmount,
            Currency          = dto.Currency,
            CreatedBy         = CurrentUserId,
            CreatedAt         = DateTime.UtcNow,
            UpdatedAt         = DateTime.UtcNow,
            CompletionPercent = 0
        };

        if (Enum.TryParse<ProjectStatus>(dto.Status, true, out var status))
            project.Status = status;
        else
            project.Status = ProjectStatus.Draft;

        if (Enum.TryParse<PriorityLevel>(dto.Priority, true, out var priority))
            project.Priority = priority;
        else
            project.Priority = PriorityLevel.Normal;

        if (!string.IsNullOrEmpty(dto.ProjectType) &&
            Enum.TryParse<ProjectType>(dto.ProjectType, true, out var pType))
            project.ProjectType = pType;

        if (dto.StartDate.HasValue)
            project.StartDate = DateOnly.FromDateTime(dto.StartDate.Value);
        if (dto.EndDate.HasValue)
            project.EndDate = DateOnly.FromDateTime(dto.EndDate.Value);

        _db.Projects.Add(project);

        _db.ActivityFeeds.Add(new ActivityFeed
        {
            Id          = Guid.NewGuid(),
            ProjectId   = project.Id,
            ActorId     = CurrentUserId,
            EntityType  = ActivityEntity.Project,   // fixed
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

    // ── PUT /api/projects/{id} ────────────────────────────────
    [HttpPut("{id:guid}")]
    [Authorize(Roles = Roles.LeadsAndAbove)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateProjectDto dto)
    {
        var project = await _db.Projects.FindAsync(id);
        if (project == null)
            return NotFound(new { message = "Project not found" });

        var oldStatus = project.Status.ToString();

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
            Enum.TryParse<ProjectType>(dto.ProjectType, true, out var pType))
            project.ProjectType = pType;

        project.UpdatedAt = DateTime.UtcNow;

        if (dto.Status != null && dto.Status != oldStatus)
        {
            _db.ActivityFeeds.Add(new ActivityFeed
            {
                Id          = Guid.NewGuid(),
                ProjectId   = project.Id,
                ActorId     = CurrentUserId,
                EntityType  = ActivityEntity.Project,   // fixed
                EntityId    = project.Id,
                Action      = "status_changed",
                Description = $"Project status changed from {oldStatus} to {dto.Status}",
                CreatedAt   = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = "Project updated successfully" });
    }

    // ── DELETE /api/projects/{id} ─────────────────────────────
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = Roles.LeadsAndAbove)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var project = await _db.Projects.FindAsync(id);
        if (project == null)
            return NotFound(new { message = "Project not found" });

        project.Status    = ProjectStatus.Cancelled;
        project.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(new { message = "Project cancelled successfully" });
    }

    // ── GET /api/projects/{id}/members ────────────────────────
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

    // ── POST /api/projects/{id}/members ───────────────────────
    [HttpPost("{id:guid}/members")]
    [Authorize(Roles = Roles.LeadsAndAbove)]
    public async Task<IActionResult> AddMember(Guid id, [FromBody] AddMemberDto dto)
    {
        var project = await _db.Projects.FindAsync(id);
        if (project == null)
            return NotFound(new { message = "Project not found" });

        var user = await _db.Users.FindAsync(dto.UserId);
        if (user == null)
            return NotFound(new { message = "User not found" });

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

    // ── DELETE /api/projects/{id}/members/{userId} ────────────
    [HttpDelete("{id:guid}/members/{userId:guid}")]
    [Authorize(Roles = Roles.LeadsAndAbove)]
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

    // ── GET /api/projects/{id}/stats ──────────────────────────
    [HttpGet("{id:guid}/stats")]
    public async Task<IActionResult> GetStats(Guid id)
    {
        var project = await _db.Projects.FindAsync(id);
        if (project == null)
            return NotFound(new { message = "Project not found" });

        var tasks = await _db.Tasks
            .Where(t => t.ProjectId == id).ToListAsync();

        var assets = await _db.Assets
            .Where(a => a.ProjectId == id).ToListAsync();

        var milestones = await _db.Milestones
            .Where(m => m.ProjectId == id).ToListAsync();

        var totalHours = await _db.TimeEntries
            .Where(t => t.ProjectId == id)
            .SumAsync(t => (double?)t.Hours) ?? 0;

        return Ok(new ProjectStatsDto
{
    TotalTasks = tasks.Count,

    CompletedTasks = tasks.Count(t =>
        t.Status == PolyTrackAPI.Infrastructure.Models.TaskStatus.Done),

    InProgressTasks = tasks.Count(t =>
        t.Status == PolyTrackAPI.Infrastructure.Models.TaskStatus.InProgress),

    OverdueTasks = tasks.Count(t =>
        t.DueDate.HasValue &&
        t.DueDate.Value < DateOnly.FromDateTime(DateTime.UtcNow) &&
        t.Status != PolyTrackAPI.Infrastructure.Models.TaskStatus.Done),

    TotalAssets = assets.Count,
    ApprovedAssets = assets.Count(a => a.Status == AssetStatus.Approved),
    TotalMilestones = milestones.Count,
    CompletedMilestones = milestones.Count(m => m.Status == MilestoneStatus.Completed),
    TotalHoursLogged = totalHours
});
    }
}
