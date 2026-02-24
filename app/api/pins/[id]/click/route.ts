import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/pins/[id]/click
// Increments clicks_count for a published pin.
// Called when a user opens the live_url of a pin.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const supabase = createAdminClient()

    const { data: pin } = await supabase
      .from('pins')
      .select('clicks_count')
      .eq('id', id)
      .eq('is_published', true)
      .maybeSingle()

    if (!pin) return NextResponse.json({ ok: false }, { status: 404 })

    await supabase
      .from('pins')
      .update({ clicks_count: (pin.clicks_count ?? 0) + 1 })
      .eq('id', id)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
