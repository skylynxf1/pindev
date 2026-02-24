import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/requireAdmin'

function ok(data: object) {
  return NextResponse.json(data)
}
function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

// POST /api/admin/pins/[id]/pin-position
// Body: { position: number | null, durationDays?: number }
// position null → clear override; durationDays defaults to 7.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin(request))) return err('Unauthorized', 401)

  const { id } = await params

  let body: { position?: number | null; durationDays?: number }
  try {
    body = await request.json()
  } catch {
    return err('Invalid JSON body', 400)
  }

  const { position = null, durationDays = 7 } = body

  if (position !== null && (typeof position !== 'number' || position < 1 || !Number.isInteger(position))) {
    return err('position must be a positive integer or null', 400)
  }

  const supabase = createAdminClient()

  const { data: pin } = await supabase
    .from('pins')
    .select('id')
    .eq('id', id)
    .eq('is_published', true)
    .maybeSingle()

  if (!pin) return err('Pin not found', 404)

  const now = new Date()
  const until = position !== null
    ? new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString()
    : null

  const { error } = await supabase
    .from('pins')
    .update({
      admin_pinned_position: position,
      admin_pinned_until:    until,
      admin_pinned_at:       position !== null ? now.toISOString() : null,
    })
    .eq('id', id)

  if (error) return err('Update failed', 500)

  return ok({ ok: true, position, until })
}

// DELETE /api/admin/pins/[id]/pin-position → clear the override
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin(request))) return err('Unauthorized', 401)

  const { id } = await params
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('pins')
    .update({
      admin_pinned_position: null,
      admin_pinned_until:    null,
      admin_pinned_at:       null,
    })
    .eq('id', id)

  if (error) return err('Update failed', 500)

  return ok({ ok: true })
}
