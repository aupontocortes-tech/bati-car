import { NextResponse } from 'next/server'
import { addPlate } from '@/lib/plate-db'
import { readPlateFromImage } from '@/lib/plate-recognizer'
import { isLocation } from '@/lib/plates'

export const maxDuration = 30

export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const location = String(form.get('location') ?? '')
    const upload = form.get('upload')

    if (!isLocation(location)) {
      return NextResponse.json({ error: 'Informe o local da leitura.' }, { status: 400 })
    }
    if (!(upload instanceof File) || upload.size === 0) {
      return NextResponse.json({ error: 'Envie uma foto da placa.' }, { status: 400 })
    }

    const plateValue = await readPlateFromImage(upload)
    if (!plateValue) {
      return NextResponse.json({ error: 'Não encontrei placa nessa foto. Aponte de novo.' }, { status: 422 })
    }

    const result = await addPlate({ value: plateValue, location, status: 'Lida' })
    return NextResponse.json(result, { status: result.duplicate ? 409 : 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao ler a placa.'
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
