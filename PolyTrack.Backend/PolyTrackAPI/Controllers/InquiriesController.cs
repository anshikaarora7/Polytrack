using System.Net;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PolyTrackAPI.Core.Constants;
using PolyTrackAPI.Core.Interfaces;
using PolyTrackAPI.Infrastructure.Data;
using PolyTrackAPI.Infrastructure.Models;

namespace PolyTrackAPI.Controllers;

// ── DTOs ──────────────────────────────────────────────────────
public class CreateInquiryDto
{
    public string ClientName { get; set; } = string.Empty;
    public string? CompanyName { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string ProjectTitle { get; set; } = string.Empty;
    public string ProjectDescription { get; set; } = string.Empty;
    public string? ProjectType { get; set; }
    public string? BudgetRange { get; set; }
    public DateTime? DesiredDeadline { get; set; }
    public string? AdditionalNotes { get; set; }
}

public class UpdateInquiryStatusDto
{
    public string Status { get; set; } = string.Empty;
}

public class ConvertInquiryDto
{
    public string? ProjectName { get; set; }
    public Guid? ProjectManagerId { get; set; }
    public string? ProjectCode { get; set; }
    public decimal? Budget { get; set; }
    public decimal? BudgetAmount { get; set; }
    public string? Currency { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}

public class InquiryResponseDto
{
    public Guid Id { get; set; }
    public string ClientName { get; set; } = string.Empty;
    public string? CompanyName { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string ProjectTitle { get; set; } = string.Empty;
    public string ProjectDescription { get; set; } = string.Empty;
    public string? ProjectType { get; set; }
    public string? BudgetRange { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? DesiredDeadline { get; set; }
    public string? AdditionalNotes { get; set; }
    public Guid? ReviewedBy { get; set; }
    public string? ReviewedByName { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public Guid? ConvertedProjectId { get; set; }
    public string? ConvertedProjectName { get; set; }
    public DateTime SubmittedAt { get; set; }
    public List<InquiryAttachmentDto> Attachments { get; set; } = new();
}

public class InquiryAttachmentDto
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public long? FileSizeBytes { get; set; }
    public string? MimeType { get; set; }
    public DateTime UploadedAt { get; set; }
}

// ── Controller ────────────────────────────────────────────────
[ApiController]
[Route("api/[controller]")]
public class InquiriesController : ControllerBase
{
    private readonly StudioDbContext _db;
    private readonly IFileStorageService _fileStorage;
    private readonly ILogger<InquiriesController> _logger;

    public InquiriesController(
        StudioDbContext db,
        IFileStorageService fileStorage,
        ILogger<InquiriesController> logger)
    {
        _db = db;
        _fileStorage = fileStorage;
        _logger = logger;
    }

    private Guid CurrentUserId =>
        Guid.TryParse(User.FindFirstValue("userId") ?? User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    private string CurrentUserRole =>
        User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

    // ── POST /api/inquiries (Public client submission) ───────────
    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> Create([FromBody] CreateInquiryDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.ClientName) || string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.ProjectTitle))
            return BadRequest(new { message = "ClientName, Email, and ProjectTitle are required." });

        var inquiry = new ProjectInquiry
        {
            Id = Guid.NewGuid(),
            ClientName = dto.ClientName.Trim(),
            CompanyName = dto.CompanyName?.Trim(),
            Email = dto.Email.Trim().ToLowerInvariant(),
            Phone = dto.Phone?.Trim(),
            ProjectTitle = dto.ProjectTitle.Trim(),
            ProjectDescription = dto.ProjectDescription ?? string.Empty,
            Status = InquiryStatus.New,
            AdditionalNotes = dto.AdditionalNotes,
            SubmittedAt = DateTime.UtcNow
        };

        if (dto.DesiredDeadline.HasValue)
            inquiry.DesiredDeadline = DateOnly.FromDateTime(dto.DesiredDeadline.Value);

        if (!string.IsNullOrWhiteSpace(dto.ProjectType) &&
            Enum.TryParse<ProjectType>(dto.ProjectType, true, out var pType))
        {
            inquiry.ProjectType = pType;
        }

        if (!string.IsNullOrWhiteSpace(dto.BudgetRange) &&
            Enum.TryParse<BudgetRange>(dto.BudgetRange, true, out var bRange))
        {
            inquiry.BudgetRange = bRange;
        }

        if (HttpContext.Connection.RemoteIpAddress != null)
        {
            inquiry.IpAddress = HttpContext.Connection.RemoteIpAddress;
        }

        _db.ProjectInquiries.Add(inquiry);
        await _db.SaveChangesAsync();

        _logger.LogInformation("New client inquiry submitted: {Title} from {Email}", inquiry.ProjectTitle, inquiry.Email);

        return CreatedAtAction(nameof(GetById), new { id = inquiry.Id }, new
        {
            id = inquiry.Id,
            message = "Inquiry submitted successfully. A production manager will review your submission shortly."
        });
    }

    // ── GET /api/inquiries (PM & Admin listing) ──────────────────
    [HttpGet]
    [Authorize(Roles = Roles.LeadsAndAbove)]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? status,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var query = _db.ProjectInquiries
            .Include(i => i.ReviewedByNavigation)
            .Include(i => i.InquiryAttachments)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<InquiryStatus>(status, true, out var inqStatus))
        {
            query = query.Where(i => i.Status == inqStatus);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(i =>
                i.ProjectTitle.ToLower().Contains(s) ||
                i.ClientName.ToLower().Contains(s) ||
                (i.CompanyName != null && i.CompanyName.ToLower().Contains(s)) ||
                i.Email.ToLower().Contains(s));
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(i => i.SubmittedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var result = items.Select(MapToResponseDto).ToList();
        return Ok(new { data = result, total, page, pageSize });
    }

    // ── GET /api/inquiries/{id} ──────────────────────────────────
    [HttpGet("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> GetById(Guid id)
    {
        var inquiry = await _db.ProjectInquiries
            .Include(i => i.ReviewedByNavigation)
            .Include(i => i.InquiryAttachments)
            .FirstOrDefaultAsync(i => i.Id == id);

        if (inquiry == null)
            return NotFound(new { message = "Inquiry not found" });

        return Ok(MapToResponseDto(inquiry));
    }

    // ── POST /api/inquiries/{id}/attachments ─────────────────────
    [HttpPost("{id:guid}/attachments")]
    public async Task<IActionResult> UploadAttachment(Guid id, IFormFile file)
    {
        var inquiry = await _db.ProjectInquiries.FindAsync(id);
        if (inquiry == null)
            return NotFound(new { message = "Inquiry not found" });

        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file provided" });

        using var stream = file.OpenReadStream();
        var relativePath = await _fileStorage.SaveInquiryAttachmentAsync(id, file.FileName, stream);

        var attachment = new InquiryAttachment
        {
            Id = Guid.NewGuid(),
            InquiryId = id,
            FileName = Path.GetFileName(file.FileName),
            FilePath = relativePath,
            FileSizeBytes = file.Length,
            MimeType = file.ContentType,
            UploadedAt = DateTime.UtcNow
        };

        _db.InquiryAttachments.Add(attachment);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            id = attachment.Id,
            fileName = attachment.FileName,
            message = "Attachment uploaded successfully."
        });
    }

    // ── GET /api/inquiries/{id}/attachments/{attachmentId}/download ──
    [HttpGet("{id:guid}/attachments/{attachmentId:guid}/download")]
    public async Task<IActionResult> DownloadAttachment(Guid id, Guid attachmentId)
    {
        var attachment = await _db.InquiryAttachments
            .FirstOrDefaultAsync(a => a.Id == attachmentId && a.InquiryId == id);

        if (attachment == null)
            return NotFound(new { message = "Attachment not found" });

        var fileResult = await _fileStorage.GetFileAsync(attachment.FilePath);
        if (fileResult == null)
            return NotFound(new { message = "File not found on storage" });

        return File(fileResult.Value.Stream, fileResult.Value.ContentType, attachment.FileName);
    }

    // ── PATCH /api/inquiries/{id}/status ─────────────────────────
    [HttpPatch("{id:guid}/status")]
    [Authorize(Roles = Roles.LeadsAndAbove)]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateInquiryStatusDto dto)
    {
        var inquiry = await _db.ProjectInquiries.FindAsync(id);
        if (inquiry == null)
            return NotFound(new { message = "Inquiry not found" });

        if (!Enum.TryParse<InquiryStatus>(dto.Status, true, out var newStatus))
            return BadRequest(new { message = $"Invalid status: {dto.Status}" });

        inquiry.Status = newStatus;
        inquiry.ReviewedBy = CurrentUserId;
        inquiry.ReviewedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(new { message = $"Inquiry status updated to {newStatus}" });
    }

    // ── POST /api/inquiries/{id}/convert ─────────────────────────
    // Converts inquiry into an official studio Project + Client record
    [HttpPost("{id:guid}/convert")]
    [Authorize(Roles = Roles.LeadsAndAbove)]
    public async Task<IActionResult> Convert(Guid id, [FromBody] ConvertInquiryDto dto)
    {
        var inquiry = await _db.ProjectInquiries.FindAsync(id);
        if (inquiry == null)
            return NotFound(new { message = "Inquiry not found" });

        if (inquiry.Status == InquiryStatus.Converted && inquiry.ConvertedProjectId.HasValue)
        {
            return BadRequest(new
            {
                message = "This inquiry has already been converted to a project.",
                projectId = inquiry.ConvertedProjectId.Value
            });
        }

        // 1. Find or create Client account
        var client = await _db.Clients.FirstOrDefaultAsync(c => c.Email == inquiry.Email);
        if (client == null)
        {
            client = new Client
            {
                Id = Guid.NewGuid(),
                ContactName = inquiry.ClientName,
                CompanyName = inquiry.CompanyName,
                Email = inquiry.Email,
                Phone = inquiry.Phone,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.Clients.Add(client);
            await _db.SaveChangesAsync();
        }

        // 2. Generate Project Code
        var projectCode = dto.ProjectCode;
        if (string.IsNullOrWhiteSpace(projectCode))
        {
            var prefix = inquiry.ProjectTitle.Length >= 3
                ? inquiry.ProjectTitle[..3].ToUpperInvariant()
                : "PRJ";
            projectCode = $"{prefix}-{DateTime.UtcNow:MMdd}-{new Random().Next(100, 999)}";
        }

        var pmId = dto.ProjectManagerId ?? CurrentUserId;

        // 3. Create Project
        var project = new Project
        {
            Id = Guid.NewGuid(),
            Name = !string.IsNullOrWhiteSpace(dto.ProjectName) ? dto.ProjectName.Trim() : inquiry.ProjectTitle,
            Description = inquiry.ProjectDescription,
            ProjectCode = projectCode,
            ClientId = client.Id,
            ProjectManagerId = pmId,
            ProjectType = inquiry.ProjectType ?? ProjectType.Other,
            Status = ProjectStatus.Planning,
            Priority = PriorityLevel.Normal,
            BudgetAmount = dto.BudgetAmount ?? dto.Budget ?? 0,
            Currency = dto.Currency ?? "USD",
            CompletionPercent = 0,
            CreatedBy = CurrentUserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        if (dto.StartDate.HasValue)
            project.StartDate = DateOnly.FromDateTime(dto.StartDate.Value);
        else
            project.StartDate = DateOnly.FromDateTime(DateTime.UtcNow);

        if (dto.EndDate.HasValue)
            project.EndDate = DateOnly.FromDateTime(dto.EndDate.Value);
        else if (inquiry.DesiredDeadline.HasValue)
            project.EndDate = inquiry.DesiredDeadline.Value;

        _db.Projects.Add(project);

        // Add PM as Project Member
        _db.ProjectMembers.Add(new ProjectMember
        {
            Id = Guid.NewGuid(),
            ProjectId = project.Id,
            UserId = pmId,
            RoleInProject = "Project Manager",
            AddedAt = DateTime.UtcNow
        });

        // 4. Update Inquiry
        inquiry.Status = InquiryStatus.Converted;
        inquiry.ConvertedProjectId = project.Id;
        inquiry.ReviewedBy = CurrentUserId;
        inquiry.ReviewedAt = DateTime.UtcNow;

        // 5. Activity Feed log
        _db.ActivityFeeds.Add(new ActivityFeed
        {
            Id = Guid.NewGuid(),
            ProjectId = project.Id,
            ActorId = CurrentUserId,
            EntityType = ActivityEntity.Project,
            EntityId = project.Id,
            Action = "converted_from_inquiry",
            Description = $"Project \"{project.Name}\" was converted from client inquiry by {inquiry.ClientName}",
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        _logger.LogInformation("Converted inquiry {InquiryId} into Project {ProjectId} ({ProjectCode})",
            inquiry.Id, project.Id, project.ProjectCode);

        return Ok(new
        {
            message = "Inquiry successfully converted to project.",
            projectId = project.Id,
            projectName = project.Name,
            projectCode = project.ProjectCode,
            clientId = client.Id
        });
    }

    private static InquiryResponseDto MapToResponseDto(ProjectInquiry i)
    {
        return new InquiryResponseDto
        {
            Id = i.Id,
            ClientName = i.ClientName,
            CompanyName = i.CompanyName,
            Email = i.Email,
            Phone = i.Phone,
            ProjectTitle = i.ProjectTitle,
            ProjectDescription = i.ProjectDescription,
            ProjectType = i.ProjectType?.ToString(),
            BudgetRange = i.BudgetRange?.ToString(),
            Status = i.Status.ToString(),
            DesiredDeadline = i.DesiredDeadline.HasValue ? i.DesiredDeadline.Value.ToDateTime(TimeOnly.MinValue) : null,
            AdditionalNotes = i.AdditionalNotes,
            ReviewedBy = i.ReviewedBy,
            ReviewedByName = i.ReviewedByNavigation?.Name,
            ReviewedAt = i.ReviewedAt,
            ConvertedProjectId = i.ConvertedProjectId,
            SubmittedAt = i.SubmittedAt,
            Attachments = i.InquiryAttachments.Select(a => new InquiryAttachmentDto
            {
                Id = a.Id,
                FileName = a.FileName,
                FileSizeBytes = a.FileSizeBytes,
                MimeType = a.MimeType,
                UploadedAt = a.UploadedAt
            }).ToList()
        };
    }
}
