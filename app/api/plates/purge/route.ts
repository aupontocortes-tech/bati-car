import { NextResponse } from 'next/server'
import { purgeOldPlates } from '@/lib/plate-db'

export async function GET() {
  try {
    await purgeOldPlates()
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao limpar.'
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
