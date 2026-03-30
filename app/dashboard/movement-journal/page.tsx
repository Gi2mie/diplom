"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import {
  AlertCircle,
  ArrowRightLeft,
  Calendar,
  Download,
  Loader2,
  MapPin,
  Package,
  Printer,
  RotateCcw,
  Search,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import {
  fetchRelocationLogs,
  revertRelocationApi,
  type RelocationJournalRow,
} from "@/lib/api/relocations"
import { PageHeader } from "@/components/dashboard/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { SortableTableHead } from "@/components/ui/sortable-table-head"
import { useTableSort } from "@/hooks/use-table-sort"
import { buildRelocationJournalExportTable } from "@/lib/relocation-journal-export"
import { downloadReportsExcel, downloadReportsPdf } from "@/lib/reports-export-file"
import { reportsTableToPrintHtml } from "@/lib/reports-export-table"

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      dateStyle: "short",
      timeStyle: "short",
    })
  } catch {
    return iso
  }
}

/** Дата по локальному календарю (как у `<input type="date">`). */
function toLocalDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function startOfLocalDay(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number)
  if (!y || !m || !d) return new Date(NaN)
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

function endOfLocalDay(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number)
  if (!y || !m || !d) return new Date(NaN)
  return new Date(y, m - 1, d, 23, 59, 59, 999)
}

export default function MovementJournalPage() {
  const { data: session, status: sessionStatus } = useSession()
  const isAdmin = session?.user?.role === "ADMIN"

  const [logs, setLogs] = useState<RelocationJournalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revertingId, setRevertingId] = useState<string | null>(null)

  const defaultRange = useMemo(() => {
    const to = new Date()
    const from = new Date(to)
    from.setMonth(from.getMonth() - 1)
    return {
      dateFrom: toLocalDateString(from),
      dateTo: toLocalDateString(to),
    }
  }, [])

  const [dateFrom, setDateFrom] = useState(defaultRange.dateFrom)
  const [dateTo, setDateTo] = useState(defaultRange.dateTo)
  const [searchQuery, setSearchQuery] = useState("")

  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<"excel" | "pdf">("excel")
  const [exportBusy, setExportBusy] = useState(false)

  const load = useCallback(async () => {
    if (!isAdmin) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchRelocationLogs()
      setLogs(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки")
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  useEffect(() => {
    if (sessionStatus === "authenticated" && isAdmin) void load()
  }, [sessionStatus, isAdmin, load])

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return logs.filter((item) => {
      const moved = new Date(item.movedAt)
      const rangeFrom = startOfLocalDay(dateFrom)
      const rangeTo = endOfLocalDay(dateTo)
      if (moved < rangeFrom || moved > rangeTo) return false
      if (!q) return true
      const blob = [
        item.equipmentName ?? "",
        item.inventoryNumber ?? "",
        item.fromClassroomNumber,
        item.toClassroomNumber,
        item.fromWorkstationCode,
        item.toWorkstationCode,
        item.initiator,
        item.kind,
      ]
        .join(" ")
        .toLowerCase()
      return blob.includes(q)
    })
  }, [logs, dateFrom, dateTo, searchQuery])

  const journalSortGetters = useMemo(
    () => ({
      movedAt: (r: RelocationJournalRow) => new Date(r.movedAt).getTime(),
      revertedAt: (r: RelocationJournalRow) =>
        r.revertedAt ? new Date(r.revertedAt).getTime() : 0,
      kind: (r: RelocationJournalRow) => r.kind,
      equipment: (r: RelocationJournalRow) =>
        r.kind === "WORKSTATION"
          ? `рм-${r.movedEquipmentCount}`
          : (r.equipmentName ?? r.inventoryNumber ?? ""),
      route: (r: RelocationJournalRow) =>
        `${r.fromClassroomNumber}->${r.toClassroomNumber}`,
      workstation: (r: RelocationJournalRow) =>
        `${r.fromWorkstationCode} ${r.toWorkstationCode}`,
      initiator: (r: RelocationJournalRow) => r.initiator,
    }),
    []
  )

  const { sortedItems: sortedJournalRows, sortKey, sortDir, toggleSort } = useTableSort(
    filteredRecords,
    journalSortGetters,
    "movedAt"
  )

  const exportTable = useMemo(
    () =>
      buildRelocationJournalExportTable({
        rows: filteredRecords,
        dateFrom,
        dateTo,
        searchQuery,
      }),
    [filteredRecords, dateFrom, dateTo, searchQuery]
  )

  const PREVIEW_ROW_LIMIT = 100
  const previewRowsSlice = exportTable.rows.slice(0, PREVIEW_ROW_LIMIT)
  const previewRowCount = exportTable.rows.length

  const handleJournalPrint = () => {
    const html = reportsTableToPrintHtml(exportTable)
    const iframe = document.createElement("iframe")
    iframe.setAttribute("title", "Печать журнала перемещения")
    Object.assign(iframe.style, {
      position: "fixed",
      right: "0",
      bottom: "0",
      width: "0",
      height: "0",
      border: "0",
      visibility: "hidden",
    })
    document.body.appendChild(iframe)
    const win = iframe.contentWindow
    const idoc = iframe.contentDocument
    if (!win || !idoc) {
      iframe.remove()
      return
    }

    const cleanup = () => {
      try {
        iframe.remove()
      } catch {
        /* noop */
      }
    }

    const runPrint = () => {
      try {
        win.focus()
        win.print()
      } finally {
        setTimeout(cleanup, 800)
      }
    }

    idoc.open()
    idoc.write(html)
    idoc.close()

    requestAnimationFrame(() => {
      requestAnimationFrame(runPrint)
    })
  }

  const handleConfirmExport = async () => {
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "")
    const base = `zhurnal-peremeshcheniy-${stamp}`
    setExportBusy(true)
    try {
      if (exportFormat === "excel") {
        await downloadReportsExcel(exportTable, `${base}.xlsx`, {
          sheetName: "Журнал перемещения",
        })
      } else {
        await downloadReportsPdf(exportTable, `${base}.pdf`)
      }
      setExportDialogOpen(false)
      toast.success("Файл сохранён")
    } finally {
      setExportBusy(false)
    }
  }

  if (sessionStatus === "loading") {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">Загрузка…</div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Журнал перемещения"
          description="Раздел доступен только администратору."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 md:space-y-8" data-tour="tour-movement-journal-page">
      <PageHeader
        title="Журнал перемещения"
        description="Перемещения оборудования и целых рабочих мест между аудиториями. После возврата запись сохраняется с датой отката."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleJournalPrint()}
              disabled={loading}
            >
              <Printer className="mr-2 h-4 w-4" />
              Печать
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setExportFormat("excel")
                setExportDialogOpen(true)
              }}
              disabled={loading}
            >
              <Download className="mr-2 h-4 w-4" />
              Экспорт…
            </Button>
          </div>
        }
      />

      {error && (
        <Alert variant="destructive" className="border-destructive/40">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Ошибка</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Фильтр по периоду
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex min-w-0 flex-wrap items-end gap-4">
            <div className="relative min-w-[min(100%,16rem)] flex-1 basis-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Поиск по инв. №, аудитории, РМ, инициатору…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Поиск по журналу"
              />
            </div>
            <div className="relative grid min-w-0 gap-2">
              <Label htmlFor="dateFrom">Дата с</Label>
              <Input
                id="dateFrom"
                type="date"
                className="w-40 max-w-full"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="relative grid min-w-0 gap-2">
              <Label htmlFor="dateTo">Дата по</Label>
              <Input
                id="dateTo"
                type="date"
                className="w-40 max-w-full"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <Button variant="outline" type="button" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Обновить"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Записей в периоде</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredRecords.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Активных (не возвращено)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredRecords.filter((r) => !r.revertedAt).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">С возвратом</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredRecords.filter((r) => r.revertedAt).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Записи
          </CardTitle>
          <CardDescription>
            Период с {dateFrom} по {dateTo} — показано {sortedJournalRows.length} из {logs.length}{" "}
            всего
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[min(70vh,720px)] overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    columnKey="movedAt"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  >
                    Перемещено
                  </SortableTableHead>
                  <SortableTableHead
                    columnKey="revertedAt"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  >
                    Возврат
                  </SortableTableHead>
                  <SortableTableHead
                    columnKey="kind"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  >
                    Тип
                  </SortableTableHead>
                  <SortableTableHead
                    columnKey="equipment"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  >
                    Оборудование
                  </SortableTableHead>
                  <SortableTableHead
                    columnKey="route"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  >
                    Маршрут ауд.
                  </SortableTableHead>
                  <SortableTableHead
                    columnKey="workstation"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  >
                    РМ
                  </SortableTableHead>
                  <SortableTableHead
                    columnKey="initiator"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  >
                    Инициатор
                  </SortableTableHead>
                  <TableHead className="text-right">Действие</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : sortedJournalRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      {logs.length === 0
                        ? "В журнале пока нет перемещений"
                        : "Нет записей за выбранный период — расширьте даты или сбросьте поиск"}
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedJournalRows.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDate(item.movedAt)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {item.revertedAt ? formatDate(item.revertedAt) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.kind === "WORKSTATION" ? "secondary" : "outline"}>
                          {item.kind === "WORKSTATION"
                            ? `РМ (${item.movedEquipmentCount})`
                            : "Единица"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <div className="truncate font-medium">
                              {item.kind === "WORKSTATION"
                                ? `Всё оборудование РМ (${item.movedEquipmentCount})`
                                : (item.equipmentName ?? "—")}
                            </div>
                            {item.inventoryNumber ? (
                              <div className="font-mono text-xs text-muted-foreground">
                                {item.inventoryNumber}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm tabular-nums">
                        {`${item.fromClassroomNumber}->${item.toClassroomNumber}`}
                      </TableCell>
                      <TableCell className="max-w-[10rem] text-xs">
                        <div className="flex items-start gap-1">
                          <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                          <span className="break-all">
                            {item.fromWorkstationCode} → {item.toWorkstationCode}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{item.initiator}</TableCell>
                      <TableCell className="text-right">
                        {!item.revertedAt ? (
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            disabled={revertingId === item.id}
                            onClick={() => {
                              setRevertingId(item.id)
                              void revertRelocationApi(item.id)
                                .then(() => {
                                  void load()
                                  toast.success("Перемещение отменено")
                                })
                                .catch((e) => setError(e instanceof Error ? e.message : "Ошибка отката"))
                                .finally(() => setRevertingId(null))
                            }}
                          >
                            {revertingId === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <RotateCcw className="mr-1 h-3 w-3" />
                                Вернуть обратно
                              </>
                            )}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Возвращено</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={exportDialogOpen}
        onOpenChange={(open) => {
          if (!exportBusy) setExportDialogOpen(open)
        }}
      >
        <DialogContent className="flex max-h-[90vh] w-full max-w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
          <DialogHeader className="min-w-0 shrink-0 space-y-2 border-b px-6 py-4 pr-14 text-left sm:pr-16">
            <DialogTitle>Экспорт журнала</DialogTitle>
            <DialogDescription className="max-w-full text-pretty break-words hyphens-auto">
              В файл попадает текущая выборка (период и поиск). Ниже — предпросмотр; в скачанном
              файле — все строки.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Формат</Label>
              <RadioGroup
                value={exportFormat}
                onValueChange={(v) => setExportFormat(v as "excel" | "pdf")}
                className="flex flex-wrap gap-6"
                disabled={exportBusy}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="excel" id="journal-export-excel" />
                  <Label htmlFor="journal-export-excel" className="cursor-pointer font-normal">
                    Excel (.xlsx)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pdf" id="journal-export-pdf" />
                  <Label htmlFor="journal-export-pdf" className="cursor-pointer font-normal">
                    PDF
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="min-w-0 space-y-2">
              <Label className="text-sm font-medium">Предпросмотр</Label>
              <div className="max-h-[min(420px,50vh)] w-full min-w-0 overflow-auto rounded-md border">
                <div className="space-y-4 p-4">
                  {exportTable.notes.length > 0 && (
                    <ul className="list-inside list-disc space-y-1 text-sm break-words text-muted-foreground">
                      {exportTable.notes.map((n, i) => (
                        <li key={i}>{n}</li>
                      ))}
                    </ul>
                  )}
                  <div className="w-max min-w-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {exportTable.headers.map((h) => (
                            <TableHead key={h} className="whitespace-nowrap">
                              {h}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewRowsSlice.map((row, ri) => (
                          <TableRow key={ri}>
                            {row.map((cell, ci) => (
                              <TableCell
                                key={ci}
                                className="max-w-[min(24rem,55vw)] whitespace-normal break-words"
                              >
                                {cell}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {previewRowCount > PREVIEW_ROW_LIMIT && (
                    <p className="text-sm text-muted-foreground">
                      …и ещё {previewRowCount - PREVIEW_ROW_LIMIT} строк в файле (всего{" "}
                      {previewRowCount}).
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t px-6 py-4 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setExportDialogOpen(false)}
              disabled={exportBusy}
            >
              Отмена
            </Button>
            <Button type="button" onClick={() => void handleConfirmExport()} disabled={exportBusy}>
              {exportBusy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Сохранение…
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Скачать
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
