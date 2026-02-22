import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
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

  // 3. Parse body
  let ids: string[]
  try {
    const body = await req.json()
    ids = body.ids
    if (!Array.isArray(ids) || ids.length === 0) throw new Error()
  } catch {
    return NextResponse.json({ error: 'Invalid body: expected { ids: string[] }' }, { status: 400 })
  }

  // 4. Bulk update sort_index via admin client (bypasses RLS)
  const admin = createAdminClient()
  const updates = ids.map((id, i) =>
    admin.from('pins').update({ sort_index: i * 10 }).eq('id', id)
  )

  const results = await Promise.all(updates)
  const failed = results.find(r => r.error)
  if (failed?.error) {
    console.error('[reorder] update error:', failed.error)
    return NextResponse.json({ error: 'Failed to save order' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
