import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Pin ID required' }, { status: 400 })

  // Verify ownership and get storage paths
  const { data: pin } = await supabase
    .from('pins')
    .select('id, owner_id, media_url, thumbnail_url')
    .eq('id', id)
    .single()

  if (!pin) return NextResponse.json({ error: 'Pin not found' }, { status: 404 })
  if (pin.owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Best-effort storage cleanup
  const paths = [
    ...new Set(
      [urlToPath(pin.media_url), urlToPath(pin.thumbnail_url)].filter(Boolean) as string[]
    ),
  ]
  if (paths.length > 0) {
    await supabase.storage.from(BUCKET).remove(paths)
  }

  // Delete pin row — cascades to pin_tags and board_pins via FK
  const { error: deleteError } = await supabase
    .from('pins')
    .delete()
    .eq('id', id)
    .eq('owner_id', user.id)

  if (deleteError) {
    console.error('[api/pins/[id]] delete error:', deleteError)
    return NextResponse.json({ error: 'Failed to delete pin.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
