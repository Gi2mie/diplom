"use client"

import { useState, useEffect, useMemo } from "react"
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
  RefreshCw,
  Download,
  School,
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
import { getMockSession, getCurrentMockPermissions, type MockSession, type MockPermissions } from "@/lib/mock-auth"

// Типы
type WorkstationStatus = "active" | "inactive" | "maintenance" | "faulty"

interface Classroom {
  id: string
  name: string
  number: string
  buildingName: string
}

interface Workstation {
  id: string
  name: string
  number: string
  classroomId: string
  status: WorkstationStatus
  pcName: string
  hasMonitor: boolean
  hasKeyboard: boolean
  hasMouse: boolean
  hasHeadphones: boolean
  equipmentCount: number
  lastMaintenance: string
  notes: string
}

// Mock данные аудиторий
const mockClassrooms: Classroom[] = [
  { id: "1", name: "Аудитория 301", number: "301", buildingName: "Главный корпус" },
  { id: "2", name: "Компьютерный класс 105", number: "105", buildingName: "Главный корпус" },
  { id: "3", name: "Лекционный зал 401", number: "401", buildingName: "Главный корпус" },
  { id: "4", name: "Лаборатория 201", number: "201", buildingName: "Корпус Б" },
  { id: "5", name: "Конференц-зал", number: "501", buildingName: "Главный корпус" },
]

// Mock данные рабочих мест
const initialWorkstations: Workstation[] = [
  {
    id: "1",
    name: "Рабочее место 1",
    number: "RM-301-01",
    classroomId: "1",
    status: "active",
    pcName: "PC-301-01",
    hasMonitor: true,
    hasKeyboard: true,
    hasMouse: true,
    hasHeadphones: false,
    equipmentCount: 4,
    lastMaintenance: "2025-02-15",
    notes: "Основное рабочее место преподавателя"
  },
  {
    id: "2",
    name: "Рабочее место 2",
    number: "RM-301-02",
    classroomId: "1",
    status: "active",
    pcName: "PC-301-02",
    hasMonitor: true,
    hasKeyboard: true,
    hasMouse: true,
    hasHeadphones: false,
    equipmentCount: 4,
    lastMaintenance: "2025-02-15",
    notes: ""
  },
  {
    id: "3",
    name: "Рабочее место 1",
    number: "RM-105-01",
    classroomId: "2",
    status: "active",
    pcName: "PC-105-01",
    hasMonitor: true,
    hasKeyboard: true,
    hasMouse: true,
    hasHeadphones: true,
    equipmentCount: 5,
    lastMaintenance: "2025-03-01",
    notes: "Место преподавателя"
  },
  {
    id: "4",
    name: "Рабочее место 2",
    number: "RM-105-02",
    classroomId: "2",
    status: "active",
    pcName: "PC-105-02",
    hasMonitor: true,
    hasKeyboard: true,
    hasMouse: true,
    hasHeadphones: true,
    equipmentCount: 5,
    lastMaintenance: "2025-03-01",
    notes: ""
  },
  {
    id: "5",
    name: "Рабочее место 3",
    number: "RM-105-03",
    classroomId: "2",
    status: "faulty",
    pcName: "PC-105-03",
    hasMonitor: true,
    hasKeyboard: true,
    hasMouse: false,
    hasHeadphones: true,
    equipmentCount: 4,
    lastMaintenance: "2025-01-20",
    notes: "Неисправна мышь, требуется замена"
  },
  {
    id: "6",
    name: "Рабочее место 4",
    number: "RM-105-04",
    classroomId: "2",
    status: "maintenance",
    pcName: "PC-105-04",
    hasMonitor: true,
    hasKeyboard: true,
    hasMouse: true,
    hasHeadphones: true,
    equipmentCount: 5,
    lastMaintenance: "2025-03-20",
    notes: "На техническом обслуживании"
  },
  {
    id: "7",
    name: "Рабочее место 5",
    number: "RM-105-05",
    classroomId: "2",
    status: "active",
    pcName: "PC-105-05",
    hasMonitor: true,
    hasKeyboard: true,
    hasMouse: true,
    hasHeadphones: true,
    equipmentCount: 5,
    lastMaintenance: "2025-03-01",
    notes: ""
  },
  {
    id: "8",
    name: "Рабочее место 6",
    number: "RM-105-06",
    classroomId: "2",
    status: "active",
    pcName: "PC-105-06",
    hasMonitor: true,
    hasKeyboard: true,
    hasMouse: true,
    hasHeadphones: true,
    equipmentCount: 5,
    lastMaintenance: "2025-03-01",
    notes: ""
  },
  {
    id: "9",
    name: "Преподавательское место",
    number: "RM-401-01",
    classroomId: "3",
    status: "active",
    pcName: "PC-401-01",
    hasMonitor: true,
    hasKeyboard: true,
    hasMouse: true,
    hasHeadphones: false,
    equipmentCount: 6,
    lastMaintenance: "2025-02-28",
    notes: "Подключен проектор"
  },
  {
    id: "10",
    name: "Рабочее место 1",
    number: "RM-201-01",
    classroomId: "4",
    status: "active",
    pcName: "PC-201-01",
    hasMonitor: true,
    hasKeyboard: true,
    hasMouse: true,
    hasHeadphones: false,
    equipmentCount: 8,
    lastMaintenance: "2025-03-10",
    notes: "Лабораторное оборудование"
  },
  {
    id: "11",
    name: "Рабочее место 2",
    number: "RM-201-02",
    classroomId: "4",
    status: "inactive",
    pcName: "",
    hasMonitor: false,
    hasKeyboard: false,
    hasMouse: false,
    hasHeadphones: false,
    equipmentCount: 0,
    lastMaintenance: "",
    notes: "Не укомплектовано"
  },
]

const statusConfig: Record<WorkstationStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Активно", variant: "default" },
  inactive: { label: "Неактивно", variant: "secondary" },
  maintenance: { label: "Обслуживание", variant: "outline" },
  faulty: { label: "Неисправно", variant: "destructive" },
}

export default function WorkstationsPage() {
  const [session, setSession] = useState<MockSession | null>(null)
  const [permissions, setPermissions] = useState<MockPermissions | null>(null)
  const [workstations, setWorkstations] = useState<Workstation[]>(initialWorkstations)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [filterClassroom, setFilterClassroom] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedWorkstation, setSelectedWorkstation] = useState<Workstation | null>(null)
  
  // Form state
  const [formData, setFormData] = useState<Partial<Workstation>>({
    name: "",
    number: "",
    classroomId: "",
    status: "active",
    pcName: "",
    hasMonitor: true,
    hasKeyboard: true,
    hasMouse: true,
    hasHeadphones: false,
    notes: ""
  })
  
  useEffect(() => {
    setSession(getMockSession())
    setPermissions(getCurrentMockPermissions())
  }, [])
  
  // Фильтрация
  const filteredWorkstations = useMemo(() => {
    return workstations.filter(ws => {
      const matchesSearch = searchQuery === "" || 
        ws.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ws.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ws.pcName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ws.notes.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesClassroom = filterClassroom === "all" || ws.classroomId === filterClassroom
      const matchesStatus = filterStatus === "all" || ws.status === filterStatus
      
      return matchesSearch && matchesClassroom && matchesStatus
    })
  }, [workstations, searchQuery, filterClassroom, filterStatus])
  
  // Статистика
  const stats = useMemo(() => {
    return {
      total: workstations.length,
      active: workstations.filter(ws => ws.status === "active").length,
      faulty: workstations.filter(ws => ws.status === "faulty").length,
      maintenance: workstations.filter(ws => ws.status === "maintenance").length,
    }
  }, [workstations])
  
  const getClassroomName = (classroomId: string) => {
    const classroom = mockClassrooms.find(c => c.id === classroomId)
    return classroom ? `${classroom.number} - ${classroom.name}` : "Не указана"
  }
  
  const getClassroomShort = (classroomId: string) => {
    const classroom = mockClassrooms.find(c => c.id === classroomId)
    return classroom ? classroom.number : "—"
  }
  
  const resetFilters = () => {
    setSearchQuery("")
    setFilterClassroom("all")
    setFilterStatus("all")
  }
  
  const hasActiveFilters = searchQuery !== "" || filterClassroom !== "all" || filterStatus !== "all"
  
  // CRUD операции
  const handleAdd = () => {
    setFormData({
      name: "",
      number: "",
      classroomId: "",
      status: "active",
      pcName: "",
      hasMonitor: true,
      hasKeyboard: true,
      hasMouse: true,
      hasHeadphones: false,
      notes: ""
    })
    setIsAddDialogOpen(true)
  }
  
  const handleEdit = (workstation: Workstation) => {
    setSelectedWorkstation(workstation)
    setFormData({
      name: workstation.name,
      number: workstation.number,
      classroomId: workstation.classroomId,
      status: workstation.status,
      pcName: workstation.pcName,
      hasMonitor: workstation.hasMonitor,
      hasKeyboard: workstation.hasKeyboard,
      hasMouse: workstation.hasMouse,
      hasHeadphones: workstation.hasHeadphones,
      notes: workstation.notes
    })
    setIsEditDialogOpen(true)
  }
  
  const handleView = (workstation: Workstation) => {
    setSelectedWorkstation(workstation)
    setIsViewDialogOpen(true)
  }
  
  const handleDelete = (workstation: Workstation) => {
    setSelectedWorkstation(workstation)
    setIsDeleteDialogOpen(true)
  }
  
  const handleSaveNew = () => {
    const equipmentCount = [
      formData.hasMonitor,
      formData.hasKeyboard,
      formData.hasMouse,
      formData.hasHeadphones,
      formData.pcName !== ""
    ].filter(Boolean).length
    
    const newWorkstation: Workstation = {
      id: Date.now().toString(),
      name: formData.name || "",
      number: formData.number || "",
      classroomId: formData.classroomId || "",
      status: formData.status as WorkstationStatus || "active",
      pcName: formData.pcName || "",
      hasMonitor: formData.hasMonitor || false,
      hasKeyboard: formData.hasKeyboard || false,
      hasMouse: formData.hasMouse || false,
      hasHeadphones: formData.hasHeadphones || false,
      equipmentCount: equipmentCount,
      lastMaintenance: new Date().toISOString().split("T")[0],
      notes: formData.notes || ""
    }
    setWorkstations([...workstations, newWorkstation])
    setIsAddDialogOpen(false)
  }
  
  const handleSaveEdit = () => {
    if (!selectedWorkstation) return
    
    const equipmentCount = [
      formData.hasMonitor,
      formData.hasKeyboard,
      formData.hasMouse,
      formData.hasHeadphones,
      formData.pcName !== ""
    ].filter(Boolean).length
    
    setWorkstations(workstations.map(ws => 
      ws.id === selectedWorkstation.id 
        ? { 
            ...ws, 
            ...formData,
            equipmentCount
          } as Workstation
        : ws
    ))
    setIsEditDialogOpen(false)
    setSelectedWorkstation(null)
  }
  
  const handleConfirmDelete = () => {
    if (!selectedWorkstation) return
    setWorkstations(workstations.filter(ws => ws.id !== selectedWorkstation.id))
    setIsDeleteDialogOpen(false)
    setSelectedWorkstation(null)
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
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Рабочие места</h1>
          <p className="text-muted-foreground">
            Управление рабочими местами в аудиториях
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Экспорт
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить рабочее место
          </Button>
        </div>
      </div>
      
      {/* Stats */}
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
      
      {/* Filters */}
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
                {mockClassrooms.map((classroom) => (
                  <SelectItem key={classroom.id} value={classroom.id}>
                    {classroom.number} - {classroom.name}
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
                <SelectItem value="active">Активно</SelectItem>
                <SelectItem value="inactive">Неактивно</SelectItem>
                <SelectItem value="maintenance">На обслуживании</SelectItem>
                <SelectItem value="faulty">Неисправно</SelectItem>
              </SelectContent>
            </Select>
            
            {hasActiveFilters && (
              <Button variant="ghost" onClick={resetFilters} className="gap-2">
                <X className="h-4 w-4" />
                Сбросить
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Table */}
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
              {filteredWorkstations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <MonitorSmartphone className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">Рабочие места не найдены</p>
                      {hasActiveFilters && (
                        <Button variant="link" onClick={resetFilters}>
                          Сбросить фильтры
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredWorkstations.map((workstation) => (
                  <TableRow key={workstation.id}>
                    <TableCell className="font-mono text-sm">{workstation.number}</TableCell>
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
                      <div className="flex gap-1">
                        {workstation.hasMonitor && (
                          <Monitor className="h-4 w-4 text-blue-600" title="Монитор" />
                        )}
                        {workstation.hasKeyboard && (
                          <Keyboard className="h-4 w-4 text-green-600" title="Клавиатура" />
                        )}
                        {workstation.hasMouse && (
                          <Mouse className="h-4 w-4 text-purple-600" title="Мышь" />
                        )}
                        {workstation.pcName && (
                          <Cpu className="h-4 w-4 text-orange-600" title="Системный блок" />
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
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Действия</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleView(workstation)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Просмотр
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(workstation)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Редактировать
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(workstation)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Удалить
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
      
      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Добавить рабочее место</DialogTitle>
            <DialogDescription>
              Заполните информацию о новом рабочем месте
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Название</Label>
                <Input
                  id="name"
                  placeholder="Рабочее место 1"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="number">Номер</Label>
                <Input
                  id="number"
                  placeholder="RM-101-01"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="classroom">Аудитория</Label>
                <Select 
                  value={formData.classroomId} 
                  onValueChange={(value) => setFormData({ ...formData, classroomId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите аудиторию" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockClassrooms.map((classroom) => (
                      <SelectItem key={classroom.id} value={classroom.id}>
                        {classroom.number} - {classroom.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Статус</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => setFormData({ ...formData, status: value as WorkstationStatus })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Активно</SelectItem>
                    <SelectItem value="inactive">Неактивно</SelectItem>
                    <SelectItem value="maintenance">На обслуживании</SelectItem>
                    <SelectItem value="faulty">Неисправно</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pcName">Имя компьютера</Label>
              <Input
                id="pcName"
                placeholder="PC-101-01"
                value={formData.pcName}
                onChange={(e) => setFormData({ ...formData, pcName: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Комплектация</Label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={formData.hasMonitor}
                    onChange={(e) => setFormData({ ...formData, hasMonitor: e.target.checked })}
                    className="rounded"
                  />
                  <Monitor className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">Монитор</span>
                </label>
                <label className="flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={formData.hasKeyboard}
                    onChange={(e) => setFormData({ ...formData, hasKeyboard: e.target.checked })}
                    className="rounded"
                  />
                  <Keyboard className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Клавиатура</span>
                </label>
                <label className="flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={formData.hasMouse}
                    onChange={(e) => setFormData({ ...formData, hasMouse: e.target.checked })}
                    className="rounded"
                  />
                  <Mouse className="h-4 w-4 text-purple-600" />
                  <span className="text-sm">Мышь</span>
                </label>
                <label className="flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={formData.hasHeadphones}
                    onChange={(e) => setFormData({ ...formData, hasHeadphones: e.target.checked })}
                    className="rounded"
                  />
                  <Package className="h-4 w-4 text-amber-600" />
                  <span className="text-sm">Наушники</span>
                </label>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Примечания</Label>
              <Textarea
                id="notes"
                placeholder="Дополнительная информация..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveNew} disabled={!formData.name || !formData.classroomId}>
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Редактировать рабочее место</DialogTitle>
            <DialogDescription>
              Измените информацию о рабочем месте
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Название</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-number">Номер</Label>
                <Input
                  id="edit-number"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-classroom">Аудитория</Label>
                <Select 
                  value={formData.classroomId} 
                  onValueChange={(value) => setFormData({ ...formData, classroomId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите аудиторию" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockClassrooms.map((classroom) => (
                      <SelectItem key={classroom.id} value={classroom.id}>
                        {classroom.number} - {classroom.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Статус</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => setFormData({ ...formData, status: value as WorkstationStatus })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Активно</SelectItem>
                    <SelectItem value="inactive">Неактивно</SelectItem>
                    <SelectItem value="maintenance">На обслуживании</SelectItem>
                    <SelectItem value="faulty">Неисправно</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-pcName">Имя компьютера</Label>
              <Input
                id="edit-pcName"
                value={formData.pcName}
                onChange={(e) => setFormData({ ...formData, pcName: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Комплектация</Label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={formData.hasMonitor}
                    onChange={(e) => setFormData({ ...formData, hasMonitor: e.target.checked })}
                    className="rounded"
                  />
                  <Monitor className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">Монитор</span>
                </label>
                <label className="flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={formData.hasKeyboard}
                    onChange={(e) => setFormData({ ...formData, hasKeyboard: e.target.checked })}
                    className="rounded"
                  />
                  <Keyboard className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Клавиатура</span>
                </label>
                <label className="flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={formData.hasMouse}
                    onChange={(e) => setFormData({ ...formData, hasMouse: e.target.checked })}
                    className="rounded"
                  />
                  <Mouse className="h-4 w-4 text-purple-600" />
                  <span className="text-sm">Мышь</span>
                </label>
                <label className="flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={formData.hasHeadphones}
                    onChange={(e) => setFormData({ ...formData, hasHeadphones: e.target.checked })}
                    className="rounded"
                  />
                  <Package className="h-4 w-4 text-amber-600" />
                  <span className="text-sm">Наушники</span>
                </label>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Примечания</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveEdit}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Информация о рабочем месте</DialogTitle>
            <DialogDescription>
              Детальная информация о рабочем месте {selectedWorkstation?.number}
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
                  <p className="text-sm text-muted-foreground font-mono">{selectedWorkstation.number}</p>
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
                  <p className="text-sm text-muted-foreground">Единиц оборудования</p>
                  <p className="font-medium">{selectedWorkstation.equipmentCount}</p>
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
                </div>
              </div>
              
              {selectedWorkstation.notes && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-1">Примечания</p>
                  <p className="text-sm">{selectedWorkstation.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Закрыть
            </Button>
            <Button onClick={() => {
              setIsViewDialogOpen(false)
              if (selectedWorkstation) handleEdit(selectedWorkstation)
            }}>
              <Pencil className="mr-2 h-4 w-4" />
              Редактировать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить рабочее место?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить рабочее место "{selectedWorkstation?.name}" ({selectedWorkstation?.number})?
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
