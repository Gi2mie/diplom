import { EquipmentStatus, EquipmentType } from "@prisma/client"

export function equipmentStatusLabel(s: EquipmentStatus): string {
  switch (s) {
    case EquipmentStatus.OPERATIONAL:
      return "Исправно"
    case EquipmentStatus.NEEDS_CHECK:
      return "В работе"
    case EquipmentStatus.IN_REPAIR:
      return "В очереди"
    case EquipmentStatus.DECOMMISSIONED:
      return "Списано"
    case EquipmentStatus.NOT_IN_USE:
      return "Не используется"
  }
}

export function equipmentStatusBadgeVariant(
  s: EquipmentStatus
): "default" | "secondary" | "destructive" | "outline" {
  switch (s) {
    case EquipmentStatus.OPERATIONAL:
      return "default"
    case EquipmentStatus.IN_REPAIR:
      return "secondary"
    case EquipmentStatus.NEEDS_CHECK:
      return "destructive"
    case EquipmentStatus.DECOMMISSIONED:
      return "outline"
    case EquipmentStatus.NOT_IN_USE:
      return "outline"
  }
}

export const EQUIPMENT_STATUS_FILTER_OPTIONS: {
  value: EquipmentStatus | "all"
  label: string
}[] = [
  { value: "all", label: "Все статусы" },
  { value: EquipmentStatus.OPERATIONAL, label: equipmentStatusLabel(EquipmentStatus.OPERATIONAL) },
  { value: EquipmentStatus.NEEDS_CHECK, label: equipmentStatusLabel(EquipmentStatus.NEEDS_CHECK) },
  { value: EquipmentStatus.IN_REPAIR, label: equipmentStatusLabel(EquipmentStatus.IN_REPAIR) },
  { value: EquipmentStatus.DECOMMISSIONED, label: equipmentStatusLabel(EquipmentStatus.DECOMMISSIONED) },
  { value: EquipmentStatus.NOT_IN_USE, label: equipmentStatusLabel(EquipmentStatus.NOT_IN_USE) },
]

export function equipmentTypeEnumLabel(t: EquipmentType): string {
  switch (t) {
    case EquipmentType.COMPUTER:
      return "Компьютер"
    case EquipmentType.MONITOR:
      return "Монитор"
    case EquipmentType.PRINTER:
      return "Принтер"
    case EquipmentType.PROJECTOR:
      return "Проектор"
    case EquipmentType.INTERACTIVE_BOARD:
      return "Интерактивная доска"
    case EquipmentType.SCANNER:
      return "Сканер"
    case EquipmentType.NETWORK_DEVICE:
      return "Сетевое оборудование"
    case EquipmentType.PERIPHERAL:
      return "Периферия"
    case EquipmentType.OTHER:
      return "Прочее"
  }
}

export const EQUIPMENT_TYPE_ENUM_OPTIONS = Object.values(EquipmentType).map((v) => ({
  value: v,
  label: equipmentTypeEnumLabel(v),
}))
