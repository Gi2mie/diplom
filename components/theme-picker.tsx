"use client"

import type { ReactNode } from "react"
import { useTheme, type AppTheme } from "@/components/providers/theme-provider"
import { cn } from "@/lib/utils"
import { Sun, Moon, Sparkles, Flame } from "lucide-react"

const OPTIONS: {
  id: AppTheme
  label: string
  preview: ReactNode
}[] = [
  {
    id: "light",
    label: "Светлая",
    preview: (
      <div className="flex h-8 w-12 items-center justify-center rounded border border-border bg-[oklch(0.97_0.01_90)]">
        <Sun className="h-4 w-4 text-[oklch(0.48_0.11_195)]" />
      </div>
    ),
  },
  {
    id: "light-violet",
    label: "Фиолетовая (светлая)",
    preview: (
      <div className="flex h-8 w-12 items-center justify-center rounded border border-violet-300/60 bg-violet-100/90">
        <Sparkles className="h-4 w-4 text-violet-600" />
      </div>
    ),
  },
  {
    id: "light-amber",
    label: "Янтарная (светлая)",
    preview: (
      <div className="flex h-8 w-12 items-center justify-center rounded border border-amber-300/70 bg-amber-100/90">
        <Flame className="h-4 w-4 text-amber-700" />
      </div>
    ),
  },
  {
    id: "dark",
    label: "Тёмная",
    preview: (
      <div className="flex h-8 w-12 items-center justify-center rounded border border-slate-600 bg-slate-900">
        <Moon className="h-4 w-4 text-slate-300" />
      </div>
    ),
  },
  {
    id: "dark-violet",
    label: "Фиолетовая (тёмная)",
    preview: (
      <div className="flex h-8 w-12 items-center justify-center rounded border border-violet-500/40 bg-[oklch(0.18_0.05_285)]">
        <Sparkles className="h-4 w-4 text-violet-300" />
      </div>
    ),
  },
  {
    id: "dark-amber",
    label: "Янтарная (тёмная)",
    preview: (
      <div className="flex h-8 w-12 items-center justify-center rounded border border-amber-600/40 bg-[oklch(0.18_0.04_75)]">
        <Flame className="h-4 w-4 text-amber-400" />
      </div>
    ),
  },
]

export function themeDisplayName(t: AppTheme): string {
  return OPTIONS.find((o) => o.id === t)?.label ?? t
}

export function ThemePicker({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()

  return (
    <div className={cn("space-y-3", className)}>
      <label className="text-sm font-medium leading-none">Тема интерфейса</label>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTheme(opt.id)}
            className={cn(
              "relative flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-colors duration-150 hover:bg-accent cursor-pointer",
              theme === opt.id ? "border-primary bg-accent" : "border-border"
            )}
          >
            {opt.preview}
            <span className="text-center text-xs font-medium leading-tight">
              {opt.label}
            </span>
            {theme === opt.id ? (
              <div className="absolute top-2 right-2 h-3 w-3 rounded-full bg-primary" />
            ) : null}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Текущая тема:{" "}
        <span className="font-medium text-foreground">{themeDisplayName(theme)}</span>
      </p>
    </div>
  )
}
