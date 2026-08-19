let audio: AudioContext | null = null

async function context() {
  const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioCtx) return null
  if (!audio) audio = new AudioCtx()
  if (audio.state === 'suspended') await audio.resume()
  return audio
}

export async function unlockBeep() {
  await context()
}

function tone(ctx: AudioContext, frequency: number, start: number, duration: number, volume = 0.18) {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = 'square'
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.02)
}

export async function playScanBeep() {
  const ctx = await context()
  if (!ctx) return
  const now = ctx.currentTime
  tone(ctx, 1800, now, 0.07)
  tone(ctx, 2400, now + 0.08, 0.1)
  navigator.vibrate?.(50)
}

export async function playAlreadyBeep() {
  const ctx = await context()
  if (!ctx) return
  const now = ctx.currentTime
  tone(ctx, 900, now, 0.12, 0.12)
  navigator.vibrate?.(20)
}
