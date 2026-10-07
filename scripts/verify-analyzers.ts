import * as analyzers from '../lib/services';

type PriorityWeights = {
  performance: number;
  memory: number;
  readability: number;
  maintainability: number;
  security: number;
  interview: number;
  production: number;
};

const pythonBrute = `def two_sum(nums, target):
  n = len(nums)
  for i in range(n):
    for j in range(n):
      if i != j and nums[i] + nums[j] == target:
        return [i, j]
  return []`;

const javaHash = `import java.util.HashMap;
class Solution {
  public int[] twoSum(int[] nums, int target) {
    HashMap<Integer,Integer> map = new HashMap<>();
    for (int i=0;i<nums.length;i++) {
      int complement = target - nums[i];
      if (map.containsKey(complement)) return new int[]{ map.get(complement), i };
      map.put(nums[i], i);
    }
    return new int[0];
  }
}`;

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    throw new Error(`ASSERT FAILED: ${msg}`);
  }
}

(async function main(): Promise<void> {
  const pySyntax = analyzers.syntaxAnalyzer.analyze(pythonBrute, 'python');
  const pyAlgo = analyzers.algorithmAnalyzer.analyze(pythonBrute, 'python');
  const pyComplex = analyzers.complexityAnalyzer.analyze(
    pythonBrute,
    'python',
    pyAlgo.patterns,
    pySyntax,
  );
  assert(pyComplex.time.worst === 'O(n^2)', `expected O(n^2), got ${pyComplex.time.worst}`);
  assert(pyComplex.space.auxiliary === 'O(1)', `expected O(1), got ${pyComplex.space.auxiliary}`);
  console.log('✓ TR-4.1 complexityAnalyzer O(n^2)/O(1) PASS');

  const javaSyntax = analyzers.syntaxAnalyzer.analyze(javaHash, 'java');
  const javaAlgo = analyzers.algorithmAnalyzer.analyze(javaHash, 'java');
  const javaComplex = analyzers.complexityAnalyzer.analyze(
    javaHash,
    'java',
    javaAlgo.patterns,
    javaSyntax,
  );
  assert(
    javaAlgo.algorithm.label.toLowerCase().includes('hash'),
    `expected hash label, got ${javaAlgo.algorithm.label}`,
  );
  console.log('✓ TR-4.2 algorithmAnalyzer hash detection PASS');

  const pyRead = analyzers.readabilityAnalyzer.analyze(pySyntax, pythonBrute, 'python');
  const pyQual = analyzers.qualityAnalyzer.analyze(pythonBrute, 'python');
  const pySec = analyzers.securityAnalyzer.analyze(pythonBrute, 'python');
  const pyMaintScore = Math.min(
    pyRead.score + (pyQual.duplication.length === 0 ? 2 : 0) +
      (pyQual.errorHandling.length >= 2 ? 1 : pyQual.errorHandling.length === 1 && !pyQual.errorHandling[0]!.includes('No explicit') ? 1 : 0),
    10,
  );
  const solutionA = {
    algorithm: pyAlgo.algorithm,
    time: pyComplex.time,
    space: pyComplex.space,
    readability: pyRead,
    maintainability: {
      score: pyMaintScore,
      reasons: [`Readability contribution: ${pyRead.score}/10.`],
    },
    correctness: {
      correct: null as boolean | null,
      summary: 'heuristic',
      issues: pyAlgo.patterns.nestedLoop ? ['May timeout for large inputs'] : [],
    },
    security: pySec,
    bugs: [],
    quality: pyQual,
  };

  const javaRead = analyzers.readabilityAnalyzer.analyze(javaSyntax, javaHash, 'java');
  const javaQual = analyzers.qualityAnalyzer.analyze(javaHash, 'java');
  const javaSec = analyzers.securityAnalyzer.analyze(javaHash, 'java');
  const javaMaintScore = Math.min(
    javaRead.score + (javaQual.duplication.length === 0 ? 2 : 0) +
      (javaQual.errorHandling.length >= 2 ? 1 : javaQual.errorHandling.length === 1 && !javaQual.errorHandling[0]!.includes('No explicit') ? 1 : 0),
    10,
  );
  const solutionB = {
    algorithm: javaAlgo.algorithm,
    time: javaComplex.time,
    space: javaComplex.space,
    readability: javaRead,
    maintainability: {
      score: javaMaintScore,
      reasons: [`Readability contribution: ${javaRead.score}/10.`],
    },
    correctness: {
      correct: null as boolean | null,
      summary: 'heuristic',
      issues: javaAlgo.patterns.hashing ? ['Hashing worst-case collisions degrade to O(n).'] : [],
    },
    security: javaSec,
    bugs: [],
    quality: javaQual,
  };

  const memoryPriorities: PriorityWeights = {
    performance: 0,
    memory: 100,
    readability: 0,
    maintainability: 0,
    security: 0,
    interview: 0,
    production: 0,
  };

  const cmp = analyzers.comparisonEngine.compare(solutionA, solutionB, memoryPriorities);
  assert(
    cmp.recommendation.bestForMemory === 'A',
    `expected bestForMemory A (O(1) vs ${pyComplex.space.auxiliary}/${javaComplex.space.auxiliary}), got ${cmp.recommendation.bestForMemory}`,
  );
  console.log('✓ TR-4.4 comparisonEngine memory-weighted bestForMemory=A PASS');

  const report = await analyzers.runAnalysis({
    problem: 'Two Sum',
    codeA: pythonBrute,
    codeB: javaHash,
    langA: 'python',
    langB: 'java',
    priorities: {
      performance: 20,
      memory: 20,
      readability: 20,
      maintainability: 20,
      security: 10,
      interview: 5,
      production: 5,
    },
    explanationLevel: 'normal',
    interviewMode: false,
    staticOnly: true,
  });

  assert(typeof report.solutionA === 'object', 'missing solutionA');
  assert(typeof report.solutionB === 'object', 'missing solutionB');
  assert(typeof report.narrative.summary === 'string', 'missing narrative summary');
  assert(report.edgeCases.length >= 1, 'missing edge cases');
  assert(typeof report.weightedOverallScores.a === 'number', 'missing overall scores');
  assert(typeof report.recommendation.overall === 'string', 'missing recommendation overall');
  assert(typeof report.generatedAt === 'string', 'missing generatedAt');
  console.log('✓ TR-4.5 analysisOrchestrator.run({staticOnly:true}) shape PASS');

  console.log('\nAll verification checks passed.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
