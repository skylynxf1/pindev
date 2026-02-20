'use client'

import {
  useState,
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

/* ─────────────────────────────────────────────────────────────
   LOGO
   ───────────────────────────────────────────────────────────── */
function Logo() {
  return (
    <Link href="/" aria-label="PinDev — home" style={{ flexShrink: 0 }}>
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: '50%',
          background: 'var(--menthe)',
          boxShadow: '0 2px 8px rgb(53 200 180 / .35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ color: '#fff', fontWeight: 800, fontSize: '1.125rem', letterSpacing: '-0.05em', lineHeight: 1 }}>
          P
        </span>
      </div>
    </Link>
  )
}

/* ─────────────────────────────────────────────────────────────
   NAV TABS
   ───────────────────────────────────────────────────────────── */
function NavTabs({ pathname }: { pathname: string }) {
  const isHome = pathname === '/'
  const isCreate = pathname === '/create' || pathname === '/upload'

  const tabBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    height: 38,
    padding: '0 16px',
    borderRadius: 9999,
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    background: 'transparent',
    transition: 'background 120ms',
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    color: 'var(--text)',
  }

  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 2 }} aria-label="Main navigation">
      {/* Home */}
      <Link
        href="/"
        style={{
          ...tabBase,
          background: isHome ? 'var(--text)' : 'transparent',
          color: isHome ? '#fff' : 'var(--text)',
        }}
        onMouseEnter={e => { if (!isHome) (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)' }}
        onMouseLeave={e => { if (!isHome) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        Home
      </Link>

      {/* Create — direct link */}
      <Link
        href="/create"
        style={{
          ...tabBase,
          background: isCreate ? 'var(--text)' : 'transparent',
          color: isCreate ? '#fff' : 'var(--text)',
        }}
        onMouseEnter={e => { if (!isCreate) (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)' }}
        onMouseLeave={e => { if (!isCreate) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        Create
      </Link>
    </nav>
  )
}

/* ─────────────────────────────────────────────────────────────
   SEARCH BAR
   ───────────────────────────────────────────────────────────── */
function SearchBar({ autoFocus = false, onSubmit }: { autoFocus?: boolean; onSubmit?: () => void }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(searchParams.get('q') ?? '')
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (!isFocused) setValue(searchParams.get('q') ?? '')
  }, [searchParams, isFocused])

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  function navigate(raw: string) {
    const trimmed = raw.trim()
    const params = new URLSearchParams(searchParams.toString())
    if (trimmed) { params.set('q', trimmed) } else { params.delete('q') }
    router.push(`/search?${params.toString()}`)
    onSubmit?.()
  }

  function handleKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') navigate(value)
    if (e.key === 'Escape') {
      setValue('')
      inputRef.current?.blur()
      if (pathname === '/search') navigate('')
    }
  }

  function handleClear(e: React.MouseEvent) {
    e.preventDefault()
    setValue('')
    inputRef.current?.focus()
    if (pathname === '/search') navigate('')
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Search icon */}
      <span
        style={{
          position: 'absolute',
          left: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          color: isFocused ? 'var(--menthe)' : 'var(--muted-light)',
          pointerEvents: 'none',
          transition: 'color 150ms',
          display: 'flex',
          alignItems: 'center',
        }}
        aria-hidden="true"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
      </span>

      <input
        ref={inputRef}
        type="search"
        className="search-input"
        style={{
          paddingLeft: '2.75rem',
          paddingRight: value ? '2.5rem' : '1rem',
          height: 42,
          fontSize: '0.9rem',
        }}
        value={value}
        placeholder="Search for website designs, app mockups..."
        aria-label="Search PinDev"
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />

      {value && (
        <button
          type="button"
          onMouseDown={handleClear}
          aria-label="Clear search"
          style={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: 'var(--surface-2)',
            color: 'var(--muted)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   ICON BUTTON (Bell / Chat)
   ───────────────────────────────────────────────────────────── */
function IconBtn({ label, children, badge }: { label: string; children: React.ReactNode; badge?: boolean }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      aria-label={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        width: 38,
        height: 38,
        borderRadius: 10,
        border: 'none',
        background: hovered ? 'var(--surface-2)' : 'transparent',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--muted)',
        transition: 'background 120ms',
        flexShrink: 0,
      }}
    >
      {children}
      {badge && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 7,
            right: 7,
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#f05252',
            boxShadow: '0 0 0 1.5px white',
          }}
        />
      )}
    </button>
  )
}

/* ─────────────────────────────────────────────────────────────
   AVATAR + DROPDOWN MENU
   ───────────────────────────────────────────────────────────── */
function AvatarMenu({ user }: { user: User }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [profile, setProfile] = useState<{
    username: string
    display_name: string
    avatar_url: string | null
  } | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('id', user.id)
      .single()
      .then(({ data }) => { if (data) setProfile(data) })
  }, [user.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  async function signOut() {
    setOpen(false)
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const name = profile?.display_name || profile?.username || user.email?.split('@')[0] || 'Me'
  const initials = name.slice(0, 2).toUpperCase()

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 2 }}>
      {/* Avatar circle */}
      <div
        className="avatar"
        style={{
          width: 34,
          height: 34,
          fontSize: '.75rem',
          cursor: 'pointer',
          outline: open ? '2px solid var(--menthe)' : '2px solid transparent',
          outlineOffset: 2,
          transition: 'outline-color 150ms',
        }}
        onClick={() => setOpen(v => !v)}
      >
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          initials
        )}
      </div>

      {/* Chevron */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="menu"
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 2px',
          display: 'flex',
          alignItems: 'center',
          color: 'var(--muted)',
        }}
      >
        <svg
          width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transition: 'transform 200ms', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          className="animate-scale-in"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            zIndex: 50,
            width: 210,
            borderRadius: 14,
            border: '1px solid var(--border)',
            padding: 6,
            background: 'var(--bg)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {/* Profile snippet */}
          <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '10px 12px', marginBottom: 4 }}>
            <p style={{ fontSize: '.875rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
            {profile?.username && (
              <p style={{ fontSize: '.75rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{profile.username}</p>
            )}
          </div>

          {([
            {
              href: profile?.username ? `/profile/${profile.username}` : '/',
              label: 'My profile',
              icon: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
            },
            {
              href: '/saved',
              label: 'Saved pins',
              icon: <><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></>,
            },
            {
              href: '/create',
              label: 'Create pin',
              icon: <><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></>,
            },
            {
              href: '/settings/profile',
              label: 'Settings',
              icon: <><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></>,
            },
          ] as Array<{ href: string; label: string; icon: React.ReactNode }>).map(item => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)} role="menuitem" className="menu-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {item.icon}
              </svg>
              {item.label}
            </Link>
          ))}

          <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} role="separator"/>

          <button onClick={signOut} role="menuitem" className="menu-item danger">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   AUTH BUTTONS
   ───────────────────────────────────────────────────────────── */
function AuthButtons() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Link href="/login" className="btn btn-ghost" style={{ padding: '7px 18px' }}>
        Sign in
      </Link>
      <Link href="/signup" className="btn btn-primary" style={{ padding: '7px 18px' }}>
        Join free
      </Link>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   MOBILE SEARCH DRAWER
   ───────────────────────────────────────────────────────────── */
function MobileSearchDrawer({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="animate-fade-in"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        top: 'var(--header-h)',
        zIndex: 30,
        padding: '12px 16px',
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        boxShadow: 'var(--shadow-md)',
      }}
      role="search"
      aria-label="Mobile search"
    >
      <SearchBar autoFocus onSubmit={onClose} />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   MAIN HEADER
   ───────────────────────────────────────────────────────────── */
export default function Header() {
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [mobileSearch, setMobileSearch] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const supabase = createClient()

  // Detect mobile via JS (avoids Tailwind responsive class issues)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null)
      setAuthReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUser(session?.user ?? null)
      setAuthReady(true)
    })
    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const prevPath = useRef(pathname)
  useEffect(() => {
    if (pathname !== prevPath.current) {
      setMobileSearch(false)
      prevPath.current = pathname
    }
  }, [pathname])

  useEffect(() => {
    if (!mobileSearch) return
    const handler = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') setMobileSearch(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [mobileSearch])

  return (
    <>
      <header
        role="banner"
        className="glass-header"
        style={{ position: 'fixed', left: 0, right: 0, top: 0, zIndex: 40, height: 'var(--header-h)' }}
      >
        <div
          style={{
            maxWidth: 1800,
            margin: '0 auto',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0 24px',
          }}
        >
          {/* Logo */}
          <Logo />

          {/* Nav tabs — desktop only */}
          {!isMobile && <NavTabs pathname={pathname} />}

          {/* Search bar — desktop */}
          {!isMobile && (
            <div style={{ flex: 1, maxWidth: 680 }}>
              <SearchBar />
            </div>
          )}

          {/* Right rail */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
            {/* Mobile: search icon toggle */}
            {isMobile && (
              <button
                onClick={() => setMobileSearch(v => !v)}
                aria-label={mobileSearch ? 'Close search' : 'Open search'}
                style={{
                  width: 38, height: 38,
                  borderRadius: 10,
                  border: '1.5px solid var(--border)',
                  background: mobileSearch ? 'var(--menthe-light)' : 'transparent',
                  color: mobileSearch ? 'var(--menthe)' : 'var(--muted)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </button>
            )}

            {/* Auth area */}
            {!authReady ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="skeleton" style={{ height: 34, width: 64, borderRadius: 9999 }} />
                <div className="skeleton" style={{ height: 34, width: 34, borderRadius: '50%' }} />
              </div>
            ) : user ? (
              <>
                <AvatarMenu user={user} />
              </>
            ) : (
              <AuthButtons />
            )}
          </div>
        </div>
      </header>

      {mobileSearch && <MobileSearchDrawer onClose={() => setMobileSearch(false)} />}
    </>
  )
}
