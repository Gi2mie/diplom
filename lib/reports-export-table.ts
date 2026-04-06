import type { EquipmentStatus, SoftwareLicenseKind } from "@prisma/client"
import type { ReportsPayload, ReportsHistoryRow } from "@/lib/api/reports-dashboard"

export type ReportsExportSoftwareBlock = {
  title: string
  subtitle: string
  headers: string[]
  rows: string[][]
}

export type ReportsExportTable = {
  title: string
  notes: string[]
  headers: string[]
  /** Плоские строки для Excel / PDF / CSV */
  rows: string[][]
  /** Предпросмотр и печать: секции по ПК */
  softwareBlocks?: ReportsExportSoftwareBlock[]
}

function htmlEsc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function buildReportsExportTable(params: {
  activeTab: string
  data: ReportsPayload | null
  filteredHistory: ReportsHistoryRow[]
  dateFrom: string
  dateTo: string
  softwareFilterLines: string[]
  equipmentStatusLabel: (s: EquipmentStatus) => string
  licenseLabel: (k: SoftwareLicenseKind, licenseType?: string | null) => string
  historyStatusText: (r: ReportsHistoryRow) => string
}): ReportsExportTable | null {
  const {
    activeTab,
    data,
    filteredHistory,
    dateFrom,
    dateTo,
    softwareFilterLines,
    equipmentStatusLabel,
    licenseLabel,
    historyStatusText,
  } = params
  if (!data) return null

  switch (activeTab) {
    case "by-status":
      return {
        title: "Оборудование по статусам",
        notes: [],
        headers: ["Статус", "Код", "Количество", "Доля %"],
        rows: data.statusBreakdown.map((r) => [
          r.label,
          r.status,
          String(r.count),
          String(r.percentage),
        ]),
      }
    case "classrooms":
      return {
        title: "По кабинетам",
        notes: [],
        headers: ["Кабинет", "Корпус", "Всего ед.", "Треб. проверки", "В ремонте", "Доля проблем %"],
        rows: data.classroomIssues.map((r) => [
          r.classroomName ? `${r.classroomNumber} (${r.classroomName})` : r.classroomNumber,
          r.buildingName ?? "—",
          String(r.totalEquipment),
          String(r.faultyCount),
          String(r.inRepairCount),
          String(r.percentage),
        ]),
      }
    case "problems":
      return {
        title: "Проблемное оборудование",
        notes: [],
        headers: ["Оборудование", "Тип", "Кабинет", "Обращений", "Последнее", "Статус оборудования"],
        rows: data.topProblems.map((r) => [
          r.name,
          r.type,
          r.classroom,
          String(r.problemCount),
          r.lastProblem,
          equipmentStatusLabel(r.status),
        ]),
      }
    case "software": {
      const filterNote = softwareFilterLines.join(" | ")
      const header = [
        "Фильтр",
        "ПК (название)",
        "Инв. №",
        "Расположение",
        "ПО",
        "Версия",
        "Лицензия",
      ]
      const rows: string[][] = []
      const softwareBlocks: ReportsExportSoftwareBlock[] = []

      for (const pc of data.pcSoftware) {
        const place = [pc.buildingName, pc.classroomNumber, pc.workstationCode].filter(Boolean).join(" · ")
        const subHeaders = ["ПО", "Версия", "Лицензия"]
        const subRows: string[][] =
          pc.software.length === 0
            ? [["—", "—", "—"]]
            : pc.software.map((sw) => [sw.name, sw.version, licenseLabel(sw.licenseKind, sw.licenseType)])

        softwareBlocks.push({
          title: pc.name,
          subtitle: `${pc.inventoryNumber} · ${place}`,
          headers: subHeaders,
          rows: subRows,
        })

        if (pc.software.length === 0) {
          rows.push([filterNote, pc.name, pc.inventoryNumber, place, "—", "—", "—"])
        } else {
          for (const sw of pc.software) {
            rows.push([
              filterNote,
              pc.name,
              pc.inventoryNumber,
              place,
              sw.name,
              sw.version,
              licenseLabel(sw.licenseKind, sw.licenseType),
            ])
          }
        }
      }

      return {
        title: "Установленное ПО на ПК",
        notes: softwareFilterLines,
        headers: header,
        rows,
        softwareBlocks,
      }
    }
    case "history":
      return {
        title: "История обращений и ремонтов",
        notes: [`Период: ${dateFrom} — ${dateTo}`],
        headers: [
          "Дата",
          "Тип",
          "Инв. №",
          "Оборудование",
          "Кабинет",
          "Описание",
          "Сис. админ",
          "Статус",
        ],
        rows: filteredHistory.map((item) => [
          item.date,
          item.kind === "issue" ? "Обращение" : "Ремонт",
          item.inventoryNumber,
          item.equipment,
          item.classroom,
          item.description,
          item.sysAdminDisplay ?? "—",
          historyStatusText(item),
        ]),
      }
    default:
      return null
  }
}

export function reportsTableToPrintHtml(table: ReportsExportTable): string {
  const tableHead = (cells: string[]) =>
    `<thead><tr>${cells.map((c) => `<th>${htmlEsc(c)}</th>`).join("")}</tr></thead>`

  const tableBody = (rows: string[][]) =>
    `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${htmlEsc(c)}</td>`).join("")}</tr>`).join("")}</tbody>`

  const notesHtml = table.notes.map((n) => `<p style="margin:4px 0">${htmlEsc(n)}</p>`).join("")

  let inner: string
  if (table.softwareBlocks?.length) {
    inner =
      notesHtml +
      table.softwareBlocks
        .map((b) => {
          return `<section style="margin-bottom:1.5rem;page-break-inside:avoid"><h3 style="margin:0 0 4px;font-size:1rem">${htmlEsc(b.title)}</h3><p style="margin:0 0 8px;font-size:90%">${htmlEsc(b.subtitle)}</p><table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%">${tableHead(b.headers)}${tableBody(b.rows)}</table></section>`
        })
        .join("")
  } else {
    inner =
      notesHtml +
      `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%">${tableHead(table.headers)}${tableBody(table.rows)}</table>`
  }

  return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"/><meta http-equiv="Content-Type" content="text/html; charset=utf-8"/><title>${htmlEsc(table.title)}</title></head><body style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,'Noto Sans',sans-serif;padding:16px"><h1 style="font-size:1.25rem">${htmlEsc(table.title)}</h1>${inner}</body></html>`
}
