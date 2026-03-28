import { db } from "@/lib/db"
import type {
  CreateWorkstationDTO,
  UpdateWorkstationDTO,
  WorkstationWithRelations,
} from "@/lib/types"

export class WorkstationService {
  /**
   * Получить рабочее место по ID
   */
  static async getById(id: string): Promise<WorkstationWithRelations | null> {
    return db.workstation.findUnique({
      where: { id },
      include: {
        classroom: true,
        equipment: {
          where: { isActive: true },
          include: {
            components: true,
            software: {
              include: { software: true },
            },
          },
        },
      },
    })
  }

  /**
   * Получить все рабочие места кабинета
   */
  static async getByClassroom(classroomId: string): Promise<WorkstationWithRelations[]> {
    return db.workstation.findMany({
      where: {
        classroomId,
        isActive: true,
      },
      orderBy: { code: "asc" },
      include: {
        classroom: true,
        equipment: {
          where: { isActive: true },
          include: {
            components: true,
            software: {
              include: { software: true },
            },
          },
        },
      },
    })
  }

  /**
   * Создать рабочее место
   */
  static async create(data: CreateWorkstationDTO) {
    return db.workstation.create({
      data,
      include: {
        classroom: true,
      },
    })
  }

  /**
   * Создать несколько рабочих мест для кабинета
   */
  static async createMany(classroomId: string, count: number, classroomNumber: string, startIndex: number = 1) {
    const classroom = await db.classroom.findUnique({
      where: { id: classroomId },
      select: { number: true },
    })
    const num = classroom?.number ?? classroomNumber
    const rows = Array.from({ length: count }, (_, i) => {
      const suffix = String(startIndex + i).padStart(2, "0")
      return {
        classroomId,
        code: `RM-${num}-${suffix}`,
      }
    })

    await db.workstation.createMany({
      data: rows,
    })

    return db.workstation.findMany({
      where: { classroomId },
      orderBy: { code: "asc" },
    })
  }

  /**
   * Обновить рабочее место
   */
  static async update(id: string, data: UpdateWorkstationDTO) {
    return db.workstation.update({
      where: { id },
      data,
      include: {
        classroom: true,
      },
    })
  }

  /**
   * Удалить рабочее место (мягкое удаление)
   */
  static async delete(id: string) {
    return db.workstation.update({
      where: { id },
      data: { isActive: false },
    })
  }
}
