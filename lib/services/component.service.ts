import { db } from "@/lib/db"
import type { CreateComponentDTO, UpdateComponentDTO } from "@/lib/types"

export class ComponentService {
  /**
   * Получить компонент по ID
   */
  static async getById(id: string) {
    return db.component.findUnique({
      where: { id },
      include: { equipment: true },
    })
  }

  /**
   * Получить все компоненты оборудования
   */
  static async getByEquipment(equipmentId: string) {
    return db.component.findMany({
      where: { equipmentId },
      orderBy: { type: "asc" },
    })
  }

  /**
   * Создать компонент
   */
  static async create(data: CreateComponentDTO) {
    return db.component.create({
      data,
      include: { equipment: true },
    })
  }

  /**
   * Создать несколько компонентов
   */
  static async createMany(components: CreateComponentDTO[]) {
    return db.component.createMany({
      data: components,
    })
  }

  /**
   * Обновить компонент
   */
  static async update(id: string, data: UpdateComponentDTO) {
    return db.component.update({
      where: { id },
      data,
    })
  }

  /**
   * Удалить компонент
   */
  static async delete(id: string) {
    return db.component.delete({
      where: { id },
    })
  }

  /**
   * Удалить все компоненты оборудования
   */
  static async deleteByEquipment(equipmentId: string) {
    return db.component.deleteMany({
      where: { equipmentId },
    })
  }
}
