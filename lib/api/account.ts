export async function changeOwnPassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const response = await fetch("/api/account/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
  })
  const data = (await response.json()) as { error?: string }
  if (!response.ok) {
    throw new Error(data?.error || "Не удалось сменить пароль")
  }
}
