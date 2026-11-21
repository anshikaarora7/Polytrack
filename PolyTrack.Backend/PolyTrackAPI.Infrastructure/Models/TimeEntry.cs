using System;
using System.Collections.Generic;

namespace PolyTrackAPI.Infrastructure.Models;

public partial class TimeEntry
{
    public Guid Id { get; set; }

    public Guid TaskId { get; set; }

    public Guid ProjectId { get; set; }

    public Guid UserId { get; set; }

    public DateOnly Date { get; set; }

    public decimal Hours { get; set; }

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual Project Project { get; set; } = null!;

    public virtual Task Task { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
