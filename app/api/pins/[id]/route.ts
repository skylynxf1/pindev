import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateMediaFile, validateThumbnailFile, isVideoType } from '@/lib/validators/pin'

const BUCKET = 'pin-media'

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
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, new Uint8Array(bytes), { contentType, upsert: false })
  if (error) throw new Error(`Storage upload failed: ${error.message}`)
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

function urlToPath(url: string): string | null {
  try {
    const u = new URL(url)
    const marker = `/object/public/${BUCKET}/`
    const idx = u.pathname.indexOf(marker)
    return idx !== -1 ? u.pathname.slice(idx + marker.length) : null
  } catch {
    return null
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Pin ID required' }, { status: 400 })

  // Verify ownership and get storage paths
  const { data: pin } = await supabase
    .from('pins')
    .select('id, owner_id, media_url, thumbnail_url')
    .eq('id', id)
    .single()

  if (!pin) return NextResponse.json({ error: 'Pin not found' }, { status: 404 })
  if (pin.owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Best-effort storage cleanup
  const paths = [
    ...new Set(
      [urlToPath(pin.media_url), urlToPath(pin.thumbnail_url)].filter(Boolean) as string[]
    ),
  ]
  if (paths.length > 0) {
    await supabase.storage.from(BUCKET).remove(paths)
  }

  // Delete pin row — cascades to pin_tags and board_pins via FK
  const { error: deleteError } = await supabase
    .from('pins')
    .delete()
    .eq('id', id)
    .eq('owner_id', user.id)

  if (deleteError) {
    console.error('[api/pins/[id]] delete error:', deleteError)
    return NextResponse.json({ error: 'Failed to delete pin.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return errorResponse('Unauthorized', 401)

  const { id } = await params

  // Verify ownership and get current media URLs
  const { data: pin } = await supabase
    .from('pins')
    .select('id, owner_id, media_url, thumbnail_url, media_type')
    .eq('id', id)
    .single()

  if (!pin) return errorResponse('Pin not found', 404)
  if (pin.owner_id !== user.id) return errorResponse('Forbidden', 403)

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return errorResponse('Invalid form data')
  }

  const title = String(formData.get('title') || '').trim()
  const description = String(formData.get('description') || '').trim()
  const live_url = String(formData.get('live_url') || '').trim()
  const repo_url = String(formData.get('repo_url') || '').trim() || null
  const tagsRaw = String(formData.get('tags') || '')
  const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean)

  if (!title || title.length < 2) return errorResponse('Title is required')
  if (!live_url) return errorResponse('Live URL is required')

  // Optionally replace media
  const mediaFile = formData.get('media') as File | null
  let mediaUrl = pin.media_url
  let thumbnailUrl = pin.thumbnail_url
  let mediaType = pin.media_type

  if (mediaFile instanceof File && mediaFile.size > 0) {
    const mediaErr = validateMediaFile(mediaFile)
    if (mediaErr) return errorResponse(mediaErr)

    const needsThumb = isVideoType(mediaFile.type)
    const thumbnailFile = formData.get('thumbnail') as File | null
    if (needsThumb && !(thumbnailFile instanceof File)) {
      return errorResponse('A thumbnail is required for video pins')
    }

    const mediaPath = generateStoragePath(user.id, mediaFile.name)
    try {
      mediaUrl = await uploadFile(supabase, mediaFile, mediaPath, mediaFile.type)
    } catch {
      return errorResponse('Media upload failed', 500)
    }

    if (needsThumb && thumbnailFile instanceof File) {
      const thumbPath = generateStoragePath(user.id, `thumb-${thumbnailFile.name}`)
      try {
        thumbnailUrl = await uploadFile(supabase, thumbnailFile, thumbPath, thumbnailFile.type)
      } catch {
        await supabase.storage.from(BUCKET).remove([mediaPath])
        return errorResponse('Thumbnail upload failed', 500)
      }
    } else {
      thumbnailUrl = mediaUrl
    }

    mediaType = isVideoType(mediaFile.type) ? 'video' : 'image'
  }

  const { error: updateError } = await supabase
    .from('pins')
    .update({ title, description, live_url, repo_url, media_url: mediaUrl, thumbnail_url: thumbnailUrl, media_type: mediaType })
    .eq('id', id)
    .eq('owner_id', user.id)

  if (updateError) return errorResponse('Failed to update pin', 500)

  // Replace tags: delete existing, re-insert new
  await supabase.from('pin_tags').delete().eq('pin_id', id)
  if (tags.length > 0) {
    const { data: tagRows } = await supabase
      .from('tags')
      .upsert(tags.map(name => ({ name })), { onConflict: 'name', ignoreDuplicates: false })
      .select('id, name')
    if (tagRows && tagRows.length > 0) {
      await supabase.from('pin_tags').upsert(
        tagRows.map(tag => ({ pin_id: id, tag_id: tag.id })),
        { onConflict: 'pin_id,tag_id', ignoreDuplicates: true }
      )
    }
  }

  return NextResponse.json({ id })
}
