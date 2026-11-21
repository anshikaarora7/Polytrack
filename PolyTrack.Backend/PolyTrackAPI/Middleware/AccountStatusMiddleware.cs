using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using PolyTrackAPI.Infrastructure.Data;

namespace PolyTrackAPI.Middleware;

public class AccountStatusMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<AccountStatusMiddleware> _logger;

    public AccountStatusMiddleware(RequestDelegate next, ILogger<AccountStatusMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, StudioDbContext db)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? context.User.FindFirst("userId")?.Value;

            if (Guid.TryParse(userIdClaim, out var userId))
            {
                var user = await db.Users
                    .AsNoTracking()
                    .Select(u => new { u.Id, u.IsActive })
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null || !user.IsActive)
                {
                    _logger.LogWarning("Blocked request from deactivated or non-existent user {UserId}", userId);
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsJsonAsync(new
                    {
                        message = "Your account has been deactivated. Please contact your studio administrator."
                    });
                    return;
                }
            }
        }

        await _next(context);
    }
}
