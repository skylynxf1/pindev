'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Board } from '@/types'

export function useBoards() {
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBoards = useCallback(async () => {
    setLoading(true)
    setError(null)

    const res = await fetch('/api/boards')
    if (!res.ok) {
      setError('Could not load your boards.')
      setLoading(false)
      return
    }

    const json = await res.json()
    setBoards(json.boards ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchBoards()
  }, [fetchBoards])

  const addBoard = useCallback((board: Board) => {
    setBoards((prev) => [board, ...prev])
  }, [])

  return { boards, loading, error, refetch: fetchBoards, addBoard }
}