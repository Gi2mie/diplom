"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react"

const useIsomorphicLayoutEffect =
  typeof document !== "undefined" ? useLayoutEffect : useEffect

export type AppTheme =
  | "light"
  | "light-violet"
  | "light-amber"
  | "dark"
  | "dark-violet"
  | "dark-amber"

const THEME_CLASS_MAP: Record<
  AppTheme,
  { dark?: boolean; extra?: string; darkAccent?: "violet" | "amber" }
> = {
  light: {},
  "light-violet": { extra: "theme-violet" },
  "light-amber": { extra: "theme-amber" },
  dark: { dark: true },
  /** Тёмные акценты — только data-edu-accent, без theme-* (иначе каскад с светлыми селекторами) */
  "dark-violet": { dark: true, darkAccent: "violet" },
  "dark-amber": { dark: true, darkAccent: "amber" },
}

const APP_THEME_IDS: AppTheme[] = [
  "light",
  "light-violet",
  "light-amber",
  "dark",
  "dark-violet",
  "dark-amber",
]

function isAppTheme(value: string | null): value is AppTheme {
  return value !== null && (APP_THEME_IDS as string[]).includes(value)
}

/** Старые значения localStorage: violet / amber только для светлого режима */
function migrateLegacyThemeId(value: string | null): string | null {
  if (value === "violet") return "light-violet"
  if (value === "amber") return "light-amber"
  return value
}

function applyThemeClasses(root: HTMLElement, next: AppTheme) {
  root.classList.remove("dark", "theme-violet", "theme-amber")
  root.removeAttribute("data-edu-accent")
  const cfg = THEME_CLASS_MAP[next]
  if (cfg.dark) root.classList.add("dark")
  if (cfg.extra) root.classList.add(cfg.extra)
  if (cfg.darkAccent) root.setAttribute("data-edu-accent", cfg.darkAccent)
}

export const ANIMATIONS_STORAGE_KEY = "edutrack-animations"
export const THEME_STORAGE_KEY = "edutrack-theme"
/** Класс на `<html>`: отключает анимации и почти все transition в интерфейсе */
export const MOTION_OFF_CLASS = "edu-motion-off"

interface ThemeContextValue {
  theme: AppTheme
  setTheme: (theme: AppTheme) => void
  /** Показывать анимации переходов и микровзаимодействий */
  animationsEnabled: boolean
  setAnimationsEnabled: (value: boolean) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  setTheme: () => {},
  animationsEnabled: true,
  setAnimationsEnabled: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

/** Для библиотек вроде Sonner: любая «тёмная» палитра */
export function isDarkAppTheme(theme: AppTheme): boolean {
  return theme === "dark" || theme === "dark-violet" || theme === "dark-amber"
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>("light")
  const [animationsEnabled, setAnimationsEnabledState] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    const savedTheme = migrateLegacyThemeId(raw)
    if (savedTheme !== raw && savedTheme && isAppTheme(savedTheme)) {
      localStorage.setItem(THEME_STORAGE_KEY, savedTheme)
    }
    if (isAppTheme(savedTheme)) {
      setThemeState(savedTheme)
    }
    const savedAnim = localStorage.getItem(ANIMATIONS_STORAGE_KEY)
    if (savedAnim === "off") setAnimationsEnabledState(false)
    if (savedAnim === "on") setAnimationsEnabledState(true)
    setMounted(true)
  }, [])

  useIsomorphicLayoutEffect(() => {
    if (!mounted) return
    applyThemeClasses(document.documentElement, theme)
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme, mounted])

  useEffect(() => {
    if (!mounted) return
    const root = document.documentElement
    if (animationsEnabled) {
      root.classList.remove(MOTION_OFF_CLASS)
    } else {
      root.classList.add(MOTION_OFF_CLASS)
    }
    localStorage.setItem(ANIMATIONS_STORAGE_KEY, animationsEnabled ? "on" : "off")
  }, [animationsEnabled, mounted])

  const setTheme = useCallback((newTheme: AppTheme) => {
    if (typeof document !== "undefined") {
      applyThemeClasses(document.documentElement, newTheme)
      localStorage.setItem(THEME_STORAGE_KEY, newTheme)
    }
    setThemeState(newTheme)
  }, [])

  const setAnimationsEnabled = useCallback((value: boolean) => {
    setAnimationsEnabledState(value)
  }, [])

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, animationsEnabled, setAnimationsEnabled }}
    >
      {children}
    </ThemeContext.Provider>
  )
}
