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

  const paddingClass = size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3.5 py-1.5 text-xs'

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
            className={`inline-flex items-center gap-1.5 rounded-full border font-medium transition-all
              ${paddingClass}
              ${isActive
                ? 'border-[#35C8B4] bg-[#35C8B4] text-white shadow-sm'
                : 'border-[#E6ECEA] bg-white text-[#0F1720] hover:border-[#35C8B4] hover:bg-[#C2F2E4]/30'
              }`}
          >
            <span className={`${isActive ? 'text-white/70' : 'text-[#5B6B73]'} text-[10px]`}>
              #
            </span>
            {tag.name}
            {showCount && typeof tag.count === 'number' && (
              <span
                className={`rounded-full px-1.5 py-px text-[10px] font-bold
                  ${isActive ? 'bg-white/20 text-white' : 'bg-[#C2F2E4] text-[#35C8B4]'}`}
              >
                {tag.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}