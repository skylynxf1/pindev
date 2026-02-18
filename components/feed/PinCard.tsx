'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { Pin } from '@/types'

interface PinCardProps {
  pin: Pin
  onSave: (pin: Pin) => void
}

export default function PinCard({ pin, onSave }: PinCardProps) {
  return (
    <div className="group relative rounded-2xl overflow-hidden border border-[#E6ECEA] bg-white transition-shadow hover:shadow-md">

      {/* Thumbnail */}
      <Link href={`/pin/${pin.id}`} className="block relative">
        <div className="relative w-full bg-[#C2F2E4]/20" style={{ minHeight: '180px' }}>
          <Image
            src={pin.thumbnail_url}
            alt={pin.title || 'Project preview'}
            width={400}
            height={300}
            className="w-full h-auto object-cover"
            unoptimized
          />
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />

        {/* Save button — visible on hover */}
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onSave(pin)
          }}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-2xl bg-[#A4CF4A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#35C8B4]"
        >
          Save
        </button>
      </Link>

      {/* Card body */}
      <div className="p-3">
        {pin.title && (
          <Link href={`/pin/${pin.id}`}>
            <p className="text-sm font-semibold text-[#0F1720] line-clamp-2 hover:text-[#35C8B4] transition-colors">
              {pin.title}
            </p>
          </Link>
        )}

        <div className="mt-2 flex items-center justify-between gap-2">
          {/* Author */}
          {pin.profile && (
            <Link
              href={`/profile/${pin.profile.username}`}
              className="flex items-center gap-1.5 min-w-0 group/author"
            >
              <div className="h-5 w-5 rounded-full bg-[#C2F2E4] flex items-center justify-center text-[10px] font-bold text-[#35C8B4] flex-shrink-0 overflow-hidden">
                {pin.profile.avatar_url ? (
                  <Image
                    src={pin.profile.avatar_url}
                    alt={pin.profile.display_name || pin.profile.username}
                    width={20}
                    height={20}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  (pin.profile.display_name || pin.profile.username).charAt(0).toUpperCase()
                )}
              </div>
              <span className="text-xs text-[#5B6B73] group-hover/author:text-[#35C8B4] transition-colors truncate">
                {pin.profile.display_name || pin.profile.username}
              </span>
            </Link>
          )}

          {/* Live link */}
          <a
            href={pin.live_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0 inline-flex items-center gap-1 text-xs text-[#35C8B4] hover:underline"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Live
          </a>
        </div>
      </div>
    </div>
  )
}
