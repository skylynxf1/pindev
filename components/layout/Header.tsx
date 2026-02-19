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
    <Link href="/" className="flex-shrink-0" aria-label="PinDev — home">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-full"
        style={{ background: 'var(--menthe)', boxShadow: '0 2px 8px rgb(53 200 180 / .35)' }}
      >
        <span className="text-white font-extrabold text-lg leading-none" style={{ letterSpacing: '-0.05em' }}>
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
  const [createOpen, setCreateOpen] = useState(false)
  const createRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!createOpen) return
    const handler = (e: MouseEvent) => {
      if (createRef.current && !createRef.current.contains(e.target as Node)) setCreateOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [createOpen])

  const isHome = pathname === '/'

  return (
    <nav className="hidden sm:flex items-center gap-0.5" aria-label="Main navigation">
      {/* Home */}
      <Link
        href="/"
        className="flex items-center h-9 px-4 rounded-full text-sm font-semibold transition-all duration-150 select-none"
        style={{
          background: isHome ? 'var(--text)' : 'transparent',
          color: isHome ? '#fff' : 'var(--text)',
        }}
        onMouseEnter={e => { if (!isHome) (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)' }}
        onMouseLeave={e => { if (!isHome) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        Home
      </Link>

      {/* Explore */}
      <Link
        href="/search"
        className="flex items-center h-9 px-4 rounded-full text-sm font-semibold transition-all duration-150 select-none"
        style={{ color: 'var(--text)', background: 'transparent' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        Explore
      </Link>

      {/* Create dropdown */}
      <div ref={createRef} className="relative">
        <button
          onClick={() => setCreateOpen(v => !v)}
          className="flex items-center gap-1.5 h-9 px-4 rounded-full text-sm font-semibold transition-all duration-150 select-none"
          style={{
            color: 'var(--text)',
            background: createOpen ? 'var(--surface-2)' : 'transparent',
          }}
          onMouseEnter={e => { if (!createOpen) (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)' }}
          onMouseLeave={e => { if (!createOpen) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          Create
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className="transition-transform duration-200"
            style={{ transform: createOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </button>

        {createOpen && (
          <div
            className="animate-scale-in absolute left-0 z-50 mt-1.5 w-44 rounded-xl border p-1.5"
            style={{
              background: 'var(--bg)',
              borderColor: 'var(--border)',
              boxShadow: 'var(--shadow-lg)',
              top: '100%',
            }}
          >
            <Link href="/create" onClick={() => setCreateOpen(false)} className="menu-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>
              </svg>
              Create pin
            </Link>
            <Link href="/upload" onClick={() => setCreateOpen(false)} className="menu-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Upload media
            </Link>
          </div>
        )}
      </div>
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
    <div className="relative w-full">
      <span
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-150"
        style={{ color: isFocused ? 'var(--menthe)' : 'var(--muted-light)' }}
        aria-hidden="true"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
      </span>

      <input
        ref={inputRef}
        type="search"
        className="search-input"
        style={{ paddingLeft: '2.75rem', paddingRight: value ? '2.5rem' : '1rem', height: '40px' }}
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
          className="absolute right-3.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full transition-colors duration-150"
          style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}
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
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1.5 rounded-full transition-all duration-150"
        style={{
          padding: '3px 6px 3px 3px',
          background: open ? 'var(--surface-2)' : 'transparent',
          outline: open ? '2px solid var(--menthe)' : '2px solid transparent',
          outlineOffset: '0px',
        }}
      >
        <div className="avatar" style={{ width: 32, height: 32, fontSize: '.75rem' }}>
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt={name} className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className="transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account options"
          className="animate-scale-in absolute right-0 z-50 mt-2 w-52 rounded-xl border p-1.5"
          style={{
            background: 'var(--bg)',
            borderColor: 'var(--border)',
            boxShadow: 'var(--shadow-lg)',
            top: '100%',
          }}
        >
          <div className="mb-1 rounded-lg px-3 py-2.5" style={{ background: 'var(--surface)' }}>
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{name}</p>
            {profile?.username && (
              <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>@{profile.username}</p>
            )}
          </div>

          {([
            {
              href: profile?.username ? `/profile/${profile.username}` : '/',
              label: 'My profile',
              icon: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
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

          <div className="my-1.5 h-px" style={{ background: 'var(--border)' }} role="separator"/>

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
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [mobileSearch, setMobileSearch] = useState(false)
  const supabase = createClient()

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
        className="glass-header fixed inset-x-0 top-0 z-40"
        style={{ height: 'var(--header-h)' }}
      >
        <div className="mx-auto flex h-full max-w-[1800px] items-center gap-3 px-4 sm:px-6">
          {/* Logo */}
          <Logo />

          {/* Nav tabs */}
          <NavTabs pathname={pathname} />

          {/* Search — desktop */}
          <div className="hidden sm:flex flex-1 max-w-2xl">
            <SearchBar />
          </div>

          {/* Right rail */}
          <div className="ml-auto flex items-center gap-1.5">
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

            {!authReady ? (
              <div className="flex items-center gap-2">
                <div className="skeleton h-8 w-16 rounded-full" />
                <div className="skeleton h-8 w-8 rounded-full" />
              </div>
            ) : user ? (
              <>
                {/* Bell */}
                <button
                  className="hidden sm:flex items-center justify-center relative transition-colors duration-150 rounded-lg"
                  aria-label="Notifications"
                  style={{ width: 36, height: 36, background: 'transparent', border: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                  <span
                    className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full"
                    style={{ background: '#f05252', boxShadow: '0 0 0 1.5px white' }}
                    aria-hidden="true"
                  />
                </button>

                {/* Chat */}
                <button
                  className="hidden sm:flex items-center justify-center transition-colors duration-150 rounded-lg"
                  aria-label="Messages"
                  style={{ width: 36, height: 36, background: 'transparent', border: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </button>

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
