'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import MasonryGrid from '@/components/feed/MasonryGrid'
import CategoryFilterBar, { type CategoryId } from '@/components/feed/CategoryFilterBar'
import { usePins } from '@/lib/hooks/usePins'
import { createClient } from '@/lib/supabase/client'
import type { Pin } from '@/types'

const CATEGORY_TAG_MAP: Record<string, string> = {
  website: 'website', web: 'website', landing: 'website',
  app: 'app', mobile: 'app', ios: 'app', android: 'app',
  'ai-tool': 'ai-tool', ai: 'ai-tool', ml: 'ai-tool', llm: 'ai-tool',
  vibecoding: 'vibecoding', 'vibe-coding': 'vibecoding', vibe: 'vibecoding',
}

function getPinCategory(pin: Pin): string | null {
  if (!pin.tags?.length) return null
  for (const tag of pin.tags) {
    const match = CATEGORY_TAG_MAP[tag.name.toLowerCase()]
    if (match) return match
  }
  return null
}

/* ─────────────────────────────────────────────────────────────
   AUTH GATE MODAL
   ───────────────────────────────────────────────────────────── */
function AuthModal({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(15,23,32,0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 24,
          padding: '48px 40px 40px',
          maxWidth: 420,
          width: '100%',
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {/* Logo */}
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'var(--menthe)',
          boxShadow: '0 4px 16px rgb(53 200 180 / .35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: '1.375rem', letterSpacing: '-0.05em', lineHeight: 1 }}>P</span>
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
          Welcome to PinDev
        </h2>
        <p style={{ fontSize: '0.9375rem', color: 'var(--muted)', margin: '0 0 32px', lineHeight: 1.55 }}>
          Discover live web & AI projects from builders around the world. Sign in to save, share, and create.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Link
            href="/signup"
            style={{
              display: 'block', padding: '14px 0',
              borderRadius: 14, border: 'none',
              background: 'var(--menthe)',
              color: '#fff', fontSize: '0.9375rem', fontWeight: 700,
              textDecoration: 'none', textAlign: 'center',
              boxShadow: '0 4px 16px rgb(53 200 180 / .3)',
              transition: 'opacity 150ms',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.88' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
          >
            Join free
          </Link>

          <Link
            href="/login"
            style={{
              display: 'block', padding: '13px 0',
              borderRadius: 14,
              border: '1.5px solid var(--border)',
              background: 'transparent',
              color: 'var(--text)', fontSize: '0.9375rem', fontWeight: 600,
              textDecoration: 'none', textAlign: 'center',
              transition: 'background 150ms',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            Sign in
          </Link>
        </div>

        <button
          onClick={onDismiss}
          style={{
            marginTop: 20, background: 'none', border: 'none',
            cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--muted)',
            padding: '4px 8px', borderRadius: 8,
            transition: 'color 150ms',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted)' }}
        >
          Browse as guest →
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   HOME PAGE
   ───────────────────────────────────────────────────────────── */
export default function HomePage() {
  const router = useRouter()
  const { pins, loading, hasMore, error, fetchNextPage, removePin, updatePin } = usePins()
  const [activeCategory, setActiveCategory] = useState<CategoryId>('all')
  const [authReady, setAuthReady] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined)
  const [authModalDismissed, setAuthModalDismissed] = useState(true)
  const [savedPinIds, setSavedPinIds] = useState<Set<string>>(new Set())

  const handleEmptyClick = useCallback(() => {
    if (isLoggedIn) {
      router.push('/upload')
    } else {
      setAuthModalDismissed(false)
    }
  }, [isLoggedIn, router])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const userId = data.user?.id
      setIsLoggedIn(!!userId)
      setCurrentUserId(userId)
      setAuthReady(true)
      if (userId) {
        fetch('/api/saved-pins?ids_only=true')
          .then(r => r.json())
          .then(d => setSavedPinIds(new Set(d.ids ?? [])))
          .catch(() => {})
      }
    })
  }, [])

  const filteredPins = useMemo(() => {
    if (activeCategory === 'all') return pins
    return pins.filter(pin => getPinCategory(pin) === activeCategory)
  }, [pins, activeCategory])

  const showAuthModal = authReady && !isLoggedIn && !authModalDismissed

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Sticky filter bar */}
      <div
        style={{
          position: 'sticky',
          top: 'var(--header-h)',
          zIndex: 30,
          background: 'var(--bg)',
          borderBottom: '1px solid var(--border)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div style={{ maxWidth: 1800, margin: '0 auto', padding: '0 24px' }}>
          <CategoryFilterBar active={activeCategory} onChange={setActiveCategory} />
        </div>
      </div>

      {/* Feed */}
      <div style={{ maxWidth: 1800, margin: '0 auto', padding: '24px 24px' }}>
        {error && (
          <div style={{
            marginBottom: 20, borderRadius: 16,
            border: '1px solid #fecaca', background: '#fef2f2',
            padding: '14px 20px', fontSize: '0.875rem', color: '#dc2626',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        <MasonryGrid
          pins={filteredPins}
          hasMore={hasMore}
          loading={loading}
          onLoadMore={fetchNextPage}
          onSave={() => setAuthModalDismissed(false)}
          onEmptyClick={handleEmptyClick}
          currentUserId={currentUserId}
          onDelete={removePin}
          onEdit={updatePin}
          savedPinIds={savedPinIds}
        />
      </div>

      {/* Auth gate modal */}
      {showAuthModal && <AuthModal onDismiss={() => setAuthModalDismissed(true)} />}
    </main>
  )
}
