import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const BUCKET = 'pin-media'
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

function ok(data: object) {
  return NextResponse.json(data)
}
function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

// POST /api/pins/[id]/comments/upload
// Upload an image attachment for a comment. Returns the public URL.

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return err('Unauthorized', 401)

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return err('Invalid form data', 400)
  }

  const file = formData.get('image') as File | null
  if (!file || !(file instanceof File)) return err('No image file provided', 400)
  if (file.size > MAX_SIZE) return err('Image must be under 5 MB', 400)
  if (!ALLOWED_TYPES.includes(file.type)) {
    return err('Only JPEG, PNG, WebP, and GIF images are allowed', 400)
  }

  const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1]
  const path = `comment-images/${user.id}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    console.error('[comment image upload]', uploadError.message)
    return err('Failed to upload image', 500)
  }

  const { data: publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(path)

  return ok({ url: publicUrl.publicUrl })
}
