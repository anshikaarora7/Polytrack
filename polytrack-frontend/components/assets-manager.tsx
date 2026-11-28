'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { apiClient, formatApiError } from '@/lib/api-client';
import { ErrorWarningCard } from '@/components/ui/error-warning';
import { useAuthStore } from '@/lib/auth-store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Upload,
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  Trash2,
  Download,
  Box,
  Layers,
  Send,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  Rotate3d,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import AssetTurntableModal from '@/components/asset-turntable-modal';
import PipelineFlow from '@/components/PipelineFlow';
import AssetPreviewDrawer from '@/components/asset-preview-drawer';

const AssetViewer3D = dynamic(
  () => import('@/components/AssetViewer3D'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-72 rounded-[12px] bg-surface-2 border border-border flex items-center justify-center font-mono text-xs text-text-muted">
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Projects fetch
  const { data: projectsData } = useSWR('asset-projects', () => apiClient.getProjects());
  const projects = projectsData?.data || [];

  // Assets fetch
  const {
    data: assetsData,
    mutate: mutateAssets,
    isLoading,
    error: assetsError,
  } = useSWR(
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

  const getStatusDot = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'bg-success';
      case 'submitted':
        return 'bg-info';
      case 'review':
        return 'bg-warning';
      case 'rejected':
        return 'bg-danger';
      case 'draft':
      default:
        return 'bg-text-muted';
    }
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    const projId = createForm.projectId || (projects[0]?.id ?? '');
    if (!createForm.name || !projId) {
      setErrorMessage('Please fill in asset name and select a project.');
      return;
    }

    setIsSubmitting(true);
    try {
      const tagList = createForm.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      await apiClient.createAsset({
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
      const parsed = formatApiError(err);
      setErrorMessage(parsed.message || 'Failed to create asset');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionFile || !selectedAsset) {
      setErrorMessage('Please select a 3D file (.blend, .fbx, .obj, .glb)');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
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
      const parsed = formatApiError(err);
      setErrorMessage(parsed.message || 'Failed to upload version');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!selectedAsset) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await apiClient.submitAsset(selectedAsset.id);
      mutateAssets();
      mutateAssetDetail();
      setStatusMessage('Asset submitted for review!');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      const parsed = formatApiError(err);
      setErrorMessage(parsed.message || 'Failed to submit asset');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    setIsSubmitting(true);
    setErrorMessage(null);
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
      const parsed = formatApiError(err);
      setErrorMessage(parsed.message || 'Failed to record review decision');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadVersion = (assetId: string, versionId: string, fileName: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
    const downloadUrl = apiClient.getAssetDownloadUrl(assetId, versionId);
    
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
      .catch((err) => {
        const parsed = formatApiError(err);
        setErrorMessage(parsed.message || 'Download error');
      });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-[-0.01em] text-text">3D Asset Management</h1>
            <span className="text-xs px-2 py-0.5 rounded-[8px] bg-accent-tint text-accent font-medium border border-border">
              Studio Storage
            </span>
          </div>
          <p className="text-sm text-text-muted mt-0.5">
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
            className="rounded-[8px] bg-accent hover:bg-accent-hover text-white flex items-center gap-1.5 text-sm h-9 px-3.5 shadow-none"
          >
            <Plus className="w-4 h-4" strokeWidth={1.75} />
            <span>New 3D Asset</span>
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-success/10 border border-success/30 rounded-[8px] text-success text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-destructive/10 border border-destructive/25 rounded-[8px] text-destructive text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-[11px] hover:underline font-mono"
          >
            Dismiss
          </button>
        </div>
      )}

      {assetsError && (
        <ErrorWarningCard
          type={formatApiError(assetsError).type}
          statusCode={formatApiError(assetsError).statusCode}
          title={formatApiError(assetsError).title}
          message={formatApiError(assetsError).message}
          error={assetsError}
          onRetry={() => mutateAssets()}
          showDashboardLink={false}
          showBackLink={false}
        />
      )}

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-surface p-3 rounded-[8px] border border-border shadow-[var(--shadow-pop)]">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Search assets or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
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
          className="px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
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
          className="px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
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
              <Card key={i} className="p-5 border border-border bg-surface rounded-[12px] animate-pulse">
                <div className="space-y-3">
                  <div className="h-32 bg-surface-2 rounded-[8px]" />
                  <div className="h-4 bg-surface-2 rounded-[8px] w-3/4" />
                  <div className="h-3 bg-surface-2 rounded-[8px] w-1/2" />
                </div>
              </Card>
            ))}
          </>
        ) : assets.length > 0 ? (
          assets.map((asset: any) => {
            const sKey = (asset.status || 'draft').toLowerCase();

            return (
              <Card
                key={asset.id}
                onClick={() => setSelectedAsset(asset)}
                className="overflow-hidden border border-border bg-surface hover:border-accent/40 rounded-[12px] cursor-pointer transition-colors shadow-[var(--shadow-pop)] flex flex-col justify-between"
              >
                <div>
                  {/* 3D Asset Preview Banner */}
                  <div className="h-32 bg-surface-2 border-b border-border flex items-center justify-center relative p-4 group">
                    <Box className="w-10 h-10 text-text-muted/40 group-hover:scale-105 transition-transform duration-200" strokeWidth={1.75} />
                    
                    {/* Linear Status Dot */}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-[8px] bg-surface border border-border text-[11px] font-medium text-text">
                      <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(sKey)}`} />
                      <span className="capitalize">{asset.status}</span>
                    </div>

                    <span className="absolute bottom-2.5 left-2.5 text-[10px] px-1.5 py-0.2 rounded-[6px] bg-surface border border-border text-text-muted">
                      {asset.category}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTurntableAsset(asset);
                      }}
                      className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-[6px] bg-surface hover:bg-surface-2 text-text text-[10px] font-medium flex items-center gap-1 border border-border transition-colors shadow-xs"
                    >
                      <Rotate3d className="w-3 h-3 text-accent" strokeWidth={1.75} />
                      <span>3D View</span>
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-3.5 space-y-2">
                    <h3 className="font-semibold text-text text-sm truncate">{asset.name}</h3>

                    {asset.tags && asset.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {asset.tags.slice(0, 3).map((tag: string) => (
                          <span
                            key={tag}
                            className="text-[10px] px-1.5 py-0.2 rounded bg-surface-2 border border-border text-text-muted font-mono"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-text-muted pt-2 border-t border-border">
                      <span className="tabular-nums">V{asset.versionCount || 1} Published</span>
                      <span>{new Date(asset.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 bg-surface-2 border-t border-border flex items-center justify-between text-xs">
                  <span className="text-text-muted truncate max-w-[120px]">
                    {asset.createdBy?.name || 'Studio Team'}
                  </span>
                  <span className="text-accent font-medium hover:underline">View Asset →</span>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full text-center py-16 border border-dashed border-border rounded-[12px] bg-surface-2/30">
            <Box className="w-10 h-10 text-text-muted/40 mx-auto mb-2" strokeWidth={1.75} />
            <p className="text-text font-medium text-sm">No 3D assets found</p>
            <p className="text-text-muted text-xs mt-1">
              Click &quot;New 3D Asset&quot; to register and upload .blend, .fbx or texture files.
            </p>
          </div>
        )}
      </div>

      {/* Modal: Create 3D Asset */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-5 bg-surface border border-border rounded-[12px] shadow-[var(--shadow-pop)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-base font-semibold text-text">Register New 3D Asset</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-text-muted hover:text-text text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAsset} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-text mb-1">
                  Target Project *
                </label>
                <select
                  required
                  value={createForm.projectId}
                  onChange={(e) => setCreateForm({ ...createForm, projectId: e.target.value })}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                >
                  {projects.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.projectCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1">
                  Asset Name *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Cyberpunk Vending Machine"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text mb-1">
                    Category *
                  </label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
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
                  <label className="block text-xs font-medium text-text mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="hardsurface, sci-fi"
                    value={createForm.tags}
                    onChange={(e) => setCreateForm({ ...createForm, tags: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Asset description, polycount targets, LODs, PBR texture expectations..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm resize-none focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-[8px] text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-[8px] bg-accent hover:bg-accent-hover text-white text-xs"
                >
                  {isSubmitting ? 'Creating...' : 'Create Asset'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Slide-over Interactive 3D Asset Preview Drawer */}
      <AssetPreviewDrawer
        isOpen={Boolean(selectedAsset)}
        selectedAsset={selectedAsset}
        assetDetail={assetDetail}
        userRole={userRole}
        isSubmitting={isSubmitting}
        onClose={() => setSelectedAsset(null)}
        onOpenTurntable={() => setTurntableAsset(assetDetail || selectedAsset)}
        onUploadVersion={() => setShowUploadModal(true)}
        onSubmitForReview={handleSubmitForReview}
        onReviewApprove={() => {
          setReviewApproved(true);
          setShowReviewModal(true);
        }}
        onReviewReject={() => {
          setReviewApproved(false);
          setShowReviewModal(true);
        }}
        onDownloadVersion={handleDownloadVersion}
        getStatusDot={getStatusDot}
      />

      {/* Modal: Upload Version */}
      {showUploadModal && selectedAsset && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-5 bg-surface border border-border rounded-[12px] shadow-[var(--shadow-pop)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-base font-semibold text-text">Upload 3D File Version</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-text-muted hover:text-text text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadVersion} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-text mb-1">
                  Select 3D File (.blend, .fbx, .obj, .glb) *
                </label>
                <input
                  required
                  type="file"
                  accept=".blend,.fbx,.obj,.glb,.png,.jpg"
                  onChange={(e) => setVersionFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-text file:mr-2 file:py-1 file:px-2.5 file:rounded-[6px] file:border-0 file:text-xs file:bg-surface file:border file:border-border file:text-text hover:file:bg-surface-2 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text mb-1">
                    Polygon Count
                  </label>
                  <input
                    type="number"
                    value={versionPolys}
                    onChange={(e) => setVersionPolys(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-[8px] text-text text-xs focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text mb-1">
                    Materials
                  </label>
                  <input
                    type="number"
                    value={versionMaterials}
                    onChange={(e) => setVersionMaterials(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-[8px] text-text text-xs focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1">
                  Revision Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="What changed in this revision (e.g. fixed manifold geometry, UDIM textures baked)..."
                  value={versionNotes}
                  onChange={(e) => setVersionNotes(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-[8px] text-text text-xs resize-none focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowUploadModal(false)}
                  className="rounded-[8px] text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-[8px] bg-accent hover:bg-accent-hover text-white text-xs"
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
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-5 bg-surface border border-border rounded-[12px] shadow-[var(--shadow-pop)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-base font-semibold text-text">
                {reviewApproved ? 'Approve 3D Asset' : 'Reject Asset with Feedback'}
              </h2>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-text-muted hover:text-text text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReviewDecision} className="space-y-4 text-sm">
              <p className="text-xs text-text-muted">
                {reviewApproved
                  ? 'Mark this asset as Approved. The artist will be notified and this version will be locked for production handoff.'
                  : 'Reject this asset. Please provide constructive feedback on topology, UVs, textures, or performance targets.'}
              </p>

              <div>
                <label className="block text-xs font-medium text-text mb-1">
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
                  className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-[8px] text-text text-xs resize-none focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowReviewModal(false)}
                  className="rounded-[8px] text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className={`rounded-[8px] text-white text-xs ${
                    reviewApproved ? 'bg-success hover:bg-success/90' : 'bg-danger hover:bg-danger/90'
                  }`}
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
