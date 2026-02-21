'use client'

import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import CreateBoardModal from './CreateBoardModal'
import { useBoards } from '@/lib/hooks/useBoards'
import type { Board, Pin } from '@/types'

interface BoardPickerModalProps {
  pin: Pin
  onClose: () => void
  onSaved?: () => void
}

type View = 'pick' | 'create'

export default function BoardPickerModal({ pin, onClose, onSaved }: BoardPickerModalProps) {
  const { boards, loading, error, addBoard } = useBoards()
  const [view, setView] = useState<View>('pick')
  const [mounted, setMounted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Set of board IDs the user wants to save to.
  // "saved" is a sentinel value representing the default Saved board.
  const [selected, setSelected] = useState<Set<string>>(new Set(['saved']))

  useEffect(() => { setMounted(true); return () => setMounted(false) }, [])

  // Once boards load, replace the 'saved' sentinel with the real board ID if it exists
  useEffect(() => {
    if (loading || boards.length === 0) return
    const savedBoard = boards.find(b => b.name === 'Saved')
    if (savedBoard) {
      setSelected(prev => {
        const next = new Set(prev)
        if (next.has('saved')) {
          next.delete('saved')
          next.add(savedBoard.id)
        }
        return next
      })
    }
  }, [boards, loading])

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

  // Escape closes
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

  // Sort boards: "Saved" first, rest alphabetically
  const sortedBoards = useMemo(() => {
    const saved = boards.find(b => b.name === 'Saved')
    const rest = boards.filter(b => b.name !== 'Saved').sort((a, b) => a.name.localeCompare(b.name))
    return saved ? [saved, ...rest] : rest
  }, [boards])

  function toggle(boardId: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(boardId)) next.delete(boardId)
      else next.add(boardId)
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)

    const savedBoard = boards.find(b => b.name === 'Saved')

    // Collect the save operations
    const ops: Promise<Response>[] = []

    for (const id of selected) {
      if (id === 'saved' || id === savedBoard?.id) {
        // Use the quick-save endpoint which handles find-or-create for Saved board
        ops.push(
          fetch('/api/saved-pins', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin_id: pin.id }),
          })
        )
      } else {
        ops.push(
          fetch('/api/board-pins', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ board_id: id, pin_id: pin.id }),
          })
        )
      }
    }

    try {
      const results = await Promise.all(ops)
      const failed = results.filter(r => !r.ok)
      if (failed.length > 0) {
        setSaveError('Some boards failed to save. Please try again.')
        setSaving(false)
        return
      }
      onSaved?.()
      onClose()
    } catch {
      setSaveError('Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  function handleBoardCreated(board: Board) {
    addBoard(board)
    setSelected(prev => new Set(prev).add(board.id))
    setView('pick')
  }

  if (!mounted) return null

  const selectedCount = selected.size
  const canSave = selectedCount > 0 && !saving

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-0 sm:px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      aria-modal="true"
      role="dialog"
      aria-label="Save pin to boards"
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
                  <h2 className="text-sm font-bold text-[#0F1720] truncate">Save to boards</h2>
                  {pin.title && (
                    <p className="text-xs text-[#5B6B73] truncate">{pin.title}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
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

              {/* If no boards at all — show the Saved sentinel pre-checked */}
              {!loading && !error && boards.length === 0 && (
                <ul className="flex flex-col gap-2">
                  <BoardRow
                    name="Saved"
                    isDefault
                    checked={selected.has('saved')}
                    onToggle={() => toggle('saved')}
                  />
                </ul>
              )}

              {!loading && !error && boards.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {sortedBoards.map(board => (
                    <BoardRow
                      key={board.id}
                      name={board.name}
                      isDefault={board.name === 'Saved'}
                      isPrivate={board.is_private}
                      checked={selected.has(board.id)}
                      onToggle={() => toggle(board.id)}
                    />
                  ))}
                </ul>
              )}
            </div>

            {/* ── Footer ── */}
            <div className="px-5 py-4 border-t border-[#E6ECEA] flex-shrink-0 flex flex-col gap-3">

              {/* Create new board */}
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

              {/* Save button */}
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className={`w-full rounded-2xl py-3 text-sm font-bold transition-colors ${
                  canSave
                    ? 'bg-[#35C8B4] text-white hover:bg-[#2db5a3]'
                    : 'bg-[#E6ECEA] text-[#5B6B73] cursor-default'
                }`}
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Saving…
                  </span>
                ) : selectedCount === 0 ? (
                  'Select a board'
                ) : (
                  `Save to ${selectedCount} ${selectedCount === 1 ? 'board' : 'boards'}`
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}

/* ── Board row (checkbox-style toggle) ── */
function BoardRow({
  name,
  isDefault = false,
  isPrivate = false,
  checked,
  onToggle,
}: {
  name: string
  isDefault?: boolean
  isPrivate?: boolean
  checked: boolean
  onToggle: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors
          ${checked
            ? 'border-[#35C8B4] bg-[#C2F2E4]/20'
            : 'border-[#E6ECEA] bg-white hover:border-[#35C8B4] hover:bg-[#C2F2E4]/10'
          }`}
      >
        {/* Board icon */}
        <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-colors
          ${checked ? 'bg-[#35C8B4]' : 'bg-[#C2F2E4]'}`}
        >
          {isDefault ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={checked ? 'white' : '#35C8B4'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={checked ? 'white' : '#35C8B4'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          )}
        </span>

        {/* Board name */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#0F1720] truncate">{name}</p>
          {isDefault && (
            <p className="text-xs text-[#5B6B73]">Default collection</p>
          )}
          {!isDefault && (
            <p className="text-xs text-[#5B6B73] flex items-center gap-1">
              {isPrivate ? (
                <>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Private
                </>
              ) : (
                <>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                  </svg>
                  Public
                </>
              )}
            </p>
          )}
        </div>

        {/* Checkbox */}
        <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-colors
          ${checked ? 'border-[#35C8B4] bg-[#35C8B4]' : 'border-[#E6ECEA] bg-white'}`}
        >
          {checked && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </span>
      </button>
    </li>
  )
}
