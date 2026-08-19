import { NextResponse } from 'next/server'
import { addPlate, listTodayPlates } from '@/lib/plate-db'
import { isLocation } from '@/lib/plates'

function errorResponse(error: unknown, status = 500) {
  const message = error instanceof Error ? error.message : 'Erro interno.'
  return NextResponse.json({ error: message }, { status })
}

export async function GET() {
  try {
    const plates = await listTodayPlates()
    return NextResponse.json({ plates })
  } catch (error) {
    return errorResponse(error, 503)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { value?: string; location?: string }
    if (!body.value || !body.location || !isLocation(body.location)) {
      return NextResponse.json({ error: 'Informe placa e local.' }, { status: 400 })
    }

    const result = await addPlate({ value: body.value, location: body.location, status: 'Manual' })
    return NextResponse.json(result, { status: result.duplicate ? 409 : 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno.'
    const status = message.includes('Mercosul') ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
