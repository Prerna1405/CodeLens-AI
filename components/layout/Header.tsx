'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Code2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Header() {
  const pathname = usePathname()

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/analyze', label: 'Analyze' },
    { href: '/dashboard', label: 'Dashboard' },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-ink-700/60 bg-ink-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-400/15 ring-1 ring-accent-400/30">
            <Code2 className="h-5 w-5 text-accent-400" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">
            WhiteCode
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'text-white bg-ink-800'
                    : 'text-ink-300 hover:text-white hover:bg-ink-800/60'
                )}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/login" className="btn-secondary">
            Login
          </Link>
          <Link href="/signup" className="btn-primary">
            Signup
          </Link>
        </div>
      </div>
    </header>
  )
}
