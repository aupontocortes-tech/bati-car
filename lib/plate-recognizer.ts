import { isMercosulPlate, normalizePlate } from '@/lib/plates'

type RecognizerResult = {
  plate?: string
  score?: number
  dscore?: number
  candidates?: { plate?: string; score?: number }[]
}

type RecognizerResponse = {
  results?: RecognizerResult[]
  detail?: string
  error?: string
}

function tokenFromEnv() {
  const raw = process.env.PLATE_RECOGNIZER_TOKEN?.trim()
  if (!raw) return ''
  return raw.replace(/^Token\s+/i, '').trim()
}

function bestPlate(results: RecognizerResult[]) {
  const ranked = results.flatMap((result) => {
    const options = [
      { plate: result.plate, score: result.score ?? result.dscore ?? 0 },
      ...(result.candidates ?? []).map((candidate) => ({ plate: candidate.plate, score: candidate.score ?? 0 })),
    ]
    return options.filter((option) => option.plate && isMercosulPlate(option.plate ?? ''))
  }).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  const winner = ranked[0]
  if (!winner?.plate || (winner.score ?? 0) < 0.25) return null
  return normalizePlate(winner.plate)
}

export async function readPlateFromImage(file: Blob) {
  const token = tokenFromEnv()
  if (!token) {
    throw new Error('Configure PLATE_RECOGNIZER_TOKEN com a chave da API do Plate Recognizer.')
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const image = new Blob([bytes], { type: file.type || 'image/jpeg' })
  const body = new FormData()
  body.append('upload', image, 'placa.jpg')
  body.append('regions', 'br')
  body.append('mmc', 'false')
  body.append('config', JSON.stringify({ mode: 'fast' }))

  const response = await fetch('https://api.platerecognizer.com/v1/plate-reader/', {
    method: 'POST',
    headers: { Authorization: `Token ${token}` },
    body,
  })

  const data = (await response.json()) as RecognizerResponse
  if (!response.ok) {
    throw new Error(data.detail || data.error || 'Falha ao ler a placa no Plate Recognizer.')
  }

  return bestPlate(data.results ?? [])
}
