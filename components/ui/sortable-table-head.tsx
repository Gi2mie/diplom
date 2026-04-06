"use client"

import * as React from "react"
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TableHead } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { SortDir } from "@/hooks/use-table-sort"

type SortableTableHeadProps = {
  children: React.ReactNode
  columnKey: string
  sortKey: string | null
  sortDir: SortDir
  onSort: (key: string) => void
  className?: string
}

export function SortableTableHead({
  children,
  columnKey,
  sortKey,
  sortDir,
  onSort,
  className,
}: SortableTableHeadProps) {
  const active = sortKey === columnKey

  return (
    <TableHead className={cn(className)}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          "-ml-2 h-8 gap-1 px-2 font-medium text-muted-foreground transition-colors enabled:hover:bg-muted/70 enabled:hover:text-foreground dark:enabled:hover:bg-accent/40",
          active && "text-foreground"
        )}
        onClick={() => onSort(columnKey)}
      >
        <span>{children}</span>
        {active ? (
          sortDir === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
          )
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-35" aria-hidden />
        )}
      </Button>
    </TableHead>
  )
}
