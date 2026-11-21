using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PolyTrackAPI.Infrastructure.Data;
using PolyTrackAPI.Infrastructure.Models;
using System.Security.Claims;

namespace PolyTrackAPI.Controllers;

// ── DTOs ──────────────────────────────────────────────────────

public class CreateAssetDto
{
    public Guid ProjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Category { get; set; } = string.Empty;
    public Guid? LinkedTaskId { get; set; }
    public List<string> Tags { get; set; } = new();
}

public class UpdateAssetDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Category { get; set; }
    public Guid? LinkedTaskId { get; set; }
    public List<string>? Tags { get; set; }
}

public class AssetVersionUploadDto
{
    public short VersionNumber { get; set; }
    public string? Notes { get; set; }
    // Metadata (from Blender or extracted server-side)
    public int? PolygonCount { get; set; }
    public short? MaterialCount { get; set; }
    public short? TextureCount { get; set; }
    public decimal? DimensionsX { get; set; }
    public decimal? DimensionsY { get; set; }
    public decimal? DimensionsZ { get; set; }
}

public class AssetReviewDto
{
    public bool Approved { get; set; }
    public string? Notes { get; set; }
}

public class AssetResponseDto
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public Guid? LinkedTaskId { get; set; }
    public List<string> Tags { get; set; } = new();
    public AssetVersionDto? CurrentVersion { get; set; }
    public List<AssetVersionDto> Versions { get; set; } = new();
    public AssetUserDto? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class AssetListItemDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public List<string> Tags { get; set; } = new();
    public int VersionCount { get; set; }
    public string? CurrentVersionFile { get; set; }
    public AssetUserDto? CreatedBy { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class AssetVersionDto
{
    public Guid Id { get; set; }
    public short VersionNumber { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public string? FileExtension { get; set; }
    public long? FileSizeBytes { get; set; }
    public string? ThumbnailPath { get; set; }
    public string? Notes { get; set; }
    public string Status { get; set; } = string.Empty;
    public int? PolygonCount { get; set; }
    public short? MaterialCount { get; set; }
    public short? TextureCount { get; set; }
    public decimal? DimensionsX { get; set; }
    public decimal? DimensionsY { get; set; }
    public decimal? DimensionsZ { get; set; }
    public AssetUserDto? UploadedBy { get; set; }
    public AssetUserDto? ReviewedBy { get; set; }
    public string? ReviewNotes { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public DateTime UploadedAt { get; set; }
}

public class AssetUserDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
}

public class AssetCommentDto
{
    public string Body { get; set; } = string.Empty;
    public Guid? AssetVersionId { get; set; }
    public Guid? ParentCommentId { get; set; }
    public string? StatusChangeTo { get; set; }
}

public class AssetCommentResponseDto
{
    public Guid Id { get; set; }
    public string Body { get; set; } = string.Empty;
    public Guid? AssetVersionId { get; set; }
    public Guid? ParentCommentId { get; set; }
    public string? StatusChangeTo { get; set; }
    public AssetUserDto Author { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}

public class AssetSearchDto
{
    public string? Query { get; set; }
    public Guid? ProjectId { get; set; }
    public string? Category { get; set; }
    public string? Status { get; set; }
    public string? Tag { get; set; }
    public string? FileExtension { get; set; }
    public bool LatestVersionOnly { get; set; } = true;
    public bool ApprovedOnly { get; set; } = false;
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 24;
}

// ── Controller ────────────────────────────────────────────────

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AssetsController : ControllerBase
{
    private readonly StudioDbContext _db;
    private readonly IConfiguration _config;
    private readonly IWebHostEnvironment _env;

    public AssetsController(StudioDbContext db, IConfiguration config, IWebHostEnvironment env)
    {
        _db     = db;
        _config = config;
        _env    = env;
    }

    private Guid CurrentUserId =>
        Guid.TryParse(User.FindFirstValue("userId"), out var id) ? id : Guid.Empty;

    private string CurrentUserRole =>
        User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

    // helper — map asset to list item
    private static AssetListItemDto ToListItem(Asset a, List<AssetVersion> versions)
    {
        var current = versions
            .Where(v => v.AssetId == a.Id)
            .OrderByDescending(v => v.VersionNumber)
            .FirstOrDefault();

        return new AssetListItemDto
        {
            Id                 = a.Id,
            Name               = a.Name,
            Category           = a.Category.ToString(),
            Status             = a.Status.ToString(),
            ThumbnailUrl       = a.ThumbnailUrl,
            Tags               = a.Tags.Select(t => t.Name).ToList(),
            VersionCount       = versions.Count(v => v.AssetId == a.Id),
            CurrentVersionFile = current?.FileName,
            CreatedBy          = a.CreatedByNavigation == null ? null : new AssetUserDto
            {
                Id        = a.CreatedByNavigation.Id,
                Name      = a.CreatedByNavigation.Name,
                AvatarUrl = a.CreatedByNavigation.AvatarUrl
            },
            UpdatedAt = a.UpdatedAt
        };
    }

    // ── GET /api/assets/search
    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] AssetSearchDto dto)
    {
        var query = _db.Assets
            .Include(a => a.CreatedByNavigation)
            .Include(a => a.Tags)
            .Include(a => a.AssetVersions)
            .AsQueryable();

        // Artists only see assets from their projects
        if (CurrentUserRole == "artist")
        {
            var artistProjectIds = await _db.ProjectMembers
                .Where(m => m.UserId == CurrentUserId)
                .Select(m => m.ProjectId)
                .ToListAsync();
            query = query.Where(a => artistProjectIds.Contains(a.ProjectId));
        }

        if (dto.ProjectId.HasValue)
            query = query.Where(a => a.ProjectId == dto.ProjectId.Value);

        if (!string.IsNullOrEmpty(dto.Category) &&
            Enum.TryParse<AssetCategory>(dto.Category, true, out var category))
            query = query.Where(a => a.Category == category);

        if (!string.IsNullOrEmpty(dto.Status) &&
            Enum.TryParse<AssetStatus>(dto.Status, true, out var status))
            query = query.Where(a => a.Status == status);

        if (dto.ApprovedOnly)
            query = query.Where(a => a.Status == AssetStatus.Approved);

        if (!string.IsNullOrEmpty(dto.Tag))
            query = query.Where(a => a.Tags.Any(t => t.Name.ToLower() == dto.Tag.ToLower()));

        if (!string.IsNullOrEmpty(dto.Query))
            query = query.Where(a => a.Name.ToLower().Contains(dto.Query.ToLower()));

        if (!string.IsNullOrEmpty(dto.FileExtension))
            query = query.Where(a => a.AssetVersions.Any(v =>
                v.FileExtension != null &&
                v.FileExtension.ToLower() == dto.FileExtension.ToLower()));

        var total  = await query.CountAsync();
        var assets = await query
            .OrderByDescending(a => a.UpdatedAt)
            .Skip((dto.Page - 1) * dto.PageSize)
            .Take(dto.PageSize)
            .ToListAsync();

        var allVersions = assets
            .SelectMany(a => a.AssetVersions)
            .ToList();

        var result = assets.Select(a => ToListItem(a, allVersions)).ToList();
        return Ok(new { data = result, total, page = dto.Page, pageSize = dto.PageSize });
    }

    // ── GET /api/assets/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var asset = await _db.Assets
            .Include(a => a.CreatedByNavigation)
            .Include(a => a.Tags)
            .Include(a => a.AssetVersions)
                .ThenInclude(v => v.UploadedByNavigation)
            .Include(a => a.AssetVersions)
                .ThenInclude(v => v.ReviewedByNavigation)
            .Include(a => a.Project)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (asset == null)
            return NotFound(new { message = "Asset not found" });

        var response = new AssetResponseDto
        {
            Id          = asset.Id,
            ProjectId   = asset.ProjectId,
            ProjectName = asset.Project.Name,
            Name        = asset.Name,
            Description = asset.Description,
            Category    = asset.Category.ToString(),
            Status      = asset.Status.ToString(),
            ThumbnailUrl = asset.ThumbnailUrl,
            LinkedTaskId = asset.LinkedTaskId,
            Tags        = asset.Tags.Select(t => t.Name).ToList(),
            CreatedAt   = asset.CreatedAt,
            UpdatedAt   = asset.UpdatedAt,
            CreatedBy   = asset.CreatedByNavigation == null ? null : new AssetUserDto
            {
                Id        = asset.CreatedByNavigation.Id,
                Name      = asset.CreatedByNavigation.Name,
                AvatarUrl = asset.CreatedByNavigation.AvatarUrl
            },
            Versions = asset.AssetVersions
                .OrderByDescending(v => v.VersionNumber)
                .Select(v => new AssetVersionDto
                {
                    Id             = v.Id,
                    VersionNumber  = v.VersionNumber,
                    FileName       = v.FileName,
                    FilePath       = v.FilePath,
                    FileExtension  = v.FileExtension,
                    FileSizeBytes  = v.FileSizeBytes,
                    ThumbnailPath  = v.ThumbnailPath,
                    Notes          = v.Notes,
                    Status         = v.Status.ToString(),
                    PolygonCount   = v.PolygonCount,
                    MaterialCount  = v.MaterialCount,
                    TextureCount   = v.TextureCount,
                    DimensionsX    = v.DimensionsX,
                    DimensionsY    = v.DimensionsY,
                    DimensionsZ    = v.DimensionsZ,
                    ReviewNotes    = v.ReviewNotes,
                    ReviewedAt     = v.ReviewedAt,
                    UploadedAt     = v.UploadedAt,
                    UploadedBy     = v.UploadedByNavigation == null ? null : new AssetUserDto
                    {
                        Id        = v.UploadedByNavigation.Id,
                        Name      = v.UploadedByNavigation.Name,
                        AvatarUrl = v.UploadedByNavigation.AvatarUrl
                    },
                    ReviewedBy = v.ReviewedByNavigation == null ? null : new AssetUserDto
                    {
                        Id        = v.ReviewedByNavigation.Id,
                        Name      = v.ReviewedByNavigation.Name,
                        AvatarUrl = v.ReviewedByNavigation.AvatarUrl
                    }
                }).ToList()
        };

        // Set current version
        response.CurrentVersion = response.Versions.FirstOrDefault();

        return Ok(response);
    }

    // ── POST /api/assets
    // Creates asset record (no file yet — file comes via upload endpoint)
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAssetDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Name is required" });

        var project = await _db.Projects.FindAsync(dto.ProjectId);
        if (project == null)
            return NotFound(new { message = "Project not found" });

        if (!Enum.TryParse<AssetCategory>(dto.Category, true, out var category))
            return BadRequest(new { message = $"Invalid category: {dto.Category}" });

        var asset = new Asset
        {
            Id        = Guid.NewGuid(),
            ProjectId = dto.ProjectId,
            Name      = dto.Name,
            Description   = dto.Description,
            Category      = category,
            Status        = AssetStatus.Draft,
            LinkedTaskId  = dto.LinkedTaskId,
            CreatedBy     = CurrentUserId,
            CreatedAt     = DateTime.UtcNow,
            UpdatedAt     = DateTime.UtcNow
        };

        _db.Assets.Add(asset);
        await _db.SaveChangesAsync();

        // Handle tags
        if (dto.Tags.Any())
            await SyncTagsAsync(asset.Id, dto.Tags);

        _db.ActivityFeeds.Add(new ActivityFeed
        {
            Id          = Guid.NewGuid(),
            ProjectId   = dto.ProjectId,
            ActorId     = CurrentUserId,
            EntityType  = ActivityEntity.Asset,
            EntityId    = asset.Id,
            Action      = "created",
            Description = $"Asset \"{asset.Name}\" was created",
            CreatedAt   = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById),
            new { id = asset.Id },
            new { id = asset.Id, message = "Asset created successfully" });
    }

    // ── POST /api/assets/{id}/upload
    // Upload a new version file
    [HttpPost("{id:guid}/upload")]
    public async Task<IActionResult> Upload(Guid id, IFormFile file, [FromForm] AssetVersionUploadDto dto)
    {
        var asset = await _db.Assets.FindAsync(id);
        if (asset == null)
            return NotFound(new { message = "Asset not found" });

        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file provided" });

        // Allowed extensions
        var allowed = new[] { ".blend", ".fbx", ".obj", ".glb", ".png", ".jpg", ".tga", ".psd", ".mp4" };
        var ext     = Path.GetExtension(file.FileName).ToLower();
        if (!allowed.Contains(ext))
            return BadRequest(new { message = $"File type {ext} not allowed" });

        // Build storage path: BasePath/projectId/assetId/vN/filename
        var basePath    = _config["FileStorage:BasePath"] ?? Path.Combine(_env.ContentRootPath, "uploads");
        var nextVersion = (short)(await _db.AssetVersions
            .Where(v => v.AssetId == id)
            .MaxAsync(v => (short?)v.VersionNumber) ?? 0 + 1);

        var versionFolder = Path.Combine(basePath,
            asset.ProjectId.ToString(), id.ToString(), $"v{nextVersion}");
        Directory.CreateDirectory(versionFolder);

        var fileName = $"{Path.GetFileNameWithoutExtension(file.FileName)}{ext}";
        var filePath = Path.Combine(versionFolder, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
            await file.CopyToAsync(stream);

        var version = new AssetVersion
        {
            Id            = Guid.NewGuid(),
            AssetId       = id,
            VersionNumber = nextVersion,
            FileName      = fileName,
            FilePath      = filePath,
            FileExtension = ext,
            FileSizeBytes = file.Length,
            Notes         = dto.Notes,
            PolygonCount  = dto.PolygonCount,
            MaterialCount = dto.MaterialCount,
            TextureCount  = dto.TextureCount,
            DimensionsX   = dto.DimensionsX,
            DimensionsY   = dto.DimensionsY,
            DimensionsZ   = dto.DimensionsZ,
            UploadedBy    = CurrentUserId,
            Status        = AssetStatus.Draft,
            UploadedAt    = DateTime.UtcNow
        };

        _db.AssetVersions.Add(version);

        // Update asset status and current version pointer
        asset.Status          = AssetStatus.Draft;
        asset.CurrentVersionId = version.Id;
        asset.UpdatedAt       = DateTime.UtcNow;

        _db.ActivityFeeds.Add(new ActivityFeed
        {
            Id          = Guid.NewGuid(),
            ProjectId   = asset.ProjectId,
            ActorId     = CurrentUserId,
            EntityType  = ActivityEntity.AssetVersion,
            EntityId    = version.Id,
            Action      = "uploaded",
            Description = $"\"{asset.Name}\" V{nextVersion} uploaded",
            CreatedAt   = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(new { id = version.Id, versionNumber = nextVersion, message = "File uploaded successfully" });
    }

    // ── POST /api/assets/{id}/submit
    // Artist submits asset for review
    [HttpPost("{id:guid}/submit")]
    public async Task<IActionResult> Submit(Guid id)
    {
        var asset = await _db.Assets.FindAsync(id);
        if (asset == null)
            return NotFound(new { message = "Asset not found" });

        if (asset.Status != AssetStatus.Draft)
            return BadRequest(new { message = "Only draft assets can be submitted" });

        asset.Status    = AssetStatus.Submitted;
        asset.UpdatedAt = DateTime.UtcNow;

        _db.ActivityFeeds.Add(new ActivityFeed
        {
            Id          = Guid.NewGuid(),
            ProjectId   = asset.ProjectId,
            ActorId     = CurrentUserId,
            EntityType  = ActivityEntity.Asset,
            EntityId    = asset.Id,
            Action      = "submitted",
            Description = $"Asset \"{asset.Name}\" submitted for review",
            CreatedAt   = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(new { message = "Asset submitted for review" });
    }

    // ── POST /api/assets/{id}/review
    // Reviewer approves or rejects asset
    [HttpPost("{id:guid}/review")]
    [Authorize(Roles = "admin,reviewer,project_manager")]
    public async Task<IActionResult> Review(Guid id, [FromBody] AssetReviewDto dto)
    {
        var asset = await _db.Assets
            .Include(a => a.AssetVersions.OrderByDescending(v => v.VersionNumber).Take(1))
            .FirstOrDefaultAsync(a => a.Id == id);

        if (asset == null)
            return NotFound(new { message = "Asset not found" });

        if (asset.Status != AssetStatus.Submitted && asset.Status != AssetStatus.Review)
            return BadRequest(new { message = "Asset must be submitted before reviewing" });

        asset.Status    = dto.Approved ? AssetStatus.Approved : AssetStatus.Rejected;
        asset.UpdatedAt = DateTime.UtcNow;

        // Update current version review info
        var currentVersion = asset.AssetVersions.FirstOrDefault();
        if (currentVersion != null)
        {
            currentVersion.Status     = asset.Status;
            currentVersion.ReviewedBy = CurrentUserId;
            currentVersion.ReviewedAt = DateTime.UtcNow;
            currentVersion.ReviewNotes = dto.Notes;
        }

        var action = dto.Approved ? "approved" : "rejected";

        _db.ActivityFeeds.Add(new ActivityFeed
        {
            Id          = Guid.NewGuid(),
            ProjectId   = asset.ProjectId,
            ActorId     = CurrentUserId,
            EntityType  = ActivityEntity.Asset,
            EntityId    = asset.Id,
            Action      = action,
            Description = $"Asset \"{asset.Name}\" was {action}",
            CreatedAt   = DateTime.UtcNow
        });

        // Notify the artist who uploaded
        if (asset.CreatedBy.HasValue && asset.CreatedBy.Value != CurrentUserId)
        {
            _db.Notifications.Add(new Notification
            {
                Id          = Guid.NewGuid(),
                RecipientId = asset.CreatedBy.Value,
                SenderId    = CurrentUserId,
                Type        = dto.Approved
                                  ? NotificationType.AssetApproved
                                  : NotificationType.AssetRejected,
                Title       = $"Asset {action}",
                Body        = $"\"{asset.Name}\" was {action}. {dto.Notes}",
                EntityType  = ActivityEntity.Asset,
                EntityId    = asset.Id,
                IsRead      = false,
                CreatedAt   = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = $"Asset {action} successfully" });
    }

    // ── PUT /api/assets/{id}
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAssetDto dto)
    {
        var asset = await _db.Assets.FindAsync(id);
        if (asset == null)
            return NotFound(new { message = "Asset not found" });

        if (dto.Name != null) asset.Name = dto.Name;
        if (dto.Description != null) asset.Description = dto.Description;
        if (dto.LinkedTaskId.HasValue) asset.LinkedTaskId = dto.LinkedTaskId;

        if (!string.IsNullOrEmpty(dto.Category) &&
            Enum.TryParse<AssetCategory>(dto.Category, true, out var category))
            asset.Category = category;

        asset.UpdatedAt = DateTime.UtcNow;

        if (dto.Tags != null)
            await SyncTagsAsync(asset.Id, dto.Tags);

        await _db.SaveChangesAsync();
        return Ok(new { message = "Asset updated successfully" });
    }

    // ── DELETE /api/assets/{id}
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "admin,project_manager")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var asset = await _db.Assets.FindAsync(id);
        if (asset == null)
            return NotFound(new { message = "Asset not found" });

        // Soft delete — archive instead of remove
        asset.Status    = AssetStatus.Archived;
        asset.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(new { message = "Asset archived successfully" });
    }

    // ── GET /api/assets/{id}/download/{versionId}
    [HttpGet("{id:guid}/download/{versionId:guid}")]
    public async Task<IActionResult> Download(Guid id, Guid versionId)
    {
        var version = await _db.AssetVersions
            .FirstOrDefaultAsync(v => v.Id == versionId && v.AssetId == id);

        if (version == null)
            return NotFound(new { message = "Version not found" });

        if (!System.IO.File.Exists(version.FilePath))
            return NotFound(new { message = "File not found on disk" });

        var mimeType  = GetMimeType(version.FileExtension ?? "");
        var fileBytes = await System.IO.File.ReadAllBytesAsync(version.FilePath);
        return File(fileBytes, mimeType, version.FileName);
    }

    // ── GET /api/assets/{id}/comments
    [HttpGet("{id:guid}/comments")]
    public async Task<IActionResult> GetComments(Guid id)
    {
        var comments = await _db.AssetComments
            .Include(c => c.Author)
            .Where(c => c.AssetId == id)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new AssetCommentResponseDto
            {
                Id               = c.Id,
                Body             = c.Body,
                AssetVersionId   = c.AssetVersionId,
                ParentCommentId  = c.ParentCommentId,
                StatusChangeTo   = c.StatusChangeTo.HasValue
                                       ? c.StatusChangeTo.Value.ToString()
                                       : null,
                Author = new AssetUserDto
                {
                    Id        = c.Author.Id,
                    Name      = c.Author.Name,
                    AvatarUrl = c.Author.AvatarUrl
                },
                CreatedAt = c.CreatedAt
            })
            .ToListAsync();

        return Ok(comments);
    }

    // ── POST /api/assets/{id}/comments
    [HttpPost("{id:guid}/comments")]
    public async Task<IActionResult> AddComment(Guid id, [FromBody] AssetCommentDto dto)
    {
        var asset = await _db.Assets.FindAsync(id);
        if (asset == null)
            return NotFound(new { message = "Asset not found" });

        if (string.IsNullOrWhiteSpace(dto.Body))
            return BadRequest(new { message = "Comment body is required" });

        var comment = new AssetComment
        {
            Id              = Guid.NewGuid(),
            AssetId         = id,
            AssetVersionId  = dto.AssetVersionId,
            ParentCommentId = dto.ParentCommentId,
            AuthorId        = CurrentUserId,
            Body            = dto.Body,
            CreatedAt       = DateTime.UtcNow,
            UpdatedAt       = DateTime.UtcNow
        };

        // Status change via comment (reviewer workflow)
        if (!string.IsNullOrEmpty(dto.StatusChangeTo) &&
            Enum.TryParse<AssetStatus>(dto.StatusChangeTo, true, out var newStatus))
        {
            comment.StatusChangeTo = newStatus;
            asset.Status    = newStatus;
            asset.UpdatedAt = DateTime.UtcNow;

            _db.ActivityFeeds.Add(new ActivityFeed
            {
                Id          = Guid.NewGuid(),
                ProjectId   = asset.ProjectId,
                ActorId     = CurrentUserId,
                EntityType  = ActivityEntity.Asset,
                EntityId    = asset.Id,
                Action      = "status_changed",
                Description = $"Asset \"{asset.Name}\" status changed to {dto.StatusChangeTo} via comment",
                CreatedAt   = DateTime.UtcNow
            });
        }

        _db.AssetComments.Add(comment);
        await _db.SaveChangesAsync();
        return Ok(new { id = comment.Id, message = "Comment added" });
    }

    // ── Private helpers ───────────────────────────────────────

    private async System.Threading.Tasks.Task SyncTagsAsync(Guid assetId, List<string> tagNames)
    {
        // Remove existing tag mappings
        var existing = await _db.AssetTagMaps
            .Where(m => m.AssetId == assetId)
            .ToListAsync();
        _db.AssetTagMaps.RemoveRange(existing);

        foreach (var tagName in tagNames.Where(t => !string.IsNullOrWhiteSpace(t)))
        {
            var normalised = tagName.Trim().ToLower();

            // Get or create tag
            var tag = await _db.AssetTags
                .FirstOrDefaultAsync(t => t.Name == normalised);

            if (tag == null)
            {
                tag = new AssetTag { Id = Guid.NewGuid(), Name = normalised };
                _db.AssetTags.Add(tag);
                await _db.SaveChangesAsync();
            }

            _db.AssetTagMaps.Add(new AssetTagMap
            {
                AssetId = assetId,
                TagId   = tag.Id
            });
        }

        await _db.SaveChangesAsync();
    }

    private static string GetMimeType(string ext) => ext.ToLower() switch
    {
        ".fbx"   => "application/octet-stream",
        ".obj"   => "application/octet-stream",
        ".glb"   => "model/gltf-binary",
        ".blend" => "application/octet-stream",
        ".png"   => "image/png",
        ".jpg"   => "image/jpeg",
        ".tga"   => "image/x-tga",
        ".psd"   => "image/vnd.adobe.photoshop",
        ".mp4"   => "video/mp4",
        _        => "application/octet-stream"
    };
}
