import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { Pin } from '@/types'
import SavedPinsView from './SavedPinsView'

interface Props {
  params: Promise<{ username: string }>
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, username')
    .eq('username', username)
    .single()

  if (!profile) return { title: 'User not found · PinDev' }

  const name = profile.display_name || profile.username
  return {
    title: `${name}'s Saved Projects · PinDev`,
    description: `Saved projects by ${name} on PinDev.`,
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function UserSavedPage({ params }: Props) {
  const { username } = await params
  const supabase = await createClient()

  // 1. Resolve username → profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  // 2. Check viewer identity
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  const isOwner = !!currentUser && currentUser.id === profile.id

  // 3. Find the user's "Saved" board
  const { data: savedBoard } = await supabase
    .from('boards')
    .select('id')
    .eq('owner_id', profile.id)
    .eq('name', 'Saved')
    .maybeSingle()

  let pins: Pin[] = []

  if (savedBoard) {
    // 4. Fetch board_pins with full pin details
    const { data: boardPins } = await supabase
      .from('board_pins')
      .select(`
        saved_at,
        pins (
          id, owner_id, title, description, live_url, repo_url,
          media_url, media_type, thumbnail_url, is_published,
          created_at, updated_at,
          profiles ( username, display_name, avatar_url ),
          pin_tags ( tags ( id, name ) )
        )
      `)
      .eq('board_id', savedBoard.id)
      .order('saved_at', { ascending: false })

    pins = (boardPins ?? [])
      .map((bp: Record<string, unknown>) => {
        const p = bp.pins as Record<string, unknown> | null
        if (!p) return null
        return {
          id: p.id as string,
          owner_id: p.owner_id as string,
          title: p.title as string,
          description: p.description as string,
          live_url: p.live_url as string,
          repo_url: p.repo_url as string | null,
          media_url: p.media_url as string,
          media_type: p.media_type as 'image' | 'video',
          thumbnail_url: p.thumbnail_url as string,
          is_published: p.is_published as boolean,
          created_at: p.created_at as string,
          updated_at: p.updated_at as string,
          profile: Array.isArray(p.profiles)
            ? (p.profiles[0] ?? null)
            : (p.profiles as Pin['profile'] ?? null),
          tags: Array.isArray(p.pin_tags)
            ? (p.pin_tags as Array<{ tags: { id: string; name: string } }>).map(pt => pt.tags).filter(Boolean)
            : [],
        } as Pin
      })
      .filter(Boolean) as Pin[]
  }

  return (
    <SavedPinsView
      pins={pins}
      username={profile.username}
      displayName={profile.display_name || profile.username}
      isOwner={isOwner}
      boardId={savedBoard?.id ?? null}
    />
  )
}
