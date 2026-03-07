'use client'

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react'

/**
 * True waterfall / masonry layout using shortest-column placement.
 *
 * Algorithm:
 * 1. ResizeObserver tracks container width continuously.
 * 2. Column count = floor(containerWidth / columnWidth), clamped to min/max.
 * 3. Each child is rendered in a hidden measurement div to get its natural height.
 * 4. Children are placed into the shortest column: top = columnHeight, left = colIndex * colWidth.
 * 5. Container height = tallest column.
 * 6. On resize/zoom, column count changes and all positions recalculate.
 *
 * This is NOT CSS columns or CSS grid — each item goes into whichever column
 * is currently shortest, producing a dense, balanced waterfall like Pinterest.
 */

interface MasonryBoardProps {
  children: ReactNode[]
  columnWidth?: number
  gap?: number
  minColumns?: number
  maxColumns?: number
}

export default function MasonryBoard({
  children,
  columnWidth = 240,
  gap = 16,
  minColumns = 1,
  maxColumns = 8,
}: MasonryBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const [containerWidth, setContainerWidth] = useState(0)
  const [layout, setLayout] = useState<{ positions: { top: number; left: number; width: number }[]; height: number } | null>(null)

  // Track container width
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0
      setContainerWidth(w)
    })
    ro.observe(el)
    setContainerWidth(el.getBoundingClientRect().width)
    return () => ro.disconnect()
  }, [])

  const colCount = Math.max(
    minColumns,
    Math.min(maxColumns, Math.floor((containerWidth + gap) / (columnWidth + gap)) || 1),
  )
  const actualColWidth = containerWidth > 0
    ? (containerWidth - gap * (colCount - 1)) / colCount
    : columnWidth

  const doLayout = useCallback(() => {
    if (containerWidth === 0 || children.length === 0) {
      setLayout({ positions: [], height: 0 })
      return
    }

    const columnHeights = new Array(colCount).fill(0) as number[]
    const positions: { top: number; left: number; width: number }[] = []

    for (let i = 0; i < children.length; i++) {
      const el = itemRefs.current[i]
      // Measure actual rendered height; fallback to estimate
      const itemHeight = el ? el.offsetHeight : 250

      // Find shortest column
      let shortest = 0
      for (let c = 1; c < colCount; c++) {
        if (columnHeights[c] < columnHeights[shortest]) shortest = c
      }

      positions.push({
        top: columnHeights[shortest],
        left: shortest * (actualColWidth + gap),
        width: actualColWidth,
      })
      columnHeights[shortest] += itemHeight + gap
    }

    const maxH = Math.max(...columnHeights)
    setLayout({ positions, height: maxH > gap ? maxH - gap : 0 })
  }, [containerWidth, children.length, colCount, actualColWidth, gap])

  // Layout after render
  useEffect(() => {
    const frame = requestAnimationFrame(doLayout)
    return () => cancelAnimationFrame(frame)
  }, [doLayout])

  // Re-layout when images finish loading
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = () => doLayout()
    el.addEventListener('load', handler, true)
    return () => el.removeEventListener('load', handler, true)
  }, [doLayout])

  const hasLayout = layout !== null && layout.positions.length === children.length

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: hasLayout ? layout.height : undefined,
        minHeight: hasLayout ? undefined : 200,
      }}
    >
      {children.map((child, i) => {
        const pos = hasLayout ? layout.positions[i] : null

        return (
          <div
            key={i}
            ref={(el) => { itemRefs.current[i] = el }}
            style={
              pos
                ? {
                    position: 'absolute',
                    top: pos.top,
                    left: pos.left,
                    width: pos.width,
                  }
                : {
                    // Before layout: render at correct width but offscreen for measurement
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: actualColWidth,
                    opacity: 0,
                    pointerEvents: 'none',
                  }
            }
          >
            {child}
          </div>
        )
      })}
    </div>
  )
}
