using Microsoft.EntityFrameworkCore;
using PolyTrackAPI.Core.Constants;
using PolyTrackAPI.Infrastructure.Data;

namespace PolyTrackAPI.Infrastructure.Services;

public interface IProjectAuthorizationService
{
    Task<bool> CanAccessProjectAsync(Guid userId, string role, Guid projectId, CancellationToken ct = default);
    Task<bool> CanManageProjectAsync(Guid userId, string role, Guid projectId, CancellationToken ct = default);
}

public class ProjectAuthorizationService : IProjectAuthorizationService
{
    private readonly StudioDbContext _db;

    public ProjectAuthorizationService(StudioDbContext db)
    {
        _db = db;
    }

    public async Task<bool> CanAccessProjectAsync(Guid userId, string role, Guid projectId, CancellationToken ct = default)
    {
        var normalizedRole = (role ?? "").ToLowerInvariant();

        // 1. Admin has unrestricted system-wide access
        if (normalizedRole == Roles.Admin)
            return true;

        // 2. Project Manager can access projects they manage or are member of
        if (normalizedRole == Roles.ProjectManager)
        {
            var isManager = await _db.Projects
                .AnyAsync(p => p.Id == projectId && p.ProjectManagerId == userId, ct);
            if (isManager) return true;

            return await _db.ProjectMembers
                .AnyAsync(m => m.ProjectId == projectId && m.UserId == userId, ct);
        }

        // 3. Artist and Reviewer can access projects they belong to
        if (normalizedRole == Roles.Artist || normalizedRole == Roles.Reviewer)
        {
            return await _db.ProjectMembers
                .AnyAsync(m => m.ProjectId == projectId && m.UserId == userId, ct);
        }

        // 4. Client can only access their linked projects
        if (normalizedRole == Roles.Client)
        {
            var client = await _db.Clients
                .FirstOrDefaultAsync(c => c.UserId == userId, ct);
            if (client == null) return false;

            return await _db.Projects
                .AnyAsync(p => p.Id == projectId && p.ClientId == client.Id, ct);
        }

        return false;
    }

    public async Task<bool> CanManageProjectAsync(Guid userId, string role, Guid projectId, CancellationToken ct = default)
    {
        var normalizedRole = (role ?? "").ToLowerInvariant();

        if (normalizedRole == Roles.Admin)
            return true;

        if (normalizedRole == Roles.ProjectManager)
        {
            return await _db.Projects
                .AnyAsync(p => p.Id == projectId && p.ProjectManagerId == userId, ct);
        }

        return false;
    }
}
