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
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ),
  },
  {
    id: 'website',
    label: 'Websites',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
  },
  {
    id: 'app',
    label: 'Apps',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
        <line x1="12" y1="18" x2="12.01" y2="18"/>
      </svg>
    ),
  },
  {
    id: 'ai-tool',
    label: 'AI Tools',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
      className="flex items-center gap-2 overflow-x-auto no-scrollbar py-3 border-b"
      style={{ borderColor: 'var(--border)' }}
      role="tablist"
      aria-label="Filter by category"
    >
      {CATEGORIES.map(cat => {
        const isActive = cat.id === active
        return (
          <button
            key={cat.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(cat.id)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 transition-all duration-150"
            style={{
              background: isActive ? 'var(--text)' : 'var(--bg)',
              color: isActive ? '#fff' : 'var(--text)',
              border: `1.5px solid ${isActive ? 'var(--text)' : 'var(--border)'}`,
            }}
            onMouseEnter={e => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--menthe)'
                ;(e.currentTarget as HTMLElement).style.color = 'var(--menthe)'
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                ;(e.currentTarget as HTMLElement).style.color = 'var(--text)'
              }
            }}
          >
            {cat.icon}
            {cat.label}
          </button>
        )
      })}

      {/* Spacer */}
      <div className="flex-1 min-w-2" aria-hidden="true" />

      {/* Filter/sort icon */}
      <button
        className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg transition-colors duration-150"
        aria-label="Filter options"
        style={{ color: 'var(--muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
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
