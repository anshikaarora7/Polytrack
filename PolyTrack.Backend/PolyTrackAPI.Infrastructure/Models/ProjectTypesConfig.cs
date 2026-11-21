using System;
using System.Collections.Generic;

namespace PolyTrackAPI.Infrastructure.Models;

public partial class ProjectTypesConfig
{
    public Guid Id { get; set; }

    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }
}
