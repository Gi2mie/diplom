"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { 
  Monitor, 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  TrendingUp,
  Users,
  School,
  FileText,
  Plus,
  ArrowRight,
  Package,
  BarChart3,
  ClipboardList,
  Bell,
  HardDrive,
  Laptop,
  Settings,
  Eye
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface DashboardStats {
  totalEquipment: number
  workingEquipment: number
  faultyEquipment: number
  inRepairEquipment: number
  totalClassrooms: number
  totalWorkstations: number
  openRequests: number
  pendingRequests: number
  inProgressRequests: number
  completedRequestsThisMonth: number
  totalUsers: number
  activeRepairs: number
  softwareCount: number
  categoriesCount: number
}

interface RecentRequest {
  id: string
  title: string
  classroom: string
  status: "pending" | "in_progress" | "completed"
  date: string
  priority: "low" | "medium" | "high"
  author: string
}

interface Notification {
  id: string
  title: string
  description: string
  time: string
  type: "info" | "warning" | "error"
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    // Симуляция загрузки данных
    const timer = setTimeout(() => {
      setStats({
        totalEquipment: 156,
        workingEquipment: 142,
        faultyEquipment: 8,
        inRepairEquipment: 6,
        totalClassrooms: 24,
        totalWorkstations: 96,
        openRequests: 12,
        pendingRequests: 5,
        inProgressRequests: 4,
        completedRequestsThisMonth: 38,
        totalUsers: 45,
        activeRepairs: 4,
        softwareCount: 32,
        categoriesCount: 8,
      })
      setRecentRequests([
        { id: "1", title: "Не работает проектор", classroom: "Аудитория 301", status: "pending", date: "2025-03-25", priority: "high", author: "Петров И.С." },
        { id: "2", title: "Замена клавиатуры", classroom: "Компьютерный класс 105", status: "in_progress", date: "2025-03-24", priority: "medium", author: "Сидорова А.В." },
        { id: "3", title: "Настройка Wi-Fi", classroom: "Аудитория 412", status: "pending", date: "2025-03-24", priority: "low", author: "Козлов М.А." },
        { id: "4", title: "Сломан монитор", classroom: "Лаборатория 201", status: "in_progress", date: "2025-03-23", priority: "high", author: "Иванов П.П." },
        { id: "5", title: "Обновление ПО", classroom: "Аудитория 118", status: "completed", date: "2025-03-22", priority: "low", author: "Николаева Е.К." },
      ])
      setNotifications([
        { id: "1", title: "Новая заявка", description: "Петров И.С. сообщил о проблеме с проектором", time: "5 мин назад", type: "warning" },
        { id: "2", title: "Ремонт завершён", description: "Монитор в ауд. 305 отремонтирован", time: "1 час назад", type: "info" },
        { id: "3", title: "Критическая поломка", description: "Системный блок в ауд. 201 не включается", time: "2 часа назад", type: "error" },
      ])
      setLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  if (status === "loading") {
    return null
  }

  if (!session?.user) {
    return null
  }

  const isAdmin = session.user.role === "ADMIN"
  const firstName = session.user.name?.split(" ")?.[1] || session.user.name?.split(" ")?.[0] || ""
  const workingPercentage = stats ? Math.round((stats.workingEquipment / stats.totalEquipment) * 100) : 0

  const getStatusBadge = (status: RecentRequest["status"]) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Ожидает</Badge>
      case "in_progress":
        return <Badge variant="default">В работе</Badge>
      case "completed":
        return <Badge variant="outline" className="text-green-600 border-green-600">Выполнено</Badge>
    }
  }

  const getPriorityBadge = (priority: RecentRequest["priority"]) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive">Высокий</Badge>
      case "medium":
        return <Badge variant="secondary">Средний</Badge>
      case "low":
        return <Badge variant="outline">Низкий</Badge>
    }
  }
  
  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Добро пожаловать{firstName ? `, ${firstName}` : ""}!
          </h1>
          <p className="text-muted-foreground">
            {isAdmin 
              ? "Панель управления системой учёта оборудования" 
              : "Просмотр оборудования и управление заявками"
            }
          </p>
        </div>
        {isAdmin ? (
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/dashboard/reports/new">
                <FileText className="mr-2 h-4 w-4" />
                Создать отчёт
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/equipment">
                <Plus className="mr-2 h-4 w-4" />
                Добавить оборудование
              </Link>
            </Button>
          </div>
        ) : (
          <Button asChild>
            <Link href="/dashboard/requests/new">
              <Plus className="mr-2 h-4 w-4" />
              Сообщить о проблеме
            </Link>
          </Button>
        )}
      </div>

      {/* Admin Dashboard */}
      {isAdmin && (
        <>
          {/* Primary Stats - Заявки */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Заявки на ремонт</CardTitle>
                <ClipboardList className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stats?.openRequests}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-orange-600 font-medium">{stats?.pendingRequests} новых</span>
                      <span className="text-xs text-muted-foreground">|</span>
                      <span className="text-xs text-blue-600 font-medium">{stats?.inProgressRequests} в работе</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-primary">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Всего оборудования</CardTitle>
                <Package className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stats?.totalEquipment}</div>
                    <p className="text-xs text-muted-foreground">
                      В {stats?.totalClassrooms} аудиториях
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Активные ремонты</CardTitle>
                <Wrench className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-blue-600">{stats?.activeRepairs}</div>
                    <p className="text-xs text-muted-foreground">
                      В процессе выполнения
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Выполнено</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-green-600">{stats?.completedRequestsThisMonth}</div>
                    <p className="text-xs text-muted-foreground">
                      Заявок в этом месяце
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Secondary Stats - Оборудование и ресурсы */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Исправное</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-green-600">{stats?.workingEquipment}</div>
                    <div className="mt-2">
                      <Progress value={workingPercentage} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {workingPercentage}% в рабочем состоянии
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Неисправное</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-red-600">{stats?.faultyEquipment}</div>
                    <p className="text-xs text-muted-foreground">
                      Требует ремонта
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Аудитории</CardTitle>
                <School className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stats?.totalClassrooms}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats?.totalWorkstations} рабочих мест
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Программы</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stats?.softwareCount}</div>
                    <p className="text-xs text-muted-foreground">
                      В каталоге ПО
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Пользователи</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stats?.totalUsers}</div>
                    <p className="text-xs text-muted-foreground">
                      Зарегистрировано
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Requests, Notifications & Quick Actions */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Recent Requests */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Последние заявки</CardTitle>
                  <CardDescription>
                    Недавно поступившие заявки от преподавателей
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/requests">
                    Все заявки
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentRequests.map((request) => (
                      <div key={request.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                            <Wrench className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{request.title}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{request.classroom}</span>
                              <span>•</span>
                              <span>{request.author}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getPriorityBadge(request.priority)}
                          {getStatusBadge(request.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notifications & Quick Actions */}
            <div className="space-y-4">
              {/* Notifications */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">Уведомления</CardTitle>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/dashboard/notifications">
                      <Bell className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {notifications.map((notification) => (
                        <div key={notification.id} className="flex items-start gap-3">
                          {getNotificationIcon(notification.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{notification.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{notification.description}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{notification.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Быстрые действия</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/dashboard/requests">
                      <ClipboardList className="mr-2 h-4 w-4" />
                      Просмотр заявок
                      <Badge variant="secondary" className="ml-auto">{stats?.openRequests}</Badge>
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/dashboard/equipment">
                      <Package className="mr-2 h-4 w-4" />
                      Управление оборудованием
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/dashboard/classrooms">
                      <School className="mr-2 h-4 w-4" />
                      Аудитории и места
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/dashboard/reports">
                      <FileText className="mr-2 h-4 w-4" />
                      Создать отчёт
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/dashboard/statistics">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Статистика и аналитика
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* Teacher Dashboard */}
      {!isAdmin && (
        <>
          {/* Stats for Teacher */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Мои заявки</CardTitle>
                <ClipboardList className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">3</div>
                    <p className="text-xs text-muted-foreground">
                      2 в обработке, 1 выполнена
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Оборудование</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stats?.totalEquipment}</div>
                    <p className="text-xs text-muted-foreground">
                      Доступно для просмотра
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Аудитории</CardTitle>
                <School className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stats?.totalClassrooms}</div>
                    <p className="text-xs text-muted-foreground">
                      В учебном корпусе
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Teacher Recent Requests & Actions */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* My Recent Requests */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Мои заявки</CardTitle>
                  <CardDescription>
                    Ваши последние заявки на ремонт
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/my-requests">
                    Все заявки
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentRequests.slice(0, 3).map((request) => (
                      <div key={request.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                            <Wrench className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{request.title}</p>
                            <p className="text-sm text-muted-foreground">{request.classroom}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(request.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Быстрые действия</CardTitle>
                <CardDescription>
                  Доступные действия
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="default" className="w-full justify-start" asChild>
                  <Link href="/dashboard/requests/new">
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Сообщить о проблеме
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/dashboard/my-requests">
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Мои заявки
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/dashboard/equipment">
                    <Eye className="mr-2 h-4 w-4" />
                    Просмотр оборудования
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/dashboard/classrooms">
                    <School className="mr-2 h-4 w-4" />
                    Аудитории
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
