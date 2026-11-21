using System;
using System.Collections.Generic;

namespace PolyTrackAPI.Infrastructure.Models;

public partial class Client
{
    public Guid Id { get; set; }

    public Guid? UserId { get; set; }

    public string? CompanyName { get; set; }

    public string ContactName { get; set; } = null!;

    public string Email { get; set; } = null!;

    public string? Phone { get; set; }

    public string? Address { get; set; }

    public string? Notes { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<Project> Projects { get; set; } = new List<Project>();

    public virtual User? User { get; set; }
}
