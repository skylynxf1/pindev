'use client'

import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────────────────────

type CommentAuthor = {
  username: string
  display_name: string
  avatar_url: string | null
}

type Comment = {
  id: string
  pin_id: string
  body: string
  created_at: string
  parent_comment_id: string | null
  profile: CommentAuthor
  like_count: number
  reply_count: number
  user_liked: boolean
}

type SortOption = 'most_relevant' | 'most_liked' | 'newest' | 'oldest'

const SORT_LABELS: Record<SortOption, string> = {
  most_relevant: 'Most relevant',
  most_liked:    'Most liked',
  newest:        'Newest',
  oldest:        'Oldest',
}

const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp,image/gif'

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

function AvatarCircle({ profile, size = 32 }: { profile: CommentAuthor | null; size?: number }) {
  const initials = profile
    ? (profile.display_name || profile.username).charAt(0).toUpperCase()
    : '?'

  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--brume)', color: 'var(--menthe)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
      {profile?.avatar_url ? (
        <Image src={profile.avatar_url} alt={profile.display_name || profile.username} width={size} height={size} style={{ width: '100%', height: '100%', objectFit: 'cover' }} unoptimized />
      ) : initials}
    </div>
  )
}

function HeartIcon({ filled, size = 14 }: { filled: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

// ── Simple Emoji Picker ──────────────────────────────────────────────────────

const EMOJI_LIST = ['😀','😂','😍','🥰','😎','🤩','🔥','❤️','👍','👏','🎉','💯','🚀','✨','💡','🙌','👀','💪','🤔','😅','🥳','💻','⚡','🌟','🙏','😊','🤯','💜','💙','🫡']

function EmojiPicker({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        bottom: '100%',
        right: 0,
        marginBottom: 6,
        background: 'var(--bg)',
        border: '1.5px solid var(--border)',
        borderRadius: 12,
        padding: 8,
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: 2,
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        zIndex: 20,
        width: 220,
      }}
    >
      {EMOJI_LIST.map(emoji => (
        <button
          key={emoji}
          type="button"
          onClick={() => { onSelect(emoji); onClose() }}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '1.125rem',
            cursor: 'pointer',
            padding: 4,
            borderRadius: 6,
            lineHeight: 1,
            transition: 'background 100ms',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--brume)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          {emoji}
        </button>
      ))}
    </div>
  )
}

// ── Inline Reply Input ────────────────────────────────────────────────────────

function InlineReplyInput({
  pinId,
  parentId,
  currentProfile,
  onReplyPosted,
  onCancel,
}: {
  pinId: string
  parentId: string
  currentProfile: CommentAuthor | null
  onReplyPosted: (reply: Comment) => void
  onCancel: () => void
}) {
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const trimmedBody = body.trim()
  const canSubmit = trimmedBody.length >= 3 && !submitting

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/pins/${pinId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: trimmedBody, parent_comment_id: parentId }),
      })
      const data = await res.json()
      if (res.ok) onReplyPosted(data.comment as Comment)
      else setError(data.error ?? 'Failed to post reply.')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 8, marginLeft: 40 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <AvatarCircle profile={currentProfile} size={24} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--brume)', borderRadius: 20, padding: '6px 6px 6px 12px', gap: 6 }}>
          <input
            ref={inputRef}
            value={body}
            onChange={(e) => { if (e.target.value.length <= 1000) setBody(e.target.value) }}
            placeholder="Reply…"
            disabled={submitting}
            style={{ flex: 1, border: 'none', background: 'transparent', color: 'var(--text)', fontSize: '0.8125rem', fontFamily: 'inherit', outline: 'none', padding: 0, minWidth: 0 }}
            onKeyDown={(e) => { if (e.key === 'Escape') onCancel() }}
          />
          {canSubmit && (
            <button
              type="submit"
              style={{ background: 'var(--menthe)', color: '#fff', border: 'none', borderRadius: 16, padding: '5px 12px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              {submitting ? '…' : 'Reply'}
            </button>
          )}
        </div>
      </div>
      {error && <p style={{ margin: '4px 0 0 32px', fontSize: '0.75rem', color: '#ef4444' }}>{error}</p>}
    </form>
  )
}

// ── Exported handle for parent to scroll/focus ───────────────────────────────

export interface CommentSectionHandle {
  scrollToComments: () => void
}

// ── Main Component ────────────────────────────────────────────────────────────

interface CommentSectionProps {
  pinId: string
  pinOwnerId?: string
}

const LIMIT = 30

const CommentSection = forwardRef<CommentSectionHandle, CommentSectionProps>(function CommentSection({ pinId, pinOwnerId }, ref) {
  const [comments, setComments]              = useState<Comment[]>([])
  const [replies, setReplies]                = useState<Comment[]>([])
  const [loading, setLoading]                = useState(true)
  const [submitting, setSubmitting]          = useState(false)
  const [body, setBody]                      = useState('')
  const [postError, setPostError]            = useState<string | null>(null)
  const [sessionExpired, setSessionExpired]  = useState(false)
  const [currentUserId, setCurrentUserId]    = useState<string | null | undefined>(undefined)
  const [currentProfile, setCurrentProfile]  = useState<CommentAuthor | null>(null)
  const [hasMore, setHasMore]                = useState(false)
  const [offset, setOffset]                  = useState(LIMIT)
  const [loadingMore, setLoadingMore]        = useState(false)
  const [deletingId, setDeletingId]          = useState<string | null>(null)
  const [isAdmin, setIsAdmin]                = useState(false)
  const [sortBy, setSortBy]                  = useState<SortOption>('most_relevant')
  const [totalCount, setTotalCount]          = useState(0)
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set())
  const [replyingTo, setReplyingTo]          = useState<string | null>(null)
  const [likingIds, setLikingIds]            = useState<Set<string>>(new Set())
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [collapsed, setCollapsed]            = useState(true)
  const [showEmoji, setShowEmoji]            = useState(false)
  const [imageFile, setImageFile]            = useState<File | null>(null)
  const [imagePreview, setImagePreview]      = useState<string | null>(null)
  const [imageError, setImageError]          = useState<string | null>(null)
  const [uploading, setUploading]            = useState(false)

  const inputRef    = useRef<HTMLInputElement>(null)
  const sectionRef  = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const trimmedBody = body.trim()
  const hasText     = trimmedBody.length > 0
  const canSubmit   = (trimmedBody.length >= 3 || imageFile !== null) && !submitting && !uploading

  // Expose scrollToComments to parent
  useImperativeHandle(ref, () => ({
    scrollToComments: () => {
      setCollapsed(false)
      setTimeout(() => {
        sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        inputRef.current?.focus()
      }, 50)
    },
  }))

  // ── Fetch auth ────────────────────────────────────────────────────────────

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null
      setCurrentUserId(uid)
      if (uid) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, display_name, avatar_url')
          .eq('id', uid)
          .single()
        if (profile) {
          setCurrentProfile({ username: profile.username ?? '', display_name: profile.display_name ?? '', avatar_url: profile.avatar_url ?? null })
          setIsAdmin(profile.username === 'pindev')
        }
      }
    })
  }, [])

  // ── Fetch comments ────────────────────────────────────────────────────────

  const fetchComments = useCallback(async (sort: SortOption, newOffset = 0) => {
    if (newOffset === 0) setLoading(true)
    try {
      const res = await fetch(`/api/pins/${pinId}/comments?limit=${LIMIT}&offset=${newOffset}&sort=${sort}`)
      const d = await res.json()
      if (newOffset === 0) { setComments(d.comments ?? []); setReplies(d.replies ?? []) }
      else {
        setComments(prev => { const ids = new Set(prev.map(c => c.id)); return [...prev, ...(d.comments ?? []).filter((c: Comment) => !ids.has(c.id))] })
        setReplies(prev => { const ids = new Set(prev.map(c => c.id)); return [...prev, ...(d.replies ?? []).filter((c: Comment) => !ids.has(c.id))] })
      }
      setHasMore(d.hasMore ?? false)
      setTotalCount(d.totalCount ?? 0)
      setOffset(newOffset + LIMIT)
    } catch { /* silently fail */ }
    finally { setLoading(false); setLoadingMore(false) }
  }, [pinId])

  useEffect(() => { fetchComments(sortBy) }, [sortBy, fetchComments])

  const loadMore = useCallback(async () => {
    if (loadingMore) return
    setLoadingMore(true)
    fetchComments(sortBy, offset)
  }, [sortBy, offset, loadingMore, fetchComments])

  // ── Like / Unlike ──────────────────────────────────────────────────────────

  async function handleToggleLike(commentId: string, currentlyLiked: boolean) {
    if (!currentUserId || likingIds.has(commentId)) return
    setLikingIds(prev => new Set(prev).add(commentId))

    const updateLike = (list: Comment[]) => list.map(c => c.id === commentId ? { ...c, user_liked: !currentlyLiked, like_count: c.like_count + (currentlyLiked ? -1 : 1) } : c)
    setComments(updateLike)
    setReplies(updateLike)

    try {
      const res = await fetch(`/api/pins/${pinId}/comments/${commentId}/like`, { method: currentlyLiked ? 'DELETE' : 'POST' })
      if (!res.ok) { const revert = (list: Comment[]) => list.map(c => c.id === commentId ? { ...c, user_liked: currentlyLiked, like_count: c.like_count + (currentlyLiked ? 1 : -1) } : c); setComments(revert); setReplies(revert) }
    } catch { const revert = (list: Comment[]) => list.map(c => c.id === commentId ? { ...c, user_liked: currentlyLiked, like_count: c.like_count + (currentlyLiked ? 1 : -1) } : c); setComments(revert); setReplies(revert) }
    finally { setLikingIds(prev => { const next = new Set(prev); next.delete(commentId); return next }) }
  }

  // ── Image handling ─────────────────────────────────────────────────────────

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setImageError(null)
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setImageError('Only JPEG, PNG, WebP, and GIF images are allowed.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError('Image must be under 5 MB.')
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function clearImage() {
    setImageFile(null)
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(null)
    setImageError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    setPostError(null)
    setSessionExpired(false)

    let commentBody = trimmedBody

    // Upload image if attached
    if (imageFile) {
      setUploading(true)
      try {
        const formData = new FormData()
        formData.append('image', imageFile)
        const uploadRes = await fetch(`/api/pins/${pinId}/comments/upload`, { method: 'POST', body: formData })
        const uploadData = await uploadRes.json()
        if (!uploadRes.ok) {
          setPostError(uploadData.error ?? 'Failed to upload image.')
          setSubmitting(false)
          setUploading(false)
          return
        }
        // Append image URL to comment body
        commentBody = commentBody ? `${commentBody}\n${uploadData.url}` : uploadData.url
      } catch {
        setPostError('Failed to upload image.')
        setSubmitting(false)
        setUploading(false)
        return
      } finally {
        setUploading(false)
      }
    }

    if (commentBody.trim().length < 3) {
      setPostError('Comment must be at least 3 characters.')
      setSubmitting(false)
      return
    }

    const tempId = `__temp__${Date.now()}`
    const optimistic: Comment = {
      id: tempId, pin_id: pinId, body: commentBody, created_at: new Date().toISOString(),
      parent_comment_id: null, profile: currentProfile ?? { username: '', display_name: '', avatar_url: null },
      like_count: 0, reply_count: 0, user_liked: false,
    }
    setComments(prev => [...prev, optimistic])
    setTotalCount(prev => prev + 1)

    try {
      const res = await fetch(`/api/pins/${pinId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: commentBody }),
      })
      const data = await res.json()
      if (res.ok) {
        setComments(prev => prev.map(c => (c.id === tempId ? (data.comment as Comment) : c)))
        setBody('')
        clearImage()
      } else {
        setComments(prev => prev.filter(c => c.id !== tempId))
        setTotalCount(prev => prev - 1)
        if (res.status === 401) setSessionExpired(true)
        else setPostError(data.error ?? 'Failed to post comment.')
      }
    } catch {
      setComments(prev => prev.filter(c => c.id !== tempId))
      setTotalCount(prev => prev - 1)
      setPostError('Network error.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleDelete(commentId: string) {
    setDeletingId(commentId)
    const snapshotComments = [...comments]
    const snapshotReplies = [...replies]
    const isTopLevel = comments.some(c => c.id === commentId)

    if (isTopLevel) {
      setComments(prev => prev.filter(c => c.id !== commentId))
      setReplies(prev => prev.filter(r => r.parent_comment_id !== commentId))
      setTotalCount(prev => prev - 1)
    } else {
      const reply = replies.find(r => r.id === commentId)
      setReplies(prev => prev.filter(r => r.id !== commentId))
      if (reply?.parent_comment_id) setComments(prev => prev.map(c => c.id === reply.parent_comment_id ? { ...c, reply_count: Math.max(0, c.reply_count - 1) } : c))
    }

    try {
      const res = await fetch(`/api/pins/${pinId}/comments/${commentId}`, { method: 'DELETE' })
      if (!res.ok) { setComments(snapshotComments); setReplies(snapshotReplies); if (isTopLevel) setTotalCount(prev => prev + 1) }
    } catch { setComments(snapshotComments); setReplies(snapshotReplies); if (isTopLevel) setTotalCount(prev => prev + 1) }
    finally { setDeletingId(null) }
  }

  function handleReplyPosted(reply: Comment) {
    setReplies(prev => [...prev, reply])
    setComments(prev => prev.map(c => c.id === reply.parent_comment_id ? { ...c, reply_count: c.reply_count + 1 } : c))
    setReplyingTo(null)
    setExpandedReplies(prev => new Set(prev).add(reply.parent_comment_id!))
  }

  function toggleReplies(commentId: string) {
    setExpandedReplies(prev => { const next = new Set(prev); if (next.has(commentId)) next.delete(commentId); else next.add(commentId); return next })
  }

  function getRepliesFor(commentId: string) {
    return replies.filter(r => r.parent_comment_id === commentId)
  }

  // ── Render comment body with inline images ─────────────────────────────────

  function renderBody(text: string, fontSize: string) {
    // Split body into lines; if a line is a full image URL, render as image
    const lines = text.split('\n')
    const elements: React.ReactNode[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (/^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(line)) {
        elements.push(
          <Image
            key={i}
            src={line}
            alt="Comment image"
            width={300}
            height={200}
            style={{ maxWidth: '100%', height: 'auto', borderRadius: 10, marginTop: 6, display: 'block' }}
            unoptimized
          />
        )
      } else if (line) {
        elements.push(<span key={i}>{line}</span>)
        if (i < lines.length - 1 && !/^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(lines[i + 1]?.trim())) {
          elements.push(<br key={`br-${i}`} />)
        }
      }
    }

    return (
      <div style={{ margin: 0, fontSize, color: 'var(--text)', lineHeight: 1.5, wordBreak: 'break-word' }}>
        {elements}
      </div>
    )
  }

  // ── Render single comment ──────────────────────────────────────────────────

  function renderComment(comment: Comment, isReply = false) {
    const isOwn = currentProfile?.username === comment.profile.username
    const isPinOwner = !!currentUserId && !!pinOwnerId && currentUserId === pinOwnerId
    const canDelete = (isOwn || isPinOwner || isAdmin) && !comment.id.startsWith('__temp__')
    const isDeleting = deletingId === comment.id
    const isTemp = comment.id.startsWith('__temp__')
    const isConfirming = confirmDeleteId === comment.id
    const commentReplies = isReply ? [] : getRepliesFor(comment.id)
    const isExpanded = expandedReplies.has(comment.id)
    const isReplying = replyingTo === comment.id

    return (
      <div key={comment.id} style={{ marginLeft: isReply ? 40 : 0 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', opacity: isDeleting || isTemp ? 0.5 : 1, transition: 'opacity 150ms' }}>
          <AvatarCircle profile={comment.profile} size={isReply ? 24 : 32} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ margin: 0, fontSize: isReply ? '0.8125rem' : '0.875rem', color: 'var(--text)', lineHeight: 1.5, wordBreak: 'break-word' }}>
              <Link href={`/profile/${comment.profile.username}`} style={{ textDecoration: 'none', fontWeight: 700, color: 'var(--text)', marginRight: 6 }}>
                {comment.profile.display_name || comment.profile.username}
              </Link>
              {renderBody(comment.body, isReply ? '0.8125rem' : '0.875rem')}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 3 }}>
              <span style={{ fontSize: '0.6875rem', color: 'var(--muted-light)', fontWeight: 500 }}>
                {formatRelativeTime(comment.created_at)}
              </span>
              {!isTemp && (
                <button onClick={() => handleToggleLike(comment.id, comment.user_liked)} disabled={!currentUserId}
                  style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'transparent', border: 'none', padding: 0, cursor: currentUserId ? 'pointer' : 'default', color: comment.user_liked ? '#ef4444' : 'var(--muted-light)', fontSize: '0.6875rem', fontWeight: 600, transition: 'color 150ms' }}
                  onMouseEnter={(e) => { if (currentUserId && !comment.user_liked) e.currentTarget.style.color = '#ef4444' }}
                  onMouseLeave={(e) => { if (!comment.user_liked) e.currentTarget.style.color = 'var(--muted-light)' }}
                >
                  <HeartIcon filled={comment.user_liked} size={11} />
                  {comment.like_count > 0 && <span>{comment.like_count}</span>}
                </button>
              )}
              {!isReply && !isTemp && currentUserId && (
                <button onClick={() => setReplyingTo(isReplying ? null : comment.id)}
                  style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: isReplying ? 'var(--menthe)' : 'var(--muted-light)', fontSize: '0.6875rem', fontWeight: 600, transition: 'color 150ms' }}
                  onMouseEnter={(e) => { if (!isReplying) e.currentTarget.style.color = 'var(--text)' }}
                  onMouseLeave={(e) => { if (!isReplying) e.currentTarget.style.color = 'var(--muted-light)' }}
                >Reply</button>
              )}
              {canDelete && (
                <div style={{ marginLeft: 'auto', position: 'relative' }}>
                  {isConfirming ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '5px 10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text)', fontWeight: 600, whiteSpace: 'nowrap' }}>Delete?</span>
                      <button onClick={() => { setConfirmDeleteId(null); handleDelete(comment.id) }}
                        style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '2px 8px', fontSize: '0.6875rem', fontWeight: 700, cursor: 'pointer' }}
                      >Yes</button>
                      <button onClick={() => setConfirmDeleteId(null)}
                        style={{ background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px', fontSize: '0.6875rem', fontWeight: 600, cursor: 'pointer' }}
                      >No</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDeleteId(comment.id)} disabled={isDeleting}
                      style={{ background: 'transparent', border: 'none', padding: 0, cursor: isDeleting ? 'default' : 'pointer', color: 'var(--muted-light)', fontSize: '0.6875rem', fontWeight: 600, transition: 'color 150ms' }}
                      onMouseEnter={(e) => { if (!isDeleting) e.currentTarget.style.color = '#ef4444' }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted-light)' }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {!isReply && commentReplies.length > 0 && (
          <button onClick={() => toggleReplies(comment.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', padding: '4px 0', marginLeft: 42, cursor: 'pointer', color: 'var(--muted)', fontSize: '0.75rem', fontWeight: 600, transition: 'color 150ms' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--menthe)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)' }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms ease' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
            {isExpanded ? 'Hide replies' : `View ${commentReplies.length} ${commentReplies.length === 1 ? 'reply' : 'replies'}`}
          </button>
        )}

        {!isReply && isExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
            {commentReplies.map(r => renderComment(r, true))}
          </div>
        )}

        {!isReply && isReplying && (
          <InlineReplyInput pinId={pinId} parentId={comment.id} currentProfile={currentProfile} onReplyPosted={handleReplyPosted} onCancel={() => setReplyingTo(null)} />
        )}
      </div>
    )
  }

  // ── Main Render ────────────────────────────────────────────────────────────

  const displayCount = totalCount > 0 ? totalCount : comments.length

  return (
    <section ref={sectionRef} style={{ width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: collapsed ? 0 : 12 }}>
        <button onClick={() => setCollapsed(!collapsed)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}>
          <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text)' }}>
            {displayCount > 0 ? `${displayCount} Comment${displayCount !== 1 ? 's' : ''}` : 'Comments'}
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 200ms ease' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {!collapsed && displayCount > 1 && (
          <div style={{ display: 'flex', gap: 4 }}>
            {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setSortBy(value)}
                style={{
                  background: sortBy === value ? 'var(--text)' : 'transparent',
                  color: sortBy === value ? '#fff' : 'var(--muted)',
                  border: sortBy === value ? 'none' : '1px solid var(--border)',
                  borderRadius: 16,
                  padding: '4px 10px',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 150ms',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => { if (sortBy !== value) { e.currentTarget.style.borderColor = 'var(--muted)'; e.currentTarget.style.color = 'var(--text)' } }}
                onMouseLeave={(e) => { if (sortBy !== value) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' } }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Preview: show top comment when collapsed */}
      {collapsed && !loading && comments.length > 0 && (
        <div style={{ marginTop: 8, marginBottom: 4 }}>
          {renderComment(comments[0])}
        </div>
      )}

      {/* Expanded: scrollable comment list */}
      {!collapsed && (
        <>
          <div style={{ maxHeight: 'calc(100vh - 340px)', minHeight: 120, overflowY: 'auto', paddingRight: 4, scrollbarWidth: 'thin' }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div className="skeleton" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <div className="skeleton" style={{ height: 10, width: '35%', borderRadius: 5 }} />
                      <div className="skeleton" style={{ height: 10, width: '75%', borderRadius: 5 }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : comments.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: '0 0 16px' }}>
                No comments yet.{currentUserId ? ' Be the first!' : ''}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {comments.map(comment => renderComment(comment))}
              </div>
            )}

            {/* Load more */}
            {hasMore && !loading && (
              <button onClick={loadMore} disabled={loadingMore}
                style={{ marginTop: 14, display: 'block', width: '100%', padding: '8px 0', background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: '0.8125rem', fontWeight: 600, cursor: loadingMore ? 'default' : 'pointer', transition: 'color 150ms' }}
                onMouseEnter={(e) => { if (!loadingMore) e.currentTarget.style.color = 'var(--menthe)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)' }}
              >
                {loadingMore ? 'Loading…' : 'Load more comments'}
              </button>
            )}
          </div>
        </>
      )}

      {/* ── Composer — always at the bottom ── */}
      <div>
        {currentUserId === undefined ? null : currentUserId ? (
          <form onSubmit={handleSubmit}>
            {/* Image preview */}
            {imagePreview && (
              <div style={{ marginBottom: 8, position: 'relative', display: 'inline-block' }}>
                <Image src={imagePreview} alt="Preview" width={120} height={80} style={{ borderRadius: 8, objectFit: 'cover', display: 'block' }} unoptimized />
                <button type="button" onClick={clearImage}
                  style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: 'var(--text)', color: '#fff', border: 'none', fontSize: '0.6875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                >×</button>
              </div>
            )}

            {/* Errors */}
            {sessionExpired && (
              <p style={{ margin: '0 0 6px', fontSize: '0.8125rem', color: '#ef4444' }}>
                Session expired. <Link href={`/login?next=/pin/${pinId}`} style={{ color: 'var(--menthe)', textDecoration: 'underline' }}>Log in again</Link>
              </p>
            )}
            {(postError || imageError) && (
              <p style={{ margin: '0 0 6px', fontSize: '0.8125rem', color: '#ef4444' }}>{postError || imageError}</p>
            )}

            {/* Input row */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <AvatarCircle profile={currentProfile} size={32} />
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--brume)', borderRadius: 22, padding: '8px 8px 8px 14px', gap: 4, position: 'relative', transition: 'background 150ms' }}>
                <input
                  ref={inputRef}
                  value={body}
                  onChange={(e) => { if (e.target.value.length <= 1000) { setBody(e.target.value); setPostError(null) } }}
                  placeholder="Add a comment…"
                  disabled={submitting || uploading}
                  style={{ flex: 1, border: 'none', background: 'transparent', color: 'var(--text)', fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none', padding: 0, minWidth: 0 }}
                />

                {/* Action buttons — right side */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative' }}>
                  {/* Emoji — show when has text */}
                  {hasText && (
                    <button type="button" onClick={() => setShowEmoji(!showEmoji)} title="Emoji"
                      style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--muted)', display: 'flex', alignItems: 'center', transition: 'color 150ms', borderRadius: 8 }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                        <line x1="9" y1="9" x2="9.01" y2="9" />
                        <line x1="15" y1="9" x2="15.01" y2="9" />
                      </svg>
                    </button>
                  )}

                  {/* Image upload — show when has text */}
                  {hasText && (
                    <>
                      <input ref={fileInputRef} type="file" accept={ACCEPTED_IMAGE_TYPES} onChange={handleImageSelect} style={{ display: 'none' }} />
                      <button type="button" onClick={() => fileInputRef.current?.click()} title="Attach image"
                        style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', color: imageFile ? 'var(--menthe)' : 'var(--muted)', display: 'flex', alignItems: 'center', transition: 'color 150ms', borderRadius: 8 }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = imageFile ? 'var(--menthe)' : 'var(--muted)' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </button>
                    </>
                  )}

                  {/* Send */}
                  <button type="submit" disabled={!canSubmit} title="Send"
                    style={{ background: canSubmit ? 'var(--menthe)' : 'transparent', border: 'none', padding: 6, cursor: canSubmit ? 'pointer' : 'default', color: canSubmit ? '#fff' : 'var(--muted-light)', display: 'flex', alignItems: 'center', borderRadius: 14, transition: 'background 150ms, color 150ms' }}
                  >
                    {(submitting || uploading) ? (
                      <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', animation: 'spin .7s linear infinite', display: 'inline-block' }} />
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Emoji picker popup */}
                {showEmoji && (
                  <EmojiPicker
                    onSelect={(emoji) => {
                      setBody(prev => prev + emoji)
                      inputRef.current?.focus()
                    }}
                    onClose={() => setShowEmoji(false)}
                  />
                )}
              </div>
            </div>
          </form>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 20, background: 'var(--brume)' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
              <Link href={`/login?next=/pin/${pinId}`} style={{ color: 'var(--menthe)', fontWeight: 600, textDecoration: 'none' }}>Log in</Link>{' '}to comment
            </span>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </section>
  )
})

export default CommentSection
