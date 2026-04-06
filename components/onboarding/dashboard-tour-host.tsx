"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { DashboardAdminTour } from "@/components/onboarding/dashboard-admin-tour"
import {
  consumeDashboardTourRequest,
  discardQueuedDashboardTourFlag,
  setDashboardSiteTourActive,
  SITE_TOUR_FORCE_CLOSE_EVENT,
} from "@/lib/site-onboarding"

export function DashboardTourHost() {
  const [siteTourOpen, setSiteTourOpen] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get("siteTour") === "1") {
      discardQueuedDashboardTourFlag()
      setSiteTourOpen(true)
      router.replace("/dashboard", { scroll: false })
      return
    }
    if (consumeDashboardTourRequest()) {
      setSiteTourOpen(true)
    }
  }, [searchParams, router])

  useEffect(() => {
    const onForceClose = () => setSiteTourOpen(false)
    window.addEventListener(SITE_TOUR_FORCE_CLOSE_EVENT, onForceClose)
    return () => window.removeEventListener(SITE_TOUR_FORCE_CLOSE_EVENT, onForceClose)
  }, [])

  useEffect(() => {
    setDashboardSiteTourActive(siteTourOpen)
    return () => setDashboardSiteTourActive(false)
  }, [siteTourOpen])

  return (
    <DashboardAdminTour
      active={siteTourOpen}
      onClose={() => {
        setSiteTourOpen(false)
      }}
    />
  )
}
