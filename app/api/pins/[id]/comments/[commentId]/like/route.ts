import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function ok(data: object) {
  return NextResponse.json(data)
}
function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

// ── POST /api/pins/[id]/comments/[commentId]/like ────────────────────────────
// Like a comment. Idempotent — liking an already-liked comment is a no-op.

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return err('Unauthorized', 401)

  const { commentId } = await params

  // Verify comment exists
  const { data: comment } = await supabase
    .from('pin_comments')
    .select('id')
    .eq('id', commentId)
    .maybeSingle()

  if (!comment) return err('Comment not found', 404)

  // Upsert — ignore conflict (idempotent)
  const { error: insertError } = await supabase
    .from('comment_likes')
    .upsert({ comment_id: commentId, user_id: user.id }, { onConflict: 'comment_id,user_id' })

  if (insertError) {
    console.error('[POST comment like]', insertError.message)
    return err('Failed to like comment', 500)
  }

  return ok({ liked: true })
}

// ── DELETE /api/pins/[id]/comments/[commentId]/like ──────────────────────────
// Unlike a comment. Idempotent — unliking an already-unliked comment is a no-op.

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return err('Unauthorized', 401)

  const { commentId } = await params

  const { error: deleteError } = await supabase
    .from('comment_likes')
    .delete()
    .eq('comment_id', commentId)
    .eq('user_id', user.id)

  if (deleteError) {
    console.error('[DELETE comment like]', deleteError.message)
    return err('Failed to unlike comment', 500)
  }

  return ok({ liked: false })
}
