import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

export interface SandboxRunOptions {
  code: string;
  input: unknown;
  timeoutMs?: number;
}

export interface SandboxRunResult {
  ok: boolean;
  output?: unknown;
  error?: string;
  timedOut?: boolean;
  durationMs: number;
  heapUsedBefore?: number;
  heapUsedAfter?: number;
}

export interface SandboxTimingRunResult {
  ok: boolean;
  medianMs: number;
  runs: number[];
  error?: string;
  heapUsedDeltaBytes: number | null;
}

const WORKER_FILE = __filename;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function looksLikeTwoSum(code: string, problem?: string): boolean {
  const hay = (code + ' ' + (problem || '')).toLowerCase();
  const keywords = [
    'two sum',
    'twosum',
    'two-sum',
    'target',
    'indices',
    'nums',
    'adds up',
    'add up',
    'pair sum',
  ];
  let hits = 0;
  for (const k of keywords) {
    if (hay.includes(k)) hits++;
  }
  return hits >= 2;
}

export function generateInputArray(
  size: number,
  seed: number,
  looksTwoSum: boolean,
): number[] {
  const rand = mulberry32(seed);
  const arr: number[] = new Array(size);
  const range = looksTwoSum ? 1_000_000 : 10_000;
  for (let i = 0; i < size; i++) {
    if (looksTwoSum) {
      arr[i] = Math.floor(rand() * range) - Math.floor(range / 2);
    } else {
      arr[i] = Math.floor(rand() * range);
    }
  }
  if (looksTwoSum && size >= 2) {
    const i = Math.floor(rand() * size);
    let j = Math.floor(rand() * size);
    while (j === i) j = Math.floor(rand() * size);
    const target = arr[i]! + arr[j]!;
    (arr as unknown as { __target?: number }).__target = target;
  }
  return arr;
}

export function buildTwoSumInput(size: number, seed: number): { nums: number[]; target: number } {
  const rand = mulberry32(seed);
  const nums: number[] = new Array(size);
  for (let i = 0; i < size; i++) {
    nums[i] = Math.floor(rand() * 1_000_000) - 500_000;
  }
  const i = Math.floor(rand() * size);
  let j = Math.floor(rand() * size);
  while (j === i) j = Math.floor(rand() * size);
  const target = nums[i]! + nums[j]!;
  return { nums, target };
}

export function buildGenericNumberArray(size: number, seed: number): number[] {
  return generateInputArray(size, seed, false);
}

export function wrapUserCode(code: string, inputParamName = 'INPUT'): string {
  return `
var __result;
try {
  (function(${inputParamName}) {
    "use strict";
${code}
  })(${inputParamName});
} catch (__e) {
  throw __e;
}
return typeof __result !== "undefined" ? __result : null;
`;
}

export function runInWorker(options: SandboxRunOptions): Promise<SandboxRunResult> {
  return new Promise((resolve) => {
    if (!isMainThread) {
      resolve({
        ok: false,
        error: 'Cannot spawn worker from worker',
        durationMs: 0,
      });
      return;
    }

    const timeoutMs = options.timeoutMs ?? 2000;
    let settled = false;
    let timer: NodeJS.Timeout | null = null;

    try {
      const worker = new Worker(WORKER_FILE, {
        workerData: {
          code: options.code,
          input: options.input,
          mode: 'single',
        },
        execArgv: [],
      });

      timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        try {
          worker.terminate();
        } catch {
        }
        resolve({
          ok: false,
          timedOut: true,
          error: `Execution timed out after ${timeoutMs}ms`,
          durationMs: timeoutMs,
        });
      }, timeoutMs);

      worker.on('message', (msg: SandboxRunResult) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        resolve(msg);
      });

      worker.on('error', (err) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        try {
          worker.terminate();
        } catch {
        }
        resolve({
          ok: false,
          error: err.message || String(err),
          durationMs: 0,
        });
      });

      worker.on('exit', (_code) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        resolve({
          ok: false,
          error: 'Worker exited unexpectedly',
          durationMs: 0,
        });
      });
    } catch (err) {
      if (timer) clearTimeout(timer);
      const msg = err instanceof Error ? err.message : String(err);
      resolve({
        ok: false,
        error: `Worker init failed: ${msg}`,
        durationMs: 0,
      });
    }
  });
}

export async function runTimingsInWorker(options: {
  code: string;
  size: number;
  seed: number;
  looksTwoSum: boolean;
  warmupRounds?: number;
  measureRounds?: number;
  perIterationTimeoutMs?: number;
}): Promise<SandboxTimingRunResult> {
  const {
    code,
    size,
    seed,
    looksTwoSum,
    warmupRounds = 10,
    measureRounds = 10,
    perIterationTimeoutMs = 2000,
  } = options;

  const input = looksTwoSum
    ? buildTwoSumInput(size, seed)
    : buildGenericNumberArray(size, seed);

  let heapBefore: number | null = null;
  let heapAfter: number | null = null;
  try {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      heapBefore = process.memoryUsage().heapUsed;
    }
  } catch {
    heapBefore = null;
  }

  for (let i = 0; i < warmupRounds; i++) {
    const r = await runInWorker({
      code,
      input,
      timeoutMs: perIterationTimeoutMs,
    });
    if (!r.ok) {
      return {
        ok: false,
        medianMs: 0,
        runs: [],
        error: r.error || 'Warmup iteration failed',
        heapUsedDeltaBytes: null,
      };
    }
  }

  const runs: number[] = [];
  for (let i = 0; i < measureRounds; i++) {
    const r = await runInWorker({
      code,
      input,
      timeoutMs: perIterationTimeoutMs,
    });
    if (!r.ok) {
      return {
        ok: false,
        medianMs: 0,
        runs,
        error: r.error || 'Measure iteration failed',
        heapUsedDeltaBytes: null,
      };
    }
    runs.push(r.durationMs);
  }

  try {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      heapAfter = process.memoryUsage().heapUsed;
    }
  } catch {
    heapAfter = null;
  }

  runs.sort((a, b) => a - b);
  const mid = Math.floor(runs.length / 2);
  const medianMs = runs.length % 2 === 0
    ? (runs[mid - 1]! + runs[mid]!) / 2
    : runs[mid]!;

  const heapUsedDeltaBytes =
    heapBefore !== null && heapAfter !== null ? heapAfter - heapBefore : null;

  return {
    ok: true,
    medianMs,
    runs,
    heapUsedDeltaBytes,
  };
}

if (!isMainThread && parentPort) {
  try {
    const wd = workerData as {
      code: string;
      input: unknown;
      mode: 'single';
    };

    const start = Date.now();
    let heapStart = 0;
    let heapEnd = 0;
    try {
      if (typeof process !== 'undefined' && process.memoryUsage) {
        heapStart = process.memoryUsage().heapUsed;
      }
    } catch {
    }

    let output: unknown;
    let errorStr: string | undefined;

    try {
      const wrapped = wrapUserCode(wd.code, 'INPUT');
      const fn = new Function('INPUT', wrapped) as (input: unknown) => unknown;
      output = fn(wd.input);
    } catch (err) {
      errorStr = err instanceof Error ? err.message : String(err);
    }

    try {
      if (typeof process !== 'undefined' && process.memoryUsage) {
        heapEnd = process.memoryUsage().heapUsed;
      }
    } catch {
    }

    const durationMs = Date.now() - start;

    const result: SandboxRunResult = errorStr
      ? {
          ok: false,
          error: errorStr,
          durationMs,
          heapUsedBefore: heapStart || undefined,
          heapUsedAfter: heapEnd || undefined,
        }
      : {
          ok: true,
          output,
          durationMs,
          heapUsedBefore: heapStart || undefined,
          heapUsedAfter: heapEnd || undefined,
        };

    parentPort.postMessage(result);
    process.exit(0);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    parentPort?.postMessage({
      ok: false,
      error: msg,
      durationMs: 0,
    });
    process.exit(1);
  }
}
