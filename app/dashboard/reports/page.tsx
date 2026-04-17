"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import {
  EquipmentStatus,
  IssueStatus,
  RepairStatus,
  SoftwareLicenseKind,
} from "@prisma/client"
import { toast } from "sonner"
import { PageHeader } from "@/components/dashboard/page-header"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { SortableTableHead } from "@/components/ui/sortable-table-head"
import { useTableSort } from "@/hooks/use-table-sort"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Download,
  Package,
  AlertTriangle,
  Wrench,
  School,
  HardDrive,
  Calendar,
  Filter,
  Printer,
  PieChart,
  Activity,
  CheckCircle,
  XCircle,
  Archive,
  Search,
  Loader2,
} from "lucide-react"
import {
  equipmentStatusBadgeVariant,
  equipmentStatusLabel,
} from "@/lib/equipment-labels"
import { softwareLicenseTypeLabel } from "@/lib/software-labels"
import { fetchClassroomRegistry, type ClassroomRegistryPayload } from "@/lib/api/classroom-registry"
import {
  fetchReportsDashboard,
  type ReportsPayload,
  type ReportsHistoryRow,
} from "@/lib/api/reports-dashboard"
import { buildReportsExportTable, reportsTableToPrintHtml } from "@/lib/reports-export-table"
import { downloadReportsExcel, downloadReportsPdf } from "@/lib/reports-export-file"

type WorkstationOpt = {
  id: string
  code: string
  classroomId: string
  name: string
}

const REPORTS_SUBTAB_PRINT_EXPORT = new Set([
  "by-status",
  "classrooms",
  "problems",
  "software",
  "history",
])

function issueStatusLabel(s: string): string {
  const m: Record<string, string> = {
    [IssueStatus.NEW]: "Новое",
    [IssueStatus.IN_PROGRESS]: "В работе",
    [IssueStatus.RESOLVED]: "Решено",
    [IssueStatus.CLOSED]: "Закрыто",
    [IssueStatus.REJECTED]: "Отклонено",
  }
  return m[s] ?? s
}

function repairStatusLabel(s: string): string {
  const m: Record<string, string> = {
    [RepairStatus.PLANNED]: "Запланирован",
    [RepairStatus.IN_PROGRESS]: "В процессе",
    [RepairStatus.COMPLETED]: "Завершён",
    [RepairStatus.CANCELLED]: "Отменён",
  }
  return m[s] ?? s
}

function licenseLabel(k: SoftwareLicenseKind, licenseType?: string | null): string {
  if (licenseType) return softwareLicenseTypeLabel(licenseType)
  switch (k) {
    case SoftwareLicenseKind.FREE:
      return "Бесплатная лицензия"
    case SoftwareLicenseKind.PAID:
      return "Коммерческая лицензия"
    case SoftwareLicenseKind.EDUCATIONAL:
      return "Проприетарная лицензия"
    default:
      return String(k)
  }
}

function statusDescription(status: EquipmentStatus): string {
  switch (status) {
    case EquipmentStatus.OPERATIONAL:
      return "Оборудование работает исправно и готово к использованию"
    case EquipmentStatus.NEEDS_CHECK:
      return "Требуется проверка или диагностика"
    case EquipmentStatus.IN_REPAIR:
      return "Оборудование на ремонте"
    case EquipmentStatus.DECOMMISSIONED:
      return "Оборудование списано и не используется"
    case EquipmentStatus.NOT_IN_USE:
      return "Не задействовано в работе"
    default:
      return ""
  }
}

function defaultDateRange() {
  const today = new Date()
  const from = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: today.toISOString().slice(0, 10),
  }
}

export default function ReportsPage() {
  const { data: session, status: sessionStatus } = useSession()
  const [{ dateFrom, dateTo }, setDateRange] = useState(defaultDateRange)
  const [historySearch, setHistorySearch] = useState("")
  const [data, setData] = useState<ReportsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [swBuildingId, setSwBuildingId] = useState("all")
  const [swClassroomId, setSwClassroomId] = useState("all")
  const [swWorkstationId, setSwWorkstationId] = useState("all")
  const [swInventory, setSwInventory] = useState("")
  const [swInventoryDebounced, setSwInventoryDebounced] = useState("")

  const [classroomReg, setClassroomReg] = useState<ClassroomRegistryPayload | null>(null)
  const [workstations, setWorkstations] = useState<WorkstationOpt[]>([])
  const [activeTab, setActiveTab] = useState("overview")
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<"excel" | "pdf">("excel")
  const [exportBusy, setExportBusy] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setSwInventoryDebounced(swInventory), 350)
    return () => clearTimeout(t)
  }, [swInventory])

  const loadMeta = useCallback(async () => {
    if (sessionStatus !== "authenticated") return
    try {
      const [cr, wsRes] = await Promise.all([
        fetchClassroomRegistry(),
        fetch("/api/workstations", { cache: "no-store" }).then(async (r) => {
          if (!r.ok) throw new Error("workstations")
          return r.json() as Promise<{ workstations: WorkstationOpt[] }>
        }),
      ])
      setClassroomReg(cr)
      setWorkstations(wsRes.workstations)
    } catch {
      setClassroomReg(null)
      setWorkstations([])
    }
  }, [sessionStatus])

  const loadReports = useCallback(async () => {
    if (sessionStatus !== "authenticated") return
    setLoading(true)
    setError(null)
    try {
      const payload = await fetchReportsDashboard({
        dateFrom,
        dateTo,
        buildingId: swBuildingId,
        classroomId: swClassroomId,
        workstationId: swWorkstationId,
        inventorySearch: swInventoryDebounced,
      })
      setData(payload)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [
    sessionStatus,
    dateFrom,
    dateTo,
    swBuildingId,
    swClassroomId,
    swWorkstationId,
    swInventoryDebounced,
  ])

  useEffect(() => {
    void loadMeta()
  }, [loadMeta])

  useEffect(() => {
    if (sessionStatus === "authenticated") void loadReports()
  }, [sessionStatus, loadReports])

  const filteredClassroomsForSw = useMemo(() => {
    if (!classroomReg) return []
    if (swBuildingId === "all") return classroomReg.classrooms
    return classroomReg.classrooms.filter((c) => c.buildingId === swBuildingId)
  }, [classroomReg, swBuildingId])

  const workstationsForSw = useMemo(() => {
    if (swClassroomId === "all") return []
    return workstations.filter((w) => w.classroomId === swClassroomId)
  }, [workstations, swClassroomId])

  const filteredHistory = useMemo(() => {
    const rows = data?.history ?? []
    const q = historySearch.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((item) => {
      const blob = [
        item.equipment,
        item.inventoryNumber,
        item.classroom,
        item.description,
        item.sysAdminDisplay ?? "",
        item.status,
        item.kind,
      ]
        .join(" ")
        .toLowerCase()
      return blob.includes(q)
    })
  }, [data?.history, historySearch])

  const historySortGetters = useMemo(
    () => ({
      date: (r: ReportsHistoryRow) => r.date,
      kind: (r: ReportsHistoryRow) => r.kind,
      inventory: (r: ReportsHistoryRow) => r.inventoryNumber,
      equipment: (r: ReportsHistoryRow) => r.equipment,
      classroom: (r: ReportsHistoryRow) => r.classroom,
      description: (r: ReportsHistoryRow) => r.description,
      admin: (r: ReportsHistoryRow) => r.sysAdminDisplay ?? "",
      status: (r: ReportsHistoryRow) => r.status,
    }),
    []
  )

  const {
    sortedItems: sortedHistory,
    sortKey: historySortKey,
    sortDir: historySortDir,
    toggleSort: toggleHistorySort,
  } = useTableSort(filteredHistory, historySortGetters, "date")

  const summary = data?.summary
  const totalEquipment = summary?.totalEquipment ?? 0
  const totalWorking = summary?.operational ?? 0
  const totalFaulty = summary?.needsCheck ?? 0
  const totalInRepair = summary?.inRepair ?? 0
  const totalDecommissioned = summary?.decommissioned ?? 0
  const activeRepairsCount = summary?.activeRepairsCount ?? 0

  if (sessionStatus === "loading") {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!session?.user) return null

  const statusBadge = (status: EquipmentStatus) => (
    <Badge variant={equipmentStatusBadgeVariant(status)}>{equipmentStatusLabel(status)}</Badge>
  )

  /** Только подраздел «История» на этой странице */
  const historyRowBadge = (item: ReportsHistoryRow) => {
    if (item.kind === "issue") {
      const s = item.status as IssueStatus
      if (s === IssueStatus.RESOLVED || s === IssueStatus.CLOSED) {
        return (
          <Badge variant="outline" className="gap-1 border-green-200 bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3" />
            {issueStatusLabel(item.status)}
          </Badge>
        )
      }
      if (s === IssueStatus.REJECTED) {
        return (
          <Badge variant="secondary" className="gap-1">
            <XCircle className="h-3 w-3" />
            {issueStatusLabel(item.status)}
          </Badge>
        )
      }
      if (s === IssueStatus.IN_PROGRESS) {
        return (
          <Badge variant="default" className="gap-1">
            <Wrench className="h-3 w-3" />
            {issueStatusLabel(item.status)}
          </Badge>
        )
      }
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          {issueStatusLabel(item.status)}
        </Badge>
      )
    }

    const rs = item.status as RepairStatus
    if (rs === RepairStatus.COMPLETED) {
      return (
        <Badge variant="outline" className="gap-1 border-green-200 bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3" />
          {repairStatusLabel(item.status)}
        </Badge>
      )
    }
    if (rs === RepairStatus.CANCELLED) {
      return (
        <Badge variant="outline" className="gap-1 border-amber-200 bg-amber-100 text-amber-900">
          <XCircle className="h-3 w-3" />
          {repairStatusLabel(item.status)}
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="gap-1">
        <Wrench className="h-3 w-3" />
        {repairStatusLabel(item.status)}
      </Badge>
    )
  }

  const getLicenseBadge = (license: string) => {
    switch (license) {
      case "Бесплатная лицензия":
      case "Свободная лицензия":
      case "Лицензия с открытым исходным кодом":
        return (
          <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
            {license}
          </Badge>
        )
      case "Проприетарная лицензия":
        return (
          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
            Проприетарная
          </Badge>
        )
      case "Коммерческая лицензия":
        return (
          <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">
            Коммерческая
          </Badge>
        )
      default:
        return <Badge variant="outline">{license}</Badge>
    }
  }

  const softwareFilterSummaryLines = useCallback((): string[] => {
    const lines: string[] = []
    if (swBuildingId !== "all" && classroomReg) {
      const b = classroomReg.buildings.find((x) => x.id === swBuildingId)
      if (b) lines.push(`Корпус: ${b.name}`)
    }
    if (swClassroomId !== "all" && classroomReg) {
      const c = classroomReg.classrooms.find((x) => x.id === swClassroomId)
      if (c) lines.push(`Аудитория: ${c.number}${c.name ? ` (${c.name})` : ""}`)
    }
    if (swWorkstationId !== "all") {
      const w = workstations.find((x) => x.id === swWorkstationId)
      if (w) lines.push(`Рабочее место: ${w.code}`)
    }
    if (swInventoryDebounced.trim()) {
      lines.push(`Инв. номер (фрагмент): ${swInventoryDebounced}`)
    }
    if (lines.length === 0) lines.push("Фильтры: не заданы (все доступные ПК)")
    return lines
  }, [swBuildingId, swClassroomId, swWorkstationId, swInventoryDebounced, classroomReg, workstations])

  const historyStatusText = useCallback(
    (item: ReportsHistoryRow) =>
      item.kind === "issue" ? issueStatusLabel(item.status) : repairStatusLabel(item.status),
    []
  )

  const exportTable = useMemo(
    () =>
      buildReportsExportTable({
        activeTab,
        data,
        filteredHistory: sortedHistory,
        dateFrom,
        dateTo,
        softwareFilterLines: softwareFilterSummaryLines(),
        equipmentStatusLabel,
        licenseLabel,
        historyStatusText,
      }),
    [
      activeTab,
      data,
      sortedHistory,
      dateFrom,
      dateTo,
      softwareFilterSummaryLines,
      historyStatusText,
    ]
  )

  const handleReportsPrint = () => {
    if (!exportTable) return
    const html = reportsTableToPrintHtml(exportTable)
    const iframe = document.createElement("iframe")
    iframe.setAttribute("title", "Печать отчёта")
    Object.assign(iframe.style, {
      position: "fixed",
      right: "0",
      bottom: "0",
      width: "0",
      height: "0",
      border: "0",
      visibility: "hidden",
    })
    document.body.appendChild(iframe)
    const win = iframe.contentWindow
    const idoc = iframe.contentDocument
    if (!win || !idoc) {
      iframe.remove()
      return
    }

    const cleanup = () => {
      try {
        iframe.remove()
      } catch {
        /* noop */
      }
    }

    const runPrint = () => {
      try {
        win.focus()
        win.print()
      } finally {
        setTimeout(cleanup, 800)
      }
    }

    idoc.open()
    idoc.write(html)
    idoc.close()

    requestAnimationFrame(() => {
      requestAnimationFrame(runPrint)
    })
  }

  const handleOpenExportDialog = () => {
    if (!exportTable) return
    setExportFormat("excel")
    setExportDialogOpen(true)
  }

  const handleConfirmExport = async () => {
    if (!exportTable) return
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "")
    const base = `otchet-${activeTab}-${stamp}`
    setExportBusy(true)
    try {
      if (exportFormat === "excel") {
        await downloadReportsExcel(exportTable, `${base}.xlsx`)
      } else {
        await downloadReportsPdf(exportTable, `${base}.pdf`)
      }
      setExportDialogOpen(false)
      toast.success("Файл сохранён")
    } finally {
      setExportBusy(false)
    }
  }

  const PREVIEW_ROW_LIMIT = 100
  const PREVIEW_SOFTWARE_PC = 5
  const PREVIEW_SOFTWARE_ROWS = 20
  const previewRowCount = exportTable?.rows.length ?? 0
  const previewRowsSlice = exportTable?.rows.slice(0, PREVIEW_ROW_LIMIT) ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Отчёты и аналитика"
        description={
          <>
            Статистика по оборудованию, обращениям и ремонтам
            {session.user.role === "TEACHER" ? " (только ваши аудитории)" : ""}
          </>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего оборудования</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{totalEquipment}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">{totalWorking} исправно</span>
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {equipmentStatusLabel(EquipmentStatus.NEEDS_CHECK)}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-red-600">{totalFaulty}</div>
                <p className="text-xs text-muted-foreground">
                  {totalEquipment > 0
                    ? `${((totalFaulty / totalEquipment) * 100).toFixed(1)}% от общего числа`
                    : "Нет данных"}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">В ремонте</CardTitle>
            <Wrench className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-yellow-600">{totalInRepair}</div>
                <p className="text-xs text-muted-foreground">
                  {activeRepairsCount} активных записей ремонта
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Списано</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{totalDecommissioned}</div>
                <p className="text-xs text-muted-foreground">Единиц со статусом «Списано»</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-6 lg:max-w-3xl">
            <TabsTrigger value="overview">Обзор</TabsTrigger>
            <TabsTrigger value="by-status">По статусам</TabsTrigger>
            <TabsTrigger value="classrooms">По кабинетам</TabsTrigger>
            <TabsTrigger value="problems">Проблемное</TabsTrigger>
            <TabsTrigger value="software">ПО</TabsTrigger>
            <TabsTrigger value="history">История</TabsTrigger>
          </TabsList>
          {REPORTS_SUBTAB_PRINT_EXPORT.has(activeTab) && (
            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => handleReportsPrint()}
                disabled={loading || !exportTable}
              >
                <Printer className="mr-2 h-4 w-4" />
                Печать
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={handleOpenExportDialog}
                disabled={loading || !exportTable}
              >
                <Download className="mr-2 h-4 w-4" />
                Экспорт
              </Button>
            </div>
          )}
        </div>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Оборудование по статусам
                </CardTitle>
                <CardDescription>Распределение по текущему статусу в базе</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(data?.statusBreakdown ?? []).map((item) => (
                      <div key={item.status} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-sm font-medium">{item.label}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {item.count} ({item.percentage}%)
                          </span>
                        </div>
                        <Progress value={Math.min(100, item.percentage)} className="h-2" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Оборудование в ремонте
                </CardTitle>
                <CardDescription>
                  Статус «В ремонте» или активный ремонт (запланирован / в процессе)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : (data?.inRepairEquipment ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Нет оборудования в ремонте</p>
                ) : (
                  <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                    {(data?.inRepairEquipment ?? []).map((item) => (
                      <div key={item.id} className="space-y-2 rounded-lg border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{item.name}</p>
                            <p className="font-mono text-xs text-muted-foreground">
                              {item.inventoryNumber}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {[item.buildingName, item.classroomLabel].filter(Boolean).join(" · ")}
                              {item.workstationCode ? ` · ${item.workstationCode}` : ""}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            {statusBadge(item.equipmentStatus)}
                            {item.repairStatus ? (
                              <Badge variant="outline" className="text-xs">
                                {repairStatusLabel(item.repairStatus)}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{item.technician ? `Исполнитель: ${item.technician}` : "Исполнитель не назначен"}</span>
                          <span>{item.startedAt ? `Старт: ${item.startedAt}` : ""}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Оборудование с наибольшим количеством проблем
              </CardTitle>
              <CardDescription>
                По числу обращений (issue reports), топ-5
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Оборудование</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Кабинет</TableHead>
                      <TableHead className="text-center">Обращений</TableHead>
                      <TableHead>Последнее</TableHead>
                      <TableHead>Статус</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.topProblems ?? []).slice(0, 5).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.type}</TableCell>
                        <TableCell>{item.classroom}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="destructive">{item.problemCount}</Badge>
                        </TableCell>
                        <TableCell>{item.lastProblem}</TableCell>
                        <TableCell>{statusBadge(item.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-status" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {loading
              ? [1, 2, 3, 4, 5].map((i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <Skeleton className="h-4 w-24" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-10 w-20" />
                    </CardContent>
                  </Card>
                ))
              : (data?.statusBreakdown ?? []).map((item) => (
                  <Card key={item.status}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        {item.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold" style={{ color: item.color }}>
                        {item.count}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.percentage}% от общего числа
                      </p>
                      <Progress value={Math.min(100, item.percentage)} className="mt-3 h-2" />
                    </CardContent>
                  </Card>
                ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Описание статусов</CardTitle>
              <CardDescription>Соответствие полей в системе</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {(data?.statusBreakdown ?? []).map((row) => (
                  <div key={row.status} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: row.color }}
                      />
                      <h4 className="font-semibold">{row.label}</h4>
                      <Badge variant="secondary">{row.count}</Badge>
                    </div>
                    <div className="ml-6 text-sm text-muted-foreground">
                      {statusDescription(row.status)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="classrooms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <School className="h-5 w-5" />
                Кабинеты по неисправностям и ремонту
              </CardTitle>
              <CardDescription>
                «Неисправно» — статус «Требует проверки»; «В ремонте» — статус «В ремонте»
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Кабинет</TableHead>
                      <TableHead>Корпус</TableHead>
                      <TableHead className="text-center">Всего ед.</TableHead>
                      <TableHead className="text-center">Треб. проверки</TableHead>
                      <TableHead className="text-center">В ремонте</TableHead>
                      <TableHead>Доля проблем</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.classroomIssues ?? []).map((item, index) => (
                      <TableRow key={item.classroomId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {index < 3 && (
                              <Badge
                                variant={index === 0 ? "destructive" : "secondary"}
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full p-0"
                              >
                                {index + 1}
                              </Badge>
                            )}
                            <span className="font-medium">
                              {item.classroomName
                                ? `${item.classroomNumber} (${item.classroomName})`
                                : item.classroomNumber}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{item.buildingName ?? "—"}</TableCell>
                        <TableCell className="text-center">{item.totalEquipment}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="destructive">{item.faultyCount}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className="bg-yellow-50 text-yellow-700"
                          >
                            {item.inRepairCount}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={Math.min(100, item.percentage)} className="h-2 w-20" />
                            <span className="text-sm text-muted-foreground">{item.percentage}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Сводка по кабинетам</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {(data?.classroomIssues ?? []).map((item) => (
                    <div key={item.classroomId} className="space-y-3 rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {item.classroomName
                              ? `${item.classroomNumber} (${item.classroomName})`
                              : item.classroomNumber}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.buildingName ?? "—"}
                          </p>
                        </div>
                        <Badge variant={item.percentage > 20 ? "destructive" : "secondary"}>
                          {item.percentage}%
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded bg-muted p-2">
                          <p className="text-lg font-bold">{item.totalEquipment}</p>
                          <p className="text-xs text-muted-foreground">Всего</p>
                        </div>
                        <div className="rounded bg-red-50 p-2">
                          <p className="text-lg font-bold text-red-600">{item.faultyCount}</p>
                          <p className="text-xs text-muted-foreground">Проверка</p>
                        </div>
                        <div className="rounded bg-yellow-50 p-2">
                          <p className="text-lg font-bold text-yellow-600">
                            {item.inRepairCount}
                          </p>
                          <p className="text-xs text-muted-foreground">Ремонт</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="problems" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Оборудование с наибольшим количеством обращений
              </CardTitle>
              <CardDescription>Сортировка по числу записей в журнале обращений</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Оборудование</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Кабинет</TableHead>
                      <TableHead className="text-center">Обращений</TableHead>
                      <TableHead>Последнее</TableHead>
                      <TableHead>Статус</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.topProblems ?? []).map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Badge
                            variant={index < 3 ? "destructive" : "secondary"}
                            className="flex h-8 w-8 items-center justify-center rounded-full p-0"
                          >
                            {index + 1}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.type}</TableCell>
                        <TableCell>{item.classroom}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <span className="font-bold text-red-600">{item.problemCount}</span>
                          </div>
                        </TableCell>
                        <TableCell>{item.lastProblem}</TableCell>
                        <TableCell>{statusBadge(item.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="software" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Установленное ПО на ПК
              </CardTitle>
              <CardDescription>
                Компьютеры (тип «Компьютер») и список установленного ПО. Данные обновляются при
                смене фильтров.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label>Корпус</Label>
                  <Select
                    value={swBuildingId}
                    onValueChange={(v) => {
                      setSwBuildingId(v)
                      setSwClassroomId("all")
                      setSwWorkstationId("all")
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Корпус" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все корпуса</SelectItem>
                      {classroomReg?.buildings.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Аудитория</Label>
                  <Select
                    value={swClassroomId}
                    onValueChange={(v) => {
                      setSwClassroomId(v)
                      setSwWorkstationId("all")
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Аудитория" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все аудитории</SelectItem>
                      {filteredClassroomsForSw.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.number}
                          {c.name ? ` · ${c.name}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Рабочее место (ПК)</Label>
                  <Select
                    value={swWorkstationId}
                    onValueChange={setSwWorkstationId}
                    disabled={swClassroomId === "all"}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={swClassroomId === "all" ? "Сначала аудитория" : "Все РМ"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все РМ в аудитории</SelectItem>
                      {workstationsForSw.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.code}
                          {w.name ? ` · ${w.name}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Инвентарный номер</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Фрагмент инв. №"
                      value={swInventory}
                      onChange={(e) => setSwInventory(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : (data?.pcSoftware ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Нет компьютеров по выбранным условиям</p>
              ) : (
                <div className="space-y-6">
                  {(data?.pcSoftware ?? []).map((pc) => (
                    <div key={pc.equipmentId} className="rounded-lg border p-4">
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold">{pc.name}</h4>
                          <p className="font-mono text-sm text-muted-foreground">
                            {pc.inventoryNumber}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {[pc.buildingName, pc.classroomNumber, pc.workstationCode]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        <Badge variant="secondary">{pc.software.length} программ</Badge>
                      </div>
                      {pc.software.length === 0 ? (
                        <p className="text-sm text-muted-foreground">ПО не занесено</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Название</TableHead>
                              <TableHead>Версия</TableHead>
                              <TableHead>Лицензия</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pc.software.map((sw, idx) => (
                              <TableRow key={`${pc.equipmentId}-${idx}-${sw.name}`}>
                                <TableCell className="font-medium">{sw.name}</TableCell>
                                <TableCell>{sw.version}</TableCell>
                                <TableCell>
                                  {getLicenseBadge(licenseLabel(sw.licenseKind, sw.licenseType))}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="h-4 w-4" />
                Фильтр по периоду
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex min-w-0 flex-wrap items-end gap-4">
                <div className="relative min-w-[min(100%,16rem)] flex-1 basis-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Поиск в таблице ниже…"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    aria-label="Поиск в истории"
                  />
                </div>
                <div className="relative grid min-w-0 gap-2">
                  <Label htmlFor="dateFrom">Дата с</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateRange((r) => ({ ...r, dateFrom: e.target.value }))}
                    className="w-40 max-w-full"
                  />
                </div>
                <div className="relative grid min-w-0 gap-2">
                  <Label htmlFor="dateTo">Дата по</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateRange((r) => ({ ...r, dateTo: e.target.value }))}
                    className="w-40 max-w-full"
                  />
                </div>
                <div className="flex min-w-0 flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="whitespace-nowrap"
                    type="button"
                    onClick={() => setDateRange(defaultDateRange())}
                  >
                    Месяц
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="whitespace-nowrap"
                    type="button"
                    onClick={() => {
                      const today = new Date()
                      const start = new Date(today.getFullYear(), 0, 1)
                      setDateRange({
                        dateFrom: start.toISOString().slice(0, 10),
                        dateTo: today.toISOString().slice(0, 10),
                      })
                    }}
                  >
                    С начала года
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Обращений за период</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {data?.historyStats.issuesInPeriod ?? "—"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ремонтов завершено</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {data?.historyStats.repairsCompletedInPeriod ?? "—"}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                История обращений и ремонтов
              </CardTitle>
              <CardDescription>
                Период {dateFrom} — {dateTo}, в таблице {sortedHistory.length} записей
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[min(62vh,700px)] overflow-x-auto overflow-y-auto rounded-md border">
                <Table className="min-w-[1400px]">
                <TableHeader>
                  <TableRow>
                    <SortableTableHead
                      columnKey="date"
                      sortKey={historySortKey}
                      sortDir={historySortDir}
                      onSort={toggleHistorySort}
                      className="min-w-[10rem]"
                    >
                      Дата
                    </SortableTableHead>
                    <SortableTableHead
                      columnKey="kind"
                      sortKey={historySortKey}
                      sortDir={historySortDir}
                      onSort={toggleHistorySort}
                      className="min-w-[8rem]"
                    >
                      Тип
                    </SortableTableHead>
                    <SortableTableHead
                      columnKey="inventory"
                      sortKey={historySortKey}
                      sortDir={historySortDir}
                      onSort={toggleHistorySort}
                      className="min-w-[10rem]"
                    >
                      Инв. №
                    </SortableTableHead>
                    <SortableTableHead
                      columnKey="equipment"
                      sortKey={historySortKey}
                      sortDir={historySortDir}
                      onSort={toggleHistorySort}
                      className="min-w-[16rem]"
                    >
                      Оборудование
                    </SortableTableHead>
                    <SortableTableHead
                      columnKey="classroom"
                      sortKey={historySortKey}
                      sortDir={historySortDir}
                      onSort={toggleHistorySort}
                      className="min-w-[13rem]"
                    >
                      Кабинет
                    </SortableTableHead>
                    <SortableTableHead
                      columnKey="description"
                      sortKey={historySortKey}
                      sortDir={historySortDir}
                      onSort={toggleHistorySort}
                      className="min-w-[20rem]"
                    >
                      Описание
                    </SortableTableHead>
                    <SortableTableHead
                      columnKey="admin"
                      sortKey={historySortKey}
                      sortDir={historySortDir}
                      onSort={toggleHistorySort}
                      className="min-w-[13rem]"
                    >
                      Сис. админ
                    </SortableTableHead>
                    <SortableTableHead
                      columnKey="status"
                      sortKey={historySortKey}
                      sortDir={historySortDir}
                      onSort={toggleHistorySort}
                      className="min-w-[10rem]"
                    >
                      Статус
                    </SortableTableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        Нет записей
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedHistory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">{item.date}</TableCell>
                        <TableCell>
                          {item.kind === "issue" ? (
                            <Badge variant="outline">Обращение</Badge>
                          ) : (
                            <Badge variant="secondary">Ремонт</Badge>
                          )}
                        </TableCell>
                        <TableCell
                          className="max-w-[9rem] truncate font-mono text-xs"
                          title={item.inventoryNumber}
                        >
                          {item.inventoryNumber}
                        </TableCell>
                        <TableCell className="font-medium">{item.equipment}</TableCell>
                        <TableCell>{item.classroom}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={item.description}>
                          {item.description}
                        </TableCell>
                        <TableCell>{item.sysAdminDisplay ?? "—"}</TableCell>
                        <TableCell>{historyRowBadge(item)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={exportDialogOpen}
        onOpenChange={(open) => {
          if (!exportBusy) setExportDialogOpen(open)
        }}
      >
        <DialogContent className="flex max-h-[90vh] w-full max-w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
          <DialogHeader className="min-w-0 shrink-0 space-y-2 border-b px-6 py-4 pr-14 text-left sm:pr-16">
            <DialogTitle>Экспорт отчёта</DialogTitle>
            <DialogDescription className="max-w-full text-pretty break-words hyphens-auto">
              Выберите формат файла. Ниже — фрагмент того, что попадёт в экспорт (полные данные — в
              скачанном файле).
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Формат</Label>
              <RadioGroup
                value={exportFormat}
                onValueChange={(v) => setExportFormat(v as "excel" | "pdf")}
                className="flex flex-wrap gap-6"
                disabled={exportBusy}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="excel" id="export-fmt-excel" />
                  <Label htmlFor="export-fmt-excel" className="cursor-pointer font-normal">
                    Excel (.xlsx)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pdf" id="export-fmt-pdf" />
                  <Label htmlFor="export-fmt-pdf" className="cursor-pointer font-normal">
                    PDF
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="min-w-0 space-y-2">
              <Label className="text-sm font-medium">Предпросмотр</Label>
              <div className="max-h-[min(420px,50vh)] w-full min-w-0 overflow-auto rounded-md border">
                <div className="space-y-4 p-4">
                  {!exportTable ? (
                    <p className="text-sm text-muted-foreground">Нет данных для экспорта.</p>
                  ) : exportTable.softwareBlocks?.length ? (
                    <>
                      {exportTable.notes.length > 0 && (
                        <ul className="list-inside list-disc space-y-1 text-sm break-words text-muted-foreground">
                          {exportTable.notes.map((n, i) => (
                            <li key={i}>{n}</li>
                          ))}
                        </ul>
                      )}
                      {exportTable.softwareBlocks
                        .slice(0, PREVIEW_SOFTWARE_PC)
                        .map((block, bi) => (
                          <div key={`${block.title}-${bi}`} className="space-y-2">
                            <div className="min-w-0">
                              <p className="font-medium leading-tight break-words">{block.title}</p>
                              <p className="text-xs break-words text-muted-foreground">
                                {block.subtitle}
                              </p>
                            </div>
                            <div className="w-max min-w-full">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    {block.headers.map((h) => (
                                      <TableHead key={h} className="whitespace-nowrap">
                                        {h}
                                      </TableHead>
                                    ))}
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {block.rows.slice(0, PREVIEW_SOFTWARE_ROWS).map((row, ri) => (
                                    <TableRow key={ri}>
                                      {row.map((cell, ci) => (
                                        <TableCell
                                          key={ci}
                                          className="max-w-[min(20rem,40vw)] whitespace-normal break-words"
                                        >
                                          {cell}
                                        </TableCell>
                                      ))}
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                            {block.rows.length > PREVIEW_SOFTWARE_ROWS && (
                              <p className="text-xs text-muted-foreground">
                                …ещё {block.rows.length - PREVIEW_SOFTWARE_ROWS} строк ПО для этого
                                ПК
                              </p>
                            )}
                          </div>
                        ))}
                      {exportTable.softwareBlocks.length > PREVIEW_SOFTWARE_PC && (
                        <p className="text-sm text-muted-foreground">
                          В файле ещё{" "}
                          {exportTable.softwareBlocks.length - PREVIEW_SOFTWARE_PC} компьютер(ов).
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      {exportTable.notes.length > 0 && (
                        <ul className="list-inside list-disc space-y-1 text-sm break-words text-muted-foreground">
                          {exportTable.notes.map((n, i) => (
                            <li key={i}>{n}</li>
                          ))}
                        </ul>
                      )}
                      <div className="w-max min-w-full">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {exportTable.headers.map((h) => (
                                <TableHead key={h} className="whitespace-nowrap">
                                  {h}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {previewRowsSlice.map((row, ri) => (
                              <TableRow key={ri}>
                                {row.map((cell, ci) => (
                                  <TableCell
                                    key={ci}
                                    className="max-w-[min(24rem,55vw)] whitespace-normal break-words"
                                  >
                                    {cell}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      {previewRowCount > PREVIEW_ROW_LIMIT && (
                        <p className="text-sm text-muted-foreground">
                          …и ещё {previewRowCount - PREVIEW_ROW_LIMIT} строк в файле (всего{" "}
                          {previewRowCount}).
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t px-6 py-4 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setExportDialogOpen(false)}
              disabled={exportBusy}
            >
              Отмена
            </Button>
            <Button type="button" onClick={() => void handleConfirmExport()} disabled={exportBusy}>
              {exportBusy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Сохранение…
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Скачать
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
