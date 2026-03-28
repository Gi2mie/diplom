"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/** Старый URL: профиль открывается в модальном окне на панели. */
export default function ProfileRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/dashboard#profile")
  }, [router])
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground text-sm">
      Переход в панель…
    </div>
  )
}
