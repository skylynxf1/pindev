import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Verify session
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Verify admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()

  if (profile?.username !== 'pindev') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Pin ID required' }, { status: 400 })

  // 3. Get current featured_until via admin client
  const admin = createAdminClient()
  const { data: pin } = await admin
    .from('pins')
    .select('featured_until')
    .eq('id', id)
    .single()

  if (!pin) return NextResponse.json({ error: 'Pin not found' }, { status: 404 })

  const now = new Date()
  const isCurrentlyFeatured = pin.featured_until && new Date(pin.featured_until) > now

  // Toggle: if active → null; if null/expired → now + 7 days
  const newFeaturedUntil = isCurrentlyFeatured
    ? null
    : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { error: updateError } = await admin
    .from('pins')
    .update({ featured_until: newFeaturedUntil })
    .eq('id', id)

  if (updateError) {
    console.error('[admin/pins/feature] update error:', updateError)
    return NextResponse.json({ error: 'Failed to update feature status' }, { status: 500 })
  }

  return NextResponse.json({ featured_until: newFeaturedUntil })
}
