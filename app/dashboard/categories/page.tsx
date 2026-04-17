"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { EquipmentType } from "@prisma/client"
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Folder,
  Tags,
  X,
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { SortableTableHead } from "@/components/ui/sortable-table-head"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { PageHeader } from "@/components/dashboard/page-header"
import { useTableSort } from "@/hooks/use-table-sort"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { equipmentTypeEnumLabel, EQUIPMENT_TYPE_ENUM_OPTIONS } from "@/lib/equipment-labels"
import {
  fetchEquipmentRegistry,
  createEquipmentCategoryApi,
  updateEquipmentCategoryApi,
  deleteEquipmentCategoryApi,
  createEquipmentKindApi,
  updateEquipmentKindApi,
  deleteEquipmentKindApi,
  type RegistryEquipmentCategory,
  type RegistryEquipmentKind,
} from "@/lib/api/equipment-registry"
const COLOR_PRESETS = [
  { name: "Синий", value: "#3b82f6" },
  { name: "Зелёный", value: "#10b981" },
  { name: "Жёлтый", value: "#f59e0b" },
  { name: "Красный", value: "#ef4444" },
  { name: "Фиолетовый", value: "#8b5cf6" },
  { name: "Голубой", value: "#06b6d4" },
  { name: "Розовый", value: "#ec4899" },
  { name: "Серый", value: "#64748b" },
]

export default function EquipmentCategoriesPage() {
  const { data: session, status: sessionStatus } = useSession()
  const [activeTab, setActiveTab] = useState("categories")
  const [categories, setCategories] = useState<RegistryEquipmentCategory[]>([])
  const [kinds, setKinds] = useState<RegistryEquipmentKind[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchCat, setSearchCat] = useState("")
  const [searchKind, setSearchKind] = useState("")

  const [catEdit, setCatEdit] = useState<RegistryEquipmentCategory | null>(null)
  const [catDelete, setCatDelete] = useState<RegistryEquipmentCategory | null>(null)
  const [catAddOpen, setCatAddOpen] = useState(false)
  const [catForm, setCatForm] = useState({ name: "", description: "", color: "#3b82f6" })
  const [catSaving, setCatSaving] = useState(false)
  const [catFormError, setCatFormError] = useState<string | null>(null)

  const [kindEdit, setKindEdit] = useState<RegistryEquipmentKind | null>(null)
  const [kindDelete, setKindDelete] = useState<RegistryEquipmentKind | null>(null)
  const [kindAddOpen, setKindAddOpen] = useState(false)
  const [kindForm, setKindForm] = useState({
    name: "",
    description: "",
    mapsToEnum: "OTHER" as EquipmentType,
  })
  const [kindSaving, setKindSaving] = useState(false)
  const [kindFormError, setKindFormError] = useState<string | null>(null)
  const [catDeleteBusy, setCatDeleteBusy] = useState(false)
  const [kindDeleteBusy, setKindDeleteBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchEquipmentRegistry()
      setCategories(data.categories)
      setKinds(data.kinds)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (sessionStatus === "authenticated") void load()
  }, [sessionStatus, load])

  const filteredCategories = useMemo(() => {
    const q = searchCat.trim().toLowerCase()
    if (!q) return categories
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
    )
  }, [categories, searchCat])

  const filteredKinds = useMemo(() => {
    const q = searchKind.trim().toLowerCase()
    if (!q) return kinds
    return kinds.filter(
      (k) =>
        k.name.toLowerCase().includes(q) ||
        (k.description && k.description.toLowerCase().includes(q)) ||
        equipmentTypeEnumLabel(k.mapsToEnum).toLowerCase().includes(q)
    )
  }, [kinds, searchKind])

  const isAdmin = session?.user?.role === "ADMIN"

  const categorySortGetters = useMemo(
    () => ({
      name: (c: RegistryEquipmentCategory) => c.name,
      description: (c: RegistryEquipmentCategory) => c.description ?? "",
      count: (c: RegistryEquipmentCategory) => c.equipmentCount,
    }),
    []
  )

  const kindSortGetters = useMemo(
    () => ({
      name: (k: RegistryEquipmentKind) => k.name,
      mapsToEnum: (k: RegistryEquipmentKind) => equipmentTypeEnumLabel(k.mapsToEnum),
      description: (k: RegistryEquipmentKind) => k.description ?? "",
      count: (k: RegistryEquipmentKind) => k.equipmentCount,
    }),
    []
  )

  const {
    sortedItems: sortedCategories,
    sortKey: catSortKey,
    sortDir: catSortDir,
    toggleSort: toggleCatSort,
  } = useTableSort(filteredCategories, categorySortGetters, "name")

  const {
    sortedItems: sortedKinds,
    sortKey: kindSortKey,
    sortDir: kindSortDir,
    toggleSort: toggleKindSort,
  } = useTableSort(filteredKinds, kindSortGetters, "name")

  const saveCategory = async (mode: "add" | "edit") => {
    setCatFormError(null)
    if (!catForm.name.trim()) {
      setCatFormError("Укажите название")
      return
    }
    setCatSaving(true)
    try {
      if (mode === "add") {
        await createEquipmentCategoryApi({
          name: catForm.name.trim(),
          description: catForm.description.trim() || null,
          color: catForm.color,
        })
        setCatAddOpen(false)
        toast.success("Категория создана")
      } else if (catEdit) {
        await updateEquipmentCategoryApi(catEdit.id, {
          name: catForm.name.trim(),
          description: catForm.description.trim() || null,
          color: catForm.color,
        })
        setCatEdit(null)
        toast.success("Категория обновлена")
      }
      setCatForm({ name: "", description: "", color: "#3b82f6" })
      await load()
    } catch (e) {
      setCatFormError(e instanceof Error ? e.message : "Ошибка")
    } finally {
      setCatSaving(false)
    }
  }

  const saveKind = async (mode: "add" | "edit") => {
    setKindFormError(null)
    if (!kindForm.name.trim()) {
      setKindFormError("Укажите название")
      return
    }
    setKindSaving(true)
    try {
      if (mode === "add") {
        await createEquipmentKindApi({
          name: kindForm.name.trim(),
          description: kindForm.description.trim() || null,
          mapsToEnum: kindForm.mapsToEnum,
        })
        setKindAddOpen(false)
        toast.success("Тип создан")
      } else if (kindEdit) {
        await updateEquipmentKindApi(kindEdit.id, {
          name: kindForm.name.trim(),
          description: kindForm.description.trim() || null,
          mapsToEnum: kindForm.mapsToEnum,
        })
        setKindEdit(null)
        toast.success("Тип обновлён")
      }
      setKindForm({ name: "", description: "", mapsToEnum: EquipmentType.OTHER })
      await load()
    } catch (e) {
      setKindFormError(e instanceof Error ? e.message : "Ошибка")
    } finally {
      setKindSaving(false)
    }
  }

  const doDeleteCategory = async (unlinkAllEquipment: boolean) => {
    if (!catDelete) return
    setCatDeleteBusy(true)
    setError(null)
    try {
      await deleteEquipmentCategoryApi(
        catDelete.id,
        unlinkAllEquipment ? { unlinkAllEquipment: true } : undefined
      )
      setCatDelete(null)
      await load()
      toast.success(
        unlinkAllEquipment
          ? "Оборудование отвязано от категории, категория удалена"
          : "Категория удалена"
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить")
    } finally {
      setCatDeleteBusy(false)
    }
  }

  const doDeleteKind = async (unlinkAllEquipment: boolean) => {
    if (!kindDelete) return
    setKindDeleteBusy(true)
    setError(null)
    try {
      await deleteEquipmentKindApi(
        kindDelete.id,
        unlinkAllEquipment ? { unlinkAllEquipment: true } : undefined
      )
      setKindDelete(null)
      await load()
      toast.success(
        unlinkAllEquipment
          ? "Оборудование отвязано от типа, тип удалён"
          : "Тип удалён"
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить")
    } finally {
      setKindDeleteBusy(false)
    }
  }

  if (sessionStatus === "loading") {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!session?.user) return null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Категории и типы оборудования"
        description={
          <>
            Справочники для раздела «Оборудование»: категории и типы.{" "}
            {isAdmin ? "Доступны создание, редактирование и удаление." : "Только просмотр."}
          </>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="categories" className="gap-1.5">
            <Folder className="h-4 w-4" />
            Категории
          </TabsTrigger>
          <TabsTrigger value="kinds" className="gap-1.5">
            <Tags className="h-4 w-4" />
            Типы
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Категории</CardTitle>
                <CardDescription>Группировка оборудования по назначению</CardDescription>
              </div>
              {isAdmin && (
                <span className="inline-flex">
                  <Button
                    type="button"
                    onClick={() => {
                      setCatForm({ name: "", description: "", color: "#3b82f6" })
                      setCatFormError(null)
                      setCatAddOpen(true)
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Добавить категорию
                  </Button>
                </span>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="Поиск по названию или описанию..."
                  value={searchCat}
                  onChange={(e) => setSearchCat(e.target.value)}
                />
                {searchCat && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                    type="button"
                    onClick={() => setSearchCat("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : sortedCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground">Нет категорий</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <SortableTableHead
                          columnKey="name"
                          sortKey={catSortKey}
                          sortDir={catSortDir}
                          onSort={toggleCatSort}
                        >
                          Название
                        </SortableTableHead>
                        <SortableTableHead
                          columnKey="description"
                          sortKey={catSortKey}
                          sortDir={catSortDir}
                          onSort={toggleCatSort}
                        >
                          Описание
                        </SortableTableHead>
                        <SortableTableHead
                          columnKey="count"
                          sortKey={catSortKey}
                          sortDir={catSortDir}
                          onSort={toggleCatSort}
                          className="w-28 text-right"
                        >
                          Единиц
                        </SortableTableHead>
                        {isAdmin && <TableHead className="w-12 text-right" />}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedCategories.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span
                                className="h-3 w-3 shrink-0 rounded-full"
                                style={{ backgroundColor: c.color }}
                              />
                              <span className="font-medium">{c.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-md text-muted-foreground text-sm">
                            {c.description ?? "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{c.equipmentCount}</TableCell>
                          {isAdmin && (
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
                                      setCatEdit(c)
                                      setCatForm({
                                        name: c.name,
                                        description: c.description ?? "",
                                        color: c.color,
                                      })
                                      setCatFormError(null)
                                    }}
                                  >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Редактировать
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setCatDelete(c)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Удалить
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kinds" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Типы оборудования</CardTitle>
                <CardDescription>Соответствие системной классификации (для отчётов и ПК)</CardDescription>
              </div>
              {isAdmin && (
                <span className="inline-flex">
                  <Button
                    type="button"
                    onClick={() => {
                      setKindForm({ name: "", description: "", mapsToEnum: EquipmentType.OTHER })
                      setKindFormError(null)
                      setKindAddOpen(true)
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Добавить тип
                  </Button>
                </span>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="Поиск..."
                  value={searchKind}
                  onChange={(e) => setSearchKind(e.target.value)}
                />
                {searchKind && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                    type="button"
                    onClick={() => setSearchKind("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : sortedKinds.length === 0 ? (
                <p className="text-sm text-muted-foreground">Нет типов</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <SortableTableHead
                          columnKey="name"
                          sortKey={kindSortKey}
                          sortDir={kindSortDir}
                          onSort={toggleKindSort}
                        >
                          Название
                        </SortableTableHead>
                        <SortableTableHead
                          columnKey="mapsToEnum"
                          sortKey={kindSortKey}
                          sortDir={kindSortDir}
                          onSort={toggleKindSort}
                        >
                          Системный класс
                        </SortableTableHead>
                        <SortableTableHead
                          columnKey="description"
                          sortKey={kindSortKey}
                          sortDir={kindSortDir}
                          onSort={toggleKindSort}
                        >
                          Описание
                        </SortableTableHead>
                        <SortableTableHead
                          columnKey="count"
                          sortKey={kindSortKey}
                          sortDir={kindSortDir}
                          onSort={toggleKindSort}
                          className="w-28 text-right"
                        >
                          Единиц
                        </SortableTableHead>
                        {isAdmin && <TableHead className="w-12 text-right" />}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedKinds.map((k) => (
                        <TableRow key={k.id}>
                          <TableCell className="font-medium">
                            {k.name}
                            {k.code?.startsWith("BUILTIN_") && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                системный
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {equipmentTypeEnumLabel(k.mapsToEnum)}
                          </TableCell>
                          <TableCell className="max-w-md text-muted-foreground text-sm">
                            {k.description ?? "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{k.equipmentCount}</TableCell>
                          {isAdmin && (
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
                                      setKindEdit(k)
                                      setKindForm({
                                        name: k.name,
                                        description: k.description ?? "",
                                        mapsToEnum: k.mapsToEnum,
                                      })
                                      setKindFormError(null)
                                    }}
                                  >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Редактировать
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setKindDelete(k)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Удалить
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Category add/edit */}
      <Dialog
        open={catAddOpen || !!catEdit}
        onOpenChange={(o) => {
          if (!o) {
            setCatAddOpen(false)
            setCatEdit(null)
          }
        }}
      >
        <DialogContent
          className="z-[115]"
          overlayClassName="z-[113]"
        >
          <DialogHeader>
            <DialogTitle>{catAddOpen ? "Новая категория" : "Редактирование категории"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>Название</Label>
              <Input
                value={catForm.name}
                onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Цвет</Label>
              <Select
                value={catForm.color}
                onValueChange={(v) => setCatForm((f) => ({ ...f, color: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLOR_PRESETS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: p.value }}
                        />
                        {p.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Описание</Label>
              <Textarea
                rows={3}
                value={catForm.description}
                onChange={(e) => setCatForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            {catFormError && <p className="text-sm text-destructive">{catFormError}</p>}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCatAddOpen(false)
                setCatEdit(null)
              }}
            >
              Отмена
            </Button>
            <Button
              type="button"
              disabled={catSaving}
              onClick={() => void saveCategory(catAddOpen ? "add" : "edit")}
            >
              {catSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!catDelete} onOpenChange={(o) => !o && setCatDelete(null)}>
        <AlertDialogContent
          className="z-[115]"
          overlayClassName="z-[113]"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить категорию?</AlertDialogTitle>
            <AlertDialogDescription>
              {catDelete &&
                (catDelete.equipmentCount > 0
                  ? `К категории «${catDelete.name}» привязано ${catDelete.equipmentCount} ед. оборудования. Кнопка ниже отвяжет все записи от этой категории и удалит её.`
                  : `«${catDelete.name}» можно удалить только если к ней не привязано оборудование.`)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel disabled={catDeleteBusy}>Отмена</AlertDialogCancel>
            {catDelete && catDelete.equipmentCount > 0 ? (
              <Button
                type="button"
                variant="destructive"
                disabled={catDeleteBusy}
                onClick={() => void doDeleteCategory(true)}
              >
                {catDeleteBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Отвязать всё оборудование и удалить
              </Button>
            ) : (
              <Button
                type="button"
                variant="destructive"
                disabled={catDeleteBusy}
                onClick={() => void doDeleteCategory(false)}
              >
                {catDeleteBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Удалить
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={kindAddOpen || !!kindEdit}
        onOpenChange={(o) => {
          if (!o) {
            setKindAddOpen(false)
            setKindEdit(null)
          }
        }}
      >
        <DialogContent
          className="z-[115]"
          overlayClassName="z-[113]"
        >
          <DialogHeader>
            <DialogTitle>{kindAddOpen ? "Новый тип" : "Редактирование типа"}</DialogTitle>
            <DialogDescription>
              Поле «Системный класс» задаёт соответствие внутреннему типу (например, для конфигурации ПК).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>Название</Label>
              <Input
                value={kindForm.name}
                onChange={(e) => setKindForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Системный класс</Label>
              <Select
                value={kindForm.mapsToEnum}
                onValueChange={(v) => setKindForm((f) => ({ ...f, mapsToEnum: v as EquipmentType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_TYPE_ENUM_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Описание</Label>
              <Textarea
                rows={3}
                value={kindForm.description}
                onChange={(e) => setKindForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            {kindFormError && <p className="text-sm text-destructive">{kindFormError}</p>}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setKindAddOpen(false)
                setKindEdit(null)
              }}
            >
              Отмена
            </Button>
            <Button
              type="button"
              disabled={kindSaving}
              onClick={() => void saveKind(kindAddOpen ? "add" : "edit")}
            >
              {kindSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!kindDelete} onOpenChange={(o) => !o && setKindDelete(null)}>
        <AlertDialogContent
          className="z-[115]"
          overlayClassName="z-[113]"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить тип?</AlertDialogTitle>
            <AlertDialogDescription>
              {kindDelete &&
                (kindDelete.equipmentCount > 0
                  ? `К типу «${kindDelete.name}» привязано ${kindDelete.equipmentCount} ед. оборудования. Кнопка ниже отвяжет все записи от этого типа и удалит его.`
                  : `«${kindDelete.name}» можно удалить только если к нему не привязано оборудование.`)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel disabled={kindDeleteBusy}>Отмена</AlertDialogCancel>
            {kindDelete && kindDelete.equipmentCount > 0 ? (
              <Button
                type="button"
                variant="destructive"
                disabled={kindDeleteBusy}
                onClick={() => void doDeleteKind(true)}
              >
                {kindDeleteBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Отвязать всё оборудование и удалить
              </Button>
            ) : (
              <Button
                type="button"
                variant="destructive"
                disabled={kindDeleteBusy}
                onClick={() => void doDeleteKind(false)}
              >
                {kindDeleteBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Удалить
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
