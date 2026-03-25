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
      orderBy: { number: "asc" },
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
  static async createMany(classroomId: string, count: number, startNumber: number = 1) {
    const workstations = Array.from({ length: count }, (_, i) => ({
      classroomId,
      number: startNumber + i,
    }))

    await db.workstation.createMany({
      data: workstations,
    })

    return db.workstation.findMany({
      where: { classroomId },
      orderBy: { number: "asc" },
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
