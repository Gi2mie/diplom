/** Событие для обновления бейджей «Заявки на ПО / Ремонты / Неисправности» в `app/dashboard/layout.tsx`. */
export const DASHBOARD_NAV_COUNTS_REFRESH_EVENT = "edu-dashboard-nav-counts-refresh"

export function requestDashboardNavCountsRefresh() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(DASHBOARD_NAV_COUNTS_REFRESH_EVENT))
}
