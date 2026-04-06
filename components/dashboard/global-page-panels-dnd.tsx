"use client"

import { RotateCcw } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"

type PanelGroup = {
  id: string
  title: string
  elements: HTMLElement[]
}

const STORAGE_PREFIX = "dashboard-panels-order:"

function panelTitle(el: HTMLElement): string {
  const titleEl = el.querySelector(
    "h1, h2, h3, h4, [data-slot='card-title'], [data-slot='dialog-title']"
  )
  const text = (titleEl?.textContent || "").trim()
  return text || "Панель"
}

function slug(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "-").replace(/[^\w\u0400-\u04ff-]/g, "")
}

function clearPanelDecorations(root: HTMLElement) {
  root.querySelectorAll("[data-panel-drag-handle='true']").forEach((n) => n.remove())
  root.querySelectorAll("[data-panel-draggable='true']").forEach((n) => {
    const el = n as HTMLElement
    el.draggable = false
    el.removeAttribute("data-panel-draggable")
    el.classList.remove("relative")
  })
}

function buildGroups(children: HTMLElement[]): PanelGroup[] {
  const groups: PanelGroup[] = []
  for (let i = 0; i < children.length; i++) {
    const current = children[i]
    const currentTitle = panelTitle(current)
    const next = children[i + 1]
    const nextTitle = next ? panelTitle(next) : ""
    const isFiltersBundle =
      /фильтр/i.test(currentTitle) && next && /(список|каталог|таблица)/i.test(nextTitle)

    if (isFiltersBundle) {
      groups.push({
        id: `bundle-${slug(currentTitle)}-${slug(nextTitle)}-${i}`,
        title: `${currentTitle} + ${nextTitle}`,
        elements: [current, next],
      })
      i += 1
      continue
    }

    groups.push({
      id: `${slug(currentTitle)}-${i}`,
      title: currentTitle,
      elements: [current],
    })
  }
  return groups
}

export function GlobalPagePanelsDnd() {
  const pathname = usePathname()
  const [version, setVersion] = useState(0)

  const storageKey = useMemo(() => `${STORAGE_PREFIX}${pathname}`, [pathname])

  const resetCurrent = useCallback(() => {
    window.localStorage.removeItem(storageKey)
    setVersion((v) => v + 1)
  }, [storageKey])

  const resetAll = useCallback(() => {
    const keys: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (k && k.startsWith(STORAGE_PREFIX)) keys.push(k)
    }
    keys.forEach((k) => window.localStorage.removeItem(k))
    setVersion((v) => v + 1)
  }, [])

  useEffect(() => {
    if (!pathname?.startsWith("/dashboard")) return
    const pageShell = document.querySelector(".page-shell") as HTMLElement | null
    if (!pageShell) return
    if (pageShell.querySelector("[data-draggable-panels-managed='true']")) return

    const root = pageShell.firstElementChild as HTMLElement | null
    if (!root) return

    const apply = () => {
      const candidates = Array.from(root.children).filter((c) => c instanceof HTMLElement) as HTMLElement[]
      if (candidates.length < 2) return

      clearPanelDecorations(root)
      const groups = buildGroups(candidates)
      if (groups.length < 2) return

      const map = new Map(groups.map((g) => [g.id, g]))
      let ordered = groups
      try {
        const saved = JSON.parse(window.localStorage.getItem(storageKey) || "[]") as string[]
        if (Array.isArray(saved) && saved.length) {
          const valid = saved.filter((id) => map.has(id))
          const missing = groups.map((g) => g.id).filter((id) => !valid.includes(id))
          ordered = [...valid, ...missing].map((id) => map.get(id)!).filter(Boolean)
        }
      } catch {
        ordered = groups
      }

      ordered.forEach((g) => g.elements.forEach((el) => root.appendChild(el)))
      const persist = (nextGroups: PanelGroup[]) => {
        window.localStorage.setItem(storageKey, JSON.stringify(nextGroups.map((g) => g.id)))
      }
      persist(ordered)

      let draggingId: string | null = null

      for (const g of ordered) {
        const host = g.elements[0]
        host.classList.add("relative")
        host.draggable = true
        host.setAttribute("data-panel-draggable", "true")

        const handle = document.createElement("div")
        handle.setAttribute("data-panel-drag-handle", "true")
        handle.className =
          "absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-md border bg-background/95 px-1.5 py-0.5 text-[11px] text-muted-foreground shadow-sm backdrop-blur-sm pointer-events-none"
        handle.textContent = `:: ${g.title}`
        host.appendChild(handle)

        host.addEventListener("dragstart", () => {
          draggingId = g.id
          host.classList.add("opacity-70")
        })
        host.addEventListener("dragend", () => {
          draggingId = null
          host.classList.remove("opacity-70")
        })
        host.addEventListener("dragover", (e) => e.preventDefault())
        host.addEventListener("drop", (e) => {
          e.preventDefault()
          if (!draggingId || draggingId === g.id) return
          const from = ordered.findIndex((x) => x.id === draggingId)
          const to = ordered.findIndex((x) => x.id === g.id)
          if (from < 0 || to < 0) return
          const next = [...ordered]
          const [moved] = next.splice(from, 1)
          next.splice(to, 0, moved)
          ordered = next
          ordered.forEach((grp) => grp.elements.forEach((el) => root.appendChild(el)))
          persist(ordered)
        })
      }
    }

    apply()
  }, [pathname, storageKey, version])

  if (!pathname?.startsWith("/dashboard")) return null

  return (
    <div className="ml-auto flex items-center gap-2">
      <Button type="button" size="sm" variant="outline" onClick={resetCurrent}>
        <RotateCcw className="mr-1 h-3.5 w-3.5" />
        Сбросить панели
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={resetAll}>
        Сбросить все
      </Button>
    </div>
  )
}

