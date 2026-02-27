'use client'

import { useToast } from '@/components/Toast'

interface CopyableUsernameProps {
  username: string
  style?: React.CSSProperties
}

async function copyToClipboard(text: string): Promise<boolean> {
  // Try modern clipboard API first
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch { /* fall through */ }
  }
  // Fallback: hidden textarea
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

export default function CopyableUsername({ username, style }: CopyableUsernameProps) {
  const { toast } = useToast()

  const handleClick = async () => {
    const ok = await copyToClipboard(username)
    if (ok) {
      toast(`Copied @${username}`, 'success')
    } else {
      toast('Copy failed', 'error')
    }
  }

  return (
    <p
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick() } }}
      style={{
        cursor: 'pointer',
        transition: 'text-decoration 0.15s',
        textDecoration: 'none',
        width: 'fit-content',
        ...style,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.textDecoration = 'underline' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.textDecoration = 'none' }}
      title="Click to copy username"
    >
      @{username}
    </p>
  )
}
