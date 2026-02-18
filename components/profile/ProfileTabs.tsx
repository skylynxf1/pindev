'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Pin, Board } from '@/types'

type Tab = 'pins' | 'boards'

interface ProfileTabsProps {
  pins: Pin[]
  boards: Board[]
}

function PinGrid({ pins }: { pins: Pin[] }) {
  if (pins.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#C2F2E4]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#35C8B4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
        <p className="text-base font-semibold text-[#0F1720]">No pins yet</p>
        <p className="mt-1 text-sm text-[#5B6B73]">Projects shared here will appear on this profile.</p>
      </div>
    )
  }

  return (
    <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3">
      {pins.map((pin) => (
        <div key={pin.id} className="mb-3 break-inside-avoid">
          <Link href={`/pin/${pin.id}`} scroll={false}>
            <div className="group relative overflow-hidden rounded-2xl border border-[#E6ECEA] bg-white shadow-sm hover:shadow-md transition-shadow">
              <Image
                src={pin.thumbnail_url}
                alt={pin.title || 'Project preview'}
                width={400}
                height={300}
                className="w-full h-auto object-cover"
                unoptimized
              />
              {pin.media_type === 'video' && (
                <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                  VIDEO
                </span>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-2xl" />
            </div>
            {pin.title && (
              <p className="mt-1.5 px-1 text-xs font-medium text-[#0F1720] truncate">{pin.title}</p>
            )}
          </Link>
        </div>
      ))}
    </div>
  )
}

function BoardGrid({ boards }: { boards: Board[] }) {
  if (boards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#C2F2E4]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#35C8B4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <p className="text-base font-semibold text-[#0F1720]">No public boards</p>
        <p className="mt-1 text-sm text-[#5B6B73]">Public boards created by this user will appear here.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {boards.map((board) => (
        <Link key={board.id} href={`/boards/${board.id}`}>
          <div className="group rounded-2xl border border-[#E6ECEA] bg-white p-4 hover:border-[#35C8B4] hover:shadow-md transition-all">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#C2F2E4] group-hover:bg-[#35C8B4]/20 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#35C8B4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-sm font-bold text-[#0F1720] truncate group-hover:text-[#35C8B4] transition-colors">
              {board.name}
            </p>
            {board.description && (
              <p className="mt-1 text-xs text-[#5B6B73] line-clamp-2">{board.description}</p>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}

export default function ProfileTabs({ pins, boards }: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('pins')

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'pins', label: 'Pins', count: pins.length },
    { id: 'boards', label: 'Boards', count: boards.length },
  ]

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-[#E6ECEA] mb-7">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors
              ${activeTab === tab.id
                ? 'text-[#0F1720]'
                : 'text-[#5B6B73] hover:text-[#0F1720]'
              }`}
          >
            {tab.label}
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold transition-colors
              ${activeTab === tab.id
                ? 'bg-[#C2F2E4] text-[#35C8B4]'
                : 'bg-[#f4f4f4] text-[#5B6B73]'
              }`}
            >
              {tab.count}
            </span>
            {/* Active underline */}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#35C8B4]" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'pins'   && <PinGrid   pins={pins} />}
      {activeTab === 'boards' && <BoardGrid boards={boards} />}
    </div>
  )
}