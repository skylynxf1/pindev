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

function normaliseComment(row: Record<string, unknown>) {
  const profile = normaliseProfile(row.profiles)
  if (!profile) return null
  return {
    id:                row.id                as string,
    pin_id:            row.pin_id            as string,
    user_id:           row.user_id           as string,
    body:              row.body              as string,
    created_at:        row.created_at        as string,
    updated_at:        row.updated_at        as string,
    parent_comment_id: (row.parent_comment_id as string | null) ?? null,
    profile,
  }
}

// ── Rate limit helpers (DB-backed, no extra packages) ─────────────────────────

async function checkRateLimit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<{ limited: boolean; message?: string }> {
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()

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
  const sort   = searchParams.get('sort') ?? 'most_relevant'

  const { data: { user } } = await supabase.auth.getUser()

  // Use * to avoid breakage if parent_comment_id column doesn't exist yet
  const { data: rows, error: queryError } = await supabase
    .from('pin_comments')
    .select('*, profiles!user_id ( username, display_name, avatar_url )')
    .eq('pin_id', id)
    .order('created_at', { ascending: false })

  if (queryError) {
    console.error('[GET /api/pins/[id]/comments]', queryError.message)
    return err('Failed to load comments.', 500)
  }

  const allRows = (rows ?? []) as unknown as Record<string, unknown>[]
  const allComments = allRows
    .map(normaliseComment)
    .filter((c): c is NonNullable<ReturnType<typeof normaliseComment>> => c !== null)

  const commentIds = allComments.map(c => c.id)

  // Fetch like counts — wrapped in try/catch so it degrades gracefully
  // if comment_likes table doesn't exist yet
  const likeCountMap = new Map<string, number>()
  const userLikedSet = new Set<string>()

  if (commentIds.length > 0) {
    try {
      const { data: likeCounts } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .in('comment_id', commentIds)

      for (const row of (likeCounts ?? [])) {
        const cid = (row as { comment_id: string }).comment_id
        likeCountMap.set(cid, (likeCountMap.get(cid) ?? 0) + 1)
      }

      if (user) {
        const { data: userLikes } = await supabase
          .from('comment_likes')
          .select('comment_id')
          .eq('user_id', user.id)
          .in('comment_id', commentIds)

        for (const row of (userLikes ?? [])) {
          userLikedSet.add((row as { comment_id: string }).comment_id)
        }
      }
    } catch {
      // comment_likes table may not exist yet — degrade gracefully (0 likes)
    }
  }

  // Separate top-level and replies
  const topLevel = allComments.filter(c => !c.parent_comment_id)
  const replies  = allComments.filter(c => c.parent_comment_id)

  // Count replies per parent
  const replyCountMap = new Map<string, number>()
  for (const r of replies) {
    const pid = r.parent_comment_id!
    replyCountMap.set(pid, (replyCountMap.get(pid) ?? 0) + 1)
  }

  // Sort top-level comments
  const sorted = [...topLevel]
  const now = Date.now()

  switch (sort) {
    case 'newest':
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      break
    case 'oldest':
      sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      break
    case 'most_liked':
      sorted.sort((a, b) => {
        const la = likeCountMap.get(a.id) ?? 0
        const lb = likeCountMap.get(b.id) ?? 0
        if (lb !== la) return lb - la
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      break
    case 'most_relevant':
    default: {
      const YEAR_MS = 365 * 24 * 60 * 60 * 1000
      sorted.sort((a, b) => {
        const scoreA =
          (likeCountMap.get(a.id) ?? 0) * 5 +
          (replyCountMap.get(a.id) ?? 0) * 2 +
          Math.max(0, 1 - (now - new Date(a.created_at).getTime()) / YEAR_MS)
        const scoreB =
          (likeCountMap.get(b.id) ?? 0) * 5 +
          (replyCountMap.get(b.id) ?? 0) * 2 +
          Math.max(0, 1 - (now - new Date(b.created_at).getTime()) / YEAR_MS)
        if (scoreB !== scoreA) return scoreB - scoreA
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      break
    }
  }

  // Paginate top-level
  const hasMore = sorted.length > offset + limit
  const page = sorted.slice(offset, offset + limit)
  const pageIds = new Set(page.map(c => c.id))

  // Collect replies for page comments (sorted oldest-first)
  const pageReplies = replies
    .filter(r => pageIds.has(r.parent_comment_id!))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  function toPublic(c: NonNullable<ReturnType<typeof normaliseComment>>) {
    const { user_id: _uid, updated_at: _upd, ...safe } = c
    return {
      ...safe,
      like_count: likeCountMap.get(c.id) ?? 0,
      reply_count: replyCountMap.get(c.id) ?? 0,
      user_liked: userLikedSet.has(c.id),
    }
  }

  const comments = page.map(toPublic)
  const repliesOut = pageReplies.map(toPublic)
  const totalCount = topLevel.length

  return ok({ comments, replies: repliesOut, hasMore, totalCount })
}

// ── POST /api/pins/[id]/comments ──────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return err('Unauthorized', 401)

  const { id } = await params

  const { data: pinData } = await supabase
    .from('pins')
    .select('id')
    .eq('id', id)
    .eq('is_published', true)
    .maybeSingle()

  if (!pinData) return err('Pin not found', 404)

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return err('Invalid request body', 400)
  }

  const parsed = createCommentSchema.safeParse(rawBody)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return err(first?.message ?? 'Invalid input', 400)
  }

  const { body, parent_comment_id } = parsed.data

  // If replying, verify parent exists and belongs to this pin and is top-level
  if (parent_comment_id) {
    const { data: parent } = await supabase
      .from('pin_comments')
      .select('*, profiles!user_id ( username, display_name, avatar_url )')
      .eq('id', parent_comment_id)
      .eq('pin_id', id)
      .maybeSingle()

    if (!parent) return err('Parent comment not found', 404)
    const parentRow = parent as unknown as Record<string, unknown>
    if (parentRow.parent_comment_id) return err('Cannot reply to a reply', 400)
  }

  const modResult = moderateComment(body)
  if (!modResult.ok) {
    return err(moderationMessage(modResult.reason), 422)
  }

  const rateCheck = await checkRateLimit(supabase, user.id)
  if (rateCheck.limited) {
    return err(rateCheck.message ?? 'Too many requests', 429)
  }

  // Build insert data — only include parent_comment_id if provided
  const insertData: Record<string, string> = {
    pin_id: id,
    user_id: user.id,
    body,
  }
  if (parent_comment_id) {
    insertData.parent_comment_id = parent_comment_id
  }

  const { data: inserted, error: insertError } = await supabase
    .from('pin_comments')
    .insert(insertData)
    .select('id')
    .single()

  if (insertError || !inserted) {
    console.error('[POST /api/pins/[id]/comments] insert error:', insertError?.message)
    return err('Failed to post comment. Please try again.', 500)
  }

  // Re-fetch the created row with profile data using * to be resilient
  const { data: commentRow, error: fetchError } = await supabase
    .from('pin_comments')
    .select('*, profiles!user_id ( username, display_name, avatar_url )')
    .eq('id', inserted.id)
    .single()

  if (fetchError || !commentRow) {
    // Fallback: construct the comment from known data + fetch profile separately
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('id', user.id)
      .single()

    const profile = profileRow
      ? {
          username: profileRow.username ?? '',
          display_name: profileRow.display_name ?? '',
          avatar_url: profileRow.avatar_url ?? null,
        }
      : { username: '', display_name: '', avatar_url: null }

    return ok({
      comment: {
        id: inserted.id,
        pin_id: id,
        body,
        created_at: new Date().toISOString(),
        parent_comment_id: parent_comment_id ?? null,
        profile,
        like_count: 0,
        reply_count: 0,
        user_liked: false,
      },
    }, 201)
  }

  const comment = normaliseComment(commentRow as unknown as Record<string, unknown>)
  if (!comment) {
    return err('Comment posted but failed to load it. Please refresh.', 500)
  }

  const { user_id: _uid, updated_at: _upd, ...safeComment } = comment

  return ok({
    comment: {
      ...safeComment,
      like_count: 0,
      reply_count: 0,
      user_liked: false,
    },
  }, 201)
}
