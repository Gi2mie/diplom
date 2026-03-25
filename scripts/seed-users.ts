import { neon } from "@neondatabase/serverless"
import { hashSync } from "bcryptjs"

const sql = neon(process.env.DATABASE_URL!)

async function seedUsers() {
  const adminHash = hashSync("admin123", 10)
  const teacherHash = hashSync("teacher123", 10)

  // Удаляем существующих пользователей если есть
  await sql`DELETE FROM users WHERE email IN ('admin@edutrack.ru', 'teacher@edutrack.ru')`

  // Добавляем администратора
  await sql`
    INSERT INTO users (id, email, password_hash, name, role, is_active)
    VALUES (
      gen_random_uuid(),
      'admin@edutrack.ru',
      ${adminHash},
      'Администратор Системный Владимирович',
      'ADMIN',
      true
    )
  `

  // Добавляем преподавателя
  await sql`
    INSERT INTO users (id, email, password_hash, name, role, is_active)
    VALUES (
      gen_random_uuid(),
      'teacher@edutrack.ru',
      ${teacherHash},
      'Петров Иван Сергеевич',
      'TEACHER',
      true
    )
  `

  console.log("Users seeded successfully:")
  console.log("  Admin:   admin@edutrack.ru / admin123")
  console.log("  Teacher: teacher@edutrack.ru / teacher123")
}

seedUsers().catch(console.error)
