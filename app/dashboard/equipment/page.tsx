"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { EquipmentStatus, EquipmentType } from "@prisma/client"
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Package,
  Archive,
  SlidersHorizontal,
  X,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Loader2,
  ArrowRightLeft,
  AlertCircle,
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
import { Separator } from "@/components/ui/separator"
import {
  EQUIPMENT_STATUS_FILTER_OPTIONS,
  equipmentStatusBadgeVariant,
  equipmentStatusLabel,
  equipmentTypeEnumLabel,
} from "@/lib/equipment-labels"
import { fetchClassroomRegistry, type ClassroomRegistryPayload } from "@/lib/api/classroom-registry"
import { fetchEquipmentRegistry, type EquipmentRegistryPayload } from "@/lib/api/equipment-registry"
import {
  fetchEquipmentDashboardList,
  createEquipmentDashboardApi,
  updateEquipmentDashboardApi,
  deleteEquipmentDashboardApi,
  type DashboardEquipmentRow,
} from "@/lib/api/equipment-dashboard"
import { toast } from "sonner"
import { createRelocationApi } from "@/lib/api/relocations"
import { PageHeader } from "@/components/dashboard/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { SortableTableHead } from "@/components/ui/sortable-table-head"
import { useTableSort } from "@/hooks/use-table-sort"
import { type EduTourMockUiDetail, EDU_TOUR_MOCK_UI_EVENT } from "@/lib/site-onboarding"
import { equipmentPermanentDeleteAllowed } from "@/lib/equipment-deletion-policy"
import { parseFetchJson } from "@/lib/api/parse-fetch-json"

const TOUR_DEMO_EQUIPMENT_ID = "__edu-tour-equipment__"

const TOUR_DEMO_EQUIPMENT_ROW: DashboardEquipmentRow = {
  id: TOUR_DEMO_EQUIPMENT_ID,
  name: "Демонстрационное оборудование",
  inventoryNumber: "INV-DEMO-1",
  serialNumber: "SN-DEMO-001",
  status: EquipmentStatus.OPERATIONAL,
  description: "Пример для обучения",
  purchaseDate: null,
  warrantyUntil: null,
  manufacturer: null,
  model: null,
  categoryId: null,
  categoryName: "Периферия",
  categoryColor: "#3b82f6",
  equipmentKindId: null,
  kindName: "Монитор",
  typeEnum: "OTHER",
  workstationId: "tour-ws-id",
  workstationCode: "RM-101-01",
  workstationName: "ПК 1",
  classroomId: "tour-class",
  classroomNumber: "101",
  classroomName: "Аудитория",
  buildingId: "tour-build",
  buildingName: "Учебный корпус",
  relocationRoomsLabel: null,
  decommissionedAt: null,
}

type WorkstationRow = {
  id: string
  code: string
  classroomId: string
  name: string
  classroomNumber: string
  buildingName: string | null
}

function deriveNameFromWorkstationCode(code: string): string {
  // RM-101-01 → -101-01 (убираем префикс RM, остальное можно править вручную)
  const trimmed = code.trim()
  return trimmed.replace(/^RM/i, "")
}

function deriveInventoryFromWorkstationCode(code: string): string {
  // RM-101-01 -> INV-101-01
  return `INV-${code.replace(/^RM-/i, "")}`
}

function classroomLine(row: DashboardEquipmentRow): string {
  const bits: string[] = []
  if (row.buildingName) bits.push(row.buildingName)
  if (row.classroomNumber) {
    bits.push(row.classroomName ? `${row.classroomNumber} (${row.classroomName})` : row.classroomNumber)
  }
  return bits.length ? bits.join(" · ") : "—"
}

const emptyForm = () => ({
  name: "",
  categoryId: "",
  equipmentKindId: "",
  inventoryNumber: "",
  serialNumber: "",
  buildingId: "",
  classroomId: "",
  workstationId: "" as string, // "" = не выбрано; "__none__" = без привязки
  description: "",
})

export default function EquipmentPage() {
  const { data: session, status: sessionStatus } = useSession()
  const [equipment, setEquipment] = useState<DashboardEquipmentRow[]>([])
  const [registry, setRegistry] = useState<EquipmentRegistryPayload | null>(null)
  const [classroomReg, setClassroomReg] = useState<ClassroomRegistryPayload | null>(null)
  const [workstations, setWorkstations] = useState<WorkstationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [filterBuildingId, setFilterBuildingId] = useState("all")
  const [filterClassroomId, setFilterClassroomId] = useState("all")
  const [filterStatus, setFilterStatus] = useState<EquipmentStatus | "all">("all")
  const [filterCategoryId, setFilterCategoryId] = useState("all")
  const [filterKindId, setFilterKindId] = useState("all")
  const [filterRelocatedOnly, setFilterRelocatedOnly] = useState(false)

  const [viewOpen, setViewOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [writeOffOpen, setWriteOffOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [moveSelected, setMoveSelected] = useState<DashboardEquipmentRow | null>(null)
  const [moveTargetClassroomId, setMoveTargetClassroomId] = useState("")
  const [moveTargetWsId, setMoveTargetWsId] = useState("")
  const [moveBusy, setMoveBusy] = useState(false)
  const [moveError, setMoveError] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [selected, setSelected] = useState<DashboardEquipmentRow | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  /** Не перезаписывать подсказкой при смене РМ, если пользователь уже правил поле */
  const nameEditedManuallyRef = useRef(false)
  const inventoryEditedManuallyRef = useRef(false)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [eq, reg, cr, wsRes] = await Promise.all([
        fetchEquipmentDashboardList({}),
        fetchEquipmentRegistry(),
        fetchClassroomRegistry(),
        fetch("/api/workstations", { cache: "no-store" }).then((r) =>
          parseFetchJson<{ workstations: WorkstationRow[] }>(r)
        ),
      ])
      setEquipment(eq)
      setRegistry(reg)
      setClassroomReg(cr)
      setWorkstations(wsRes.workstations)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки")
      setEquipment([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (sessionStatus === "authenticated") void loadAll()
  }, [sessionStatus, loadAll])

  const filteredClassroomsForFilter = useMemo(() => {
    if (!classroomReg) return []
    if (filterBuildingId === "all") return classroomReg.classrooms
    return classroomReg.classrooms.filter((c) => c.buildingId === filterBuildingId)
  }, [classroomReg, filterBuildingId])

  const filteredEquipment = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return equipment.filter((item) => {
      const matchQ =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.inventoryNumber.toLowerCase().includes(q) ||
        (item.serialNumber && item.serialNumber.toLowerCase().includes(q))
      const matchClass =
        filterClassroomId === "all" || item.classroomId === filterClassroomId
      const matchBuild = filterBuildingId === "all" || item.buildingId === filterBuildingId
      const matchSt = filterStatus === "all" || item.status === filterStatus
      const matchCat = filterCategoryId === "all" || item.categoryId === filterCategoryId
      const matchKind = filterKindId === "all" || item.equipmentKindId === filterKindId
      const matchRelocated =
        !filterRelocatedOnly || Boolean(item.relocationRoomsLabel?.trim())
      return (
        matchQ &&
        matchClass &&
        matchBuild &&
        matchSt &&
        matchCat &&
        matchKind &&
        matchRelocated
      )
    })
  }, [
    equipment,
    searchQuery,
    filterClassroomId,
    filterBuildingId,
    filterStatus,
    filterCategoryId,
    filterKindId,
    filterRelocatedOnly,
  ])

  const equipmentSortGetters = useMemo(
    () => ({
      name: (row: DashboardEquipmentRow) => row.name,
      category: (row: DashboardEquipmentRow) => row.categoryName ?? "",
      inventory: (row: DashboardEquipmentRow) => row.inventoryNumber,
      rooms: (row: DashboardEquipmentRow) =>
        (row.relocationRoomsLabel ?? row.classroomNumber ?? "").toString(),
      status: (row: DashboardEquipmentRow) => row.status,
    }),
    []
  )

  const { sortedItems: sortedEquipment, sortKey, sortDir, toggleSort } = useTableSort(
    filteredEquipment,
    equipmentSortGetters,
    "name"
  )

  const equipmentListRef = useRef(equipment)
  equipmentListRef.current = equipment

  const equipmentCountByWorkstation = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of equipment) {
      if (e.workstationId) {
        m.set(e.workstationId, (m.get(e.workstationId) ?? 0) + 1)
      }
    }
    return m
  }, [equipment])

  const freeWorkstationsForEquipmentMove = useMemo(() => {
    if (!moveOpen || !moveSelected?.classroomId || !moveTargetClassroomId) return []
    if (moveTargetClassroomId === moveSelected.classroomId) return []
    return workstations.filter(
      (w) =>
        w.classroomId === moveTargetClassroomId &&
        (equipmentCountByWorkstation.get(w.id) ?? 0) === 0
    )
  }, [
    moveOpen,
    moveSelected?.classroomId,
    moveTargetClassroomId,
    workstations,
    equipmentCountByWorkstation,
  ])

  const stats = useMemo(() => {
    return {
      total: equipment.length,
      operational: equipment.filter((e) => e.status === EquipmentStatus.OPERATIONAL).length,
      needsCheck: equipment.filter((e) => e.status === EquipmentStatus.NEEDS_CHECK).length,
      inRepair: equipment.filter((e) => e.status === EquipmentStatus.IN_REPAIR).length,
    }
  }, [equipment])

  const resetFilters = () => {
    setSearchQuery("")
    setFilterBuildingId("all")
    setFilterClassroomId("all")
    setFilterStatus("all")
    setFilterCategoryId("all")
    setFilterKindId("all")
    setFilterRelocatedOnly(false)
  }

  const hasFilters =
    searchQuery ||
    filterBuildingId !== "all" ||
    filterClassroomId !== "all" ||
    filterStatus !== "all" ||
    filterCategoryId !== "all" ||
    filterKindId !== "all" ||
    filterRelocatedOnly

  const isAdmin = session?.user?.role === "ADMIN"

  const classroomsForForm = useMemo(() => {
    if (!classroomReg) return []
    if (!form.buildingId) return classroomReg.classrooms
    return classroomReg.classrooms.filter((c) => c.buildingId === form.buildingId)
  }, [classroomReg, form.buildingId])

  const workstationsForForm = useMemo(() => {
    if (!form.classroomId) return []
    return workstations.filter((w) => w.classroomId === form.classroomId)
  }, [workstations, form.classroomId])

  const openAdd = () => {
    setForm(emptyForm())
    setFormError(null)
    nameEditedManuallyRef.current = false
    inventoryEditedManuallyRef.current = false
    setAddOpen(true)
  }

  const openEdit = (row: DashboardEquipmentRow) => {
    setSelected(row)
    nameEditedManuallyRef.current = false
    inventoryEditedManuallyRef.current = false
    setForm({
      name: row.name,
      categoryId: row.categoryId ?? "",
      equipmentKindId: row.equipmentKindId ?? "",
      inventoryNumber: row.inventoryNumber,
      serialNumber: row.serialNumber ?? "",
      buildingId: row.buildingId ?? "",
      classroomId: row.classroomId ?? "",
      workstationId: row.workstationId ?? "__none__",
      description: row.description ?? "",
    })
    setFormError(null)
    setEditOpen(true)
  }

  useEffect(() => {
    const closeTour = () => {
      setViewOpen(false)
      setEditOpen(false)
      setAddOpen(false)
      setDeleteOpen(false)
      setWriteOffOpen(false)
      setMoveOpen(false)
      setMoveSelected(null)
      setMoveTargetClassroomId("")
      setMoveTargetWsId("")
      setMoveError(null)
      setSelected(null)
    }

    const pick = (): DashboardEquipmentRow => {
      const list = equipmentListRef.current
      const first = list[0]
      if (first && first.id !== TOUR_DEMO_EQUIPMENT_ID) return first
      return TOUR_DEMO_EQUIPMENT_ROW
    }

    const onMock = (e: Event) => {
      const detail = (e as CustomEvent<EduTourMockUiDetail>).detail
      if (!detail) return
      if ("reset" in detail && detail.reset) {
        closeTour()
        return
      }
      if (!("equipment" in detail)) return
      closeTour()
      const row = pick()
      setSelected(row)
      switch (detail.equipment) {
        case "add":
          openAdd()
          break
        case "view":
          setViewOpen(true)
          break
        case "edit":
          openEdit(row)
          break
        case "move":
          setMoveSelected(row)
          setMoveTargetClassroomId("")
          setMoveTargetWsId("")
          setMoveError(null)
          setMoveOpen(true)
          break
        case "delete":
          setDeleteOpen(true)
          break
        case "writeoff":
          setWriteOffOpen(true)
          break
        default:
          break
      }
    }

    window.addEventListener(EDU_TOUR_MOCK_UI_EVENT, onMock as EventListener)
    return () => window.removeEventListener(EDU_TOUR_MOCK_UI_EVENT, onMock as EventListener)
  }, [])

  const submitForm = async (mode: "add" | "edit") => {
    setFormError(null)
    if (!form.name.trim() || !form.inventoryNumber.trim()) {
      setFormError("Укажите название и инвентарный номер")
      return
    }
    if (!form.serialNumber.trim()) {
      setFormError("Укажите серийный номер")
      return
    }
    if (!form.categoryId || !form.equipmentKindId) {
      setFormError("Выберите категорию и тип оборудования")
      return
    }

    let workstationId: string | null = null
    if (form.workstationId && form.workstationId !== "__none__") {
      workstationId = form.workstationId
    }

    const payload = {
      name: form.name.trim(),
      inventoryNumber: form.inventoryNumber.trim(),
      categoryId: form.categoryId,
      equipmentKindId: form.equipmentKindId,
      workstationId,
      serialNumber: form.serialNumber.trim(),
      description: form.description.trim() || null,
    }

    setFormSaving(true)
    try {
      if (mode === "add") {
        await createEquipmentDashboardApi(payload)
        setAddOpen(false)
        toast.success("Оборудование добавлено")
      } else if (selected) {
        await updateEquipmentDashboardApi(selected.id, payload)
        setEditOpen(false)
        toast.success("Данные оборудования обновлены")
      }
      await loadAll()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Ошибка сохранения")
    } finally {
      setFormSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!selected) return
    try {
      await deleteEquipmentDashboardApi(selected.id)
      setDeleteOpen(false)
      setSelected(null)
      await loadAll()
      toast.success("Оборудование удалено")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить")
    }
  }

  const confirmWriteOff = async () => {
    if (!selected) return
    setError(null)
    try {
      await updateEquipmentDashboardApi(selected.id, { status: EquipmentStatus.DECOMMISSIONED })
      setWriteOffOpen(false)
      setSelected(null)
      await loadAll()
      toast.success("Оборудование списано")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось списать")
    }
  }

  if (sessionStatus === "loading") {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    )
  }

  if (!session?.user) return null

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        title="Управление оборудованием"
        description={
          isAdmin
            ? "Добавление и редактирование, привязка к рабочим местам и учёт статусов. Удаление из учёта — только после списания и не ранее чем через 30 суток."
            : "Просмотр оборудования в аудиториях, за которые вы ответственны."
        }
        actions={
          isAdmin ? (
            <span data-tour="equipment-btn-add" className="inline-flex">
              <Button onClick={openAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Добавить оборудование
              </Button>
            </span>
          ) : undefined
        }
      />

      {error && (
        <Alert variant="destructive" className="border-destructive/40">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Ошибка</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div data-tour="equipment-stats" className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Всего</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.total}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Исправно</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-green-600">{stats.operational}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Требует проверки</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-amber-600">{stats.needsCheck}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">В ремонте</CardTitle>
            <Wrench className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-blue-600">{stats.inRepair}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-tour="equipment-filters">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Фильтры</CardTitle>
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" type="button" onClick={resetFilters}>
                <X className="mr-2 h-4 w-4" />
                Сбросить
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-[repeat(6,minmax(0,1fr))]">
            <div className="relative min-w-0 sm:col-span-2 xl:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Название, инв. номер, серийный №…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="min-w-0">
              <Select
                value={filterBuildingId}
                onValueChange={(v) => {
                  setFilterBuildingId(v)
                  setFilterClassroomId("all")
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
            <div className="min-w-0">
              <Select value={filterClassroomId} onValueChange={setFilterClassroomId}>
                <SelectTrigger>
                  <SelectValue placeholder="Аудитория" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все аудитории</SelectItem>
                  {filteredClassroomsForFilter.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.number}
                      {c.name ? ` · ${c.name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <Select
                value={filterStatus}
                onValueChange={(v) => setFilterStatus(v as EquipmentStatus | "all")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_STATUS_FILTER_OPTIONS.map((o, i) => (
                    <SelectItem key={`equipment-status-filter-${i}-${String(o.value)}`} value={String(o.value)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Категория" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все категории</SelectItem>
                  {registry?.categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: c.color }}
                        />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 sm:col-span-2 xl:col-span-1">
              <Select value={filterKindId} onValueChange={setFilterKindId}>
                <SelectTrigger>
                  <SelectValue placeholder="Тип" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все типы</SelectItem>
                  {registry?.kinds.map((k) => (
                    <SelectItem key={k.id} value={k.id}>
                      {k.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end sm:col-span-2 xl:col-span-2">
              <Button
                type="button"
                variant={filterRelocatedOnly ? "secondary" : "outline"}
                className="w-full shrink-0"
                onClick={() => setFilterRelocatedOnly((v) => !v)}
              >
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                {filterRelocatedOnly ? "Только перемещённые" : "Отобразить перемещённое"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card data-tour="equipment-table">
        <CardHeader>
          <CardTitle>Список оборудования</CardTitle>
          <CardDescription>
            {loading
              ? "Загрузка..."
              : `Найдено ${sortedEquipment.length} из ${equipment.length}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredEquipment.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium">Оборудование не найдено</h3>
              <p className="text-muted-foreground">Измените фильтры или добавьте записи</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead
                      columnKey="name"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    >
                      Название
                    </SortableTableHead>
                    <SortableTableHead
                      columnKey="category"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    >
                      Категория
                    </SortableTableHead>
                    <SortableTableHead
                      columnKey="inventory"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    >
                      Инв. номер
                    </SortableTableHead>
                    <SortableTableHead
                      columnKey="rooms"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    >
                      Аудитории
                    </SortableTableHead>
                    <SortableTableHead
                      columnKey="status"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    >
                      Статус
                    </SortableTableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedEquipment.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.name}</div>
                        {item.kindName && (
                          <div className="text-xs text-muted-foreground">{item.kindName}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.categoryName ? (
                          <Badge
                            variant="outline"
                            className="whitespace-normal text-left"
                            style={{
                              borderColor: item.categoryColor ?? undefined,
                              color: item.categoryColor ?? undefined,
                            }}
                          >
                            {item.categoryName}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{item.inventoryNumber}</TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {(item.relocationRoomsLabel ?? item.classroomNumber?.trim()) || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={equipmentStatusBadgeVariant(item.status)}>
                          {equipmentStatusLabel(item.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" type="button">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Меню</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Действия</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setSelected(item)
                                setViewOpen(true)
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Просмотр
                            </DropdownMenuItem>
                            {isAdmin && (
                              <>
                                <DropdownMenuItem onClick={() => openEdit(item)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Редактировать
                                </DropdownMenuItem>
                                {item.workstationId &&
                                  !item.relocationRoomsLabel &&
                                  item.status !== EquipmentStatus.DECOMMISSIONED && (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setMoveSelected(item)
                                        setMoveTargetClassroomId("")
                                        setMoveTargetWsId("")
                                        setMoveError(null)
                                        setMoveOpen(true)
                                      }}
                                    >
                                      <ArrowRightLeft className="mr-2 h-4 w-4" />
                                      Переместить в другую аудиторию
                                    </DropdownMenuItem>
                                  )}
                                {item.status !== EquipmentStatus.DECOMMISSIONED && (
                                  <DropdownMenuItem
                                    disabled={Boolean(item.workstationId)}
                                    onClick={() => {
                                      if (item.workstationId) return
                                      setSelected(item)
                                      setWriteOffOpen(true)
                                    }}
                                  >
                                    <Archive className="mr-2 h-4 w-4" />
                                    <span className="flex flex-col items-start gap-0.5">
                                      <span>Списать</span>
                                      {item.workstationId ? (
                                        <span className="text-xs font-normal text-muted-foreground">
                                          Сначала отвяжите от рабочего места
                                        </span>
                                      ) : null}
                                    </span>
                                  </DropdownMenuItem>
                                )}
                                {equipmentPermanentDeleteAllowed(
                                  item.status,
                                  item.decommissionedAt ?? null
                                ) ? (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => {
                                        setSelected(item)
                                        setDeleteOpen(true)
                                      }}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Удалить из учёта
                                    </DropdownMenuItem>
                                  </>
                                ) : null}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent
          data-tour="equipment-view-dialog"
          className="z-[115] max-w-lg"
          overlayClassName="z-[113]"
        >
          <DialogHeader>
            <DialogTitle>Оборудование</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="text-lg font-semibold">{selected.name}</h3>
                {selected.kindName && (
                  <p className="text-muted-foreground">
                    Тип: {selected.kindName} (
                    {equipmentTypeEnumLabel(selected.typeEnum as EquipmentType)})
                  </p>
                )}
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-muted-foreground">Инвентарный номер</Label>
                  <p className="font-mono">{selected.inventoryNumber}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Серийный номер</Label>
                  <p className="font-mono">{selected.serialNumber ?? "—"}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Категория</Label>
                  <p>{selected.categoryName ?? "—"}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Корпус / аудитория</Label>
                  <p>{classroomLine(selected)}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Рабочее место</Label>
                  <p>
                    {selected.workstationCode
                      ? `${selected.workstationCode}${selected.workstationName ? ` · ${selected.workstationName}` : ""}`
                      : "—"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Статус</Label>
                  <div className="mt-1">
                    <Badge variant={equipmentStatusBadgeVariant(selected.status)}>
                      {equipmentStatusLabel(selected.status)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Дата покупки</Label>
                  <p>{selected.purchaseDate ?? "—"}</p>
                </div>
              </div>
              {selected.description ? (
                <div>
                  <Label className="text-muted-foreground">Описание</Label>
                  <p className="whitespace-pre-wrap">{selected.description}</p>
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={addOpen || editOpen}
        onOpenChange={(o) => {
          if (!o) {
            setAddOpen(false)
            setEditOpen(false)
          }
        }}
      >
        <DialogContent
          data-tour={addOpen ? "equipment-add-dialog" : "equipment-edit-dialog"}
          className="z-[115] max-h-[90vh] overflow-y-auto sm:max-w-lg"
          overlayClassName="z-[113]"
        >
          <DialogHeader>
            <DialogTitle>{addOpen ? "Добавить оборудование" : "Редактировать оборудование"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label>Название</Label>
              <Input
                value={form.name}
                onChange={(e) => {
                  nameEditedManuallyRef.current = true
                  setForm((f) => ({ ...f, name: e.target.value }))
                }}
                placeholder="Наименование"
              />
            </div>
            <div className="grid gap-2">
              <Label>Категория</Label>
              <Select
                value={form.categoryId || "__pick__"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, categoryId: v === "__pick__" ? "" : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__pick__">Выберите категорию</SelectItem>
                  {registry?.categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Тип оборудования</Label>
              <Select
                value={form.equipmentKindId || "__pick__"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, equipmentKindId: v === "__pick__" ? "" : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите тип" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__pick__">Выберите тип</SelectItem>
                  {registry?.kinds.map((k) => (
                    <SelectItem key={k.id} value={k.id}>
                      {k.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Инвентарный номер</Label>
              <Input
                value={form.inventoryNumber}
                onChange={(e) => {
                  inventoryEditedManuallyRef.current = true
                  setForm((f) => ({ ...f, inventoryNumber: e.target.value }))
                }}
                placeholder="Например: INV-101-01"
              />
            </div>
            <div className="grid gap-2">
              <Label>Корпус</Label>
              <Select
                value={form.buildingId || "__none__"}
                onValueChange={(v) => {
                  const b = v === "__none__" ? "" : v
                  setForm((f) => ({
                    ...f,
                    buildingId: b,
                    classroomId: "",
                    workstationId: "__none__",
                  }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Корпус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Не выбран</SelectItem>
                  {classroomReg?.buildings.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Аудитория</Label>
              <Select
                value={form.classroomId || "__none__"}
                onValueChange={(v) => {
                  const c = v === "__none__" ? "" : v
                  setForm((f) => ({ ...f, classroomId: c, workstationId: "__none__" }))
                }}
                disabled={!form.buildingId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={form.buildingId ? "Аудитория" : "Сначала корпус"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Не выбрана</SelectItem>
                  {classroomsForForm.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.number}
                      {c.name ? ` · ${c.name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Рабочее место</Label>
              <Select
                value={form.workstationId || "__none__"}
                onValueChange={(v) => {
                  setForm((f) => {
                    const next = { ...f, workstationId: v }
                    if (v && v !== "__none__") {
                      const w = workstations.find((x) => x.id === v)
                      if (w) {
                        if (!nameEditedManuallyRef.current) {
                          next.name = deriveNameFromWorkstationCode(w.code)
                        }
                        if (!inventoryEditedManuallyRef.current) {
                          next.inventoryNumber = deriveInventoryFromWorkstationCode(w.code)
                        }
                      }
                    }
                    return next
                  })
                }}
                disabled={!form.classroomId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={form.classroomId ? "Рабочее место" : "Сначала аудитория"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Не привязано</SelectItem>
                  {workstationsForForm.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.code}
                      {w.name ? ` · ${w.name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="equipment-serial">Серийный номер</Label>
              <Input
                id="equipment-serial"
                value={form.serialNumber}
                onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))}
                placeholder="Обязательно"
                required
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2">
              <Label>Описание</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setAddOpen(false)
                setEditOpen(false)
              }}
            >
              Отмена
            </Button>
            <Button
              type="button"
              disabled={formSaving}
              onClick={() => void submitForm(addOpen ? "add" : "edit")}
            >
              {formSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {addOpen ? "Добавить" : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent
          data-tour="equipment-move-dialog"
          className="z-[115] max-w-md"
          overlayClassName="z-[113]"
        >
          <DialogHeader>
            <DialogTitle>Перемещение оборудования</DialogTitle>
            <DialogDescription className="text-pretty break-words">
              Выберите аудиторию и свободное рабочее место. После перемещения в списке будет
              отображаться маршрут вида «401-&gt;101». Отменить перемещение можно в журнале.
            </DialogDescription>
          </DialogHeader>
          {moveSelected && (
            <div className="grid gap-3 py-2">
              <p className="text-sm">
                <span className="font-medium">{moveSelected.name}</span>
                <span className="ml-2 font-mono text-muted-foreground">
                  {moveSelected.inventoryNumber}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                Сейчас: аудитория {moveSelected.classroomNumber ?? "—"}, РМ{" "}
                {moveSelected.workstationCode ?? "—"}
              </p>
              {moveError && <p className="text-sm text-destructive">{moveError}</p>}
              <div className="grid gap-2">
                <Label>Аудитория назначения</Label>
                <Select
                  value={moveTargetClassroomId || undefined}
                  onValueChange={(v) => {
                    setMoveTargetClassroomId(v)
                    setMoveTargetWsId("")
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите аудиторию" />
                  </SelectTrigger>
                  <SelectContent>
                    {classroomReg?.classrooms
                      .filter((c) => c.id !== moveSelected.classroomId)
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.number}
                          {c.name ? ` · ${c.name}` : ""}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Свободное рабочее место</Label>
                <Select
                  value={moveTargetWsId || undefined}
                  onValueChange={setMoveTargetWsId}
                  disabled={!moveTargetClassroomId || freeWorkstationsForEquipmentMove.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !moveTargetClassroomId
                          ? "Сначала аудитория"
                          : freeWorkstationsForEquipmentMove.length === 0
                            ? "Нет свободных РМ"
                            : "Выберите РМ"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {freeWorkstationsForEquipmentMove.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.code}
                        {w.name ? ` · ${w.name}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setMoveOpen(false)}>
              Отмена
            </Button>
            <Button
              type="button"
              disabled={
                moveBusy ||
                !moveTargetWsId ||
                !moveSelected ||
                freeWorkstationsForEquipmentMove.length === 0
              }
              onClick={() => {
                if (!moveSelected || !moveTargetWsId) return
                setMoveBusy(true)
                setMoveError(null)
                void createRelocationApi({
                  kind: "EQUIPMENT",
                  equipmentId: moveSelected.id,
                  toWorkstationId: moveTargetWsId,
                })
                  .then(() => {
                    setMoveOpen(false)
                    void loadAll()
                    toast.success("Перемещение зарегистрировано")
                  })
                  .catch((e) => {
                    setMoveError(e instanceof Error ? e.message : "Ошибка")
                  })
                  .finally(() => setMoveBusy(false))
              }}
            >
              {moveBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Переместить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent
          data-tour="equipment-delete-dialog"
          className="z-[115]"
          overlayClassName="z-[113]"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить из учёта?</AlertDialogTitle>
            <AlertDialogDescription>
              {selected
                ? `Запись «${selected.name}» будет удалена безвозвратно. Доступно только для списанного оборудования не ранее чем через 30 суток после даты списания.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void confirmDelete()}>
              Удалить из учёта
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={writeOffOpen} onOpenChange={setWriteOffOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Списать оборудование?</AlertDialogTitle>
            <AlertDialogDescription>
              {selected
                ? `Для «${selected.name}» будет установлен статус «${equipmentStatusLabel(EquipmentStatus.DECOMMISSIONED)}». Запись останется в системе; окончательное удаление из учёта возможно не ранее чем через 30 суток.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmWriteOff()}>Списать</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
