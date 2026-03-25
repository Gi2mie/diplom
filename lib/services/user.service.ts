import { db } from "@/lib/db"
import type {
  CreateUserDTO,
  UpdateUserDTO,
  PaginationParams,
  PaginatedResponse,
  UserWithRelations,
} from "@/lib/types"
import { UserRole } from "@prisma/client"

export class UserService {
  /**
   * Получить всех пользователей с пагинацией
   */
  static async getAll(
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<UserWithRelations>> {
    const { page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc" } = params

    const [data, total] = await Promise.all([
      db.user.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          responsibleRooms: true,
        },
      }),
      db.user.count(),
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
   * Получить пользователя по ID
   */
  static async getById(id: string): Promise<UserWithRelations | null> {
    return db.user.findUnique({
      where: { id },
      include: {
        responsibleRooms: true,
        issueReports: {
          take: 10,
          orderBy: { createdAt: "desc" },
        },
        notifications: {
          where: { isRead: false },
          take: 10,
          orderBy: { createdAt: "desc" },
        },
      },
    })
  }

  /**
   * Получить пользователя по email
   */
  static async getByEmail(email: string) {
    return db.user.findUnique({
      where: { email },
    })
  }

  /**
   * Создать пользователя
   */
  static async create(data: CreateUserDTO) {
    const { password, ...userData } = data

    // В реальном приложении здесь должно быть хеширование пароля
    // Например: const passwordHash = await bcrypt.hash(password, 12)

    return db.user.create({
      data: {
        ...userData,
        passwordHash: password, // TODO: Заменить на хеширование
      },
    })
  }

  /**
   * Обновить пользователя
   */
  static async update(id: string, data: UpdateUserDTO) {
    const { password, ...updateData } = data

    return db.user.update({
      where: { id },
      data: {
        ...updateData,
        ...(password && { passwordHash: password }), // TODO: Хеширование
      },
    })
  }

  /**
   * Удалить пользователя (мягкое удаление)
   */
  static async delete(id: string) {
    return db.user.update({
      where: { id },
      data: { isActive: false },
    })
  }

  /**
   * Получить пользователей по роли
   */
  static async getByRole(role: UserRole) {
    return db.user.findMany({
      where: { role, isActive: true },
      orderBy: { lastName: "asc" },
    })
  }
}
