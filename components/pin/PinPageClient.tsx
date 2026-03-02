'use client'

import { useRouter } from 'next/navigation'
import type { Pin } from '@/types'
import PinDetailView from './PinDetailView'

interface PinPageClientProps {
  pin: Pin
}

export default function PinPageClient({ pin }: PinPageClientProps) {
  const router = useRouter()

  return (
    <div style={{ maxWidth: 2400, margin: '0 auto', padding: '24px clamp(16px, 2vw, 48px) 60px' }}>
      {/* ── Back button ── */}
      <button onClick={() => router.back()} className="back-btn" style={{ marginBottom: 20 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Back
      </button>

      {/* ── Pin detail view ── */}
      <PinDetailView pin={pin} />
    </div>
  )
}
