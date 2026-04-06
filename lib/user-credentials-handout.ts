import type { ReportsExportTable } from "@/lib/reports-export-table"

const ROLE_RU: Record<string, string> = {
  ADMIN: "Администратор",
  TEACHER: "Преподаватель",
}

const STATUS_RU: Record<string, string> = {
  ACTIVE: "Активен",
  INACTIVE: "Неактивен",
  BLOCKED: "Заблокирован",
}

export function userHandoutFullName(u: {
  lastName: string
  firstName: string
  middleName?: string | null
}): string {
  return `${u.lastName} ${u.firstName} ${u.middleName ?? ""}`.trim()
}

export function handoutPasswordCell(plain: string | null | undefined): string {
  if (plain && plain.length > 0) return plain
  return "— (не задан: укажите пароль при создании или в карточке пользователя)"
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function buildPrintDocumentHtml(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"/><title>${esc(title)}</title>
<style>
  body { font-family: system-ui, Segoe UI, sans-serif; padding: 24px; color: #111; }
  h1 { font-size: 18px; margin: 0 0 16px; }
  .card { border: 1px solid #ccc; border-radius: 8px; padding: 16px; max-width: 420px; margin-bottom: 20px; }
  .label { color: #555; font-size: 12px; margin-top: 10px; }
  .value { font-size: 15px; word-break: break-all; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #ccc; padding: 8px; text-align: left; vertical-align: top; }
  th { background: #f4f4f4; }
  @media print { body { padding: 12px; } .no-print { display: none; } }
</style></head><body>${bodyHtml}</body></html>`
}

/**
 * Печать через скрытый iframe — не блокируется как всплывающее окно и не ломается из‑за noopener.
 */
export function openCredentialsPrintHtml(title: string, bodyHtml: string): boolean {
  const fullHtml = buildPrintDocumentHtml(title, bodyHtml)

  const iframe = document.createElement("iframe")
  iframe.setAttribute("title", title)
  iframe.setAttribute("aria-hidden", "true")
  Object.assign(iframe.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: "210mm",
    height: "297mm",
    border: "0",
    margin: "0",
    padding: "0",
    opacity: "0",
    pointerEvents: "none",
    zIndex: "-1",
  })
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument
  const win = iframe.contentWindow
  if (!doc || !win) {
    iframe.remove()
    return openCredentialsPrintViaPopup(fullHtml)
  }

  const cleanup = () => {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
  }

  doc.open()
  doc.write(fullHtml)
  doc.close()

  setTimeout(() => {
    try {
      win.focus()
      win.print()
    } catch {
      /* ignore */
    }
    win.addEventListener("afterprint", cleanup, { once: true })
    setTimeout(cleanup, 90_000)
  }, 200)

  return true
}

/** Запасной вариант: окно без noopener (иначе в ряде браузеров print недоступен или open даёт null). */
function openCredentialsPrintViaPopup(fullHtml: string): boolean {
  const w = window.open("", "_blank", "width=720,height=640")
  if (!w) return false
  try {
    w.document.open()
    w.document.write(fullHtml)
    w.document.close()
    const printIt = () => {
      w.focus()
      w.print()
    }
    w.addEventListener("load", () => setTimeout(printIt, 200), { once: true })
    setTimeout(printIt, 300)
  } catch {
    w.close()
    return false
  }
  return true
}

export function printSingleUserHandout(u: {
  lastName: string
  firstName: string
  middleName: string | null
  email: string
  role: string
  status: string
  handoutPasswordPlain?: string | null
}): boolean {
  const name = userHandoutFullName(u)
  const pwd = handoutPasswordCell(u.handoutPasswordPlain)
  const body = `
    <h1>Данные для входа в EduControl</h1>
    <div class="card">
      <div class="value" style="font-weight:600">${esc(name)}</div>
      <div class="label">Электронная почта (логин)</div>
      <div class="value">${esc(u.email)}</div>
      <div class="label">Пароль</div>
      <div class="value">${esc(pwd)}</div>
      <div class="label">Роль</div>
      <div class="value">${esc(ROLE_RU[u.role] ?? u.role)}</div>
      <div class="label">Статус</div>
      <div class="value">${esc(STATUS_RU[u.status] ?? u.status)}</div>
    </div>
    <p style="font-size:11px;color:#666">Храните лист конфиденциально. При смене пароля администратором здесь отображается последний заданный пароль.</p>
  `
  return openCredentialsPrintHtml(`Вход: ${name}`, body)
}

export function printUsersListHandout(
  users: Array<{
    lastName: string
    firstName: string
    middleName: string | null
    email: string
    role: string
    status: string
    handoutPasswordPlain?: string | null
  }>
): boolean {
  const rows = users
    .map(
      (u) => `<tr>
      <td>${esc(userHandoutFullName(u))}</td>
      <td>${esc(u.email)}</td>
      <td>${esc(handoutPasswordCell(u.handoutPasswordPlain))}</td>
      <td>${esc(ROLE_RU[u.role] ?? u.role)}</td>
      <td>${esc(STATUS_RU[u.status] ?? u.status)}</td>
    </tr>`
    )
    .join("")
  const body = `
    <h1>Данные для входа (список пользователей)</h1>
    <table>
      <thead><tr><th>ФИО</th><th>Email</th><th>Пароль</th><th>Роль</th><th>Статус</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="font-size:11px;color:#666;margin-top:16px">Количество записей: ${users.length}. Пароль — последний, заданный администратором при создании или смене учётной записи.</p>
  `
  return openCredentialsPrintHtml("Список учётных данных", body)
}

export function buildUsersHandoutExportTable(
  users: Array<{
    lastName: string
    firstName: string
    middleName: string | null
    email: string
    role: string
    status: string
    handoutPasswordPlain?: string | null
  }>,
  title: string
): ReportsExportTable {
  const notes = [
    "Пароль в таблице — последний, заданный администратором при создании пользователя или смене пароля в карточке.",
    "Если ячейка «— (не задан…)», откройте пользователя в режиме редактирования и задайте пароль — тогда он появится в выгрузке.",
    "Реальный пароль нельзя восстановить из базы: хранится только хеш; открытый пароль ведётся отдельно для выдачи на печать.",
  ]
  const headers = ["ФИО", "Email (логин)", "Пароль (для входа)", "Роль", "Статус"]
  const rows = users.map((u) => [
    userHandoutFullName(u),
    u.email,
    handoutPasswordCell(u.handoutPasswordPlain),
    ROLE_RU[u.role] ?? u.role,
    STATUS_RU[u.status] ?? u.status,
  ])
  return { title, notes, headers, rows }
}
