using Amazon;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PolyTrackAPI.Core.Interfaces;

namespace PolyTrackAPI.Infrastructure.Services;

/// <summary>
/// Cloud S3-compatible file storage provider (supports AWS S3, Cloudflare R2, MinIO, Wasabi, Backblaze B2, DigitalOcean Spaces).
/// </summary>
public class S3FileStorageService : IFileStorageService
{
    private readonly IAmazonS3 _s3Client;
    private readonly string _bucketName;
    private readonly string _serviceUrl;
    private readonly ILogger<S3FileStorageService> _logger;

    public string BaseStoragePath => $"s3://{_bucketName}";

    public S3FileStorageService(IConfiguration config, ILogger<S3FileStorageService> logger)
    {
        _logger = logger;

        _bucketName = config["FileStorage:S3:BucketName"]
            ?? Environment.GetEnvironmentVariable("S3_BUCKET_NAME")
            ?? Environment.GetEnvironmentVariable("AWS_S3_BUCKET_NAME")
            ?? "polytrack-studio-storage";

        var accessKey = config["FileStorage:S3:AccessKey"]
            ?? Environment.GetEnvironmentVariable("S3_ACCESS_KEY")
            ?? Environment.GetEnvironmentVariable("AWS_ACCESS_KEY_ID")
            ?? "";

        var secretKey = config["FileStorage:S3:SecretKey"]
            ?? Environment.GetEnvironmentVariable("S3_SECRET_KEY")
            ?? Environment.GetEnvironmentVariable("AWS_SECRET_ACCESS_KEY")
            ?? "";

        _serviceUrl = config["FileStorage:S3:ServiceUrl"]
            ?? config["FileStorage:S3:Endpoint"]
            ?? Environment.GetEnvironmentVariable("S3_ENDPOINT")
            ?? Environment.GetEnvironmentVariable("AWS_ENDPOINT_URL")
            ?? "";

        var region = config["FileStorage:S3:Region"]
            ?? Environment.GetEnvironmentVariable("S3_REGION")
            ?? Environment.GetEnvironmentVariable("AWS_REGION")
            ?? "us-east-1";

        var s3Config = new AmazonS3Config
        {
            ForcePathStyle = true // Essential for Cloudflare R2, MinIO, Wasabi
        };

        if (!string.IsNullOrWhiteSpace(_serviceUrl))
        {
            s3Config.ServiceURL = _serviceUrl;
        }
        else
        {
            s3Config.RegionEndpoint = RegionEndpoint.GetBySystemName(region);
        }

        _s3Client = new AmazonS3Client(accessKey, secretKey, s3Config);
        _logger.LogInformation("PolyTrack S3 storage initialized for bucket: {Bucket} at {Endpoint}",
            _bucketName, string.IsNullOrWhiteSpace(_serviceUrl) ? region : _serviceUrl);
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

        // Path structure: projects/{projectId}/assets/{category}/{assetId}/v{versionNumber}/{safeFileName}
        var s3Key = $"projects/{projectId}/assets/{sanitizedCategory}/{assetId}/v{versionNumber}/{safeFileName}";
        var ext = Path.GetExtension(safeFileName).ToLowerInvariant();

        var putRequest = new PutObjectRequest
        {
            BucketName = _bucketName,
            Key = s3Key,
            InputStream = contentStream,
            ContentType = GetContentType(ext),
            AutoCloseStream = false
        };

        await _s3Client.PutObjectAsync(putRequest, cancellationToken);
        _logger.LogInformation("Uploaded asset version to S3: s3://{Bucket}/{Key}", _bucketName, s3Key);
        return s3Key;
    }

    public async Task<string> SaveTaskAttachmentAsync(
        Guid projectId,
        Guid taskId,
        string fileName,
        Stream contentStream,
        CancellationToken cancellationToken = default)
    {
        var safeFileName = Path.GetFileName(fileName);
        var s3Key = $"projects/{projectId}/task-attachments/{taskId}/{safeFileName}";
        var ext = Path.GetExtension(safeFileName).ToLowerInvariant();

        var putRequest = new PutObjectRequest
        {
            BucketName = _bucketName,
            Key = s3Key,
            InputStream = contentStream,
            ContentType = GetContentType(ext),
            AutoCloseStream = false
        };

        await _s3Client.PutObjectAsync(putRequest, cancellationToken);
        _logger.LogInformation("Uploaded task attachment to S3: s3://{Bucket}/{Key}", _bucketName, s3Key);
        return s3Key;
    }

    public async Task<string> SaveInquiryAttachmentAsync(
        Guid inquiryId,
        string fileName,
        Stream contentStream,
        CancellationToken cancellationToken = default)
    {
        var safeFileName = Path.GetFileName(fileName);
        var s3Key = $"inquiries/{inquiryId}/{safeFileName}";
        var ext = Path.GetExtension(safeFileName).ToLowerInvariant();

        var putRequest = new PutObjectRequest
        {
            BucketName = _bucketName,
            Key = s3Key,
            InputStream = contentStream,
            ContentType = GetContentType(ext),
            AutoCloseStream = false
        };

        await _s3Client.PutObjectAsync(putRequest, cancellationToken);
        _logger.LogInformation("Uploaded inquiry attachment to S3: s3://{Bucket}/{Key}", _bucketName, s3Key);
        return s3Key;
    }

    public async Task<(Stream Stream, string ContentType, string FileName)?> GetFileAsync(
        string relativeOrFullPath,
        CancellationToken cancellationToken = default)
    {
        var key = CleanS3Key(relativeOrFullPath);
        try
        {
            var getRequest = new GetObjectRequest
            {
                BucketName = _bucketName,
                Key = key
            };

            var response = await _s3Client.GetObjectAsync(getRequest, cancellationToken);
            var fileName = Path.GetFileName(key);
            var ext = Path.GetExtension(key).ToLowerInvariant();
            var contentType = response.Headers.ContentType ?? GetContentType(ext);

            // Copy response stream to memory so S3 HTTP connection can close cleanly
            var memStream = new MemoryStream();
            await response.ResponseStream.CopyToAsync(memStream, cancellationToken);
            memStream.Position = 0;

            return (memStream, contentType, fileName);
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound || ex.ErrorCode == "NoSuchKey")
        {
            _logger.LogWarning("S3 file not found: s3://{Bucket}/{Key}", _bucketName, key);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving S3 file: s3://{Bucket}/{Key}", _bucketName, key);
            return null;
        }
    }

    public async Task<bool> DeleteFileAsync(string relativeOrFullPath, CancellationToken cancellationToken = default)
    {
        var key = CleanS3Key(relativeOrFullPath);
        try
        {
            await _s3Client.DeleteObjectAsync(_bucketName, key, cancellationToken);
            _logger.LogInformation("Deleted S3 file: s3://{Bucket}/{Key}", _bucketName, key);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete S3 file: s3://{Bucket}/{Key}", _bucketName, key);
            return false;
        }
    }

    public string ResolveFullPath(string relativeOrFullPath)
    {
        return $"s3://{_bucketName}/{CleanS3Key(relativeOrFullPath)}";
    }

    private string CleanS3Key(string path)
    {
        if (string.IsNullOrWhiteSpace(path)) return "";
        var prefix = $"s3://{_bucketName}/";
        if (path.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
        {
            path = path.Substring(prefix.Length);
        }
        return path.TrimStart('/', '\\').Replace('\\', '/');
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
