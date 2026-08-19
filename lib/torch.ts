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
