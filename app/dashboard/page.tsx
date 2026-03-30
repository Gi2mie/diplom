"use client"

import { useCallback, useEffect, useState } from "react"
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
  ClipboardList,
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { fetchClassroomRegistry } from "@/lib/api/classroom-registry"
import { fetchMyRequests, type MyRequestListItem } from "@/lib/api/my-requests"
import { fetchEquipmentDashboardList } from "@/lib/api/equipment-dashboard"
import { PageHeader } from "@/components/dashboard/page-header"
import {
  fetchAdminDashboardStats,
  type AdminDashboardRecentIssue,
  type AdminDashboardStats,
} from "@/lib/api/admin-dashboard-stats"

type TeacherDashboardSummary = {
  classrooms: number
  workstations: number
  equipment: number
  myRequestsTotal: number
  myRequestsPending: number
  myRequestsInProgress: number
  myRequestsCompleted: number
  myRequestsRejected: number
}

/** Сводка по полю «Статус» в карточках оборудования (сумма даёт totalEquipment). */
function formatEquipmentStatusBreakdown(s: AdminDashboardStats): string {
  const parts: string[] = [`исправно ${s.workingEquipment}`]
  if (s.faultyEquipment > 0) parts.push(`требует проверки ${s.faultyEquipment}`)
  if (s.inRepairEquipment > 0) parts.push(`в ремонте ${s.inRepairEquipment}`)
  if (s.equipmentDecommissioned > 0) parts.push(`списано ${s.equipmentDecommissioned}`)
  if (s.equipmentNotInUse > 0) parts.push(`не используется ${s.equipmentNotInUse}`)
  return parts.join(" · ")
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [stats, setStats] = useState<AdminDashboardStats | null>(null)
  const [recentRequests, setRecentRequests] = useState<AdminDashboardRecentIssue[]>([])
  const [adminError, setAdminError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [teacherSummary, setTeacherSummary] = useState<TeacherDashboardSummary | null>(null)
  const [teacherRecent, setTeacherRecent] = useState<MyRequestListItem[]>([])
  const [teacherError, setTeacherError] = useState<string | null>(null)

  const loadAdminDashboard = useCallback(async () => {
    setAdminError(null)
    setLoading(true)
    try {
      const { stats: nextStats, recentIssues } = await fetchAdminDashboardStats()
      setStats(nextStats)
      setRecentRequests(recentIssues)
    } catch (e) {
      setAdminError(e instanceof Error ? e.message : "Не удалось загрузить данные")
      setStats(null)
      setRecentRequests([])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadTeacherDashboard = useCallback(async () => {
    setTeacherError(null)
    setLoading(true)
    try {
      const [registry, myItems, equipment] = await Promise.all([
        fetchClassroomRegistry(),
        fetchMyRequests(),
        fetchEquipmentDashboardList({}),
      ])
      const wsTotal = registry.classrooms.reduce((s, c) => s + c.workstationCount, 0)
      const pending = myItems.filter((r) => r.status === "pending").length
      const inProgress = myItems.filter((r) => r.status === "in_progress").length
      const completed = myItems.filter((r) => r.status === "completed").length
      const rejected = myItems.filter((r) => r.status === "rejected").length
      setTeacherSummary({
        classrooms: registry.classrooms.length,
        workstations: wsTotal,
        equipment: equipment.length,
        myRequestsTotal: myItems.length,
        myRequestsPending: pending,
        myRequestsInProgress: inProgress,
        myRequestsCompleted: completed,
        myRequestsRejected: rejected,
      })
      setTeacherRecent(myItems.slice(0, 5))
    } catch (e) {
      setTeacherError(e instanceof Error ? e.message : "Не удалось загрузить данные")
      setTeacherSummary({
        classrooms: 0,
        workstations: 0,
        equipment: 0,
        myRequestsTotal: 0,
        myRequestsPending: 0,
        myRequestsInProgress: 0,
        myRequestsCompleted: 0,
        myRequestsRejected: 0,
      })
      setTeacherRecent([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return

    if (session.user.role === "ADMIN") {
      setTeacherSummary(null)
      setTeacherRecent([])
      setTeacherError(null)
      void loadAdminDashboard()
      return
    }

    void loadTeacherDashboard()
  }, [status, session?.user, session?.user?.role, loadAdminDashboard, loadTeacherDashboard])

  if (status === "loading") {
    return null
  }

  if (!session?.user) {
    return null
  }

  const isAdmin = session.user.role === "ADMIN"
  const firstName = session.user.name?.split(" ")?.[1] || session.user.name?.split(" ")?.[0] || ""
  const equipmentInServiceTotal =
    stats !== null
      ? Math.max(0, stats.totalEquipment - stats.equipmentDecommissioned)
      : 0
  const workingPercentage =
    stats && equipmentInServiceTotal > 0
      ? Math.round((stats.workingEquipment / equipmentInServiceTotal) * 100)
      : 0

  const getStatusBadge = (s: (typeof recentRequests)[number]["status"]) => {
    switch (s) {
      case "pending":
        return <Badge variant="secondary">Ожидает</Badge>
      case "in_progress":
        return <Badge variant="default">В работе</Badge>
      case "rejected":
        return <Badge variant="destructive">Отклонено</Badge>
      case "completed":
        return <Badge variant="outline" className="text-green-600 border-green-600">Выполнено</Badge>
    }
  }

  const getTeacherRequestStatusBadge = (s: MyRequestListItem["status"]) => {
    switch (s) {
      case "pending":
        return <Badge variant="secondary">Ожидает</Badge>
      case "in_progress":
        return <Badge variant="default">В работе</Badge>
      case "completed":
        return (
          <Badge variant="outline" className="border-green-600 text-green-600">
            Выполнено
          </Badge>
        )
      case "rejected":
        return <Badge variant="destructive">Отклонено</Badge>
    }
  }

  const getPriorityBadge = (priority: (typeof recentRequests)[number]["priority"]) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive">Высокий</Badge>
      case "medium":
        return <Badge variant="secondary">Средний</Badge>
      case "low":
        return <Badge variant="outline">Низкий</Badge>
    }
  }
  
  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        title={`Добро пожаловать${firstName ? `, ${firstName}` : ""}!`}
        description={
          isAdmin
            ? "Панель управления системой учёта оборудования и заявок."
            : "Просмотр оборудования и управление заявками по вашим аудиториям."
        }
        actions={
          isAdmin ? (
            <div className="flex flex-wrap gap-2">
              <span data-tour="admin-btn-report" className="inline-flex">
                <Button asChild>
                  <Link href="/dashboard/reports">
                    <FileText className="mr-2 h-4 w-4" />
                    Создать отчёт
                  </Link>
                </Button>
              </span>
              <span data-tour="admin-btn-equipment" className="inline-flex">
                <Button variant="outline" asChild>
                  <Link href="/dashboard/equipment">
                    <Plus className="mr-2 h-4 w-4" />
                    Добавить оборудование
                  </Link>
                </Button>
              </span>
            </div>
          ) : (
            <Button asChild>
              <Link href="/dashboard/requests/new">
                <Plus className="mr-2 h-4 w-4" />
                Сообщить о проблеме
              </Link>
            </Button>
          )
        }
      />

      {/* Admin Dashboard */}
      {isAdmin && (
        <>
          {adminError ? (
            <Alert variant="destructive" className="mb-2">
              <AlertDescription className="flex flex-wrap items-center gap-2">
                {adminError}
                <Button type="button" variant="outline" size="sm" onClick={() => void loadAdminDashboard()}>
                  Повторить
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          {/* Primary Stats - Заявки */}
          <div data-tour="admin-primary-stats" className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Неисправности</CardTitle>
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
                    {stats ? (
                      <p className="text-xs text-muted-foreground mt-1 leading-snug">
                        По статусам: {formatEquipmentStatusBreakdown(stats)}
                      </p>
                    ) : null}
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
                      Обращений закрыто в этом месяце
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Secondary Stats - Оборудование и ресурсы */}
          <div data-tour="admin-secondary-stats" className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
                        {stats
                          ? `${workingPercentage}% от ${equipmentInServiceTotal} ед. в учёте (без списанных), со статусом «Исправно»`
                          : `${workingPercentage}% в рабочем состоянии`}
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
                      Статус «Требует проверки»
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
                  <CardTitle>Последние обращения</CardTitle>
                  <CardDescription>
                    Недавние обращения о неисправностях
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/issues">
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
                ) : recentRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Пока нет обращений</p>
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

            <div className="space-y-4">
              <Card data-tour="admin-quick-actions">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Быстрые действия</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/dashboard/issues">
                      <ClipboardList className="mr-2 h-4 w-4" />
                      Неисправности
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
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* Teacher Dashboard */}
      {!isAdmin && (
        <>
          {teacherError ? (
            <Alert variant="destructive" className="mb-2">
              <AlertDescription className="flex flex-wrap items-center gap-2">
                {teacherError}
                <Button type="button" variant="outline" size="sm" onClick={() => void loadTeacherDashboard()}>
                  Повторить
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

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
                ) : teacherSummary ? (
                  <>
                    <div className="text-2xl font-bold">{teacherSummary.myRequestsTotal}</div>
                    <p className="text-xs text-muted-foreground">
                      {teacherSummary.myRequestsPending} ожидают · {teacherSummary.myRequestsInProgress} в работе
                      {teacherSummary.myRequestsCompleted > 0
                        ? ` · ${teacherSummary.myRequestsCompleted} выполнено`
                        : ""}
                      {teacherSummary.myRequestsRejected > 0
                        ? ` · ${teacherSummary.myRequestsRejected} отклонено`
                        : ""}
                    </p>
                  </>
                ) : (
                  <Skeleton className="h-8 w-20" />
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
                ) : teacherSummary ? (
                  <>
                    <div className="text-2xl font-bold">{teacherSummary.equipment}</div>
                    <p className="text-xs text-muted-foreground">
                      В ваших аудиториях (по данным реестра)
                    </p>
                  </>
                ) : (
                  <Skeleton className="h-8 w-20" />
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
                ) : teacherSummary ? (
                  <>
                    <div className="text-2xl font-bold">{teacherSummary.classrooms}</div>
                    <p className="text-xs text-muted-foreground">
                      За которые вы ответственны · {teacherSummary.workstations} рабочих мест
                    </p>
                  </>
                ) : (
                  <Skeleton className="h-8 w-20" />
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
                    Последние обращения о неисправностях и заявки на ПО
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
                ) : teacherRecent.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Заявок пока нет. Вы можете{" "}
                    <Link href="/dashboard/requests/new" className="text-primary underline">
                      сообщить о проблеме
                    </Link>{" "}
                    или подать{" "}
                    <Link href="/dashboard/software-requests" className="text-primary underline">
                      заявку на ПО
                    </Link>
                    .
                  </p>
                ) : (
                  <div className="space-y-4">
                    {teacherRecent.map((request) => (
                      <div
                        key={request.key}
                        className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                            {request.source === "software" ? (
                              <HardDrive className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <Wrench className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium">{request.title}</p>
                            <p className="truncate text-sm text-muted-foreground">
                              {request.classroomLabel}
                              {request.workstationLabel ? ` · ${request.workstationLabel}` : ""}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(request.createdAt).toLocaleString("ru-RU", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="ml-2 shrink-0">{getTeacherRequestStatusBadge(request.status)}</div>
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
                  <Link href="/dashboard/software-requests">
                    <HardDrive className="mr-2 h-4 w-4" />
                    Заявка на ПО
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/dashboard/my-requests">
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Мои заявки
                    {teacherSummary && teacherSummary.myRequestsTotal > 0 ? (
                      <Badge variant="secondary" className="ml-auto">
                        {teacherSummary.myRequestsTotal}
                      </Badge>
                    ) : null}
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
