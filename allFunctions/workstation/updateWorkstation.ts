"use server"

import { WorkstationStatus } from "@prisma/client"
import { prisma } from "@/lib/db"
import { updateWorkstationSchema, type UpdateWorkstationInput } from "@/lib/validators"
import type { Workstation } from "@/lib/types"
import { workstationCodeMatchesClassroom } from "@/lib/workstation-code"

export type UpdateWorkstationResult = {
  success: boolean
  data?: Workstation
  error?: string
}

function parseLastMaintenance(v: string | null | undefined): Date | null | undefined {
  if (v === undefined) return undefined
  if (v === null || v === "") return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

export async function updateWorkstation(id: string, input: UpdateWorkstationInput): Promise<UpdateWorkstationResult> {
  try {
    const existing = await prisma.workstation.findUnique({ where: { id } })

    if (!existing) {
      return { success: false, error: "Рабочее место не найдено" }
    }

    const validationResult = updateWorkstationSchema.safeParse(input)
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors.map((e) => e.message).join(", "),
      }
    }

    const data = validationResult.data
    const targetClassroomId = data.classroomId ?? existing.classroomId

    const classroom = await prisma.classroom.findUnique({
      where: { id: targetClassroomId },
      select: { number: true, capacity: true },
    })
    if (!classroom) {
      return { success: false, error: "Кабинет не найден" }
    }

    const nextCode = data.code ?? existing.code
    if (!workstationCodeMatchesClassroom(nextCode, classroom.number)) {
      return { success: false, error: `Номер должен начинаться с RM-${classroom.number}-` }
    }

    const mergedHasOther = data.hasOtherEquipment ?? existing.hasOtherEquipment
    const mergedNote =
      data.otherEquipmentNote !== undefined ? data.otherEquipmentNote : existing.otherEquipmentNote
    if (mergedHasOther && !String(mergedNote ?? "").trim()) {
      return { success: false, error: "Укажите примечание для комплектации «Другое»" }
    }

    if (targetClassroomId !== existing.classroomId && classroom.capacity != null) {
      const cnt = await prisma.workstation.count({
        where: { classroomId: targetClassroomId, id: { not: existing.id } },
      })
      if (cnt >= classroom.capacity) {
        return {
          success: false,
          error: `В аудитории ${classroom.number} нет свободных мест по вместимости (${classroom.capacity}).`,
        }
      }
    }

    if (nextCode !== existing.code || targetClassroomId !== existing.classroomId) {
      const dup = await prisma.workstation.findUnique({
        where: { classroomId_code: { classroomId: targetClassroomId, code: nextCode } },
      })
      if (dup && dup.id !== existing.id) {
        return { success: false, error: "Рабочее место с таким номером уже есть в этой аудитории" }
      }
    }

    const lastMaintenance =
      data.lastMaintenance !== undefined ? parseLastMaintenance(data.lastMaintenance) : undefined

    const workstation = await prisma.workstation.update({
      where: { id },
      data: {
        ...(data.code !== undefined ? { code: data.code } : {}),
        ...(data.classroomId !== undefined ? { classroomId: data.classroomId } : {}),
        ...(data.name !== undefined ? { name: data.name?.trim() || null } : {}),
        ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
        ...(data.pcName !== undefined ? { pcName: data.pcName?.trim() || null } : {}),
        ...(data.status !== undefined ? { status: data.status as WorkstationStatus } : {}),
        ...(data.hasMonitor !== undefined ? { hasMonitor: data.hasMonitor } : {}),
        ...(data.hasKeyboard !== undefined ? { hasKeyboard: data.hasKeyboard } : {}),
        ...(data.hasMouse !== undefined ? { hasMouse: data.hasMouse } : {}),
        ...(data.hasHeadphones !== undefined ? { hasHeadphones: data.hasHeadphones } : {}),
        ...(data.hasOtherEquipment !== undefined ? { hasOtherEquipment: data.hasOtherEquipment } : {}),
        ...(data.otherEquipmentNote !== undefined || data.hasOtherEquipment !== undefined
          ? {
              otherEquipmentNote: mergedHasOther
                ? String(data.otherEquipmentNote ?? existing.otherEquipmentNote ?? "").trim() || null
                : null,
            }
          : {}),
        ...(lastMaintenance !== undefined ? { lastMaintenance } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    })

    return { success: true, data: workstation }
  } catch (error) {
    console.error("updateWorkstation error:", error)
    return { success: false, error: "Ошибка при обновлении рабочего места" }
  }
}
