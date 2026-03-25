"use client"

import { useState, useEffect, useMemo } from "react"

import Link from "next/link"
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Monitor,
  Keyboard,
  Mouse,
  HardDrive,
  Cpu,
  Printer,
  RefreshCw,
  Download,
  SlidersHorizontal,
  X,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Package
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
  DialogTrigger,
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
type EquipmentStatus = "working" | "faulty" | "repair" | "written_off"
type EquipmentType = "monitor" | "keyboard" | "mouse" | "system_unit" | "printer" | "projector" | "other"

interface Category {
  id: string
  name: string
  color: string
}

interface Equipment {
  id: string
  name: string
  type: EquipmentType
  categoryId: string
  inventoryNumber: string
  serialNumber: string
  status: EquipmentStatus
  classroom: string
  workstation: string
  description: string
  purchaseDate: string
  lastMaintenance: string | null
}

// Mock данные категорий
const mockCategories: Category[] = [
  { id: "1", name: "Компьютеры и комплектующие", color: "#3b82f6" },
  { id: "2", name: "Мониторы и дисплеи", color: "#10b981" },
  { id: "3", name: "Периферийные устройства", color: "#f59e0b" },
  { id: "4", name: "Печатное оборудование", color: "#ef4444" },
  { id: "5", name: "Сетевое оборудование", color: "#8b5cf6" },
  { id: "6", name: "Проекционное оборудование", color: "#06b6d4" },
  { id: "7", name: "Аудио оборудование", color: "#ec4899" },
  { id: "8", name: "Серверное оборудование", color: "#64748b" },
]

// Mock данные оборудования
const mockEquipment: Equipment[] = [
  {
    id: "1",
    name: "Монитор Samsung 24 дюйма",
    type: "monitor",
    categoryId: "2",
    inventoryNumber: "INV-2024-001",
    serialNumber: "SN-SAM-24-001",
    status: "working",
    classroom: "Аудитория 301",
    workstation: "Рабочее место 1",
    description: "LED монитор Full HD",
    purchaseDate: "2024-01-15",
    lastMaintenance: "2025-02-10"
  },
  {
    id: "2",
    name: "Системный блок Dell OptiPlex",
    type: "system_unit",
    categoryId: "1",
    inventoryNumber: "INV-2024-002",
    serialNumber: "SN-DELL-001",
    status: "working",
    classroom: "Аудитория 301",
    workstation: "Рабочее место 1",
    description: "Intel Core i5, 16GB RAM, 512GB SSD",
    purchaseDate: "2024-01-15",
    lastMaintenance: "2025-03-01"
  },
  {
    id: "3",
    name: "Клавиатура Logitech K120",
    type: "keyboard",
    categoryId: "3",
    inventoryNumber: "INV-2024-003",
    serialNumber: "SN-LOG-K-001",
    status: "working",
    classroom: "Аудитория 301",
    workstation: "Рабочее место 1",
    description: "USB клавиатура",
    purchaseDate: "2024-01-15",
    lastMaintenance: null
  },
  {
    id: "4",
    name: "Мышь Logitech M185",
    type: "mouse",
    categoryId: "3",
    inventoryNumber: "INV-2024-004",
    serialNumber: "SN-LOG-M-001",
    status: "faulty",
    classroom: "Аудитория 301",
    workstation: "Рабочее место 1",
    description: "Беспроводная мышь",
    purchaseDate: "2024-01-15",
    lastMaintenance: null
  },
  {
    id: "5",
    name: "Монитор LG 27 дюймов",
    type: "monitor",
    categoryId: "2",
    inventoryNumber: "INV-2024-005",
    serialNumber: "SN-LG-27-001",
    status: "repair",
    classroom: "Компьютерный класс 105",
    workstation: "Рабочее место 3",
    description: "IPS монитор 2K",
    purchaseDate: "2023-09-01",
    lastMaintenance: "2025-03-15"
  },
  {
    id: "6",
    name: "Принтер HP LaserJet Pro",
    type: "printer",
    categoryId: "4",
    inventoryNumber: "INV-2024-006",
    serialNumber: "SN-HP-LJ-001",
    status: "working",
    classroom: "Аудитория 301",
    workstation: "Общее",
    description: "Лазерный принтер A4",
    purchaseDate: "2023-06-15",
    lastMaintenance: "2025-01-20"
  },
  {
    id: "7",
    name: "Проектор Epson EB-X51",
    type: "projector",
    categoryId: "6",
    inventoryNumber: "INV-2024-007",
    serialNumber: "SN-EPS-X51-001",
    status: "working",
    classroom: "Лекционный зал 401",
    workstation: "Потолок",
    description: "3LCD проектор 3800 люмен",
    purchaseDate: "2022-12-01",
    lastMaintenance: "2025-02-28"
  },
  {
    id: "8",
    name: "Системный блок HP ProDesk",
    type: "system_unit",
    categoryId: "1",
    inventoryNumber: "INV-2024-008",
    serialNumber: "SN-HP-PD-001",
    status: "written_off",
    classroom: "Склад",
    workstation: "-",
    description: "Intel Core i3, 8GB RAM, 256GB HDD",
    purchaseDate: "2019-03-10",
    lastMaintenance: "2024-06-01"
  },
  {
    id: "9",
    name: "Монитор ASUS 22 дюйма",
    type: "monitor",
    categoryId: "2",
    inventoryNumber: "INV-2024-009",
    serialNumber: "SN-ASUS-22-001",
    status: "working",
    classroom: "Компьютерный класс 105",
    workstation: "Рабочее место 1",
    description: "TN монитор Full HD",
    purchaseDate: "2024-02-20",
    lastMaintenance: null
  },
  {
    id: "10",
    name: "Клавиатура Microsoft Ergonomic",
    type: "keyboard",
    categoryId: "3",
    inventoryNumber: "INV-2024-010",
    serialNumber: "SN-MS-ERG-001",
    status: "working",
    classroom: "Компьютерный класс 105",
    workstation: "Рабочее место 2",
    description: "Эргономичная USB клавиатура",
    purchaseDate: "2024-02-20",
    lastMaintenance: null
  },
]

// Список аудиторий для фильтрации
const classrooms = [
  "Все аудитории",
  "Аудитория 301",
  "Компьютерный класс 105",
  "Лекционный зал 401",
  "Лаборатория 201",
  "Склад"
]

// Список рабочих мест для фильтрации
const workstations = [
  "Все рабочие места",
  "Рабочее место 1",
  "Рабочее место 2",
  "Рабочее место 3",
  "Общее",
  "Потолок",
  "-"
]

// Helper функции
const getStatusInfo = (status: EquipmentStatus) => {
  switch (status) {
    case "working":
      return { label: "Исправно", variant: "default" as const, icon: CheckCircle2, color: "text-green-600" }
    case "faulty":
      return { label: "Неисправно", variant: "destructive" as const, icon: AlertTriangle, color: "text-red-600" }
    case "repair":
      return { label: "В ремонте", variant: "secondary" as const, icon: Wrench, color: "text-blue-600" }
    case "written_off":
      return { label: "Списано", variant: "outline" as const, icon: Package, color: "text-muted-foreground" }
  }
}

const getTypeInfo = (type: EquipmentType) => {
  switch (type) {
    case "monitor":
      return { label: "Монитор", icon: Monitor }
    case "keyboard":
      return { label: "Клавиатура", icon: Keyboard }
    case "mouse":
      return { label: "Мышь", icon: Mouse }
    case "system_unit":
      return { label: "Системный блок", icon: Cpu }
    case "printer":
      return { label: "Принтер", icon: Printer }
    case "projector":
      return { label: "Проектор", icon: Monitor }
    case "other":
      return { label: "Другое", icon: HardDrive }
  }
}

export default function EquipmentPage() {
  const [session, setSession] = useState<MockSession | null>(null)
  const [permissions, setPermissions] = useState<MockPermissions | null>(null)
  const [loading, setLoading] = useState(true)
  const [equipment, setEquipment] = useState<Equipment[]>([])
  
  // Фильтры
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedClassroom, setSelectedClassroom] = useState("Все аудитории")
  const [selectedWorkstation, setSelectedWorkstation] = useState("Все рабочие места")
  const [selectedStatus, setSelectedStatus] = useState<EquipmentStatus | "all">("all")
  const [selectedType, setSelectedType] = useState<EquipmentType | "all">("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  
  // Диалоги
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)
  
  // Форма добавления/редактирования
  const [formData, setFormData] = useState({
    name: "",
    type: "monitor" as EquipmentType,
    categoryId: "1",
    inventoryNumber: "",
    serialNumber: "",
    status: "working" as EquipmentStatus,
    classroom: "",
    workstation: "",
    description: ""
  })
  
  useEffect(() => {
    setSession(getMockSession())
    setPermissions(getCurrentMockPermissions())
  }, [])
  
  useEffect(() => {
    // Симуляция загрузки данных
    const timer = setTimeout(() => {
      setEquipment(mockEquipment)
      setLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [])
  
  // Фильтрация данных
  const filteredEquipment = useMemo(() => {
    return equipment.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.inventoryNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.serialNumber.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesClassroom = selectedClassroom === "Все аудитории" || item.classroom === selectedClassroom
      const matchesWorkstation = selectedWorkstation === "Все рабочие места" || item.workstation === selectedWorkstation
      const matchesStatus = selectedStatus === "all" || item.status === selectedStatus
      const matchesType = selectedType === "all" || item.type === selectedType
      const matchesCategory = selectedCategory === "all" || item.categoryId === selectedCategory
      
      return matchesSearch && matchesClassroom && matchesWorkstation && matchesStatus && matchesType && matchesCategory
    })
  }, [equipment, searchQuery, selectedClassroom, selectedWorkstation, selectedStatus, selectedType, selectedCategory])
  
  // Получить категорию по ID
  const getCategoryById = (id: string) => mockCategories.find(c => c.id === id)
  
  // Статистика
  const stats = useMemo(() => {
    const total = equipment.length
    const working = equipment.filter(e => e.status === "working").length
    const faulty = equipment.filter(e => e.status === "faulty").length
    const inRepair = equipment.filter(e => e.status === "repair").length
    return { total, working, faulty, inRepair }
  }, [equipment])
  
  // Сброс фильтров
  const resetFilters = () => {
    setSearchQuery("")
    setSelectedClassroom("Все аудитории")
    setSelectedWorkstation("Все рабочие места")
    setSelectedStatus("all")
    setSelectedType("all")
    setSelectedCategory("all")
  }
  
  // Открытие диалогов
  const handleView = (item: Equipment) => {
    setSelectedEquipment(item)
    setViewDialogOpen(true)
  }
  
  const handleEdit = (item: Equipment) => {
    setSelectedEquipment(item)
    setFormData({
      name: item.name,
      type: item.type,
      categoryId: item.categoryId,
      inventoryNumber: item.inventoryNumber,
      serialNumber: item.serialNumber,
      status: item.status,
      classroom: item.classroom,
      workstation: item.workstation,
      description: item.description
    })
    setEditDialogOpen(true)
  }
  
  const handleDelete = (item: Equipment) => {
    setSelectedEquipment(item)
    setDeleteDialogOpen(true)
  }
  
  const handleAdd = () => {
    setFormData({
      name: "",
      type: "monitor",
      categoryId: "1",
      inventoryNumber: "",
      serialNumber: "",
      status: "working",
      classroom: "",
      workstation: "",
      description: ""
    })
    setAddDialogOpen(true)
  }
  
  // Сохранение
  const handleSaveNew = () => {
    const newEquipment: Equipment = {
      id: String(Date.now()),
      name: formData.name,
      type: formData.type,
      categoryId: formData.categoryId,
      inventoryNumber: formData.inventoryNumber,
      serialNumber: formData.serialNumber,
      status: formData.status,
      classroom: formData.classroom,
      workstation: formData.workstation,
      description: formData.description,
      purchaseDate: new Date().toISOString().split("T")[0],
      lastMaintenance: null
    }
    setEquipment([...equipment, newEquipment])
    setAddDialogOpen(false)
  }
  
  const handleSaveEdit = () => {
    if (!selectedEquipment) return
    setEquipment(equipment.map(item => 
      item.id === selectedEquipment.id 
        ? { ...item, ...formData }
        : item
    ))
    setEditDialogOpen(false)
  }
  
  const handleConfirmDelete = () => {
    if (!selectedEquipment) return
    setEquipment(equipment.filter(item => item.id !== selectedEquipment.id))
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
          <CardHeader className="pb-4">
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  const isAdmin = session.user.role === "ADMIN"
  const hasFilters = searchQuery || selectedClassroom !== "Все аудитории" || selectedWorkstation !== "Все рабочие места" || selectedStatus !== "all" || selectedType !== "all" || selectedCategory !== "all"
  
  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Управление оборудованием</h1>
          <p className="text-muted-foreground">
            {isAdmin ? "Добавление, редактирование и удаление оборудования" : "Просмотр доступного оборудования"}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Экспорт
            </Button>
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Добавить оборудование
            </Button>
          </div>
        )}
      </div>
      
      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-4">
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
              <div className="text-2xl font-bold text-green-600">{stats.working}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Неисправно</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-red-600">{stats.faulty}</div>
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
      
      {/* Фильтры */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Фильтры</CardTitle>
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="mr-2 h-4 w-4" />
                Сбросить
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {/* Поиск */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию, инв. номеру..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Аудитория */}
            <Select value={selectedClassroom} onValueChange={setSelectedClassroom}>
              <SelectTrigger>
                <SelectValue placeholder="Аудитория" />
              </SelectTrigger>
              <SelectContent>
                {classrooms.map((classroom) => (
                  <SelectItem key={classroom} value={classroom}>
                    {classroom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Рабочее место */}
            <Select value={selectedWorkstation} onValueChange={setSelectedWorkstation}>
              <SelectTrigger>
                <SelectValue placeholder="Рабочее место" />
              </SelectTrigger>
              <SelectContent>
                {workstations.map((ws) => (
                  <SelectItem key={ws} value={ws}>
                    {ws}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Статус */}
            <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as EquipmentStatus | "all")}>
              <SelectTrigger>
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="working">Исправно</SelectItem>
                <SelectItem value="faulty">Неисправно</SelectItem>
                <SelectItem value="repair">В ремонте</SelectItem>
                <SelectItem value="written_off">Списано</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Категория */}
          <div className="mt-4">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Категория" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все категории</SelectItem>
                {mockCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: cat.color }} 
                      />
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {/* Таблица оборудования */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Список оборудования</CardTitle>
              <CardDescription>
                {loading ? "Загрузка..." : `Найдено ${filteredEquipment.length} из ${equipment.length} единиц`}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setLoading(true)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Обновить
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : filteredEquipment.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Оборудование не найдено</h3>
              <p className="text-muted-foreground">Попробуйте изменить параметры фильтрации</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Название</TableHead>
                    <TableHead>Категория</TableHead>
                    <TableHead>Инв. номер</TableHead>
                    <TableHead>Аудитория</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEquipment.map((item) => {
                    const typeInfo = getTypeInfo(item.type)
                    const statusInfo = getStatusInfo(item.status)
                    const TypeIcon = typeInfo.icon
                    const category = getCategoryById(item.categoryId)
                    
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                            <TypeIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-muted-foreground">{typeInfo.label}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {category && (
                            <Badge 
                              variant="outline" 
                              className="whitespace-nowrap"
                              style={{ 
                                borderColor: category.color,
                                color: category.color,
                                backgroundColor: category.color + '10'
                              }}
                            >
                              {category.name}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{item.inventoryNumber}</TableCell>
                        <TableCell>{item.classroom}</TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
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
                  })}
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
            <DialogTitle>Информация об оборудовании</DialogTitle>
          </DialogHeader>
          {selectedEquipment && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
                  {(() => {
                    const TypeIcon = getTypeInfo(selectedEquipment.type).icon
                    return <TypeIcon className="h-8 w-8 text-muted-foreground" />
                  })()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedEquipment.name}</h3>
                  <p className="text-sm text-muted-foreground">{getTypeInfo(selectedEquipment.type).label}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Инвентарный номер</Label>
                  <p className="font-mono">{selectedEquipment.inventoryNumber}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Серийный номер</Label>
                  <p className="font-mono">{selectedEquipment.serialNumber}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Категория</Label>
                  <div className="mt-1">
                    {(() => {
                      const cat = getCategoryById(selectedEquipment.categoryId)
                      return cat ? (
                        <Badge 
                          variant="outline"
                          style={{ 
                            borderColor: cat.color,
                            color: cat.color,
                            backgroundColor: cat.color + '10'
                          }}
                        >
                          {cat.name}
                        </Badge>
                      ) : <span className="text-muted-foreground">Не указана</span>
                    })()}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Аудитория</Label>
                  <p>{selectedEquipment.classroom}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Рабочее место</Label>
                  <p>{selectedEquipment.workstation}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Статус</Label>
                  <div className="mt-1">
                    <Badge variant={getStatusInfo(selectedEquipment.status).variant}>
                      {getStatusInfo(selectedEquipment.status).label}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Дата покупки</Label>
                  <p>{selectedEquipment.purchaseDate}</p>
                </div>
              </div>
              
              {selectedEquipment.description && (
                <div>
                  <Label className="text-muted-foreground">Описание</Label>
                  <p className="text-sm">{selectedEquipment.description}</p>
                </div>
              )}
              
              {selectedEquipment.lastMaintenance && (
                <div>
                  <Label className="text-muted-foreground">Последнее обслуживание</Label>
                  <p className="text-sm">{selectedEquipment.lastMaintenance}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Диалог добавления */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Добавить оборудование</DialogTitle>
            <DialogDescription>
              Заполните информацию о новом оборудовании
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Название</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Например: Монитор Samsung 24 дюйма"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Тип</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as EquipmentType })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monitor">Монитор</SelectItem>
                    <SelectItem value="keyboard">Клавиатура</SelectItem>
                    <SelectItem value="mouse">Мышь</SelectItem>
                    <SelectItem value="system_unit">Системный блок</SelectItem>
                    <SelectItem value="printer">Принтер</SelectItem>
                    <SelectItem value="projector">Проектор</SelectItem>
                    <SelectItem value="other">Другое</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Статус</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as EquipmentStatus })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="working">Исправно</SelectItem>
                    <SelectItem value="faulty">Неисправно</SelectItem>
                    <SelectItem value="repair">В ремонте</SelectItem>
                    <SelectItem value="written_off">Списано</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Категория</Label>
              <Select value={formData.categoryId} onValueChange={(value) => setFormData({ ...formData, categoryId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {mockCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-3 w-3 rounded-full" 
                          style={{ backgroundColor: cat.color }} 
                        />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="inventoryNumber">Инвентарный номер</Label>
                <Input
                  id="inventoryNumber"
                  value={formData.inventoryNumber}
                  onChange={(e) => setFormData({ ...formData, inventoryNumber: e.target.value })}
                  placeholder="INV-2024-XXX"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="serialNumber">Серийный номер</Label>
                <Input
                  id="serialNumber"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                  placeholder="SN-XXX-XXX"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="classroom">Аудитория</Label>
                <Select value={formData.classroom} onValueChange={(value) => setFormData({ ...formData, classroom: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите аудиторию" />
                  </SelectTrigger>
                  <SelectContent>
                    {classrooms.filter(c => c !== "Все аудитории").map((classroom) => (
                      <SelectItem key={classroom} value={classroom}>
                        {classroom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="workstation">Рабочее место</Label>
                <Input
                  id="workstation"
                  value={formData.workstation}
                  onChange={(e) => setFormData({ ...formData, workstation: e.target.value })}
                  placeholder="Рабочее место 1"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Дополнительная информация об оборудовании..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveNew}>Добавить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Диалог редактирования */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Редактировать оборудование</DialogTitle>
            <DialogDescription>
              Измените информацию об оборудовании
            </DialogDescription>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-type">Тип</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as EquipmentType })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monitor">Монитор</SelectItem>
                    <SelectItem value="keyboard">Клавиатура</SelectItem>
                    <SelectItem value="mouse">Мышь</SelectItem>
                    <SelectItem value="system_unit">Системный блок</SelectItem>
                    <SelectItem value="printer">Принтер</SelectItem>
                    <SelectItem value="projector">Проектор</SelectItem>
                    <SelectItem value="other">Другое</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-status">Статус</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as EquipmentStatus })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="working">Исправно</SelectItem>
                    <SelectItem value="faulty">Неисправно</SelectItem>
                    <SelectItem value="repair">В ремонте</SelectItem>
                    <SelectItem value="written_off">Списано</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-category">Категория</Label>
              <Select value={formData.categoryId} onValueChange={(value) => setFormData({ ...formData, categoryId: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mockCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-3 w-3 rounded-full" 
                          style={{ backgroundColor: cat.color }} 
                        />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-inventoryNumber">Инвентарный номер</Label>
                <Input
                  id="edit-inventoryNumber"
                  value={formData.inventoryNumber}
                  onChange={(e) => setFormData({ ...formData, inventoryNumber: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-serialNumber">Серийный номер</Label>
                <Input
                  id="edit-serialNumber"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-classroom">Аудитория</Label>
                <Select value={formData.classroom} onValueChange={(value) => setFormData({ ...formData, classroom: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {classrooms.filter(c => c !== "Все аудитории").map((classroom) => (
                      <SelectItem key={classroom} value={classroom}>
                        {classroom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-workstation">Рабочее место</Label>
                <Input
                  id="edit-workstation"
                  value={formData.workstation}
                  onChange={(e) => setFormData({ ...formData, workstation: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Описание</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveEdit}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Диалог подтверждения удаления */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить оборудование?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить &quot;{selectedEquipment?.name}&quot;? 
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
