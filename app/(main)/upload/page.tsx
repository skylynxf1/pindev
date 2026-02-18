'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  validateMediaFile,
  validateThumbnailFile,
  isVideoType,
} from '@/lib/validators/pin'
import { checkVideoDuration, captureVideoThumbnail, formatBytes } from '@/lib/utils/media'

// ── tiny inline components ────────────────────────────────────────────────────

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-semibold text-[#5B6B73] uppercase tracking-wide mb-1">
      {children}
    </label>
  )
}

function FieldError({ message }: { message: string | null }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-red-500">{message}</p>
}

function TextInput({
  id,
  type = 'text',
  placeholder,
  value,
  onChange,
  required,
}: {
  id: string
  type?: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
  required?: boolean
}) {
  return (
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className="w-full rounded-2xl border border-[#E6ECEA] bg-white px-4 py-3 text-sm text-[#0F1720] placeholder:text-[#5B6B73] outline-none focus:border-[#35C8B4] focus:ring-2 focus:ring-[#35C8B4]/20 transition"
    />
  )
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const router = useRouter()

  // form fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [liveUrl, setLiveUrl] = useState('')
  const [repoUrl, setRepoUrl] = useState('')
  const [tagsRaw, setTagsRaw] = useState('')
  const [agreedToRules, setAgreedToRules] = useState(false)

  // files
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [isVideo, setIsVideo] = useState(false)
  const [thumbGenerated, setThumbGenerated] = useState(false)

  // ui state
  const [mediaDragOver, setMediaDragOver] = useState(false)
  const [thumbDragOver, setThumbDragOver] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const mediaInputRef = useRef<HTMLInputElement>(null)
  const thumbInputRef = useRef<HTMLInputElement>(null)

  // ── media handler ───────────────────────────────────────────────────────────

  const handleMediaFile = useCallback(async (file: File) => {
    const err = validateMediaFile(file)
    if (err) {
      setFieldErrors((prev) => ({ ...prev, media: err }))
      return
    }
    setFieldErrors((prev) => ({ ...prev, media: '', durationWarning: '' }))

    const video = isVideoType(file.type)
    setIsVideo(video)
    setMediaFile(file)
    setMediaPreview(URL.createObjectURL(file))
    setThumbnailFile(null)
    setThumbnailPreview(null)
    setThumbGenerated(false)

    if (video) {
      // Best-effort duration check
      const warning = await checkVideoDuration(file)
      if (warning) {
        setFieldErrors((prev) => ({ ...prev, durationWarning: warning }))
      }

      // Auto-generate thumbnail
      const blob = await captureVideoThumbnail(file)
      if (blob) {
        const autoThumb = new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' })
        setThumbnailFile(autoThumb)
        setThumbnailPreview(URL.createObjectURL(blob))
        setThumbGenerated(true)
      }
    }
  }, [])

  const handleMediaDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setMediaDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) await handleMediaFile(file)
    },
    [handleMediaFile]
  )

  // ── thumbnail handler ───────────────────────────────────────────────────────

  const handleThumbnailFile = useCallback((file: File) => {
    const err = validateThumbnailFile(file)
    if (err) {
      setFieldErrors((prev) => ({ ...prev, thumbnail: err }))
      return
    }
    setFieldErrors((prev) => ({ ...prev, thumbnail: '' }))
    setThumbnailFile(file)
    setThumbnailPreview(URL.createObjectURL(file))
    setThumbGenerated(false)
  }, [])

  // ── submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    // client-side guards
    const errors: Record<string, string> = {}
    if (!mediaFile) errors.media = 'Please upload a media file.'
    if (isVideo && !thumbnailFile) errors.thumbnail = 'Please provide a thumbnail.'
    if (!agreedToRules) errors.rules = 'You must agree to the content rules.'
    if (Object.keys(errors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...errors }))
      return
    }

    setSubmitting(true)

    const body = new FormData()
    body.append('media', mediaFile!)
    if (thumbnailFile) body.append('thumbnail', thumbnailFile)
    body.append('title', title)
    body.append('description', description)
    body.append('live_url', liveUrl)
    body.append('repo_url', repoUrl)
    body.append('tags', tagsRaw)
    body.append('agreed_to_rules', String(agreedToRules))

    const res = await fetch('/api/pins', { method: 'POST', body })
    const json = await res.json()

    if (!res.ok) {
      setSubmitError(json.error ?? 'Something went wrong. Please try again.')
      setSubmitting(false)
      return
    }

    router.push(`/pin/${json.id}`)
  }

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-10 sm:py-16">

        <h1 className="text-2xl font-bold text-[#0F1720] mb-2">Share a project</h1>
        <p className="text-sm text-[#5B6B73] mb-8">
          Pin a live web or AI project to the PinDev feed.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-7">

          {/* ── Media upload ── */}
          <div>
            <FieldLabel htmlFor="media-input">Project media *</FieldLabel>
            <div
              className={`relative flex flex-col items-center justify-center w-full rounded-2xl border-2 border-dashed transition-colors cursor-pointer
                ${mediaDragOver ? 'border-[#35C8B4] bg-[#C2F2E4]/20' : 'border-[#E6ECEA] bg-[#f9fafb] hover:border-[#35C8B4]'}
                ${mediaPreview ? 'p-0 overflow-hidden' : 'p-10'}`}
              onDragOver={(e) => { e.preventDefault(); setMediaDragOver(true) }}
              onDragLeave={() => setMediaDragOver(false)}
              onDrop={handleMediaDrop}
              onClick={() => !mediaPreview && mediaInputRef.current?.click()}
            >
              {mediaPreview ? (
                <div className="relative w-full group">
                  {isVideo ? (
                    <video src={mediaPreview} muted playsInline controls className="w-full max-h-72 rounded-2xl object-contain bg-black" />
                  ) : (
                    <Image src={mediaPreview} alt="Preview" width={800} height={500} className="w-full max-h-72 rounded-2xl object-contain" unoptimized />
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setMediaFile(null)
                      setMediaPreview(null)
                      setThumbnailFile(null)
                      setThumbnailPreview(null)
                      setIsVideo(false)
                    }}
                    className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition opacity-0 group-hover:opacity-100"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                  </button>
                  {mediaFile && (
                    <p className="px-3 py-1.5 text-xs text-[#5B6B73] text-center">
                      {mediaFile.name} — {formatBytes(mediaFile.size)}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#C2F2E4]">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#35C8B4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="3" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-[#0F1720]">Drop file or click to browse</p>
                  <p className="mt-1 text-xs text-[#5B6B73]">JPG, PNG, WebP, MP4, WebM · max 50 MB</p>
                </>
              )}
              <input
                ref={mediaInputRef}
                id="media-input"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.mp4,.webm,image/jpeg,image/png,image/webp,video/mp4,video/webm"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (file) await handleMediaFile(file)
                  e.target.value = ''
                }}
              />
            </div>
            <FieldError message={fieldErrors.media ?? null} />
            {fieldErrors.durationWarning && (
              <p className="mt-1 text-xs text-amber-600">⚠ {fieldErrors.durationWarning}</p>
            )}
          </div>

          {/* ── Thumbnail (video only) ── */}
          {isVideo && (
            <div>
              <FieldLabel htmlFor="thumb-input">Thumbnail *</FieldLabel>
              <p className="text-xs text-[#5B6B73] mb-2">
                {thumbGenerated
                  ? 'Auto-generated from your video. Replace it if you prefer a different frame.'
                  : 'Required for video pins. JPG, PNG, or WebP · max 5 MB.'}
              </p>
              <div
                className={`relative flex flex-col items-center justify-center w-full rounded-2xl border-2 border-dashed transition-colors cursor-pointer
                  ${thumbDragOver ? 'border-[#35C8B4] bg-[#C2F2E4]/20' : 'border-[#E6ECEA] bg-[#f9fafb] hover:border-[#35C8B4]'}
                  ${thumbnailPreview ? 'p-0 overflow-hidden' : 'p-8'}`}
                onDragOver={(e) => { e.preventDefault(); setThumbDragOver(true) }}
                onDragLeave={() => setThumbDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setThumbDragOver(false)
                  const file = e.dataTransfer.files[0]
                  if (file) handleThumbnailFile(file)
                }}
                onClick={() => thumbInputRef.current?.click()}
              >
                {thumbnailPreview ? (
                  <div className="relative w-full group">
                    <Image src={thumbnailPreview} alt="Thumbnail preview" width={600} height={400} className="w-full max-h-48 rounded-2xl object-contain" unoptimized />
                    <p className="px-3 py-1.5 text-xs text-[#5B6B73] text-center">
                      {thumbGenerated ? 'Auto-generated · click to replace' : thumbnailFile?.name}
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-[#0F1720]">Drop thumbnail or click to browse</p>
                  </>
                )}
                <input
                  ref={thumbInputRef}
                  id="thumb-input"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleThumbnailFile(file)
                    e.target.value = ''
                  }}
                />
              </div>
              <FieldError message={fieldErrors.thumbnail ?? null} />
            </div>
          )}

          {/* ── Title ── */}
          <div>
            <FieldLabel htmlFor="title">Title *</FieldLabel>
            <TextInput id="title" value={title} onChange={setTitle} placeholder="My awesome AI project" required />
            <p className="mt-1 text-xs text-[#5B6B73] text-right">{title.length}/120</p>
          </div>

          {/* ── Description ── */}
          <div>
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does it do? What stack did you use?"
              rows={4}
              maxLength={2000}
              className="w-full rounded-2xl border border-[#E6ECEA] bg-white px-4 py-3 text-sm text-[#0F1720] placeholder:text-[#5B6B73] outline-none focus:border-[#35C8B4] focus:ring-2 focus:ring-[#35C8B4]/20 transition resize-none"
            />
            <p className="mt-1 text-xs text-[#5B6B73] text-right">{description.length}/2000</p>
          </div>

          {/* ── Live URL ── */}
          <div>
            <FieldLabel htmlFor="live-url">Live URL *</FieldLabel>
            <TextInput id="live-url" type="url" value={liveUrl} onChange={setLiveUrl} placeholder="https://myproject.vercel.app" required />
          </div>

          {/* ── Repo URL ── */}
          <div>
            <FieldLabel htmlFor="repo-url">Repository URL</FieldLabel>
            <TextInput id="repo-url" type="url" value={repoUrl} onChange={setRepoUrl} placeholder="https://github.com/you/repo (optional)" />
          </div>

          {/* ── Tags ── */}
          <div>
            <FieldLabel htmlFor="tags">Tags</FieldLabel>
            <TextInput id="tags" value={tagsRaw} onChange={setTagsRaw} placeholder="nextjs, ai, tailwind (comma-separated, max 10)" />
            <p className="mt-1 text-xs text-[#5B6B73]">Lowercase letters, numbers, and hyphens only.</p>
          </div>

          {/* ── Content rules ── */}
          <div className="rounded-2xl border border-[#E6ECEA] bg-[#f9fafb] p-5">
            <p className="text-sm font-semibold text-[#0F1720] mb-3">Content rules</p>
            <ul className="text-xs text-[#5B6B73] space-y-1.5 mb-4 list-none">
              {[
                'No NSFW or adult content.',
                'No malware, phishing, or deceptive projects.',
                'Only share projects you have the right to share.',
                'Title and description must accurately represent the project.',
              ].map((rule) => (
                <li key={rule} className="flex items-start gap-2">
                  <span className="mt-0.5 flex-shrink-0 text-[#35C8B4]">✦</span>
                  {rule}
                </li>
              ))}
            </ul>
            <label className="flex items-start gap-3 cursor-pointer">
              <div className="relative mt-0.5 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={agreedToRules}
                  onChange={(e) => {
                    setAgreedToRules(e.target.checked)
                    if (e.target.checked) setFieldErrors((prev) => ({ ...prev, rules: '' }))
                  }}
                  className="sr-only peer"
                />
                <div className="h-5 w-5 rounded-md border-2 border-[#E6ECEA] bg-white peer-checked:bg-[#35C8B4] peer-checked:border-[#35C8B4] transition-colors flex items-center justify-center">
                  {agreedToRules && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-xs text-[#5B6B73]">
                I confirm this project follows PinDev's content rules and I have the rights to share it.
              </span>
            </label>
            <FieldError message={fieldErrors.rules ?? null} />
          </div>

          {/* ── Submit error ── */}
          {submitError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
              {submitError}
            </div>
          )}

          {/* ── Submit ── */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-[#35C8B4] py-3.5 text-sm font-bold text-white hover:bg-[#2db5a3] disabled:opacity-60 transition-colors"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Uploading…
              </span>
            ) : (
              'Publish pin'
            )}
          </button>
        </form>
      </div>
    </main>
  )
}