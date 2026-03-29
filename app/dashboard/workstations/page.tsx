"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { WorkstationStatus } from "@prisma/client"
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  MonitorSmartphone,
  Monitor,
  X,
  Download,
  School,
  Loader2,
  Package,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchClassroomRegistry, type RegistryClassroom } from "@/lib/api/classroom-registry"
import {
  fetchWorkstations,
  createWorkstationApi,
  updateWorkstationApi,
  deleteWorkstationApi,
  type ApiWorkstation,
} from "@/lib/api/workstations"
import { workstationRmPrefix, pcNameFromRmCode, suffixFromRmCode } from "@/lib/workstation-code"
import { cn } from "@/lib/utils"

const statusConfig: Record<
  WorkstationStatus,
  {
    label: string
    variant: "default" | "secondary" | "destructive" | "outline"
    className?: string
  }
> = {
  [WorkstationStatus.ACTIVE]: { label: "Исправно", variant: "default" },
  [WorkstationStatus.MAINTENANCE]: {
    label: "На обслуживании",
    variant: "outline",
    className:
      "border-amber-500/45 bg-amber-500/15 text-amber-950 dark:border-amber-400/45 dark:bg-amber-400/12 dark:text-amber-50",
  },
}

/** Не-ACTIVE из API/БД (в т.ч. устаревший FAULTY без миграции) считаем «На обслуживании». */
function normalizeWorkstationStatus(
  status: WorkstationStatus | string | undefined | null
): WorkstationStatus {
  if (status === WorkstationStatus.ACTIVE) return WorkstationStatus.ACTIVE
  return WorkstationStatus.MAINTENANCE
}

function workstationStatusBadgeConfig(status: WorkstationStatus | string | undefined | null) {
  return statusConfig[normalizeWorkstationStatus(status)]
}

type WorkstationFormState = {
  name: string
  classroomId: string
  numberSuffix: string
  pcName: string
  description: string
  lastMaintenance: string
}

const emptyForm = (): WorkstationFormState => ({
  name: "",
  classroomId: "",
  numberSuffix: "",
  pcName: "",
  description: "",
  lastMaintenance: "",
})

function equipmentCount(ws: ApiWorkstation): number {
  return ws.equipmentItems.length
}

function formatSoftwareVersion(catalogVersion: string, installedVersion: string | null): string {
  const cat = catalogVersion?.trim()
  const inst = installedVersion?.trim()
  if (inst) return inst
  if (cat) return cat
  return "—"
}

export default function WorkstationsPage() {
  const { data: session, status: sessionStatus } = useSession()
  const [classrooms, setClassrooms] = useState<RegistryClassroom[]>([])
  const [workstations, setWorkstations] = useState<ApiWorkstation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [filterClassroom, setFilterClassroom] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedWorkstation, setSelectedWorkstation] = useState<ApiWorkstation | null>(null)
  const [form, setForm] = useState<WorkstationFormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const isAdmin = session?.user?.role === "ADMIN"

  const loadData = useCallback(async () => {
    try {
      setError(null)
      const [reg, ws] = await Promise.all([fetchClassroomRegistry(), fetchWorkstations()])
      setClassrooms(reg.classrooms)
      setWorkstations(ws)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (sessionStatus === "authenticated") void loadData()
  }, [loadData, sessionStatus])

  const getClassroom = useCallback(
    (id: string) => classrooms.find((c) => c.id === id),
    [classrooms]
  )

  const countInClassroom = useCallback(
    (classroomId: string, excludeWorkstationId?: string) =>
      workstations.filter((w) => w.classroomId === classroomId && w.id !== excludeWorkstationId)
        .length,
    [workstations]
  )

  const isClassroomAtCapacity = useCallback(
    (classroomId: string, excludeWorkstationId?: string) => {
      const c = getClassroom(classroomId)
      if (!c || c.capacity == null) return false
      return countInClassroom(classroomId, excludeWorkstationId) >= c.capacity
    },
    [getClassroom, countInClassroom]
  )

  const capacityMessage = useCallback(
    (classroomId: string, excludeWorkstationId?: string) => {
      const c = getClassroom(classroomId)
      if (!c || c.capacity == null) return null
      if (!isClassroomAtCapacity(classroomId, excludeWorkstationId)) return null
      return `В аудитории ${c.number} уже занято все места по вместимости (${c.capacity}). Добавить рабочее место нельзя.`
    },
    [getClassroom, isClassroomAtCapacity]
  )

  const filteredWorkstations = useMemo(() => {
    return workstations.filter((ws) => {
      const q = searchQuery.toLowerCase()
      const inv = ws.equipmentItems.map((e) => e.inventoryNumber).join(" ")
      const blob =
        `${ws.name} ${ws.code} ${ws.pcName} ${ws.description} ${inv}`.toLowerCase()
      const matchesSearch = !q || blob.includes(q)
      const matchesClassroom = filterClassroom === "all" || ws.classroomId === filterClassroom
      const matchesStatus =
        filterStatus === "all" || normalizeWorkstationStatus(ws.status) === filterStatus
      return matchesSearch && matchesClassroom && matchesStatus
    })
  }, [workstations, searchQuery, filterClassroom, filterStatus])

  const stats = useMemo(() => {
    return {
      total: workstations.length,
      ok: workstations.filter((w) => normalizeWorkstationStatus(w.status) === WorkstationStatus.ACTIVE)
        .length,
      maintenance: workstations.filter(
        (w) => normalizeWorkstationStatus(w.status) === WorkstationStatus.MAINTENANCE
      ).length,
    }
  }, [workstations])

  const getClassroomName = (classroomId: string) => {
    const c = getClassroom(classroomId)
    if (!c) return "Не указана"
    const title = c.name ? `${c.number} — ${c.name}` : c.number
    return title
  }

  const getClassroomShort = (classroomId: string) => getClassroom(classroomId)?.number ?? "—"

  const resetFilters = () => {
    setSearchQuery("")
    setFilterClassroom("all")
    setFilterStatus("all")
  }

  const hasActiveFilters =
    searchQuery !== "" || filterClassroom !== "all" || filterStatus !== "all"

  const selectedClassroomForForm = form.classroomId ? getClassroom(form.classroomId) : undefined
  const rmPrefix = selectedClassroomForForm
    ? workstationRmPrefix(selectedClassroomForForm.number)
    : ""

  useEffect(() => {
    const c = classrooms.find((x) => x.id === form.classroomId)
    if (!c) return
    const suffix = form.numberSuffix.trim()
    if (!suffix) {
      setForm((f) => (f.pcName === "" ? f : { ...f, pcName: "" }))
      return
    }
    const full = workstationRmPrefix(c.number) + suffix
    const nextPc = pcNameFromRmCode(full, c.number)
    setForm((f) => (f.pcName === nextPc ? f : { ...f, pcName: nextPc }))
  }, [form.classroomId, form.numberSuffix, classrooms])

  const handleAdd = () => {
    setForm(emptyForm())
    setFormError(null)
    setIsAddDialogOpen(true)
  }

  const handleEdit = (ws: ApiWorkstation) => {
    setSelectedWorkstation(ws)
    const c = getClassroom(ws.classroomId)
    const num = c?.number ?? ws.classroomNumber
    setForm({
      name: ws.name,
      classroomId: ws.classroomId,
      numberSuffix: c ? suffixFromRmCode(ws.code, num) : "",
      pcName: ws.pcName,
      description: ws.description,
      lastMaintenance: ws.lastMaintenance || "",
    })
    setFormError(null)
    setIsEditDialogOpen(true)
  }

  const buildPayload = (): Parameters<typeof createWorkstationApi>[0] | null => {
    const c = getClassroom(form.classroomId)
    if (!c) {
      setFormError("Выберите аудиторию")
      return null
    }
    const suffix = form.numberSuffix.trim()
    if (!suffix) {
      setFormError("Укажите окончание номера рабочего места")
      return null
    }
    const code = workstationRmPrefix(c.number) + suffix
    return {
      code,
      classroomId: form.classroomId,
      name: form.name.trim() || null,
      description: form.description.trim() || null,
      pcName: form.pcName.trim() || null,
      lastMaintenance: form.lastMaintenance || null,
    }
  }

  const handleSaveNew = async () => {
    setFormError(null)
    if (!form.name.trim()) {
      setFormError("Укажите название")
      return
    }
    if (!form.classroomId) {
      setFormError("Выберите аудиторию")
      return
    }
    if (isClassroomAtCapacity(form.classroomId)) {
      setFormError(capacityMessage(form.classroomId) ?? "Нет свободных мест в аудитории")
      return
    }
    const body = buildPayload()
    if (!body) return
    try {
      setSaving(true)
      await createWorkstationApi(body)
      await loadData()
      setIsAddDialogOpen(false)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Ошибка сохранения")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!selectedWorkstation) return
    setFormError(null)
    if (!form.name.trim()) {
      setFormError("Укажите название")
      return
    }
    if (!form.classroomId) {
      setFormError("Выберите аудиторию")
      return
    }
    if (isClassroomAtCapacity(form.classroomId, selectedWorkstation.id)) {
      setFormError(
        capacityMessage(form.classroomId, selectedWorkstation.id) ??
          "Нет свободных мест в выбранной аудитории"
      )
      return
    }
    const body = buildPayload()
    if (!body) return
    try {
      setSaving(true)
      await updateWorkstationApi(selectedWorkstation.id, body)
      await loadData()
      setIsEditDialogOpen(false)
      setSelectedWorkstation(null)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Ошибка сохранения")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (ws: ApiWorkstation) => {
    setSelectedWorkstation(ws)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!selectedWorkstation) return
    try {
      await deleteWorkstationApi(selectedWorkstation.id)
      await loadData()
      setIsDeleteDialogOpen(false)
      setSelectedWorkstation(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка удаления")
      setIsDeleteDialogOpen(false)
    }
  }

  const addCapacityWarning =
    form.classroomId && isClassroomAtCapacity(form.classroomId)
      ? capacityMessage(form.classroomId)
      : null

  const editCapacityWarning =
    form.classroomId && selectedWorkstation
      ? isClassroomAtCapacity(form.classroomId, selectedWorkstation.id)
        ? capacityMessage(form.classroomId, selectedWorkstation.id)
        : null
      : null

  if (sessionStatus === "loading" || (sessionStatus === "authenticated" && loading)) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-5 w-80" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
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
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (sessionStatus === "unauthenticated") {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Рабочие места</h1>
          <p className="text-muted-foreground">Управление рабочими местами в аудиториях</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" type="button" disabled>
            <Download className="mr-2 h-4 w-4" />
            Экспорт
          </Button>
          {isAdmin && (
            <Button onClick={handleAdd} type="button">
              <Plus className="mr-2 h-4 w-4" />
              Добавить рабочее место
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего мест</CardTitle>
            <MonitorSmartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Исправно</CardTitle>
            <Monitor className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.ok}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">На обслуживании</CardTitle>
            <Monitor className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.maintenance}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(5,minmax(0,1fr))]">
            <div className="relative min-w-0 sm:col-span-2 lg:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Название, код РМ, инв. номер комплектации…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="min-w-0">
            <Select value={filterClassroom} onValueChange={setFilterClassroom}>
              <SelectTrigger>
                <SelectValue placeholder="Аудитория" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все аудитории</SelectItem>
                {classrooms.map((classroom) => (
                  <SelectItem key={classroom.id} value={classroom.id}>
                    {classroom.number}
                    {classroom.name ? ` — ${classroom.name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>

            <div className="min-w-0">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value={WorkstationStatus.ACTIVE}>Исправно</SelectItem>
                <SelectItem value={WorkstationStatus.MAINTENANCE}>На обслуживании</SelectItem>
              </SelectContent>
            </Select>
            </div>

            {hasActiveFilters && (
              <div className="flex min-w-0 items-end sm:col-span-2 lg:col-span-1">
                <Button variant="ghost" onClick={resetFilters} className="gap-2 w-full lg:w-auto" type="button">
                  <X className="h-4 w-4" />
                  Сбросить
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Список рабочих мест</CardTitle>
          <CardDescription>
            Найдено {filteredWorkstations.length} из {workstations.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Номер</TableHead>
                <TableHead>Название</TableHead>
                <TableHead>Аудитория</TableHead>
                <TableHead>ПК</TableHead>
                <TableHead>Комплектация</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classrooms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Сначала добавьте аудитории в разделе «Аудитории».
                  </TableCell>
                </TableRow>
              ) : filteredWorkstations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <MonitorSmartphone className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">Рабочие места не найдены</p>
                      {hasActiveFilters && (
                        <Button variant="link" onClick={resetFilters} type="button">
                          Сбросить фильтры
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredWorkstations.map((workstation) => {
                  const statusBadge = workstationStatusBadgeConfig(workstation.status)
                  return (
                    <TableRow key={workstation.id}>
                      <TableCell className="font-mono text-sm">{workstation.code}</TableCell>
                      <TableCell className="font-medium">{workstation.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <School className="h-3 w-3" />
                          {getClassroomShort(workstation.classroomId)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {workstation.pcName ? (
                          <span className="font-mono text-sm">{workstation.pcName}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{equipmentCount(workstation)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadge.variant} className={statusBadge.className}>
                          {statusBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" type="button">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Действия</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedWorkstation(workstation)
                                setIsViewDialogOpen(true)
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Просмотр
                            </DropdownMenuItem>
                            {isAdmin && (
                              <DropdownMenuItem onClick={() => handleEdit(workstation)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Редактировать
                              </DropdownMenuItem>
                            )}
                            {isAdmin && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(workstation)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Удалить
                                </DropdownMenuItem>
                              </>
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

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Добавить рабочее место</DialogTitle>
            <DialogDescription>Заполните информацию о новом рабочем месте</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Название</Label>
                <Input
                  id="name"
                  placeholder="Рабочее место 1"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Номер</Label>
                <div className="flex min-h-9 items-stretch rounded-md border border-input bg-background">
                  <span className="flex items-center border-r border-input bg-muted/40 px-3 font-mono text-sm text-muted-foreground select-none">
                    {rmPrefix || "—"}
                  </span>
                  <Input
                    className="border-0 shadow-none focus-visible:ring-0 rounded-none font-mono text-sm"
                    placeholder="01"
                    value={form.numberSuffix}
                    onChange={(e) => setForm((f) => ({ ...f, numberSuffix: e.target.value }))}
                    disabled={!form.classroomId}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Аудитория</Label>
              <Select
                value={form.classroomId || undefined}
                onValueChange={(value) => setForm((f) => ({ ...f, classroomId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите аудиторию" />
                </SelectTrigger>
                <SelectContent>
                  {classrooms.map((classroom) => (
                    <SelectItem key={classroom.id} value={classroom.id}>
                      {classroom.number}
                      {classroom.name ? ` — ${classroom.name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {addCapacityWarning && (
                <p className="text-sm text-destructive">{addCapacityWarning}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pcName">Имя компьютера</Label>
              <Input
                id="pcName"
                className="font-mono text-sm"
                placeholder="Заполняется по номеру"
                value={form.pcName}
                readOnly
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastMaint">Последнее ТО</Label>
              <Input
                id="lastMaint"
                type="date"
                value={form.lastMaintenance}
                onChange={(e) => setForm((f) => ({ ...f, lastMaintenance: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc">Примечания</Label>
              <Textarea
                id="desc"
                placeholder="Дополнительная информация..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} type="button">
              Отмена
            </Button>
            <Button
              onClick={() => void handleSaveNew()}
              disabled={
                saving ||
                !form.name.trim() ||
                !form.classroomId ||
                Boolean(addCapacityWarning)
              }
              type="button"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Добавить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактировать рабочее место</DialogTitle>
            <DialogDescription>Измените информацию о рабочем месте</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Название</Label>
                <Input
                  id="edit-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Номер</Label>
                <div className="flex min-h-9 items-stretch rounded-md border border-input bg-background">
                  <span className="flex items-center border-r border-input bg-muted/40 px-3 font-mono text-sm text-muted-foreground select-none">
                    {rmPrefix || "—"}
                  </span>
                  <Input
                    className="border-0 shadow-none focus-visible:ring-0 rounded-none font-mono text-sm"
                    value={form.numberSuffix}
                    onChange={(e) => setForm((f) => ({ ...f, numberSuffix: e.target.value }))}
                    disabled={!form.classroomId}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Аудитория</Label>
              <Select
                value={form.classroomId || undefined}
                onValueChange={(value) => setForm((f) => ({ ...f, classroomId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите аудиторию" />
                </SelectTrigger>
                <SelectContent>
                  {classrooms.map((classroom) => (
                    <SelectItem key={classroom.id} value={classroom.id}>
                      {classroom.number}
                      {classroom.name ? ` — ${classroom.name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editCapacityWarning && (
                <p className="text-sm text-destructive">{editCapacityWarning}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-pcName">Имя компьютера</Label>
              <Input
                id="edit-pcName"
                className="font-mono text-sm"
                value={form.pcName}
                readOnly
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-lastMaint">Последнее ТО</Label>
              <Input
                id="edit-lastMaint"
                type="date"
                value={form.lastMaintenance}
                onChange={(e) => setForm((f) => ({ ...f, lastMaintenance: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-desc">Примечания</Label>
              <Textarea
                id="edit-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} type="button">
              Отмена
            </Button>
            <Button
              onClick={() => void handleSaveEdit()}
              disabled={saving || Boolean(editCapacityWarning)}
              type="button"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Информация о рабочем месте</DialogTitle>
            <DialogDescription>
              Детальная информация о рабочем месте {selectedWorkstation?.code}
            </DialogDescription>
          </DialogHeader>
          {selectedWorkstation && (() => {
            const viewStatusBadge = workstationStatusBadgeConfig(selectedWorkstation.status)
            return (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
                  <MonitorSmartphone className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedWorkstation.name}</h3>
                  <p className="text-sm text-muted-foreground font-mono">{selectedWorkstation.code}</p>
                </div>
                <Badge
                  variant={viewStatusBadge.variant}
                  className={cn("ml-auto", viewStatusBadge.className)}
                >
                  {viewStatusBadge.label}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Аудитория</p>
                  <p className="font-medium">{getClassroomName(selectedWorkstation.classroomId)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Компьютер</p>
                  <p className="font-medium font-mono">{selectedWorkstation.pcName || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Единиц комплектации (позиций)</p>
                  <p className="font-medium">{equipmentCount(selectedWorkstation)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Последнее ТО</p>
                  <p className="font-medium">{selectedWorkstation.lastMaintenance || "—"}</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Комплектация</p>
                {selectedWorkstation.equipmentItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Оборудование не привязано</p>
                ) : (
                  <div className="space-y-2">
                    {selectedWorkstation.equipmentItems.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2",
                          item.onService &&
                            "border-red-200 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950/55 dark:text-red-50"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{item.name}</p>
                          <p
                            className={cn(
                              "text-xs",
                              item.onService
                                ? "text-red-800/90 dark:text-red-200/95"
                                : "text-muted-foreground"
                            )}
                          >
                            {item.kindName || item.typeEnum}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          {item.onService && (
                            <Badge
                              variant="outline"
                              className="border-red-300 bg-red-100/90 text-red-900 dark:border-red-600 dark:bg-red-900/55 dark:text-red-50"
                            >
                              На обслуживании
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-mono",
                              item.onService &&
                                "border-red-300 text-red-900 dark:border-red-600 dark:bg-red-900/40 dark:text-red-100"
                            )}
                          >
                            {item.inventoryNumber}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                  <Package className="h-4 w-4 shrink-0" />
                  Установленное ПО
                </p>
                {(() => {
                  const rows = selectedWorkstation.equipmentItems.flatMap((item) =>
                    (item.installedSoftware ?? []).map((sw) => ({
                      key: sw.id,
                      equipmentName: item.name,
                      inventoryNumber: item.inventoryNumber,
                      softwareName: sw.softwareName,
                      versionLabel: formatSoftwareVersion(sw.catalogVersion, sw.installedVersion),
                    }))
                  )
                  if (rows.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground">
                        На привязанном оборудовании нет записей об установленном ПО
                      </p>
                    )
                  }
                  return (
                    <div className="rounded-md border divide-y max-h-[min(40vh,20rem)] overflow-y-auto">
                      {rows.map((r) => (
                        <div
                          key={r.key}
                          className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 py-2 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="font-medium">{r.softwareName}</p>
                            <p className="text-xs text-muted-foreground">
                              {r.equipmentName}
                              <span className="font-mono"> · {r.inventoryNumber}</span>
                            </p>
                          </div>
                          <Badge variant="secondary" className="shrink-0 font-mono text-xs">
                            {r.versionLabel}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>

              {selectedWorkstation.description && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-1">Примечания</p>
                  <p className="text-sm">{selectedWorkstation.description}</p>
                </div>
              )}
            </div>
            )
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)} type="button">
              Закрыть
            </Button>
            {isAdmin && (
              <Button
                onClick={() => {
                  setIsViewDialogOpen(false)
                  if (selectedWorkstation) handleEdit(selectedWorkstation)
                }}
                type="button"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Редактировать
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить рабочее место?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить рабочее место «{selectedWorkstation?.name}» (
              {selectedWorkstation?.code})? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void handleConfirmDelete()}>
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
