/** Клиентские флаги онбординга после первого входа (localStorage). */

export const ONBOARDING_INVITE_KEY = "edu-site-onboarding-invite"
export const ONBOARDING_TOUR_RUN_KEY = "edu-site-tour-run"
export const ONBOARDING_DONE_KEY = "edu-site-onboarding-done"
export const ONBOARDING_TOUR_SETTINGS_HINT_KEY = "edu-site-tour-show-settings-hint"

/** Закрыть активный тур с панели управления (например после «Пропустить» в настройках). */
export const SITE_TOUR_FORCE_CLOSE_EVENT = "edu-site-tour-force-close"

/** @deprecated Используйте EDU_TOUR_MOCK_UI_EVENT с detail `{ software: "add" }`. */
export const EDU_TOUR_SOFTWARE_MOCK_ADD_EVENT = "edu-tour-software-mock-add"

/** Переключение вкладки на странице «Категории и типы» во время тура. */
export const EDU_TOUR_CATEGORIES_TAB_EVENT = "edu-tour-categories-tab"

/** Симуляция модальных окон в турах (ПО, оборудование, справочники). */
export const EDU_TOUR_MOCK_UI_EVENT = "edu-tour-mock-ui"

export type EduTourMockUiDetail =
  | { reset: true }
  | { software: "add" | "view" | "edit" | "assign" | "delete" }
  | { equipment: "add" | "view" | "edit" | "move" | "delete" | "writeoff" }
  | { category: "add" | "view" | "edit" | "delete" }
  | { kind: "add" | "view" | "edit" | "delete" }

/** Управление диалогами layout во время тура (настройки, профиль). */
export const EDU_TOUR_CHROME_EVENT = "edu-tour-chrome"

export type EduTourChromeDetail =
  | { reset: true }
  | {
      settingsOpen: boolean
      profileOpen: boolean
      profileTab?: "edit" | "password"
    }

export function queueOnboardingInviteIfNeeded() {
  if (typeof window === "undefined") return
  if (window.localStorage.getItem(ONBOARDING_DONE_KEY) === "1") return
  window.localStorage.setItem(ONBOARDING_INVITE_KEY, "1")
}

/** Вызов после успешного входа (если обучение ещё не пройдено). */
export function scheduleSiteOnboardingAfterLogin() {
  queueOnboardingInviteIfNeeded()
}

export function clearOnboardingInvite() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(ONBOARDING_INVITE_KEY)
}

export function requestDashboardTour(opts?: { showSettingsHint?: boolean }) {
  if (typeof window === "undefined") return
  clearOnboardingInvite()
  window.localStorage.setItem(ONBOARDING_TOUR_RUN_KEY, "1")
  if (opts?.showSettingsHint) {
    window.sessionStorage.setItem(ONBOARDING_TOUR_SETTINGS_HINT_KEY, "1")
  } else {
    window.sessionStorage.removeItem(ONBOARDING_TOUR_SETTINGS_HINT_KEY)
  }
}

export function peekTourSettingsHint(): boolean {
  if (typeof window === "undefined") return false
  return window.sessionStorage.getItem(ONBOARDING_TOUR_SETTINGS_HINT_KEY) === "1"
}

export function clearTourSettingsHint() {
  if (typeof window === "undefined") return
  window.sessionStorage.removeItem(ONBOARDING_TOUR_SETTINGS_HINT_KEY)
}

export function isOnboardingCompleted(): boolean {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(ONBOARDING_DONE_KEY) === "1"
}

export function skipOnboardingForeverAndCloseTour() {
  skipOnboardingForever()
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(SITE_TOUR_FORCE_CLOSE_EVENT))
}

export function consumeDashboardTourRequest(): boolean {
  if (typeof window === "undefined") return false
  if (window.localStorage.getItem(ONBOARDING_TOUR_RUN_KEY) !== "1") return false
  window.localStorage.removeItem(ONBOARDING_TOUR_RUN_KEY)
  return true
}

/** Снять флаг запуска тура без открытия (если тур стартовал по URL с siteTour=1). */
export function discardQueuedDashboardTourFlag() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(ONBOARDING_TOUR_RUN_KEY)
}

export function skipOnboardingForever() {
  if (typeof window === "undefined") return
  clearOnboardingInvite()
  window.localStorage.setItem(ONBOARDING_DONE_KEY, "1")
}

export function completeOnboarding() {
  if (typeof window === "undefined") return
  window.localStorage.setItem(ONBOARDING_DONE_KEY, "1")
}

export function isOnboardingInvitePending(): boolean {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(ONBOARDING_INVITE_KEY) === "1"
}

/** Глобальное «тур с открытыми диалогами»: блокируем dismiss по Esc / клику вне контента. */
let dashboardSiteTourActive = false
const dashboardSiteTourListeners = new Set<() => void>()

function emitDashboardSiteTourActive() {
  for (const l of dashboardSiteTourListeners) l()
}

export function setDashboardSiteTourActive(active: boolean) {
  if (dashboardSiteTourActive === active) return
  dashboardSiteTourActive = active
  emitDashboardSiteTourActive()
}

export function getDashboardSiteTourActive(): boolean {
  return dashboardSiteTourActive
}

export function subscribeDashboardSiteTourActive(onChange: () => void): () => void {
  dashboardSiteTourListeners.add(onChange)
  return () => dashboardSiteTourListeners.delete(onChange)
}
