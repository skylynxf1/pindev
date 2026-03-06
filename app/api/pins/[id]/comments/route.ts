import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCommentSchema } from '@/lib/validators/comment'
import { moderateComment, moderationMessage } from '@/lib/moderation/comments'
import type { DbCommentWithProfile } from '@/lib/db/types'

function ok(data: object, status = 200) {
  return NextResponse.json(data, { status })
}
function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

// ── Normalise the nested profile object that Supabase may return as array ─────

function normaliseProfile(raw: unknown): DbCommentWithProfile['profile'] | null {
  if (!raw) return null
  const p = Array.isArray(raw) ? raw[0] : raw
  if (!p || typeof p !== 'object') return null
  const r = p as Record<string, unknown>
  return {
    username:     (r.username     as string) ?? '',
    display_name: (r.display_name as string) ?? '',
    avatar_url:   (r.avatar_url   as string | null) ?? null,
  }
}

function normaliseComment(row: Record<string, unknown>): DbCommentWithProfile | null {
  const profile = normaliseProfile(row.profiles)
  if (!profile) return null
  return {
    id:         row.id         as string,
    pin_id:     row.pin_id     as string,
    user_id:    row.user_id    as string,
    body:       row.body       as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    profile,
  }
}

// ── Rate limit helpers (DB-backed, no extra packages) ─────────────────────────

async function checkRateLimit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<{ limited: boolean; message?: string }> {
  // Per-minute: max 3 comments
  const { count: minuteCount, error: e1 } = await supabase
    .from('pin_comments')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 60_000).toISOString())

  if (!e1 && (minuteCount ?? 0) >= 3) {
    return {
      limited: true,
      message: "You're commenting too fast. Try again in a minute.",
    }
  }

  // Per-day: max 20 comments
  const { count: dayCount, error: e2 } = await supabase
    .from('pin_comments')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 86_400_000).toISOString())

  if (!e2 && (dayCount ?? 0) >= 20) {
    return {
      limited: true,
      message: "You've reached the daily comment limit. Try again tomorrow.",
    }
  }

  return { limited: false }
}

// ── GET /api/pins/[id]/comments ───────────────────────────────────────────────
// Public — no auth required. Returns comments on a published pin, newest first.

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()

  // Verify the pin exists and is published
  const { data: pin } = await supabase
    .from('pins')
    .select('id')
    .eq('id', id)
    .eq('is_published', true)
    .maybeSingle()

  if (!pin) return err('Pin not found', 404)

  const { searchParams } = new URL(request.url)
  const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10))
  const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '30', 10)))

  const { data: rows, error: queryError } = await supabase
    .from('pin_comments')
    .select('id, pin_id, user_id, body, created_at, updated_at, profiles ( username, display_name, avatar_url )')
    .eq('pin_id', id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit)  // request limit+1 to detect hasMore

  if (queryError) {
    console.error('[GET /api/pins/[id]/comments]', queryError.message)
    return err('Failed to load comments.', 500)
  }

  const allRows = (rows ?? []) as unknown as Record<string, unknown>[]
  const hasMore = allRows.length > limit
  const page    = hasMore ? allRows.slice(0, limit) : allRows

  const comments = page
    .map(normaliseComment)
    .filter((c): c is DbCommentWithProfile => c !== null)
    // Strip user_id from the public response — only internal code needs it
    .map(({ user_id: _uid, updated_at: _upd, ...safe }) => safe)

  return ok({ comments, hasMore })
}

// ── POST /api/pins/[id]/comments ──────────────────────────────────────────────
// Requires authentication. Validates, moderates, rate-limits, then inserts.

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()

  // 1. Auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return err('Unauthorized', 401)

  const { id } = await params

  // 2. Verify pin is published
  const { data: pin } = await supabase
    .from('pins')
    .select('id')
    .eq('id', id)
    .eq('is_published', true)
    .maybeSingle()

  if (!pin) return err('Pin not found', 404)

  // 3. Parse JSON body
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return err('Invalid request body', 400)
  }

  // 4. Zod validation
  const parsed = createCommentSchema.safeParse(rawBody)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return err(first?.message ?? 'Invalid input', 400)
  }

  const { body } = parsed.data

  // 5. Moderation — runs before touching the DB
  const modResult = moderateComment(body)
  if (!modResult.ok) {
    return err(moderationMessage(modResult.reason), 422)
  }

  // 6. Rate limiting — DB-backed, no extra packages required
  const rateCheck = await checkRateLimit(supabase, user.id)
  if (rateCheck.limited) {
    return err(rateCheck.message ?? 'Too many requests', 429)
  }

  // 7. Insert — user_id is ALWAYS from the verified session, never from the request body
  const { data: inserted, error: insertError } = await supabase
    .from('pin_comments')
    .insert({ pin_id: id, user_id: user.id, body })
    .select('id')
    .single()

  if (insertError || !inserted) {
    console.error('[POST /api/pins/[id]/comments] insert error:', insertError?.message)
    return err('Failed to post comment. Please try again.', 500)
  }

  // 8. Fetch the created row with profile data for the response
  const { data: commentRow, error: fetchError } = await supabase
    .from('pin_comments')
    .select('id, pin_id, user_id, body, created_at, updated_at, profiles ( username, display_name, avatar_url )')
    .eq('id', inserted.id)
    .single()

  if (fetchError || !commentRow) {
    console.error('[POST /api/pins/[id]/comments] fetch error:', fetchError?.message)
    return err('Comment posted but failed to load it. Please refresh.', 500)
  }

  const comment = normaliseComment(commentRow as unknown as Record<string, unknown>)
  if (!comment) {
    return err('Comment posted but failed to load it. Please refresh.', 500)
  }

  // Strip user_id from the response (not needed by the client)
  const { user_id: _uid, updated_at: _upd, ...safeComment } = comment

  return ok({ comment: safeComment }, 201)
}
