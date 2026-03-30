"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { 
  Monitor, 
  LayoutDashboard,
  School,
  Wrench,
  AlertTriangle,
  FileText,
  Users,
  LogOut,
  ChevronRight,
  Cpu,
  HardDrive,
  MonitorSmartphone,
  Laptop,
  User,
  Package,
  ClipboardList,
  Settings
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from "@/components/ui/breadcrumb"
import { SettingsDialog } from "@/components/dashboard/settings-dialog"
import { ProfileDialog } from "@/components/dashboard/profile-dialog"
import { OnboardingInvite } from "@/components/onboarding/onboarding-invite"
import { DashboardTourHost } from "@/components/onboarding/dashboard-tour-host"
import { Skeleton } from "@/components/ui/skeleton"
import { type EduTourChromeDetail, EDU_TOUR_CHROME_EVENT } from "@/lib/site-onboarding"

type NavigationItem = {
  title: string
  href: string
  icon: any
}

type NavigationGroup = {
  title: string
  items: NavigationItem[]
}

type NavCounts = {
  softwareRequests: number
  activeRepairs: number
  issues: number
}

function formatNavBadge(href: string, counts: NavCounts | null, isAdmin: boolean): string | null {
  if (!isAdmin || !counts) return null
  const map: Record<string, number> = {
    "/dashboard/software-requests": counts.softwareRequests,
    "/dashboard/repairs": counts.activeRepairs,
    "/dashboard/issues": counts.issues,
  }
  const n = map[href]
  if (n === undefined || n < 1) return null
  return String(n)
}

// Навигация для администратора
const adminNavigation: NavigationGroup[] = [
  {
    title: "Главное",
    items: [
      { title: "Панель управления", href: "/dashboard", icon: LayoutDashboard },
    ]
  },
  {
    title: "Управление оборудованием",
    items: [
      { title: "Оборудование", href: "/dashboard/equipment", icon: Package },
      { title: "Категории и типы", href: "/dashboard/categories", icon: Cpu },
      { title: "Программное обеспечение", href: "/dashboard/software", icon: HardDrive },
    ]
  },
  {
    title: "Аудитории и рабочие места",
    items: [
      { title: "Аудитории", href: "/dashboard/classrooms", icon: School },
      { title: "Рабочие места", href: "/dashboard/workstations", icon: MonitorSmartphone },
      { title: "Конфигурация ПК", href: "/dashboard/pc-config", icon: Laptop },
    ]
  },
  {
    title: "Заявки и ремонт",
    items: [
      { title: "Заявки на ПО", href: "/dashboard/software-requests", icon: HardDrive },
      { title: "Активные ремонты", href: "/dashboard/repairs", icon: Wrench },
      { title: "Неисправности", href: "/dashboard/issues", icon: AlertTriangle },
    ]
  },
  {
    title: "Пользователи",
    items: [
      { title: "Все пользователи", href: "/dashboard/users", icon: Users },
    ]
  },
  {
    title: "Отчётность и аналитика",
    items: [
      { title: "Отчёты", href: "/dashboard/reports", icon: FileText },
      { title: "Журнал перемещения", href: "/dashboard/movement-journal", icon: ClipboardList },
    ]
  },
]

/** Якоря пошагового обучения (пункты бокового меню) */
const SIDEBAR_LINK_DATA_TOUR: Partial<Record<string, string>> = {
  "/dashboard/software": "nav-software",
  "/dashboard/categories": "nav-categories",
  "/dashboard/equipment": "nav-equipment",
  "/dashboard/pc-config": "nav-pc-config",
  "/dashboard/workstations": "nav-workstations",
  "/dashboard/classrooms": "nav-classrooms",
  "/dashboard/users": "nav-users",
  "/dashboard/reports": "nav-reports",
  "/dashboard/movement-journal": "nav-movement-journal",
}

// Навигация для преподавателя
const teacherNavigation: NavigationGroup[] = [
  {
    title: "Главное",
    items: [
      { title: "Панель управления", href: "/dashboard", icon: LayoutDashboard },
    ]
  },
  {
    title: "Оборудование",
    items: [
      { title: "Просмотр оборудования", href: "/dashboard/equipment", icon: Package },
      { title: "Аудитории", href: "/dashboard/classrooms", icon: School },
    ]
  },
  {
    title: "Заявки",
    items: [
      { title: "Мои заявки", href: "/dashboard/my-requests", icon: ClipboardList },
      { title: "Заявки на ПО", href: "/dashboard/software-requests", icon: HardDrive },
      { title: "Сообщить о проблеме", href: "/dashboard/requests/new", icon: AlertTriangle },
    ]
  },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileForcedTab, setProfileForcedTab] = useState<"edit" | "password" | undefined>(
    undefined,
  )
  const [navCounts, setNavCounts] = useState<NavCounts | null>(null)

  const { data: session, status } = useSession()
  const isAdminSession = session?.user?.role === "ADMIN"

  useEffect(() => {
    if (typeof window === "undefined") return
    const openFromHash = () => {
      if (!pathname?.startsWith("/dashboard")) return
      if (window.location.hash === "#profile") {
        setProfileOpen(true)
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}`
        )
      }
    }
    openFromHash()
    window.addEventListener("hashchange", openFromHash)
    return () => window.removeEventListener("hashchange", openFromHash)
  }, [pathname])

  useEffect(() => {
    const fn = (e: Event) => {
      const d = (e as CustomEvent<EduTourChromeDetail>).detail
      if (!d) return
      if ("reset" in d && d.reset) {
        setSettingsOpen(false)
        setProfileOpen(false)
        setProfileForcedTab(undefined)
        return
      }
      setSettingsOpen(d.settingsOpen)
      setProfileOpen(d.profileOpen)
      if (d.profileOpen) {
        setProfileForcedTab(d.profileTab ?? "edit")
      } else {
        setProfileForcedTab(undefined)
      }
    }
    window.addEventListener(EDU_TOUR_CHROME_EVENT, fn as EventListener)
    return () => window.removeEventListener(EDU_TOUR_CHROME_EVENT, fn as EventListener)
  }, [])

  useEffect(() => {
    if (!isAdminSession) {
      setNavCounts(null)
      return
    }
    let cancelled = false
    fetch("/api/dashboard-nav-counts", { cache: "no-store" })
      .then((res) => res.json())
      .then((d: NavCounts) => {
        if (
          cancelled ||
          typeof d?.softwareRequests !== "number" ||
          typeof d?.activeRepairs !== "number" ||
          typeof d?.issues !== "number"
        ) {
          return
        }
        setNavCounts({
          softwareRequests: d.softwareRequests,
          activeRepairs: d.activeRepairs,
          issues: d.issues,
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isAdminSession])

  if (status === "loading") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-4">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-4 w-36" />
          <p className="text-sm text-muted-foreground">Загрузка рабочей области…</p>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    // Если сессии нет — отправляем на логин
    window.location.href = "/login"
    return null
  }
  
  const isAdmin = isAdminSession
  const navigation = isAdmin ? adminNavigation : teacherNavigation

  const nameParts = (session.user.name || "").split(/\s+/).filter(Boolean)
  const sidebarDisplayName =
    (session.user.name || "").trim() ||
    session.user.email?.split("@")[0] ||
    "Пользователь"
  const initials =
    nameParts.length >= 2
      ? `${nameParts[1]?.[0] ?? ""}${nameParts[0]?.[0] ?? ""}`.toUpperCase()
      : nameParts.length === 1
        ? nameParts[0].slice(0, 2).toUpperCase()
        : (session.user.email?.[0] ?? "?").toUpperCase()
  
  // Получаем текущий заголовок страницы для breadcrumb
  const currentPage = navigation
    .flatMap(group => group.items)
    .find(item => pathname === item.href || pathname.startsWith(item.href + "/"))
  
  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" })
  }

  return (
    <SidebarProvider>
      <Sidebar variant="inset">
        <SidebarHeader>
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Monitor className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-semibold">EduControl</span>
              <span className="text-xs text-muted-foreground">
                {isAdmin ? "Администратор" : "Преподаватель"}
              </span>
            </div>
          </div>
        </SidebarHeader>
        
        <SidebarSeparator />
        
        <SidebarContent>
          {navigation.map((group) => (
            <SidebarGroup key={group.title}>
              <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const navBadgeText = formatNavBadge(item.href, navCounts, isAdmin)
                    return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
                        tooltip={item.title}
                      >
                        <Link href={item.href} data-tour={SIDEBAR_LINK_DATA_TOUR[item.href]}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                          {navBadgeText ? (
                            <Badge variant="secondary" className="ml-auto text-xs">
                              {navBadgeText}
                            </Badge>
                          ) : null}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        
        <SidebarSeparator />
        
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <span data-tour="nav-profile" className="block w-full">
                <SidebarMenuButton
                  className="w-full"
                  type="button"
                  tooltip="Профиль"
                  onClick={() => setProfileOpen(true)}
                >
                  <User className="h-4 w-4" />
                  <span>Профиль</span>
                </SidebarMenuButton>
              </span>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <span data-tour="nav-settings" className="block w-full">
                <SidebarMenuButton
                  className="w-full"
                  onClick={() => setSettingsOpen(true)}
                  tooltip="Настройки"
                >
                  <Settings className="h-4 w-4" />
                  <span>Настройки</span>
                </SidebarMenuButton>
              </span>
            </SidebarMenuItem>
          </SidebarMenu>
          
          <Separator className="my-2" />
          
          {/* User Profile */}
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden">
              <span className="truncate text-sm font-medium" title={sidebarDisplayName}>
                {sidebarDisplayName}
              </span>
              <span
                className="text-xs leading-snug text-muted-foreground [overflow-wrap:anywhere] break-all line-clamp-2"
                title={session.user.email?.trim() || undefined}
              >
                {session.user.email?.trim() || "—"}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Выйти">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      
      <SidebarInset>
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border/80 bg-background/90 px-4 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80 md:gap-4 md:px-6">
          <SidebarTrigger className="transition-transform duration-200 hover:opacity-90" />
          <Separator orientation="vertical" className="hidden h-6 sm:block" />
          <Breadcrumb className="min-w-0">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">EduControl</BreadcrumbLink>
              </BreadcrumbItem>
              {currentPage && currentPage.href !== "/dashboard" && (
                <>
                  <BreadcrumbSeparator>
                    <ChevronRight className="h-4 w-4" />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <BreadcrumbPage>{currentPage.title}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        
        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div
            className="edu-page-enter page-shell px-4 py-5 sm:px-5 sm:py-6 md:px-6 md:py-8"
          >
            {children}
          </div>
        </main>
      </SidebarInset>
      
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <ProfileDialog
        open={profileOpen}
        onOpenChange={(o) => {
          setProfileOpen(o)
          if (!o) setProfileForcedTab(undefined)
        }}
        forcedTab={profileForcedTab}
      />
      <OnboardingInvite />
      <DashboardTourHost />
    </SidebarProvider>
  )
}
