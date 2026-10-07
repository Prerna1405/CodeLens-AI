# Debug Session: whitecode-build-and-runtime-verification

- **Status**: `[OPEN]`
- **Session ID**: `whitecode-build-verification`
- **Opened**: 2026-10-05
- **Objective**: Comprehensive audit → build → runtime → end-to-end verification of the WhiteCode MVP. Collect evidence, fix any issues that prevent proper execution, and confirm stable operation.
- **Symptoms**: User reports env vars added; needs full run/verify pass. Static audit reveals several missing modules (Task 2 Supabase integration, Tasks 4/5/7/8/9/10 partial). Known risks: .env.local may be missing Supabase entries, missing middleware, no /analyze route, no static analyzers, no API routes.

---

## 1. Hypotheses (Falsifiable)

| #  | Hypothesis                                                                                                                                | Predicted observable                                                                                         | Status   | Evidence Ref |
|----|-------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------|----------|--------------|
| H1 | `.env.local` is missing Supabase URL/anon/service-role entries and has a placeholder `your-gemini-api-key` instead of the real key.       | Opening `/api/*` routes that use Supabase or LLM will 500. `process.env.NEXT_PUBLIC_SUPABASE_URL` is `undefined` server-side. | `CONFIRMED` in static audit. | Step 1 read. |
| H2 | Missing `/analyze` route and `/api/analyze` endpoint. Navigating to `/analyze` returns 404; POST to `/api/analyze` returns 404.          | `next build` succeeds (no SSR pages to fail), HTTP GET /analyze = 404.                                       | Falsifiable in Step 6. | — |
| H3 | Missing static analysis modules + orchestrator mean that even if API route exists, analysis pipeline fails at import time.                | Importing `analysisOrchestrator.ts` → TS error / runtime "Cannot find module".                                | Falsifiable in Step 3. | — |
| H4 | Supabase tables (`analyses`, `solutions`, `analysis_results`) don't exist, RLS policies missing, so any save/history call 500s.          | `supabase_get_tables` → 0 matching tables.                                                                   | Falsifiable after Task 2 completion. | — |
| H5 | Monaco editor not initialized correctly (SSR) → client-side hydration error or blank editor.                                              | `localhost:3000/analyze` shows Monaco OR has hydration warning in console with React error boundary message. | Falsifiable in Step 6 browser run. | — |

---

## 2. Instrumentation Log (Pre-fix)

_Instrumentation will be added via Debug Server network reporting. Pre-fix evidence captured from static audit + first build run._

## 3. Reproduction Steps & Pre-fix Evidence

_Steps recorded once runtime is available._

## 4. Post-fix Evidence

_Will be added after remediation passes._

## 5. Issues Identified & Resolved

| ID    | Issue                                                                                                                                 | Root Cause                     | Fix Applied                                                                                       | Status   |
|-------|---------------------------------------------------------------------------------------------------------------------------------------|--------------------------------|---------------------------------------------------------------------------------------------------|----------|
| ISS-1 | `.env.local` missing Supabase URL, anon, service-role keys; Gemini line = placeholder.                                                | Task 3 subagent created .env.local with only placeholders, not merging .env.example actual values. | Copy full real-key contents from .env.example to .env.local.                                      | Pending  |
| ISS-2 | No `supabase/` directory, no migration applied, no lib/supabase clients, no middleware.                                                | Task 2 subagent result missing (no return output). | Re-apply Task 2 end-to-end: call supabase integration, create migration SQL, apply, create clients + middleware. | Pending  |
| ISS-3 | No static analysis modules (syntaxAnalyzer / algorithmAnalyzer / complexityAnalyzer / readabilityAnalyzer / qualityAnalyzer / securityAnalyzer / comparisonEngine / analysisOrchestrator). | Task 4 never started. | Author all 8 service modules, wire together, verify with assertions.                              | Pending  |
| ISS-4 | No React contexts (AuthContext, AnalysisContext) nor hooks (useLocalStorage, useDebounce, etc.).                                       | Task 5 never started. | Implement contexts and hooks with localStorage persistence.                                       | Pending  |
| ISS-5 | No `/analyze` route. No two-panel Monaco editor, priorities, demo prefills.                                                            | Task 8 never started. | Author /analyze page + 5 analysis components.                                                     | Pending  |
| ISS-6 | No API routes: /api/analyze, /api/infer-problem, /api/analyses/{save,history,[id]}, /api/chat.                                         | Task 9 never started. | Author all 6 API routes with Zod validation.                                                      | Pending  |
| ISS-7 | No results dashboard components, no chat panel, no export JSON.                                                                        | Task 10 never started. | Author results components + render dashboard below editor.                                        | Pending  |
| ISS-8 | No /login, /signup pages; no /dashboard history page; Header login buttons are non-functional stubs.                                   | Task 7 + Task 11 not started.  | Implement login/signup/dashboard pages using Supabase Auth client.                                | Pending  |
| ISS-9 | No error.tsx / loading.tsx / aria audit pass.                                                                                         | Task 12 not started.           | Add skeletons + error boundaries + aria labels.                                                   | Pending  |

## 6. Verification Checklist (All must pass before session closes)

- [ ] `npm run build` exits 0 (strict TS + lint + bundle).
- [ ] `tsc --noEmit` exits 0.
- [ ] `.env.local` has 5 env vars set (3 Supabase + 2 Gemini) with real non-placeholder values.
- [ ] Supabase `analyses`, `solutions`, `analysis_results` tables exist with correct columns + RLS policies.
- [ ] GET `/` → 200, hero text matches exact string "Understand Which Code Is Actually Better.", both CTAs present.
- [ ] GET `/not-found-test` → custom 404 page rendered.
- [ ] GET `/analyze` → two Monaco editors mount, language dropdown has ≥11 options, problem textarea present.
- [ ] GET `/analyze?demo=true` → problem, codeA(python nested loops), codeB(java HashMap) prefilled correctly.
- [ ] POST `/api/analyze` demo payload → 200, response matches AnalysisReport schema shape.
- [ ] Middleware correctly redirects unauthenticated `/dashboard` → `/login`.
- [ ] Browser console shows 0 uncaught errors, 0 React hydration warnings.
- [ ] Mobile 375px viewport → /analyze panels stack vertically.
- [ ] ComplexityBars with O(n²) vs O(n) → A bar wider for time, narrower for space.
