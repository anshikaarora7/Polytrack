using System;
using System.Collections.Generic;
using System.Net;

namespace PolyTrackAPI.Infrastructure.Models;

public partial class ProjectInquiry
{
    public Guid Id { get; set; }

    public string ClientName { get; set; } = null!;

    public string? CompanyName { get; set; }

    public string Email { get; set; } = null!;

    public string? Phone { get; set; }

    public string ProjectTitle { get; set; } = null!;

    public string ProjectDescription { get; set; } = null!;

    public ProjectType? ProjectType { get; set; }

    public BudgetRange? BudgetRange { get; set; }

    public InquiryStatus Status { get; set; }

    public DateOnly? DesiredDeadline { get; set; }

    public string? AdditionalNotes { get; set; }

    public Guid? ReviewedBy { get; set; }

    public DateTime? ReviewedAt { get; set; }

    public Guid? ConvertedProjectId { get; set; }

    public DateTime SubmittedAt { get; set; }

    public IPAddress? IpAddress { get; set; }

    public virtual ICollection<InquiryAttachment> InquiryAttachments { get; set; } = new List<InquiryAttachment>();

    public virtual User? ReviewedByNavigation { get; set; }
}