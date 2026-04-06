import type { ReportsExportTable } from "@/lib/reports-export-table"
import { applyReportsPdfCyrillicFont, reportsPdfFontFamily } from "@/lib/reports-pdf-font"

/** Браузерная сборка: пакет `jspdf` в Node/SSR резолвится в `jspdf.node.min.js` → fflate/worker и падает в Turbopack. */
const jspdfBrowser = () => import("jspdf/dist/jspdf.es.min.js")

const pdfTableFont = {
  font: reportsPdfFontFamily,
  fontStyle: "normal" as const,
}

export async function downloadReportsExcel(
  table: ReportsExportTable,
  filename: string,
  options?: { sheetName?: string }
): Promise<void> {
  const XLSX = await import("xlsx")
  const wsData: string[][] = [table.headers, ...table.rows]
  const ws = XLSX.utils.aoa_to_sheet(wsData)
  const wb = XLSX.utils.book_new()
  const sheet = options?.sheetName?.slice(0, 31) ?? "Отчёт"
  XLSX.utils.book_append_sheet(wb, ws, sheet)
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`)
}

export async function downloadReportsPdf(table: ReportsExportTable, filename: string): Promise<void> {
  const mod = await jspdfBrowser()
  const JsPDF = mod.jsPDF ?? mod.default
  const autoTable = (await import("jspdf-autotable")).default

  const doc = new JsPDF({
    orientation: table.headers.length > 6 ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  })

  await applyReportsPdfCyrillicFont(doc)

  const margin = 14
  let y = 12
  doc.setFontSize(14)
  doc.text(table.title, margin, y)
  y += 8
  doc.setFontSize(9)
  for (const line of table.notes) {
    const lines = doc.splitTextToSize(line, 180)
    doc.text(lines, margin, y)
    y += lines.length * 4 + 2
  }
  y += 2

  if (table.softwareBlocks?.length) {
    for (const block of table.softwareBlocks) {
      if (y > 250) {
        doc.addPage()
        y = 12
      }
      doc.setFontSize(11)
      doc.text(block.title, margin, y)
      y += 5
      doc.setFontSize(9)
      doc.setTextColor(80)
      doc.text(block.subtitle, margin, y)
      doc.setTextColor(0)
      y += 4
      autoTable(doc, {
        startY: y,
        head: [block.headers],
        body: block.rows,
        styles: { fontSize: 7, cellPadding: 1.5, ...pdfTableFont },
        headStyles: { fillColor: [66, 66, 66], ...pdfTableFont },
        margin: { left: margin, right: margin },
      })
      const docExt = doc as typeof doc & { lastAutoTable?: { finalY: number } }
      y = (docExt.lastAutoTable?.finalY ?? y) + 10
    }
  } else {
    autoTable(doc, {
      startY: y,
      head: [table.headers],
      body: table.rows,
      styles: { fontSize: 7, cellPadding: 1.5, ...pdfTableFont },
      headStyles: { fillColor: [66, 66, 66], ...pdfTableFont },
      margin: { left: margin, right: margin },
    })
  }

  const name = filename.endsWith(".pdf") ? filename : `${filename}.pdf`
  doc.save(name)
}
