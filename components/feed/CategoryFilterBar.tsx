'use client'

import { useState, useRef, useEffect } from 'react'

export type CategoryId = 'all' | 'design' | 'website' | 'app' | 'ai-tool' | 'vibecoding' | 'games' | 'featured'
export type SortOrder = 'latest' | 'oldest'

interface Category {
  id: CategoryId
  label: string
  icon: React.ReactNode
}

const CATEGORIES: Category[] = [
  {
    id: 'all',
    label: 'All',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ),
  },
  {
    id: 'design',
    label: 'Design',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 20h9"/>
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
      </svg>
    ),
  },
  {
    id: 'website',
    label: 'Websites',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
  },
  {
    id: 'app',
    label: 'Apps',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="5" y="2" width="14" height="20" rx="2"/>
        <circle cx="12" cy="17" r="1" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: 'ai-tool',
    label: 'AI Tools',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
    ),
  },
  {
    id: 'vibecoding',
    label: 'VibeCoding',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="16 18 22 12 16 6"/>
        <polyline points="8 6 2 12 8 18"/>
      </svg>
    ),
  },
  {
    id: 'games',
    label: 'Games',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="6" y1="12" x2="10" y2="12"/>
        <line x1="8" y1="10" x2="8" y2="14"/>
        <line x1="15" y1="13" x2="15.01" y2="13"/>
        <line x1="18" y1="11" x2="18.01" y2="11"/>
        <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.544-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/>
      </svg>
    ),
  },
]

interface CategoryFilterBarProps {
  active: ReadonlySet<CategoryId>
  onToggle: (id: CategoryId) => void
  sortOrder: SortOrder
  onSortChange: (s: SortOrder) => void
}

export default function CategoryFilterBar({
  active,
  onToggle,
  sortOrder,
  onSortChange,
}: CategoryFilterBarProps) {
  const [filterOpen, setFilterOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!filterOpen) return
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [filterOpen])

  const isFeatured = active.has('featured')

  return (
    <div
      role="toolbar"
      aria-label="Filter by category"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '12px 0',
        borderBottom: '1px solid var(--border)',
        overflowX: 'auto',
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
      }}
    >
      {/* Main category chips */}
      {CATEGORIES.map(cat => {
        const isActive = active.has(cat.id)
        return (
          <button
            key={cat.id}
            role="checkbox"
            aria-checked={isActive}
            onClick={() => onToggle(cat.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '8px 16px',
              borderRadius: 9999,
              fontSize: '0.8125rem',
              fontWeight: 600,
              flexShrink: 0,
              cursor: 'pointer',
              transition: 'all 140ms',
              border: `1.5px solid ${isActive ? 'var(--text)' : 'var(--border)'}`,
              background: isActive ? 'var(--text)' : 'var(--bg)',
              color: isActive ? '#fff' : 'var(--text)',
              userSelect: 'none',
            }}
            onMouseEnter={e => {
              if (!isActive) {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = 'var(--menthe)'
                el.style.color = 'var(--menthe)'
                el.style.background = 'var(--menthe-light)'
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = 'var(--border)'
                el.style.color = 'var(--text)'
                el.style.background = 'var(--bg)'
              }
            }}
          >
            {cat.icon}
            {cat.label}
          </button>
        )
      })}

      {/* Spacer */}
      <div style={{ flex: 1, minWidth: 8 }} aria-hidden="true" />

      {/* Featured chip — right side, star icon, toggleable like others */}
      <button
        role="checkbox"
        aria-checked={isFeatured}
        onClick={() => onToggle('featured')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '8px 16px',
          borderRadius: 9999,
          fontSize: '0.8125rem',
          fontWeight: 600,
          flexShrink: 0,
          cursor: 'pointer',
          transition: 'all 140ms',
          border: `1.5px solid ${isFeatured ? '#f59e0b' : 'var(--border)'}`,
          background: isFeatured ? '#f59e0b' : 'var(--bg)',
          color: isFeatured ? '#fff' : 'var(--text)',
          userSelect: 'none',
        }}
        onMouseEnter={e => {
          if (!isFeatured) {
            const el = e.currentTarget as HTMLElement
            el.style.borderColor = '#f59e0b'
            el.style.color = '#d97706'
            el.style.background = '#fef3c7'
          }
        }}
        onMouseLeave={e => {
          if (!isFeatured) {
            const el = e.currentTarget as HTMLElement
            el.style.borderColor = 'var(--border)'
            el.style.color = 'var(--text)'
            el.style.background = 'var(--bg)'
          }
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill={isFeatured ? '#fff' : 'none'} stroke={isFeatured ? '#fff' : 'currentColor'} strokeWidth="2" aria-hidden="true">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        Featured
      </button>

      {/* Sort / Filter dropdown */}
      <div ref={dropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
        <button
          aria-label="Sort options"
          onClick={() => setFilterOpen(o => !o)}
          style={{
            flexShrink: 0,
            width: 36,
            height: 36,
            borderRadius: 9,
            border: `1.5px solid ${filterOpen || sortOrder !== 'latest' ? 'var(--menthe)' : 'var(--border)'}`,
            background: filterOpen || sortOrder !== 'latest' ? 'var(--menthe-light)' : 'var(--bg)',
            color: filterOpen || sortOrder !== 'latest' ? 'var(--menthe)' : 'var(--muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 140ms',
          }}
          onMouseEnter={e => {
            if (!filterOpen) {
              const el = e.currentTarget as HTMLElement
              el.style.background = 'var(--surface-2)'
              el.style.borderColor = 'var(--menthe)'
              el.style.color = 'var(--menthe)'
            }
          }}
          onMouseLeave={e => {
            if (!filterOpen) {
              const el = e.currentTarget as HTMLElement
              el.style.background = sortOrder !== 'latest' ? 'var(--menthe-light)' : 'var(--bg)'
              el.style.borderColor = sortOrder !== 'latest' ? 'var(--menthe)' : 'var(--border)'
              el.style.color = sortOrder !== 'latest' ? 'var(--menthe)' : 'var(--muted)'
            }
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="21" y1="4" x2="14" y2="4"/>
            <line x1="10" y1="4" x2="3" y2="4"/>
            <line x1="21" y1="12" x2="12" y2="12"/>
            <line x1="8" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="20" x2="16" y2="20"/>
            <line x1="12" y1="20" x2="3" y2="20"/>
            <line x1="14" y1="2" x2="14" y2="6"/>
            <line x1="8" y1="10" x2="8" y2="14"/>
            <line x1="16" y1="18" x2="16" y2="22"/>
          </svg>
        </button>

        {filterOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              zIndex: 50,
              background: '#fff',
              borderRadius: 12,
              border: '1.5px solid var(--border)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
              minWidth: 160,
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '6px 0' }}>
              <p style={{ margin: 0, padding: '4px 14px 8px', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                Sort by
              </p>
              {([
                { id: 'latest' as SortOrder, label: 'Latest' },
                { id: 'oldest' as SortOrder, label: 'Oldest' },
              ]).map(opt => {
                const isSelected = sortOrder === opt.id
                return (
                  <button
                    key={opt.id}
                    onClick={() => { onSortChange(opt.id); setFilterOpen(false) }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      textAlign: 'left',
                      padding: '9px 14px',
                      background: isSelected ? 'var(--menthe-light)' : 'transparent',
                      color: isSelected ? 'var(--menthe)' : 'var(--text)',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: isSelected ? 700 : 500,
                      transition: 'background 100ms',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--surface)'
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'
                    }}
                  >
                    {opt.label}
                    {isSelected && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                )
              })}
              <button
                disabled
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  textAlign: 'left',
                  padding: '9px 14px',
                  background: 'transparent',
                  color: 'var(--muted)',
                  border: 'none',
                  cursor: 'not-allowed',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  opacity: 0.55,
                }}
              >
                Most liked
                <span style={{ fontSize: '0.6875rem', background: 'var(--brume)', borderRadius: 4, padding: '1px 5px' }}>soon</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
