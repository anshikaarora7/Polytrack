'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Upload,
  Search,
  Filter,
  Image as ImageIcon,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Trash2,
  Download,
  Box,
  Layers,
  Send,
  Sparkles,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  ExternalLink,
  Tag,
  Rotate3d
} from 'lucide-react';
import dynamic from 'next/dynamic';
import AssetTurntableModal from '@/components/asset-turntable-modal';
import PipelineFlow from '@/components/PipelineFlow';

const AssetViewer3D = dynamic(
  () => import('@/components/AssetViewer3D'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-72 rounded-xl bg-card/60 border border-border/50 flex items-center justify-center font-mono text-xs text-muted-foreground animate-pulse">
        Initializing Studio 3D Viewport...
      </div>
    ),
  }
);

export default function AssetsManager() {
  const { user } = useAuthStore();
  const userRole = (user?.role || '').toLowerCase();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // 3D Turntable Modal state
  const [turntableAsset, setTurntableAsset] = useState<any | null>(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Create Asset Form
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    category: 'Prop',
    projectId: '',
    tags: 'prop, 3d, hardsurface',
  });

  // Upload Version Form
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [versionNotes, setVersionNotes] = useState('V2 refinement and clean topology');
  const [versionPolys, setVersionPolys] = useState(25000);
  const [versionMaterials, setVersionMaterials] = useState(2);

  // Review Form
  const [reviewApproved, setReviewApproved] = useState(true);
  const [reviewNotes, setReviewNotes] = useState('');

  // Comments state
  const [commentText, setCommentText] = useState('');

  // Projects fetch
  const { data: projectsData } = useSWR('asset-projects', () => apiClient.getProjects());
  const projects = projectsData?.data || [];

  // Assets fetch
  const { data: assetsData, mutate: mutateAssets, isLoading } = useSWR(
    ['assets-search', selectedProjectId, selectedCategory, selectedStatus, searchQuery],
    () =>
      apiClient.searchAssets({
        query: searchQuery || undefined,
        projectId: selectedProjectId || undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
      })
  );

  const assets = assetsData?.data || [];

  // Selected Asset Details fetch
  const { data: assetDetail, mutate: mutateAssetDetail } = useSWR(
    selectedAsset?.id ? `asset-detail-${selectedAsset.id}` : null,
    () => (selectedAsset?.id ? apiClient.getAssetById(selectedAsset.id) : null)
  );

  const statusColors: Record<string, string> = {
    draft: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/30',
    submitted: 'bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_8px_rgba(59,130,246,0.2)]',
    review: 'bg-purple-500/10 text-purple-400 border-purple-500/30 shadow-[0_0_8px_rgba(168,85,247,0.2)]',
    approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.25)]',
    rejected: 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.2)]',
    archived: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    const projId = createForm.projectId || (projects[0]?.id ?? '');
    if (!createForm.name || !projId) {
      alert('Please fill in asset name and select a project.');
      return;
    }

    setIsSubmitting(true);
    try {
      const tagList = createForm.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await apiClient.createAsset({
        name: createForm.name,
        description: createForm.description || undefined,
        category: createForm.category,
        projectId: projId,
        tags: tagList,
      });

      setShowCreateModal(false);
      setCreateForm({
        name: '',
        description: '',
        category: 'Prop',
        projectId: projects[0]?.id || '',
        tags: 'prop, 3d',
      });
      mutateAssets();
      setStatusMessage(`Asset "${createForm.name}" created successfully!`);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create asset');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionFile || !selectedAsset) {
      alert('Please select a 3D file (.blend, .fbx, .obj, .glb)');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.uploadAssetVersion(selectedAsset.id, versionFile, {
        notes: versionNotes,
        polygonCount: Number(versionPolys),
        materialCount: Number(versionMaterials),
      });

      setShowUploadModal(false);
      setVersionFile(null);
      mutateAssets();
      if (selectedAsset?.id) mutateAssetDetail();
      setStatusMessage('New version uploaded to studio storage!');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to upload version');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!selectedAsset) return;
    setIsSubmitting(true);
    try {
      await apiClient.submitAsset(selectedAsset.id);
      mutateAssets();
      mutateAssetDetail();
      setStatusMessage('Asset submitted for review!');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit asset');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    setIsSubmitting(true);
    try {
      await apiClient.reviewAsset(selectedAsset.id, {
        approved: reviewApproved,
        notes: reviewNotes,
      });
      setShowReviewModal(false);
      setReviewNotes('');
      mutateAssets();
      mutateAssetDetail();
      setStatusMessage(
        reviewApproved ? 'Asset approved!' : 'Asset rejected with feedback notes.'
      );
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadVersion = (assetId: string, versionId: string, fileName: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
    const downloadUrl = apiClient.getAssetDownloadUrl(assetId, versionId);
    
    // Trigger browser download via fetch with auth header
    fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => {
        if (!res.ok) throw new Error('Download failed');
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      })
      .catch((err) => alert('Download error: ' + err.message));
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-foreground">3D Asset Management</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/20 text-primary font-semibold border border-primary/30">
              Studio Storage
            </span>
          </div>
          <p className="text-muted-foreground mt-1">
            Store, version, inspect, and approve .blend, .fbx, and 3D textures
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              if (projects.length > 0) {
                setCreateForm((prev) => ({ ...prev, projectId: projects[0].id }));
              }
              setShowCreateModal(true);
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            New 3D Asset
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-card/60 p-3.5 rounded-xl border border-border">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search assets or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-input border border-border rounded-lg text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-1.5 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="all">All Categories</option>
          <option value="Prop">Props & Objects</option>
          <option value="Character">Characters & Creatures</option>
          <option value="Environment">Environments & Levels</option>
          <option value="Texture">Textures & Materials</option>
          <option value="Animation">Animations</option>
          <option value="Vfx">VFX</option>
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-1.5 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="all">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="Submitted">Submitted for Review</option>
          <option value="Review">In Review</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>

        {/* Project Filter */}
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="px-3 py-1.5 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">All Projects</option>
          {projects.map((p: any) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Assets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i} className="p-6 border-border/50 bg-card/40 animate-pulse">
                <div className="space-y-3">
                  <div className="h-32 bg-muted rounded-lg" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </Card>
            ))}
          </>
        ) : assets.length > 0 ? (
          assets.map((asset: any) => {
            const sKey = (asset.status || 'draft').toLowerCase();
            const badgeClass = statusColors[sKey] || statusColors['draft'];

            return (
              <Card
                key={asset.id}
                onClick={() => setSelectedAsset(asset)}
                className="overflow-hidden border-border/50 bg-card/50 hover:bg-card/90 hover:border-primary/50 cursor-pointer transition-all shadow-sm flex flex-col justify-between"
              >
                <div>
                  {/* 3D Asset Preview Banner */}
                  <div className="h-36 bg-gradient-to-br from-primary/10 via-card to-accent/10 border-b border-border/30 flex items-center justify-center relative p-4 group">
                    <Box className="w-12 h-12 text-primary/40 group-hover:scale-110 transition-transform duration-300" />
                    <span
                      className={`absolute top-2.5 right-2.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${badgeClass}`}
                    >
                      {asset.status}
                    </span>
                    <span className="absolute bottom-2.5 left-2.5 text-[10px] px-2 py-0.5 rounded bg-black/40 text-muted-foreground backdrop-blur-sm">
                      {asset.category}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTurntableAsset(asset);
                      }}
                      className="absolute bottom-2.5 right-2.5 px-2 py-1 rounded-md bg-black/70 hover:bg-primary text-white text-[10px] font-semibold flex items-center gap-1 backdrop-blur-sm transition-all border border-white/10 shadow-md"
                    >
                      <Rotate3d className="w-3 h-3 text-primary group-hover:text-white" />
                      <span>3D View</span>
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-2">
                    <h3 className="font-semibold text-foreground text-sm truncate">{asset.name}</h3>

                    {asset.tags && asset.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {asset.tags.slice(0, 3).map((tag: string) => (
                          <span
                            key={tag}
                            className="text-[10px] px-1.5 py-0.2 rounded bg-muted/60 text-muted-foreground font-mono"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/20">
                      <span>V{asset.versionCount || 1} Published</span>
                      <span>{new Date(asset.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-muted/20 border-t border-border/30 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate max-w-[120px]">
                    {asset.createdBy?.name || 'Studio Team'}
                  </span>
                  <span className="text-primary font-semibold hover:underline">View Asset →</span>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full text-center py-16 border border-dashed border-border/40 rounded-xl bg-card/20">
            <Box className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-foreground font-medium text-sm">No 3D assets found</p>
            <p className="text-muted-foreground text-xs mt-1">
              Click &quot;New 3D Asset&quot; to register and upload .blend, .fbx or texture files.
            </p>
          </div>
        )}
      </div>

      {/* Modal: Create 3D Asset */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 bg-card border-border shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Register New 3D Asset</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAsset} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                  Target Project *
                </label>
                <select
                  required
                  value={createForm.projectId}
                  onChange={(e) => setCreateForm({ ...createForm, projectId: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                >
                  {projects.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.projectCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                  Asset Name *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Cyberpunk Vending Machine"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                  >
                    <option value="Prop">Prop</option>
                    <option value="Character">Character</option>
                    <option value="Environment">Environment</option>
                    <option value="Texture">Texture</option>
                    <option value="Material">Material</option>
                    <option value="Animation">Animation</option>
                    <option value="Vfx">VFX</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="hardsurface, sci-fi"
                    value={createForm.tags}
                    onChange={(e) => setCreateForm({ ...createForm, tags: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Asset description, polycount targets, LODs, PBR texture expectations..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                >
                  {isSubmitting ? 'Creating...' : 'Create Asset'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal: Asset Detail Drawer */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 bg-card border-border shadow-2xl flex flex-col justify-between space-y-5">
            <div>
              {/* Header */}
              <div className="flex items-start justify-between pb-3 border-b border-border">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-foreground">{assetDetail?.name || selectedAsset.name}</h2>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border capitalize ${
                        statusColors[(assetDetail?.status || selectedAsset.status || '').toLowerCase()] ||
                        statusColors['draft']
                      }`}
                    >
                      {assetDetail?.status || selectedAsset.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTurntableAsset(assetDetail || selectedAsset)}
                      className="px-2.5 py-0.5 rounded-md bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Rotate3d className="w-3.5 h-3.5" />
                      <span>3D Turntable</span>
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {assetDetail?.projectName || selectedAsset.projectName} • {assetDetail?.category || selectedAsset.category}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedAsset(null)}
                  className="text-muted-foreground hover:text-foreground text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Description */}
              {assetDetail?.description && (
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                  {assetDetail.description}
                </p>
              )}

              {/* 3D Production Pipeline Flow Visualization */}
              <PipelineFlow
                currentStage={assetDetail?.status || selectedAsset.status}
                className="mt-4"
              />

              {/* Interactive 3D Model Viewport */}
              <div className="mt-4">
                <AssetViewer3D
                  url={
                    assetDetail?.versions?.[0]?.id
                      ? `${apiClient.getServerUrl()}/api/assets/${selectedAsset.id}/download/${assetDetail.versions[0].id}`
                      : undefined
                  }
                  assetName={assetDetail?.name || selectedAsset.name}
                  category={assetDetail?.category || selectedAsset.category}
                  polygonCount={
                    assetDetail?.versions?.[0]?.polygonCount || selectedAsset?.polygonCount || 24500
                  }
                  className="w-full h-72"
                  autoRotate={true}
                />
              </div>

              {/* Review & Upload Action Bar */}
              <div className="mt-4 p-3 bg-card/80 border border-border rounded-xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => setShowUploadModal(true)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload Version
                  </Button>

                  {/* Submit for review button (artist/author) */}
                  {(assetDetail?.status === 'Draft' || selectedAsset.status === 'Draft') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSubmitForReview}
                      disabled={isSubmitting}
                      className="text-xs flex items-center gap-1.5 border-blue-500/40 text-blue-400 hover:bg-blue-500/10"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Submit for Review
                    </Button>
                  )}
                </div>

                {/* Reviewer / Admin Actions */}
                {(assetDetail?.status === 'Submitted' ||
                  assetDetail?.status === 'Review' ||
                  selectedAsset.status === 'Submitted' ||
                  selectedAsset.status === 'Review') &&
                  (userRole === 'admin' ||
                    userRole === 'reviewer' ||
                    userRole === 'projectmanager' ||
                    userRole === 'project_manager') && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setReviewApproved(true);
                          setShowReviewModal(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs flex items-center gap-1"
                      >
                        <ThumbsUp className="w-3 h-3" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setReviewApproved(false);
                          setShowReviewModal(true);
                        }}
                        className="bg-red-600 hover:bg-red-500 text-white text-xs flex items-center gap-1"
                      >
                        <ThumbsDown className="w-3 h-3" />
                        Reject
                      </Button>
                    </div>
                  )}
              </div>

              {/* Version History Table */}
              <div className="mt-5 space-y-3">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" /> Version History ({assetDetail?.versions?.length || 0})
                </h3>

                <div className="border border-border/50 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/40 border-b border-border/40 text-muted-foreground">
                      <tr>
                        <th className="p-2.5">Version</th>
                        <th className="p-2.5">File Name</th>
                        <th className="p-2.5">Polygons</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Uploaded</th>
                        <th className="p-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {assetDetail?.versions?.length ? (
                        assetDetail.versions.map((ver: any) => (
                          <tr key={ver.id} className="hover:bg-card/50 transition-colors">
                            <td className="p-2.5 font-bold text-primary">V{ver.versionNumber}</td>
                            <td className="p-2.5 font-mono text-foreground">{ver.fileName}</td>
                            <td className="p-2.5 text-muted-foreground">
                              {ver.polygonCount ? `${ver.polygonCount.toLocaleString()} polys` : '—'}
                            </td>
                            <td className="p-2.5 capitalize">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  statusColors[(ver.status || 'draft').toLowerCase()] || ''
                                }`}
                              >
                                {ver.status}
                              </span>
                            </td>
                            <td className="p-2.5 text-muted-foreground">
                              {new Date(ver.uploadedAt).toLocaleDateString()}
                            </td>
                            <td className="p-2.5 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownloadVersion(selectedAsset.id, ver.id, ver.fileName)}
                                className="h-6 text-[10px] px-2 flex items-center gap-1 border-primary/40 text-primary hover:bg-primary/10"
                              >
                                <Download className="w-3 h-3" />
                                Download
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-muted-foreground">
                            No version files uploaded yet. Click &quot;Upload Version&quot; above.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setSelectedAsset(null)} className="text-xs">
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal: Upload Version */}
      {showUploadModal && selectedAsset && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 bg-card border-border shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-base font-bold text-foreground">Upload 3D File Version</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadVersion} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                  Select 3D File (.blend, .fbx, .obj, .glb) *
                </label>
                <input
                  required
                  type="file"
                  accept=".blend,.fbx,.obj,.glb,.png,.jpg"
                  onChange={(e) => setVersionFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                    Polygon Count
                  </label>
                  <input
                    type="number"
                    value={versionPolys}
                    onChange={(e) => setVersionPolys(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-input border border-border rounded-lg text-foreground text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                    Materials
                  </label>
                  <input
                    type="number"
                    value={versionMaterials}
                    onChange={(e) => setVersionMaterials(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-input border border-border rounded-lg text-foreground text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                  Revision Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="What changed in this revision (e.g. fixed manifold geometry, UDIM textures baked)..."
                  value={versionNotes}
                  onChange={(e) => setVersionNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowUploadModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                >
                  {isSubmitting ? 'Uploading to Studio...' : 'Upload File'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal: Review Approval/Rejection */}
      {showReviewModal && selectedAsset && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 bg-card border-border shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-base font-bold text-foreground">
                {reviewApproved ? 'Approve 3D Asset' : 'Reject Asset with Feedback'}
              </h2>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReviewDecision} className="space-y-4 text-sm">
              <p className="text-xs text-muted-foreground">
                {reviewApproved
                  ? 'Mark this asset as Approved. The artist will be notified and this version will be locked for production handoff.'
                  : 'Reject this asset. Please provide constructive feedback on topology, UVs, textures, or performance targets.'}
              </p>

              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                  Review Feedback Notes
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder={
                    reviewApproved
                      ? 'Approved for production integration.'
                      : 'Fix normal map seams along the chassis and reduce polycount.'
                  }
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowReviewModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className={
                    reviewApproved
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white text-xs'
                      : 'bg-red-600 hover:bg-red-500 text-white text-xs'
                  }
                >
                  {isSubmitting ? 'Recording...' : reviewApproved ? 'Confirm Approval' : 'Confirm Rejection'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 3D Turntable Modal */}
      {turntableAsset && (
        <AssetTurntableModal
          asset={turntableAsset}
          onClose={() => setTurntableAsset(null)}
        />
      )}
    </div>
  );
}
