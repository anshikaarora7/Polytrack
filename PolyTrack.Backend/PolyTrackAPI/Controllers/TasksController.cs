using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PolyTrackAPI.Core.Constants;
using PolyTrackAPI.Core.Interfaces;
using PolyTrackAPI.Hubs;
using PolyTrackAPI.Infrastructure.Data;
using PolyTrackAPI.Infrastructure.Models;
using System.Security.Claims;
using TaskStatus = PolyTrackAPI.Infrastructure.Models.TaskStatus;
using PriorityLevel = PolyTrackAPI.Infrastructure.Models.PriorityLevel;


namespace PolyTrackAPI.Controllers;

// ── DTOs ─────────────────────────────────────────────────────

public class CreateTaskDto
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid ProjectId { get; set; }
    public Guid? MilestoneId { get; set; }
    public Guid? AssignedTo { get; set; }
    public string Priority { get; set; } = "normal";
    public short? StoryPoints { get; set; }
    public decimal? EstimatedHours { get; set; }
    public DateTime? DueDate { get; set; }
}

public class UpdateTaskDto
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public Guid? MilestoneId { get; set; }
    public Guid? AssignedTo { get; set; }
    public string? Priority { get; set; }
    public string? Status { get; set; }
    public short? StoryPoints { get; set; }
    public decimal? EstimatedHours { get; set; }
    public DateTime? DueDate { get; set; }
}

public class TaskResponseDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid ProjectId { get; set; }
    public string? ProjectName { get; set; }
    public Guid? MilestoneId { get; set; }
    public string? MilestoneName { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public short? StoryPoints { get; set; }
    public decimal? EstimatedHours { get; set; }
    public double? LoggedHours { get; set; }
    public DateTime? DueDate { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public TaskUserDto? AssignedTo { get; set; }
    public TaskUserDto? CreatedBy { get; set; }
    public int CommentCount { get; set; }
    public int AttachmentCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class TaskListItemDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public short? StoryPoints { get; set; }
    public DateTime? DueDate { get; set; }
    public bool IsOverdue { get; set; }
    public string? MilestoneName { get; set; }
    public TaskUserDto? AssignedTo { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class TaskUserDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
}

public class AddTaskCommentDto
{
    public string Body { get; set; } = string.Empty;
    public Guid? ParentCommentId { get; set; }
    public string? StatusChangeTo { get; set; }
}

public class TaskCommentResponseDto
{
    public Guid Id { get; set; }
    public string Body { get; set; } = string.Empty;
    public Guid? ParentCommentId { get; set; }
    public string? StatusChangeTo { get; set; }
    public TaskUserDto Author { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class KanbanBoardDto
{
    public List<TaskListItemDto> New { get; set; } = new();
    public List<TaskListItemDto> InProgress { get; set; } = new();
    public List<TaskListItemDto> Review { get; set; } = new();
    public List<TaskListItemDto> Done { get; set; } = new();
}

public class MoveTaskDto
{
    public string Status { get; set; } = string.Empty;
}

public class LogTimeDto
{
    public DateOnly Date { get; set; }
    public decimal Hours { get; set; }
    public string? Notes { get; set; }
}

public class TimeEntryResponseDto
{
    public Guid Id { get; set; }
    public DateOnly Date { get; set; }
    public decimal Hours { get; set; }
    public string? Notes { get; set; }
    public TaskUserDto User { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}

// ── Controller ────────────────────────────────────────────────

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TasksController : ControllerBase
{
    private readonly StudioDbContext _db;
    private readonly IFileStorageService _fileStorage;
    private readonly IHubContext<StudioHub, IStudioClient> _hubContext;

    public TasksController(
        StudioDbContext db,
        IFileStorageService fileStorage,
        IHubContext<StudioHub, IStudioClient> hubContext)
    {
        _db = db;
        _fileStorage = fileStorage;
        _hubContext = hubContext;
    }

    private Guid CurrentUserId =>
        Guid.TryParse(User.FindFirstValue("userId"), out var id) ? id : Guid.Empty;

    private string CurrentUserRole =>
        User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

    // ── GET /api/tasks?projectId=&milestoneId=&status=&assignedTo=
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? projectId,
        [FromQuery] Guid? milestoneId,
        [FromQuery] string? status,
        [FromQuery] string? priority,
        [FromQuery] Guid? assignedTo,
        [FromQuery] bool? overdue,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var query = _db.Tasks
            .Include(t => t.AssignedToNavigation)
            .Include(t => t.Milestone)
            .Include(t => t.Project)
            .Include(t => t.TaskComments)
            .Include(t => t.TaskAttachments)
            .AsQueryable();

        // Artists only see tasks assigned to them
        if (CurrentUserRole == "artist")
            query = query.Where(t => t.AssignedTo == CurrentUserId);

        if (projectId.HasValue)
            query = query.Where(t => t.ProjectId == projectId.Value);

        if (milestoneId.HasValue)
            query = query.Where(t => t.MilestoneId == milestoneId.Value);

        if (!string.IsNullOrEmpty(status) &&
            Enum.TryParse<PolyTrackAPI.Infrastructure.Models.TaskStatus>(status, true, out var taskStatus))
            query = query.Where(t => t.Status == taskStatus);

        if (!string.IsNullOrEmpty(priority) &&
            Enum.TryParse<PolyTrackAPI.Infrastructure.Models.PriorityLevel>(priority, true, out var priorityLevel))
            query = query.Where(t => t.Priority == priorityLevel);

        if (assignedTo.HasValue)
            query = query.Where(t => t.AssignedTo == assignedTo.Value);

        if (overdue == true)
            query = query.Where(t =>
                t.DueDate.HasValue &&
                t.DueDate.Value < DateOnly.FromDateTime(DateTime.UtcNow) &&
                t.Status != PolyTrackAPI.Infrastructure.Models.TaskStatus.Done);

        var total = await query.CountAsync();

        var tasks = await query
            .OrderBy(t => t.DueDate)
            .ThenByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
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
                                t.Status != PolyTrackAPI.Infrastructure.Models.TaskStatus.Done,
                MilestoneName = t.Milestone != null ? t.Milestone.Name : null,
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

        return Ok(new { data = tasks, total, page, pageSize });
    }

    // ── GET /api/tasks/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var task = await _db.Tasks
            .Include(t => t.AssignedToNavigation)
            .Include(t => t.CreatedByNavigation)
            .Include(t => t.Milestone)
            .Include(t => t.Project)
            .Include(t => t.TaskComments)
            .Include(t => t.TaskAttachments)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (task == null)
            return NotFound(new { message = "Task not found" });

        // Artists can only see their own tasks
        if (CurrentUserRole == "artist" && task.AssignedTo != CurrentUserId)
            return Forbid();

        var loggedHours = await _db.TimeEntries
            .Where(e => e.TaskId == id)
            .SumAsync(e => (double?)e.Hours) ?? 0;

        var response = new TaskResponseDto
        {
            Id              = task.Id,
            Title           = task.Title,
            Description     = task.Description,
            ProjectId       = task.ProjectId,
            ProjectName     = task.Project.Name,
            MilestoneId     = task.MilestoneId,
            MilestoneName   = task.Milestone?.Name,
            Status          = task.Status.ToString(),
            Priority        = task.Priority.ToString(),
            StoryPoints     = task.StoryPoints,
            EstimatedHours  = task.EstimatedHours,
            LoggedHours     = loggedHours,
            DueDate         = task.DueDate.HasValue
                                  ? task.DueDate.Value.ToDateTime(TimeOnly.MinValue)
                                  : null,
            StartedAt       = task.StartedAt,
            CompletedAt     = task.CompletedAt,
            CommentCount    = task.TaskComments.Count,
            AttachmentCount = task.TaskAttachments.Count,
            CreatedAt       = task.CreatedAt,
            UpdatedAt       = task.UpdatedAt,
            AssignedTo = task.AssignedToNavigation == null ? null : new TaskUserDto
            {
                Id        = task.AssignedToNavigation.Id,
                Name      = task.AssignedToNavigation.Name,
                Email     = task.AssignedToNavigation.Email,
                AvatarUrl = task.AssignedToNavigation.AvatarUrl
            },
            CreatedBy = task.CreatedByNavigation == null ? null : new TaskUserDto
            {
                Id        = task.CreatedByNavigation.Id,
                Name      = task.CreatedByNavigation.Name,
                Email     = task.CreatedByNavigation.Email,
                AvatarUrl = task.CreatedByNavigation.AvatarUrl
            }
        };

        return Ok(response);
    }

    // ── GET /api/tasks/kanban?projectId=
    [HttpGet("kanban")]
    public async Task<IActionResult> GetKanban([FromQuery] Guid projectId)
    {
        var query = _db.Tasks
            .Include(t => t.AssignedToNavigation)
            .Include(t => t.Milestone)
            .Where(t => t.ProjectId == projectId);

        // Artists only see tasks assigned to them
        if (CurrentUserRole == "artist")
            query = query.Where(t => t.AssignedTo == CurrentUserId);

        var tasks = await query
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
                                t.Status != PolyTrackAPI.Infrastructure.Models.TaskStatus.Done,
                MilestoneName = t.Milestone != null ? t.Milestone.Name : null,
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

        // Group into Kanban columns
        var board = new KanbanBoardDto
        {
            New        = tasks.Where(t => t.Status is "New" or "Assigned").ToList(),
            InProgress = tasks.Where(t => t.Status is "InProgress").ToList(),
            Review     = tasks.Where(t => t.Status is "Review" or "Approved" or "Rejected").ToList(),
            Done       = tasks.Where(t => t.Status is "Done").ToList()
        };

        return Ok(board);
    }

    // ── POST /api/tasks
    [HttpPost]
    [Authorize(Roles = Roles.LeadsAndAbove)]
    public async Task<IActionResult> Create([FromBody] CreateTaskDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { message = "Title is required" });

        // Verify project exists
        var project = await _db.Projects.FindAsync(dto.ProjectId);
        if (project == null)
            return NotFound(new { message = "Project not found" });

        var task = new Infrastructure.Models.Task
        {
            Id        = Guid.NewGuid(),
            Title     = dto.Title,
            Description     = dto.Description,
            ProjectId       = dto.ProjectId,
            MilestoneId     = dto.MilestoneId,
            AssignedTo      = dto.AssignedTo,
            Status          = dto.AssignedTo.HasValue ? PolyTrackAPI.Infrastructure.Models.TaskStatus.Assigned : PolyTrackAPI.Infrastructure.Models.TaskStatus.New,
            StoryPoints     = dto.StoryPoints,
            EstimatedHours  = dto.EstimatedHours,
            CreatedBy       = CurrentUserId,
            CreatedAt       = DateTime.UtcNow,
            UpdatedAt       = DateTime.UtcNow
        };

        if (Enum.TryParse<PolyTrackAPI.Infrastructure.Models.PriorityLevel>(dto.Priority, true, out var priority))
            task.Priority = priority;
        else
            task.Priority = PriorityLevel.Normal;

        if (dto.DueDate.HasValue)
            task.DueDate = DateOnly.FromDateTime(dto.DueDate.Value);

        _db.Tasks.Add(task);

        // Activity feed
        _db.ActivityFeeds.Add(new ActivityFeed
        {
            Id          = Guid.NewGuid(),
            ProjectId   = dto.ProjectId,
            ActorId     = CurrentUserId,
            EntityType  = ActivityEntity.Task,
            EntityId    = task.Id,
            Action      = "created",
            Description = $"Task \"{task.Title}\" was created",
            CreatedAt   = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        // Notify assigned user
        if (task.AssignedTo.HasValue && task.AssignedTo.Value != CurrentUserId)
        {
            _db.Notifications.Add(new Notification
            {
                Id          = Guid.NewGuid(),
                RecipientId = task.AssignedTo.Value,
                SenderId    = CurrentUserId,
                Type        = NotificationType.TaskAssigned,
                Title       = "New task assigned to you",
                Body        = $"You have been assigned: {task.Title}",
                EntityType  = ActivityEntity.Task,
                EntityId    = task.Id,
                IsRead      = false,
                CreatedAt   = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();
        }

        try
        {
            await _hubContext.Clients.All.TaskCreated(new
            {
                taskId = task.Id,
                title = task.Title,
                projectId = task.ProjectId,
                status = task.Status.ToString(),
                priority = task.Priority.ToString(),
                assignedTo = task.AssignedTo,
                createdAt = task.CreatedAt
            });
        }
        catch { }

        return CreatedAtAction(nameof(GetById),
            new { id = task.Id },
            new { id = task.Id, message = "Task created successfully" });
    }

    // ── PUT /api/tasks/{id}
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTaskDto dto)
    {
        var task = await _db.Tasks.FindAsync(id);
        if (task == null)
            return NotFound(new { message = "Task not found" });

        // Artists can only update status of their own tasks
        if (CurrentUserRole == "artist")
        {
            if (task.AssignedTo != CurrentUserId)
                return Forbid();

            // Artists can only update status — nothing else
            if (!string.IsNullOrEmpty(dto.Status) &&
                Enum.TryParse<PolyTrackAPI.Infrastructure.Models.TaskStatus>(dto.Status, true, out var artistStatus))
            {
                task.Status    = artistStatus;
                task.UpdatedAt = DateTime.UtcNow;
                if (artistStatus == PolyTrackAPI.Infrastructure.Models.TaskStatus.InProgress && task.StartedAt == null)
                    task.StartedAt = DateTime.UtcNow;
                if (artistStatus == PolyTrackAPI.Infrastructure.Models.TaskStatus.Done)
                    task.CompletedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
                return Ok(new { message = "Task status updated" });
            }
            return Forbid();
        }

        // PM and admin can update everything
        var oldStatus = task.Status.ToString();

        if (dto.Title != null) task.Title = dto.Title;
        if (dto.Description != null) task.Description = dto.Description;
        if (dto.MilestoneId.HasValue) task.MilestoneId = dto.MilestoneId;
        if (dto.StoryPoints.HasValue) task.StoryPoints = dto.StoryPoints;
        if (dto.EstimatedHours.HasValue) task.EstimatedHours = dto.EstimatedHours;

        if (dto.AssignedTo.HasValue)
        {
            var prevAssignee = task.AssignedTo;
            task.AssignedTo = dto.AssignedTo;

            // Notify new assignee
            if (dto.AssignedTo.Value != prevAssignee && dto.AssignedTo.Value != CurrentUserId)
            {
                _db.Notifications.Add(new Notification
                {
                    Id          = Guid.NewGuid(),
                    RecipientId = dto.AssignedTo.Value,
                    SenderId    = CurrentUserId,
                    Type        = NotificationType.TaskAssigned,
                    Title       = "Task assigned to you",
                    Body        = $"You have been assigned: {task.Title}",
                    EntityType  = ActivityEntity.Task,
                    EntityId    = task.Id,
                    IsRead      = false,
                    CreatedAt   = DateTime.UtcNow
                });
            }
        }

        if (dto.DueDate.HasValue)
            task.DueDate = DateOnly.FromDateTime(dto.DueDate.Value);

        if (!string.IsNullOrEmpty(dto.Priority) &&
            Enum.TryParse<PolyTrackAPI.Infrastructure.Models.PriorityLevel>(dto.Priority, true, out var priority))
            task.Priority = priority;

        if (!string.IsNullOrEmpty(dto.Status) &&
            Enum.TryParse<PolyTrackAPI.Infrastructure.Models.TaskStatus>(dto.Status, true, out var status))
        {
            task.Status = status;
            if (status == PolyTrackAPI.Infrastructure.Models.TaskStatus.InProgress && task.StartedAt == null)
                task.StartedAt = DateTime.UtcNow;
            if (status == PolyTrackAPI.Infrastructure.Models.TaskStatus.Done)
                task.CompletedAt = DateTime.UtcNow;
        }

        task.UpdatedAt = DateTime.UtcNow;

        // Log status change to activity feed
        if (dto.Status != null && dto.Status != oldStatus)
        {
            _db.ActivityFeeds.Add(new ActivityFeed
            {
                Id          = Guid.NewGuid(),
                ProjectId   = task.ProjectId,
                ActorId     = CurrentUserId,
                EntityType  = ActivityEntity.Task,
                EntityId    = task.Id,
                Action      = "status_changed",
                Description = $"Task \"{task.Title}\" moved from {oldStatus} to {dto.Status}",
                CreatedAt   = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = "Task updated successfully" });
    }

    // ── PATCH /api/tasks/{id}/move  (Kanban drag & drop)
    [HttpPatch("{id:guid}/move")]
    public async Task<IActionResult> Move(Guid id, [FromBody] MoveTaskDto dto)
    {
        var task = await _db.Tasks.FindAsync(id);
        if (task == null)
            return NotFound(new { message = "Task not found" });

        if (!Enum.TryParse<PolyTrackAPI.Infrastructure.Models.TaskStatus>(dto.Status, true, out var newStatus))
            return BadRequest(new { message = $"Invalid status: {dto.Status}" });

        var oldStatus  = task.Status.ToString();
        task.Status    = newStatus;
        task.UpdatedAt = DateTime.UtcNow;

        if (newStatus == PolyTrackAPI.Infrastructure.Models.TaskStatus.InProgress && task.StartedAt == null)
            task.StartedAt = DateTime.UtcNow;
        if (newStatus == PolyTrackAPI.Infrastructure.Models.TaskStatus.Done)
            task.CompletedAt = DateTime.UtcNow;

        _db.ActivityFeeds.Add(new ActivityFeed
        {
            Id          = Guid.NewGuid(),
            ProjectId   = task.ProjectId,
            ActorId     = CurrentUserId,
            EntityType  = ActivityEntity.Task,
            EntityId    = task.Id,
            Action      = "moved",
            Description = $"Task \"{task.Title}\" moved from {oldStatus} to {dto.Status}",
            CreatedAt   = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        try
        {
            await _hubContext.Clients.All.TaskMoved(new
            {
                taskId = task.Id,
                title = task.Title,
                projectId = task.ProjectId,
                oldStatus = oldStatus,
                newStatus = task.Status.ToString(),
                updatedAt = task.UpdatedAt
            });
        }
        catch { }

        return Ok(new { message = "Task moved", status = dto.Status });
    }

    // ── DELETE /api/tasks/{id}
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = Roles.LeadsAndAbove)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var task = await _db.Tasks.FindAsync(id);
        if (task == null)
            return NotFound(new { message = "Task not found" });

        _db.Tasks.Remove(task);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Task deleted" });
    }

    // ── GET /api/tasks/{id}/comments
    [HttpGet("{id:guid}/comments")]
    public async Task<IActionResult> GetComments(Guid id)
    {
        var comments = await _db.TaskComments
            .Include(c => c.Author)
            .Where(c => c.TaskId == id)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new TaskCommentResponseDto
            {
                Id              = c.Id,
                Body            = c.Body,
                ParentCommentId = c.ParentCommentId,
                StatusChangeTo  = c.StatusChangeTo.HasValue
                                      ? c.StatusChangeTo.Value.ToString()
                                      : null,
                Author = new TaskUserDto
                {
                    Id        = c.Author.Id,
                    Name      = c.Author.Name,
                    Email     = c.Author.Email,
                    AvatarUrl = c.Author.AvatarUrl
                },
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt
            })
            .ToListAsync();

        return Ok(comments);
    }

    // ── POST /api/tasks/{id}/comments
    [HttpPost("{id:guid}/comments")]
    public async Task<IActionResult> AddComment(Guid id, [FromBody] AddTaskCommentDto dto)
    {
        var task = await _db.Tasks.FindAsync(id);
        if (task == null)
            return NotFound(new { message = "Task not found" });

        if (string.IsNullOrWhiteSpace(dto.Body))
            return BadRequest(new { message = "Comment body is required" });

        var comment = new TaskComment
        {
            Id              = Guid.NewGuid(),
            TaskId          = id,
            AuthorId        = CurrentUserId,
            Body            = dto.Body,
            ParentCommentId = dto.ParentCommentId,
            CreatedAt       = DateTime.UtcNow,
            UpdatedAt       = DateTime.UtcNow
        };

        // If comment includes a status change
        if (!string.IsNullOrEmpty(dto.StatusChangeTo) &&
            Enum.TryParse<PolyTrackAPI.Infrastructure.Models.TaskStatus>(dto.StatusChangeTo, true, out var newStatus))
        {
            comment.StatusChangeTo = newStatus;
            var oldStatus  = task.Status.ToString();
            task.Status    = newStatus;
            task.UpdatedAt = DateTime.UtcNow;

            _db.ActivityFeeds.Add(new ActivityFeed
            {
                Id          = Guid.NewGuid(),
                ProjectId   = task.ProjectId,
                ActorId     = CurrentUserId,
                EntityType  = ActivityEntity.Task,
                EntityId    = task.Id,
                Action      = "status_changed",
                Description = $"Task \"{task.Title}\" moved from {oldStatus} to {dto.StatusChangeTo} via comment",
                CreatedAt   = DateTime.UtcNow
            });
        }

        _db.TaskComments.Add(comment);

        // Notify task owner if commenter is someone else
        if (task.AssignedTo.HasValue && task.AssignedTo.Value != CurrentUserId)
        {
            _db.Notifications.Add(new Notification
            {
                Id          = Guid.NewGuid(),
                RecipientId = task.AssignedTo.Value,
                SenderId    = CurrentUserId,
                Type        = NotificationType.CommentAdded,
                Title       = "New comment on your task",
                Body        = $"Someone commented on: {task.Title}",
                EntityType  = ActivityEntity.Task,
                EntityId    = task.Id,
                IsRead      = false,
                CreatedAt   = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync();

        try
        {
            await _hubContext.Clients.All.CommentAdded(new
            {
                entityType = "Task",
                entityId = task.Id,
                projectId = task.ProjectId,
                commentId = comment.Id,
                body = comment.Body,
                authorId = CurrentUserId,
                statusChangeTo = comment.StatusChangeTo?.ToString(),
                createdAt = comment.CreatedAt
            });
        }
        catch { }

        return Ok(new { id = comment.Id, message = "Comment added" });
    }

    // ── GET /api/tasks/{id}/time
    [HttpGet("{id:guid}/time")]
    public async Task<IActionResult> GetTimeEntries(Guid id)
    {
        var entries = await _db.TimeEntries
            .Include(e => e.User)
            .Where(e => e.TaskId == id)
            .OrderByDescending(e => e.Date)
            .Select(e => new TimeEntryResponseDto
            {
                Id    = e.Id,
                Date  = e.Date,
                Hours = e.Hours,
                Notes = e.Notes,
                User  = new TaskUserDto
                {
                    Id    = e.User.Id,
                    Name  = e.User.Name,
                    Email = e.User.Email
                },
                CreatedAt = e.CreatedAt
            })
            .ToListAsync();

        var total = entries.Sum(e => e.Hours);
        return Ok(new { data = entries, totalHours = total });
    }

    // ── POST /api/tasks/{id}/time
    [HttpPost("{id:guid}/time")]
    public async Task<IActionResult> LogTime(Guid id, [FromBody] LogTimeDto dto)
    {
        var task = await _db.Tasks.FindAsync(id);
        if (task == null)
            return NotFound(new { message = "Task not found" });

        if (dto.Hours <= 0 || dto.Hours > 24)
            return BadRequest(new { message = "Hours must be between 0 and 24" });

        // Check if entry already exists for this date
        var existing = await _db.TimeEntries
            .FirstOrDefaultAsync(e =>
                e.TaskId == id &&
                e.UserId == CurrentUserId &&
                e.Date   == dto.Date);

        if (existing != null)
        {
            // Update existing entry
            existing.Hours     = dto.Hours;
            existing.Notes     = dto.Notes;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            _db.TimeEntries.Add(new TimeEntry
            {
                Id        = Guid.NewGuid(),
                TaskId    = id,
                ProjectId = task.ProjectId,
                UserId    = CurrentUserId,
                Date      = dto.Date,
                Hours     = dto.Hours,
                Notes     = dto.Notes,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = "Time logged successfully" });
    }

    // ── POST /api/tasks/{id}/attachments ──────────────────────
    [HttpPost("{id:guid}/attachments")]
    public async Task<IActionResult> UploadAttachment(Guid id, IFormFile file)
    {
        var task = await _db.Tasks.FindAsync(id);
        if (task == null)
            return NotFound(new { message = "Task not found" });

        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file provided" });

        using var stream = file.OpenReadStream();
        var relativePath = await _fileStorage.SaveTaskAttachmentAsync(task.ProjectId, id, file.FileName, stream);

        var attachment = new TaskAttachment
        {
            Id = Guid.NewGuid(),
            TaskId = id,
            UploadedBy = CurrentUserId,
            FileName = Path.GetFileName(file.FileName),
            FilePath = relativePath,
            FileSizeBytes = file.Length,
            MimeType = file.ContentType,
            UploadedAt = DateTime.UtcNow
        };

        _db.TaskAttachments.Add(attachment);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            id = attachment.Id,
            fileName = attachment.FileName,
            fileSizeBytes = attachment.FileSizeBytes,
            message = "Task attachment uploaded successfully."
        });
    }

    // ── GET /api/tasks/{id}/attachments ───────────────────────
    [HttpGet("{id:guid}/attachments")]
    public async Task<IActionResult> GetAttachments(Guid id)
    {
        var task = await _db.Tasks.FindAsync(id);
        if (task == null)
            return NotFound(new { message = "Task not found" });

        var attachments = await _db.TaskAttachments
            .Include(a => a.UploadedByNavigation)
            .Where(a => a.TaskId == id)
            .OrderByDescending(a => a.UploadedAt)
            .Select(a => new TaskAttachmentResponseDto
            {
                Id = a.Id,
                FileName = a.FileName,
                FileSizeBytes = a.FileSizeBytes,
                MimeType = a.MimeType,
                UploadedAt = a.UploadedAt,
                UploadedBy = a.UploadedByNavigation == null ? null : new TaskUserDto
                {
                    Id = a.UploadedByNavigation.Id,
                    Name = a.UploadedByNavigation.Name,
                    AvatarUrl = a.UploadedByNavigation.AvatarUrl
                }
            })
            .ToListAsync();

        return Ok(attachments);
    }

    // ── GET /api/tasks/{id}/attachments/{attachmentId}/download ─
    [HttpGet("{id:guid}/attachments/{attachmentId:guid}/download")]
    public async Task<IActionResult> DownloadAttachment(Guid id, Guid attachmentId)
    {
        var attachment = await _db.TaskAttachments
            .FirstOrDefaultAsync(a => a.Id == attachmentId && a.TaskId == id);

        if (attachment == null)
            return NotFound(new { message = "Attachment not found" });

        var fileResult = await _fileStorage.GetFileAsync(attachment.FilePath);
        if (fileResult == null)
            return NotFound(new { message = "Attachment file not found on storage disk" });

        return File(fileResult.Value.Stream, fileResult.Value.ContentType, attachment.FileName);
    }

    // ── DELETE /api/tasks/{id}/attachments/{attachmentId} ───────
    [HttpDelete("{id:guid}/attachments/{attachmentId:guid}")]
    public async Task<IActionResult> DeleteAttachment(Guid id, Guid attachmentId)
    {
        var attachment = await _db.TaskAttachments
            .FirstOrDefaultAsync(a => a.Id == attachmentId && a.TaskId == id);

        if (attachment == null)
            return NotFound(new { message = "Attachment not found" });

        if (CurrentUserRole != "admin" && CurrentUserRole != "project_manager" && attachment.UploadedBy != CurrentUserId)
            return Forbid();

        await _fileStorage.DeleteFileAsync(attachment.FilePath);
        _db.TaskAttachments.Remove(attachment);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Attachment deleted successfully." });
    }
}

public class TaskAttachmentResponseDto
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public long? FileSizeBytes { get; set; }
    public string? MimeType { get; set; }
    public DateTime UploadedAt { get; set; }
    public TaskUserDto? UploadedBy { get; set; }
}
