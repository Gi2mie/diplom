/** Допустимые пресеты цвета для типов аудиторий (классы Tailwind) */
export const ALLOWED_CLASSROOM_TYPE_COLORS = [
  "bg-blue-100 text-blue-800",
  "bg-green-100 text-green-800",
  "bg-slate-100 text-slate-800",
  "bg-purple-100 text-purple-800",
  "bg-amber-100 text-amber-800",
  "bg-red-100 text-red-800",
  "bg-cyan-100 text-cyan-800",
  "bg-pink-100 text-pink-800",
] as const

export type AllowedClassroomTypeColor = (typeof ALLOWED_CLASSROOM_TYPE_COLORS)[number]

export function isAllowedClassroomTypeColor(c: string): c is AllowedClassroomTypeColor {
  return (ALLOWED_CLASSROOM_TYPE_COLORS as readonly string[]).includes(c)
}

export const CLASSROOM_TYPE_COLOR_OPTIONS: { value: AllowedClassroomTypeColor; label: string }[] = [
  { value: "bg-blue-100 text-blue-800", label: "Синий" },
  { value: "bg-green-100 text-green-800", label: "Зелёный" },
  { value: "bg-slate-100 text-slate-800", label: "Серый" },
  { value: "bg-purple-100 text-purple-800", label: "Фиолетовый" },
  { value: "bg-amber-100 text-amber-800", label: "Оранжевый" },
  { value: "bg-red-100 text-red-800", label: "Красный" },
  { value: "bg-cyan-100 text-cyan-800", label: "Голубой" },
  { value: "bg-pink-100 text-pink-800", label: "Розовый" },
]
