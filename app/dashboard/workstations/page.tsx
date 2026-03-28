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
  Keyboard,
  Mouse,
  Cpu,
  X,
  Download,
  School,
  Package,
  Box,
  Loader2,
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
import { Checkbox } from "@/components/ui/checkbox"
import { fetchClassroomRegistry, type RegistryClassroom } from "@/lib/api/classroom-registry"
import {
  fetchWorkstations,
  createWorkstationApi,
  updateWorkstationApi,
  deleteWorkstationApi,
  type ApiWorkstation,
} from "@/lib/api/workstations"
import { workstationRmPrefix, pcNameFromRmCode, suffixFromRmCode } from "@/lib/workstation-code"

const statusConfig: Record<
  WorkstationStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  [WorkstationStatus.ACTIVE]: { label: "Активно", variant: "default" },
  [WorkstationStatus.MAINTENANCE]: { label: "На обслуживании", variant: "outline" },
  [WorkstationStatus.FAULTY]: { label: "Неисправно", variant: "destructive" },
}

type WorkstationFormState = {
  name: string
  classroomId: string
  numberSuffix: string
  status: WorkstationStatus
  pcName: string
  hasMonitor: boolean
  hasKeyboard: boolean
  hasMouse: boolean
  hasHeadphones: boolean
  hasOtherEquipment: boolean
  otherEquipmentNote: string
  description: string
  lastMaintenance: string
}

const emptyForm = (): WorkstationFormState => ({
  name: "",
  classroomId: "",
  numberSuffix: "",
  status: WorkstationStatus.ACTIVE,
  pcName: "",
  hasMonitor: true,
  hasKeyboard: true,
  hasMouse: true,
  hasHeadphones: false,
  hasOtherEquipment: false,
  otherEquipmentNote: "",
  description: "",
  lastMaintenance: "",
})

function equipmentCount(ws: ApiWorkstation): number {
  return [
    ws.hasMonitor,
    ws.hasKeyboard,
    ws.hasMouse,
    ws.hasHeadphones,
    Boolean(ws.pcName?.trim()),
    ws.hasOtherEquipment,
  ].filter(Boolean).length
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
      const blob = `${ws.name} ${ws.code} ${ws.pcName} ${ws.description} ${ws.otherEquipmentNote}`.toLowerCase()
      const matchesSearch = !q || blob.includes(q)
      const matchesClassroom = filterClassroom === "all" || ws.classroomId === filterClassroom
      const matchesStatus = filterStatus === "all" || ws.status === filterStatus
      return matchesSearch && matchesClassroom && matchesStatus
    })
  }, [workstations, searchQuery, filterClassroom, filterStatus])

  const stats = useMemo(() => {
    return {
      total: workstations.length,
      active: workstations.filter((w) => w.status === WorkstationStatus.ACTIVE).length,
      faulty: workstations.filter((w) => w.status === WorkstationStatus.FAULTY).length,
      maintenance: workstations.filter((w) => w.status === WorkstationStatus.MAINTENANCE).length,
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
      status: ws.status,
      pcName: ws.pcName,
      hasMonitor: ws.hasMonitor,
      hasKeyboard: ws.hasKeyboard,
      hasMouse: ws.hasMouse,
      hasHeadphones: ws.hasHeadphones,
      hasOtherEquipment: ws.hasOtherEquipment,
      otherEquipmentNote: ws.otherEquipmentNote,
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
    if (form.hasOtherEquipment && !form.otherEquipmentNote.trim()) {
      setFormError("Укажите примечание для комплектации «Другое»")
      return null
    }
    return {
      code,
      classroomId: form.classroomId,
      name: form.name.trim() || null,
      description: form.description.trim() || null,
      pcName: form.pcName.trim() || null,
      status: form.status,
      hasMonitor: form.hasMonitor,
      hasKeyboard: form.hasKeyboard,
      hasMouse: form.hasMouse,
      hasHeadphones: form.hasHeadphones,
      hasOtherEquipment: form.hasOtherEquipment,
      otherEquipmentNote: form.hasOtherEquipment ? form.otherEquipmentNote.trim() : null,
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

  const renderEquipmentCheckboxes = () => (
    <div className="grid grid-cols-2 gap-2">
      <label className="flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
        <Checkbox
          checked={form.hasMonitor}
          onCheckedChange={(v) => setForm((f) => ({ ...f, hasMonitor: Boolean(v) }))}
        />
        <Monitor className="h-4 w-4 text-blue-600" />
        <span className="text-sm">Монитор</span>
      </label>
      <label className="flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
        <Checkbox
          checked={form.hasKeyboard}
          onCheckedChange={(v) => setForm((f) => ({ ...f, hasKeyboard: Boolean(v) }))}
        />
        <Keyboard className="h-4 w-4 text-green-600" />
        <span className="text-sm">Клавиатура</span>
      </label>
      <label className="flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
        <Checkbox
          checked={form.hasMouse}
          onCheckedChange={(v) => setForm((f) => ({ ...f, hasMouse: Boolean(v) }))}
        />
        <Mouse className="h-4 w-4 text-purple-600" />
        <span className="text-sm">Мышь</span>
      </label>
      <label className="flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
        <Checkbox
          checked={form.hasHeadphones}
          onCheckedChange={(v) => setForm((f) => ({ ...f, hasHeadphones: Boolean(v) }))}
        />
        <Package className="h-4 w-4 text-amber-600" />
        <span className="text-sm">Наушники</span>
      </label>
      <label className="col-span-2 flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
        <Checkbox
          checked={form.hasOtherEquipment}
          onCheckedChange={(v) =>
            setForm((f) => ({
              ...f,
              hasOtherEquipment: Boolean(v),
              otherEquipmentNote: v ? f.otherEquipmentNote : "",
            }))
          }
        />
        <Box className="h-4 w-4 text-slate-600" />
        <span className="text-sm">Другое</span>
      </label>
    </div>
  )

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

      <div className="grid gap-4 md:grid-cols-4">
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
            <CardTitle className="text-sm font-medium">Активных</CardTitle>
            <Monitor className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Неисправных</CardTitle>
            <Monitor className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.faulty}</div>
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
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию, номеру..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

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

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value={WorkstationStatus.ACTIVE}>Активно</SelectItem>
                <SelectItem value={WorkstationStatus.MAINTENANCE}>На обслуживании</SelectItem>
                <SelectItem value={WorkstationStatus.FAULTY}>Неисправно</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" onClick={resetFilters} className="gap-2" type="button">
                <X className="h-4 w-4" />
                Сбросить
              </Button>
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
                filteredWorkstations.map((workstation) => (
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
                      <div className="flex flex-wrap gap-1">
                        {workstation.hasMonitor && (
                          <span title="Монитор">
                            <Monitor className="h-4 w-4 text-blue-600" />
                          </span>
                        )}
                        {workstation.hasKeyboard && (
                          <span title="Клавиатура">
                            <Keyboard className="h-4 w-4 text-green-600" />
                          </span>
                        )}
                        {workstation.hasMouse && (
                          <span title="Мышь">
                            <Mouse className="h-4 w-4 text-purple-600" />
                          </span>
                        )}
                        {workstation.hasHeadphones && (
                          <span title="Наушники">
                            <Package className="h-4 w-4 text-amber-600" />
                          </span>
                        )}
                        {workstation.pcName && (
                          <span title="Системный блок">
                            <Cpu className="h-4 w-4 text-orange-600" />
                          </span>
                        )}
                        {workstation.hasOtherEquipment && (
                          <span title="Другое">
                            <Box className="h-4 w-4 text-slate-600" />
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[workstation.status].variant}>
                        {statusConfig[workstation.status].label}
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
                ))
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

            <div className="grid grid-cols-2 gap-4">
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
                <Label>Статус</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm((f) => ({ ...f, status: value as WorkstationStatus }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={WorkstationStatus.ACTIVE}>Активно</SelectItem>
                    <SelectItem value={WorkstationStatus.MAINTENANCE}>На обслуживании</SelectItem>
                    <SelectItem value={WorkstationStatus.FAULTY}>Неисправно</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              <Label>Комплектация</Label>
              {renderEquipmentCheckboxes()}
            </div>

            {form.hasOtherEquipment && (
              <div className="space-y-2">
                <Label htmlFor="other-note-add">Примечание к «Другое»</Label>
                <Textarea
                  id="other-note-add"
                  value={form.otherEquipmentNote}
                  onChange={(e) => setForm((f) => ({ ...f, otherEquipmentNote: e.target.value }))}
                  rows={2}
                />
              </div>
            )}

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

            <div className="grid grid-cols-2 gap-4">
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
                <Label>Статус</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm((f) => ({ ...f, status: value as WorkstationStatus }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={WorkstationStatus.ACTIVE}>Активно</SelectItem>
                    <SelectItem value={WorkstationStatus.MAINTENANCE}>На обслуживании</SelectItem>
                    <SelectItem value={WorkstationStatus.FAULTY}>Неисправно</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              <Label>Комплектация</Label>
              {renderEquipmentCheckboxes()}
            </div>

            {form.hasOtherEquipment && (
              <div className="space-y-2">
                <Label htmlFor="other-note-edit">Примечание к «Другое»</Label>
                <Textarea
                  id="other-note-edit"
                  value={form.otherEquipmentNote}
                  onChange={(e) => setForm((f) => ({ ...f, otherEquipmentNote: e.target.value }))}
                  rows={2}
                />
              </div>
            )}

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
          {selectedWorkstation && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
                  <MonitorSmartphone className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedWorkstation.name}</h3>
                  <p className="text-sm text-muted-foreground font-mono">{selectedWorkstation.code}</p>
                </div>
                <Badge variant={statusConfig[selectedWorkstation.status].variant} className="ml-auto">
                  {statusConfig[selectedWorkstation.status].label}
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
                <div className="flex flex-wrap gap-2">
                  {selectedWorkstation.hasMonitor && (
                    <Badge variant="outline" className="gap-1">
                      <Monitor className="h-3 w-3 text-blue-600" />
                      Монитор
                    </Badge>
                  )}
                  {selectedWorkstation.hasKeyboard && (
                    <Badge variant="outline" className="gap-1">
                      <Keyboard className="h-3 w-3 text-green-600" />
                      Клавиатура
                    </Badge>
                  )}
                  {selectedWorkstation.hasMouse && (
                    <Badge variant="outline" className="gap-1">
                      <Mouse className="h-3 w-3 text-purple-600" />
                      Мышь
                    </Badge>
                  )}
                  {selectedWorkstation.hasHeadphones && (
                    <Badge variant="outline" className="gap-1">
                      <Package className="h-3 w-3 text-amber-600" />
                      Наушники
                    </Badge>
                  )}
                  {selectedWorkstation.pcName && (
                    <Badge variant="outline" className="gap-1">
                      <Cpu className="h-3 w-3 text-orange-600" />
                      Системный блок
                    </Badge>
                  )}
                  {selectedWorkstation.hasOtherEquipment && (
                    <Badge variant="outline" className="gap-1">
                      <Box className="h-3 w-3 text-slate-600" />
                      Другое
                      {selectedWorkstation.otherEquipmentNote
                        ? `: ${selectedWorkstation.otherEquipmentNote}`
                        : ""}
                    </Badge>
                  )}
                </div>
              </div>

              {selectedWorkstation.description && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-1">Примечания</p>
                  <p className="text-sm">{selectedWorkstation.description}</p>
                </div>
              )}
            </div>
          )}
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
            <AlertDialogAction
              onClick={() => void handleConfirmDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
