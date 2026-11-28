'use client';

import React, { useState, useEffect } from 'react';
import { serverHealth } from '@/lib/api-client';
import { Loader2, Server } from 'lucide-react';

export default function StudioColdStartBanner() {
  const [isWakingUp, setIsWakingUp] = useState(false);

  useEffect(() => {
    return serverHealth.subscribe((waking) => {
      setIsWakingUp(waking);
    });
  }, []);

  if (!isWakingUp) return null;

  return (
    <div className="bg-accent-tint border-b border-accent-border px-4 py-2 flex items-center justify-between text-xs text-accent transition-all animate-in fade-in duration-300">
      <div className="flex items-center gap-2.5">
        <div className="relative flex items-center justify-center">
          <Server className="w-3.5 h-3.5 text-accent animate-pulse" />
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
        </div>
        <span className="font-medium text-text">
          Waking up studio servers... PolyTrack cloud instance is starting up (est. 5–10s).
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-text-muted font-mono">
        <Loader2 className="w-3 h-3 animate-spin text-accent" />
        <span>Syncing...</span>
      </div>
    </div>
  );
}
