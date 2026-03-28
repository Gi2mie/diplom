"use client"

import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { User, LogOut, Settings, Shield, Sun, Moon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useTheme } from "@/components/providers/theme-provider"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export function UserMenu() {
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const [settingsOpen, setSettingsOpen] = useState(false)

  if (!session?.user) {
    return (
      <Button variant="ghost" className="relative h-10 w-10 rounded-full" disabled>
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-muted" />
        </Avatar>
      </Button>
    )
  }

  const initials = `${session.user.name?.[0] || ""}${session.user.name?.split(" ")[1]?.[0] || ""}`.toUpperCase()
  const isAdmin = session.user.role === "ADMIN"

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {initials || <User className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium leading-none">{session.user.name}</p>
              <p className="text-xs leading-none text-muted-foreground">{session.user.email}</p>
              <Badge variant={isAdmin ? "default" : "secondary"} className="mt-1 w-fit">
                {isAdmin ? (
                  <>
                    <Shield className="mr-1 h-3 w-3" />
                    Администратор
                  </>
                ) : (
                  "Преподаватель"
                )}
              </Badge>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a href="/dashboard#profile">
              <User className="mr-2 h-4 w-4" />
              Профиль
            </a>
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
              <Settings className="mr-2 h-4 w-4" />
              Настройки
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Выйти
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Настройки</DialogTitle>
            <DialogDescription>
              Управление параметрами системы
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Theme Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium leading-none">Тема интерфейса</label>
              <div className="grid grid-cols-2 gap-3">
                {/* Light Theme */}
                <button
                  onClick={() => setTheme("light")}
                  className={cn(
                    "relative flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all hover:bg-accent cursor-pointer",
                    theme === "light"
                      ? "border-primary bg-accent"
                      : "border-border"
                  )}
                >
                  <div className="w-12 h-8 rounded border border-border bg-white flex items-center justify-center">
                    <Sun className="h-4 w-4 text-amber-500" />
                  </div>
                  <span className="text-xs font-medium">Светлая</span>
                  {theme === "light" && (
                    <div className="absolute top-2 right-2 h-3 w-3 rounded-full bg-primary" />
                  )}
                </button>

                {/* Dark Theme */}
                <button
                  onClick={() => setTheme("dark")}
                  className={cn(
                    "relative flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all hover:bg-accent cursor-pointer",
                    theme === "dark"
                      ? "border-primary bg-accent"
                      : "border-border"
                  )}
                >
                  <div className="w-12 h-8 rounded border border-slate-700 bg-slate-900 flex items-center justify-center">
                    <Moon className="h-4 w-4 text-blue-400" />
                  </div>
                  <span className="text-xs font-medium">Тёмная</span>
                  {theme === "dark" && (
                    <div className="absolute top-2 right-2 h-3 w-3 rounded-full bg-primary" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Текущая тема: <span className="font-medium text-foreground">{theme === "light" ? "Светлая" : "Тёмная"}</span>
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
