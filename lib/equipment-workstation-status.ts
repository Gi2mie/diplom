import { EquipmentStatus } from "@prisma/client"

/**
 * Статус «Не используется», если оборудование не привязано к РМ.
 * Исключение: «Списано» сохраняется.
 */
export function resolveStatusAfterWorkstationChange(params: {
  nextWorkstationId: string | null
  existingStatus: EquipmentStatus
  explicitStatus: EquipmentStatus | undefined
}): EquipmentStatus | undefined {
  const { nextWorkstationId, existingStatus, explicitStatus } = params
  if (!nextWorkstationId) {
    if (
      existingStatus === EquipmentStatus.DECOMMISSIONED ||
      explicitStatus === EquipmentStatus.DECOMMISSIONED
    ) {
      return EquipmentStatus.DECOMMISSIONED
    }
    return EquipmentStatus.NOT_IN_USE
  }
  if (explicitStatus !== undefined) {
    return explicitStatus
  }
  if (existingStatus === EquipmentStatus.NOT_IN_USE) {
    return EquipmentStatus.OPERATIONAL
  }
  return undefined
}

export function initialEquipmentStatusForCreate(
  workstationId: string | null | undefined,
  explicitStatus: EquipmentStatus | undefined
): EquipmentStatus {
  if (!workstationId) {
    return explicitStatus === EquipmentStatus.DECOMMISSIONED
      ? EquipmentStatus.DECOMMISSIONED
      : EquipmentStatus.NOT_IN_USE
  }
  return explicitStatus ?? EquipmentStatus.OPERATIONAL
}
