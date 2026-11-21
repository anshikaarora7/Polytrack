using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using PolyTrackAPI.Infrastructure.Models;

namespace PolyTrackAPI.Infrastructure.Data;

public partial class StudioDbContext : DbContext
{
    public StudioDbContext(DbContextOptions<StudioDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<ActivityFeed> ActivityFeeds { get; set; }

    public virtual DbSet<Asset> Assets { get; set; }

    public virtual DbSet<AssetCategoriesConfig> AssetCategoriesConfigs { get; set; }

    public virtual DbSet<AssetComment> AssetComments { get; set; }

    public virtual DbSet<AssetTag> AssetTags { get; set; }

    public virtual DbSet<AssetVersion> AssetVersions { get; set; }

    public virtual DbSet<AssetTagMap> AssetTagMaps { get; set; }

    public virtual DbSet<Client> Clients { get; set; }

    public virtual DbSet<InquiryAttachment> InquiryAttachments { get; set; }

    public virtual DbSet<Milestone> Milestones { get; set; }

    public virtual DbSet<Notification> Notifications { get; set; }

    public virtual DbSet<Project> Projects { get; set; }

    public virtual DbSet<ProjectInquiry> ProjectInquiries { get; set; }

    public virtual DbSet<ProjectMember> ProjectMembers { get; set; }

    public virtual DbSet<ProjectTypesConfig> ProjectTypesConfigs { get; set; }

    public virtual DbSet<Quota> Quotas { get; set; }

    public virtual DbSet<RefreshToken> RefreshTokens { get; set; }

    public virtual DbSet<Models.Task> Tasks { get; set; }

    public virtual DbSet<TaskAttachment> TaskAttachments { get; set; }

    public virtual DbSet<TaskComment> TaskComments { get; set; }

    public virtual DbSet<TimeEntry> TimeEntries { get; set; }

    public virtual DbSet<User> Users { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder
            .HasPostgresEnum("activity_entity", new[] { "project", "task", "asset", "asset_version", "milestone", "comment", "user" })
            .HasPostgresEnum("asset_category", new[] { "character", "environment", "prop", "texture", "material", "animation", "audio", "vfx" })
            .HasPostgresEnum("asset_status", new[] { "draft", "submitted", "review", "approved", "rejected", "archived" })
            .HasPostgresEnum("budget_range", new[] { "under_500", "500_2000", "2000_5000", "5000_plus" })
            .HasPostgresEnum("inquiry_status", new[] { "new", "reviewed", "converted", "rejected" })
            .HasPostgresEnum("milestone_status", new[] { "pending", "in_progress", "completed", "rejected" })
            .HasPostgresEnum("notification_type", new[] { "task_assigned", "task_due", "task_status_changed", "asset_approved", "asset_rejected", "asset_submitted", "comment_added", "project_updated", "milestone_approved", "milestone_rejected" })
            .HasPostgresEnum("priority_level", new[] { "low", "normal", "high", "critical" })
            .HasPostgresEnum("project_status", new[] { "draft", "planning", "active", "review", "on_hold", "completed", "cancelled" })
            .HasPostgresEnum("project_type", new[] { "character", "environment", "props", "animation", "vfx", "product_visualization", "architectural_visualization", "other" })
            .HasPostgresEnum("task_status", new[] { "new", "assigned", "in_progress", "review", "approved", "rejected", "done" })
            .HasPostgresEnum("user_role", new[] { "admin", "project_manager", "artist", "reviewer", "client" })
            .HasPostgresExtension("pgcrypto");

        modelBuilder.Entity<ActivityFeed>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("activity_feed_pkey");

            entity.ToTable("activity_feed");

            entity.HasIndex(e => e.CreatedAt, "idx_activity_created").IsDescending();

            entity.HasIndex(e => e.ProjectId, "idx_activity_project");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.Action)
                .HasMaxLength(80)
                .HasColumnName("action");
            entity.Property(e => e.ActorId).HasColumnName("actor_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.EntityId).HasColumnName("entity_id");
            entity.Property(e => e.EntityType)
                .HasColumnName("entity_type")
                .HasColumnType("activity_entity");
            entity.Property(e => e.Meta)
                .HasColumnType("jsonb")
                .HasColumnName("meta");
            entity.Property(e => e.ProjectId).HasColumnName("project_id");

            entity.HasOne(d => d.Actor).WithMany(p => p.ActivityFeeds)
                .HasForeignKey(d => d.ActorId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("activity_feed_actor_id_fkey");

            entity.HasOne(d => d.Project).WithMany(p => p.ActivityFeeds)
                .HasForeignKey(d => d.ProjectId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("activity_feed_project_id_fkey");
        });

        modelBuilder.Entity<Asset>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("assets_pkey");

            entity.ToTable("assets");

            entity.HasIndex(e => e.CreatedBy, "idx_assets_created_by");

            entity.HasIndex(e => e.ProjectId, "idx_assets_project");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.Category)
                .HasColumnName("category")
                .HasColumnType("asset_category");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.CurrentVersionId).HasColumnName("current_version_id");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.LinkedTaskId).HasColumnName("linked_task_id");
            entity.Property(e => e.Name)
                .HasMaxLength(255)
                .HasColumnName("name");
            entity.Property(e => e.ProjectId).HasColumnName("project_id");
            entity.Property(e => e.Status)
                .HasColumnName("status")
                .HasColumnType("asset_status");
            entity.Property(e => e.ThumbnailUrl).HasColumnName("thumbnail_url");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.Assets)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("assets_created_by_fkey");

            entity.HasOne(d => d.CurrentVersion).WithMany(p => p.Assets)
                .HasForeignKey(d => d.CurrentVersionId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_assets_current_version");

            entity.HasOne(d => d.LinkedTask).WithMany(p => p.Assets)
                .HasForeignKey(d => d.LinkedTaskId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("assets_linked_task_id_fkey");

            entity.HasOne(d => d.Project).WithMany(p => p.Assets)
                .HasForeignKey(d => d.ProjectId)
                .HasConstraintName("assets_project_id_fkey");

            // Configure Many-to-Many using the join entity AssetTagMap
            entity.HasMany(d => d.Tags)
                .WithMany(p => p.Assets)
                .UsingEntity<AssetTagMap>(
                    l => l.HasOne(at => at.Tag).WithMany().HasForeignKey(at => at.TagId),
                    r => r.HasOne(at => at.Asset).WithMany().HasForeignKey(at => at.AssetId),
                    j =>
                    {
                        j.HasKey(at => new { at.AssetId, at.TagId });
                        j.Property(at => at.UpdatedAt).HasDefaultValueSql("now()");
                    });

            // Global Query Filter for Soft Delete (Archived Assets)
            entity.HasQueryFilter(a => a.Status != AssetStatus.Archived);
        });

        modelBuilder.Entity<AssetCategoriesConfig>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("asset_categories_config_pkey");

            entity.ToTable("asset_categories_config");

            entity.HasIndex(e => e.Name, "asset_categories_config_name_key").IsUnique();

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.IsActive)
                .HasDefaultValue(true)
                .HasColumnName("is_active");
            entity.Property(e => e.Name)
                .HasMaxLength(80)
                .HasColumnName("name");
        });

        modelBuilder.Entity<AssetComment>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("asset_comments_pkey");

            entity.ToTable("asset_comments");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.AssetId).HasColumnName("asset_id");
            entity.Property(e => e.AssetVersionId).HasColumnName("asset_version_id");
            entity.Property(e => e.AuthorId).HasColumnName("author_id");
            entity.Property(e => e.Body).HasColumnName("body");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.ParentCommentId).HasColumnName("parent_comment_id");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");
            entity.Property(e => e.StatusChangeTo)
                .HasColumnName("status_change_to")
                .HasColumnType("asset_status");

            entity.HasOne(d => d.Asset).WithMany(p => p.AssetComments)
                .HasForeignKey(d => d.AssetId)
                .HasConstraintName("asset_comments_asset_id_fkey");

            entity.HasOne(d => d.AssetVersion).WithMany(p => p.AssetComments)
                .HasForeignKey(d => d.AssetVersionId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("asset_comments_asset_version_id_fkey");

            entity.HasOne(d => d.Author).WithMany(p => p.AssetComments)
                .HasForeignKey(d => d.AuthorId)
                .HasConstraintName("asset_comments_author_id_fkey");

            entity.HasOne(d => d.ParentComment).WithMany(p => p.InverseParentComment)
                .HasForeignKey(d => d.ParentCommentId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("asset_comments_parent_comment_id_fkey");
        });

        modelBuilder.Entity<AssetTag>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("asset_tags_pkey");

            entity.ToTable("asset_tags");

            entity.HasIndex(e => e.Name, "asset_tags_name_key").IsUnique();

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.Name)
                .HasMaxLength(80)
                .HasColumnName("name");
        });

        modelBuilder.Entity<AssetVersion>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("asset_versions_pkey");

            entity.ToTable("asset_versions");

            entity.HasIndex(e => new { e.AssetId, e.VersionNumber }, "asset_versions_asset_id_version_number_key").IsUnique();

            entity.HasIndex(e => e.AssetId, "idx_asset_versions_asset");

            entity.HasIndex(e => e.UploadedBy, "idx_asset_versions_uploader");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.AssetId).HasColumnName("asset_id");
            entity.Property(e => e.DimensionsX)
                .HasPrecision(10, 4)
                .HasColumnName("dimensions_x");
            entity.Property(e => e.DimensionsY)
                .HasPrecision(10, 4)
                .HasColumnName("dimensions_y");
            entity.Property(e => e.DimensionsZ)
                .HasPrecision(10, 4)
                .HasColumnName("dimensions_z");
            entity.Property(e => e.ExtraMetadata)
                .HasColumnType("jsonb")
                .HasColumnName("extra_metadata");
            entity.Property(e => e.FileExtension)
                .HasMaxLength(20)
                .HasColumnName("file_extension");
            entity.Property(e => e.FileName)
                .HasMaxLength(255)
                .HasColumnName("file_name");
            entity.Property(e => e.FilePath).HasColumnName("file_path");
            entity.Property(e => e.FileSizeBytes).HasColumnName("file_size_bytes");
            entity.Property(e => e.MaterialCount).HasColumnName("material_count");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.PolygonCount).HasColumnName("polygon_count");
            entity.Property(e => e.ReviewNotes).HasColumnName("review_notes");
            entity.Property(e => e.ReviewedAt).HasColumnName("reviewed_at");
            entity.Property(e => e.ReviewedBy).HasColumnName("reviewed_by");
            entity.Property(e => e.Status)
                .HasColumnName("status")
                .HasColumnType("asset_status");
            entity.Property(e => e.TextureCount).HasColumnName("texture_count");
            entity.Property(e => e.ThumbnailPath).HasColumnName("thumbnail_path");
            entity.Property(e => e.UploadedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("uploaded_at");
            entity.Property(e => e.UploadedBy).HasColumnName("uploaded_by");
            entity.Property(e => e.VersionNumber).HasColumnName("version_number");

            entity.HasOne(d => d.Asset).WithMany(p => p.AssetVersions)
                .HasForeignKey(d => d.AssetId)
                .HasConstraintName("asset_versions_asset_id_fkey");

            entity.HasOne(d => d.ReviewedByNavigation).WithMany(p => p.AssetVersionReviewedByNavigations)
                .HasForeignKey(d => d.ReviewedBy)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("asset_versions_reviewed_by_fkey");

            entity.HasOne(d => d.UploadedByNavigation).WithMany(p => p.AssetVersionUploadedByNavigations)
                .HasForeignKey(d => d.UploadedBy)
                .HasConstraintName("asset_versions_uploaded_by_fkey");
        });

        modelBuilder.Entity<Client>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("clients_pkey");

            entity.ToTable("clients");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.Address).HasColumnName("address");
            entity.Property(e => e.CompanyName)
                .HasMaxLength(120)
                .HasColumnName("company_name");
            entity.Property(e => e.ContactName)
                .HasMaxLength(120)
                .HasColumnName("contact_name");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.Email)
                .HasMaxLength(255)
                .HasColumnName("email");
            entity.Property(e => e.IsActive)
                .HasDefaultValue(true)
                .HasColumnName("is_active");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.Phone)
                .HasMaxLength(30)
                .HasColumnName("phone");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.User).WithMany(p => p.Clients)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("clients_user_id_fkey");
        });

        modelBuilder.Entity<InquiryAttachment>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("inquiry_attachments_pkey");

            entity.ToTable("inquiry_attachments");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.FileName)
                .HasMaxLength(255)
                .HasColumnName("file_name");
            entity.Property(e => e.FilePath).HasColumnName("file_path");
            entity.Property(e => e.FileSizeBytes).HasColumnName("file_size_bytes");
            entity.Property(e => e.InquiryId).HasColumnName("inquiry_id");
            entity.Property(e => e.MimeType)
                .HasMaxLength(100)
                .HasColumnName("mime_type");
            entity.Property(e => e.UploadedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("uploaded_at");

            entity.HasOne(d => d.Inquiry).WithMany(p => p.InquiryAttachments)
                .HasForeignKey(d => d.InquiryId)
                .HasConstraintName("inquiry_attachments_inquiry_id_fkey");
        });

        modelBuilder.Entity<Milestone>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("milestones_pkey");

            entity.ToTable("milestones");

            entity.HasIndex(e => e.ProjectId, "idx_milestones_project");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.ClientApproved).HasColumnName("client_approved");
            entity.Property(e => e.ClientApprovedAt).HasColumnName("client_approved_at");
            entity.Property(e => e.ClientNotes).HasColumnName("client_notes");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.EndDate).HasColumnName("end_date");
            entity.Property(e => e.Name)
                .HasMaxLength(255)
                .HasColumnName("name");
            entity.Property(e => e.ProjectId).HasColumnName("project_id");
            entity.Property(e => e.SortOrder).HasColumnName("sort_order");
            entity.Property(e => e.StartDate).HasColumnName("start_date");
            entity.Property(e => e.Status)
                .HasColumnName("status")
                .HasColumnType("milestone_status");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Project).WithMany(p => p.Milestones)
                .HasForeignKey(d => d.ProjectId)
                .HasConstraintName("milestones_project_id_fkey");
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("notifications_pkey");

            entity.ToTable("notifications");

            entity.HasIndex(e => e.RecipientId, "idx_notifications_recipient");

            entity.HasIndex(e => e.RecipientId, "idx_notifications_unread").HasFilter("(is_read = false)");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.Body).HasColumnName("body");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.EntityId).HasColumnName("entity_id");
            entity.Property(e => e.EntityType)
                .HasColumnName("entity_type")
                .HasColumnType("activity_entity");
            entity.Property(e => e.IsRead).HasColumnName("is_read");
            entity.Property(e => e.ReadAt).HasColumnName("read_at");
            entity.Property(e => e.RecipientId).HasColumnName("recipient_id");
            entity.Property(e => e.SenderId).HasColumnName("sender_id");
            entity.Property(e => e.Title)
                .HasMaxLength(255)
                .HasColumnName("title");
            entity.Property(e => e.Type)
                .HasColumnName("type")
                .HasColumnType("notification_type");

            entity.HasOne(d => d.Recipient).WithMany(p => p.NotificationRecipients)
                .HasForeignKey(d => d.RecipientId)
                .HasConstraintName("notifications_recipient_id_fkey");

            entity.HasOne(d => d.Sender).WithMany(p => p.NotificationSenders)
                .HasForeignKey(d => d.SenderId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("notifications_sender_id_fkey");
        });

        modelBuilder.Entity<Project>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("projects_pkey");

            entity.ToTable("projects");

            entity.HasIndex(e => e.ClientId, "idx_projects_client");

            entity.HasIndex(e => e.ProjectManagerId, "idx_projects_pm");

            entity.HasIndex(e => e.Status, "idx_projects_status");

            entity.HasIndex(e => e.ProjectCode, "projects_project_code_key").IsUnique();

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.BudgetAmount)
                .HasPrecision(12, 2)
                .HasColumnName("budget_amount");
            entity.Property(e => e.ClientId).HasColumnName("client_id");
            entity.Property(e => e.CompletionPercent)
                .HasDefaultValue((short)0)
                .HasColumnName("completion_percent");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.Currency)
                .HasMaxLength(5)
                .HasDefaultValueSql("'INR'::character varying")
                .HasColumnName("currency");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.EndDate).HasColumnName("end_date");
            entity.Property(e => e.Name)
                .HasMaxLength(255)
                .HasColumnName("name");
            entity.Property(e => e.Priority)
                .HasColumnName("priority")
                .HasColumnType("priority_level");
            entity.Property(e => e.ProjectCode)
                .HasMaxLength(30)
                .HasColumnName("project_code");
            entity.Property(e => e.ProjectManagerId).HasColumnName("project_manager_id");
            entity.Property(e => e.ProjectType)
                .HasColumnName("project_type")
                .HasColumnType("project_type");
            entity.Property(e => e.StartDate).HasColumnName("start_date");
            entity.Property(e => e.Status)
                .HasColumnName("status")
                .HasColumnType("project_status");
            entity.Property(e => e.ThumbnailUrl).HasColumnName("thumbnail_url");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Client).WithMany(p => p.Projects)
                .HasForeignKey(d => d.ClientId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("projects_client_id_fkey");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.ProjectCreatedByNavigations)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("projects_created_by_fkey");

            entity.HasOne(d => d.ProjectManager).WithMany(p => p.ProjectProjectManagers)
                .HasForeignKey(d => d.ProjectManagerId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("projects_project_manager_id_fkey");
        });

        modelBuilder.Entity<ProjectInquiry>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("project_inquiries_pkey");

            entity.ToTable("project_inquiries");

            entity.HasIndex(e => e.Email, "idx_inquiries_email");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.AdditionalNotes).HasColumnName("additional_notes");
            entity.Property(e => e.ClientName)
                .HasMaxLength(120)
                .HasColumnName("client_name");
            entity.Property(e => e.CompanyName)
                .HasMaxLength(120)
                .HasColumnName("company_name");
            entity.Property(e => e.ConvertedProjectId).HasColumnName("converted_project_id");
            entity.Property(e => e.DesiredDeadline).HasColumnName("desired_deadline");
            entity.Property(e => e.Email)
                .HasMaxLength(255)
                .HasColumnName("email");
            entity.Property(e => e.IpAddress).HasColumnName("ip_address");
            entity.Property(e => e.Phone)
                .HasMaxLength(30)
                .HasColumnName("phone");
            entity.Property(e => e.ProjectDescription).HasColumnName("project_description");
            entity.Property(e => e.ProjectTitle)
                .HasMaxLength(255)
                .HasColumnName("project_title");
            entity.Property(e => e.ProjectType)
                .HasColumnName("project_type")
                .HasColumnType("project_type");
            entity.Property(e => e.ReviewedAt).HasColumnName("reviewed_at");
            entity.Property(e => e.ReviewedBy).HasColumnName("reviewed_by");
            entity.Property(e => e.Status)
                .HasColumnName("status")
                .HasColumnType("inquiry_status");
            entity.Property(e => e.SubmittedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("submitted_at");

            entity.HasOne(d => d.ReviewedByNavigation).WithMany(p => p.ProjectInquiries)
                .HasForeignKey(d => d.ReviewedBy)
                .HasConstraintName("project_inquiries_reviewed_by_fkey");
        });

        modelBuilder.Entity<ProjectMember>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("project_members_pkey");

            entity.ToTable("project_members");

            entity.HasIndex(e => e.ProjectId, "idx_project_members_proj");

            entity.HasIndex(e => e.UserId, "idx_project_members_user");

            entity.HasIndex(e => new { e.ProjectId, e.UserId }, "project_members_project_id_user_id_key").IsUnique();

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.AddedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("added_at");
            entity.Property(e => e.ProjectId).HasColumnName("project_id");
            entity.Property(e => e.RoleInProject)
                .HasMaxLength(60)
                .HasColumnName("role_in_project");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.Project).WithMany(p => p.ProjectMembers)
                .HasForeignKey(d => d.ProjectId)
                .HasConstraintName("project_members_project_id_fkey");

            entity.HasOne(d => d.User).WithMany(p => p.ProjectMembers)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("project_members_user_id_fkey");
        });

        modelBuilder.Entity<ProjectTypesConfig>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("project_types_config_pkey");

            entity.ToTable("project_types_config");

            entity.HasIndex(e => e.Name, "project_types_config_name_key").IsUnique();

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.IsActive)
                .HasDefaultValue(true)
                .HasColumnName("is_active");
            entity.Property(e => e.Name)
                .HasMaxLength(80)
                .HasColumnName("name");
        });

        modelBuilder.Entity<Quota>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("quotas_pkey");

            entity.ToTable("quotas");

            entity.HasIndex(e => new { e.ProjectId, e.UserId }, "idx_quotas_project_user");

            entity.HasIndex(e => new { e.ProjectId, e.UserId }, "quotas_project_id_user_id_key").IsUnique();

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.ProjectId).HasColumnName("project_id");
            entity.Property(e => e.SetBy).HasColumnName("set_by");
            entity.Property(e => e.TargetHoursPerDay)
                .HasPrecision(5, 2)
                .HasColumnName("target_hours_per_day");
            entity.Property(e => e.TargetTasksPerWeek).HasColumnName("target_tasks_per_week");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.Project).WithMany(p => p.Quota)
                .HasForeignKey(d => d.ProjectId)
                .HasConstraintName("quotas_project_id_fkey");

            entity.HasOne(d => d.SetByNavigation).WithMany(p => p.QuotaSetByNavigations)
                .HasForeignKey(d => d.SetBy)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("quotas_set_by_fkey");

            entity.HasOne(d => d.User).WithMany(p => p.QuotaUsers)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("quotas_user_id_fkey");
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("refresh_tokens_pkey");

            entity.ToTable("refresh_tokens");

            entity.HasIndex(e => e.UserId, "idx_refresh_tokens_user");

            entity.HasIndex(e => e.Token, "refresh_tokens_token_key").IsUnique();

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.ExpiresAt).HasColumnName("expires_at");
            entity.Property(e => e.Revoked).HasColumnName("revoked");
            entity.Property(e => e.Token).HasColumnName("token");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.User).WithMany(p => p.RefreshTokens)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("refresh_tokens_user_id_fkey");
        });

        modelBuilder.Entity<Models.Task>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("tasks_pkey");

            entity.ToTable("tasks");

            entity.HasIndex(e => e.AssignedTo, "idx_tasks_assigned");

            entity.HasIndex(e => e.DueDate, "idx_tasks_due_date");

            entity.HasIndex(e => e.MilestoneId, "idx_tasks_milestone");

            entity.HasIndex(e => e.ProjectId, "idx_tasks_project");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.AssignedTo).HasColumnName("assigned_to");
            entity.Property(e => e.CompletedAt).HasColumnName("completed_at");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.DueDate).HasColumnName("due_date");
            entity.Property(e => e.EstimatedHours)
                .HasPrecision(6, 2)
                .HasColumnName("estimated_hours");
            entity.Property(e => e.MilestoneId).HasColumnName("milestone_id");
            entity.Property(e => e.Priority)
                .HasColumnName("priority")
                .HasColumnType("priority_level");
            entity.Property(e => e.ProjectId).HasColumnName("project_id");
            entity.Property(e => e.StartedAt).HasColumnName("started_at");
            entity.Property(e => e.Status)
                .HasColumnName("status")
                .HasColumnType("task_status");
            entity.Property(e => e.StoryPoints).HasColumnName("story_points");
            entity.Property(e => e.Title)
                .HasMaxLength(255)
                .HasColumnName("title");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.AssignedToNavigation).WithMany(p => p.TaskAssignedToNavigations)
                .HasForeignKey(d => d.AssignedTo)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("tasks_assigned_to_fkey");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.TaskCreatedByNavigations)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("tasks_created_by_fkey");

            entity.HasOne(d => d.Milestone).WithMany(p => p.Tasks)
                .HasForeignKey(d => d.MilestoneId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("tasks_milestone_id_fkey");

            entity.HasOne(d => d.Project).WithMany(p => p.Tasks)
                .HasForeignKey(d => d.ProjectId)
                .HasConstraintName("tasks_project_id_fkey");
        });

        modelBuilder.Entity<TaskAttachment>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("task_attachments_pkey");

            entity.ToTable("task_attachments");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.FileName)
                .HasMaxLength(255)
                .HasColumnName("file_name");
            entity.Property(e => e.FilePath).HasColumnName("file_path");
            entity.Property(e => e.FileSizeBytes).HasColumnName("file_size_bytes");
            entity.Property(e => e.MimeType)
                .HasMaxLength(100)
                .HasColumnName("mime_type");
            entity.Property(e => e.TaskId).HasColumnName("task_id");
            entity.Property(e => e.UploadedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("uploaded_at");
            entity.Property(e => e.UploadedBy).HasColumnName("uploaded_by");

            entity.HasOne(d => d.Task).WithMany(p => p.TaskAttachments)
                .HasForeignKey(d => d.TaskId)
                .HasConstraintName("task_attachments_task_id_fkey");

            entity.HasOne(d => d.UploadedByNavigation).WithMany(p => p.TaskAttachments)
                .HasForeignKey(d => d.UploadedBy)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("task_attachments_uploaded_by_fkey");
        });

        modelBuilder.Entity<TaskComment>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("task_comments_pkey");

            entity.ToTable("task_comments");

            entity.HasIndex(e => e.TaskId, "idx_task_comments_task");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.AuthorId).HasColumnName("author_id");
            entity.Property(e => e.Body).HasColumnName("body");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.ParentCommentId).HasColumnName("parent_comment_id");
            entity.Property(e => e.TaskId).HasColumnName("task_id");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");
            entity.Property(e => e.StatusChangeTo)
                .HasColumnName("status_change_to")
                .HasColumnType("task_status");

            entity.HasOne(d => d.Author).WithMany(p => p.TaskComments)
                .HasForeignKey(d => d.AuthorId)
                .HasConstraintName("task_comments_author_id_fkey");

            entity.HasOne(d => d.ParentComment).WithMany(p => p.InverseParentComment)
                .HasForeignKey(d => d.ParentCommentId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("task_comments_parent_comment_id_fkey");

            entity.HasOne(d => d.Task).WithMany(p => p.TaskComments)
                .HasForeignKey(d => d.TaskId)
                .HasConstraintName("task_comments_task_id_fkey");
        });

        modelBuilder.Entity<TimeEntry>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("time_entries_pkey");

            entity.ToTable("time_entries");

            entity.HasIndex(e => e.Date, "idx_time_entries_date");

            entity.HasIndex(e => e.ProjectId, "idx_time_entries_project");

            entity.HasIndex(e => e.TaskId, "idx_time_entries_task");

            entity.HasIndex(e => e.UserId, "idx_time_entries_user");

            entity.HasIndex(e => new { e.TaskId, e.UserId, e.Date }, "time_entries_task_id_user_id_date_key").IsUnique();

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.Date).HasColumnName("date");
            entity.Property(e => e.Hours)
                .HasPrecision(5, 2)
                .HasColumnName("hours");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.ProjectId).HasColumnName("project_id");
            entity.Property(e => e.TaskId).HasColumnName("task_id");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.Project).WithMany(p => p.TimeEntries)
                .HasForeignKey(d => d.ProjectId)
                .HasConstraintName("time_entries_project_id_fkey");

            entity.HasOne(d => d.Task).WithMany(p => p.TimeEntries)
                .HasForeignKey(d => d.TaskId)
                .HasConstraintName("time_entries_task_id_fkey");

            entity.HasOne(d => d.User).WithMany(p => p.TimeEntries)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("time_entries_user_id_fkey");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("users_pkey");

            entity.ToTable("users");

            entity.HasIndex(e => e.Email, "idx_users_email");

            entity.HasIndex(e => e.Email, "users_email_key").IsUnique();

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.AvatarUrl).HasColumnName("avatar_url");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.Email)
                .HasMaxLength(255)
                .HasColumnName("email");
            entity.Property(e => e.IsActive)
                .HasDefaultValue(true)
                .HasColumnName("is_active");
            entity.Property(e => e.LastLoginAt).HasColumnName("last_login_at");
            entity.Property(e => e.Name)
                .HasMaxLength(120)
                .HasColumnName("name");
            entity.Property(e => e.PasswordHash).HasColumnName("password_hash");
            entity.Property(e => e.Phone)
                .HasMaxLength(30)
                .HasColumnName("phone");
            entity.Property(e => e.Role)
                .HasColumnName("role")
                .HasColumnType("user_role");
            entity.Property(e => e.Timezone)
                .HasMaxLength(60)
                .HasDefaultValueSql("'Asia/Kolkata'::character varying")
                .HasColumnName("timezone");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}