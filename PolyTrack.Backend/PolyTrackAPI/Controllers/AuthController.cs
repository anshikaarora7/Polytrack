using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PolyTrackAPI.DTOs.Auth;
using PolyTrackAPI.Infrastructure.Data;
using PolyTrackAPI.Infrastructure.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace PolyTrackAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly StudioDbContext _db;
    private readonly IConfiguration _config;

    public AuthController(StudioDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    // ── POST /api/auth/login ──────────────────────────────────
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
    {
        // 1. Find user by email
        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Email == request.Email && u.IsActive == true);

        if (user == null)
            return Unauthorized(new { message = "Invalid email or password" });

        // 2. Verify password with bcrypt
        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid email or password" });

        // 3. Generate JWT access token
        var accessToken = GenerateAccessToken(user);
        var refreshToken = GenerateRefreshToken();
        var expiresAt = DateTime.UtcNow.AddMinutes(
            int.Parse(_config["JwtSettings:ExpirationMinutes"]!));

        // 4. Save refresh token to DB
        var tokenEntity = new RefreshToken
        {
            UserId = user.Id,
            Token = refreshToken,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            Revoked = false
        };
        _db.RefreshTokens.Add(tokenEntity);

        // 5. Update last login
        user.LastLoginAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new LoginResponseDto
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            ExpiresAt = expiresAt,
            User = new UserDto
            {
                Id = user.Id,
                Name = user.Name,
                Email = user.Email,
                Role = user.Role?.ToString() ?? "guest"
            }
        });
    }

    // ── POST /api/auth/refresh ────────────────────────────────
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequestDto request)
    {
        var tokenStr = request?.RefreshToken;
        if (string.IsNullOrWhiteSpace(tokenStr))
            return BadRequest(new { message = "RefreshToken is required" });

        var token = await _db.RefreshTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t =>
                t.Token == tokenStr &&
                t.Revoked == false &&
                t.ExpiresAt > DateTime.UtcNow);

        if (token == null || token.User == null || !token.User.IsActive)
            return Unauthorized(new { message = "Invalid or expired refresh token" });

        // Rotate: revoke old, issue new
        token.Revoked = true;

        var newAccess = GenerateAccessToken(token.User!);
        var newRefresh = GenerateRefreshToken();

        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = token.UserId,
            Token = newRefresh,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            Revoked = false
        });

        await _db.SaveChangesAsync();

        return Ok(new { accessToken = newAccess, refreshToken = newRefresh });
    }

    // ── POST /api/auth/logout ─────────────────────────────────
    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] RefreshTokenRequestDto request)
    {
        var tokenStr = request?.RefreshToken;
        if (!string.IsNullOrWhiteSpace(tokenStr))
        {
            var token = await _db.RefreshTokens
                .FirstOrDefaultAsync(t => t.Token == tokenStr);

            if (token != null)
            {
                token.Revoked = true;
                await _db.SaveChangesAsync();
            }
        }

        return Ok(new { message = "Logged out" });
    }

    // ── Private helpers ───────────────────────────────────────
    private string GenerateAccessToken(User user)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_config["JwtSettings:SecretKey"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var roleLower = (user.Role?.ToString() ?? "guest").ToLower();
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim(ClaimTypes.Role, roleLower),
            new Claim("userId", user.Id.ToString())
        };

        if (user.Role == UserRole.ProjectManager)
        {
            claims.Add(new Claim(ClaimTypes.Role, "project_manager"));
            claims.Add(new Claim(ClaimTypes.Role, "projectmanager"));
        }

        var token = new JwtSecurityToken(
            issuer: _config["JwtSettings:Issuer"],
            audience: _config["JwtSettings:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(
                int.Parse(_config["JwtSettings:ExpirationMinutes"]!)),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string GenerateRefreshToken()
    {
        var bytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes);
    }
}
