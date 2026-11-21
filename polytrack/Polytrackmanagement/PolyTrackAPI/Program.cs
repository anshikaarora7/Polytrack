using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.OData;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PolyTrackAPI.Infrastructure.Data;
using PolyTrackAPI.Infrastructure.Models;
using System.Text;
using Npgsql.NameTranslation;
using EFCore.NamingConventions;
using Npgsql;
using Microsoft.AspNetCore.DataProtection;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(
        Path.Combine(builder.Environment.ContentRootPath, ".aspnet-data-protection-keys")));

// ── Database ────────────────────────────────────────────────── 
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "Missing ConnectionStrings:DefaultConnection. Run the API from the project folder or configure the connection string.");
}

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

// ── JWT Authentication ──────────────────────────────────────── 
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["SecretKey"]!;

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
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey))
    };
});

builder.Services.AddAuthorization();

// ── CORS (React dev server) ─────────────────────────────────── 
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReact", policy =>
    {
        policy.WithOrigins(
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:3001",
                "http://127.0.0.1:3001")
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

// Seed/check test admin user
app.Lifetime.ApplicationStarted.Register(async () =>
{
    try
    {
        using var scope   = app.Services.CreateScope();
        var context       = scope.ServiceProvider.GetRequiredService<StudioDbContext>();
 
        // Open connection explicitly so enum mappings activate
        await context.Database.OpenConnectionAsync();
 
        var adminEmail = "admin@polytrack.com";
        var existing   = await context.Users
            .FirstOrDefaultAsync(u => u.Email == adminEmail);
 
        if (existing == null)
        {
            context.Users.Add(new User
            {
                Id           = Guid.Parse("550e8400-e29b-41d4-a716-446655440000"),
                Name         = "Admin User",
                Email        = adminEmail,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123456"),
                IsActive     = true,
                Role         = UserRole.Admin,
                Timezone     = "UTC",
                CreatedAt    = DateTime.UtcNow,
                UpdatedAt    = DateTime.UtcNow
            });
            await context.SaveChangesAsync();
            Console.WriteLine(" Admin user created.");
        }
        else
        {
            existing.IsActive     = true;
            existing.Role         = UserRole.Admin;
            existing.PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123456");
            await context.SaveChangesAsync();
            Console.WriteLine(" Admin user verified.");
        }
 
        await context.Database.CloseConnectionAsync();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"⚠️  Seed warning (non-fatal): {ex.Message}");
    }
});

// ── Middleware pipeline ─────────────────────────────────────── 
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowReact");
app.UseAuthentication();   // must come before UseAuthorization
app.UseAuthorization();
app.MapControllers();

app.Run();
