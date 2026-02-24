import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/pins/[id]/impression
// Increments impressions_count for a published pin.
// Client-side sessionStorage prevents duplicate calls per session.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const supabase = createAdminClient()

    // Verify pin exists and is published
    const { data: pin } = await supabase
      .from('pins')
      .select('impressions_count')
      .eq('id', id)
      .eq('is_published', true)
      .maybeSingle()

    if (!pin) return NextResponse.json({ ok: false }, { status: 404 })

    await supabase
      .from('pins')
      .update({ impressions_count: (pin.impressions_count ?? 0) + 1 })
      .eq('id', id)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
