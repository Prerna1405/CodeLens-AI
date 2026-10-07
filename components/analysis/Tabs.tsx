'use client';

import { useState, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export const TAB_SECTIONS = [
  'Overall Verdict',
  'Semantic Equivalence',
  'Correctness',
  'Algorithm / Logic',
  'Time Complexity',
  'Space Complexity',
  'Real Benchmark',
  'Test Cases',
  'Security',
  'Readability',
  'Maintainability',
  'Code Similarity',
  'Optimization',
  'Recommendation & Trade-offs',
  'Confidence',
] as const;

export type TabSectionKey = typeof TAB_SECTIONS[number];

export interface TabItem {
  key: string;
  label: string;
  children: ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  orientation?: 'vertical' | 'horizontal';
  defaultOpen?: string;
  open?: string;
  onOpenChange?: (key: string) => void;
}

function StaggeredPanel({ children, keyId }: { children: ReactNode; keyId: string }) {
  return (
    <div
      key={keyId}
      className="h-full w-full"
      style={{ animation: 'fadeInScale 280ms ease-out both' }}
    >
      <div
        className="space-y-4"
        style={{
          animation: 'fadeInUpStagger 500ms ease-out both',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default function Tabs({
  tabs,
  orientation = 'horizontal',
  defaultOpen,
  open: controlledOpen,
  onOpenChange,
}: TabsProps) {
  const [internalOpen, setInternalOpen] = useState<string>(defaultOpen ?? tabs[0]?.key ?? '');
  const isControlled = controlledOpen !== undefined;
  const active = isControlled ? controlledOpen! : internalOpen;

  function setActive(key: string) {
    if (!isControlled) setInternalOpen(key);
    onOpenChange?.(key);
  }

  const isVertical = orientation === 'vertical';

  return (
    <div
      className={cn(
        'card overflow-hidden',
        isVertical ? 'grid gap-0 md:grid-cols-[240px_1fr]' : 'flex flex-col'
      )}
    >
      <div
        className={cn(
          'flex',
          isVertical
            ? 'flex-col border-r border-ink-700/60 bg-ink-900/30 py-2'
            : 'flex-row flex-wrap gap-1 border-b border-ink-700/60 bg-ink-900/30 p-2'
        )}
        role="tablist"
      >
        {tabs.map((tab) => {
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(tab.key)}
              className={cn(
                'group relative flex items-center gap-2 text-left text-sm transition-all duration-200',
                isVertical
                  ? 'w-full px-4 py-2.5'
                  : 'rounded-lg px-3 py-2'
              )}
            >
              {isActive && isVertical && (
                <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r bg-accent-500 anim-pop-in" />
              )}
              {isActive && !isVertical && (
                <span className="absolute inset-0 rounded-lg bg-accent-500/10 ring-1 ring-inset ring-accent-500/30" />
              )}
              {isVertical && (
                <ChevronRight
                  className={cn(
                    'h-3.5 w-3.5 transition-all duration-200 relative z-10',
                    isActive
                      ? 'text-accent-400 translate-x-0.5'
                      : 'text-ink-600 opacity-0 -translate-x-1 group-hover:opacity-50 group-hover:translate-x-0'
                  )}
                />
              )}
              <span
                className={cn(
                  'relative z-10 font-medium truncate',
                  isActive ? 'text-ink-100' : 'text-ink-400 hover:text-ink-200'
                )}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      <div
        className={cn(
          'relative',
          isVertical ? 'min-h-[480px]' : 'min-h-[320px]'
        )}
        role="tabpanel"
      >
        <div className="p-5">
          {tabs.map((tab) =>
            active === tab.key ? (
              <StaggeredPanel keyId={tab.key} key={tab.key}>{tab.children}</StaggeredPanel>
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}
