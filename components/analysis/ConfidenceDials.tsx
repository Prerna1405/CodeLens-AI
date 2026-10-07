'use client';

import { Cpu, Clock, Database, Shield } from 'lucide-react';
import type { AnalysisConfidence } from '@/lib/types/analysis';
import { cn } from '@/lib/utils';

interface ConfidenceDialsProps {
  confidences: AnalysisConfidence;
}

type Level = 'high' | 'medium' | 'low';

const LEVEL_PCT: Record<Level, number> = {
  high: 0.9,
  medium: 0.6,
  low: 0.3,
};

const LEVEL_COLORS: Record<Level, { stroke: string; text: string; ring: string }> = {
  high: { stroke: '#10b981', text: 'text-emerald-400', ring: 'stroke-emerald-500/20' },
  medium: { stroke: '#f59e0b', text: 'text-amber-400', ring: 'stroke-amber-500/20' },
  low: { stroke: '#ef4444', text: 'text-rose-400', ring: 'stroke-rose-500/20' },
};

const DIALS = [
  { key: 'algorithm' as const, label: 'Algorithm', Icon: Cpu },
  { key: 'time' as const, label: 'Time', Icon: Clock },
  { key: 'space' as const, label: 'Space', Icon: Database },
  { key: 'security' as const, label: 'Security', Icon: Shield },
];

function ArcDial({
  value,
  label,
  Icon,
  index,
}: {
  value: Level;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  index: number;
}) {
  const size = 112;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const pct = LEVEL_PCT[value];
  const dashOffset = circumference * (1 - pct);
  const colors = LEVEL_COLORS[value];

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-ink-700/60 bg-ink-900/40 p-4">
      <div className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            strokeWidth={stroke}
            className={cn(colors.ring)}
          />
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            stroke={colors.stroke}
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{
              transition: 'stroke-dashoffset 1.1s cubic-bezier(0.22, 1, 0.36, 1)',
              transitionDelay: `${index * 120 + 80}ms`,
            }}
            ref={(el) => {
              if (el) {
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    el.style.strokeDashoffset = `${dashOffset}`;
                  });
                });
              }
            }}
          />
          <foreignObject x="0" y="0" width={size} height={size}>
            <div className="flex h-full w-full flex-col items-center justify-center">
              <Icon className={cn('h-5 w-5', colors.text)} />
              <span className={cn('mt-1 text-lg font-bold', colors.text)}>
                {Math.round(pct * 100)}%
              </span>
            </div>
          </foreignObject>
        </svg>
      </div>
      <div className="text-center">
        <div className="text-xs font-semibold text-ink-200">{label}</div>
        <div className={cn('text-[10px] font-medium uppercase tracking-wide mt-0.5', colors.text)}>
          {value}
        </div>
      </div>
    </div>
  );
}

export default function ConfidenceDials({ confidences }: ConfidenceDialsProps) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title">Confidence Dials</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {DIALS.map(({ key, label, Icon }, i) => (
          <ArcDial
            key={key}
            value={confidences[key]}
            label={label}
            Icon={Icon}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}
