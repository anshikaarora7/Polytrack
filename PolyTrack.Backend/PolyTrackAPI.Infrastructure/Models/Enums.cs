using NpgsqlTypes;

namespace PolyTrackAPI.Infrastructure.Models;

public enum UserRole
{
    Admin,
    ProjectManager,
    Artist,
    Reviewer,
    Client
}

public enum ProjectStatus
{
    Draft,
    Planning,
    Active,
    Review,
    OnHold,
    Completed,
    Cancelled
}

public enum ProjectType
{
    Character,
    Environment,
    Props,
    Animation,
    Vfx,
    ProductVisualization,
    ArchitecturalVisualization,
    Other
}

public enum PriorityLevel
{
    Low,
    Normal,
    High,
    Critical
}

public enum TaskStatus
{
    New,
    Assigned,
    InProgress,
    Review,
    Approved,
    Rejected,
    Done
}

public enum AssetStatus
{
    Draft,
    Submitted,
    Review,
    Approved,
    Rejected,
    Archived
}

public enum AssetCategory
{
    Character,
    Environment,
    Prop,
    Texture,
    Material,
    Animation,
    Audio,
    Vfx
}

public enum MilestoneStatus
{
    Pending,
    InProgress,
    Completed,
    Rejected
}

public enum InquiryStatus
{
    New,
    Reviewed,
    Converted,
    Rejected
}

// BudgetRange uses explicit PgName because values start with numbers
// which NpgsqlSnakeCaseNameTranslator cannot handle
public enum BudgetRange
{
    [PgName("under_500")]
    Under500,

    [PgName("500_2000")]
    Range500To2000,

    [PgName("2000_5000")]
    Range2000To5000,

    [PgName("5000_plus")]
    Above5000
}

public enum NotificationType
{
    TaskAssigned,
    TaskDue,
    TaskStatusChanged,
    AssetApproved,
    AssetRejected,
    AssetSubmitted,
    CommentAdded,
    ProjectUpdated,
    MilestoneApproved,
    MilestoneRejected
}

public enum ActivityEntity
{
    Project,
    Task,
    Asset,
    AssetVersion,
    Milestone,
    Comment,
    User
}