import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/requireAdmin'

function ok(data: object) {
  return NextResponse.json(data)
}
function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

// ── DELETE /api/pins/[id]/comments/[commentId] ────────────────────────────────
// Authors can delete their own comments.
// Admin (pindev account or bearer token) can delete any comment.
// Regular users cannot delete other users' comments.

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  const supabase = await createClient()

  // 1. Auth — must be logged in regardless
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return err('Unauthorized', 401)

  const { id: pinId, commentId } = await params

  // 2. Fetch comment to check ownership
  const { data: comment, error: fetchError } = await supabase
    .from('pin_comments')
    .select('id, user_id')
    .eq('id', commentId)
    .eq('pin_id', pinId)
    .maybeSingle()

  if (fetchError) {
    console.error('[DELETE comments/[commentId]]', fetchError.message)
    return err('Failed to find comment.', 500)
  }

  if (!comment) return err('Comment not found', 404)

  const isOwner = comment.user_id === user.id
  const isAdmin = await requireAdmin(request)

  // 3. Only owner or admin may delete
  if (!isOwner && !isAdmin) return err('Forbidden', 403)

  // 4. Delete — use admin client when deleting on behalf of another user so
  //    RLS ("comments_delete_own") doesn't block the operation.
  const deleteClient = isOwner ? supabase : createAdminClient()

  const { error: deleteError } = await deleteClient
    .from('pin_comments')
    .delete()
    .eq('id', commentId)
    .eq('pin_id', pinId)

  if (deleteError) {
    console.error('[DELETE comments/[commentId]] delete error:', deleteError.message)
    return err('Failed to delete comment. Please try again.', 500)
  }

  return ok({ success: true })
}
