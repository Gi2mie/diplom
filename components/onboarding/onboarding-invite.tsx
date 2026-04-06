"use client"

import { BookOpen, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { isOnboardingInvitePending, requestDashboardTour, skipOnboardingForever } from "@/lib/site-onboarding"

export function OnboardingInvite() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(isOnboardingInvitePending())
    const onStorage = () => setOpen(isOnboardingInvitePending())
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const startTour = useCallback(() => {
    requestDashboardTour({ showSettingsHint: true })
    setOpen(false)
    router.push("/dashboard?siteTour=1")
  }, [router])

  const skip = useCallback(() => {
    skipOnboardingForever()
    setOpen(false)
  }, [])

  if (!open) return null

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[120] max-w-[min(22rem,calc(100vw-2rem))] sm:bottom-6 sm:right-6">
      <Card className="pointer-events-auto border-primary/35 shadow-lg shadow-primary/10">
        <CardHeader className="relative space-y-2 pb-2 pr-10">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-8 w-8 text-muted-foreground"
            onClick={skip}
            aria-label="Пропустить обучение"
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <BookOpen className="h-4 w-4" />
            </div>
            <CardTitle className="text-base leading-tight">Обучение по сайту</CardTitle>
          </div>
          <CardDescription className="text-pretty">
            Коротко покажем ключевые блоки панели управления и частые действия.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 pt-0 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" size="sm" onClick={skip}>
            Не сейчас
          </Button>
          <Button type="button" size="sm" onClick={startTour}>
            Начать
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
