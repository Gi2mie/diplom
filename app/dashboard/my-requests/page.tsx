"use client"

import { useState, useEffect, useMemo } from "react"
import { getMockSession, type MockSession } from "@/lib/mock-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  Plus, 
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Wrench,
  Eye,
  Monitor,
  Keyboard,
  Mouse,
  Cpu,
  Printer,
  Projector,
  HelpCircle,
  MessageSquare
} from "lucide-react"
import Link from "next/link"

// Типы
type RequestStatus = "pending" | "in_progress" | "completed" | "rejected"
type RequestType = "repair" | "software"
type PriorityType = "low" | "medium" | "high" | "critical"
type EquipmentType = "monitor" | "keyboard" | "mouse" | "system_unit" | "printer" | "projector" | "network" | "software" | "other"

interface Request {
  id: string
  title: string
  description: string
  type: RequestType
  status: RequestStatus
  priority: PriorityType
  equipmentType?: EquipmentType
  softwareName?: string
  classroomId: string
  classroomName: string
  workstationId?: string
  workstationName?: string
  createdAt: string
  updatedAt: string
  adminComment?: string
}

// Mock данные заявок
const mockRequests: Request[] = [
  {
    id: "1",
    title: "Не работает монитор",
    description: "Монитор на рабочем месте 3 не включается. При нажатии кнопки питания индикатор мигает, но изображение не появляется.",
    type: "repair",
    status: "pending",
    priority: "high",
    equipmentType: "monitor",
    classroomId: "1",
    classroomName: "Аудитория 301",
    workstationId: "3",
    workstationName: "Рабочее место 3",
    createdAt: "2025-03-24T10:30:00",
    updatedAt: "2025-03-24T10:30:00"
  },
  {
    id: "2",
    title: "Установить Microsoft Office",
    description: "Необходимо установить пакет Microsoft Office на преподавательский ПК.",
    type: "software",
    status: "in_progress",
    priority: "medium",
    softwareName: "Microsoft Office 2021",
    classroomId: "1",
    classroomName: "Аудитория 301",
    workstationId: "4",
    workstationName: "Преподавательский ПК",
    createdAt: "2025-03-23T14:00:00",
    updatedAt: "2025-03-24T09:00:00",
    adminComment: "Заявка принята в работу, установка запланирована на сегодня."
  },
  {
    id: "3",
    title: "Не работает клавиатура",
    description: "Клавиатура не реагирует на нажатия. Пробовал подключить к другому USB порту - не помогло.",
    type: "repair",
    status: "completed",
    priority: "medium",
    equipmentType: "keyboard",
    classroomId: "3",
    classroomName: "Компьютерный класс 105",
    workstationId: "7",
    workstationName: "Рабочее место 1",
    createdAt: "2025-03-20T11:15:00",
    updatedAt: "2025-03-21T16:30:00",
    adminComment: "Клавиатура заменена на новую."
  },
  {
    id: "4",
    title: "Обновить драйверы видеокарты",
    description: "Некорректно отображаются некоторые программы. Возможно, нужно обновить драйверы.",
    type: "software",
    status: "rejected",
    priority: "low",
    softwareName: "Драйверы NVIDIA",
    classroomId: "3",
    classroomName: "Компьютерный класс 105",
    workstationId: "8",
    workstationName: "Рабочее место 2",
    createdAt: "2025-03-19T09:00:00",
    updatedAt: "2025-03-19T15:00:00",
    adminComment: "Драйверы уже обновлены до последней версии. Проблема связана с настройками программы."
  },
  {
    id: "5",
    title: "Проблемы с интернетом",
    description: "На рабочем месте 2 периодически пропадает интернет-соединение.",
    type: "repair",
    status: "in_progress",
    priority: "high",
    equipmentType: "network",
    classroomId: "1",
    classroomName: "Аудитория 301",
    workstationId: "2",
    workstationName: "Рабочее место 2",
    createdAt: "2025-03-22T13:45:00",
    updatedAt: "2025-03-23T10:00:00",
    adminComment: "Проверяем сетевое оборудование."
  },
]

const statusConfig: Record<RequestStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "Ожидает", color: "bg-yellow-500", icon: Clock },
  in_progress: { label: "В работе", color: "bg-blue-500", icon: Wrench },
  completed: { label: "Выполнено", color: "bg-green-500", icon: CheckCircle2 },
  rejected: { label: "Отклонено", color: "bg-red-500", icon: XCircle },
}

const priorityConfig: Record<PriorityType, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  low: { label: "Низкий", variant: "outline" },
  medium: { label: "Средний", variant: "secondary" },
  high: { label: "Высокий", variant: "default" },
  critical: { label: "Критический", variant: "destructive" },
}

const equipmentIcons: Record<EquipmentType, React.ElementType> = {
  monitor: Monitor,
  keyboard: Keyboard,
  mouse: Mouse,
  system_unit: Cpu,
  printer: Printer,
  projector: Projector,
  network: AlertTriangle,
  software: HelpCircle,
  other: HelpCircle,
}

export default function MyRequestsPage() {
  const [session, setSession] = useState<MockSession | null>(null)
  const [requests] = useState<Request[]>(mockRequests)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<RequestStatus | "all">("all")
  const [selectedType, setSelectedType] = useState<RequestType | "all">("all")
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  
  useEffect(() => {
    setSession(getMockSession())
  }, [])
  
  // Фильтрация
  const filteredRequests = useMemo(() => {
    return requests.filter(request => {
      const matchesSearch = 
        request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.classroomName.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesStatus = selectedStatus === "all" || request.status === selectedStatus
      const matchesType = selectedType === "all" || request.type === selectedType
      
      return matchesSearch && matchesStatus && matchesType
    })
  }, [requests, searchQuery, selectedStatus, selectedType])
  
  // Статистика
  const stats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter(r => r.status === "pending").length,
    inProgress: requests.filter(r => r.status === "in_progress").length,
    completed: requests.filter(r => r.status === "completed").length,
    rejected: requests.filter(r => r.status === "rejected").length,
  }), [requests])
  
  if (!session) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }
  
  const handleView = (request: Request) => {
    setSelectedRequest(request)
    setViewDialogOpen(true)
  }
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Мои заявки</h1>
          <p className="text-muted-foreground">
            История ваших заявок на ремонт и установку ПО
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/requests/new">
            <Plus className="mr-2 h-4 w-4" />
            Новая заявка
          </Link>
        </Button>
      </div>
      
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
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
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Ожидают
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-blue-500" />
              В работе
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Выполнено
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              Отклонено
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск по заявкам..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as RequestStatus | "all")}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="pending">Ожидает</SelectItem>
                <SelectItem value="in_progress">В работе</SelectItem>
                <SelectItem value="completed">Выполнено</SelectItem>
                <SelectItem value="rejected">Отклонено</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedType} onValueChange={(value) => setSelectedType(value as RequestType | "all")}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Тип" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                <SelectItem value="repair">Ремонт</SelectItem>
                <SelectItem value="software">ПО</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Заявки</CardTitle>
          <CardDescription>
            Найдено: {filteredRequests.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Заявки не найдены</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery || selectedStatus !== "all" || selectedType !== "all"
                  ? "Попробуйте изменить параметры поиска"
                  : "У вас пока нет заявок"}
              </p>
              {!searchQuery && selectedStatus === "all" && selectedType === "all" && (
                <Button className="mt-4" asChild>
                  <Link href="/dashboard/requests/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Создать первую заявку
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Заявка</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Аудитория</TableHead>
                  <TableHead>Приоритет</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => {
                  const statusInfo = statusConfig[request.status]
                  const StatusIcon = statusInfo.icon
                  const priorityInfo = priorityConfig[request.priority]
                  const EquipmentIcon = request.equipmentType ? equipmentIcons[request.equipmentType] : HelpCircle
                  
                  return (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                            <EquipmentIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="font-medium">{request.title}</div>
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {request.description.substring(0, 50)}...
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {request.type === "repair" ? "Ремонт" : "ПО"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{request.classroomName}</div>
                          {request.workstationName && (
                            <div className="text-sm text-muted-foreground">{request.workstationName}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={priorityInfo.variant}>
                          {priorityInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${statusInfo.color}`} />
                          <span>{statusInfo.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(request.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleView(request)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Детали заявки</DialogTitle>
            <DialogDescription>
              Заявка #{selectedRequest?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{selectedRequest.title}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline">
                    {selectedRequest.type === "repair" ? "Ремонт" : "ПО"}
                  </Badge>
                  <Badge variant={priorityConfig[selectedRequest.priority].variant}>
                    {priorityConfig[selectedRequest.priority].label}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <div className={`h-2 w-2 rounded-full ${statusConfig[selectedRequest.status].color}`} />
                    <span className="text-sm">{statusConfig[selectedRequest.status].label}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Описание:</span>
                  <p className="mt-1">{selectedRequest.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-muted-foreground">Аудитория:</span>
                    <p className="font-medium">{selectedRequest.classroomName}</p>
                  </div>
                  {selectedRequest.workstationName && (
                    <div>
                      <span className="text-muted-foreground">Рабочее место:</span>
                      <p className="font-medium">{selectedRequest.workstationName}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Создано:</span>
                    <p className="font-medium">{formatDate(selectedRequest.createdAt)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Обновлено:</span>
                    <p className="font-medium">{formatDate(selectedRequest.updatedAt)}</p>
                  </div>
                </div>
                
                {selectedRequest.adminComment && (
                  <div className="rounded-lg bg-muted p-3">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <MessageSquare className="h-4 w-4" />
                      <span>Комментарий администратора:</span>
                    </div>
                    <p>{selectedRequest.adminComment}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
