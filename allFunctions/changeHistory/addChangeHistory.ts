"use server"

import { prisma } from "@/lib/db"
import type { ChangeHistory, EntityType, ActionType } from "@/lib/types"

export type AddChangeHistoryInput = {
  entityType: EntityType
  entityId: string
  equipmentId?: string
  userId: string
  action: ActionType
  fieldName?: string
  oldValue?: string
  newValue?: string
  metadata?: Record<string, unknown>
}

export type AddChangeHistoryResult = {
  success: boolean
  data?: ChangeHistory
  error?: string
}

export async function addChangeHistory(
  input: AddChangeHistoryInput
): Promise<AddChangeHistoryResult> {
  try {
    // Создание записи истории
    const changeHistory = await prisma.changeHistory.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        equipmentId: input.equipmentId,
        userId: input.userId,
        action: input.action,
        fieldName: input.fieldName,
        oldValue: input.oldValue,
        newValue: input.newValue,
        metadata: input.metadata,
      },
    })

    return {
      success: true,
      data: changeHistory,
    }
  } catch (error) {
    console.error("addChangeHistory error:", error)
    return {
      success: false,
      error: "Ошибка при записи истории изменений",
    }
  }
}
