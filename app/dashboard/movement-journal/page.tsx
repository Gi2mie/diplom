"use client"

import { useMemo, useState } from "react"
import { ArrowRightLeft, Calendar, MapPin, Package, Search } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type MovementRecord = {
  id: string
  date: string
  equipment: string
  inventoryNumber: string
  fromLocation: string
  toLocation: string
  initiator: string
  comment?: string
}

const movementJournalMock: MovementRecord[] = [
  {
    id: "mv-001",
    date: "2026-03-28",
    equipment: "Системный блок Dell OptiPlex 7080",
    inventoryNumber: "INV-00124",
    fromLocation: "Корпус А / Аудитория 301 / РМ-03",
    toLocation: "Корпус Б / Компьютерный класс 105 / РМ-11",
    initiator: "Сидоров А.В.",
    comment: "Переоснащение учебного класса",
  },
  {
    id: "mv-002",
    date: "2026-03-26",
    equipment: "Монитор LG 24MP400",
    inventoryNumber: "INV-00478",
    fromLocation: "Корпус В / Аудитория 202 / РМ-06",
    toLocation: "Корпус А / Лекционный зал 401 / РМ-02",
    initiator: "Иванов П.С.",
  },
  {
    id: "mv-003",
    date: "2026-03-24",
    equipment: "Проектор Epson EB-X51",
    inventoryNumber: "INV-00091",
    fromLocation: "Корпус А / Лекционный зал 401",
    toLocation: "Корпус А / Аудитория 405",
    initiator: "Петров И.И.",
    comment: "Замена неисправного оборудования в 405",
  },
  {
    id: "mv-004",
    date: "2026-03-22",
    equipment: "Принтер HP LaserJet Pro",
    inventoryNumber: "INV-00316",
    fromLocation: "Корпус Б / Компьютерный класс 105",
    toLocation: "Корпус Б / Лаборатория 112",
    initiator: "Сидоров А.В.",
  },
]

export default function MovementJournalPage() {
  const [dateFrom, setDateFrom] = useState("2026-03-01")
  const [dateTo, setDateTo] = useState("2026-03-31")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return movementJournalMock.filter((item) => {
      const itemDate = new Date(item.date)
      const from = new Date(dateFrom)
      const to = new Date(dateTo)
      if (itemDate < from || itemDate > to) return false
      if (!q) return true
      const blob = [
        item.equipment,
        item.inventoryNumber,
        item.fromLocation,
        item.toLocation,
        item.initiator,
        item.comment ?? "",
      ]
        .join(" ")
        .toLowerCase()
      return blob.includes(q)
    })
  }, [dateFrom, dateTo, searchQuery])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Журнал перемещения</h1>
        <p className="text-muted-foreground">
          История перемещения оборудования между корпусами, аудиториями и рабочими местами.
        </p>
      </div>

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
                placeholder="Поиск по инв. №, оборудованию, маршруту, инициатору…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Поиск по журналу"
              />
            </div>
            <div className="relative min-w-0 grid gap-2">
              <Label htmlFor="dateFrom">Дата с</Label>
              <Input
                id="dateFrom"
                type="date"
                className="w-40 max-w-full"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="relative min-w-0 grid gap-2">
              <Label htmlFor="dateTo">Дата по</Label>
              <Input
                id="dateTo"
                type="date"
                className="w-40 max-w-full"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Всего перемещений</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredRecords.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Уникальных единиц</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(filteredRecords.map((item) => item.inventoryNumber)).size}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Перемещений за неделю</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredRecords.filter((item) => new Date(item.date) >= new Date("2026-03-22")).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Записи перемещений
          </CardTitle>
          <CardDescription>
            Период с {dateFrom} по {dateTo} ({filteredRecords.length} записей)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Оборудование</TableHead>
                <TableHead>Инв. номер</TableHead>
                <TableHead>Откуда</TableHead>
                <TableHead>Куда</TableHead>
                <TableHead>Инициатор</TableHead>
                <TableHead>Комментарий</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Нет записей за выбранный период
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">{item.date}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{item.equipment}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.inventoryNumber}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{item.fromLocation}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{item.toLocation}</span>
                      </div>
                    </TableCell>
                    <TableCell>{item.initiator}</TableCell>
                    <TableCell className="max-w-[220px] truncate" title={item.comment || ""}>
                      {item.comment || "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
