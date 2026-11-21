using System;
using System.Collections.Generic;

namespace PolyTrackAPI.Infrastructure.Models;

public partial class InquiryAttachment
{
    public Guid Id { get; set; }

    public Guid InquiryId { get; set; }

    public string FileName { get; set; } = null!;

    public string FilePath { get; set; } = null!;

    public long? FileSizeBytes { get; set; }

    public string? MimeType { get; set; }

    public DateTime UploadedAt { get; set; }

    public virtual ProjectInquiry Inquiry { get; set; } = null!;
}
