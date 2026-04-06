"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { EquipmentType, IssuePriority } from "@prisma/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  Cpu,
  Printer,
  Projector,
  HelpCircle,
  MessageSquare,
  HardDrive,
} from "lucide-react"
import Link from "next/link"
import { fetchMyRequests, type MyRequestListItem } from "@/lib/api/my-requests"
import { PageHeader } from "@/components/dashboard/page-header"
import { SortableTableHead } from "@/components/ui/sortable-table-head"
import { useTableSort } from "@/hooks/use-table-sort"

type UiStatus = MyRequestListItem["status"]

const statusConfig: Record<UiStatus, { label: string; color: string }> = {
  pending: { label: "Ожидает", color: "bg-yellow-500" },
  in_progress: { label: "В работе", color: "bg-blue-500" },
  completed: { label: "Выполнено", color: "bg-green-500" },
  rejected: { label: "Отклонено", color: "bg-red-500" },
}

const priorityConfig: Record<
  IssuePriority,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  [IssuePriority.LOW]: { label: "Низкий", variant: "outline" },
  [IssuePriority.MEDIUM]: { label: "Средний", variant: "secondary" },
  [IssuePriority.HIGH]: { label: "Высокий", variant: "default" },
  [IssuePriority.CRITICAL]: { label: "Критический", variant: "destructive" },
}

const equipmentIconByType: Partial<Record<EquipmentType, React.ElementType>> = {
  [EquipmentType.MONITOR]: Monitor,
  [EquipmentType.PRINTER]: Printer,
  [EquipmentType.PROJECTOR]: Projector,
  [EquipmentType.COMPUTER]: Cpu,
  [EquipmentType.NETWORK_DEVICE]: AlertTriangle,
  [EquipmentType.SCANNER]: Printer,
  [EquipmentType.INTERACTIVE_BOARD]: Monitor,
  [EquipmentType.PERIPHERAL]: Keyboard,
  [EquipmentType.OTHER]: HelpCircle,
}

function requestRowIcon(item: MyRequestListItem) {
  if (item.source === "software") return HardDrive
  if (!item.equipmentType) return Wrench
  const t = item.equipmentType as EquipmentType
  return equipmentIconByType[t] ?? Wrench
}

function descriptionPreview(text: string, max = 72): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

export default function MyRequestsPage() {
  const { status: sessionStatus } = useSession()
  const [requests, setRequests] = useState<MyRequestListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<UiStatus | "all">("all")
  const [selectedType, setSelectedType] = useState<"repair" | "software" | "all">("all")
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<MyRequestListItem | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const items = await fetchMyRequests()
      setRequests(items)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Не удалось загрузить заявки")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (sessionStatus === "authenticated") void load()
  }, [sessionStatus, load])

  const filteredRequests = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return requests.filter((request) => {
      const matchesSearch =
        !q ||
        request.title.toLowerCase().includes(q) ||
        request.description.toLowerCase().includes(q) ||
        request.classroomLabel.toLowerCase().includes(q) ||
        (request.workstationLabel && request.workstationLabel.toLowerCase().includes(q)) ||
        request.inventoryNumbers.some((inv) => inv.toLowerCase().includes(q))

      const matchesStatus = selectedStatus === "all" || request.status === selectedStatus
      const matchesType = selectedType === "all" || request.source === selectedType

      return matchesSearch && matchesStatus && matchesType
    })
  }, [requests, searchQuery, selectedStatus, selectedType])

  const stats = useMemo(
    () => ({
      total: requests.length,
      pending: requests.filter((r) => r.status === "pending").length,
      inProgress: requests.filter((r) => r.status === "in_progress").length,
      completed: requests.filter((r) => r.status === "completed").length,
      rejected: requests.filter((r) => r.status === "rejected").length,
    }),
    [requests]
  )

  const requestSortGetters = useMemo(
    () => ({
      title: (r: MyRequestListItem) => r.title,
      type: (r: MyRequestListItem) => (r.source === "software" ? "ПО" : "Ремонт"),
      classroom: (r: MyRequestListItem) => r.classroomLabel,
      priority: (r: MyRequestListItem) => r.priority,
      status: (r: MyRequestListItem) => r.status,
      created: (r: MyRequestListItem) => new Date(r.createdAt).getTime(),
    }),
    []
  )

  const { sortedItems: sortedRequests, sortKey, sortDir, toggleSort } = useTableSort(
    filteredRequests,
    requestSortGetters,
    "created"
  )

  const handleView = (request: MyRequestListItem) => {
    setSelectedRequest(request)
    setViewDialogOpen(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (sessionStatus === "loading" || (sessionStatus === "authenticated" && loading)) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (sessionStatus === "unauthenticated") {
    return null
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
        <Button type="button" variant="outline" onClick={() => void load()}>
          Повторить
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 min-h-0">
      <PageHeader
        title="Мои заявки"
        description="Обращения о неисправностях и заявки на ПО, которые вы подавали"
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/dashboard/software-requests">Заявка на ПО</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/requests/new">
                <Plus className="mr-2 h-4 w-4" />
                Сообщить о проблеме
              </Link>
            </Button>
          </>
        }
      />

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

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center">
            <div className="relative min-w-0 flex-1 basis-full md:basis-[min(100%,20rem)]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Текст заявки, аудитория, РМ, инв. номер…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="min-w-0 w-full md:w-44 md:shrink-0">
              <Select
                value={selectedStatus}
                onValueChange={(value) => setSelectedStatus(value as UiStatus | "all")}
              >
                <SelectTrigger>
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
            </div>
            <div className="min-w-0 w-full md:w-44 md:shrink-0">
              <Select
                value={selectedType}
                onValueChange={(value) => setSelectedType(value as "repair" | "software" | "all")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Тип" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все типы</SelectItem>
                  <SelectItem value="repair">Ремонт / неисправность</SelectItem>
                  <SelectItem value="software">ПО</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="min-h-0">
        <CardHeader>
          <CardTitle>Заявки</CardTitle>
          <CardDescription>Найдено: {sortedRequests.length}</CardDescription>
        </CardHeader>
        <CardContent className="min-h-0">
          {sortedRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium">Заявки не найдены</h3>
              <p className="mt-1 text-muted-foreground">
                {searchQuery || selectedStatus !== "all" || selectedType !== "all"
                  ? "Попробуйте изменить параметры поиска"
                  : "У вас пока нет заявок"}
              </p>
              {!searchQuery && selectedStatus === "all" && selectedType === "all" && (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button asChild variant="outline">
                    <Link href="/dashboard/software-requests">Заявка на ПО</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/dashboard/requests/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Сообщить о проблеме
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="max-h-[min(62vh,680px)] overflow-auto rounded-md border">
              <Table className="min-w-[940px]">
                <TableHeader>
                <TableRow>
                  <SortableTableHead
                    columnKey="title"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                    className="min-w-[20rem]"
                  >
                    Заявка
                  </SortableTableHead>
                  <SortableTableHead
                    columnKey="type"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                    className="min-w-[10rem]"
                  >
                    Тип
                  </SortableTableHead>
                  <SortableTableHead
                    columnKey="classroom"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                    className="min-w-[14rem]"
                  >
                    Аудитория
                  </SortableTableHead>
                  <SortableTableHead
                    columnKey="priority"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                    className="min-w-[9rem]"
                  >
                    Приоритет
                  </SortableTableHead>
                  <SortableTableHead
                    columnKey="status"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                    className="min-w-[10rem]"
                  >
                    Статус
                  </SortableTableHead>
                  <TableHead className="min-w-[7rem] text-right">Действия</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {sortedRequests.map((request) => {
                  const statusInfo = statusConfig[request.status]
                  const priorityInfo = priorityConfig[request.priority]
                  const RowIcon = requestRowIcon(request)

                  return (
                    <TableRow key={request.key}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                            <RowIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="font-medium">{request.title}</div>
                            <div className="line-clamp-1 text-sm text-muted-foreground">
                              {descriptionPreview(request.description)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {request.source === "repair" ? "Неисправность" : "ПО"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{request.classroomLabel}</div>
                          {request.workstationLabel ? (
                            <div className="text-sm text-muted-foreground">
                              {request.workstationLabel}
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={priorityInfo.variant}>{priorityInfo.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${statusInfo.color}`} />
                          <span>{statusInfo.label}</span>
                        </div>
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
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Детали заявки</DialogTitle>
            <DialogDescription>
              {selectedRequest?.source === "repair"
                ? "Обращение о неисправности"
                : "Заявка на программное обеспечение"}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{selectedRequest.title}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    {selectedRequest.source === "repair" ? "Неисправность" : "ПО"}
                  </Badge>
                  <Badge variant={priorityConfig[selectedRequest.priority].variant}>
                    {priorityConfig[selectedRequest.priority].label}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <div
                      className={`h-2 w-2 rounded-full ${statusConfig[selectedRequest.status].color}`}
                    />
                    <span className="text-sm">{statusConfig[selectedRequest.status].label}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">
                    {selectedRequest.source === "software"
                      ? "Описание от заявителя:"
                      : "Описание:"}
                  </span>
                  <p className="mt-1 whitespace-pre-wrap">
                    {selectedRequest.description.trim()
                      ? selectedRequest.description
                      : "Не указано"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-muted-foreground">Аудитория:</span>
                    <p className="font-medium">{selectedRequest.classroomLabel}</p>
                  </div>
                  {selectedRequest.workstationLabel ? (
                    <div>
                      <span className="text-muted-foreground">Рабочее место:</span>
                      <p className="font-medium">{selectedRequest.workstationLabel}</p>
                    </div>
                  ) : null}
                  <div>
                    <span className="text-muted-foreground">Создано:</span>
                    <p className="font-medium">{formatDate(selectedRequest.createdAt)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Обновлено:</span>
                    <p className="font-medium">{formatDate(selectedRequest.updatedAt)}</p>
                  </div>
                </div>

                {selectedRequest.source === "software" ? (
                  <div className="rounded-lg bg-muted p-3">
                    <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                      <MessageSquare className="h-4 w-4" />
                      <span>Комментарий администратора к заявке</span>
                    </div>
                    <p className="whitespace-pre-wrap">
                      {selectedRequest.adminComment?.trim()
                        ? selectedRequest.adminComment
                        : "Администратор пока не добавил комментарий."}
                    </p>
                  </div>
                ) : selectedRequest.adminComment?.trim() ? (
                  <div className="rounded-lg bg-muted p-3">
                    <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                      <MessageSquare className="h-4 w-4" />
                      <span>Решение / комментарий администратора</span>
                    </div>
                    <p className="whitespace-pre-wrap">{selectedRequest.adminComment}</p>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
