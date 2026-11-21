using System;
using System.Collections.Generic;

namespace PolyTrackAPI.Infrastructure.Models;

public partial class AssetComment
{
    public Guid Id { get; set; }

    public Guid AssetId { get; set; }

    public Guid? AssetVersionId { get; set; }

    public Guid? ParentCommentId { get; set; }

     public AssetStatus? StatusChangeTo { get; set; }

    public Guid AuthorId { get; set; }

    public string Body { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual Asset Asset { get; set; } = null!;

    public virtual AssetVersion? AssetVersion { get; set; }

    public virtual User Author { get; set; } = null!;

    public virtual ICollection<AssetComment> InverseParentComment { get; set; } = new List<AssetComment>();

    public virtual AssetComment? ParentComment { get; set; }
}
