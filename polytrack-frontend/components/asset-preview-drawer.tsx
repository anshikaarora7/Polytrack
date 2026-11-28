'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import PipelineFlow from '@/components/PipelineFlow';
import {
  X,
  Upload,
  Send,
  ThumbsUp,
  ThumbsDown,
  Rotate3d,
  Layers,
  Download,
  Box,
  FileCode,
  HardDrive,
  User,
  FolderOpen
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

const AssetViewer3D = dynamic(() => import('@/components/AssetViewer3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-72 rounded-[12px] bg-surface-2 border border-border flex items-center justify-center text-xs font-mono text-text-muted">
      Loading 3D Viewport...
    </div>
  ),
});

export interface AssetPreviewDrawerProps {
  isOpen: boolean;
  selectedAsset: any;
  assetDetail: any;
  userRole: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onOpenTurntable: () => void;
  onUploadVersion: () => void;
  onSubmitForReview: () => void;
  onReviewApprove: () => void;
  onReviewReject: () => void;
  onDownloadVersion: (assetId: string, versionId: string, fileName: string) => void;
  getStatusDot: (status: string) => string;
}

export default function AssetPreviewDrawer({
  isOpen,
  selectedAsset,
  assetDetail,
  userRole,
  isSubmitting = false,
  onClose,
  onOpenTurntable,
  onUploadVersion,
  onSubmitForReview,
  onReviewApprove,
  onReviewReject,
  onDownloadVersion,
  getStatusDot,
}: AssetPreviewDrawerProps) {
  if (!isOpen || !selectedAsset) return null;

  const currentStatus = (assetDetail?.status || selectedAsset.status || 'Draft').toLowerCase();
  const normalizedRole = (userRole || '').toLowerCase();
  const isLeadOrReviewer = ['studiolead', 'studio_lead', 'admin', 'reviewer', 'projectmanager', 'project_manager'].includes(normalizedRole);
  const isArtist = normalizedRole === 'artist';

  const downloadUrl = assetDetail?.versions?.[0]?.id
    ? `${apiClient.getServerUrl()}/api/assets/${selectedAsset.id}/download/${assetDetail.versions[0].id}`
    : undefined;

  const polygonCount = assetDetail?.versions?.[0]?.polygonCount || selectedAsset?.polygonCount || 24500;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40 transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer Panel */}
      <aside
        className="fixed inset-y-0 right-0 w-full sm:max-w-xl md:max-w-2xl bg-surface border-l border-border shadow-2xl z-50 flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-300 ease-out"
        aria-label="3D Asset Preview Drawer"
      >
        {/* Drawer Header */}
        <div className="h-14 border-b border-border px-5 flex items-center justify-between shrink-0 bg-surface">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-[8px] bg-accent-tint text-accent flex items-center justify-center shrink-0">
              <Box className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-text truncate">
                {assetDetail?.name || selectedAsset.name}
              </h2>
              <p className="text-[11px] text-text-muted truncate">
                {assetDetail?.projectName || selectedAsset.projectName || 'Active Project'} • {assetDetail?.category || selectedAsset.category}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenTurntable}
              className="px-2.5 py-1 rounded-[8px] bg-accent-tint hover:bg-accent hover:text-white text-accent border border-accent/20 text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
            >
              <Rotate3d className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span className="hidden sm:inline">Turntable</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-text-muted hover:text-text rounded-[8px] border border-border hover:bg-surface-2 transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Status & Category Chips */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-surface-2 border border-border text-xs text-text font-medium">
                <span className={`w-2 h-2 rounded-full ${getStatusDot(currentStatus)}`} />
                <span className="capitalize">{assetDetail?.status || selectedAsset.status}</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-[6px] bg-surface-2 text-text-muted border border-border">
                {assetDetail?.category || selectedAsset.category}
              </span>
            </div>

            <span className="text-xs font-mono text-text-muted">
              {polygonCount.toLocaleString()} triangles
            </span>
          </div>

          {/* Description */}
          {assetDetail?.description && (
            <p className="text-xs text-text-secondary leading-relaxed bg-surface-2 p-3 rounded-[8px] border border-border">
              {assetDetail.description}
            </p>
          )}

          {/* 3D Studio Pipeline Progress Visualizer */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
              Studio Pipeline Stage
            </div>
            <PipelineFlow currentStage={assetDetail?.status || selectedAsset.status} />
          </div>

          {/* Interactive 3D Viewport with OrbitControls & Touch Support */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider flex items-center justify-between">
              <span>Interactive 3D Preview</span>
              <span className="text-[10px] font-mono text-accent">WebGL Stage</span>
            </div>
            <AssetViewer3D
              url={downloadUrl}
              assetName={assetDetail?.name || selectedAsset.name}
              category={assetDetail?.category || selectedAsset.category}
              polygonCount={polygonCount}
              className="w-full h-72 sm:h-80 rounded-[12px]"
              autoRotate={true}
              showWireframeToggle={true}
            />
          </div>

          {/* Studio Lead / Artist Review Action Bar */}
          <div className="p-3.5 bg-surface-2 border border-border rounded-[10px] space-y-3">
            <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
              Studio Actions
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={onUploadVersion}
                  className="rounded-[8px] bg-accent hover:bg-accent-hover text-white text-xs flex items-center gap-1.5 h-8 px-3"
                >
                  <Upload className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>Upload Version</span>
                </Button>

                {/* Artist Submit Button */}
                {(currentStatus === 'draft' || isArtist) && currentStatus !== 'approved' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onSubmitForReview}
                    disabled={isSubmitting || currentStatus === 'submitted' || currentStatus === 'review'}
                    className="rounded-[8px] text-xs flex items-center gap-1.5 h-8 px-3 border-border"
                  >
                    <Send className="w-3.5 h-3.5 text-accent" strokeWidth={1.75} />
                    <span>{currentStatus === 'submitted' || currentStatus === 'review' ? 'In Review' : 'Submit for Review'}</span>
                  </Button>
                )}
              </div>

              {/* Studio Lead & Reviewer Actions */}
              {isLeadOrReviewer && (currentStatus === 'submitted' || currentStatus === 'review' || currentStatus === 'draft') && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={onReviewApprove}
                    className="rounded-[8px] bg-success hover:bg-success/90 text-white text-xs flex items-center gap-1.5 h-8 px-3 shadow-xs"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span>Approve</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={onReviewReject}
                    className="rounded-[8px] bg-danger hover:bg-danger/90 text-white text-xs flex items-center gap-1.5 h-8 px-3 shadow-xs"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span>Request Changes</span>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Version History */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold text-text uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-accent" strokeWidth={1.75} />
              <span>Version History ({assetDetail?.versions?.length || 0})</span>
            </h3>

            <div className="border border-border rounded-[10px] overflow-hidden bg-surface">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-surface-2 border-b border-border text-text-muted">
                    <tr>
                      <th className="p-2.5">Version</th>
                      <th className="p-2.5">File Name</th>
                      <th className="p-2.5">Polygons</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Uploaded</th>
                      <th className="p-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {assetDetail?.versions?.length ? (
                      assetDetail.versions.map((ver: any) => (
                        <tr key={ver.id} className="hover:bg-surface-2/60 transition-colors">
                          <td className="p-2.5 font-semibold text-accent font-mono">V{ver.versionNumber}</td>
                          <td className="p-2.5 font-mono text-text max-w-[140px] truncate" title={ver.fileName}>
                            {ver.fileName}
                          </td>
                          <td className="p-2.5 text-text-muted tabular-nums">
                            {ver.polygonCount ? `${ver.polygonCount.toLocaleString()} tris` : '—'}
                          </td>
                          <td className="p-2.5 capitalize">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(ver.status || 'draft')}`} />
                              <span>{ver.status}</span>
                            </div>
                          </td>
                          <td className="p-2.5 text-text-muted">
                            {new Date(ver.uploadedAt).toLocaleDateString()}
                          </td>
                          <td className="p-2.5 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onDownloadVersion(selectedAsset.id, ver.id, ver.fileName)}
                              className="h-6 text-[10px] px-2 rounded-[6px] flex items-center gap-1 border-border"
                            >
                              <Download className="w-3 h-3" strokeWidth={1.75} />
                              <span>Download</span>
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-text-muted text-xs">
                          No version files uploaded yet. Click &quot;Upload Version&quot; above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
