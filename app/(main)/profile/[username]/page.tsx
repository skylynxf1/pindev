import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { Pin, Board, Profile } from '@/types'
import ProfileTabs from '@/components/profile/ProfileTabs'

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

  const displayName = profile.display_name || profile.username
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-sans)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 28px 80px' }}>

        {/* Back link */}
        <Link href="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: '0.875rem', color: 'var(--muted)', textDecoration: 'none',
          marginBottom: 28, transition: 'color 150ms',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          Back to feed
        </Link>

        {/* ── Profile header card ── */}
        <div style={{
          borderRadius: 20,
          background: 'linear-gradient(135deg, var(--menthe-light) 0%, var(--brume) 100%)',
          border: '1.5px solid var(--brume)',
          padding: '32px 32px',
          marginBottom: 36,
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}>

            {/* Avatar */}
            <div style={{
              flexShrink: 0, width: 96, height: 96, borderRadius: '50%',
              background: 'var(--menthe)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2.25rem', fontWeight: 700, color: '#fff',
              overflow: 'hidden',
              border: '3px solid #fff',
              boxShadow: '0 4px 16px rgb(53 200 180 / .25)',
            }}>
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={displayName}
                  width={96}
                  height={96}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  unoptimized
                  priority
                />
              ) : initial}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{
                fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
                color: 'var(--text)',
                margin: '0 0 4px',
              }}>
                {displayName}
              </h1>
              <p style={{ fontSize: '0.9rem', color: 'var(--menthe)', fontWeight: 600, margin: '0 0 10px' }}>
                @{profile.username}
              </p>

              {profile.bio && (
                <p style={{
                  fontSize: '0.9rem', color: 'var(--text-2)',
                  lineHeight: 1.55, margin: '0 0 14px',
                  maxWidth: 520, whiteSpace: 'pre-wrap',
                }}>
                  {profile.bio}
                </p>
              )}

              {/* Stats + actions row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                {/* Stats pills */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center',
                  borderRadius: 12, overflow: 'hidden',
                  background: 'rgba(255,255,255,0.7)',
                  border: '1px solid var(--border)',
                }}>
                  <div style={{ padding: '8px 16px', textAlign: 'center' }}>
                    <span style={{ display: 'block', fontSize: '1.125rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.2 }}>
                      {pins.length}
                    </span>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Pins
                    </span>
                  </div>
                  <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
                  <div style={{ padding: '8px 16px', textAlign: 'center' }}>
                    <span style={{ display: 'block', fontSize: '1.125rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.2 }}>
                      {boards.length}
                    </span>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Boards
                    </span>
                  </div>
                </div>

                {/* Edit profile button (own profile only) */}
                {isOwnProfile && (
                  <Link
                    href="/settings/profile"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '8px 18px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.7)',
                      border: '1px solid var(--border)',
                      fontSize: '0.8125rem', fontWeight: 600,
                      color: 'var(--text)', textDecoration: 'none',
                      transition: 'all 150ms',
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit profile
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <ProfileTabs pins={pins} boards={boards} isOwnProfile={isOwnProfile} />
      </div>
    </main>
  )
}
