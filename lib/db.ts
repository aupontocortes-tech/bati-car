import { neon } from '@neondatabase/serverless'

let schemaReady = false

export function getDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.NEON_DATABASE_URL
}

export function sql() {
  const url = getDatabaseUrl()
  if (!url) {
    throw new Error('Configure DATABASE_URL com a connection string do Neon.')
  }
  return neon(url)
}

export async function ensurePlatesTable() {
  const db = sql()
  if (schemaReady) return db

  await db`CREATE TABLE IF NOT EXISTS plates (
    id SERIAL PRIMARY KEY,
    value TEXT NOT NULL,
    location TEXT NOT NULL,
    status TEXT NOT NULL,
    read_on DATE NOT NULL,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`
  await db`CREATE UNIQUE INDEX IF NOT EXISTS plates_value_read_on ON plates (value, read_on)`
  schemaReady = true
  return db
}
