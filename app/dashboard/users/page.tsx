"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Users,
  ShieldCheck,
  GraduationCap,
  School,
  X,
  UserCheck,
  Building2,
  Mail,
  Phone,
  Calendar,
  Clock,
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { getMockSession, type MockSession } from "@/lib/mock-auth"

type UserRole = "ADMIN" | "TEACHER"
type UserStatus = "active" | "inactive" | "blocked"

interface User {
  id: string
  lastName: string
  firstName: string
  middleName: string
  email: string
  phone: string
  role: UserRole
  status: UserStatus
  position: string
  department: string
  createdAt: string
  lastLogin: string
}

interface Classroom {
  id: string
  name: string
  number: string
  building: string
  floor: number
  capacity: number
  responsibleUserId: string | null
}

const initialUsers: User[] = [
  { id: "1", lastName: "Иванов", firstName: "Александр", middleName: "Петрович", email: "a.ivanov@edu.local", phone: "+7 (999) 111-22-33", role: "TEACHER", status: "active", position: "Старший преподаватель", department: "Кафедра информатики", createdAt: "2023-09-01", lastLogin: "2025-03-24" },
  { id: "2", lastName: "Петрова", firstName: "Мария", middleName: "Сергеевна", email: "m.petrova@edu.local", phone: "+7 (999) 222-33-44", role: "TEACHER", status: "active", position: "Доцент", department: "Кафедра математики", createdAt: "2022-09-01", lastLogin: "2025-03-23" },
  { id: "3", lastName: "Сидоров", firstName: "Дмитрий", middleName: "Николаевич", email: "d.sidorov@edu.local", phone: "+7 (999) 333-44-55", role: "TEACHER", status: "active", position: "Преподаватель", department: "Кафедра физики", createdAt: "2024-01-15", lastLogin: "2025-03-20" },
  { id: "4", lastName: "Козлова", firstName: "Елена", middleName: "Андреевна", email: "e.kozlova@edu.local", phone: "+7 (999) 444-55-66", role: "TEACHER", status: "inactive", position: "Преподаватель", department: "Кафедра химии", createdAt: "2021-09-01", lastLogin: "2025-01-10" },
  { id: "5", lastName: "Морозов", firstName: "Игорь", middleName: "Владимирович", email: "i.morozov@edu.local", phone: "+7 (999) 555-66-77", role: "ADMIN", status: "active", position: "Системный администратор", department: "ИТ-отдел", createdAt: "2020-01-01", lastLogin: "2025-03-25" },
  { id: "6", lastName: "Новикова", firstName: "Ольга", middleName: "Ивановна", email: "o.novikova@edu.local", phone: "+7 (999) 666-77-88", role: "TEACHER", status: "blocked", position: "Старший преподаватель", department: "Кафедра истории", createdAt: "2019-09-01", lastLogin: "2024-12-01" },
  { id: "7", lastName: "Смирнов", firstName: "Андрей", middleName: "Юрьевич", email: "a.smirnov@edu.local", phone: "+7 (999) 777-88-99", role: "TEACHER", status: "active", position: "Ассистент", department: "Кафедра информатики", createdAt: "2024-09-01", lastLogin: "2025-03-21" },
]

const initialClassrooms: Classroom[] = [
  { id: "1", name: "Аудитория 301", number: "301", building: "Главный корпус", floor: 3, capacity: 30, responsibleUserId: "1" },
  { id: "2", name: "Компьютерный класс 105", number: "105", building: "Главный корпус", floor: 1, capacity: 25, responsibleUserId: "1" },
  { id: "3", name: "Лекционный зал 401", number: "401", building: "Главный корпус", floor: 4, capacity: 80, responsibleUserId: "2" },
  { id: "4", name: "Лаборатория 210", number: "210", building: "Корпус Б", floor: 2, capacity: 20, responsibleUserId: "3" },
  { id: "5", name: "Аудитория 115", number: "115", building: "Корпус Б", floor: 1, capacity: 35, responsibleUserId: null },
  { id: "6", name: "Конференц-зал 502", number: "502", building: "Главный корпус", floor: 5, capacity: 50, responsibleUserId: null },
  { id: "7", name: "Лаборатория 312", number: "312", building: "Корпус В", floor: 3, capacity: 18, responsibleUserId: "2" },
  { id: "8", name: "Компьютерный класс 220", number: "220", building: "Корпус Б", floor: 2, capacity: 28, responsibleUserId: "7" },
]

const getRoleInfo = (role: UserRole) => role === "ADMIN"
  ? { label: "Администратор", bg: "bg-blue-100 text-blue-800 border-blue-200", icon: ShieldCheck }
  : { label: "Преподаватель", bg: "bg-green-100 text-green-800 border-green-200", icon: GraduationCap }

const getStatusInfo = (status: UserStatus) => {
  switch (status) {
    case "active":   return { label: "Активен",        bg: "bg-green-100 text-green-800 border-green-200" }
    case "inactive": return { label: "Неактивен",      bg: "bg-gray-100 text-gray-600 border-gray-200" }
    case "blocked":  return { label: "Заблокирован",   bg: "bg-red-100 text-red-800 border-red-200" }
  }
}

const getInitials = (u: User) => `${u.lastName[0] ?? ""}${u.firstName[0] ?? ""}`.toUpperCase()
const getFullName = (u: User) => `${u.lastName} ${u.firstName} ${u.middleName}`.trim()

const emptyForm = { lastName: "", firstName: "", middleName: "", email: "", phone: "", role: "TEACHER" as UserRole, status: "active" as UserStatus, position: "", department: "" }

export default function UsersPage() {
  const [session, setSession] = useState<MockSession | null>(null)
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [classrooms, setClassrooms] = useState<Classroom[]>(initialClassrooms)

  // Фильтры пользователей
  const [searchQuery, setSearchQuery]       = useState("")
  const [selectedRole, setSelectedRole]     = useState<UserRole | "all">("all")
  const [selectedStatus, setSelectedStatus] = useState<UserStatus | "all">("all")
  const [selectedDept, setSelectedDept]     = useState("all")

  // Фильтры аудиторий
  const [classroomSearch, setClassroomSearch]         = useState("")
  const [selectedBuilding, setSelectedBuilding]       = useState("all")
  const [selectedResponsible, setSelectedResponsible] = useState("all")

  // Диалоги
  const [addDialogOpen,    setAddDialogOpen]    = useState(false)
  const [editDialogOpen,   setEditDialogOpen]   = useState(false)
  const [viewDialogOpen,   setViewDialogOpen]   = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)

  const [selectedUser,      setSelectedUser]      = useState<User | null>(null)
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null)
  const [formData,          setFormData]          = useState(emptyForm)

  useEffect(() => { setSession(getMockSession()) }, [])

  const departments = useMemo(() => [...new Set(users.map(u => u.department))].sort(), [users])
  const buildings   = useMemo(() => [...new Set(classrooms.map(c => c.building))].sort(), [classrooms])

  const filteredUsers = useMemo(() => users.filter(u => {
    const name = getFullName(u).toLowerCase()
    const q    = searchQuery.toLowerCase()
    return (
      (name.includes(q) || u.email.includes(q) || u.position.toLowerCase().includes(q) || u.department.toLowerCase().includes(q)) &&
      (selectedRole   === "all" || u.role   === selectedRole) &&
      (selectedStatus === "all" || u.status === selectedStatus) &&
      (selectedDept   === "all" || u.department === selectedDept)
    )
  }), [users, searchQuery, selectedRole, selectedStatus, selectedDept])

  const filteredClassrooms = useMemo(() => classrooms.filter(c => {
    const q = classroomSearch.toLowerCase()
    const resp = c.responsibleUserId ? users.find(u => u.id === c.responsibleUserId) : null
    const respName = resp ? getFullName(resp).toLowerCase() : ""
    return (
      (c.name.toLowerCase().includes(q) || c.number.includes(q) || respName.includes(q)) &&
      (selectedBuilding    === "all"  || c.building          === selectedBuilding) &&
      (selectedResponsible === "all"  || (selectedResponsible === "none" ? !c.responsibleUserId : c.responsibleUserId === selectedResponsible))
    )
  }), [classrooms, classroomSearch, selectedBuilding, selectedResponsible, users])

  const stats = useMemo(() => ({
    total:      users.length,
    active:     users.filter(u => u.status === "active").length,
    admins:     users.filter(u => u.role === "ADMIN").length,
    teachers:   users.filter(u => u.role === "TEACHER").length,
    assigned:   classrooms.filter(c => c.responsibleUserId).length,
    unassigned: classrooms.filter(c => !c.responsibleUserId).length,
  }), [users, classrooms])

  const getUserClassrooms = (id: string) => classrooms.filter(c => c.responsibleUserId === id)

  // CRUD пользователей
  const handleAdd = () => { setFormData(emptyForm); setAddDialogOpen(true) }

  const handleSaveNew = () => {
    setUsers(prev => [...prev, { id: String(Date.now()), ...formData, createdAt: new Date().toISOString().split("T")[0], lastLogin: "-" }])
    setAddDialogOpen(false)
  }

  const handleEdit = (user: User) => {
    setSelectedUser(user)
    setFormData({ lastName: user.lastName, firstName: user.firstName, middleName: user.middleName, email: user.email, phone: user.phone, role: user.role, status: user.status, position: user.position, department: user.department })
    setEditDialogOpen(true)
  }

  const handleSaveEdit = () => {
    if (!selectedUser) return
    setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, ...formData } : u))
    setEditDialogOpen(false)
  }

  const handleView = (user: User) => { setSelectedUser(user); setViewDialogOpen(true) }

  const handleDelete = (user: User) => { setSelectedUser(user); setDeleteDialogOpen(true) }

  const confirmDelete = () => {
    if (!selectedUser) return
    setUsers(prev => prev.filter(u => u.id !== selectedUser.id))
    setClassrooms(prev => prev.map(c => c.responsibleUserId === selectedUser.id ? { ...c, responsibleUserId: null } : c))
    setDeleteDialogOpen(false)
  }

  // Назначение ответственного
  const handleAssign = (classroom: Classroom) => { setSelectedClassroom(classroom); setAssignDialogOpen(true) }

  const saveAssign = (userId: string | null) => {
    if (!selectedClassroom) return
    setClassrooms(prev => prev.map(c => c.id === selectedClassroom.id ? { ...c, responsibleUserId: userId } : c))
    setAssignDialogOpen(false)
  }

  const hasUserFilters = searchQuery || selectedRole !== "all" || selectedStatus !== "all" || selectedDept !== "all"

  if (!session) {
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

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Пользователи</h1>
          <p className="text-muted-foreground">Управление учётными записями и ответственностью по аудиториям</p>
        </div>
        <Button onClick={handleAdd}>
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
            <CardDescription className="flex items-center gap-2"><School className="h-4 w-4" />Без ответственного</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{stats.unassigned}</div>
            <p className="text-xs text-muted-foreground mt-1">Назначено: {stats.assigned} из {classrooms.length}</p>
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
            <School className="h-4 w-4" />Ответственность по аудиториям
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
                    <SelectItem value="active">Активен</SelectItem>
                    <SelectItem value="inactive">Неактивен</SelectItem>
                    <SelectItem value="blocked">Заблокирован</SelectItem>
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
                    const userRooms  = getUserClassrooms(user.id)
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
                          <div className="text-xs text-muted-foreground">{user.department}</div>
                        </TableCell>
                        <TableCell>
                          {userRooms.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {userRooms.slice(0, 2).map(r => (
                                <Badge key={r.id} variant="secondary" className="text-xs">
                                  {r.number}
                                </Badge>
                              ))}
                              {userRooms.length > 2 && (
                                <Badge variant="secondary" className="text-xs">+{userRooms.length - 2}</Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusInfo.bg}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{user.lastLogin}</TableCell>
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
                              <DropdownMenuItem onClick={() => handleEdit(user)}>
                                <Pencil className="mr-2 h-4 w-4" />Редактировать
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(user)}>
                                <Trash2 className="mr-2 h-4 w-4" />Удалить
                              </DropdownMenuItem>
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
          {/* Фильтры */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Поиск по номеру или названию аудитории..."
                    value={classroomSearch}
                    onChange={e => setClassroomSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
                  <SelectTrigger><SelectValue placeholder="Корпус" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все корпуса</SelectItem>
                    {buildings.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={selectedResponsible} onValueChange={setSelectedResponsible}>
                  <SelectTrigger><SelectValue placeholder="Ответственный" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все</SelectItem>
                    <SelectItem value="none">Без ответственного</SelectItem>
                    {users.filter(u => u.role === "TEACHER" && u.status === "active").map(u => (
                      <SelectItem key={u.id} value={u.id}>{getFullName(u)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Таблица аудиторий */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Аудитории и ответственные преподаватели</CardTitle>
              <CardDescription>Найдено: {filteredClassrooms.length} из {classrooms.length}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Аудитория</TableHead>
                    <TableHead>Корпус</TableHead>
                    <TableHead>Этаж / Вместимость</TableHead>
                    <TableHead>Ответственный преподаватель</TableHead>
                    <TableHead className="text-right">Действие</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClassrooms.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                        Аудитории не найдены
                      </TableCell>
                    </TableRow>
                  ) : filteredClassrooms.map(classroom => {
                    const responsible = classroom.responsibleUserId
                      ? users.find(u => u.id === classroom.responsibleUserId) ?? null
                      : null
                    return (
                      <TableRow key={classroom.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                              <School className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <div className="font-medium">{classroom.name}</div>
                              <div className="text-xs text-muted-foreground">№ {classroom.number}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Building2 className="h-3 w-3" />{classroom.building}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{classroom.floor} этаж</div>
                          <div className="text-xs text-muted-foreground">{classroom.capacity} мест</div>
                        </TableCell>
                        <TableCell>
                          {responsible ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-green-100 text-green-800 text-xs">
                                  {getInitials(responsible)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="text-sm font-medium">{getFullName(responsible)}</div>
                                <div className="text-xs text-muted-foreground">{responsible.position}</div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">Не назначен</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => handleAssign(classroom)}>
                            <UserCheck className="mr-2 h-3 w-3" />
                            {responsible ? "Изменить" : "Назначить"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
            const rooms      = getUserClassrooms(selectedUser.id)
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
                    <p className="text-sm text-muted-foreground">{selectedUser.position}</p>
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
                    <Phone className="h-4 w-4 shrink-0" />{selectedUser.phone}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-4 w-4 shrink-0" />{selectedUser.department}
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="flex items-center gap-1 text-muted-foreground mb-1"><Calendar className="h-3 w-3" />Создан</div>
                    <p className="font-medium">{selectedUser.createdAt}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-muted-foreground mb-1"><Clock className="h-3 w-3" />Последний вход</div>
                    <p className="font-medium">{selectedUser.lastLogin}</p>
                  </div>
                </div>
                {rooms.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-2">Ответственен за кабинеты:</p>
                      <div className="flex flex-wrap gap-2">
                        {rooms.map(r => (
                          <Badge key={r.id} variant="outline" className="text-xs">
                            <School className="mr-1 h-3 w-3" />{r.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Закрыть</Button>
            {selectedUser && (
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
          <UserForm formData={formData} setFormData={setFormData} departments={departments} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleSaveNew} disabled={!formData.lastName || !formData.firstName || !formData.email}>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleSaveEdit}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── ДИАЛОГ: УДАЛИТЬ ─── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser && <>
                Вы уверены, что хотите удалить <strong>{getFullName(selectedUser)}</strong>?
                {getUserClassrooms(selectedUser.id).length > 0 && " Этот преподаватель будет снят с ответственности за все закреплённые кабинеты."}
                {" "}Это действие нельзя отменить.
              </>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── ДИАЛОГ: НАЗНАЧИТЬ ОТВЕТСТВЕННОГО ─── */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Назначить ответственного</DialogTitle>
            <DialogDescription>
              {selectedClassroom && `Кабинет: ${selectedClassroom.name} (${selectedClassroom.building})`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {/* Снять */}
            <button
              onClick={() => saveAssign(null)}
              className="w-full flex items-center gap-3 rounded-lg border border-dashed p-3 text-left hover:bg-muted/50 transition-colors"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                <X className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Снять ответственного</p>
                <p className="text-xs text-muted-foreground">Кабинет останется без назначения</p>
              </div>
            </button>
            {/* Список активных преподавателей */}
            {users.filter(u => u.role === "TEACHER" && u.status === "active").map(user => {
              const isCurrent  = selectedClassroom?.responsibleUserId === user.id
              const otherRooms = classrooms.filter(c => c.responsibleUserId === user.id && c.id !== selectedClassroom?.id)
              return (
                <button
                  key={user.id}
                  onClick={() => saveAssign(user.id)}
                  className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left hover:bg-muted/50 transition-colors ${isCurrent ? "border-primary bg-primary/5" : ""}`}
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="bg-green-100 text-green-800 text-sm">
                      {getInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium truncate">{getFullName(user)}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.position}</p>
                    {otherRooms.length > 0 && (
                      <p className="text-xs text-muted-foreground">Уже ответственен: {otherRooms.map(r => r.number).join(", ")}</p>
                    )}
                  </div>
                  {isCurrent && <Badge variant="outline" className="text-xs shrink-0 border-primary text-primary">Текущий</Badge>}
                </button>
              )
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Отмена</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Переиспользуемая форма пользователя
type FormData = typeof emptyForm

function UserForm({ formData, setFormData, departments }: {
  formData: FormData
  setFormData: (d: FormData) => void
  departments: string[]
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
          <Input type="email" placeholder="user@edu.local" value={formData.email} onChange={e => set("email", e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Телефон</Label>
          <Input placeholder="+7 (999) 000-00-00" value={formData.phone} onChange={e => set("phone", e.target.value)} />
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
              <SelectItem value="active">Активен</SelectItem>
              <SelectItem value="inactive">Неактивен</SelectItem>
              <SelectItem value="blocked">Заблокирован</SelectItem>
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
    </div>
  )
}
