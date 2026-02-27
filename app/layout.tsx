import { Suspense } from 'react'
import type { Metadata, Viewport } from 'next'
import Shell from '@/components/layout/Shell'
import { ToastProvider } from '@/components/Toast'
import '@/app/globals.css'

/* ─────────────────────────────────────────────────────────────
   METADATA
   ───────────────────────────────────────────────────────────── */
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://pindev.app'
  ),
  title: {
    default:  'PinDev — Discover live web & AI projects',
    template: '%s · PinDev',
  },
  description:
    'A Pinterest-style discovery platform for live web and AI projects. Save, share, and explore what developers are shipping.',
  keywords: ['developer projects', 'AI projects', 'web apps', 'portfolio', 'discover'],
  openGraph: {
    type:        'website',
    siteName:    'PinDev',
    title:       'PinDev — Discover live web & AI projects',
    description: 'Save, share, and explore live web and AI projects from developers around the world.',
    locale:      'en_US',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'PinDev',
    description: 'Discover live web & AI projects.',
  },
  robots: {
    index:  true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon:  [{ url: '/logo.png', type: 'image/png' }],
    apple: '/logo.png',
  },
}

export const viewport: Viewport = {
  themeColor:    '#35C8B4',
  width:         'device-width',
  initialScale:  1,
  // Prevent iOS from auto-zooming form inputs
  maximumScale:  1,
}

/* ─────────────────────────────────────────────────────────────
   ROOT LAYOUT
   ───────────────────────────────────────────────────────────── */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          Preconnect to Google Fonts so DM Sans loads as fast as possible.
          The @import in globals.css handles the actual font request.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>

      <body>
        {/*
          Suspense is required here because Shell → Header uses
          useSearchParams() inside SearchBar, which triggers Next.js'
          static-generation bailout without a Suspense boundary.
        */}
        <ToastProvider>
          <Suspense fallback={null}>
            <Shell>{children}</Shell>
          </Suspense>
        </ToastProvider>

        {/* Skip-to-content anchor for keyboard / AT users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-lg"
          style={{ color: 'var(--menthe)', outlineColor: 'var(--menthe)' }}
        >
          Skip to content
        </a>
      </body>
    </html>
  )
}