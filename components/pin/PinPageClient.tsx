'use client'

import { useRouter } from 'next/navigation'
import type { Pin } from '@/types'
import PinDetailView from './PinDetailView'

interface PinPageClientProps {
  pin: Pin
  similarPins?: Pin[]
}

export default function PinPageClient({ pin, similarPins }: PinPageClientProps) {
  const router = useRouter()

  return (
    <div style={{ padding: '24px 32px 60px' }}>
      {/* ── Back button ── */}
      <button
        onClick={() => router.back()}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 20,
          padding: '8px 16px',
          borderRadius: 12,
          border: '1.5px solid var(--border)',
          background: 'var(--bg)',
          fontSize: '0.875rem',
          fontWeight: 600,
          color: 'var(--muted)',
          cursor: 'pointer',
          transition: 'color 150ms, border-color 150ms, background 150ms',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.color = 'var(--menthe)'
          el.style.borderColor = 'var(--menthe)'
          el.style.background = 'var(--brume)'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.color = 'var(--muted)'
          el.style.borderColor = 'var(--border)'
          el.style.background = 'var(--bg)'
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        Back
      </button>

      {/* ── Pin detail view ── */}
      <PinDetailView pin={pin} initialSimilarPins={similarPins} />
    </div>
  )
}
