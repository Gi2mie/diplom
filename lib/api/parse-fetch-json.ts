/**
 * Читает тело ответа и парсит JSON. Избегает «Unexpected end of JSON input» при пустом теле
 * и даёт понятное сообщение при HTML/прокси вместо JSON.
 */
export async function parseFetchJson<T>(response: Response): Promise<T> {
  const text = await response.text()
  const trimmed = text.trim()
  if (!trimmed) {
    if (!response.ok) {
      throw new Error(
        `Сервер вернул пустой ответ (код ${response.status}). Проверьте консоль сервера и миграции БД.`
      )
    }
    throw new Error("Сервер вернул пустой ответ")
  }
  let data: unknown
  try {
    data = JSON.parse(trimmed) as unknown
  } catch {
    throw new Error("Ответ сервера не JSON (ошибка маршрута, прокси или страница вместо API)")
  }
  if (!response.ok) {
    const err = data as { error?: string }
    throw new Error(err?.error || `Ошибка запроса (${response.status})`)
  }
  return data as T
}
