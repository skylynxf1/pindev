import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { Pin, Board, Profile } from '@/types'

interface Props {
  params: Promise<{ username: string }>
}

// ── Data fetchers ─────────────────────────────────────────────────────────────

async function getProfile(username: string): Promise<Profile | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, bio, avatar_url, created_at, updated_at')
    .eq('username', username)
    .single()

  if (error || !data) return null
  return data as Profile
}

async function getProfilePins(ownerId: string): Promise<Pin[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pins')
    .select(`
      id, owner_id, title, description, live_url, repo_url,
      media_url, media_type, thumbnail_url, is_published,
      created_at, updated_at,
      pin_tags ( tags ( id, name ) )
    `)
    .eq('owner_id', ownerId)
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error || !data) return []

  return data.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    owner_id: row.owner_id as string,
    title: row.title as string,
    description: row.description as string,
    live_url: row.live_url as string,
    repo_url: row.repo_url as string | null,
    media_url: row.media_url as string,
    media_type: row.media_type as 'image' | 'video',
    thumbnail_url: row.thumbnail_url as string,
    is_published: row.is_published as boolean,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    tags: Array.isArray(row.pin_tags)
      ? (row.pin_tags as Array<{ tags: { id: string; name: string } }>)
          .map((pt) => pt.tags)
          .filter(Boolean)
      : [],
  })) as Pin[]
}

async function getPublicBoards(ownerId: string): Promise<Board[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('boards')
    .select('id, owner_id, name, description, is_private, created_at, updated_at')
    .eq('owner_id', ownerId)
    .eq('is_private', false)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data as Board[]
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const profile = await getProfile(username)

  if (!profile) return { title: 'User not found · PinDev' }

  const name = profile.display_name || profile.username

  return {
    title: `${name} (@${profile.username}) · PinDev`,
    description:
      profile.bio ||
      `Check out ${name}'s projects on PinDev.`,
    openGraph: {
      title: `${name} on PinDev`,
      description: profile.bio || '',
      images: profile.avatar_url ? [{ url: profile.avatar_url }] : [],
    },
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PinGrid({ pins }: { pins: Pin[] }) {
  if (pins.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#C2F2E4]">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#35C8B4"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
        <p className="text-base font-semibold text-[#0F1720]">No pins yet</p>
        <p className="mt-1 text-sm text-[#5B6B73]">
          Projects shared here will appear on this profile.
        </p>
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
              <p className="mt-1.5 px-1 text-xs font-medium text-[#0F1720] truncate">
                {pin.title}
              </p>
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
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#35C8B4"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <p className="text-base font-semibold text-[#0F1720]">No public boards</p>
        <p className="mt-1 text-sm text-[#5B6B73]">
          Public boards created by this user will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {boards.map((board) => (
        <Link key={board.id} href={`/boards/${board.id}`}>
          <div className="group rounded-2xl border border-[#E6ECEA] bg-white p-4 hover:border-[#35C8B4] hover:shadow-md transition-all">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#C2F2E4] group-hover:bg-[#35C8B4]/20 transition-colors">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#35C8B4"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-sm font-bold text-[#0F1720] truncate group-hover:text-[#35C8B4] transition-colors">
              {board.name}
            </p>
            {board.description && (
              <p className="mt-1 text-xs text-[#5B6B73] line-clamp-2">
                {board.description}
              </p>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}

// ── Stat pill ─────────────────────────────────────────────────────────────────

function StatPill({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center px-4 py-2">
      <span className="text-lg font-bold text-[#0F1720]">{value}</span>
      <span className="text-xs text-[#5B6B73]">{label}</span>
    </div>
  )
}

// ── Tab type ──────────────────────────────────────────────────────────────────

type Tab = 'pins' | 'boards'

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ProfilePage({ params }: Props) {
  const { username } = await params

  const profile = await getProfile(username)
  if (!profile) notFound()

  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  const isOwnProfile = currentUser?.id === profile.id

  const [pins, boards] = await Promise.all([
    getProfilePins(profile.id),
    getPublicBoards(profile.id),
  ])

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14">

        {/* ── Profile header ── */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-10">

          {/* Avatar */}
          <div className="flex-shrink-0 h-24 w-24 rounded-full bg-[#C2F2E4] flex items-center justify-center text-3xl font-bold text-[#35C8B4] overflow-hidden shadow-sm">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.display_name || profile.username}
                width={96}
                height={96}
                className="h-full w-full object-cover"
                unoptimized
                priority
              />
            ) : (
              (profile.display_name || profile.username)
                .charAt(0)
                .toUpperCase()
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            <h1 className="text-2xl font-bold text-[#0F1720] leading-tight">
              {profile.display_name || profile.username}
            </h1>
            <p className="mt-0.5 text-sm text-[#5B6B73]">@{profile.username}</p>

            {profile.bio && (
              <p className="mt-3 text-sm text-[#0F1720] leading-relaxed max-w-lg whitespace-pre-wrap">
                {profile.bio}
              </p>
            )}

            {/* Stats row */}
            <div className="mt-4 inline-flex items-center divide-x divide-[#E6ECEA] rounded-2xl border border-[#E6ECEA] bg-white overflow-hidden">
              <StatPill value={pins.length} label="Pins" />
              <StatPill value={boards.length} label="Boards" />
            </div>
          </div>
        </div>

        {/* ── Tabs rendered as two sections with anchor links ── */}
        {/* Using simple server-side approach: show both sections and let user scroll */}
        {/* For full client tab behavior, a 'use client' wrapper would be needed */}

        <ProfileTabs pins={pins} boards={boards} isOwnProfile={isOwnProfile} />
      </div>
    </main>
  )
}

// ── Client tab switcher ────────────────────────────────────────────────────────
// Isolated to a thin client component so the parent stays a Server Component

import ProfileTabs from '@/components/profile/ProfileTabs'