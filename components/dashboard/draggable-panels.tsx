"use client"

import { GripVertical } from "lucide-react"
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

type DraggablePanelItem = {
  id: string
  title: string
  content: ReactNode
  className?: string
}

type DraggablePanelsProps = {
  storageKey: string
  items: DraggablePanelItem[]
  gridClassName?: string
}

function reorder<T>(list: T[], from: number, to: number): T[] {
  if (from === to) return list
  const next = [...list]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

export function DraggablePanels({ storageKey, items, gridClassName }: DraggablePanelsProps) {
  const [order, setOrder] = useState<string[]>(() => items.map((i) => i.id))
  const [draggingId, setDraggingId] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as string[]
      if (!Array.isArray(parsed)) return
      const valid = parsed.filter((id) => items.some((i) => i.id === id))
      const missing = items.map((i) => i.id).filter((id) => !valid.includes(id))
      setOrder([...valid, ...missing])
    } catch {
      setOrder(items.map((i) => i.id))
    }
  }, [storageKey, items])

  useEffect(() => {
    const validOrder = order.filter((id) => items.some((i) => i.id === id))
    const missing = items.map((i) => i.id).filter((id) => !validOrder.includes(id))
    if (missing.length > 0 || validOrder.length !== order.length) {
      setOrder([...validOrder, ...missing])
    }
  }, [items, order])

  const orderedItems = useMemo(() => {
    const byId = new Map(items.map((i) => [i.id, i] as const))
    return order.map((id) => byId.get(id)).filter(Boolean) as DraggablePanelItem[]
  }, [items, order])

  const persist = useCallback(
    (next: string[]) => {
      setOrder(next)
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next))
      } catch {
        // ignore storage errors
      }
    },
    [storageKey]
  )

  return (
    <div data-draggable-panels-managed="true" className={cn("grid gap-4", gridClassName)}>
      {orderedItems.map((item, index) => (
        <section
          key={item.id}
          className={cn(
            "relative rounded-xl",
            draggingId === item.id ? "opacity-70" : "opacity-100",
            item.className
          )}
          draggable
          onDragStart={() => setDraggingId(item.id)}
          onDragEnd={() => setDraggingId(null)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            if (!draggingId || draggingId === item.id) return
            const from = order.indexOf(draggingId)
            const to = order.indexOf(item.id)
            if (from < 0 || to < 0) return
            persist(reorder(order, from, to))
            setDraggingId(null)
          }}
        >
          <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-md border bg-background/95 px-1.5 py-0.5 text-[11px] text-muted-foreground shadow-sm backdrop-blur-sm">
            <GripVertical className="h-3 w-3" />
            <span>{item.title}</span>
          </div>
          {item.content}
        </section>
      ))}
    </div>
  )
}

