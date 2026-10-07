'use client';

import { useState } from 'react';
import {
  Cpu,
  ChevronDown,
  Highlighter,
  Repeat,
  GitMerge,
  Recycle,
  Hash,
  Rows3,
  ArrowUpDown,
  Search,
  Blocks,
  Network,
  MoveRight,
  Maximize2,
  LayoutList,
  ListOrdered,
  TreePine,
  Database,
  Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PerSolutionAnalysis, AstAnalysis, StructureNode } from '@/lib/types/analysis';

interface AlgorithmStructurePanelProps {
  title: string;
  solution: PerSolutionAnalysis;
  color: 'emerald' | 'accent';
  onAnchorClick?: (s: number, e: number) => void;
}

const COLOR_MAP: Record<'emerald' | 'accent', { text: string; chip: string; badge: string; ring: string }> = {
  emerald: {
    text: 'text-emerald-400',
    chip: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20',
    badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    ring: 'ring-emerald-500/30',
  },
  accent: {
    text: 'text-accent-400',
    chip: 'border-accent-500/40 bg-accent-500/10 text-accent-300 hover:bg-accent-500/20',
    badge: 'border-accent-500/30 bg-accent-500/10 text-accent-400',
    ring: 'ring-accent-500/30',
  },
};

interface StructureDef {
  key: keyof AstAnalysis;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  plural?: boolean;
}

const STRUCTURES: StructureDef[] = [
  { key: 'loops', label: 'Loops', Icon: Repeat, plural: true },
  { key: 'nestedLoops', label: 'Nested Loops', Icon: GitMerge },
  { key: 'recursions', label: 'Recursion', Icon: Recycle },
  { key: 'hashMaps', label: 'Hash Maps', Icon: Hash, plural: true },
  { key: 'sets', label: 'Sets', Icon: Rows3, plural: true },
  { key: 'sorts', label: 'Sorting', Icon: ArrowUpDown },
  { key: 'searches', label: 'Searching', Icon: Search },
  { key: 'dps', label: 'DP', Icon: Blocks },
  { key: 'graphTraversals', label: 'Graph', Icon: Network },
  { key: 'twoPointers', label: 'Two Pointers', Icon: MoveRight },
  { key: 'slidingWindows', label: 'Sliding Window', Icon: Maximize2 },
  { key: 'stacks', label: 'Stacks', Icon: LayoutList, plural: true },
  { key: 'queues', label: 'Queues', Icon: ListOrdered, plural: true },
  { key: 'treeTraversals', label: 'Trees', Icon: TreePine, plural: true },
  { key: 'queries', label: 'Queries', Icon: Database, plural: true },
  { key: 'functionCalls', label: 'Function Calls', Icon: Bot, plural: true },
];

function StructureChip({
  def,
  nodes,
  color,
  onAnchorClick,
  stagger,
}: {
  def: StructureDef;
  nodes: StructureNode[];
  color: 'emerald' | 'accent';
  onAnchorClick?: (s: number, e: number) => void;
  stagger: number;
}) {
  const c = COLOR_MAP[color];
  if (!nodes || nodes.length === 0) return null;
  const hasAnchors = nodes.some((n) => n.anchors && n.anchors.length > 0);

  const count = nodes.length;
  const label =
    count > 1 && def.plural
      ? `${def.label} (${count})`
      : count > 1
      ? `${def.label} ×${count}`
      : def.label;

  const handleClick = () => {
    if (!hasAnchors || !onAnchorClick) return;
    const first = nodes.find((n) => n.anchors && n.anchors.length > 0);
    if (first && first.anchors && first.anchors[0]) {
      onAnchorClick(first.anchors[0].startLine, first.anchors[0].endLine);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={!hasAnchors || !onAnchorClick}
      className={cn(
        'chip animate-stagger-1',
        hasAnchors && onAnchorClick ? c.chip : '',
        !hasAnchors || !onAnchorClick
          ? 'border-ink-700 bg-ink-800/60 text-ink-300 cursor-default hover:bg-ink-800/60'
          : '',
        'transition-transform hover:scale-[1.02]'
      )}
      style={{ animationDelay: `${stagger * 35}ms` }}
      title={hasAnchors && onAnchorClick ? `Highlight ${def.label.toLowerCase()} in editor` : def.label}
    >
      <def.Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="font-medium">{label}</span>
      {hasAnchors && onAnchorClick && (
        <Highlighter className="h-3 w-3 shrink-0 opacity-70" />
      )}
    </button>
  );
}

export default function AlgorithmStructurePanel({
  title,
  solution,
  color,
  onAnchorClick,
}: AlgorithmStructurePanelProps) {
  const [openWhy, setOpenWhy] = useState(false);
  const c = COLOR_MAP[color];

  const ast = solution.ast;
  const algo = solution.algorithm;
  const timeWorst = solution.time?.worst ?? '—';

  const detected: { def: StructureDef; nodes: StructureNode[] }[] = [];
  if (ast) {
    for (const def of STRUCTURES) {
      const arr = ast[def.key];
      if (Array.isArray(arr) && arr.length > 0) {
        detected.push({ def, nodes: arr });
      }
    }
  }

  return (
    <div className="card p-5 space-y-4 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Cpu className={cn('h-4 w-4', c.text)} />
          <h3 className="section-title">{title}</h3>
        </div>
        {timeWorst !== '—' && (
          <span className={cn('badge font-mono tabular-nums', c.badge)}>
            Worst: {timeWorst}
          </span>
        )}
      </div>

      <div className="rounded-xl border border-ink-700/60 bg-ink-900/40 p-4 animate-stagger-1">
        <div className="flex flex-wrap items-start gap-3">
          <div
            className={cn(
              'inline-flex items-center gap-2 rounded-xl px-3 py-2 border font-semibold text-sm',
              c.badge
            )}
          >
            <Cpu className={cn('h-4 w-4', c.text)} />
            {algo?.label || 'Algorithm pattern detected'}
          </div>
          {algo?.details && (
            <span className="text-xs text-ink-400 pt-1.5">{algo.details}</span>
          )}
        </div>
      </div>

      {detected.length > 0 && (
        <div className="animate-stagger-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-2.5">
            Structures Detected
          </div>
          <div className="flex flex-wrap gap-2">
            {detected.map(({ def, nodes }, i) => (
              <StructureChip
                key={def.key}
                def={def}
                nodes={nodes}
                color={color}
                onAnchorClick={onAnchorClick}
                stagger={i}
              />
            ))}
          </div>
        </div>
      )}

      {algo?.evidence && algo.evidence.length > 0 && (
        <div className="animate-stagger-3">
          <button
            onClick={() => setOpenWhy(!openWhy)}
            className="w-full inline-flex items-center justify-between gap-2 rounded-xl border border-ink-700/60 bg-ink-900/40 hover:bg-ink-800/60 px-4 py-3 text-sm font-medium text-ink-100 transition-colors"
          >
            <span className="inline-flex items-center gap-2">
              <Cpu className={cn('h-4 w-4', c.text)} />
              Why classified as {algo.label}?
            </span>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-ink-400 transition-transform duration-200',
                openWhy && 'rotate-180'
              )}
            />
          </button>
          <div
            className={cn(
              'accordion-content border border-ink-700/60 border-t-0 rounded-b-xl overflow-hidden -mt-1 relative z-0',
              openWhy && 'accordion-open'
            )}
          >
            <ul className="p-4 space-y-2 bg-ink-950/30">
              {algo.evidence.map((ev, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-ink-300 animate-stagger-1"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <span className={cn('mt-1 shrink-0 h-1.5 w-1.5 rounded-full', c.text.replace('text-', 'bg-'))} />
                  <span className="leading-relaxed">{ev}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {detected.length === 0 && !algo?.evidence && (
        <div className="rounded-xl border border-ink-700/60 bg-ink-900/40 p-5 animate-stagger-2">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-ink-800 border border-ink-700 flex items-center justify-center shrink-0">
              <Cpu className="h-4 w-4 text-ink-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-ink-100 mb-0.5">
                Minimal structural information available
              </h4>
              <p className="text-sm text-ink-400">
                AST-based structure detection did not run or returned limited results for this solution.
                Complexity and algorithm labels are still available above.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
