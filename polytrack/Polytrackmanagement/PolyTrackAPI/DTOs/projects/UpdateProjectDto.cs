using System.ComponentModel.DataAnnotations;

namespace PolyTrackAPI.DTOs.Projects;

public class UpdateProjectDto
{
    [MaxLength(255)]
    public string? Name { get; set; }

    public string? Description { get; set; }

    public Guid? ClientId { get; set; }

    public Guid? ProjectManagerId { get; set; }

    public string? ProjectType { get; set; }
    public string? Status { get; set; }
    public string? Priority { get; set; }

    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }

    public decimal? BudgetAmount { get; set; }
    public string? Currency { get; set; }

    public int? CompletionPercent { get; set; }
}