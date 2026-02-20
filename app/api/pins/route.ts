import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPinSchema, validateMediaFile, validateThumbnailFile, isVideoType } from '@/lib/validators/pin'

const BUCKET = 'pin-media'
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024

// ── helpers ───────────────────────────────────────────────────────────────────

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function generateStoragePath(userId: string, filename: string): string {
  const timestamp = Date.now()
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'bin'
  const random = Math.random().toString(36).slice(2, 9)
  return `${userId}/${timestamp}-${random}.${ext}`
}

async function uploadFile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  file: File,
  path: string,
  contentType: string
): Promise<string> {
  const bytes = await file.arrayBuffer()
  const buffer = new Uint8Array(bytes)

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType,
      upsert: false,
    })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

// ── POST /api/pins ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // ── 1. Auth check ──────────────────────────────────────────────────────────
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return errorResponse('Unauthorized', 401)
  }

  // ── 2. Parse multipart form ────────────────────────────────────────────────
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return errorResponse('Invalid form data')
  }

  const mediaFile = formData.get('media') as File | null
  const thumbnailFile = formData.get('thumbnail') as File | null

  // ── 3. Validate files ──────────────────────────────────────────────────────
  if (!mediaFile || !(mediaFile instanceof File)) {
    return errorResponse('A media file (image or video) is required')
  }

  if (mediaFile.size > MAX_FILE_SIZE_BYTES) {
    return errorResponse('Media file exceeds the 50 MB limit')
  }

  const mediaFileError = validateMediaFile(mediaFile)
  if (mediaFileError) return errorResponse(mediaFileError)

  const needsThumbnail = isVideoType(mediaFile.type)

  if (needsThumbnail) {
    if (!thumbnailFile || !(thumbnailFile instanceof File)) {
      return errorResponse('A thumbnail image is required for video pins')
    }
    const thumbError = validateThumbnailFile(thumbnailFile)
    if (thumbError) return errorResponse(thumbError)
  }

  // ── 4. Validate text fields with Zod ──────────────────────────────────────
  const rawFields = {
    title: formData.get('title'),
    description: formData.get('description') ?? '',
    live_url: formData.get('live_url'),
    repo_url: formData.get('repo_url') ?? '',
    tags: formData.get('tags') ?? '',
    agreed_to_rules: formData.get('agreed_to_rules'),
  }

  const parsed = createPinSchema.safeParse(rawFields)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return errorResponse(first?.message ?? 'Invalid input')
  }

  const { title, description, live_url, repo_url, tags } = parsed.data

  // ── 5. Upload media to Storage ─────────────────────────────────────────────
  let mediaUrl: string
  let thumbnailUrl: string
  const mediaPath = generateStoragePath(user.id, mediaFile.name)

  try {
    mediaUrl = await uploadFile(supabase, mediaFile, mediaPath, mediaFile.type)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[api/pins] media upload error:', msg)
    return errorResponse(
      process.env.NODE_ENV === 'development' ? msg : 'Media upload failed. Please try again.',
      500
    )
  }

  if (needsThumbnail && thumbnailFile) {
    const thumbPath = generateStoragePath(user.id, `thumb-${thumbnailFile.name}`)
    try {
      thumbnailUrl = await uploadFile(supabase, thumbnailFile, thumbPath, thumbnailFile.type)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[api/pins] thumbnail upload error:', msg)
      await supabase.storage.from(BUCKET).remove([mediaPath])
      return errorResponse(
        process.env.NODE_ENV === 'development' ? msg : 'Thumbnail upload failed. Please try again.',
        500
      )
    }
  } else {
    // For image pins, the media IS the thumbnail
    thumbnailUrl = mediaUrl
  }

  // ── 6. Insert pin row ──────────────────────────────────────────────────────
  const { data: pin, error: insertError } = await supabase
    .from('pins')
    .insert({
      owner_id: user.id,
      title,
      description,
      live_url,
      repo_url,
      media_url: mediaUrl,
      media_type: isVideoType(mediaFile.type) ? 'video' : 'image',
      thumbnail_url: thumbnailUrl,
      is_published: true,
    })
    .select('id')
    .single()

  if (insertError || !pin) {
    console.error('[api/pins] insert error:', insertError)
    // Best-effort cleanup of orphaned storage objects
    await supabase.storage.from(BUCKET).remove([mediaPath])
    return errorResponse('Failed to save pin. Please try again.', 500)
  }

  // ── 7. Upsert tags + link to pin ───────────────────────────────────────────
  if (tags.length > 0) {
    // Upsert tags by name, get back their IDs
    const { data: tagRows, error: tagError } = await supabase
      .from('tags')
      .upsert(
        tags.map((name) => ({ name })),
        { onConflict: 'name', ignoreDuplicates: false }
      )
      .select('id, name')

    if (!tagError && tagRows && tagRows.length > 0) {
      await supabase.from('pin_tags').upsert(
        tagRows.map((tag) => ({ pin_id: pin.id, tag_id: tag.id })),
        { onConflict: 'pin_id,tag_id', ignoreDuplicates: true }
      )
    }
    // Tag errors are non-fatal — the pin is created regardless
  }

  return NextResponse.json({ id: pin.id }, { status: 201 })
}