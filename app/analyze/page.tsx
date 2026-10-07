'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamicImport from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import {
  Play, Loader2, Zap, Clock, Brain, TrendingUp,
  RefreshCw, ChevronRight, Sliders, ShieldCheck, BookOpen,
  X, Highlighter, Code2, FlaskConical as FlaskIcon,
} from 'lucide-react';
import type { editor as MonacoEditorTypes } from 'monaco-editor';
import { cn, formatDate } from '@/lib/utils';
import { LANGUAGES } from '@/lib/config/languages';
import type {
  AnalysisReport,
  PriorityWeights,
  ExplanationLevel,
  PerSolutionAnalysis,
  EdgeCase,
  SecurityFinding,
  BenchmarkReport,
  GeneratedTestCase,
  TestResultStatus,
} from '@/lib/types/analysis';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import VerdictSummaryCard from '@/components/analysis/VerdictSummaryCard';
import SimilarityPanel from '@/components/analysis/SimilarityPanel';
import BenchmarkTable from '@/components/analysis/BenchmarkTable';
import TestCasesPanel from '@/components/analysis/TestCasesPanel';
import { BugFindingsList, SecurityFindingsList } from '@/components/analysis/BugFindingsList';
import FinalScoresTable from '@/components/analysis/FinalScoresTable';
import OptimizationDiffView from '@/components/analysis/OptimizationDiffView';
import WhyExplanationModal from '@/components/analysis/WhyExplanationModal';
import ReportTabs, { DEFAULT_TAB_ICONS } from '@/components/analysis/ReportTabs';
import AlgorithmStructurePanel from '@/components/analysis/AlgorithmStructurePanel';
import MultiSolutionComparison from '@/components/analysis/MultiSolutionComparison';

export const dynamic = 'force-dynamic';

const MonacoEditor = dynamicImport(
  () => import('@monaco-editor/react').then((mod) => mod.default),
  { ssr: false }
);

const DEFAULT_PRIORITIES: PriorityWeights = {
  performance: 25,
  memory: 15,
  readability: 15,
  maintainability: 15,
  security: 10,
  interview: 10,
  production: 10,
};

const DEMO_PROBLEM = `Two Sum: Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.`;

const DEMO_A = `def two_sum(nums, target):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
    return []`;

const DEMO_B = `import java.util.HashMap;
class Solution {
  public int[] twoSum(int[] nums, int target) {
    HashMap<Integer,Integer> map = new HashMap<>();
    for (int i=0;i<nums.length;i++) {
      int complement = target - nums[i];
      if (map.containsKey(complement))
        return new int[]{ map.get(complement), i };
      map.put(nums[i], i);
    }
    return new int[0];
  }
}`;

const REPORT_SECTIONS = [
  { id: 'verdict', label: 'Overall Verdict' },
  { id: 'semantic-equivalence', label: 'Semantic Equivalence' },
  { id: 'correctness', label: 'Correctness' },
  { id: 'algorithm', label: 'Algorithm / Logic' },
  { id: 'time', label: 'Time Complexity' },
  { id: 'space', label: 'Space Complexity' },
  { id: 'benchmark', label: 'Real Benchmark' },
  { id: 'tests', label: 'Test Cases' },
  { id: 'security', label: 'Security' },
  { id: 'readability', label: 'Readability' },
  { id: 'maintainability', label: 'Maintainability' },
  { id: 'similarity', label: 'Code Similarity' },
  { id: 'optimization', label: 'Optimization' },
  { id: 'recommendation', label: 'Recommendation' },
  { id: 'confidence', label: 'Confidence' },
];

function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'sess-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const SESSION_KEY = 'whitecode.sessionId';

type EditorRef = MonacoEditorTypes.IStandaloneCodeEditor | null;

function ConfidenceBadge({ level }: { level: 'high' | 'medium' | 'low' }) {
  const cls =
    level === 'high' ? 'badge-high' : level === 'medium' ? 'badge-med' : 'badge-low';
  return (
    <span className={cn('badge', cls)}>
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  );
}

function OverallBadge({ label }: { label: 'A' | 'B' | 'TIE' }) {
  if (label === 'TIE') return <span className="badge badge-med">TIE</span>;
  return (
    <span className={cn('badge', label === 'A' ? 'badge-high' : 'badge-high')}>
      {label} wins
    </span>
  );
}

function AnchorBanner({ anchor, onClose }: { anchor: { label: string; start: number; end: number; side: 'A' | 'B' }; onClose: () => void }) {
  const color = anchor.side === 'A' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200' : 'bg-accent-500/15 border-accent-500/30 text-accent-200';
  return (
    <div className={cn('animate-slide-in-right fixed bottom-6 right-6 z-40 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur max-w-sm', color)}>
      <div className="flex items-start gap-3">
        <Highlighter className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wide font-semibold opacity-80">Solution {anchor.side} · Highlighted</div>
          <div className="text-sm font-medium mt-0.5">{anchor.label}</div>
          <div className="text-xs mt-1 opacity-80 font-mono tabular-nums">
            Lines {anchor.start}{anchor.end !== anchor.start ? `–${anchor.end}` : ''}
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-white/10 transition">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function AnalyzePageInner() {
  const params = useSearchParams();
  const useDemo = params.get('demo') === 'true';

  const [sessionId, setSessionId] = useState<string>('');
  const [problem, setProblem] = useState(useDemo ? DEMO_PROBLEM : '');
  const [codeA, setCodeA] = useState(useDemo ? DEMO_A : '');
  const [codeB, setCodeB] = useState(useDemo ? DEMO_B : '');
  const [langA, setLangA] = useState(useDemo ? 'python' : 'javascript');
  const [langB, setLangB] = useState(useDemo ? 'java' : 'javascript');
  const [priorities, setPriorities] = useState<PriorityWeights>(DEFAULT_PRIORITIES);
  const [explanationLevel, setExplanationLevel] = useState<ExplanationLevel>('normal');
  const [interviewMode, setInterviewMode] = useState(false);
  const [staticOnly, setStaticOnly] = useState(false);
  const [skipCache, setSkipCache] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [cached, setCached] = useState(false);

  const [activeTab, setActiveTab] = useState('verdict');
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);
  const [testsLoading, setTestsLoading] = useState(false);

  const [whyOpen, setWhyOpen] = useState(false);
  const [whyTitle, setWhyTitle] = useState('Why does WhiteCode say this?');
  const [whyBullets, setWhyBullets] = useState<string[]>([]);
  const [whyWinner, setWhyWinner] = useState<'A' | 'B' | 'TIE'>('TIE');

  const [showOptDiffA, setShowOptDiffA] = useState(false);
  const [showOptDiffB, setShowOptDiffB] = useState(false);

  const editorARef = useRef<EditorRef>(null);
  const editorBRef = useRef<EditorRef>(null);
  const decorA = useRef<string[]>([]);
  const decorB = useRef<string[]>([]);
  const [anchorBanner, setAnchorBanner] = useState<{ label: string; start: number; end: number; side: 'A' | 'B' } | null>(null);

  useEffect(() => {
    let stored = typeof window !== 'undefined' ? window.localStorage.getItem(SESSION_KEY) : null;
    if (!stored) {
      stored = generateSessionId();
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SESSION_KEY, stored);
      }
    }
    setSessionId(stored);
  }, []);

  const highlightLinesInMonaco = useCallback((side: 'A' | 'B', startLine: number, endLine: number, label: string) => {
    const editor = side === 'A' ? editorARef.current : editorBRef.current;
    const decorRef = side === 'A' ? decorA : decorB;
    setAnchorBanner({ label, start: startLine, end: endLine, side });
    if (!editor) return;
    try {
      if (decorRef.current.length) {
        editor.deltaDecorations(decorRef.current, []);
      }
      const newDecor = editor.deltaDecorations([], [
        {
          range: new (globalThis as any).monaco.Range(startLine, 1, endLine, 99999),
          options: {
            isWholeLine: true,
            className: side === 'A' ? 'wc-highlight-a' : 'wc-highlight-b',
            glyphMarginClassName: side === 'A' ? 'wc-glyph-a' : 'wc-glyph-b',
            overviewRuler: {
              color: side === 'A' ? '#10b98155' : '#3093ff55',
              position: (globalThis as any).monaco.editor.OverviewRulerLane?.Full ?? 4,
            },
          },
        },
      ]);
      decorRef.current = newDecor;
      editor.revealRangeInCenterIfOutsideViewport(
        new (globalThis as any).monaco.Range(startLine, 1, endLine, 1),
        (globalThis as any).monaco.editor.ScrollType?.Smooth ?? 1,
      );
    } catch {
      // Monaco globals not ready — banner is already shown, so user still has feedback
    }
  }, []);

  const handleAnchorFrom = (side: 'A' | 'B') => (start: number, end: number, label = 'Selected code') => {
    highlightLinesInMonaco(side, start, end, label);
  };

  async function handleAnalyze() {
    if (!codeA.trim() || !codeB.trim()) {
      setError('Both code snippets are required.');
      return;
    }
    setLoading(true);
    setError(null);
    setShowOptDiffA(false);
    setShowOptDiffB(false);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem,
          codeA,
          codeB,
          langA,
          langB,
          priorities,
          explanationLevel,
          interviewMode,
          staticOnly,
          skipCache,
          sessionId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || data?.detail || `Request failed (${res.status})`);
      }
      setReport(data.report);
      setCached(!!data.cached);
      setActiveTab('verdict');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleRunBenchmark() {
    if (!report) return;
    setBenchmarkLoading(true);
    try {
      const res = await fetch('/api/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem,
          codeA, codeB, langA, langB,
          sizes: [100, 1000, 10000],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || data?.detail || 'Benchmark failed');
      const mergedBenchmark: BenchmarkReport = {
        available: data.available ?? false,
        unavailableReason: data.unavailableReason ?? data.reason,
        reason: data.reason,
        points: [],
        observedA: 'Measured (see table)',
        observedB: 'Measured (see table)',
        sizes: data.sizes,
        codeA: data.codeA,
        codeB: data.codeB,
        notes: data.notes,
        generatedAt: data.generatedAt ?? new Date().toISOString(),
      };
      setReport({ ...report, benchmark: mergedBenchmark });
      setActiveTab('benchmark');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBenchmarkLoading(false);
    }
  }

  async function handleGenerateTests() {
    if (!report) return;
    setTestsLoading(true);
    try {
      const res = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem, codeA, codeB, langA, langB }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || data?.detail || 'Tests failed');
      const tests: GeneratedTestCase[] = (data.tests ?? []).map((t: any) => ({
        ...t,
        resultA: normalizeTestStatus(t.resultA),
        resultB: normalizeTestStatus(t.resultB),
      }));
      setReport({ ...report, generatedTests: tests });
      setActiveTab('tests');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setTestsLoading(false);
    }
  }

  function normalizeTestStatus(s: any): TestResultStatus | undefined {
    if (!s) return undefined;
    if (typeof s === 'string') {
      const valid: TestResultStatus[] = ['pass', 'fail', 'skip', 'error', 'not_tested', 'timeout'];
      if (valid.includes(s as TestResultStatus)) return s as TestResultStatus;
      if (typeof s === 'object' && (s as any).status) return normalizeTestStatus((s as any).status);
    }
    if (typeof s === 'object') {
      const status = (s as any).status;
      return normalizeTestStatus(status);
    }
    return 'not_tested';
  }

  function openWhyWinner() {
    if (!report) return;
    setWhyTitle(`Why ${report.recommendation.overall === 'TIE' ? 'is it a tie?' : `does Solution ${report.recommendation.overall} win?`}`);
    setWhyBullets(report.recommendation.overallJustification);
    setWhyWinner(report.recommendation.overall);
    setWhyOpen(true);
  }

  function openWhyScoring() {
    if (!report) return;
    setWhyTitle('Final Score Breakdown');
    const b = report.finalScores;
    const bullets: string[] = [];
    (Object.keys(b) as Array<keyof typeof b>).forEach((k, idx) => {
      const va = b[k]!.a;
      const vb = b[k]!.b;
      const winner = va > vb ? 'A' : vb > va ? 'B' : 'TIE';
      bullets.push(`${idx + 1}. ${k}: A=${va} / B=${vb} → favors ${winner}. ${describeDimension(k, va, vb)}`);
    });
    setWhyBullets(bullets);
    setWhyWinner(report.recommendation.overall);
    setWhyOpen(true);
  }

  function describeDimension(dim: string, a: number, b: number): string {
    switch (dim) {
      case 'performance':
        return 'Based on worst-case time complexity notation (higher = faster asymptotic).';
      case 'memory':
        return 'Based on auxiliary-space notation (higher = less memory used).';
      case 'readability':
        return 'Combines whitespace, naming, indentation, and comment density heuristics.';
      case 'maintainability':
        return 'Combines readability with duplication and error-handling evidence.';
      case 'security':
        return 'Penalizes concrete vulnerability patterns detected by static + AI analysis.';
      case 'correctness':
        return 'Penalizes detected bugs and correctness issues flagged by static analysis.';
      case 'scalability':
        return 'Performance weighted by algorithmic scaling properties (nested loops reduce score).';
      default:
        return '';
    }
  }

  const prioritiesSum = useMemo(() => {
    return Object.values(priorities).reduce((a, b) => a + b, 0);
  }, [priorities]);

  const onMonacoMountA = (e: EditorRef) => { editorARef.current = e; };
  const onMonacoMountB = (e: EditorRef) => { editorBRef.current = e; };

  return (
    <div className="min-h-screen bg-ink-950 bg-grid-fade">
      <style jsx global>{`
        .wc-highlight-a { background: rgba(16,185,129,0.22) !important; border-left: 3px solid #10b981; }
        .wc-highlight-b { background: rgba(48,147,255,0.22) !important; border-left: 3px solid #3093ff; }
        .wc-glyph-a { background: #10b98155; width: 3px !important; margin-left: 2px; }
        .wc-glyph-b { background: #3093ff55; width: 3px !important; margin-left: 2px; }
      `}</style>
      <Header />

      <main className="mx-auto max-w-7xl px-6 py-10 space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4 animate-fade-in-up">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Code Comparison Studio
            </h1>
            <p className="mt-2 text-ink-300 max-w-2xl">
              Paste two solutions (same or different languages), tweak the weights, and get a
              grounded, AI-augmented analysis of algorithms, complexity, security, tests, benchmarks and trade-offs.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setProblem(DEMO_PROBLEM);
                setCodeA(DEMO_A);
                setCodeB(DEMO_B);
                setLangA('python');
                setLangB('java');
              }}
              className="btn-secondary"
            >
              <Zap className="h-4 w-4" />
              Load Demo
            </button>
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="btn-primary min-w-[160px] hover-lift"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin-slow" />
                  Analyzing…
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Analyze Code
                </>
              )}
            </button>
          </div>
        </div>

        <div className="card p-5 animate-fade-in-up animate-stagger-1">
          <label className="text-sm font-semibold text-ink-200">Problem Statement</label>
          <textarea
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder="Describe the problem the two solutions solve, including input/output expectations and constraints…"
            className="input-base mt-2 min-h-[96px] resize-y"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card overflow-hidden animate-fade-in-up animate-stagger-2 hover-lift">
            <div className="flex items-center justify-between border-b border-ink-700/60 px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-sm font-semibold text-ink-100">Solution A</span>
              </div>
              <select
                value={langA}
                onChange={(e) => setLangA(e.target.value)}
                className="input-base w-auto !py-1.5 text-xs"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.id} value={l.monacoLanguage}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="h-[340px] border-0">
              <MonacoEditor
                height="100%"
                language={langA}
                theme="vs-dark"
                value={codeA}
                onChange={(v: string | undefined) => setCodeA(v ?? '')}
                onMount={onMonacoMountA as any}
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  automaticLayout: true,
                  glyphMargin: true,
                }}
              />
            </div>
          </div>

          <div className="card overflow-hidden animate-fade-in-up animate-stagger-3 hover-lift">
            <div className="flex items-center justify-between border-b border-ink-700/60 px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-accent-500" />
                <span className="text-sm font-semibold text-ink-100">Solution B</span>
              </div>
              <select
                value={langB}
                onChange={(e) => setLangB(e.target.value)}
                className="input-base w-auto !py-1.5 text-xs"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.id} value={l.monacoLanguage}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="h-[340px] border-0">
              <MonacoEditor
                height="100%"
                language={langB}
                theme="vs-dark"
                value={codeB}
                onChange={(v: string | undefined) => setCodeB(v ?? '')}
                onMount={onMonacoMountB as any}
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  automaticLayout: true,
                  glyphMargin: true,
                }}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="card p-5 animate-fade-in-up animate-stagger-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title flex items-center gap-2">
                <Sliders className="h-4 w-4 text-accent-400" />
                Priority Weights
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-400">
                  Total: <span className="font-mono text-ink-200">{prioritiesSum}</span>/100
                </span>
                <button
                  onClick={() => setPriorities(DEFAULT_PRIORITIES)}
                  className="btn-ghost !py-1 !px-2 text-xs"
                >
                  <RefreshCw className="h-3 w-3" />
                  Reset
                </button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {(Object.keys(priorities) as Array<keyof PriorityWeights>).map((key) => (
                <label key={key} className="block hover-lift rounded-lg p-1 -m-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-ink-200 capitalize">
                      {key === 'performance' && (
                        <TrendingUp className="inline h-3.5 w-3.5 mr-1 -translate-y-px text-emerald-400" />
                      )}
                      {key === 'memory' && (
                        <Clock className="inline h-3.5 w-3.5 mr-1 -translate-y-px text-violet-400" />
                      )}
                      {key === 'readability' && (
                        <BookOpen className="inline h-3.5 w-3.5 mr-1 -translate-y-px text-sky-400" />
                      )}
                      {key === 'security' && (
                        <ShieldCheck className="inline h-3.5 w-3.5 mr-1 -translate-y-px text-rose-400" />
                      )}
                      {key === 'interview' && (
                        <Brain className="inline h-3.5 w-3.5 mr-1 -translate-y-px text-amber-400" />
                      )}
                      {key}
                    </span>
                    <span className="font-mono text-xs text-accent-300 tabular-nums">
                      {priorities[key]}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={priorities[key]}
                    onChange={(e) =>
                      setPriorities({ ...priorities, [key]: parseInt(e.target.value, 10) })
                    }
                    className="w-full accent-accent-500"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="card p-5 space-y-5 animate-fade-in-up animate-stagger-5">
            <div>
              <h3 className="section-title mb-3">Explanation Level</h3>
              <div className="grid grid-cols-3 gap-1.5">
                {(['simple', 'normal', 'expert'] as ExplanationLevel[]).map((lv) => (
                  <button
                    key={lv}
                    onClick={() => setExplanationLevel(lv)}
                    className={cn(
                      'chip justify-center capitalize',
                      explanationLevel === lv && 'chip-active'
                    )}
                  >
                    {lv}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={interviewMode}
                  onChange={(e) => setInterviewMode(e.target.checked)}
                  className="h-4 w-4 rounded border-ink-600 bg-ink-900 text-accent-500"
                />
                <span className="text-sm text-ink-200 group-hover:text-white transition-colors">Interview Mode</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={staticOnly}
                  onChange={(e) => setStaticOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-ink-600 bg-ink-900 text-accent-500"
                />
                <span className="text-sm text-ink-200 group-hover:text-white transition-colors">Heuristic only (no LLM)</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={skipCache}
                  onChange={(e) => setSkipCache(e.target.checked)}
                  className="h-4 w-4 rounded border-ink-600 bg-ink-900 text-accent-500"
                />
                <span className="text-sm text-ink-200 group-hover:text-white transition-colors">Skip cache (re-run)</span>
              </label>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200 animate-fade-in">
            <strong className="font-semibold">Error: </strong>
            {error}
          </div>
        )}

        {report && (
          <section className="space-y-6 animate-fade-in-up">
            <div className="animate-scale-in">
              <VerdictSummaryCard
                report={report}
                onWhyClick={openWhyWinner}
                onRunBenchmark={handleRunBenchmark}
                onRunTests={handleGenerateTests}
                onOptimizeA={() => { setShowOptDiffA(true); setActiveTab('optimization'); }}
                onOptimizeB={() => { setShowOptDiffB(true); setActiveTab('optimization'); }}
                benchmarkLoading={benchmarkLoading}
                testsLoading={testsLoading}
              />
              {cached && (
                <div className="mt-3 flex justify-end">
                  <span className="badge border-accent-500/30 bg-accent-500/10 text-accent-300 animate-pulse-soft">
                    Served from cache · SHA256 input key
                  </span>
                </div>
              )}
            </div>

            <div className="sticky top-0 z-20 -mx-2 px-2 py-3 backdrop-blur-md bg-ink-950/70 border-y border-ink-800/60 rounded-xl">
              <ReportTabs
                sections={REPORT_SECTIONS.map((s) => ({ ...s, icon: DEFAULT_TAB_ICONS[s.id] }))}
                active={activeTab}
                onChange={setActiveTab}
              />
            </div>

            {activeTab === 'verdict' && (
              <div className="space-y-6 animate-fade-in-up">
                <div className="card p-6 space-y-4 animate-stagger-1">
                  <h3 className="section-title">Executive Summary</h3>
                  <p className="text-sm leading-relaxed text-ink-200">{report.narrative.summary}</p>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 hover-lift">
                      <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-2">
                        A · {report.langA}
                      </div>
                      <p className="text-sm text-ink-200 leading-relaxed">{report.narrative.aExplanation}</p>
                    </div>
                    <div className="rounded-lg border border-accent-500/20 bg-accent-500/5 p-4 hover-lift">
                      <div className="text-xs font-semibold text-accent-400 uppercase tracking-wide mb-2">
                        B · {report.langB}
                      </div>
                      <p className="text-sm text-ink-200 leading-relaxed">{report.narrative.bExplanation}</p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-ink-700 bg-ink-900/60 p-4">
                    <div className="text-xs font-semibold text-ink-400 mb-1">Key Difference</div>
                    <p className="text-sm text-ink-200 leading-relaxed">{report.narrative.keyDifference}</p>
                  </div>

                  <div className="rounded-lg border border-ink-700 bg-ink-900/60 p-4">
                    <div className="text-xs font-semibold text-ink-400 mb-1">Logic-Level Difference</div>
                    <p className="text-sm text-ink-200 leading-relaxed">{report.logicDifference}</p>
                  </div>
                </div>

                <div className="animate-stagger-2">
                  <FinalScoresTable scores={report.finalScores} onWhyClick={openWhyScoring} />
                </div>

                <div className="animate-stagger-3">
                  <MultiSolutionComparison report={report} langA={langA} langB={langB} />
                </div>
              </div>
            )}

            {activeTab === 'semantic-equivalence' && (
              <div className="grid gap-4 lg:grid-cols-2 animate-fade-in-up">
                <div className="animate-stagger-1">
                  <SimilarityPanel similarity={report.similarity ?? { text: 0, ast: 0, structural: 0, semantic: 0, verdict: 'n/a', evidence: ['Similarity not computed for this run.'] }} />
                </div>
                <div className="card p-6 animate-stagger-2 space-y-3">
                  <h3 className="section-title flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-violet-400" />
                    Static Analysis Signals
                  </h3>
                  <div className="text-xs text-ink-400">Analysis types used in the above similarity percentages.</div>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="rounded-lg border border-ink-700 bg-ink-900/60 p-3">
                      <div className="text-[11px] uppercase font-semibold text-ink-400">Text Similarity</div>
                      <div className="text-sm text-ink-200 mt-1">Token-level Jaccard overlap (strip comments/strings, lowercase).</div>
                      <span className="mt-2 inline-block badge border-ink-600 bg-ink-800 text-ink-300">Static · Deterministic</span>
                    </div>
                    <div className="rounded-lg border border-ink-700 bg-ink-900/60 p-3">
                      <div className="text-[11px] uppercase font-semibold text-ink-400">AST Overlap</div>
                      <div className="text-sm text-ink-200 mt-1">Counts of structural node types: loops, hashes, recursion, etc.</div>
                      <span className="mt-2 inline-block badge border-ink-600 bg-ink-800 text-ink-300">Static · Heuristic</span>
                    </div>
                    <div className="rounded-lg border border-ink-700 bg-ink-900/60 p-3">
                      <div className="text-[11px] uppercase font-semibold text-ink-400">Structural</div>
                      <div className="text-sm text-ink-200 mt-1">Binary pattern matches: both use nested loops / both use hash maps?</div>
                      <span className="mt-2 inline-block badge border-ink-600 bg-ink-800 text-ink-300">Static · Heuristic</span>
                    </div>
                    <div className="rounded-lg border border-ink-700 bg-ink-900/60 p-3">
                      <div className="text-[11px] uppercase font-semibold text-ink-400">Semantic</div>
                      <div className="text-sm text-ink-200 mt-1">AI-grounded behavioral equivalence, falls back to max(AST,Structural).</div>
                      <span className="badge mt-2 border-violet-500/30 bg-violet-500/10 text-violet-300">AI Analysis</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'correctness' && (
              <div className="grid gap-4 lg:grid-cols-2 animate-fade-in-up">
                <CorrectnessCard title="Solution A · Correctness" color="emerald" solution={report.solutionA} onAnchorClick={handleAnchorFrom('A')} />
                <CorrectnessCard title="Solution B · Correctness" color="accent" solution={report.solutionB} onAnchorClick={handleAnchorFrom('B')} />
                <div className="lg:col-span-2 card p-5 animate-stagger-3">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="section-title flex items-center gap-2">
                      <FlaskIcon className="h-4 w-4 text-amber-400" />
                      Edge Case Coverage
                    </h3>
                    <span className="text-xs text-ink-400">
                      {report.generatedTests?.length ? `${report.generatedTests.filter((t) => t.resultA === 'pass' || t.resultB === 'pass').length} behavioral cases executed` : 'Execute Generate Tests for concrete validation'}
                    </span>
                  </div>
                  <EdgeCaseTable edgeCases={report.edgeCases} tests={report.generatedTests} />
                </div>
              </div>
            )}

            {activeTab === 'algorithm' && (
              <div className="grid gap-4 lg:grid-cols-2 animate-fade-in-up">
                <AlgorithmStructurePanel title="Solution A · Algorithm & Structure" solution={report.solutionA} color="emerald" onAnchorClick={(s, e) => handleAnchorFrom('A')(s, e, 'Structure: ' + (report.solutionA.ast?.loops?.length ? 'Loop' : 'Pattern') + ' region')} />
                <AlgorithmStructurePanel title="Solution B · Algorithm & Structure" solution={report.solutionB} color="accent" onAnchorClick={(s, e) => handleAnchorFrom('B')(s, e, 'Structure pattern')} />
              </div>
            )}

            {activeTab === 'time' && (
              <ComplexitySectionGrid
                label="Time Complexity"
                description="Worst/average/best-case asymptotic runtime based on nested-loop depth, hashing, sorting, recursion evidence."
                type="time"
                report={report}
                onAnchorA={handleAnchorFrom('A')}
                onAnchorB={handleAnchorFrom('B')}
              />
            )}

            {activeTab === 'space' && (
              <ComplexitySectionGrid
                label="Space Complexity"
                description="Input size footprint + auxiliary memory allocation. Auxiliary is the focus of optimization trade-offs."
                type="space"
                report={report}
                onAnchorA={handleAnchorFrom('A')}
                onAnchorB={handleAnchorFrom('B')}
              />
            )}

            {activeTab === 'benchmark' && (
              <div className="space-y-6 animate-fade-in-up">
                <div className="card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="section-title">Runtime Benchmark</h3>
                    <button
                      onClick={handleRunBenchmark}
                      disabled={benchmarkLoading}
                      className="btn-secondary"
                    >
                      {benchmarkLoading ? <Loader2 className="h-4 w-4 animate-spin-slow" /> : <Play className="h-4 w-4" />}
                      {benchmarkLoading ? 'Running…' : 'Run & Benchmark'}
                    </button>
                  </div>
                  <p className="text-xs text-ink-400 mt-2">
                    Executed in Node.js <code className="font-mono">worker_threads</code> worker (sandboxed, 2s timeout / size). JavaScript/TypeScript only — other languages report unavailable.
                  </p>
                </div>
                <BenchmarkTable
                  benchmark={report.benchmark ?? null}
                  predictedA={report.solutionA.time.worst}
                  predictedB={report.solutionB.time.worst}
                  loading={benchmarkLoading}
                />
              </div>
            )}

            {activeTab === 'tests' && (
              <div className="space-y-6 animate-fade-in-up">
                <div className="card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="section-title">Generated Test Cases</h3>
                    <button
                      onClick={handleGenerateTests}
                      disabled={testsLoading}
                      className="btn-secondary"
                    >
                      {testsLoading ? <Loader2 className="h-4 w-4 animate-spin-slow" /> : <FlaskIcon className="h-4 w-4" />}
                      {testsLoading ? 'Generating…' : 'Generate Tests'}
                    </button>
                  </div>
                  <p className="text-xs text-ink-400 mt-2">
                    Two-sum / generic-number-array fixtures based on auto-detection. JavaScript/TypeScript are executed against a sandbox; other languages show <em>Not Tested</em>.
                  </p>
                </div>
                <TestCasesPanel
                  tests={report.generatedTests ?? []}
                  langA={report.langA}
                  langB={report.langB}
                  loading={testsLoading}
                  onRunClick={handleGenerateTests}
                />
              </div>
            )}

            {activeTab === 'security' && (
              <div className="grid gap-4 lg:grid-cols-2 animate-fade-in-up">
                <div className="animate-stagger-1">
                  <SecurityFindingsList
                    title="Solution A · Security"
                    findings={report.solutionA.security as SecurityFinding[]}
                    color="emerald"
                    onAnchorClick={(s, e) => handleAnchorFrom('A')(s, e, 'Security finding')}
                  />
                </div>
                <div className="animate-stagger-2">
                  <SecurityFindingsList
                    title="Solution B · Security"
                    findings={report.solutionB.security as SecurityFinding[]}
                    color="accent"
                    onAnchorClick={(s, e) => handleAnchorFrom('B')(s, e, 'Security finding')}
                  />
                </div>
              </div>
            )}

            {activeTab === 'readability' && (
              <div className="grid gap-4 lg:grid-cols-2 animate-fade-in-up">
                <QualityCard title="Solution A · Readability" solution={report.solutionA} kind="readability" />
                <QualityCard title="Solution B · Readability" solution={report.solutionB} kind="readability" />
              </div>
            )}

            {activeTab === 'maintainability' && (
              <div className="grid gap-4 lg:grid-cols-2 animate-fade-in-up">
                <QualityCard title="Solution A · Maintainability" solution={report.solutionA} kind="maintainability" />
                <QualityCard title="Solution B · Maintainability" solution={report.solutionB} kind="maintainability" />
              </div>
            )}

            {activeTab === 'similarity' && (
              <div className="animate-fade-in-up">
                <SimilarityPanel similarity={report.similarity ?? { text: 0, ast: 0, structural: 0, semantic: 0, verdict: 'n/a', evidence: ['Similarity not computed.'] }} />
                <div className="card p-5 mt-4 border-amber-500/20 bg-amber-500/5">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-amber-200">Plagiarism Guidance</h4>
                      <p className="text-xs text-ink-300 mt-1 leading-relaxed">
                        High <em>semantic</em> similarity alone does NOT indicate plagiarism. Solutions to the same coding problem are expected to be semantically similar.
                        Only flag concerns when <em>text</em> and <em>AST</em> similarity are also high and naming/variable structure is identical across languages.
                        Always recommend manual review.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'optimization' && (
              <div className="space-y-6 animate-fade-in-up">
                <OptimizationDiffView
                  solutionLabel="A"
                  result={report.optimizationA2 ?? report.optimizationA.optimizedBeforeAfter ?? null}
                  originalCode={codeA}
                  lang={langA}
                  color="emerald"
                />
                <OptimizationDiffView
                  solutionLabel="B"
                  result={report.optimizationB2 ?? report.optimizationB.optimizedBeforeAfter ?? null}
                  originalCode={codeB}
                  lang={langB}
                  color="accent"
                />
              </div>
            )}

            {activeTab === 'recommendation' && (
              <div className="card p-6 space-y-3 animate-fade-in-up">
                <h3 className="section-title">Recommendation &amp; Trade-offs</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-ink-700 bg-ink-900/60 p-4 hover-lift">
                    <div className="text-xs text-ink-400 mb-1">Why this winner</div>
                    <p className="text-sm text-ink-200 leading-relaxed">{report.recommendation.reason}</p>
                  </div>
                  <div className="rounded-lg border border-ink-700 bg-ink-900/60 p-4 hover-lift">
                    <div className="text-xs text-ink-400 mb-1">Trade-off</div>
                    <p className="text-sm text-ink-200 leading-relaxed">{report.recommendation.tradeoff}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { k: 'Best for Speed', v: report.recommendation.bestForSpeed },
                    { k: 'Best for Memory', v: report.recommendation.bestForMemory },
                    { k: 'Best Readability', v: report.recommendation.bestForReadability },
                    { k: 'Best Scalability', v: report.recommendation.bestForScalability },
                  ].map(({ k, v }) => (
                    <div key={k} className="rounded-lg border border-ink-700 bg-ink-900/60 p-3 hover-lift">
                      <div className="text-xs text-ink-400 mb-1">{k}</div>
                      <OverallBadge label={v} />
                    </div>
                  ))}
                </div>
                <div className="pt-2">
                  <button onClick={openWhyWinner} className="btn-secondary">
                    <ChevronRight className="h-4 w-4" />
                    View detailed justification
                  </button>
                </div>

                {report.interviewMode && report.recommendation.interviewAssessment && (
                  <div className="card p-6 mt-6 space-y-3 !bg-transparent !border !border-amber-500/20">
                    <h3 className="section-title flex items-center gap-2">
                      <Brain className="h-4 w-4 text-amber-400" />
                      Interview Assessment
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {Object.entries(report.recommendation.interviewAssessment).map(([k, v]) => (
                        <div key={k} className="rounded-lg border border-ink-700 bg-ink-900/60 p-4 hover-lift">
                          <div className="text-xs font-semibold text-ink-400 capitalize mb-1">{k}</div>
                          <p className="text-sm text-ink-200 leading-relaxed">{v as string}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'confidence' && (
              <div className="card p-5 animate-fade-in-up">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="section-title">Confidence</h3>
                  <span className="badge border-violet-500/30 bg-violet-500/10 text-violet-300">
                    {staticOnly ? 'Static Analysis Only' : 'Static + AI Analysis'}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(['algorithm', 'time', 'space', 'security'] as const).map((k) => (
                    <div key={k} className="rounded-lg border border-ink-700 bg-ink-900/60 p-3 text-center hover-lift">
                      <div className="text-xs text-ink-400 mb-1.5 capitalize">{k}</div>
                      <ConfidenceBadge level={report.confidences[k]} />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-ink-400 mt-4 leading-relaxed">
                  Confidence levels reflect the amount of evidence available. Low confidence means you should manually verify; high confidence means static structures were unambiguous and matched AI reasoning.
                </p>
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-ink-400 border-b border-ink-700/60">
                        <th className="py-2 pr-4">Analysis Source</th>
                        <th className="py-2 pr-4">Label</th>
                        <th className="py-2 pr-4">Used For</th>
                      </tr>
                    </thead>
                    <tbody className="text-ink-200">
                      <tr className="border-b border-ink-700/40"><td className="py-3 pr-4"><span className="badge badge-high">Static Analysis</span></td><td className="py-3 pr-4">AST + regex heuristics</td><td className="py-3 pr-4">Loops, hashes, syntax, complexity, security patterns</td></tr>
                      <tr className="border-b border-ink-700/40"><td className="py-3 pr-4"><span className="badge border-violet-500/30 bg-violet-500/10 text-violet-300">AI Analysis</span></td><td className="py-3 pr-4">Google Gemini</td><td className="py-3 pr-4">Narrative, semantic similarity, grounded optimization, edge-case verdicts</td></tr>
                      <tr className="border-b border-ink-700/40"><td className="py-3 pr-4"><span className="badge border-amber-500/30 bg-amber-500/10 text-amber-300">Runtime Benchmark</span></td><td className="py-3 pr-4">Node Worker sandbox</td><td className="py-3 pr-4">Median JS execution times by input size</td></tr>
                      <tr><td className="py-3 pr-4"><span className="badge border-sky-500/30 bg-sky-500/10 text-sky-300">Test Execution</span></td><td className="py-3 pr-4">Sandboxed JS</td><td className="py-3 pr-4">Behavioral pass/fail on 8 categories of edge-case input</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      <Footer />

      {anchorBanner && (
        <AnchorBanner anchor={anchorBanner} onClose={() => setAnchorBanner(null)} />
      )}

      <WhyExplanationModal
        open={whyOpen}
        onClose={() => setWhyOpen(false)}
        title={whyTitle}
        bullets={whyBullets}
        winner={whyWinner}
      />
    </div>
  );
}

function ComplexityCardSimple({ label, solution, kind, onAnchorClick }: { label: string; solution: PerSolutionAnalysis; kind: 'time' | 'space'; onAnchorClick?: (s: number, e: number) => void }) {
  const t = solution.time;
  const s = solution.space;
  const anchors = solution.ast?.loops ?? [];
  return (
    <div className="card p-5 hover-lift">
      <div className="flex items-center justify-between mb-3">
        <span className="section-title">Solution {label}</span>
        <span className="badge border-ink-600 bg-ink-800 text-ink-200">
          {solution.algorithm.label}
        </span>
      </div>
      <div className="space-y-3 text-sm">
        {kind === 'time' ? (
          <div>
            <div className="text-xs text-ink-400 mb-1">Time Complexity</div>
            <div className="flex flex-wrap gap-2">
              <span className="chip pointer-events-none">Best: {t.best}</span>
              <span className="chip pointer-events-none">Avg: {t.avg}</span>
              <span className="chip pointer-events-none">Worst: {t.worst}</span>
            </div>
            <ul className="mt-3 space-y-1.5 text-xs text-ink-300 list-disc list-inside">
              {t.evidence.slice(0, 6).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div>
            <div className="text-xs text-ink-400 mb-1">Space Complexity</div>
            <div className="flex flex-wrap gap-2">
              <span className="chip pointer-events-none">Input: {s.input}</span>
              <span className="chip pointer-events-none">Aux: {s.auxiliary}</span>
            </div>
            <ul className="mt-3 space-y-1.5 text-xs text-ink-300 list-disc list-inside">
              {s.evidence.slice(0, 6).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}
        {anchors.length > 0 && onAnchorClick && (
          <div className="pt-2 border-t border-ink-700/60">
            <div className="text-xs text-ink-400 mb-1.5">Evidence anchors</div>
            <div className="flex flex-wrap gap-1.5">
              {anchors.slice(0, 8).map((a, i) => (
                <button
                  key={i}
                  onClick={() => onAnchorClick(a.anchors[0]?.startLine ?? 1, a.anchors[0]?.endLine ?? 1)}
                  className="chip !px-2 !py-0.5"
                >
                  L{a.anchors[0]?.startLine ?? '?'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ComplexitySectionGrid({ label, description, type, report, onAnchorA, onAnchorB }: {
  label: string;
  description: string;
  type: 'time' | 'space';
  report: AnalysisReport;
  onAnchorA: (s: number, e: number) => void;
  onAnchorB: (s: number, e: number) => void;
}) {
  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="card p-5 animate-stagger-1">
        <h3 className="section-title">{label}</h3>
        <p className="text-xs text-ink-400 mt-1">{description}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="animate-stagger-2">
          <ComplexityCardSimple label="A" solution={report.solutionA} kind={type} onAnchorClick={onAnchorA} />
        </div>
        <div className="animate-stagger-3">
          <ComplexityCardSimple label="B" solution={report.solutionB} kind={type} onAnchorClick={onAnchorB} />
        </div>
      </div>
    </div>
  );
}

function CorrectnessCard({ title, color, solution, onAnchorClick }: {
  title: string;
  color: 'emerald' | 'accent';
  solution: PerSolutionAnalysis;
  onAnchorClick?: (s: number, e: number, label?: string) => void;
}) {
  const c = solution.correctness;
  const ring = color === 'emerald' ? 'border-emerald-500/20' : 'border-accent-500/20';
  return (
    <div className={cn('card p-5 space-y-3 hover-lift', ring)}>
      <div className="flex items-center justify-between">
        <h3 className="section-title">{title}</h3>
        <span className={cn('badge', c.issues.length === 0 ? 'badge-high' : c.bugsCount && c.bugsCount > 2 ? 'badge-low' : 'badge-med')}>
          {c.bugsCount ?? 0} bugs · {c.issues.length} issues
        </span>
      </div>
      <p className="text-sm text-ink-200 leading-relaxed">{c.summary}</p>
      {c.issues.length > 0 ? (
        <ul className="space-y-1.5">
          {c.issues.map((it, i) => (
            <li key={i} className="text-xs text-ink-300 flex gap-2">
              <span className="text-ink-500 mt-0.5">•</span>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="pt-2 border-t border-ink-700/60">
        <BugFindingsList
          title="Potential Bugs"
          findings={solution.bugs}
          color={color}
          onAnchorClick={(s, e) => onAnchorClick?.(s, e, 'Bug finding')}
        />
      </div>
    </div>
  );
}

function EdgeCaseTable({ edgeCases, tests }: { edgeCases: EdgeCase[]; tests?: GeneratedTestCase[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-ink-400 border-b border-ink-700/60">
            <th className="py-2 pr-4">Case</th>
            <th className="py-2 pr-4 text-center">A</th>
            <th className="py-2 pr-4 text-center">B</th>
            <th className="py-2 pr-4 text-center">Test Executed</th>
            <th className="py-2">Note</th>
          </tr>
        </thead>
        <tbody>
          {edgeCases.map((ec: EdgeCase, i: number) => {
            const matchingTest = tests?.find((t) => t.label.toLowerCase().includes(ec.label.toLowerCase().split(' ')[0] ?? ''));
            const fromTest = (side: 'A' | 'B') => {
              if (!matchingTest) return null;
              const r = side === 'A' ? matchingTest.resultA : matchingTest.resultB;
              if (!r || r === 'not_tested') return null;
              if (r === 'pass') return true;
              return false;
            };
            const handlesA = fromTest('A') ?? ec.handlesA;
            const handlesB = fromTest('B') ?? ec.handlesB;
            const executed = !!matchingTest && (matchingTest.resultA !== 'not_tested' || matchingTest.resultB !== 'not_tested');
            return (
              <tr key={i} className="border-b border-ink-700/40 last:border-0 hover:bg-ink-800/40 transition-colors">
                <td className="py-3 pr-4 text-ink-100">{ec.label}</td>
                <td className="py-3 pr-4 text-center">
                  {handlesA === null ? (
                    <span className="badge border-ink-600 bg-ink-800 text-ink-300">Not tested</span>
                  ) : handlesA ? (
                    <span className="badge badge-high">Handles</span>
                  ) : (
                    <span className="badge badge-low">Misses</span>
                  )}
                </td>
                <td className="py-3 pr-4 text-center">
                  {handlesB === null ? (
                    <span className="badge border-ink-600 bg-ink-800 text-ink-300">Not tested</span>
                  ) : handlesB ? (
                    <span className="badge badge-high">Handles</span>
                  ) : (
                    <span className="badge badge-low">Misses</span>
                  )}
                </td>
                <td className="py-3 pr-4 text-center text-xs">
                  {executed ? <span className="badge border-sky-500/30 bg-sky-500/10 text-sky-300">Yes</span> : <span className="badge border-ink-600 bg-ink-800 text-ink-400">Heuristic</span>}
                </td>
                <td className="py-3 text-ink-400 text-xs">{ec.note || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function QualityCard({ title, solution, kind }: { title: string; solution: PerSolutionAnalysis; kind: 'readability' | 'maintainability' }) {
  const data = kind === 'readability' ? solution.readability : solution.maintainability;
  return (
    <div className="card p-5 space-y-3 hover-lift">
      <div className="flex items-center justify-between">
        <h3 className="section-title">{title}</h3>
        <div className="text-2xl font-bold text-white tabular-nums animate-score-pop">
          {data.score}
          <span className="text-sm font-normal text-ink-500">/10</span>
        </div>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ ['--progress-width' as any]: `${(data.score / 10) * 100}%` }} />
      </div>
      <ul className="space-y-1.5 pt-1">
        {data.reasons.map((r, i) => (
          <li key={i} className="text-xs text-ink-300 flex gap-2">
            <span className="text-ink-500 mt-0.5">•</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>
      {kind === 'maintainability' && (
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-ink-700/60 text-xs">
          <div className="rounded-lg bg-ink-900/60 p-2">
            <div className="text-ink-400">Dead code</div>
            <div className="text-ink-100 font-mono tabular-nums">{solution.quality.deadCode.length}</div>
          </div>
          <div className="rounded-lg bg-ink-900/60 p-2">
            <div className="text-ink-400">Duplication</div>
            <div className="text-ink-100 font-mono tabular-nums">{solution.quality.duplication.length}</div>
          </div>
          <div className="rounded-lg bg-ink-900/60 p-2">
            <div className="text-ink-400">Error handling</div>
            <div className="text-ink-100 font-mono tabular-nums">{solution.quality.errorHandling.length}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-ink-950 bg-grid-fade flex flex-col">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-ink-300">
              <Loader2 className="h-8 w-8 animate-spin-slow text-accent-400" />
              <p className="text-sm">Loading…</p>
            </div>
          </main>
          <Footer />
        </div>
      }
    >
      <AnalyzePageInner />
    </Suspense>
  );
}
