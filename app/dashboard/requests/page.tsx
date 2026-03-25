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
  ClipboardList,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Wrench,
  Calendar
} from "lucide-react"

// Типы
type RequestStatus = "new" | "in_progress" | "completed" | "rejected" | "cancelled"
type RequestPriority = "low" | "medium" | "high" | "critical"

interface RepairRequest {
  id: string
  title: string
  description: string
  classroom: string
  workstation: string
  equipment: string
  status: RequestStatus
  priority: RequestPriority
  createdBy: string
  createdAt: string
  updatedAt: string
  assignedTo: string | null
  completedAt: string | null
  comment: string
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

// Mock данные заявок
const mockRequests: RepairRequest[] = [
  {
    id: "1",
    title: "Не включается монитор",
    description: "Монитор Samsung на рабочем месте 1 не реагирует на кнопку включения. Индикатор питания не горит.",
    classroom: "Аудитория 301",
    workstation: "Рабочее место 1",
    equipment: "Монитор Samsung 24 дюйма",
    status: "new",
    priority: "high",
    createdBy: "Петров И.С.",
    createdAt: "2025-03-25",
    updatedAt: "2025-03-25",
    assignedTo: null,
    completedAt: null,
    comment: ""
  },
  {
    id: "2",
    title: "Зависает компьютер",
    description: "Системный блок периодически зависает при работе с офисными приложениями. Требуется диагностика.",
    classroom: "Компьютерный класс 105",
    workstation: "Рабочее место 3",
    equipment: "Системный блок Dell OptiPlex",
    status: "in_progress",
    priority: "medium",
    createdBy: "Иванова А.П.",
    createdAt: "2025-03-24",
    updatedAt: "2025-03-25",
    assignedTo: "Техник Сидоров В.М.",
    completedAt: null,
    comment: "Назначен техник для диагностики"
  },
  {
    id: "3",
    title: "Не работает клавиатура",
    description: "Несколько клавиш на клавиатуре не реагируют на нажатие.",
    classroom: "Аудитория 302",
    workstation: "Рабочее место 2",
    equipment: "Клавиатура Logitech K120",
    status: "completed",
    priority: "low",
    createdBy: "Козлов Д.А.",
    createdAt: "2025-03-20",
    updatedAt: "2025-03-22",
    assignedTo: "Техник Сидоров В.М.",
    completedAt: "2025-03-22",
    comment: "Клавиатура заменена на новую"
  },
  {
    id: "4",
    title: "Проектор не показывает изображение",
    description: "При включении проектор гудит, но изображение не появляется на экране.",
    classroom: "Лекционный зал 401",
    workstation: "Проекторная",
    equipment: "Проектор Epson EB-X51",
    status: "new",
    priority: "critical",
    createdBy: "Смирнова Е.В.",
    createdAt: "2025-03-25",
    updatedAt: "2025-03-25",
    assignedTo: null,
    completedAt: null,
    comment: ""
  },
  {
    id: "5",
    title: "Мышь работает с перебоями",
    description: "Беспроводная мышь теряет связь с компьютером, курсор периодически пропадает.",
    classroom: "Компьютерный класс 106",
    workstation: "Рабочее место 1",
    equipment: "Мышь Logitech M185",
    status: "rejected",
    priority: "low",
    createdBy: "Николаев П.Р.",
    createdAt: "2025-03-19",
    updatedAt: "2025-03-20",
    assignedTo: null,
    completedAt: null,
    comment: "Проблема решена заменой батареек пользователем"
  },
]

export default function RequestsPage() {
  const [session, setSession] = useState<MockSession | null>(null)
  const [permissions, setPermissions] = useState<MockPermissions | null>(null)
  const [requests, setRequests] = useState<RepairRequest[]>(mockRequests)
  
  // Диалоги
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<RepairRequest | null>(null)
  
  // Фильтры
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedClassroom, setSelectedClassroom] = useState("all")
  const [selectedWorkstation, setSelectedWorkstation] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState<RequestStatus | "all">("all")
  const [selectedPriority, setSelectedPriority] = useState<RequestPriority | "all">("all")
  
  // Форма
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    classroom: "",
    workstation: "",
    equipment: "",
    priority: "medium" as RequestPriority,
    status: "new" as RequestStatus,
    assignedTo: "",
    comment: ""
  })
  
  useEffect(() => {
    setSession(getMockSession())
    setPermissions(getCurrentMockPermissions())
  }, [])
  
  // Статистика
  const stats = useMemo(() => ({
    total: requests.length,
    new: requests.filter(r => r.status === "new").length,
    inProgress: requests.filter(r => r.status === "in_progress").length,
    completed: requests.filter(r => r.status === "completed").length,
    rejected: requests.filter(r => r.status === "rejected").length,
  }), [requests])
  
  // Фильтрация
  const filteredRequests = useMemo(() => {
    return requests.filter(item => {
      const matchesSearch = 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.equipment.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.createdBy.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesClassroom = selectedClassroom === "all" || item.classroom === selectedClassroom
      const matchesWorkstation = selectedWorkstation === "all" || item.workstation === selectedWorkstation
      const matchesStatus = selectedStatus === "all" || item.status === selectedStatus
      const matchesPriority = selectedPriority === "all" || item.priority === selectedPriority
      
      return matchesSearch && matchesClassroom && matchesWorkstation && matchesStatus && matchesPriority
    })
  }, [requests, searchQuery, selectedClassroom, selectedWorkstation, selectedStatus, selectedPriority])
  
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
    setSelectedPriority("all")
  }
  
  const hasFilters = searchQuery || selectedClassroom !== "all" || selectedWorkstation !== "all" || selectedStatus !== "all" || selectedPriority !== "all"
  
  // Получить информацию о статусе
  const getStatusInfo = (status: RequestStatus) => {
    const statuses = {
      new: { label: "Новая", variant: "default" as const, icon: Clock },
      in_progress: { label: "В работе", variant: "secondary" as const, icon: Wrench },
      completed: { label: "Выполнена", variant: "outline" as const, icon: CheckCircle },
      rejected: { label: "Отклонена", variant: "destructive" as const, icon: XCircle },
      cancelled: { label: "Отменена", variant: "outline" as const, icon: X },
    }
    return statuses[status]
  }
  
  // Получить информацию о приоритете
  const getPriorityInfo = (priority: RequestPriority) => {
    const priorities = {
      low: { label: "Низкий", color: "bg-slate-100 text-slate-700 border-slate-200" },
      medium: { label: "Средний", color: "bg-blue-100 text-blue-700 border-blue-200" },
      high: { label: "Высокий", color: "bg-orange-100 text-orange-700 border-orange-200" },
      critical: { label: "Критический", color: "bg-red-100 text-red-700 border-red-200" },
    }
    return priorities[priority]
  }
  
  // Обработчики
  const handleView = (item: RepairRequest) => {
    setSelectedRequest(item)
    setViewDialogOpen(true)
  }
  
  const handleEdit = (item: RepairRequest) => {
    setSelectedRequest(item)
    setFormData({
      title: item.title,
      description: item.description,
      classroom: item.classroom,
      workstation: item.workstation,
      equipment: item.equipment,
      priority: item.priority,
      status: item.status,
      assignedTo: item.assignedTo || "",
      comment: item.comment
    })
    setEditDialogOpen(true)
  }
  
  const handleDelete = (item: RepairRequest) => {
    setSelectedRequest(item)
    setDeleteDialogOpen(true)
  }
  
  const handleAdd = () => {
    setFormData({
      title: "",
      description: "",
      classroom: "",
      workstation: "",
      equipment: "",
      priority: "medium",
      status: "new",
      assignedTo: "",
      comment: ""
    })
    setAddDialogOpen(true)
  }
  
  const handleSaveNew = () => {
    const newRequest: RepairRequest = {
      id: String(Date.now()),
      title: formData.title,
      description: formData.description,
      classroom: formData.classroom,
      workstation: formData.workstation,
      equipment: formData.equipment,
      status: "new",
      priority: formData.priority,
      createdBy: session?.user.name || "Неизвестный",
      createdAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
      assignedTo: null,
      completedAt: null,
      comment: ""
    }
    setRequests([newRequest, ...requests])
    setAddDialogOpen(false)
  }
  
  const handleSaveEdit = () => {
    if (!selectedRequest) return
    
    const updatedRequests = requests.map(r => {
      if (r.id === selectedRequest.id) {
        return {
          ...r,
          title: formData.title,
          description: formData.description,
          classroom: formData.classroom,
          workstation: formData.workstation,
          equipment: formData.equipment,
          priority: formData.priority,
          status: formData.status,
          assignedTo: formData.assignedTo || null,
          comment: formData.comment,
          updatedAt: new Date().toISOString().split("T")[0],
          completedAt: formData.status === "completed" ? new Date().toISOString().split("T")[0] : r.completedAt
        }
      }
      return r
    })
    
    setRequests(updatedRequests)
    setEditDialogOpen(false)
  }
  
  const handleConfirmDelete = () => {
    if (!selectedRequest) return
    setRequests(requests.filter(r => r.id !== selectedRequest.id))
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
          <h1 className="text-2xl font-bold tracking-tight">Заявки на ремонт</h1>
          <p className="text-muted-foreground">
            Управление заявками на ремонт оборудования
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Создать заявку
        </Button>
      </div>
      
      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Всего заявок</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Новые</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.new}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">В работе</CardTitle>
            <Wrench className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Выполнены</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Отклонены</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
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
                placeholder="Поиск по заявкам..."
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
            <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as RequestStatus | "all")}>
              <SelectTrigger>
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="new">Новые</SelectItem>
                <SelectItem value="in_progress">В работе</SelectItem>
                <SelectItem value="completed">Выполнены</SelectItem>
                <SelectItem value="rejected">Отклонены</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="mt-4 flex items-center gap-4">
            {/* Приоритет */}
            <Select value={selectedPriority} onValueChange={(value) => setSelectedPriority(value as RequestPriority | "all")}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Приоритет" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все приоритеты</SelectItem>
                <SelectItem value="critical">Критический</SelectItem>
                <SelectItem value="high">Высокий</SelectItem>
                <SelectItem value="medium">Средний</SelectItem>
                <SelectItem value="low">Низкий</SelectItem>
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
      
      {/* Таблица заявок */}
      <Card>
        <CardHeader>
          <CardTitle>Список заявок</CardTitle>
          <CardDescription>
            Найдено: {filteredRequests.length} из {requests.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Заявка</TableHead>
                <TableHead>Аудитория</TableHead>
                <TableHead>Приоритет</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Заявки не найдены
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((item) => {
                  const statusInfo = getStatusInfo(item.status)
                  const priorityInfo = getPriorityInfo(item.priority)
                  const StatusIcon = statusInfo.icon
                  
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.title}</div>
                          <div className="text-sm text-muted-foreground">{item.createdBy}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.classroom}</div>
                          <div className="text-sm text-muted-foreground">{item.workstation}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={priorityInfo.color}>
                          {priorityInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {item.createdAt}
                        </div>
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
            <DialogTitle>Просмотр заявки</DialogTitle>
            <DialogDescription>Подробная информация о заявке на ремонт</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{selectedRequest.title}</h3>
                <p className="text-muted-foreground mt-1">{selectedRequest.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Аудитория</Label>
                  <p className="font-medium">{selectedRequest.classroom}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Рабочее место</Label>
                  <p className="font-medium">{selectedRequest.workstation}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Оборудование</Label>
                  <p className="font-medium">{selectedRequest.equipment}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Приоритет</Label>
                  <div className="mt-1">
                    <Badge variant="outline" className={getPriorityInfo(selectedRequest.priority).color}>
                      {getPriorityInfo(selectedRequest.priority).label}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Статус</Label>
                  <div className="mt-1">
                    <Badge variant={getStatusInfo(selectedRequest.status).variant}>
                      {getStatusInfo(selectedRequest.status).label}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Создал</Label>
                  <p className="font-medium">{selectedRequest.createdBy}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Дата создания</Label>
                  <p className="font-medium">{selectedRequest.createdAt}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Исполнитель</Label>
                  <p className="font-medium">{selectedRequest.assignedTo || "Не назначен"}</p>
                </div>
              </div>
              
              {selectedRequest.comment && (
                <div>
                  <Label className="text-muted-foreground">Комментарий</Label>
                  <p className="mt-1 p-3 bg-muted rounded-md text-sm">{selectedRequest.comment}</p>
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
            <DialogTitle>Создать заявку</DialogTitle>
            <DialogDescription>Заполните информацию о проблеме с оборудованием</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Заголовок</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Краткое описание проблемы"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Подробное описание проблемы"
                rows={3}
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
                <Label>Приоритет</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(value) => setFormData({ ...formData, priority: value as RequestPriority })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Низкий</SelectItem>
                    <SelectItem value="medium">Средний</SelectItem>
                    <SelectItem value="high">Высокий</SelectItem>
                    <SelectItem value="critical">Критический</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveNew} disabled={!formData.title || !formData.classroom}>
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Диалог редактирования */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Редактировать заявку</DialogTitle>
            <DialogDescription>Измените информацию о заявке</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Заголовок</Label>
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
                rows={3}
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
                    <SelectValue />
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
                    <SelectValue />
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
                <Label>Статус</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => setFormData({ ...formData, status: value as RequestStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Новая</SelectItem>
                    <SelectItem value="in_progress">В работе</SelectItem>
                    <SelectItem value="completed">Выполнена</SelectItem>
                    <SelectItem value="rejected">Отклонена</SelectItem>
                    <SelectItem value="cancelled">Отменена</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Приоритет</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(value) => setFormData({ ...formData, priority: value as RequestPriority })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Низкий</SelectItem>
                    <SelectItem value="medium">Средний</SelectItem>
                    <SelectItem value="high">Высокий</SelectItem>
                    <SelectItem value="critical">Критический</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-assignedTo">Исполнитель</Label>
              <Input
                id="edit-assignedTo"
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                placeholder="ФИО исполнителя"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-comment">Комментарий</Label>
              <Textarea
                id="edit-comment"
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                placeholder="Комментарий к заявке"
                rows={2}
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
            <AlertDialogTitle>Удалить заявку?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить заявку "{selectedRequest?.title}"? 
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
