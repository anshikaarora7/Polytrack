using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PolyTrackAPI.Core.Interfaces;

namespace PolyTrackAPI.Infrastructure.Services;

public class LocalFileStorageService : IFileStorageService
{
    private readonly string _baseStoragePath;
    private readonly ILogger<LocalFileStorageService> _logger;

    public string BaseStoragePath => _baseStoragePath;

    public LocalFileStorageService(IConfiguration config, ILogger<LocalFileStorageService> logger)
    {
        _logger = logger;

        var configuredPath = config["FileStorage:BasePath"]
            ?? Environment.GetEnvironmentVariable("STUDIO_STORAGE_PATH")
            ?? @"C:\Polytrack\studio-storage";

        _baseStoragePath = Path.GetFullPath(configuredPath);

        // Ensure root studio storage directories exist
        Directory.CreateDirectory(_baseStoragePath);
        Directory.CreateDirectory(Path.Combine(_baseStoragePath, "projects"));
        Directory.CreateDirectory(Path.Combine(_baseStoragePath, "inquiries"));

        _logger.LogInformation("PolyTrack studio storage initialized at: {StoragePath}", _baseStoragePath);
    }

    public async Task<string> SaveAssetVersionAsync(
        Guid projectId,
        string category,
        Guid assetId,
        short versionNumber,
        string fileName,
        Stream contentStream,
        CancellationToken cancellationToken = default)
    {
        var sanitizedCategory = string.IsNullOrWhiteSpace(category) ? "general" : category.Trim().ToLowerInvariant();
        var safeFileName = Path.GetFileName(fileName);

        // Path structure: studio-storage/projects/{projectId}/assets/{category}/{assetId}/v{versionNumber}/{safeFileName}
        var relativeDir = Path.Combine(
            "projects",
            projectId.ToString(),
            "assets",
            sanitizedCategory,
            assetId.ToString(),
            $"v{versionNumber}");

        var fullDir = Path.Combine(_baseStoragePath, relativeDir);
        Directory.CreateDirectory(fullDir);

        var fullPath = Path.Combine(fullDir, safeFileName);
        using (var destStream = new FileStream(fullPath, FileMode.Create, FileAccess.Write, FileShare.None, 4096, true))
        {
            await contentStream.CopyToAsync(destStream, cancellationToken);
        }

        var relativePath = Path.Combine(relativeDir, safeFileName).Replace('\\', '/');
        _logger.LogInformation("Saved asset version file to {RelativePath}", relativePath);
        return relativePath;
    }

    public async Task<string> SaveTaskAttachmentAsync(
        Guid projectId,
        Guid taskId,
        string fileName,
        Stream contentStream,
        CancellationToken cancellationToken = default)
    {
        var safeFileName = Path.GetFileName(fileName);

        // Path structure: studio-storage/projects/{projectId}/task-attachments/{taskId}/{safeFileName}
        var relativeDir = Path.Combine(
            "projects",
            projectId.ToString(),
            "task-attachments",
            taskId.ToString());

        var fullDir = Path.Combine(_baseStoragePath, relativeDir);
        Directory.CreateDirectory(fullDir);

        var fullPath = Path.Combine(fullDir, safeFileName);
        using (var destStream = new FileStream(fullPath, FileMode.Create, FileAccess.Write, FileShare.None, 4096, true))
        {
            await contentStream.CopyToAsync(destStream, cancellationToken);
        }

        var relativePath = Path.Combine(relativeDir, safeFileName).Replace('\\', '/');
        _logger.LogInformation("Saved task attachment file to {RelativePath}", relativePath);
        return relativePath;
    }

    public async Task<string> SaveInquiryAttachmentAsync(
        Guid inquiryId,
        string fileName,
        Stream contentStream,
        CancellationToken cancellationToken = default)
    {
        var safeFileName = Path.GetFileName(fileName);

        // Path structure: studio-storage/inquiries/{inquiryId}/{safeFileName}
        var relativeDir = Path.Combine("inquiries", inquiryId.ToString());
        var fullDir = Path.Combine(_baseStoragePath, relativeDir);
        Directory.CreateDirectory(fullDir);

        var fullPath = Path.Combine(fullDir, safeFileName);
        using (var destStream = new FileStream(fullPath, FileMode.Create, FileAccess.Write, FileShare.None, 4096, true))
        {
            await contentStream.CopyToAsync(destStream, cancellationToken);
        }

        var relativePath = Path.Combine(relativeDir, safeFileName).Replace('\\', '/');
        _logger.LogInformation("Saved inquiry attachment file to {RelativePath}", relativePath);
        return relativePath;
    }

    public Task<(Stream Stream, string ContentType, string FileName)?> GetFileAsync(
        string relativeOrFullPath,
        CancellationToken cancellationToken = default)
    {
        var fullPath = ResolveFullPath(relativeOrFullPath);
        if (!File.Exists(fullPath))
        {
            _logger.LogWarning("File not found at path: {FullPath}", fullPath);
            return Task.FromResult<(Stream Stream, string ContentType, string FileName)?>(null);
        }

        var fileName = Path.GetFileName(fullPath);
        var ext = Path.GetExtension(fullPath).ToLowerInvariant();
        var contentType = GetContentType(ext);

        var stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read);
        return Task.FromResult<(Stream Stream, string ContentType, string FileName)?>((stream, contentType, fileName));
    }

    public Task<bool> DeleteFileAsync(string relativeOrFullPath, CancellationToken cancellationToken = default)
    {
        var fullPath = ResolveFullPath(relativeOrFullPath);
        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
            _logger.LogInformation("Deleted file at: {FullPath}", fullPath);
            return Task.FromResult(true);
        }

        return Task.FromResult(false);
    }

    public string ResolveFullPath(string relativeOrFullPath)
    {
        if (Path.IsPathRooted(relativeOrFullPath) && File.Exists(relativeOrFullPath))
            return relativeOrFullPath;

        var normalized = relativeOrFullPath.TrimStart('/', '\\').Replace('/', Path.DirectorySeparatorChar);
        return Path.Combine(_baseStoragePath, normalized);
    }

    private static string GetContentType(string extension)
    {
        return extension switch
        {
            ".blend" => "application/x-blender",
            ".fbx" => "application/octet-stream",
            ".obj" => "text/plain",
            ".glb" => "model/gltf-binary",
            ".gltf" => "model/gltf+json",
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".tga" => "image/x-tga",
            ".psd" => "image/vnd.adobe.photoshop",
            ".mp4" => "video/mp4",
            ".zip" => "application/zip",
            ".pdf" => "application/pdf",
            _ => "application/octet-stream"
        };
    }
}
