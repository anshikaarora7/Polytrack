'use client';

import { useEffect, useState } from 'react';
import { useSWRConfig } from 'swr';
import * as signalR from '@microsoft/signalr';
import { studioSignalR } from './signalr';

export function useStudioLiveSync() {
  const { mutate } = useSWRConfig();
  const [connectionState, setConnectionState] = useState<signalR.HubConnectionState>(
    signalR.HubConnectionState.Disconnected
  );

  useEffect(() => {
    // Start connection
    studioSignalR.start();

    // Track connection state
    const unsubscribeState = studioSignalR.onStateChange((state) => {
      setConnectionState(state);
    });

    // Handle Task Events
    const unbindTaskMoved = studioSignalR.on('TaskMoved', (_payload) => {
      // Revalidate any active kanban caches and dashboard stats
      mutate((key) => typeof key === 'string' && (key.startsWith('kanban-') || key === 'dashboard-stats'), undefined, { revalidate: true });
    });

    const unbindTaskCreated = studioSignalR.on('TaskCreated', (_payload) => {
      mutate((key) => typeof key === 'string' && (key.startsWith('kanban-') || key === 'dashboard-stats'), undefined, { revalidate: true });
    });

    const unbindTaskUpdated = studioSignalR.on('TaskUpdated', (_payload) => {
      mutate((key) => typeof key === 'string' && (key.startsWith('kanban-') || key.startsWith('task-')), undefined, { revalidate: true });
    });

    // Handle Asset Events
    const unbindAssetStatus = studioSignalR.on('AssetStatusChanged', (_payload) => {
      mutate((key) => (Array.isArray(key) && key[0] === 'assets-search') || key === 'dashboard-stats', undefined, { revalidate: true });
    });

    const unbindAssetCreated = studioSignalR.on('AssetCreated', (_payload) => {
      mutate((key) => (Array.isArray(key) && key[0] === 'assets-search') || key === 'dashboard-stats', undefined, { revalidate: true });
    });

    const unbindAssetReviewed = studioSignalR.on('AssetReviewed', (_payload) => {
      mutate((key) => (Array.isArray(key) && key[0] === 'assets-search') || key === 'dashboard-stats', undefined, { revalidate: true });
    });

    // Handle Comment Events
    const unbindComments = studioSignalR.on('CommentAdded', (_payload) => {
      mutate((key) => typeof key === 'string' && (key.startsWith('task-comments-') || key.startsWith('asset-comments-')), undefined, { revalidate: true });
    });

    return () => {
      unsubscribeState();
      unbindTaskMoved();
      unbindTaskCreated();
      unbindTaskUpdated();
      unbindAssetStatus();
      unbindAssetCreated();
      unbindAssetReviewed();
      unbindComments();
    };
  }, [mutate]);

  return {
    connectionState,
    isConnected: connectionState === signalR.HubConnectionState.Connected,
    isReconnecting: connectionState === signalR.HubConnectionState.Reconnecting,
  };
}
