'use client'

import {
  useState,
  useEffect,
  useRef,
  useCallback,
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
    <Link href="/" className="group flex items-center gap-2.5 flex-shrink-0" aria-label="PinDev — home">
      <div
        className="relative flex h-8 w-8 items-center justify-center rounded-[10px] flex-shrink-0 overflow-hidden"
        style={{ background: 'var(--menthe)', boxShadow: '0 2px 8px rgb(53 200 180 / .35)' }}
      >
        {/* Pin icon */}
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <circle cx="9" cy="6.5" r="2.8" fill="white"/>
          <path d="M9 9.5C9 9.5 5 12 5 14.5C5 15.5 6.5 15.5 9 15.5C11.5 15.5 13 15.5 13 14.5C13 12 9 9.5 9 9.5Z"
            fill="white" fillOpacity=".45"/>
          <line x1="9" y1="9.5" x2="9" y2="15.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        {/* Hover shimmer */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: 'linear-gradient(135deg, rgb(255 255 255 / .25) 0%, transparent 60%)' }}
        />
      </div>
      <span
        className="text-base font-extrabold tracking-tight transition-colors duration-150 group-hover:text-[--menthe]"
        style={{ color: 'var(--text)', letterSpacing: '-0.04em' }}
      >
        pin<span style={{ color: 'var(--menthe)' }}>dev</span>
      </span>
    </Link>
  )
}

/* ─────────────────────────────────────────────────────────────
   SEARCH BAR
   ───────────────────────────────────────────────────────────── */
interface SearchBarProps {
  autoFocus?: boolean
  onSubmit?: () => void
}

function SearchBar({ autoFocus = false, onSubmit }: SearchBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(searchParams.get('q') ?? '')
  const [isFocused, setIsFocused] = useState(false)

  // Sync when navigating via browser back/forward
  useEffect(() => {
    if (!isFocused) setValue(searchParams.get('q') ?? '')
  }, [searchParams, isFocused])

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  function navigate(raw: string) {
    const trimmed = raw.trim()
    const params = new URLSearchParams(searchParams.toString())
    if (trimmed) {
      params.set('q', trimmed)
    } else {
      params.delete('q')
    }
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
    <div className="relative" style={{ width: isFocused ? '22rem' : '16rem', transition: 'width 220ms ease' }}>
      {/* Magnifier */}
      <span
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-150"
        style={{ color: isFocused ? 'var(--menthe)' : 'var(--muted-light)' }}
        aria-hidden="true"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
      </span>

      <input
        ref={inputRef}
        type="search"
        className="search-input"
        style={{ paddingLeft: '2.25rem', paddingRight: value ? '2rem' : '.875rem' }}
        value={value}
        placeholder="Search projects, tags…"
        aria-label="Search PinDev"
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />

      {/* Clear */}
      {value && (
        <button
          type="button"
          onMouseDown={handleClear}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full transition-colors duration-150"
          style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--brume)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-2)')}
        >
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
      )}
    </div>
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

  // Load profile once
  useEffect(() => {
    supabase
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('id', user.id)
      .single()
      .then(({ data }) => { if (data) setProfile(data) })
  }, [user.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
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

  const name     = profile?.display_name || profile?.username || user.email?.split('@')[0] || 'Me'
  const initials = name.charAt(0).toUpperCase()

  return (
    <div ref={wrapRef} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full transition-all duration-150"
        style={{
          padding: '3px',
          background: open ? 'var(--menthe-light)' : 'transparent',
          outline: open ? '2px solid var(--menthe)' : '2px solid transparent',
          outlineOffset: '0px',
        }}
      >
        {/* Avatar circle */}
        <div
          className="avatar"
          style={{ width: 30, height: 30, fontSize: '.8125rem' }}
        >
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt={name} className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>
        {/* Chevron */}
        <svg
          width="12" height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--muted)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-0.5 transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          aria-label="Account options"
          className="animate-scale-in absolute right-0 z-50 mt-2 w-52 rounded-xl border p-1.5 shadow-lg"
          style={{
            background: 'var(--bg)',
            borderColor: 'var(--border)',
            boxShadow: 'var(--shadow-lg)',
            top: '100%',
          }}
        >
          {/* Profile snippet */}
          <div
            className="mb-1 rounded-lg px-3 py-2.5"
            style={{ background: 'var(--surface)' }}
          >
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{name}</p>
            {profile?.username && (
              <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>@{profile.username}</p>
            )}
          </div>

          {/* Nav items */}
          {(
            [
              {
                href: profile?.username ? `/profile/${profile.username}` : '/',
                label: 'My profile',
                icon: <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>,
                icon2: <circle cx="12" cy="7" r="4"/>,
              },
              {
                href: '/create',
                label: 'Create pin',
                icon: <><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></>,
              },
              {
                href: '/settings/profile',
                label: 'Settings',
                icon: <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>,
                icon2: <circle cx="12" cy="12" r="3"/>,
              },
            ] as Array<{ href: string; label: string; icon: React.ReactNode; icon2?: React.ReactNode }>
          ).map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              role="menuitem"
              className="menu-item"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {item.icon}
                {item.icon2}
              </svg>
              {item.label}
            </Link>
          ))}

          {/* Divider */}
          <div className="my-1.5 h-px" style={{ background: 'var(--border)' }} role="separator"/>

          {/* Sign out */}
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
   CREATE BUTTON
   ───────────────────────────────────────────────────────────── */
function CreateButton() {
  return (
    <Link href="/create" className="btn btn-primary" aria-label="Create a new pin">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 5v14M5 12h14"/>
      </svg>
      <span className="hidden sm:inline">Create</span>
    </Link>
  )
}

/* ─────────────────────────────────────────────────────────────
   AUTH BUTTONS (unauthenticated state)
   ───────────────────────────────────────────────────────────── */
function AuthButtons() {
  return (
    <div className="flex items-center gap-2">
      <Link href="/login" className="btn btn-ghost" style={{ padding: '.4375rem 1rem' }}>
        Sign in
      </Link>
      <Link href="/signup" className="btn btn-primary" style={{ padding: '.4375rem 1rem' }}>
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
      className="animate-fade-in fixed inset-x-0 z-30 border-b px-4 py-3 sm:hidden"
      style={{
        top: 'var(--header-h)',
        background: 'var(--bg)',
        borderColor: 'var(--border)',
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
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser]           = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [mobileSearch, setMobileSearch] = useState(false)
  const supabase = createClient()

  // ── Subscribe to auth state ──────────────────────────────────
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

  // ── Close mobile search on navigation ───────────────────────
  const prevPath = useRef(pathname)
  useEffect(() => {
    if (pathname !== prevPath.current) {
      setMobileSearch(false)
      prevPath.current = pathname
    }
  }, [pathname])

  // ── Close mobile search on Escape ───────────────────────────
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
        className="glass-header fixed inset-x-0 top-0 z-40"
        style={{ height: 'var(--header-h)' }}
      >
        <div
          className="mx-auto flex h-full max-w-[1800px] items-center gap-3 px-4 sm:px-6"
        >
          {/* Logo */}
          <Logo />

          {/* Desktop search — hidden on mobile */}
          <div className="hidden sm:flex flex-1 justify-center px-6 max-w-xl mx-auto">
            <SearchBar />
          </div>

          {/* Right rail */}
          <div className="ml-auto flex items-center gap-2">

            {/* Mobile search toggle */}
            <button
              className="btn-icon btn sm:hidden"
              onClick={() => setMobileSearch(v => !v)}
              aria-label={mobileSearch ? 'Close search' : 'Open search'}
              aria-expanded={mobileSearch}
              style={{
                background: mobileSearch ? 'var(--menthe-light)' : 'transparent',
                borderColor: mobileSearch ? 'var(--menthe)' : 'var(--border)',
                color: mobileSearch ? 'var(--menthe)' : 'var(--muted)',
              }}
            >
              {mobileSearch ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              )}
            </button>

            {/* Divider — desktop only */}
            <div
              className="hidden sm:block w-px h-5 flex-shrink-0"
              style={{ background: 'var(--border)' }}
              aria-hidden="true"
            />

            {/* Auth area */}
            {!authReady ? (
              /* Skeleton to prevent layout shift */
              <div className="flex items-center gap-2">
                <div className="skeleton h-8 w-16 rounded-full" />
                <div className="skeleton h-8 w-20 rounded-full" />
              </div>
            ) : user ? (
              <>
                <CreateButton />
                <AvatarMenu user={user} />
              </>
            ) : (
              <AuthButtons />
            )}
          </div>
        </div>
      </header>

      {/* Mobile search drawer — rendered outside header to not affect stacking */}
      {mobileSearch && <MobileSearchDrawer onClose={() => setMobileSearch(false)} />}
    </>
  )
}