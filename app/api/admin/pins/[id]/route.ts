import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const BUCKET = 'pin-media'

function urlToPath(url: string): string | null {
  try {
    const u = new URL(url)
    const marker = `/object/public/${BUCKET}/`
    const idx = u.pathname.indexOf(marker)
    return idx !== -1 ? u.pathname.slice(idx + marker.length) : null
  } catch {
    return null
  }
}

export async function DELETE(
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

  // 3. Fetch pin media paths via admin client
  const admin = createAdminClient()
  const { data: pin } = await admin
    .from('pins')
    .select('id, media_url, thumbnail_url')
    .eq('id', id)
    .single()

  if (!pin) return NextResponse.json({ error: 'Pin not found' }, { status: 404 })

  // 4. Storage cleanup — only this pin's files, deduplicated
  const paths = [
    ...new Set(
      [urlToPath(pin.media_url), urlToPath(pin.thumbnail_url)].filter(Boolean) as string[]
    ),
  ]
  if (paths.length > 0) {
    const { error: storageErr } = await admin.storage.from(BUCKET).remove(paths)
    if (storageErr) {
      console.error('[admin/pins/delete] storage error:', storageErr)
      // Non-fatal — continue with DB delete
    }
  }

  // 5. Delete pin row — FK cascades to pin_tags, board_pins
  const { error: deleteError } = await admin
    .from('pins')
    .delete()
    .eq('id', id)

  if (deleteError) {
    console.error('[admin/pins/delete] db error:', deleteError)
    return NextResponse.json({ error: 'Failed to delete pin' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
