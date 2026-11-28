using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PolyTrackAPI.Core.Constants;
using PolyTrackAPI.Infrastructure.Data;
using PolyTrackAPI.Infrastructure.Models;

namespace PolyTrackAPI.Controllers;

// ── DTOs ──────────────────────────────────────────────────────
public class CreateClientDto
{
    public string ContactName { get; set; } = string.Empty;
    public string? CompanyName { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? Notes { get; set; }
    public Guid? UserId { get; set; }
}

public class UpdateClientDto
{
    public string? ContactName { get; set; }
    public string? CompanyName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? Notes { get; set; }
    public bool? IsActive { get; set; }
}

public class ClientListItemDto
{
    public Guid Id { get; set; }
    public string ContactName { get; set; } = string.Empty;
    public string? CompanyName { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public bool IsActive { get; set; }
    public int ActiveProjectsCount { get; set; }
    public int TotalProjectsCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ClientDetailDto
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public string ContactName { get; set; } = string.Empty;
    public string? CompanyName { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<ClientProjectSummaryDto> Projects { get; set; } = new();
}

public class ClientProjectSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ProjectCode { get; set; }
    public string Status { get; set; } = string.Empty;
    public int CompletionPercent { get; set; }
    public DateTime? EndDate { get; set; }
}

// ── Controller ────────────────────────────────────────────────
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ClientsController : ControllerBase
{
    private readonly StudioDbContext _db;

    public ClientsController(StudioDbContext db)
    {
        _db = db;
    }

    private Guid CurrentUserId =>
        Guid.TryParse(User.FindFirstValue("userId") ?? User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    private string CurrentUserRole =>
        User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

    // ── GET /api/clients ──────────────────────────────────────
    [HttpGet]
    [Authorize(Roles = Roles.LeadsAndAbove)]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search,
        [FromQuery] bool? activeOnly,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var query = _db.Clients
            .Include(c => c.Projects)
            .AsQueryable();

        if (activeOnly == true)
            query = query.Where(c => c.IsActive);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(c =>
                c.ContactName.ToLower().Contains(s) ||
                (c.CompanyName != null && c.CompanyName.ToLower().Contains(s)) ||
                c.Email.ToLower().Contains(s));
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new ClientListItemDto
            {
                Id = c.Id,
                ContactName = c.ContactName,
                CompanyName = c.CompanyName,
                Email = c.Email,
                Phone = c.Phone,
                IsActive = c.IsActive,
                ActiveProjectsCount = c.Projects.Count(p => p.Status == ProjectStatus.Active || p.Status == ProjectStatus.Planning),
                TotalProjectsCount = c.Projects.Count,
                CreatedAt = c.CreatedAt
            })
            .ToListAsync();

        return Ok(new { data = items, total, page, pageSize });
    }

    // ── GET /api/clients/{id} ─────────────────────────────────
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var client = await _db.Clients
            .Include(c => c.Projects)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (client == null)
            return NotFound(new { message = "Client not found" });

        // If client user, can only view self
        if (CurrentUserRole == "client" && client.UserId != CurrentUserId)
            return Forbid();

        var detail = new ClientDetailDto
        {
            Id = client.Id,
            UserId = client.UserId,
            ContactName = client.ContactName,
            CompanyName = client.CompanyName,
            Email = client.Email,
            Phone = client.Phone,
            Address = client.Address,
            Notes = client.Notes,
            IsActive = client.IsActive,
            CreatedAt = client.CreatedAt,
            UpdatedAt = client.UpdatedAt,
            Projects = client.Projects.Select(p => new ClientProjectSummaryDto
            {
                Id = p.Id,
                Name = p.Name,
                ProjectCode = p.ProjectCode,
                Status = p.Status.ToString(),
                CompletionPercent = p.CompletionPercent,
                EndDate = p.EndDate.HasValue ? p.EndDate.Value.ToDateTime(TimeOnly.MinValue) : null
            }).ToList()
        };

        return Ok(detail);
    }

    // ── GET /api/clients/me ───────────────────────────────────
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentClientProfile()
    {
        var client = await _db.Clients
            .Include(c => c.Projects)
                .ThenInclude(p => p.Milestones)
            .FirstOrDefaultAsync(c => c.UserId == CurrentUserId || c.Email == User.FindFirstValue(ClaimTypes.Email));

        if (client == null)
            return NotFound(new { message = "No client profile linked to your user account." });

        return Ok(new
        {
            client.Id,
            client.ContactName,
            client.CompanyName,
            client.Email,
            Projects = client.Projects.Select(p => new
            {
                p.Id,
                p.Name,
                p.ProjectCode,
                Status = p.Status.ToString(),
                p.CompletionPercent,
                Milestones = p.Milestones.OrderBy(m => m.SortOrder).Select(m => new
                {
                    m.Id,
                    m.Name,
                    m.Description,
                    Status = m.Status.ToString(),
                    m.ClientApproved,
                    m.ClientApprovedAt,
                    m.ClientNotes
                })
            })
        });
    }

    // ── POST /api/clients ─────────────────────────────────────
    [HttpPost]
    [Authorize(Roles = Roles.LeadsAndAbove)]
    public async Task<IActionResult> Create([FromBody] CreateClientDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.ContactName) || string.IsNullOrWhiteSpace(dto.Email))
            return BadRequest(new { message = "ContactName and Email are required." });

        var client = new Client
        {
            Id = Guid.NewGuid(),
            ContactName = dto.ContactName.Trim(),
            CompanyName = dto.CompanyName?.Trim(),
            Email = dto.Email.Trim().ToLowerInvariant(),
            Phone = dto.Phone?.Trim(),
            Address = dto.Address?.Trim(),
            Notes = dto.Notes,
            UserId = dto.UserId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Clients.Add(client);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = client.Id }, new
        {
            id = client.Id,
            message = "Client created successfully."
        });
    }

    // ── PUT /api/clients/{id} ─────────────────────────────────
    [HttpPut("{id:guid}")]
    [Authorize(Roles = Roles.LeadsAndAbove)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateClientDto dto)
    {
        var client = await _db.Clients.FindAsync(id);
        if (client == null)
            return NotFound(new { message = "Client not found" });

        if (dto.ContactName != null) client.ContactName = dto.ContactName;
        if (dto.CompanyName != null) client.CompanyName = dto.CompanyName;
        if (dto.Email != null) client.Email = dto.Email;
        if (dto.Phone != null) client.Phone = dto.Phone;
        if (dto.Address != null) client.Address = dto.Address;
        if (dto.Notes != null) client.Notes = dto.Notes;
        if (dto.IsActive.HasValue) client.IsActive = dto.IsActive.Value;

        client.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Client updated successfully." });
    }
}
