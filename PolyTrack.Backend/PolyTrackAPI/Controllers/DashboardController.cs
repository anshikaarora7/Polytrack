using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PolyTrackAPI.Infrastructure.Data;
using PolyTrackAPI.Infrastructure.Models;
using System.Security.Claims;

namespace PolyTrackAPI.Controllers;

// ── DTOs ──────────────────────────────────────────────────────

public class DashboardStatsDto
{
    // Projects
    public int TotalProjects { get; set; }
    public int ActiveProjects { get; set; }
    public int CompletedProjects { get; set; }
    public int DelayedProjects { get; set; }
    // Tasks
    public int TotalTasks { get; set; }
    public int PendingTasks { get; set; }
    public int InProgressTasks { get; set; }
    public int ReviewTasks { get; set; }
    public int CompletedTasks { get; set; }
    public int OverdueTasks { get; set; }
    // Assets
    public int TotalAssets { get; set; }
    public int ApprovedAssets { get; set; }
    public int DraftAssets { get; set; }
    public int PendingReviewAssets { get; set; }
    // Team
    public int TotalUsers { get; set; }
    public int ActiveUsers { get; set; }
    // Time
    public double TotalHoursThisWeek { get; set; }
    public double TotalHoursThisMonth { get; set; }
}

public class ActivityFeedItemDto
{
    public Guid Id { get; set; }
    public string Action { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public Guid EntityId { get; set; }
    public Guid? ProjectId { get; set; }
    public string? ProjectName { get; set; }
    public string? ActorName { get; set; }
    public string? ActorAvatar { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ProjectProgressDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ProjectCode { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public int CompletionPercent { get; set; }
    public DateTime? EndDate { get; set; }
    public bool IsOverdue { get; set; }
    public int TotalTasks { get; set; }
    public int CompletedTasks { get; set; }
    public string? ProjectManagerName { get; set; }
}

public class UpcomingDeadlineDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // "task" or "milestone"
    public DateTime DueDate { get; set; }
    public int DaysRemaining { get; set; }
    public string? ProjectName { get; set; }
    public string? AssigneeName { get; set; }
}

public class RecentAssetDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public string? ProjectName { get; set; }
    public string? UploaderName { get; set; }
    public DateTime UpdatedAt { get; set; }
}

// ── Controller ────────────────────────────────────────────────

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly StudioDbContext _db;

    public DashboardController(StudioDbContext db)
    {
        _db = db;
    }

    private Guid CurrentUserId =>
        Guid.TryParse(User.FindFirstValue("userId"), out var id) ? id : Guid.Empty;

    private string CurrentUserRole =>
        User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

    // ── GET /api/dashboard/stats
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var now       = DateTime.UtcNow;
        var weekStart = DateOnly.FromDateTime(now.AddDays(-(int)now.DayOfWeek));
        var monthStart = DateOnly.FromDateTime(new DateTime(now.Year, now.Month, 1));
        var today     = DateOnly.FromDateTime(now);

        // Scope queries based on role
        IQueryable<Project> projectQuery = _db.Projects
            .Where(p => p.Status != ProjectStatus.Cancelled);

        IQueryable<PolyTrackAPI.Infrastructure.Models.Task> taskQuery = _db.Tasks;
        IQueryable<Asset> assetQuery = _db.Assets
            .Where(a => a.Status != AssetStatus.Archived);

        if (CurrentUserRole == "artist")
        {
            var myProjectIds = await _db.ProjectMembers
                .Where(m => m.UserId == CurrentUserId)
                .Select(m => m.ProjectId)
                .ToListAsync();
            projectQuery = projectQuery.Where(p => myProjectIds.Contains(p.Id));
            taskQuery    = taskQuery.Where(t => t.AssignedTo == CurrentUserId);
            assetQuery   = assetQuery.Where(a => myProjectIds.Contains(a.ProjectId));
        }

        if (CurrentUserRole == "client")
        {
            var client = await _db.Clients
                .FirstOrDefaultAsync(c => c.UserId == CurrentUserId);
            if (client != null)
            {
                projectQuery = projectQuery.Where(p => p.ClientId == client.Id);
                assetQuery   = assetQuery.Where(a => projectQuery.Select(p => p.Id).Contains(a.ProjectId));
            }
        }

        var projects = await projectQuery.Include(p => p.Tasks).ToListAsync();
        var tasks    = await taskQuery.ToListAsync();
        var assets   = await assetQuery.ToListAsync();

        var delayedProjects = projects.Where(p =>
            p.EndDate.HasValue &&
            p.EndDate.Value < today &&
            p.Status != ProjectStatus.Completed).Count();

        var stats = new DashboardStatsDto
        {
            // Projects
            TotalProjects     = projects.Count,
            ActiveProjects    = projects.Count(p => p.Status == ProjectStatus.Active),
            CompletedProjects = projects.Count(p => p.Status == ProjectStatus.Completed),
            DelayedProjects   = delayedProjects,
            // Tasks
            TotalTasks        = tasks.Count,
            PendingTasks      = tasks.Count(t =>
                t.Status == PolyTrackAPI.Infrastructure.Models.TaskStatus.New ||
                t.Status == PolyTrackAPI.Infrastructure.Models.TaskStatus.Assigned),
            InProgressTasks   = tasks.Count(t =>
                t.Status == PolyTrackAPI.Infrastructure.Models.TaskStatus.InProgress),
            ReviewTasks       = tasks.Count(t =>
                t.Status == PolyTrackAPI.Infrastructure.Models.TaskStatus.Review),
            CompletedTasks    = tasks.Count(t =>
                t.Status == PolyTrackAPI.Infrastructure.Models.TaskStatus.Done),
            OverdueTasks      = tasks.Count(t =>
                t.DueDate.HasValue &&
                t.DueDate.Value < today &&
                t.Status != PolyTrackAPI.Infrastructure.Models.TaskStatus.Done),
            // Assets
            TotalAssets         = assets.Count,
            ApprovedAssets      = assets.Count(a => a.Status == AssetStatus.Approved),
            DraftAssets         = assets.Count(a => a.Status == AssetStatus.Draft),
            PendingReviewAssets = assets.Count(a =>
                a.Status == AssetStatus.Submitted ||
                a.Status == AssetStatus.Review),
            // Users (admin/pm only)
            TotalUsers  = CurrentUserRole == "admin"
                            ? await _db.Users.CountAsync()
                            : 0,
            ActiveUsers = CurrentUserRole == "admin"
                            ? await _db.Users.CountAsync(u => u.IsActive == true)
                            : 0,
        };

        // Time stats
        if (CurrentUserRole is "admin" or "project_manager")
        {
            stats.TotalHoursThisWeek = (double)(await _db.TimeEntries
                .Where(e => e.Date >= weekStart)
                .SumAsync(e => (decimal?)e.Hours) ?? 0);

            stats.TotalHoursThisMonth = (double)(await _db.TimeEntries
                .Where(e => e.Date >= monthStart)
                .SumAsync(e => (decimal?)e.Hours) ?? 0);
        }
        else
        {
            stats.TotalHoursThisWeek = (double)(await _db.TimeEntries
                .Where(e => e.UserId == CurrentUserId && e.Date >= weekStart)
                .SumAsync(e => (decimal?)e.Hours) ?? 0);

            stats.TotalHoursThisMonth = (double)(await _db.TimeEntries
                .Where(e => e.UserId == CurrentUserId && e.Date >= monthStart)
                .SumAsync(e => (decimal?)e.Hours) ?? 0);
        }

        return Ok(stats);
    }

    // ── GET /api/dashboard/activity?limit=20
    [HttpGet("activity")]
    public async Task<IActionResult> GetActivity(
        [FromQuery] Guid? projectId,
        [FromQuery] int limit = 20)
    {
        var query = _db.ActivityFeeds
            .Include(a => a.Actor)
            .Include(a => a.Project)
            .AsQueryable();

        if (projectId.HasValue)
            query = query.Where(a => a.ProjectId == projectId.Value);

        if (CurrentUserRole == "artist")
        {
            var myProjectIds = await _db.ProjectMembers
                .Where(m => m.UserId == CurrentUserId)
                .Select(m => m.ProjectId)
                .ToListAsync();
            query = query.Where(a => a.ProjectId != null &&
                                     myProjectIds.Contains(a.ProjectId!.Value));
        }

        var items = await query
            .OrderByDescending(a => a.CreatedAt)
            .Take(limit)
            .Select(a => new ActivityFeedItemDto
            {
                Id          = a.Id,
                Action      = a.Action,
                Description = a.Description ?? string.Empty,
                EntityType  = a.EntityType.ToString(),
                EntityId    = a.EntityId,
                ProjectId   = a.ProjectId,
                ProjectName = a.Project != null ? a.Project.Name : null,
                ActorName   = a.Actor != null ? a.Actor.Name : null,
                ActorAvatar = a.Actor != null ? a.Actor.AvatarUrl : null,
                CreatedAt   = a.CreatedAt
            })
            .ToListAsync();

        return Ok(items);
    }

    // ── GET /api/dashboard/projects-progress
    [HttpGet("projects-progress")]
    public async Task<IActionResult> GetProjectsProgress()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var query = _db.Projects
            .Include(p => p.ProjectManager)
            .Include(p => p.Tasks)
            .Where(p => p.Status == ProjectStatus.Active ||
                        p.Status == ProjectStatus.Planning ||
                        p.Status == ProjectStatus.Review);

        if (CurrentUserRole == "artist")
        {
            var myProjectIds = await _db.ProjectMembers
                .Where(m => m.UserId == CurrentUserId)
                .Select(m => m.ProjectId)
                .ToListAsync();
            query = query.Where(p => myProjectIds.Contains(p.Id));
        }

        var projects = await query
            .OrderBy(p => p.EndDate)
            .Take(10)
            .ToListAsync();

        var result = projects.Select(p => new ProjectProgressDto
        {
            Id                 = p.Id,
            Name               = p.Name,
            ProjectCode        = p.ProjectCode,
            Status             = p.Status.ToString(),
            Priority           = p.Priority.ToString(),
            CompletionPercent  = p.CompletionPercent,
            EndDate            = p.EndDate.HasValue
                                     ? p.EndDate.Value.ToDateTime(TimeOnly.MinValue)
                                     : null,
            IsOverdue          = p.EndDate.HasValue &&
                                 p.EndDate.Value < today &&
                                 p.Status != ProjectStatus.Completed,
            TotalTasks         = p.Tasks.Count,
            CompletedTasks     = p.Tasks.Count(t =>
                t.Status == PolyTrackAPI.Infrastructure.Models.TaskStatus.Done),
            ProjectManagerName = p.ProjectManager?.Name
        }).ToList();

        return Ok(result);
    }

    // ── GET /api/dashboard/upcoming-deadlines?days=7
    [HttpGet("upcoming-deadlines")]
    public async Task<IActionResult> GetUpcomingDeadlines([FromQuery] int days = 7)
    {
        var today   = DateOnly.FromDateTime(DateTime.UtcNow);
        var cutoff  = today.AddDays(days);

        // Upcoming tasks
        var taskQuery = _db.Tasks
            .Include(t => t.Project)
            .Include(t => t.AssignedToNavigation)
            .Where(t =>
                t.DueDate.HasValue &&
                t.DueDate.Value >= today &&
                t.DueDate.Value <= cutoff &&
                t.Status != PolyTrackAPI.Infrastructure.Models.TaskStatus.Done);

        if (CurrentUserRole == "artist")
            taskQuery = taskQuery.Where(t => t.AssignedTo == CurrentUserId);

        var tasks = await taskQuery.OrderBy(t => t.DueDate).Take(10).ToListAsync();

        // Upcoming milestones
        var milestoneQuery = _db.Milestones
            .Include(m => m.Project)
            .Where(m =>
                m.EndDate.HasValue &&
                m.EndDate.Value >= today &&
                m.EndDate.Value <= cutoff &&
                m.Status != MilestoneStatus.Completed);

        var milestones = await milestoneQuery
            .OrderBy(m => m.EndDate)
            .Take(10)
            .ToListAsync();

        var result = new List<UpcomingDeadlineDto>();

        result.AddRange(tasks.Select(t => new UpcomingDeadlineDto
        {
            Id            = t.Id,
            Title         = t.Title,
            Type          = "task",
            DueDate       = t.DueDate!.Value.ToDateTime(TimeOnly.MinValue),
            DaysRemaining = t.DueDate.Value.DayNumber - today.DayNumber,
            ProjectName   = t.Project.Name,
            AssigneeName  = t.AssignedToNavigation?.Name
        }));

        result.AddRange(milestones.Select(m => new UpcomingDeadlineDto
        {
            Id            = m.Id,
            Title         = m.Name,
            Type          = "milestone",
            DueDate       = m.EndDate!.Value.ToDateTime(TimeOnly.MinValue),
            DaysRemaining = m.EndDate.Value.DayNumber - today.DayNumber,
            ProjectName   = m.Project.Name
        }));

        return Ok(result.OrderBy(d => d.DueDate).Take(10).ToList());
    }

    // ── GET /api/dashboard/recent-assets?limit=8
    [HttpGet("recent-assets")]
    public async Task<IActionResult> GetRecentAssets([FromQuery] int limit = 8)
    {
        var query = _db.Assets
            .Include(a => a.Project)
            .Include(a => a.CreatedByNavigation)
            .Where(a => a.Status != AssetStatus.Archived)
            .AsQueryable();

        if (CurrentUserRole == "artist")
        {
            var myProjectIds = await _db.ProjectMembers
                .Where(m => m.UserId == CurrentUserId)
                .Select(m => m.ProjectId)
                .ToListAsync();
            query = query.Where(a => myProjectIds.Contains(a.ProjectId));
        }

        var assets = await query
            .OrderByDescending(a => a.UpdatedAt)
            .Take(limit)
            .Select(a => new RecentAssetDto
            {
                Id           = a.Id,
                Name         = a.Name,
                Category     = a.Category.ToString(),
                Status       = a.Status.ToString(),
                ThumbnailUrl = a.ThumbnailUrl,
                ProjectName  = a.Project.Name,
                UploaderName = a.CreatedByNavigation != null
                                   ? a.CreatedByNavigation.Name
                                   : null,
                UpdatedAt    = a.UpdatedAt
            })
            .ToListAsync();

        return Ok(assets);
    }

    // ── GET /api/dashboard/timesheets?userId=&week=
    // Kitsu-style timesheet grid
    [HttpGet("timesheets")]
    public async Task<IActionResult> GetTimesheets(
        [FromQuery] Guid? userId,
        [FromQuery] DateOnly? week)
    {
        var targetUser  = userId ?? CurrentUserId;
        var weekStart   = week ?? DateOnly.FromDateTime(
            DateTime.UtcNow.AddDays(-(int)DateTime.UtcNow.DayOfWeek));
        var weekEnd     = weekStart.AddDays(6);

        // Non-admin can only see own timesheets
        if (targetUser != CurrentUserId &&
            CurrentUserRole != "admin" &&
            CurrentUserRole != "project_manager")
            return Forbid();

        var entries = await _db.TimeEntries
            .Include(e => e.Task)
                .ThenInclude(t => t.Project)
            .Where(e => e.UserId == targetUser &&
                        e.Date >= weekStart &&
                        e.Date <= weekEnd)
            .OrderBy(e => e.Date)
            .ToListAsync();

        var grouped = entries
            .GroupBy(e => new { e.TaskId, e.Task.Title, ProjectName = e.Task.Project.Name })
            .Select(g => new
            {
                TaskId      = g.Key.TaskId,
                TaskTitle   = g.Key.Title,
                ProjectName = g.Key.ProjectName,
                Days        = Enumerable.Range(0, 7).Select(d =>
                {
                    var date  = weekStart.AddDays(d);
                    var entry = g.FirstOrDefault(e => e.Date == date);
                    return new
                    {
                        Date    = date,
                        Hours   = entry?.Hours ?? 0,
                        EntryId = entry?.Id
                    };
                }).ToList(),
                TotalHours = g.Sum(e => e.Hours)
            })
            .ToList();

        var dailyTotals = Enumerable.Range(0, 7).Select(d =>
        {
            var date = weekStart.AddDays(d);
            return new
            {
                Date  = date,
                Total = entries.Where(e => e.Date == date).Sum(e => e.Hours)
            };
        }).ToList();

        return Ok(new
        {
            weekStart,
            weekEnd,
            totalHours  = entries.Sum(e => e.Hours),
            dailyTotals,
            tasks       = grouped
        });
    }
}
