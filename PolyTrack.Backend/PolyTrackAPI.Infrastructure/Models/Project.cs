using System;
using System.Collections.Generic;

namespace PolyTrackAPI.Infrastructure.Models;

public partial class Project
{
    public Guid Id { get; set; }

    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    public string? ProjectCode { get; set; }

    public Guid? ClientId { get; set; }

    public Guid? ProjectManagerId { get; set; }

    public DateOnly? StartDate { get; set; }

    public DateOnly? EndDate { get; set; }

    public decimal? BudgetAmount { get; set; }

    public string? Currency { get; set; }

    public short CompletionPercent { get; set; }

    public ProjectStatus Status { get; set; }

    public PriorityLevel Priority { get; set; }

    public ProjectType? ProjectType { get; set; }


    public string? ThumbnailUrl { get; set; }

    public Guid? CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<ActivityFeed> ActivityFeeds { get; set; } = new List<ActivityFeed>();

    public virtual ICollection<Asset> Assets { get; set; } = new List<Asset>();

    public virtual Client? Client { get; set; }

    public virtual User? CreatedByNavigation { get; set; }

    public virtual ICollection<Milestone> Milestones { get; set; } = new List<Milestone>();

    public virtual User? ProjectManager { get; set; }

    public virtual ICollection<ProjectMember> ProjectMembers { get; set; } = new List<ProjectMember>();

    public virtual ICollection<Quota> Quota { get; set; } = new List<Quota>();

    public virtual ICollection<Task> Tasks { get; set; } = new List<Task>();

    public virtual ICollection<TimeEntry> TimeEntries { get; set; } = new List<TimeEntry>();
}
