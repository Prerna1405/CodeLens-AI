import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import type {
  AnalysisReport,
  AnalysisConfidence,
  EdgeCase,
  ExplanationLevel,
  PriorityWeights,
  Recommendation,
} from '@/lib/types/analysis';
import {
  AnalysisConfidenceSchema,
  EdgeCaseSchema,
  InterviewAssessmentSchema,
  SimilarityScoresSchema,
} from '@/lib/types/analysis';
import type {
  AIProvider,
  AIAnalysisInput,
  AIAnalysisOutput,
  AIChatMessage,
  AIChatContext,
} from './provider';

export class AIProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIProviderError';
  }
}

export const LLMAnalysisOutputSchema = z.object({
  narrative: z.object({
    summary: z.string(),
    aExplanation: z.string(),
    bExplanation: z.string(),
    keyDifference: z.string(),
  }),
  logicDifference: z.string(),
  edgeCases: z.array(EdgeCaseSchema),
  interviewAssessment: InterviewAssessmentSchema.optional(),
  optimizedA: z.string(),
  optimizedB: z.string(),
  confidences: AnalysisConfidenceSchema,
  optimizedCodeA: z.string().optional(),
  optimizedCodeB: z.string().optional(),
  optimizationWhyA: z.string().optional(),
  optimizationWhyB: z.string().optional(),
  optimizationTradeoffA: z.string().optional(),
  optimizationTradeoffB: z.string().optional(),
  optimizedBeforeA: z.string().optional(),
  optimizedAfterA: z.string().optional(),
  optimizedBeforeB: z.string().optional(),
  optimizedAfterB: z.string().optional(),
  similarity: SimilarityScoresSchema.optional(),
  semantic_equivalence: z
    .object({
      verdict: z.string(),
      score: z.number(),
      evidence: z.array(z.string()),
    })
    .optional(),
});

export type LLMAnalysisOutput = z.infer<typeof LLMAnalysisOutputSchema>;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      controller.signal.addEventListener('abort', () => {
        reject(new AIProviderError(`LLM request timed out after ${ms}ms`));
      });
    }),
  ]).finally(() => clearTimeout(timeoutId));
}

function buildAnalysisPrompt(input: AIAnalysisInput): string {
  const levelInstruction = {
    simple:
      'Use simple, plain-language explanations. Avoid jargon where possible. Target audience: a beginner programmer.',
    normal:
      'Use standard engineering explanations. Include precise complexity notation and common algorithm names. Target audience: a working software engineer.',
    expert:
      'Use precise technical language. Include detailed complexity rationale, algorithm taxonomy, and nuanced trade-off analysis. Target audience: a senior engineer / interviewer.',
  }[input.explanationLevel];

  const interviewInstruction = input.interviewMode
    ? '\n\nINTERVIEW MODE ACTIVE: In addition, produce an "interviewAssessment" object that rates each solution for interview suitability along these dimensions: algorithm (choice & appropriateness), complexity (optimality understanding), codeClarity (style, naming, brevity), edgeCases (completeness of handling), and overall (verbal recommendation for an interview setting). Rate each with a short evaluative sentence or two.'
    : '';

  return `You are WhiteCode, a precise code-comparison assistant. You are given a programming problem, two solutions (possibly in different languages), and STRUCTURED STATIC EVIDENCE produced by deterministic heuristic analyzers for each solution.

Your task is to produce a grounded comparison. STRICT RULES:
1. EVERY claim about algorithms, time/space complexity, correctness, or code quality MUST be explicitly grounded in the supplied static evidence OR directly observed in the code.
2. If evidence is ambiguous, absent, or heuristic-only, you MUST use hedging language (e.g. "appears to be", "likely", "assuming standard library semantics", "evidence weakly suggests") and reflect this uncertainty in the confidences field.
3. Never fabricate a complexity class. If the static analyzer says "Nested loop depth 2" that is strong evidence for O(n^2) worst-case; if hashing is detected, qualify with "assuming O(1) average-case hashing".
4. Output MUST be a single valid JSON object matching the required schema. No markdown fences. No commentary outside JSON. No trailing commas.
5. BUGS AND SECURITY: Report bugs or security findings ONLY if you can cite a specific line number and code pattern. No speculative vulnerabilities. If no concrete evidence, emit empty arrays.
6. HONESTY: Clearly distinguish between AI-inferred and statically-provable. Label heuristic claims with 'appears' / 'likely'. Never fabricate benchmark numbers, test results, or memory measurements. For similarity scores, use the code and static evidence as ground truth.
7. SEMANTIC EQUIVALENCE: Compare behavior and outputs, not syntax or variable names. Account for language differences, algorithm equivalence (sorting vs. hashing), recursion vs. iteration. Justify each similarity score with 1-2 evidence sentences.
8. GROUNDED OPTIMIZATION: For optimizedCodeA/B, preserve exact input/output contract, function name, and language. Never invent APIs that don't exist in the target language.

EXPLANATION LEVEL: ${input.explanationLevel}. ${levelInstruction}
${interviewInstruction}

===== PRIORITY WEIGHTS (for narrative emphasis) =====
Performance: ${input.priorities.performance}/100
Memory: ${input.priorities.memory}/100
Readability: ${input.priorities.readability}/100
Maintainability: ${input.priorities.maintainability}/100
Security: ${input.priorities.security}/100
Interview suitability: ${input.priorities.interview}/100
Production suitability: ${input.priorities.production}/100

===== PROBLEM STATEMENT =====
${input.problem}

===== SOLUTION A (${input.langA}) =====
\`\`\`${input.langA}
${input.codeA}
\`\`\`

===== SOLUTION B (${input.langB}) =====
\`\`\`${input.langB}
${input.codeB}
\`\`\`

===== STATIC EVIDENCE — Solution A =====
${JSON.stringify(input.staticEvidence.solutionA, null, 2)}

===== STATIC EVIDENCE — Solution B =====
${JSON.stringify(input.staticEvidence.solutionB, null, 2)}

===== STATIC EVIDENCE — Complexity A =====
${JSON.stringify(input.staticEvidence.complexityA, null, 2)}

===== STATIC EVIDENCE — Complexity B =====
${JSON.stringify(input.staticEvidence.complexityB, null, 2)}

REQUIRED JSON OUTPUT SHAPE:
{
  "narrative": {
    "summary": "2-4 sentence executive summary of the comparison.",
    "aExplanation": "Explanation of Solution A's approach, grounded in the static evidence and code.",
    "bExplanation": "Explanation of Solution B's approach, grounded in the static evidence and code.",
    "keyDifference": "One crisp paragraph describing the core semantic/algorithmic difference between the approaches."
  },
  "logicDifference": "1-2 sentences summarizing the logic-level (not syntax-level) difference between A and B.",
  "edgeCases": [
    {
      "label": "Name of edge case (e.g., 'Empty input array')",
      "handlesA": true | false | null,
      "handlesB": true | false | null,
      "note": "Optional grounding note"
    }
  ],
  "optimizedA": "A short paragraph describing a concrete optimization path for Solution A (do NOT emit code).",
  "optimizedB": "A short paragraph describing a concrete optimization path for Solution B (do NOT emit code).",
  "confidences": {
    "algorithm": "high" | "medium" | "low",
    "time": "high" | "medium" | "low",
    "space": "high" | "medium" | "low",
    "security": "high" | "medium" | "low"
  },
  "optimizedCodeA": "OPTIONAL: Full refactored optimized code for Solution A. Preserve correctness. Same language as Solution A.",
  "optimizedCodeB": "OPTIONAL: Full refactored optimized code for Solution B. Preserve correctness. Same language as Solution B.",
  "optimizationWhyA": "OPTIONAL: 1-2 sentences explaining why optimizedCodeA is better than the original.",
  "optimizationWhyB": "OPTIONAL: 1-2 sentences explaining why optimizedCodeB is better than the original.",
  "optimizationTradeoffA": "OPTIONAL: 1 sentence describing any trade-offs the A optimization introduces (e.g., memory for speed, readability for perf).",
  "optimizationTradeoffB": "OPTIONAL: 1 sentence describing any trade-offs the B optimization introduces.",
  "optimizedBeforeA": "OPTIONAL: Complexity of A before optimization (e.g. 'O(n^2) time, O(1) aux').",
  "optimizedAfterA": "OPTIONAL: Complexity of A after optimization (e.g. 'O(n) time, O(n) aux').",
  "optimizedBeforeB": "OPTIONAL: Complexity of B before optimization.",
  "optimizedAfterB": "OPTIONAL: Complexity of B after optimization.",
  "similarity": {
    "text": 0.0 to 1.0 — use ONLY lexical/token-level similarity based on shared tokens after lowercasing + stripping whitespace/comments,
    "ast": 0.0 to 1.0 — estimate AST / structural similarity using structures in static evidence,
    "structural": 0.0 to 1.0 — estimate control-flow / pattern similarity using structures in static evidence,
    "semantic": 0.0 to 1.0 — behavioral equivalence score based on what the code computes,
    "verdict": "One short phrase like 'identical', 'near-duplicate', 'same algorithm', 'related approaches', 'different algorithms', 'unrelated'.",
    "evidence": ["3-5 short bullet-point strings with concrete, grounded evidence supporting the similarity scores. ALWAYS emit evidence strings."]
  },
  "semantic_equivalence": {
    "verdict": "Short verdict string (e.g. 'equivalent', 'mostly equivalent', 'different semantics').",
    "score": 0.0 to 1.0,
    "evidence": ["List of concrete evidence strings supporting the equivalence verdict."]
  },
  "bugs": {
    "a": [{"severity":"low|medium|high","title":"short bug title","description":"1-2 sentences grounded evidence","line":number,"category":"off-by-one|null-handling|empty-input|loop-boundaries|overflow|initialization|missing-return|infinite-loop|recursion|mutation|duplicates|indexing"}],
    "b": [{"severity":"low|medium|high","title":"short bug title","description":"1-2 sentences grounded evidence","line":number,"category":"off-by-one|null-handling|empty-input|loop-boundaries|overflow|initialization|missing-return|infinite-loop|recursion|mutation|duplicates|indexing"}]
  },
  "securityFindings": {
    "a": [{"severity":"low|medium|high","title":"","description":"grounded description","line":number,"category":"injection|xss|secrets|crypto|deserialization|path-traversal|file-ops|rce|randomness","suggestedFix":"concrete fix"}],
    "b": [{"severity":"low|medium|high","title":"","description":"grounded description","line":number,"category":"injection|xss|secrets|crypto|deserialization|path-traversal|file-ops|rce|randomness","suggestedFix":"concrete fix"}]
  },
  "algorithmAnchors": {
    "a": [{"label":"Nested Loop / Hash Map / Recursion / ...","startLine":number,"endLine":number,"description":"Why classified as such"}],
    "b": [{"label":"Nested Loop / Hash Map / Recursion / ...","startLine":number,"endLine":number,"description":"Why classified as such"}]
  },
  "semanticEquivalence": {
    "syntaxSimilarity": 0..1,
    "astSimilarity": 0..1,
    "structuralSimilarity": 0..1,
    "semanticSimilarity": 0..1,
    "overallEquivalence": "equivalent|mostly-equivalent|partially-equivalent|different",
    "evidence": ["..."]
  },
  "whyWinner": [
    "Numbered list of 4-6 evidence-based sentences explaining why the chosen winner wins, linking to specific dimensions like algorithm choice and complexity."
  ],
  "finalScoresOverride": {
    "performance": {"a":number,"b":number}, "memory": {"a":number,"b":number}, "readability": {"a":number,"b":number}, "maintainability": {"a":number,"b":number}, "security": {"a":number,"b":number}, "correctness": {"a":number,"b":number}, "scalability": {"a":number,"b":number}
  }${
    input.interviewMode
      ? `,
  "interviewAssessment": {
    "algorithm": "...",
    "complexity": "...",
    "codeClarity": "...",
    "edgeCases": "...",
    "overall": "..."
  }`
      : ''
  }
}

Now produce the single JSON object.`;
}

function buildChatSystemMessage(report: AnalysisReport): string {
  return `You are WhiteCode, a helpful assistant answering questions about the user's current code-comparison analysis.

STRICT RULE: All answers MUST be grounded in the analysis context provided below. If the context does not contain enough information to answer confidently, say so explicitly and do not speculate or fabricate details.

ANALYSIS CONTEXT:
Problem: ${report.problem}
Language A: ${report.langA}
Language B: ${report.langB}

===== Logic Difference =====
${report.logicDifference}

===== Narrative Summary =====
${report.narrative.summary}
A: ${report.narrative.aExplanation}
B: ${report.narrative.bExplanation}
Key diff: ${report.narrative.keyDifference}

===== Recommendation =====
Overall: ${report.recommendation.overall}
Reason: ${report.recommendation.reason}
Trade-off: ${report.recommendation.tradeoff}
Best for Speed: ${report.recommendation.bestForSpeed}
Best for Memory: ${report.recommendation.bestForMemory}
Best for Readability: ${report.recommendation.bestForReadability}
Best for Scalability: ${report.recommendation.bestForScalability}

Weighted Scores — A: ${report.weightedOverallScores.a} / B: ${report.weightedOverallScores.b}

===== Solution A =====
Algorithm: ${report.solutionA.algorithm.label}
Time (best/avg/worst): ${report.solutionA.time.best} / ${report.solutionA.time.avg} / ${report.solutionA.time.worst}
Space (input/auxiliary): ${report.solutionA.space.input} / ${report.solutionA.space.auxiliary}
Readability: ${report.solutionA.readability.score}/10
Maintainability: ${report.solutionA.maintainability.score}/10
Correctness: ${report.solutionA.correctness.correct === null ? 'unknown' : report.solutionA.correctness.correct ? 'correct' : 'issues detected'}
Security findings: ${report.solutionA.security.length === 0 ? 'none' : report.solutionA.security.map((f) => `[${f.severity}] ${f.title}`).join(', ')}

===== Solution B =====
Algorithm: ${report.solutionB.algorithm.label}
Time (best/avg/worst): ${report.solutionB.time.best} / ${report.solutionB.time.avg} / ${report.solutionB.time.worst}
Space (input/auxiliary): ${report.solutionB.space.input} / ${report.solutionB.space.auxiliary}
Readability: ${report.solutionB.readability.score}/10
Maintainability: ${report.solutionB.maintainability.score}/10
Correctness: ${report.solutionB.correctness.correct === null ? 'unknown' : report.solutionB.correctness.correct ? 'correct' : 'issues detected'}
Security findings: ${report.solutionB.security.length === 0 ? 'none' : report.solutionB.security.map((f) => `[${f.severity}] ${f.title}`).join(', ')}

===== Optimization Suggestions =====
A: current=${report.optimizationA.currentApproach}; suggested=${report.optimizationA.suggestedApproach}; ${report.optimizationA.beforeComplexity} → ${report.optimizationA.afterComplexity}
B: current=${report.optimizationB.currentApproach}; suggested=${report.optimizationB.suggestedApproach}; ${report.optimizationB.beforeComplexity} → ${report.optimizationB.afterComplexity}

Confidence: algorithm=${report.confidences.algorithm}, time=${report.confidences.time}, space=${report.confidences.space}, security=${report.confidences.security}

${
  report.similarity
    ? `===== Similarity =====
Text: ${report.similarity.text.toFixed(2)}, AST: ${report.similarity.ast.toFixed(2)}, Structural: ${report.similarity.structural.toFixed(2)}, Semantic: ${report.similarity.semantic.toFixed(2)}
Verdict: ${report.similarity.verdict}
`
    : ''
}

${
  report.interviewMode && report.recommendation.interviewAssessment
    ? `===== Interview Assessment =====
Algorithm: ${report.recommendation.interviewAssessment.algorithm}
Complexity: ${report.recommendation.interviewAssessment.complexity}
Code clarity: ${report.recommendation.interviewAssessment.codeClarity}
Edge cases: ${report.recommendation.interviewAssessment.edgeCases}
Overall: ${report.recommendation.interviewAssessment.overall}
`
    : ''
}

Answer the user's next question truthfully, citing context when possible. If you cannot answer from context, say: "I don't have enough information in the current analysis to answer that confidently."`;
}

export class GeminiProvider implements AIProvider {
  readonly providerName = 'gemini';
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new AIProviderError(
        'GEMINI_API_KEY is not configured. Set GEMINI_API_KEY in your environment variables.'
      );
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
  }

  async analyze(input: AIAnalysisInput): Promise<AIAnalysisOutput> {
    const prompt = buildAnalysisPrompt(input);

    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    });

    const resultPromise = model.generateContent(prompt);
    const result = await withTimeout(resultPromise, 60000);

    const content = result.response.text();
    if (!content || content.trim().length === 0) {
      throw new AIProviderError('LLM returned empty message content.');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new AIProviderError(`Failed to parse LLM JSON output: ${msg}`);
    }

    const validation = LLMAnalysisOutputSchema.safeParse(parsed);
    if (!validation.success) {
      throw new AIProviderError(
        `LLM output failed schema validation: ${validation.error.issues
          .map((i) => `${i.path.join('.')} ${i.message}`)
          .join('; ')}`
      );
    }

    return validation.data;
  }

  async chat(messages: AIChatMessage[], context?: AIChatContext): Promise<string> {
    let systemInstruction: string | undefined;

    if (context?.report) {
      systemInstruction = buildChatSystemMessage(context.report);
    } else {
      systemInstruction =
        'You are WhiteCode, a helpful code-comparison assistant. You help developers reason about algorithms, complexity, code quality, and trade-offs. Be precise, cite reasoning, and if uncertain, hedge your claims rather than guessing.';
    }

    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      systemInstruction,
      generationConfig: {
        temperature: 0.3,
      },
    });

    const chat = model.startChat({
      history: messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }],
        })),
    });

    const lastMessage = messages[messages.length - 1];
    const lastUserContent =
      lastMessage?.role === 'user'
        ? lastMessage.content
        : messages.find((m) => m.role === 'user')?.content ?? '';

    const resultPromise = chat.sendMessage(lastUserContent);
    const result = await withTimeout(resultPromise, 60000);

    const text = result.response.text();
    if (!text || text.trim().length === 0) {
      throw new AIProviderError('LLM returned empty chat message content.');
    }

    return text;
  }
}
