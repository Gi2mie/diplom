"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Eye,
  Users,
  ShieldCheck,
  GraduationCap,
  X,
  Building2,
  Mail,
  Phone,
  Calendar,
  Clock,
  Ban,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  createUser,
  fetchUserById,
  fetchUsers,
  type UserListItem,
  type UsersListMeta,
  updateUser,
} from "@/lib/api/users"
import {
  fetchClassroomResponsibilities,
  updateResponsibleClassrooms,
  type ClassroomOption,
  type TeacherWithClassrooms,
} from "@/lib/api/classroom-responsibilities"
import { usePolling } from "@/lib/hooks/use-polling"
import { formatRuPhoneMask, isCompleteRuPhone11 } from "@/lib/ru-phone"
import {
  composeNhtkEmail,
  emailLocalPartFromNhtkEmail,
  isValidNhtkEmail,
  sanitizeEmailLocalInput,
} from "@/lib/user-validation"

type UserRole = "ADMIN" | "TEACHER"
type UserStatus = "ACTIVE" | "INACTIVE" | "BLOCKED"
type FormUserStatus = "ACTIVE" | "BLOCKED"

type User = UserListItem

const getRoleInfo = (role: UserRole) => role === "ADMIN"
  ? { label: "Администратор", bg: "bg-blue-100 text-blue-800 border-blue-200", icon: ShieldCheck }
  : { label: "Преподаватель", bg: "bg-green-100 text-green-800 border-green-200", icon: GraduationCap }

const getStatusInfo = (status: UserStatus) => {
  switch (status) {
    case "ACTIVE":   return { label: "Активен",        bg: "bg-green-100 text-green-800 border-green-200" }
    case "INACTIVE": return { label: "Неактивен",      bg: "bg-gray-100 text-gray-600 border-gray-200" }
    case "BLOCKED":  return { label: "Заблокирован",   bg: "bg-red-100 text-red-800 border-red-200" }
  }
}

const getInitials = (u: User) => `${u.lastName[0] ?? ""}${u.firstName[0] ?? ""}`.toUpperCase()
const getFullName = (u: User) => `${u.lastName} ${u.firstName} ${u.middleName ?? ""}`.trim()
const formatDate = (date: string) => new Date(date).toLocaleDateString("ru-RU")
const formatDateTime = (date: string | null) =>
  date ? new Date(date).toLocaleString("ru-RU") : "—"

const shortName = (u: { lastName: string; firstName: string; middleName?: string | null }) =>
  `${u.lastName} ${u.firstName}${u.middleName ? ` ${u.middleName}` : ""}`

const classroomLabel = (c: { number: string; name: string | null; building: string | null }) => {
  const title = c.name ? `${c.number} · ${c.name}` : c.number
  return c.building ? `${title} (${c.building})` : title
}

const emptyForm = {
  lastName: "",
  firstName: "",
  middleName: "",
  emailLocal: "",
  phone: "",
  role: "TEACHER" as UserRole,
  status: "ACTIVE" as FormUserStatus,
  position: "",
  department: "",
  password: "",
}

export default function UsersPage() {
  const { data: session, status: sessionStatus } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [listMeta, setListMeta] = useState<UsersListMeta>({ adminsTotal: 0, blockedTotal: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Фильтры пользователей
  const [searchQuery, setSearchQuery]       = useState("")
  const [selectedRole, setSelectedRole]     = useState<UserRole | "all">("all")
  const [selectedStatus, setSelectedStatus] = useState<UserStatus | "all">("all")
  const [selectedDept, setSelectedDept]     = useState("all")

  // Диалоги
  const [addDialogOpen,    setAddDialogOpen]    = useState(false)
  const [editDialogOpen,   setEditDialogOpen]   = useState(false)
  const [viewDialogOpen,   setViewDialogOpen]   = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [formData,          setFormData]          = useState(emptyForm)

  const [respTeachers, setRespTeachers] = useState<TeacherWithClassrooms[]>([])
  const [respClassrooms, setRespClassrooms] = useState<ClassroomOption[]>([])
  const [respLoading, setRespLoading] = useState(false)
  const [respError, setRespError] = useState<string | null>(null)
  const [respEditOpen, setRespEditOpen] = useState(false)
  const [respEditTeacher, setRespEditTeacher] = useState<TeacherWithClassrooms | null>(null)
  const [respSelectedIds, setRespSelectedIds] = useState<Set<string>>(new Set())
  const [respSaving, setRespSaving] = useState(false)
  const [respSubmitError, setRespSubmitError] = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    try {
      setError(null)
      const { users: list, meta } = await fetchUsers()
      setUsers(list)
      setListMeta(meta)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки пользователей")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadClassroomResponsibilities = useCallback(async () => {
    try {
      setRespLoading(true)
      setRespError(null)
      const data = await fetchClassroomResponsibilities()
      setRespTeachers(data.teachers)
      setRespClassrooms(data.classrooms)
    } catch (e) {
      setRespError(e instanceof Error ? e.message : "Ошибка загрузки")
    } finally {
      setRespLoading(false)
    }
  }, [])

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      void loadUsers()
    }
  }, [loadUsers, sessionStatus])

  useEffect(() => {
    if (sessionStatus !== "authenticated" || !session?.user) return
    if (session.user.role === "ADMIN") void loadClassroomResponsibilities()
  }, [loadClassroomResponsibilities, session?.user, sessionStatus])

  usePolling(loadUsers, {
    intervalMs: 5 * 60 * 1000,
    enabled: sessionStatus === "authenticated",
    runImmediately: false,
  })

  const departments = useMemo(
    () =>
      [...new Set(users.map(u => u.department).filter((d): d is string => Boolean(d)))].sort(),
    [users]
  )

  const filteredUsers = useMemo(() => users.filter(u => {
    const name = getFullName(u).toLowerCase()
    const q    = searchQuery.toLowerCase()
    return (
      (name.includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.position ?? "").toLowerCase().includes(q) ||
        (u.department ?? "").toLowerCase().includes(q)) &&
      (selectedRole   === "all" || u.role   === selectedRole) &&
      (selectedStatus === "all" || u.status === selectedStatus) &&
      (selectedDept   === "all" || u.department === selectedDept)
    )
  }), [users, searchQuery, selectedRole, selectedStatus, selectedDept])

  const stats = useMemo(() => ({
    total:      users.length,
    active:     users.filter(u => u.status === "ACTIVE").length,
    admins:     listMeta.adminsTotal,
    blocked:    listMeta.blockedTotal,
    teachers:   users.filter(u => u.role === "TEACHER").length,
  }), [users, listMeta])

  // CRUD пользователей
  const handleAdd = () => {
    setSubmitError(null)
    setFormData(emptyForm)
    setAddDialogOpen(true)
  }

  const handleSaveNew = async () => {
    try {
      setIsSubmitting(true)
      setSubmitError(null)
      const emailNorm = composeNhtkEmail(formData.emailLocal)
      if (!isValidNhtkEmail(emailNorm)) {
        setSubmitError("Укажите имя почты (часть до @nhtk), например ivanov")
        return
      }
      if (!isCompleteRuPhone11(formData.phone)) {
        setSubmitError("Введите телефон полностью в формате +7(999) 999-99-99 (11 цифр)")
        return
      }
      await createUser({
        lastName: formData.lastName,
        firstName: formData.firstName,
        middleName: formData.middleName,
        email: emailNorm,
        phone: formatRuPhoneMask(formData.phone),
        role: formData.role,
        status: formData.status,
        position: formData.position,
        department: formData.department,
        password: formData.password,
      })
      await loadUsers()
      setAddDialogOpen(false)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Ошибка при создании пользователя")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (user: User) => {
    setSubmitError(null)
    setSelectedUser(user)
    setFormData({
      lastName: user.lastName,
      firstName: user.firstName,
      middleName: user.middleName ?? "",
      emailLocal: emailLocalPartFromNhtkEmail(user.email),
      phone: user.phone ? formatRuPhoneMask(user.phone) : "",
      role: user.role,
      status: user.status === "BLOCKED" ? "BLOCKED" : "ACTIVE",
      position: user.position ?? "",
      department: user.department ?? "",
      password: "",
    })
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedUser) return
    try {
      setIsSubmitting(true)
      setSubmitError(null)
      const emailNorm = composeNhtkEmail(formData.emailLocal)
      if (!isValidNhtkEmail(emailNorm)) {
        setSubmitError("Укажите имя почты (часть до @nhtk), например ivanov")
        return
      }
      if (!isCompleteRuPhone11(formData.phone)) {
        setSubmitError("Введите телефон полностью в формате +7(999) 999-99-99 (11 цифр)")
        return
      }
      await updateUser(selectedUser.id, {
        lastName: formData.lastName,
        firstName: formData.firstName,
        middleName: formData.middleName,
        email: emailNorm,
        phone: formatRuPhoneMask(formData.phone),
        role: formData.role,
        status: formData.status,
        position: formData.position,
        department: formData.department,
        ...(formData.password ? { password: formData.password } : {}),
      })
      await loadUsers()
      setEditDialogOpen(false)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Ошибка при сохранении пользователя")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleView = async (user: User) => {
    try {
      const fresh = await fetchUserById(user.id)
      setSelectedUser(fresh)
      setViewDialogOpen(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки профиля пользователя")
    }
  }

  const hasUserFilters = searchQuery || selectedRole !== "all" || selectedStatus !== "all" || selectedDept !== "all"

  if (sessionStatus === "loading" || isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1,2,3,4].map(i => <Card key={i}><CardContent className="pt-6"><Skeleton className="h-8 w-16" /></CardContent></Card>)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!session?.user) return null
  const isAdmin = session.user.role === "ADMIN"

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Пользователи</h1>
          <p className="text-muted-foreground">Управление учётными записями и ответственностью по аудиториям</p>
        </div>
        <Button onClick={handleAdd} disabled={!isAdmin}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить пользователя
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><Users className="h-4 w-4" />Всего пользователей</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Активных: {stats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Администраторы</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.admins}</div>
            <p className="text-xs text-muted-foreground mt-1">Включая вас</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><GraduationCap className="h-4 w-4" />Преподаватели</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.teachers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><Ban className="h-4 w-4" />Заблокировано</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.blocked}</div>
          </CardContent>
        </Card>
      </div>

      {/* Вкладки */}
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />Пользователи
          </TabsTrigger>
          <TabsTrigger value="responsibilities" className="gap-2">
            <Building2 className="h-4 w-4" />Ответственность по аудиториям
          </TabsTrigger>
        </TabsList>

        {/* ─── ВКЛАДКА: ПОЛЬЗОВАТЕЛИ ─── */}
        <TabsContent value="users" className="space-y-4 mt-4">
          {/* Фильтры */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="grid gap-3 md:grid-cols-5">
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Поиск по ФИО, email, должности..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={selectedRole} onValueChange={v => setSelectedRole(v as UserRole | "all")}>
                  <SelectTrigger><SelectValue placeholder="Роль" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все роли</SelectItem>
                    <SelectItem value="ADMIN">Администраторы</SelectItem>
                    <SelectItem value="TEACHER">Преподаватели</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedStatus} onValueChange={v => setSelectedStatus(v as UserStatus | "all")}>
                  <SelectTrigger><SelectValue placeholder="Статус" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    <SelectItem value="ACTIVE">Активен</SelectItem>
                    <SelectItem value="BLOCKED">Заблокирован</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedDept} onValueChange={setSelectedDept}>
                  <SelectTrigger><SelectValue placeholder="Кафедра" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все кафедры</SelectItem>
                    {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {hasUserFilters && (
                <Button variant="ghost" size="sm" className="mt-3 h-8 text-muted-foreground"
                  onClick={() => { setSearchQuery(""); setSelectedRole("all"); setSelectedStatus("all"); setSelectedDept("all") }}>
                  <X className="mr-1 h-3 w-3" />Сбросить фильтры
                </Button>
              )}
            </CardContent>
          </Card>

          {error && (
            <Card>
              <CardContent className="pt-4 text-sm text-red-600">{error}</CardContent>
            </Card>
          )}

          {/* Таблица пользователей */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Найдено: {filteredUsers.length} из {users.length}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Пользователь</TableHead>
                    <TableHead>Роль</TableHead>
                    <TableHead>Должность / Кафедра</TableHead>
                    <TableHead>Кабинеты</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Последний вход</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                        Пользователи не найдены
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.map(user => {
                    const roleInfo   = getRoleInfo(user.role)
                    const statusInfo = getStatusInfo(user.status)
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className={`text-sm font-medium ${user.role === "ADMIN" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}`}>
                                {getInitials(user)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{getFullName(user)}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={roleInfo.bg}>
                            {roleInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{user.position}</div>
                          <div className="text-xs text-muted-foreground">{user.department || "—"}</div>
                        </TableCell>
                        <TableCell><span className="text-xs text-muted-foreground">—</span></TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusInfo.bg}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDateTime(user.lastLoginAt)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Действия</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleView(user)}>
                                <Eye className="mr-2 h-4 w-4" />Просмотр
                              </DropdownMenuItem>
                              {isAdmin && (
                                <DropdownMenuItem onClick={() => handleEdit(user)}>
                                  <Pencil className="mr-2 h-4 w-4" />Редактировать
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── ВКЛАДКА: ОТВЕТСТВЕННОСТЬ ─── */}
        <TabsContent value="responsibilities" className="space-y-4 mt-4">
          {!isAdmin ? (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                Назначать ответственных за аудитории может только администратор.
              </CardContent>
            </Card>
          ) : respError ? (
            <Card>
              <CardContent className="pt-4 text-sm text-red-600">{respError}</CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Преподаватели и аудитории</CardTitle>
                <CardDescription>
                  Каждая аудитория из справочника может иметь одного ответственного. Одному преподавателю можно назначить несколько аудиторий.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {respLoading && respTeachers.length === 0 ? (
                  <div className="flex items-center gap-2 px-6 py-8 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />Загрузка…
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Преподаватель</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Аудитории</TableHead>
                        <TableHead className="text-right w-[100px]">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {respTeachers.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{shortName(t)}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{t.email}</TableCell>
                          <TableCell>
                            {t.classrooms.length === 0 ? (
                              <span className="text-sm text-muted-foreground">Не назначено</span>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {t.classrooms.map((c) => (
                                  <Badge key={c.id} variant="secondary" className="font-normal">
                                    {classroomLabel(c)}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setRespSubmitError(null)
                                setRespEditTeacher(t)
                                setRespSelectedIds(new Set(t.classrooms.map((c) => c.id)))
                                setRespEditOpen(true)
                              }}
                            >
                              <Pencil className="mr-1 h-3.5 w-3.5" />
                              Изменить
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          <Dialog open={respEditOpen} onOpenChange={(open) => { if (!open) setRespEditOpen(false) }}>
            <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Аудитории преподавателя</DialogTitle>
                <DialogDescription>
                  {respEditTeacher
                    ? `${shortName(respEditTeacher)} — отметьте аудитории из справочника. Уже назначенные другим сотрудникам будут переназначены.`
                    : ""}
                </DialogDescription>
              </DialogHeader>
              {respEditTeacher && (
                <>
                  <ScrollArea className="flex-1 min-h-0 max-h-[50vh] pr-3 -mr-1">
                    <div className="space-y-2 pb-2">
                      {respClassrooms.map((c) => {
                        const checked = respSelectedIds.has(c.id)
                        const other =
                          c.responsible &&
                          c.responsible.id !== respEditTeacher.id
                            ? shortName(c.responsible)
                            : null
                        return (
                          <label
                            key={c.id}
                            className="flex cursor-pointer items-start gap-3 rounded-md border border-transparent px-2 py-2 hover:bg-muted/50"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => {
                                setRespSelectedIds((prev) => {
                                  const n = new Set(prev)
                                  if (n.has(c.id)) n.delete(c.id)
                                  else n.add(c.id)
                                  return n
                                })
                              }}
                              className="mt-0.5"
                            />
                            <div className="min-w-0 flex-1 text-sm">
                              <div className="font-medium leading-tight">{classroomLabel(c)}</div>
                              {other && (
                                <div className="text-xs text-amber-700 dark:text-amber-600 mt-0.5">
                                  Сейчас ответственный: {other}
                                </div>
                              )}
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </ScrollArea>
                  {respSubmitError && <p className="text-sm text-red-600">{respSubmitError}</p>}
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setRespEditOpen(false)} disabled={respSaving}>
                      Отмена
                    </Button>
                    <Button
                      onClick={async () => {
                        try {
                          setRespSaving(true)
                          setRespSubmitError(null)
                          await updateResponsibleClassrooms(respEditTeacher.id, [...respSelectedIds])
                          await loadClassroomResponsibilities()
                          setRespEditOpen(false)
                        } catch (e) {
                          setRespSubmitError(e instanceof Error ? e.message : "Не удалось сохранить")
                        } finally {
                          setRespSaving(false)
                        }
                      }}
                      disabled={respSaving}
                    >
                      {respSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Сохранить
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>

      {/* ─── ДИАЛОГ: ПРОСМОТР ─── */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Профиль пользователя</DialogTitle>
            <DialogDescription>Подробная информация об учётной записи</DialogDescription>
          </DialogHeader>
          {selectedUser && (() => {
            const roleInfo   = getRoleInfo(selectedUser.role)
            const statusInfo = getStatusInfo(selectedUser.status)
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className={`text-xl font-semibold ${selectedUser.role === "ADMIN" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}`}>
                      {getInitials(selectedUser)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold">{getFullName(selectedUser)}</h3>
                    <p className="text-sm text-muted-foreground">{selectedUser.position || "—"}</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Badge variant="outline" className={roleInfo.bg}>{roleInfo.label}</Badge>
                      <Badge variant="outline" className={statusInfo.bg}>{statusInfo.label}</Badge>
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4 shrink-0" />{selectedUser.email}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0" />{selectedUser.phone || "—"}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-4 w-4 shrink-0" />{selectedUser.department || "—"}
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="flex items-center gap-1 text-muted-foreground mb-1"><Calendar className="h-3 w-3" />Создан</div>
                    <p className="font-medium">{formatDate(selectedUser.createdAt)}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-muted-foreground mb-1"><Clock className="h-3 w-3" />Последний вход</div>
                    <p className="font-medium">{formatDateTime(selectedUser.lastLoginAt)}</p>
                  </div>
                </div>
              </div>
            )
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Закрыть</Button>
            {selectedUser && isAdmin && (
              <Button onClick={() => { setViewDialogOpen(false); handleEdit(selectedUser) }}>
                <Pencil className="mr-2 h-4 w-4" />Редактировать
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── ДИАЛОГ: ДОБАВИТЬ ─── */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Добавить пользователя</DialogTitle>
            <DialogDescription>Создание новой учётной записи в системе</DialogDescription>
          </DialogHeader>
          <UserForm formData={formData} setFormData={setFormData} departments={departments} withPassword />
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleSaveNew} disabled={isSubmitting || !formData.lastName || !formData.firstName || !formData.emailLocal || !formData.password}>
              <Plus className="mr-2 h-4 w-4" />Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── ДИАЛОГ: РЕДАКТИРОВАТЬ ─── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Редактировать пользователя</DialogTitle>
            <DialogDescription>Изменение данных учётной записи</DialogDescription>
          </DialogHeader>
          <UserForm formData={formData} setFormData={setFormData} departments={departments} />
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleSaveEdit} disabled={isSubmitting}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Переиспользуемая форма пользователя
type FormData = typeof emptyForm

function UserForm({ formData, setFormData, departments, withPassword = false }: {
  formData: FormData
  setFormData: (d: FormData) => void
  departments: string[]
  withPassword?: boolean
}) {
  const set = (key: keyof FormData, value: string) => setFormData({ ...formData, [key]: value })
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="grid gap-2">
          <Label>Фамилия</Label>
          <Input placeholder="Иванов" value={formData.lastName} onChange={e => set("lastName", e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Имя</Label>
          <Input placeholder="Иван" value={formData.firstName} onChange={e => set("firstName", e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Отчество</Label>
          <Input placeholder="Иванович" value={formData.middleName} onChange={e => set("middleName", e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label>Email</Label>
          <div className="flex h-9 w-full min-w-0 rounded-md border border-input bg-background text-sm shadow-xs ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
            <Input
              className="h-9 flex-1 min-w-0 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none rounded-l-md"
              type="text"
              autoComplete="username"
              placeholder="ivanov"
              value={formData.emailLocal}
              onChange={e => set("emailLocal", e.target.value)}
              onBlur={e => set("emailLocal", sanitizeEmailLocalInput(e.target.value))}
            />
            <span className="flex shrink-0 items-center border-l border-input bg-muted/40 px-2.5 text-muted-foreground select-none rounded-r-md">
              @nhtk
            </span>
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Телефон</Label>
          <Input
            placeholder="+7(999) 999-99-99"
            inputMode="numeric"
            autoComplete="tel"
            value={formData.phone}
            onChange={e => set("phone", formatRuPhoneMask(e.target.value))}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label>Роль</Label>
          <Select value={formData.role} onValueChange={v => set("role", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ADMIN">Администратор</SelectItem>
              <SelectItem value="TEACHER">Преподаватель</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Статус</Label>
          <Select value={formData.status} onValueChange={v => set("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Активен</SelectItem>
              <SelectItem value="BLOCKED">Заблокирован</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-2">
        <Label>Должность</Label>
        <Input placeholder="Преподаватель" value={formData.position} onChange={e => set("position", e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label>Кафедра / Отдел</Label>
        <Input
          placeholder="Кафедра информатики"
          value={formData.department}
          onChange={e => set("department", e.target.value)}
          list="dept-list"
        />
        <datalist id="dept-list">
          {departments.map(d => <option key={d} value={d} />)}
        </datalist>
      </div>
      <div className="grid gap-2">
        <Label>{withPassword ? "Пароль" : "Новый пароль (опционально)"}</Label>
        <Input
          type="password"
          placeholder={withPassword ? "Введите пароль" : "Оставьте пустым, чтобы не менять"}
          value={formData.password}
          onChange={e => set("password", e.target.value)}
        />
      </div>
    </div>
  )
}
