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
  ChevronRight,
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
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  glow: string;
}

const STAGES: StageInfo[] = [
  {
    id: 'Concept',
    label: 'Concept',
    description: 'Art direction, moodboards & initial silhouettes',
    icon: Lightbulb,
    color: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
    glow: 'rgba(251, 191, 36, 0.4)',
  },
  {
    id: 'Model',
    label: 'Model',
    description: 'High-poly sculpting, retopology & UV unwrap',
    icon: Box,
    color: 'text-blue-400 border-blue-500/40 bg-blue-500/10',
    glow: 'rgba(96, 165, 250, 0.4)',
  },
  {
    id: 'Texture',
    label: 'Texture',
    description: 'PBR shading, albedo, normal & roughness maps',
    icon: Palette,
    color: 'text-purple-400 border-purple-500/40 bg-purple-500/10',
    glow: 'rgba(192, 132, 252, 0.4)',
  },
  {
    id: 'Rig',
    label: 'Rig',
    description: 'Skeleton deformation, skin weighting & constraints',
    icon: Bone,
    color: 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10',
    glow: 'rgba(56, 189, 248, 0.4)',
  },
  {
    id: 'Review',
    label: 'Review',
    description: 'Turntable inspection & art director feedback',
    icon: Eye,
    color: 'text-pink-400 border-pink-500/40 bg-pink-500/10',
    glow: 'rgba(244, 114, 182, 0.4)',
  },
  {
    id: 'Approved',
    label: 'Approved',
    description: 'Final production sign-off & engine export',
    icon: CheckCircle2,
    color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
    glow: 'rgba(52, 211, 153, 0.5)',
  },
];

// Helper to normalize any incoming status to a stage index (0 to 5)
function getStageIndex(stageInput?: string): number {
  if (!stageInput) return 1; // Default to 'Model'
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
    <div className={`p-4 rounded-xl border border-border/60 bg-card/40 backdrop-blur-md ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Asset Production Pipeline
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Current Stage: <span className="font-semibold text-primary">{STAGES[currentIndex]?.label}</span>
            </p>
          </div>
        </div>

        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/30">
          Step {currentIndex + 1} of {STAGES.length}
        </span>
      </div>

      {/* Nodes and Flow Path */}
      <div className="relative flex items-center justify-between py-2 overflow-x-auto gap-2 sm:gap-0">
        {STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isUpcoming = idx > currentIndex;

          return (
            <React.Fragment key={stage.id}>
              {/* Stage Node */}
              <div className="flex flex-col items-center relative z-10 shrink-0 group">
                {/* Node Circle */}
                <motion.div
                  initial={false}
                  animate={{
                    scale: isCurrent ? 1.15 : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center border-2 transition-all shadow-md relative ${
                    isCompleted
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400'
                      : isCurrent
                      ? `${stage.color} ring-4 ring-primary/20`
                      : 'bg-muted/40 border-border/60 text-muted-foreground/60'
                  }`}
                  style={{
                    boxShadow: isCurrent ? `0 0 16px ${stage.glow}` : undefined,
                  }}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />

                  {/* Pulsing indicator ring on current stage */}
                  {isCurrent && (
                    <motion.span
                      animate={{
                        scale: [1, 1.4, 1],
                        opacity: [0.8, 0, 0.8],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="absolute inset-0 rounded-full border-2 border-primary pointer-events-none"
                    />
                  )}
                </motion.div>

                {/* Node Title */}
                <span
                  className={`mt-2 text-[11px] font-medium tracking-tight ${
                    isCurrent
                      ? 'text-foreground font-bold'
                      : isCompleted
                      ? 'text-emerald-400 font-medium'
                      : 'text-muted-foreground'
                  }`}
                >
                  {stage.label}
                </span>

                {/* Subtitle / Status indicator */}
                <span className="text-[9px] font-mono uppercase text-muted-foreground/70">
                  {isCompleted ? '✓ Done' : isCurrent ? '● Active' : 'Waiting'}
                </span>

                {/* Hover Tooltip Description (only when not in compact mode) */}
                {!compact && (
                  <div className="absolute -bottom-8 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-popover/90 text-popover-foreground text-[10px] px-2 py-0.5 rounded shadow-md whitespace-nowrap z-20 border border-border">
                    {stage.description}
                  </div>
                )}
              </div>

              {/* Connecting Line between Nodes */}
              {idx < STAGES.length - 1 && (
                <div className="flex-1 h-0.5 mx-1.5 sm:mx-2 min-w-[20px] bg-border/40 relative overflow-hidden rounded-full">
                  {/* Glowing Animated Progress Bar */}
                  {idx < currentIndex && (
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.5, ease: 'easeOut', delay: idx * 0.1 }}
                      className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-primary origin-left shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                    />
                  )}

                  {/* Flow Pulse for Current Active Transition */}
                  {idx === currentIndex - 1 && (
                    <motion.div
                      animate={{
                        x: ['-100%', '100%'],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                      className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent"
                    />
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
