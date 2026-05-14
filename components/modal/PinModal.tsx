'use client'

import { useRouter } from 'next/navigation'
import ModalRoot from './ModalRoot'
import { usePin } from '@/lib/hooks/usePin'
import PinDetailView from '@/components/pin/PinDetailView'

interface PinModalProps {
  pinId: string
}

export default function PinModal({ pinId }: PinModalProps) {
  const router = useRouter()
  const { pin, loading, error } = usePin(pinId)

  function handleClose() {
    router.back()
  }

  return (
    <ModalRoot onClose={handleClose}>
      <style>{`
        .pin-modal-inner { padding: 28px 28px 32px; }
        @media (max-width: 640px) {
          .pin-modal-wrapper { border-radius: 20px !important; max-width: calc(100vw - 24px) !important; }
          .pin-modal-inner { padding: 16px 16px 24px; }
        }
      `}</style>
      <div
        className="relative w-full pin-modal-wrapper"
        style={{
          maxWidth: 'calc(100vw - 64px)',
          borderRadius: 24,
          background: '#fff',
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
          overflow: 'hidden',
        }}
      >
        {/* ── Close button ── */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 10,
            display: 'flex',
            height: 36,
            width: 36,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(255,255,255,0.9)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            cursor: 'pointer',
            transition: 'background 150ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#EDF7BE'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.9)'
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0F1720"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        {/* ── Loading ── */}
        {loading && (
          <div
            style={{
              display: 'flex',
              width: '100%',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '128px 0',
            }}
          >
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: '4px solid var(--brume)',
                borderTopColor: 'var(--menthe)',
                animation: 'spin .7s linear infinite',
                display: 'inline-block',
              }}
            />
          </div>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              padding: '128px 32px',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--text)',
              }}
            >
              Pin not found
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
              {error}
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="back-btn"
              style={{ marginTop: 8
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
              Go back
            </button>
          </div>
        )}

        {/* ── Pin detail content ── */}
        {!loading && pin && (
          <div className="pin-modal-inner">
            <PinDetailView pin={pin} />
          </div>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </ModalRoot>
  )
}
