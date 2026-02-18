'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Pin } from '@/types'

export function usePin(id: string) {
  const [pin, setPin] = useState<Pin | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    let cancelled = false

    async function fetch() {
      setLoading(true)
      setError(null)

      const supabase = createClient()

      const { data, error: sbError } = await supabase
        .from('pins')
        .select(`
          id, owner_id, title, description, live_url, repo_url,
          media_url, media_type, thumbnail_url, is_published,
          created_at, updated_at,
          profiles ( username, display_name, avatar_url ),
          pin_tags ( tags ( id, name ) )
        `)
        .eq('id', id)
        .eq('is_published', true)
        .single()

      if (cancelled) return

      if (sbError || !data) {
        setError('Pin not found.')
        setLoading(false)
        return
      }

      const row = data as Record<string, unknown>

      const pin: Pin = {
        id: row.id as string,
        owner_id: row.owner_id as string,
        title: row.title as string,
        description: row.description as string,
        live_url: row.live_url as string,
        repo_url: row.repo_url as string | null,
        media_url: row.media_url as string,
        media_type: row.media_type as 'image' | 'video',
        thumbnail_url: row.thumbnail_url as string,
        is_published: row.is_published as boolean,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        profile: Array.isArray(row.profiles)
          ? (row.profiles[0] ?? null)
          : (row.profiles as Pin['profile'] ?? null),
        tags: Array.isArray(row.pin_tags)
          ? (row.pin_tags as Array<{ tags: { id: string; name: string } }>)
              .map((pt) => pt.tags)
              .filter(Boolean)
          : [],
      }

      setPin(pin)
      setLoading(false)
    }

    fetch()
    return () => { cancelled = true }
  }, [id])

  return { pin, loading, error }
}
