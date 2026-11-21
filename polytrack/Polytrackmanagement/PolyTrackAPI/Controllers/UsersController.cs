using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PolyTrackAPI.Infrastructure.Data;
using PolyTrackAPI.Infrastructure.Models;
using System.Security.Claims;

namespace PolyTrackAPI.Controllers;

// ── DTOs ──────────────────────────────────────────────────────

public class CreateUserDto
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Role { get; set; } = "artist";
    public string? Phone { get; set; }
    public string? Timezone { get; set; }
}

public class UpdateUserDto
{
    public string? Name { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Timezone { get; set; }
    public string? AvatarUrl { get; set; }
}

public class UpdateUserRoleDto
{
    public string Role { get; set; } = string.Empty;
}

public class ChangePasswordDto
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

public class ResetPasswordDto
{
    public string NewPassword { get; set; } = string.Empty;
}

public class UserResponseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? AvatarUrl { get; set; }
    public string? Timezone { get; set; }
    public bool IsActive { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public DateTime CreatedAt { get; set; }
    // Stats
    public int AssignedTasks { get; set; }
    public int CompletedTasks { get; set; }
    public int ActiveProjects { get; set; }
    public double TotalHoursLogged { get; set; }
}

public class UserListItemDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public bool IsActive { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public int AssignedTasks { get; set; }
}

public class UserWorkloadDto
{
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public int AssignedTasks { get; set; }
    public int CompletedTasks { get; set; }
    public int InProgressTasks { get; set; }
    public int OverdueTasks { get; set; }
    public double HoursThisWeek { get; set; }
    public double? QuotaHoursPerDay { get; set; }
    public int? QuotaTasksPerWeek { get; set; }
    public double QuotaCompletionPercent { get; set; }
}

// ── Controller ────────────────────────────────────────────────

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly StudioDbContext _db;

    public UsersController(StudioDbContext db)
    {
        _db = db;
    }

    private Guid CurrentUserId =>
        Guid.TryParse(User.FindFirstValue("userId"), out var id) ? id : Guid.Empty;

    private string CurrentUserRole =>
        User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

    // ── GET /api/users
    [HttpGet]
    [Authorize(Roles = "admin,project_manager")]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? role,
        [FromQuery] string? search,
        [FromQuery] bool? isActive,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var query = _db.Users.AsQueryable();

        if (!string.IsNullOrEmpty(role) &&
            Enum.TryParse<UserRole>(role, true, out var userRole))
            query = query.Where(u => u.Role == userRole);

        if (isActive.HasValue)
            query = query.Where(u => u.IsActive == isActive.Value);

        if (!string.IsNullOrEmpty(search))
            query = query.Where(u =>
                u.Name.ToLower().Contains(search.ToLower()) ||
                u.Email.ToLower().Contains(search.ToLower()));

        var total = await query.CountAsync();

        var users = await query
            .OrderBy(u => u.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var taskCounts = await _db.Tasks
            .Where(t => t.AssignedTo != null)
            .GroupBy(t => t.AssignedTo)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToListAsync();

        var result = users.Select(u => new UserListItemDto
        {
            Id             = u.Id,
            Name           = u.Name,
            Email          = u.Email,
            Role           = u.Role.ToString(),
            AvatarUrl      = u.AvatarUrl,
            IsActive       = u.IsActive,
            LastLoginAt    = u.LastLoginAt,
            AssignedTasks  = taskCounts.FirstOrDefault(t => t.UserId == u.Id)?.Count ?? 0
        }).ToList();

        return Ok(new { data = result, total, page, pageSize });
    }

    // ── GET /api/users/me
    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        return await GetById(CurrentUserId);
    }

    // ── GET /api/users/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        // Non-admin users can only view their own profile
        if (CurrentUserRole != "admin" &&
            CurrentUserRole != "project_manager" &&
            id != CurrentUserId)
            return Forbid();

        var user = await _db.Users.FindAsync(id);
        if (user == null)
            return NotFound(new { message = "User not found" });

        var assignedTasks   = await _db.Tasks.CountAsync(t => t.AssignedTo == id);
        var completedTasks  = await _db.Tasks.CountAsync(t =>
            t.AssignedTo == id &&
            t.Status == PolyTrackAPI.Infrastructure.Models.TaskStatus.Done);
        var activeProjects  = await _db.ProjectMembers.CountAsync(m => m.UserId == id);
        var totalHours      = await _db.TimeEntries
            .Where(e => e.UserId == id)
            .SumAsync(e => (double?)e.Hours) ?? 0;

        return Ok(new UserResponseDto
        {
            Id              = user.Id,
            Name            = user.Name,
            Email           = user.Email,
            Role            = user.Role.ToString(),
            Phone           = user.Phone,
            AvatarUrl       = user.AvatarUrl,
            Timezone        = user.Timezone,
            IsActive        = user.IsActive,
            LastLoginAt     = user.LastLoginAt,
            CreatedAt       = user.CreatedAt,
            AssignedTasks   = assignedTasks,
            CompletedTasks  = completedTasks,
            ActiveProjects  = activeProjects,
            TotalHoursLogged = totalHours
        });
    }

    // ── POST /api/users  (admin creates users)
    [HttpPost]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Create([FromBody] CreateUserDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name) ||
            string.IsNullOrWhiteSpace(dto.Email) ||
            string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest(new { message = "Name, email and password are required" });

        var exists = await _db.Users.AnyAsync(u => u.Email == dto.Email);
        if (exists)
            return Conflict(new { message = "Email already in use" });

        if (!Enum.TryParse<UserRole>(dto.Role, true, out var role))
            return BadRequest(new { message = $"Invalid role: {dto.Role}" });

        var user = new User
        {
            Id           = Guid.NewGuid(),
            Name         = dto.Name,
            Email        = dto.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Role         = role,
            Phone        = dto.Phone,
            Timezone     = dto.Timezone ?? "Asia/Kolkata",
            IsActive     = true,
            CreatedAt    = DateTime.UtcNow,
            UpdatedAt    = DateTime.UtcNow
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById),
            new { id = user.Id },
            new { id = user.Id, message = "User created successfully" });
    }

    // ── PUT /api/users/{id}  (update own profile or admin updates anyone)
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateUserDto dto)
    {
        if (CurrentUserRole != "admin" && id != CurrentUserId)
            return Forbid();

        var user = await _db.Users.FindAsync(id);
        if (user == null)
            return NotFound(new { message = "User not found" });

        if (dto.Name != null) user.Name = dto.Name;
        if (dto.Phone != null) user.Phone = dto.Phone;
        if (dto.Timezone != null) user.Timezone = dto.Timezone;
        if (dto.AvatarUrl != null) user.AvatarUrl = dto.AvatarUrl;

        // Email change — check uniqueness
        if (dto.Email != null && dto.Email != user.Email)
        {
            var taken = await _db.Users.AnyAsync(u => u.Email == dto.Email);
            if (taken)
                return Conflict(new { message = "Email already in use" });
            user.Email = dto.Email;
        }

        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { message = "Profile updated successfully" });
    }

    // ── PATCH /api/users/{id}/role  (admin only)
    [HttpPatch("{id:guid}/role")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> UpdateRole(Guid id, [FromBody] UpdateUserRoleDto dto)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null)
            return NotFound(new { message = "User not found" });

        if (!Enum.TryParse<UserRole>(dto.Role, true, out var role))
            return BadRequest(new { message = $"Invalid role: {dto.Role}" });

        user.Role      = role;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { message = $"Role updated to {dto.Role}" });
    }

    // ── PATCH /api/users/{id}/deactivate  (admin only)
    [HttpPatch("{id:guid}/deactivate")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Deactivate(Guid id)
    {
        if (id == CurrentUserId)
            return BadRequest(new { message = "Cannot deactivate your own account" });

        var user = await _db.Users.FindAsync(id);
        if (user == null)
            return NotFound(new { message = "User not found" });

        user.IsActive  = false;
        user.UpdatedAt = DateTime.UtcNow;

        // Revoke all refresh tokens
        var tokens = await _db.RefreshTokens
            .Where(t => t.UserId == id && t.Revoked == false)
            .ToListAsync();
        foreach (var t in tokens) t.Revoked = true;

        await _db.SaveChangesAsync();
        return Ok(new { message = "User deactivated" });
    }

    // ── PATCH /api/users/{id}/activate  (admin only)
    [HttpPatch("{id:guid}/activate")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Activate(Guid id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null)
            return NotFound(new { message = "User not found" });

        user.IsActive  = true;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { message = "User activated" });
    }

    // ── POST /api/users/change-password  (own account)
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
    {
        var user = await _db.Users.FindAsync(CurrentUserId);
        if (user == null)
            return NotFound(new { message = "User not found" });

        if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
            return Unauthorized(new { message = "Current password is incorrect" });

        if (dto.NewPassword.Length < 8)
            return BadRequest(new { message = "New password must be at least 8 characters" });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        user.UpdatedAt    = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { message = "Password changed successfully" });
    }

    // ── POST /api/users/{id}/reset-password  (admin only)
    [HttpPost("{id:guid}/reset-password")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> ResetPassword(Guid id, [FromBody] ResetPasswordDto dto)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null)
            return NotFound(new { message = "User not found" });

        if (dto.NewPassword.Length < 8)
            return BadRequest(new { message = "Password must be at least 8 characters" });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        user.UpdatedAt    = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { message = "Password reset successfully" });
    }

    // ── GET /api/users/workload?projectId=
    // Kitsu-style team workload view
    [HttpGet("workload")]
    [Authorize(Roles = "admin,project_manager")]
    public async Task<IActionResult> GetWorkload([FromQuery] Guid? projectId)
    {
        var weekStart = DateOnly.FromDateTime(
            DateTime.UtcNow.AddDays(-(int)DateTime.UtcNow.DayOfWeek));

        // Get users — filter by project if specified
        List<User> users;
        if (projectId.HasValue)
        {
            users = await _db.ProjectMembers
                .Where(m => m.ProjectId == projectId.Value)
                .Include(m => m.User)
                .Select(m => m.User)
                .ToListAsync();
        }
        else
        {
            users = await _db.Users
                .Where(u => u.IsActive == true &&
                            (u.Role == UserRole.Artist ||
                             u.Role == UserRole.Reviewer))
                .ToListAsync();
        }

        var userIds = users.Select(u => u.Id).ToList();

        var tasks = await _db.Tasks
            .Where(t => t.AssignedTo != null && userIds.Contains(t.AssignedTo!.Value))
            .ToListAsync();

        var hoursThisWeek = await _db.TimeEntries
            .Where(e => userIds.Contains(e.UserId) && e.Date >= weekStart)
            .GroupBy(e => e.UserId)
            .Select(g => new { UserId = g.Key, Hours = (double)g.Sum(e => e.Hours) })
            .ToListAsync();

        var quotas = await _db.Quotas
            .Where(q => userIds.Contains(q.UserId))
            .ToListAsync();

        var result = users.Select(u =>
        {
            var userTasks  = tasks.Where(t => t.AssignedTo == u.Id).ToList();
            var hours      = hoursThisWeek.FirstOrDefault(h => h.UserId == u.Id)?.Hours ?? 0;
            var quota      = quotas.FirstOrDefault(q => q.UserId == u.Id);
            var weeklyTarget = quota != null
                ? (double)(quota.TargetHoursPerDay ?? 0) * 5
                : 0;
            var quotaPct   = weeklyTarget > 0
                ? Math.Round(hours / weeklyTarget * 100, 1)
                : 0;

            return new UserWorkloadDto
            {
                UserId              = u.Id,
                Name                = u.Name,
                AvatarUrl           = u.AvatarUrl,
                AssignedTasks       = userTasks.Count,
                CompletedTasks      = userTasks.Count(t =>
                    t.Status == PolyTrackAPI.Infrastructure.Models.TaskStatus.Done),
                InProgressTasks     = userTasks.Count(t =>
                    t.Status == PolyTrackAPI.Infrastructure.Models.TaskStatus.InProgress),
                OverdueTasks        = userTasks.Count(t =>
                    t.DueDate.HasValue &&
                    t.DueDate.Value < DateOnly.FromDateTime(DateTime.UtcNow) &&
                    t.Status != PolyTrackAPI.Infrastructure.Models.TaskStatus.Done),
                HoursThisWeek       = hours,
                QuotaHoursPerDay    = quota != null ? (double?)quota.TargetHoursPerDay : null,
                QuotaTasksPerWeek   = quota?.TargetTasksPerWeek,
                QuotaCompletionPercent = quotaPct
            };
        }).ToList();

        return Ok(result);
    }

    // ── GET /api/users/{id}/notifications
    [HttpGet("{id:guid}/notifications")]
    public async Task<IActionResult> GetNotifications(
        Guid id,
        [FromQuery] bool unreadOnly = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (id != CurrentUserId && CurrentUserRole != "admin")
            return Forbid();

        var query = _db.Notifications
            .Where(n => n.RecipientId == id);

        if (unreadOnly)
            query = query.Where(n => !n.IsRead);

        var total = await query.CountAsync();

        var notifications = await query
            .OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(n => new
            {
                n.Id,
                n.Title,
                n.Body,
                Type       = n.Type.ToString(),
                EntityType = n.EntityType.HasValue ? n.EntityType.Value.ToString() : null,
                n.EntityId,
                n.IsRead,
                n.ReadAt,
                n.CreatedAt
            })
            .ToListAsync();

        return Ok(new { data = notifications, total, page, pageSize });
    }

    // ── POST /api/users/{id}/notifications/read-all
    [HttpPost("{id:guid}/notifications/read-all")]
    public async Task<IActionResult> MarkAllRead(Guid id)
    {
        if (id != CurrentUserId)
            return Forbid();

        var unread = await _db.Notifications
            .Where(n => n.RecipientId == id && !n.IsRead)
            .ToListAsync();

        foreach (var n in unread)
        {
            n.IsRead = true;
            n.ReadAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = $"{unread.Count} notifications marked as read" });
    }
}
