using System.ComponentModel.DataAnnotations;

namespace PolyTrackAPI.DTOs.Projects;

public class CreateProjectDto
{
    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    [MaxLength(30)]
    public string? ProjectCode { get; set; }

    public Guid? ClientId { get; set; }

    public string? ProjectType { get; set; }

    [Required]
    public string Status { get; set; } = "draft";

    [Required]
    public string Priority { get; set; } = "normal";

    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }

    public decimal? BudgetAmount { get; set; }
    public string Currency { get; set; } = "INR";
}