"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useSession } from "next-auth/react"
import {
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  Cpu,
  HardDrive,
  MemoryStick,
  CircuitBoard,
  Download,
  Laptop,
  Server,
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
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
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

type PCStatus = PcConfigRow["status"]
type PCConfig = PcConfigRow

const statusLabels: Record<PCStatus, string> = {
  active: "Активен",
  repair: "На ремонте",
  decommissioned: "Списан",
}

const statusColors: Record<PCStatus, string> = {
  active: "bg-green-100 text-green-800 border-green-200",
  repair: "bg-yellow-100 text-yellow-800 border-yellow-200",
  decommissioned: "bg-red-100 text-red-800 border-red-200",
}

export default function PCConfigPage() {
  const { status: sessionStatus } = useSession()
  const [pcConfigs, setPCConfigs] = useState<PCConfig[]>([])
  const [classrooms, setClassrooms] = useState<RegistryClassroom[]>([])
  const [buildings, setBuildings] = useState<RegistryBuilding[]>([])
  const [workstations, setWorkstations] = useState<ApiWorkstation[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [classroomFilter, setClassroomFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

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
      const matchesStatus = statusFilter === "all" || pc.status === statusFilter

      return matchesSearch && matchesClassroom && matchesStatus
    })
  }, [pcConfigs, searchQuery, classroomFilter, statusFilter])

  const stats = useMemo(() => {
    return {
      total: pcConfigs.length,
      active: pcConfigs.filter((pc) => pc.status === "active").length,
      repair: pcConfigs.filter((pc) => pc.status === "repair").length,
      decommissioned: pcConfigs.filter((pc) => pc.status === "decommissioned").length,
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
      {/* Заголовок */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Конфигурация ПК</h1>
          <p className="text-muted-foreground">
            Управление характеристиками компьютеров на рабочих местах
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" onClick={openAddDialog}>
            Добавить конфигурацию
          </Button>
          <Button variant="outline" size="sm" type="button">
            <Download className="mr-2 h-4 w-4" />
            Экспорт
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
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
            <CardTitle className="text-sm font-medium">Активных</CardTitle>
            <Server className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">На ремонте</CardTitle>
            <Server className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.repair}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Списано</CardTitle>
            <Server className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.decommissioned}</div>
          </CardContent>
        </Card>
      </div>

      {/* Фильтры */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск по номеру рабочего места, IP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="active">Активен</SelectItem>
                <SelectItem value="repair">На ремонте</SelectItem>
                <SelectItem value="decommissioned">Списан</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Таблица */}
      <Card>
        <CardHeader>
          <CardTitle>Список конфигураций ПК</CardTitle>
          <CardDescription>
            Найдено: {filteredPCs.length} из {pcConfigs.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Имя ПК</TableHead>
                <TableHead>Рабочее место</TableHead>
                <TableHead>Аудитория</TableHead>
                <TableHead>Процессор</TableHead>
                <TableHead>ОЗУ</TableHead>
                <TableHead>Накопитель</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="w-[70px]">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPCs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Laptop className="h-8 w-8 mb-2" />
                      <p>Конфигурации ПК не найдены</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPCs.map((pc) => (
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
                      <Badge className={statusColors[pc.status]} variant="outline">
                        {statusLabels[pc.status]}
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
                <Badge className={statusColors[selectedPC.status]} variant="outline">
                  {statusLabels[selectedPC.status]}
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
              Данные сохраняются в базу: оборудование, компоненты и привязка к рабочему месту.
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
              Изменения перезаписывают компоненты и запись оборудования в базе.
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
