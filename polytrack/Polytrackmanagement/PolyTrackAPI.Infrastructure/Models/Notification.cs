using System;
using System.Collections.Generic;

namespace PolyTrackAPI.Infrastructure.Models;

public partial class Notification
{
    public Guid Id { get; set; }

    public Guid RecipientId { get; set; }

    public Guid? SenderId { get; set; }

    public NotificationType Type { get; set; }

    public string Title { get; set; } = null!;

    public string? Body { get; set; }

    public ActivityEntity? EntityType { get; set; }

    public Guid? EntityId { get; set; }

    public bool IsRead { get; set; }

    public DateTime? ReadAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual User Recipient { get; set; } = null!;

    public virtual User? Sender { get; set; }
}