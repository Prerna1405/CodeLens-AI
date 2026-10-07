import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-ink-950 bg-grid-fade flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center px-6 py-24">
        <div className="mx-auto max-w-md text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            404 · Page not found
          </h1>
          <p className="mt-4 text-ink-300">
            The page you are looking for does not exist or has been moved.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/" className="btn-primary min-w-[160px]">
              Go home
            </Link>
            <Link href="/analyze" className="btn-secondary min-w-[160px]">
              Analyze code
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
