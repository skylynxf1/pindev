'use client'

import { useState, useEffect, useRef } from 'react'

interface LikeButtonProps {
  pinId: string
  /** Provided by batch fetch from parent (feed). If undefined, fetches individually. */
  initialLikeCount?: number
  initialLikedByMe?: boolean
  currentUserId?: string
  onAuthRequired?: () => void
}

export default function LikeButton({
  pinId,
  initialLikeCount,
  initialLikedByMe,
  currentUserId,
  onAuthRequired,
}: LikeButtonProps) {
  const [likeCount, setLikeCount] = useState(initialLikeCount ?? 0)
  const [liked, setLiked] = useState(initialLikedByMe ?? false)
  const [loading, setLoading] = useState(false)
  // Once the user clicks, stop accepting parent-provided updates
  const interactedRef = useRef(false)

  // Self-fetch when no initial data (e.g. PinDetailView)
  useEffect(() => {
    if (initialLikeCount !== undefined) return
    let cancelled = false
    fetch(`/api/pins/${pinId}/like`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d && !cancelled && !interactedRef.current) {
          setLikeCount(d.likeCount)
          setLiked(d.likedByMe)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [pinId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync when parent batch data arrives (skip if user has already interacted)
  useEffect(() => {
    if (initialLikeCount === undefined) return
    if (interactedRef.current) return
    setLikeCount(initialLikeCount)
    setLiked(initialLikedByMe ?? false)
  }, [initialLikeCount, initialLikedByMe])

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    if (!currentUserId) {
      onAuthRequired?.()
      return
    }
    if (loading) return
    interactedRef.current = true
    const prevLiked = liked
    const prevCount = likeCount
    // Optimistic update
    setLiked(l => !l)
    setLikeCount(c => c + (prevLiked ? -1 : 1))
    setLoading(true)
    try {
      const res = await fetch(`/api/pins/${pinId}/like`, {
        method: prevLiked ? 'DELETE' : 'POST',
      })
      if (!res.ok) {
        setLiked(prevLiked)
        setLikeCount(prevCount)
      }
    } catch {
      setLiked(prevLiked)
      setLikeCount(prevCount)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      title={currentUserId ? (liked ? 'Unlike' : 'Like') : 'Log in to like'}
      style={{
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        background: 'none',
        border: 'none',
        padding: '2px 4px',
        cursor: 'pointer',
        color: liked ? '#ef4444' : 'var(--muted)',
        fontSize: '0.75rem',
        lineHeight: 1,
        transition: 'color 120ms',
        borderRadius: 6,
        opacity: loading ? 0.6 : 1,
      }}
      onMouseEnter={e => {
        if (!liked) (e.currentTarget as HTMLElement).style.color = '#ef4444'
      }}
      onMouseLeave={e => {
        if (!liked) (e.currentTarget as HTMLElement).style.color = 'var(--muted)'
      }}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill={liked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      {likeCount > 0 && <span>{likeCount}</span>}
    </button>
  )
}
