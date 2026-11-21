'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { apiClient } from '@/lib/api-client';
import ThemeToggle from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  FolderOpen,
  CheckSquare,
  Image as ImageIcon,
  Users,
  LogOut,
  Menu,
  X,
  Briefcase,
  Box,
  Download,
  Search,
  ChevronRight,
  Command,
  CheckCircle2,
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
}

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Projects', href: '/dashboard/projects', icon: FolderOpen },
  { name: 'Tasks', href: '/dashboard/tasks', icon: CheckSquare },
  { name: 'Assets', href: '/dashboard/assets', icon: ImageIcon },
  { name: 'Clients', href: '/dashboard/clients', icon: Briefcase },
  { name: 'Team', href: '/dashboard/team', icon: Users },
];

export default function DashboardLayout({ children, activeTab }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showBlenderModal, setShowBlenderModal] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Keyboard shortcut for Cmd/Ctrl + K command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredNav = navItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-bg text-text overflow-hidden font-sans">
      {/* Slim 232px Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-[232px] bg-surface-2 border-r border-border flex flex-col z-40 transition-transform duration-200 ease-out md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:static md:h-full`}
      >
        {/* Brand Header */}
        <div className="h-12 border-b border-border px-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-[4px] bg-accent flex items-center justify-center text-white font-bold text-xs">
              P
            </div>
            <span className="font-semibold text-sm tracking-tight text-text">PolyTrack</span>
            <span className="text-[10px] font-mono text-text-muted px-1.5 py-0.2 rounded bg-surface border border-border">
              3D
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-text-muted hover:text-text p-1"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          <div className="px-2 pb-1 text-[11px] font-medium text-text-muted uppercase tracking-wider">
            Workspace
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.name.toLowerCase();

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-[8px] text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-surface text-accent font-semibold shadow-[var(--shadow-pop)]'
                    : 'text-text-secondary hover:text-text hover:bg-surface/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-accent' : 'text-text-muted'}`} strokeWidth={1.75} />
                  <span>{item.name}</span>
                </div>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-accent" />}
              </Link>
            );
          })}

          {/* Quick Tools Header */}
          <div className="pt-4 px-2 pb-1 text-[11px] font-medium text-text-muted uppercase tracking-wider">
            Integrations
          </div>
          <button
            type="button"
            onClick={() => setShowBlenderModal(true)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-[8px] text-[13px] font-medium text-text-secondary hover:text-text hover:bg-surface/60 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Box className="w-4 h-4 text-text-muted" strokeWidth={1.75} />
              <span>Blender 3D</span>
            </div>
            <span className="text-[10px] text-accent bg-accent-tint px-1.5 py-0.5 rounded font-mono">
              v1.0
            </span>
          </button>
        </div>

        {/* User Account & Logout */}
        <div className="p-3 border-t border-border bg-surface-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-accent-tint text-accent border border-border flex items-center justify-center font-bold text-xs shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-text truncate">{user?.name || 'Studio Member'}</p>
              <p className="text-[11px] text-text-muted truncate capitalize">{user?.role || 'Artist'}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Log out"
            className="p-1.5 text-text-muted hover:text-danger hover:bg-surface rounded-[8px] transition-colors"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main App Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-bg">
        {/* Thin Top Bar (48px) */}
        <header className="h-12 border-b border-border bg-surface px-4 flex items-center justify-between shrink-0">
          {/* Breadcrumbs & Mobile Menu Toggle */}
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-1.5 text-text-muted hover:text-text rounded-[8px] border border-border mr-1"
              aria-label="Toggle Navigation"
            >
              <Menu className="w-4 h-4" strokeWidth={1.75} />
            </button>

            <span className="text-text-muted hover:text-text cursor-pointer transition-colors">PolyTrack</span>
            <ChevronRight className="w-3.5 h-3.5 text-text-muted" strokeWidth={1.75} />
            <span className="text-text font-medium capitalize">{activeTab}</span>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2">
            {/* Command Palette Trigger */}
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2 px-2.5 h-8 rounded-[8px] border border-border bg-surface-2 hover:bg-surface text-text-muted hover:text-text text-xs transition-colors"
            >
              <Search className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Search or jump to...</span>
              <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border text-text-muted">
                ⌘K
              </kbd>
            </button>

            {/* Blender Addon Quick Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowBlenderModal(true)}
              className="h-8 text-xs px-2.5 rounded-[8px] border-border text-text-secondary hover:text-text"
            >
              <Box className="w-3.5 h-3.5 mr-1.5 text-accent" strokeWidth={1.75} />
              <span className="hidden md:inline">Blender Addon</span>
            </Button>

            {/* Theme Toggle Button */}
            <ThemeToggle />

            {/* Server Status Indicator */}
            <div className="hidden lg:flex items-center gap-1.5 pl-2 text-[11px] text-text-muted font-mono border-l border-border h-5">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span>5030 API</span>
            </div>
          </div>
        </header>

        {/* Content Area with 24px Padding & 1280px Max Width */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-[1280px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Command Palette Modal (Cmd/Ctrl + K) */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-start justify-center pt-24 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-surface border border-border rounded-[12px] shadow-[var(--shadow-pop)] overflow-hidden">
            <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-border">
              <Search className="w-4 h-4 text-text-muted" strokeWidth={1.75} />
              <input
                type="text"
                autoFocus
                placeholder="Search views, tasks, assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-text placeholder:text-text-muted focus:outline-none"
              />
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-2 border border-border text-text-muted">
                ESC
              </kbd>
            </div>

            <div className="p-2 space-y-1 max-h-72 overflow-y-auto">
              <div className="px-2 py-1 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                Views
              </div>
              {filteredNav.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => {
                      router.push(item.href);
                      setCommandPaletteOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-[8px] hover:bg-surface-2 text-left text-xs font-medium text-text transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-text-muted" strokeWidth={1.75} />
                      <span>{item.name}</span>
                    </div>
                    <span className="text-[11px] text-text-muted font-mono">{item.href}</span>
                  </button>
                );
              })}
              {filteredNav.length === 0 && (
                <div className="p-4 text-center text-xs text-text-muted">
                  No matches found for &quot;{searchQuery}&quot;
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Blender Addon Modal */}
      {showBlenderModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg p-6 bg-surface border border-border rounded-[12px] shadow-[var(--shadow-pop)] space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[8px] bg-accent-tint text-accent flex items-center justify-center">
                  <Box className="w-4 h-4" strokeWidth={1.75} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-text">PolyTrack Blender Addon</h3>
                  <p className="text-xs text-text-muted">Direct sync for Blender 3.0+ & 4.x</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBlenderModal(false)}
                className="text-text-muted hover:text-text p-1"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              Connect Blender to your PolyTrack studio REST API. Browse assets, append models directly into your 3D scene, and submit revisions with auto-calculated polygon statistics.
            </p>

            <div className="p-4 rounded-[8px] border border-border bg-surface-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-text">Addon Package (.zip)</p>
                <p className="text-[11px] text-text-muted font-mono">polytrack_blender_addon.zip</p>
              </div>
              <a
                href="/downloads/polytrack_blender_addon.zip"
                download="polytrack_blender_addon.zip"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-medium rounded-[8px] transition-colors"
              >
                <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
                Download
              </a>
            </div>

            <div className="space-y-2 text-xs text-text-secondary pt-1">
              <p className="font-semibold text-text">How to install in Blender:</p>
              <ol className="list-decimal pl-4 space-y-1 text-[11px] text-text-muted">
                <li>Open Blender &gt; Edit &gt; Preferences &gt; Add-ons.</li>
                <li>Click &quot;Install...&quot; and choose the downloaded .zip.</li>
                <li>Enable the addon checkbox and set API URL to <code className="font-mono text-accent">http://localhost:5030/api</code>.</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
