using System;
using System.Collections.Generic;

namespace PolyTrackAPI.Infrastructure.Models;

public partial class User
{
    public Guid Id { get; set; }

    public string Name { get; set; } = null!;

    public string Email { get; set; } = null!;

    public string PasswordHash { get; set; } = null!;

    public string? AvatarUrl { get; set; }

    public string? Phone { get; set; }

    public bool IsActive { get; set; }

    public string? Timezone { get; set; }

    public UserRole? Role { get; set; }

    public DateTime? LastLoginAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<ActivityFeed> ActivityFeeds { get; set; } = new List<ActivityFeed>();

    public virtual ICollection<AssetComment> AssetComments { get; set; } = new List<AssetComment>();

    public virtual ICollection<AssetVersion> AssetVersionReviewedByNavigations { get; set; } = new List<AssetVersion>();

    public virtual ICollection<AssetVersion> AssetVersionUploadedByNavigations { get; set; } = new List<AssetVersion>();

    public virtual ICollection<Asset> Assets { get; set; } = new List<Asset>();

    public virtual ICollection<Client> Clients { get; set; } = new List<Client>();

    public virtual ICollection<Notification> NotificationRecipients { get; set; } = new List<Notification>();

    public virtual ICollection<Notification> NotificationSenders { get; set; } = new List<Notification>();

    public virtual ICollection<Project> ProjectCreatedByNavigations { get; set; } = new List<Project>();

    public virtual ICollection<ProjectInquiry> ProjectInquiries { get; set; } = new List<ProjectInquiry>();

    public virtual ICollection<ProjectMember> ProjectMembers { get; set; } = new List<ProjectMember>();

    public virtual ICollection<Project> ProjectProjectManagers { get; set; } = new List<Project>();

    public virtual ICollection<Quota> QuotaSetByNavigations { get; set; } = new List<Quota>();

    public virtual ICollection<Quota> QuotaUsers { get; set; } = new List<Quota>();

    public virtual ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();

    public virtual ICollection<Task> TaskAssignedToNavigations { get; set; } = new List<Task>();

    public virtual ICollection<TaskAttachment> TaskAttachments { get; set; } = new List<TaskAttachment>();

    public virtual ICollection<TaskComment> TaskComments { get; set; } = new List<TaskComment>();

    public virtual ICollection<Task> TaskCreatedByNavigations { get; set; } = new List<Task>();

    public virtual ICollection<TimeEntry> TimeEntries { get; set; } = new List<TimeEntry>();
}
