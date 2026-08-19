type RecognizerResult = {
  plate?: string
  score?: number
}

type RecognizerResponse = {
  results?: RecognizerResult[]
  detail?: string
  error?: string
}

export async function readPlateFromImage(file: File) {
  const token = process.env.PLATE_RECOGNIZER_TOKEN
  if (!token) {
    throw new Error('Configure PLATE_RECOGNIZER_TOKEN com a chave da API do Plate Recognizer.')
  }

  const body = new FormData()
  body.append('upload', file, file.name || 'placa.jpg')
  body.append('regions', 'br')

  const response = await fetch('https://api.platerecognizer.com/v1/plate-reader/', {
    method: 'POST',
    headers: { Authorization: `Token ${token}` },
    body,
  })

  const data = (await response.json()) as RecognizerResponse
  if (!response.ok) {
    throw new Error(data.detail || data.error || 'Falha ao ler a placa no Plate Recognizer.')
  }

  const best = [...(data.results ?? [])].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0]
  if (!best?.plate || (best.score ?? 0) < 0.4) {
    return null
  }

  return best.plate
}
