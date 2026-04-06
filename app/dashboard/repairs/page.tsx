"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { RepairStatus, UserRole } from "@prisma/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Search, Eye, Wrench, Clock, CheckCircle, XCircle, ListOrdered, MoreHorizontal } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/dashboard/page-header"
import { SortableTableHead } from "@/components/ui/sortable-table-head"
import { useTableSort } from "@/hooks/use-table-sort"
import { fetchDashboardRepairs, patchRepairStatus, type DashboardRepairRow } from "@/lib/api/repairs-dashboard"
import { requestDashboardNavCountsRefresh } from "@/lib/dashboard-nav-counts-refresh"

type ClassroomBrief = {
  id: string
  number: string
  name: string | null
  building: { name: string } | null
}

function personLabel(p: { firstName: string; lastName: string; middleName: string | null }): string {
  const m = p.middleName ? ` ${p.middleName}` : ""
  return `${p.lastName} ${p.firstName}${m}`.trim()
}

function classroomLine(c: ClassroomBrief | null | undefined): string {
  if (!c) return "—"
  const t = c.name?.trim() || `Аудитория ${c.number}`
  return c.building?.name ? `${t} (${c.building.name})` : t
}

function repairLocation(row: DashboardRepairRow): string {
  const ws = row.equipment.workstation
  if (!ws) return "—"
  const room = classroomLine(ws.classroom)
  const wsName = ws.name?.trim() ? `${ws.code} — ${ws.name}` : ws.code
  return `${room} · ${wsName}`
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })
  } catch {
    return "—"
  }
}

const statusMeta: Record<
  RepairStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Wrench }
> = {
  [RepairStatus.PLANNED]: { label: "В очереди", variant: "secondary", icon: Clock },
  [RepairStatus.IN_PROGRESS]: { label: "В работе", variant: "default", icon: Wrench },
  [RepairStatus.COMPLETED]: { label: "Готово", variant: "outline", icon: CheckCircle },
  [RepairStatus.CANCELLED]: { label: "Отменено", variant: "destructive", icon: XCircle },
}

const statusSelectOrder: RepairStatus[] = [
  RepairStatus.PLANNED,
  RepairStatus.IN_PROGRESS,
  RepairStatus.COMPLETED,
  RepairStatus.CANCELLED,
]

export default function RepairsPage() {
  const { data: session, status: sessionStatus } = useSession()
  const [repairs, setRepairs] = useState<DashboardRepairRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [filterClassroomId, setFilterClassroomId] = useState<string>("all")
  const [filterWorkstationId, setFilterWorkstationId] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<RepairStatus | "all">("all")

  const [viewOpen, setViewOpen] = useState(false)
  const [selected, setSelected] = useState<DashboardRepairRow | null>(null)
  const [statusSavingId, setStatusSavingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await fetchDashboardRepairs({ activeOnly: true })
      setRepairs(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (sessionStatus === "authenticated" && session?.user?.role === UserRole.ADMIN) {
      void load()
    }
  }, [sessionStatus, session?.user?.role, load])

  const handleRepairStatusChange = async (rowId: string, status: RepairStatus) => {
    setStatusSavingId(rowId)
    setError(null)
    try {
      const updated = await patchRepairStatus(rowId, status)
      const hideFromActive = status === RepairStatus.COMPLETED || status === RepairStatus.CANCELLED
      const dialogForThis = selected?.id === rowId

      setRepairs((prev) => {
        if (hideFromActive) return prev.filter((r) => r.id !== rowId)
        return prev.map((r) => (r.id === rowId ? updated : r))
      })

      if (dialogForThis) {
        if (hideFromActive) {
          setSelected(null)
          setViewOpen(false)
        } else {
          setSelected(updated)
        }
      }
      requestDashboardNavCountsRefresh()
      toast.success("Статус ремонта обновлён")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить статус")
    } finally {
      setStatusSavingId(null)
    }
  }

  const classroomOptions = useMemo(() => {
    const m = new Map<string, string>()
    for (const r of repairs) {
      const c = r.equipment.workstation?.classroom
      if (c) m.set(c.id, classroomLine(c))
    }
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], "ru"))
  }, [repairs])

  const workstationFilterOptions = useMemo(() => {
    if (filterClassroomId === "all") return []
    const m = new Map<string, string>()
    for (const r of repairs) {
      const ws = r.equipment.workstation
      if (ws?.classroom.id === filterClassroomId) {
        const label = ws.name?.trim() ? `${ws.code} — ${ws.name}` : ws.code
        m.set(ws.id, label)
      }
    }
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], "ru"))
  }, [repairs, filterClassroomId])

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return repairs.filter((row) => {
      const cId = row.equipment.workstation?.classroom.id
      const wsId = row.equipment.workstation?.id
      const assignee = row.assignedTo ? personLabel(row.assignedTo).toLowerCase() : ""
      const creator = personLabel(row.createdBy).toLowerCase()
      const issueTitle = row.issueReport?.title?.toLowerCase() ?? ""
      const wsCode = row.equipment.workstation?.code?.toLowerCase() ?? ""
      const matchesQ =
        !q ||
        row.description.toLowerCase().includes(q) ||
        row.equipment.name.toLowerCase().includes(q) ||
        row.equipment.inventoryNumber.toLowerCase().includes(q) ||
        (wsCode && wsCode.includes(q)) ||
        assignee.includes(q) ||
        creator.includes(q) ||
        issueTitle.includes(q)
      const matchesC = filterClassroomId === "all" || cId === filterClassroomId
      const matchesW = filterWorkstationId === "all" || wsId === filterWorkstationId
      const matchesS = filterStatus === "all" || row.status === filterStatus
      return matchesQ && matchesC && matchesW && matchesS
    })
  }, [repairs, searchQuery, filterClassroomId, filterWorkstationId, filterStatus])

  const stats = useMemo(() => {
    const planned = repairs.filter((r) => r.status === RepairStatus.PLANNED).length
    const inProg = repairs.filter((r) => r.status === RepairStatus.IN_PROGRESS).length
    const withIssue = repairs.filter((r) => r.issueReport).length
    return { total: repairs.length, planned, inProg, withIssue }
  }, [repairs])

  const resetFilters = () => {
    setSearchQuery("")
    setFilterClassroomId("all")
    setFilterWorkstationId("all")
    setFilterStatus("all")
  }

  const hasFilters =
    searchQuery.trim() !== "" ||
    filterClassroomId !== "all" ||
    filterWorkstationId !== "all" ||
    filterStatus !== "all"

  const repairSortGetters = useMemo(
    () => ({
      equipment: (r: DashboardRepairRow) => r.equipment.name,
      inventory: (r: DashboardRepairRow) => r.equipment.inventoryNumber,
      status: (r: DashboardRepairRow) => r.status,
      issue: (r: DashboardRepairRow) => r.issueReport?.title ?? "",
      started: (r: DashboardRepairRow) =>
        r.startedAt ? new Date(r.startedAt).getTime() : 0,
    }),
    []
  )

  const { sortedItems: sortedRepairs, sortKey, sortDir, toggleSort } = useTableSort(
    filtered,
    repairSortGetters,
    "equipment"
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
          title="Активные ремонты"
          description="Раздел доступен только администратору."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Активные ремонты"
        description="Оборудование в ремонте (запланировано и в работе). Записи создаются из обращений о неисправностях."
        actions={
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/issues">К неисправностям</Link>
          </Button>
        }
      />

      {error ? (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center gap-2">
            {error}
            <Button type="button" size="sm" variant="outline" onClick={() => void load()}>
              Повторить
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Всего активных</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-12" /> : <div className="text-2xl font-bold">{stats.total}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">В очереди</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-slate-600">{stats.planned}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">В работе</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-blue-600">{stats.inProg}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">По обращениям</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-emerald-700">{stats.withIssue}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Фильтры</CardTitle>
          <CardDescription>Поиск и отбор по аудитории и статусу</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-[repeat(6,minmax(0,1fr))]">
            <div className="relative min-w-0 sm:col-span-2 xl:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Оборудование, инв. номер, код РМ, обращение, ФИО…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
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
                  {classroomOptions.map(([id, label]) => (
                    <SelectItem key={id} value={id}>
                      {label}
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
                  {workstationFilterOptions.map(([id, label]) => (
                    <SelectItem key={id} value={id}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <Select
                value={filterStatus}
                onValueChange={(v) => setFilterStatus(v === "all" ? "all" : (v as RepairStatus))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  {(Object.keys(statusMeta) as RepairStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusMeta[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-w-0 items-end sm:col-span-2 xl:col-span-1">
              <Button type="button" variant="outline" className="w-full" disabled={!hasFilters} onClick={resetFilters}>
                Сбросить
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Список</CardTitle>
          <CardDescription>
            Показано {sortedRepairs.length} из {repairs.length}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {loading ? (
            <div className="space-y-2 p-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : sortedRepairs.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Нет записей по выбранным условиям.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead
                      columnKey="equipment"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    >
                      Оборудование
                    </SortableTableHead>
                    <SortableTableHead
                      columnKey="status"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                      className="min-w-[12rem]"
                    >
                      Статус
                    </SortableTableHead>
                    <SortableTableHead
                      columnKey="issue"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    >
                      Обращение
                    </SortableTableHead>
                    <SortableTableHead
                      columnKey="started"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    >
                      Начало
                    </SortableTableHead>
                    <TableHead className="w-[52px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRepairs.map((row) => {
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="font-medium">{row.equipment.name}</div>
                          <div className="text-xs text-muted-foreground">инв. {row.equipment.inventoryNumber}</div>
                        </TableCell>
                        <TableCell className="py-2">
                          <Select
                            value={row.status}
                            onValueChange={(v) => void handleRepairStatusChange(row.id, v as RepairStatus)}
                            disabled={statusSavingId === row.id}
                          >
                            <SelectTrigger className="h-8 w-[11.5rem]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusSelectOrder.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {statusMeta[s].label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="max-w-[200px] text-sm">
                          {row.issueReport ? (
                            <span className="line-clamp-2" title={row.issueReport.title}>
                              {row.issueReport.title}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {fmtDateTime(row.startedAt)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="ghost" size="icon" aria-label="Действия">
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
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ремонт</DialogTitle>
            <DialogDescription>Карточка активного ремонта</DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Оборудование:</span>
                <p className="mt-1 font-medium">
                  {selected.equipment.name} (инв. {selected.equipment.inventoryNumber})
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Место:</span>
                <p className="mt-1">{repairLocation(selected)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Статус:</span>
                <p className="mt-1">
                  <Badge variant={statusMeta[selected.status].variant}>{statusMeta[selected.status].label}</Badge>
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Описание работ:</span>
                <p className="mt-1 whitespace-pre-wrap">{selected.description}</p>
              </div>
              {selected.diagnosis?.trim() ? (
                <div>
                  <span className="text-muted-foreground">Диагноз:</span>
                  <p className="mt-1 whitespace-pre-wrap">{selected.diagnosis}</p>
                </div>
              ) : null}
              {selected.workPerformed?.trim() ? (
                <div>
                  <span className="text-muted-foreground">Выполнено:</span>
                  <p className="mt-1 whitespace-pre-wrap">{selected.workPerformed}</p>
                </div>
              ) : null}
              {selected.partsUsed?.trim() ? (
                <div>
                  <span className="text-muted-foreground">Запчасти:</span>
                  <p className="mt-1 whitespace-pre-wrap">{selected.partsUsed}</p>
                </div>
              ) : null}
              {selected.cost != null && selected.cost !== "" ? (
                <div>
                  <span className="text-muted-foreground">Стоимость:</span>
                  <p className="mt-1">{selected.cost}</p>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  <span className="block">Создано</span>
                  {fmtDateTime(selected.createdAt)}
                </div>
                <div>
                  <span className="block">Начало</span>
                  {fmtDateTime(selected.startedAt)}
                </div>
                <div>
                  <span className="block">Завершение</span>
                  {fmtDateTime(selected.completedAt)}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Кто завёл:</span>
                <p className="mt-1">{personLabel(selected.createdBy)}</p>
              </div>
              {selected.assignedTo ? (
                <div>
                  <span className="text-muted-foreground">Исполнитель:</span>
                  <p className="mt-1">{personLabel(selected.assignedTo)}</p>
                </div>
              ) : null}
              {selected.issueReport ? (
                <div className="rounded-md border p-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ListOrdered className="h-4 w-4" />
                    Связанное обращение
                  </div>
                  <p className="mt-1 font-medium">{selected.issueReport.title}</p>
                  <p className="text-xs text-muted-foreground">Статус обращения: {selected.issueReport.status}</p>
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setViewOpen(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
