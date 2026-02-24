'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface Tag {
  id: string
  name: string
  count?: number
}

interface TagPillsProps {
  tags: Tag[]
  /** If true, clicking a pill navigates to /search?tag=name */
  navigable?: boolean
  /** The currently active tag slug (for highlight state) */
  activeTag?: string | null
  /** Callback fired when a pill is clicked (alternative to navigation) */
  onSelect?: (tag: string | null) => void
  size?: 'sm' | 'md'
  showCount?: boolean
  className?: string
}

export default function TagPills({
  tags,
  navigable = false,
  activeTag = null,
  onSelect,
  size = 'md',
  showCount = false,
  className = '',
}: TagPillsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  if (tags.length === 0) return null

  function handleClick(name: string) {
    if (onSelect) {
      // Controlled mode — let the parent decide
      onSelect(activeTag === name ? null : name)
      return
    }

    if (navigable) {
      const params = new URLSearchParams(searchParams.toString())
      if (activeTag === name) {
        params.delete('tag')
      } else {
        params.set('tag', name)
      }
      // Preserve existing keyword query
      router.push(`/search?${params.toString()}`)
    }
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map((tag) => {
        const isActive = activeTag === tag.name

        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => handleClick(tag.name)}
            className={`tag-pill${isActive ? ' active' : ''}`}
          >
            <span style={{ opacity: 0.5, fontSize: '0.6875rem' }}>#</span>
            {tag.name}
            {showCount && typeof tag.count === 'number' && (
              <span style={{
                borderRadius: 9999,
                padding: '1px 5px',
                fontSize: '0.625rem',
                fontWeight: 700,
                background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--brume)',
                color: isActive ? '#fff' : 'var(--menthe)',
                marginLeft: 2,
              }}>
                {tag.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}