import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateProfileSchema, isReservedUsername } from '@/lib/validators/profile'

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

// ── GET /api/profile  — fetch the current user's own profile ─────────────────
export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return errorResponse('Unauthorized', 401)

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, bio, avatar_url, created_at, updated_at')
    .eq('id', user.id)
    .single()

  if (error || !data) return errorResponse('Profile not found.', 404)

  return NextResponse.json({ profile: data })
}

// ── PATCH /api/profile  — update display_name, username, and/or bio ──────────
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return errorResponse('Unauthorized', 401)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON body')
  }

  const parsed = updateProfileSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.errors[0]
    return errorResponse(first?.message ?? 'Invalid input')
  }

  const { username, display_name, bio } = parsed.data

  // Block reserved slugs
  if (isReservedUsername(username)) {
    return errorResponse('That username is reserved. Please choose a different one.')
  }

  // Check uniqueness — only fail if the conflicting row belongs to someone else
  const { data: existing, error: lookupError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle()

  if (lookupError) return errorResponse('Could not verify username availability.', 500)

  if (existing && existing.id !== user.id) {
    return errorResponse('That username is already taken.')
  }

  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update({ username, display_name, bio })
    .eq('id', user.id)
    .select('id, username, display_name, bio, avatar_url, created_at, updated_at')
    .single()

  if (updateError || !updated) {
    return errorResponse('Failed to update profile. Please try again.', 500)
  }

  return NextResponse.json({ profile: updated })
}