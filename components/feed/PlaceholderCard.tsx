'use client'

import { useState } from 'react'

export const PLACEHOLDER_HEIGHTS = [280, 360, 220, 400, 300, 340, 240, 380, 260, 320, 290, 440]

export function PlaceholderCard({
  height,
  first,
  onClick,
  emptyText,
  emptySubtext,
}: {
  height: number
  first: boolean
  onClick?: () => void
  emptyText?: string
  emptySubtext?: string
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={first ? onClick : undefined}
      style={{
        marginBottom: 16,
        breakInside: 'avoid',
        pageBreakInside: 'avoid',
        height,
        borderRadius: 18,
        background: hovered
          ? 'linear-gradient(135deg, var(--menthe-light) 0%, var(--brume) 100%)'
          : 'var(--surface)',
        border: '1.5px solid var(--border)',
        position: 'relative',
        overflow: 'hidden',
        cursor: first ? 'pointer' : 'default',
        transition: 'transform 200ms ease, box-shadow 200ms ease, background 200ms ease',
        transform: hovered && first ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered && first ? '0 12px 32px rgba(0,0,0,0.10)' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {first && (
        <div style={{ textAlign: 'center', padding: 28 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'var(--menthe-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--menthe)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </div>
          <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.3, margin: '0 0 5px' }}>
            {emptyText ?? 'no genius here yet...'}
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--menthe)', fontWeight: 600, margin: 0 }}>
            {emptySubtext ?? 'add yours!'}
          </p>
        </div>
      )}
    </div>
  )
}
