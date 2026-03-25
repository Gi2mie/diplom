"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  FileText, 
  Download, 
  Package, 
  AlertTriangle, 
  Wrench, 
  School,
  Monitor,
  HardDrive,
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  Printer,
  BarChart3,
  PieChart,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Archive
} from "lucide-react"
import { getMockSession, getCurrentMockPermissions, type MockSession, type MockPermissions } from "@/lib/mock-auth"

// Типы
interface EquipmentByStatus {
  status: string
  label: string
  count: number
  color: string
  percentage: number
}

interface ClassroomIssues {
  classroom: string
  building: string
  totalEquipment: number
  faultyCount: number
  inRepairCount: number
  percentage: number
}

interface EquipmentProblems {
  id: string
  name: string
  type: string
  classroom: string
  problemCount: number
  lastProblem: string
  status: string
}

interface SoftwareByClassroom {
  classroom: string
  building: string
  software: { name: string; version: string; license: string }[]
  totalCount: number
}

interface RepairHistory {
  id: string
  date: string
  equipment: string
  classroom: string
  type: "breakdown" | "repair"
  description: string
  technician?: string
  cost?: number
  status: string
}

// Mock данные
const mockEquipmentByStatus: EquipmentByStatus[] = [
  { status: "working", label: "Исправно", count: 245, color: "#22c55e", percentage: 70 },
  { status: "faulty", label: "Неисправно", count: 35, color: "#ef4444", percentage: 10 },
  { status: "repair", label: "В ремонте", count: 28, color: "#f59e0b", percentage: 8 },
  { status: "written_off", label: "Списано", count: 42, color: "#6b7280", percentage: 12 },
]

const mockClassroomIssues: ClassroomIssues[] = [
  { classroom: "Аудитория 301", building: "Корпус А", totalEquipment: 25, faultyCount: 5, inRepairCount: 2, percentage: 28 },
  { classroom: "Компьютерный класс 105", building: "Корпус Б", totalEquipment: 40, faultyCount: 8, inRepairCount: 3, percentage: 27.5 },
  { classroom: "Лекционный зал 401", building: "Корпус А", totalEquipment: 15, faultyCount: 2, inRepairCount: 1, percentage: 20 },
  { classroom: "Аудитория 202", building: "Корпус В", totalEquipment: 20, faultyCount: 3, inRepairCount: 0, percentage: 15 },
  { classroom: "Лаборатория 112", building: "Корпус Б", totalEquipment: 35, faultyCount: 4, inRepairCount: 1, percentage: 14.3 },
  { classroom: "Аудитория 405", building: "Корпус А", totalEquipment: 18, faultyCount: 1, inRepairCount: 1, percentage: 11.1 },
]

const mockEquipmentProblems: EquipmentProblems[] = [
  { id: "1", name: "Системный блок Dell OptiPlex #12", type: "Системный блок", classroom: "Аудитория 301", problemCount: 8, lastProblem: "2025-03-20", status: "faulty" },
  { id: "2", name: "Принтер HP LaserJet #3", type: "Принтер", classroom: "Компьютерный класс 105", problemCount: 6, lastProblem: "2025-03-18", status: "repair" },
  { id: "3", name: "Монитор Samsung 24\" #7", type: "Монитор", classroom: "Аудитория 202", problemCount: 5, lastProblem: "2025-03-15", status: "working" },
  { id: "4", name: "Проектор Epson EB-X51", type: "Проектор", classroom: "Лекционный зал 401", problemCount: 4, lastProblem: "2025-03-10", status: "repair" },
  { id: "5", name: "Клавиатура Logitech K120 #15", type: "Клавиатура", classroom: "Компьютерный класс 105", problemCount: 4, lastProblem: "2025-03-08", status: "faulty" },
  { id: "6", name: "Мышь Logitech M185 #22", type: "Мышь", classroom: "Лаборатория 112", problemCount: 3, lastProblem: "2025-03-05", status: "working" },
  { id: "7", name: "Системный блок HP ProDesk #5", type: "Системный блок", classroom: "Аудитория 405", problemCount: 3, lastProblem: "2025-03-01", status: "written_off" },
]

const mockSoftwareByClassroom: SoftwareByClassroom[] = [
  { 
    classroom: "Компьютерный класс 105", 
    building: "Корпус Б",
    totalCount: 12,
    software: [
      { name: "Microsoft Office 365", version: "2024", license: "Образовательная" },
      { name: "Visual Studio Code", version: "1.85", license: "Бесплатная" },
      { name: "Python", version: "3.12", license: "Бесплатная" },
      { name: "Adobe Creative Cloud", version: "2024", license: "Коммерческая" },
    ]
  },
  { 
    classroom: "Аудитория 301", 
    building: "Корпус А",
    totalCount: 8,
    software: [
      { name: "Microsoft Office 365", version: "2024", license: "Образовательная" },
      { name: "7-Zip", version: "23.01", license: "Бесплатная" },
      { name: "Google Chrome", version: "122", license: "Бесплатная" },
    ]
  },
  { 
    classroom: "Лаборатория 112", 
    building: "Корпус Б",
    totalCount: 15,
    software: [
      { name: "MATLAB", version: "R2024a", license: "Коммерческая" },
      { name: "AutoCAD", version: "2024", license: "Образовательная" },
      { name: "SolidWorks", version: "2024", license: "Коммерческая" },
      { name: "Python", version: "3.12", license: "Бесплатная" },
      { name: "Anaconda", version: "2024.02", license: "Бесплатная" },
    ]
  },
  { 
    classroom: "Лекционный зал 401", 
    building: "Корпус А",
    totalCount: 5,
    software: [
      { name: "Microsoft Office 365", version: "2024", license: "Образовательная" },
      { name: "Zoom", version: "5.17", license: "Коммерческая" },
    ]
  },
]

const mockRepairHistory: RepairHistory[] = [
  { id: "1", date: "2025-03-25", equipment: "Системный блок Dell OptiPlex #12", classroom: "Аудитория 301", type: "breakdown", description: "Не запускается, синий экран", status: "Новая" },
  { id: "2", date: "2025-03-24", equipment: "Принтер HP LaserJet #3", classroom: "Компьютерный класс 105", type: "repair", description: "Замена картриджа и чистка", technician: "Сидоров А.В.", cost: 2500, status: "Завершён" },
  { id: "3", date: "2025-03-23", equipment: "Монитор Samsung 24\" #7", classroom: "Аудитория 202", type: "breakdown", description: "Мерцание экрана", status: "В работе" },
  { id: "4", date: "2025-03-22", equipment: "Проектор Epson EB-X51", classroom: "Лекционный зал 401", type: "repair", description: "Замена лампы", technician: "Иванов П.С.", cost: 8500, status: "Завершён" },
  { id: "5", date: "2025-03-21", equipment: "Клавиатура Logitech K120 #15", classroom: "Компьютерный класс 105", type: "breakdown", description: "Залипают клавиши", status: "В работе" },
  { id: "6", date: "2025-03-20", equipment: "Системный блок HP ProDesk #8", classroom: "Лаборатория 112", type: "repair", description: "Замена жёсткого диска", technician: "Петров И.И.", cost: 4200, status: "Завершён" },
  { id: "7", date: "2025-03-19", equipment: "Мышь Logitech M185 #22", classroom: "Лаборатория 112", type: "breakdown", description: "Не работает колёсико прокрутки", status: "Закрыта" },
  { id: "8", date: "2025-03-18", equipment: "Монитор LG 27\" #3", classroom: "Аудитория 405", type: "repair", description: "Ремонт блока питания", technician: "Сидоров А.В.", cost: 3100, status: "Завершён" },
  { id: "9", date: "2025-03-15", equipment: "Системный блок Dell OptiPlex #5", classroom: "Компьютерный класс 105", type: "breakdown", description: "Перегрев процессора", status: "В работе" },
  { id: "10", date: "2025-03-12", equipment: "Принтер Canon i-SENSYS", classroom: "Аудитория 301", type: "repair", description: "Профилактическое обслуживание", technician: "Иванов П.С.", cost: 1500, status: "Завершён" },
]

const mockInRepairEquipment = [
  { id: "1", name: "Принтер HP LaserJet #3", classroom: "Компьютерный класс 105", startDate: "2025-03-20", technician: "Сидоров А.В.", progress: 75, estimatedCompletion: "2025-03-26" },
  { id: "2", name: "Проектор Epson EB-X51", classroom: "Лекционный зал 401", startDate: "2025-03-18", technician: "Иванов П.С.", progress: 90, estimatedCompletion: "2025-03-25" },
  { id: "3", name: "Монитор Samsung 24\" #7", classroom: "Аудитория 202", startDate: "2025-03-23", technician: "Петров И.И.", progress: 30, estimatedCompletion: "2025-03-28" },
  { id: "4", name: "Системный блок Dell OptiPlex #5", classroom: "Компьютерный класс 105", startDate: "2025-03-22", technician: "Сидоров А.В.", progress: 50, estimatedCompletion: "2025-03-27" },
]

export default function ReportsPage() {
  const [session, setSession] = useState<MockSession | null>(null)
  const [permissions, setPermissions] = useState<MockPermissions | null>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [dateFrom, setDateFrom] = useState("2025-03-01")
  const [dateTo, setDateTo] = useState("2025-03-25")
  const [selectedBuilding, setSelectedBuilding] = useState("all")
  const [selectedClassroom, setSelectedClassroom] = useState("all")
  
  useEffect(() => {
    setSession(getMockSession())
    setPermissions(getCurrentMockPermissions())
  }, [])
  
  // Общая статистика
  const totalEquipment = mockEquipmentByStatus.reduce((sum, item) => sum + item.count, 0)
  const totalFaulty = mockEquipmentByStatus.find(s => s.status === "faulty")?.count || 0
  const totalInRepair = mockEquipmentByStatus.find(s => s.status === "repair")?.count || 0
  const totalWorking = mockEquipmentByStatus.find(s => s.status === "working")?.count || 0
  
  // Фильтрация истории по дате
  const filteredHistory = useMemo(() => {
    return mockRepairHistory.filter(item => {
      const itemDate = new Date(item.date)
      const from = new Date(dateFrom)
      const to = new Date(dateTo)
      return itemDate >= from && itemDate <= to
    })
  }, [dateFrom, dateTo])
  
  // Статистика по истории
  const historyStats = useMemo(() => {
    const breakdowns = filteredHistory.filter(h => h.type === "breakdown").length
    const repairs = filteredHistory.filter(h => h.type === "repair").length
    const totalCost = filteredHistory
      .filter(h => h.cost)
      .reduce((sum, h) => sum + (h.cost || 0), 0)
    return { breakdowns, repairs, totalCost }
  }, [filteredHistory])
  
  if (!session || !permissions) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "working":
        return <Badge className="bg-green-100 text-green-800">Исправно</Badge>
      case "faulty":
        return <Badge className="bg-red-100 text-red-800">Неисправно</Badge>
      case "repair":
        return <Badge className="bg-yellow-100 text-yellow-800">В ремонте</Badge>
      case "written_off":
        return <Badge className="bg-gray-100 text-gray-800">Списано</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }
  
  const getLicenseBadge = (license: string) => {
    switch (license) {
      case "Бесплатная":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Бесплатная</Badge>
      case "Образовательная":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Образовательная</Badge>
      case "Коммерческая":
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Коммерческая</Badge>
      default:
        return <Badge variant="outline">{license}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Отчёты и аналитика</h1>
          <p className="text-muted-foreground">
            Статистика и отчёты по оборудованию, ремонтам и кабинетам
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Печать
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Экспорт
          </Button>
        </div>
      </div>
      
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего оборудования</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEquipment}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">{totalWorking} исправно</span>
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Неисправно</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalFaulty}</div>
            <p className="text-xs text-muted-foreground">
              {((totalFaulty / totalEquipment) * 100).toFixed(1)}% от общего числа
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">В ремонте</CardTitle>
            <Wrench className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{totalInRepair}</div>
            <p className="text-xs text-muted-foreground">
              {mockInRepairEquipment.length} активных ремонтов
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Затраты на ремонт</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{historyStats.totalCost.toLocaleString()} р.</div>
            <p className="text-xs text-muted-foreground">
              За выбранный период
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="by-status">По статусам</TabsTrigger>
          <TabsTrigger value="classrooms">По кабинетам</TabsTrigger>
          <TabsTrigger value="problems">Проблемное</TabsTrigger>
          <TabsTrigger value="software">ПО</TabsTrigger>
          <TabsTrigger value="history">История</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Equipment by Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Оборудование по статусам
                </CardTitle>
                <CardDescription>Распределение оборудования по текущему статусу</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockEquipmentByStatus.map((item) => (
                    <div key={item.status} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="h-3 w-3 rounded-full" 
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-sm font-medium">{item.label}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {item.count} ({item.percentage}%)
                        </span>
                      </div>
                      <Progress 
                        value={item.percentage} 
                        className="h-2"
                        style={{ 
                          // @ts-ignore
                          '--progress-background': item.color 
                        }}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Equipment in Repair */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Оборудование в ремонте
                </CardTitle>
                <CardDescription>Текущие активные ремонты</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockInRepairEquipment.map((item) => (
                    <div key={item.id} className="space-y-2 rounded-lg border p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.classroom}</p>
                        </div>
                        <Badge variant="outline">{item.progress}%</Badge>
                      </div>
                      <Progress value={item.progress} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Техник: {item.technician}</span>
                        <span>До {item.estimatedCompletion}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Top Problem Equipment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Оборудование с наибольшим количеством проблем
              </CardTitle>
              <CardDescription>Топ-5 единиц оборудования по числу зафиксированных неисправностей</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Оборудование</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Кабинет</TableHead>
                    <TableHead className="text-center">Проблем</TableHead>
                    <TableHead>Последняя</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockEquipmentProblems.slice(0, 5).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.type}</TableCell>
                      <TableCell>{item.classroom}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="destructive">{item.problemCount}</Badge>
                      </TableCell>
                      <TableCell>{item.lastProblem}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* By Status Tab */}
        <TabsContent value="by-status" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {mockEquipmentByStatus.map((item) => (
              <Card key={item.status}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <div 
                      className="h-3 w-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    {item.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold" style={{ color: item.color }}>
                    {item.count}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.percentage}% от общего числа
                  </p>
                  <Progress 
                    value={item.percentage} 
                    className="h-2 mt-3"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Детализация по статусам</CardTitle>
              <CardDescription>Полный список оборудования, сгруппированный по статусу</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {mockEquipmentByStatus.map((status) => (
                  <div key={status.status} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-4 w-4 rounded-full" 
                        style={{ backgroundColor: status.color }}
                      />
                      <h4 className="font-semibold">{status.label}</h4>
                      <Badge variant="secondary">{status.count}</Badge>
                    </div>
                    <div className="ml-6 text-sm text-muted-foreground">
                      {status.status === "working" && "Оборудование работает исправно и готово к использованию"}
                      {status.status === "faulty" && "Оборудование неисправно и требует ремонта или замены"}
                      {status.status === "repair" && "Оборудование находится на ремонте у техников"}
                      {status.status === "written_off" && "Оборудование списано и не подлежит эксплуатации"}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Classrooms Tab */}
        <TabsContent value="classrooms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <School className="h-5 w-5" />
                Кабинеты с наибольшим числом неисправностей
              </CardTitle>
              <CardDescription>Рейтинг кабинетов по количеству неисправного оборудования</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Кабинет</TableHead>
                    <TableHead>Корпус</TableHead>
                    <TableHead className="text-center">Всего</TableHead>
                    <TableHead className="text-center">Неисправно</TableHead>
                    <TableHead className="text-center">В ремонте</TableHead>
                    <TableHead>Процент проблем</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockClassroomIssues.map((item, index) => (
                    <TableRow key={item.classroom}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {index < 3 && (
                            <Badge variant={index === 0 ? "destructive" : "secondary"} className="w-6 h-6 rounded-full p-0 flex items-center justify-center">
                              {index + 1}
                            </Badge>
                          )}
                          <span className="font-medium">{item.classroom}</span>
                        </div>
                      </TableCell>
                      <TableCell>{item.building}</TableCell>
                      <TableCell className="text-center">{item.totalEquipment}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="destructive">{item.faultyCount}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700">{item.inRepairCount}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={item.percentage} className="h-2 w-20" />
                          <span className="text-sm text-muted-foreground">{item.percentage}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Неисправное оборудование по кабинетам</CardTitle>
              <CardDescription>Визуализация распределения проблемного оборудования</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {mockClassroomIssues.map((item) => (
                  <div key={item.classroom} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{item.classroom}</p>
                        <p className="text-xs text-muted-foreground">{item.building}</p>
                      </div>
                      <Badge variant={item.percentage > 20 ? "destructive" : "secondary"}>
                        {item.percentage}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded bg-muted p-2">
                        <p className="text-lg font-bold">{item.totalEquipment}</p>
                        <p className="text-xs text-muted-foreground">Всего</p>
                      </div>
                      <div className="rounded bg-red-50 p-2">
                        <p className="text-lg font-bold text-red-600">{item.faultyCount}</p>
                        <p className="text-xs text-muted-foreground">Неиспр.</p>
                      </div>
                      <div className="rounded bg-yellow-50 p-2">
                        <p className="text-lg font-bold text-yellow-600">{item.inRepairCount}</p>
                        <p className="text-xs text-muted-foreground">Ремонт</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Problems Tab */}
        <TabsContent value="problems" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Оборудование с наибольшим количеством проблем
              </CardTitle>
              <CardDescription>Полный список оборудования, отсортированный по количеству зафиксированных проблем</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Оборудование</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Кабинет</TableHead>
                    <TableHead className="text-center">Кол-во проблем</TableHead>
                    <TableHead>Последняя проблема</TableHead>
                    <TableHead>Текущий статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockEquipmentProblems.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge 
                          variant={index < 3 ? "destructive" : "secondary"}
                          className="w-8 h-8 rounded-full p-0 flex items-center justify-center"
                        >
                          {index + 1}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.type}</TableCell>
                      <TableCell>{item.classroom}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span className="font-bold text-red-600">{item.problemCount}</span>
                        </div>
                      </TableCell>
                      <TableCell>{item.lastProblem}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Software Tab */}
        <TabsContent value="software" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Установленное ПО по кабинетам
              </CardTitle>
              <CardDescription>Список программного обеспечения, установленного в каждом кабинете</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {mockSoftwareByClassroom.map((classroom) => (
                  <div key={classroom.classroom} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-semibold">{classroom.classroom}</h4>
                        <p className="text-sm text-muted-foreground">{classroom.building}</p>
                      </div>
                      <Badge variant="secondary">{classroom.totalCount} программ</Badge>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Название</TableHead>
                          <TableHead>Версия</TableHead>
                          <TableHead>Лицензия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classroom.software.map((sw, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{sw.name}</TableCell>
                            <TableCell>{sw.version}</TableCell>
                            <TableCell>{getLicenseBadge(sw.license)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          {/* Date Filter */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Фильтр по периоду
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-end gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="dateFrom">Дата с</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dateTo">Дата по</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    const today = new Date()
                    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
                    setDateFrom(weekAgo.toISOString().split('T')[0])
                    setDateTo(today.toISOString().split('T')[0])
                  }}>
                    Неделя
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    const today = new Date()
                    const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())
                    setDateFrom(monthAgo.toISOString().split('T')[0])
                    setDateTo(today.toISOString().split('T')[0])
                  }}>
                    Месяц
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    const today = new Date()
                    const yearStart = new Date(today.getFullYear(), 0, 1)
                    setDateFrom(yearStart.toISOString().split('T')[0])
                    setDateTo(today.toISOString().split('T')[0])
                  }}>
                    С начала года
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* History Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Поломок за период</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{historyStats.breakdowns}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ремонтов завершено</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{historyStats.repairs}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Затраты на ремонт</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{historyStats.totalCost.toLocaleString()} р.</div>
              </CardContent>
            </Card>
          </div>
          
          {/* History Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                История поломок и ремонтов
              </CardTitle>
              <CardDescription>
                Записи за период с {dateFrom} по {dateTo} ({filteredHistory.length} записей)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Оборудование</TableHead>
                    <TableHead>Кабинет</TableHead>
                    <TableHead>Описание</TableHead>
                    <TableHead>Техник</TableHead>
                    <TableHead className="text-right">Стоимость</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Нет записей за выбранный период
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredHistory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">{item.date}</TableCell>
                        <TableCell>
                          {item.type === "breakdown" ? (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              Поломка
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800 gap-1">
                              <Wrench className="h-3 w-3" />
                              Ремонт
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{item.equipment}</TableCell>
                        <TableCell>{item.classroom}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={item.description}>
                          {item.description}
                        </TableCell>
                        <TableCell>{item.technician || "-"}</TableCell>
                        <TableCell className="text-right">
                          {item.cost ? `${item.cost.toLocaleString()} р.` : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            item.status === "Завершён" ? "default" :
                            item.status === "В работе" ? "secondary" :
                            item.status === "Новая" ? "outline" :
                            "outline"
                          }>
                            {item.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
