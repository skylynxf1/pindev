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
    <div style={{ width: '100%', minHeight: '100vh' }}>
      {/* Compact back row */}
      <div style={{ maxWidth: 2400, margin: '0 auto', padding: '16px clamp(16px, 2vw, 48px) 0' }}>
        <button onClick={() => router.back()} className="back-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back
        </button>
      </div>

      {/* Pin detail — full width, no extra box */}
      <PinDetailView pin={pin} />
    </div>
  )
}
