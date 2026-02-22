'use client'

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import PinCard from './PinCard'
import { PlaceholderCard, PLACEHOLDER_HEIGHTS } from './PlaceholderCard'
import type { Pin } from '@/types'

const ITEM_STYLE: React.CSSProperties = {
  marginBottom: 16,
  breakInside: 'avoid',
  pageBreakInside: 'avoid',
  position: 'relative',
}

function DragHandle() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        left: 8,
        zIndex: 10,
        width: 28,
        height: 28,
        borderRadius: 8,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        cursor: 'grab',
        userSelect: 'none',
        touchAction: 'none',
        fontSize: 14,
        lineHeight: 1,
      }}
      title="Drag to reorder"
    >
      ⣿
    </div>
  )
}

function SortableItem({
  pin,
  currentUserId,
  onDelete,
  onAdminDelete,
  onEdit,
  savedPinIds,
  isDragActive,
}: {
  pin: Pin
  currentUserId?: string
  onDelete?: (id: string) => void
  onAdminDelete?: (id: string) => void
  onEdit?: (updated: Pin) => void
  savedPinIds?: Set<string>
  isDragActive: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: pin.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        ...ITEM_STYLE,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
        outline: isDragging ? '2px solid var(--menthe)' : undefined,
        borderRadius: 18,
      }}
    >
      {/* Drag handle — absorbs pointer events for dragging */}
      <div {...attributes} {...listeners} style={{ position: 'absolute', inset: 0, zIndex: isDragActive ? 0 : 5, borderRadius: 18, cursor: 'grab', touchAction: 'none' }}>
        <DragHandle />
      </div>
      <PinCard
        pin={pin}
        currentUserId={currentUserId}
        onDelete={onDelete}
        onAdminDelete={onAdminDelete}
        isAdmin
        onEdit={onEdit}
        initialSaved={savedPinIds?.has(pin.id)}
      />
    </div>
  )
}

interface AdminSortableGridProps {
  pins: Pin[]
  currentUserId?: string
  onDelete?: (id: string) => void
  onAdminDelete?: (id: string) => void
  onEdit?: (updated: Pin) => void
  onEmptyClick?: () => void
  savedPinIds?: Set<string>
  cols: number
  onReorder: (ids: string[]) => void
}

export default function AdminSortableGrid({
  pins: initialPins,
  currentUserId,
  onEmptyClick,
  onDelete,
  onAdminDelete,
  onEdit,
  savedPinIds,
  cols,
  onReorder,
}: AdminSortableGridProps) {
  const [pins, setPins] = useState(initialPins)
  const [activeId, setActiveId] = useState<string | null>(null)

  // Sync when a pin is deleted from the parent (the id set shrinks)
  // We intentionally do NOT reset on every initialPins change to preserve local drag order
  const initialIds = initialPins.map(p => p.id).join(',')
  const localIds = pins.map(p => p.id).join(',')
  if (initialIds !== localIds) {
    // Keep local drag order but filter out any pins that were removed in the parent
    const initialSet = new Set(initialPins.map(p => p.id))
    const filtered = pins.filter(p => initialSet.has(p.id))
    // Also add any brand-new pins from parent that aren't in local yet
    const localSet = new Set(pins.map(p => p.id))
    const newPins = initialPins.filter(p => !localSet.has(p.id))
    if (filtered.length !== pins.length || newPins.length > 0) {
      setPins([...filtered, ...newPins])
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const gridStyle: React.CSSProperties = { columns: cols, columnGap: 16 }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = pins.findIndex(p => p.id === active.id)
    const newIndex = pins.findIndex(p => p.id === over.id)
    const reordered = arrayMove(pins, oldIndex, newIndex)
    setPins(reordered)
    onReorder(reordered.map(p => p.id))
  }

  const activePin = activeId ? pins.find(p => p.id === activeId) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={pins.map(p => p.id)} strategy={rectSortingStrategy}>
        <div style={gridStyle}>
          {pins.map(pin => (
            <SortableItem
              key={pin.id}
              pin={pin}
              currentUserId={currentUserId}
              onDelete={onDelete}
              onAdminDelete={onAdminDelete}
              onEdit={onEdit}
              savedPinIds={savedPinIds}
              isDragActive={!!activeId}
            />
          ))}
          {PLACEHOLDER_HEIGHTS.slice(0, cols).map((h, i) => (
            <PlaceholderCard
              key={`end-${i}`}
              height={h}
              first={i === 0}
              onClick={onEmptyClick}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(.22,1,.36,1)' }}>
        {activePin && (
          <div style={{ opacity: 0.85, transform: 'scale(1.03)', borderRadius: 18, boxShadow: '0 20px 60px rgba(0,0,0,0.22)', pointerEvents: 'none' }}>
            <PinCard pin={activePin} currentUserId={currentUserId} isAdmin />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
