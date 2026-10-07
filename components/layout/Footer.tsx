import Link from 'next/link'
import { Code2 } from 'lucide-react'

export default function Footer() {
  const columns = [
    {
      title: 'Product',
      links: [
        { label: 'Analyze', href: '#' },
        { label: 'Features', href: '#' },
        { label: 'Dashboard', href: '#' },
        { label: 'Pricing', href: '#' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'Documentation', href: '#' },
        { label: 'API Reference', href: '#' },
        { label: 'Blog', href: '#' },
        { label: 'Changelog', href: '#' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', href: '#' },
        { label: 'Careers', href: '#' },
        { label: 'Contact', href: '#' },
        { label: 'Privacy', href: '#' },
      ],
    },
  ]

  return (
    <footer className="border-t border-ink-700/60 bg-ink-950">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-400/15 ring-1 ring-accent-400/30">
                <Code2 className="h-5 w-5 text-accent-400" />
              </div>
              <span className="text-lg font-semibold tracking-tight text-white">
                WhiteCode
              </span>
            </Link>
            <p className="mt-5 text-sm leading-relaxed text-ink-300">
              Don&apos;t just compare code. Understand it.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-3">
            {columns.map((col) => (
              <div key={col.title}>
                <h4 className="text-sm font-semibold text-white">{col.title}</h4>
                <ul className="mt-4 space-y-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-ink-300 transition-colors hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 border-t border-ink-700/60 pt-8">
          <p className="text-sm text-ink-400">
            © 2026 WhiteCode · All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
