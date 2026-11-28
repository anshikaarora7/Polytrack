'use client';

import * as signalR from '@microsoft/signalr';
import { getApiServerUrl } from './api-client';

export const getSignalRUrl = (): string => {
  const envHub = process.env.NEXT_PUBLIC_SIGNALR_URL;
  if (envHub && envHub.trim()) {
    return envHub.trim();
  }
  return `${getApiServerUrl()}/hubs/studio`;
};

export type SignalREventCallback = (payload: any) => void;

class StudioSignalRService {
  private connection: signalR.HubConnection | null = null;
  private isConnecting = false;
  private listeners: Map<string, Set<SignalREventCallback>> = new Map();
  private connectionStateListeners: Set<(state: signalR.HubConnectionState) => void> = new Set();

  public getConnectionState(): signalR.HubConnectionState {
    return this.connection ? this.connection.state : signalR.HubConnectionState.Disconnected;
  }

  public async start(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      return;
    }
    if (this.isConnecting) return;

    this.isConnecting = true;
    const hubUrl = getSignalRUrl();

    try {
      if (!this.connection) {
        this.connection = new signalR.HubConnectionBuilder()
          .withUrl(hubUrl, {
            accessTokenFactory: () => {
              if (typeof window !== 'undefined') {
                return localStorage.getItem('accessToken') || '';
              }
              return '';
            },
            skipNegotiation: false,
            transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
          })
          .withAutomaticReconnect([0, 2000, 5000, 10000, 20000])
          .configureLogging(signalR.LogLevel.Warning)
          .build();

        this.connection.onreconnecting(() => {
          this.notifyStateChange(signalR.HubConnectionState.Reconnecting);
        });

        this.connection.onreconnected(() => {
          this.notifyStateChange(signalR.HubConnectionState.Connected);
        });

        this.connection.onclose(() => {
          this.notifyStateChange(signalR.HubConnectionState.Disconnected);
        });

        // Register default Studio Hub event listeners
        const studioEvents = [
          'AssetStatusChanged',
          'AssetCreated',
          'AssetReviewed',
          'TaskCreated',
          'TaskMoved',
          'TaskUpdated',
          'CommentAdded',
          'PipelineStageChanged',
          'LiveNotification',
        ];

        for (const evt of studioEvents) {
          this.connection.on(evt, (payload: any) => {
            const handlers = this.listeners.get(evt);
            if (handlers) {
              handlers.forEach((fn) => {
                try {
                  fn(payload);
                } catch (err) {
                  console.error(`[SignalR] Error in handler for ${evt}:`, err);
                }
              });
            }
          });
        }
      }

      if (this.connection.state === signalR.HubConnectionState.Disconnected) {
        await this.connection.start();
        this.notifyStateChange(signalR.HubConnectionState.Connected);
      }
    } catch (err) {
      // Non-fatal if backend is offline or waking up; auto-reconnect handles it
      this.notifyStateChange(signalR.HubConnectionState.Disconnected);
    } finally {
      this.isConnecting = false;
    }
  }

  public async stop(): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.stop();
      } catch { }
      this.notifyStateChange(signalR.HubConnectionState.Disconnected);
    }
  }

  public on(event: string, callback: SignalREventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unbind function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  public onStateChange(callback: (state: signalR.HubConnectionState) => void): () => void {
    this.connectionStateListeners.add(callback);
    callback(this.getConnectionState());
    return () => {
      this.connectionStateListeners.delete(callback);
    };
  }

  private notifyStateChange(state: signalR.HubConnectionState) {
    this.connectionStateListeners.forEach((fn) => {
      try {
        fn(state);
      } catch { }
    });
  }
}

export const studioSignalR = new StudioSignalRService();
