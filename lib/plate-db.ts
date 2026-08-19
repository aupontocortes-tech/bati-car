import { ensurePlatesTable } from '@/lib/db'
import { formatReadTime, isLocation, isMercosulPlate, normalizePlate, todayKey, type Location, type Plate, type PlateStatus } from '@/lib/plates'

type PlateRow = {
  id: number
  value: string
  location: string
  status: string
  read_on: string
  read_at: string
}

function toPlate(row: PlateRow): Plate {
  const date = String(row.read_on).slice(0, 10)
  return {
    id: Number(row.id),
    value: row.value,
    location: row.location as Location,
    status: row.status as PlateStatus,
    time: formatReadTime(row.read_at),
    date,
  }
}

export async function listTodayPlates() {
  const db = await ensurePlatesTable()
  const date = todayKey()
  const rows = await db`SELECT id, value, location, status, read_on::text, read_at::text
    FROM plates
    WHERE read_on = ${date}
    ORDER BY read_at DESC` as PlateRow[]
  return rows.map(toPlate)
}

export async function addPlate(input: { value: string; location: string; status: PlateStatus }) {
  if (!isLocation(input.location)) {
    throw new Error('Local inválido.')
  }

  const value = normalizePlate(input.value)
  if (!isMercosulPlate(value)) {
    throw new Error('Só entram placas Mercosul do Brasil, no formato ABC1D23.')
  }

  const db = await ensurePlatesTable()
  const date = todayKey()
  const inserted = await db`INSERT INTO plates (value, location, status, read_on)
    VALUES (${value}, ${input.location}, ${input.status}, ${date})
    ON CONFLICT (value, read_on) DO NOTHING
    RETURNING id, value, location, status, read_on::text, read_at::text` as PlateRow[]

  if (inserted[0]) {
    return { duplicate: false as const, plate: toPlate(inserted[0]) }
  }

  const existing = await db`SELECT id, value, location, status, read_on::text, read_at::text
    FROM plates
    WHERE value = ${value} AND read_on = ${date}
    LIMIT 1` as PlateRow[]

  return { duplicate: true as const, plate: existing[0] ? toPlate(existing[0]) : null }
}

export async function deletePlate(id: number) {
  const db = await ensurePlatesTable()
  await db`DELETE FROM plates WHERE id = ${id}`
}
