import Link from 'next/link'
import {
  ArrowDown,
  BarChart3,
  Brain,
  Languages,
  Scale,
  SlidersHorizontal,
  Users,
} from 'lucide-react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

const pythonSnippet = `def two_sum(nums, target):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]`

const javaSnippet = `public int[] twoSum(int[] nums, int target) {
    Map<Integer, Integer> map = new HashMap<>();
    for (int i = 0; i < nums.length; i++) {
        int diff = target - nums[i];
        if (map.containsKey(diff))
            return new int[]{map.get(diff), i};
        map.put(nums[i], i);
    }
    return new int[]{};
}`

const features = [
  {
    icon: Languages,
    title: 'Cross-Language Analysis',
    description: 'Compare solutions written in different languages side by side.',
  },
  {
    icon: Brain,
    title: 'Algorithm Detection',
    description: 'Identify patterns: brute force, hashing, DP, two pointers, and more.',
  },
  {
    icon: BarChart3,
    title: 'Complexity Visualization',
    description: 'See time and space complexity with clear, labeled bar visuals.',
  },
  {
    icon: Scale,
    title: 'Trade-off Engine',
    description: 'No simplistic winners — best-for-X cards surface every trade-off.',
  },
  {
    icon: Users,
    title: 'Interview Mode',
    description: 'Interview-focused assessment with clarity and edge-case grading.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Priority Weights',
    description: 'Adjust what matters: performance, memory, readability, and more.',
  },
]

const outputChips = [
  'Algorithm Comparison',
  'Complexity Analysis',
  'Performance',
  'Code Quality',
  'Explanation',
]

export default function Home() {
  return (
    <div className="min-h-screen bg-ink-950 bg-grid-fade">
      <Header />

      <main>
        <section className="relative overflow-hidden px-6 pt-20 pb-16 sm:pt-28 sm:pb-24">
          <div className="mx-auto max-w-5xl text-center">
            <div className="inline-flex chip border-accent-500/30 bg-accent-500/10 text-accent-300">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
              Semantic code comparison · cross-language, AI-augmented
            </div>

            <h1 className="mt-6 text-5xl font-bold tracking-tight text-white sm:text-6xl">
              Understand Which Code Is Actually Better.
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-300">
              Compare algorithms, complexity, performance, readability, and code quality
              — even across different programming languages.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/analyze" className="btn-primary min-w-[180px]">
                Analyze Code
              </Link>
              <Link href="/analyze?demo=true" className="btn-secondary min-w-[180px]">
                Try Demo
              </Link>
            </div>
          </div>
        </section>

        <section className="px-6 pb-20">
          <div className="mx-auto max-w-6xl">
            <div className="card p-6 sm:p-8">
              <div className="grid items-center gap-6 lg:grid-cols-[1fr_auto_1fr]">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink-200">Code A</span>
                    <span className="badge border-ink-600 bg-ink-800 text-ink-200">
                      Python
                    </span>
                  </div>
                  <div className="rounded-lg border border-ink-700 bg-ink-950 p-4 font-mono text-xs leading-relaxed text-ink-200 sm:text-sm overflow-x-auto">
                    <pre className="whitespace-pre">{pythonSnippet}</pre>
                  </div>
                  <div className="flex justify-end">
                    <span className="badge border-rose-500/30 bg-rose-500/10 text-rose-400">
                      O(n²)
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center gap-2 py-2">
                  <ArrowDown className="h-6 w-6 text-ink-500" />
                  <span className="rounded-full border border-ink-600 bg-ink-800 px-3 py-1 text-xs font-semibold text-ink-200">
                    VS
                  </span>
                  <ArrowDown className="h-6 w-6 text-ink-500" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink-200">Code B</span>
                    <span className="badge border-ink-600 bg-ink-800 text-ink-200">
                      Java
                    </span>
                  </div>
                  <div className="rounded-lg border border-ink-700 bg-ink-950 p-4 font-mono text-xs leading-relaxed text-ink-200 sm:text-sm overflow-x-auto">
                    <pre className="whitespace-pre">{javaSnippet}</pre>
                  </div>
                  <div className="flex justify-end">
                    <span className="badge border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                      O(n)
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-2 border-t border-ink-700/60 pt-6">
                {outputChips.map((label) => (
                  <span key={label} className="chip pointer-events-none">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 pb-24">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <h2 className="section-title text-xl sm:text-2xl">Everything you need to compare code deeply</h2>
              <p className="mx-auto mt-3 max-w-2xl text-ink-300">
                Six focused modules turn raw code into an explainable, trade-off-aware recommendation.
              </p>
            </div>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon
                return (
                  <div key={feature.title} className="card p-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-400/10 ring-1 ring-accent-400/20">
                      <Icon className="h-5 w-5 text-accent-400" />
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-white">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-sm text-ink-300">
                      {feature.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
