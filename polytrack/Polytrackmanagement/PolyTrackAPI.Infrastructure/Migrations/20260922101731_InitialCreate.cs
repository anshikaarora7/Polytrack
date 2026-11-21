using System;
using System.Net;
using Microsoft.EntityFrameworkCore.Migrations;
using PolyTrackAPI.Infrastructure.Models;
using TaskStatus = PolyTrackAPI.Infrastructure.Models.TaskStatus;

#nullable disable

namespace PolyTrackAPI.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:Enum:activity_entity", "project,task,asset,asset_version,milestone,comment,user")
                .Annotation("Npgsql:Enum:asset_category", "character,environment,prop,texture,material,animation,audio,vfx")
                .Annotation("Npgsql:Enum:asset_status", "draft,submitted,review,approved,rejected,archived")
                .Annotation("Npgsql:Enum:budget_range", "under_500,500_2000,2000_5000,5000_plus")
                .Annotation("Npgsql:Enum:inquiry_status", "new,reviewed,converted,rejected")
                .Annotation("Npgsql:Enum:milestone_status", "pending,in_progress,completed,rejected")
                .Annotation("Npgsql:Enum:notification_type", "task_assigned,task_due,task_status_changed,asset_approved,asset_rejected,asset_submitted,comment_added,project_updated,milestone_approved,milestone_rejected")
                .Annotation("Npgsql:Enum:priority_level", "low,normal,high,critical")
                .Annotation("Npgsql:Enum:project_status", "draft,planning,active,review,on_hold,completed,cancelled")
                .Annotation("Npgsql:Enum:project_type", "character,environment,props,animation,vfx,product_visualization,architectural_visualization,other")
                .Annotation("Npgsql:Enum:task_status", "new,assigned,in_progress,review,approved,rejected,done")
                .Annotation("Npgsql:Enum:user_role", "admin,project_manager,artist,reviewer,client")
                .Annotation("Npgsql:PostgresExtension:pgcrypto", ",,");

            migrationBuilder.CreateTable(
                name: "asset_categories_config",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    name = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("asset_categories_config_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "asset_tags",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    name = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("asset_tags_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "project_types_config",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    name = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("project_types_config_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    password_hash = table.Column<string>(type: "text", nullable: false),
                    avatar_url = table.Column<string>(type: "text", nullable: true),
                    phone = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    timezone = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: true, defaultValueSql: "'Asia/Kolkata'::character varying"),
                    role = table.Column<UserRole>(type: "user_role", nullable: true),
                    last_login_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("users_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "clients",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    company_name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    contact_name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    phone = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    address = table.Column<string>(type: "text", nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("clients_pkey", x => x.id);
                    table.ForeignKey(
                        name: "clients_user_id_fkey",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "notifications",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    recipient_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sender_id = table.Column<Guid>(type: "uuid", nullable: true),
                    type = table.Column<NotificationType>(type: "notification_type", nullable: false),
                    title = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    body = table.Column<string>(type: "text", nullable: true),
                    entity_type = table.Column<ActivityEntity>(type: "activity_entity", nullable: true),
                    entity_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_read = table.Column<bool>(type: "boolean", nullable: false),
                    read_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("notifications_pkey", x => x.id);
                    table.ForeignKey(
                        name: "notifications_recipient_id_fkey",
                        column: x => x.recipient_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "notifications_sender_id_fkey",
                        column: x => x.sender_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "project_inquiries",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    client_name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    company_name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    phone = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    project_title = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    project_description = table.Column<string>(type: "text", nullable: false),
                    project_type = table.Column<ProjectType>(type: "project_type", nullable: true),
                    budget_range = table.Column<BudgetRange>(type: "budget_range", nullable: true),
                    status = table.Column<InquiryStatus>(type: "inquiry_status", nullable: false),
                    desired_deadline = table.Column<DateOnly>(type: "date", nullable: true),
                    additional_notes = table.Column<string>(type: "text", nullable: true),
                    reviewed_by = table.Column<Guid>(type: "uuid", nullable: true),
                    reviewed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    converted_project_id = table.Column<Guid>(type: "uuid", nullable: true),
                    submitted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    ip_address = table.Column<IPAddress>(type: "inet", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("project_inquiries_pkey", x => x.id);
                    table.ForeignKey(
                        name: "project_inquiries_reviewed_by_fkey",
                        column: x => x.reviewed_by,
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "refresh_tokens",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    token = table.Column<string>(type: "text", nullable: false),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    revoked = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("refresh_tokens_pkey", x => x.id);
                    table.ForeignKey(
                        name: "refresh_tokens_user_id_fkey",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "projects",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    project_code = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    client_id = table.Column<Guid>(type: "uuid", nullable: true),
                    project_manager_id = table.Column<Guid>(type: "uuid", nullable: true),
                    start_date = table.Column<DateOnly>(type: "date", nullable: true),
                    end_date = table.Column<DateOnly>(type: "date", nullable: true),
                    budget_amount = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    currency = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: true, defaultValueSql: "'INR'::character varying"),
                    completion_percent = table.Column<short>(type: "smallint", nullable: false, defaultValue: (short)0),
                    status = table.Column<ProjectStatus>(type: "project_status", nullable: false),
                    priority = table.Column<PriorityLevel>(type: "priority_level", nullable: false),
                    project_type = table.Column<ProjectType>(type: "project_type", nullable: true),
                    thumbnail_url = table.Column<string>(type: "text", nullable: true),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("projects_pkey", x => x.id);
                    table.ForeignKey(
                        name: "projects_client_id_fkey",
                        column: x => x.client_id,
                        principalTable: "clients",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "projects_created_by_fkey",
                        column: x => x.created_by,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "projects_project_manager_id_fkey",
                        column: x => x.project_manager_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "inquiry_attachments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    inquiry_id = table.Column<Guid>(type: "uuid", nullable: false),
                    file_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    file_path = table.Column<string>(type: "text", nullable: false),
                    file_size_bytes = table.Column<long>(type: "bigint", nullable: true),
                    mime_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    uploaded_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("inquiry_attachments_pkey", x => x.id);
                    table.ForeignKey(
                        name: "inquiry_attachments_inquiry_id_fkey",
                        column: x => x.inquiry_id,
                        principalTable: "project_inquiries",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "activity_feed",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    project_id = table.Column<Guid>(type: "uuid", nullable: true),
                    actor_id = table.Column<Guid>(type: "uuid", nullable: true),
                    entity_id = table.Column<Guid>(type: "uuid", nullable: false),
                    entity_type = table.Column<ActivityEntity>(type: "activity_entity", nullable: false),
                    action = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    meta = table.Column<string>(type: "jsonb", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("activity_feed_pkey", x => x.id);
                    table.ForeignKey(
                        name: "activity_feed_actor_id_fkey",
                        column: x => x.actor_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "activity_feed_project_id_fkey",
                        column: x => x.project_id,
                        principalTable: "projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "milestones",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    sort_order = table.Column<short>(type: "smallint", nullable: false),
                    status = table.Column<MilestoneStatus>(type: "milestone_status", nullable: false),
                    start_date = table.Column<DateOnly>(type: "date", nullable: true),
                    end_date = table.Column<DateOnly>(type: "date", nullable: true),
                    client_approved = table.Column<bool>(type: "boolean", nullable: true),
                    client_approved_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    client_notes = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("milestones_pkey", x => x.id);
                    table.ForeignKey(
                        name: "milestones_project_id_fkey",
                        column: x => x.project_id,
                        principalTable: "projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "project_members",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    role_in_project = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: true),
                    added_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("project_members_pkey", x => x.id);
                    table.ForeignKey(
                        name: "project_members_project_id_fkey",
                        column: x => x.project_id,
                        principalTable: "projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "project_members_user_id_fkey",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "quotas",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    target_hours_per_day = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: true),
                    target_tasks_per_week = table.Column<short>(type: "smallint", nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true),
                    set_by = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("quotas_pkey", x => x.id);
                    table.ForeignKey(
                        name: "quotas_project_id_fkey",
                        column: x => x.project_id,
                        principalTable: "projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "quotas_set_by_fkey",
                        column: x => x.set_by,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "quotas_user_id_fkey",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tasks",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    milestone_id = table.Column<Guid>(type: "uuid", nullable: true),
                    title = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    assigned_to = table.Column<Guid>(type: "uuid", nullable: true),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    status = table.Column<TaskStatus>(type: "task_status", nullable: false),
                    priority = table.Column<PriorityLevel>(type: "priority_level", nullable: false),
                    story_points = table.Column<short>(type: "smallint", nullable: true),
                    estimated_hours = table.Column<decimal>(type: "numeric(6,2)", precision: 6, scale: 2, nullable: true),
                    due_date = table.Column<DateOnly>(type: "date", nullable: true),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("tasks_pkey", x => x.id);
                    table.ForeignKey(
                        name: "tasks_assigned_to_fkey",
                        column: x => x.assigned_to,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "tasks_created_by_fkey",
                        column: x => x.created_by,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "tasks_milestone_id_fkey",
                        column: x => x.milestone_id,
                        principalTable: "milestones",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "tasks_project_id_fkey",
                        column: x => x.project_id,
                        principalTable: "projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "task_attachments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    task_id = table.Column<Guid>(type: "uuid", nullable: false),
                    uploaded_by = table.Column<Guid>(type: "uuid", nullable: true),
                    file_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    file_path = table.Column<string>(type: "text", nullable: false),
                    file_size_bytes = table.Column<long>(type: "bigint", nullable: true),
                    mime_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    uploaded_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("task_attachments_pkey", x => x.id);
                    table.ForeignKey(
                        name: "task_attachments_task_id_fkey",
                        column: x => x.task_id,
                        principalTable: "tasks",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "task_attachments_uploaded_by_fkey",
                        column: x => x.uploaded_by,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "task_comments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    task_id = table.Column<Guid>(type: "uuid", nullable: false),
                    parent_comment_id = table.Column<Guid>(type: "uuid", nullable: true),
                    author_id = table.Column<Guid>(type: "uuid", nullable: false),
                    body = table.Column<string>(type: "text", nullable: false),
                    status_change_to = table.Column<TaskStatus>(type: "task_status", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("task_comments_pkey", x => x.id);
                    table.ForeignKey(
                        name: "task_comments_author_id_fkey",
                        column: x => x.author_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "task_comments_parent_comment_id_fkey",
                        column: x => x.parent_comment_id,
                        principalTable: "task_comments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "task_comments_task_id_fkey",
                        column: x => x.task_id,
                        principalTable: "tasks",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "time_entries",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    task_id = table.Column<Guid>(type: "uuid", nullable: false),
                    project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    date = table.Column<DateOnly>(type: "date", nullable: false),
                    hours = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("time_entries_pkey", x => x.id);
                    table.ForeignKey(
                        name: "time_entries_project_id_fkey",
                        column: x => x.project_id,
                        principalTable: "projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "time_entries_task_id_fkey",
                        column: x => x.task_id,
                        principalTable: "tasks",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "time_entries_user_id_fkey",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "asset_comments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    asset_id = table.Column<Guid>(type: "uuid", nullable: false),
                    asset_version_id = table.Column<Guid>(type: "uuid", nullable: true),
                    parent_comment_id = table.Column<Guid>(type: "uuid", nullable: true),
                    status_change_to = table.Column<AssetStatus>(type: "asset_status", nullable: true),
                    author_id = table.Column<Guid>(type: "uuid", nullable: false),
                    body = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("asset_comments_pkey", x => x.id);
                    table.ForeignKey(
                        name: "asset_comments_author_id_fkey",
                        column: x => x.author_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "asset_comments_parent_comment_id_fkey",
                        column: x => x.parent_comment_id,
                        principalTable: "asset_comments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "asset_tag_maps",
                columns: table => new
                {
                    asset_id = table.Column<Guid>(type: "uuid", nullable: false),
                    tag_id = table.Column<Guid>(type: "uuid", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_asset_tag_maps", x => new { x.asset_id, x.tag_id });
                    table.ForeignKey(
                        name: "fk_asset_tag_maps_asset_tags_tag_id",
                        column: x => x.tag_id,
                        principalTable: "asset_tags",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "asset_versions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    asset_id = table.Column<Guid>(type: "uuid", nullable: false),
                    version_number = table.Column<short>(type: "smallint", nullable: false),
                    file_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    file_path = table.Column<string>(type: "text", nullable: false),
                    file_size_bytes = table.Column<long>(type: "bigint", nullable: true),
                    file_extension = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    thumbnail_path = table.Column<string>(type: "text", nullable: true),
                    polygon_count = table.Column<int>(type: "integer", nullable: true),
                    material_count = table.Column<short>(type: "smallint", nullable: true),
                    texture_count = table.Column<short>(type: "smallint", nullable: true),
                    dimensions_x = table.Column<decimal>(type: "numeric(10,4)", precision: 10, scale: 4, nullable: true),
                    dimensions_y = table.Column<decimal>(type: "numeric(10,4)", precision: 10, scale: 4, nullable: true),
                    dimensions_z = table.Column<decimal>(type: "numeric(10,4)", precision: 10, scale: 4, nullable: true),
                    extra_metadata = table.Column<string>(type: "jsonb", nullable: true),
                    uploaded_by = table.Column<Guid>(type: "uuid", nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
                    reviewed_by = table.Column<Guid>(type: "uuid", nullable: true),
                    reviewed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    review_notes = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<AssetStatus>(type: "asset_status", nullable: false),
                    uploaded_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("asset_versions_pkey", x => x.id);
                    table.ForeignKey(
                        name: "asset_versions_reviewed_by_fkey",
                        column: x => x.reviewed_by,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "asset_versions_uploaded_by_fkey",
                        column: x => x.uploaded_by,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "assets",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    category = table.Column<AssetCategory>(type: "asset_category", nullable: false),
                    status = table.Column<AssetStatus>(type: "asset_status", nullable: false),
                    current_version_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    linked_task_id = table.Column<Guid>(type: "uuid", nullable: true),
                    thumbnail_url = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("assets_pkey", x => x.id);
                    table.ForeignKey(
                        name: "assets_created_by_fkey",
                        column: x => x.created_by,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "assets_linked_task_id_fkey",
                        column: x => x.linked_task_id,
                        principalTable: "tasks",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "assets_project_id_fkey",
                        column: x => x.project_id,
                        principalTable: "projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_assets_current_version",
                        column: x => x.current_version_id,
                        principalTable: "asset_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "ix_activity_feed_actor_id",
                table: "activity_feed",
                column: "actor_id");

            migrationBuilder.CreateIndex(
                name: "ix_activity_feed_created_at",
                table: "activity_feed",
                column: "created_at",
                descending: new bool[0]);

            migrationBuilder.CreateIndex(
                name: "ix_activity_feed_project_id",
                table: "activity_feed",
                column: "project_id");

            migrationBuilder.CreateIndex(
                name: "ix_asset_categories_config_name",
                table: "asset_categories_config",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_asset_comments_asset_id",
                table: "asset_comments",
                column: "asset_id");

            migrationBuilder.CreateIndex(
                name: "ix_asset_comments_asset_version_id",
                table: "asset_comments",
                column: "asset_version_id");

            migrationBuilder.CreateIndex(
                name: "ix_asset_comments_author_id",
                table: "asset_comments",
                column: "author_id");

            migrationBuilder.CreateIndex(
                name: "ix_asset_comments_parent_comment_id",
                table: "asset_comments",
                column: "parent_comment_id");

            migrationBuilder.CreateIndex(
                name: "ix_asset_tag_maps_tag_id",
                table: "asset_tag_maps",
                column: "tag_id");

            migrationBuilder.CreateIndex(
                name: "ix_asset_tags_name",
                table: "asset_tags",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_asset_versions_asset_id",
                table: "asset_versions",
                column: "asset_id");

            migrationBuilder.CreateIndex(
                name: "ix_asset_versions_asset_id_version_number",
                table: "asset_versions",
                columns: new[] { "asset_id", "version_number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_asset_versions_reviewed_by",
                table: "asset_versions",
                column: "reviewed_by");

            migrationBuilder.CreateIndex(
                name: "ix_asset_versions_uploaded_by",
                table: "asset_versions",
                column: "uploaded_by");

            migrationBuilder.CreateIndex(
                name: "ix_assets_created_by",
                table: "assets",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "ix_assets_current_version_id",
                table: "assets",
                column: "current_version_id");

            migrationBuilder.CreateIndex(
                name: "ix_assets_linked_task_id",
                table: "assets",
                column: "linked_task_id");

            migrationBuilder.CreateIndex(
                name: "ix_assets_project_id",
                table: "assets",
                column: "project_id");

            migrationBuilder.CreateIndex(
                name: "ix_clients_user_id",
                table: "clients",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_inquiry_attachments_inquiry_id",
                table: "inquiry_attachments",
                column: "inquiry_id");

            migrationBuilder.CreateIndex(
                name: "ix_milestones_project_id",
                table: "milestones",
                column: "project_id");

            migrationBuilder.CreateIndex(
                name: "ix_notifications_recipient_id",
                table: "notifications",
                column: "recipient_id");

            migrationBuilder.CreateIndex(
                name: "ix_notifications_recipient_id1",
                table: "notifications",
                column: "recipient_id",
                filter: "(is_read = false)");

            migrationBuilder.CreateIndex(
                name: "ix_notifications_sender_id",
                table: "notifications",
                column: "sender_id");

            migrationBuilder.CreateIndex(
                name: "ix_project_inquiries_email",
                table: "project_inquiries",
                column: "email");

            migrationBuilder.CreateIndex(
                name: "ix_project_inquiries_reviewed_by",
                table: "project_inquiries",
                column: "reviewed_by");

            migrationBuilder.CreateIndex(
                name: "ix_project_members_project_id",
                table: "project_members",
                column: "project_id");

            migrationBuilder.CreateIndex(
                name: "ix_project_members_project_id_user_id",
                table: "project_members",
                columns: new[] { "project_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_project_members_user_id",
                table: "project_members",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_project_types_config_name",
                table: "project_types_config",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_projects_client_id",
                table: "projects",
                column: "client_id");

            migrationBuilder.CreateIndex(
                name: "ix_projects_created_by",
                table: "projects",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "ix_projects_project_code",
                table: "projects",
                column: "project_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_projects_project_manager_id",
                table: "projects",
                column: "project_manager_id");

            migrationBuilder.CreateIndex(
                name: "ix_projects_status",
                table: "projects",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "ix_quotas_project_id_user_id",
                table: "quotas",
                columns: new[] { "project_id", "user_id" });

            migrationBuilder.CreateIndex(
                name: "ix_quotas_project_id_user_id1",
                table: "quotas",
                columns: new[] { "project_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_quotas_set_by",
                table: "quotas",
                column: "set_by");

            migrationBuilder.CreateIndex(
                name: "ix_quotas_user_id",
                table: "quotas",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_refresh_tokens_token",
                table: "refresh_tokens",
                column: "token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_refresh_tokens_user_id",
                table: "refresh_tokens",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_task_attachments_task_id",
                table: "task_attachments",
                column: "task_id");

            migrationBuilder.CreateIndex(
                name: "ix_task_attachments_uploaded_by",
                table: "task_attachments",
                column: "uploaded_by");

            migrationBuilder.CreateIndex(
                name: "ix_task_comments_author_id",
                table: "task_comments",
                column: "author_id");

            migrationBuilder.CreateIndex(
                name: "ix_task_comments_parent_comment_id",
                table: "task_comments",
                column: "parent_comment_id");

            migrationBuilder.CreateIndex(
                name: "ix_task_comments_task_id",
                table: "task_comments",
                column: "task_id");

            migrationBuilder.CreateIndex(
                name: "ix_tasks_assigned_to",
                table: "tasks",
                column: "assigned_to");

            migrationBuilder.CreateIndex(
                name: "ix_tasks_created_by",
                table: "tasks",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "ix_tasks_due_date",
                table: "tasks",
                column: "due_date");

            migrationBuilder.CreateIndex(
                name: "ix_tasks_milestone_id",
                table: "tasks",
                column: "milestone_id");

            migrationBuilder.CreateIndex(
                name: "ix_tasks_project_id",
                table: "tasks",
                column: "project_id");

            migrationBuilder.CreateIndex(
                name: "ix_time_entries_date",
                table: "time_entries",
                column: "date");

            migrationBuilder.CreateIndex(
                name: "ix_time_entries_project_id",
                table: "time_entries",
                column: "project_id");

            migrationBuilder.CreateIndex(
                name: "ix_time_entries_task_id",
                table: "time_entries",
                column: "task_id");

            migrationBuilder.CreateIndex(
                name: "ix_time_entries_task_id_user_id_date",
                table: "time_entries",
                columns: new[] { "task_id", "user_id", "date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_time_entries_user_id",
                table: "time_entries",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_users_email",
                table: "users",
                column: "email");

            migrationBuilder.CreateIndex(
                name: "ix_users_email1",
                table: "users",
                column: "email",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "asset_comments_asset_id_fkey",
                table: "asset_comments",
                column: "asset_id",
                principalTable: "assets",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "asset_comments_asset_version_id_fkey",
                table: "asset_comments",
                column: "asset_version_id",
                principalTable: "asset_versions",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_asset_tag_maps_assets_asset_id",
                table: "asset_tag_maps",
                column: "asset_id",
                principalTable: "assets",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "asset_versions_asset_id_fkey",
                table: "asset_versions",
                column: "asset_id",
                principalTable: "assets",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "asset_versions_reviewed_by_fkey",
                table: "asset_versions");

            migrationBuilder.DropForeignKey(
                name: "asset_versions_uploaded_by_fkey",
                table: "asset_versions");

            migrationBuilder.DropForeignKey(
                name: "assets_created_by_fkey",
                table: "assets");

            migrationBuilder.DropForeignKey(
                name: "clients_user_id_fkey",
                table: "clients");

            migrationBuilder.DropForeignKey(
                name: "projects_created_by_fkey",
                table: "projects");

            migrationBuilder.DropForeignKey(
                name: "projects_project_manager_id_fkey",
                table: "projects");

            migrationBuilder.DropForeignKey(
                name: "tasks_assigned_to_fkey",
                table: "tasks");

            migrationBuilder.DropForeignKey(
                name: "tasks_created_by_fkey",
                table: "tasks");

            migrationBuilder.DropForeignKey(
                name: "assets_project_id_fkey",
                table: "assets");

            migrationBuilder.DropForeignKey(
                name: "milestones_project_id_fkey",
                table: "milestones");

            migrationBuilder.DropForeignKey(
                name: "tasks_project_id_fkey",
                table: "tasks");

            migrationBuilder.DropForeignKey(
                name: "asset_versions_asset_id_fkey",
                table: "asset_versions");

            migrationBuilder.DropTable(
                name: "activity_feed");

            migrationBuilder.DropTable(
                name: "asset_categories_config");

            migrationBuilder.DropTable(
                name: "asset_comments");

            migrationBuilder.DropTable(
                name: "asset_tag_maps");

            migrationBuilder.DropTable(
                name: "inquiry_attachments");

            migrationBuilder.DropTable(
                name: "notifications");

            migrationBuilder.DropTable(
                name: "project_members");

            migrationBuilder.DropTable(
                name: "project_types_config");

            migrationBuilder.DropTable(
                name: "quotas");

            migrationBuilder.DropTable(
                name: "refresh_tokens");

            migrationBuilder.DropTable(
                name: "task_attachments");

            migrationBuilder.DropTable(
                name: "task_comments");

            migrationBuilder.DropTable(
                name: "time_entries");

            migrationBuilder.DropTable(
                name: "asset_tags");

            migrationBuilder.DropTable(
                name: "project_inquiries");

            migrationBuilder.DropTable(
                name: "users");

            migrationBuilder.DropTable(
                name: "projects");

            migrationBuilder.DropTable(
                name: "clients");

            migrationBuilder.DropTable(
                name: "assets");

            migrationBuilder.DropTable(
                name: "tasks");

            migrationBuilder.DropTable(
                name: "asset_versions");

            migrationBuilder.DropTable(
                name: "milestones");
        }
    }
}

