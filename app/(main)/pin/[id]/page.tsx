import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Pin } from '@/types'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ id: string }>
}

async function getPin(id: string): Promise<Pin | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pins')
    .select(`
      id, owner_id, title, description, live_url, repo_url,
      media_url, media_type, thumbnail_url, is_published,
      created_at, updated_at,
      profiles ( username, display_name, avatar_url ),
      pin_tags ( tags ( id, name ) )
    `)
    .eq('id', id)
    .eq('is_published', true)
    .single()

  if (error || !data) return null

  const row = data as Record<string, unknown>

  return {
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
    profile: Array.isArray(row.profiles)
      ? (row.profiles[0] ?? null)
      : (row.profiles as Pin['profile'] ?? null),
    tags: Array.isArray(row.pin_tags)
      ? (row.pin_tags as Array<{ tags: { id: string; name: string } }>)
          .map((pt) => pt.tags)
          .filter(Boolean)
      : [],
  }
}

// Dynamic metadata for SEO and social sharing
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const pin = await getPin(id)
  if (!pin) return { title: 'Pin not found · PinDev' }

  return {
    title: `${pin.title || 'Untitled project'} · PinDev`,
    description: pin.description || 'Discover live web and AI projects on PinDev.',
    openGraph: {
      title: pin.title || 'PinDev project',
      description: pin.description,
      images: pin.thumbnail_url ? [{ url: pin.thumbnail_url }] : [],
    },
  }
}

export default async function PinPage({ params }: Props) {
  const { id } = await params
  const pin = await getPin(id)

  if (!pin) notFound()

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-10 sm:py-16">

        {/* Back link */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-[#5B6B73] hover:text-[#35C8B4] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to feed
        </Link>

        <div className="flex flex-col md:flex-row gap-8 rounded-3xl border border-[#E6ECEA] bg-white shadow-sm overflow-hidden">

          {/* ── Media ── */}
          <div className="flex-shrink-0 w-full md:w-[52%] bg-[#C2F2E4]/20 flex items-center justify-center min-h-[280px]">
            {pin.media_type === 'video' ? (
              <video
                src={pin.media_url}
                poster={pin.thumbnail_url}
                controls
                playsInline
                className="w-full h-auto object-contain max-h-[70vh]"
              />
            ) : (
              <Image
                src={pin.thumbnail_url}
                alt={pin.title || 'Project preview'}
                width={900}
                height={700}
                className="w-full h-auto object-contain max-h-[70vh]"
                unoptimized
                priority
              />
            )}
          </div>

          {/* ── Details ── */}
          <div className="flex flex-col gap-5 p-7 flex-1">

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
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
                  className="flex items-center justify-center gap-2 rounded-2xl border border-[#E6ECEA] px-4 py-2.5 text-sm font-semibold text-[#0F1720] hover:bg-[#EDF7BE] transition-colors"
                >
                  Repo
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                  </svg>
                </a>
              )}
              <button className="flex items-center justify-center rounded-2xl bg-[#A4CF4A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#35C8B4] transition-colors">
                Save
              </button>
            </div>

            {/* Title */}
            {pin.title && (
              <h1 className="text-2xl font-bold text-[#0F1720] leading-snug">
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
          </div>
        </div>
      </div>
    </main>
  )
}