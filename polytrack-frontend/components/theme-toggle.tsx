'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '@/lib/theme-store';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export default function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        disabled
        className={`inline-flex items-center justify-center w-8 h-8 rounded-[8px] border border-border text-text-muted opacity-50 ${className}`}
        aria-label="Toggle Theme"
      >
        <span className="w-4 h-4" />
      </button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center gap-2 px-2.5 h-8 rounded-[8px] border border-border bg-surface hover:bg-surface-2 text-text text-xs font-medium transition-colors duration-150 shadow-[var(--shadow-pop)] ${className}`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      aria-label="Toggle color theme"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-warning" strokeWidth={1.75} />
      ) : (
        <Moon className="w-4 h-4 text-accent" strokeWidth={1.75} />
      )}
      {showLabel && (
        <span className="text-[12px] text-text-secondary">{isDark ? 'Light' : 'Dark'}</span>
      )}
    </button>
  );
}
