'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import CreateBoardModal from './CreateBoardModal'
import { useBoards } from '@/lib/hooks/useBoards'
import type { Board, Pin } from '@/types'

interface BoardPickerModalProps {
  pin: Pin
  onClose: () => void
  onSaved?: (boardId: string) => void
}

type View = 'pick' | 'create'

export default function BoardPickerModal({ pin, onClose, onSaved }: BoardPickerModalProps) {
  const { boards, loading, error, addBoard } = useBoards()
  const [view, setView] = useState<View>('pick')
  const [saving, setSaving] = useState<string | null>(null)   // board id currently being saved
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [saveError, setSaveError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow
    const prevPad = document.body.style.paddingRight
    const scrollbarW = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    document.body.style.paddingRight = `${scrollbarW}px`
    return () => {
      document.body.style.overflow = prev
      document.body.style.paddingRight = prevPad
    }
  }, [])

  // Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (view === 'create') setView('pick')
        else onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view, onClose])

  async function handleSave(board: Board) {
    if (savedIds.has(board.id)) return
    setSaving(board.id)
    setSaveError(null)

    const res = await fetch('/api/board-pins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ board_id: board.id, pin_id: pin.id }),
    })

    const json = await res.json()

    if (!res.ok) {
      setSaveError(json.error ?? 'Failed to save pin.')
      setSaving(null)
      return
    }

    setSavedIds((prev) => new Set(prev).add(board.id))
    setSaving(null)
    onSaved?.(board.id)

    // Brief confirmation then close
    setTimeout(onClose, 700)
  }

  function handleBoardCreated(board: Board) {
    addBoard(board)
    setView('pick')
    // Immediately save to the newly created board
    handleSave(board)
  }

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-0 sm:px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      aria-modal="true"
      role="dialog"
      aria-label="Save pin to board"
    >
      <div className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">

        {view === 'create' ? (
          <CreateBoardModal
            onCreated={handleBoardCreated}
            onBack={() => setView('pick')}
          />
        ) : (
          <>
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#E6ECEA] flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {/* Pin thumbnail */}
                <div className="h-11 w-11 rounded-xl overflow-hidden bg-[#C2F2E4]/40 flex-shrink-0">
                  <Image
                    src={pin.thumbnail_url}
                    alt={pin.title || 'Pin'}
                    width={44}
                    height={44}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-[#0F1720] truncate">Save to board</h2>
                  {pin.title && (
                    <p className="text-xs text-[#5B6B73] truncate">{pin.title}</p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#EDF7BE] transition-colors flex-shrink-0 ml-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0F1720" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* ── Board list ── */}
            <div className="flex-1 overflow-y-auto px-5 py-4">

              {saveError && (
                <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-600">
                  {saveError}
                </p>
              )}

              {loading && (
                <div className="flex items-center justify-center py-10">
                  <span className="h-7 w-7 rounded-full border-4 border-[#C2F2E4] border-t-[#35C8B4] animate-spin" />
                </div>
              )}

              {!loading && error && (
                <p className="py-6 text-center text-sm text-[#5B6B73]">{error}</p>
              )}

              {!loading && !error && boards.length === 0 && (
                <div className="py-8 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#C2F2E4]">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#35C8B4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-[#0F1720]">No boards yet</p>
                  <p className="mt-1 text-xs text-[#5B6B73]">Create your first board to start saving pins.</p>
                </div>
              )}

              {!loading && boards.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {boards.map((board) => {
                    const isSaved = savedIds.has(board.id)
                    const isSaving = saving === board.id

                    return (
                      <li key={board.id}>
                        <button
                          type="button"
                          onClick={() => handleSave(board)}
                          disabled={isSaved || isSaving}
                          className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors
                            ${isSaved
                              ? 'border-[#A4CF4A] bg-[#EDF7BE]/60 cursor-default'
                              : 'border-[#E6ECEA] bg-white hover:border-[#35C8B4] hover:bg-[#C2F2E4]/20'
                            }`}
                        >
                          {/* Board icon */}
                          <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-colors
                            ${isSaved ? 'bg-[#A4CF4A]' : 'bg-[#C2F2E4]'}`}
                          >
                            {isSaved ? (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            ) : (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#35C8B4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                              </svg>
                            )}
                          </span>

                          {/* Board info */}
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-semibold truncate ${isSaved ? 'text-[#5B6B73]' : 'text-[#0F1720]'}`}>
                              {board.name}
                            </p>
                            <p className="text-xs text-[#5B6B73] flex items-center gap-1">
                              {board.is_private ? (
                                <>
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                  </svg>
                                  Private
                                </>
                              ) : (
                                <>
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <circle cx="12" cy="12" r="3" />
                                  </svg>
                                  Public
                                </>
                              )}
                            </p>
                          </div>

                          {/* Right indicator */}
                          <div className="flex-shrink-0">
                            {isSaving ? (
                              <span className="h-5 w-5 rounded-full border-2 border-[#35C8B4]/30 border-t-[#35C8B4] animate-spin block" />
                            ) : isSaved ? (
                              <span className="text-xs font-semibold text-[#A4CF4A]">Saved</span>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5B6B73" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 18l6-6-6-6" />
                              </svg>
                            )}
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* ── Create new board button ── */}
            <div className="px-5 py-4 border-t border-[#E6ECEA] flex-shrink-0">
              <button
                type="button"
                onClick={() => setView('create')}
                className="flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-[#E6ECEA] px-4 py-3 hover:border-[#35C8B4] hover:bg-[#C2F2E4]/10 transition-colors group"
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#E6ECEA] group-hover:bg-[#C2F2E4] transition-colors">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#35C8B4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
                <span className="text-sm font-semibold text-[#0F1720] group-hover:text-[#35C8B4] transition-colors">
                  Create new board
                </span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}