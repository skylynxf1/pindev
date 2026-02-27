'use client'

import { createContext, useCallback, useContext, useState, useRef } from 'react'

/* ─────────────────────────────────────────────────────────────
   TYPES
   ───────────────────────────────────────────────────────────── */
type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  type: ToastType
  exiting: boolean
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

/* ─────────────────────────────────────────────────────────────
   CONTEXT
   ───────────────────────────────────────────────────────────── */
const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}

/* ─────────────────────────────────────────────────────────────
   ICONS
   ───────────────────────────────────────────────────────────── */
const ICONS: Record<ToastType, React.ReactNode> = {
  success: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--menthe)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  error: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--menthe)" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
}

/* ─────────────────────────────────────────────────────────────
   PROVIDER
   ───────────────────────────────────────────────────────────── */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t))
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 200) // matches toastOut duration
  }, [])

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = nextId.current++
    setToasts(prev => [...prev, { id, message, type, exiting: false }])
    setTimeout(() => dismiss(id), 3000)
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container — fixed at top-center below header */}
      {toasts.length > 0 && (
        <div
          style={{
            position: 'fixed',
            top: 'calc(var(--header-h) + 12px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 60,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            pointerEvents: 'none',
          }}
        >
          {toasts.map(t => (
            <div
              key={t.id}
              className={t.exiting ? 'toast-exit' : 'toast-enter'}
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 18px',
                borderRadius: 'var(--r-md)',
                background: '#fff',
                border: `1px solid ${t.type === 'error' ? 'var(--danger)' : 'var(--border)'}`,
                boxShadow: 'var(--shadow-md)',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--text)',
                maxWidth: 360,
                cursor: 'pointer',
              }}
              onClick={() => dismiss(t.id)}
            >
              {ICONS[t.type]}
              {t.message}
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}
