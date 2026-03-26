import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { 
  User, 
  Mail, 
  Shield, 
  Calendar, 
  Clock,
  ArrowLeft,
  Settings,
  Key,
} from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      middleName: true,
      role: true,
      position: true,
      department: true,
      createdAt: true,
      lastLoginAt: true,
    },
  })

  if (!user) {
    redirect("/login")
  }

  const isAdmin = user.role === "ADMIN"
  const fullName = `${user.lastName} ${user.firstName} ${user.middleName ?? ""}`.trim()
  const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase()

  // Форматирование даты
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
  }

  const formatDateTime = (date: Date) => {
    return date.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Назад
              </Button>
            </Link>
            <h1 className="text-xl font-semibold">Профиль пользователя</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Profile Header Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                {/* Avatar */}
                <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                  <AvatarFallback className="bg-primary text-2xl font-semibold text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                
                {/* Basic Info */}
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-start">
                    <h2 className="text-2xl font-bold">{fullName}</h2>
                    <Badge variant={isAdmin ? "default" : "secondary"} className="mt-1 sm:mt-0">
                      {isAdmin ? (
                        <>
                          <Shield className="mr-1 h-3 w-3" />
                          Администратор
                        </>
                      ) : (
                        <>
                          <User className="mr-1 h-3 w-3" />
                          Преподаватель
                        </>
                      )}
                    </Badge>
                  </div>
                  {user.position && <p className="mt-1 text-muted-foreground">{user.position}</p>}
                  {user.department && <p className="text-sm text-muted-foreground">{user.department}</p>}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled>
                    <Settings className="mr-2 h-4 w-4" />
                    Редактировать
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Контактная информация</CardTitle>
                <CardDescription>Ваши контактные данные в системе</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>



            {/* Account Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Активность аккаунта</CardTitle>
                <CardDescription>История вашей учетной записи</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Дата регистрации</p>
                    <p className="font-medium">{formatDate(user.createdAt)}</p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Последний вход</p>
                    <p className="font-medium">
                      {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "—"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>


          </div>

          {/* Security Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Безопасность</CardTitle>
              <CardDescription>Настройки безопасности вашего аккаунта</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <Key className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Пароль</p>
                    <p className="text-sm text-muted-foreground">Последнее изменение: не менялся</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Сменить пароль
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
