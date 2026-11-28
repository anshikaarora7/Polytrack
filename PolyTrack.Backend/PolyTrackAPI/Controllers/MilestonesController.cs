using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PolyTrackAPI.Core.Constants;
using PolyTrackAPI.Infrastructure.Data;
using PolyTrackAPI.Infrastructure.Models;
using System.Security.Claims;
using TaskStatus = PolyTrackAPI.Infrastructure.Models.TaskStatus;
using MilestoneStatus = PolyTrackAPI.Infrastructure.Models.MilestoneStatus;
using ActivityEntity = PolyTrackAPI.Infrastructure.Models.ActivityEntity;

namespace PolyTrackAPI.Controllers;

// ── DTOs ──────────────────────────────────────────────────────

public class CreateMilestoneDto
{
    public Guid ProjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public short SortOrder { get; set; } = 0;
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}

public class UpdateMilestoneDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Status { get; set; }
    public short? SortOrder { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}

public class ClientReviewDto
{
    public bool Approved { get; set; }
    public string? Notes { get; set; }
}

public class MilestoneResponseDto
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = string.Empty;
    public short SortOrder { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool? ClientApproved { get; set; }
    public DateTime? ClientApprovedAt { get; set; }
    public string? ClientNotes { get; set; }
    public bool IsOverdue { get; set; }
    public int TotalTasks { get; set; }
    public int CompletedTasks { get; set; }
    public int CompletionPercent { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class MilestoneListItemDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public short SortOrder { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool? ClientApproved { get; set; }
    public bool IsOverdue { get; set; }
    public int TotalTasks { get; set; }
    public int CompletedTasks { get; set; }
    public int CompletionPercent { get; set; }
}

// ── Controller ────────────────────────────────────────────────

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MilestonesController : ControllerBase
{
    private readonly StudioDbContext _db;

    public MilestonesController(StudioDbContext db)
    {
        _db = db;
    }

    private Guid CurrentUserId =>
        Guid.TryParse(User.FindFirstValue("userId"), out var id) ? id : Guid.Empty;

    private string CurrentUserRole =>
        User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

    // helper — map to list item with task stats
    private static MilestoneListItemDto ToListItem(Milestone m, List<PolyTrackAPI.Infrastructure.Models.Task> tasks)
    {
        var total     = tasks.Count;
        var completed = tasks.Count(t => t.Status == TaskStatus.Done);
        var percent   = total > 0 ? (int)Math.Round((double)completed / total * 100) : 0;
        return new MilestoneListItemDto
        {
            Id                = m.Id,
            Name              = m.Name,
            Status            = m.Status.ToString(),
            SortOrder         = m.SortOrder,
            StartDate         = m.StartDate.HasValue
                                    ? m.StartDate.Value.ToDateTime(TimeOnly.MinValue)
                                    : null,
            EndDate           = m.EndDate.HasValue
                                    ? m.EndDate.Value.ToDateTime(TimeOnly.MinValue)
                                    : null,
            ClientApproved    = m.ClientApproved,
            IsOverdue         = m.EndDate.HasValue &&
                                m.EndDate.Value < DateOnly.FromDateTime(DateTime.UtcNow) &&
                                m.Status != MilestoneStatus.Completed,
            TotalTasks        = total,
            CompletedTasks    = completed,
            CompletionPercent = percent
        };
    }

    // ── GET /api/milestones?projectId=
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid projectId)
    {
        if (projectId == Guid.Empty)
            return BadRequest(new { message = "projectId is required" });

        var milestones = await _db.Milestones
            .Where(m => m.ProjectId == projectId)
            .OrderBy(m => m.SortOrder)
            .ThenBy(m => m.StartDate)
            .ToListAsync();

        var allTasks = await _db.Tasks
            .Where(t => t.ProjectId == projectId && t.MilestoneId != null)
            .ToListAsync();

        var result = milestones.Select(m =>
            ToListItem(m, allTasks.Where(t => t.MilestoneId == m.Id).ToList()))
            .ToList();

        return Ok(result);
    }

    // ── GET /api/milestones/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var milestone = await _db.Milestones
            .Include(m => m.Project)
            .Include(m => m.Tasks)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (milestone == null)
            return NotFound(new { message = "Milestone not found" });

        var tasks     = milestone.Tasks.ToList();
        var total     = tasks.Count;
        var completed = tasks.Count(t => t.Status == TaskStatus.Done);
        var percent   = total > 0 ? (int)Math.Round((double)completed / total * 100) : 0;

        var response = new MilestoneResponseDto
        {
            Id                = milestone.Id,
            ProjectId         = milestone.ProjectId,
            ProjectName       = milestone.Project.Name,
            Name              = milestone.Name,
            Description       = milestone.Description,
            Status            = milestone.Status.ToString(),
            SortOrder         = milestone.SortOrder,
            StartDate         = milestone.StartDate.HasValue
                                    ? milestone.StartDate.Value.ToDateTime(TimeOnly.MinValue)
                                    : null,
            EndDate           = milestone.EndDate.HasValue
                                    ? milestone.EndDate.Value.ToDateTime(TimeOnly.MinValue)
                                    : null,
            ClientApproved    = milestone.ClientApproved,
            ClientApprovedAt  = milestone.ClientApprovedAt,
            ClientNotes       = milestone.ClientNotes,
            IsOverdue         = milestone.EndDate.HasValue &&
                                milestone.EndDate.Value < DateOnly.FromDateTime(DateTime.UtcNow) &&
                                milestone.Status != MilestoneStatus.Completed,
            TotalTasks        = total,
            CompletedTasks    = completed,
            CompletionPercent = percent,
            CreatedAt         = milestone.CreatedAt,
            UpdatedAt         = milestone.UpdatedAt
        };

        return Ok(response);
    }

    // ── POST /api/milestones
    [HttpPost]
    [Authorize(Roles = Roles.LeadsAndAbove)]
    public async Task<IActionResult> Create([FromBody] CreateMilestoneDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Name is required" });

        var project = await _db.Projects.FindAsync(dto.ProjectId);
        if (project == null)
            return NotFound(new { message = "Project not found" });

        var milestone = new Milestone
        {
            Id          = Guid.NewGuid(),
            ProjectId   = dto.ProjectId,
            Name        = dto.Name,
            Description = dto.Description,
            SortOrder   = dto.SortOrder,
            Status      = MilestoneStatus.Pending,
            CreatedAt   = DateTime.UtcNow,
            UpdatedAt   = DateTime.UtcNow
        };

        if (dto.StartDate.HasValue)
            milestone.StartDate = DateOnly.FromDateTime(dto.StartDate.Value);
        if (dto.EndDate.HasValue)
            milestone.EndDate = DateOnly.FromDateTime(dto.EndDate.Value);

        _db.Milestones.Add(milestone);

        _db.ActivityFeeds.Add(new ActivityFeed
        {
            Id          = Guid.NewGuid(),
            ProjectId   = dto.ProjectId,
            ActorId     = CurrentUserId,
            EntityType  = ActivityEntity.Milestone,
            EntityId    = milestone.Id,
            Action      = "created",
            Description = $"Milestone \"{milestone.Name}\" was created",
            CreatedAt   = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById),
            new { id = milestone.Id },
            new { id = milestone.Id, message = "Milestone created successfully" });
    }

    // ── PUT /api/milestones/{id}
    [HttpPut("{id:guid}")]
    [Authorize(Roles = Roles.LeadsAndAbove)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateMilestoneDto dto)
    {
        var milestone = await _db.Milestones.FindAsync(id);
        if (milestone == null)
            return NotFound(new { message = "Milestone not found" });

        var oldStatus = milestone.Status.ToString();

        if (dto.Name != null) milestone.Name = dto.Name;
        if (dto.Description != null) milestone.Description = dto.Description;
        if (dto.SortOrder.HasValue) milestone.SortOrder = dto.SortOrder.Value;
        if (dto.StartDate.HasValue)
            milestone.StartDate = DateOnly.FromDateTime(dto.StartDate.Value);
        if (dto.EndDate.HasValue)
            milestone.EndDate = DateOnly.FromDateTime(dto.EndDate.Value);

        if (!string.IsNullOrEmpty(dto.Status) &&
            Enum.TryParse<MilestoneStatus>(dto.Status, true, out var status))
        {
            milestone.Status = status;

            // Auto-complete all tasks when milestone is completed
            if (status == MilestoneStatus.Completed)
            {
                var pendingTasks = await _db.Tasks
                    .Where(t => t.MilestoneId == id && t.Status != TaskStatus.Done)
                    .ToListAsync();

                foreach (var task in pendingTasks)
                {
                    task.Status      = TaskStatus.Done;
                    task.CompletedAt = DateTime.UtcNow;
                    task.UpdatedAt   = DateTime.UtcNow;
                }
            }
        }

        milestone.UpdatedAt = DateTime.UtcNow;

        if (dto.Status != null && dto.Status != oldStatus)
        {
            _db.ActivityFeeds.Add(new ActivityFeed
            {
                Id          = Guid.NewGuid(),
                ProjectId   = milestone.ProjectId,
                ActorId     = CurrentUserId,
                EntityType  = ActivityEntity.Milestone,
                EntityId    = milestone.Id,
                Action      = "status_changed",
                Description = $"Milestone \"{milestone.Name}\" changed from {oldStatus} to {dto.Status}",
                CreatedAt   = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = "Milestone updated successfully" });
    }

    // ── DELETE /api/milestones/{id}
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = Roles.LeadsAndAbove)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var milestone = await _db.Milestones
            .Include(m => m.Tasks)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (milestone == null)
            return NotFound(new { message = "Milestone not found" });

        // Unlink tasks from milestone before deleting
        foreach (var task in milestone.Tasks)
        {
            task.MilestoneId = null;
            task.UpdatedAt   = DateTime.UtcNow;
        }

        _db.Milestones.Remove(milestone);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Milestone deleted. Tasks have been unlinked." });
    }

    // ── POST /api/milestones/{id}/reorder
    // Reorder milestones by passing new sort order values
    [HttpPost("reorder")]
    [Authorize(Roles = Roles.LeadsAndAbove)]
    public async Task<IActionResult> Reorder([FromBody] List<MilestoneReorderDto> items)
    {
        foreach (var item in items)
        {
            var milestone = await _db.Milestones.FindAsync(item.Id);
            if (milestone != null)
            {
                milestone.SortOrder = item.SortOrder;
                milestone.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = "Milestones reordered successfully" });
    }

    // ── POST /api/milestones/{id}/client-review
    // Client approves or rejects a milestone
    [HttpPost("{id:guid}/client-review")]
    [Authorize(Roles = "client,admin")]
    public async Task<IActionResult> ClientReview(Guid id, [FromBody] ClientReviewDto dto)
    {
        var milestone = await _db.Milestones
            .Include(m => m.Project)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (milestone == null)
            return NotFound(new { message = "Milestone not found" });

        // Verify client owns this project
        if (CurrentUserRole == "client")
        {
            var client = await _db.Clients
                .FirstOrDefaultAsync(c => c.UserId == CurrentUserId);

            if (client == null || milestone.Project.ClientId != client.Id)
                return Forbid();
        }

        milestone.ClientApproved   = dto.Approved;
        milestone.ClientApprovedAt = DateTime.UtcNow;
        milestone.ClientNotes      = dto.Notes;
        milestone.UpdatedAt        = DateTime.UtcNow;

        // Update milestone status based on client decision
        if (dto.Approved)
            milestone.Status = MilestoneStatus.Completed;
        else
            milestone.Status = MilestoneStatus.Rejected;

        var action = dto.Approved ? "approved" : "rejected";

        _db.ActivityFeeds.Add(new ActivityFeed
        {
            Id          = Guid.NewGuid(),
            ProjectId   = milestone.ProjectId,
            ActorId     = CurrentUserId,
            EntityType  = ActivityEntity.Milestone,
            EntityId    = milestone.Id,
            Action      = $"client_{action}",
            Description = $"Client {action} milestone \"{milestone.Name}\"",
            CreatedAt   = DateTime.UtcNow
        });

        // Notify project manager
        if (milestone.Project.ProjectManagerId.HasValue)
        {
            _db.Notifications.Add(new Notification
            {
                Id          = Guid.NewGuid(),
                RecipientId = milestone.Project.ProjectManagerId.Value,
                SenderId    = CurrentUserId,
                Type        = dto.Approved
                                  ? NotificationType.MilestoneApproved
                                  : NotificationType.MilestoneRejected,
                Title       = $"Milestone {action} by client",
                Body        = $"\"{milestone.Name}\" was {action} by the client. {dto.Notes}",
                EntityType  = ActivityEntity.Milestone,
                EntityId    = milestone.Id,
                IsRead      = false,
                CreatedAt   = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = $"Milestone {action} successfully" });
    }

    // ── GET /api/milestones/{id}/tasks
    // Get all tasks under a milestone
    [HttpGet("{id:guid}/tasks")]
    public async Task<IActionResult> GetTasks(Guid id)
    {
        var milestone = await _db.Milestones.FindAsync(id);
        if (milestone == null)
            return NotFound(new { message = "Milestone not found" });

        var tasks = await _db.Tasks
            .Include(t => t.AssignedToNavigation)
            .Where(t => t.MilestoneId == id)
            .OrderBy(t => t.DueDate)
            .Select(t => new TaskListItemDto
            {
                Id            = t.Id,
                Title         = t.Title,
                Status        = t.Status.ToString(),
                Priority      = t.Priority.ToString(),
                StoryPoints   = t.StoryPoints,
                DueDate       = t.DueDate.HasValue
                                    ? t.DueDate.Value.ToDateTime(TimeOnly.MinValue)
                                    : null,
                IsOverdue     = t.DueDate.HasValue &&
                                t.DueDate.Value < DateOnly.FromDateTime(DateTime.UtcNow) &&
                                t.Status != TaskStatus.Done,
                MilestoneName = milestone.Name,
                AssignedTo    = t.AssignedToNavigation == null ? null : new TaskUserDto
                {
                    Id        = t.AssignedToNavigation.Id,
                    Name      = t.AssignedToNavigation.Name,
                    Email     = t.AssignedToNavigation.Email,
                    AvatarUrl = t.AssignedToNavigation.AvatarUrl
                },
                CreatedAt = t.CreatedAt
            })
            .ToListAsync();

        return Ok(tasks);
    }
}

public class MilestoneReorderDto
{
    public Guid Id { get; set; }
    public short SortOrder { get; set; }
}
