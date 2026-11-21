'use client';

import { useEffect } from 'react';

export default function Page() {
  useEffect(() => {
    window.location.replace('/landing.html');
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#fafafa]">
      <div className="text-center">
        <div className="w-6 h-6 border-2 border-[#e7e7ea] border-t-[#5e6ad2] rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-[#5b5b66]">Loading PolyTrack Landing Page...</p>
      </div>
    </div>
  );
}
