"use server"

import { WorkstationStatus } from "@prisma/client"
import { prisma } from "@/lib/db"
import { createWorkstationSchema, type CreateWorkstationInput } from "@/lib/validators"
import type { Workstation } from "@/lib/types"
import {
  workstationCodeClassroomErrorHint,
  workstationCodeMatchesClassroom,
} from "@/lib/workstation-code"
import { prismaWorkstationsCountingTowardCapacity } from "@/lib/classroom-pool-workstation"
import { syncWorkstationStatusFromEquipment } from "@/lib/workstation-status-sync"

export type AddWorkstationResult = {
  success: boolean
  data?: Workstation
  error?: string
}

function parseLastMaintenance(v: string | null | undefined): Date | null {
  if (v == null || v === "") return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

export async function addWorkstation(input: CreateWorkstationInput): Promise<AddWorkstationResult> {
  try {
    const validationResult = createWorkstationSchema.safeParse(input)
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors.map((e) => e.message).join(", "),
      }
    }

    const data = validationResult.data

    const classroom = await prisma.classroom.findUnique({
      where: { id: data.classroomId },
      select: { id: true, number: true, capacity: true },
    })

    if (!classroom) {
      return { success: false, error: "Кабинет не найден" }
    }

    if (!workstationCodeMatchesClassroom(data.code, classroom.number)) {
      return { success: false, error: workstationCodeClassroomErrorHint(classroom.number) }
    }

    if (classroom.capacity != null) {
      const cnt = await prisma.workstation.count({
        where: prismaWorkstationsCountingTowardCapacity(data.classroomId, classroom.number),
      })
      if (cnt >= classroom.capacity) {
        return {
          success: false,
          error: `В аудитории ${classroom.number} уже создано максимальное число рабочих мест (${classroom.capacity}). Добавить ещё одно нельзя.`,
        }
      }
    }

    const existing = await prisma.workstation.findUnique({
      where: { classroomId_code: { classroomId: data.classroomId, code: data.code } },
    })

    if (existing) {
      return { success: false, error: "Рабочее место с таким номером уже есть в этой аудитории" }
    }

    const workstation = await prisma.$transaction(async (tx) => {
      const w = await tx.workstation.create({
        data: {
          code: data.code,
          classroomId: data.classroomId,
          name: data.name?.trim() || null,
          description: data.description?.trim() || null,
          pcName: data.pcName?.trim() || null,
          status: WorkstationStatus.ACTIVE,
          hasMonitor: data.hasMonitor ?? false,
          hasKeyboard: data.hasKeyboard ?? false,
          hasMouse: data.hasMouse ?? false,
          hasHeadphones: data.hasHeadphones ?? false,
          hasOtherEquipment: data.hasOtherEquipment ?? false,
          otherEquipmentNote: data.hasOtherEquipment
            ? String(data.otherEquipmentNote ?? "").trim() || null
            : null,
          lastMaintenance: parseLastMaintenance(data.lastMaintenance ?? undefined),
        },
      })
      await syncWorkstationStatusFromEquipment(tx, w.id)
      return w
    })

    return { success: true, data: workstation }
  } catch (error) {
    console.error("addWorkstation error:", error)
    return { success: false, error: "Ошибка при добавлении рабочего места" }
  }
}
