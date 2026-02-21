'use client'

import { useState } from 'react'
import type { Pin, Tag } from '@/types'

/* ─────────────────────────────────────────────────────────────
   CATEGORY OPTIONS
   ───────────────────────────────────────────────────────────── */
const CATEGORY_OPTIONS = [
  { id: 'website',    label: 'Website' },
  { id: 'app',        label: 'App' },
  { id: 'ai-tool',    label: 'AI Tool' },
  { id: 'vibecoding', label: 'VibeCoding' },
] as const

const CATEGORY_IDS = new Set<string>(CATEGORY_OPTIONS.map(c => c.id))

function getSelectedCategories(tags?: Tag[]): string[] {
  if (!tags?.length) return []
  return tags.map(t => t.name.toLowerCase()).filter(n => CATEGORY_IDS.has(n))
}

/* ─────────────────────────────────────────────────────────────
   EDIT PIN MODAL
   ───────────────────────────────────────────────────────────── */
interface EditPinModalProps {
  pin: Pin
  onClose: () => void
  onSaved: (updated: Pin) => void
}

export default function EditPinModal({ pin, onClose, onSaved }: EditPinModalProps) {
  const [title, setTitle] = useState(pin.title || '')
  const [description, setDescription] = useState(pin.description || '')
  const [liveUrl, setLiveUrl] = useState(pin.live_url || '')
  const [repoUrl, setRepoUrl] = useState(pin.repo_url || '')
  const [selectedTags, setSelectedTags] = useState<string[]>(getSelectedCategories(pin.tags))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const errors: Record<string, string> = {}
    if (!title.trim()) errors.title = 'Title is required'
    if (title.trim().length > 120) errors.title = 'Title must be 120 characters or fewer'
    if (!liveUrl.trim()) errors.liveUrl = 'Live URL is required'
    else {
      try {
        const u = new URL(liveUrl.trim())
        if (!u.protocol.startsWith('http')) errors.liveUrl = 'URL must start with http:// or https://'
      } catch {
        errors.liveUrl = 'Must be a valid URL'
      }
    }
    if (repoUrl.trim()) {
      try {
        const u = new URL(repoUrl.trim())
        if (!u.protocol.startsWith('http')) errors.repoUrl = 'URL must start with http:// or https://'
      } catch {
        errors.repoUrl = 'Must be a valid URL'
      }
    }
    if (description.length > 2000) errors.description = 'Description must be 2000 characters or fewer'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    setError(null)

    try {
      const body = new FormData()
      body.append('title', title.trim())
      body.append('description', description.trim())
      body.append('live_url', liveUrl.trim())
      body.append('repo_url', repoUrl.trim())
      body.append('tags', selectedTags.join(','))

      const res = await fetch(`/api/pins/${pin.id}`, { method: 'PATCH', body })
      const json = await res.json()

      if (!res.ok) {
        if (res.status === 403) setError('You are not authorized to edit this pin.')
        else if (res.status === 401) setError('Please sign in to edit this pin.')
        else setError(json.error || 'Failed to save changes.')
        return
      }

      // Build updated pin for optimistic UI update
      const updatedTags: Tag[] = selectedTags.map(name => {
        const existing = pin.tags?.find(t => t.name === name)
        return existing || { id: name, name }
      })

      const updatedPin: Pin = {
        ...pin,
        title: title.trim(),
        description: description.trim(),
        live_url: liveUrl.trim(),
        repo_url: repoUrl.trim() || null,
        tags: updatedTags,
      }

      onSaved(updatedPin)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(15,23,32,0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 24,
          padding: '32px 28px 28px',
          maxWidth: 520,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
          position: 'relative',
        }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--surface)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--muted)',
            transition: 'background 150ms',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--brume)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>

        {/* Header */}
        <h2 style={{
          fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)',
          margin: '0 0 4px', letterSpacing: '-0.02em',
        }}>
          Edit Pin
        </h2>
        <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', margin: '0 0 24px' }}>
          Update your project details below.
        </p>

        {/* Form fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Title */}
          <div>
            <label style={labelStyle}>
              Title <span style={{ color: 'var(--menthe)' }}>*</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--muted-light)', fontWeight: 400 }}>{title.length}/120</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={120}
              placeholder="My awesome project"
              style={{
                ...inputBaseStyle,
                borderColor: fieldErrors.title ? '#ef4444' : 'var(--border)',
              }}
              onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--menthe)' }}
              onBlur={e => { (e.currentTarget as HTMLInputElement).style.borderColor = fieldErrors.title ? '#ef4444' : 'var(--border)' }}
            />
            {fieldErrors.title && <p style={errorTextStyle}>{fieldErrors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>
              Description
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--muted-light)', fontWeight: 400 }}>{description.length}/2000</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={2000}
              rows={4}
              placeholder="What does it do? What stack did you use?"
              style={{
                ...inputBaseStyle,
                resize: 'none',
                lineHeight: 1.6,
                borderColor: fieldErrors.description ? '#ef4444' : 'var(--border)',
              }}
              onFocus={e => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = 'var(--menthe)' }}
              onBlur={e => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = fieldErrors.description ? '#ef4444' : 'var(--border)' }}
            />
            {fieldErrors.description && <p style={errorTextStyle}>{fieldErrors.description}</p>}
          </div>

          {/* Live URL */}
          <div>
            <label style={labelStyle}>
              Live URL <span style={{ color: 'var(--menthe)' }}>*</span>
            </label>
            <input
              type="url"
              value={liveUrl}
              onChange={e => setLiveUrl(e.target.value)}
              placeholder="https://myproject.vercel.app"
              style={{
                ...inputBaseStyle,
                borderColor: fieldErrors.liveUrl ? '#ef4444' : 'var(--border)',
              }}
              onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--menthe)' }}
              onBlur={e => { (e.currentTarget as HTMLInputElement).style.borderColor = fieldErrors.liveUrl ? '#ef4444' : 'var(--border)' }}
            />
            {fieldErrors.liveUrl && <p style={errorTextStyle}>{fieldErrors.liveUrl}</p>}
          </div>

          {/* Repo URL */}
          <div>
            <label style={labelStyle}>Repository URL</label>
            <input
              type="url"
              value={repoUrl}
              onChange={e => setRepoUrl(e.target.value)}
              placeholder="https://github.com/you/repo (optional)"
              style={{
                ...inputBaseStyle,
                borderColor: fieldErrors.repoUrl ? '#ef4444' : 'var(--border)',
              }}
              onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--menthe)' }}
              onBlur={e => { (e.currentTarget as HTMLInputElement).style.borderColor = fieldErrors.repoUrl ? '#ef4444' : 'var(--border)' }}
            />
            {fieldErrors.repoUrl && <p style={errorTextStyle}>{fieldErrors.repoUrl}</p>}
          </div>

          {/* Category tags */}
          <div>
            <label style={labelStyle}>Category</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORY_OPTIONS.map(({ id, label }) => {
                const active = selectedTags.includes(id)
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      setSelectedTags(prev =>
                        prev.includes(id)
                          ? prev.filter(t => t !== id)
                          : prev.length < 4 ? [...prev, id] : prev
                      )
                    }
                    style={{
                      padding: '7px 14px',
                      borderRadius: 10,
                      border: `1.5px solid ${active ? 'var(--menthe)' : 'var(--border)'}`,
                      background: active ? 'var(--menthe)' : 'var(--surface)',
                      color: active ? '#fff' : 'var(--text)',
                      fontSize: '0.8125rem',
                      fontWeight: active ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 120ms',
                    }}
                  >
                    {label}
                    {active && (
                      <svg style={{ marginLeft: 6, verticalAlign: 'middle' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{
            marginTop: 16, borderRadius: 12, border: '1px solid #fecaca',
            background: '#fef2f2', padding: '10px 14px',
            fontSize: '0.8125rem', color: '#dc2626',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1, padding: '12px 0',
              borderRadius: 12, border: 'none',
              background: saving ? 'var(--brume)' : 'var(--menthe)',
              color: saving ? 'var(--muted)' : '#fff',
              fontSize: '0.875rem', fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'opacity 150ms',
            }}
            onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLElement).style.opacity = '0.88' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
          >
            {saving ? (
              <>
                <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.15)', borderTopColor: 'var(--muted)', animation: 'spin .7s linear infinite', display: 'inline-block' }} />
                Saving...
              </>
            ) : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '12px 20px',
              borderRadius: 12,
              border: '1.5px solid var(--border)',
              background: 'transparent',
              color: 'var(--text)',
              fontSize: '0.875rem', fontWeight: 600,
              cursor: 'pointer',
              transition: 'border-color 150ms',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--menthe)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
          >
            Cancel
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   SHARED STYLES
   ───────────────────────────────────────────────────────────── */
const labelStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 4,
  fontSize: '0.6875rem', fontWeight: 700,
  letterSpacing: '0.1em', textTransform: 'uppercase',
  color: 'var(--text)',
  marginBottom: 8,
}

const inputBaseStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--surface)',
  border: '1.5px solid var(--border)',
  borderRadius: 10,
  padding: '11px 14px',
  fontFamily: 'var(--font-sans)',
  fontSize: '0.875rem',
  color: 'var(--text)',
  outline: 'none',
  transition: 'border-color 150ms',
  boxSizing: 'border-box',
}

const errorTextStyle: React.CSSProperties = {
  marginTop: 4, fontSize: '0.75rem', color: '#ef4444',
}
