import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params {
  params: Promise<{ username: string }>
}

// POST — auth required; block the user + delete follow relationships in both directions
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
    return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 })
  }

  // Insert block row (ignore conflict if already blocked)
  const { error: blockError } = await supabase
    .from('blocks')
    .insert({ blocker_id: currentUser.id, blocked_id: target.id })

  if (blockError && blockError.code !== '23505') {
    return NextResponse.json({ error: blockError.message }, { status: 500 })
  }

  // Delete follow relationships in both directions
  await Promise.all([
    supabase
      .from('follows')
      .delete()
      .eq('follower_id', currentUser.id)
      .eq('following_id', target.id),
    supabase
      .from('follows')
      .delete()
      .eq('follower_id', target.id)
      .eq('following_id', currentUser.id),
  ])

  return NextResponse.json({ success: true })
}

// DELETE — auth required; unblock the user
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
    .from('blocks')
    .delete()
    .eq('blocker_id', currentUser.id)
    .eq('blocked_id', target.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
