import { cache } from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PinPageClient from '@/components/pin/PinPageClient'
import type { Pin } from '@/types'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ id: string }>
}

// Deduplicate: generateMetadata + PinPage both call getPin —
// React cache() ensures only one Supabase round-trip per request.
const getPin = cache(async (id: string): Promise<Pin | null> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pins')
    .select(`
      id, owner_id, title, description, live_url, repo_url,
      linkedin_url, tiktok_url, instagram_url,
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
    linkedin_url:  row.linkedin_url  as string | null ?? null,
    tiktok_url:    row.tiktok_url    as string | null ?? null,
    instagram_url: row.instagram_url as string | null ?? null,
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
})

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

  // Similar pins are fetched client-side so the selected pin renders
  // immediately without waiting for 3-4 extra DB round-trips.
  return <PinPageClient pin={pin} />
}
