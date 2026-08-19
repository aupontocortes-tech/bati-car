import { NextResponse } from 'next/server'
import { addPlate, deletePlatesByDate, listPlatesByDate } from '@/lib/plate-db'
import { isDateKey, isLocation, todayKey } from '@/lib/plates'

function errorResponse(error: unknown, status = 500) {
  const message = error instanceof Error ? error.message : 'Erro interno.'
  return NextResponse.json({ error: message }, { status })
}

export async function GET(request: Request) {
  try {
    const date = new URL(request.url).searchParams.get('date') || todayKey()
    const plates = await listPlatesByDate(date)
    return NextResponse.json({ plates, date, today: todayKey() })
  } catch (error) {
    return errorResponse(error, 503)
  }
}

export async function DELETE(request: Request) {
  try {
    const date = new URL(request.url).searchParams.get('date') || ''
    if (!isDateKey(date)) {
      return NextResponse.json({ error: 'Informe a data.' }, { status: 400 })
    }
    await deletePlatesByDate(date)
    return NextResponse.json({ ok: true })
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
