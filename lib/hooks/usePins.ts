'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Pin, Tag } from '@/types'

const PAGE_SIZE = 20

export function usePins(options?: { initialPins?: Pin[] }) {
  const [pins, setPins] = useState<Pin[]>(options?.initialPins ?? [])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // cursor = created_at of the last fetched pin
  const cursorRef = useRef<string | null>(null)
  const isFetchingRef = useRef(false)

  const fetchPage = useCallback(async () => {
    if (isFetchingRef.current || !hasMore) return
    isFetchingRef.current = true
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      let query = supabase
        .from('pins')
        .select(`
          id, owner_id, title, description, live_url, repo_url,
          media_url, media_type, thumbnail_url, is_published,
          created_at, updated_at,
          profiles ( username, display_name, avatar_url ),
          pin_tags ( tags ( id, name ) )
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (cursorRef.current) {
        query = query.lt('created_at', cursorRef.current)
      }

      const { data, error: sbError } = await query

      if (sbError) throw new Error('Failed to load pins.')

      const rows = (data ?? []).map((row: Record<string, unknown>) => ({
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
          ? (row.pin_tags as Array<{ tags: Tag }>)
              .map((pt) => pt.tags)
              .filter(Boolean)
          : [],
      })) as Pin[]

      if (rows.length < PAGE_SIZE) setHasMore(false)
      if (rows.length > 0) {
        cursorRef.current = rows[rows.length - 1].created_at
      }

      setPins((prev) => {
        const ids = new Set(prev.map((p) => p.id))
        return [...prev, ...rows.filter((r) => !ids.has(r.id))]
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [hasMore])

  // Initial load
  useEffect(() => {
    fetchPage()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function removePin(id: string) {
    setPins(prev => prev.filter(p => p.id !== id))
  }

  function updatePin(updated: Pin) {
    setPins(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p))
  }

  return { pins, loading, hasMore, error, fetchNextPage: fetchPage, removePin, updatePin }
}
