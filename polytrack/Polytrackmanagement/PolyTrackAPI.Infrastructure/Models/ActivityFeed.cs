using System;
using System.Collections.Generic;

namespace PolyTrackAPI.Infrastructure.Models;

public partial class ActivityFeed
{
    public Guid Id { get; set; }

    public Guid? ProjectId { get; set; }

    public Guid? ActorId { get; set; }

    public Guid EntityId { get; set; }

    public ActivityEntity EntityType { get; set; }

    public string Action { get; set; } = null!;

    public string? Description { get; set; }

    public string? Meta { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual User? Actor { get; set; }

    public virtual Project? Project { get; set; }
}