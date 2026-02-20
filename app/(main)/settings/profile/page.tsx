'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/types'

type FormState = { username: string; display_name: string; bio: string }
type FieldErrors = Partial<Record<keyof FormState, string>>

// ── Small helpers ──────────────────────────────────────────────────────────────

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-xs font-semibold text-[#5B6B73] uppercase tracking-widest"
    >
      {children}
    </label>
  )
}
function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-red-500">{message}</p>
}
function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-xs text-[#8A9BA8]">{children}</p>
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

    // Dark overlay with circular hole (even-odd fill)
    ctx.fillStyle = 'rgba(0,0,0,0.58)'
    ctx.beginPath()
    ctx.rect(0, 0, D, D)
    ctx.arc(D / 2, D / 2, D / 2 - 3, 0, Math.PI * 2, true)
    ctx.fill('evenodd')

    // Teal ring
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
      style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div style={{ background: '#fff', borderRadius: 24, padding: '28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0F1720', margin: '0 0 4px' }}>Crop your photo</h2>
          <p style={{ fontSize: '0.8125rem', color: '#8A9BA8', margin: 0 }}>Drag to reposition · scroll or slide to zoom</p>
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

        {/* Zoom slider */}
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1rem', color: '#8A9BA8', lineHeight: 1, userSelect: 'none' }}>–</span>
          <input
            type="range" min={0.3} max={5} step={0.01} value={zoom}
            onChange={e => { const z = parseFloat(e.target.value); zoomRef.current = z; setZoom(z) }}
            style={{ flex: 1, accentColor: '#35C8B4' }}
          />
          <span style={{ fontSize: '1rem', color: '#8A9BA8', lineHeight: 1, userSelect: 'none' }}>+</span>
        </div>

        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
          <button
            onClick={onCancel}
            disabled={uploading}
            style={{ flex: 1, padding: '13px', borderRadius: 16, border: '1.5px solid #E6ECEA', background: '#fff', fontSize: '0.875rem', fontWeight: 600, color: '#0F1720', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={uploading}
            style={{ flex: 1, padding: '13px', borderRadius: 16, border: 'none', background: '#35C8B4', fontSize: '0.875rem', fontWeight: 700, color: '#fff', cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {uploading
              ? <><span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', animation: 'spin .7s linear infinite', display: 'inline-block' }} />Uploading…</>
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
      <div className="flex min-h-screen items-center justify-center bg-white">
        <span className="h-8 w-8 rounded-full border-4 border-[#C2F2E4] border-t-[#35C8B4] animate-spin" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-[600px] mx-auto px-6 py-10 sm:py-14">

        {/* Back link */}
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[#5B6B73] hover:text-[#0F1720] mb-8 transition-colors"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to feed
        </a>

        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-[2rem] font-black text-[#0F1720] leading-tight">Edit profile</h1>
          <p className="mt-1 text-sm text-[#5B6B73]">Update how you appear to others on PinDev.</p>
        </div>

        {/* Avatar card */}
        {profile && (
          <div className="mb-10 rounded-2xl bg-[#EEF8F5] p-5 flex items-center gap-4">
            {/* Clickable avatar */}
            <div className="relative flex-shrink-0 group" style={{ width: 76, height: 76 }}>
              <div className="w-full h-full rounded-full bg-[#35C8B4] flex items-center justify-center text-2xl font-bold text-white overflow-hidden select-none">
                {avatarPreview
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  : initial
                }
              </div>
              {/* Camera overlay on hover */}
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-0"
                title="Change photo"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </button>
              {avatarUploading && (
                <div className="absolute inset-0 rounded-full bg-black/55 flex items-center justify-center">
                  <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                </div>
              )}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) setCropFile(f); e.target.value = '' }}
              />
            </div>

            <div>
              <p className="font-bold text-[#0F1720] text-base">{profile.display_name || profile.username}</p>
              <p className="text-sm text-[#35C8B4] mt-0.5">@{profile.username}</p>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="mt-1.5 flex items-center gap-1.5 text-xs text-[#5B6B73] hover:text-[#35C8B4] transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                Click avatar to change photo
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col" noValidate>

          {/* Display name */}
          <div className="py-5 border-b border-[#F0F0F0]">
            <div className="flex items-center justify-between mb-3">
              <FieldLabel htmlFor="display-name">Display name</FieldLabel>
              <span className="text-xs text-[#9AABB5]">{form.display_name.length}/60</span>
            </div>
            <input
              id="display-name"
              type="text"
              value={form.display_name}
              onChange={e => setField('display_name', e.target.value)}
              placeholder="Your full name or nickname"
              maxLength={60}
              className="w-full bg-transparent text-[#0F1720] font-semibold text-base placeholder:text-[#C5D0D5] outline-none border-none focus:outline-none"
            />
            <FieldHint>This is the name shown on your pins and profile. It can be anything.</FieldHint>
            <FieldError message={fieldErrors.display_name} />
          </div>

          {/* Username */}
          <div className="py-5 border-b border-[#F0F0F0]">
            <div className="flex items-center justify-between mb-3">
              <FieldLabel htmlFor="username">Username *</FieldLabel>
              <span className="text-xs text-[#9AABB5]">{form.username.length}/30</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[#9AABB5] text-base font-semibold select-none">@</span>
              <input
                id="username"
                type="text"
                value={form.username}
                onChange={e => setField('username', e.target.value.toLowerCase())}
                placeholder="your_username"
                minLength={2}
                maxLength={30}
                required
                className={`flex-1 bg-transparent text-[#0F1720] font-semibold text-base placeholder:text-[#C5D0D5] outline-none border-none focus:outline-none ${fieldErrors.username ? 'text-red-500' : ''}`}
              />
            </div>
            <FieldHint>
              Lowercase letters, numbers, and underscores only. This becomes your public URL:{' '}
              <span className="text-[#35C8B4] font-semibold">
                pindev.app/profile/{form.username || 'username'}
              </span>
            </FieldHint>
            <FieldError message={fieldErrors.username} />
          </div>

          {/* Bio */}
          <div className="py-5 border-b border-[#F0F0F0]">
            <div className="flex items-center justify-between mb-3">
              <FieldLabel htmlFor="bio">Bio</FieldLabel>
              <span className="text-xs text-[#9AABB5]">{form.bio.length}/300</span>
            </div>
            <textarea
              id="bio"
              value={form.bio}
              onChange={e => setField('bio', e.target.value)}
              placeholder="Tell the world what you build…"
              maxLength={300}
              rows={4}
              className="w-full bg-transparent text-[#0F1720] text-base placeholder:text-[#C5D0D5] outline-none border-none focus:outline-none resize-none leading-relaxed"
            />
            <FieldError message={fieldErrors.bio} />
          </div>

          {/* Error / success feedback */}
          {submitError && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
              {submitError}
            </div>
          )}
          {successMessage && (
            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-[#A4CF4A] bg-[#EDF7BE] px-5 py-4 text-sm text-[#0F1720]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A4CF4A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {successMessage}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 mt-10">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-2xl bg-[#35C8B4] py-4 text-base font-bold text-white hover:bg-[#2db5a3] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {submitting
                ? <><span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />Saving…</>
                : <>Save changes <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg></>
              }
            </button>
            {profile && (
              <a
                href={`/profile/${profile.username}`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F1720] hover:text-[#35C8B4] transition-colors whitespace-nowrap"
              >
                View profile
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
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

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </main>
  )
}
