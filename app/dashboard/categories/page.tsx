"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Package,
  Folder,
  X,
  RefreshCw
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
import { Separator } from "@/components/ui/separator"
import { getMockSession, getCurrentMockPermissions, type MockSession, type MockPermissions } from "@/lib/mock-auth"

// Типы
interface Category {
  id: string
  name: string
  slug: string
  description: string
  color: string
  equipmentCount: number
  createdAt: string
}

// Mock данные категорий
const mockCategories: Category[] = [
  {
    id: "1",
    name: "Компьютеры и комплектующие",
    slug: "computers",
    description: "Системные блоки, ноутбуки, процессоры, память и другие компьютерные комплектующие",
    color: "#3b82f6",
    equipmentCount: 45,
    createdAt: "2024-01-10"
  },
  {
    id: "2",
    name: "Мониторы и дисплеи",
    slug: "monitors",
    description: "Мониторы различных диагоналей, интерактивные панели, видеостены",
    color: "#10b981",
    equipmentCount: 32,
    createdAt: "2024-01-10"
  },
  {
    id: "3",
    name: "Периферийные устройства",
    slug: "peripherals",
    description: "Клавиатуры, мыши, веб-камеры, гарнитуры и другие устройства ввода",
    color: "#f59e0b",
    equipmentCount: 78,
    createdAt: "2024-01-10"
  },
  {
    id: "4",
    name: "Печатное оборудование",
    slug: "printing",
    description: "Принтеры, МФУ, сканеры, плоттеры",
    color: "#ef4444",
    equipmentCount: 15,
    createdAt: "2024-01-15"
  },
  {
    id: "5",
    name: "Сетевое оборудование",
    slug: "network",
    description: "Маршрутизаторы, коммутаторы, точки доступа, сетевые карты",
    color: "#8b5cf6",
    equipmentCount: 23,
    createdAt: "2024-02-01"
  },
  {
    id: "6",
    name: "Проекционное оборудование",
    slug: "projection",
    description: "Проекторы, экраны, интерактивные доски",
    color: "#06b6d4",
    equipmentCount: 12,
    createdAt: "2024-02-10"
  },
  {
    id: "7",
    name: "Аудио оборудование",
    slug: "audio",
    description: "Колонки, микрофоны, звуковые карты, усилители",
    color: "#ec4899",
    equipmentCount: 18,
    createdAt: "2024-02-15"
  },
  {
    id: "8",
    name: "Серверное оборудование",
    slug: "servers",
    description: "Серверы, системы хранения данных, ИБП",
    color: "#64748b",
    equipmentCount: 8,
    createdAt: "2024-03-01"
  }
]

// Доступные цвета для категорий
const availableColors = [
  { name: "Синий", value: "#3b82f6" },
  { name: "Зелёный", value: "#10b981" },
  { name: "Жёлтый", value: "#f59e0b" },
  { name: "Красный", value: "#ef4444" },
  { name: "Фиолетовый", value: "#8b5cf6" },
  { name: "Голубой", value: "#06b6d4" },
  { name: "Розовый", value: "#ec4899" },
  { name: "Серый", value: "#64748b" },
  { name: "Оранжевый", value: "#f97316" },
  { name: "Лайм", value: "#84cc16" },
]

export default function CategoriesPage() {
  const [session, setSession] = useState<MockSession | null>(null)
  const [permissions, setPermissions] = useState<MockPermissions | null>(null)
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  
  // Поиск
  const [searchQuery, setSearchQuery] = useState("")
  
  // Диалоги
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  
  // Форма
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    color: "#3b82f6"
  })
  
  useEffect(() => {
    setSession(getMockSession())
    setPermissions(getCurrentMockPermissions())
  }, [])
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setCategories(mockCategories)
      setLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [])
  
  // Фильтрация
  const filteredCategories = useMemo(() => {
    return categories.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.slug.toLowerCase().includes(searchQuery.toLowerCase())
      
      return matchesSearch
    })
  }, [categories, searchQuery])
  
  // Статистика
  const stats = useMemo(() => {
    const totalCategories = categories.length
    const totalEquipment = categories.reduce((sum, cat) => sum + cat.equipmentCount, 0)
    const emptyCategories = categories.filter(cat => cat.equipmentCount === 0).length
    return { totalCategories, totalEquipment, emptyCategories }
  }, [categories])
  
  // Генерация slug из названия
  const generateSlug = (name: string) => {
    const translitMap: Record<string, string> = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
      'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
      'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts',
      'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
      ' ': '-'
    }
    return name.toLowerCase()
      .split('')
      .map(char => translitMap[char] || char)
      .join('')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }
  
  // Handlers
  const handleView = (item: Category) => {
    setSelectedCategory(item)
    setViewDialogOpen(true)
  }
  
  const handleEdit = (item: Category) => {
    setSelectedCategory(item)
    setFormData({
      name: item.name,
      slug: item.slug,
      description: item.description,
      color: item.color
    })
    setEditDialogOpen(true)
  }
  
  const handleDelete = (item: Category) => {
    setSelectedCategory(item)
    setDeleteDialogOpen(true)
  }
  
  const handleAdd = () => {
    setFormData({
      name: "",
      slug: "",
      description: "",
      color: "#3b82f6"
    })
    setAddDialogOpen(true)
  }
  
  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: generateSlug(name)
    })
  }
  
  const handleSaveNew = () => {
    const newCategory: Category = {
      id: String(Date.now()),
      name: formData.name,
      slug: formData.slug,
      description: formData.description,
      color: formData.color,
      equipmentCount: 0,
      createdAt: new Date().toISOString().split("T")[0]
    }
    setCategories([...categories, newCategory])
    setAddDialogOpen(false)
  }
  
  const handleSaveEdit = () => {
    if (!selectedCategory) return
    setCategories(categories.map(item => 
      item.id === selectedCategory.id 
        ? { ...item, ...formData }
        : item
    ))
    setEditDialogOpen(false)
  }
  
  const handleConfirmDelete = () => {
    if (!selectedCategory) return
    setCategories(categories.filter(item => item.id !== selectedCategory.id))
    setDeleteDialogOpen(false)
  }
  
  if (!session || !permissions) {
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
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
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
  
  const isAdmin = session.user.role === "ADMIN"
  
  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Категории оборудования</h1>
          <p className="text-muted-foreground">
            Управление категориями для классификации оборудования
          </p>
        </div>
        {isAdmin && (
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить категорию
          </Button>
        )}
      </div>
      
      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Всего категорий</CardTitle>
            <Folder className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.totalCategories}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Всего оборудования</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.totalEquipment}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Пустых категорий</CardTitle>
            <Folder className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-muted-foreground">{stats.emptyCategories}</div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Поиск */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Поиск</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию, описанию..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchQuery && (
              <Button variant="ghost" size="icon" onClick={() => setSearchQuery("")}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Таблица категорий */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Список категорий</CardTitle>
              <CardDescription>
                {loading ? "Загрузка..." : `Найдено ${filteredCategories.length} из ${categories.length} категорий`}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 500) }}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Обновить
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Folder className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Категории не найдены</h3>
              <p className="text-muted-foreground">Попробуйте изменить параметры поиска</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Название</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Описание</TableHead>
                    <TableHead className="text-center">Оборудования</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div 
                          className="h-10 w-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: item.color + '20' }}
                        >
                          <Folder className="h-5 w-5" style={{ color: item.color }} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{item.name}</div>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-2 py-1 rounded">{item.slug}</code>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{item.equipmentCount}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Меню</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Действия</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleView(item)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Просмотр
                            </DropdownMenuItem>
                            {isAdmin && (
                              <>
                                <DropdownMenuItem onClick={() => handleEdit(item)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Редактировать
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(item)}
                                  className="text-destructive focus:text-destructive"
                                  disabled={item.equipmentCount > 0}
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
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Диалог просмотра */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Информация о категории</DialogTitle>
            <DialogDescription>Детальная информация о категории оборудования</DialogDescription>
          </DialogHeader>
          {selectedCategory && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div 
                  className="h-16 w-16 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: selectedCategory.color + '20' }}
                >
                  <Folder className="h-8 w-8" style={{ color: selectedCategory.color }} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedCategory.name}</h3>
                  <code className="text-sm bg-muted px-2 py-1 rounded">{selectedCategory.slug}</code>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <div>
                  <Label className="text-muted-foreground">Описание</Label>
                  <p className="text-sm mt-1">{selectedCategory.description || "Нет описания"}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Оборудования в категории</Label>
                    <p className="text-2xl font-bold mt-1">{selectedCategory.equipmentCount}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Дата создания</Label>
                    <p className="text-sm mt-1">{selectedCategory.createdAt}</p>
                  </div>
                </div>
                
                <div>
                  <Label className="text-muted-foreground">Цвет</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <div 
                      className="h-6 w-6 rounded-full border"
                      style={{ backgroundColor: selectedCategory.color }}
                    />
                    <span className="text-sm font-mono">{selectedCategory.color}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Диалог добавления */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Добавить категорию</DialogTitle>
            <DialogDescription>Создайте новую категорию для классификации оборудования</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Название</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Например: Сетевое оборудование"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slug">Slug (идентификатор)</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="network-equipment"
              />
              <p className="text-xs text-muted-foreground">
                Автоматически генерируется из названия
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Описание категории..."
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label>Цвет</Label>
              <div className="flex flex-wrap gap-2">
                {availableColors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`h-8 w-8 rounded-full border-2 transition-all ${
                      formData.color === color.value 
                        ? 'border-foreground scale-110' 
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveNew} disabled={!formData.name.trim()}>
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Диалог редактирования */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Редактировать категорию</DialogTitle>
            <DialogDescription>Измените информацию о категории</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Название</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-slug">Slug (идентификатор)</Label>
              <Input
                id="edit-slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Описание</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label>Цвет</Label>
              <div className="flex flex-wrap gap-2">
                {availableColors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`h-8 w-8 rounded-full border-2 transition-all ${
                      formData.color === color.value 
                        ? 'border-foreground scale-110' 
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveEdit} disabled={!formData.name.trim()}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Диалог удаления */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить категорию?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы действительно хотите удалить категорию "{selectedCategory?.name}"?
              {selectedCategory && selectedCategory.equipmentCount > 0 && (
                <span className="block mt-2 text-destructive">
                  Внимание: в этой категории {selectedCategory.equipmentCount} единиц оборудования. 
                  Сначала переместите их в другую категорию.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={selectedCategory?.equipmentCount ? selectedCategory.equipmentCount > 0 : false}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
