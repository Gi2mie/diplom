import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not set')
}

const sql = neon(DATABASE_URL)

async function seedUsers() {
  console.log('Seeding users...')
  
  // Delete existing test users
  await sql`DELETE FROM users WHERE email IN ('admin@edutrack.ru', 'teacher@edutrack.ru')`
  
  // Hash passwords
  const adminPasswordHash = await bcrypt.hash('admin123', 10)
  const teacherPasswordHash = await bcrypt.hash('teacher123', 10)
  
  // Insert admin user
  await sql`
    INSERT INTO users (email, password_hash, name, role, is_active)
    VALUES (
      'admin@edutrack.ru',
      ${adminPasswordHash},
      'Администратор',
      'ADMIN',
      true
    )
  `
  
  // Insert teacher user
  await sql`
    INSERT INTO users (email, password_hash, name, role, is_active)
    VALUES (
      'teacher@edutrack.ru',
      ${teacherPasswordHash},
      'Преподаватель',
      'TEACHER',
      true
    )
  `
  
  console.log('✅ Users seeded successfully!')
  console.log('Admin: admin@edutrack.ru / admin123')
  console.log('Teacher: teacher@edutrack.ru / teacher123')
}

seedUsers().catch(console.error)
