'use client';

import { useId } from 'react';
import type { FinalScores } from './ScoreRacer';

const AXIS_ORDER: (keyof FinalScores)[] = [
  'performance',
  'scalability',
  'memory',
  'security',
  'maintainability',
  'testCoverage',
  'readability',
  'correctness',
];

const LABELS: Record<keyof FinalScores, string> = {
  performance: 'Performance',
  memory: 'Memory',
  readability: 'Readability',
  maintainability: 'Maintainability',
  security: 'Security',
  correctness: 'Correctness',
  scalability: 'Scalability',
  testCoverage: 'Test Cov.',
};

interface RadarChartProps {
  finalScores: FinalScores;
  size?: number;
}

function pointOnAxis(cx: number, cy: number, radius: number, idx: number, total: number, value: number) {
  const angle = (Math.PI * 2 * idx) / total - Math.PI / 2;
  const r = radius * (value / 10);
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  };
}

function axisPoint(cx: number, cy: number, radius: number, idx: number, total: number) {
  const angle = (Math.PI * 2 * idx) / total - Math.PI / 2;
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function polygonPoints(
  cx: number,
  cy: number,
  radius: number,
  values: number[],
  total: number
): string {
  return values
    .map((v, i) => {
      const p = pointOnAxis(cx, cy, radius, i, total, v);
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    })
    .join(' ');
}

export default function RadarChart({ finalScores, size = 360 }: RadarChartProps) {
  const uid = useId().replace(/:/g, '');
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.38;
  const total = AXIS_ORDER.length;

  const aVals = AXIS_ORDER.map((k) => finalScores[k].a);
  const bVals = AXIS_ORDER.map((k) => finalScores[k].b);

  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title">Capability Radar</h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70 ring-1 ring-emerald-400/50" />
            <span className="text-ink-300">Solution A</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-accent-500/70 ring-1 ring-accent-400/50" />
            <span className="text-ink-300">Solution B</span>
          </span>
        </div>
      </div>

      <div className="flex justify-center">
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="max-w-full">
          <defs>
            <radialGradient id={`radar-grad-a-${uid}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.08" />
            </radialGradient>
            <radialGradient id={`radar-grad-b-${uid}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3093ff" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#3093ff" stopOpacity="0.08" />
            </radialGradient>
            <filter id={`glow-a-${uid}`}>
              <feGaussianBlur stdDeviation="2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id={`glow-b-${uid}`}>
              <feGaussianBlur stdDeviation="2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {rings.map((r, i) => {
            const pts = AXIS_ORDER.map((_, idx) => {
              const p = axisPoint(cx, cy, radius * r, idx, total);
              return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
            }).join(' ');
            return (
              <polygon
                key={`ring-${i}`}
                points={pts}
                fill="none"
                stroke="rgba(131, 139, 162, 0.12)"
                strokeWidth="1"
              />
            );
          })}

          {AXIS_ORDER.map((_, idx) => {
            const p = axisPoint(cx, cy, radius, idx, total);
            return (
              <line
                key={`axis-${idx}`}
                x1={cx}
                y1={cy}
                x2={p.x}
                y2={p.y}
                stroke="rgba(131, 139, 162, 0.18)"
                strokeWidth="1"
              />
            );
          })}

          <polygon
            points={polygonPoints(cx, cy, radius, aVals, total)}
            fill={`url(#radar-grad-a-${uid})`}
            stroke="#10b981"
            strokeWidth="2"
            strokeLinejoin="round"
            filter={`url(#glow-a-${uid})`}
            className="anim-draw-in"
            style={{
              strokeDasharray: 1000,
              animation: 'draw-in 1.4s ease-out both',
              animationDelay: '120ms',
            }}
          />
          <polygon
            points={polygonPoints(cx, cy, radius, bVals, total)}
            fill={`url(#radar-grad-b-${uid})`}
            stroke="#3093ff"
            strokeWidth="2"
            strokeLinejoin="round"
            filter={`url(#glow-b-${uid})`}
            style={{
              strokeDasharray: 1000,
              animation: 'draw-in 1.4s ease-out both',
              animationDelay: '260ms',
            }}
          />

          {aVals.map((v, i) => {
            const p = pointOnAxis(cx, cy, radius, i, total, v);
            return (
              <circle
                key={`a-dot-${i}`}
                cx={p.x}
                cy={p.y}
                r="3.5"
                fill="#0f1115"
                stroke="#10b981"
                strokeWidth="2"
                style={{
                  opacity: 0,
                  animation: 'pop-in 350ms ease-out both',
                  animationDelay: `${900 + i * 40}ms`,
                }}
              />
            );
          })}
          {bVals.map((v, i) => {
            const p = pointOnAxis(cx, cy, radius, i, total, v);
            return (
              <circle
                key={`b-dot-${i}`}
                cx={p.x}
                cy={p.y}
                r="3.5"
                fill="#0f1115"
                stroke="#3093ff"
                strokeWidth="2"
                style={{
                  opacity: 0,
                  animation: 'pop-in 350ms ease-out both',
                  animationDelay: `${1050 + i * 40}ms`,
                }}
              />
            );
          })}

          {AXIS_ORDER.map((key, idx) => {
            const p = axisPoint(cx, cy, radius + 20, idx, total);
            return (
              <text
                key={`label-${idx}`}
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="11"
                fill="#838ba2"
                fontWeight="500"
              >
                {LABELS[key]}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
