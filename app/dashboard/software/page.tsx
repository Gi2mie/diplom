"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { SoftwareCatalogCategory, SoftwareLicenseKind } from "@prisma/client"
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  MonitorSmartphone,
  Loader2,
  Package,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { SortableTableHead } from "@/components/ui/sortable-table-head"
import { toast } from "sonner"
import { PageHeader } from "@/components/dashboard/page-header"
import { useTableSort } from "@/hooks/use-table-sort"
import { fetchClassroomRegistry, type ClassroomRegistryPayload } from "@/lib/api/classroom-registry"
import {
  fetchSoftwareDashboardList,
  fetchSoftwareDetail,
  createSoftwareDashboardApi,
  updateSoftwareDashboardApi,
  deleteSoftwareDashboardApi,
  assignSoftwareToWorkstationsApi,
  assignSoftwareToAllWorkstationsApi,
  type DashboardSoftwareRow,
  type SoftwareDetail,
} from "@/lib/api/software-dashboard"
import {
  softwareCategoryLabel,
  softwareLicenseExpiresDisplay,
  softwareLicenseKindLabel,
  softwareLicenseTypeFromRow,
  softwareLicenseTypeLabel,
  softwareLicenseTypeToKind,
  SOFTWARE_CATEGORY_OPTIONS,
  SOFTWARE_LICENSE_TYPE_OPTIONS,
  SOFTWARE_LICENSE_OPTIONS,
  type SoftwareLicenseTypeValue,
} from "@/lib/software-labels"

type WorkstationRow = {
  id: string
  code: string
  classroomId: string
  name: string
  classroomNumber: string
  buildingName: string | null
}

type SoftwareFormState = {
  name: string
  version: string
  vendor: string
  category: SoftwareCatalogCategory
  licenseKind: SoftwareLicenseKind
  licenseType: SoftwareLicenseTypeValue
  defaultLicenseKey: string
  licenseExpiresAt: string
  description: string
}

function createEmptyForm(): SoftwareFormState {
  return {
    name: "",
    version: "",
    vendor: "",
    category: SoftwareCatalogCategory.OTHER,
    licenseKind: SoftwareLicenseKind.FREE,
    licenseType: "free_license",
    defaultLicenseKey: "",
    licenseExpiresAt: "",
    description: "",
  }
}

function parseYmd(s: string | null | undefined): Date | null {
  if (!s) return null
  const d = new Date(s + "T12:00:00")
  return Number.isNaN(d.getTime()) ? null : d
}

function daysUntil(dateStr: string | null | undefined): number | null {
  const d = parseYmd(dateStr)
  if (!d) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - today.getTime()) / 86400000)
}

export default function SoftwarePage() {
  const { data: session, status: sessionStatus } = useSession()
  const isAdmin = session?.user?.role === "ADMIN"

  const [rows, setRows] = useState<DashboardSoftwareRow[]>([])
  const [classroomReg, setClassroomReg] = useState<ClassroomRegistryPayload | null>(null)
  const [workstations, setWorkstations] = useState<WorkstationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchInput, setSearchInput] = useState("")
  const [searchDebounced, setSearchDebounced] = useState("")
  const [filterCategory, setFilterCategory] = useState<SoftwareCatalogCategory | "all">("all")
  const [filterLicense, setFilterLicense] = useState<SoftwareLicenseKind | "all">("all")
  const [filterBuildingId, setFilterBuildingId] = useState("all")
  const [filterClassroomId, setFilterClassroomId] = useState("all")
  const [filterWorkstationId, setFilterWorkstationId] = useState("all")

  const [viewOpen, setViewOpen] = useState(false)
  const [viewDetail, setViewDetail] = useState<SoftwareDetail | null>(null)
  const [viewLoading, setViewLoading] = useState(false)

  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignAllOpen, setAssignAllOpen] = useState(false)

  const [selected, setSelected] = useState<DashboardSoftwareRow | null>(null)
  const [form, setForm] = useState<SoftwareFormState>(() => createEmptyForm())
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [assignBuildingId, setAssignBuildingId] = useState("all")
  const [assignClassroomId, setAssignClassroomId] = useState("all")
  const [assignWorkstationId, setAssignWorkstationId] = useState("all")
  const [assignBusy, setAssignBusy] = useState(false)
  const [assignAllBusy, setAssignAllBusy] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchInput), 350)
    return () => clearTimeout(t)
  }, [searchInput])

  const loadList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await fetchSoftwareDashboardList({
        search: searchDebounced || undefined,
        category: filterCategory,
        licenseKind: filterLicense,
        workstationId: filterWorkstationId,
      })
      setRows(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки")
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [searchDebounced, filterCategory, filterLicense, filterWorkstationId])

  const loadRegistry = useCallback(async () => {
    try {
      const [cr, wsRes] = await Promise.all([
        fetchClassroomRegistry(),
        fetch("/api/workstations", { cache: "no-store" }).then(async (r) => {
          if (!r.ok) throw new Error("Не удалось загрузить рабочие места")
          return r.json() as Promise<{ workstations: WorkstationRow[] }>
        }),
      ])
      setClassroomReg(cr)
      setWorkstations(wsRes.workstations)
    } catch {
      setClassroomReg(null)
      setWorkstations([])
    }
  }, [])

  useEffect(() => {
    if (sessionStatus !== "authenticated") return
    void loadList()
  }, [sessionStatus, loadList])

  useEffect(() => {
    if (sessionStatus !== "authenticated") return
    void loadRegistry()
  }, [sessionStatus, loadRegistry])

  const filteredClassroomsForFilter = useMemo(() => {
    if (!classroomReg) return []
    if (filterBuildingId === "all") return classroomReg.classrooms
    return classroomReg.classrooms.filter((c) => c.buildingId === filterBuildingId)
  }, [classroomReg, filterBuildingId])

  const filteredWorkstationsForFilter = useMemo(() => {
    if (filterClassroomId === "all") return workstations
    return workstations.filter((w) => w.classroomId === filterClassroomId)
  }, [workstations, filterClassroomId])

  const assignFilteredClassrooms = useMemo(() => {
    if (!classroomReg || assignBuildingId === "all") return []
    return classroomReg.classrooms.filter((c) => c.buildingId === assignBuildingId)
  }, [classroomReg, assignBuildingId])

  const assignFilteredWorkstations = useMemo(() => {
    if (assignClassroomId === "all") return []
    return workstations.filter((w) => w.classroomId === assignClassroomId)
  }, [workstations, assignClassroomId])

  useEffect(() => {
    setFilterClassroomId("all")
    setFilterWorkstationId("all")
  }, [filterBuildingId])

  useEffect(() => {
    setFilterWorkstationId("all")
  }, [filterClassroomId])

  useEffect(() => {
    setAssignClassroomId("all")
    setAssignWorkstationId("all")
  }, [assignBuildingId])

  useEffect(() => {
    setAssignWorkstationId("all")
  }, [assignClassroomId])

  const stats = useMemo(() => {
    const total = rows.length
    let free = 0
    let paid = 0
    let edu = 0
    let expiring = 0
    let installs = 0
    for (const r of rows) {
      if (r.licenseKind === SoftwareLicenseKind.FREE) free++
      else if (r.licenseKind === SoftwareLicenseKind.PAID) paid++
      else if (r.licenseKind === SoftwareLicenseKind.EDUCATIONAL) edu++
      const d = daysUntil(r.licenseExpiresAt)
      if (d != null && d >= 0 && d <= 90) expiring++
      installs += r.installationCount
    }
    return { total, free, paid, edu, expiring, installs }
  }, [rows])

  const softwareSortGetters = useMemo(
    () => ({
      name: (r: DashboardSoftwareRow) => r.name,
      version: (r: DashboardSoftwareRow) => r.version,
      vendor: (r: DashboardSoftwareRow) => r.vendor ?? "",
      category: (r: DashboardSoftwareRow) => softwareCategoryLabel(r.category),
      license: (r: DashboardSoftwareRow) => softwareLicenseKindLabel(r.licenseKind),
      expires: (r: DashboardSoftwareRow) => r.licenseExpiresAt ?? "",
      installs: (r: DashboardSoftwareRow) => r.installationCount,
    }),
    []
  )

  const { sortedItems: sortedSoftwareRows, sortKey, sortDir, toggleSort } = useTableSort(
    rows,
    softwareSortGetters,
    "name"
  )

  async function openView(row: DashboardSoftwareRow) {
    setSelected(row)
    setViewOpen(true)
    setViewDetail(null)
    setViewLoading(true)
    try {
      const d = await fetchSoftwareDetail(row.id)
      setViewDetail(d)
    } catch {
      setViewDetail(null)
    } finally {
      setViewLoading(false)
    }
  }

  function openAdd() {
    setForm(createEmptyForm())
    setFormError(null)
    setAddOpen(true)
  }

  function openEdit(row: DashboardSoftwareRow) {
    setSelected(row)
    setForm({
      name: row.name,
      version: row.version,
      vendor: row.vendor ?? "",
      category: row.category,
      licenseKind: row.licenseKind,
      licenseType: softwareLicenseTypeFromRow(row.licenseType, row.licenseKind),
      defaultLicenseKey: row.defaultLicenseKey ?? "",
      licenseExpiresAt: row.licenseExpiresAt ?? "",
      description: row.description ?? "",
    })
    setFormError(null)
    setEditOpen(true)
  }

  function openDelete(row: DashboardSoftwareRow) {
    setSelected(row)
    setDeleteOpen(true)
  }

  function openAssign(row: DashboardSoftwareRow) {
    setSelected(row)
    setAssignBuildingId("all")
    setAssignClassroomId("all")
    setAssignWorkstationId("all")
    setAssignOpen(true)
  }

  async function submitCreate() {
    setFormSaving(true)
    setFormError(null)
    const isFree = form.licenseKind === SoftwareLicenseKind.FREE
    try {
      await createSoftwareDashboardApi({
        name: form.name.trim(),
        version: form.version.trim(),
        vendor: form.vendor.trim() || null,
        category: form.category,
        licenseKind: form.licenseKind,
        licenseType: form.licenseType,
        defaultLicenseKey: isFree ? null : form.defaultLicenseKey.trim() || null,
        licenseExpiresAt: isFree ? null : form.licenseExpiresAt ? parseYmd(form.licenseExpiresAt) : null,
        description: form.description.trim() || null,
      })
      setAddOpen(false)
      await loadList()
      toast.success("ПО добавлено в каталог")
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Ошибка сохранения")
    } finally {
      setFormSaving(false)
    }
  }

  async function submitEdit() {
    if (!selected) return
    setFormSaving(true)
    setFormError(null)
    const isFree = form.licenseKind === SoftwareLicenseKind.FREE
    try {
      await updateSoftwareDashboardApi(selected.id, {
        name: form.name.trim(),
        version: form.version.trim(),
        vendor: form.vendor.trim() || null,
        category: form.category,
        licenseKind: form.licenseKind,
        licenseType: form.licenseType,
        defaultLicenseKey: isFree ? null : form.defaultLicenseKey.trim() || null,
        licenseExpiresAt: isFree ? null : form.licenseExpiresAt ? parseYmd(form.licenseExpiresAt) : null,
        description: form.description.trim() || null,
      })
      setEditOpen(false)
      await loadList()
      toast.success("Каталог ПО обновлён")
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Ошибка сохранения")
    } finally {
      setFormSaving(false)
    }
  }

  async function confirmDelete() {
    if (!selected) return
    setFormSaving(true)
    try {
      await deleteSoftwareDashboardApi(selected.id)
      setDeleteOpen(false)
      setSelected(null)
      await loadList()
      toast.success("Запись удалена из каталога")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка удаления")
    } finally {
      setFormSaving(false)
    }
  }

  async function submitAssignWorkstation() {
    if (!selected || assignWorkstationId === "all") return
    setAssignBusy(true)
    setError(null)
    try {
      await assignSoftwareToWorkstationsApi(selected.id, [assignWorkstationId])
      await loadList()
      setAssignOpen(false)
      toast.success("ПО назначено на рабочее место")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось назначить")
    } finally {
      setAssignBusy(false)
    }
  }

  async function confirmAssignAll() {
    if (!selected) return
    setAssignAllBusy(true)
    setError(null)
    try {
      await assignSoftwareToAllWorkstationsApi(selected.id)
      setAssignAllOpen(false)
      setAssignOpen(false)
      await loadList()
      toast.success("ПО назначено на все рабочие места")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось назначить")
    } finally {
      setAssignAllBusy(false)
    }
  }

  function formFields() {
    const licenseNeedsKeyAndDate = form.licenseKind !== SoftwareLicenseKind.FREE
    return (
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label>Название</Label>
          <Input
            placeholder="Название"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div className="grid gap-2">
          <Label>Версия</Label>
          <Input
            placeholder="Версия"
            value={form.version}
            onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
          />
        </div>
        <div className="grid gap-2">
          <Label>Издатель</Label>
          <Input
            placeholder="Издатель"
            value={form.vendor}
            onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
          />
        </div>
        <div className="grid gap-2">
          <Label>Тип ПО</Label>
          <Select
            value={form.category}
            onValueChange={(v) => setForm((f) => ({ ...f, category: v as SoftwareCatalogCategory }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Тип ПО" />
            </SelectTrigger>
            <SelectContent>
              {SOFTWARE_CATEGORY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Тип лицензии</Label>
          <Select
            value={form.licenseType}
            onValueChange={(v) => {
              const t = v as SoftwareLicenseTypeValue
              const k = softwareLicenseTypeToKind(t)
              setForm((f) => ({
                ...f,
                licenseType: t,
                licenseKind: k,
                ...(k === SoftwareLicenseKind.FREE
                  ? { licenseExpiresAt: "", defaultLicenseKey: "" }
                  : {}),
              }))
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Тип лицензии" />
            </SelectTrigger>
            <SelectContent>
              {SOFTWARE_LICENSE_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {licenseNeedsKeyAndDate ? (
          <>
            <div className="grid gap-2">
              <Label>Срок лицензии до</Label>
              <Input
                type="date"
                value={form.licenseExpiresAt}
                onChange={(e) => setForm((f) => ({ ...f, licenseExpiresAt: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Лицензионный ключ</Label>
              <Input
                placeholder="Лицензионный ключ"
                value={form.defaultLicenseKey}
                onChange={(e) => setForm((f) => ({ ...f, defaultLicenseKey: e.target.value }))}
              />
            </div>
          </>
        ) : null}
        <div className="grid gap-2">
          <Label>Описание</Label>
          <Textarea
            placeholder="Описание"
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
      </div>
    )
  }

  if (sessionStatus === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (sessionStatus === "unauthenticated") {
    return <p className="text-sm text-muted-foreground">Войдите в систему.</p>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Программное обеспечение"
        description="Каталог ПО и назначение на рабочие места"
        actions={
          isAdmin ? (
            <Button onClick={openAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Добавить ПО
            </Button>
          ) : null
        }
      />

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>В каталоге (по фильтру)</CardDescription>
            <CardTitle className="text-2xl">{loading ? "—" : stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Бесплатная лицензия</CardDescription>
            <CardTitle className="text-2xl">{loading ? "—" : stats.free}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Платная лицензия</CardDescription>
            <CardTitle className="text-2xl">{loading ? "—" : stats.paid}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Образовательная</CardDescription>
            <CardTitle className="text-2xl">{loading ? "—" : stats.edu}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Срок до 90 дней</CardDescription>
            <CardTitle className="text-2xl">{loading ? "—" : stats.expiring}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Всего установок (по фильтру)</CardDescription>
            <CardTitle className="text-2xl">{loading ? "—" : stats.installs}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="relative min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Поиск по названию, издателю, версии, инв. №…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(5,minmax(0,1fr))]">
            <div className="relative min-w-0 flex flex-col gap-2">
              <Label>Тип ПО</Label>
              <Select
                value={filterCategory}
                onValueChange={(v) => setFilterCategory(v as SoftwareCatalogCategory | "all")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Все типы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все типы</SelectItem>
                  {SOFTWARE_CATEGORY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="relative min-w-0 flex flex-col gap-2">
              <Label>Тип лицензии</Label>
              <Select
                value={filterLicense}
                onValueChange={(v) => setFilterLicense(v as SoftwareLicenseKind | "all")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Все" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  {SOFTWARE_LICENSE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="relative min-w-0 flex flex-col gap-2">
              <Label>Корпус</Label>
              <Select value={filterBuildingId} onValueChange={setFilterBuildingId}>
                <SelectTrigger>
                  <SelectValue placeholder="Все корпуса" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все корпуса</SelectItem>
                  {(classroomReg?.buildings ?? []).map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="relative min-w-0 flex flex-col gap-2">
              <Label>Аудитория</Label>
              <Select
                value={filterClassroomId}
                onValueChange={setFilterClassroomId}
                disabled={filterBuildingId === "all"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Сначала корпус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все в корпусе</SelectItem>
                  {filteredClassroomsForFilter.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.number}
                      {c.name ? ` (${c.name})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="relative min-w-0 flex flex-col gap-2">
              <Label>Рабочее место</Label>
              <Select
                value={filterWorkstationId}
                onValueChange={setFilterWorkstationId}
                disabled={filterClassroomId === "all"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Сначала аудитория" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все на РМ</SelectItem>
                  {filteredWorkstationsForFilter.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.code}
                      {w.name ? ` — ${w.name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Каталог
          </CardTitle>
          <CardDescription>Записи с уникальной парой «название + версия»</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : sortedSoftwareRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет записей по текущим фильтрам.</p>
          ) : (
            <ScrollArea className="h-[min(560px,60vh)] w-full rounded-md border">
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
                      columnKey="version"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    >
                      Версия
                    </SortableTableHead>
                    <SortableTableHead
                      columnKey="vendor"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    >
                      Издатель
                    </SortableTableHead>
                    <SortableTableHead
                      columnKey="category"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    >
                      Тип ПО
                    </SortableTableHead>
                    <SortableTableHead
                      columnKey="license"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    >
                      Тип лицензии
                    </SortableTableHead>
                    <SortableTableHead
                      columnKey="expires"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    >
                      Срок лицензии до
                    </SortableTableHead>
                    <SortableTableHead
                      columnKey="installs"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                      className="text-right"
                    >
                      Установок
                    </SortableTableHead>
                    <TableHead className="w-[56px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedSoftwareRows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.version || "—"}</TableCell>
                      <TableCell>{r.vendor || "—"}</TableCell>
                      <TableCell>{softwareCategoryLabel(r.category)}</TableCell>
                      <TableCell>{softwareLicenseTypeLabel(r.licenseType)}</TableCell>
                      <TableCell>{softwareLicenseExpiresDisplay(r.licenseExpiresAt)}</TableCell>
                      <TableCell className="text-right">{r.installationCount}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Действия">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Действия</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => void openView(r)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Просмотр
                            </DropdownMenuItem>
                            {isAdmin ? (
                              <DropdownMenuItem onClick={() => openEdit(r)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Редактирование
                              </DropdownMenuItem>
                            ) : null}
                            {isAdmin ? (
                              <DropdownMenuItem onClick={() => openAssign(r)}>
                                <MonitorSmartphone className="mr-2 h-4 w-4" />
                                Назначить на РМ
                              </DropdownMenuItem>
                            ) : null}
                            {isAdmin ? (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => openDelete(r)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Удаление
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Просмотр ПО</DialogTitle>
            <DialogDescription>Карточка каталога и установки</DialogDescription>
          </DialogHeader>
          {viewLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : viewDetail ? (
            <div className="space-y-4 text-sm">
              <div>
                <span className="text-muted-foreground">Название:</span> {viewDetail.name}
              </div>
              <div>
                <span className="text-muted-foreground">Версия:</span> {viewDetail.version || "—"}
              </div>
              <div>
                <span className="text-muted-foreground">Издатель:</span> {viewDetail.vendor || "—"}
              </div>
              <div>
                <span className="text-muted-foreground">Тип ПО:</span>{" "}
                {softwareCategoryLabel(viewDetail.category)}
              </div>
              <div>
                <span className="text-muted-foreground">Тип лицензии:</span>{" "}
                {softwareLicenseTypeLabel(viewDetail.licenseType)}
              </div>
              <div>
                <span className="text-muted-foreground">Срок лицензии до:</span>{" "}
                {softwareLicenseExpiresDisplay(viewDetail.licenseExpiresAt)}
              </div>
              <div>
                <span className="text-muted-foreground">Лицензионный ключ:</span>{" "}
                {viewDetail.defaultLicenseKey || "—"}
              </div>
              <div>
                <span className="text-muted-foreground">Описание:</span>
                <p className="mt-1 whitespace-pre-wrap">{viewDetail.description || "—"}</p>
              </div>
              <div>
                <p className="mb-2 font-medium">Установки ({viewDetail.installations.length})</p>
                <ScrollArea className="h-48 rounded-md border p-2">
                  <ul className="space-y-2">
                    {viewDetail.installations.length === 0 ? (
                      <li className="text-muted-foreground">Нет установок</li>
                    ) : (
                      viewDetail.installations.map((i) => (
                        <li key={i.id} className="text-xs">
                          {[i.buildingName, i.classroomNumber, i.workstationCode].filter(Boolean).join(" · ") ||
                            "—"}
                          {i.workstationName ? ` (${i.workstationName})` : ""}
                        </li>
                      ))
                    )}
                  </ul>
                </ScrollArea>
              </div>
            </div>
          ) : (
            <p className="text-sm text-destructive">Не удалось загрузить данные</p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="shrink-0 space-y-1.5 px-6 pt-6 pr-14">
            <DialogTitle>Добавить ПО</DialogTitle>
            <DialogDescription>Новая запись в каталоге</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2">{formFields()}</div>
          <DialogFooter className="shrink-0 gap-2 border-t px-6 py-4">
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Отмена
            </Button>
            <Button onClick={() => void submitCreate()} disabled={formSaving || !form.name.trim()}>
              {formSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="shrink-0 space-y-1.5 px-6 pt-6 pr-14">
            <DialogTitle>Редактирование</DialogTitle>
            <DialogDescription>Изменение записи каталога</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2">{formFields()}</div>
          <DialogFooter className="shrink-0 gap-2 border-t px-6 py-4">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Отмена
            </Button>
            <Button onClick={() => void submitEdit()} disabled={formSaving || !form.name.trim()}>
              {formSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить ПО?</AlertDialogTitle>
            <AlertDialogDescription>
              Запись «{selected?.name}» будет удалена из каталога вместе с привязками установок.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                e.preventDefault()
                void confirmDelete()
              }}
            >
              {formSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Удалить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Назначить на РМ</DialogTitle>
            <DialogDescription>
              {selected ? `ПО: ${selected.name}${selected.version ? ` (${selected.version})` : ""}` : ""}
              <br />
              Выберите корпус, аудиторию и рабочее место. На одно РМ можно добавить установку повторно не
              получится — дубликаты пропускаются.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Корпус</Label>
              <Select value={assignBuildingId} onValueChange={setAssignBuildingId}>
                <SelectTrigger>
                  <SelectValue placeholder="Корпус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все корпуса</SelectItem>
                  {(classroomReg?.buildings ?? []).map((b) => (
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
                value={assignClassroomId}
                onValueChange={setAssignClassroomId}
                disabled={assignBuildingId === "all"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Сначала выберите корпус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Выберите аудиторию</SelectItem>
                  {assignFilteredClassrooms.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.number}
                      {c.name ? ` (${c.name})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Рабочее место</Label>
              <Select
                value={assignWorkstationId}
                onValueChange={setAssignWorkstationId}
                disabled={assignClassroomId === "all"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Сначала аудитория" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Выберите РМ</SelectItem>
                  {assignFilteredWorkstations.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.code}
                      {w.name ? ` — ${w.name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setAssignOpen(false)}>
                Закрыть
              </Button>
              <Button
                onClick={() => void submitAssignWorkstation()}
                disabled={assignBusy || assignWorkstationId === "all"}
              >
                {assignBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Назначить на выбранное РМ"}
              </Button>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => setAssignAllOpen(true)}
            >
              Назначить ПО на все рабочие места
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={assignAllOpen} onOpenChange={setAssignAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Назначить на все РМ?</AlertDialogTitle>
            <AlertDialogDescription>
              Будет создана установка для каждого компьютера в системе, привязанного к рабочему месту.
              Повторы пропускаются.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void confirmAssignAll()
              }}
            >
              {assignAllBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Назначить везде"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
