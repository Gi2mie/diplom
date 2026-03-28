"use client"

import { useState, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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
  Download,
  Upload,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  X
} from "lucide-react"

// Типы
type RequestType = "install" | "update" | "uninstall"
type RequestStatus = "pending" | "in_progress" | "completed" | "rejected"
type RequestPriority = "low" | "medium" | "high"

interface SoftwareRequest {
  id: string
  type: RequestType
  softwareName: string
  version: string
  description: string
  classroom: string
  workstation: string
  status: RequestStatus
  priority: RequestPriority
  requestedBy: string
  requestedAt: string
  updatedAt: string
  adminComment: string
}

// Mock данные
const mockClassrooms = [
  "Аудитория 301",
  "Аудитория 302",
  "Компьютерный класс 105",
  "Лекционный зал 401",
  "Лаборатория 201"
]

const mockWorkstations: Record<string, string[]> = {
  "Аудитория 301": ["Рабочее место 1", "Рабочее место 2", "Рабочее место 3", "Все рабочие места"],
  "Аудитория 302": ["Рабочее место 1", "Рабочее место 2", "Все рабочие места"],
  "Компьютерный класс 105": ["Рабочее место 1", "Рабочее место 2", "Рабочее место 3", "Рабочее место 4", "Рабочее место 5", "Все рабочие места"],
  "Лекционный зал 401": ["Преподавательский ПК", "Все рабочие места"],
  "Лаборатория 201": ["Рабочее место 1", "Рабочее место 2", "Рабочее место 3", "Все рабочие места"]
}

const mockRequests: SoftwareRequest[] = [
  {
    id: "1",
    type: "install",
    softwareName: "Visual Studio Code",
    version: "1.85.0",
    description: "Необходим редактор кода для занятий по программированию",
    classroom: "Компьютерный класс 105",
    workstation: "Все рабочие места",
    status: "pending",
    priority: "high",
    requestedBy: "Петров И.С.",
    requestedAt: "2025-03-20",
    updatedAt: "2025-03-20",
    adminComment: ""
  },
  {
    id: "2",
    type: "update",
    softwareName: "Microsoft Office",
    version: "2024",
    description: "Обновление до последней версии для совместимости с новыми форматами",
    classroom: "Аудитория 301",
    workstation: "Рабочее место 1",
    status: "in_progress",
    priority: "medium",
    requestedBy: "Иванова М.А.",
    requestedAt: "2025-03-18",
    updatedAt: "2025-03-22",
    adminComment: "Загружаю обновление"
  },
  {
    id: "3",
    type: "install",
    softwareName: "Python 3.12",
    version: "3.12.2",
    description: "Требуется для курса машинного обучения",
    classroom: "Лаборатория 201",
    workstation: "Все рабочие места",
    status: "completed",
    priority: "high",
    requestedBy: "Сидоров А.В.",
    requestedAt: "2025-03-15",
    updatedAt: "2025-03-17",
    adminComment: "Установлено на все рабочие места"
  },
  {
    id: "4",
    type: "uninstall",
    softwareName: "Adobe Flash Player",
    version: "",
    description: "Устаревшее ПО, больше не используется",
    classroom: "Аудитория 302",
    workstation: "Все рабочие места",
    status: "completed",
    priority: "low",
    requestedBy: "Козлова Е.П.",
    requestedAt: "2025-03-10",
    updatedAt: "2025-03-12",
    adminComment: "Удалено"
  },
  {
    id: "5",
    type: "install",
    softwareName: "MATLAB R2024a",
    version: "R2024a",
    description: "Необходим для лабораторных работ по численным методам",
    classroom: "Компьютерный класс 105",
    workstation: "Рабочее место 1",
    status: "rejected",
    priority: "medium",
    requestedBy: "Николаев Д.М.",
    requestedAt: "2025-03-08",
    updatedAt: "2025-03-09",
    adminComment: "Лицензия не доступна. Предлагаем использовать GNU Octave."
  }
]

// Helpers
const getTypeInfo = (type: RequestType) => {
  switch (type) {
    case "install":
      return { label: "Установка", icon: Download, color: "text-green-600 bg-green-50 border-green-200" }
    case "update":
      return { label: "Обновление", icon: RefreshCw, color: "text-blue-600 bg-blue-50 border-blue-200" }
    case "uninstall":
      return { label: "Удаление", icon: Upload, color: "text-red-600 bg-red-50 border-red-200" }
  }
}

const getStatusInfo = (status: RequestStatus) => {
  switch (status) {
    case "pending":
      return { label: "Не начато", icon: Clock, variant: "outline" as const, color: "text-yellow-600" }
    case "in_progress":
      return { label: "В работе", icon: RefreshCw, variant: "default" as const, color: "text-blue-600" }
    case "completed":
      return { label: "Выполнено", icon: CheckCircle2, variant: "secondary" as const, color: "text-green-600" }
    case "rejected":
      return { label: "Отклонено", icon: XCircle, variant: "destructive" as const, color: "text-red-600" }
  }
}

const getPriorityInfo = (priority: RequestPriority) => {
  switch (priority) {
    case "low":
      return { label: "Низкий", color: "bg-slate-100 text-slate-700 border-slate-200" }
    case "medium":
      return { label: "Средний", color: "bg-yellow-100 text-yellow-700 border-yellow-200" }
    case "high":
      return { label: "Высокий", color: "bg-red-100 text-red-700 border-red-200" }
  }
}

export default function SoftwareRequestsPage() {
  const { data: session, status } = useSession()
  const [requests, setRequests] = useState<SoftwareRequest[]>(mockRequests)
  
  // Фильтры
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedClassroom, setSelectedClassroom] = useState("all")
  const [selectedWorkstation, setSelectedWorkstation] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState<RequestStatus | "all">("all")
  const [selectedType, setSelectedType] = useState<RequestType | "all">("all")
  
  // Диалоги
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [editStatusDialogOpen, setEditStatusDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<SoftwareRequest | null>(null)
  
  // Форма
  const [formData, setFormData] = useState({
    type: "install" as RequestType,
    softwareName: "",
    version: "",
    description: "",
    classroom: "",
    workstation: "",
    priority: "medium" as RequestPriority
  })
  
  // Изменение статуса (для админа)
  const [newStatus, setNewStatus] = useState<RequestStatus>("pending")
  const [adminComment, setAdminComment] = useState("")

  // Фильтрация
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const matchesSearch = 
        req.softwareName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.requestedBy.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesClassroom = selectedClassroom === "all" || req.classroom === selectedClassroom
      const matchesWorkstation = selectedWorkstation === "all" || req.workstation === selectedWorkstation
      const matchesStatus = selectedStatus === "all" || req.status === selectedStatus
      const matchesType = selectedType === "all" || req.type === selectedType
      
      return matchesSearch && matchesClassroom && matchesWorkstation && matchesStatus && matchesType
    })
  }, [requests, searchQuery, selectedClassroom, selectedWorkstation, selectedStatus, selectedType])

  // Статистика
  const stats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter(r => r.status === "pending").length,
    inProgress: requests.filter(r => r.status === "in_progress").length,
    completed: requests.filter(r => r.status === "completed").length
  }), [requests])

  // Сброс фильтров
  const resetFilters = () => {
    setSearchQuery("")
    setSelectedClassroom("all")
    setSelectedWorkstation("all")
    setSelectedStatus("all")
    setSelectedType("all")
  }

  const hasFilters = searchQuery || selectedClassroom !== "all" || selectedWorkstation !== "all" || selectedStatus !== "all" || selectedType !== "all"

  // Доступные рабочие места для выбранной аудитории
  const availableWorkstations = selectedClassroom !== "all" && mockWorkstations[selectedClassroom] 
    ? mockWorkstations[selectedClassroom] 
    : []

  const formWorkstations = formData.classroom && mockWorkstations[formData.classroom]
    ? mockWorkstations[formData.classroom]
    : []

  // Открыть диалог добавления
  const handleAdd = () => {
    setFormData({
      type: "install",
      softwareName: "",
      version: "",
      description: "",
      classroom: "",
      workstation: "",
      priority: "medium"
    })
    setAddDialogOpen(true)
  }

  // Сохранить новую заявку
  const handleSaveNew = () => {
    const newRequest: SoftwareRequest = {
      id: String(Date.now()),
      ...formData,
      status: "pending",
      requestedBy: session?.user.name || "Пользователь",
      requestedAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
      adminComment: ""
    }
    setRequests([newRequest, ...requests])
    setAddDialogOpen(false)
  }

  // Просмотр заявки
  const handleView = (request: SoftwareRequest) => {
    setSelectedRequest(request)
    setViewDialogOpen(true)
  }

  // Изменение статуса
  const handleEditStatus = (request: SoftwareRequest) => {
    setSelectedRequest(request)
    setNewStatus(request.status)
    setAdminComment(request.adminComment)
    setEditStatusDialogOpen(true)
  }

  // Сохранить статус
  const handleSaveStatus = () => {
    if (!selectedRequest) return
    setRequests(requests.map(r => 
      r.id === selectedRequest.id 
        ? { ...r, status: newStatus, adminComment, updatedAt: new Date().toISOString().split("T")[0] } 
        : r
    ))
    setEditStatusDialogOpen(false)
    setSelectedRequest(null)
  }

  // Удаление
  const handleDelete = (request: SoftwareRequest) => {
    setSelectedRequest(request)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (!selectedRequest) return
    setRequests(requests.filter(r => r.id !== selectedRequest.id))
    setDeleteDialogOpen(false)
    setSelectedRequest(null)
  }

  // Loading state
  if (status === "loading") {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!session?.user) {
    return null
  }

  const isAdmin = session.user.role === "ADMIN"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Заявки на установку/обновление ПО</h1>
          <p className="text-muted-foreground">
            {isAdmin ? "Управление заявками на программное обеспечение" : "Отправьте заявку на установку или обновление ПО"}
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Новая заявка
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Всего заявок</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Не начато</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>В работе</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Выполнено</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Фильтры</CardTitle>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="mr-2 h-4 w-4" />
                Сбросить
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            {/* Поиск */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию ПО..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Аудитория */}
            <Select value={selectedClassroom} onValueChange={(value) => {
              setSelectedClassroom(value)
              setSelectedWorkstation("all")
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Аудитория" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все аудитории</SelectItem>
                {mockClassrooms.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
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
                {availableWorkstations.map(w => (
                  <SelectItem key={w} value={w}>{w}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Статус */}
            <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as RequestStatus | "all")}>
              <SelectTrigger>
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="pending">Не начато</SelectItem>
                <SelectItem value="in_progress">В работе</SelectItem>
                <SelectItem value="completed">Выполнено</SelectItem>
                <SelectItem value="rejected">Отклонено</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Тип заявки */}
          <div className="mt-4">
            <Select value={selectedType} onValueChange={(v) => setSelectedType(v as RequestType | "all")}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Тип заявки" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                <SelectItem value="install">Установка</SelectItem>
                <SelectItem value="update">Обновление</SelectItem>
                <SelectItem value="uninstall">Удаление</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Заявки</CardTitle>
          <CardDescription>Найдено: {filteredRequests.length}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Тип</TableHead>
                <TableHead>ПО</TableHead>
                <TableHead>Аудитория</TableHead>
                <TableHead>Рабочее место</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Приоритет</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Заявки не найдены
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((request) => {
                  const typeInfo = getTypeInfo(request.type)
                  const statusInfo = getStatusInfo(request.status)
                  const priorityInfo = getPriorityInfo(request.priority)
                  const TypeIcon = typeInfo.icon
                  const StatusIcon = statusInfo.icon

                  return (
                    <TableRow key={request.id}>
                      <TableCell>
                        <Badge variant="outline" className={typeInfo.color}>
                          <TypeIcon className="mr-1 h-3 w-3" />
                          {typeInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{request.softwareName}</div>
                          {request.version && (
                            <div className="text-sm text-muted-foreground">v{request.version}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{request.classroom}</TableCell>
                      <TableCell>{request.workstation}</TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={priorityInfo.color}>
                          {priorityInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {request.requestedAt}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(request)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Просмотр
                            </DropdownMenuItem>
                            {isAdmin && (
                              <DropdownMenuItem onClick={() => handleEditStatus(request)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Изменить статус
                              </DropdownMenuItem>
                            )}
                            {(isAdmin || request.status === "pending") && (
                              <DropdownMenuItem 
                                onClick={() => handleDelete(request)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Удалить
                              </DropdownMenuItem>
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

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Новая заявка на ПО</DialogTitle>
            <DialogDescription>Заполните форму для отправки заявки</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Тип заявки</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as RequestType })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="install">Установка</SelectItem>
                  <SelectItem value="update">Обновление</SelectItem>
                  <SelectItem value="uninstall">Удаление</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Название ПО</Label>
                <Input
                  value={formData.softwareName}
                  onChange={(e) => setFormData({ ...formData, softwareName: e.target.value })}
                  placeholder="Например: Visual Studio Code"
                />
              </div>
              <div className="grid gap-2">
                <Label>Версия</Label>
                <Input
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  placeholder="Например: 1.85.0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Аудитория</Label>
                <Select 
                  value={formData.classroom} 
                  onValueChange={(v) => setFormData({ ...formData, classroom: v, workstation: "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите аудиторию" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockClassrooms.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Рабочее место</Label>
                <Select 
                  value={formData.workstation} 
                  onValueChange={(v) => setFormData({ ...formData, workstation: v })}
                  disabled={!formData.classroom}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите рабочее место" />
                  </SelectTrigger>
                  <SelectContent>
                    {formWorkstations.map(w => (
                      <SelectItem key={w} value={w}>{w}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Приоритет</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v as RequestPriority })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Низкий</SelectItem>
                  <SelectItem value="medium">Средний</SelectItem>
                  <SelectItem value="high">Высокий</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Описание / Обоснование</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Опишите, для чего необходимо данное ПО..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Отмена</Button>
            <Button 
              onClick={handleSaveNew}
              disabled={!formData.softwareName || !formData.classroom || !formData.workstation}
            >
              Отправить заявку
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Детали заявки</DialogTitle>
            <DialogDescription>Информация о заявке на ПО</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={getTypeInfo(selectedRequest.type).color}>
                  {getTypeInfo(selectedRequest.type).label}
                </Badge>
                <Badge variant={getStatusInfo(selectedRequest.status).variant}>
                  {getStatusInfo(selectedRequest.status).label}
                </Badge>
                <Badge variant="outline" className={getPriorityInfo(selectedRequest.priority).color}>
                  {getPriorityInfo(selectedRequest.priority).label}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Программное обеспечение</Label>
                  <p className="font-medium">{selectedRequest.softwareName}</p>
                </div>
                {selectedRequest.version && (
                  <div>
                    <Label className="text-muted-foreground">Версия</Label>
                    <p className="font-medium">{selectedRequest.version}</p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">Аудитория</Label>
                  <p>{selectedRequest.classroom}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Рабочее место</Label>
                  <p>{selectedRequest.workstation}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Заявитель</Label>
                  <p>{selectedRequest.requestedBy}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Дата заявки</Label>
                  <p>{selectedRequest.requestedAt}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Описание</Label>
                <p className="text-sm mt-1">{selectedRequest.description}</p>
              </div>
              {selectedRequest.adminComment && (
                <div className="rounded-lg bg-muted p-3">
                  <Label className="text-muted-foreground">Комментарий администратора</Label>
                  <p className="text-sm mt-1">{selectedRequest.adminComment}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Закрыть</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Status Dialog (Admin only) */}
      <Dialog open={editStatusDialogOpen} onOpenChange={setEditStatusDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Изменить статус заявки</DialogTitle>
            <DialogDescription>
              {selectedRequest?.softwareName} - {selectedRequest?.classroom}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Статус</Label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as RequestStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Не начато</SelectItem>
                  <SelectItem value="in_progress">В работе</SelectItem>
                  <SelectItem value="completed">Выполнено</SelectItem>
                  <SelectItem value="rejected">Отклонено</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Комментарий</Label>
              <Textarea
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                placeholder="Добавьте комментарий к заявке..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStatusDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleSaveStatus}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить заявку?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить заявку на {selectedRequest?.softwareName}? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
