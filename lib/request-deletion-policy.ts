import { IssueStatus, SoftwareRequestStatus } from "@prisma/client"

export const REQUEST_DELETE_AFTER_TERMINAL_MS = 30 * 24 * 60 * 60 * 1000

const ISSUE_TERMINAL_STATUSES = new Set<IssueStatus>([
  IssueStatus.RESOLVED,
  IssueStatus.CLOSED,
  IssueStatus.REJECTED,
])

const SOFTWARE_TERMINAL_STATUSES = new Set<SoftwareRequestStatus>([
  SoftwareRequestStatus.COMPLETED,
  SoftwareRequestStatus.REJECTED,
])

function eligibleAtFromIso(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return null
  return new Date(t + REQUEST_DELETE_AFTER_TERMINAL_MS)
}

function daysLeftUntil(eligibleAt: Date | null): number | null {
  if (!eligibleAt) return null
  const diff = eligibleAt.getTime() - Date.now()
  if (diff <= 0) return 0
  return Math.ceil(diff / (24 * 60 * 60 * 1000))
}

export function issuePermanentDeleteAllowed(
  status: IssueStatus,
  referenceIso: string | null | undefined
): boolean {
  if (!ISSUE_TERMINAL_STATUSES.has(status)) return false
  const eligibleAt = eligibleAtFromIso(referenceIso)
  if (!eligibleAt) return false
  return Date.now() >= eligibleAt.getTime()
}

export function softwareRequestPermanentDeleteAllowed(
  status: SoftwareRequestStatus,
  referenceIso: string | null | undefined
): boolean {
  if (!SOFTWARE_TERMINAL_STATUSES.has(status)) return false
  const eligibleAt = eligibleAtFromIso(referenceIso)
  if (!eligibleAt) return false
  return Date.now() >= eligibleAt.getTime()
}

export function assertIssuePermanentDeleteAllowed(i: {
  status: IssueStatus
  resolvedAt: Date | null
  updatedAt: Date
}): { ok: true } | { ok: false; error: string } {
  if (!ISSUE_TERMINAL_STATUSES.has(i.status)) {
    return { ok: false, error: "Удалять можно только обращения со статусом «Решено», «Закрыто» или «Отклонено»." }
  }
  const eligibleAt = new Date((i.resolvedAt ?? i.updatedAt).getTime() + REQUEST_DELETE_AFTER_TERMINAL_MS)
  if (Date.now() < eligibleAt.getTime()) {
    return {
      ok: false,
      error: `Удаление обращения будет доступно не ранее ${eligibleAt.toLocaleDateString("ru-RU")}.`,
    }
  }
  return { ok: true }
}

export function assertSoftwareRequestPermanentDeleteAllowed(r: {
  status: SoftwareRequestStatus
  updatedAt: Date
}): { ok: true } | { ok: false; error: string } {
  if (!SOFTWARE_TERMINAL_STATUSES.has(r.status)) {
    return { ok: false, error: "Удалять можно только заявки со статусом «Выполнено» или «Отклонено»." }
  }
  const eligibleAt = new Date(r.updatedAt.getTime() + REQUEST_DELETE_AFTER_TERMINAL_MS)
  if (Date.now() < eligibleAt.getTime()) {
    return {
      ok: false,
      error: `Удаление заявки будет доступно не ранее ${eligibleAt.toLocaleDateString("ru-RU")}.`,
    }
  }
  return { ok: true }
}

export function issueDeleteDaysLeft(
  status: IssueStatus,
  referenceIso: string | null | undefined
): number | null {
  if (!ISSUE_TERMINAL_STATUSES.has(status)) return null
  return daysLeftUntil(eligibleAtFromIso(referenceIso))
}

export function softwareRequestDeleteDaysLeft(
  status: SoftwareRequestStatus,
  referenceIso: string | null | undefined
): number | null {
  if (!SOFTWARE_TERMINAL_STATUSES.has(status)) return null
  return daysLeftUntil(eligibleAtFromIso(referenceIso))
}
