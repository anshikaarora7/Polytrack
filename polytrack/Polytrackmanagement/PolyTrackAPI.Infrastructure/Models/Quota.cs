using System;
using System.Collections.Generic;

namespace PolyTrackAPI.Infrastructure.Models;

public partial class Quota
{
    public Guid Id { get; set; }

    public Guid ProjectId { get; set; }

    public Guid UserId { get; set; }

    public decimal? TargetHoursPerDay { get; set; }

    public short? TargetTasksPerWeek { get; set; }

    public string? Notes { get; set; }

    public Guid? SetBy { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual Project Project { get; set; } = null!;

    public virtual User? SetByNavigation { get; set; }

    public virtual User User { get; set; } = null!;
}
