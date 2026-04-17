"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useSession } from "next-auth/react"
import { EquipmentStatus } from "@prisma/client"
import {
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  Cpu,
  HardDrive,
  MemoryStick,
  CircuitBoard,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  Wrench,
} from "lucide-react"
import {
  EQUIPMENT_STATUS_FILTER_OPTIONS,
  equipmentStatusBadgeVariant,
  equipmentStatusLabel,
} from "@/lib/equipment-labels"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { SortableTableHead } from "@/components/ui/sortable-table-head"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { PageHeader } from "@/components/dashboard/page-header"
import { useTableSort } from "@/hooks/use-table-sort"
import {
  fetchClassroomRegistry,
  type RegistryBuilding,
  type RegistryClassroom,
} from "@/lib/api/classroom-registry"
import {
  createPcConfig,
  emptyPcConfigForm,
  fetchPcConfigs,
  pcRowToForm,
  updatePcConfig,
  type PcConfigRow,
} from "@/lib/api/pc-config"
import { fetchWorkstations, type ApiWorkstation } from "@/lib/api/workstations"
import type { PcConfigSavePayload } from "@/lib/pc-config-persist"
import { PcConfigFormFields } from "./pc-config-form-fields"

type PCConfig = PcConfigRow

export default function PCConfigPage() {
  const { status: sessionStatus } = useSession()
  const [pcConfigs, setPCConfigs] = useState<PCConfig[]>([])
  const [classrooms, setClassrooms] = useState<RegistryClassroom[]>([])
  const [buildings, setBuildings] = useState<RegistryBuilding[]>([])
  const [workstations, setWorkstations] = useState<ApiWorkstation[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [classroomFilter, setClassroomFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState<EquipmentStatus | "all">("all")

  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedPC, setSelectedPC] = useState<PCConfig | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [form, setForm] = useState<PcConfigSavePayload>(() => emptyPcConfigForm())
  const [editingEquipmentId, setEditingEquipmentId] = useState<string | null>(null)
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formCascadeKey, setFormCascadeKey] = useState(0)

  const loadData = useCallback(async () => {
    setLoadError(null)
    try {
      const [registry, pcs, ws] = await Promise.all([
        fetchClassroomRegistry(),
        fetchPcConfigs(),
        fetchWorkstations(),
      ])
      setClassrooms(registry.classrooms)
      setBuildings(registry.buildings)
      setPCConfigs(pcs)
      setWorkstations(ws)
    } catch {
      setLoadError("Не удалось загрузить данные. Проверьте подключение и попробуйте снова.")
    }
  }, [])

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      void loadData()
    }
  }, [sessionStatus, loadData])

  const filteredPCs = useMemo(() => {
    return pcConfigs.filter((pc) => {
      const searchLower = searchQuery.toLowerCase()
      const codeLower = pc.workstationCode.toLowerCase()
      const matchesSearch =
        searchQuery === "" ||
        pc.name.toLowerCase().includes(searchLower) ||
        codeLower.includes(searchLower) ||
        pc.cpuModel.toLowerCase().includes(searchLower) ||
        pc.inventoryNumber.toLowerCase().includes(searchLower) ||
        pc.ipAddress.includes(searchQuery)

      const matchesClassroom = classroomFilter === "all" || pc.classroomId === classroomFilter
      const matchesStatus = statusFilter === "all" || pc.equipmentStatus === statusFilter

      return matchesSearch && matchesClassroom && matchesStatus
    })
  }, [pcConfigs, searchQuery, classroomFilter, statusFilter])

  const stats = useMemo(() => {
    return {
      total: pcConfigs.length,
      operational: pcConfigs.filter((pc) => pc.equipmentStatus === EquipmentStatus.OPERATIONAL).length,
      needsCheck: pcConfigs.filter((pc) => pc.equipmentStatus === EquipmentStatus.NEEDS_CHECK).length,
      inRepair: pcConfigs.filter((pc) => pc.equipmentStatus === EquipmentStatus.IN_REPAIR).length,
    }
  }, [pcConfigs])

  const getClassroomName = (classroomId: string) => {
    const c = classrooms.find((x) => x.id === classroomId)
    if (!c) return "—"
    const num = c.number?.trim()
    const name = c.name?.trim()
    if (num && name) return `${name} (${num})`
    return num || name || "—"
  }

  const classroomLabelForPc = (pc: PCConfig) =>
    pc.classroomDisplayName?.trim() || getClassroomName(pc.classroomId)

  const pcSortGetters = useMemo(
    () => ({
      name: (pc: PCConfig) => pc.name,
      workstation: (pc: PCConfig) => pc.workstationCode,
      classroom: (pc: PCConfig) =>
        pc.classroomDisplayName?.trim() || getClassroomName(pc.classroomId),
      cpu: (pc: PCConfig) => pc.cpuModel,
      ram: (pc: PCConfig) => pc.ramSize,
      storage: (pc: PCConfig) => `${pc.storageType} ${pc.storageSize}`,
      status: (pc: PCConfig) => pc.equipmentStatus,
    }),
    [classrooms]
  )

  const { sortedItems: sortedPCs, sortKey, sortDir, toggleSort } = useTableSort(
    filteredPCs,
    pcSortGetters,
    "name"
  )

  const openViewDialog = (pc: PCConfig) => {
    setSelectedPC(pc)
    setIsViewDialogOpen(true)
  }

  const openAddDialog = () => {
    setFormError(null)
    setForm(emptyPcConfigForm())
    setFormCascadeKey((k) => k + 1)
    setIsAddDialogOpen(true)
  }

  const openEditDialog = (pc: PCConfig) => {
    setFormError(null)
    setEditingEquipmentId(pc.id)
    setForm(pcRowToForm(pc))
    setFormCascadeKey((k) => k + 1)
    setIsEditDialogOpen(true)
    setIsViewDialogOpen(false)
  }

  const mergeRowIntoList = (row: PCConfig) => {
    setPCConfigs((prev) => {
      const i = prev.findIndex((p) => p.id === row.id)
      if (i < 0) return [row, ...prev]
      const next = [...prev]
      next[i] = row
      return next
    })
  }

  const handleSubmitAdd = async () => {
    setFormError(null)
    if (!form.workstationId.trim()) {
      setFormError("Выберите рабочее место")
      return
    }
    setFormSaving(true)
    try {
      const row = await createPcConfig(form)
      mergeRowIntoList(row)
      setIsAddDialogOpen(false)
      setForm(emptyPcConfigForm())
      toast.success("Конфигурация ПК добавлена")
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Не удалось сохранить")
    } finally {
      setFormSaving(false)
    }
  }

  const handleSubmitEdit = async () => {
    if (!editingEquipmentId) return
    setFormError(null)
    if (!form.workstationId.trim()) {
      setFormError("Выберите рабочее место")
      return
    }
    setFormSaving(true)
    try {
      const row = await updatePcConfig(editingEquipmentId, form)
      mergeRowIntoList(row)
      setIsEditDialogOpen(false)
      setEditingEquipmentId(null)
      if (selectedPC?.id === row.id) setSelectedPC(row)
      toast.success("Конфигурация ПК обновлена")
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Не удалось сохранить")
    } finally {
      setFormSaving(false)
    }
  }

  if (sessionStatus === "loading") {
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
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Конфигурация ПК"
        description="Управление характеристиками компьютеров на рабочих местах"
        actions={
          <Button type="button" onClick={openAddDialog}>
            Добавить конфигурацию
          </Button>
        }
      />

      {loadError && (
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего ПК</CardTitle>
            <Laptop className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Исправно</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.operational}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Требует проверки</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.needsCheck}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">В ремонте</CardTitle>
            <Wrench className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inRepair}</div>
          </CardContent>
        </Card>
      </div>

      {/* Фильтры */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))]">
            <div className="relative min-w-0 sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Имя ПК, код РМ, инв. номер, IP, процессор…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="min-w-0">
              <Select value={classroomFilter} onValueChange={setClassroomFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Все аудитории" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все аудитории</SelectItem>
                  {classrooms.map((classroom) => (
                    <SelectItem key={classroom.id} value={classroom.id}>
                      {classroom.name?.trim()
                        ? `${classroom.name.trim()} (${classroom.number})`
                        : classroom.number || "—"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 sm:col-span-2 lg:col-span-1">
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as EquipmentStatus | "all")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Все статусы" />
                </SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_STATUS_FILTER_OPTIONS.map((o, i) => (
                    <SelectItem key={`pc-status-${i}-${String(o.value)}`} value={String(o.value)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Таблица */}
      <Card>
        <CardHeader>
          <CardTitle>Список конфигураций ПК</CardTitle>
          <CardDescription>
            Найдено: {sortedPCs.length} из {pcConfigs.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead
                  columnKey="name"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                >
                  Имя ПК
                </SortableTableHead>
                <SortableTableHead
                  columnKey="workstation"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                >
                  Рабочее место
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
                  columnKey="cpu"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                >
                  Процессор
                </SortableTableHead>
                <SortableTableHead
                  columnKey="ram"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                >
                  ОЗУ
                </SortableTableHead>
                <SortableTableHead
                  columnKey="storage"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                >
                  Накопитель
                </SortableTableHead>
                <SortableTableHead
                  columnKey="status"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                >
                  Статус
                </SortableTableHead>
                <TableHead className="w-[70px]">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPCs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Laptop className="h-8 w-8 mb-2" />
                      <p>Конфигурации ПК не найдены</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedPCs.map((pc) => (
                  <TableRow key={pc.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Laptop className="h-4 w-4 text-muted-foreground" />
                        {pc.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{pc.workstationCode}</Badge>
                    </TableCell>
                    <TableCell>{classroomLabelForPc(pc)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{pc.cpuModel}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <MemoryStick className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{pc.ramSize} ГБ {pc.ramType}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{pc.storageType} {pc.storageSize} ГБ</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={equipmentStatusBadgeVariant(pc.equipmentStatus)}>
                        {equipmentStatusLabel(pc.equipmentStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Действия</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openViewDialog(pc)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Просмотр
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(pc)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Редактировать
                          </DropdownMenuItem>
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

      {/* Диалог просмотра */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Laptop className="h-5 w-5" />
              Конфигурация ПК: {selectedPC?.name}
            </DialogTitle>
            <DialogDescription>
              Рабочее место: {selectedPC?.workstationCode} | Аудитория:{" "}
              {selectedPC && classroomLabelForPc(selectedPC)}
            </DialogDescription>
          </DialogHeader>
          
          {selectedPC && (
            <div className="space-y-6">
              {/* Статус */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Статус:</span>
                <Badge variant={equipmentStatusBadgeVariant(selectedPC.equipmentStatus)}>
                  {equipmentStatusLabel(selectedPC.equipmentStatus)}
                </Badge>
              </div>
              
              <Separator />
              
              {/* Процессор */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  Процессор
                </h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Модель:</span>
                    <p className="font-medium">{selectedPC.cpuModel}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ядер:</span>
                    <p className="font-medium">{selectedPC.cpuCores}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Частота:</span>
                    <p className="font-medium">{selectedPC.cpuFrequency}</p>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* Оперативная память */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <MemoryStick className="h-4 w-4" />
                  Оперативная память
                </h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Объём:</span>
                    <p className="font-medium">{selectedPC.ramSize} ГБ</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Тип:</span>
                    <p className="font-medium">{selectedPC.ramType}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Частота:</span>
                    <p className="font-medium">{selectedPC.ramFrequency}</p>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* Накопители */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  Накопители
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Основной:</span>
                    <p className="font-medium">{selectedPC.storageType} {selectedPC.storageSize} ГБ</p>
                  </div>
                  {selectedPC.hasSecondaryStorage && (
                    <div>
                      <span className="text-muted-foreground">Дополнительный:</span>
                      <p className="font-medium">{selectedPC.secondaryStorageType} {selectedPC.secondaryStorageSize} ГБ</p>
                    </div>
                  )}
                </div>
              </div>
              
              <Separator />
              
              {/* Видеокарта */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <CircuitBoard className="h-4 w-4" />
                  Видеокарта
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Модель:</span>
                    <p className="font-medium">{selectedPC.gpuModel}</p>
                  </div>
                  {selectedPC.gpuMemory > 0 && (
                    <div>
                      <span className="text-muted-foreground">Видеопамять:</span>
                      <p className="font-medium">{selectedPC.gpuMemory} ГБ</p>
                    </div>
                  )}
                </div>
              </div>
              
              <Separator />
              
              {/* Сеть */}
              <div className="space-y-3">
                <h4 className="font-medium">Сетевые настройки</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Тип подключения:</span>
                    <p className="font-medium">{selectedPC.networkType}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">IP-адрес:</span>
                    <p className="font-medium">{selectedPC.ipAddress}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">MAC-адрес:</span>
                    <p className="font-medium">{selectedPC.macAddress}</p>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* ОС и прочее */}
              <div className="space-y-3">
                <h4 className="font-medium">Прочая информация</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Операционная система:</span>
                    <p className="font-medium">{selectedPC.osName} {selectedPC.osVersion}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Материнская плата:</span>
                    <p className="font-medium">{selectedPC.motherboardModel}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Инвентарный номер:</span>
                    <p className="font-medium">{selectedPC.inventoryNumber}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Дата покупки:</span>
                    <p className="font-medium">{selectedPC.purchaseDate}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Гарантия до:</span>
                    <p className="font-medium">{selectedPC.warrantyEnd}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Последнее обновление:</span>
                    <p className="font-medium">{selectedPC.lastUpdate}</p>
                  </div>
                </div>
                {selectedPC.notes && (
                  <div>
                    <span className="text-muted-foreground">Примечания:</span>
                    <p className="font-medium mt-1">{selectedPC.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Закрыть
            </Button>
            <Button
              onClick={() => {
                if (selectedPC) openEditDialog(selectedPC)
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Редактировать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open)
          if (!open) setFormError(null)
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Добавить конфигурацию ПК</DialogTitle>
            <DialogDescription>
              Данные сохраняются в базу: оборудование, компоненты и привязка к рабочему месту. Статус
              ПК не задаётся вручную.
            </DialogDescription>
          </DialogHeader>
          {formError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </div>
          )}
          <PcConfigFormFields
            form={form}
            setForm={setForm}
            buildings={buildings}
            classrooms={classrooms}
            workstations={workstations}
            cascadeKey={formCascadeKey}
            idPrefix="add"
          />
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsAddDialogOpen(false)}
              disabled={formSaving}
            >
              Отмена
            </Button>
            <Button type="button" onClick={() => void handleSubmitAdd()} disabled={formSaving}>
              {formSaving ? "Сохранение…" : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open)
          if (!open) {
            setFormError(null)
            setEditingEquipmentId(null)
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Редактировать конфигурацию ПК</DialogTitle>
            <DialogDescription>
              Изменения перезаписывают компоненты и запись оборудования в базе. Поле статуса не
              меняется здесь — оно пересчитывается по заявкам и ремонтам.
            </DialogDescription>
          </DialogHeader>
          {formError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </div>
          )}
          <PcConfigFormFields
            form={form}
            setForm={setForm}
            buildings={buildings}
            classrooms={classrooms}
            workstations={workstations}
            cascadeKey={formCascadeKey}
            idPrefix="edit"
          />
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={formSaving}
            >
              Отмена
            </Button>
            <Button type="button" onClick={() => void handleSubmitEdit()} disabled={formSaving}>
              {formSaving ? "Сохранение…" : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
