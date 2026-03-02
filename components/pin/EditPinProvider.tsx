'use client'

import { createContext, useCallback, useContext, useState } from 'react'
import EditPinModal from './EditPinModal'
import type { Pin } from '@/types'

interface EditPinContextValue {
  openEditModal: (pin: Pin, onSaved?: (updated: Pin) => void) => void
}

const EditPinContext = createContext<EditPinContextValue | null>(null)

export function useEditPin() {
  const ctx = useContext(EditPinContext)
  if (!ctx) throw new Error('useEditPin must be used within <EditPinProvider>')
  return ctx
}

export function EditPinProvider({ children }: { children: React.ReactNode }) {
  const [editingPin, setEditingPin] = useState<Pin | null>(null)
  const [onSavedCb, setOnSavedCb] = useState<((updated: Pin) => void) | null>(null)

  const openEditModal = useCallback((pin: Pin, onSaved?: (updated: Pin) => void) => {
    setEditingPin(pin)
    // Wrap in a function to avoid React treating it as a state updater
    setOnSavedCb(() => onSaved ?? null)
  }, [])

  function handleClose() {
    setEditingPin(null)
    setOnSavedCb(null)
  }

  function handleSaved(updated: Pin) {
    onSavedCb?.(updated)
    setEditingPin(null)
    setOnSavedCb(null)
  }

  return (
    <EditPinContext.Provider value={{ openEditModal }}>
      {children}
      {editingPin && (
        <EditPinModal
          pin={editingPin}
          onClose={handleClose}
          onSaved={handleSaved}
        />
      )}
    </EditPinContext.Provider>
  )
}
