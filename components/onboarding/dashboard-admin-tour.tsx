"use client"

import { useSession } from "next-auth/react"
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
} from "react"
import { createPortal } from "react-dom"
import { usePathname, useRouter } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  clearTourSettingsHint,
  completeOnboarding,
  type EduTourChromeDetail,
  type EduTourMockUiDetail,
  EDU_TOUR_CHROME_EVENT,
  EDU_TOUR_CATEGORIES_TAB_EVENT,
  EDU_TOUR_MOCK_UI_EVENT,
  peekTourSettingsHint,
  skipOnboardingForever,
} from "@/lib/site-onboarding"

type Rect = { top: number; left: number; width: number; height: number }

function readRect(el: Element | null): Rect | null {
  if (!el || !(el instanceof HTMLElement)) return null
  const r = el.getBoundingClientRect()
  if (r.width < 4 && r.height < 4) return null
  const pad = 8
  return {
    top: r.top - pad,
    left: r.left - pad,
    width: r.width + pad * 2,
    height: r.height + pad * 2,
  }
}

const TOUR_MASK_RADIUS = 12

const STEP_PANEL_ANIMATION =
  "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200 motion-safe:ease-out motion-reduce:animate-none"

const STEP_PANEL_ANIMATION_RIGHT =
  "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-4 motion-safe:duration-200 motion-safe:ease-out motion-reduce:animate-none"

/** Подсветка модалки/портала — панель подсказки выносим вправо, чтобы не перекрывать окно. */
function isModalSpotlightStep(m: AdminTourStep): boolean {
  if (m.mockUi) return true
  const tc = m.tourChrome
  if (tc?.settingsOpen || tc?.profileOpen) return true
  if (m.selector.includes("-dialog") || m.selector.includes("profile-password-section")) {
    return true
  }
  return false
}

type AdminTourStep = {
  path: string
  selector: string
  title: string
  body: string
  /** Задержка перед замером (диалог в портале) */
  measureDelayMs?: number
  /** Вкладка на странице «Категории и типы» */
  categoriesTab?: "categories" | "kinds"
  /** Симуляция модального окна на текущей странице */
  mockUi?: Exclude<EduTourMockUiDetail, { reset: true }>
  /** Открыть настройки / профиль в layout */
  tourChrome?: Exclude<EduTourChromeDetail, { reset: true }>
}

const ADMIN_TOUR_STEPS: AdminTourStep[] = [
  {
    path: "/dashboard",
    selector: '[data-tour="nav-settings"]',
    title: "Настройки",
    body: "В нижней части боковой панели откройте «Настройки»: тема оформления, повторный запуск обучения или отказ от подсказок, а также переключатель анимаций интерфейса — про него подробнее на следующих шагах.",
    tourChrome: { settingsOpen: false, profileOpen: false },
  },
  {
    path: "/dashboard",
    selector: '[data-tour="settings-dialog-content"]',
    title: "Окно настроек",
    body: "Сверху — выбор темы (светлая или тёмная и варианты акцентов). Блок «Обучение по сайту» запускает этот тур заново или позволяет навсегда отключить автоматическое обучение. Ниже — раздел «Анимации интерфейса» (следующий шаг).",
    tourChrome: { settingsOpen: true, profileOpen: false },
    measureDelayMs: 100,
  },
  {
    path: "/dashboard",
    selector: '[data-tour="settings-animations-section"]',
    title: "Анимации интерфейса",
    body: "Переключатель задаёт, включены ли плавные появления окон и страниц, короткие переходы у кнопок и похожие эффекты (в вёрстке это классы motion-safe; при отключении включается режим edu-motion-off на корневом элементе — анимации и большинство transition почти исчезают). От этого зависит и текущее обучение: текст тура помечен как motion-safe — при выключенных анимациях панель подсказок появится без плавного съезда, остальная логика та же.",
    tourChrome: { settingsOpen: true, profileOpen: false },
    measureDelayMs: 100,
  },
  {
    path: "/dashboard",
    selector: '[data-tour="nav-profile"]',
    title: "Профиль",
    body: "Пункт «Профиль» открывает учётную запись: просмотр и правку данных (для администратора) и отдельно — смену пароля.",
    tourChrome: { settingsOpen: false, profileOpen: false },
  },
  {
    path: "/dashboard",
    selector: '[data-tour="profile-dialog-content"]',
    title: "Профиль",
    body: "На вкладке «Редактирование» администратор меняет ФИО, почту, телефон и реквизиты; преподаватель видит сведения о себе и ответственности за аудитории. Перейдём к вкладке «Смена пароля».",
    tourChrome: { settingsOpen: false, profileOpen: true, profileTab: "edit" },
    measureDelayMs: 120,
  },
  {
    path: "/dashboard",
    selector: '[data-tour="profile-password-section"]',
    title: "Смена пароля",
    body: "Вводятся текущий пароль, новый (не короче 8 символов) и повтор. После успешной смены появится подтверждение; при неверном текущем пароле система сообщит об ошибке.",
    tourChrome: { settingsOpen: false, profileOpen: true, profileTab: "password" },
    measureDelayMs: 120,
  },
  {
    path: "/dashboard",
    selector: '[data-tour="admin-primary-stats"]',
    title: "Краткие сведения",
    body: "Здесь отображаются главные показатели: неисправности, оборудование в целом, ремонты и закрытые обращения за месяц.",
  },
  {
    path: "/dashboard",
    selector: '[data-tour="admin-secondary-stats"]',
    title: "Быстрые сведения",
    body: "Компактные карточки: исправное и неисправное оборудование, аудитории и рабочие места, каталог ПО и число пользователей.",
  },
  {
    path: "/dashboard",
    selector: '[data-tour="admin-quick-actions"]',
    title: "Быстрые действия",
    body: "Переходы к частым разделам: заявки, оборудование, аудитории и создание отчёта.",
  },
  {
    path: "/dashboard",
    selector: '[data-tour="nav-pc-config"]',
    title: "Конфигурация ПК",
    body: "В группе «Аудитории и рабочие места» откройте «Конфигурация ПК» — учёт железа и характеристик компьютеров, привязанных к рабочим местам.",
  },
  {
    path: "/dashboard/pc-config",
    selector: '[data-tour="tour-pc-config-page"]',
    title: "Конфигурация ПК",
    body: "Сводка по статусам ПК, фильтры по аудитории и статусу оборудования, таблица конфигураций с процессором, памятью и носителем. Здесь же добавление и правка карточек ПК.",
  },
  {
    path: "/dashboard",
    selector: '[data-tour="nav-workstations"]',
    title: "Рабочие места",
    body: "Пункт «Рабочие места» — реестр РМ в аудиториях: код места, комплектация, статус и операции перемещения.",
  },
  {
    path: "/dashboard/workstations",
    selector: '[data-tour="tour-workstations-page"]',
    title: "Рабочие места",
    body: "Статистика по местам, фильтры и таблица. Администратор может создавать и редактировать РМ, смотреть состав и переносить место в другую аудиторию при необходимости.",
  },
  {
    path: "/dashboard",
    selector: '[data-tour="nav-classrooms"]',
    title: "Аудитории",
    body: "Раздел «Аудитории» объединяет аудитории, типы помещений и корпуса: вместимость, этаж, ответственные и связь с рабочими местами.",
  },
  {
    path: "/dashboard/classrooms",
    selector: '[data-tour="tour-classrooms-page"]',
    title: "Аудитории",
    body: "Сводные карточки и вкладки: список аудиторий с фильтрами, для администратора — ещё типы и корпуса. Отсюда ведётся нормативный справочник помещений.",
  },
  {
    path: "/dashboard",
    selector: '[data-tour="nav-users"]',
    title: "Все пользователи",
    body: "В блоке «Пользователи» — учётные записи администраторов и преподавателей, роли, блокировки и отдельно назначение ответственности за аудитории.",
  },
  {
    path: "/dashboard/users",
    selector: '[data-tour="tour-users-page"]',
    title: "Все пользователи",
    body: "Показатели по ролям и статусам, фильтры, таблица пользователей и вкладка ответственности. Добавление и редактирование доступны администратору.",
  },
  {
    path: "/dashboard",
    selector: '[data-tour="nav-reports"]',
    title: "Отчёты",
    body: "«Отчёты» ведут к аналитике: обзор по оборудованию, статусам, кабинетам, проблемному парку, ПО и истории. Отсюда же выгрузки и печать на отдельных вкладках.",
  },
  {
    path: "/dashboard/reports",
    selector: '[data-tour="tour-reports-page"]',
    title: "Отчёты",
    body: "Ключевые метрики по парку и вкладки с детализацией. Используйте их для контроля исправности и загрузки аудиторий; при необходимости экспортируйте таблицы.",
  },
  {
    path: "/dashboard",
    selector: '[data-tour="nav-movement-journal"]',
    title: "Журнал перемещения",
    body: "Последний пункт в «Отчётность и аналитика» — журнал переносов оборудования и рабочих мест между аудиториями, с периодом, поиском и откатом записей.",
  },
  {
    path: "/dashboard/movement-journal",
    selector: '[data-tour="tour-movement-journal-page"]',
    title: "Журнал перемещения",
    body: "Хронология операций: кто инициировал, откуда и куда перемещено, тип записи (оборудование или РМ). Фильтр по датам и тексту, печать и экспорт доступны в шапке страницы.",
  },
]

export function DashboardAdminTour({
  active,
  onClose,
}: {
  active: boolean
  onClose: () => void
}) {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "ADMIN"
  const pathname = usePathname()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const [showSettingsHint, setShowSettingsHint] = useState(false)
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)
  const [punchSettled, setPunchSettled] = useState(false)
  const [viewport, setViewport] = useState(() =>
    typeof window !== "undefined"
      ? { w: window.innerWidth, h: window.innerHeight }
      : { w: 1200, h: 800 },
  )
  const tourMaskId = `edu-tour-veil-mask-${useId().replace(/:/g, "")}`

  const steps = useMemo(() => (isAdmin ? ADMIN_TOUR_STEPS : []), [isAdmin])

  useLayoutEffect(() => {
    setPortalTarget(document.body)
  }, [])

  useLayoutEffect(() => {
    const sync = () => setViewport({ w: window.innerWidth, h: window.innerHeight })
    sync()
    window.addEventListener("resize", sync)
    return () => window.removeEventListener("resize", sync)
  }, [])

  useLayoutEffect(() => {
    setPunchSettled(false)
  }, [step])

  useEffect(() => {
    if (!active || !isAdmin) return
    const id = window.setTimeout(() => setPunchSettled(true), 620)
    return () => window.clearTimeout(id)
  }, [step, active, isAdmin])

  useEffect(() => {
    if (!active || !isAdmin) {
      window.dispatchEvent(new CustomEvent(EDU_TOUR_MOCK_UI_EVENT, { detail: { reset: true } }))
      return
    }
    const spec = steps[step]?.mockUi
    if (spec) {
      window.dispatchEvent(new CustomEvent(EDU_TOUR_MOCK_UI_EVENT, { detail: spec }))
    } else {
      window.dispatchEvent(new CustomEvent(EDU_TOUR_MOCK_UI_EVENT, { detail: { reset: true } }))
    }
  }, [active, isAdmin, step, steps])

  useEffect(() => {
    if (!active || !isAdmin) {
      window.dispatchEvent(new CustomEvent(EDU_TOUR_CHROME_EVENT, { detail: { reset: true } }))
      return
    }
    const tc = steps[step]?.tourChrome
    if (tc) {
      window.dispatchEvent(new CustomEvent(EDU_TOUR_CHROME_EVENT, { detail: tc }))
    } else {
      window.dispatchEvent(
        new CustomEvent(EDU_TOUR_CHROME_EVENT, {
          detail: { settingsOpen: false, profileOpen: false },
        }),
      )
    }
  }, [active, isAdmin, step, steps])

  useEffect(() => {
    if (!active || !isAdmin) {
      window.dispatchEvent(
        new CustomEvent(EDU_TOUR_CATEGORIES_TAB_EVENT, { detail: { tab: "categories" } }),
      )
      return
    }
    const tab = steps[step]?.categoriesTab
    if (tab) {
      window.dispatchEvent(
        new CustomEvent(EDU_TOUR_CATEGORIES_TAB_EVENT, { detail: { tab } }),
      )
    }
  }, [active, isAdmin, step, steps])

  useLayoutEffect(() => {
    if (!active || !isAdmin) {
      return
    }
    if (step >= steps.length) return
    const targetPath = steps[step].path
    if (pathname !== targetPath) {
      router.push(targetPath)
    }
  }, [active, isAdmin, step, steps, pathname, router])

  const measureStepRect = useCallback(() => {
    if (!active || !isAdmin || step >= steps.length) {
      setRect(null)
      return
    }
    const meta = steps[step]
    if (pathname !== meta.path) {
      setRect(null)
      return
    }
    const run = () => {
      const el = document.querySelector(meta.selector)
      if (!(el instanceof HTMLElement)) {
        setRect(null)
        return
      }
      el.scrollIntoView({ block: "center", behavior: "auto", inline: "nearest" })
      setRect(readRect(el))
    }
    const delay = meta.measureDelayMs ?? 0
    if (delay > 0) {
      const id = window.setTimeout(run, delay)
      return () => window.clearTimeout(id)
    }
    run()
    return undefined
  }, [active, isAdmin, step, steps, pathname])

  useLayoutEffect(() => {
    const cleanup = measureStepRect()
    return typeof cleanup === "function" ? cleanup : undefined
  }, [measureStepRect])

  useEffect(() => {
    if (!active || !isAdmin) return
    if (step >= steps.length) return
    const meta = steps[step]
    if (pathname !== meta.path) return
    const t = window.setTimeout(() => {
      const el = document.querySelector(meta.selector)
      if (!(el instanceof HTMLElement)) return
      el.scrollIntoView({ block: "center", behavior: "auto", inline: "nearest" })
      setRect(readRect(el))
    }, 400)
    return () => window.clearTimeout(t)
  }, [active, isAdmin, step, pathname, steps])

  useEffect(() => {
    if (!active || !isAdmin) return
    const onResize = () => {
      if (step >= steps.length) return
      const meta = steps[step]
      if (pathname !== meta.path) return
      const el = document.querySelector(meta.selector)
      if (!(el instanceof HTMLElement)) return
      el.scrollIntoView({ block: "center", behavior: "auto", inline: "nearest" })
      setRect(readRect(el))
    }
    window.addEventListener("resize", onResize)
    window.addEventListener("scroll", onResize, true)
    return () => {
      window.removeEventListener("resize", onResize)
      window.removeEventListener("scroll", onResize, true)
    }
  }, [active, isAdmin, step, pathname, steps])

  useEffect(() => {
    if (!active) setStep(0)
  }, [active])

  useEffect(() => {
    if (!active) return
    setShowSettingsHint(peekTourSettingsHint())
  }, [active])

  useEffect(() => {
    if (!active) setPunchSettled(false)
  }, [active])

  if (!active) return null

  if (!portalTarget) return null

  if (!isAdmin) {
    return createPortal(
      <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 p-4 pb-8 sm:items-center">
        <div className="max-w-md rounded-xl border bg-card p-6 text-card-foreground shadow-xl">
          <p className="text-sm font-medium">Добро пожаловать!</p>
          <p className="mt-2 text-sm text-muted-foreground text-pretty">
            Основные разделы доступны в меню слева: оборудование, аудитории, заявки и отчёты.
          </p>
          {showSettingsHint ? (
            <Alert className="mt-4 border-primary/25 bg-primary/5">
              <AlertDescription className="text-xs leading-relaxed text-pretty">
                Автоматическое обучение можно полностью отключить в{" "}
                <span className="font-medium text-foreground">Настройки</span> — кнопка{" "}
                <span className="font-medium text-foreground">«Пропустить обучение»</span>.
              </AlertDescription>
            </Alert>
          ) : null}
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                skipOnboardingForever()
                clearTourSettingsHint()
                onClose()
              }}
            >
              Пропустить обучение
            </Button>
            <Button
              type="button"
              onClick={() => {
                completeOnboarding()
                clearTourSettingsHint()
                onClose()
              }}
            >
              Понятно
            </Button>
          </div>
        </div>
      </div>,
      portalTarget,
    )
  }

  const meta = steps[step]
  const isLast = step >= steps.length - 1
  const panelRight = isModalSpotlightStep(meta)
  const stepPanelAnimation = panelRight ? STEP_PANEL_ANIMATION_RIGHT : STEP_PANEL_ANIMATION

  const holeCssVars: CSSProperties | undefined = rect
    ? {
        "--edu-tour-cx": `${rect.left + rect.width / 2}px`,
        "--edu-tour-cy": `${rect.top + rect.height / 2}px`,
        "--edu-tour-target-left": `${rect.left}px`,
        "--edu-tour-target-top": `${rect.top}px`,
        "--edu-tour-target-width": `${rect.width}px`,
        "--edu-tour-target-height": `${rect.height}px`,
      }
    : undefined

  return createPortal(
    <>
      {rect ? (
        <div
          className="edu-tour-veil-wrap pointer-events-auto fixed inset-0 z-[109]"
          aria-hidden
          aria-label="Затемнение фона тура"
          style={holeCssVars}
          onClick={(e) => e.stopPropagation()}
        >
          <svg
            className="pointer-events-none fixed inset-0 h-full w-full opacity-0"
            aria-hidden
            width={viewport.w}
            height={viewport.h}
          >
            <defs>
              <mask
                id={tourMaskId}
                maskType="luminance"
                maskUnits="userSpaceOnUse"
                maskContentUnits="userSpaceOnUse"
                x={0}
                y={0}
                width={viewport.w}
                height={viewport.h}
              >
                <rect x={0} y={0} width={viewport.w} height={viewport.h} fill="white" />
                <rect
                  key={step}
                  className={cn("edu-tour-mask-hole", punchSettled && "edu-tour-mask-hole--settled")}
                  rx={TOUR_MASK_RADIUS}
                  ry={TOUR_MASK_RADIUS}
                  fill="black"
                />
              </mask>
            </defs>
          </svg>
          <div
            className="edu-tour-veil-dim absolute inset-0 bg-black/[0.76] dark:bg-black/80"
            style={{
              maskImage: `url(#${tourMaskId})`,
              WebkitMaskImage: `url(#${tourMaskId})`,
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              maskPosition: "0 0",
              WebkitMaskPosition: "0 0",
              maskSize: `${viewport.w}px ${viewport.h}px`,
              WebkitMaskSize: `${viewport.w}px ${viewport.h}px`,
            }}
          />
        </div>
      ) : (
        <div
          className="fixed inset-0 z-[109] bg-black/40"
          aria-hidden
          onClick={(e) => e.stopPropagation()}
        />
      )}
      {rect ? (
        <>
          <div
            key={`tour-bloom-${step}`}
            className="edu-tour-spotlight-bloom pointer-events-none fixed z-[110] rounded-xl border border-white/20 bg-white/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)] dark:border-white/15 dark:bg-white/10 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
            style={{
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            }}
          />
          <div
            key={`tour-frame-${step}`}
            className="edu-tour-spotlight-frame pointer-events-none fixed z-[111] rounded-xl border-2 border-primary ring-2 ring-primary/40"
            style={{
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            }}
          />
        </>
      ) : null}
      {/* Не добавлять полноэкранный pointer-events слой выше Dialog: он ломает скролл контента модалки. Закрытие по клику/Esc при туре блокируется в components/ui/dialog.tsx */}
      <div
        className={cn(
          "pointer-events-none fixed inset-0 z-[130] flex p-4 pb-6",
          panelRight
            ? "items-center justify-end sm:items-center sm:pr-5"
            : "items-end justify-center sm:items-end",
        )}
      >
        <div
          className={cn(
            "pointer-events-auto w-full max-w-md rounded-xl border bg-card p-4 text-card-foreground shadow-xl",
            panelRight && "max-h-[min(92vh,100dvh)] overflow-y-auto sm:max-w-sm",
            !panelRight && rect && "sm:mb-4",
          )}
        >
          <div key={step} className={stepPanelAnimation}>
            <p className="text-xs font-medium text-muted-foreground">
              Шаг {step + 1} из {steps.length}
            </p>
            <p className="mt-1 text-base font-semibold">{meta.title}</p>
            <p className="mt-2 text-sm text-muted-foreground text-pretty">{meta.body}</p>
            {showSettingsHint && step === 0 ? (
              <Alert className="mt-4 border-primary/25 bg-primary/5">
                <AlertDescription className="text-xs leading-relaxed text-pretty">
                  Чтобы больше не показывать подсказки по сайту, нажмите{" "}
                  <span className="font-medium text-foreground">«Пропустить обучение»</span> ниже или
                  откройте <span className="font-medium text-foreground">Настройки</span> внизу меню слева —
                  там та же кнопка (окно настроек откроется поверх тура).
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto justify-start p-0 text-muted-foreground no-underline hover:text-foreground hover:no-underline"
              onClick={() => {
                skipOnboardingForever()
                clearTourSettingsHint()
                onClose()
              }}
            >
              Пропустить обучение
            </Button>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearTourSettingsHint()
                  onClose()
                }}
              >
                Закрыть
              </Button>
              {step > 0 ? (
                <Button type="button" variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
                  Назад
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (isLast) {
                    clearTourSettingsHint()
                    completeOnboarding()
                    onClose()
                  } else {
                    if (step === 0) {
                      clearTourSettingsHint()
                      setShowSettingsHint(false)
                    }
                    setStep((s) => s + 1)
                  }
                }}
              >
                {isLast ? "Готово" : "Далее"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>,
    portalTarget,
  )
}
