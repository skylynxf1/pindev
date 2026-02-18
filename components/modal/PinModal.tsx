'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import ModalRoot from './ModalRoot'
import { usePin } from '@/lib/hooks/usePin'

interface PinModalProps {
  pinId: string
}

export default function PinModal({ pinId }: PinModalProps) {
  const router = useRouter()
  const { pin, loading, error } = usePin(pinId)

  function handleClose() {
    router.back()
  }

  return (
    <ModalRoot onClose={handleClose}>
      <div className="relative w-full max-w-4xl rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col md:flex-row">

        {/* ── Close button ── */}
        <button
          onClick={handleClose}
          aria-label="Close"
          className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow hover:bg-[#EDF7BE] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F1720" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        {/* ────────────────────────────────────────────
            Loading state
        ──────────────────────────────────────────── */}
        {loading && (
          <div className="flex w-full items-center justify-center py-32">
            <span className="h-8 w-8 rounded-full border-4 border-[#C2F2E4] border-t-[#35C8B4] animate-spin" />
          </div>
        )}

        {/* ────────────────────────────────────────────
            Error state
        ──────────────────────────────────────────── */}
        {!loading && error && (
          <div className="flex w-full flex-col items-center justify-center gap-3 py-32 px-8 text-center">
            <p className="text-base font-semibold text-[#0F1720]">Pin not found</p>
            <p className="text-sm text-[#5B6B73]">{error}</p>
            <button
              onClick={handleClose}
              className="mt-2 rounded-2xl bg-[#35C8B4] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#2db5a3] transition-colors"
            >
              Go back
            </button>
          </div>
        )}

        {/* ────────────────────────────────────────────
            Pin content
        ──────────────────────────────────────────── */}
        {!loading && pin && (
          <>
            {/* Left — media */}
            <div className="flex-shrink-0 w-full md:w-[52%] bg-[#C2F2E4]/20 flex items-center justify-center overflow-hidden rounded-t-3xl md:rounded-l-3xl md:rounded-tr-none min-h-[260px]">
              {pin.media_type === 'video' ? (
                <video
                  src={pin.media_url}
                  poster={pin.thumbnail_url}
                  controls
                  playsInline
                  className="w-full h-full object-contain max-h-[70vh]"
                />
              ) : (
                <Image
                  src={pin.thumbnail_url}
                  alt={pin.title || 'Project preview'}
                  width={900}
                  height={700}
                  className="w-full h-auto object-contain max-h-[70vh]"
                  unoptimized
                />
              )}
            </div>

            {/* Right — details */}
            <div className="flex flex-col flex-1 overflow-y-auto p-7 gap-5 max-h-[80vh]">

              {/* Action row */}
              <div className="flex items-center gap-2 pt-2">
                <a
                  href={pin.live_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[#35C8B4] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2db5a3] transition-colors"
                >
                  Visit Live
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
                {pin.repo_url && (
                  <a
                    href={pin.repo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-2xl border border-[#E6ECEA] bg-white px-4 py-2.5 text-sm font-semibold text-[#0F1720] hover:bg-[#EDF7BE] transition-colors"
                  >
                    Repo
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                    </svg>
                  </a>
                )}
                <button
                  className="flex items-center justify-center gap-2 rounded-2xl bg-[#A4CF4A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#35C8B4] transition-colors"
                >
                  Save
                </button>
              </div>

              {/* Title */}
              {pin.title && (
                <h1 className="text-xl font-bold text-[#0F1720] leading-snug">
                  {pin.title}
                </h1>
              )}

              {/* Description */}
              {pin.description && (
                <p className="text-sm text-[#5B6B73] leading-relaxed whitespace-pre-wrap">
                  {pin.description}
                </p>
              )}

              {/* Tags */}
              {pin.tags && pin.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {pin.tags.map((tag) => (
                    <Link
                      key={tag.id}
                      href={`/search?tag=${encodeURIComponent(tag.name)}`}
                      className="rounded-full border border-[#E6ECEA] bg-[#C2F2E4]/40 px-3 py-1 text-xs font-medium text-[#0F1720] hover:bg-[#EDF7BE] transition-colors"
                    >
                      #{tag.name}
                    </Link>
                  ))}
                </div>
              )}

              {/* Author */}
              {pin.profile && (
                <Link
                  href={`/profile/${pin.profile.username}`}
                  onClick={handleClose}
                  className="mt-auto flex items-center gap-3 rounded-2xl border border-[#E6ECEA] p-3 hover:bg-[#EDF7BE]/50 transition-colors"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#C2F2E4] text-sm font-bold text-[#35C8B4] flex-shrink-0 overflow-hidden">
                    {pin.profile.avatar_url ? (
                      <Image
                        src={pin.profile.avatar_url}
                        alt={pin.profile.display_name || pin.profile.username}
                        width={36}
                        height={36}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      (pin.profile.display_name || pin.profile.username).charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#0F1720] truncate">
                      {pin.profile.display_name || pin.profile.username}
                    </p>
                    <p className="text-xs text-[#5B6B73] truncate">@{pin.profile.username}</p>
                  </div>
                </Link>
              )}

              {/* Permalink */}
              <Link
                href={`/pin/${pin.id}`}
                className="text-xs text-[#5B6B73] hover:text-[#35C8B4] transition-colors text-center"
              >
                Open full page →
              </Link>
            </div>
          </>
        )}
      </div>
    </ModalRoot>
  )
}