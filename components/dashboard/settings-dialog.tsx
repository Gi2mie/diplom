"use client"

import { useTheme } from "@/components/providers/theme-provider"
import { ThemePicker } from "@/components/theme-picker"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Sparkles } from "lucide-react"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { animationsEnabled, setAnimationsEnabled } = useTheme()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[118] max-w-md" overlayClassName="z-[117]">
        <DialogHeader>
          <DialogTitle>Настройки</DialogTitle>
          <DialogDescription>
            Управление параметрами системы
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <ThemePicker />

          <div className="space-y-3 border-t border-border/80 pt-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <Label htmlFor="settings-animations" className="text-sm font-medium">
                  Анимации интерфейса
                </Label>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Плавные переходы, появление страниц и отклик кнопок. При отключении интерфейс
                  обновляется сразу — удобно на слабых устройствах или при чувствительности к
                  движению.
                </p>
              </div>
              <Switch
                id="settings-animations"
                checked={animationsEnabled}
                onCheckedChange={setAnimationsEnabled}
                className="mt-1 shrink-0"
                aria-describedby="settings-animations-hint"
              />
            </div>
            <p id="settings-animations-hint" className="text-xs text-muted-foreground pl-12">
              Сейчас:{" "}
              <span className="font-medium text-foreground">
                {animationsEnabled ? "включены" : "выключены"}
              </span>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
