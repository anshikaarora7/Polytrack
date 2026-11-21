using System;
using System.Collections.Generic;

namespace PolyTrackAPI.Infrastructure.Models;

public partial class Task
{
    public Guid Id { get; set; }

    public Guid ProjectId { get; set; }

    public Guid? MilestoneId { get; set; }

    public string Title { get; set; } = null!;

    public string? Description { get; set; }

    public Guid? AssignedTo { get; set; }

    public Guid? CreatedBy { get; set; }

    public TaskStatus Status { get; set; }

    public PriorityLevel Priority { get; set; }

    public short? StoryPoints { get; set; }

    public decimal? EstimatedHours { get; set; }

    public DateOnly? DueDate { get; set; }

    public DateTime? StartedAt { get; set; }

    public DateTime? CompletedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<Asset> Assets { get; set; } = new List<Asset>();

    public virtual User? AssignedToNavigation { get; set; }

    public virtual User? CreatedByNavigation { get; set; }

    public virtual Milestone? Milestone { get; set; }

    public virtual Project Project { get; set; } = null!;

    public virtual ICollection<TaskAttachment> TaskAttachments { get; set; } = new List<TaskAttachment>();

    public virtual ICollection<TaskComment> TaskComments { get; set; } = new List<TaskComment>();

    public virtual ICollection<TimeEntry> TimeEntries { get; set; } = new List<TimeEntry>();
}