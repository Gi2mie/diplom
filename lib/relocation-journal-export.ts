import type { RelocationJournalRow } from "@/lib/api/relocations"
import type { ReportsExportTable } from "@/lib/reports-export-table"

function formatDateCell(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      dateStyle: "short",
      timeStyle: "short",
    })
  } catch {
    return iso
  }
}

/** Таблица для Excel / PDF / печати по текущим фильтрам журнала. */
export function buildRelocationJournalExportTable(params: {
  rows: RelocationJournalRow[]
  dateFrom: string
  dateTo: string
  searchQuery: string
}): ReportsExportTable {
  const { rows, dateFrom, dateTo, searchQuery } = params
  const notes: string[] = [`Период: ${dateFrom} — ${dateTo}`]
  const q = searchQuery.trim()
  if (q) notes.push(`Поиск: ${q}`)
  notes.push(`Записей в выборке: ${rows.length}`)

  const headers = [
    "Перемещено",
    "Возврат",
    "Тип",
    "Оборудование",
    "Инв. №",
    "Маршрут (ауд.)",
    "РМ (от → к)",
    "Инициатор",
    "Статус",
  ]

  const dataRows = rows.map((item) => {
    const typeLabel =
      item.kind === "WORKSTATION" ? `РМ (${item.movedEquipmentCount})` : "Единица"
    const equip =
      item.kind === "WORKSTATION"
        ? `Всё оборудование РМ (${item.movedEquipmentCount})`
        : (item.equipmentName ?? "—")
    const inv = item.inventoryNumber ?? "—"
    const route = `${item.fromClassroomNumber}→${item.toClassroomNumber}`
    const ws = `${item.fromWorkstationCode} → ${item.toWorkstationCode}`
    const status = item.revertedAt ? "Возвращено" : "Активно"
    return [
      formatDateCell(item.movedAt),
      item.revertedAt ? formatDateCell(item.revertedAt) : "—",
      typeLabel,
      equip,
      inv,
      route,
      ws,
      item.initiator,
      status,
    ]
  })

  return {
    title: "Журнал перемещения",
    notes,
    headers,
    rows: dataRows,
  }
}
