using System;
using System.Collections.Generic;

namespace PolyTrackAPI.Infrastructure.Models;

public partial class AssetVersion
{
    public Guid Id { get; set; }

    public Guid AssetId { get; set; }

    public short VersionNumber { get; set; }

    public string FileName { get; set; } = null!;

    public string FilePath { get; set; } = null!;

    public long? FileSizeBytes { get; set; }

    public string? FileExtension { get; set; }

    public string? ThumbnailPath { get; set; }

    public int? PolygonCount { get; set; }

    public short? MaterialCount { get; set; }

    public short? TextureCount { get; set; }

    public decimal? DimensionsX { get; set; }

    public decimal? DimensionsY { get; set; }

    public decimal? DimensionsZ { get; set; }

    public string? ExtraMetadata { get; set; }

    public Guid UploadedBy { get; set; }

    public string? Notes { get; set; }

    public Guid? ReviewedBy { get; set; }

    public DateTime? ReviewedAt { get; set; }

    public string? ReviewNotes { get; set; }

    public AssetStatus Status { get; set; }

    public DateTime UploadedAt { get; set; }

    public virtual Asset Asset { get; set; } = null!;

    public virtual ICollection<AssetComment> AssetComments { get; set; } = new List<AssetComment>();

    public virtual ICollection<Asset> Assets { get; set; } = new List<Asset>();

    public virtual User? ReviewedByNavigation { get; set; }

    public virtual User UploadedByNavigation { get; set; } = null!;
}