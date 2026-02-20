'use client'

export type CategoryId = 'all' | 'website' | 'app' | 'ai-tool' | 'vibecoding'

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
]

interface CategoryFilterBarProps {
  active: CategoryId
  onChange: (id: CategoryId) => void
}

export default function CategoryFilterBar({ active, onChange }: CategoryFilterBarProps) {
  return (
    <div
      role="tablist"
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
      {CATEGORIES.map(cat => {
        const isActive = cat.id === active
        return (
          <button
            key={cat.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(cat.id)}
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

      {/* Filter icon */}
      <button
        aria-label="Filter options"
        style={{
          flexShrink: 0,
          width: 36,
          height: 36,
          borderRadius: 9,
          border: '1.5px solid var(--border)',
          background: 'var(--bg)',
          color: 'var(--muted)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 140ms',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement
          el.style.background = 'var(--surface-2)'
          el.style.borderColor = 'var(--menthe)'
          el.style.color = 'var(--menthe)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement
          el.style.background = 'var(--bg)'
          el.style.borderColor = 'var(--border)'
          el.style.color = 'var(--muted)'
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
    </div>
  )
}
