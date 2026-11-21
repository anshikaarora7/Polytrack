using System;

namespace PolyTrackAPI.Infrastructure.Models;

public class AssetTagMap
{
    public Guid AssetId { get; set; }
    public Guid TagId { get; set; }
    public DateTime UpdatedAt { get; set; }
    public virtual Asset Asset { get; set; } = null!;
    public virtual AssetTag Tag { get; set; } = null!;
}