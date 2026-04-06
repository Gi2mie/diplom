"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import {
  IssuePriority,
  IssueStatus,
  UserRole,
} from "@prisma/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
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
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  X,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  Wrench,
  XCircle,
  Loader2,
} from "lucide-react"
import { fetchClassroomRegistry, type RegistryClassroom, type RegistryTeacher } from "@/lib/api/classroom-registry"
import { fetchWorkstations, type ApiWorkstation } from "@/lib/api/workstations"
import { fetchEquipmentDashboardList, type DashboardEquipmentRow } from "@/lib/api/equipment-dashboard"
import { toast } from "sonner"
import { PageHeader } from "@/components/dashboard/page-header"
import { SortableTableHead } from "@/components/ui/sortable-table-head"
import { useTableSort } from "@/hooks/use-table-sort"
import {
  fetchAdminIssueReports,
  createAdminIssueReport,
  updateAdminIssueReport,
  postRepairsForIssue,
  type AdminIssueReportRow,
} from "@/lib/api/admin-issue-reports"
import { fetchDashboardRepairs } from "@/lib/api/repairs-dashboard"
import { requestDashboardNavCountsRefresh } from "@/lib/dashboard-nav-counts-refresh"
import { cn } from "@/lib/utils"

function personLabel(p: { firstName: string; lastName: string; middleName: string | null }): string {
  const m = p.middleName ? ` ${p.middleName}` : ""
  return `${p.lastName} ${p.firstName}${m}`.trim()
}

type ClassroomBrief = {
  number: string
  name: string | null
  building: { name: string } | null
}

function classroomLine(c: ClassroomBrief | null | undefined): string {
  if (!c) return "—"
  const t = c.name?.trim() || `Аудитория ${c.number}`
  return c.building?.name ? `${t} (${c.building.name})` : t
}

function issueLocation(row: AdminIssueReportRow): string {
  const ws = row.equipment.workstation
  if (!ws) return "—"
  const room = classroomLine(ws.classroom)
  if (row.description.includes("[Охват: вся аудитория]")) {
    return room
  }
  const wsName = ws.name?.trim() ? `${ws.code} — ${ws.name}` : ws.code
  return `${room} · ${wsName}`
}

const statusMeta: Record<
  IssueStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof AlertCircle }
> = {
  [IssueStatus.NEW]: { label: "Новое", variant: "destructive", icon: AlertCircle },
  [IssueStatus.IN_PROGRESS]: { label: "В работе", variant: "default", icon: Wrench },
  [IssueStatus.RESOLVED]: { label: "Решено", variant: "outline", icon: CheckCircle },
  [IssueStatus.CLOSED]: { label: "Закрыто", variant: "outline", icon: XCircle },
  [IssueStatus.REJECTED]: { label: "Отклонено", variant: "secondary", icon: XCircle },
}

const priorityMeta: Record<IssuePriority, { label: string; className: string }> = {
  [IssuePriority.LOW]: { label: "Низкий", className: "bg-slate-100 text-slate-800 border-slate-200" },
  [IssuePriority.MEDIUM]: { label: "Средний", className: "bg-blue-100 text-blue-800 border-blue-200" },
  [IssuePriority.HIGH]: { label: "Высокий", className: "bg-orange-100 text-orange-800 border-orange-200" },
  [IssuePriority.CRITICAL]: { label: "Критический", className: "bg-red-100 text-red-800 border-red-200" },
}

const priorityOptions: { value: IssuePriority; label: string }[] = [
  { value: IssuePriority.LOW, label: "Низкий" },
  { value: IssuePriority.MEDIUM, label: "Средний" },
  { value: IssuePriority.HIGH, label: "Высокий" },
  { value: IssuePriority.CRITICAL, label: "Критический" },
]

/** Фильтр журнала: без «Решено» (остаётся в карточке и при редактировании). */
const issueStatusFilterOptions: IssueStatus[] = [
  IssueStatus.NEW,
  IssueStatus.IN_PROGRESS,
  IssueStatus.CLOSED,
  IssueStatus.REJECTED,
]

/** Статусы, доступные администратору при редактировании (без «Новое» и «Закрыто»). */
const issueAdminEditStatuses: IssueStatus[] = [
  IssueStatus.IN_PROGRESS,
  IssueStatus.RESOLVED,
  IssueStatus.REJECTED,
]

function issueEditFormInitialStatus(row: AdminIssueReportRow): IssueStatus {
  return issueAdminEditStatuses.includes(row.status) ? row.status : IssueStatus.IN_PROGRESS
}

export default function IssuesPage() {
  const { data: session, status: sessionStatus } = useSession()
  const [issues, setIssues] = useState<AdminIssueReportRow[]>([])
  const [classrooms, setClassrooms] = useState<RegistryClassroom[]>([])
  const [teachers, setTeachers] = useState<RegistryTeacher[]>([])
  const [workstations, setWorkstations] = useState<ApiWorkstation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [filterClassroomId, setFilterClassroomId] = useState<string>("all")
  const [filterWorkstationId, setFilterWorkstationId] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<IssueStatus | "all">("all")
  const [filterPriority, setFilterPriority] = useState<IssuePriority | "all">("all")

  const [viewOpen, setViewOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [repairOpen, setRepairOpen] = useState(false)
  const [selected, setSelected] = useState<AdminIssueReportRow | null>(null)

  const [addForm, setAddForm] = useState({
    classroomId: "",
    workstationId: "",
    equipmentId: "",
    reporterId: "",
    title: "",
    description: "",
    priority: IssuePriority.MEDIUM as IssuePriority,
  })
  const [addEquipment, setAddEquipment] = useState<DashboardEquipmentRow[]>([])
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    status: IssueStatus.NEW as IssueStatus,
    priority: IssuePriority.MEDIUM as IssuePriority,
    resolution: "",
  })
  const [repairWsId, setRepairWsId] = useState<string>("all")
  const [repairPick, setRepairPick] = useState<Record<string, boolean>>({})
  const [repairEquipment, setRepairEquipment] = useState<DashboardEquipmentRow[]>([])
  /** null — карта ещё грузится; иначе id оборудования с ремонтом PLANNED/IN_PROGRESS (любое обращение). */
  const [activeRepairEquipmentMap, setActiveRepairEquipmentMap] = useState<Record<
    string,
    boolean
  > | null>(null)
  const [saving, setSaving] = useState(false)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [list, reg, ws] = await Promise.all([
        fetchAdminIssueReports(),
        fetchClassroomRegistry(),
        fetchWorkstations(),
      ])
      setIssues(list)
      setClassrooms(reg.classrooms)
      setTeachers(reg.teachers)
      setWorkstations(ws)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (sessionStatus === "authenticated" && session?.user?.role === UserRole.ADMIN) {
      void loadAll()
    }
  }, [sessionStatus, session?.user?.role, loadAll])

  useEffect(() => {
    if (filterStatus === IssueStatus.RESOLVED) {
      setFilterStatus("all")
    }
  }, [filterStatus])

  useEffect(() => {
    if (!addForm.classroomId) {
      setAddEquipment([])
      return
    }
    let cancelled = false
    fetchEquipmentDashboardList({
      classroomId: addForm.classroomId,
      ...(addForm.workstationId ? { workstationId: addForm.workstationId } : {}),
    })
      .then((rows) => {
        if (!cancelled) setAddEquipment(rows)
      })
      .catch(() => {
        if (!cancelled) setAddEquipment([])
      })
    return () => {
      cancelled = true
    }
  }, [addForm.classroomId, addForm.workstationId])

  const issueAnchorClassroomId = selected?.equipment.workstation?.classroom.id
  const issueAnchorWorkstationId = selected?.equipment.workstation?.id
  const isWholeClassroomIssue = Boolean(
    selected?.description?.includes("[Охват: вся аудитория]")
  )
  const effectiveRepairWsId =
    isWholeClassroomIssue ? repairWsId : (issueAnchorWorkstationId ?? "all")

  useEffect(() => {
    if (!repairOpen || !issueAnchorClassroomId) {
      setRepairEquipment([])
      return
    }
    let cancelled = false
    fetchEquipmentDashboardList({
      classroomId: issueAnchorClassroomId,
      ...(effectiveRepairWsId !== "all" ? { workstationId: effectiveRepairWsId } : {}),
    })
      .then((rows) => {
        if (!cancelled) setRepairEquipment(rows)
      })
      .catch(() => {
        if (!cancelled) setRepairEquipment([])
      })
    return () => {
      cancelled = true
    }
  }, [repairOpen, issueAnchorClassroomId, effectiveRepairWsId])

  useEffect(() => {
    if (!repairOpen) {
      setActiveRepairEquipmentMap(null)
      return
    }
    let cancelled = false
    setActiveRepairEquipmentMap(null)
    void Promise.all([fetchDashboardRepairs({ activeOnly: true }), fetchAdminIssueReports()]).then(
      ([repairs, issues]) => {
        if (cancelled) return
        const map: Record<string, boolean> = {}
        for (const r of repairs) {
          map[r.equipment.id] = true
        }
        setActiveRepairEquipmentMap(map)
        setSelected((prev) => {
          if (!prev) return prev
          const fresh = issues.find((i) => i.id === prev.id)
          return fresh ?? prev
        })
      },
    )
    return () => {
      cancelled = true
    }
  }, [repairOpen])

  useEffect(() => {
    if (!repairOpen) return
    const refreshLocks = () => {
      void fetchDashboardRepairs({ activeOnly: true }).then((repairs) => {
        const map: Record<string, boolean> = {}
        for (const r of repairs) {
          map[r.equipment.id] = true
        }
        setActiveRepairEquipmentMap(map)
      })
    }
    window.addEventListener("focus", refreshLocks)
    return () => window.removeEventListener("focus", refreshLocks)
  }, [repairOpen])

  const repairLocksReady = activeRepairEquipmentMap !== null

  const isEquipmentInActiveRepair = useCallback(
    (equipmentId: string) => {
      if (activeRepairEquipmentMap) return Boolean(activeRepairEquipmentMap[equipmentId])
      return Boolean(selected?.repairs.some((r) => r.equipmentId === equipmentId))
    },
    [activeRepairEquipmentMap, selected],
  )

  const newRepairSelectionsCount = useMemo(() => {
    return repairEquipment.filter((e) => !isEquipmentInActiveRepair(e.id) && repairPick[e.id]).length
  }, [repairEquipment, repairPick, isEquipmentInActiveRepair])

  const filterWsOptions = useMemo(() => {
    if (filterClassroomId === "all") return []
    return workstations.filter((w) => w.classroomId === filterClassroomId)
  }, [filterClassroomId, workstations])

  const addWsOptions = useMemo(() => {
    if (!addForm.classroomId) return []
    return workstations.filter((w) => w.classroomId === addForm.classroomId)
  }, [addForm.classroomId, workstations])

  const repairWsOptions = useMemo(() => {
    if (!issueAnchorClassroomId) return []
    const inClassroom = workstations.filter((w) => w.classroomId === issueAnchorClassroomId)
    if (isWholeClassroomIssue) return inClassroom
    return inClassroom.filter((w) => w.id === issueAnchorWorkstationId)
  }, [issueAnchorClassroomId, issueAnchorWorkstationId, isWholeClassroomIssue, workstations])

  const filteredIssues = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return issues.filter((row) => {
      const roomId = row.equipment.workstation?.classroom.id
      const wsId = row.equipment.workstation?.id
      const matchesQ =
        !q ||
        row.title.toLowerCase().includes(q) ||
        row.description.toLowerCase().includes(q) ||
        row.equipment.name.toLowerCase().includes(q) ||
        row.equipment.inventoryNumber.toLowerCase().includes(q) ||
        (row.equipment.workstation?.code &&
          row.equipment.workstation.code.toLowerCase().includes(q)) ||
        personLabel(row.reporter).toLowerCase().includes(q)
      const matchesC = filterClassroomId === "all" || roomId === filterClassroomId
      const matchesW = filterWorkstationId === "all" || wsId === filterWorkstationId
      const matchesS = filterStatus === "all" || row.status === filterStatus
      const matchesP = filterPriority === "all" || row.priority === filterPriority
      return matchesQ && matchesC && matchesW && matchesS && matchesP
    })
  }, [issues, searchQuery, filterClassroomId, filterWorkstationId, filterStatus, filterPriority])

  const stats = useMemo(() => {
    const open = issues.filter((i) => i.status === IssueStatus.NEW).length
    const inProg = issues.filter((i) => i.status === IssueStatus.IN_PROGRESS).length
    const done = issues.filter((i) => i.status === IssueStatus.RESOLVED || i.status === IssueStatus.CLOSED).length
    const crit = issues.filter(
      (i) => i.priority === IssuePriority.CRITICAL && i.status !== IssueStatus.RESOLVED && i.status !== IssueStatus.CLOSED && i.status !== IssueStatus.REJECTED
    ).length
    return { total: issues.length, open, inProg, done, crit }
  }, [issues])

  const resetFilters = () => {
    setSearchQuery("")
    setFilterClassroomId("all")
    setFilterWorkstationId("all")
    setFilterStatus("all")
    setFilterPriority("all")
  }

  const openAdd = () => {
    setAddForm({
      classroomId: "",
      workstationId: "",
      equipmentId: "",
      reporterId: "",
      title: "",
      description: "",
      priority: IssuePriority.MEDIUM,
    })
    setAddOpen(true)
  }

  const submitAdd = async () => {
    if (!addForm.equipmentId || !addForm.reporterId || !addForm.title.trim()) return
    setSaving(true)
    try {
      await createAdminIssueReport({
        equipmentId: addForm.equipmentId,
        reporterId: addForm.reporterId,
        title: addForm.title.trim(),
        description: addForm.description.trim(),
        priority: addForm.priority,
      })
      setAddOpen(false)
      await loadAll()
      requestDashboardNavCountsRefresh()
      toast.success("Обращение добавлено")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка")
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (row: AdminIssueReportRow) => {
    setSelected(row)
    setEditForm({
      title: row.title,
      description: row.description,
      status: issueEditFormInitialStatus(row),
      priority: row.priority,
      resolution: row.resolution ?? "",
    })
    setEditOpen(true)
  }

  const submitEdit = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await updateAdminIssueReport(selected.id, {
        title: editForm.title.trim(),
        description: editForm.description,
        status: editForm.status,
        priority: editForm.priority,
        resolution: editForm.resolution.trim() || null,
      })
      setEditOpen(false)
      setSelected(null)
      await loadAll()
      requestDashboardNavCountsRefresh()
      toast.success("Обращение обновлено")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка")
    } finally {
      setSaving(false)
    }
  }

  const openRepair = (row: AdminIssueReportRow) => {
    setSelected(row)
    if (row.description.includes("[Охват: вся аудитория]")) {
      setRepairWsId("all")
    } else {
      setRepairWsId(row.equipment.workstation?.id ?? "all")
    }
    setRepairPick({})
    setRepairOpen(true)
  }

  const submitRepair = async () => {
    if (!selected || !issueAnchorClassroomId || !repairLocksReady || !activeRepairEquipmentMap) return
    const ids = repairEquipment
      .map((e) => e.id)
      .filter((id) => !activeRepairEquipmentMap[id] && repairPick[id])
    if (ids.length === 0) return
    setSaving(true)
    try {
      await postRepairsForIssue(selected.id, {
        classroomId: issueAnchorClassroomId,
        equipmentIds: ids,
      })
      setRepairOpen(false)
      setSelected(null)
      await loadAll()
      requestDashboardNavCountsRefresh()
      toast.success("Ремонт зарегистрирован")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка")
    } finally {
      setSaving(false)
    }
  }

  const editHasActiveRepairs = Boolean(selected && selected.repairs.length > 0)

  const issueSortGetters = useMemo(
    () => ({
      title: (r: AdminIssueReportRow) => r.title,
      equipment: (r: AdminIssueReportRow) => r.equipment.name,
      reporter: (r: AdminIssueReportRow) => personLabel(r.reporter),
      status: (r: AdminIssueReportRow) => r.status,
      priority: (r: AdminIssueReportRow) => r.priority,
      repairs: (r: AdminIssueReportRow) => r.repairs.length,
      created: (r: AdminIssueReportRow) => new Date(r.createdAt).getTime(),
    }),
    []
  )

  const { sortedItems: sortedIssues, sortKey, sortDir, toggleSort } = useTableSort(
    filteredIssues,
    issueSortGetters,
    "created"
  )

  if (sessionStatus === "loading") {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Неисправности"
          description="Раздел доступен только администратору."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Неисправности"
        description="Обращения по всем аудиториям и рабочим местам. Постановка на ремонт фиксируется в «Активных ремонтах»."
        actions={
          <Button onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить обращение
          </Button>
        }
      />

      {error ? (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center gap-2">
            {error}
            <Button type="button" size="sm" variant="outline" onClick={() => setError(null)}>
              Скрыть
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Всего</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-12" /> : <div className="text-2xl font-bold">{stats.total}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Новые</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-12" /> : <div className="text-2xl font-bold text-red-600">{stats.open}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">В работе</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-12" /> : <div className="text-2xl font-bold text-blue-600">{stats.inProg}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Решено / закрыто</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-12" /> : <div className="text-2xl font-bold text-green-600">{stats.done}</div>}
          </CardContent>
        </Card>
        <Card className={stats.crit > 0 ? "border-red-200 bg-red-50/50 dark:bg-red-950/20" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Критические (открытые)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-12" /> : <div className={`text-2xl font-bold ${stats.crit > 0 ? "text-red-600" : ""}`}>{stats.crit}</div>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-4">
          <CardTitle className="text-base">Фильтры</CardTitle>
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <X className="mr-2 h-4 w-4" />
            Сбросить
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-[repeat(6,minmax(0,1fr))]">
          <div className="relative min-w-0 sm:col-span-2 xl:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Текст, оборудование, инв. номер, код РМ, заявитель…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="min-w-0">
            <Select
              value={filterClassroomId}
              onValueChange={(v) => {
                setFilterClassroomId(v)
                setFilterWorkstationId("all")
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Аудитория" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все аудитории</SelectItem>
                {classrooms.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name?.trim() || `№${c.number}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0">
            <Select
              value={filterWorkstationId}
              onValueChange={setFilterWorkstationId}
              disabled={filterClassroomId === "all"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Рабочее место" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все РМ</SelectItem>
                {filterWsOptions.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0">
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as IssueStatus | "all")}>
              <SelectTrigger>
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                {issueStatusFilterOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {statusMeta[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 sm:col-span-2 xl:col-span-1">
            <Select value={filterPriority} onValueChange={(v) => setFilterPriority(v as IssuePriority | "all")}>
              <SelectTrigger>
                <SelectValue placeholder="Приоритет" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                {priorityOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Журнал</CardTitle>
          <CardDescription>Найдено: {sortedIssues.length}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    columnKey="title"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  >
                    Обращение
                  </SortableTableHead>
                  <SortableTableHead
                    columnKey="equipment"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  >
                    Оборудование
                  </SortableTableHead>
                  <SortableTableHead
                    columnKey="reporter"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  >
                    Заявитель
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
                    columnKey="repairs"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  >
                    Ремонты
                  </SortableTableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedIssues.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      Нет записей
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedIssues.map((row) => {
                    const sm = statusMeta[row.status]
                    const Icon = sm.icon
                    const pm = priorityMeta[row.priority]
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="font-medium">{row.title}</div>
                          <div className="line-clamp-1 text-xs text-muted-foreground">{row.description}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{row.equipment.name}</div>
                          <div className="text-xs text-muted-foreground">инв. {row.equipment.inventoryNumber}</div>
                        </TableCell>
                        <TableCell className="text-sm">{personLabel(row.reporter)}</TableCell>
                        <TableCell>
                          <Badge variant={sm.variant} className="gap-1">
                            <Icon className="h-3 w-3" />
                            {sm.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={pm.className}>
                            {pm.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {row.repairs.length > 0 ? (
                            <span className="text-sm text-orange-600">{row.repairs.length} активн.</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelected(row)
                                  setViewOpen(true)
                                }}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Просмотр
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEdit(row)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Изменить
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openRepair(row)}>
                                <Wrench className="mr-2 h-4 w-4" />
                                На ремонт
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
            <DialogDescription>Обращение о неисправности</DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Описание:</span>
                <p className="mt-1 whitespace-pre-wrap">{selected.description}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Оборудование в обращении:</span>
                <p className="font-medium">
                  {selected.equipment.name} (инв. {selected.equipment.inventoryNumber})
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Место:</span>
                <p>{issueLocation(selected)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Заявитель:</span>
                <p>{personLabel(selected.reporter)}</p>
              </div>
              {selected.resolution?.trim() ? (
                <div className="rounded-md bg-muted p-3">
                  <span className="text-muted-foreground">Комментарий / решение:</span>
                  <p className="mt-1 whitespace-pre-wrap">{selected.resolution}</p>
                </div>
              ) : null}
              {selected.repairs.length > 0 ? (
                <div>
                  <span className="text-muted-foreground">Активные ремонты по обращению:</span>
                  <ul className="mt-1 list-inside list-disc">
                    {selected.repairs.map((r) => (
                      <li key={r.id}>
                        {r.equipment.name} (инв. {r.equipment.inventoryNumber})
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Новое обращение</DialogTitle>
            <DialogDescription>Выберите аудиторию, рабочее место, оборудование и заявителя</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label>Аудитория</Label>
              <Select
                value={addForm.classroomId}
                onValueChange={(v) =>
                  setAddForm({ ...addForm, classroomId: v, workstationId: "", equipmentId: "" })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите" />
                </SelectTrigger>
                <SelectContent>
                  {classrooms.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name?.trim() || `№${c.number}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Рабочее место</Label>
              <Select
                value={addForm.workstationId ? addForm.workstationId : "__any__"}
                onValueChange={(v) =>
                  setAddForm({
                    ...addForm,
                    workstationId: v === "__any__" ? "" : v,
                    equipmentId: "",
                  })
                }
                disabled={!addForm.classroomId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Все / выберите РМ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__any__">Любое в аудитории</SelectItem>
                  {addWsOptions.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Оборудование</Label>
              <Select
                value={addForm.equipmentId}
                onValueChange={(v) => setAddForm({ ...addForm, equipmentId: v })}
                disabled={!addForm.classroomId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите единицу" />
                </SelectTrigger>
                <SelectContent>
                  {addEquipment.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} · {e.inventoryNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Заявитель (преподаватель)</Label>
              <Select
                value={addForm.reporterId}
                onValueChange={(v) => setAddForm({ ...addForm, reporterId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.lastName} {t.firstName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Заголовок</Label>
              <Input value={addForm.title} onChange={(e) => setAddForm({ ...addForm, title: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Описание</Label>
              <Textarea
                rows={3}
                value={addForm.description}
                onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Приоритет</Label>
              <Select
                value={addForm.priority}
                onValueChange={(v) => setAddForm({ ...addForm, priority: v as IssuePriority })}
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Отмена
            </Button>
            <Button
              disabled={saving || !addForm.equipmentId || !addForm.reporterId || !addForm.title.trim()}
              onClick={() => void submitAdd()}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Изменить обращение</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label>Заголовок</Label>
              <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Описание</Label>
              <Textarea
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Статус</Label>
              <Select
                value={editForm.status}
                onValueChange={(v) => setEditForm({ ...editForm, status: v as IssueStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {issueAdminEditStatuses.map((s) => (
                    <SelectItem
                      key={s}
                      value={s}
                      disabled={
                        editHasActiveRepairs &&
                        (s === IssueStatus.RESOLVED || s === IssueStatus.REJECTED)
                      }
                    >
                      {statusMeta[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editHasActiveRepairs ? (
                <p className="text-xs text-muted-foreground">
                  Пока есть ремонты в очереди или в работе, нельзя перевести обращение в «Решено» или «Отклонено».
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label>Приоритет</Label>
              <Select
                value={editForm.priority}
                onValueChange={(v) => setEditForm({ ...editForm, priority: v as IssuePriority })}
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
              <Label>Решение / комментарий для заявителя</Label>
              <Textarea
                rows={3}
                value={editForm.resolution}
                onChange={(e) => setEditForm({ ...editForm, resolution: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Отмена
            </Button>
            <Button disabled={saving} onClick={() => void submitEdit()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={repairOpen} onOpenChange={setRepairOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Поставить на ремонт</DialogTitle>
            <DialogDescription>
              Выберите оборудование в той же аудитории, что и обращение. У заявителя в «Моих заявках» появится
              комментарий о ремонте выбранных устройств. Позиции «в активном ремонте» уже отмечены и не снимаются,
              пока ремонт в разделе «Активные ремонты» не переведён в «Готово» или «Отменено».
            </DialogDescription>
          </DialogHeader>
          {!issueAnchorClassroomId ? (
            <Alert>
              <AlertDescription>
                У оборудования в этом обращении нет привязки к аудитории — постановка на ремонт недоступна.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="grid gap-2">
                <Label>Рабочее место (фильтр)</Label>
                <Select
                  value={effectiveRepairWsId}
                  onValueChange={setRepairWsId}
                  disabled={!isWholeClassroomIssue}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {isWholeClassroomIssue ? <SelectItem value="all">Вся аудитория</SelectItem> : null}
                    {repairWsOptions.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!isWholeClassroomIssue ? (
                  <p className="text-xs text-muted-foreground">
                    Для этого обращения доступно только рабочее место из исходной заявки.
                  </p>
                ) : null}
              </div>
              <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border p-2">
                {repairEquipment.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Нет оборудования в выборке</p>
                ) : (
                  repairEquipment.map((e) => {
                    const locked = isEquipmentInActiveRepair(e.id)
                    const checked = locked || Boolean(repairPick[e.id])
                    return (
                      <label
                        key={e.id}
                        className={cn(
                          "flex items-start gap-2 text-sm",
                          locked ? "cursor-default opacity-90" : "cursor-pointer",
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          disabled={locked}
                          onCheckedChange={(c) => {
                            if (locked) return
                            setRepairPick((p) => ({ ...p, [e.id]: c === true }))
                          }}
                        />
                        <span>
                          <span className="font-medium">{e.name}</span>
                          <span className="text-muted-foreground"> · инв. {e.inventoryNumber}</span>
                          {locked ? (
                            <span className="ml-1.5 text-xs font-medium text-amber-700 dark:text-amber-500">
                              в активном ремонте
                            </span>
                          ) : null}
                          {e.workstationCode ? (
                            <span className="block text-xs text-muted-foreground">{e.workstationCode}</span>
                          ) : null}
                        </span>
                      </label>
                    )
                  })
                )}
              </div>
            </>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRepairOpen(false)}>
              Отмена
            </Button>
            <Button
              disabled={
                saving ||
                !issueAnchorClassroomId ||
                !repairLocksReady ||
                newRepairSelectionsCount === 0
              }
              onClick={() => void submitRepair()}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Создать ремонты"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
