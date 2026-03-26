import NextAuth, { type NextAuthConfig, type User as NextAuthUser } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { getUserByEmail, markUserLastLogin, verifyPassword } from "@/lib/auth-db"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
    }
  }

  interface User {
    id: string
    email: string
    role: string
    name: string
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string
    role: string
  }
}

export const authConfig: NextAuthConfig = {
  secret: process.env.AUTH_SECRET || "development-secret-do-not-use-in-production",
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email as string
        const password = credentials.password as string

        try {
          const user = await getUserByEmail(email)

          if (!user || !user.isActive) {
            return null
          }

          const isPasswordValid = await verifyPassword(password, user.passwordHash)

          if (!isPasswordValid) {
            return null
          }

          await markUserLastLogin(String(user.id))

          const name = [user.lastName, user.firstName, user.middleName]
            .filter(Boolean)
            .join(" ")

          return {
            id: String(user.id),
            email: user.email,
            role: user.role,
            name,
          } as NextAuthUser
        } catch (error) {
          console.error("Auth error:", error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)