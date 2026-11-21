'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  LayoutDashboard,
  FolderOpen,
  CheckSquare,
  Image as ImageIcon,
  Users,
  LogOut,
  Menu,
  X,
  Settings,
  Briefcase,
  Box,
  Download,
  CheckCircle,
  ExternalLink,
  Sparkles,
  Server,
  Layers
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
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showBlenderModal, setShowBlenderModal] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 ease-in-out z-40 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 md:static md:h-auto`}
      >
        <div className="flex flex-col h-full p-6">
          {/* Logo */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <LayoutDashboard className="w-6 h-6 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold text-sidebar-foreground">PolyTrack</h1>
            </div>
            <p className="text-xs text-muted-foreground">3D Studio Production Tracking</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.name.toLowerCase();
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all text-sm ${
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-sm'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Blender 3D Addon Banner in Sidebar */}
          <div className="my-4 p-3 rounded-xl border border-primary/30 bg-primary/10 space-y-2">
            <div className="flex items-center gap-2 text-primary font-semibold text-xs">
              <Box className="w-4 h-4" />
              <span>Blender 3D Addon</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Import & publish 3D assets directly inside Blender viewport.
            </p>
            <Button
              size="sm"
              onClick={() => setShowBlenderModal(true)}
              className="w-full h-7 text-[11px] bg-primary hover:bg-primary/90 text-primary-foreground font-medium flex items-center justify-center gap-1.5"
            >
              <Download className="w-3 h-3" />
              Get Blender Addon
            </Button>
          </div>

          {/* User Section */}
          <div className="space-y-3 pt-4 border-t border-sidebar-border">
            <div className="px-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-sidebar-foreground font-semibold truncate">{user?.name || 'Studio Member'}</p>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/20 text-primary font-bold uppercase">
                  {user?.role || 'User'}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-lg transition-all text-xs text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top Header */}
        <div className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 hover:bg-accent rounded-lg transition-all"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <h2 className="text-lg font-semibold text-foreground capitalize hidden sm:block">
              {activeTab}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Blender Addon Button in Header */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowBlenderModal(true)}
              className="h-8 text-xs flex items-center gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
            >
              <Box className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Blender Addon</span>
            </Button>

            <div className="h-4 w-[1px] bg-border hidden sm:block" />

            <div className="text-xs text-muted-foreground hidden md:flex items-center gap-1.5 font-mono">
              <Server className="w-3 h-3 text-emerald-400" />
              <span>API: {apiClient.getServerUrl().replace(/^https?:\/\//, '')}</span>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">{children}</div>
      </div>

      {/* Modal / Drawer: Blender 3D Addon */}
      {showBlenderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-xl p-6 md:p-8 bg-card border-border shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/20 text-primary">
                  <Box className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">PolyTrack Blender 3D Addon</h2>
                  <p className="text-xs text-muted-foreground">Version 1.0.0 • Supports Blender 3.0+ & 4.x</p>
                </div>
              </div>
              <button
                onClick={() => setShowBlenderModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground leading-relaxed">
              Connect Blender directly to your PolyTrack studio server. Browse project models, append assets with 1 click, and publish scene revisions with automatic polygon count extraction.
            </p>

            {/* Download CTA Box */}
            <div className="p-5 rounded-xl border border-primary/40 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="font-bold text-foreground text-sm">Download Pre-Packaged Addon (.zip)</p>
                <p className="text-xs text-muted-foreground font-mono">polytrack_blender_addon.zip</p>
              </div>

              <a
                href="/downloads/polytrack_blender_addon.zip"
                download="polytrack_blender_addon.zip"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-lg shadow-md transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Addon Zip
              </a>
            </div>

            {/* Setup Instructions */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Installation Instructions (3 Easy Steps)
              </h3>

              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="p-3 bg-muted/40 rounded-lg border border-border/40 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <div>
                    <strong className="text-foreground">Install in Blender:</strong> Open Blender, go to{' '}
                    <code className="text-primary font-mono">Edit &gt; Preferences &gt; Add-ons &gt; Install...</code>, select the downloaded{' '}
                    <code className="text-primary font-mono">polytrack_blender_addon.zip</code>, and check the checkbox to enable it.
                  </div>
                </div>

                <div className="p-3 bg-muted/40 rounded-lg border border-border/40 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <div>
                    <strong className="text-foreground">Open 3D Viewport N-Panel:</strong> In the 3D Viewport, press{' '}
                    <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[11px] text-foreground">
                      N
                    </kbd>{' '}
                    on your keyboard to open the sidebar, and click the{' '}
                    <strong className="text-foreground">PolyTrack</strong> tab.
                  </div>
                </div>

                <div className="p-3 bg-muted/40 rounded-lg border border-border/40 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0">
                    3
                  </span>
                  <div>
                    <strong className="text-foreground">Authenticate:</strong> Set the API Base URL to{' '}
                    <code className="text-primary font-mono">{apiClient.getBaseUrl()}</code> and click any 1-Click Demo Login button (e.g. Artist or Admin) to connect!
                  </div>
                </div>
              </div>
            </div>

            {/* Features summary */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-2 border-t border-border/40">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero external pip dependencies</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Automatic polycount & bounds</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>1-Click .blend & .fbx append</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Direct studio server upload</span>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setShowBlenderModal(false)} className="text-xs">
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
