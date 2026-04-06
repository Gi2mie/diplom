import { EquipmentStatus } from "@prisma/client"

/** Срок в мс: удаление из учёта только после этого интервала с даты списания. */
export const EQUIPMENT_DELETE_AFTER_DECOMMISSION_MS = 30 * 24 * 60 * 60 * 1000

export function equipmentPermanentDeleteAllowed(
  status: EquipmentStatus,
  decommissionedAtIso: string | null | undefined
): boolean {
  if (status !== EquipmentStatus.DECOMMISSIONED || !decommissionedAtIso) return false
  const t = new Date(decommissionedAtIso).getTime()
  if (Number.isNaN(t)) return false
  return Date.now() >= t + EQUIPMENT_DELETE_AFTER_DECOMMISSION_MS
}

export function equipmentPermanentDeleteEligibleAt(
  decommissionedAt: Date | null
): Date | null {
  if (!decommissionedAt) return null
  return new Date(decommissionedAt.getTime() + EQUIPMENT_DELETE_AFTER_DECOMMISSION_MS)
}

export function assertEquipmentPermanentDeleteAllowed(e: {
  status: EquipmentStatus
  decommissionedAt: Date | null
}): { ok: true } | { ok: false; error: string } {
  if (e.status !== EquipmentStatus.DECOMMISSIONED) {
    return {
      ok: false,
      error: "Удалять можно только списанное оборудование.",
    }
  }
  if (!e.decommissionedAt) {
    return {
      ok: false,
      error: "Дата списания не зафиксирована. Сохраните карточку повторно или выполните миграцию данных.",
    }
  }
  const eligibleAt = equipmentPermanentDeleteEligibleAt(e.decommissionedAt)
  if (!eligibleAt || Date.now() < eligibleAt.getTime()) {
    const d = eligibleAt?.toLocaleDateString("ru-RU") ?? "—"
    return {
      ok: false,
      error: `Удаление из учёта будет доступно не ранее ${d}.`,
    }
  }
  return { ok: true }
}
