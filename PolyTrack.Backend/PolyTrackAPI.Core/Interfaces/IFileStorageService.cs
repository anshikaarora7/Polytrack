namespace PolyTrackAPI.Core.Interfaces;

public interface IFileStorageService
{
    string BaseStoragePath { get; }

    Task<string> SaveAssetVersionAsync(
        Guid projectId,
        string category,
        Guid assetId,
        short versionNumber,
        string fileName,
        Stream contentStream,
        CancellationToken cancellationToken = default);

    Task<string> SaveTaskAttachmentAsync(
        Guid projectId,
        Guid taskId,
        string fileName,
        Stream contentStream,
        CancellationToken cancellationToken = default);

    Task<string> SaveInquiryAttachmentAsync(
        Guid inquiryId,
        string fileName,
        Stream contentStream,
        CancellationToken cancellationToken = default);

    Task<(Stream Stream, string ContentType, string FileName)?> GetFileAsync(
        string relativeOrFullPath,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteFileAsync(
        string relativeOrFullPath,
        CancellationToken cancellationToken = default);

    string ResolveFullPath(string relativeOrFullPath);
}
