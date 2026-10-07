async function test() {
  const res = await fetch('http://localhost:3001/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      problem: 'Two Sum',
      codeA: `def two_sum(n,t):
  for i in range(len(n)):
    for j in range(i+1,len(n)):
      if n[i]+n[j]==t: return [i,j]
  return []`,
      codeB: `function twoSum(nums,target){const m=new Map();for(let i=0;i<nums.length;i++){const c=target-nums[i];if(m.has(c))return [m.get(c),i];m.set(nums[i],i);}return [];}`,
      langA: 'python',
      langB: 'javascript',
      staticOnly: true,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('FAIL', res.status, data);
    process.exit(1);
  }
  console.log('API /api/analyze OK');
  console.log('  Overall recommendation:', data.report.recommendation.overall);
  console.log('  Weighted scores: A=', data.report.weightedOverallScores.a.toFixed(2),
    ' / B=', data.report.weightedOverallScores.b.toFixed(2));
  console.log('  Worst-time: A=', data.report.solutionA.time.worst,
    ' / B=', data.report.solutionB.time.worst);
  console.log('  Aux-space:  A=', data.report.solutionA.space.auxiliary,
    ' / B=', data.report.solutionB.space.auxiliary);
  console.log('  Cached flag:', data.cached);
  console.log('  generatedAt:', data.report.generatedAt);

  const histRes = await fetch('http://localhost:3001/api/analyze/history?limit=3');
  const hist = await histRes.json();
  console.log('\nAPI /api/analyze/history OK');
  console.log('  Count returned:', hist.count);
  if (hist.items && hist.items.length > 0) {
    const h = hist.items[0];
    console.log('  Last item id=', h.id, ' problem=', h.problem.substring(0, 30),
      ' overall=', h.overall);
  }
}
test().catch((e) => { console.error(e); process.exit(1); });
