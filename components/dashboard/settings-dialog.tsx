"use client"

import { useState } from "react"
import { useTheme } from "@/components/providers/theme-provider"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Sun, Moon } from "lucide-react"
import { cn } from "@/lib/utils"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { theme, setTheme } = useTheme()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Настройки</DialogTitle>
          <DialogDescription>
            Управление параметрами системы
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Theme Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium leading-none">Тема интерфейса</label>
            <div className="grid grid-cols-2 gap-3">
              {/* Light Theme */}
              <button
                onClick={() => setTheme("light")}
                className={cn(
                  "relative flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all hover:bg-accent cursor-pointer",
                  theme === "light"
                    ? "border-primary bg-accent"
                    : "border-border"
                )}
              >
                <div className="w-12 h-8 rounded border border-border bg-white flex items-center justify-center">
                  <Sun className="h-4 w-4 text-amber-500" />
                </div>
                <span className="text-xs font-medium">Светлая</span>
                {theme === "light" && (
                  <div className="absolute top-2 right-2 h-3 w-3 rounded-full bg-primary" />
                )}
              </button>

              {/* Dark Theme */}
              <button
                onClick={() => setTheme("dark")}
                className={cn(
                  "relative flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all hover:bg-accent cursor-pointer",
                  theme === "dark"
                    ? "border-primary bg-accent"
                    : "border-border"
                )}
              >
                <div className="w-12 h-8 rounded border border-slate-700 bg-slate-900 flex items-center justify-center">
                  <Moon className="h-4 w-4 text-blue-400" />
                </div>
                <span className="text-xs font-medium">Тёмная</span>
                {theme === "dark" && (
                  <div className="absolute top-2 right-2 h-3 w-3 rounded-full bg-primary" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Текущая тема: <span className="font-medium text-foreground">{theme === "light" ? "Светлая" : "Тёмная"}</span>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
