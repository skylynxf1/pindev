'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────────────────────

type CommentAuthor = {
  username: string
  display_name: string
  avatar_url: string | null
}

// user_id is intentionally absent — the API strips it before sending
type Comment = {
  id: string
  pin_id: string
  body: string
  created_at: string
  profile: CommentAuthor
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)            return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60)            return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)            return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30)            return `${d}d ago`
  const mo = Math.floor(d / 30)
  if (mo < 12)           return `${mo}mo ago`
  return `${Math.floor(mo / 12)}y ago`
}

function AvatarCircle({
  profile,
  size = 36,
}: {
  profile: CommentAuthor | null
  size?: number
}) {
  const initials = profile
    ? (profile.display_name || profile.username).charAt(0).toUpperCase()
    : '?'

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--brume)',
        color: 'var(--menthe)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.4,
        fontWeight: 700,
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {profile?.avatar_url ? (
        <Image
          src={profile.avatar_url}
          alt={profile.display_name || profile.username}
          width={size}
          height={size}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          unoptimized
        />
      ) : (
        initials
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

interface CommentSectionProps {
  pinId: string
}

const LIMIT = 30

export default function CommentSection({ pinId }: CommentSectionProps) {
  const [comments, setComments]           = useState<Comment[]>([])
  const [loading, setLoading]             = useState(true)
  const [submitting, setSubmitting]       = useState(false)
  const [body, setBody]                   = useState('')
  const [postError, setPostError]         = useState<string | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null | undefined>(undefined)
  const [currentProfile, setCurrentProfile] = useState<CommentAuthor | null>(null)
  const [hasMore, setHasMore]             = useState(false)
  const [offset, setOffset]               = useState(LIMIT)
  const [loadingMore, setLoadingMore]     = useState(false)
  const [deletingId, setDeletingId]       = useState<string | null>(null)
  const [isAdmin, setIsAdmin]             = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const trimmedBody = body.trim()
  const charCount   = body.length
  const canSubmit   = trimmedBody.length >= 3 && !submitting

  // ── Fetch auth state and initial comments ─────────────────────────────────

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null
      setCurrentUserId(uid)

      if (uid) {
        // Fetch the current user's profile for the optimistic avatar
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, display_name, avatar_url')
          .eq('id', uid)
          .single()

        if (profile) {
          setCurrentProfile({
            username:     profile.username     ?? '',
            display_name: profile.display_name ?? '',
            avatar_url:   profile.avatar_url   ?? null,
          })
          setIsAdmin(profile.username === 'pindev')
        }
      }
    })

    fetch(`/api/pins/${pinId}/comments?limit=${LIMIT}&offset=0`)
      .then((r) => r.json())
      .then((d) => {
        setComments(d.comments ?? [])
        setHasMore(d.hasMore ?? false)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [pinId])

  // ── Load more comments ────────────────────────────────────────────────────

  const loadMore = useCallback(async () => {
    if (loadingMore) return
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/pins/${pinId}/comments?limit=${LIMIT}&offset=${offset}`)
      const d = await res.json()
      setComments((prev) => {
        const ids = new Set(prev.map((c) => c.id))
        return [...prev, ...(d.comments ?? []).filter((c: Comment) => !ids.has(c.id))]
      })
      setHasMore(d.hasMore ?? false)
      setOffset((prev) => prev + LIMIT)
    } catch {
      // silently fail — user can retry
    } finally {
      setLoadingMore(false)
    }
  }, [pinId, offset, loadingMore])

  // ── Submit comment ────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    setPostError(null)
    setSessionExpired(false)

    // Optimistic comment — uses a temp id prefix so we can replace it on success
    const tempId = `__temp__${Date.now()}`
    const optimistic: Comment = {
      id:         tempId,
      pin_id:     pinId,
      body:       trimmedBody,
      created_at: new Date().toISOString(),
      profile:    currentProfile ?? { username: '', display_name: '', avatar_url: null },
    }
    setComments((prev) => [optimistic, ...prev])

    try {
      const res = await fetch(`/api/pins/${pinId}/comments`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ body: trimmedBody }),
      })

      const data = await res.json()

      if (res.ok) {
        // Replace optimistic entry with the real comment from the server
        setComments((prev) =>
          prev.map((c) => (c.id === tempId ? (data.comment as Comment) : c))
        )
        setBody('')
        textareaRef.current?.focus()
      } else {
        // Remove the optimistic entry
        setComments((prev) => prev.filter((c) => c.id !== tempId))

        if (res.status === 401) {
          setSessionExpired(true)
        } else {
          setPostError(data.error ?? 'Failed to post comment. Please try again.')
        }
      }
    } catch {
      setComments((prev) => prev.filter((c) => c.id !== tempId))
      setPostError('Network error. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Delete comment ────────────────────────────────────────────────────────

  async function handleDelete(commentId: string) {
    setDeletingId(commentId)

    // Snapshot for rollback
    const snapshot = [...comments]
    setComments((prev) => prev.filter((c) => c.id !== commentId))

    try {
      const res = await fetch(`/api/pins/${pinId}/comments/${commentId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        // Restore the comment on failure
        setComments(snapshot)
      }
    } catch {
      setComments(snapshot)
    } finally {
      setDeletingId(null)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const visibleCount = comments.length

  return (
    <section
      style={{
        marginTop: 40,
        paddingTop: 32,
        borderTop: '1.5px solid var(--border)',
        width: '100%',
      }}
    >
      {/* Section header */}
      <p
        style={{
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: 'var(--muted)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          margin: '0 0 20px',
        }}
      >
        Comments{visibleCount > 0 ? ` (${visibleCount}${hasMore ? '+' : ''})` : ''}
      </p>

      {/* ── Composer ── */}
      {currentUserId === undefined ? null : currentUserId ? (
        <form onSubmit={handleSubmit} style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <AvatarCircle profile={currentProfile} size={36} />

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ position: 'relative' }}>
                <textarea
                  ref={textareaRef}
                  value={body}
                  onChange={(e) => {
                    if (e.target.value.length <= 1000) setBody(e.target.value)
                  }}
                  placeholder="Leave a comment…"
                  rows={3}
                  disabled={submitting}
                  style={{
                    width: '100%',
                    resize: 'vertical',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1.5px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '0.9375rem',
                    fontFamily: 'inherit',
                    lineHeight: 1.5,
                    outline: 'none',
                    transition: 'border-color 150ms',
                    boxSizing: 'border-box',
                    opacity: submitting ? 0.7 : 1,
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--menthe)' }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--border)' }}
                />
              </div>

              {/* Character counter — shown when nearing limit */}
              {charCount > 800 && (
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.75rem',
                    color: charCount >= 1000 ? '#ef4444' : 'var(--muted-light)',
                    textAlign: 'right',
                  }}
                >
                  {charCount} / 1000
                </p>
              )}

              {/* Error messages */}
              {sessionExpired && (
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#ef4444' }}>
                  Your session expired.{' '}
                  <Link
                    href={`/login?next=/pin/${pinId}`}
                    style={{ color: 'var(--menthe)', textDecoration: 'underline' }}
                  >
                    Log in again
                  </Link>{' '}
                  to continue.
                </p>
              )}
              {postError && (
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#ef4444' }}>
                  {postError}
                </p>
              )}

              {/* Submit row */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  style={{
                    padding: '9px 20px',
                    borderRadius: 12,
                    border: 'none',
                    background: canSubmit ? 'var(--menthe)' : 'var(--border)',
                    color: canSubmit ? '#fff' : 'var(--muted)',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    cursor: canSubmit ? 'pointer' : 'not-allowed',
                    transition: 'background 150ms, opacity 150ms',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    opacity: submitting ? 0.8 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (canSubmit) e.currentTarget.style.opacity = '0.85'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1'
                  }}
                >
                  {submitting && (
                    <span
                      style={{
                        width: 13,
                        height: 13,
                        borderRadius: '50%',
                        border: '2px solid rgba(255,255,255,0.35)',
                        borderTopColor: '#fff',
                        animation: 'spin .7s linear infinite',
                        display: 'inline-block',
                      }}
                    />
                  )}
                  {submitting ? 'Posting…' : 'Post comment'}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        /* Not logged in */
        <div
          style={{
            background: 'var(--surface)',
            border: '1.5px solid var(--border)',
            borderRadius: 12,
            padding: '14px 18px',
            marginBottom: 24,
          }}
        >
          <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--muted)' }}>
            <Link
              href={`/login?next=/pin/${pinId}`}
              style={{ color: 'var(--menthe)', fontWeight: 600, textDecoration: 'none' }}
            >
              Log in
            </Link>
            {' '}to leave a comment.
          </p>
        </div>
      )}

      {/* ── Comment list ── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div
                className="skeleton"
                style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }}
              />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="skeleton" style={{ height: 12, width: '30%', borderRadius: 6 }} />
                <div className="skeleton" style={{ height: 12, width: '80%', borderRadius: 6 }} />
                <div className="skeleton" style={{ height: 12, width: '60%', borderRadius: 6 }} />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p style={{ fontSize: '0.9375rem', color: 'var(--muted)', margin: 0 }}>
          No comments yet.{currentUserId ? ' Be the first!' : ''}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {comments.map((comment) => {
            const isOwn = currentProfile?.username === comment.profile.username
            const isDeleting = deletingId === comment.id
            const isTemp = comment.id.startsWith('__temp__')

            return (
              <div
                key={comment.id}
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  opacity: isDeleting || isTemp ? 0.5 : 1,
                  transition: 'opacity 150ms',
                }}
              >
                <AvatarCircle profile={comment.profile} size={36} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Author row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <Link
                      href={`/profile/${comment.profile.username}`}
                      style={{ textDecoration: 'none' }}
                    >
                      <span
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          color: 'var(--text)',
                        }}
                      >
                        {comment.profile.display_name || comment.profile.username}
                      </span>
                    </Link>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
                      @{comment.profile.username}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted-light)' }}>
                      ·
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted-light)' }}>
                      {formatRelativeTime(comment.created_at)}
                    </span>

                    {/* Delete button — author or admin, not shown on optimistic entries */}
                    {(isOwn || isAdmin) && !isTemp && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        disabled={isDeleting}
                        title="Delete comment"
                        style={{
                          marginLeft: 'auto',
                          background: 'transparent',
                          border: 'none',
                          cursor: isDeleting ? 'default' : 'pointer',
                          padding: '2px 4px',
                          color: 'var(--muted-light)',
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: 6,
                          transition: 'color 150ms',
                        }}
                        onMouseEnter={(e) => {
                          if (!isDeleting) e.currentTarget.style.color = '#ef4444'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--muted-light)'
                        }}
                      >
                        {/* Trash icon */}
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Body */}
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.9375rem',
                      color: 'var(--text)',
                      lineHeight: 1.6,
                      wordBreak: 'break-word',
                    }}
                  >
                    {comment.body}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Load more */}
      {hasMore && !loading && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          style={{
            marginTop: 20,
            display: 'block',
            width: '100%',
            padding: '10px 0',
            background: 'transparent',
            border: '1.5px solid var(--border)',
            borderRadius: 12,
            color: 'var(--muted)',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: loadingMore ? 'default' : 'pointer',
            transition: 'border-color 150ms, color 150ms',
          }}
          onMouseEnter={(e) => {
            if (!loadingMore) {
              e.currentTarget.style.borderColor = 'var(--menthe)'
              e.currentTarget.style.color = 'var(--menthe)'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.color = 'var(--muted)'
          }}
        >
          {loadingMore ? 'Loading…' : 'Load more comments'}
        </button>
      )}
    </section>
  )
}
