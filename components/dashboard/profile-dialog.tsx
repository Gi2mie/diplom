"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { changeOwnPassword } from "@/lib/api/account"
import { fetchClassroomRegistry, type RegistryClassroom } from "@/lib/api/classroom-registry"
import { fetchUserById, updateUser, type UserListItem } from "@/lib/api/users"
import { formatRuPhoneMask, isCompleteRuPhone11 } from "@/lib/ru-phone"
import {
  composeNhtkEmail,
  emailLocalPartFromNhtkEmail,
  isValidNhtkEmail,
  sanitizeEmailLocalInput,
} from "@/lib/user-validation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Mail,
  School,
  Shield,
  User,
  Calendar,
  Clock,
  Key,
  Loader2,
  UserPen,
  Eye,
  EyeOff,
} from "lucide-react"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Вкладка при открытии из пошагового обучения */
  forcedTab?: "edit" | "password"
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

const formatDateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—"

export function ProfileDialog({ open, onOpenChange, forcedTab }: Props) {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<"edit" | "password">("edit")
  const isAdmin = session?.user?.role === "ADMIN"
  const isTeacher = session?.user?.role === "TEACHER"

  const [user, setUser] = useState<UserListItem | null>(null)
  const [responsibleClassrooms, setResponsibleClassrooms] = useState<RegistryClassroom[]>([])
  const [classroomsLoading, setClassroomsLoading] = useState(false)
  const [classroomsError, setClassroomsError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [lastName, setLastName] = useState("")
  const [firstName, setFirstName] = useState("")
  const [middleName, setMiddleName] = useState("")
  const [emailLocal, setEmailLocal] = useState("")
  const [phone, setPhone] = useState("")
  const [position, setPosition] = useState("")
  const [department, setDepartment] = useState("")

  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdError, setPwdError] = useState<string | null>(null)
  const [pwdOk, setPwdOk] = useState<string | null>(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const loadUser = useCallback(async () => {
    if (!session?.user?.id) return
    setLoading(true)
    setLoadError(null)
    try {
      const u = await fetchUserById(session.user.id)
      setUser(u)
      setLastName(u.lastName)
      setFirstName(u.firstName)
      setMiddleName(u.middleName ?? "")
      setEmailLocal(emailLocalPartFromNhtkEmail(u.email))
      setPhone(u.phone ? formatRuPhoneMask(u.phone) : "")
      setPosition(u.position ?? "")
      setDepartment(u.department ?? "")
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Не удалось загрузить профиль")
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (open) {
      setActiveTab(forcedTab ?? "edit")
    }
  }, [open, forcedTab])

  useEffect(() => {
    if (open && session?.user?.id) {
      void loadUser()
      setProfileError(null)
      setPwdError(null)
      setPwdOk(null)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setShowCurrentPassword(false)
      setShowNewPassword(false)
      setShowConfirmPassword(false)
    }
    if (!open) {
      setResponsibleClassrooms([])
      setClassroomsError(null)
    }
  }, [open, session?.user?.id, loadUser])

  useEffect(() => {
    if (!open || !isTeacher) return
    let cancelled = false
    setClassroomsLoading(true)
    setClassroomsError(null)
    void fetchClassroomRegistry()
      .then((data) => {
        if (cancelled) return
        const sorted = [...data.classrooms].sort((a, b) =>
          a.number.localeCompare(b.number, "ru", { numeric: true })
        )
        setResponsibleClassrooms(sorted)
      })
      .catch((e) => {
        if (!cancelled) {
          setClassroomsError(e instanceof Error ? e.message : "Не удалось загрузить аудитории")
          setResponsibleClassrooms([])
        }
      })
      .finally(() => {
        if (!cancelled) setClassroomsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, isTeacher])

  const fullName = user
    ? `${user.lastName} ${user.firstName} ${user.middleName ?? ""}`.trim()
    : ""
  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase()
    : ""

  const handleSaveProfile = async () => {
    if (!session?.user?.id || !isAdmin) return
    setProfileError(null)
    const emailNorm = composeNhtkEmail(emailLocal)
    if (!isValidNhtkEmail(emailNorm)) {
      setProfileError("Укажите имя почты до @nhtk, например ivanov")
      return
    }
    if (!isCompleteRuPhone11(phone)) {
      setProfileError("Введите телефон полностью: +7(999) 999-99-99")
      return
    }
    setProfileSaving(true)
    try {
      const updated = await updateUser(session.user.id, {
        lastName,
        firstName,
        middleName: middleName || undefined,
        email: emailNorm,
        phone: formatRuPhoneMask(phone),
        position: position || undefined,
        department: department || undefined,
      })
      setUser(updated)
      window.location.reload()
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : "Ошибка сохранения")
    } finally {
      setProfileSaving(false)
    }
  }

  const handleChangePassword = async () => {
    setPwdError(null)
    setPwdOk(null)
    if (!newPassword || newPassword.length < 8) {
      setPwdError("Новый пароль — не менее 8 символов")
      return
    }
    if (newPassword !== confirmPassword) {
      setPwdError("Повтор нового пароля не совпадает")
      return
    }
    setPwdSaving(true)
    try {
      await changeOwnPassword(currentPassword, newPassword)
      setPwdOk("Пароль обновлён")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (e) {
      setPwdError(e instanceof Error ? e.message : "Не удалось сменить пароль")
    } finally {
      setPwdSaving(false)
    }
  }

  const tabBodyScroll =
    "max-h-[calc(92vh-11.5rem)] min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-6 pb-6 pr-5 [scrollbar-gutter:stable]"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="z-[118] flex max-h-[92vh] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        overlayClassName="z-[117]"
      >
        <DialogHeader className="shrink-0 space-y-1 px-6 pt-6 pb-2">
          <DialogTitle>Профиль</DialogTitle>
          <DialogDescription className="sr-only">
            Учётная запись: просмотр и изменение данных, смена пароля.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex justify-center py-12 text-muted-foreground px-6">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}
        {loadError && (
          <p className="text-sm text-destructive px-6 pb-4">{loadError}</p>
        )}

        {!loading && user && (
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "edit" | "password")}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <div className="shrink-0 px-6 pb-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="edit" className="gap-1.5">
                  <UserPen className="h-3.5 w-3.5" />
                  Редактирование
                </TabsTrigger>
                <TabsTrigger value="password" className="gap-1.5">
                  <Key className="h-3.5 w-3.5" />
                  Смена пароля
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent
              value="edit"
              className="mt-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
            >
              <div className={tabBodyScroll}>
                <div className="space-y-5">
                  <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                    <Avatar className="h-16 w-16 border-2 border-border shrink-0">
                      <AvatarFallback className="text-lg font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-center sm:text-left min-w-0">
                      <h3 className="text-lg font-semibold">{fullName}</h3>
                      <Badge
                        variant={isAdmin ? "default" : "secondary"}
                        className="mt-1"
                      >
                        {isAdmin ? (
                          <>
                            <Shield className="mr-1 h-3 w-3" />
                            Администратор
                          </>
                        ) : (
                          <>
                            <User className="mr-1 h-3 w-3" />
                            Преподаватель
                          </>
                        )}
                      </Badge>
                      {user.position && (
                        <p className="mt-1 text-sm text-muted-foreground">{user.position}</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="break-all">{user.email}</span>
                    </div>
                    <div className="text-muted-foreground">
                      {user.phone || "Телефон не указан"}
                    </div>
                    {user.department && (
                      <div className="text-muted-foreground">{user.department}</div>
                    )}
                    <Separator />
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 shrink-0" />
                        <span>Регистрация: {formatDate(user.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>Вход: {formatDateTime(user.lastLoginAt)}</span>
                      </div>
                    </div>
                  </div>

                  {isTeacher ? (
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <School className="h-4 w-4 text-muted-foreground shrink-0" />
                        Ответственность за кабинеты
                      </h4>
                      {classroomsLoading ? (
                        <div className="flex items-center gap-2 text-muted-foreground py-1">
                          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                          <span>Загрузка…</span>
                        </div>
                      ) : classroomsError ? (
                        <p className="text-sm text-destructive">{classroomsError}</p>
                      ) : responsibleClassrooms.length === 0 ? (
                        <p className="text-muted-foreground">
                          За вами не закреплено ни одной аудитории.
                        </p>
                      ) : (
                        <ul className="flex flex-wrap gap-2">
                          {responsibleClassrooms.map((c) => (
                            <li key={c.id}>
                              <Badge variant="secondary" className="font-normal">
                                № {c.number}
                                {c.name ? ` · ${c.name}` : ""}
                              </Badge>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : null}

                  {isAdmin ? (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Данные для сохранения в системе</h4>
                      <div className="grid gap-3">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Фамилия</Label>
                            <Input
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              placeholder="Иванов"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Имя</Label>
                            <Input
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              placeholder="Иван"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Отчество</Label>
                            <Input
                              value={middleName}
                              onChange={(e) => setMiddleName(e.target.value)}
                              placeholder="Иванович"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Email</Label>
                          <div className="flex h-9 rounded-md border border-input bg-background overflow-hidden">
                            <Input
                              className="h-9 border-0 shadow-none rounded-none flex-1 min-w-0"
                              value={emailLocal}
                              onChange={(e) => setEmailLocal(e.target.value)}
                              onBlur={(e) =>
                                setEmailLocal(sanitizeEmailLocalInput(e.target.value))
                              }
                              placeholder="ivanov"
                            />
                            <span className="flex items-center border-l px-2 text-xs text-muted-foreground shrink-0 bg-muted/40">
                              @nhtk
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Телефон</Label>
                          <Input
                            value={phone}
                            onChange={(e) => setPhone(formatRuPhoneMask(e.target.value))}
                            placeholder="+7(999) 999-99-99"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Должность</Label>
                            <Input
                              value={position}
                              onChange={(e) => setPosition(e.target.value)}
                              placeholder="Должность"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Подразделение</Label>
                            <Input
                              value={department}
                              onChange={(e) => setDepartment(e.target.value)}
                              placeholder="Кафедра"
                            />
                          </div>
                        </div>
                        {profileError && (
                          <p className="text-sm text-destructive">{profileError}</p>
                        )}
                        <Button
                          type="button"
                          onClick={() => void handleSaveProfile()}
                          disabled={profileSaving || !lastName.trim() || !firstName.trim()}
                        >
                          {profileSaving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Сохранить профиль
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Изменить ФИО, email и телефон может администратор в разделе «Пользователи».
                      Смену пароля выполните во вкладке «Смена пароля».
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent
              value="password"
              className="mt-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
            >
              <div className={tabBodyScroll}>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Введите текущий пароль и новый (не короче 8 символов). Пароль преподавателя
                    может задать администратор в «Пользователях». Пароль администратора — здесь
                    или другим администратором в «Пользователях».
                  </p>
                  <div className="grid gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="profile-cur-pwd">Текущий пароль</Label>
                      <div className="relative">
                        <Input
                          id="profile-cur-pwd"
                          type={showCurrentPassword ? "text" : "password"}
                          autoComplete="current-password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••"
                          className="pr-10"
                          disabled={pwdSaving}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none"
                          onClick={() => setShowCurrentPassword((v) => !v)}
                          disabled={pwdSaving}
                          aria-label={
                            showCurrentPassword ? "Скрыть пароль" : "Показать пароль"
                          }
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="profile-new-pwd">Новый пароль</Label>
                      <div className="relative">
                        <Input
                          id="profile-new-pwd"
                          type={showNewPassword ? "text" : "password"}
                          autoComplete="new-password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Не менее 8 символов"
                          className="pr-10"
                          disabled={pwdSaving}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none"
                          onClick={() => setShowNewPassword((v) => !v)}
                          disabled={pwdSaving}
                          aria-label={
                            showNewPassword ? "Скрыть пароль" : "Показать пароль"
                          }
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="profile-confirm-pwd">Повтор нового пароля</Label>
                      <div className="relative">
                        <Input
                          id="profile-confirm-pwd"
                          type={showConfirmPassword ? "text" : "password"}
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Повторите пароль"
                          className="pr-10"
                          disabled={pwdSaving}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none"
                          onClick={() => setShowConfirmPassword((v) => !v)}
                          disabled={pwdSaving}
                          aria-label={
                            showConfirmPassword ? "Скрыть пароль" : "Показать пароль"
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    {pwdError && <p className="text-sm text-destructive">{pwdError}</p>}
                    {pwdOk && <p className="text-sm text-green-600">{pwdOk}</p>}
                    <Button
                      type="button"
                      onClick={() => void handleChangePassword()}
                      disabled={pwdSaving || !currentPassword}
                    >
                      {pwdSaving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Сменить пароль
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
