namespace PolyTrackAPI.DTOs.Projects;

public class ProjectResponseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ProjectCode { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public string? ProjectType { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public decimal? BudgetAmount { get; set; }
    public string? Currency { get; set; }
    public int CompletionPercent { get; set; }
    public ProjectClientDto? Client { get; set; }
    public ProjectManagerDto? ProjectManager { get; set; }
    public List<ProjectMemberDto> Members { get; set; } = new();
    public int MilestoneCount { get; set; }
    public int TaskCount { get; set; }
    public int AssetCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class ProjectListItemDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ProjectCode { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public string? ProjectType { get; set; }
    public DateTime? EndDate { get; set; }
    public int CompletionPercent { get; set; }
    public string? ClientName { get; set; }
    public string? ProjectManagerName { get; set; }
    public int TaskCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ProjectClientDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? CompanyName { get; set; }
}

public class ProjectManagerDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}

public class ProjectMemberDto
{
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? RoleInProject { get; set; }
}

public class AddMemberDto
{
    public Guid UserId { get; set; }
    public string? RoleInProject { get; set; }
}

public class ProjectStatsDto
{
    public int TotalTasks { get; set; }
    public int CompletedTasks { get; set; }
    public int InProgressTasks { get; set; }
    public int OverdueTasks { get; set; }
    public int TotalAssets { get; set; }
    public int ApprovedAssets { get; set; }
    public int TotalMilestones { get; set; }
    public int CompletedMilestones { get; set; }
    public double TotalHoursLogged { get; set; }
}