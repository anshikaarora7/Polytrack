using System;
using System.Collections.Generic;

namespace PolyTrackAPI.Infrastructure.Models;

public partial class Asset
{
    public Guid Id { get; set; }

    public Guid ProjectId { get; set; }

    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    public AssetCategory Category { get; set; }

    public AssetStatus Status { get; set; }

    public Guid? CurrentVersionId { get; set; }

    public Guid? CreatedBy { get; set; }

    public Guid? LinkedTaskId { get; set; }

    public string? ThumbnailUrl { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<AssetComment> AssetComments { get; set; } = new List<AssetComment>();

    public virtual ICollection<AssetVersion> AssetVersions { get; set; } = new List<AssetVersion>();

    public virtual User? CreatedByNavigation { get; set; }

    public virtual AssetVersion? CurrentVersion { get; set; }

    public virtual Task? LinkedTask { get; set; }

    public virtual Project Project { get; set; } = null!;

    public virtual ICollection<AssetTag> Tags { get; set; } = new List<AssetTag>();
}