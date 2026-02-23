import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params {
  params: Promise<{ username: string }>
}

// GET — public; returns { is_following, follower_count, following_count }
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

  const [followerResult, followingResult] = await Promise.all([
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', profile.id),
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', profile.id),
  ])

  let is_following = false
  if (currentUser) {
    const { data: followRow } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', currentUser.id)
      .eq('following_id', profile.id)
      .maybeSingle()
    is_following = !!followRow
  }

  return NextResponse.json({
    is_following,
    follower_count: followerResult.count ?? 0,
    following_count: followingResult.count ?? 0,
  })
}

// POST — auth required; follow the user
export async function POST(_req: NextRequest, { params }: Params) {
  const { username } = await params
  const supabase = await createClient()

  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: target, error: targetError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single()

  if (targetError || !target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (target.id === currentUser.id) {
    return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
  }

  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: currentUser.id, following_id: target.id })

  if (error && error.code !== '23505') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// DELETE — auth required; unfollow the user
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { username } = await params
  const supabase = await createClient()

  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: target, error: targetError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single()

  if (targetError || !target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', currentUser.id)
    .eq('following_id', target.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
