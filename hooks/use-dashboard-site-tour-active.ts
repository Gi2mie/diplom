"use client"

import { useSyncExternalStore } from "react"
import {
  getDashboardSiteTourActive,
  subscribeDashboardSiteTourActive,
} from "@/lib/site-onboarding"

export function useDashboardSiteTourActive(): boolean {
  return useSyncExternalStore(
    subscribeDashboardSiteTourActive,
    getDashboardSiteTourActive,
    () => false,
  )
}
