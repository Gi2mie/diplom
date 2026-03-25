"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  HardDrive,
  X,
  RefreshCw,
  Download,
  MonitorSmartphone,
  Link2,
  Unlink,
  CheckCircle2,
  XCircle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getMockSession, getCurrentMockPermissions, type MockSession, type MockPermissions } from "@/lib/mock-auth"

// Типы
type SoftwareType = "os" | "office" | "development" | "graphics" | "utility" | "security" | "other"
type LicenseType = "free" | "paid" | "subscription" | "educational"

interface Software {
  id: string
  name: string
  version: string
  type: SoftwareType
  licenseType: LicenseType
  publisher: string
  description: string
  installDate: string
  licenseExpiry: string | null
  licenseKey: string
}

interface Workstation {
  id: string
  name: string
  number: string
  classroomId: string
  classroomName: string
}

interface SoftwareInstallation {
  id: string
  softwareId: string
  workstationId: string
  installDate: string
}

// Mock данные ПО
const initialSoftware: Software[] = [
  {
    id: "1",
    name: "Windows 11 Pro",
    version: "23H2",
    type: "os",
    licenseType: "paid",
    publisher: "Microsoft",
    description: "Операционная система Windows 11 Professional",
    installDate: "2024-01-15",
    licenseExpiry: "2027-01-15",
    licenseKey: "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
  },
  {
    id: "2",
    name: "Microsoft Office 365",
    version: "2024",
    type: "office",
    licenseType: "subscription",
    publisher: "Microsoft",
    description: "Пакет офисных приложений (Word, Excel, PowerPoint, Outlook)",
    installDate: "2024-01-15",
    licenseExpiry: "2025-12-31",
    licenseKey: ""
  },
  {
    id: "3",
    name: "Visual Studio Code",
    version: "1.87",
    type: "development",
    licenseType: "free",
    publisher: "Microsoft",
    description: "Редактор кода с поддержкой множества языков программирования",
    installDate: "2024-02-01",
    licenseExpiry: null,
    licenseKey: ""
  },
  {
    id: "4",
    name: "Adobe Photoshop",
    version: "2024",
    type: "graphics",
    licenseType: "subscription",
    publisher: "Adobe",
    description: "Профессиональный редактор растровой графики",
    installDate: "2024-01-20",
    licenseExpiry: "2025-06-30",
    licenseKey: ""
  },
  {
    id: "5",
    name: "7-Zip",
    version: "23.01",
    type: "utility",
    licenseType: "free",
    publisher: "Igor Pavlov",
    description: "Архиватор с высокой степенью сжатия",
    installDate: "2024-01-15",
    licenseExpiry: null,
    licenseKey: ""
  },
  {
    id: "6",
    name: "Kaspersky Endpoint Security",
    version: "12.3",
    type: "security",
    licenseType: "paid",
    publisher: "Kaspersky Lab",
    description: "Антивирусное программное обеспечение для защиты рабочих станций",
    installDate: "2024-01-15",
    licenseExpiry: "2026-01-15",
    licenseKey: "XXXXX-XXXXX-XXXXX-XXXXX"
  },
  {
    id: "7",
    name: "Python",
    version: "3.12",
    type: "development",
    licenseType: "free",
    publisher: "Python Software Foundation",
    description: "Интерпретатор языка программирования Python",
    installDate: "2024-02-10",
    licenseExpiry: null,
    licenseKey: ""
  },
  {
    id: "8",
    name: "JetBrains IntelliJ IDEA",
    version: "2024.1",
    type: "development",
    licenseType: "educational",
    publisher: "JetBrains",
    description: "IDE для разработки на Java и других языках",
    installDate: "2024-03-01",
    licenseExpiry: "2025-09-01",
    licenseKey: ""
  },
  {
    id: "9",
    name: "LibreOffice",
    version: "7.6",
    type: "office",
    licenseType: "free",
    publisher: "The Document Foundation",
    description: "Свободный офисный пакет",
    installDate: "2024-01-15",
    licenseExpiry: null,
    licenseKey: ""
  },
  {
    id: "10",
    name: "GIMP",
    version: "2.10",
    type: "graphics",
    licenseType: "free",
    publisher: "GIMP Team",
    description: "Свободный растровый графический редактор",
    installDate: "2024-02-15",
    licenseExpiry: null,
    licenseKey: ""
  }
]

// Mock данные рабочих мест
const mockWorkstations: Workstation[] = [
  { id: "1", name: "Рабочее место 1", number: "RM-301-01", classroomId: "1", classroomName: "Аудитория 301" },
  { id: "2", name: "Рабочее место 2", number: "RM-301-02", classroomId: "1", classroomName: "Аудитория 301" },
  { id: "3", name: "Рабочее место 1", number: "RM-105-01", classroomId: "2", classroomName: "Компьютерный класс 105" },
  { id: "4", name: "Рабочее место 2", number: "RM-105-02", classroomId: "2", classroomName: "Компьютерный класс 105" },
  { id: "5", name: "Рабочее место 3", number: "RM-105-03", classroomId: "2", classroomName: "Компьютерный класс 105" },
  { id: "6", name: "Рабочее место 4", number: "RM-105-04", classroomId: "2", classroomName: "Компьютерный класс 105" },
  { id: "7", name: "Проектор", number: "RM-401-01", classroomId: "3", classroomName: "Лекционный зал 401" },
  { id: "8", name: "Рабочее место 1", number: "RM-201-01", classroomId: "4", classroomName: "Лаборатория 201" },
]

// Mock данные установок ПО на рабочие места
const initialInstallations: SoftwareInstallation[] = [
  { id: "1", softwareId: "1", workstationId: "1", installDate: "2024-01-15" },
  { id: "2", softwareId: "2", workstationId: "1", installDate: "2024-01-15" },
  { id: "3", softwareId: "3", workstationId: "1", installDate: "2024-02-01" },
  { id: "4", softwareId: "5", workstationId: "1", installDate: "2024-01-15" },
  { id: "5", softwareId: "6", workstationId: "1", installDate: "2024-01-15" },
  { id: "6", softwareId: "1", workstationId: "2", installDate: "2024-01-15" },
  { id: "7", softwareId: "2", workstationId: "2", installDate: "2024-01-15" },
  { id: "8", softwareId: "6", workstationId: "2", installDate: "2024-01-15" },
  { id: "9", softwareId: "1", workstationId: "3", installDate: "2024-01-15" },
  { id: "10", softwareId: "2", workstationId: "3", installDate: "2024-01-15" },
  { id: "11", softwareId: "3", workstationId: "3", installDate: "2024-02-01" },
  { id: "12", softwareId: "7", workstationId: "3", installDate: "2024-02-10" },
  { id: "13", softwareId: "8", workstationId: "3", installDate: "2024-03-01" },
  { id: "14", softwareId: "6", workstationId: "3", installDate: "2024-01-15" },
  { id: "15", softwareId: "1", workstationId: "4", installDate: "2024-01-15" },
  { id: "16", softwareId: "9", workstationId: "4", installDate: "2024-01-15" },
  { id: "17", softwareId: "10", workstationId: "4", installDate: "2024-02-15" },
]

// Аудитории для фильтрации
const mockClassrooms = [
  { id: "1", name: "Аудитория 301" },
  { id: "2", name: "Компьютерный класс 105" },
  { id: "3", name: "Лекционный зал 401" },
  { id: "4", name: "Лаборатория 201" },
]

// Хелперы
const getTypeInfo = (type: SoftwareType) => {
  const types = {
    os: { label: "Операционная система", color: "bg-blue-100 text-blue-800 border-blue-200" },
    office: { label: "Офисное ПО", color: "bg-green-100 text-green-800 border-green-200" },
    development: { label: "Разработка", color: "bg-purple-100 text-purple-800 border-purple-200" },
    graphics: { label: "Графика", color: "bg-pink-100 text-pink-800 border-pink-200" },
    utility: { label: "Утилиты", color: "bg-gray-100 text-gray-800 border-gray-200" },
    security: { label: "Безопасность", color: "bg-red-100 text-red-800 border-red-200" },
    other: { label: "Другое", color: "bg-slate-100 text-slate-800 border-slate-200" }
  }
  return types[type]
}

const getLicenseInfo = (type: LicenseType) => {
  const licenses = {
    free: { label: "Бесплатная", variant: "outline" as const },
    paid: { label: "Платная", variant: "default" as const },
    subscription: { label: "Подписка", variant: "secondary" as const },
    educational: { label: "Образовательная", variant: "default" as const }
  }
  return licenses[type]
}

export default function SoftwarePage() {
  const [session, setSession] = useState<MockSession | null>(null)
  const [permissions, setPermissions] = useState<MockPermissions | null>(null)
  
  // Данные
  const [software, setSoftware] = useState<Software[]>(initialSoftware)
  const [installations, setInstallations] = useState<SoftwareInstallation[]>(initialInstallations)
  
  // Фильтры
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState<SoftwareType | "all">("all")
  const [selectedLicense, setSelectedLicense] = useState<LicenseType | "all">("all")
  const [selectedClassroom, setSelectedClassroom] = useState("all")
  const [selectedWorkstation, setSelectedWorkstation] = useState("all")
  
  // Диалоги
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  
  // Выбранный элемент
  const [selectedSoftware, setSelectedSoftware] = useState<Software | null>(null)
  
  // Форма
  const [formData, setFormData] = useState({
    name: "",
    version: "",
    type: "utility" as SoftwareType,
    licenseType: "free" as LicenseType,
    publisher: "",
    description: "",
    licenseExpiry: "",
    licenseKey: ""
  })
  
  // Выбранные рабочие места для назначения
  const [selectedWorkstations, setSelectedWorkstations] = useState<string[]>([])
  
  useEffect(() => {
    setSession(getMockSession())
    setPermissions(getCurrentMockPermissions())
  }, [])
  
  // Фильтрация рабочих мест по аудитории
  const filteredWorkstationsForAssign = useMemo(() => {
    if (selectedClassroom === "all") return mockWorkstations
    return mockWorkstations.filter(ws => ws.classroomId === selectedClassroom)
  }, [selectedClassroom])
  
  // Фильтрация ПО
  const filteredSoftware = useMemo(() => {
    return software.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.publisher.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.version.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesType = selectedType === "all" || item.type === selectedType
      const matchesLicense = selectedLicense === "all" || item.licenseType === selectedLicense
      
      // Фильтрация по рабочему месту
      let matchesWorkstation = true
      if (selectedWorkstation !== "all") {
        const softwareOnWorkstation = installations
          .filter(inst => inst.workstationId === selectedWorkstation)
          .map(inst => inst.softwareId)
        matchesWorkstation = softwareOnWorkstation.includes(item.id)
      }
      
      return matchesSearch && matchesType && matchesLicense && matchesWorkstation
    })
  }, [software, searchQuery, selectedType, selectedLicense, selectedWorkstation, installations])
  
  // Статистика
  const stats = useMemo(() => {
    return {
      total: software.length,
      free: software.filter(s => s.licenseType === "free").length,
      paid: software.filter(s => s.licenseType === "paid" || s.licenseType === "subscription").length,
      expiring: software.filter(s => {
        if (!s.licenseExpiry) return false
        const expiry = new Date(s.licenseExpiry)
        const now = new Date()
        const diff = expiry.getTime() - now.getTime()
        const days = diff / (1000 * 60 * 60 * 24)
        return days > 0 && days < 90
      }).length
    }
  }, [software])
  
  // Сброс фильтров
  const resetFilters = () => {
    setSearchQuery("")
    setSelectedType("all")
    setSelectedLicense("all")
    setSelectedClassroom("all")
    setSelectedWorkstation("all")
  }
  
  // Получить количество установок ПО
  const getInstallationCount = (softwareId: string) => {
    return installations.filter(inst => inst.softwareId === softwareId).length
  }
  
  // Получить рабочие места с установленным ПО
  const getInstalledWorkstations = (softwareId: string) => {
    const installedIds = installations
      .filter(inst => inst.softwareId === softwareId)
      .map(inst => inst.workstationId)
    return mockWorkstations.filter(ws => installedIds.includes(ws.id))
  }
  
  // Обработчики
  const handleView = (item: Software) => {
    setSelectedSoftware(item)
    setViewDialogOpen(true)
  }
  
  const handleEdit = (item: Software) => {
    setSelectedSoftware(item)
    setFormData({
      name: item.name,
      version: item.version,
      type: item.type,
      licenseType: item.licenseType,
      publisher: item.publisher,
      description: item.description,
      licenseExpiry: item.licenseExpiry || "",
      licenseKey: item.licenseKey
    })
    setEditDialogOpen(true)
  }
  
  const handleDelete = (item: Software) => {
    setSelectedSoftware(item)
    setDeleteDialogOpen(true)
  }
  
  const handleAdd = () => {
    setFormData({
      name: "",
      version: "",
      type: "utility",
      licenseType: "free",
      publisher: "",
      description: "",
      licenseExpiry: "",
      licenseKey: ""
    })
    setAddDialogOpen(true)
  }
  
  const handleAssign = (item: Software) => {
    setSelectedSoftware(item)
    // Получаем уже установленные рабочие места
    const installedIds = installations
      .filter(inst => inst.softwareId === item.id)
      .map(inst => inst.workstationId)
    setSelectedWorkstations(installedIds)
    setSelectedClassroom("all")
    setAssignDialogOpen(true)
  }
  
  // Сохранение нового ПО
  const handleSaveNew = () => {
    const newSoftware: Software = {
      id: String(Date.now()),
      name: formData.name,
      version: formData.version,
      type: formData.type,
      licenseType: formData.licenseType,
      publisher: formData.publisher,
      description: formData.description,
      installDate: new Date().toISOString().split("T")[0],
      licenseExpiry: formData.licenseExpiry || null,
      licenseKey: formData.licenseKey
    }
    setSoftware([...software, newSoftware])
    setAddDialogOpen(false)
  }
  
  // Сохранение редактирования
  const handleSaveEdit = () => {
    if (!selectedSoftware) return
    setSoftware(software.map(item => 
      item.id === selectedSoftware.id 
        ? {
            ...item,
            name: formData.name,
            version: formData.version,
            type: formData.type,
            licenseType: formData.licenseType,
            publisher: formData.publisher,
            description: formData.description,
            licenseExpiry: formData.licenseExpiry || null,
            licenseKey: formData.licenseKey
          }
        : item
    ))
    setEditDialogOpen(false)
  }
  
  // Подтверждение удаления
  const handleConfirmDelete = () => {
    if (!selectedSoftware) return
    setSoftware(software.filter(item => item.id !== selectedSoftware.id))
    // Удаляем связанные установки
    setInstallations(installations.filter(inst => inst.softwareId !== selectedSoftware.id))
    setDeleteDialogOpen(false)
  }
  
  // Сохранение назначения ПО на рабочие места
  const handleSaveAssignment = () => {
    if (!selectedSoftware) return
    
    // Удаляем старые установки для этого ПО
    const newInstallations = installations.filter(inst => inst.softwareId !== selectedSoftware.id)
    
    // Добавляем новые установки
    selectedWorkstations.forEach(wsId => {
      newInstallations.push({
        id: String(Date.now()) + "-" + wsId,
        softwareId: selectedSoftware.id,
        workstationId: wsId,
        installDate: new Date().toISOString().split("T")[0]
      })
    })
    
    setInstallations(newInstallations)
    setAssignDialogOpen(false)
  }
  
  // Переключение выбора рабочего места
  const toggleWorkstationSelection = (wsId: string) => {
    setSelectedWorkstations(prev => 
      prev.includes(wsId) 
        ? prev.filter(id => id !== wsId)
        : [...prev, wsId]
    )
  }
  
  // Выбрать/снять все рабочие места
  const toggleAllWorkstations = () => {
    if (selectedWorkstations.length === filteredWorkstationsForAssign.length) {
      setSelectedWorkstations([])
    } else {
      setSelectedWorkstations(filteredWorkstationsForAssign.map(ws => ws.id))
    }
  }
  
  const hasFilters = searchQuery || selectedType !== "all" || selectedLicense !== "all" || selectedWorkstation !== "all"
  
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
          <h1 className="text-2xl font-bold tracking-tight">Программное обеспечение</h1>
          <p className="text-muted-foreground">
            Управление каталогом ПО и назначение на рабочие места
          </p>
        </div>
        {isAdmin && (
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить ПО
          </Button>
        )}
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего ПО</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">программ в каталоге</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Бесплатное</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.free}</div>
            <p className="text-xs text-muted-foreground">бесплатных лицензий</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Платное</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.paid}</div>
            <p className="text-xs text-muted-foreground">платных лицензий</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Истекают</CardTitle>
            <XCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.expiring}</div>
            <p className="text-xs text-muted-foreground">лицензий в течение 90 дней</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            {/* Search */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию, издателю..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Type */}
            <Select value={selectedType} onValueChange={(value) => setSelectedType(value as SoftwareType | "all")}>
              <SelectTrigger>
                <SelectValue placeholder="Тип ПО" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                <SelectItem value="os">Операционные системы</SelectItem>
                <SelectItem value="office">Офисное ПО</SelectItem>
                <SelectItem value="development">Разработка</SelectItem>
                <SelectItem value="graphics">Графика</SelectItem>
                <SelectItem value="utility">Утилиты</SelectItem>
                <SelectItem value="security">Безопасность</SelectItem>
                <SelectItem value="other">Другое</SelectItem>
              </SelectContent>
            </Select>
            
            {/* License */}
            <Select value={selectedLicense} onValueChange={(value) => setSelectedLicense(value as LicenseType | "all")}>
              <SelectTrigger>
                <SelectValue placeholder="Лицензия" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все лицензии</SelectItem>
                <SelectItem value="free">Бесплатная</SelectItem>
                <SelectItem value="paid">Платная</SelectItem>
                <SelectItem value="subscription">Подписка</SelectItem>
                <SelectItem value="educational">Образовательная</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Workstation filter */}
            <Select value={selectedWorkstation} onValueChange={setSelectedWorkstation}>
              <SelectTrigger>
                <SelectValue placeholder="Рабочее место" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все рабочие места</SelectItem>
                {mockWorkstations.map((ws) => (
                  <SelectItem key={ws.id} value={ws.id}>
                    {ws.number} - {ws.classroomName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {hasFilters && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Найдено: {filteredSoftware.length} из {software.length}
              </span>
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="mr-1 h-3 w-3" />
                Сбросить фильтры
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Software List */}
      <Card>
        <CardHeader>
          <CardTitle>Каталог программного обеспечения</CardTitle>
          <CardDescription>
            {filteredSoftware.length} программ
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSoftware.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <HardDrive className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">ПО не найдено</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {hasFilters ? "Попробуйте изменить параметры поиска" : "Добавьте первое программное обеспечение"}
              </p>
              {hasFilters && (
                <Button variant="outline" className="mt-4" onClick={resetFilters}>
                  Сбросить фильтры
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Лицензия</TableHead>
                  <TableHead>Установлено</TableHead>
                  <TableHead>Срок действия</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSoftware.map((item) => {
                  const typeInfo = getTypeInfo(item.type)
                  const licenseInfo = getLicenseInfo(item.licenseType)
                  const installCount = getInstallationCount(item.id)
                  const isExpiringSoon = item.licenseExpiry && new Date(item.licenseExpiry) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
                  
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <HardDrive className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">
                            v{item.version} - {item.publisher}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={typeInfo.color}>
                          {typeInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={licenseInfo.variant}>
                          {licenseInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MonitorSmartphone className="h-4 w-4 text-muted-foreground" />
                          <span>{installCount}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.licenseExpiry ? (
                          <span className={isExpiringSoon ? "text-orange-600 font-medium" : ""}>
                            {new Date(item.licenseExpiry).toLocaleDateString("ru-RU")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Бессрочно</span>
                        )}
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
                            <DropdownMenuItem onClick={() => handleView(item)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Просмотр
                            </DropdownMenuItem>
                            {isAdmin && (
                              <>
                                <DropdownMenuItem onClick={() => handleAssign(item)}>
                                  <Link2 className="mr-2 h-4 w-4" />
                                  Назначить на РМ
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(item)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Редактировать
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
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
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Информация о ПО</DialogTitle>
            <DialogDescription>Детальная информация о программном обеспечении</DialogDescription>
          </DialogHeader>
          {selectedSoftware && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
                  <HardDrive className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{selectedSoftware.name}</h3>
                  <p className="text-muted-foreground">
                    Версия {selectedSoftware.version} - {selectedSoftware.publisher}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Тип ПО</Label>
                  <div className="mt-1">
                    <Badge variant="outline" className={getTypeInfo(selectedSoftware.type).color}>
                      {getTypeInfo(selectedSoftware.type).label}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Лицензия</Label>
                  <div className="mt-1">
                    <Badge variant={getLicenseInfo(selectedSoftware.licenseType).variant}>
                      {getLicenseInfo(selectedSoftware.licenseType).label}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Дата установки</Label>
                  <p>{new Date(selectedSoftware.installDate).toLocaleDateString("ru-RU")}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Срок действия лицензии</Label>
                  <p>
                    {selectedSoftware.licenseExpiry 
                      ? new Date(selectedSoftware.licenseExpiry).toLocaleDateString("ru-RU")
                      : "Бессрочно"}
                  </p>
                </div>
              </div>
              
              {selectedSoftware.description && (
                <div>
                  <Label className="text-muted-foreground">Описание</Label>
                  <p className="mt-1">{selectedSoftware.description}</p>
                </div>
              )}
              
              {/* Installed workstations */}
              <div>
                <Label className="text-muted-foreground">Установлено на рабочих местах ({getInstallationCount(selectedSoftware.id)})</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {getInstalledWorkstations(selectedSoftware.id).length > 0 ? (
                    getInstalledWorkstations(selectedSoftware.id).map(ws => (
                      <Badge key={ws.id} variant="secondary">
                        {ws.number} ({ws.classroomName})
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">Не установлено ни на одном рабочем месте</span>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Добавить ПО</DialogTitle>
            <DialogDescription>Добавление нового программного обеспечения в каталог</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Название</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Например: Microsoft Office"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="version">Версия</Label>
                <Input
                  id="version"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  placeholder="2024"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="publisher">Издатель</Label>
                <Input
                  id="publisher"
                  value={formData.publisher}
                  onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                  placeholder="Microsoft"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Тип ПО</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as SoftwareType })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="os">Операционная система</SelectItem>
                    <SelectItem value="office">Офисное ПО</SelectItem>
                    <SelectItem value="development">Разработка</SelectItem>
                    <SelectItem value="graphics">Графика</SelectItem>
                    <SelectItem value="utility">Утилиты</SelectItem>
                    <SelectItem value="security">Безопасность</SelectItem>
                    <SelectItem value="other">Другое</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="licenseType">Тип лицензии</Label>
                <Select value={formData.licenseType} onValueChange={(value) => setFormData({ ...formData, licenseType: value as LicenseType })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Бесплатная</SelectItem>
                    <SelectItem value="paid">Платная</SelectItem>
                    <SelectItem value="subscription">Подписка</SelectItem>
                    <SelectItem value="educational">Образовательная</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="licenseExpiry">Срок лицензии</Label>
                <Input
                  id="licenseExpiry"
                  type="date"
                  value={formData.licenseExpiry}
                  onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="licenseKey">Лицензионный ключ</Label>
                <Input
                  id="licenseKey"
                  value={formData.licenseKey}
                  onChange={(e) => setFormData({ ...formData, licenseKey: e.target.value })}
                  placeholder="XXXXX-XXXXX-XXXXX"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Описание программного обеспечения"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveNew} disabled={!formData.name || !formData.version}>
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Редактировать ПО</DialogTitle>
            <DialogDescription>Изменение информации о программном обеспечении</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
                <Label htmlFor="edit-version">Версия</Label>
                <Input
                  id="edit-version"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-publisher">Издатель</Label>
                <Input
                  id="edit-publisher"
                  value={formData.publisher}
                  onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-type">Тип ПО</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as SoftwareType })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="os">Операционная система</SelectItem>
                    <SelectItem value="office">Офисное ПО</SelectItem>
                    <SelectItem value="development">Разработка</SelectItem>
                    <SelectItem value="graphics">Графика</SelectItem>
                    <SelectItem value="utility">Утилиты</SelectItem>
                    <SelectItem value="security">Безопасность</SelectItem>
                    <SelectItem value="other">Другое</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-licenseType">Тип лицензии</Label>
                <Select value={formData.licenseType} onValueChange={(value) => setFormData({ ...formData, licenseType: value as LicenseType })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Бесплатная</SelectItem>
                    <SelectItem value="paid">Платная</SelectItem>
                    <SelectItem value="subscription">Подписка</SelectItem>
                    <SelectItem value="educational">Образовательная</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-licenseExpiry">Срок лицензии</Label>
                <Input
                  id="edit-licenseExpiry"
                  type="date"
                  value={formData.licenseExpiry}
                  onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-licenseKey">Лицензионный ключ</Label>
                <Input
                  id="edit-licenseKey"
                  value={formData.licenseKey}
                  onChange={(e) => setFormData({ ...formData, licenseKey: e.target.value })}
                />
              </div>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveEdit} disabled={!formData.name || !formData.version}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Назначить ПО на рабочие места</DialogTitle>
            <DialogDescription>
              {selectedSoftware?.name} - выберите рабочие места для установки
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Classroom filter */}
            <div className="grid gap-2">
              <Label>Фильтр по аудитории</Label>
              <Select value={selectedClassroom} onValueChange={setSelectedClassroom}>
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
            </div>
            
            {/* Select all */}
            <div className="flex items-center justify-between border-b pb-2">
              <Label className="text-sm font-medium">Рабочие места</Label>
              <Button variant="ghost" size="sm" onClick={toggleAllWorkstations}>
                {selectedWorkstations.length === filteredWorkstationsForAssign.length ? "Снять все" : "Выбрать все"}
              </Button>
            </div>
            
            {/* Workstation list */}
            <ScrollArea className="h-64 border rounded-md p-2">
              <div className="space-y-2">
                {filteredWorkstationsForAssign.map((ws) => (
                  <div 
                    key={ws.id} 
                    className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                    onClick={() => toggleWorkstationSelection(ws.id)}
                  >
                    <Checkbox 
                      checked={selectedWorkstations.includes(ws.id)}
                      onCheckedChange={() => toggleWorkstationSelection(ws.id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{ws.name}</div>
                      <div className="text-xs text-muted-foreground">{ws.number} - {ws.classroomName}</div>
                    </div>
                    {selectedWorkstations.includes(ws.id) && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <div className="text-sm text-muted-foreground">
              Выбрано: {selectedWorkstations.length} рабочих мест
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveAssignment}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить ПО?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить &quot;{selectedSoftware?.name}&quot;?
              Это действие нельзя отменить. ПО будет удалено со всех рабочих мест.
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
