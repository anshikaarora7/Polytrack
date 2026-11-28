using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.OData;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PolyTrackAPI.Core.Constants;
using PolyTrackAPI.Core.Interfaces;
using PolyTrackAPI.Hubs;
using PolyTrackAPI.Infrastructure.Data;
using PolyTrackAPI.Infrastructure.Models;
using PolyTrackAPI.Infrastructure.Services;
using PolyTrackAPI.Middleware;
using System.Text;
using Npgsql.NameTranslation;
using EFCore.NamingConventions;
using Npgsql;
using Microsoft.AspNetCore.DataProtection;

var builder = WebApplication.CreateBuilder(args);

// Ensure default listening port is 5030 (or $PORT in cloud environments like Render/Railway)
var httpPort = Environment.GetEnvironmentVariable("PORT") ?? "5030";
builder.WebHost.UseUrls($"http://*:{httpPort}");

builder.Logging.ClearProviders();
builder.Logging.AddConsole();

// ── Data Protection Keys Directory ────────────────────────────
var dataProtectionPath = Path.Combine(builder.Environment.ContentRootPath, ".aspnet-data-protection-keys");
try
{
    Directory.CreateDirectory(dataProtectionPath);
}
catch { }
builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(dataProtectionPath));

// ── Database Configuration & Connection Parsing ─────────────── 
var connectionString = ResolveConnectionString(builder.Configuration);

var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);
var translator = new NpgsqlSnakeCaseNameTranslator();

dataSourceBuilder.EnableUnmappedTypes();
dataSourceBuilder.MapEnum<UserRole>("user_role", translator);
dataSourceBuilder.MapEnum<ProjectStatus>("project_status", translator);
dataSourceBuilder.MapEnum<ProjectType>("project_type", translator);
dataSourceBuilder.MapEnum<PriorityLevel>("priority_level", translator);
dataSourceBuilder.MapEnum<PolyTrackAPI.Infrastructure.Models.TaskStatus>("task_status", translator);
dataSourceBuilder.MapEnum<AssetStatus>("asset_status", translator);
dataSourceBuilder.MapEnum<AssetCategory>("asset_category", translator);
dataSourceBuilder.MapEnum<MilestoneStatus>("milestone_status", translator);
dataSourceBuilder.MapEnum<InquiryStatus>("inquiry_status", translator);
dataSourceBuilder.MapEnum<BudgetRange>("budget_range", translator);
dataSourceBuilder.MapEnum<NotificationType>("notification_type", translator);
dataSourceBuilder.MapEnum<ActivityEntity>("activity_entity", translator);

var dataSource = dataSourceBuilder.Build();

builder.Services.AddDbContext<StudioDbContext>(options =>
    options.UseNpgsql(dataSource, npgsqlOptions => npgsqlOptions
            .MapEnum<UserRole>("user_role")
            .MapEnum<ProjectStatus>("project_status")
            .MapEnum<ProjectType>("project_type")
            .MapEnum<PriorityLevel>("priority_level")
            .MapEnum<PolyTrackAPI.Infrastructure.Models.TaskStatus>("task_status")
            .MapEnum<AssetStatus>("asset_status")
            .MapEnum<AssetCategory>("asset_category")
            .MapEnum<MilestoneStatus>("milestone_status")
            .MapEnum<InquiryStatus>("inquiry_status")
            .MapEnum<BudgetRange>("budget_range")
            .MapEnum<NotificationType>("notification_type")
            .MapEnum<ActivityEntity>("activity_entity"))
           .UseSnakeCaseNamingConvention());

// ── File Storage Service: S3 Cloud Provider with Local Disk Fallback ──
var s3Bucket = builder.Configuration["FileStorage:S3:BucketName"]
    ?? Environment.GetEnvironmentVariable("S3_BUCKET_NAME")
    ?? Environment.GetEnvironmentVariable("AWS_S3_BUCKET_NAME");

var s3AccessKey = builder.Configuration["FileStorage:S3:AccessKey"]
    ?? Environment.GetEnvironmentVariable("S3_ACCESS_KEY")
    ?? Environment.GetEnvironmentVariable("AWS_ACCESS_KEY_ID");

if (!string.IsNullOrWhiteSpace(s3Bucket) && !string.IsNullOrWhiteSpace(s3AccessKey))
{
    Console.WriteLine($"☁️  Using S3-compatible cloud storage provider (Bucket: {s3Bucket})");
    builder.Services.AddSingleton<IFileStorageService, S3FileStorageService>();
}
else
{
    Console.WriteLine("💾 Using local filesystem storage provider (studio-storage)");
    builder.Services.AddSingleton<IFileStorageService, LocalFileStorageService>();
}

// ── Project & RBAC Authorization Service ──────────────────────
builder.Services.AddScoped<IProjectAuthorizationService, ProjectAuthorizationService>();

// ── JWT Authentication ──────────────────────────────────────── 
var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET")
    ?? Environment.GetEnvironmentVariable("JWT_SECRET_KEY")
    ?? builder.Configuration["JwtSettings:SecretKey"]
    ?? "your-super-secret-key-min-32-characters-long-12345";
builder.Configuration["JwtSettings:SecretKey"] = jwtSecret;

var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER")
    ?? builder.Configuration["JwtSettings:Issuer"]
    ?? "PolyTrackAPI";
builder.Configuration["JwtSettings:Issuer"] = jwtIssuer;

var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE")
    ?? builder.Configuration["JwtSettings:Audience"]
    ?? "PolyTrackClients";
builder.Configuration["JwtSettings:Audience"] = jwtAudience;

var jwtExpMinutes = Environment.GetEnvironmentVariable("JWT_EXPIRATION_MINUTES")
    ?? builder.Configuration["JwtSettings:ExpirationMinutes"]
    ?? "60";
builder.Configuration["JwtSettings:ExpirationMinutes"] = jwtExpMinutes;

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
    };

    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }
            return System.Threading.Tasks.Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("RequireAdmin", policy => policy.RequireRole(Roles.Admin));
    options.AddPolicy("RequireProjectManager", policy => policy.RequireRole(Roles.Admin, Roles.ProjectManager, Roles.StudioLead, "admin", "projectmanager", "studiolead"));
    options.AddPolicy("RequireStudioLead", policy => policy.RequireRole(Roles.Admin, Roles.ProjectManager, Roles.StudioLead, "admin", "projectmanager", "studiolead"));
    options.AddPolicy("RequireArtist", policy => policy.RequireRole(Roles.Admin, Roles.ProjectManager, Roles.StudioLead, Roles.Artist, "admin", "projectmanager", "studiolead", "artist"));
    options.AddPolicy("RequireReviewer", policy => policy.RequireRole(Roles.Admin, Roles.ProjectManager, Roles.StudioLead, Roles.Reviewer, "admin", "projectmanager", "studiolead", "reviewer"));
    options.AddPolicy("RequireInternal", policy => policy.RequireRole(Roles.Admin, Roles.ProjectManager, Roles.StudioLead, Roles.Artist, Roles.Reviewer, "admin", "projectmanager", "studiolead", "artist", "reviewer"));
    options.AddPolicy("RequireClient", policy => policy.RequireRole(Roles.Client, "client"));
});

// ── SignalR Real-Time Studio Synchronization ─────────────────
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = true;
});

// ── CORS (React dev server, studio LAN, and cloud frontend deployments) ──
var frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL")
    ?? builder.Configuration["FRONTEND_URL"]
    ?? builder.Configuration["Cors:FrontendUrl"];

var allowedOrigins = (Environment.GetEnvironmentVariable("ALLOWED_ORIGINS") ?? "")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    .ToHashSet(StringComparer.OrdinalIgnoreCase);

if (!string.IsNullOrWhiteSpace(frontendUrl))
{
    foreach (var u in frontendUrl.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
    {
        allowedOrigins.Add(u.TrimEnd('/'));
    }
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReact", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
              {
                  if (string.IsNullOrWhiteSpace(origin)) return false;
                  try
                  {
                      var cleanOrigin = origin.TrimEnd('/');
                      if (allowedOrigins.Contains(cleanOrigin)) return true;

                      var uri = new Uri(origin);
                      var host = uri.Host;

                      // Allow local development and studio LAN subnets
                      if (host == "localhost" || host == "127.0.0.1" || host.StartsWith("192.168.") || host.StartsWith("10."))
                          return true;

                      // Allow all Vercel deployments (*.vercel.app)
                      if (host.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase))
                          return true;

                      // Allow all Railway / Render preview apps
                      if (host.EndsWith(".railway.app", StringComparison.OrdinalIgnoreCase) ||
                          host.EndsWith(".onrender.com", StringComparison.OrdinalIgnoreCase))
                          return true;

                      return false;
                  }
                  catch
                  {
                      return false;
                  }
              })
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// ── Controllers + Swagger ───────────────────────────────────── 
builder.Services.AddControllers()
    .AddOData(options => options
        .Select()
        .Filter()
        .OrderBy()
        .Expand()
        .Count()
        .SetMaxTop(100));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "PolyTrack API", Version = "v1" });
});

var app = builder.Build();

// ── Seed / Verification on Application Start ──────────────────
app.Lifetime.ApplicationStarted.Register(async () =>
{
    try
    {
        using var scope = app.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<StudioDbContext>();

        // 0. Ensure schema migrations are applied safely on startup
        try
        {
            await context.Database.MigrateAsync();
            Console.WriteLine("✅ Database schema migrated successfully.");
        }
        catch (Exception migEx)
        {
            Console.WriteLine($"⚠️  Migration notice (non-fatal): {migEx.Message}. Ensuring tables exist...");
            await context.Database.EnsureCreatedAsync();
        }

        try
        {
            await context.Database.ExecuteSqlRawAsync("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'studio_lead';");
        }
        catch { }

        // 1. Seed or verify Demo Users
        var adminEmail = Environment.GetEnvironmentVariable("ADMIN_EMAIL") ?? "admin@polytrack.com";
        var adminPassword = Environment.GetEnvironmentVariable("ADMIN_PASSWORD") ?? "Admin@123456";
        var adminName = Environment.GetEnvironmentVariable("ADMIN_NAME") ?? "Admin User";

        var demoUsers = new[]
        {
            (Guid.Parse("550e8400-e29b-41d4-a716-446655440000"), adminName, adminEmail, UserRole.Admin),
            (Guid.Parse("550e8400-e29b-41d4-a716-446655440001"), "Sarah Connor (Studio Lead)", "pm@polytrack.com", UserRole.StudioLead),
            (Guid.Parse("550e8400-e29b-41d4-a716-446655440005"), "Marcus Vance (Studio Lead)", "lead@polytrack.com", UserRole.StudioLead),
            (Guid.Parse("550e8400-e29b-41d4-a716-446655440002"), "Alex Rivera (Lead Artist)", "artist@polytrack.com", UserRole.Artist),
            (Guid.Parse("550e8400-e29b-41d4-a716-446655440003"), "Elena Rostova (Reviewer)", "reviewer@polytrack.com", UserRole.Reviewer),
            (Guid.Parse("550e8400-e29b-41d4-a716-446655440004"), "David Vance (Client)", "client@polytrack.com", UserRole.Client),
        };

        var defaultPasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword);

        foreach (var (userId, name, email, role) in demoUsers)
        {
            var user = await context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null)
            {
                context.Users.Add(new User
                {
                    Id = userId,
                    Name = name,
                    Email = email,
                    PasswordHash = defaultPasswordHash,
                    IsActive = true,
                    Role = role,
                    Timezone = "UTC",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
                Console.WriteLine($"✅ Demo user created: {email} ({role})");
            }
            else
            {
                user.IsActive = true;
                user.Role = role;
                user.PasswordHash = defaultPasswordHash;
            }
        }
        await context.SaveChangesAsync();

        var adminUser = await context.Users.FirstAsync(u => u.Email == adminEmail);
        var clientUser = await context.Users.FirstAsync(u => u.Email == "client@polytrack.com");

        var demoClient = await context.Clients.FirstOrDefaultAsync(c => c.UserId == clientUser.Id);
        if (demoClient == null)
        {
            demoClient = new Client
            {
                Id = Guid.Parse("770e8400-e29b-41d4-a716-446655440001"),
                UserId = clientUser.Id,
                ContactName = "David Vance",
                CompanyName = "Vance Interactive Studios",
                Email = "client@polytrack.com",
                Phone = "+1 (555) 345-6789",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            context.Clients.Add(demoClient);
            await context.SaveChangesAsync();
        }

        // Ensure demo project has members
        var demoProjId = Guid.Parse("1c058d09-21a2-4312-b882-e60e713ad6db");
        var existingProj = await context.Projects.FirstOrDefaultAsync(p => p.Id == demoProjId);
        if (existingProj != null)
        {
            if (!existingProj.ClientId.HasValue)
            {
                existingProj.ClientId = demoClient.Id;
            }

            var teamMembers = await context.Users
                .Where(u => u.Email == "pm@polytrack.com" || u.Email == "artist@polytrack.com" || u.Email == "reviewer@polytrack.com")
                .ToListAsync();

            foreach (var tm in teamMembers)
            {
                if (!await context.ProjectMembers.AnyAsync(pm => pm.ProjectId == demoProjId && pm.UserId == tm.Id))
                {
                    context.ProjectMembers.Add(new ProjectMember
                    {
                        Id = Guid.NewGuid(),
                        ProjectId = demoProjId,
                        UserId = tm.Id,
                        RoleInProject = tm.Role?.ToString(),
                        AddedAt = DateTime.UtcNow
                    });
                }
            }
            await context.SaveChangesAsync();
        }

        // 2. Seed default Asset Categories Config if empty
        if (!await context.AssetCategoriesConfigs.AnyAsync())
        {
            var categories = new[]
            {
                ("Model", "3D polygonal models and meshes"),
                ("Texture", "PBR textures, normal maps, roughness maps"),
                ("Material", "Shader setups, procedural materials"),
                ("Rig", "Character and prop skeletal rigs"),
                ("Animation", "Keyframe and mocap animation files"),
                ("Concept", "2D concept designs and moodboards"),
                ("Audio", "Sound effects, foley, musical tracks"),
                ("Vfx", "Visual effects, simulations, particle caches")
            };

            foreach (var (name, desc) in categories)
            {
                context.AssetCategoriesConfigs.Add(new AssetCategoriesConfig
                {
                    Id = Guid.NewGuid(),
                    Name = name,
                    Description = desc,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                });
            }
            await context.SaveChangesAsync();
            Console.WriteLine("✅ Default asset categories configured.");
        }

        // 3. Seed default Project Types Config if empty
        if (!await context.ProjectTypesConfigs.AnyAsync())
        {
            var types = new[]
            {
                ("Character", "Hero character, NPC modeling, and texturing"),
                ("Environment", "Open-world sets, exterior and interior levels"),
                ("Props", "Hard-surface props, weapons, and decor"),
                ("Animation", "Cinematic sequences and gameplay animations"),
                ("Vfx", "Post-production effects and simulations"),
                ("ProductVisualization", "High-fidelity commercial product renders"),
                ("ArchitecturalVisualization", "ArchViz interior and exterior staging"),
                ("Other", "Custom or multidisciplinary 3D projects")
            };

            foreach (var (name, desc) in types)
            {
                context.ProjectTypesConfigs.Add(new ProjectTypesConfig
                {
                    Id = Guid.NewGuid(),
                    Name = name,
                    Description = desc,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                });
            }
            await context.SaveChangesAsync();
            Console.WriteLine("✅ Default project types configured.");
        }

        // 4. Seed demo project, milestone, and tasks if none exist
        if (!await context.Projects.AnyAsync())
        {
            var demoProject = new Project
            {
                Id = Guid.Parse("1c058d09-21a2-4312-b882-e60e713ad6db"),
                Name = "Cyberpunk Alley Environment",
                ProjectCode = "CYBER-01",
                ProjectType = ProjectType.Environment,
                Status = ProjectStatus.Active,
                Priority = PriorityLevel.High,
                StartDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-10)),
                EndDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30)),
                BudgetAmount = 25000,
                Currency = "USD",
                CompletionPercent = 45,
                CreatedBy = adminUser.Id,
                ProjectManagerId = adminUser.Id,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            context.Projects.Add(demoProject);
            await context.SaveChangesAsync();

            var milestone1 = new Milestone
            {
                Id = Guid.NewGuid(),
                ProjectId = demoProject.Id,
                Name = "Milestone 1: Blockout & Architectural Layout",
                Description = "Initial greybox layout, scaling, and camera staging.",
                SortOrder = 1,
                Status = MilestoneStatus.Completed,
                StartDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-10)),
                EndDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-2)),
                ClientApproved = true,
                ClientApprovedAt = DateTime.UtcNow.AddDays(-2),
                ClientNotes = "Approved layout proportions.",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var milestone2 = new Milestone
            {
                Id = Guid.NewGuid(),
                ProjectId = demoProject.Id,
                Name = "Milestone 2: High-Poly Props & Neon Signage",
                Description = "Detailed modeling and texturing for hero storefronts and street assets.",
                SortOrder = 2,
                Status = MilestoneStatus.InProgress,
                StartDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1)),
                EndDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(15)),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            context.Milestones.AddRange(milestone1, milestone2);
            await context.SaveChangesAsync();

            var task1 = new PolyTrackAPI.Infrastructure.Models.Task
            {
                Id = Guid.NewGuid(),
                ProjectId = demoProject.Id,
                MilestoneId = milestone1.Id,
                Title = "Blockout Street Alley Geometry",
                Description = "Create initial modular wall and pavement greybox assets.",
                AssignedTo = adminUser.Id,
                CreatedBy = adminUser.Id,
                Status = PolyTrackAPI.Infrastructure.Models.TaskStatus.Done,
                Priority = PriorityLevel.High,
                StoryPoints = 5,
                EstimatedHours = 16,
                DueDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-3)),
                StartedAt = DateTime.UtcNow.AddDays(-9),
                CompletedAt = DateTime.UtcNow.AddDays(-3),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var task2 = new PolyTrackAPI.Infrastructure.Models.Task
            {
                Id = Guid.NewGuid(),
                ProjectId = demoProject.Id,
                MilestoneId = milestone2.Id,
                Title = "Model Holographic Neon Signs",
                Description = "High-poly mesh for Japanese kanji and corporate neon signs with emissive materials.",
                AssignedTo = adminUser.Id,
                CreatedBy = adminUser.Id,
                Status = PolyTrackAPI.Infrastructure.Models.TaskStatus.InProgress,
                Priority = PriorityLevel.Critical,
                StoryPoints = 8,
                EstimatedHours = 24,
                DueDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(5)),
                StartedAt = DateTime.UtcNow.AddDays(-1),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var task3 = new PolyTrackAPI.Infrastructure.Models.Task
            {
                Id = Guid.NewGuid(),
                ProjectId = demoProject.Id,
                MilestoneId = milestone2.Id,
                Title = "Texture Ramen Shop Kiosk",
                Description = "PBR substance painter texturing with weathering, oil spills, and graffiti decals.",
                AssignedTo = adminUser.Id,
                CreatedBy = adminUser.Id,
                Status = PolyTrackAPI.Infrastructure.Models.TaskStatus.Review,
                Priority = PriorityLevel.Normal,
                StoryPoints = 5,
                EstimatedHours = 12,
                DueDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(8)),
                StartedAt = DateTime.UtcNow.AddDays(-2),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            context.Tasks.AddRange(task1, task2, task3);

            // Add demo asset
            var demoAsset = new Asset
            {
                Id = Guid.NewGuid(),
                ProjectId = demoProject.Id,
                Name = "Cyberpunk Vending Machine",
                Description = "Retro-futuristic beverage dispenser with emissive touch panel.",
                Category = AssetCategory.Prop,
                Status = AssetStatus.Draft,
                LinkedTaskId = task2.Id,
                CreatedBy = adminUser.Id,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            context.Assets.Add(demoAsset);

            // Add demo activity feed
            context.ActivityFeeds.Add(new ActivityFeed
            {
                Id = Guid.NewGuid(),
                ProjectId = demoProject.Id,
                ActorId = adminUser.Id,
                EntityType = ActivityEntity.Project,
                EntityId = demoProject.Id,
                Action = "created",
                Description = $"Project \"{demoProject.Name}\" initialized",
                CreatedAt = DateTime.UtcNow
            });

            await context.SaveChangesAsync();
            Console.WriteLine("✅ Initial demo project, milestones, tasks, and assets seeded.");
        }

        await context.Database.CloseConnectionAsync();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"⚠️  Seed warning (non-fatal): {ex.Message}");
    }
});

// ── Middleware pipeline ─────────────────────────────────────── 
var enableSwagger = !string.Equals(Environment.GetEnvironmentVariable("DISABLE_SWAGGER"), "true", StringComparison.OrdinalIgnoreCase);

if (enableSwagger)
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "PolyTrack API v1");
    });
}

app.UseCors("AllowReact");

app.UseAuthentication();
app.UseMiddleware<AccountStatusMiddleware>(); // Validates account status on every authenticated request
app.UseAuthorization();

app.MapControllers();
app.MapHub<StudioHub>("/hubs/studio");

app.Run();

// ── Static Helper Methods ─────────────────────────────────────
static string ResolveConnectionString(IConfiguration configuration)
{
    // 1. Check DATABASE_URL (standard for Neon, Supabase, Railway, Render, Fly.io, Heroku)
    var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL")
        ?? configuration["DATABASE_URL"];

    if (!string.IsNullOrWhiteSpace(databaseUrl))
    {
        return ParseDatabaseUrl(databaseUrl);
    }

    // 2. Check ConnectionStrings:DefaultConnection / ConnectionStrings__DefaultConnection
    var defaultConn = configuration.GetConnectionString("DefaultConnection")
        ?? Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");

    if (!string.IsNullOrWhiteSpace(defaultConn))
    {
        return ParseDatabaseUrl(defaultConn);
    }

    // 3. Fallback to local default development connection
    return "Host=localhost;Port=5432;Database=PolyTrack;Username=postgres;Password=polytrack1234";
}

static string ParseDatabaseUrl(string connString)
{
    if (string.IsNullOrWhiteSpace(connString)) return connString;

    var trimmed = connString.Trim();
    if (!trimmed.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) &&
        !trimmed.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
    {
        return trimmed;
    }

    try
    {
        var uri = new Uri(trimmed);
        var userInfo = uri.UserInfo.Split(':');
        var username = userInfo.Length > 0 ? Uri.UnescapeDataString(userInfo[0]) : "postgres";
        var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";
        var host = uri.Host;
        var port = uri.Port > 0 ? uri.Port : 5432;
        var database = uri.AbsolutePath.TrimStart('/');

        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = host,
            Port = port,
            Database = database,
            Username = username,
            Password = password
        };

        // If connecting to external cloud database, enforce SSL
        if (host != "localhost" && host != "127.0.0.1")
        {
            builder.SslMode = SslMode.Require;
        }

        var query = System.Web.HttpUtility.ParseQueryString(uri.Query);
        if (query["sslmode"] != null && Enum.TryParse<SslMode>(query["sslmode"], true, out var sslMode))
        {
            builder.SslMode = sslMode;
        }

        return builder.ConnectionString;
    }
    catch
    {
        return connString;
    }
}
