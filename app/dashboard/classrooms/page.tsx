"use client"

import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react"
import { useSession } from "next-auth/react"
import { ClassroomListingStatus } from "@prisma/client"
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  School,
  Users,
  Building2,
  X,
  Tag,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CLASSROOM_TYPE_COLOR_OPTIONS } from "@/lib/classroom-colors"
import {
  fetchClassroomRegistry,
  createClassroomApi,
  updateClassroomApi,
  deleteClassroomApi,
  createBuildingApi,
  updateBuildingApi,
  deleteBuildingApi,
  createClassroomTypeApi,
  updateClassroomTypeApi,
  deleteClassroomTypeApi,
  type RegistryClassroom,
  type RegistryBuilding,
  type RegistryClassroomType,
  type ClassroomRegistryPayload,
} from "@/lib/api/classroom-registry"

type UiStatus = "active" | "inactive" | "maintenance"

function toUiStatus(s: ClassroomListingStatus): UiStatus {
  switch (s) {
    case ClassroomListingStatus.ACTIVE:
      return "active"
    case ClassroomListingStatus.INACTIVE:
      return "inactive"
    case ClassroomListingStatus.MAINTENANCE:
      return "maintenance"
  }
}

function fromUiStatus(s: UiStatus): ClassroomListingStatus {
  switch (s) {
    case "active":
      return ClassroomListingStatus.ACTIVE
    case "inactive":
      return ClassroomListingStatus.INACTIVE
    case "maintenance":
      return ClassroomListingStatus.MAINTENANCE
  }
}

const getStatusInfo = (status: UiStatus) => {
  switch (status) {
    case "active":
      return { label: "Активна", variant: "default" as const }
    case "inactive":
      return { label: "Неактивна", variant: "secondary" as const }
    case "maintenance":
      return { label: "На обслуживании", variant: "outline" as const }
  }
}

/** Этаж в пределах 1…число этажей корпуса (если корпус выбран и в нём есть этажи). */
function clampClassroomFloor(floor: number, building: RegistryBuilding | undefined): number {
  if (!building || building.floors < 1) return floor
  return Math.min(Math.max(floor, 1), building.floors)
}

const emptyClassroomForm = () => ({
  name: "",
  number: "",
  classroomTypeId: "",
  status: "active" as UiStatus,
  buildingId: "",
  floor: 1,
  capacity: 0,
  description: "",
  responsibleId: "",
})

const emptyTypeForm = () => ({
  name: "",
  code: "",
  color: "bg-slate-100 text-slate-800",
  description: "",
})

const emptyBuildingForm = () => ({
  name: "",
  address: "",
  floors: 1,
  description: "",
})

export default function ClassroomsPage() {
  const { data: session, status: sessionStatus } = useSession()
  const [registry, setRegistry] = useState<ClassroomRegistryPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("classrooms")

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedBuildingFilter, setSelectedBuildingFilter] = useState("all")
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("all")
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<UiStatus | "all">("all")

  const [isAddClassroomOpen, setIsAddClassroomOpen] = useState(false)
  const [isEditClassroomOpen, setIsEditClassroomOpen] = useState(false)
  const [isViewClassroomOpen, setIsViewClassroomOpen] = useState(false)
  const [isDeleteClassroomOpen, setIsDeleteClassroomOpen] = useState(false)
  const [selectedClassroom, setSelectedClassroom] = useState<RegistryClassroom | null>(null)
  const [classroomForm, setClassroomForm] = useState(emptyClassroomForm)
  const [classroomSaving, setClassroomSaving] = useState(false)
  const [classroomFormError, setClassroomFormError] = useState<string | null>(null)

  const [isAddTypeOpen, setIsAddTypeOpen] = useState(false)
  const [isEditTypeOpen, setIsEditTypeOpen] = useState(false)
  const [isDeleteTypeOpen, setIsDeleteTypeOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<RegistryClassroomType | null>(null)
  const [typeForm, setTypeForm] = useState(emptyTypeForm)
  const [typeSaving, setTypeSaving] = useState(false)
  const [typeFormError, setTypeFormError] = useState<string | null>(null)

  const [isAddBuildingOpen, setIsAddBuildingOpen] = useState(false)
  const [isEditBuildingOpen, setIsEditBuildingOpen] = useState(false)
  const [isDeleteBuildingOpen, setIsDeleteBuildingOpen] = useState(false)
  const [selectedBuilding, setSelectedBuilding] = useState<RegistryBuilding | null>(null)
  const [buildingForm, setBuildingForm] = useState(emptyBuildingForm)
  const [buildingSaving, setBuildingSaving] = useState(false)
  const [buildingFormError, setBuildingFormError] = useState<string | null>(null)

  const loadRegistry = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchClassroomRegistry()
      setRegistry(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (sessionStatus === "authenticated") void loadRegistry()
  }, [loadRegistry, sessionStatus])

  const isAdmin = session?.user?.role === "ADMIN"

  useEffect(() => {
    if (session?.user?.role === "TEACHER") setActiveTab("classrooms")
  }, [session?.user?.role])

  const classrooms = registry?.classrooms ?? []
  const buildings = registry?.buildings ?? []
  const types = registry?.types ?? []
  const stats = registry?.stats

  const filteredClassrooms = useMemo(() => {
    return classrooms.filter((c) => {
      const ui = toUiStatus(c.listingStatus)
      const label = `${c.name ?? ""} ${c.number} ${c.description ?? ""} ${c.responsibleLabel ?? ""}`.toLowerCase()
      const q = searchQuery.toLowerCase()
      const matchesSearch = !q || label.includes(q)
      const matchesBuilding = selectedBuildingFilter === "all" || c.buildingId === selectedBuildingFilter
      const matchesType = selectedTypeFilter === "all" || c.classroomTypeId === selectedTypeFilter
      const matchesStatus = selectedStatusFilter === "all" || ui === selectedStatusFilter
      return Boolean(matchesSearch && matchesBuilding && matchesType && matchesStatus)
    })
  }, [classrooms, searchQuery, selectedBuildingFilter, selectedTypeFilter, selectedStatusFilter])

  const resetFilters = () => {
    setSearchQuery("")
    setSelectedBuildingFilter("all")
    setSelectedTypeFilter("all")
    setSelectedStatusFilter("all")
  }

  const hasActiveFilters =
    searchQuery !== "" ||
    selectedBuildingFilter !== "all" ||
    selectedTypeFilter !== "all" ||
    selectedStatusFilter !== "all"

  const getTypeColor = (typeId: string | null) =>
    types.find((t) => t.id === typeId)?.color ?? "bg-slate-100 text-slate-800"

  const getTypeName = (typeId: string | null) =>
    types.find((t) => t.id === typeId)?.name ?? "—"

  const getBuildingName = (buildingId: string | null) =>
    buildings.find((b) => b.id === buildingId)?.name ?? "—"

  if (sessionStatus === "loading" || (sessionStatus === "authenticated" && loading && !registry)) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-12" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!session?.user) return null

  const submitClassroom = async (isEdit: boolean) => {
    setClassroomFormError(null)
    if (!classroomForm.number.trim()) {
      setClassroomFormError("Укажите номер аудитории")
      return
    }
    if (!classroomForm.name.trim()) {
      setClassroomFormError("Укажите название")
      return
    }
    if (classroomForm.buildingId) {
      const b = buildings.find((x) => x.id === classroomForm.buildingId)
      if (b && b.floors >= 1 && (classroomForm.floor < 1 || classroomForm.floor > b.floors)) {
        setClassroomFormError(
          `Этаж не может быть больше ${b.floors} (в корпусе «${b.name}» указано столько этажей).`
        )
        return
      }
    }
    try {
      setClassroomSaving(true)
      const payload = {
        number: classroomForm.number.trim(),
        name: classroomForm.name.trim(),
        buildingId: classroomForm.buildingId || null,
        classroomTypeId: classroomForm.classroomTypeId || null,
        floor: classroomForm.floor,
        capacity: classroomForm.capacity,
        description: classroomForm.description.trim() || null,
        responsibleId: classroomForm.responsibleId || null,
        listingStatus: fromUiStatus(classroomForm.status),
      }
      if (isEdit && selectedClassroom) {
        await updateClassroomApi(selectedClassroom.id, payload)
        setIsEditClassroomOpen(false)
      } else {
        await createClassroomApi(payload)
        setIsAddClassroomOpen(false)
      }
      setSelectedClassroom(null)
      setClassroomForm(emptyClassroomForm())
      await loadRegistry()
    } catch (e) {
      setClassroomFormError(e instanceof Error ? e.message : "Ошибка сохранения")
    } finally {
      setClassroomSaving(false)
    }
  }

  const openEditClassroom = (c: RegistryClassroom) => {
    setClassroomFormError(null)
    setSelectedClassroom(c)
    setClassroomForm({
      name: c.name ?? "",
      number: c.number,
      classroomTypeId: c.classroomTypeId ?? "",
      status: toUiStatus(c.listingStatus),
      buildingId: c.buildingId ?? "",
      floor: c.floor ?? 0,
      capacity: c.capacity ?? 0,
      description: c.description ?? "",
      responsibleId: c.responsibleId ?? "",
    })
    setIsEditClassroomOpen(true)
  }

  const runTypeSave = async (isEdit: boolean) => {
    setTypeFormError(null)
    if (!typeForm.name.trim() || !typeForm.code.trim()) {
      setTypeFormError("Название и код обязательны")
      return
    }
    try {
      setTypeSaving(true)
      if (isEdit && selectedType) {
        await updateClassroomTypeApi(selectedType.id, {
          name: typeForm.name.trim(),
          code: typeForm.code.trim().toLowerCase(),
          color: typeForm.color,
          description: typeForm.description.trim() || "",
        })
        setIsEditTypeOpen(false)
      } else {
        await createClassroomTypeApi({
          name: typeForm.name.trim(),
          code: typeForm.code.trim().toLowerCase(),
          color: typeForm.color,
          description: typeForm.description.trim(),
        })
        setIsAddTypeOpen(false)
      }
      setSelectedType(null)
      setTypeForm(emptyTypeForm())
      await loadRegistry()
    } catch (e) {
      setTypeFormError(e instanceof Error ? e.message : "Ошибка сохранения")
    } finally {
      setTypeSaving(false)
    }
  }

  const runBuildingSave = async (isEdit: boolean) => {
    setBuildingFormError(null)
    if (!buildingForm.name.trim()) {
      setBuildingFormError("Укажите название")
      return
    }
    try {
      setBuildingSaving(true)
      if (isEdit && selectedBuilding) {
        await updateBuildingApi(selectedBuilding.id, {
          name: buildingForm.name.trim(),
          address: buildingForm.address.trim(),
          floors: buildingForm.floors,
          description: buildingForm.description.trim() || null,
        })
        setIsEditBuildingOpen(false)
      } else {
        await createBuildingApi({
          name: buildingForm.name.trim(),
          address: buildingForm.address.trim(),
          floors: buildingForm.floors,
          description: buildingForm.description.trim() || null,
        })
        setIsAddBuildingOpen(false)
      }
      setSelectedBuilding(null)
      setBuildingForm(emptyBuildingForm())
      await loadRegistry()
    } catch (e) {
      setBuildingFormError(e instanceof Error ? e.message : "Ошибка сохранения")
    } finally {
      setBuildingSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Аудитории</h1>
        <p className="text-muted-foreground">
          {isAdmin
            ? "Управление аудиториями, типами и корпусами"
            : "Аудитории, за которые вы назначены ответственным"}
        </p>
      </div>

      {error && (
        <Card>
          <CardContent className="pt-4 text-sm text-red-600">{error}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего аудиторий</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalClassrooms ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? "Записей в базе" : "В вашей зоне ответственности"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Рабочих мест</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalWorkstations ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? "Всего по системе" : "В ваших аудиториях"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Корпусов</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalBuildings ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? "В справочнике" : "С корпусами ваших аудиторий"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Типов аудиторий</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTypes ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? "Категорий" : "Среди ваших аудиторий"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={isAdmin ? "grid w-full grid-cols-3 lg:w-[400px]" : "grid w-full max-w-[220px]"}>
          <TabsTrigger value="classrooms">Аудитории</TabsTrigger>
          {isAdmin ? (
            <>
              <TabsTrigger value="types">Типы</TabsTrigger>
              <TabsTrigger value="buildings">Корпуса</TabsTrigger>
            </>
          ) : null}
        </TabsList>

        <TabsContent value="classrooms" className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">Фильтры</CardTitle>
                {isAdmin && (
                  <Button
                    onClick={() => {
                      setClassroomFormError(null)
                      setClassroomForm(emptyClassroomForm())
                      setIsAddClassroomOpen(true)
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Добавить аудиторию
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(5,minmax(0,1fr))]">
                <div className="relative min-w-0 sm:col-span-2 lg:col-span-2">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Номер, название аудитории…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="min-w-0">
                  <Select value={selectedBuildingFilter} onValueChange={setSelectedBuildingFilter}>
                    <SelectTrigger>
                      <Building2 className="mr-2 h-4 w-4 shrink-0" />
                      <SelectValue placeholder="Корпус" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все корпуса</SelectItem>
                      {buildings.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0">
                  <Select value={selectedTypeFilter} onValueChange={setSelectedTypeFilter}>
                    <SelectTrigger><SelectValue placeholder="Тип" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все типы</SelectItem>
                      {types.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0 sm:col-span-2 lg:col-span-1">
                  <Select value={selectedStatusFilter} onValueChange={(v) => setSelectedStatusFilter(v as UiStatus | "all")}>
                    <SelectTrigger><SelectValue placeholder="Статус" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все статусы</SelectItem>
                      <SelectItem value="active">Активна</SelectItem>
                      <SelectItem value="inactive">Неактивна</SelectItem>
                      <SelectItem value="maintenance">На обслуживании</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {hasActiveFilters && (
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Найдено: {filteredClassrooms.length} из {classrooms.length}
                  </span>
                  <Button variant="ghost" size="sm" onClick={resetFilters}>
                    <X className="mr-1 h-3 w-3" />Сбросить
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Список аудиторий</CardTitle>
              <CardDescription>Показано {filteredClassrooms.length}</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredClassrooms.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center text-muted-foreground">
                  <School className="h-12 w-12 mb-4 opacity-50" />
                  <p>Нет аудиторий по фильтру или в базе ещё нет записей</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Аудитория</TableHead>
                        <TableHead>Тип</TableHead>
                        <TableHead>Корпус / этаж</TableHead>
                        <TableHead className="text-center">Вместимость</TableHead>
                        <TableHead className="text-center">Рабочие места</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead className="w-[56px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClassrooms.map((c) => {
                        const st = getStatusInfo(toUiStatus(c.listingStatus))
                        return (
                          <TableRow key={c.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                                  <School className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div>
                                  <div className="font-medium">{c.name ?? "—"}</div>
                                  <div className="text-sm text-muted-foreground">№ {c.number}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={getTypeColor(c.classroomTypeId)}>
                                {getTypeName(c.classroomTypeId)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {getBuildingName(c.buildingId)}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Этаж {c.floor ?? "—"}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">{c.capacity ?? "—"}</TableCell>
                            <TableCell className="text-center">{c.workstationCount}</TableCell>
                            <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Действия</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => { setSelectedClassroom(c); setIsViewClassroomOpen(true); }}>
                                    <Eye className="mr-2 h-4 w-4" />Просмотр
                                  </DropdownMenuItem>
                                  {isAdmin && (
                                    <>
                                      <DropdownMenuItem onClick={() => openEditClassroom(c)}>
                                        <Pencil className="mr-2 h-4 w-4" />Редактировать
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={() => { setSelectedClassroom(c); setIsDeleteClassroomOpen(true); }}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />Удалить
                                      </DropdownMenuItem>
                                    </>
                                  )}
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
        </TabsContent>

        {isAdmin ? (
        <TabsContent value="types" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Типы аудиторий</CardTitle>
                  <CardDescription>Название, код (латиница), цвет, описание</CardDescription>
                </div>
                <Button onClick={() => { setTypeFormError(null); setTypeForm(emptyTypeForm()); setIsAddTypeOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" />Добавить тип
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {types.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Нет типов — добавьте первый с типовой страницы</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Название</TableHead>
                        <TableHead>Код</TableHead>
                        <TableHead>Цвет</TableHead>
                        <TableHead>Описание</TableHead>
                        <TableHead className="text-center">Аудиторий</TableHead>
                        <TableHead className="w-[56px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {types.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.name}</TableCell>
                          <TableCell><code className="text-sm bg-muted px-2 py-1 rounded">{t.code}</code></TableCell>
                          <TableCell>
                            <Badge variant="outline" className={t.color}>Образец</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{t.description || "—"}</TableCell>
                          <TableCell className="text-center">{t.classroomsCount}</TableCell>
                          <TableCell>
                            {isAdmin && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedType(t)
                                    setTypeForm({ name: t.name, code: t.code, color: t.color, description: t.description })
                                    setIsEditTypeOpen(true)
                                  }}>
                                    <Pencil className="mr-2 h-4 w-4" />Редактировать
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    disabled={t.classroomsCount > 0}
                                    onClick={() => { setSelectedType(t); setIsDeleteTypeOpen(true); }}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />Удалить
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        ) : null}

        {isAdmin ? (
        <TabsContent value="buildings" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Корпуса</CardTitle>
                  <CardDescription>Название, адрес, этажи, описание</CardDescription>
                </div>
                <Button onClick={() => { setBuildingFormError(null); setBuildingForm(emptyBuildingForm()); setIsAddBuildingOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" />Добавить корпус
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {buildings.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Нет корпусов</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Название</TableHead>
                        <TableHead>Адрес</TableHead>
                        <TableHead className="text-center">Этажей</TableHead>
                        <TableHead>Описание</TableHead>
                        <TableHead className="text-center">Аудиторий</TableHead>
                        <TableHead className="w-[56px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {buildings.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-medium">{b.name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{b.address || "—"}</TableCell>
                          <TableCell className="text-center">{b.floors}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{b.description || "—"}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{b.classroomsCount}</Badge>
                          </TableCell>
                          <TableCell>
                            {isAdmin && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedBuilding(b)
                                    setBuildingForm({
                                      name: b.name,
                                      address: b.address,
                                      floors: b.floors,
                                      description: b.description ?? "",
                                    })
                                    setIsEditBuildingOpen(true)
                                  }}>
                                    <Pencil className="mr-2 h-4 w-4" />Редактировать
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    disabled={b.classroomsCount > 0}
                                    onClick={() => { setSelectedBuilding(b); setIsDeleteBuildingOpen(true); }}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />Удалить
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        ) : null}
      </Tabs>

      {/* Classroom dialogs */}
      <Dialog open={isAddClassroomOpen} onOpenChange={setIsAddClassroomOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Добавить аудиторию</DialogTitle>
            <DialogDescription>Номер уникален. Корпус и тип — из справочников.</DialogDescription>
          </DialogHeader>
          <ClassroomFormFields
            form={classroomForm}
            setForm={setClassroomForm}
            buildings={buildings}
            types={types}
            teachers={registry?.teachers ?? []}
          />
          {classroomFormError && <p className="text-sm text-red-600">{classroomFormError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddClassroomOpen(false)}>Отмена</Button>
            <Button onClick={() => void submitClassroom(false)} disabled={classroomSaving}>
              {classroomSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Добавить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditClassroomOpen} onOpenChange={setIsEditClassroomOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактировать аудиторию</DialogTitle>
          </DialogHeader>
          <ClassroomFormFields
            form={classroomForm}
            setForm={setClassroomForm}
            buildings={buildings}
            types={types}
            teachers={registry?.teachers ?? []}
          />
          {classroomFormError && <p className="text-sm text-red-600">{classroomFormError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditClassroomOpen(false)}>Отмена</Button>
            <Button onClick={() => void submitClassroom(true)} disabled={classroomSaving}>
              {classroomSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewClassroomOpen} onOpenChange={setIsViewClassroomOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedClassroom?.name ?? "Аудитория"}</DialogTitle>
            <DialogDescription>Актуальные данные из базы</DialogDescription>
          </DialogHeader>
          {selectedClassroom && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-muted-foreground">Номер</p><p className="font-medium">{selectedClassroom.number}</p></div>
                <div>
                  <p className="text-muted-foreground">Тип</p>
                  <Badge variant="outline" className={getTypeColor(selectedClassroom.classroomTypeId)}>
                    {getTypeName(selectedClassroom.classroomTypeId)}
                  </Badge>
                </div>
                <div><p className="text-muted-foreground">Корпус</p><p className="font-medium">{getBuildingName(selectedClassroom.buildingId)}</p></div>
                <div><p className="text-muted-foreground">Этаж</p><p className="font-medium">{selectedClassroom.floor ?? "—"}</p></div>
                <div><p className="text-muted-foreground">Статус</p><p className="font-medium">{getStatusInfo(toUiStatus(selectedClassroom.listingStatus)).label}</p></div>
                <div><p className="text-muted-foreground">Вместимость</p><p className="font-medium">{selectedClassroom.capacity ?? "—"}</p></div>
                <div><p className="text-muted-foreground">Рабочих мест</p><p className="font-medium">{selectedClassroom.workstationCount}</p></div>
                <div><p className="text-muted-foreground">Единиц оборудования</p><p className="font-medium">{selectedClassroom.equipmentCount}</p></div>
              </div>
              <div>
                <p className="text-muted-foreground">Ответственный</p>
                <p className="font-medium">{selectedClassroom.responsibleLabel ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Описание</p>
                <p className="font-medium whitespace-pre-wrap">{selectedClassroom.description || "—"}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewClassroomOpen(false)}>Закрыть</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteClassroomOpen} onOpenChange={setIsDeleteClassroomOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить аудиторию?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedClassroom?.workstationCount ? (
                <span className="text-destructive">Сначала удалите рабочие места в этой аудитории ({selectedClassroom.workstationCount}).</span>
              ) : (
                <>Будет удалена запись «{selectedClassroom?.name}» (№ {selectedClassroom?.number}).</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={Boolean(selectedClassroom?.workstationCount)}
              onClick={async () => {
                if (!selectedClassroom) return
                try {
                  await deleteClassroomApi(selectedClassroom.id)
                  setIsDeleteClassroomOpen(false)
                  setSelectedClassroom(null)
                  await loadRegistry()
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Ошибка удаления")
                }
              }}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Type dialogs */}
      <Dialog open={isAddTypeOpen} onOpenChange={setIsAddTypeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Новый тип аудитории</DialogTitle></DialogHeader>
          <TypeFormFields form={typeForm} setForm={setTypeForm} />
          {typeFormError && <p className="text-sm text-red-600">{typeFormError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddTypeOpen(false)}>Отмена</Button>
            <Button onClick={() => void runTypeSave(false)} disabled={typeSaving}>Добавить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isEditTypeOpen} onOpenChange={setIsEditTypeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Редактировать тип</DialogTitle></DialogHeader>
          <TypeFormFields form={typeForm} setForm={setTypeForm} />
          {typeFormError && <p className="text-sm text-red-600">{typeFormError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditTypeOpen(false)}>Отмена</Button>
            <Button onClick={() => void runTypeSave(true)} disabled={typeSaving}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isDeleteTypeOpen} onOpenChange={setIsDeleteTypeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить тип?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedType?.classroomsCount ? `Нельзя удалить: ${selectedType.classroomsCount} аудиторий этого типа.` : `Тип «${selectedType?.name}».`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={Boolean(selectedType?.classroomsCount)}
              onClick={async () => {
                if (!selectedType) return
                try {
                  await deleteClassroomTypeApi(selectedType.id)
                  setIsDeleteTypeOpen(false)
                  setSelectedType(null)
                  await loadRegistry()
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Ошибка")
                }
              }}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Building dialogs */}
      <Dialog open={isAddBuildingOpen} onOpenChange={setIsAddBuildingOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Новый корпус</DialogTitle></DialogHeader>
          <BuildingFormFields form={buildingForm} setForm={setBuildingForm} />
          {buildingFormError && <p className="text-sm text-red-600">{buildingFormError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddBuildingOpen(false)}>Отмена</Button>
            <Button onClick={() => void runBuildingSave(false)} disabled={buildingSaving}>Добавить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isEditBuildingOpen} onOpenChange={setIsEditBuildingOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Редактировать корпус</DialogTitle></DialogHeader>
          <BuildingFormFields form={buildingForm} setForm={setBuildingForm} />
          {buildingFormError && <p className="text-sm text-red-600">{buildingFormError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditBuildingOpen(false)}>Отмена</Button>
            <Button onClick={() => void runBuildingSave(true)} disabled={buildingSaving}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isDeleteBuildingOpen} onOpenChange={setIsDeleteBuildingOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить корпус?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedBuilding?.classroomsCount
                ? `Нельзя удалить: ${selectedBuilding.classroomsCount} аудиторий в этом корпусе.`
                : `Корпус «${selectedBuilding?.name}».`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={Boolean(selectedBuilding?.classroomsCount)}
              onClick={async () => {
                if (!selectedBuilding) return
                try {
                  await deleteBuildingApi(selectedBuilding.id)
                  setIsDeleteBuildingOpen(false)
                  setSelectedBuilding(null)
                  await loadRegistry()
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Ошибка")
                }
              }}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ClassroomFormFields({
  form,
  setForm,
  buildings,
  types,
  teachers,
}: {
  form: ReturnType<typeof emptyClassroomForm>
  setForm: Dispatch<SetStateAction<ReturnType<typeof emptyClassroomForm>>>
  buildings: RegistryBuilding[]
  types: RegistryClassroomType[]
  teachers: { id: string; firstName: string; lastName: string; middleName: string | null; email: string }[]
}) {
  const selectedBuilding = form.buildingId
    ? buildings.find((x) => x.id === form.buildingId)
    : undefined
  const maxFloor = selectedBuilding && selectedBuilding.floors >= 1 ? selectedBuilding.floors : undefined

  return (
    <div className="grid gap-4 py-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Название</Label>
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Аудитория 301" />
        </div>
        <div className="space-y-2">
          <Label>Номер</Label>
          <Input value={form.number} onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))} placeholder="301" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Тип</Label>
          <Select value={form.classroomTypeId || "__none__"} onValueChange={(v) => setForm((f) => ({ ...f, classroomTypeId: v === "__none__" ? "" : v }))}>
            <SelectTrigger><SelectValue placeholder="Не выбран" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Не выбран</SelectItem>
              {types.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Статус</Label>
          <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as UiStatus }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Активна</SelectItem>
              <SelectItem value="inactive">Неактивна</SelectItem>
              <SelectItem value="maintenance">На обслуживании</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Корпус</Label>
          <Select
            value={form.buildingId || "__none__"}
            onValueChange={(v) => {
              const buildingId = v === "__none__" ? "" : v
              setForm((f) => {
                const b = buildingId ? buildings.find((x) => x.id === buildingId) : undefined
                return {
                  ...f,
                  buildingId,
                  floor: clampClassroomFloor(f.floor, b),
                }
              })
            }}
          >
            <SelectTrigger><SelectValue placeholder="Не выбран" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Не выбран</SelectItem>
              {buildings.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Этаж</Label>
          <Input
            type="number"
            min={maxFloor != null ? 1 : undefined}
            max={maxFloor}
            value={form.floor}
            onChange={(e) => {
              const raw = Number.parseInt(e.target.value, 10)
              setForm((f) => {
                const b = f.buildingId ? buildings.find((x) => x.id === f.buildingId) : undefined
                const mx = b && b.floors >= 1 ? b.floors : undefined
                if (mx != null) {
                  const n = Number.isNaN(raw) ? 1 : raw
                  return { ...f, floor: Math.min(Math.max(n, 1), mx) }
                }
                return { ...f, floor: Number.isNaN(raw) ? 0 : raw }
              })
            }}
          />
          {maxFloor != null && (
            <p className="text-xs text-muted-foreground">Не выше {maxFloor} (этажей в корпусе)</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Вместимость</Label>
          <Input type="number" min={0} value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: Number.parseInt(e.target.value, 10) || 0 }))} />
        </div>
        <div className="space-y-2">
          <Label>Ответственный</Label>
          <Select value={form.responsibleId || "__none__"} onValueChange={(v) => setForm((f) => ({ ...f, responsibleId: v === "__none__" ? "" : v }))}>
            <SelectTrigger><SelectValue placeholder="Не назначен" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Не назначен</SelectItem>
              {teachers.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.lastName} {u.firstName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Описание</Label>
        <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
      </div>
    </div>
  )
}

function TypeFormFields({
  form,
  setForm,
}: {
  form: ReturnType<typeof emptyTypeForm>
  setForm: Dispatch<SetStateAction<ReturnType<typeof emptyTypeForm>>>
}) {
  return (
    <div className="grid gap-4 py-2">
      <div className="space-y-2">
        <Label>Название</Label>
        <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label>Код (латиница)</Label>
        <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="computer_lab" />
      </div>
      <div className="space-y-2">
        <Label>Цвет</Label>
        <Select value={form.color} onValueChange={(v) => setForm((f) => ({ ...f, color: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {CLASSROOM_TYPE_COLOR_OPTIONS.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                <span className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs border ${c.value}`}>Aa</span>
                  {c.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Описание</Label>
        <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
      </div>
    </div>
  )
}

function BuildingFormFields({
  form,
  setForm,
}: {
  form: ReturnType<typeof emptyBuildingForm>
  setForm: Dispatch<SetStateAction<ReturnType<typeof emptyBuildingForm>>>
}) {
  return (
    <div className="grid gap-4 py-2">
      <div className="space-y-2">
        <Label>Название</Label>
        <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label>Адрес</Label>
        <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label>Количество этажей</Label>
        <Input type="number" min={0} value={form.floors} onChange={(e) => setForm((f) => ({ ...f, floors: Number.parseInt(e.target.value, 10) || 0 }))} />
      </div>
      <div className="space-y-2">
        <Label>Описание</Label>
        <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
      </div>
    </div>
  )
}
