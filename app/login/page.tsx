"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Monitor, AlertCircle, Cpu, Server, HardDrive, Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams.get("error")
  
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [fieldError, setFieldError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldError("")

    if (!email || !password) {
      setFieldError("Пожалуйста, заполните все поля")
      return
    }

    setIsLoading(true)

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setFieldError("Неверный email или пароль")
      setPassword("")
    } else if (result?.ok) {
      router.push("/dashboard")
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70">
        {/* Decorative background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-32 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="max-w-lg">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-12">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Monitor className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-semibold text-white tracking-tight">EduTrack</span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6 text-balance">
              Мониторинг учебного оборудования
            </h1>
            <p className="text-lg text-white/80 leading-relaxed mb-12">
              Единая система учёта и контроля состояния компьютерной техники 
              в образовательных учреждениях
            </p>

            {/* Features */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm text-white">
                  <Cpu className="h-5 w-5" />
                </div>
                <span className="text-white/90">Инвентаризация оборудования и комплектующих</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm text-white">
                  <Server className="h-5 w-5" />
                </div>
                <span className="text-white/90">Отслеживание статусов и ремонтных работ</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm text-white">
                  <HardDrive className="h-5 w-5" />
                </div>
                <span className="text-white/90">Учёт программного обеспечения и лицензий</span>
              </div>
            </div>
          </div>
        </div>

        {/* Floating decorative icons */}
        <div className="absolute bottom-20 right-16 opacity-20">
          <Monitor className="h-24 w-24 text-white" />
        </div>
        <div className="absolute top-32 right-32 opacity-15">
          <Cpu className="h-16 w-16 text-white" />
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex items-center justify-center gap-3 mb-8 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary">
              <Monitor className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-foreground tracking-tight">EduTrack</span>
          </div>

          <Card className="border-0 shadow-xl shadow-primary/5 bg-card">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold text-card-foreground mb-2">
                  Вход в систему
                </h2>
                <p className="text-muted-foreground text-sm">
                  Введите учётные данные для входа
                </p>
              </div>

              {/* Error alerts */}
              {(fieldError || error) && (
                <Alert className="mb-6 bg-red-500/10 border-red-500/30">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700 text-sm">
                    {fieldError || "Ошибка входа. Пожалуйста, попробуйте снова."}
                  </AlertDescription>
                </Alert>
              )}

              {/* Test credentials info */}
              <Alert className="mb-6 bg-blue-500/10 border-blue-500/30">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-700 text-sm">
                  <strong>Тестовые учётные данные:</strong>
                  <div className="mt-2 space-y-1 text-xs">
                    <div>Администратор: admin@edutrack.ru / admin123</div>
                    <div>Преподаватель: teacher@edutrack.ru / teacher123</div>
                  </div>
                </AlertDescription>
              </Alert>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Input */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                    Email адрес
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="h-10"
                    autoComplete="email"
                  />
                </div>

                {/* Password Input */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                    Пароль
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="********"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className="h-10 pr-10"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full h-10 mt-6"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                      Входим...
                    </>
                  ) : (
                    "Войти"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            EduTrack v1.0 &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  )
}
