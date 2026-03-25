"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  School,
  Users,
  Monitor,
  DoorOpen,
  Building2,
  X,
  RefreshCw,
  Download,
  Settings,
  Tag
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getMockSession, getCurrentMockPermissions, type MockSession, type MockPermissions } from "@/lib/mock-auth"

// Типы
type ClassroomStatus = "active" | "inactive" | "maintenance"

interface ClassroomType {
  id: string
  name: string
  code: string
  color: string
  description: string
}

interface Building {
  id: string
  name: string
  address: string
  floors: number
  description: string
}

interface Classroom {
  id: string
  name: string
  number: string
  typeId: string
  status: ClassroomStatus
  buildingId: string
  floor: number
  capacity: number
  workstations: number
  equipment: number
  description: string
  responsiblePerson: string
}

// Mock данные типов аудиторий
const initialClassroomTypes: ClassroomType[] = [
  { id: "1", name: "Лекционный зал", code: "lecture_hall", color: "bg-blue-100 text-blue-800", description: "Большие залы для лекций" },
  { id: "2", name: "Компьютерный класс", code: "computer_lab", color: "bg-green-100 text-green-800", description: "Классы с компьютерами" },
  { id: "3", name: "Учебная аудитория", code: "classroom", color: "bg-slate-100 text-slate-800", description: "Стандартные учебные аудитории" },
  { id: "4", name: "Лаборатория", code: "laboratory", color: "bg-purple-100 text-purple-800", description: "Лабораторные помещения" },
  { id: "5", name: "Конференц-зал", code: "conference", color: "bg-amber-100 text-amber-800", description: "Залы для конференций" },
  { id: "6", name: "Склад", code: "storage", color: "bg-gray-100 text-gray-800", description: "Складские помещения" },
]

// Mock данные корпусов
const initialBuildings: Building[] = [
  { id: "1", name: "Главный корпус", address: "ул. Университетская, 1", floors: 5, description: "Основной учебный корпус" },
  { id: "2", name: "Корпус Б", address: "ул. Университетская, 3", floors: 4, description: "Дополнительный учебный корпус" },
]

// Mock данные аудиторий
const initialClassrooms: Classroom[] = [
  {
    id: "1",
    name: "Аудитория 301",
    number: "301",
    typeId: "3",
    status: "active",
    buildingId: "1",
    floor: 3,
    capacity: 30,
    workstations: 15,
    equipment: 32,
    description: "Учебная аудитория для лекций и семинаров",
    responsiblePerson: "Иванов И.И."
  },
  {
    id: "2",
    name: "Компьютерный класс 105",
    number: "105",
    typeId: "2",
    status: "active",
    buildingId: "1",
    floor: 1,
    capacity: 24,
    workstations: 12,
    equipment: 48,
    description: "Компьютерный класс для практических занятий",
    responsiblePerson: "Петров П.П."
  },
  {
    id: "3",
    name: "Лекционный зал 401",
    number: "401",
    typeId: "1",
    status: "active",
    buildingId: "1",
    floor: 4,
    capacity: 120,
    workstations: 1,
    equipment: 15,
    description: "Большой лекционный зал с проектором и звуковой системой",
    responsiblePerson: "Сидоров С.С."
  },
  {
    id: "4",
    name: "Лаборатория 201",
    number: "201",
    typeId: "4",
    status: "active",
    buildingId: "2",
    floor: 2,
    capacity: 20,
    workstations: 10,
    equipment: 35,
    description: "Лаборатория для научных исследований",
    responsiblePerson: "Козлов К.К."
  },
  {
    id: "5",
    name: "Конференц-зал",
    number: "501",
    typeId: "5",
    status: "maintenance",
    buildingId: "1",
    floor: 5,
    capacity: 50,
    workstations: 1,
    equipment: 12,
    description: "Конференц-зал для совещаний и презентаций (на ремонте)",
    responsiblePerson: "Николаев Н.Н."
  },
  {
    id: "6",
    name: "Склад оборудования",
    number: "001",
    typeId: "6",
    status: "active",
    buildingId: "2",
    floor: 0,
    capacity: 0,
    workstations: 0,
    equipment: 156,
    description: "Склад для хранения запасного оборудования",
    responsiblePerson: "Кузнецов К.К."
  },
  {
    id: "7",
    name: "Компьютерный класс 205",
    number: "205",
    typeId: "2",
    status: "inactive",
    buildingId: "2",
    floor: 2,
    capacity: 20,
    workstations: 10,
    equipment: 40,
    description: "Компьютерный класс (временно закрыт)",
    responsiblePerson: "Морозов М.М."
  },
  {
    id: "8",
    name: "Аудитория 302",
    number: "302",
    typeId: "3",
    status: "active",
    buildingId: "1",
    floor: 3,
    capacity: 35,
    workstations: 18,
    equipment: 38,
    description: "Учебная аудитория для семинаров",
    responsiblePerson: "Иванов И.И."
  },
]

const getStatusInfo = (status: ClassroomStatus) => {
  switch (status) {
    case "active":
      return { label: "Активна", variant: "default" as const, color: "bg-green-500" }
    case "inactive":
      return { label: "Неактивна", variant: "secondary" as const, color: "bg-gray-500" }
    case "maintenance":
      return { label: "На обслуживании", variant: "outline" as const, color: "bg-yellow-500" }
  }
}

const colorOptions = [
  { value: "bg-blue-100 text-blue-800", label: "Синий" },
  { value: "bg-green-100 text-green-800", label: "Зеленый" },
  { value: "bg-slate-100 text-slate-800", label: "Серый" },
  { value: "bg-purple-100 text-purple-800", label: "Фиолетовый" },
  { value: "bg-amber-100 text-amber-800", label: "Оранжевый" },
  { value: "bg-red-100 text-red-800", label: "Красный" },
  { value: "bg-cyan-100 text-cyan-800", label: "Голубой" },
  { value: "bg-pink-100 text-pink-800", label: "Розовый" },
]

export default function ClassroomsPage() {
  const [session, setSession] = useState<MockSession | null>(null)
  const [permissions, setPermissions] = useState<MockPermissions | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Данные
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [classroomTypes, setClassroomTypes] = useState<ClassroomType[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  
  // Вкладки
  const [activeTab, setActiveTab] = useState("classrooms")
  
  // Фильтры для аудиторий
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedBuildingFilter, setSelectedBuildingFilter] = useState("all")
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("all")
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<ClassroomStatus | "all">("all")
  
  // Диалоги аудиторий
  const [isAddClassroomOpen, setIsAddClassroomOpen] = useState(false)
  const [isEditClassroomOpen, setIsEditClassroomOpen] = useState(false)
  const [isViewClassroomOpen, setIsViewClassroomOpen] = useState(false)
  const [isDeleteClassroomOpen, setIsDeleteClassroomOpen] = useState(false)
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null)
  
  // Диалоги типов
  const [isAddTypeOpen, setIsAddTypeOpen] = useState(false)
  const [isEditTypeOpen, setIsEditTypeOpen] = useState(false)
  const [isDeleteTypeOpen, setIsDeleteTypeOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<ClassroomType | null>(null)
  
  // Диалоги корпусов
  const [isAddBuildingOpen, setIsAddBuildingOpen] = useState(false)
  const [isEditBuildingOpen, setIsEditBuildingOpen] = useState(false)
  const [isDeleteBuildingOpen, setIsDeleteBuildingOpen] = useState(false)
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null)
  
  // Формы
  const [classroomForm, setClassroomForm] = useState({
    name: "",
    number: "",
    typeId: "",
    status: "active" as ClassroomStatus,
    buildingId: "",
    floor: 1,
    capacity: 0,
    description: "",
    responsiblePerson: ""
  })
  
  const [typeForm, setTypeForm] = useState({
    name: "",
    code: "",
    color: "bg-slate-100 text-slate-800",
    description: ""
  })
  
  const [buildingForm, setBuildingForm] = useState({
    name: "",
    address: "",
    floors: 1,
    description: ""
  })
  
  useEffect(() => {
    setSession(getMockSession())
    setPermissions(getCurrentMockPermissions())
  }, [])
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setClassrooms(initialClassrooms)
      setClassroomTypes(initialClassroomTypes)
      setBuildings(initialBuildings)
      setLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [])
  
  // Фильтрация аудиторий
  const filteredClassrooms = useMemo(() => {
    return classrooms.filter(classroom => {
      const matchesSearch = searchQuery === "" || 
        classroom.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        classroom.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        classroom.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        classroom.responsiblePerson.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesBuilding = selectedBuildingFilter === "all" || classroom.buildingId === selectedBuildingFilter
      const matchesType = selectedTypeFilter === "all" || classroom.typeId === selectedTypeFilter
      const matchesStatus = selectedStatusFilter === "all" || classroom.status === selectedStatusFilter
      
      return matchesSearch && matchesBuilding && matchesType && matchesStatus
    })
  }, [classrooms, searchQuery, selectedBuildingFilter, selectedTypeFilter, selectedStatusFilter])
  
  // Статистика
  const stats = useMemo(() => {
    return {
      total: classrooms.length,
      active: classrooms.filter(c => c.status === "active").length,
      inactive: classrooms.filter(c => c.status === "inactive").length,
      maintenance: classrooms.filter(c => c.status === "maintenance").length,
      totalWorkstations: classrooms.reduce((sum, c) => sum + c.workstations, 0),
      totalEquipment: classrooms.reduce((sum, c) => sum + c.equipment, 0),
    }
  }, [classrooms])
  
  const resetFilters = () => {
    setSearchQuery("")
    setSelectedBuildingFilter("all")
    setSelectedTypeFilter("all")
    setSelectedStatusFilter("all")
  }
  
  const hasActiveFilters = searchQuery !== "" || selectedBuildingFilter !== "all" || selectedTypeFilter !== "all" || selectedStatusFilter !== "all"
  
  // Handlers для аудиторий
  const resetClassroomForm = () => {
    setClassroomForm({
      name: "",
      number: "",
      typeId: classroomTypes[0]?.id || "",
      status: "active",
      buildingId: buildings[0]?.id || "",
      floor: 1,
      capacity: 0,
      description: "",
      responsiblePerson: ""
    })
  }
  
  const handleAddClassroom = () => {
    const newClassroom: Classroom = {
      id: String(Date.now()),
      ...classroomForm,
      workstations: 0,
      equipment: 0
    }
    setClassrooms([...classrooms, newClassroom])
    setIsAddClassroomOpen(false)
    resetClassroomForm()
  }
  
  const handleEditClassroom = () => {
    if (!selectedClassroom) return
    const updated = classrooms.map(c => 
      c.id === selectedClassroom.id ? { ...c, ...classroomForm } : c
    )
    setClassrooms(updated)
    setIsEditClassroomOpen(false)
    setSelectedClassroom(null)
    resetClassroomForm()
  }
  
  const handleDeleteClassroom = () => {
    if (!selectedClassroom) return
    setClassrooms(classrooms.filter(c => c.id !== selectedClassroom.id))
    setIsDeleteClassroomOpen(false)
    setSelectedClassroom(null)
  }
  
  const openEditClassroom = (classroom: Classroom) => {
    setSelectedClassroom(classroom)
    setClassroomForm({
      name: classroom.name,
      number: classroom.number,
      typeId: classroom.typeId,
      status: classroom.status,
      buildingId: classroom.buildingId,
      floor: classroom.floor,
      capacity: classroom.capacity,
      description: classroom.description,
      responsiblePerson: classroom.responsiblePerson
    })
    setIsEditClassroomOpen(true)
  }
  
  // Handlers для типов
  const resetTypeForm = () => {
    setTypeForm({
      name: "",
      code: "",
      color: "bg-slate-100 text-slate-800",
      description: ""
    })
  }
  
  const handleAddType = () => {
    const newType: ClassroomType = {
      id: String(Date.now()),
      ...typeForm
    }
    setClassroomTypes([...classroomTypes, newType])
    setIsAddTypeOpen(false)
    resetTypeForm()
  }
  
  const handleEditType = () => {
    if (!selectedType) return
    const updated = classroomTypes.map(t => 
      t.id === selectedType.id ? { ...t, ...typeForm } : t
    )
    setClassroomTypes(updated)
    setIsEditTypeOpen(false)
    setSelectedType(null)
    resetTypeForm()
  }
  
  const handleDeleteType = () => {
    if (!selectedType) return
    // Проверяем, используется ли тип
    const isUsed = classrooms.some(c => c.typeId === selectedType.id)
    if (isUsed) {
      alert("Невозможно удалить тип, который используется аудиториями")
      return
    }
    setClassroomTypes(classroomTypes.filter(t => t.id !== selectedType.id))
    setIsDeleteTypeOpen(false)
    setSelectedType(null)
  }
  
  const openEditType = (type: ClassroomType) => {
    setSelectedType(type)
    setTypeForm({
      name: type.name,
      code: type.code,
      color: type.color,
      description: type.description
    })
    setIsEditTypeOpen(true)
  }
  
  // Handlers для корпусов
  const resetBuildingForm = () => {
    setBuildingForm({
      name: "",
      address: "",
      floors: 1,
      description: ""
    })
  }
  
  const handleAddBuilding = () => {
    const newBuilding: Building = {
      id: String(Date.now()),
      ...buildingForm
    }
    setBuildings([...buildings, newBuilding])
    setIsAddBuildingOpen(false)
    resetBuildingForm()
  }
  
  const handleEditBuilding = () => {
    if (!selectedBuilding) return
    const updated = buildings.map(b => 
      b.id === selectedBuilding.id ? { ...b, ...buildingForm } : b
    )
    setBuildings(updated)
    setIsEditBuildingOpen(false)
    setSelectedBuilding(null)
    resetBuildingForm()
  }
  
  const handleDeleteBuilding = () => {
    if (!selectedBuilding) return
    // Проверяем, используется ли корпус
    const isUsed = classrooms.some(c => c.buildingId === selectedBuilding.id)
    if (isUsed) {
      alert("Невозможно удалить корпус, в котором есть аудитории")
      return
    }
    setBuildings(buildings.filter(b => b.id !== selectedBuilding.id))
    setIsDeleteBuildingOpen(false)
    setSelectedBuilding(null)
  }
  
  const openEditBuilding = (building: Building) => {
    setSelectedBuilding(building)
    setBuildingForm({
      name: building.name,
      address: building.address,
      floors: building.floors,
      description: building.description
    })
    setIsEditBuildingOpen(true)
  }
  
  // Helper functions
  const getTypeName = (typeId: string) => {
    return classroomTypes.find(t => t.id === typeId)?.name || "Неизвестно"
  }
  
  const getTypeColor = (typeId: string) => {
    return classroomTypes.find(t => t.id === typeId)?.color || "bg-slate-100 text-slate-800"
  }
  
  const getBuildingName = (buildingId: string) => {
    return buildings.find(b => b.id === buildingId)?.name || "Неизвестно"
  }
  
  const getClassroomsCountByBuilding = (buildingId: string) => {
    return classrooms.filter(c => c.buildingId === buildingId).length
  }
  
  const getClassroomsCountByType = (typeId: string) => {
    return classrooms.filter(c => c.typeId === typeId).length
  }
  
  // Загрузка
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
      </div>
    )
  }
  
  const isAdmin = session.user.role === "ADMIN"
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Аудитории</h1>
          <p className="text-muted-foreground">
            Управление аудиториями, типами и корпусами
          </p>
        </div>
      </div>
      
      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего аудиторий</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Активных: {stats.active}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Рабочих мест</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWorkstations}</div>
            <p className="text-xs text-muted-foreground">
              Во всех аудиториях
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Корпусов</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{buildings.length}</div>
            <p className="text-xs text-muted-foreground">
              Зданий в системе
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Типов аудиторий</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classroomTypes.length}</div>
            <p className="text-xs text-muted-foreground">
              Категорий помещений
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="classrooms">Аудитории</TabsTrigger>
          <TabsTrigger value="types">Типы</TabsTrigger>
          <TabsTrigger value="buildings">Корпуса</TabsTrigger>
        </TabsList>
        
        {/* Classrooms Tab */}
        <TabsContent value="classrooms" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Фильтры</CardTitle>
                {isAdmin && (
                  <Button onClick={() => { resetClassroomForm(); setIsAddClassroomOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Добавить аудиторию
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-5">
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Поиск по названию, номеру..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={selectedBuildingFilter} onValueChange={setSelectedBuildingFilter}>
                  <SelectTrigger>
                    <Building2 className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Корпус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все корпуса</SelectItem>
                    {buildings.map((building) => (
                      <SelectItem key={building.id} value={building.id}>{building.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={selectedTypeFilter} onValueChange={setSelectedTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Тип" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все типы</SelectItem>
                    {classroomTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={selectedStatusFilter} onValueChange={(v) => setSelectedStatusFilter(v as ClassroomStatus | "all")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    <SelectItem value="active">Активна</SelectItem>
                    <SelectItem value="inactive">Неактивна</SelectItem>
                    <SelectItem value="maintenance">На обслуживании</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {hasActiveFilters && (
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Найдено: {filteredClassrooms.length} из {classrooms.length}
                  </span>
                  <Button variant="ghost" size="sm" onClick={resetFilters}>
                    <X className="mr-1 h-3 w-3" />
                    Сбросить фильтры
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Classrooms Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Список аудиторий</CardTitle>
                  <CardDescription>
                    {loading ? "Загрузка..." : `Показано ${filteredClassrooms.length} аудиторий`}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Экспорт
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setLoading(true)}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Обновить
                  </Button>
                </div>
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
              ) : filteredClassrooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <School className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">Аудитории не найдены</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Попробуйте изменить параметры поиска или фильтры
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Аудитория</TableHead>
                        <TableHead>Тип</TableHead>
                        <TableHead>Корпус / Этаж</TableHead>
                        <TableHead className="text-center">Вместимость</TableHead>
                        <TableHead className="text-center">Рабочие места</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead className="w-[70px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClassrooms.map((classroom) => {
                        const statusInfo = getStatusInfo(classroom.status)
                        
                        return (
                          <TableRow key={classroom.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                                  <School className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div>
                                  <div className="font-medium">{classroom.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    № {classroom.number}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={getTypeColor(classroom.typeId)}>
                                {getTypeName(classroom.typeId)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <Building2 className="h-3 w-3 text-muted-foreground" />
                                {getBuildingName(classroom.buildingId)}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Этаж {classroom.floor}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                {classroom.capacity}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {classroom.workstations}
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusInfo.variant}>
                                {statusInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Действия</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Действия</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => { setSelectedClassroom(classroom); setIsViewClassroomOpen(true); }}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Просмотр
                                  </DropdownMenuItem>
                                  {isAdmin && (
                                    <>
                                      <DropdownMenuItem onClick={() => openEditClassroom(classroom)}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Редактировать
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        onClick={() => { setSelectedClassroom(classroom); setIsDeleteClassroomOpen(true); }}
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
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Types Tab */}
        <TabsContent value="types" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Типы аудиторий</CardTitle>
                  <CardDescription>
                    Управление категориями помещений
                  </CardDescription>
                </div>
                {isAdmin && (
                  <Button onClick={() => { resetTypeForm(); setIsAddTypeOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Добавить тип
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {classroomTypes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Tag className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">Типы не найдены</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Добавьте первый тип аудитории
                  </p>
                </div>
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
                        <TableHead className="w-[70px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classroomTypes.map((type) => (
                        <TableRow key={type.id}>
                          <TableCell className="font-medium">{type.name}</TableCell>
                          <TableCell>
                            <code className="text-sm bg-muted px-2 py-1 rounded">{type.code}</code>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={type.color}>
                              Пример
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{type.description}</TableCell>
                          <TableCell className="text-center">
                            {getClassroomsCountByType(type.id)}
                          </TableCell>
                          <TableCell>
                            {isAdmin && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEditType(type)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Редактировать
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => { setSelectedType(type); setIsDeleteTypeOpen(true); }}
                                    className="text-destructive"
                                    disabled={getClassroomsCountByType(type.id) > 0}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Удалить
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
        
        {/* Buildings Tab */}
        <TabsContent value="buildings" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Корпуса зданий</CardTitle>
                  <CardDescription>
                    Управление зданиями учебного заведения
                  </CardDescription>
                </div>
                {isAdmin && (
                  <Button onClick={() => { resetBuildingForm(); setIsAddBuildingOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Добавить корпус
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {buildings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">Корпуса не найдены</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Добавьте первый корпус здания
                  </p>
                </div>
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
                        <TableHead className="w-[70px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {buildings.map((building) => (
                        <TableRow key={building.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                                <Building2 className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <span className="font-medium">{building.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{building.address}</TableCell>
                          <TableCell className="text-center">{building.floors}</TableCell>
                          <TableCell className="text-muted-foreground">{building.description}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">
                              {getClassroomsCountByBuilding(building.id)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {isAdmin && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEditBuilding(building)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Редактировать
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => { setSelectedBuilding(building); setIsDeleteBuildingOpen(true); }}
                                    className="text-destructive"
                                    disabled={getClassroomsCountByBuilding(building.id) > 0}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Удалить
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
      </Tabs>
      
      {/* Dialogs for Classrooms */}
      <Dialog open={isAddClassroomOpen} onOpenChange={setIsAddClassroomOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Добавить аудиторию</DialogTitle>
            <DialogDescription>
              Заполните информацию о новой аудитории
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Название</Label>
                <Input
                  value={classroomForm.name}
                  onChange={(e) => setClassroomForm({...classroomForm, name: e.target.value})}
                  placeholder="Аудитория 301"
                />
              </div>
              <div className="space-y-2">
                <Label>Номер</Label>
                <Input
                  value={classroomForm.number}
                  onChange={(e) => setClassroomForm({...classroomForm, number: e.target.value})}
                  placeholder="301"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Тип</Label>
                <Select 
                  value={classroomForm.typeId} 
                  onValueChange={(v) => setClassroomForm({...classroomForm, typeId: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите тип" />
                  </SelectTrigger>
                  <SelectContent>
                    {classroomTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Статус</Label>
                <Select 
                  value={classroomForm.status} 
                  onValueChange={(v) => setClassroomForm({...classroomForm, status: v as ClassroomStatus})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                  value={classroomForm.buildingId} 
                  onValueChange={(v) => setClassroomForm({...classroomForm, buildingId: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите корпус" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map((building) => (
                      <SelectItem key={building.id} value={building.id}>{building.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Этаж</Label>
                <Input
                  type="number"
                  min={0}
                  value={classroomForm.floor}
                  onChange={(e) => setClassroomForm({...classroomForm, floor: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Вместимость</Label>
                <Input
                  type="number"
                  min={0}
                  value={classroomForm.capacity}
                  onChange={(e) => setClassroomForm({...classroomForm, capacity: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label>Ответственный</Label>
                <Input
                  value={classroomForm.responsiblePerson}
                  onChange={(e) => setClassroomForm({...classroomForm, responsiblePerson: e.target.value})}
                  placeholder="Иванов И.И."
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea
                value={classroomForm.description}
                onChange={(e) => setClassroomForm({...classroomForm, description: e.target.value})}
                placeholder="Описание аудитории..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddClassroomOpen(false)}>Отмена</Button>
            <Button onClick={handleAddClassroom} disabled={!classroomForm.name || !classroomForm.number}>
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isEditClassroomOpen} onOpenChange={setIsEditClassroomOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Редактировать аудиторию</DialogTitle>
            <DialogDescription>
              Измените информацию об аудитории
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Название</Label>
                <Input
                  value={classroomForm.name}
                  onChange={(e) => setClassroomForm({...classroomForm, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Номер</Label>
                <Input
                  value={classroomForm.number}
                  onChange={(e) => setClassroomForm({...classroomForm, number: e.target.value})}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Тип</Label>
                <Select 
                  value={classroomForm.typeId} 
                  onValueChange={(v) => setClassroomForm({...classroomForm, typeId: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {classroomTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Статус</Label>
                <Select 
                  value={classroomForm.status} 
                  onValueChange={(v) => setClassroomForm({...classroomForm, status: v as ClassroomStatus})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                  value={classroomForm.buildingId} 
                  onValueChange={(v) => setClassroomForm({...classroomForm, buildingId: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map((building) => (
                      <SelectItem key={building.id} value={building.id}>{building.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Этаж</Label>
                <Input
                  type="number"
                  min={0}
                  value={classroomForm.floor}
                  onChange={(e) => setClassroomForm({...classroomForm, floor: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Вместимость</Label>
                <Input
                  type="number"
                  min={0}
                  value={classroomForm.capacity}
                  onChange={(e) => setClassroomForm({...classroomForm, capacity: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label>Ответственный</Label>
                <Input
                  value={classroomForm.responsiblePerson}
                  onChange={(e) => setClassroomForm({...classroomForm, responsiblePerson: e.target.value})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea
                value={classroomForm.description}
                onChange={(e) => setClassroomForm({...classroomForm, description: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditClassroomOpen(false)}>Отмена</Button>
            <Button onClick={handleEditClassroom}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isViewClassroomOpen} onOpenChange={setIsViewClassroomOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedClassroom?.name}</DialogTitle>
            <DialogDescription>
              Информация об аудитории
            </DialogDescription>
          </DialogHeader>
          {selectedClassroom && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Номер</p>
                  <p className="font-medium">{selectedClassroom.number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Тип</p>
                  <Badge variant="outline" className={getTypeColor(selectedClassroom.typeId)}>
                    {getTypeName(selectedClassroom.typeId)}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Корпус</p>
                  <p className="font-medium">{getBuildingName(selectedClassroom.buildingId)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Этаж</p>
                  <p className="font-medium">{selectedClassroom.floor}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Вместимость</p>
                  <p className="font-medium">{selectedClassroom.capacity}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Рабочих мест</p>
                  <p className="font-medium">{selectedClassroom.workstations}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Оборудование</p>
                  <p className="font-medium">{selectedClassroom.equipment}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ответственный</p>
                <p className="font-medium">{selectedClassroom.responsiblePerson}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Описание</p>
                <p className="font-medium">{selectedClassroom.description}</p>
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
              Вы уверены, что хотите удалить аудиторию &quot;{selectedClassroom?.name}&quot;? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClassroom} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Dialogs for Types */}
      <Dialog open={isAddTypeOpen} onOpenChange={setIsAddTypeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Добавить тип аудитории</DialogTitle>
            <DialogDescription>
              Создайте новую категорию помещений
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                value={typeForm.name}
                onChange={(e) => setTypeForm({...typeForm, name: e.target.value})}
                placeholder="Лекционный зал"
              />
            </div>
            <div className="space-y-2">
              <Label>Код</Label>
              <Input
                value={typeForm.code}
                onChange={(e) => setTypeForm({...typeForm, code: e.target.value})}
                placeholder="lecture_hall"
              />
            </div>
            <div className="space-y-2">
              <Label>Цвет</Label>
              <Select 
                value={typeForm.color} 
                onValueChange={(v) => setTypeForm({...typeForm, color: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={color.value}>Пример</Badge>
                        <span>{color.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea
                value={typeForm.description}
                onChange={(e) => setTypeForm({...typeForm, description: e.target.value})}
                placeholder="Описание типа аудитории..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddTypeOpen(false)}>Отмена</Button>
            <Button onClick={handleAddType} disabled={!typeForm.name || !typeForm.code}>
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isEditTypeOpen} onOpenChange={setIsEditTypeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Редактировать тип аудитории</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                value={typeForm.name}
                onChange={(e) => setTypeForm({...typeForm, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Код</Label>
              <Input
                value={typeForm.code}
                onChange={(e) => setTypeForm({...typeForm, code: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Цвет</Label>
              <Select 
                value={typeForm.color} 
                onValueChange={(v) => setTypeForm({...typeForm, color: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={color.value}>Пример</Badge>
                        <span>{color.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea
                value={typeForm.description}
                onChange={(e) => setTypeForm({...typeForm, description: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditTypeOpen(false)}>Отмена</Button>
            <Button onClick={handleEditType}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteTypeOpen} onOpenChange={setIsDeleteTypeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить тип аудитории?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить тип &quot;{selectedType?.name}&quot;? 
              {getClassroomsCountByType(selectedType?.id || "") > 0 && (
                <span className="block mt-2 text-destructive">
                  Невозможно удалить: есть аудитории этого типа ({getClassroomsCountByType(selectedType?.id || "")})
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteType} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={getClassroomsCountByType(selectedType?.id || "") > 0}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Dialogs for Buildings */}
      <Dialog open={isAddBuildingOpen} onOpenChange={setIsAddBuildingOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Добавить корпус</DialogTitle>
            <DialogDescription>
              Добавьте новое здание в систему
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                value={buildingForm.name}
                onChange={(e) => setBuildingForm({...buildingForm, name: e.target.value})}
                placeholder="Корпус В"
              />
            </div>
            <div className="space-y-2">
              <Label>Адрес</Label>
              <Input
                value={buildingForm.address}
                onChange={(e) => setBuildingForm({...buildingForm, address: e.target.value})}
                placeholder="ул. Университетская, 5"
              />
            </div>
            <div className="space-y-2">
              <Label>Количество этажей</Label>
              <Input
                type="number"
                min={1}
                value={buildingForm.floors}
                onChange={(e) => setBuildingForm({...buildingForm, floors: parseInt(e.target.value) || 1})}
              />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea
                value={buildingForm.description}
                onChange={(e) => setBuildingForm({...buildingForm, description: e.target.value})}
                placeholder="Описание корпуса..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddBuildingOpen(false)}>Отмена</Button>
            <Button onClick={handleAddBuilding} disabled={!buildingForm.name}>
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isEditBuildingOpen} onOpenChange={setIsEditBuildingOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Редактировать корпус</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                value={buildingForm.name}
                onChange={(e) => setBuildingForm({...buildingForm, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Адрес</Label>
              <Input
                value={buildingForm.address}
                onChange={(e) => setBuildingForm({...buildingForm, address: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Количество этажей</Label>
              <Input
                type="number"
                min={1}
                value={buildingForm.floors}
                onChange={(e) => setBuildingForm({...buildingForm, floors: parseInt(e.target.value) || 1})}
              />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea
                value={buildingForm.description}
                onChange={(e) => setBuildingForm({...buildingForm, description: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditBuildingOpen(false)}>Отмена</Button>
            <Button onClick={handleEditBuilding}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteBuildingOpen} onOpenChange={setIsDeleteBuildingOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить корпус?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить корпус &quot;{selectedBuilding?.name}&quot;?
              {getClassroomsCountByBuilding(selectedBuilding?.id || "") > 0 && (
                <span className="block mt-2 text-destructive">
                  Невозможно удалить: в корпусе есть аудитории ({getClassroomsCountByBuilding(selectedBuilding?.id || "")})
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteBuilding} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={getClassroomsCountByBuilding(selectedBuilding?.id || "") > 0}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
