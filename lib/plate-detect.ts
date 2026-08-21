const VIEW_W = 160
const VIEW_H = 90

export type Box = { x: number; y: number; w: number; h: number; score: number }

const canvas = typeof document === 'undefined' ? null : document.createElement('canvas')

export type PlateAim = {
  found: boolean
  score: number
  sharpness: number
  box: Box | null
}

const empty: PlateAim = { found: false, score: 0, sharpness: 0, box: null }

export function detectPlateAim(video: HTMLVideoElement): PlateAim {
  if (!canvas || video.readyState < 2 || !video.videoWidth) return empty

  canvas.width = VIEW_W
  canvas.height = VIEW_H
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return empty
  context.drawImage(video, 0, 0, VIEW_W, VIEW_H)
  const { data } = context.getImageData(0, 0, VIEW_W, VIEW_H)

  const luma = new Float32Array(VIEW_W * VIEW_H)
  for (let index = 0, pixel = 0; index < data.length; index += 4, pixel += 1) {
    luma[pixel] = 0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2]
  }

  const edge = new Float32Array(VIEW_W * VIEW_H)
  for (let y = 1; y < VIEW_H - 1; y += 1) {
    for (let x = 1; x < VIEW_W - 1; x += 1) {
      const i = y * VIEW_W + x
      edge[i] = Math.abs(luma[i + 1] - luma[i - 1]) + Math.abs(luma[i] - luma[i - VIEW_W]) * 0.35
    }
  }

  let best: Box | null = null
  const widths = [40, 56, 72, 96, 120]
  for (const width of widths) {
    const height = Math.max(12, Math.round(width / 3.08))
    if (height >= VIEW_H - 6) continue
    for (let y = 6; y <= VIEW_H - height - 6; y += 4) {
      for (let x = 4; x <= VIEW_W - width - 4; x += 4) {
        const score = scoreWindow(data, luma, edge, x, y, width, height)
        if (!best || score > best.score) best = { x, y, w: width, h: height, score }
      }
    }
  }

  if (!best || best.score < 1.35) return empty
  const sharpness = boxSharpness(edge, best)
  if (sharpness < 11) return empty
  return { found: true, score: best.score, sharpness, box: best }
}

export function boxesAreStable(previous: Box | null, next: Box | null) {
  if (!previous || !next) return false
  const dx = Math.abs(previous.x - next.x)
  const dy = Math.abs(previous.y - next.y)
  const dw = Math.abs(previous.w - next.w)
  const dh = Math.abs(previous.h - next.h)
  return dx <= 10 && dy <= 8 && dw <= 14 && dh <= 8
}

function boxSharpness(edge: Float32Array, box: Box) {
  let sum = 0
  let count = 0
  for (let row = 1; row < box.h - 1; row += 1) {
    for (let col = 1; col < box.w - 1; col += 1) {
      sum += edge[(box.y + row) * VIEW_W + (box.x + col)]
      count += 1
    }
  }
  return count ? sum / count : 0
}

function scoreWindow(
  rgba: Uint8ClampedArray,
  luma: Float32Array,
  edge: Float32Array,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const columns = new Float32Array(width)
  let edgeSum = 0
  let lumaMin = 255
  let lumaMax = 0
  let blueBoost = 0
  const stripe = Math.max(3, Math.round(width * 0.16))

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const px = (y + row) * VIEW_W + (x + col)
      const value = luma[px]
      const mag = edge[px]
      columns[col] += mag
      edgeSum += mag
      if (value < lumaMin) lumaMin = value
      if (value > lumaMax) lumaMax = value
      if (col < stripe) {
        const rgbaIndex = px * 4
        blueBoost += rgba[rgbaIndex + 2] - (rgba[rgbaIndex] + rgba[rgbaIndex + 1]) * 0.5
      }
    }
  }

  const contrast = lumaMax - lumaMin
  if (contrast < 34) return 0

  const meanEdge = edgeSum / (width * height)
  if (meanEdge < 11) return 0

  const peaks = countPeaks(columns)
  if (peaks < 5 || peaks > 9) return 0

  const stripePixels = stripe * height
  const blue = stripePixels ? blueBoost / stripePixels : 0
  const mercosul = blue > 12 ? 1.35 : 1

  return (peaks / 7) * (meanEdge / 14) * (contrast / 50) * mercosul
}

function countPeaks(columns: Float32Array) {
  const smoothed = new Float32Array(columns.length)
  for (let index = 1; index < columns.length - 1; index += 1) {
    smoothed[index] = (columns[index - 1] + columns[index] * 2 + columns[index + 1]) / 4
  }

  let mean = 0
  for (let index = 1; index < smoothed.length - 1; index += 1) mean += smoothed[index]
  mean /= Math.max(1, smoothed.length - 2)
  const floor = mean * 1.25

  let peaks = 0
  for (let index = 2; index < smoothed.length - 2; index += 1) {
    if (smoothed[index] > floor && smoothed[index] >= smoothed[index - 1] && smoothed[index] >= smoothed[index + 1]) {
      peaks += 1
      index += 1
    }
  }
  return peaks
}

export function cropPlateFrame(video: HTMLVideoElement, box: Box) {
  const padX = box.w * 0.18
  const padY = box.h * 0.28
  const sx = Math.max(0, ((box.x - padX) / VIEW_W) * video.videoWidth)
  const sy = Math.max(0, ((box.y - padY) / VIEW_H) * video.videoHeight)
  const sw = Math.min(video.videoWidth - sx, ((box.w + padX * 2) / VIEW_W) * video.videoWidth)
  const sh = Math.min(video.videoHeight - sy, ((box.h + padY * 2) / VIEW_H) * video.videoHeight)
  const output = document.createElement('canvas')
  output.width = 640
  output.height = Math.max(160, Math.round(640 * (sh / sw)))
  output.getContext('2d')?.drawImage(video, sx, sy, sw, sh, 0, 0, output.width, output.height)
  return output
}
