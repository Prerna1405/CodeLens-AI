import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import type { AnalysisReport } from '@/lib/types/analysis';

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;

  const dbPath = process.env.DATABASE_PATH || './data/whitecode.db';
  const resolvedPath = path.isAbsolute(dbPath)
    ? dbPath
    : path.resolve(process.cwd(), dbPath);

  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(resolvedPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS analysis_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      input_hash TEXT UNIQUE NOT NULL,
      problem TEXT NOT NULL,
      code_a TEXT NOT NULL,
      code_b TEXT NOT NULL,
      lang_a TEXT NOT NULL,
      lang_b TEXT NOT NULL,
      report_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      accessed_at TEXT NOT NULL DEFAULT (datetime('now')),
      hit_count INTEGER NOT NULL DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_analysis_cache_hash ON analysis_cache(input_hash);
    CREATE INDEX IF NOT EXISTS idx_analysis_cache_created ON analysis_cache(created_at);

    CREATE TABLE IF NOT EXISTS analysis_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      problem TEXT NOT NULL,
      code_a TEXT NOT NULL,
      code_b TEXT NOT NULL,
      lang_a TEXT NOT NULL,
      lang_b TEXT NOT NULL,
      report_json TEXT NOT NULL,
      session_id TEXT,
      semantic_similarity REAL DEFAULT NULL,
      tests_passed_a INTEGER DEFAULT NULL,
      tests_passed_b INTEGER DEFAULT NULL,
      total_tests INTEGER DEFAULT NULL,
      sec_issues_a INTEGER DEFAULT NULL,
      sec_issues_b INTEGER DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_analysis_history_created ON analysis_history(created_at);
    CREATE INDEX IF NOT EXISTS idx_analysis_history_session ON analysis_history(session_id);
  `);

  dbInstance = db;
  return db;
}

export function getCachedReport(inputHash: string): AnalysisReport | null {
  const db = getDb();
  const row = db
    .prepare('SELECT report_json FROM analysis_cache WHERE input_hash = ?')
    .get(inputHash) as { report_json: string } | undefined;

  if (!row) return null;

  db.prepare(
    'UPDATE analysis_cache SET accessed_at = datetime(\'now\'), hit_count = hit_count + 1 WHERE input_hash = ?'
  ).run(inputHash);

  return JSON.parse(row.report_json) as AnalysisReport;
}

export function cacheReport(
  inputHash: string,
  input: { problem: string; codeA: string; codeB: string; langA: string; langB: string },
  report: AnalysisReport
): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO analysis_cache
      (input_hash, problem, code_a, code_b, lang_a, lang_b, report_json, created_at, accessed_at, hit_count)
    VALUES
      (@input_hash, @problem, @code_a, @code_b, @lang_a, @lang_b, @report_json, datetime('now'), datetime('now'),
       COALESCE((SELECT hit_count FROM analysis_cache WHERE input_hash = @input_hash) + 1, 1))
  `);
  stmt.run({
    input_hash: inputHash,
    problem: input.problem,
    code_a: input.codeA,
    code_b: input.codeB,
    lang_a: input.langA,
    lang_b: input.langB,
    report_json: JSON.stringify(report),
  });
}

export function saveHistory(
  input: { problem: string; codeA: string; codeB: string; langA: string; langB: string },
  report: AnalysisReport,
  sessionId?: string
): number {
  const db = getDb();

  const semanticSimilarity = report.similarity?.semantic ?? null;
  const testsPassedA = report.generatedTests
    ? report.generatedTests.filter((t) => t.resultA === 'pass').length
    : null;
  const testsPassedB = report.generatedTests
    ? report.generatedTests.filter((t) => t.resultB === 'pass').length
    : null;
  const totalTests = report.generatedTests ? report.generatedTests.length : null;
  const secIssuesA = report.solutionA.security.length;
  const secIssuesB = report.solutionB.security.length;

  const info = db.prepare(`
    INSERT INTO analysis_history (
      problem,
      code_a,
      code_b,
      lang_a,
      lang_b,
      report_json,
      session_id,
      semantic_similarity,
      tests_passed_a,
      tests_passed_b,
      total_tests,
      sec_issues_a,
      sec_issues_b
    ) VALUES (
      @problem,
      @code_a,
      @code_b,
      @lang_a,
      @lang_b,
      @report_json,
      @session_id,
      @semantic_similarity,
      @tests_passed_a,
      @tests_passed_b,
      @total_tests,
      @sec_issues_a,
      @sec_issues_b
    )
  `).run({
    problem: input.problem,
    code_a: input.codeA,
    code_b: input.codeB,
    lang_a: input.langA,
    lang_b: input.langB,
    report_json: JSON.stringify(report),
    session_id: sessionId || null,
    semantic_similarity: semanticSimilarity,
    tests_passed_a: testsPassedA,
    tests_passed_b: testsPassedB,
    total_tests: totalTests,
    sec_issues_a: secIssuesA,
    sec_issues_b: secIssuesB,
  });
  return Number(info.lastInsertRowid);
}

export interface HistoryItem {
  id: number;
  problem: string;
  lang_a: string;
  lang_b: string;
  created_at: string;
  overall: string;
  score_a: number;
  score_b: number;
  semantic_similarity?: number | null;
  tests_passed_a?: number | null;
  tests_passed_b?: number | null;
  total_tests?: number | null;
  sec_issues_a?: number | null;
  sec_issues_b?: number | null;
}

export function listHistory(limit = 50, sessionId?: string): HistoryItem[] {
  const db = getDb();
  let rows: Array<{
    id: number; problem: string; lang_a: string; lang_b: string;
    created_at: string; report_json: string;
    semantic_similarity: number | null;
    tests_passed_a: number | null;
    tests_passed_b: number | null;
    total_tests: number | null;
    sec_issues_a: number | null;
    sec_issues_b: number | null;
  }>;
  if (sessionId) {
    rows = db.prepare(`
      SELECT id, problem, lang_a, lang_b, created_at, report_json,
             semantic_similarity, tests_passed_a, tests_passed_b,
             total_tests, sec_issues_a, sec_issues_b
      FROM analysis_history
      WHERE session_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(sessionId, limit) as typeof rows;
  } else {
    rows = db.prepare(`
      SELECT id, problem, lang_a, lang_b, created_at, report_json,
             semantic_similarity, tests_passed_a, tests_passed_b,
             total_tests, sec_issues_a, sec_issues_b
      FROM analysis_history
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit) as typeof rows;
  }

  return rows.map((r) => {
    const report = JSON.parse(r.report_json) as AnalysisReport;
    return {
      id: r.id,
      problem: r.problem,
      lang_a: r.lang_a,
      lang_b: r.lang_b,
      created_at: r.created_at,
      overall: report.recommendation.overall,
      score_a: report.weightedOverallScores.a,
      score_b: report.weightedOverallScores.b,
      semantic_similarity: r.semantic_similarity,
      tests_passed_a: r.tests_passed_a,
      tests_passed_b: r.tests_passed_b,
      total_tests: r.total_tests,
      sec_issues_a: r.sec_issues_a,
      sec_issues_b: r.sec_issues_b,
    };
  });
}

export function getHistoryById(id: number): AnalysisReport | null {
  const db = getDb();
  const row = db
    .prepare('SELECT report_json FROM analysis_history WHERE id = ?')
    .get(id) as { report_json: string } | undefined;
  if (!row) return null;
  return JSON.parse(row.report_json) as AnalysisReport;
}
