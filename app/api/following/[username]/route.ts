import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params {
  params: Promise<{ username: string }>
}

// GET — public; returns { users: FollowUser[] } — profiles that the given username follows
export async function GET(_req: NextRequest, { params }: Params) {
  const { username } = await params
  const supabase = await createClient()

  const { data: { user: currentUser } } = await supabase.auth.getUser()

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('follows')
    .select('profiles!following_id(id, username, display_name, avatar_url)')
    .eq('follower_id', profile.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const users = (data ?? [])
    .map((row: Record<string, unknown>) => row.profiles)
    .filter(Boolean) as { id: string; username: string; display_name: string; avatar_url: string | null }[]

  // Determine which of these users the current user follows
  let followedIds = new Set<string>()

  if (currentUser && users.length > 0) {
    const userIds = users.map((u) => u.id)
    const { data: followRows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', currentUser.id)
      .in('following_id', userIds)

    followedIds = new Set((followRows ?? []).map((r) => r.following_id))
  }

  const usersWithStatus = users.map((u) => ({
    ...u,
    is_followed_by_me: followedIds.has(u.id),
  }))

  return NextResponse.json({ users: usersWithStatus })
}
