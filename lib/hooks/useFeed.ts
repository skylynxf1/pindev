'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import type { Pin } from '@/types'

const INITIAL_PAGE_SIZE = 35

export function useFeed(options?: { scrollPageSize?: number }) {
  const scrollPageSize = options?.scrollPageSize ?? INITIAL_PAGE_SIZE
  const [pins, setPins] = useState<Pin[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const offsetRef     = useRef(0)
  const isFetching    = useRef(false)
  const isFirstFetch  = useRef(true)

  const fetchPage = useCallback(async () => {
    if (isFetching.current || !hasMore) return
    isFetching.current = true
    setLoading(true)
    setError(null)

    const limit  = isFirstFetch.current ? INITIAL_PAGE_SIZE : scrollPageSize
    isFirstFetch.current = false
    const offset = offsetRef.current

    try {
      const res = await fetch(`/api/feed?offset=${offset}&limit=${limit}`)
      if (!res.ok) throw new Error('Failed to load feed')

      const json = await res.json()
      const rows: Pin[] = json.pins ?? []

      setHasMore(json.hasMore ?? false)
      offsetRef.current += rows.length

      setPins(prev => {
        const ids = new Set(prev.map(p => p.id))
        return [...prev, ...rows.filter(r => !ids.has(r.id))]
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
      isFetching.current = false
    }
  }, [hasMore, scrollPageSize])

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

  function reorderPins(orderedIds: string[]) {
    setPins(prev => {
      const map = new Map(prev.map(p => [p.id, p]))
      const reordered = orderedIds
        .map((id, i) => {
          const p = map.get(id)
          return p ? { ...p, sort_index: i * 10 } : null
        })
        .filter(Boolean) as Pin[]
      const reorderedSet = new Set(orderedIds)
      return [...reordered, ...prev.filter(p => !reorderedSet.has(p.id))]
    })
  }

  return {
    pins,
    loading,
    hasMore,
    error,
    fetchNextPage: fetchPage,
    removePin,
    updatePin,
    reorderPins,
  }
}
