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
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  Calendar,
  Wrench,
  XCircle
} from "lucide-react"

// Типы
type IssueSeverity = "low" | "medium" | "high" | "critical"
type IssueStatus = "open" | "acknowledged" | "in_repair" | "resolved" | "closed"
type IssueType = "hardware" | "software" | "network" | "other"

interface Issue {
  id: string
  title: string
  description: string
  classroom: string
  workstation: string
  equipment: string
  type: IssueType
  severity: IssueSeverity
  status: IssueStatus
  reportedBy: string
  reportedAt: string
  acknowledgedAt: string | null
  resolvedAt: string | null
  resolution: string
  relatedRepairId: string | null
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

// Mock данные неисправностей
const mockIssues: Issue[] = [
  {
    id: "1",
    title: "Не включается монитор",
    description: "Монитор Samsung не реагирует на кнопку включения. Индикатор питания не горит. Кабель питания проверен.",
    classroom: "Аудитория 301",
    workstation: "Рабочее место 1",
    equipment: "Монитор Samsung 24 дюйма",
    type: "hardware",
    severity: "high",
    status: "open",
    reportedBy: "Петров И.С.",
    reportedAt: "2025-03-25",
    acknowledgedAt: null,
    resolvedAt: null,
    resolution: "",
    relatedRepairId: null
  },
  {
    id: "2",
    title: "Зависание системы",
    description: "Компьютер периодически зависает при работе с несколькими приложениями. Требуется перезагрузка.",
    classroom: "Компьютерный класс 105",
    workstation: "Рабочее место 3",
    equipment: "Системный блок Dell OptiPlex",
    type: "hardware",
    severity: "medium",
    status: "in_repair",
    reportedBy: "Иванова А.П.",
    reportedAt: "2025-03-24",
    acknowledgedAt: "2025-03-24",
    resolvedAt: null,
    resolution: "",
    relatedRepairId: "1"
  },
  {
    id: "3",
    title: "Ошибка драйвера принтера",
    description: "При попытке печати выдается ошибка драйвера. Переустановка драйвера не помогает.",
    classroom: "Аудитория 302",
    workstation: "Преподавательское",
    equipment: "Принтер HP LaserJet Pro",
    type: "software",
    severity: "medium",
    status: "acknowledged",
    reportedBy: "Козлов Д.А.",
    reportedAt: "2025-03-23",
    acknowledgedAt: "2025-03-24",
    resolvedAt: null,
    resolution: "",
    relatedRepairId: null
  },
  {
    id: "4",
    title: "Нет подключения к сети",
    description: "Компьютер не видит сетевое подключение. Кабель проверен, на других компьютерах сеть работает.",
    classroom: "Лаборатория 201",
    workstation: "Рабочее место 2",
    equipment: "Системный блок HP ProDesk",
    type: "network",
    severity: "high",
    status: "resolved",
    reportedBy: "Смирнова Е.В.",
    reportedAt: "2025-03-20",
    acknowledgedAt: "2025-03-20",
    resolvedAt: "2025-03-21",
    resolution: "Заменена сетевая карта. Подключение восстановлено.",
    relatedRepairId: null
  },
  {
    id: "5",
    title: "Проектор выключается",
    description: "Проектор самопроизвольно выключается через 10-15 минут работы. Возможно перегрев.",
    classroom: "Лекционный зал 401",
    workstation: "Проекторная",
    equipment: "Проектор Epson EB-X51",
    type: "hardware",
    severity: "critical",
    status: "open",
    reportedBy: "Николаев П.Р.",
    reportedAt: "2025-03-25",
    acknowledgedAt: null,
    resolvedAt: null,
    resolution: "",
    relatedRepairId: null
  },
  {
    id: "6",
    title: "Синий экран при загрузке",
    description: "Компьютер показывает синий экран смерти (BSOD) при загрузке Windows. Ошибка DRIVER_IRQL_NOT_LESS_OR_EQUAL.",
    classroom: "Компьютерный класс 106",
    workstation: "Рабочее место 4",
    equipment: "Системный блок Lenovo ThinkCentre",
    type: "software",
    severity: "high",
    status: "closed",
    reportedBy: "Волкова М.И.",
    reportedAt: "2025-03-18",
    acknowledgedAt: "2025-03-18",
    resolvedAt: "2025-03-19",
    resolution: "Обновлены драйверы, выполнена проверка системных файлов. Система работает стабильно.",
    relatedRepairId: null
  },
]

export default function IssuesPage() {
  const [session, setSession] = useState<MockSession | null>(null)
  const [permissions, setPermissions] = useState<MockPermissions | null>(null)
  const [issues, setIssues] = useState<Issue[]>(mockIssues)
  
  // Диалоги
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  
  // Фильтры
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedClassroom, setSelectedClassroom] = useState("all")
  const [selectedWorkstation, setSelectedWorkstation] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState<IssueStatus | "all">("all")
  const [selectedSeverity, setSelectedSeverity] = useState<IssueSeverity | "all">("all")
  const [selectedType, setSelectedType] = useState<IssueType | "all">("all")
  
  // Форма
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    classroom: "",
    workstation: "",
    equipment: "",
    type: "hardware" as IssueType,
    severity: "medium" as IssueSeverity,
    status: "open" as IssueStatus,
    resolution: ""
  })
  
  useEffect(() => {
    setSession(getMockSession())
    setPermissions(getCurrentMockPermissions())
  }, [])
  
  // Статистика
  const stats = useMemo(() => ({
    total: issues.length,
    open: issues.filter(i => i.status === "open").length,
    acknowledged: issues.filter(i => i.status === "acknowledged").length,
    inRepair: issues.filter(i => i.status === "in_repair").length,
    resolved: issues.filter(i => i.status === "resolved" || i.status === "closed").length,
    critical: issues.filter(i => i.severity === "critical" && i.status !== "resolved" && i.status !== "closed").length,
  }), [issues])
  
  // Фильтрация
  const filteredIssues = useMemo(() => {
    return issues.filter(item => {
      const matchesSearch = 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.equipment.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.reportedBy.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesClassroom = selectedClassroom === "all" || item.classroom === selectedClassroom
      const matchesWorkstation = selectedWorkstation === "all" || item.workstation === selectedWorkstation
      const matchesStatus = selectedStatus === "all" || item.status === selectedStatus
      const matchesSeverity = selectedSeverity === "all" || item.severity === selectedSeverity
      const matchesType = selectedType === "all" || item.type === selectedType
      
      return matchesSearch && matchesClassroom && matchesWorkstation && matchesStatus && matchesSeverity && matchesType
    })
  }, [issues, searchQuery, selectedClassroom, selectedWorkstation, selectedStatus, selectedSeverity, selectedType])
  
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
    setSelectedSeverity("all")
    setSelectedType("all")
  }
  
  const hasFilters = searchQuery || selectedClassroom !== "all" || selectedWorkstation !== "all" || selectedStatus !== "all" || selectedSeverity !== "all" || selectedType !== "all"
  
  // Получить информацию о статусе
  const getStatusInfo = (status: IssueStatus) => {
    const statuses = {
      open: { label: "Открыта", variant: "destructive" as const, icon: AlertCircle },
      acknowledged: { label: "Принята", variant: "secondary" as const, icon: Clock },
      in_repair: { label: "В ремонте", variant: "default" as const, icon: Wrench },
      resolved: { label: "Решена", variant: "outline" as const, icon: CheckCircle },
      closed: { label: "Закрыта", variant: "outline" as const, icon: XCircle },
    }
    return statuses[status]
  }
  
  // Получить информацию о критичности
  const getSeverityInfo = (severity: IssueSeverity) => {
    const severities = {
      low: { label: "Низкая", color: "bg-slate-100 text-slate-700 border-slate-200" },
      medium: { label: "Средняя", color: "bg-blue-100 text-blue-700 border-blue-200" },
      high: { label: "Высокая", color: "bg-orange-100 text-orange-700 border-orange-200" },
      critical: { label: "Критическая", color: "bg-red-100 text-red-700 border-red-200" },
    }
    return severities[severity]
  }
  
  // Получить информацию о типе
  const getTypeInfo = (type: IssueType) => {
    const types = {
      hardware: { label: "Оборудование", color: "bg-purple-100 text-purple-700 border-purple-200" },
      software: { label: "ПО", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
      network: { label: "Сеть", color: "bg-green-100 text-green-700 border-green-200" },
      other: { label: "Другое", color: "bg-gray-100 text-gray-700 border-gray-200" },
    }
    return types[type]
  }
  
  // Обработчики
  const handleView = (item: Issue) => {
    setSelectedIssue(item)
    setViewDialogOpen(true)
  }
  
  const handleEdit = (item: Issue) => {
    setSelectedIssue(item)
    setFormData({
      title: item.title,
      description: item.description,
      classroom: item.classroom,
      workstation: item.workstation,
      equipment: item.equipment,
      type: item.type,
      severity: item.severity,
      status: item.status,
      resolution: item.resolution
    })
    setEditDialogOpen(true)
  }
  
  const handleDelete = (item: Issue) => {
    setSelectedIssue(item)
    setDeleteDialogOpen(true)
  }
  
  const handleAdd = () => {
    setFormData({
      title: "",
      description: "",
      classroom: "",
      workstation: "",
      equipment: "",
      type: "hardware",
      severity: "medium",
      status: "open",
      resolution: ""
    })
    setAddDialogOpen(true)
  }
  
  const handleSaveNew = () => {
    const newIssue: Issue = {
      id: String(Date.now()),
      title: formData.title,
      description: formData.description,
      classroom: formData.classroom,
      workstation: formData.workstation,
      equipment: formData.equipment,
      type: formData.type,
      severity: formData.severity,
      status: "open",
      reportedBy: session?.user.name || "Неизвестный",
      reportedAt: new Date().toISOString().split("T")[0],
      acknowledgedAt: null,
      resolvedAt: null,
      resolution: "",
      relatedRepairId: null
    }
    setIssues([newIssue, ...issues])
    setAddDialogOpen(false)
  }
  
  const handleSaveEdit = () => {
    if (!selectedIssue) return
    
    const updatedIssues = issues.map(i => {
      if (i.id === selectedIssue.id) {
        const now = new Date().toISOString().split("T")[0]
        return {
          ...i,
          title: formData.title,
          description: formData.description,
          classroom: formData.classroom,
          workstation: formData.workstation,
          equipment: formData.equipment,
          type: formData.type,
          severity: formData.severity,
          status: formData.status,
          resolution: formData.resolution,
          acknowledgedAt: formData.status !== "open" && !i.acknowledgedAt ? now : i.acknowledgedAt,
          resolvedAt: (formData.status === "resolved" || formData.status === "closed") && !i.resolvedAt ? now : i.resolvedAt
        }
      }
      return i
    })
    
    setIssues(updatedIssues)
    setEditDialogOpen(false)
  }
  
  const handleConfirmDelete = () => {
    if (!selectedIssue) return
    setIssues(issues.filter(i => i.id !== selectedIssue.id))
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
        <div className="grid gap-4 md:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
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
          <h1 className="text-2xl font-bold tracking-tight">Неисправности</h1>
          <p className="text-muted-foreground">
            Журнал зафиксированных неисправностей оборудования
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить неисправность
        </Button>
      </div>
      
      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Всего</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Открытые</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.open}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Принятые</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.acknowledged}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">В ремонте</CardTitle>
            <Wrench className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.inRepair}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Решены</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
          </CardContent>
        </Card>
        <Card className={stats.critical > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Критические</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${stats.critical > 0 ? "text-red-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.critical > 0 ? "text-red-600" : ""}`}>{stats.critical}</div>
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
                placeholder="Поиск по неисправностям..."
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
            <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as IssueStatus | "all")}>
              <SelectTrigger>
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="open">Открытые</SelectItem>
                <SelectItem value="acknowledged">Принятые</SelectItem>
                <SelectItem value="in_repair">В ремонте</SelectItem>
                <SelectItem value="resolved">Решены</SelectItem>
                <SelectItem value="closed">Закрыты</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="mt-4 flex flex-wrap items-center gap-4">
            {/* Критичность */}
            <Select value={selectedSeverity} onValueChange={(value) => setSelectedSeverity(value as IssueSeverity | "all")}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Критичность" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все уровни</SelectItem>
                <SelectItem value="critical">Критическая</SelectItem>
                <SelectItem value="high">Высокая</SelectItem>
                <SelectItem value="medium">Средняя</SelectItem>
                <SelectItem value="low">Низкая</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Тип */}
            <Select value={selectedType} onValueChange={(value) => setSelectedType(value as IssueType | "all")}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Тип" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                <SelectItem value="hardware">Оборудование</SelectItem>
                <SelectItem value="software">ПО</SelectItem>
                <SelectItem value="network">Сеть</SelectItem>
                <SelectItem value="other">Другое</SelectItem>
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
      
      {/* Таблица неисправностей */}
      <Card>
        <CardHeader>
          <CardTitle>Список неисправностей</CardTitle>
          <CardDescription>
            Найдено: {filteredIssues.length} из {issues.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Неисправность</TableHead>
                <TableHead>Местоположение</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Критичность</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIssues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Неисправности не найдены
                  </TableCell>
                </TableRow>
              ) : (
                filteredIssues.map((item) => {
                  const statusInfo = getStatusInfo(item.status)
                  const severityInfo = getSeverityInfo(item.severity)
                  const typeInfo = getTypeInfo(item.type)
                  const StatusIcon = statusInfo.icon
                  
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.title}</div>
                          <div className="text-sm text-muted-foreground truncate max-w-xs">{item.equipment}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.classroom}</div>
                          <div className="text-sm text-muted-foreground">{item.workstation}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={typeInfo.color}>
                          {typeInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={severityInfo.color}>
                          {severityInfo.label}
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
                          {item.reportedAt}
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
            <DialogTitle>Детали неисправности</DialogTitle>
            <DialogDescription>Подробная информация о неисправности</DialogDescription>
          </DialogHeader>
          {selectedIssue && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{selectedIssue.title}</h3>
                <p className="text-muted-foreground mt-1">{selectedIssue.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Аудитория</Label>
                  <p className="font-medium">{selectedIssue.classroom}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Рабочее место</Label>
                  <p className="font-medium">{selectedIssue.workstation}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Оборудование</Label>
                  <p className="font-medium">{selectedIssue.equipment}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Тип</Label>
                  <div className="mt-1">
                    <Badge variant="outline" className={getTypeInfo(selectedIssue.type).color}>
                      {getTypeInfo(selectedIssue.type).label}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Критичность</Label>
                  <div className="mt-1">
                    <Badge variant="outline" className={getSeverityInfo(selectedIssue.severity).color}>
                      {getSeverityInfo(selectedIssue.severity).label}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Статус</Label>
                  <div className="mt-1">
                    <Badge variant={getStatusInfo(selectedIssue.status).variant}>
                      {getStatusInfo(selectedIssue.status).label}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Сообщил</Label>
                  <p className="font-medium">{selectedIssue.reportedBy}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Дата обнаружения</Label>
                  <p className="font-medium">{selectedIssue.reportedAt}</p>
                </div>
                {selectedIssue.acknowledgedAt && (
                  <div>
                    <Label className="text-muted-foreground">Дата принятия</Label>
                    <p className="font-medium">{selectedIssue.acknowledgedAt}</p>
                  </div>
                )}
                {selectedIssue.resolvedAt && (
                  <div>
                    <Label className="text-muted-foreground">Дата решения</Label>
                    <p className="font-medium">{selectedIssue.resolvedAt}</p>
                  </div>
                )}
              </div>
              
              {selectedIssue.resolution && (
                <div>
                  <Label className="text-muted-foreground">Решение</Label>
                  <p className="mt-1 p-3 bg-muted rounded-md text-sm">{selectedIssue.resolution}</p>
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
            <DialogTitle>Добавить неисправность</DialogTitle>
            <DialogDescription>Зафиксируйте новую неисправность оборудования</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Название</Label>
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
                placeholder="Подробное описание неисправности"
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
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="equipment">Оборудование</Label>
                <Input
                  id="equipment"
                  value={formData.equipment}
                  onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
                  placeholder="Название"
                />
              </div>
              <div className="grid gap-2">
                <Label>Тип</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => setFormData({ ...formData, type: value as IssueType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hardware">Оборудование</SelectItem>
                    <SelectItem value="software">ПО</SelectItem>
                    <SelectItem value="network">Сеть</SelectItem>
                    <SelectItem value="other">Другое</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Критичность</Label>
                <Select 
                  value={formData.severity} 
                  onValueChange={(value) => setFormData({ ...formData, severity: value as IssueSeverity })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Низкая</SelectItem>
                    <SelectItem value="medium">Средняя</SelectItem>
                    <SelectItem value="high">Высокая</SelectItem>
                    <SelectItem value="critical">Критическая</SelectItem>
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
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Диалог редактирования */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Редактировать неисправность</DialogTitle>
            <DialogDescription>Измените информацию о неисправности</DialogDescription>
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
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Статус</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => setFormData({ ...formData, status: value as IssueStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Открыта</SelectItem>
                    <SelectItem value="acknowledged">Принята</SelectItem>
                    <SelectItem value="in_repair">В ремонте</SelectItem>
                    <SelectItem value="resolved">Решена</SelectItem>
                    <SelectItem value="closed">Закрыта</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Критичность</Label>
                <Select 
                  value={formData.severity} 
                  onValueChange={(value) => setFormData({ ...formData, severity: value as IssueSeverity })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Низкая</SelectItem>
                    <SelectItem value="medium">Средняя</SelectItem>
                    <SelectItem value="high">Высокая</SelectItem>
                    <SelectItem value="critical">Критическая</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(formData.status === "resolved" || formData.status === "closed") && (
              <div className="grid gap-2">
                <Label htmlFor="edit-resolution">Решение</Label>
                <Textarea
                  id="edit-resolution"
                  value={formData.resolution}
                  onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                  placeholder="Опишите, как была решена проблема"
                  rows={3}
                />
              </div>
            )}
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
            <AlertDialogTitle>Удалить неисправность?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить запись о неисправности "{selectedIssue?.title}"? 
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
