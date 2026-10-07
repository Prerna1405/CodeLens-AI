import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'WhiteCode — Understand Which Code Is Actually Better',
    template: '%s · WhiteCode',
  },
  description:
    'Compare algorithms, complexity, performance, readability, and code quality — even across different programming languages.',
  applicationName: 'WhiteCode',
  keywords: ['code comparison', 'algorithm analysis', 'time complexity', 'space complexity', 'two sum', 'interview prep'],
  authors: [{ name: 'WhiteCode' }],
  openGraph: {
    title: 'WhiteCode — Understand Which Code Is Actually Better',
    description:
      'Semantic code comparison across languages. Analyze algorithms, complexity, readability, trade-offs.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#07080b',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="min-h-screen bg-ink-950 font-sans text-ink-100 antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-accent-500 focus:px-3 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <main id="main">{children}</main>
      </body>
    </html>
  )
}
