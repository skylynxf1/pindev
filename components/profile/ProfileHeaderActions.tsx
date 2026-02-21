'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Profile } from '@/types'
import FollowListModal from './FollowListModal'

interface Props {
  profile: Profile
  pinCount: number
  boardCount: number
  followerCount: number
  followingCount: number
  isOwnProfile: boolean
  initialIsFollowing: boolean
  currentUserId: string | null
}

export default function ProfileHeaderActions({
  profile,
  pinCount,
  boardCount,
  followerCount: initialFollowerCount,
  followingCount,
  isOwnProfile,
  initialIsFollowing,
  currentUserId,
}: Props) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [followerCount, setFollowerCount] = useState(initialFollowerCount)
  const [loading, setLoading] = useState(false)
  const [activeModal, setActiveModal] = useState<'followers' | 'following' | null>(null)

  async function handleFollowToggle() {
    if (loading) return
    setLoading(true)

    const method = isFollowing ? 'DELETE' : 'POST'
    const nextFollowing = !isFollowing
    const nextCount = isFollowing ? followerCount - 1 : followerCount + 1

    // Optimistic update
    setIsFollowing(nextFollowing)
    setFollowerCount(nextCount)

    try {
      const res = await fetch(`/api/follow/${profile.username}`, { method })
      if (!res.ok) {
        // Revert on failure
        setIsFollowing(isFollowing)
        setFollowerCount(followerCount)
      }
    } catch {
      setIsFollowing(isFollowing)
      setFollowerCount(followerCount)
    } finally {
      setLoading(false)
    }
  }

  const divider = (
    <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
  )

  const pillStyle: React.CSSProperties = {
    padding: '8px 16px',
    textAlign: 'center',
    background: 'none',
    border: 'none',
    cursor: 'default',
  }

  const clickablePillStyle: React.CSSProperties = {
    ...pillStyle,
    cursor: 'pointer',
    transition: 'background 150ms',
  }

  const numberStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '1.125rem',
    fontWeight: 800,
    color: 'var(--text)',
    lineHeight: 1.2,
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: 'var(--muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        {/* Stats pills */}
        <div style={{
          display: 'inline-flex', alignItems: 'center',
          borderRadius: 12, overflow: 'hidden',
          background: 'rgba(255,255,255,0.7)',
          border: '1px solid var(--border)',
        }}>
          {/* Pins */}
          <div style={pillStyle}>
            <span style={numberStyle}>{pinCount}</span>
            <span style={labelStyle}>Pins</span>
          </div>

          {divider}

          {/* Boards */}
          <div style={pillStyle}>
            <span style={numberStyle}>{boardCount}</span>
            <span style={labelStyle}>Boards</span>
          </div>

          {divider}

          {/* Followers — clickable */}
          <button
            onClick={() => setActiveModal('followers')}
            style={clickablePillStyle}
            aria-label="View followers"
          >
            <span style={numberStyle}>{followerCount}</span>
            <span style={labelStyle}>Followers</span>
          </button>

          {divider}

          {/* Following — clickable */}
          <button
            onClick={() => setActiveModal('following')}
            style={clickablePillStyle}
            aria-label="View following"
          >
            <span style={numberStyle}>{followingCount}</span>
            <span style={labelStyle}>Following</span>
          </button>
        </div>

        {/* Action button */}
        {isOwnProfile ? (
          <Link
            href="/settings/profile"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 18px', borderRadius: 10,
              background: 'rgba(255,255,255,0.7)',
              border: '1px solid var(--border)',
              fontSize: '0.8125rem', fontWeight: 600,
              color: 'var(--text)', textDecoration: 'none',
              transition: 'all 150ms',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit profile
          </Link>
        ) : currentUserId ? (
          <button
            onClick={handleFollowToggle}
            disabled={loading}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 18px', borderRadius: 10,
              background: isFollowing ? 'var(--menthe)' : 'rgba(255,255,255,0.7)',
              border: isFollowing ? '1px solid var(--menthe)' : '1px solid var(--border)',
              fontSize: '0.8125rem', fontWeight: 600,
              color: isFollowing ? '#fff' : 'var(--text)',
              cursor: loading ? 'wait' : 'pointer',
              transition: 'all 150ms',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {isFollowing ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Following
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Follow
              </>
            )}
          </button>
        ) : (
          <Link
            href="/login"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 18px', borderRadius: 10,
              background: 'rgba(255,255,255,0.7)',
              border: '1px solid var(--border)',
              fontSize: '0.8125rem', fontWeight: 600,
              color: 'var(--text)', textDecoration: 'none',
              transition: 'all 150ms',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Follow
          </Link>
        )}
      </div>

      {/* Follow list modal */}
      {activeModal && (
        <FollowListModal
          type={activeModal}
          username={profile.username}
          isOwnProfile={isOwnProfile}
          onClose={() => setActiveModal(null)}
        />
      )}
    </>
  )
}
