import { db } from "@/lib/db"
import type {
  CreateClassroomDTO,
  UpdateClassroomDTO,
  PaginationParams,
  PaginatedResponse,
  ClassroomWithRelations,
} from "@/lib/types"

export class ClassroomService {
  /**
   * Получить все кабинеты с пагинацией
   */
  static async getAll(
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<ClassroomWithRelations>> {
    const { page = 1, limit = 10, sortBy = "number", sortOrder = "asc" } = params

    const [data, total] = await Promise.all([
      db.classroom.findMany({
        where: { isActive: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          responsible: true,
          workstations: {
            where: { isActive: true },
            include: {
              equipment: {
                where: { isActive: true },
              },
            },
          },
        },
      }),
      db.classroom.count({ where: { isActive: true } }),
    ])

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Получить кабинет по ID с полной информацией
   */
  static async getById(id: string): Promise<ClassroomWithRelations | null> {
    return db.classroom.findUnique({
      where: { id },
      include: {
        responsible: true,
        workstations: {
          where: { isActive: true },
          orderBy: { number: "asc" },
          include: {
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
        },
      },
    })
  }

  /**
   * Получить кабинет по номеру
   */
  static async getByNumber(number: string) {
    return db.classroom.findUnique({
      where: { number },
    })
  }

  /**
   * Создать кабинет
   */
  static async create(data: CreateClassroomDTO) {
    return db.classroom.create({
      data,
      include: {
        responsible: true,
      },
    })
  }

  /**
   * Обновить кабинет
   */
  static async update(id: string, data: UpdateClassroomDTO) {
    return db.classroom.update({
      where: { id },
      data,
      include: {
        responsible: true,
      },
    })
  }

  /**
   * Удалить кабинет (мягкое удаление)
   */
  static async delete(id: string) {
    return db.classroom.update({
      where: { id },
      data: { isActive: false },
    })
  }

  /**
   * Получить статистику по кабинету
   */
  static async getStatistics(id: string) {
    const classroom = await db.classroom.findUnique({
      where: { id },
      include: {
        workstations: {
          where: { isActive: true },
          include: {
            equipment: {
              where: { isActive: true },
              select: {
                status: true,
              },
            },
          },
        },
      },
    })

    if (!classroom) return null

    const equipmentList = classroom.workstations.flatMap((ws) => ws.equipment)

    return {
      totalWorkstations: classroom.workstations.length,
      totalEquipment: equipmentList.length,
      statusBreakdown: {
        operational: equipmentList.filter((e) => e.status === "OPERATIONAL").length,
        needsCheck: equipmentList.filter((e) => e.status === "NEEDS_CHECK").length,
        inRepair: equipmentList.filter((e) => e.status === "IN_REPAIR").length,
        decommissioned: equipmentList.filter((e) => e.status === "DECOMMISSIONED").length,
        notInUse: equipmentList.filter((e) => e.status === "NOT_IN_USE").length,
      },
    }
  }
}
