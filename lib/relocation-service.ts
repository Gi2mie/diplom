import { RelocationKind, type Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { resolveStatusAfterWorkstationChange } from "@/lib/equipment-workstation-status"
import { syncWorkstationStatusFromEquipment } from "@/lib/workstation-status-sync"
import { syncWorkstationKitFromEquipment } from "@/lib/workstation-kit-sync"

function assertDifferentClassrooms(fromId: string, toId: string) {
  if (fromId === toId) {
    throw new Error("Целевая аудитория должна отличаться от исходной")
  }
}

async function assertWorkstationEmpty(tx: Prisma.TransactionClient, workstationId: string) {
  const n = await tx.equipment.count({ where: { workstationId } })
  if (n > 0) {
    throw new Error("Целевое рабочее место должно быть свободным (без оборудования)")
  }
}

async function syncBothWorkstations(tx: Prisma.TransactionClient, a: string, b: string) {
  await syncWorkstationStatusFromEquipment(tx, a)
  await syncWorkstationKitFromEquipment(tx, a)
  await syncWorkstationStatusFromEquipment(tx, b)
  await syncWorkstationKitFromEquipment(tx, b)
}

export async function relocateOneEquipment(params: {
  userId: string
  equipmentId: string
  toWorkstationId: string
}) {
  return db.$transaction(async (tx) => {
    const eq = await tx.equipment.findUnique({
      where: { id: params.equipmentId },
      include: { workstation: { include: { classroom: true } } },
    })
    if (!eq?.workstationId) {
      throw new Error("Оборудование не привязано к рабочему месту")
    }

    const fromWs = await tx.workstation.findUnique({
      where: { id: eq.workstationId },
      include: { classroom: true },
    })
    const toWs = await tx.workstation.findUnique({
      where: { id: params.toWorkstationId },
      include: { classroom: true },
    })
    if (!fromWs || !toWs) throw new Error("Рабочее место не найдено")

    assertDifferentClassrooms(fromWs.classroomId, toWs.classroomId)
    await assertWorkstationEmpty(tx, toWs.id)

    const statusUpd = resolveStatusAfterWorkstationChange({
      nextWorkstationId: toWs.id,
      existingStatus: eq.status,
      explicitStatus: undefined,
    })

    await tx.equipment.update({
      where: { id: eq.id },
      data: {
        workstationId: toWs.id,
        ...(statusUpd !== undefined ? { status: statusUpd } : {}),
      },
    })

    const log = await tx.relocationLog.create({
      data: {
        kind: RelocationKind.EQUIPMENT,
        equipmentId: eq.id,
        fromWorkstationId: fromWs.id,
        toWorkstationId: toWs.id,
        fromClassroomId: fromWs.classroomId,
        toClassroomId: toWs.classroomId,
        fromClassroomNumber: fromWs.classroom.number,
        toClassroomNumber: toWs.classroom.number,
        fromWorkstationCode: fromWs.code,
        toWorkstationCode: toWs.code,
        createdById: params.userId,
      },
    })

    await syncBothWorkstations(tx, fromWs.id, toWs.id)
    return log
  })
}

export async function relocateWholeWorkstation(params: {
  userId: string
  fromWorkstationId: string
  toWorkstationId: string
}) {
  return db.$transaction(async (tx) => {
    const fromWs = await tx.workstation.findUnique({
      where: { id: params.fromWorkstationId },
      include: { classroom: true },
    })
    const toWs = await tx.workstation.findUnique({
      where: { id: params.toWorkstationId },
      include: { classroom: true },
    })
    if (!fromWs || !toWs) throw new Error("Рабочее место не найдено")

    assertDifferentClassrooms(fromWs.classroomId, toWs.classroomId)
    await assertWorkstationEmpty(tx, toWs.id)

    const equipmentRows = await tx.equipment.findMany({
      where: { workstationId: fromWs.id },
      select: { id: true, status: true },
    })
    if (equipmentRows.length === 0) {
      throw new Error("На исходном рабочем месте нет оборудования")
    }

    const ids = equipmentRows.map((e) => e.id)

    for (const row of equipmentRows) {
      const statusUpd = resolveStatusAfterWorkstationChange({
        nextWorkstationId: toWs.id,
        existingStatus: row.status,
        explicitStatus: undefined,
      })
      await tx.equipment.update({
        where: { id: row.id },
        data: {
          workstationId: toWs.id,
          ...(statusUpd !== undefined ? { status: statusUpd } : {}),
        },
      })
    }

    const log = await tx.relocationLog.create({
      data: {
        kind: RelocationKind.WORKSTATION,
        equipmentId: null,
        movedEquipmentIds: ids,
        fromWorkstationId: fromWs.id,
        toWorkstationId: toWs.id,
        fromClassroomId: fromWs.classroomId,
        toClassroomId: toWs.classroomId,
        fromClassroomNumber: fromWs.classroom.number,
        toClassroomNumber: toWs.classroom.number,
        fromWorkstationCode: fromWs.code,
        toWorkstationCode: toWs.code,
        createdById: params.userId,
      },
    })

    await syncBothWorkstations(tx, fromWs.id, toWs.id)
    return log
  })
}

export async function revertRelocation(logId: string) {
  return db.$transaction(async (tx) => {
    const log = await tx.relocationLog.findUnique({ where: { id: logId } })
    if (!log) throw new Error("Запись не найдена")
    if (log.revertedAt) throw new Error("Перемещение уже возвращено")

    if (log.kind === RelocationKind.EQUIPMENT) {
      if (!log.equipmentId) throw new Error("Некорректная запись журнала")
      const eq = await tx.equipment.findUnique({ where: { id: log.equipmentId } })
      if (!eq || eq.workstationId !== log.toWorkstationId) {
        throw new Error(
          "Состояние оборудования изменилось после перемещения; откат невозможен"
        )
      }
      const statusUpd = resolveStatusAfterWorkstationChange({
        nextWorkstationId: log.fromWorkstationId,
        existingStatus: eq.status,
        explicitStatus: undefined,
      })
      await tx.equipment.update({
        where: { id: eq.id },
        data: {
          workstationId: log.fromWorkstationId,
          ...(statusUpd !== undefined ? { status: statusUpd } : {}),
        },
      })
    } else {
      const raw = log.movedEquipmentIds
      const ids = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : []
      if (ids.length === 0) throw new Error("Некорректная запись журнала")

      for (const eid of ids) {
        const eq = await tx.equipment.findUnique({ where: { id: eid } })
        if (!eq || eq.workstationId !== log.toWorkstationId) {
          throw new Error(
            "Состояние оборудования изменилось после перемещения; откат невозможен"
          )
        }
        const statusUpd = resolveStatusAfterWorkstationChange({
          nextWorkstationId: log.fromWorkstationId,
          existingStatus: eq.status,
          explicitStatus: undefined,
        })
        await tx.equipment.update({
          where: { id: eid },
          data: {
            workstationId: log.fromWorkstationId,
            ...(statusUpd !== undefined ? { status: statusUpd } : {}),
          },
        })
      }
    }

    await tx.relocationLog.update({
      where: { id: logId },
      data: { revertedAt: new Date() },
    })

    await syncBothWorkstations(tx, log.fromWorkstationId, log.toWorkstationId)
  })
}

export type ActiveRelocationAugmentation = {
  /** equipmentId -> «401->101» */
  labels: Map<string, string>
  /** Оборудование на целевом РМ: номер исходной аудитории (для подписи «из …»). */
  equipmentSourceClassroom: Map<string, string>
  /**
   * Исходный РМ: единицы, физически уже на другом месте, но с активным переносом
   * (для отображения в комплектации с подписью «в …»).
   */
  awayByWorkstation: Map<string, Array<{ equipmentId: string; toClassroomNumber: string }>>
}

/** Одна выборка активных переносов: метки, «откуда» для целевого РМ, «куда» для исходного. */
export async function getActiveRelocationAugmentation(): Promise<ActiveRelocationAugmentation> {
  const logs = await db.relocationLog.findMany({
    where: { revertedAt: null },
    select: {
      kind: true,
      equipmentId: true,
      movedEquipmentIds: true,
      fromWorkstationId: true,
      toWorkstationId: true,
      fromClassroomNumber: true,
      toClassroomNumber: true,
    },
  })
  const labels = new Map<string, string>()
  const equipmentSourceClassroom = new Map<string, string>()
  const awayByWorkstation = new Map<
    string,
    Array<{ equipmentId: string; toClassroomNumber: string }>
  >()
  const arrow = (from: string, to: string) => `${from}->${to}`

  for (const log of logs) {
    const label = arrow(log.fromClassroomNumber, log.toClassroomNumber)
    const addEquipment = (eqId: string) => {
      labels.set(eqId, label)
      equipmentSourceClassroom.set(eqId, log.fromClassroomNumber)
      const arr = awayByWorkstation.get(log.fromWorkstationId) ?? []
      arr.push({ equipmentId: eqId, toClassroomNumber: log.toClassroomNumber })
      awayByWorkstation.set(log.fromWorkstationId, arr)
    }
    if (log.kind === RelocationKind.EQUIPMENT && log.equipmentId) {
      addEquipment(log.equipmentId)
    } else if (log.kind === RelocationKind.WORKSTATION) {
      const raw = log.movedEquipmentIds
      const ids = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : []
      for (const id of ids) addEquipment(id)
    }
  }

  return { labels, equipmentSourceClassroom, awayByWorkstation }
}

/** Активные перемещения (не откатанные): equipmentId -> «401→101» */
export async function buildActiveRelocationLabels(): Promise<Map<string, string>> {
  const { labels } = await getActiveRelocationAugmentation()
  return labels
}
