'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface ModalRootProps {
  children: React.ReactNode
  onClose: () => void
}

export default function ModalRoot({ children, onClose }: ModalRootProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  // Wait until client-side mount so `document` is available for createPortal
  useEffect(() => { setMounted(true) }, [])

  // Allow the page to remain scrollable — no body scroll lock

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Click outside (on the backdrop) closes the modal
  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onClose()
  }

  if (!mounted) return null

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        overflowY: 'auto',
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      aria-modal="true"
      role="dialog"
    >
      <style>{`
        .modal-centering {
          display: flex;
          min-height: 100%;
          align-items: flex-start;
          justify-content: center;
          padding: 32px;
        }
        @media (max-width: 640px) {
          .modal-centering {
            padding: 12px;
            align-items: flex-end;
          }
        }
      `}</style>
      {/* Centering wrapper — click-through to backdrop handled above */}
      <div className="modal-centering">
        {children}
      </div>
    </div>,
    document.body
  )
}