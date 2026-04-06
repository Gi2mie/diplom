/** Кириллица в jsPDF: встроенные шрифты только Latin-1; подключаем TTF из /public. */

const FONT_VFS_NAME = "NotoSans-Regular.ttf"
const FONT_FAMILY = "NotoSans"
const FETCH_PATH = "/fonts/NotoSans-Regular.ttf"

let base64Cache: string | null = null

function uint8ToBase64(bytes: Uint8Array): string {
  const chunk = 0x8000
  let binary = ""
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

async function loadNotoSansBase64(): Promise<string> {
  if (base64Cache) return base64Cache
  const res = await fetch(FETCH_PATH)
  if (!res.ok) {
    throw new Error(`Не удалось загрузить шрифт для PDF (${FETCH_PATH}): ${res.status}`)
  }
  const buf = await res.arrayBuffer()
  base64Cache = uint8ToBase64(new Uint8Array(buf))
  return base64Cache
}

type PdfFontTarget = {
  addFileToVFS: (fileName: string, fileData: string) => void
  addFont: (
    postScriptName: string,
    id: string,
    fontStyle: string,
    fontWeight?: string | number,
    encoding?: "StandardEncoding" | "MacRomanEncoding" | "Identity-H" | "WinAnsiEncoding",
  ) => string
  setFont: (fontName: string, fontStyle?: string) => void
}

/**
 * Регистрирует Noto Sans и переключает документ на него (Unicode / кириллица).
 */
export async function applyReportsPdfCyrillicFont(doc: PdfFontTarget): Promise<void> {
  const b64 = await loadNotoSansBase64()
  doc.addFileToVFS(FONT_VFS_NAME, b64)
  doc.addFont(FONT_VFS_NAME, FONT_FAMILY, "normal", "normal", "Identity-H")
  doc.setFont(FONT_FAMILY, "normal")
}

export const reportsPdfFontFamily = FONT_FAMILY
