"use client"

import { useState, useEffect, useMemo } from "react"
import { getMockSession, getCurrentMockPermissions, type MockSession, type MockPermissions } from "@/lib/mock-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Eye, 
  Pencil, 
  Trash2, 
  X,
  Wrench,
  Clock,
  CheckCircle,
  Pause,
  Play,
  User,
  Calendar,
  Timer
} from "lucide-react"

// Типы
type RepairStatus = "pending" | "in_progress" | "paused" | "completed" | "cancelled"

interface Repair {
  id: string
  requestId: string
  title: string
  description: string
  classroom: string
  workstation: string
  equipment: string
  status: RepairStatus
  assignedTo: string
  startedAt: string
  estimatedCompletion: string
  completedAt: string | null
  progress: number
  workLog: string
  partsUsed: string
  cost: number
}

// Mock данные аудиторий
const mockClassrooms = [
  "Аудитория 301",
  "Аудитория 302",
  "Компьютерный класс 105",
  "Компьютерный класс 106",
  "Лекционный зал 401",
  "Лаборатория 201",
]

// Mock данные рабочих мест
const mockWorkstations: Record<string, string[]> = {
  "Аудитория 301": ["Рабочее место 1", "Рабочее место 2", "Рабочее место 3", "Преподавательское"],
  "Аудитория 302": ["Рабочее место 1", "Рабочее место 2", "Преподавательское"],
  "Компьютерный класс 105": ["Рабочее место 1", "Рабочее место 2", "Рабочее место 3", "Рабочее место 4", "Рабочее место 5"],
  "Компьютерный класс 106": ["Рабочее место 1", "Рабочее место 2", "Рабочее место 3", "Рабочее место 4"],
  "Лекционный зал 401": ["Преподавательское", "Проекторная"],
  "Лаборатория 201": ["Рабочее место 1", "Рабочее место 2", "Рабочее место 3"],
}

// Mock данные техников
const mockTechnicians = [
  "Сидоров В.М.",
  "Кузнецов А.И.",
  "Морозов Д.С.",
  "Волков П.Н.",
]

// Mock данные ремонтов
const mockRepairs: Repair[] = [
  {
    id: "1",
    requestId: "2",
    title: "Диагностика и ремонт системного блока",
    description: "Системный блок периодически зависает. Требуется диагностика и устранение проблемы.",
    classroom: "Компьютерный класс 105",
    workstation: "Рабочее место 3",
    equipment: "Системный блок Dell OptiPlex",
    status: "in_progress",
    assignedTo: "Сидоров В.М.",
    startedAt: "2025-03-25",
    estimatedCompletion: "2025-03-27",
    completedAt: null,
    progress: 60,
    workLog: "Проведена диагностика. Обнаружен перегрев процессора. Выполнена чистка от пыли, замена термопасты.",
    partsUsed: "Термопаста Arctic MX-4",
    cost: 500
  },
  {
    id: "2",
    requestId: "4",
    title: "Ремонт проектора",
    description: "Проектор не выводит изображение при включении.",
    classroom: "Лекционный зал 401",
    workstation: "Проекторная",
    equipment: "Проектор Epson EB-X51",
    status: "pending",
    assignedTo: "Кузнецов А.И.",
    startedAt: "2025-03-26",
    estimatedCompletion: "2025-03-28",
    completedAt: null,
    progress: 0,
    workLog: "",
    partsUsed: "",
    cost: 0
  },
  {
    id: "3",
    requestId: "6",
    title: "Замена материнской платы",
    description: "Компьютер не включается после скачка напряжения.",
    classroom: "Аудитория 302",
    workstation: "Рабочее место 1",
    equipment: "Системный блок HP ProDesk",
    status: "paused",
    assignedTo: "Морозов Д.С.",
    startedAt: "2025-03-20",
    estimatedCompletion: "2025-03-30",
    completedAt: null,
    progress: 30,
    workLog: "Диагностика выявила выход из строя материнской платы. Ожидание поставки запчастей.",
    partsUsed: "",
    cost: 0
  },
  {
    id: "4",
    requestId: "7",
    title: "Ремонт монитора",
    description: "Монитор мерцает и периодически гаснет.",
    classroom: "Компьютерный класс 106",
    workstation: "Рабочее место 2",
    equipment: "Монитор Samsung 24 дюйма",
    status: "completed",
    assignedTo: "Волков П.Н.",
    startedAt: "2025-03-18",
    estimatedCompletion: "2025-03-20",
    completedAt: "2025-03-19",
    progress: 100,
    workLog: "Заменены конденсаторы в блоке питания монитора. Монитор работает стабильно.",
    partsUsed: "Конденсаторы 470мкФ x3, 1000мкФ x2",
    cost: 1200
  },
]

export default function RepairsPage() {
  const [session, setSession] = useState<MockSession | null>(null)
  const [permissions, setPermissions] = useState<MockPermissions | null>(null)
  const [repairs, setRepairs] = useState<Repair[]>(mockRepairs)
  
  // Диалоги
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null)
  
  // Фильтры
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedClassroom, setSelectedClassroom] = useState("all")
  const [selectedWorkstation, setSelectedWorkstation] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState<RepairStatus | "all">("all")
  const [selectedTechnician, setSelectedTechnician] = useState("all")
  
  // Форма
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    classroom: "",
    workstation: "",
    equipment: "",
    status: "pending" as RepairStatus,
    assignedTo: "",
    estimatedCompletion: "",
    progress: 0,
    workLog: "",
    partsUsed: "",
    cost: 0
  })
  
  useEffect(() => {
    setSession(getMockSession())
    setPermissions(getCurrentMockPermissions())
  }, [])
  
  // Статистика
  const stats = useMemo(() => ({
    total: repairs.length,
    pending: repairs.filter(r => r.status === "pending").length,
    inProgress: repairs.filter(r => r.status === "in_progress").length,
    paused: repairs.filter(r => r.status === "paused").length,
    completed: repairs.filter(r => r.status === "completed").length,
  }), [repairs])
  
  // Фильтрация
  const filteredRepairs = useMemo(() => {
    return repairs.filter(item => {
      const matchesSearch = 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.equipment.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.assignedTo.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesClassroom = selectedClassroom === "all" || item.classroom === selectedClassroom
      const matchesWorkstation = selectedWorkstation === "all" || item.workstation === selectedWorkstation
      const matchesStatus = selectedStatus === "all" || item.status === selectedStatus
      const matchesTechnician = selectedTechnician === "all" || item.assignedTo === selectedTechnician
      
      return matchesSearch && matchesClassroom && matchesWorkstation && matchesStatus && matchesTechnician
    })
  }, [repairs, searchQuery, selectedClassroom, selectedWorkstation, selectedStatus, selectedTechnician])
  
  // Рабочие места для выбранной аудитории
  const availableWorkstations = useMemo(() => {
    if (selectedClassroom === "all") return []
    return mockWorkstations[selectedClassroom] || []
  }, [selectedClassroom])
  
  const formWorkstations = useMemo(() => {
    if (!formData.classroom) return []
    return mockWorkstations[formData.classroom] || []
  }, [formData.classroom])
  
  // Сброс фильтров
  const resetFilters = () => {
    setSearchQuery("")
    setSelectedClassroom("all")
    setSelectedWorkstation("all")
    setSelectedStatus("all")
    setSelectedTechnician("all")
  }
  
  const hasFilters = searchQuery || selectedClassroom !== "all" || selectedWorkstation !== "all" || selectedStatus !== "all" || selectedTechnician !== "all"
  
  // Получить информацию о статусе
  const getStatusInfo = (status: RepairStatus) => {
    const statuses = {
      pending: { label: "Ожидает", variant: "secondary" as const, icon: Clock, color: "text-slate-500" },
      in_progress: { label: "В работе", variant: "default" as const, icon: Wrench, color: "text-blue-500" },
      paused: { label: "Приостановлен", variant: "outline" as const, icon: Pause, color: "text-orange-500" },
      completed: { label: "Завершён", variant: "outline" as const, icon: CheckCircle, color: "text-green-500" },
      cancelled: { label: "Отменён", variant: "destructive" as const, icon: X, color: "text-red-500" },
    }
    return statuses[status]
  }
  
  // Обработчики
  const handleView = (item: Repair) => {
    setSelectedRepair(item)
    setViewDialogOpen(true)
  }
  
  const handleEdit = (item: Repair) => {
    setSelectedRepair(item)
    setFormData({
      title: item.title,
      description: item.description,
      classroom: item.classroom,
      workstation: item.workstation,
      equipment: item.equipment,
      status: item.status,
      assignedTo: item.assignedTo,
      estimatedCompletion: item.estimatedCompletion,
      progress: item.progress,
      workLog: item.workLog,
      partsUsed: item.partsUsed,
      cost: item.cost
    })
    setEditDialogOpen(true)
  }
  
  const handleDelete = (item: Repair) => {
    setSelectedRepair(item)
    setDeleteDialogOpen(true)
  }
  
  const handleAdd = () => {
    setFormData({
      title: "",
      description: "",
      classroom: "",
      workstation: "",
      equipment: "",
      status: "pending",
      assignedTo: "",
      estimatedCompletion: "",
      progress: 0,
      workLog: "",
      partsUsed: "",
      cost: 0
    })
    setAddDialogOpen(true)
  }
  
  const handleSaveNew = () => {
    const newRepair: Repair = {
      id: String(Date.now()),
      requestId: "",
      title: formData.title,
      description: formData.description,
      classroom: formData.classroom,
      workstation: formData.workstation,
      equipment: formData.equipment,
      status: formData.status,
      assignedTo: formData.assignedTo,
      startedAt: new Date().toISOString().split("T")[0],
      estimatedCompletion: formData.estimatedCompletion,
      completedAt: null,
      progress: formData.progress,
      workLog: formData.workLog,
      partsUsed: formData.partsUsed,
      cost: formData.cost
    }
    setRepairs([newRepair, ...repairs])
    setAddDialogOpen(false)
  }
  
  const handleSaveEdit = () => {
    if (!selectedRepair) return
    
    const updatedRepairs = repairs.map(r => {
      if (r.id === selectedRepair.id) {
        return {
          ...r,
          title: formData.title,
          description: formData.description,
          classroom: formData.classroom,
          workstation: formData.workstation,
          equipment: formData.equipment,
          status: formData.status,
          assignedTo: formData.assignedTo,
          estimatedCompletion: formData.estimatedCompletion,
          progress: formData.progress,
          workLog: formData.workLog,
          partsUsed: formData.partsUsed,
          cost: formData.cost,
          completedAt: formData.status === "completed" ? new Date().toISOString().split("T")[0] : r.completedAt
        }
      }
      return r
    })
    
    setRepairs(updatedRepairs)
    setEditDialogOpen(false)
  }
  
  const handleConfirmDelete = () => {
    if (!selectedRepair) return
    setRepairs(repairs.filter(r => r.id !== selectedRepair.id))
    setDeleteDialogOpen(false)
  }
  
  // Загрузка
  if (!session || !permissions) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-40" />
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
      {/* Заголовок */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Активные ремонты</h1>
          <p className="text-muted-foreground">
            Управление текущими работами по ремонту оборудования
          </p>
        </div>
        {isAdmin && (
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить ремонт
          </Button>
        )}
      </div>
      
      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Всего</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ожидают</CardTitle>
            <Clock className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">В работе</CardTitle>
            <Play className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Приостановлены</CardTitle>
            <Pause className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.paused}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Завершены</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Фильтры */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            {/* Поиск */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск по ремонтам..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Аудитория */}
            <Select 
              value={selectedClassroom} 
              onValueChange={(value) => {
                setSelectedClassroom(value)
                setSelectedWorkstation("all")
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Аудитория" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все аудитории</SelectItem>
                {mockClassrooms.map((classroom) => (
                  <SelectItem key={classroom} value={classroom}>{classroom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Рабочее место */}
            <Select 
              value={selectedWorkstation} 
              onValueChange={setSelectedWorkstation}
              disabled={selectedClassroom === "all"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Рабочее место" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все рабочие места</SelectItem>
                {availableWorkstations.map((ws) => (
                  <SelectItem key={ws} value={ws}>{ws}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Статус */}
            <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as RepairStatus | "all")}>
              <SelectTrigger>
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="pending">Ожидают</SelectItem>
                <SelectItem value="in_progress">В работе</SelectItem>
                <SelectItem value="paused">Приостановлены</SelectItem>
                <SelectItem value="completed">Завершены</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="mt-4 flex items-center gap-4">
            {/* Техник */}
            <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Техник" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все техники</SelectItem>
                {mockTechnicians.map((tech) => (
                  <SelectItem key={tech} value={tech}>{tech}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {hasFilters && (
              <Button variant="ghost" onClick={resetFilters} className="text-muted-foreground">
                <X className="mr-2 h-4 w-4" />
                Сбросить фильтры
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Таблица ремонтов */}
      <Card>
        <CardHeader>
          <CardTitle>Список ремонтов</CardTitle>
          <CardDescription>
            Найдено: {filteredRepairs.length} из {repairs.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ремонт</TableHead>
                <TableHead>Местоположение</TableHead>
                <TableHead>Техник</TableHead>
                <TableHead>Прогресс</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRepairs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Ремонты не найдены
                  </TableCell>
                </TableRow>
              ) : (
                filteredRepairs.map((item) => {
                  const statusInfo = getStatusInfo(item.status)
                  const StatusIcon = statusInfo.icon
                  
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.title}</div>
                          <div className="text-sm text-muted-foreground">{item.equipment}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.classroom}</div>
                          <div className="text-sm text-muted-foreground">{item.workstation}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{item.assignedTo}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>{item.progress}%</span>
                          </div>
                          <Progress value={item.progress} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {statusInfo.label}
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
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(item)}
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
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Диалог просмотра */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Детали ремонта</DialogTitle>
            <DialogDescription>Подробная информация о ремонте</DialogDescription>
          </DialogHeader>
          {selectedRepair && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{selectedRepair.title}</h3>
                <p className="text-muted-foreground mt-1">{selectedRepair.description}</p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-muted-foreground">Прогресс выполнения</Label>
                <div className="flex items-center gap-4">
                  <Progress value={selectedRepair.progress} className="flex-1" />
                  <span className="font-medium">{selectedRepair.progress}%</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Аудитория</Label>
                  <p className="font-medium">{selectedRepair.classroom}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Рабочее место</Label>
                  <p className="font-medium">{selectedRepair.workstation}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Оборудование</Label>
                  <p className="font-medium">{selectedRepair.equipment}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Техник</Label>
                  <p className="font-medium">{selectedRepair.assignedTo}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Дата начала</Label>
                  <p className="font-medium">{selectedRepair.startedAt}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Планируемое завершение</Label>
                  <p className="font-medium">{selectedRepair.estimatedCompletion}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Статус</Label>
                  <div className="mt-1">
                    <Badge variant={getStatusInfo(selectedRepair.status).variant}>
                      {getStatusInfo(selectedRepair.status).label}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Стоимость</Label>
                  <p className="font-medium">{selectedRepair.cost} руб.</p>
                </div>
              </div>
              
              {selectedRepair.workLog && (
                <div>
                  <Label className="text-muted-foreground">Журнал работ</Label>
                  <p className="mt-1 p-3 bg-muted rounded-md text-sm">{selectedRepair.workLog}</p>
                </div>
              )}
              
              {selectedRepair.partsUsed && (
                <div>
                  <Label className="text-muted-foreground">Использованные запчасти</Label>
                  <p className="mt-1 p-3 bg-muted rounded-md text-sm">{selectedRepair.partsUsed}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Диалог добавления */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Добавить ремонт</DialogTitle>
            <DialogDescription>Создайте новую запись о ремонте</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-2">
              <Label htmlFor="title">Название</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Краткое название работ"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Подробное описание работ"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Аудитория</Label>
                <Select 
                  value={formData.classroom} 
                  onValueChange={(value) => setFormData({ ...formData, classroom: value, workstation: "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите аудиторию" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockClassrooms.map((classroom) => (
                      <SelectItem key={classroom} value={classroom}>{classroom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Рабочее место</Label>
                <Select 
                  value={formData.workstation} 
                  onValueChange={(value) => setFormData({ ...formData, workstation: value })}
                  disabled={!formData.classroom}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите рабочее место" />
                  </SelectTrigger>
                  <SelectContent>
                    {formWorkstations.map((ws) => (
                      <SelectItem key={ws} value={ws}>{ws}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="equipment">Оборудование</Label>
                <Input
                  id="equipment"
                  value={formData.equipment}
                  onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
                  placeholder="Название оборудования"
                />
              </div>
              <div className="grid gap-2">
                <Label>Техник</Label>
                <Select 
                  value={formData.assignedTo} 
                  onValueChange={(value) => setFormData({ ...formData, assignedTo: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите техника" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockTechnicians.map((tech) => (
                      <SelectItem key={tech} value={tech}>{tech}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="estimatedCompletion">Планируемое завершение</Label>
                <Input
                  id="estimatedCompletion"
                  type="date"
                  value={formData.estimatedCompletion}
                  onChange={(e) => setFormData({ ...formData, estimatedCompletion: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cost">Стоимость (руб.)</Label>
                <Input
                  id="cost"
                  type="number"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveNew} disabled={!formData.title || !formData.classroom || !formData.assignedTo}>
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Диалог редактирования */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Редактировать ремонт</DialogTitle>
            <DialogDescription>Измените информацию о ремонте</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Название</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Описание</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Статус</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => setFormData({ ...formData, status: value as RepairStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Ожидает</SelectItem>
                    <SelectItem value="in_progress">В работе</SelectItem>
                    <SelectItem value="paused">Приостановлен</SelectItem>
                    <SelectItem value="completed">Завершён</SelectItem>
                    <SelectItem value="cancelled">Отменён</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-progress">Прогресс (%)</Label>
                <Input
                  id="edit-progress"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.progress}
                  onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Техник</Label>
                <Select 
                  value={formData.assignedTo} 
                  onValueChange={(value) => setFormData({ ...formData, assignedTo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mockTechnicians.map((tech) => (
                      <SelectItem key={tech} value={tech}>{tech}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-cost">Стоимость (руб.)</Label>
                <Input
                  id="edit-cost"
                  type="number"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-workLog">Журнал работ</Label>
              <Textarea
                id="edit-workLog"
                value={formData.workLog}
                onChange={(e) => setFormData({ ...formData, workLog: e.target.value })}
                placeholder="Опишите выполненные работы"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-partsUsed">Использованные запчасти</Label>
              <Input
                id="edit-partsUsed"
                value={formData.partsUsed}
                onChange={(e) => setFormData({ ...formData, partsUsed: e.target.value })}
                placeholder="Список запчастей"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveEdit}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Диалог удаления */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить ремонт?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить запись о ремонте "{selectedRepair?.title}"? 
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirmDelete}>
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
