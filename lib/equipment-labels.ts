import { EquipmentStatus, EquipmentType } from "@prisma/client"

export function equipmentStatusLabel(s: EquipmentStatus): string {
  switch (s) {
    case EquipmentStatus.OPERATIONAL:
      return "Исправно"
    case EquipmentStatus.NEEDS_CHECK:
      return "Требует проверки"
    case EquipmentStatus.IN_REPAIR:
      return "В ремонте"
    case EquipmentStatus.DECOMMISSIONED:
      return "Списано"
    case EquipmentStatus.NOT_IN_USE:
      return "Не используется"
  }
}

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
