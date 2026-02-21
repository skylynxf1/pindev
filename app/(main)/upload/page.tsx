'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  validateMediaFile,
  validateThumbnailFile,
  isVideoType,
} from '@/lib/validators/pin'
import { checkVideoDuration, captureVideoThumbnail, formatBytes } from '@/lib/utils/media'

/* ─────────────────────────────────────────────────────────────
   SMALL HELPERS
   ───────────────────────────────────────────────────────────── */
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

function FieldError({ message }: { message: string | null }) {
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
  boxSizing: 'border-box',
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
        resize: 'none',
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

/* ─────────────────────────────────────────────────────────────
   VIDEO EDITOR
   ───────────────────────────────────────────────────────────── */

const ASPECT_RATIOS = [
  { label: 'Original', value: 'original' },
  { label: '16 : 9',   value: '16:9' },
  { label: '4 : 3',    value: '4:3' },
  { label: '1 : 1',    value: '1:1' },
  { label: '9 : 16',   value: '9:16' },
] as const
type AR = typeof ASPECT_RATIOS[number]['value']

function fmtTime(s: number) {
  const m = Math.floor(s / 60)
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

function VideoEditorPanel({
  file,
  onApply,
  onCancel,
}: {
  file: File
  onApply: (blob: Blob, thumb: Blob | null) => void
  onCancel: () => void
}) {
  const [dur, setDur] = useState(0)
  const [t0, setT0] = useState(0)
  const [t1, setT1] = useState(0)
  const [ar, setAr] = useState<AR>('original')
  const [processing, setProcessing] = useState(false)
  const [pct, setPct] = useState(0)
  const previewRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    if (previewRef.current) previewRef.current.src = url
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.onloadedmetadata = () => {
      const d = isFinite(v.duration) ? v.duration : 0
      setDur(d); setT0(0); setT1(d)
    }
    v.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    if (previewRef.current && dur > 0) previewRef.current.currentTime = t0
  }, [t0, dur])

  const trimSec = Math.max(0, t1 - t0)
  const estMB = (file.size * (dur > 0 ? trimSec / dur : 1)) / 1024 / 1024
  const overLimit = estMB > 50

  async function apply() {
    setProcessing(true); setPct(0)
    try {
      const blob = await processVideoClip(file, t0, t1, ar, (elapsed) =>
        setPct(Math.min(99, Math.round((elapsed / trimSec) * 100)))
      )
      if (blob.size > 50 * 1024 * 1024) {
        alert(`Processed video is ${formatBytes(blob.size)}, over the 50 MB limit. Trim more or reduce crop.`)
        setProcessing(false); return
      }
      const thumb = await captureFrameAt(file, t0)
      onApply(blob, thumb)
    } catch {
      alert('Processing failed. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div style={{ marginTop: 16, borderRadius: 16, border: '1.5px solid var(--menthe)', background: 'var(--surface)', overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', background: 'var(--menthe-light, #e6f9f6)', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--menthe)' }}>
        ✂ Trim &amp; Crop
      </div>

      <div style={{ background: '#000' }}>
        <video ref={previewRef} muted playsInline style={{ display: 'block', width: '100%', maxHeight: 200, objectFit: 'contain' }} />
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Trim */}
        <div>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text)', marginBottom: 8 }}>Trim</div>
          {([
            { label: 'Start', val: t0, onChange: (v: number) => setT0(Math.min(v, t1 - 0.5)), min: 0,  max: dur },
            { label: 'End',   val: t1, onChange: (v: number) => setT1(Math.max(v, t0 + 0.5)), min: 0,  max: dur },
          ] as Array<{ label: string; val: number; onChange: (v: number) => void; min: number; max: number }>).map(({ label, val, onChange, min, max }) => (
            <div key={label} style={{ display: 'grid', gridTemplateColumns: '44px 1fr 46px', gap: 8, alignItems: 'center', marginBottom: 5 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{label}</span>
              <input type="range" min={min} max={max} step={0.1} value={val}
                onChange={e => onChange(Number(e.target.value))}
                style={{ accentColor: 'var(--menthe)', width: '100%' }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--text)', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{fmtTime(val)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginTop: 4 }}>
            <span style={{ color: 'var(--muted)' }}>Duration: <strong>{fmtTime(trimSec)}</strong></span>
            <span style={{ color: overLimit ? '#ef4444' : 'var(--muted)', fontWeight: overLimit ? 600 : 400 }}>
              ~{estMB.toFixed(1)} MB{overLimit ? ' — exceeds 50 MB limit' : ''}
            </span>
          </div>
        </div>

        {/* Crop */}
        <div>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text)', marginBottom: 8 }}>Crop</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ASPECT_RATIOS.map(({ label, value }) => (
              <button key={value} type="button" onClick={() => setAr(value)} style={{
                padding: '5px 12px', borderRadius: 8,
                border: `1.5px solid ${ar === value ? 'var(--menthe)' : 'var(--border)'}`,
                background: ar === value ? 'var(--menthe)' : 'var(--surface)',
                color: ar === value ? '#fff' : 'var(--text)',
                fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 100ms',
              }}>{label}</button>
            ))}
          </div>
        </div>

        {/* Progress */}
        {processing && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 5 }}>
              <span>Processing…</span><span>{pct}%</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--menthe)', transition: 'width 150ms' }} />
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={apply} disabled={processing || trimSec <= 0} style={{
            flex: 1, padding: '10px', borderRadius: 10, border: 'none',
            background: 'var(--menthe)', color: '#fff', fontWeight: 700, fontSize: '0.875rem',
            cursor: processing ? 'not-allowed' : 'pointer', opacity: processing ? 0.7 : 1,
          }}>
            {processing ? 'Processing…' : 'Apply'}
          </button>
          <button type="button" onClick={onCancel} disabled={processing} style={{
            flex: 1, padding: '10px', borderRadius: 10,
            border: '1.5px solid var(--border)', background: 'var(--surface)',
            color: 'var(--text)', fontWeight: 600, fontSize: '0.875rem',
            cursor: processing ? 'not-allowed' : 'pointer',
          }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

async function processVideoClip(
  file: File,
  t0: number,
  t1: number,
  ar: AR,
  onProgress: (elapsed: number) => void,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true

    video.onloadedmetadata = () => {
      const vW = video.videoWidth || 1280
      const vH = video.videoHeight || 720
      let srcX = 0, srcY = 0, srcW = vW, srcH = vH, outW = vW, outH = vH

      if (ar !== 'original') {
        const [rw, rh] = ar.split(':').map(Number)
        const tAR = rw / rh, vAR = vW / vH
        if (vAR > tAR) {
          srcH = vH; srcW = Math.round(vH * tAR); srcX = Math.round((vW - srcW) / 2); srcY = 0
        } else {
          srcW = vW; srcH = Math.round(vW / tAR); srcX = 0; srcY = Math.round((vH - srcH) / 2)
        }
        outW = Math.min(srcW, 1280); outH = Math.round(outW / tAR)
      }

      const canvas = document.createElement('canvas')
      canvas.width = outW; canvas.height = outH
      const ctx = canvas.getContext('2d')
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('No canvas context')); return }

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9' : 'video/webm'
      const recorder = new MediaRecorder(canvas.captureStream(30), { mimeType, videoBitsPerSecond: 2_500_000 })
      const chunks: Blob[] = []
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
      recorder.onstop = () => { URL.revokeObjectURL(url); resolve(new Blob(chunks, { type: 'video/webm' })) }

      let started = false
      function startRecording() {
        if (started) return; started = true
        recorder.start(200)
        video.play().catch(reject)
        let rafId: number
        function draw() {
          if (video.currentTime >= t1 || video.ended) {
            cancelAnimationFrame(rafId); video.pause(); recorder.stop(); return
          }
          onProgress(video.currentTime - t0)
          ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, outW, outH)
          rafId = requestAnimationFrame(draw)
        }
        draw()
      }

      video.addEventListener('seeked', startRecording, { once: true })
      video.currentTime = t0 > 0.05 ? t0 : 0.05
      // Fallback if seeked doesn't fire (seeking to near t=0)
      setTimeout(startRecording, 600)
    }

    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Video load failed')) }
    video.src = url
    video.load()
  })
}

async function captureFrameAt(file: File, time: number): Promise<Blob | null> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'; video.muted = true; video.playsInline = true
    video.onloadedmetadata = () => { video.currentTime = Math.min(time > 0 ? time : 0.05, video.duration - 0.01) }
    video.onseeked = () => {
      try {
        const c = document.createElement('canvas')
        c.width = video.videoWidth || 1280; c.height = video.videoHeight || 720
        const ctx = c.getContext('2d')
        if (!ctx) { URL.revokeObjectURL(url); resolve(null); return }
        ctx.drawImage(video, 0, 0, c.width, c.height)
        c.toBlob(blob => { URL.revokeObjectURL(url); resolve(blob) }, 'image/jpeg', 0.85)
      } catch { URL.revokeObjectURL(url); resolve(null) }
    }
    video.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    video.src = url
  })
}

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
   ───────────────────────────────────────────────────────────── */
export default function UploadPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit') // pin ID when editing existing pin

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [liveUrl, setLiveUrl] = useState('')
  const [repoUrl, setRepoUrl] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [agreedToRules, setAgreedToRules] = useState(false)

  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [existingMediaUrl, setExistingMediaUrl] = useState<string | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [isVideo, setIsVideo] = useState(false)
  const [thumbGenerated, setThumbGenerated] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [showVideoEditor, setShowVideoEditor] = useState(false)

  const [mediaDragOver, setMediaDragOver] = useState(false)
  const [thumbDragOver, setThumbDragOver] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const mediaInputRef = useRef<HTMLInputElement>(null)
  const thumbInputRef = useRef<HTMLInputElement>(null)

  // Load existing pin data when editing
  useEffect(() => {
    if (!editId) return
    setEditLoading(true)
    const supabase = createClient()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: pin } = await supabase
        .from('pins')
        .select('id, title, description, live_url, repo_url, thumbnail_url, media_url, media_type, owner_id, pin_tags(tags(name))')
        .eq('id', editId)
        .single()

      if (!pin || pin.owner_id !== user.id) { router.push('/'); return }

      setTitle(pin.title || '')
      setDescription(pin.description || '')
      setLiveUrl(pin.live_url || '')
      setRepoUrl(pin.repo_url || '')
      setIsVideo(pin.media_type === 'video')
      const imgUrl = pin.thumbnail_url || pin.media_url
      setExistingMediaUrl(imgUrl)
      setMediaPreview(imgUrl)
      setAgreedToRules(true)

      // Restore category tag selections
      const CATEGORY_IDS = ['website', 'app', 'ai-tool', 'vibecoding']
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tagNames = (pin.pin_tags ?? []).map((pt: any) => pt.tags?.name).filter(Boolean) as string[]
      setSelectedTags(tagNames.filter(t => CATEGORY_IDS.includes(t)))

      setEditLoading(false)
    })()
  }, [editId, router])

  const handleMediaFile = useCallback(async (file: File) => {
    const err = validateMediaFile(file)
    if (err) { setFieldErrors(p => ({ ...p, media: err })); return }
    setFieldErrors(p => ({ ...p, media: '', durationWarning: '' }))
    const video = isVideoType(file.type)
    setIsVideo(video)
    setMediaFile(file)
    setMediaPreview(URL.createObjectURL(file))
    setThumbnailFile(null); setThumbnailPreview(null); setThumbGenerated(false); setShowVideoEditor(false)
    if (video) {
      const warning = await checkVideoDuration(file)
      if (warning) setFieldErrors(p => ({ ...p, durationWarning: warning }))
      const blob = await captureVideoThumbnail(file)
      if (blob) {
        const autoThumb = new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' })
        setThumbnailFile(autoThumb)
        setThumbnailPreview(URL.createObjectURL(blob))
        setThumbGenerated(true)
      }
    }
  }, [])

  const handleMediaDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault(); setMediaDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) await handleMediaFile(file)
  }, [handleMediaFile])

  const handleThumbnailFile = useCallback((file: File) => {
    const err = validateThumbnailFile(file)
    if (err) { setFieldErrors(p => ({ ...p, thumbnail: err })); return }
    setFieldErrors(p => ({ ...p, thumbnail: '' }))
    setThumbnailFile(file)
    setThumbnailPreview(URL.createObjectURL(file))
    setThumbGenerated(false)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSubmitError(null)
    const errors: Record<string, string> = {}
    // In edit mode, existing media is kept if no new file is selected
    if (!mediaFile && !existingMediaUrl) errors.media = 'Please upload a media file.'
    if (isVideo && !thumbnailFile && !existingMediaUrl) errors.thumbnail = 'Please provide a thumbnail.'
    if (!editId && !agreedToRules) errors.rules = 'You must agree to the content rules.'
    if (Object.keys(errors).length > 0) { setFieldErrors(p => ({ ...p, ...errors })); return }
    setSubmitting(true)
    const body = new FormData()
    if (mediaFile) {
      body.append('media', mediaFile)
      if (thumbnailFile) body.append('thumbnail', thumbnailFile)
    }
    body.append('title', title)
    body.append('description', description)
    body.append('live_url', liveUrl)
    body.append('repo_url', repoUrl)
    body.append('tags', selectedTags.join(','))
    if (!editId) body.append('agreed_to_rules', String(agreedToRules))
    const url = editId ? `/api/pins/${editId}` : '/api/pins'
    const method = editId ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, body })
    const json = await res.json()
    if (!res.ok) { setSubmitError(json.error ?? 'Something went wrong.'); setSubmitting(false); return }
    router.push(`/pin/${editId ?? json.id}`)
  }

  const CONTENT_RULES = [
    'No NSFW or adult content.',
    'No malware, phishing, or deceptive projects.',
    'Only share projects you have the right to share.',
    'Title and description must accurately represent the project.',
  ]

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-sans)' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 28px 80px' }}>

        {/* Back link */}
        {editLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, color: 'var(--muted)', fontSize: '0.9rem' }}>
            <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2.5px solid var(--border)', borderTopColor: 'var(--menthe)', animation: 'spin .7s linear infinite', display: 'inline-block' }} />
            Loading pin…
          </div>
        )}

        <Link href={editId ? `/pin/${editId}` : '/'} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: '0.875rem', color: 'var(--muted)', textDecoration: 'none',
          marginBottom: 28, transition: 'color 150ms',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--menthe)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          {editId ? 'Back to pin' : 'Back to feed'}
        </Link>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36 }}>
          <div>
            <h1 style={{
              fontSize: 'clamp(2rem, 4vw, 2.75rem)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              color: 'var(--text)',
              margin: '0 0 12px',
            }}>
              {editId ? 'Edit your ' : 'Share your '}{' '}
              <em style={{ color: 'var(--menthe)', fontStyle: 'italic' }}>{editId ? 'pin.' : 'vision.'}</em>
            </h1>
            <p style={{ fontSize: '1rem', color: 'var(--muted)', margin: 0, lineHeight: 1.55 }}>
              {editId ? 'Update your pin details below. Your existing media is kept unless you upload a new one.' : 'Pin a live web, mobile app, or AI project to the PinDev community.'}
            </p>
          </div>

          {/* Premium badge */}
          <button style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 18px',
            borderRadius: 9999,
            border: '1.5px solid var(--verveine)',
            background: 'var(--limonade)',
            color: 'var(--verveine-dark)',
            fontSize: '0.8125rem', fontWeight: 700,
            cursor: 'pointer', flexShrink: 0, marginLeft: 24,
            transition: 'all 150ms',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--verveine)'; (e.currentTarget as HTMLElement).style.color = '#fff' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--limonade)'; (e.currentTarget as HTMLElement).style.color = 'var(--verveine-dark)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            Premium Builder
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* ── PROJECT MEDIA ── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={{
                fontSize: '0.6875rem', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 4,
              }}>
                Project Media
                <span style={{ color: 'var(--menthe)' }}>*</span>
              </label>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted-light)' }}>
                JPG, PNG, WebP up to 50MB
              </span>
            </div>

            {/* Drop zone */}
            <div
              onClick={() => (existingMediaUrl || !mediaPreview) && mediaInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setMediaDragOver(true) }}
              onDragLeave={() => setMediaDragOver(false)}
              onDrop={handleMediaDrop}
              style={{
                position: 'relative',
                borderRadius: 20,
                border: `2px dashed ${mediaDragOver ? 'var(--menthe)' : 'var(--border)'}`,
                background: mediaDragOver ? 'var(--menthe-light)' : mediaPreview ? 'var(--surface)' : '#fafbfa',
                minHeight: mediaPreview ? 'auto' : 300,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: mediaPreview ? 'default' : 'pointer',
                transition: 'border-color 150ms, background 150ms',
                overflow: 'hidden',
              }}
            >
              {mediaPreview ? (
                <div style={{ position: 'relative', width: '100%' }}>
                  {isVideo ? (
                    <video src={mediaPreview} muted playsInline controls style={{ width: '100%', maxHeight: 320, borderRadius: 18, objectFit: 'contain', background: '#000' }} />
                  ) : (
                    <Image src={mediaPreview} alt="Preview" width={800} height={500} style={{ width: '100%', maxHeight: 320, borderRadius: 18, objectFit: 'contain' }} unoptimized />
                  )}
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation()
                      setMediaFile(null); setMediaPreview(null); setExistingMediaUrl(null)
                      setThumbnailFile(null); setThumbnailPreview(null); setIsVideo(false)
                    }}
                    style={{
                      position: 'absolute', top: 10, right: 10,
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'rgba(0,0,0,0.6)', border: 'none',
                      color: '#fff', cursor: 'pointer', opacity: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'opacity 150ms',
                    }}
                    className="remove-btn"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                  {mediaFile ? (
                    <p style={{ padding: '8px 16px', fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'center' }}>
                      {mediaFile.name} — {formatBytes(mediaFile.size)}
                    </p>
                  ) : existingMediaUrl ? (
                    <p style={{ padding: '8px 16px', fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'center' }}>
                      Existing image · click to replace
                    </p>
                  ) : null}
                  {isVideo && mediaFile && (
                    <div style={{ padding: '0 16px 12px', display: 'flex', justifyContent: 'center' }}>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setShowVideoEditor(v => !v) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '7px 18px', borderRadius: 9999,
                          border: '1.5px solid var(--menthe)',
                          background: showVideoEditor ? 'var(--menthe)' : 'var(--menthe-light, #e6f9f6)',
                          color: showVideoEditor ? '#fff' : 'var(--menthe)',
                          fontSize: '0.8125rem', fontWeight: 700,
                          cursor: 'pointer', transition: 'all 120ms',
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
                          <line x1="20" y1="4" x2="8.12" y2="15.88"/>
                          <line x1="14.47" y1="14.48" x2="20" y2="20"/>
                          <line x1="8.12" y1="8.12" x2="12" y2="12"/>
                        </svg>
                        {showVideoEditor ? 'Close editor' : 'Trim & Crop'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '60px 40px', textAlign: 'center' }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: 'var(--brume)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--menthe)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontSize: '1.0625rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 4px', letterSpacing: '-0.01em' }}>
                      Drop your masterpiece here
                    </p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: 0 }}>
                      or click to browse your files
                    </p>
                  </div>
                </div>
              )}
              <input
                ref={mediaInputRef}
                id="media-input"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.mp4,.webm,image/jpeg,image/png,image/webp,video/mp4,video/webm"
                style={{ display: 'none' }}
                onChange={async e => {
                  const file = e.target.files?.[0]
                  if (file) await handleMediaFile(file)
                  e.target.value = ''
                }}
              />
            </div>
            {showVideoEditor && mediaFile && isVideo && (
              <VideoEditorPanel
                file={mediaFile}
                onApply={(blob, thumb) => {
                  const ext = blob.type.includes('webm') ? 'webm' : 'mp4'
                  const processed = new File([blob], `edited.${ext}`, { type: blob.type })
                  setMediaFile(processed)
                  setMediaPreview(URL.createObjectURL(blob))
                  if (thumb) {
                    setThumbnailFile(new File([thumb], 'thumbnail.jpg', { type: 'image/jpeg' }))
                    setThumbnailPreview(URL.createObjectURL(thumb))
                    setThumbGenerated(true)
                  }
                  setShowVideoEditor(false)
                }}
                onCancel={() => setShowVideoEditor(false)}
              />
            )}
            <FieldError message={fieldErrors.media ?? null} />
            {fieldErrors.durationWarning && (
              <p style={{ marginTop: 6, fontSize: '0.75rem', color: '#d97706' }}>⚠ {fieldErrors.durationWarning}</p>
            )}
          </div>

          {/* ── Thumbnail (video only) ── */}
          {isVideo && (
            <div>
              <SectionLabel htmlFor="thumb-input" required>Thumbnail</SectionLabel>
              <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginBottom: 10 }}>
                {thumbGenerated ? 'Auto-generated from your video. Replace if preferred.' : 'Required for video pins. JPG, PNG, or WebP · max 5 MB.'}
              </p>
              <div
                onClick={() => thumbInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setThumbDragOver(true) }}
                onDragLeave={() => setThumbDragOver(false)}
                onDrop={e => { e.preventDefault(); setThumbDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleThumbnailFile(f) }}
                style={{
                  borderRadius: 16, border: `2px dashed ${thumbDragOver ? 'var(--menthe)' : 'var(--border)'}`,
                  background: thumbDragOver ? 'var(--menthe-light)' : '#fafbfa',
                  minHeight: 140, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', overflow: 'hidden', transition: 'all 150ms',
                }}
              >
                {thumbnailPreview ? (
                  <div style={{ width: '100%', position: 'relative' }}>
                    <Image src={thumbnailPreview} alt="Thumbnail" width={600} height={400} style={{ width: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: 14 }} unoptimized />
                    <p style={{ padding: '6px 12px', fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'center' }}>
                      {thumbGenerated ? 'Auto-generated · click to replace' : thumbnailFile?.name}
                    </p>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.875rem', color: 'var(--muted)', padding: '32px 20px' }}>Drop thumbnail or click to browse</p>
                )}
                <input ref={thumbInputRef} id="thumb-input" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleThumbnailFile(f); e.target.value = '' }}
                />
              </div>
              <FieldError message={fieldErrors.thumbnail ?? null} />
            </div>
          )}

          {/* ── Title + Live URL row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

            {/* Title */}
            <div>
              <SectionLabel htmlFor="title" required counter={`${title.length}/120`}>
                Project Title
              </SectionLabel>
              <StyledInput
                id="title"
                type="text"
                placeholder="My awesome AI project"
                value={title}
                maxLength={120}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Live URL */}
            <div>
              <SectionLabel
                htmlFor="live-url"
                required
                icon={
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="2" y1="12" x2="22" y2="12"/>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                  </svg>
                }
              >
                Live URL
              </SectionLabel>
              <StyledInput
                id="live-url"
                type="url"
                placeholder="https://myproject.vercel.app"
                value={liveUrl}
                onChange={e => setLiveUrl(e.target.value)}
                required
              />
            </div>
          </div>

          {/* ── Description + Repo/Tags row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

            {/* Description */}
            <div>
              <SectionLabel htmlFor="description" counter={`${description.length}/2000`}>
                Description
              </SectionLabel>
              <StyledTextarea
                id="description"
                placeholder="What does it do? What stack did you use? Tell the community the 'vibe' of your code..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={2000}
                rows={7}
                style={{ height: 'auto' }}
              />
            </div>

            {/* Repo URL + Tags stacked */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Repo URL */}
              <div>
                <SectionLabel
                  htmlFor="repo-url"
                  icon={
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
                    </svg>
                  }
                >
                  Repository URL
                </SectionLabel>
                <StyledInput
                  id="repo-url"
                  type="url"
                  placeholder="https://github.com/you/repo (optional)"
                  value={repoUrl}
                  onChange={e => setRepoUrl(e.target.value)}
                />
              </div>

              {/* Tags */}
              <div>
                <SectionLabel
                  icon={
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                      <line x1="7" y1="7" x2="7.01" y2="7"/>
                    </svg>
                  }
                >
                  Category
                </SectionLabel>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: '0 0 10px' }}>
                  Select up to 4 that apply
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {([
                    { id: 'website',    label: 'Websites',    icon: <><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></> },
                    { id: 'app',        label: 'Apps',        icon: <><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></> },
                    { id: 'ai-tool',    label: 'AI Tools',    icon: <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></> },
                    { id: 'vibecoding', label: 'VibeCoding',  icon: <><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></> },
                  ] as Array<{ id: string; label: string; icon: React.ReactNode }>).map(({ id, label, icon }) => {
                    const active = selectedTags.includes(id)
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setSelectedTags(prev =>
                            prev.includes(id)
                              ? prev.filter(t => t !== id)
                              : prev.length < 4 ? [...prev, id] : prev
                          )
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '11px 14px',
                          borderRadius: 12,
                          border: `1.5px solid ${active ? 'var(--menthe)' : 'var(--border)'}`,
                          background: active ? 'var(--menthe-light)' : 'var(--surface)',
                          color: active ? 'var(--menthe)' : 'var(--text)',
                          fontSize: '0.875rem', fontWeight: active ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 150ms',
                          textAlign: 'left',
                          width: '100%',
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          {icon}
                        </svg>
                        {label}
                        {active && (
                          <svg style={{ marginLeft: 'auto' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ── Content Rules (hidden in edit mode — already agreed) ── */}
          {!editId && <div style={{
            borderRadius: 20,
            background: 'linear-gradient(135deg, var(--menthe-light) 0%, var(--brume) 100%)',
            border: '1.5px solid var(--brume)',
            padding: '28px 32px',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'var(--brume)',
                border: '2px solid var(--menthe)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--menthe)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text)' }}>
                Content Rules
              </span>
            </div>

            {/* Rules grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 32px', marginBottom: 24 }}>
              {CONTENT_RULES.map(rule => (
                <div key={rule} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ color: 'var(--menthe)', fontSize: '0.75rem', marginTop: 2, flexShrink: 0 }}>✦</span>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-2)', lineHeight: 1.5 }}>{rule}</span>
                </div>
              ))}
            </div>

            {/* Agreement checkbox */}
            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: 14,
              cursor: 'pointer',
              padding: '4px 0',
            }}>
              <div
                style={{
                  width: 24, height: 24, borderRadius: '50%',
                  border: `2px solid ${agreedToRules ? 'var(--menthe)' : 'var(--border)'}`,
                  background: agreedToRules ? 'var(--menthe)' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, marginTop: 1,
                  transition: 'all 150ms',
                  boxShadow: agreedToRules ? '0 2px 8px rgb(53 200 180 / .3)' : 'none',
                }}
              >
                {agreedToRules && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </div>
              <input
                type="checkbox"
                checked={agreedToRules}
                onChange={e => { setAgreedToRules(e.target.checked); if (e.target.checked) setFieldErrors(p => ({ ...p, rules: '' })) }}
                style={{ display: 'none' }}
              />
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.5 }}>
                I confirm this project follows Pindev&rsquo;s content rules and I have the rights to share it.
              </span>
            </label>
            <FieldError message={fieldErrors.rules ?? null} />
          </div>}

          {/* Submit error */}
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

          {/* ── Publish button ── */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                padding: '20px',
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
                  <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,.4)', borderTopColor: '#fff', animation: 'spin .7s linear infinite', display: 'inline-block' }} />
                  Uploading…
                </>
              ) : (
                <>
                  {editId ? 'Save changes' : 'Publish your project'}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                  </svg>
                </>
              )}
            </button>

            <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              Need help? Check out our{' '}
              <a href="#" style={{ color: 'var(--menthe)', fontWeight: 600, textDecoration: 'none' }}>Submission Guide</a>
            </p>
          </div>

        </form>
      </div>

      {/* Hover reveal for remove button on media */}
      <style>{`
        .remove-btn { opacity: 0 !important; }
        div:hover > div > .remove-btn { opacity: 1 !important; }
      `}</style>
    </main>
  )
}
