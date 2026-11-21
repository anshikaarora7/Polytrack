using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OData.Query;
using PolyTrackAPI.Infrastructure.Data;
using PolyTrackAPI.Infrastructure.Models;
using TaskModel = PolyTrackAPI.Infrastructure.Models.Task;

namespace PolyTrackAPI.Controllers;

[ApiController]
[Authorize]
[Route("odata")]
public class ODataReadController : ControllerBase
{
    private readonly StudioDbContext _context;

    public ODataReadController(StudioDbContext context)
    {
        _context = context;
    }

    [HttpGet("Projects")]
    [EnableQuery(PageSize = 50, MaxExpansionDepth = 3)]
    public IQueryable<Project> GetProjects()
    {
        return _context.Projects;
    }

    [HttpGet("Tasks")]
    [EnableQuery(PageSize = 50, MaxExpansionDepth = 3)]
    public IQueryable<TaskModel> GetTasks()
    {
        return _context.Tasks;
    }

    [HttpGet("Assets")]
    [EnableQuery(PageSize = 50, MaxExpansionDepth = 3)]
    public IQueryable<Asset> GetAssets()
    {
        return _context.Assets;
    }

    [HttpGet("Users")]
    [EnableQuery(PageSize = 50, MaxExpansionDepth = 2)]
    public IQueryable<User> GetUsers()
    {
        return _context.Users;
    }

    [HttpGet("Clients")]
    [EnableQuery(PageSize = 50, MaxExpansionDepth = 2)]
    public IQueryable<Client> GetClients()
    {
        return _context.Clients;
    }

    [HttpGet("Milestones")]
    [EnableQuery(PageSize = 50, MaxExpansionDepth = 2)]
    public IQueryable<Milestone> GetMilestones()
    {
        return _context.Milestones;
    }

    [HttpGet("ProjectMembers")]
    [EnableQuery(PageSize = 50, MaxExpansionDepth = 2)]
    public IQueryable<ProjectMember> GetProjectMembers()
    {
        return _context.ProjectMembers;
    }

    [HttpGet("ProjectInquiries")]
    [EnableQuery(PageSize = 50, MaxExpansionDepth = 2)]
    public IQueryable<ProjectInquiry> GetProjectInquiries()
    {
        return _context.ProjectInquiries;
    }

    [HttpGet("AssetVersions")]
    [EnableQuery(PageSize = 50, MaxExpansionDepth = 2)]
    public IQueryable<AssetVersion> GetAssetVersions()
    {
        return _context.AssetVersions;
    }

    [HttpGet("AssetTags")]
    [EnableQuery(PageSize = 50, MaxExpansionDepth = 2)]
    public IQueryable<AssetTag> GetAssetTags()
    {
        return _context.AssetTags;
    }

    [HttpGet("AssetComments")]
    [EnableQuery(PageSize = 50, MaxExpansionDepth = 2)]
    public IQueryable<AssetComment> GetAssetComments()
    {
        return _context.AssetComments;
    }

    [HttpGet("TaskComments")]
    [EnableQuery(PageSize = 50, MaxExpansionDepth = 2)]
    public IQueryable<TaskComment> GetTaskComments()
    {
        return _context.TaskComments;
    }

    [HttpGet("TimeEntries")]
    [EnableQuery(PageSize = 50, MaxExpansionDepth = 2)]
    public IQueryable<TimeEntry> GetTimeEntries()
    {
        return _context.TimeEntries;
    }

    [HttpGet("Notifications")]
    [EnableQuery(PageSize = 50, MaxExpansionDepth = 2)]
    public IQueryable<Notification> GetNotifications()
    {
        return _context.Notifications;
    }

    [HttpGet("ActivityFeed")]
    [EnableQuery(PageSize = 50, MaxExpansionDepth = 2)]
    public IQueryable<ActivityFeed> GetActivityFeed()
    {
        return _context.ActivityFeeds;
    }

    [HttpGet("Quotas")]
    [EnableQuery(PageSize = 50, MaxExpansionDepth = 2)]
    public IQueryable<Quota> GetQuotas()
    {
        return _context.Quotas;
    }
}
