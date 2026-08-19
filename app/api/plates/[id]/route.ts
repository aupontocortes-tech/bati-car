import { NextResponse } from 'next/server'
import { deletePlate } from '@/lib/plate-db'

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const plateId = Number(id)
    if (!Number.isInteger(plateId) || plateId <= 0) {
      return NextResponse.json({ error: 'Placa inválida.' }, { status: 400 })
    }
    await deletePlate(plateId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao remover a placa.'
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
