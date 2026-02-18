'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface ModalRootProps {
  children: React.ReactNode
  onClose: () => void
}

export default function ModalRoot({ children, onClose }: ModalRootProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Lock body scroll while modal is open, restore on unmount
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previousPaddingRight = document.body.style.paddingRight

    // Measure scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    document.body.style.paddingRight = `${scrollbarWidth}px`

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.paddingRight = previousPaddingRight
    }
  }, [])

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

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
    >
      {/* Centering wrapper — click-through to backdrop handled above */}
      <div className="flex min-h-full items-start justify-center px-4 py-10 sm:py-16">
        {children}
      </div>
    </div>,
    document.body
  )
}