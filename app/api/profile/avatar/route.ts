import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const BUCKET = 'pin-media'
const MAX_SIZE = 5 * 1024 * 1024

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return errorResponse('Unauthorized', 401)

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return errorResponse('Invalid form data')
  }

  const file = formData.get('avatar') as File | null
  if (!file || !(file instanceof File)) return errorResponse('No avatar file provided')
  if (file.size > MAX_SIZE) return errorResponse('Avatar must be under 5 MB')
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return errorResponse('Avatar must be a JPEG, PNG, or WebP image')
  }

  // Delete old avatar from storage if it exists
  const { data: existing } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', user.id)
    .single()

  if (existing?.avatar_url) {
    try {
      const url = new URL(existing.avatar_url)
      const marker = `/object/public/${BUCKET}/`
      const idx = url.pathname.indexOf(marker)
      if (idx !== -1) {
        const oldPath = url.pathname.slice(idx + marker.length)
        await supabase.storage.from(BUCKET).remove([oldPath])
      }
    } catch {
      // Non-fatal — continue with upload
    }
  }

  const path = `${user.id}/avatar-${Date.now()}.jpg`
  const bytes = await file.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, new Uint8Array(bytes), { contentType: 'image/jpeg', upsert: false })

  if (uploadError) {
    console.error('[api/profile/avatar] upload error:', uploadError)
    return errorResponse('Avatar upload failed. Please try again.', 500)
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path)

  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', user.id)
    .select('id, username, display_name, bio, avatar_url, created_at, updated_at')
    .single()

  if (updateError || !updated) {
    return errorResponse('Failed to update profile avatar.', 500)
  }

  return NextResponse.json({ profile: updated })
}
