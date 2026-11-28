namespace PolyTrackAPI.Core.Constants;

public static class Roles
{
    public const string Admin = "admin";
    public const string ProjectManager = "projectmanager";
    public const string StudioLead = "studiolead";
    public const string Artist = "artist";
    public const string Reviewer = "reviewer";
    public const string Client = "client";

    public const string AllInternal = "admin,projectmanager,project_manager,studiolead,StudioLead,artist,Artist,reviewer,Reviewer";
    public const string AdminOrManager = "admin,projectmanager,project_manager,studiolead,StudioLead";
    public const string ReviewersAndAbove = "admin,projectmanager,project_manager,studiolead,StudioLead,reviewer,Reviewer";
    public const string LeadsAndAbove = "admin,projectmanager,project_manager,studiolead,StudioLead";
}

