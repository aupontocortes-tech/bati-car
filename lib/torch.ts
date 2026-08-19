export type FlashMode = 'auto' | 'on' | 'off'

type TorchCapableTrack = MediaStreamTrack & {
  getCapabilities?: () => { torch?: boolean }
}

export function getVideoTrack(stream: MediaStream | null) {
  return stream?.getVideoTracks()[0] ?? null
}

export function supportsTorch(track: MediaStreamTrack | null) {
  if (!track) return false
  try {
    return Boolean((track as TorchCapableTrack).getCapabilities?.().torch)
  } catch {
    return false
  }
}

export async function setTorch(track: MediaStreamTrack | null, on: boolean) {
  if (!track || !supportsTorch(track)) return false
  try {
    await track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] })
    return true
  } catch {
    return false
  }
}

export function sampleLuma(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
  if (video.readyState < 2 || !video.videoWidth) return null
  canvas.width = 48
  canvas.height = 27
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null
  context.drawImage(video, 0, 0, canvas.width, canvas.height)
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
  let total = 0
  for (let index = 0; index < pixels.length; index += 4) {
    total += 0.2126 * pixels[index] + 0.7152 * pixels[index + 1] + 0.0722 * pixels[index + 2]
  }
  return total / (pixels.length / 4)
}

export function nextFlashMode(mode: FlashMode): FlashMode {
  if (mode === 'auto') return 'on'
  if (mode === 'on') return 'off'
  return 'auto'
}

export function flashLabel(mode: FlashMode) {
  if (mode === 'auto') return 'Flash auto'
  if (mode === 'on') return 'Flash ligado'
  return 'Flash desligado'
}
