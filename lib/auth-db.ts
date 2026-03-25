import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'

const sql = neon(process.env.DATABASE_URL!)

export async function getUserByEmail(email: string) {
  try {
    const result = await sql`SELECT * FROM users WHERE email = ${email}`
    return result[0] || null
  } catch (error) {
    console.error('Error fetching user:', error)
    return null
  }
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, passwordHash)
  } catch (error) {
    console.error('Error verifying password:', error)
    return false
  }
}

export async function createUser(email: string, password: string, name: string, role: string = 'TEACHER') {
  try {
    const passwordHash = await bcrypt.hash(password, 10)
    const result = await sql`
      INSERT INTO users (email, password_hash, name, role, is_active)
      VALUES (${email}, ${passwordHash}, ${name}, ${role}, true)
      RETURNING id, email, name, role
    `
    return result[0] || null
  } catch (error) {
    console.error('Error creating user:', error)
    throw error
  }
}
