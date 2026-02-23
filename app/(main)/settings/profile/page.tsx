'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Profile } from '@/types'

type FormState = { username: string; display_name: string; bio: string }
type FieldErrors = Partial<Record<keyof FormState, string>>

// ── Small helpers ──────────────────────────────────────────────────────────────

function SectionLabel({
  children,
  htmlFor,
  counter,
  icon,
  required,
}: {
  children: React.ReactNode
  htmlFor?: string
  counter?: string
  icon?: React.ReactNode
  required?: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <label
        htmlFor={htmlFor}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: '0.6875rem', fontWeight: 700,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--text)',
        }}
      >
        {icon && <span style={{ color: 'var(--menthe)', display: 'flex' }}>{icon}</span>}
        {children}
        {required && <span style={{ color: 'var(--menthe)', marginLeft: 1 }}>*</span>}
      </label>
      {counter && (
        <span style={{ fontSize: '0.75rem', color: 'var(--muted-light)', fontVariantNumeric: 'tabular-nums' }}>
          {counter}
        </span>
      )}
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p style={{ marginTop: 6, fontSize: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {message}
    </p>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--surface)',
  border: '1.5px solid var(--border)',
  borderRadius: 12,
  padding: '13px 16px',
  fontFamily: 'var(--font-sans)',
  fontSize: '0.9rem',
  color: 'var(--text)',
  outline: 'none',
  transition: 'border-color 150ms, box-shadow 150ms',
  boxSizing: 'border-box' as const,
}

function StyledInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      {...props}
      style={{
        ...inputStyle,
        borderColor: focused ? 'var(--menthe)' : 'var(--border)',
        boxShadow: focused ? 'var(--shadow-glow)' : 'none',
        background: focused ? '#fff' : 'var(--surface)',
        ...props.style,
      }}
      onFocus={e => { setFocused(true); props.onFocus?.(e) }}
      onBlur={e => { setFocused(false); props.onBlur?.(e) }}
    />
  )
}

function StyledTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <textarea
      {...props}
      style={{
        ...inputStyle,
        resize: 'none' as const,
        lineHeight: 1.6,
        borderColor: focused ? 'var(--menthe)' : 'var(--border)',
        boxShadow: focused ? 'var(--shadow-glow)' : 'none',
        background: focused ? '#fff' : 'var(--surface)',
        ...props.style,
      }}
      onFocus={e => { setFocused(true); props.onFocus?.(e) }}
      onBlur={e => { setFocused(false); props.onBlur?.(e) }}
    />
  )
}

// ── Crop Modal ─────────────────────────────────────────────────────────────────

const D = 300  // display canvas px
const O = 256  // output image px

function CropModal({
  file,
  onApply,
  onCancel,
  uploading,
}: {
  file: File
  onApply: (blob: Blob) => Promise<void>
  onCancel: () => void
  uploading: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const zoomRef = useRef(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const panRef = useRef({ x: 0, y: 0 })
  const dragRef = useRef<{ sx: number; sy: number; spx: number; spy: number } | null>(null)

  const draw = useCallback((z: number, p: { x: number; y: number }) => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, D, D)

    const base = Math.min(D / img.width, D / img.height)
    const scale = base * z
    const w = img.width * scale
    const h = img.height * scale
    const x = D / 2 - w / 2 + p.x
    const y = D / 2 - h / 2 + p.y
    ctx.drawImage(img, x, y, w, h)

    ctx.fillStyle = 'rgba(0,0,0,0.58)'
    ctx.beginPath()
    ctx.rect(0, 0, D, D)
    ctx.arc(D / 2, D / 2, D / 2 - 3, 0, Math.PI * 2, true)
    ctx.fill('evenodd')

    ctx.strokeStyle = '#35C8B4'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(D / 2, D / 2, D / 2 - 3, 0, Math.PI * 2)
    ctx.stroke()
  }, [])

  useEffect(() => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      draw(1, { x: 0, y: 0 })
    }
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [file, draw])

  useEffect(() => { draw(zoom, pan) }, [zoom, pan, draw])

  function onWheel(e: React.WheelEvent) {
    e.preventDefault()
    const z = Math.min(5, Math.max(0.3, zoomRef.current - e.deltaY * 0.002))
    zoomRef.current = z
    setZoom(z)
  }

  function onMouseDown(e: React.MouseEvent) {
    dragRef.current = { sx: e.clientX, sy: e.clientY, spx: panRef.current.x, spy: panRef.current.y }
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragRef.current) return
    const p = { x: dragRef.current.spx + e.clientX - dragRef.current.sx, y: dragRef.current.spy + e.clientY - dragRef.current.sy }
    panRef.current = p
    setPan(p)
  }
  function onMouseUp() { dragRef.current = null }

  function handleApply() {
    const img = imgRef.current
    if (!img) return
    const base = Math.min(D / img.width, D / img.height)
    const scale = base * zoom
    const w = img.width * scale
    const h = img.height * scale
    const imgX = D / 2 - w / 2 + pan.x
    const imgY = D / 2 - h / 2 + pan.y
    const factor = O / (D - 6)

    const out = document.createElement('canvas')
    out.width = O; out.height = O
    const ctx = out.getContext('2d')!
    ctx.beginPath()
    ctx.arc(O / 2, O / 2, O / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(img, (imgX - 3) * factor, (imgY - 3) * factor, w * factor, h * factor)
    out.toBlob(blob => { if (blob) onApply(blob) }, 'image/jpeg', 0.92)
  }

  return (
    <div
      className="modal-backdrop"
      style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="modal-panel" style={{ background: '#fff', borderRadius: 24, padding: '28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Crop your photo</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--muted-light)', margin: 0 }}>Drag to reposition · scroll or slide to zoom</p>
        </div>

        <canvas
          ref={canvasRef}
          width={D}
          height={D}
          style={{ borderRadius: '50%', cursor: dragRef.current ? 'grabbing' : 'grab', touchAction: 'none', display: 'block' }}
          onWheel={onWheel}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        />

        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1rem', color: 'var(--muted-light)', lineHeight: 1, userSelect: 'none' }}>–</span>
          <input
            type="range" min={0.3} max={5} step={0.01} value={zoom}
            onChange={e => { const z = parseFloat(e.target.value); zoomRef.current = z; setZoom(z) }}
            style={{ flex: 1, accentColor: 'var(--menthe)' }}
          />
          <span style={{ fontSize: '1rem', color: 'var(--muted-light)', lineHeight: 1, userSelect: 'none' }}>+</span>
        </div>

        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
          <button
            onClick={onCancel}
            disabled={uploading}
            className="btn btn-ghost"
            style={{ flex: 1, padding: '13px', borderRadius: 16, fontSize: '0.875rem', fontWeight: 600 }}
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={uploading}
            className="btn btn-primary"
            style={{ flex: 1, padding: '13px', borderRadius: 16, fontSize: '0.875rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {uploading
              ? <><span className="spinner" style={{ width: 14, height: 14 }} />Uploading…</>
              : 'Apply'
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function SettingsProfilePage() {
  const router = useRouter()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [form, setForm] = useState<FormState>({ username: '', display_name: '', bio: '' })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [cropFile, setCropFile] = useState<File | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // ── Load profile ───────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const res = await fetch('/api/profile')
      if (res.status === 401) { router.push('/login?next=/settings/profile'); return }
      if (!res.ok) { setSubmitError('Could not load your profile. Please refresh.'); setLoading(false); return }
      const { profile: p } = await res.json() as { profile: Profile }
      setProfile(p)
      setForm({ username: p.username, display_name: p.display_name ?? '', bio: p.bio ?? '' })
      setAvatarPreview(p.avatar_url ?? null)
      setLoading(false)
    }
    load()
  }, [router])

  // ── Validation ─────────────────────────────────────────────────────────────
  function validateForm(): FieldErrors {
    const errors: FieldErrors = {}
    const u = form.username.trim()
    if (!u) errors.username = 'Username is required.'
    else if (u.length < 2) errors.username = 'Username must be at least 2 characters.'
    else if (u.length > 30) errors.username = 'Username must be 30 characters or fewer.'
    else if (!/^[a-z0-9_]+$/.test(u)) errors.username = 'Only lowercase letters, numbers, and underscores are allowed.'
    if (form.display_name.length > 60) errors.display_name = 'Display name must be 60 characters or fewer.'
    if (form.bio.length > 300) errors.bio = 'Bio must be 300 characters or fewer.'
    return errors
  }

  function setField<K extends keyof FormState>(key: K, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
    setFieldErrors(prev => ({ ...prev, [key]: undefined }))
    setSuccessMessage(null)
    setSubmitError(null)
  }

  // ── Save text fields ───────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null); setSuccessMessage(null)
    const errors = validateForm()
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return }
    setSubmitting(true)
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: form.username.trim(), display_name: form.display_name.trim(), bio: form.bio.trim() }),
    })
    const json = await res.json()
    if (!res.ok) {
      const msg: string = json.error ?? 'Something went wrong.'
      if (msg.toLowerCase().includes('username')) setFieldErrors({ username: msg })
      else setSubmitError(msg)
      setSubmitting(false)
      return
    }
    const p: Profile = json.profile
    setProfile(p)
    setForm({ username: p.username, display_name: p.display_name ?? '', bio: p.bio ?? '' })
    setSuccessMessage('Profile updated successfully.')
    setSubmitting(false)
  }

  // ── Avatar upload ──────────────────────────────────────────────────────────
  async function handleAvatarApply(blob: Blob) {
    setAvatarUploading(true)
    const fd = new FormData()
    fd.append('avatar', new File([blob], 'avatar.jpg', { type: 'image/jpeg' }))
    const res = await fetch('/api/profile/avatar', { method: 'POST', body: fd })
    const json = await res.json()
    if (res.ok) {
      setProfile(json.profile)
      setAvatarPreview(json.profile.avatar_url)
    } else {
      setSubmitError(json.error ?? 'Avatar upload failed.')
    }
    setCropFile(null)
    setAvatarUploading(false)
  }

  const isDirty =
    profile !== null &&
    (form.username !== profile.username ||
      form.display_name !== (profile.display_name ?? '') ||
      form.bio !== (profile.bio ?? ''))

  const displayLabel = form.display_name.trim() || form.username
  const initial = displayLabel.charAt(0).toUpperCase()

  // ── Loading spinner ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <span className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-sans)' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 28px 80px' }}>

        {/* Back link */}
        <Link href="/" className="back-btn" style={{ marginBottom: 28 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          Back to feed
        </Link>

        {/* Page header */}
        <div style={{ marginBottom: 36 }}>
          <h1 style={{
            fontSize: 'clamp(2rem, 4vw, 2.75rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            color: 'var(--text)',
            margin: '0 0 12px',
          }}>
            Edit your{' '}
            <em style={{ color: 'var(--menthe)', fontStyle: 'italic' }}>profile.</em>
          </h1>
          <p style={{ fontSize: '1rem', color: 'var(--muted)', margin: 0, lineHeight: 1.55 }}>
            Update how you appear to others on PinDev.
          </p>
        </div>

        {/* Avatar card */}
        {profile && (
          <div style={{
            marginBottom: 36,
            borderRadius: 20,
            background: 'linear-gradient(135deg, var(--menthe-light) 0%, var(--brume) 100%)',
            border: '1.5px solid var(--brume)',
            padding: '28px 28px',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
          }}>
            {/* Clickable avatar */}
            <div style={{ position: 'relative', flexShrink: 0, width: 88, height: 88 }} className="group">
              <div style={{
                width: '100%', height: '100%', borderRadius: '50%',
                background: 'var(--menthe)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.75rem', fontWeight: 700, color: '#fff',
                overflow: 'hidden',
                border: '3px solid #fff',
                boxShadow: '0 4px 16px rgb(53 200 180 / .25)',
              }}>
                {avatarPreview
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : initial
                }
              </div>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="avatar-overlay"
                style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: 0, transition: 'opacity 150ms',
                  cursor: 'pointer', border: 'none',
                }}
                title="Change photo"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </button>
              {avatarUploading && (
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="spinner" style={{ width: 20, height: 20, borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} />
                </div>
              )}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) setCropFile(f); e.target.value = '' }}
              />
            </div>

            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 800, color: 'var(--text)', fontSize: '1.125rem', margin: '0 0 2px', letterSpacing: '-0.01em' }}>
                {profile.display_name || profile.username}
              </p>
              <p style={{ fontSize: '0.875rem', color: 'var(--menthe)', fontWeight: 600, margin: '0 0 8px' }}>
                @{profile.username}
              </p>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: '0.75rem', fontWeight: 600,
                  color: 'var(--muted)',
                  background: 'rgba(255,255,255,0.7)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '5px 12px',
                  cursor: 'pointer',
                  transition: 'all 150ms',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--menthe)'; (e.currentTarget as HTMLElement).style.color = 'var(--menthe)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--muted)' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                Change photo
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 28 }} noValidate>

          {/* Display name */}
          <div>
            <SectionLabel
              htmlFor="display-name"
              counter={`${form.display_name.length}/60`}
              icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              }
            >
              Display name
            </SectionLabel>
            <StyledInput
              id="display-name"
              type="text"
              value={form.display_name}
              onChange={e => setField('display_name', e.target.value)}
              placeholder="Your full name or nickname"
              maxLength={60}
            />
            <p style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--muted-light)' }}>
              This is the name shown on your pins and profile. It can be anything.
            </p>
            <FieldError message={fieldErrors.display_name} />
          </div>

          {/* Username */}
          <div>
            <SectionLabel
              htmlFor="username"
              counter={`${form.username.length}/30`}
              required
              icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/>
                </svg>
              }
            >
              Username
            </SectionLabel>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--muted-light)', fontSize: '0.9rem', fontWeight: 600,
                pointerEvents: 'none',
              }}>@</span>
              <StyledInput
                id="username"
                type="text"
                value={form.username}
                onChange={e => setField('username', e.target.value.toLowerCase())}
                placeholder="your_username"
                minLength={2}
                maxLength={30}
                required
                style={{ paddingLeft: 36 }}
              />
            </div>
            <p style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--muted-light)' }}>
              Lowercase letters, numbers, and underscores only. Your public URL:{' '}
              <span style={{ color: 'var(--menthe)', fontWeight: 600 }}>
                pindev.app/profile/{form.username || 'username'}
              </span>
            </p>
            <FieldError message={fieldErrors.username} />
          </div>

          {/* Bio */}
          <div>
            <SectionLabel
              htmlFor="bio"
              counter={`${form.bio.length}/300`}
              icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                </svg>
              }
            >
              Bio
            </SectionLabel>
            <StyledTextarea
              id="bio"
              value={form.bio}
              onChange={e => setField('bio', e.target.value)}
              placeholder="Tell the world what you build..."
              maxLength={300}
              rows={4}
            />
            <FieldError message={fieldErrors.bio} />
          </div>

          {/* Error / success feedback */}
          {submitError && (
            <div style={{
              borderRadius: 14, border: '1px solid #fecaca',
              background: '#fef2f2', padding: '14px 18px',
              fontSize: '0.875rem', color: '#dc2626',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {submitError}
            </div>
          )}
          {successMessage && (
            <div style={{
              borderRadius: 14, border: '1.5px solid var(--verveine)',
              background: 'var(--limonade)', padding: '14px 18px',
              fontSize: '0.875rem', color: 'var(--text)',
              display: 'flex', alignItems: 'center', gap: 10,
              fontWeight: 600,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--verveine)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {successMessage}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginTop: 8 }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                padding: '18px',
                borderRadius: 18,
                border: 'none',
                background: submitting ? 'var(--menthe)' : 'linear-gradient(135deg, var(--menthe) 0%, #2ec4b0 100%)',
                color: '#fff',
                fontSize: '1.0625rem',
                fontWeight: 800,
                letterSpacing: '-0.01em',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.75 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                boxShadow: '0 4px 24px rgb(53 200 180 / .35)',
                transition: 'opacity 150ms, box-shadow 150ms',
              }}
              onMouseEnter={e => { if (!submitting) (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgb(53 200 180 / .45)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgb(53 200 180 / .35)' }}
            >
              {submitting ? (
                <>
                  <span className="spinner" style={{ width: 18, height: 18, borderColor: 'rgba(255,255,255,.4)', borderTopColor: '#fff' }} />
                  Saving…
                </>
              ) : (
                <>
                  Save changes
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                  </svg>
                </>
              )}
            </button>

            {profile && (
              <Link
                href={`/profile/${profile.username}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: '0.8125rem', fontWeight: 600,
                  color: 'var(--muted)',
                  transition: 'color 150ms',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--menthe)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted)' }}
              >
                View your profile
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </Link>
            )}
          </div>

        </form>
      </div>

      {/* Crop modal */}
      {cropFile && (
        <CropModal
          file={cropFile}
          onApply={handleAvatarApply}
          onCancel={() => setCropFile(null)}
          uploading={avatarUploading}
        />
      )}

      {/* Avatar overlay hover */}
      <style>{`
        .avatar-overlay:hover { opacity: 1 !important; }
        .group:hover .avatar-overlay { opacity: 1 !important; }
      `}</style>
    </main>
  )
}
