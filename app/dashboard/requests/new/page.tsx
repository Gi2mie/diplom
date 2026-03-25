"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getMockSession, type MockSession } from "@/lib/mock-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  ArrowLeft, 
  Send, 
  AlertTriangle,
  Monitor,
  Keyboard,
  Mouse,
  Cpu,
  Printer,
  Projector,
  HelpCircle,
  CheckCircle2
} from "lucide-react"
import Link from "next/link"

// Типы
type PriorityType = "low" | "medium" | "high" | "critical"
type EquipmentType = "monitor" | "keyboard" | "mouse" | "system_unit" | "printer" | "projector" | "network" | "software" | "other"

// Mock данные аудиторий с ответственными
const mockClassrooms = [
  { id: "1", number: "301", name: "Аудитория 301", building: "Главный корпус", responsibleId: "mock-teacher-001" },
  { id: "2", number: "302", name: "Аудитория 302", building: "Главный корпус", responsibleId: "mock-teacher-001" },
  { id: "3", number: "105", name: "Компьютерный класс 105", building: "Главный корпус", responsibleId: "mock-teacher-001" },
  { id: "4", number: "401", name: "Лекционный зал 401", building: "Корпус Б", responsibleId: "other-teacher" },
  { id: "5", number: "201", name: "Лаборатория 201", building: "Корпус Б", responsibleId: "other-teacher" },
]

// Mock данные рабочих мест
const mockWorkstations = [
  { id: "1", name: "Рабочее место 1", classroomId: "1" },
  { id: "2", name: "Рабочее место 2", classroomId: "1" },
  { id: "3", name: "Рабочее место 3", classroomId: "1" },
  { id: "4", name: "Преподавательский ПК", classroomId: "1" },
  { id: "5", name: "Рабочее место 1", classroomId: "2" },
  { id: "6", name: "Рабочее место 2", classroomId: "2" },
  { id: "7", name: "Рабочее место 1", classroomId: "3" },
  { id: "8", name: "Рабочее место 2", classroomId: "3" },
  { id: "9", name: "Рабочее место 3", classroomId: "3" },
  { id: "10", name: "Рабочее место 4", classroomId: "3" },
]

const priorityOptions: { value: PriorityType; label: string; color: string; description: string }[] = [
  { value: "low", label: "Низкий", color: "bg-slate-500", description: "Не влияет на работу" },
  { value: "medium", label: "Средний", color: "bg-yellow-500", description: "Небольшие неудобства" },
  { value: "high", label: "Высокий", color: "bg-orange-500", description: "Серьезные проблемы" },
  { value: "critical", label: "Критический", color: "bg-red-500", description: "Работа невозможна" },
]

const equipmentTypes: { value: EquipmentType; label: string; icon: React.ElementType }[] = [
  { value: "monitor", label: "Монитор", icon: Monitor },
  { value: "keyboard", label: "Клавиатура", icon: Keyboard },
  { value: "mouse", label: "Мышь", icon: Mouse },
  { value: "system_unit", label: "Системный блок", icon: Cpu },
  { value: "printer", label: "Принтер", icon: Printer },
  { value: "projector", label: "Проектор", icon: Projector },
  { value: "network", label: "Сеть/Интернет", icon: AlertTriangle },
  { value: "software", label: "Программное обеспечение", icon: HelpCircle },
  { value: "other", label: "Другое", icon: HelpCircle },
]

export default function NewRequestPage() {
  const router = useRouter()
  const [session, setSession] = useState<MockSession | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  
  // Форма
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    classroomId: "",
    workstationId: "",
    equipmentType: "" as EquipmentType | "",
    priority: "medium" as PriorityType,
  })
  
  useEffect(() => {
    setSession(getMockSession())
  }, [])
  
  if (!session) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }
  
  const isAdmin = session.user.role === "ADMIN"
  
  // Аудитории, за которые преподаватель ответственен
  const responsibleClassrooms = isAdmin 
    ? mockClassrooms 
    : mockClassrooms.filter(c => c.responsibleId === session.user.id)
  
  // Рабочие места выбранной аудитории
  const availableWorkstations = formData.classroomId 
    ? mockWorkstations.filter(w => w.classroomId === formData.classroomId)
    : []
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title || !formData.classroomId || !formData.equipmentType) {
      return
    }
    
    setIsSubmitting(true)
    
    // Имитация отправки
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setIsSubmitting(false)
    setIsSubmitted(true)
    
    // Перенаправление через 2 секунды
    setTimeout(() => {
      router.push("/dashboard/my-requests")
    }, 2000)
  }
  
  if (isSubmitted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">Заявка отправлена!</h2>
            <p className="text-muted-foreground">
              Ваша заявка успешно отправлена администратору. Вы будете перенаправлены на страницу ваших заявок.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/my-requests">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Сообщить о проблеме</h1>
          <p className="text-muted-foreground">
            Создайте заявку на ремонт оборудования
          </p>
        </div>
      </div>
      
      {responsibleClassrooms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Нет доступных аудиторий</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Вы не являетесь ответственным ни за одну аудиторию. 
              Обратитесь к администратору для назначения ответственности.
            </p>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Информация о проблеме</CardTitle>
                  <CardDescription>
                    Опишите проблему как можно подробнее
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Краткое описание проблемы *</Label>
                    <Input
                      id="title"
                      placeholder="Например: Не работает монитор"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="description">Подробное описание</Label>
                    <Textarea
                      id="description"
                      placeholder="Опишите проблему подробнее: что произошло, когда возникла проблема, какие действия предпринимались..."
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label>Тип оборудования *</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {equipmentTypes.map((type) => {
                        const Icon = type.icon
                        const isSelected = formData.equipmentType === type.value
                        return (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, equipmentType: type.value })}
                            className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all hover:bg-accent cursor-pointer ${
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "border-border"
                            }`}
                          >
                            <Icon className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                            <span className={`text-xs font-medium ${isSelected ? "text-primary" : ""}`}>
                              {type.label}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Местоположение</CardTitle>
                  <CardDescription>
                    Укажите аудиторию и рабочее место
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="classroom">Аудитория *</Label>
                    <Select 
                      value={formData.classroomId} 
                      onValueChange={(value) => setFormData({ ...formData, classroomId: value, workstationId: "" })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите аудиторию" />
                      </SelectTrigger>
                      <SelectContent>
                        {responsibleClassrooms.map((classroom) => (
                          <SelectItem key={classroom.id} value={classroom.id}>
                            {classroom.name} ({classroom.building})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Доступны только аудитории, за которые вы ответственны
                    </p>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="workstation">Рабочее место</Label>
                    <Select 
                      value={formData.workstationId} 
                      onValueChange={(value) => setFormData({ ...formData, workstationId: value })}
                      disabled={!formData.classroomId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={formData.classroomId ? "Выберите рабочее место" : "Сначала выберите аудиторию"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">Общее (не привязано к месту)</SelectItem>
                        {availableWorkstations.map((ws) => (
                          <SelectItem key={ws.id} value={ws.id}>
                            {ws.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Приоритет</CardTitle>
                  <CardDescription>
                    Насколько срочно нужно решить проблему?
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {priorityOptions.map((option) => {
                      const isSelected = formData.priority === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, priority: option.value })}
                          className={`w-full flex items-center gap-3 rounded-lg border-2 p-3 transition-all hover:bg-accent cursor-pointer text-left ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border"
                          }`}
                        >
                          <div className={`h-3 w-3 rounded-full ${option.color}`} />
                          <div className="flex-1">
                            <div className={`font-medium ${isSelected ? "text-primary" : ""}`}>
                              {option.label}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {option.description}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Отправить заявку</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>После отправки заявки:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Администратор получит уведомление</li>
                      <li>Вы сможете отслеживать статус</li>
                      <li>При необходимости свяжутся с вами</li>
                    </ul>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isSubmitting || !formData.title || !formData.classroomId || !formData.equipmentType}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="animate-spin mr-2">...</span>
                        Отправка...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Отправить заявку
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
