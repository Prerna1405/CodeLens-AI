'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Trophy,
  Scale,
  CheckSquare2,
  Cpu,
  Timer,
  HardDrive,
  Gauge,
  FlaskConical,
  Shield,
  BookOpen,
  Wrench,
  GitCompare,
  Sparkles,
  Lightbulb,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const DEFAULT_TAB_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  verdict: Trophy,
  overall: Trophy,
  similarity: Scale,
  'semantic-equivalence': Scale,
  'code-similarity': Scale,
  correctness: CheckSquare2,
  algorithm: Cpu,
  'algorithm-logic': Cpu,
  'time-complexity': Timer,
  complexity: Timer,
  'space-complexity': HardDrive,
  benchmark: Gauge,
  'real-benchmark': Gauge,
  'test-cases': FlaskConical,
  tests: FlaskConical,
  security: Shield,
  readability: BookOpen,
  maintainability: Wrench,
  optimization: Sparkles,
  'recommendation-tradeoffs': Lightbulb,
  tradeoffs: Lightbulb,
  confidence: Target,
  compare: GitCompare,
  structure: Cpu,
};

interface ReportTabsSection {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface ReportTabsProps {
  sections: ReportTabsSection[];
  active: string;
  onChange: (id: string) => void;
}

export default function ReportTabs({ sections, active, onChange }: ReportTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  useEffect(() => {
    const btn = chipsRef.current[active];
    const scroller = scrollRef.current;
    if (btn && scroller) {
      const containerRect = scroller.getBoundingClientRect();
      const rect = btn.getBoundingClientRect();
      setIndicator({
        left: rect.left - containerRect.left + scroller.scrollLeft,
        width: rect.width,
      });
      btn.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }
  }, [active, sections.length]);

  return (
    <div className="card p-2 animate-fade-in-down">
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth pb-0.5"
          style={{ scrollbarWidth: 'none' }}
        >
          {sections.map((s) => {
            const Icon = s.icon ?? DEFAULT_TAB_ICONS[s.id] ?? Trophy;
            const isActive = s.id === active;
            return (
              <button
                key={s.id}
                ref={(el) => { chipsRef.current[s.id] = el; }}
                onClick={() => onChange(s.id)}
                className={cn(
                  'chip relative whitespace-nowrap',
                  isActive && 'chip-active shadow-[0_0_0_1px_rgba(48,147,255,0.25)_inset]'
                )}
                role="tab"
                aria-selected={isActive}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{s.label}</span>
              </button>
            );
          })}
        </div>

        <div
          className="pointer-events-none absolute bottom-0 h-0.5 rounded-full bg-gradient-to-r from-accent-500 via-violet-400 to-accent-500 transition-all duration-300 ease-out"
          style={{
            left: indicator ? `${indicator.left}px` : 0,
            width: indicator ? `${indicator.width}px` : 0,
            opacity: indicator ? 1 : 0,
          }}
        />
      </div>
    </div>
  );
}

export { Trophy, Scale, CheckSquare2, Cpu, Timer, HardDrive, Gauge, FlaskConical, Shield, BookOpen, Wrench, GitCompare, Sparkles, Lightbulb, Target };
