'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Lightbulb,
  Box,
  Palette,
  Bone,
  Eye,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

export type PipelineStageName = 'Concept' | 'Model' | 'Texture' | 'Rig' | 'Review' | 'Approved';

export interface PipelineFlowProps {
  currentStage?: PipelineStageName | string;
  className?: string;
  compact?: boolean;
}

interface StageInfo {
  id: PipelineStageName;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  color: string;
}

const STAGES: StageInfo[] = [
  {
    id: 'Concept',
    label: 'Concept',
    description: 'Art direction & moodboards',
    icon: Lightbulb,
    color: 'text-warning bg-warning/10 border-border',
  },
  {
    id: 'Model',
    label: 'Model',
    description: 'High-poly sculpting & topology',
    icon: Box,
    color: 'text-info bg-info/10 border-border',
  },
  {
    id: 'Texture',
    label: 'Texture',
    description: 'PBR maps & material sets',
    icon: Palette,
    color: 'text-accent bg-accent-tint border-border',
  },
  {
    id: 'Rig',
    label: 'Rig',
    description: 'Deformations & constraints',
    icon: Bone,
    color: 'text-text-secondary bg-surface-2 border-border',
  },
  {
    id: 'Review',
    label: 'Review',
    description: 'Turntable QA & inspection',
    icon: Eye,
    color: 'text-warning bg-warning/10 border-border',
  },
  {
    id: 'Approved',
    label: 'Approved',
    description: 'Production sign-off & release',
    icon: CheckCircle2,
    color: 'text-success bg-success/10 border-border',
  },
];

function getStageIndex(stageInput?: string): number {
  if (!stageInput) return 1;
  const s = stageInput.trim().toLowerCase();

  if (s.includes('concept') || s.includes('idea') || s.includes('pre')) return 0;
  if (s.includes('model') || s.includes('draft') || s.includes('mesh')) return 1;
  if (s.includes('texture') || s.includes('material') || s.includes('surf')) return 2;
  if (s.includes('rig') || s.includes('anim') || s.includes('skel')) return 3;
  if (s.includes('review') || s.includes('submit') || s.includes('qa')) return 4;
  if (s.includes('approv') || s.includes('done') || s.includes('finish') || s.includes('complete')) return 5;

  return 1;
}

export default function PipelineFlow({
  currentStage = 'Model',
  className = '',
  compact = false,
}: PipelineFlowProps) {
  const currentIndex = getStageIndex(currentStage);

  return (
    <div className={`p-4 rounded-[12px] border border-border bg-surface shadow-[var(--shadow-pop)] ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          <h3 className="text-xs font-semibold text-text uppercase tracking-wider">
            3D Asset Pipeline
          </h3>
          <span className="text-[11px] text-text-muted">
            • Current: <strong className="text-text font-medium">{STAGES[currentIndex]?.label}</strong>
          </span>
        </div>

        <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-surface-2 text-text-muted border border-border">
          {currentIndex + 1} / {STAGES.length}
        </span>
      </div>

      {/* Nodes and Flow Path */}
      <div className="relative flex items-center justify-between py-1 overflow-x-auto gap-2 sm:gap-0">
        {STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <React.Fragment key={stage.id}>
              {/* Stage Node */}
              <div className="flex flex-col items-center relative z-10 shrink-0 group">
                {/* Node Circle */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all text-xs ${
                    isCompleted
                      ? 'bg-success/10 border-success/30 text-success'
                      : isCurrent
                      ? 'bg-accent text-white border-accent shadow-sm'
                      : 'bg-surface-2 border-border text-text-muted'
                  }`}
                >
                  <Icon className="w-4 h-4" strokeWidth={1.75} />
                </div>

                {/* Node Title */}
                <span
                  className={`mt-1.5 text-[11px] font-medium tracking-tight ${
                    isCurrent
                      ? 'text-text font-semibold'
                      : isCompleted
                      ? 'text-text-secondary'
                      : 'text-text-muted'
                  }`}
                >
                  {stage.label}
                </span>

                {/* Subtitle / Status indicator */}
                <span className="text-[9px] font-mono text-text-muted">
                  {isCompleted ? 'Done' : isCurrent ? 'Active' : 'Pending'}
                </span>

                {/* Hover Tooltip Description */}
                {!compact && (
                  <div className="absolute -bottom-7 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-surface text-text text-[10px] px-2 py-0.5 rounded-[4px] shadow-[var(--shadow-pop)] whitespace-nowrap z-20 border border-border">
                    {stage.description}
                  </div>
                )}
              </div>

              {/* Connecting Hairline between Nodes */}
              {idx < STAGES.length - 1 && (
                <div className="flex-1 h-[1px] mx-2 min-w-[16px] bg-border relative">
                  {idx < currentIndex && (
                    <div className="absolute inset-0 bg-accent" />
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
