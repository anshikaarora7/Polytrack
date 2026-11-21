using System;
using System.Collections.Generic;

namespace PolyTrackAPI.Infrastructure.Models;

public partial class TaskAttachment
{
    public Guid Id { get; set; }

    public Guid TaskId { get; set; }

    public Guid? UploadedBy { get; set; }

    public string FileName { get; set; } = null!;

    public string FilePath { get; set; } = null!;

    public long? FileSizeBytes { get; set; }

    public string? MimeType { get; set; }

    public DateTime UploadedAt { get; set; }

    public virtual Task Task { get; set; } = null!;

    public virtual User? UploadedByNavigation { get; set; }
}
