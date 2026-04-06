import { useCallback, useMemo, useState } from "react"

export type SortDir = "asc" | "desc"

/**
 * Клиентская сортировка массива по строковому ключу getter'ов.
 * `getters` держите в `useMemo` в родителе, чтобы не сбрасывать сортировку каждый рендер.
 */
export function useTableSort<T>(
  items: T[],
  getters: Record<string, (item: T) => string | number>,
  initialKey: string | null = null
) {
  const [sortKey, setSortKey] = useState<string | null>(initialKey)
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  const toggleSort = useCallback((key: string) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"))
        return prev
      }
      setSortDir("asc")
      return key
    })
  }, [])

  const sortedItems = useMemo(() => {
    if (!sortKey || !getters[sortKey]) return items
    const g = getters[sortKey]!
    return [...items].sort((a, b) => {
      const va = g(a)
      const vb = g(b)
      let cmp = 0
      if (typeof va === "number" && typeof vb === "number") {
        cmp = va - vb
      } else {
        cmp = String(va).localeCompare(String(vb), "ru", { sensitivity: "base", numeric: true })
      }
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [items, sortKey, sortDir, getters])

  return { sortedItems, sortKey, sortDir, toggleSort }
}
