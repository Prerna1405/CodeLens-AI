'use client';

import { Check, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProgressPhase {
  name: string;
  status: 'done' | 'active' | 'pending';
}

interface ProgressStepperProps {
  phases: ProgressPhase[];
}

export default function ProgressStepper({ phases }: ProgressStepperProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {phases.map((phase, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-300',
              phase.status === 'done' &&
                'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
              phase.status === 'active' &&
                'border-accent-500/40 bg-accent-500/10 text-accent-300 anim-glow-pulse',
              phase.status === 'pending' &&
                'border-ink-700 bg-ink-800/50 text-ink-500'
            )}
          >
            {phase.status === 'done' ? (
              <Check className="h-3.5 w-3.5 anim-pop-in" strokeWidth={3} />
            ) : phase.status === 'active' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 opacity-50" />
            )}
            <span>{phase.name}</span>
          </div>
          {i < phases.length - 1 && (
            <ChevronRight
              className={cn(
                'h-3.5 w-3.5',
                phase.status === 'done' ? 'text-emerald-500/60' : 'text-ink-600'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
