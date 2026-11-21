using System;
using System.Collections.Generic;
using TaskStatus = PolyTrackAPI.Infrastructure.Models.TaskStatus;


namespace PolyTrackAPI.Infrastructure.Models;

public partial class TaskComment
{
    public Guid Id { get; set; }

    public Guid TaskId { get; set; }

    public Guid? ParentCommentId { get; set; }

    public Guid AuthorId { get; set; }

    public string Body { get; set; } = null!;

    public TaskStatus? StatusChangeTo { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual User Author { get; set; } = null!;

    public virtual ICollection<TaskComment> InverseParentComment { get; set; } = new List<TaskComment>();

    public virtual TaskComment? ParentComment { get; set; }

    public virtual Task Task { get; set; } = null!;
}