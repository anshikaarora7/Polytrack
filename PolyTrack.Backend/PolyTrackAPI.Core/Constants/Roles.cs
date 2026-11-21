namespace PolyTrackAPI.Core.Constants;

public static class Roles
{
    public const string Admin = "admin";
    public const string ProjectManager = "projectmanager";
    public const string Artist = "artist";
    public const string Reviewer = "reviewer";
    public const string Client = "client";

    public const string AllInternal = "admin,projectmanager,artist,reviewer";
    public const string AdminOrManager = "admin,projectmanager";
    public const string ReviewersAndAbove = "admin,projectmanager,reviewer";
}
