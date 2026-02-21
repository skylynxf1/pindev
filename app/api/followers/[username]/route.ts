import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params {
  params: Promise<{ username: string }>
}

// GET — public; returns { users: FollowUser[] } — profiles that follow the given username
export async function GET(_req: NextRequest, { params }: Params) {
  const { username } = await params
  const supabase = await createClient()

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
    .select('profiles!follower_id(id, username, display_name, avatar_url)')
    .eq('following_id', profile.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const users = (data ?? [])
    .map((row: Record<string, unknown>) => row.profiles)
    .filter(Boolean)

  return NextResponse.json({ users })
}

// DELETE — auth required; remove a follower from your own followers list
// Body: { username: targetFollowerUsername }
export async function DELETE(req: NextRequest, { params }: Params) {
  const { username } = await params
  const supabase = await createClient()

  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify the profile belongs to the current user
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (profile.id !== currentUser.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const targetFollowerUsername: string = body.username

  if (!targetFollowerUsername) {
    return NextResponse.json({ error: 'Missing username' }, { status: 400 })
  }

  const { data: follower, error: followerError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', targetFollowerUsername)
    .single()

  if (followerError || !follower) {
    return NextResponse.json({ error: 'Follower not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', follower.id)
    .eq('following_id', currentUser.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
