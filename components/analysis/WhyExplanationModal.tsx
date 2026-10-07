'use client';

import { useEffect } from 'react';
import { X, Lightbulb, ExternalLink, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WhyExplanationModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  bullets: string[];
  winner?: 'A' | 'B' | 'TIE';
}

function parseLinesFromText(text: string): { text: string; line?: number; endLine?: number }[] {
  const segments: { text: string; line?: number; endLine?: number }[] = [];
  const rangeRegex = /lines\s+(\d+)[-–](\d+)/gi;
  const singleRegex = /line\s+(\d+)/gi;

  let lastIndex = 0;
  const matches: { start: number; end: number; line?: number; endLine?: number; matched: string }[] = [];

  let m: RegExpExecArray | null;
  const rangeRe = /lines\s+(\d+)[-–](\d+)/gi;
  while ((m = rangeRe.exec(text)) !== null) {
    matches.push({
      start: m.index,
      end: m.index + m[0].length,
      line: parseInt(m[1]!, 10),
      endLine: parseInt(m[2]!, 10),
      matched: m[0],
    });
  }
  const singleRe = /line\s+(\d+)/gi;
  while ((m = singleRe.exec(text)) !== null) {
    const cur = m;
    const alreadyInRange = matches.some(
      (rm) => cur.index >= rm.start && cur.index + cur[0].length <= rm.end
    );
    if (!alreadyInRange) {
      matches.push({
        start: m.index,
        end: m.index + m[0].length,
        line: parseInt(m[1]!, 10),
        matched: m[0],
      });
    }
  }
  matches.sort((a, b) => a.start - b.start);

  for (const mm of matches) {
    if (mm.start > lastIndex) {
      segments.push({ text: text.slice(lastIndex, mm.start) });
    }
    segments.push({
      text: mm.matched,
      line: mm.line,
      endLine: mm.endLine,
    });
    lastIndex = mm.end;
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) });
  }
  if (segments.length === 0) segments.push({ text });
  return segments;
}

export default function WhyExplanationModal({
  open,
  onClose,
  title,
  bullets,
  winner,
}: WhyExplanationModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const winnerRingClass =
    winner === 'A'
      ? 'from-emerald-500/40'
      : winner === 'B'
      ? 'from-accent-500/40'
      : 'from-amber-500/40';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          'relative w-full max-w-2xl max-h-[85vh] rounded-2xl bg-ink-900 border border-ink-700/70 shadow-2xl overflow-hidden animate-scale-in'
        )}
        style={{ animationDuration: '260ms' }}
      >
        <div
          className={cn(
            'absolute inset-x-0 top-0 h-px bg-gradient-to-r via-transparent to-transparent',
            winnerRingClass
          )}
        />

        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-3 border-b border-ink-700/60">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
                winner === 'A' && 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30',
                winner === 'B' && 'bg-accent-500/15 text-accent-400 ring-1 ring-accent-500/30',
                winner === 'TIE' && 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30',
                !winner && 'bg-ink-800 text-ink-300 ring-1 ring-ink-700'
              )}
            >
              {winner ? <Trophy className="h-4 w-4" /> : <Lightbulb className="h-4 w-4" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">{title}</h2>
              {winner && (
                <p className="text-xs text-ink-400 mt-0.5">
                  {winner === 'TIE'
                    ? 'Balanced scores across analyzed dimensions'
                    : `Based on weighted scoring favoring Solution ${winner}`}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 h-9 w-9 rounded-lg border border-ink-700/60 bg-ink-800/70 hover:bg-ink-700 text-ink-300 hover:text-white inline-flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto max-h-[calc(85vh-140px)]">
          <ol className="space-y-3.5">
            {bullets.map((b, i) => {
              const segs = parseLinesFromText(b);
              return (
                <li
                  key={i}
                  className="flex items-start gap-3 animate-stagger-1"
                  style={{ animationDelay: `${40 + i * 40}ms` }}
                >
                  <span
                    className={cn(
                      'shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ring-1',
                      winner === 'A' && 'bg-emerald-500/12 text-emerald-300 ring-emerald-500/30',
                      winner === 'B' && 'bg-accent-500/12 text-accent-300 ring-accent-500/30',
                      winner === 'TIE' && 'bg-amber-500/12 text-amber-300 ring-amber-500/30',
                      !winner && 'bg-ink-800 text-ink-300 ring-ink-700'
                    )}
                  >
                    {i + 1}
                  </span>
                  <p className="text-sm text-ink-200 leading-relaxed pt-0.5">
                    {segs.map((s, j) =>
                      s.line != null ? (
                        <button
                          key={j}
                          onClick={() => {
                            /* stub: onAnchorClick callback would be called here */
                          }}
                          className="inline-flex items-center gap-1 mx-0.5 px-1.5 py-0.5 rounded-md font-mono text-[11px] border border-accent-500/40 bg-accent-500/10 text-accent-300 hover:bg-accent-500/20 transition-colors tabular-nums"
                          title="Jump to code"
                        >
                          {s.text}
                        </button>
                      ) : (
                        <span key={j}>{s.text}</span>
                      )
                    )}
                  </p>
                </li>
              );
            })}
          </ol>

          {bullets.length === 0 && (
            <div className="rounded-xl border border-ink-700/60 bg-ink-900/40 p-5 text-sm text-ink-400 text-center">
              No detailed breakdown available for this verdict.
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-ink-700/60 flex flex-wrap items-center justify-end gap-2 bg-ink-900/70">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Close
          </button>
          <button
            onClick={() => {
              /* stub */
            }}
            className="btn-primary"
          >
            <ExternalLink className="h-4 w-4" />
            Go to Editor
          </button>
        </div>
      </div>
    </div>
  );
}
