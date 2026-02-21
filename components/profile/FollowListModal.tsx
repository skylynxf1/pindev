'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import ModalRoot from '@/components/modal/ModalRoot'
import type { FollowUser } from '@/types'

interface Props {
  type: 'followers' | 'following'
  username: string
  isOwnProfile: boolean
  onClose: () => void
}

export default function FollowListModal({ type, username, isOwnProfile, onClose }: Props) {
  const [users, setUsers] = useState<FollowUser[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const endpoint = type === 'followers'
        ? `/api/followers/${username}`
        : `/api/following/${username}`
      const res = await fetch(endpoint)
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [type, username])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  async function handleRemoveFollower(targetUsername: string) {
    setActionLoading(targetUsername)
    try {
      const res = await fetch(`/api/followers/${username}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: targetUsername }),
      })
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.username !== targetUsername))
      }
    } finally {
      setActionLoading(null)
    }
  }

  async function handleUnfollow(targetUsername: string) {
    setActionLoading(targetUsername)
    try {
      const res = await fetch(`/api/follow/${targetUsername}`, { method: 'DELETE' })
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.username !== targetUsername))
      }
    } finally {
      setActionLoading(null)
    }
  }

  async function handleBlock(targetUsername: string) {
    setActionLoading(targetUsername)
    try {
      const res = await fetch(`/api/block/${targetUsername}`, { method: 'POST' })
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.username !== targetUsername))
      }
    } finally {
      setActionLoading(null)
    }
  }

  const title = type === 'followers' ? 'Followers' : 'Following'

  return (
    <ModalRoot onClose={onClose}>
      <div style={{
        background: 'var(--bg)',
        borderRadius: 20,
        border: '1.5px solid var(--border)',
        width: '100%',
        maxWidth: 480,
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgb(0 0 0 / .18)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
        }}>
          <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 4, borderRadius: 6,
              color: 'var(--muted)', display: 'flex', alignItems: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ maxHeight: 420, overflowY: 'auto', padding: '8px 0' }}>
          {loading ? (
            <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.875rem' }}>
              Loading…
            </div>
          ) : users.length === 0 ? (
            <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.875rem' }}>
              {type === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
            </div>
          ) : (
            users.map(user => (
              <UserRow
                key={user.id}
                user={user}
                type={type}
                isOwnProfile={isOwnProfile}
                isActing={actionLoading === user.username}
                onRemoveFollower={handleRemoveFollower}
                onUnfollow={handleUnfollow}
                onBlock={handleBlock}
              />
            ))
          )}
        </div>
      </div>
    </ModalRoot>
  )
}

interface UserRowProps {
  user: FollowUser
  type: 'followers' | 'following'
  isOwnProfile: boolean
  isActing: boolean
  onRemoveFollower: (username: string) => void
  onUnfollow: (username: string) => void
  onBlock: (username: string) => void
}

function UserRow({ user, type, isOwnProfile, isActing, onRemoveFollower, onUnfollow, onBlock }: UserRowProps) {
  const displayName = user.display_name || user.username
  const initial = displayName.charAt(0).toUpperCase()

  const actionBtnStyle: React.CSSProperties = {
    padding: '5px 12px',
    borderRadius: 8,
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: isActing ? 'wait' : 'pointer',
    opacity: isActing ? 0.6 : 1,
    transition: 'all 150ms',
    border: '1px solid var(--border)',
    background: 'none',
    color: 'var(--text)',
    whiteSpace: 'nowrap',
  }

  const dangerBtnStyle: React.CSSProperties = {
    ...actionBtnStyle,
    color: '#e53e3e',
    borderColor: '#fed7d7',
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 24px',
      transition: 'background 150ms',
    }}>
      {/* Avatar */}
      <div style={{
        flexShrink: 0, width: 40, height: 40, borderRadius: '50%',
        background: 'var(--menthe)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1rem', fontWeight: 700, color: '#fff',
        overflow: 'hidden',
      }}>
        {user.avatar_url ? (
          <Image
            src={user.avatar_url}
            alt={displayName}
            width={40}
            height={40}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            unoptimized
          />
        ) : initial}
      </div>

      {/* Name / username */}
      <Link
        href={`/profile/${user.username}`}
        style={{ flex: 1, minWidth: 0, textDecoration: 'none' }}
        onClick={() => {/* modal stays open */}}
      >
        <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayName}
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>@{user.username}</span>
      </Link>

      {/* Actions (own profile only) */}
      {isOwnProfile && (
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {type === 'followers' && (
            <button
              onClick={() => onRemoveFollower(user.username)}
              disabled={isActing}
              style={actionBtnStyle}
            >
              Remove
            </button>
          )}
          {type === 'following' && (
            <button
              onClick={() => onUnfollow(user.username)}
              disabled={isActing}
              style={actionBtnStyle}
            >
              Unfollow
            </button>
          )}
          <button
            onClick={() => onBlock(user.username)}
            disabled={isActing}
            style={dangerBtnStyle}
          >
            Block
          </button>
        </div>
      )}
    </div>
  )
}
