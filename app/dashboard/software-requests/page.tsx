"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import {
  IssuePriority,
  SoftwareRequestKind,
  SoftwareRequestStatus,
  UserRole,
} from "@prisma/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Download,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  X,
  Loader2,
  LayoutGrid,
} from "lucide-react"
import { fetchClassroomRegistry, type RegistryClassroom } from "@/lib/api/classroom-registry"
import { fetchWorkstations, type ApiWorkstation } from "@/lib/api/workstations"
import { toast } from "sonner"
import { PageHeader } from "@/components/dashboard/page-header"
import { SortableTableHead } from "@/components/ui/sortable-table-head"
import { useTableSort } from "@/hooks/use-table-sort"
import {
  fetchSoftwareRequests,
  createSoftwareRequestApi,
  updateSoftwareRequestApi,
  deleteSoftwareRequestApi,
  type SoftwareRequestListRow,
} from "@/lib/api/software-requests"
import { requestDashboardNavCountsRefresh } from "@/lib/dashboard-nav-counts-refresh"

function classroomLabel(c: RegistryClassroom): string {
  const title = c.name?.trim() || `Аудитория ${c.number}`
  return c.buildingName ? `${title} (${c.buildingName})` : title
}

function classroomLabelFromRow(row: SoftwareRequestListRow): string {
  const { classroom: c } = row
  const title = c.name?.trim() || `Аудитория ${c.number}`
  return c.building?.name ? `${title} (${c.building.name})` : title
}

function workstationLabel(w: ApiWorkstation): string {
  const name = w.name?.trim()
  if (name) return `${w.code} — ${name}`
  return w.code || w.id
}

function inventoryNumbersForSoftwareRequest(
  req: SoftwareRequestListRow,
  workstations: ApiWorkstation[]
): string[] {
  if (req.wholeClassroom) {
    return workstations
      .filter((w) => w.classroomId === req.classroomId)
      .flatMap((w) => w.equipmentItems.map((e) => e.inventoryNumber))
  }
  if (!req.workstationId) return []
  const ws = workstations.find((w) => w.id === req.workstationId)
  return ws ? ws.equipmentItems.map((e) => e.inventoryNumber) : []
}

function requesterLabel(r: SoftwareRequestListRow["requester"]): string {
  const m = r.middleName ? ` ${r.middleName}` : ""
  return `${r.lastName} ${r.firstName}${m}`.trim()
}

function scopeLabel(row: SoftwareRequestListRow): string {
  if (row.wholeClassroom) return "Вся аудитория"
  if (row.workstation) {
    const n = row.workstation.name?.trim()
    return n ? `${row.workstation.code} — ${n}` : row.workstation.code
  }
  return "—"
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

const getTypeInfo = (kind: SoftwareRequestKind) => {
  switch (kind) {
    case SoftwareRequestKind.INSTALL:
      return { label: "Установка", icon: Download, color: "text-green-600 bg-green-50 border-green-200 dark:bg-green-950/40" }
    case SoftwareRequestKind.UPDATE:
      return { label: "Обновление", icon: RefreshCw, color: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/40" }
    case SoftwareRequestKind.UNINSTALL:
      return { label: "Удаление", icon: Trash2, color: "text-red-600 bg-red-50 border-red-200 dark:bg-red-950/40" }
  }
}

const getStatusInfo = (status: SoftwareRequestStatus) => {
  switch (status) {
    case SoftwareRequestStatus.PENDING:
      return { label: "Не начато", icon: Clock, variant: "outline" as const, color: "text-yellow-600" }
    case SoftwareRequestStatus.IN_PROGRESS:
      return { label: "В работе", icon: RefreshCw, variant: "default" as const, color: "text-blue-600" }
    case SoftwareRequestStatus.COMPLETED:
      return { label: "Выполнено", icon: CheckCircle2, variant: "secondary" as const, color: "text-green-600" }
    case SoftwareRequestStatus.REJECTED:
      return { label: "Отклонено", icon: XCircle, variant: "destructive" as const, color: "text-red-600" }
  }
}

const getPriorityInfo = (priority: IssuePriority) => {
  switch (priority) {
    case IssuePriority.LOW:
      return { label: "Низкий", color: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200" }
    case IssuePriority.MEDIUM:
      return { label: "Средний", color: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/50" }
    case IssuePriority.HIGH:
      return { label: "Высокий", color: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/50" }
    case IssuePriority.CRITICAL:
      return { label: "Критический", color: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/50" }
  }
}

const priorityOptions: { value: IssuePriority; label: string }[] = [
  { value: IssuePriority.LOW, label: "Низкий" },
  { value: IssuePriority.MEDIUM, label: "Средний" },
  { value: IssuePriority.HIGH, label: "Высокий" },
  { value: IssuePriority.CRITICAL, label: "Критический" },
]

export default function SoftwareRequestsPage() {
  const { data: session, status } = useSession()
  const [requests, setRequests] = useState<SoftwareRequestListRow[]>([])
  const [classrooms, setClassrooms] = useState<RegistryClassroom[]>([])
  const [workstations, setWorkstations] = useState<ApiWorkstation[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>("all")
  const [selectedWorkstationId, setSelectedWorkstationId] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<SoftwareRequestStatus | "all">("all")
  const [selectedKind, setSelectedKind] = useState<SoftwareRequestKind | "all">("all")

  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [editStatusDialogOpen, setEditStatusDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<SoftwareRequestListRow | null>(null)

  const [formData, setFormData] = useState({
    kind: SoftwareRequestKind.INSTALL as SoftwareRequestKind,
    softwareName: "",
    softwareVersion: "",
    description: "",
    classroomId: "",
    workstationId: "",
    priority: IssuePriority.MEDIUM as IssuePriority,
  })
  const [wholeClassroom, setWholeClassroom] = useState(false)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [newStatus, setNewStatus] = useState<SoftwareRequestStatus>(SoftwareRequestStatus.PENDING)
  const [editPriority, setEditPriority] = useState<IssuePriority>(IssuePriority.MEDIUM)
  const [adminComment, setAdminComment] = useState("")
  const [statusSaving, setStatusSaving] = useState(false)

  const isAdmin = session?.user?.role === UserRole.ADMIN

  const loadAll = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [list, reg, ws] = await Promise.all([
        fetchSoftwareRequests(),
        fetchClassroomRegistry(),
        fetchWorkstations(),
      ])
      setRequests(list)
      setClassrooms(reg.classrooms)
      setWorkstations(ws)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Ошибка загрузки")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === "authenticated") void loadAll()
  }, [status, loadAll])

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const q = searchQuery.toLowerCase()
      const invs = inventoryNumbersForSoftwareRequest(req, workstations)
      const matchesSearch =
        !q ||
        req.softwareName.toLowerCase().includes(q) ||
        req.description.toLowerCase().includes(q) ||
        requesterLabel(req.requester).toLowerCase().includes(q) ||
        req.classroom.number.toLowerCase().includes(q) ||
        (req.workstation?.code && req.workstation.code.toLowerCase().includes(q)) ||
        invs.some((inv) => inv.toLowerCase().includes(q))

      const matchesClassroom =
        selectedClassroomId === "all" || req.classroomId === selectedClassroomId
      const matchesWorkstation =
        selectedWorkstationId === "all" ||
        (selectedWorkstationId === "__whole__" && req.wholeClassroom) ||
        req.workstationId === selectedWorkstationId
      const matchesStatus = selectedStatus === "all" || req.status === selectedStatus
      const matchesKind = selectedKind === "all" || req.kind === selectedKind

      return (
        matchesSearch &&
        matchesClassroom &&
        matchesWorkstation &&
        matchesStatus &&
        matchesKind
      )
    })
  }, [
    requests,
    workstations,
    searchQuery,
    selectedClassroomId,
    selectedWorkstationId,
    selectedStatus,
    selectedKind,
  ])

  const stats = useMemo(
    () => ({
      total: requests.length,
      pending: requests.filter((r) => r.status === SoftwareRequestStatus.PENDING).length,
      inProgress: requests.filter((r) => r.status === SoftwareRequestStatus.IN_PROGRESS).length,
      completed: requests.filter((r) => r.status === SoftwareRequestStatus.COMPLETED).length,
    }),
    [requests]
  )

  const resetFilters = () => {
    setSearchQuery("")
    setSelectedClassroomId("all")
    setSelectedWorkstationId("all")
    setSelectedStatus("all")
    setSelectedKind("all")
  }

  const hasFilters =
    searchQuery ||
    selectedClassroomId !== "all" ||
    selectedWorkstationId !== "all" ||
    selectedStatus !== "all" ||
    selectedKind !== "all"

  const swReqSortGetters = useMemo(
    () => ({
      kind: (r: SoftwareRequestListRow) => r.kind,
      software: (r: SoftwareRequestListRow) => r.softwareName,
      classroom: (r: SoftwareRequestListRow) => classroomLabelFromRow(r),
      scope: (r: SoftwareRequestListRow) => scopeLabel(r),
      status: (r: SoftwareRequestListRow) => r.status,
      priority: (r: SoftwareRequestListRow) => r.priority,
      created: (r: SoftwareRequestListRow) => new Date(r.createdAt).getTime(),
    }),
    []
  )

  const { sortedItems: sortedSwRequests, sortKey, sortDir, toggleSort } = useTableSort(
    filteredRequests,
    swReqSortGetters,
    "created"
  )

  const filterWorkstationOptions = useMemo(() => {
    if (selectedClassroomId === "all") return []
    return workstations.filter((w) => w.classroomId === selectedClassroomId)
  }, [selectedClassroomId, workstations])

  const formWorkstations = useMemo(() => {
    if (!formData.classroomId) return []
    return workstations.filter((w) => w.classroomId === formData.classroomId)
  }, [formData.classroomId, workstations])

  const handleAdd = () => {
    setFormData({
      kind: SoftwareRequestKind.INSTALL,
      softwareName: "",
      softwareVersion: "",
      description: "",
      classroomId: "",
      workstationId: "",
      priority: IssuePriority.MEDIUM,
    })
    setWholeClassroom(false)
    setFormError(null)
    setAddDialogOpen(true)
  }

  const handleSaveNew = async () => {
    setFormError(null)
    if (!formData.softwareName.trim() || !formData.classroomId) {
      setFormError("Укажите название ПО и аудиторию.")
      return
    }
    if (!wholeClassroom && !formData.workstationId) {
      setFormError("Выберите рабочее место или нажмите «Вся аудитория».")
      return
    }
    setFormSubmitting(true)
    try {
      await createSoftwareRequestApi({
        kind: formData.kind,
        softwareName: formData.softwareName.trim(),
        softwareVersion: formData.softwareVersion.trim(),
        description: formData.description.trim(),
        classroomId: formData.classroomId,
        workstationId: wholeClassroom ? null : formData.workstationId,
        wholeClassroom,
        priority: formData.priority,
      })
      setAddDialogOpen(false)
      await loadAll()
      requestDashboardNavCountsRefresh()
      toast.success("Заявка создана")
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Не удалось отправить")
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleView = (request: SoftwareRequestListRow) => {
    setSelectedRequest(request)
    setViewDialogOpen(true)
  }

  const handleEditStatus = (request: SoftwareRequestListRow) => {
    setSelectedRequest(request)
    setNewStatus(request.status)
    setEditPriority(request.priority)
    setAdminComment(request.adminComment ?? "")
    setEditStatusDialogOpen(true)
  }

  const handleSaveStatus = async () => {
    if (!selectedRequest) return
    setStatusSaving(true)
    try {
      await updateSoftwareRequestApi(selectedRequest.id, {
        status: newStatus,
        adminComment: adminComment.trim() || null,
        priority: editPriority,
      })
      setEditStatusDialogOpen(false)
      setSelectedRequest(null)
      await loadAll()
      requestDashboardNavCountsRefresh()
      toast.success("Заявка обновлена")
    } catch (e) {
      console.error(e)
    } finally {
      setStatusSaving(false)
    }
  }

  const handleDelete = (request: SoftwareRequestListRow) => {
    setSelectedRequest(request)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!selectedRequest) return
    try {
      await deleteSoftwareRequestApi(selectedRequest.id)
      setDeleteDialogOpen(false)
      setSelectedRequest(null)
      await loadAll()
      requestDashboardNavCountsRefresh()
      toast.success("Заявка удалена")
    } catch (e) {
      console.error(e)
    }
  }

  if (status === "loading" || (status === "authenticated" && loading)) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!session?.user) {
    return null
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
        <Button type="button" variant="outline" onClick={() => void loadAll()}>
          Повторить
        </Button>
      </div>
    )
  }

  const canDeleteRequest = (r: SoftwareRequestListRow) => {
    if (isAdmin) return false
    return (
      r.status === SoftwareRequestStatus.PENDING &&
      r.requester.id === session.user.id
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Заявки на установку/обновление ПО"
        description={
          isAdmin
            ? "Все заявки по всем аудиториям и рабочим местам. При создании заявки доступны любые аудитории и РМ."
            : "Заявки по аудиториям, за которые вы ответственны"
        }
        actions={
          <Button onClick={handleAdd} disabled={classrooms.length === 0}>
            <Plus className="mr-2 h-4 w-4" />
            Новая заявка
          </Button>
        }
      />

      {classrooms.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {session.user.role === UserRole.TEACHER
              ? "Нет аудиторий, за которые вы ответственны. Обратитесь к администратору."
              : "Добавьте аудитории в реестре, чтобы создавать заявки."}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Всего заявок</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Не начато</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>В работе</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Выполнено</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4" />
              Фильтры
            </CardTitle>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="mr-2 h-4 w-4" />
                Сбросить
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-[repeat(6,minmax(0,1fr))]">
            <div className="relative min-w-0 sm:col-span-2 xl:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="ПО, описание, заявитель, инв. номер, код РМ, аудитория…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="min-w-0">
              <Select
                value={selectedClassroomId}
                onValueChange={(value) => {
                  setSelectedClassroomId(value)
                  setSelectedWorkstationId("all")
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Аудитория" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все аудитории</SelectItem>
                  {classrooms.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {classroomLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-0">
              <Select
                value={selectedWorkstationId}
                onValueChange={setSelectedWorkstationId}
                disabled={selectedClassroomId === "all"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Рабочее место" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  <SelectItem value="__whole__">Только «вся аудитория»</SelectItem>
                  {filterWorkstationOptions.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {workstationLabel(w)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-0">
              <Select
                value={selectedStatus}
                onValueChange={(v) => setSelectedStatus(v as SoftwareRequestStatus | "all")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value={SoftwareRequestStatus.PENDING}>Не начато</SelectItem>
                  <SelectItem value={SoftwareRequestStatus.IN_PROGRESS}>В работе</SelectItem>
                  <SelectItem value={SoftwareRequestStatus.COMPLETED}>Выполнено</SelectItem>
                  <SelectItem value={SoftwareRequestStatus.REJECTED}>Отклонено</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-0 sm:col-span-2 xl:col-span-1">
              <Select
                value={selectedKind}
                onValueChange={(v) => setSelectedKind(v as SoftwareRequestKind | "all")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Тип заявки" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все типы</SelectItem>
                  <SelectItem value={SoftwareRequestKind.INSTALL}>Установка</SelectItem>
                  <SelectItem value={SoftwareRequestKind.UPDATE}>Обновление</SelectItem>
                  <SelectItem value={SoftwareRequestKind.UNINSTALL}>Удаление</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Заявки</CardTitle>
          <CardDescription>Найдено: {sortedSwRequests.length}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead
                  columnKey="kind"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                >
                  Тип
                </SortableTableHead>
                <SortableTableHead
                  columnKey="software"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                >
                  ПО
                </SortableTableHead>
                <SortableTableHead
                  columnKey="classroom"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                >
                  Аудитория
                </SortableTableHead>
                <SortableTableHead
                  columnKey="scope"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                >
                  Область
                </SortableTableHead>
                <SortableTableHead
                  columnKey="status"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                >
                  Статус
                </SortableTableHead>
                <SortableTableHead
                  columnKey="priority"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                >
                  Приоритет
                </SortableTableHead>
                <SortableTableHead
                  columnKey="created"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                >
                  Дата
                </SortableTableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedSwRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    Заявки не найдены
                  </TableCell>
                </TableRow>
              ) : (
                sortedSwRequests.map((request) => {
                  const typeInfo = getTypeInfo(request.kind)
                  const statusInfo = getStatusInfo(request.status)
                  const priorityInfo = getPriorityInfo(request.priority)
                  const TypeIcon = typeInfo.icon
                  const StatusIcon = statusInfo.icon

                  return (
                    <TableRow key={request.id}>
                      <TableCell>
                        <Badge variant="outline" className={typeInfo.color}>
                          <TypeIcon className="mr-1 h-3 w-3" />
                          {typeInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{request.softwareName}</div>
                          {request.softwareVersion ? (
                            <div className="text-sm text-muted-foreground">v{request.softwareVersion}</div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{classroomLabelFromRow(request)}</TableCell>
                      <TableCell>{scopeLabel(request)}</TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={priorityInfo.color}>
                          {priorityInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(request.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(request)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Просмотр
                            </DropdownMenuItem>
                            {isAdmin && (
                              <DropdownMenuItem onClick={() => handleEditStatus(request)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Статус и важность
                              </DropdownMenuItem>
                            )}
                            {canDeleteRequest(request) && (
                              <DropdownMenuItem
                                onClick={() => handleDelete(request)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Удалить
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Новая заявка на ПО</DialogTitle>
            <DialogDescription>
              {session.user.role === UserRole.TEACHER
                ? "Доступны только аудитории, за которые вы ответственны."
                : "Доступны все аудитории и рабочие места. Выберите кабинет и область установки."}
            </DialogDescription>
          </DialogHeader>
          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Тип заявки</Label>
              <Select
                value={formData.kind}
                onValueChange={(v) =>
                  setFormData({ ...formData, kind: v as SoftwareRequestKind })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SoftwareRequestKind.INSTALL}>Установка</SelectItem>
                  <SelectItem value={SoftwareRequestKind.UPDATE}>Обновление</SelectItem>
                  <SelectItem value={SoftwareRequestKind.UNINSTALL}>Удаление</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Название ПО *</Label>
                <Input
                  value={formData.softwareName}
                  onChange={(e) => setFormData({ ...formData, softwareName: e.target.value })}
                  placeholder="Например: Visual Studio Code"
                />
              </div>
              <div className="grid gap-2">
                <Label>Версия</Label>
                <Input
                  value={formData.softwareVersion}
                  onChange={(e) => setFormData({ ...formData, softwareVersion: e.target.value })}
                  placeholder="Например: 1.85.0"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Аудитория *</Label>
              <Select
                value={formData.classroomId}
                onValueChange={(v) => {
                  setWholeClassroom(false)
                  setFormData({ ...formData, classroomId: v, workstationId: "" })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите аудиторию" />
                </SelectTrigger>
                <SelectContent>
                  {classrooms.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {classroomLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <Label>Рабочее место</Label>
                <Button
                  type="button"
                  variant={wholeClassroom ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5"
                  disabled={!formData.classroomId}
                  onClick={() => {
                    setWholeClassroom(true)
                    setFormData((p) => ({ ...p, workstationId: "" }))
                    setFormError(null)
                  }}
                >
                  <LayoutGrid className="h-4 w-4" />
                  Вся аудитория
                </Button>
              </div>
              {wholeClassroom ? (
                <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
                  Заявка относится ко всем рабочим местам в выбранной аудитории.
                </p>
              ) : null}
              <Select
                value={formData.workstationId}
                onValueChange={(v) => {
                  setWholeClassroom(false)
                  setFormData({ ...formData, workstationId: v })
                }}
                disabled={!formData.classroomId || wholeClassroom}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      formData.classroomId
                        ? wholeClassroom
                          ? "Выбрана вся аудитория"
                          : "Выберите рабочее место"
                        : "Сначала аудитория"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {formWorkstations.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {workstationLabel(w)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {wholeClassroom ? (
                <Button
                  type="button"
                  variant="link"
                  className="h-auto px-0 text-sm"
                  onClick={() => setWholeClassroom(false)}
                >
                  Указать одно рабочее место
                </Button>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label>Приоритет</Label>
              <Select
                value={formData.priority}
                onValueChange={(v) =>
                  setFormData({ ...formData, priority: v as IssuePriority })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Описание (необязательно)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="При необходимости: обоснование, сроки, особенности…"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={() => void handleSaveNew()} disabled={formSubmitting}>
              {formSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Отправка…
                </>
              ) : (
                "Отправить заявку"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Детали заявки</DialogTitle>
            <DialogDescription>Заявка на программное обеспечение</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={getTypeInfo(selectedRequest.kind).color}>
                  {getTypeInfo(selectedRequest.kind).label}
                </Badge>
                <Badge variant={getStatusInfo(selectedRequest.status).variant}>
                  {getStatusInfo(selectedRequest.status).label}
                </Badge>
                <Badge variant="outline" className={getPriorityInfo(selectedRequest.priority).color}>
                  {getPriorityInfo(selectedRequest.priority).label}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Программное обеспечение</Label>
                  <p className="font-medium">{selectedRequest.softwareName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Версия</Label>
                  <p className="font-medium">{selectedRequest.softwareVersion || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Аудитория</Label>
                  <p>{classroomLabelFromRow(selectedRequest)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Область</Label>
                  <p>{scopeLabel(selectedRequest)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Заявитель</Label>
                  <p>{requesterLabel(selectedRequest.requester)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Дата заявки</Label>
                  <p>{formatDate(selectedRequest.createdAt)}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Описание от заявителя</Label>
                <p className="mt-1 text-sm">
                  {selectedRequest.description.trim()
                    ? selectedRequest.description
                    : "Не указано"}
                </p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <Label className="text-muted-foreground">Комментарий администратора к заявке</Label>
                <p className="mt-1 text-sm whitespace-pre-wrap">
                  {selectedRequest.adminComment?.trim()
                    ? selectedRequest.adminComment
                    : "Пока нет комментария."}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editStatusDialogOpen} onOpenChange={setEditStatusDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Статус и важность заявки</DialogTitle>
            <DialogDescription>
              {selectedRequest?.softwareName} — {selectedRequest && classroomLabelFromRow(selectedRequest)}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Статус</Label>
              <Select
                value={newStatus}
                onValueChange={(v) => setNewStatus(v as SoftwareRequestStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SoftwareRequestStatus.PENDING}>Не начато</SelectItem>
                  <SelectItem value={SoftwareRequestStatus.IN_PROGRESS}>В работе</SelectItem>
                  <SelectItem value={SoftwareRequestStatus.COMPLETED}>Выполнено</SelectItem>
                  <SelectItem value={SoftwareRequestStatus.REJECTED}>Отклонено</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Важность (приоритет)</Label>
              <Select
                value={editPriority}
                onValueChange={(v) => setEditPriority(v as IssuePriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Комментарий</Label>
              <Textarea
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                placeholder="Комментарий для заявителя…"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStatusDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={() => void handleSaveStatus()} disabled={statusSaving}>
              {statusSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить заявку?</AlertDialogTitle>
            <AlertDialogDescription>
              Заявка на «{selectedRequest?.softwareName}» будет удалена безвозвратно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void confirmDelete()}>
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
