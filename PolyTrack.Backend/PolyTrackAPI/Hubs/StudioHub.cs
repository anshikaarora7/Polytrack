using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace PolyTrackAPI.Hubs;

public interface IStudioClient
{
    Task AssetStatusChanged(object payload);
    Task AssetCreated(object payload);
    Task AssetReviewed(object payload);
    Task TaskCreated(object payload);
    Task TaskMoved(object payload);
    Task TaskUpdated(object payload);
    Task CommentAdded(object payload);
    Task PipelineStageChanged(object payload);
    Task LiveNotification(object payload);
}

[Authorize]
public class StudioHub : Hub<IStudioClient>
{
    public override async System.Threading.Tasks.Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier ?? Context.User?.Identity?.Name ?? "Anonymous";
        await Groups.AddToGroupAsync(Context.ConnectionId, "studio_workspace");
        await base.OnConnectedAsync();
    }

    public override async System.Threading.Tasks.Task OnDisconnectedAsync(Exception? exception)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, "studio_workspace");
        await base.OnDisconnectedAsync(exception);
    }

    public async System.Threading.Tasks.Task JoinProject(string projectId)
    {
        if (!string.IsNullOrWhiteSpace(projectId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"project_{projectId.ToLower()}");
        }
    }

    public async System.Threading.Tasks.Task LeaveProject(string projectId)
    {
        if (!string.IsNullOrWhiteSpace(projectId))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"project_{projectId.ToLower()}");
        }
    }
}
