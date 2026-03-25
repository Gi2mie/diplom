import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { Prisma } from "@prisma/client"

// ==========================================
// ТИПЫ ОТВЕТОВ
// ==========================================

export type ApiSuccessResponse<T> = {
  success: true
  data: T
}

export type ApiErrorResponse = {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

// ==========================================
// УСПЕШНЫЕ ОТВЕТЫ
// ==========================================

export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(
    { success: true, data } as ApiSuccessResponse<T>,
    { status }
  )
}

export function createdResponse<T>(data: T) {
  return successResponse(data, 201)
}

export function noContentResponse() {
  return new NextResponse(null, { status: 204 })
}

// ==========================================
// ОТВЕТЫ С ОШИБКАМИ
// ==========================================

export function errorResponse(
  code: string,
  message: string,
  status: number = 400,
  details?: unknown
) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, details },
    } as ApiErrorResponse,
    { status }
  )
}

export function badRequestResponse(message: string, details?: unknown) {
  return errorResponse("BAD_REQUEST", message, 400, details)
}

export function unauthorizedResponse(message: string = "Требуется авторизация") {
  return errorResponse("UNAUTHORIZED", message, 401)
}

export function forbiddenResponse(message: string = "Доступ запрещён") {
  return errorResponse("FORBIDDEN", message, 403)
}

export function notFoundResponse(entity: string = "Ресурс") {
  return errorResponse("NOT_FOUND", `${entity} не найден`, 404)
}

export function conflictResponse(message: string) {
  return errorResponse("CONFLICT", message, 409)
}

export function validationErrorResponse(errors: unknown) {
  return errorResponse("VALIDATION_ERROR", "Ошибка валидации", 400, errors)
}

export function internalErrorResponse(message: string = "Внутренняя ошибка сервера") {
  return errorResponse("INTERNAL_ERROR", message, 500)
}

// ==========================================
// ОБРАБОТКА ОШИБОК
// ==========================================

export function handleApiError(error: unknown) {
  console.error("API Error:", error)

  // Ошибки валидации Zod
  if (error instanceof ZodError) {
    return validationErrorResponse(
      error.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      }))
    )
  }

  // Ошибки Prisma
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        // Уникальное ограничение
        const target = (error.meta?.target as string[])?.join(", ") || "поле"
        return conflictResponse(`Значение ${target} уже существует`)

      case "P2003":
        // Ошибка внешнего ключа
        return badRequestResponse("Связанная запись не найдена")

      case "P2025":
        // Запись не найдена
        return notFoundResponse("Запись")

      default:
        return internalErrorResponse("Ошибка базы данных")
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return badRequestResponse("Некорректные данные для запроса")
  }

  // Стандартные ошибки
  if (error instanceof Error) {
    // Не раскрываем детали в production
    const message =
      process.env.NODE_ENV === "development"
        ? error.message
        : "Внутренняя ошибка сервера"
    return internalErrorResponse(message)
  }

  return internalErrorResponse()
}

// ==========================================
// УТИЛИТЫ
// ==========================================

/**
 * Обёртка для API route handlers с обработкой ошибок
 */
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      return handleApiError(error)
    }
  }
}

/**
 * Парсинг JSON body с обработкой ошибок
 */
export async function parseJsonBody<T>(request: Request): Promise<T> {
  try {
    return await request.json()
  } catch {
    throw new Error("Некорректный JSON в теле запроса")
  }
}

/**
 * Парсинг search params в объект
 */
export function parseSearchParams(searchParams: URLSearchParams): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {}

  searchParams.forEach((value, key) => {
    if (params[key]) {
      // Если ключ уже есть, делаем массив
      if (Array.isArray(params[key])) {
        (params[key] as string[]).push(value)
      } else {
        params[key] = [params[key] as string, value]
      }
    } else {
      params[key] = value
    }
  })

  return params
}
