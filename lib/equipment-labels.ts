import { EquipmentStatus, EquipmentType } from "@prisma/client"

/** Соответствует enum EquipmentStatus в schema.prisma */
const EQUIPMENT_STATUS_LABELS: Record<string, string> = {
  OPERATIONAL: "Исправно",
  NEEDS_CHECK: "В работе",
  IN_REPAIR: "В очереди",
  DECOMMISSIONED: "Списано",
  NOT_IN_USE: "Не используется",
}

export function equipmentStatusLabel(s: EquipmentStatus): string {
  const label = EQUIPMENT_STATUS_LABELS[s as string]
  return label !== undefined ? label : String(s)
}

const EQUIPMENT_STATUS_BADGE_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  OPERATIONAL: "default",
  NEEDS_CHECK: "destructive",
  IN_REPAIR: "secondary",
  DECOMMISSIONED: "outline",
  NOT_IN_USE: "outline",
}

export function equipmentStatusBadgeVariant(
  s: EquipmentStatus
): "default" | "secondary" | "destructive" | "outline" {
  return EQUIPMENT_STATUS_BADGE_VARIANTS[s as string] ?? "outline"
}

const EQUIPMENT_STATUS_FILTER_ORDER = [
  "OPERATIONAL",
  "NEEDS_CHECK",
  "IN_REPAIR",
  "DECOMMISSIONED",
  "NOT_IN_USE",
] as const

export const EQUIPMENT_STATUS_FILTER_OPTIONS: {
  value: EquipmentStatus | "all"
  label: string
}[] = [
  { value: "all", label: "Все статусы" },
  ...EQUIPMENT_STATUS_FILTER_ORDER.map((value) => ({
    value: value as EquipmentStatus,
    label: equipmentStatusLabel(value as EquipmentStatus),
  })),
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
    default: {
      const _u: never = t
      return String(_u)
    }
  }
}

export const EQUIPMENT_TYPE_ENUM_OPTIONS = Object.values(EquipmentType).map((v) => ({
  value: v,
  label: equipmentTypeEnumLabel(v),
}))
