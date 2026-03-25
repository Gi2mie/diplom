"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Cpu,
  HardDrive,
  MemoryStick,
  CircuitBoard,
  X,
  RefreshCw,
  Download,
  School,
  MonitorSmartphone,
  Laptop,
  Server
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
import { Separator } from "@/components/ui/separator"
import { getMockSession, getCurrentMockPermissions, type MockSession, type MockPermissions } from "@/lib/mock-auth"

// Типы
type PCStatus = "active" | "inactive" | "repair" | "decommissioned"

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
}

interface PCConfig {
  id: string
  name: string
  workstationId: string
  classroomId: string
  status: PCStatus
  // Процессор
  cpuModel: string
  cpuCores: number
  cpuFrequency: string
  // Оперативная память
  ramSize: number
  ramType: string
  ramFrequency: string
  // Накопители
  storageType: string
  storageSize: number
  hasSecondaryStorage: boolean
  secondaryStorageType: string
  secondaryStorageSize: number
  // Видеокарта
  gpuModel: string
  gpuMemory: number
  // Материнская плата
  motherboardModel: string
  // Сеть
  networkType: string
  macAddress: string
  ipAddress: string
  // ОС
  osName: string
  osVersion: string
  // Прочее
  inventoryNumber: string
  purchaseDate: string
  warrantyEnd: string
  lastUpdate: string
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
const mockWorkstations: Workstation[] = [
  { id: "1", name: "Рабочее место 1", number: "RM-301-01", classroomId: "1" },
  { id: "2", name: "Рабочее место 2", number: "RM-301-02", classroomId: "1" },
  { id: "3", name: "Рабочее место 1", number: "RM-105-01", classroomId: "2" },
  { id: "4", name: "Рабочее место 2", number: "RM-105-02", classroomId: "2" },
  { id: "5", name: "Рабочее место 3", number: "RM-105-03", classroomId: "2" },
  { id: "6", name: "Рабочее место 4", number: "RM-105-04", classroomId: "2" },
  { id: "7", name: "Рабочее место 1", number: "RM-401-01", classroomId: "3" },
  { id: "8", name: "Рабочее место 1", number: "RM-201-01", classroomId: "4" },
  { id: "9", name: "Рабочее место 2", number: "RM-201-02", classroomId: "4" },
]

// Mock данные конфигураций ПК
const initialPCConfigs: PCConfig[] = [
  {
    id: "1",
    name: "PC-301-01",
    workstationId: "1",
    classroomId: "1",
    status: "active",
    cpuModel: "Intel Core i5-12400",
    cpuCores: 6,
    cpuFrequency: "2.5 GHz",
    ramSize: 16,
    ramType: "DDR4",
    ramFrequency: "3200 MHz",
    storageType: "SSD NVMe",
    storageSize: 512,
    hasSecondaryStorage: true,
    secondaryStorageType: "HDD",
    secondaryStorageSize: 1000,
    gpuModel: "Intel UHD Graphics 730",
    gpuMemory: 0,
    motherboardModel: "ASUS PRIME B660M-K",
    networkType: "Ethernet 1Gbps",
    macAddress: "AA:BB:CC:DD:EE:01",
    ipAddress: "192.168.1.101",
    osName: "Windows",
    osVersion: "11 Pro",
    inventoryNumber: "INV-2024-0001",
    purchaseDate: "2024-01-15",
    warrantyEnd: "2027-01-15",
    lastUpdate: "2025-03-15",
    notes: "Компьютер преподавателя"
  },
  {
    id: "2",
    name: "PC-301-02",
    workstationId: "2",
    classroomId: "1",
    status: "active",
    cpuModel: "Intel Core i5-12400",
    cpuCores: 6,
    cpuFrequency: "2.5 GHz",
    ramSize: 16,
    ramType: "DDR4",
    ramFrequency: "3200 MHz",
    storageType: "SSD NVMe",
    storageSize: 256,
    hasSecondaryStorage: false,
    secondaryStorageType: "",
    secondaryStorageSize: 0,
    gpuModel: "Intel UHD Graphics 730",
    gpuMemory: 0,
    motherboardModel: "ASUS PRIME B660M-K",
    networkType: "Ethernet 1Gbps",
    macAddress: "AA:BB:CC:DD:EE:02",
    ipAddress: "192.168.1.102",
    osName: "Windows",
    osVersion: "11 Pro",
    inventoryNumber: "INV-2024-0002",
    purchaseDate: "2024-01-15",
    warrantyEnd: "2027-01-15",
    lastUpdate: "2025-03-15",
    notes: ""
  },
  {
    id: "3",
    name: "PC-105-01",
    workstationId: "3",
    classroomId: "2",
    status: "active",
    cpuModel: "AMD Ryzen 7 5800X",
    cpuCores: 8,
    cpuFrequency: "3.8 GHz",
    ramSize: 32,
    ramType: "DDR4",
    ramFrequency: "3600 MHz",
    storageType: "SSD NVMe",
    storageSize: 1000,
    hasSecondaryStorage: true,
    secondaryStorageType: "HDD",
    secondaryStorageSize: 2000,
    gpuModel: "NVIDIA GeForce RTX 3060",
    gpuMemory: 12,
    motherboardModel: "MSI B550 TOMAHAWK",
    networkType: "Ethernet 1Gbps",
    macAddress: "AA:BB:CC:DD:EE:03",
    ipAddress: "192.168.1.201",
    osName: "Windows",
    osVersion: "11 Pro",
    inventoryNumber: "INV-2024-0010",
    purchaseDate: "2024-02-20",
    warrantyEnd: "2027-02-20",
    lastUpdate: "2025-03-10",
    notes: "Мощный ПК для графических работ"
  },
  {
    id: "4",
    name: "PC-105-02",
    workstationId: "4",
    classroomId: "2",
    status: "active",
    cpuModel: "AMD Ryzen 5 5600X",
    cpuCores: 6,
    cpuFrequency: "3.7 GHz",
    ramSize: 16,
    ramType: "DDR4",
    ramFrequency: "3200 MHz",
    storageType: "SSD NVMe",
    storageSize: 512,
    hasSecondaryStorage: false,
    secondaryStorageType: "",
    secondaryStorageSize: 0,
    gpuModel: "NVIDIA GeForce GTX 1660",
    gpuMemory: 6,
    motherboardModel: "ASRock B550M Pro4",
    networkType: "Ethernet 1Gbps",
    macAddress: "AA:BB:CC:DD:EE:04",
    ipAddress: "192.168.1.202",
    osName: "Windows",
    osVersion: "10 Pro",
    inventoryNumber: "INV-2023-0055",
    purchaseDate: "2023-09-01",
    warrantyEnd: "2026-09-01",
    lastUpdate: "2025-02-28",
    notes: ""
  },
  {
    id: "5",
    name: "PC-105-03",
    workstationId: "5",
    classroomId: "2",
    status: "repair",
    cpuModel: "Intel Core i7-11700",
    cpuCores: 8,
    cpuFrequency: "2.5 GHz",
    ramSize: 16,
    ramType: "DDR4",
    ramFrequency: "3200 MHz",
    storageType: "SSD SATA",
    storageSize: 480,
    hasSecondaryStorage: false,
    secondaryStorageType: "",
    secondaryStorageSize: 0,
    gpuModel: "Intel UHD Graphics 750",
    gpuMemory: 0,
    motherboardModel: "Gigabyte B560M DS3H",
    networkType: "Ethernet 1Gbps",
    macAddress: "AA:BB:CC:DD:EE:05",
    ipAddress: "192.168.1.203",
    osName: "Windows",
    osVersion: "10 Pro",
    inventoryNumber: "INV-2022-0123",
    purchaseDate: "2022-03-15",
    warrantyEnd: "2025-03-15",
    lastUpdate: "2025-03-20",
    notes: "На ремонте - неисправен блок питания"
  },
  {
    id: "6",
    name: "PC-201-01",
    workstationId: "8",
    classroomId: "4",
    status: "active",
    cpuModel: "Intel Core i9-12900K",
    cpuCores: 16,
    cpuFrequency: "3.2 GHz",
    ramSize: 64,
    ramType: "DDR5",
    ramFrequency: "4800 MHz",
    storageType: "SSD NVMe",
    storageSize: 2000,
    hasSecondaryStorage: true,
    secondaryStorageType: "SSD NVMe",
    secondaryStorageSize: 2000,
    gpuModel: "NVIDIA GeForce RTX 4080",
    gpuMemory: 16,
    motherboardModel: "ASUS ROG STRIX Z690-E",
    networkType: "Ethernet 2.5Gbps",
    macAddress: "AA:BB:CC:DD:EE:10",
    ipAddress: "192.168.2.101",
    osName: "Windows",
    osVersion: "11 Pro",
    inventoryNumber: "INV-2024-0100",
    purchaseDate: "2024-06-01",
    warrantyEnd: "2027-06-01",
    lastUpdate: "2025-03-01",
    notes: "Рабочая станция для научных вычислений"
  },
  {
    id: "7",
    name: "PC-201-02",
    workstationId: "9",
    classroomId: "4",
    status: "inactive",
    cpuModel: "Intel Core i5-10400",
    cpuCores: 6,
    cpuFrequency: "2.9 GHz",
    ramSize: 8,
    ramType: "DDR4",
    ramFrequency: "2666 MHz",
    storageType: "HDD",
    storageSize: 500,
    hasSecondaryStorage: false,
    secondaryStorageType: "",
    secondaryStorageSize: 0,
    gpuModel: "Intel UHD Graphics 630",
    gpuMemory: 0,
    motherboardModel: "Gigabyte H410M S2H",
    networkType: "Ethernet 1Gbps",
    macAddress: "AA:BB:CC:DD:EE:11",
    ipAddress: "192.168.2.102",
    osName: "Windows",
    osVersion: "10 Home",
    inventoryNumber: "INV-2020-0050",
    purchaseDate: "2020-09-01",
    warrantyEnd: "2023-09-01",
    lastUpdate: "2024-12-15",
    notes: "Устаревший ПК, планируется замена"
  },
]

const statusLabels: Record<PCStatus, string> = {
  active: "Активен",
  inactive: "Неактивен",
  repair: "На ремонте",
  decommissioned: "Списан"
}

const statusColors: Record<PCStatus, string> = {
  active: "bg-green-100 text-green-800 border-green-200",
  inactive: "bg-gray-100 text-gray-800 border-gray-200",
  repair: "bg-yellow-100 text-yellow-800 border-yellow-200",
  decommissioned: "bg-red-100 text-red-800 border-red-200"
}

export default function PCConfigPage() {
  const [session, setSession] = useState<MockSession | null>(null)
  const [permissions, setPermissions] = useState<MockPermissions | null>(null)
  const [pcConfigs, setPCConfigs] = useState<PCConfig[]>(initialPCConfigs)
  
  // Фильтры и поиск
  const [searchQuery, setSearchQuery] = useState("")
  const [classroomFilter, setClassroomFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  
  // Диалоги
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedPC, setSelectedPC] = useState<PCConfig | null>(null)
  
  // Форма
  const [formData, setFormData] = useState<Partial<PCConfig>>({
    name: "",
    workstationId: "",
    classroomId: "",
    status: "active",
    cpuModel: "",
    cpuCores: 4,
    cpuFrequency: "",
    ramSize: 8,
    ramType: "DDR4",
    ramFrequency: "",
    storageType: "SSD NVMe",
    storageSize: 256,
    hasSecondaryStorage: false,
    secondaryStorageType: "",
    secondaryStorageSize: 0,
    gpuModel: "",
    gpuMemory: 0,
    motherboardModel: "",
    networkType: "Ethernet 1Gbps",
    macAddress: "",
    ipAddress: "",
    osName: "Windows",
    osVersion: "",
    inventoryNumber: "",
    purchaseDate: "",
    warrantyEnd: "",
    notes: ""
  })

  useEffect(() => {
    setSession(getMockSession())
    setPermissions(getCurrentMockPermissions())
  }, [])

  // Фильтрация данных
  const filteredPCs = useMemo(() => {
    return pcConfigs.filter(pc => {
      // Поиск по номеру рабочего места
      const workstation = mockWorkstations.find(w => w.id === pc.workstationId)
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch = searchQuery === "" || 
        pc.name.toLowerCase().includes(searchLower) ||
        (workstation?.number.toLowerCase().includes(searchLower)) ||
        pc.cpuModel.toLowerCase().includes(searchLower) ||
        pc.inventoryNumber.toLowerCase().includes(searchLower) ||
        pc.ipAddress.includes(searchQuery)
      
      // Фильтр по аудитории
      const matchesClassroom = classroomFilter === "all" || pc.classroomId === classroomFilter
      
      // Фильтр по статусу
      const matchesStatus = statusFilter === "all" || pc.status === statusFilter
      
      return matchesSearch && matchesClassroom && matchesStatus
    })
  }, [pcConfigs, searchQuery, classroomFilter, statusFilter])

  // Статистика
  const stats = useMemo(() => {
    return {
      total: pcConfigs.length,
      active: pcConfigs.filter(pc => pc.status === "active").length,
      inactive: pcConfigs.filter(pc => pc.status === "inactive").length,
      repair: pcConfigs.filter(pc => pc.status === "repair").length,
      decommissioned: pcConfigs.filter(pc => pc.status === "decommissioned").length
    }
  }, [pcConfigs])

  // Получить рабочие места по аудитории
  const getWorkstationsByClassroom = (classroomId: string) => {
    return mockWorkstations.filter(w => w.classroomId === classroomId)
  }

  // Обработчики
  const handleAdd = () => {
    const newPC: PCConfig = {
      ...formData as PCConfig,
      id: String(Date.now()),
      lastUpdate: new Date().toISOString().split('T')[0]
    }
    setPCConfigs([...pcConfigs, newPC])
    setIsAddDialogOpen(false)
    resetForm()
  }

  const handleEdit = () => {
    if (!selectedPC) return
    setPCConfigs(pcConfigs.map(pc => 
      pc.id === selectedPC.id 
        ? { ...formData as PCConfig, id: selectedPC.id, lastUpdate: new Date().toISOString().split('T')[0] } 
        : pc
    ))
    setIsEditDialogOpen(false)
    setSelectedPC(null)
    resetForm()
  }

  const handleDelete = () => {
    if (!selectedPC) return
    setPCConfigs(pcConfigs.filter(pc => pc.id !== selectedPC.id))
    setIsDeleteDialogOpen(false)
    setSelectedPC(null)
  }

  const openEditDialog = (pc: PCConfig) => {
    setSelectedPC(pc)
    setFormData(pc)
    setIsEditDialogOpen(true)
  }

  const openViewDialog = (pc: PCConfig) => {
    setSelectedPC(pc)
    setIsViewDialogOpen(true)
  }

  const openDeleteDialog = (pc: PCConfig) => {
    setSelectedPC(pc)
    setIsDeleteDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      workstationId: "",
      classroomId: "",
      status: "active",
      cpuModel: "",
      cpuCores: 4,
      cpuFrequency: "",
      ramSize: 8,
      ramType: "DDR4",
      ramFrequency: "",
      storageType: "SSD NVMe",
      storageSize: 256,
      hasSecondaryStorage: false,
      secondaryStorageType: "",
      secondaryStorageSize: 0,
      gpuModel: "",
      gpuMemory: 0,
      motherboardModel: "",
      networkType: "Ethernet 1Gbps",
      macAddress: "",
      ipAddress: "",
      osName: "Windows",
      osVersion: "",
      inventoryNumber: "",
      purchaseDate: "",
      warrantyEnd: "",
      notes: ""
    })
  }

  const resetFilters = () => {
    setSearchQuery("")
    setClassroomFilter("all")
    setStatusFilter("all")
  }

  const getClassroomName = (classroomId: string) => {
    return mockClassrooms.find(c => c.id === classroomId)?.name || "Неизвестно"
  }

  const getWorkstationNumber = (workstationId: string) => {
    return mockWorkstations.find(w => w.id === workstationId)?.number || "Неизвестно"
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
          <CardContent className="p-6">
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
      {/* Заголовок */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Конфигурация ПК</h1>
          <p className="text-muted-foreground">
            Управление характеристиками компьютеров на рабочих местах
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Экспорт
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить ПК
          </Button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего ПК</CardTitle>
            <Laptop className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активных</CardTitle>
            <Server className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Неактивных</CardTitle>
            <Server className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">{stats.inactive}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">На ремонте</CardTitle>
            <Server className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.repair}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Списано</CardTitle>
            <Server className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.decommissioned}</div>
          </CardContent>
        </Card>
      </div>

      {/* Фильтры */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск по номеру рабочего места, IP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={classroomFilter} onValueChange={setClassroomFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Все аудитории" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все аудитории</SelectItem>
                {mockClassrooms.map((classroom) => (
                  <SelectItem key={classroom.id} value={classroom.id}>
                    {classroom.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="active">Активен</SelectItem>
                <SelectItem value="inactive">Неактивен</SelectItem>
                <SelectItem value="repair">На ремонте</SelectItem>
                <SelectItem value="decommissioned">Списан</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={resetFilters}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Сбросить
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Таблица */}
      <Card>
        <CardHeader>
          <CardTitle>Список конфигураций ПК</CardTitle>
          <CardDescription>
            Найдено: {filteredPCs.length} из {pcConfigs.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Имя ПК</TableHead>
                <TableHead>Рабочее место</TableHead>
                <TableHead>Аудитория</TableHead>
                <TableHead>Процессор</TableHead>
                <TableHead>ОЗУ</TableHead>
                <TableHead>Накопитель</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="w-[70px]">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPCs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Laptop className="h-8 w-8 mb-2" />
                      <p>Конфигурации ПК не найдены</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPCs.map((pc) => (
                  <TableRow key={pc.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Laptop className="h-4 w-4 text-muted-foreground" />
                        {pc.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getWorkstationNumber(pc.workstationId)}</Badge>
                    </TableCell>
                    <TableCell>{getClassroomName(pc.classroomId)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{pc.cpuModel}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <MemoryStick className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{pc.ramSize} ГБ {pc.ramType}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{pc.storageType} {pc.storageSize} ГБ</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[pc.status]} variant="outline">
                        {statusLabels[pc.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Действия</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openViewDialog(pc)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Просмотр
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(pc)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Редактировать
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => openDeleteDialog(pc)}
                            className="text-red-600"
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

      {/* Диалог просмотра */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Laptop className="h-5 w-5" />
              Конфигурация ПК: {selectedPC?.name}
            </DialogTitle>
            <DialogDescription>
              Рабочее место: {selectedPC && getWorkstationNumber(selectedPC.workstationId)} | 
              Аудитория: {selectedPC && getClassroomName(selectedPC.classroomId)}
            </DialogDescription>
          </DialogHeader>
          
          {selectedPC && (
            <div className="space-y-6">
              {/* Статус */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Статус:</span>
                <Badge className={statusColors[selectedPC.status]} variant="outline">
                  {statusLabels[selectedPC.status]}
                </Badge>
              </div>
              
              <Separator />
              
              {/* Процессор */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  Процессор
                </h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Модель:</span>
                    <p className="font-medium">{selectedPC.cpuModel}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ядер:</span>
                    <p className="font-medium">{selectedPC.cpuCores}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Частота:</span>
                    <p className="font-medium">{selectedPC.cpuFrequency}</p>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* Оперативная память */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <MemoryStick className="h-4 w-4" />
                  Оперативная память
                </h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Объём:</span>
                    <p className="font-medium">{selectedPC.ramSize} ГБ</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Тип:</span>
                    <p className="font-medium">{selectedPC.ramType}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Частота:</span>
                    <p className="font-medium">{selectedPC.ramFrequency}</p>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* Накопители */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  Накопители
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Основной:</span>
                    <p className="font-medium">{selectedPC.storageType} {selectedPC.storageSize} ГБ</p>
                  </div>
                  {selectedPC.hasSecondaryStorage && (
                    <div>
                      <span className="text-muted-foreground">Дополнительный:</span>
                      <p className="font-medium">{selectedPC.secondaryStorageType} {selectedPC.secondaryStorageSize} ГБ</p>
                    </div>
                  )}
                </div>
              </div>
              
              <Separator />
              
              {/* Видеокарта */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <CircuitBoard className="h-4 w-4" />
                  Видеокарта
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Модель:</span>
                    <p className="font-medium">{selectedPC.gpuModel}</p>
                  </div>
                  {selectedPC.gpuMemory > 0 && (
                    <div>
                      <span className="text-muted-foreground">Видеопамять:</span>
                      <p className="font-medium">{selectedPC.gpuMemory} ГБ</p>
                    </div>
                  )}
                </div>
              </div>
              
              <Separator />
              
              {/* Сеть */}
              <div className="space-y-3">
                <h4 className="font-medium">Сетевые настройки</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Тип подключения:</span>
                    <p className="font-medium">{selectedPC.networkType}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">IP-адрес:</span>
                    <p className="font-medium">{selectedPC.ipAddress}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">MAC-адрес:</span>
                    <p className="font-medium">{selectedPC.macAddress}</p>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* ОС и прочее */}
              <div className="space-y-3">
                <h4 className="font-medium">Прочая информация</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Операционная система:</span>
                    <p className="font-medium">{selectedPC.osName} {selectedPC.osVersion}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Материнская плата:</span>
                    <p className="font-medium">{selectedPC.motherboardModel}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Инвентарный номер:</span>
                    <p className="font-medium">{selectedPC.inventoryNumber}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Дата покупки:</span>
                    <p className="font-medium">{selectedPC.purchaseDate}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Гарантия до:</span>
                    <p className="font-medium">{selectedPC.warrantyEnd}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Последнее обновление:</span>
                    <p className="font-medium">{selectedPC.lastUpdate}</p>
                  </div>
                </div>
                {selectedPC.notes && (
                  <div>
                    <span className="text-muted-foreground">Примечания:</span>
                    <p className="font-medium mt-1">{selectedPC.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Закрыть
            </Button>
            <Button onClick={() => {
              setIsViewDialogOpen(false)
              if (selectedPC) openEditDialog(selectedPC)
            }}>
              <Pencil className="mr-2 h-4 w-4" />
              Редактировать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог добавления */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Добавить конфигурацию ПК</DialogTitle>
            <DialogDescription>
              Укажите характеристики нового компьютера
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Основная информация */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Основная информация</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Имя ПК</Label>
                  <Input
                    id="name"
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="PC-301-01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inventoryNumber">Инвентарный номер</Label>
                  <Input
                    id="inventoryNumber"
                    value={formData.inventoryNumber || ""}
                    onChange={(e) => setFormData({ ...formData, inventoryNumber: e.target.value })}
                    placeholder="INV-2024-0001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="classroomId">Аудитория</Label>
                  <Select 
                    value={formData.classroomId || ""} 
                    onValueChange={(value) => setFormData({ ...formData, classroomId: value, workstationId: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите аудиторию" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockClassrooms.map((classroom) => (
                        <SelectItem key={classroom.id} value={classroom.id}>
                          {classroom.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workstationId">Рабочее место</Label>
                  <Select 
                    value={formData.workstationId || ""} 
                    onValueChange={(value) => setFormData({ ...formData, workstationId: value })}
                    disabled={!formData.classroomId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите рабочее место" />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.classroomId && getWorkstationsByClassroom(formData.classroomId).map((ws) => (
                        <SelectItem key={ws.id} value={ws.id}>
                          {ws.number} - {ws.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Статус</Label>
                  <Select 
                    value={formData.status || "active"} 
                    onValueChange={(value) => setFormData({ ...formData, status: value as PCStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Активен</SelectItem>
                      <SelectItem value="inactive">Неактивен</SelectItem>
                      <SelectItem value="repair">На ремонте</SelectItem>
                      <SelectItem value="decommissioned">Списан</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Процессор */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Процессор</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cpuModel">Модель</Label>
                  <Input
                    id="cpuModel"
                    value={formData.cpuModel || ""}
                    onChange={(e) => setFormData({ ...formData, cpuModel: e.target.value })}
                    placeholder="Intel Core i5-12400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpuCores">Ядер</Label>
                  <Input
                    id="cpuCores"
                    type="number"
                    value={formData.cpuCores || 4}
                    onChange={(e) => setFormData({ ...formData, cpuCores: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpuFrequency">Частота</Label>
                  <Input
                    id="cpuFrequency"
                    value={formData.cpuFrequency || ""}
                    onChange={(e) => setFormData({ ...formData, cpuFrequency: e.target.value })}
                    placeholder="2.5 GHz"
                  />
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* ОЗУ */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Оперативная память</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ramSize">Объём (ГБ)</Label>
                  <Input
                    id="ramSize"
                    type="number"
                    value={formData.ramSize || 8}
                    onChange={(e) => setFormData({ ...formData, ramSize: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ramType">Тип</Label>
                  <Select 
                    value={formData.ramType || "DDR4"} 
                    onValueChange={(value) => setFormData({ ...formData, ramType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DDR3">DDR3</SelectItem>
                      <SelectItem value="DDR4">DDR4</SelectItem>
                      <SelectItem value="DDR5">DDR5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ramFrequency">Частота</Label>
                  <Input
                    id="ramFrequency"
                    value={formData.ramFrequency || ""}
                    onChange={(e) => setFormData({ ...formData, ramFrequency: e.target.value })}
                    placeholder="3200 MHz"
                  />
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Накопители */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Накопители</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="storageType">Тип основного</Label>
                  <Select 
                    value={formData.storageType || "SSD NVMe"} 
                    onValueChange={(value) => setFormData({ ...formData, storageType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HDD">HDD</SelectItem>
                      <SelectItem value="SSD SATA">SSD SATA</SelectItem>
                      <SelectItem value="SSD NVMe">SSD NVMe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storageSize">Объём (ГБ)</Label>
                  <Input
                    id="storageSize"
                    type="number"
                    value={formData.storageSize || 256}
                    onChange={(e) => setFormData({ ...formData, storageSize: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Видеокарта */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Видеокарта</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gpuModel">Модель</Label>
                  <Input
                    id="gpuModel"
                    value={formData.gpuModel || ""}
                    onChange={(e) => setFormData({ ...formData, gpuModel: e.target.value })}
                    placeholder="Intel UHD Graphics 730"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gpuMemory">Видеопамять (ГБ)</Label>
                  <Input
                    id="gpuMemory"
                    type="number"
                    value={formData.gpuMemory || 0}
                    onChange={(e) => setFormData({ ...formData, gpuMemory: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Сеть */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Сеть</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="networkType">Тип подключения</Label>
                  <Select 
                    value={formData.networkType || "Ethernet 1Gbps"} 
                    onValueChange={(value) => setFormData({ ...formData, networkType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ethernet 100Mbps">Ethernet 100Mbps</SelectItem>
                      <SelectItem value="Ethernet 1Gbps">Ethernet 1Gbps</SelectItem>
                      <SelectItem value="Ethernet 2.5Gbps">Ethernet 2.5Gbps</SelectItem>
                      <SelectItem value="Wi-Fi">Wi-Fi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ipAddress">IP-адрес</Label>
                  <Input
                    id="ipAddress"
                    value={formData.ipAddress || ""}
                    onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                    placeholder="192.168.1.100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="macAddress">MAC-адрес</Label>
                  <Input
                    id="macAddress"
                    value={formData.macAddress || ""}
                    onChange={(e) => setFormData({ ...formData, macAddress: e.target.value })}
                    placeholder="AA:BB:CC:DD:EE:FF"
                  />
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* ОС и прочее */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Операционная система</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="osName">ОС</Label>
                  <Select 
                    value={formData.osName || "Windows"} 
                    onValueChange={(value) => setFormData({ ...formData, osName: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Windows">Windows</SelectItem>
                      <SelectItem value="Linux">Linux</SelectItem>
                      <SelectItem value="macOS">macOS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="osVersion">Версия</Label>
                  <Input
                    id="osVersion"
                    value={formData.osVersion || ""}
                    onChange={(e) => setFormData({ ...formData, osVersion: e.target.value })}
                    placeholder="11 Pro"
                  />
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Даты */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Гарантия</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchaseDate">Дата покупки</Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    value={formData.purchaseDate || ""}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warrantyEnd">Гарантия до</Label>
                  <Input
                    id="warrantyEnd"
                    type="date"
                    value={formData.warrantyEnd || ""}
                    onChange={(e) => setFormData({ ...formData, warrantyEnd: e.target.value })}
                  />
                </div>
              </div>
            </div>
            
            {/* Примечания */}
            <div className="space-y-2">
              <Label htmlFor="notes">Примечания</Label>
              <Textarea
                id="notes"
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Дополнительная информация о ПК"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddDialogOpen(false)
              resetForm()
            }}>
              Отмена
            </Button>
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог редактирования */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактировать конфигурацию ПК</DialogTitle>
            <DialogDescription>
              Измените характеристики компьютера
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Основная информация */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Основная информация</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Имя ПК</Label>
                  <Input
                    id="edit-name"
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-inventoryNumber">Инвентарный номер</Label>
                  <Input
                    id="edit-inventoryNumber"
                    value={formData.inventoryNumber || ""}
                    onChange={(e) => setFormData({ ...formData, inventoryNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-classroomId">Аудитория</Label>
                  <Select 
                    value={formData.classroomId || ""} 
                    onValueChange={(value) => setFormData({ ...formData, classroomId: value, workstationId: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите аудиторию" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockClassrooms.map((classroom) => (
                        <SelectItem key={classroom.id} value={classroom.id}>
                          {classroom.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-workstationId">Рабочее место</Label>
                  <Select 
                    value={formData.workstationId || ""} 
                    onValueChange={(value) => setFormData({ ...formData, workstationId: value })}
                    disabled={!formData.classroomId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите рабочее место" />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.classroomId && getWorkstationsByClassroom(formData.classroomId).map((ws) => (
                        <SelectItem key={ws.id} value={ws.id}>
                          {ws.number} - {ws.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Статус</Label>
                  <Select 
                    value={formData.status || "active"} 
                    onValueChange={(value) => setFormData({ ...formData, status: value as PCStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Активен</SelectItem>
                      <SelectItem value="inactive">Неактивен</SelectItem>
                      <SelectItem value="repair">На ремонте</SelectItem>
                      <SelectItem value="decommissioned">Списан</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Процессор */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Процессор</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-cpuModel">Модель</Label>
                  <Input
                    id="edit-cpuModel"
                    value={formData.cpuModel || ""}
                    onChange={(e) => setFormData({ ...formData, cpuModel: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-cpuCores">Ядер</Label>
                  <Input
                    id="edit-cpuCores"
                    type="number"
                    value={formData.cpuCores || 4}
                    onChange={(e) => setFormData({ ...formData, cpuCores: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-cpuFrequency">Частота</Label>
                  <Input
                    id="edit-cpuFrequency"
                    value={formData.cpuFrequency || ""}
                    onChange={(e) => setFormData({ ...formData, cpuFrequency: e.target.value })}
                  />
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* ОЗУ */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Оперативная память</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-ramSize">Объём (ГБ)</Label>
                  <Input
                    id="edit-ramSize"
                    type="number"
                    value={formData.ramSize || 8}
                    onChange={(e) => setFormData({ ...formData, ramSize: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-ramType">Тип</Label>
                  <Select 
                    value={formData.ramType || "DDR4"} 
                    onValueChange={(value) => setFormData({ ...formData, ramType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DDR3">DDR3</SelectItem>
                      <SelectItem value="DDR4">DDR4</SelectItem>
                      <SelectItem value="DDR5">DDR5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-ramFrequency">Частота</Label>
                  <Input
                    id="edit-ramFrequency"
                    value={formData.ramFrequency || ""}
                    onChange={(e) => setFormData({ ...formData, ramFrequency: e.target.value })}
                  />
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Накопители */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Накопители</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-storageType">Тип основного</Label>
                  <Select 
                    value={formData.storageType || "SSD NVMe"} 
                    onValueChange={(value) => setFormData({ ...formData, storageType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HDD">HDD</SelectItem>
                      <SelectItem value="SSD SATA">SSD SATA</SelectItem>
                      <SelectItem value="SSD NVMe">SSD NVMe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-storageSize">Объём (ГБ)</Label>
                  <Input
                    id="edit-storageSize"
                    type="number"
                    value={formData.storageSize || 256}
                    onChange={(e) => setFormData({ ...formData, storageSize: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Видеокарта */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Видеокарта</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-gpuModel">Модель</Label>
                  <Input
                    id="edit-gpuModel"
                    value={formData.gpuModel || ""}
                    onChange={(e) => setFormData({ ...formData, gpuModel: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-gpuMemory">Видеопамять (ГБ)</Label>
                  <Input
                    id="edit-gpuMemory"
                    type="number"
                    value={formData.gpuMemory || 0}
                    onChange={(e) => setFormData({ ...formData, gpuMemory: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Сеть */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Сеть</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-networkType">Тип подключения</Label>
                  <Select 
                    value={formData.networkType || "Ethernet 1Gbps"} 
                    onValueChange={(value) => setFormData({ ...formData, networkType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ethernet 100Mbps">Ethernet 100Mbps</SelectItem>
                      <SelectItem value="Ethernet 1Gbps">Ethernet 1Gbps</SelectItem>
                      <SelectItem value="Ethernet 2.5Gbps">Ethernet 2.5Gbps</SelectItem>
                      <SelectItem value="Wi-Fi">Wi-Fi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-ipAddress">IP-адрес</Label>
                  <Input
                    id="edit-ipAddress"
                    value={formData.ipAddress || ""}
                    onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-macAddress">MAC-адрес</Label>
                  <Input
                    id="edit-macAddress"
                    value={formData.macAddress || ""}
                    onChange={(e) => setFormData({ ...formData, macAddress: e.target.value })}
                  />
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* ОС */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Операционная система</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-osName">ОС</Label>
                  <Select 
                    value={formData.osName || "Windows"} 
                    onValueChange={(value) => setFormData({ ...formData, osName: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Windows">Windows</SelectItem>
                      <SelectItem value="Linux">Linux</SelectItem>
                      <SelectItem value="macOS">macOS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-osVersion">Версия</Label>
                  <Input
                    id="edit-osVersion"
                    value={formData.osVersion || ""}
                    onChange={(e) => setFormData({ ...formData, osVersion: e.target.value })}
                  />
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Даты */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Гарантия</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-purchaseDate">Дата покупки</Label>
                  <Input
                    id="edit-purchaseDate"
                    type="date"
                    value={formData.purchaseDate || ""}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-warrantyEnd">Гарантия до</Label>
                  <Input
                    id="edit-warrantyEnd"
                    type="date"
                    value={formData.warrantyEnd || ""}
                    onChange={(e) => setFormData({ ...formData, warrantyEnd: e.target.value })}
                  />
                </div>
              </div>
            </div>
            
            {/* Примечания */}
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Примечания</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditDialogOpen(false)
              setSelectedPC(null)
              resetForm()
            }}>
              Отмена
            </Button>
            <Button onClick={handleEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог удаления */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить конфигурацию ПК?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить конфигурацию ПК {selectedPC?.name}? 
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
