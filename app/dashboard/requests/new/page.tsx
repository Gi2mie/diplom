"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { IssuePriority, UserRole } from "@prisma/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
  CheckCircle2,
  Loader2,
  LayoutGrid,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { PageHeader } from "@/components/dashboard/page-header"
import { fetchClassroomRegistry, type RegistryClassroom } from "@/lib/api/classroom-registry"
import { fetchWorkstations, type ApiWorkstation } from "@/lib/api/workstations"
import { submitTeacherIssueReport } from "@/lib/api/issue-reports"
import type { TeacherProblemEquipmentKind } from "@/lib/validators"

const priorityOptions: {
  value: IssuePriority
  label: string
  color: string
  description: string
}[] = [
  { value: IssuePriority.LOW, label: "Низкий", color: "bg-slate-500", description: "Не влияет на работу" },
  { value: IssuePriority.MEDIUM, label: "Средний", color: "bg-yellow-500", description: "Небольшие неудобства" },
  { value: IssuePriority.HIGH, label: "Высокий", color: "bg-orange-500", description: "Серьёзные проблемы" },
  { value: IssuePriority.CRITICAL, label: "Критический", color: "bg-red-500", description: "Работа невозможна" },
]

const equipmentTypes: {
  value: TeacherProblemEquipmentKind
  label: string
  icon: React.ElementType
}[] = [
  { value: "monitor", label: "Монитор", icon: Monitor },
  { value: "keyboard", label: "Клавиатура", icon: Keyboard },
  { value: "mouse", label: "Мышь", icon: Mouse },
  { value: "system_unit", label: "Системный блок", icon: Cpu },
  { value: "printer", label: "Принтер", icon: Printer },
  { value: "projector", label: "Проектор", icon: Projector },
  { value: "network", label: "Сеть / интернет", icon: AlertTriangle },
  { value: "software", label: "Программное обеспечение", icon: HelpCircle },
  { value: "other", label: "Другое", icon: HelpCircle },
]

function classroomLabel(c: RegistryClassroom): string {
  const title = c.name?.trim() || `Аудитория ${c.number}`
  return c.buildingName ? `${title} (${c.buildingName})` : title
}

function workstationLabel(w: ApiWorkstation): string {
  const name = w.name?.trim()
  if (name) return `${w.code} — ${name}`
  return w.code || w.id
}

export default function NewRequestPage() {
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const [classrooms, setClassrooms] = useState<RegistryClassroom[]>([])
  const [workstations, setWorkstations] = useState<ApiWorkstation[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingData, setLoadingData] = useState(true)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [createdCount, setCreatedCount] = useState(0)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    classroomId: "",
    workstationId: "",
    problemEquipmentKind: "" as TeacherProblemEquipmentKind | "",
    priority: IssuePriority.MEDIUM as IssuePriority,
  })
  const [wholeClassroom, setWholeClassroom] = useState(false)

  const loadData = useCallback(async () => {
    setLoadingData(true)
    setLoadError(null)
    try {
      const [reg, ws] = await Promise.all([fetchClassroomRegistry(), fetchWorkstations()])
      setClassrooms(reg.classrooms)
      setWorkstations(ws)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Не удалось загрузить данные")
    } finally {
      setLoadingData(false)
    }
  }, [])

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      void loadData()
    }
  }, [sessionStatus, loadData])

  const availableWorkstations = useMemo(() => {
    if (!formData.classroomId) return []
    return workstations.filter((w) => w.classroomId === formData.classroomId)
  }, [formData.classroomId, workstations])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!formData.title.trim() || !formData.classroomId || !formData.problemEquipmentKind) {
      return
    }
    if (!wholeClassroom && !formData.workstationId) {
      setSubmitError("Выберите рабочее место или нажмите «Все рабочие места».")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await submitTeacherIssueReport({
        title: formData.title.trim(),
        description: formData.description,
        priority: formData.priority,
        classroomId: formData.classroomId,
        workstationId: wholeClassroom ? null : formData.workstationId,
        wholeClassroom,
        problemEquipmentKind: formData.problemEquipmentKind,
      })
      setCreatedCount(res.created)
      setIsSubmitted(true)
      toast.success(
        res.created > 1 ? `Создано обращений: ${res.created}` : "Заявка отправлена"
      )
      setTimeout(() => {
        router.push("/dashboard/my-requests")
      }, 2200)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Ошибка отправки")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (sessionStatus === "loading" || (sessionStatus === "authenticated" && loadingData)) {
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

  if (sessionStatus === "unauthenticated" || !session?.user) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Войдите в систему, чтобы создать заявку.
        </CardContent>
      </Card>
    )
  }

  const role = session.user.role as UserRole
  if (role !== UserRole.TEACHER && role !== UserRole.ADMIN) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Создание заявок доступно преподавателям и администраторам.
        </CardContent>
      </Card>
    )
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
        <Button type="button" variant="outline" onClick={() => void loadData()}>
          Повторить
        </Button>
      </div>
    )
  }

  const responsibleClassrooms = classrooms

  if (isSubmitted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">Заявка отправлена</h2>
            <p className="text-muted-foreground">
              {createdCount > 1
                ? `Создано обращений: ${createdCount} (по рабочим местам в аудитории).`
                : "Ваша заявка передана администратору. Скоро вы будете перенаправлены к списку заявок."}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const canSubmit =
    Boolean(formData.title.trim()) &&
    Boolean(formData.classroomId) &&
    Boolean(formData.problemEquipmentKind) &&
    (wholeClassroom || Boolean(formData.workstationId))

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 sm:gap-4">
        <Button variant="ghost" size="icon" asChild className="mt-1 shrink-0">
          <Link href="/dashboard/my-requests" aria-label="Назад к заявкам">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <PageHeader
          className="min-w-0 flex-1"
          title="Сообщить о проблеме"
          description="Создайте заявку на проверку или ремонт оборудования"
        />
      </div>

      {responsibleClassrooms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium">Нет доступных аудиторий</h3>
            <p className="max-w-md text-center text-muted-foreground">
              {role === UserRole.TEACHER
                ? "Вы не назначены ответственным ни за одну аудиторию. Обратитесь к администратору."
                : "В реестре пока нет аудиторий."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit}>
          {submitError ? (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Информация о проблеме</CardTitle>
                  <CardDescription>Опишите проблему как можно понятнее</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Краткое описание проблемы *</Label>
                    <Input
                      id="title"
                      placeholder="Например: не работает монитор"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="description">Подробное описание (необязательно)</Label>
                    <Textarea
                      id="description"
                      placeholder="При необходимости: что произошло, когда заметили, что уже пробовали…"
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Тип оборудования *</Label>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-3">
                      {equipmentTypes.map((type) => {
                        const Icon = type.icon
                        const isSelected = formData.problemEquipmentKind === type.value
                        return (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, problemEquipmentKind: type.value })}
                            className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all hover:bg-accent ${
                              isSelected ? "border-primary bg-primary/5" : "border-border"
                            }`}
                          >
                            <Icon
                              className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`}
                            />
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
                  <CardDescription>Аудитория и рабочее место (или весь кабинет)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="classroom">Аудитория *</Label>
                    <Select
                      value={formData.classroomId}
                      onValueChange={(value) => {
                        setWholeClassroom(false)
                        setSubmitError(null)
                        setFormData({ ...formData, classroomId: value, workstationId: "" })
                      }}
                    >
                      <SelectTrigger id="classroom">
                        <SelectValue placeholder="Выберите аудиторию" />
                      </SelectTrigger>
                      <SelectContent>
                        {responsibleClassrooms.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {classroomLabel(c)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {role === UserRole.TEACHER ? (
                      <p className="text-xs text-muted-foreground">
                        Отображаются только аудитории, за которые вы ответственны
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-2">
                    <div className="flex flex-wrap items-end justify-between gap-2">
                      <Label htmlFor="workstation">Рабочее место</Label>
                      <Button
                        type="button"
                        variant={wholeClassroom ? "default" : "outline"}
                        size="sm"
                        className="gap-1.5"
                        disabled={!formData.classroomId}
                        onClick={() => {
                          setWholeClassroom(true)
                          setFormData((prev) => ({ ...prev, workstationId: "" }))
                          setSubmitError(null)
                        }}
                      >
                        <LayoutGrid className="h-4 w-4" />
                        Все рабочие места
                      </Button>
                    </div>
                    {wholeClassroom ? (
                      <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
                        Будет создано отдельное обращение по каждому рабочему месту, где в системе есть
                        зарегистрированное оборудование (по умолчанию — запись ПК).
                      </p>
                    ) : null}
                    <Select
                      value={formData.workstationId}
                      onValueChange={(value) => {
                        setWholeClassroom(false)
                        setFormData({ ...formData, workstationId: value })
                        setSubmitError(null)
                      }}
                      disabled={!formData.classroomId || wholeClassroom}
                    >
                      <SelectTrigger id="workstation">
                        <SelectValue
                          placeholder={
                            formData.classroomId
                              ? wholeClassroom
                                ? "Режим: весь кабинет"
                                : "Выберите рабочее место"
                              : "Сначала выберите аудиторию"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {availableWorkstations.map((ws) => (
                          <SelectItem key={ws.id} value={ws.id}>
                            {workstationLabel(ws)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {wholeClassroom ? (
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto px-0 text-sm"
                        onClick={() => setWholeClassroom(false)}
                      >
                        Выбрать одно рабочее место
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Приоритет</CardTitle>
                  <CardDescription>Насколько срочно нужно решить проблему</CardDescription>
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
                          className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border-2 p-3 text-left transition-all hover:bg-accent ${
                            isSelected ? "border-primary bg-primary/5" : "border-border"
                          }`}
                        >
                          <div className={`h-3 w-3 rounded-full ${option.color}`} />
                          <div className="flex-1">
                            <div className={`font-medium ${isSelected ? "text-primary" : ""}`}>
                              {option.label}
                            </div>
                            <div className="text-xs text-muted-foreground">{option.description}</div>
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
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>После отправки:</p>
                    <ul className="list-inside list-disc space-y-1">
                      <li>Администратор увидит обращение в системе</li>
                      <li>Статус оборудования может перейти в «Требует проверки»</li>
                      <li>Вы сможете отслеживать заявки в разделе «Мои заявки»</li>
                    </ul>
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting || !canSubmit}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Отправка…
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
