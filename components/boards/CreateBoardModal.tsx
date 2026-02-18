'use client'

import { useState } from 'react'
import type { Board } from '@/types'

interface CreateBoardModalProps {
  onCreated: (board: Board) => void
  onBack: () => void
}

export default function CreateBoardModal({ onCreated, onBack }: CreateBoardModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Board name is required.')
      return
    }

    setSubmitting(true)

    const res = await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), description: description.trim(), is_private: isPrivate }),
    })

    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Failed to create board.')
      setSubmitting(false)
      return
    }

    onCreated(json.board as Board)
  }

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-[#E6ECEA]">
        <button
          type="button"
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#EDF7BE] transition-colors flex-shrink-0"
          aria-label="Back"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F1720" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <h2 className="text-base font-bold text-[#0F1720]">New board</h2>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-5 flex-1">

        {/* Name */}
        <div className="flex flex-col gap-1">
          <label htmlFor="board-name" className="text-xs font-semibold text-[#5B6B73] uppercase tracking-wide">
            Board name *
          </label>
          <input
            id="board-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. AI projects, Portfolio ideas…"
            maxLength={80}
            required
            autoFocus
            className="w-full rounded-2xl border border-[#E6ECEA] bg-white px-4 py-3 text-sm text-[#0F1720] placeholder:text-[#5B6B73] outline-none focus:border-[#35C8B4] focus:ring-2 focus:ring-[#35C8B4]/20 transition"
          />
          <p className="text-right text-xs text-[#5B6B73]">{name.length}/80</p>
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1">
          <label htmlFor="board-desc" className="text-xs font-semibold text-[#5B6B73] uppercase tracking-wide">
            Description
          </label>
          <textarea
            id="board-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What kind of pins will go here? (optional)"
            maxLength={500}
            rows={3}
            className="w-full rounded-2xl border border-[#E6ECEA] bg-white px-4 py-3 text-sm text-[#0F1720] placeholder:text-[#5B6B73] outline-none focus:border-[#35C8B4] focus:ring-2 focus:ring-[#35C8B4]/20 transition resize-none"
          />
          <p className="text-right text-xs text-[#5B6B73]">{description.length}/500</p>
        </div>

        {/* Privacy toggle */}
        <button
          type="button"
          role="switch"
          aria-checked={isPrivate}
          onClick={() => setIsPrivate((prev) => !prev)}
          className={`flex items-center justify-between w-full rounded-2xl border px-4 py-3.5 transition-colors text-left
            ${isPrivate
              ? 'border-[#35C8B4] bg-[#C2F2E4]/30'
              : 'border-[#E6ECEA] bg-white hover:bg-[#EDF7BE]/40'
            }`}
        >
          <div className="flex items-center gap-3">
            <span className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 transition-colors
              ${isPrivate ? 'bg-[#35C8B4]' : 'bg-[#E6ECEA]'}`}
            >
              {isPrivate ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5B6B73" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </span>
            <div>
              <p className="text-sm font-semibold text-[#0F1720]">
                {isPrivate ? 'Private' : 'Public'}
              </p>
              <p className="text-xs text-[#5B6B73]">
                {isPrivate ? 'Only you can see this board' : 'Visible to everyone'}
              </p>
            </div>
          </div>

          {/* pill toggle */}
          <div className={`relative h-6 w-11 rounded-full transition-colors flex-shrink-0
            ${isPrivate ? 'bg-[#35C8B4]' : 'bg-[#E6ECEA]'}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform
              ${isPrivate ? 'translate-x-5' : 'translate-x-0.5'}`}
            />
          </div>
        </button>

        {/* Error */}
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="mt-auto w-full rounded-2xl bg-[#35C8B4] py-3 text-sm font-bold text-white hover:bg-[#2db5a3] disabled:opacity-50 transition-colors"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              Creating…
            </span>
          ) : (
            'Create board'
          )}
        </button>
      </form>
    </div>
  )
}