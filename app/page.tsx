'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Camera, CarFront, Check, ChevronRight, FileText, Flashlight, History, MapPin, Plus, Settings2, Sparkles, Trash2, Upload, X } from 'lucide-react'
import { emptyPlates, groupPlates, LOCATIONS, type Location, type Plate } from '@/lib/plates'
import { playAlreadyBeep, playScanBeep, unlockBeep } from '@/lib/beep'
import { cropPlateFrame, detectPlateAim } from '@/lib/plate-detect'
import { ClosingReports } from '@/components/closing-reports'
import { getVideoTrack, setTorch, supportsTorch } from '@/lib/torch'

type Notice = { kind: 'already' | 'error' | 'ok'; text: string }

export default function Page() {
  const [location, setLocation] = useState<Location>('Loja')
  const [plates, setPlates] = useState(emptyPlates)
  const [isCapturing, setIsCapturing] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [hasTorch, setHasTorch] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showClosing, setShowClosing] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiming, setAiming] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const locationRef = useRef(location)
  const busyRef = useRef(false)
  const hitsRef = useRef(0)
  const lastReadAtRef = useRef(0)
  locationRef.current = location

  const currentPlates = plates[location]
  const total = useMemo(() => plates.Loja.length + plates['Lava-jato'].length, [plates])

  const refreshPlates = useCallback(async () => {
    const response = await fetch('/api/plates')
    const data = await response.json() as { plates?: Plate[]; error?: string }
    if (!response.ok) throw new Error(data.error || 'Não foi possível carregar as placas.')
    setPlates(groupPlates(data.plates ?? []))
  }, [])

  useEffect(() => {
    refreshPlates()
      .catch((error: Error) => setNotice({ kind: 'error', text: error.message }))
      .finally(() => setLoading(false))
  }, [refreshPlates])

  useEffect(() => {
    return () => stopCamera()
  }, [])

  useEffect(() => {
    if (!cameraOpen) {
      setAiming(false)
      hitsRef.current = 0
      return
    }
    const timer = window.setInterval(() => {
      const video = videoRef.current
      if (!video || video.readyState < 2 || busyRef.current) return
      if (Date.now() - lastReadAtRef.current < 1000) return

      const aim = detectPlateAim(video)
      setAiming(aim.found)
      if (!aim.found) {
        hitsRef.current = 0
        return
      }

      hitsRef.current += 1
      if (hitsRef.current < 2 && aim.score < 1.8) return
      hitsRef.current = 0
      void captureFrame(true, aim.box)
    }, 220)
    return () => window.clearInterval(timer)
  }, [cameraOpen])

  function stopCamera() {
    const track = getVideoTrack(streamRef.current)
    void setTorch(track, false)
    streamRef.current?.getTracks().forEach((item) => item.stop())
    streamRef.current = null
    setCameraOpen(false)
    setHasTorch(false)
    setTorchOn(false)
    setAiming(false)
  }

  async function openCamera() {
    setNotice(null)
    await unlockBeep()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      const track = getVideoTrack(stream)
      setHasTorch(supportsTorch(track))
      setCameraOpen(true)
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream
      })
    } catch {
      fileRef.current?.click()
    }
  }

  async function toggleFlash() {
    const track = getVideoTrack(streamRef.current)
    if (!supportsTorch(track)) return
    const next = !torchOn
    const on = next ? await setTorch(track, true) : await setTorch(track, false)
    setTorchOn(next && on)
  }

  async function captureFrame(quiet = false, box?: { x: number; y: number; w: number; h: number } | null) {
    const video = videoRef.current
    if (!video || video.readyState < 2 || busyRef.current) return

    const photo = box ? cropPlateFrame(video, { ...box, score: 1 }) : (() => {
      const canvas = document.createElement('canvas')
      const maxWidth = 1280
      const scale = Math.min(1, maxWidth / (video.videoWidth || maxWidth))
      canvas.width = Math.round((video.videoWidth || maxWidth) * scale)
      canvas.height = Math.round((video.videoHeight || 720) * scale)
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
      return canvas
    })()
    const blob = await new Promise<Blob | null>((resolve) => photo.toBlob(resolve, 'image/jpeg', 0.92))
    if (blob) await sendRead(new File([blob], 'placa.jpg', { type: 'image/jpeg' }), quiet)
  }

  async function sendRead(file: File, quiet = false) {
    if (busyRef.current) return
    busyRef.current = true
    setIsCapturing(true)
    if (!quiet) setNotice(null)
    try {
      const form = new FormData()
      form.append('upload', file)
      form.append('location', locationRef.current)
      const response = await fetch('/api/plates/read', { method: 'POST', body: form })
      const data = await response.json() as { plate?: Plate; duplicate?: boolean; error?: string }

      if (response.status === 409 && data.plate) {
        await playAlreadyBeep()
        setNotice({ kind: 'already', text: `Placa ${data.plate.value} já foi lida hoje.` })
        lastReadAtRef.current = Date.now()
        return
      }
      if (response.status === 422 && quiet) {
        lastReadAtRef.current = Date.now()
        return
      }
      if (!response.ok) {
        setNotice({ kind: 'error', text: data.error || 'Não foi possível ler a placa.' })
        return
      }

      await playScanBeep()
      if (data.plate) setNotice({ kind: 'ok', text: `Placa ${data.plate.value} lida.` })
      lastReadAtRef.current = Date.now()
      await refreshPlates()
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Falha na leitura.' })
    } finally {
      busyRef.current = false
      setIsCapturing(false)
    }
  }

  async function addManual() {
    await unlockBeep()
    const value = window.prompt('Digite a placa')
    if (!value) return
    setNotice(null)
    try {
      const response = await fetch('/api/plates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value, location }),
      })
      const data = await response.json() as { plate?: Plate; duplicate?: boolean; error?: string }
      if (response.status === 409 && data.plate) {
        await playAlreadyBeep()
        setNotice({ kind: 'already', text: `Placa ${data.plate.value} já foi lida hoje.` })
        return
      }
      if (!response.ok) {
        setNotice({ kind: 'error', text: data.error || 'Não foi possível salvar a placa.' })
        return
      }
      await playScanBeep()
      if (data.plate) setNotice({ kind: 'ok', text: `Placa ${data.plate.value} lida.` })
      await refreshPlates()
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Falha ao salvar.' })
    }
  }

  async function removePlate(plate: Plate) {
    const response = await fetch(`/api/plates/${plate.id}`, { method: 'DELETE' })
    if (!response.ok) {
      const data = await response.json() as { error?: string }
      setNotice({ kind: 'error', text: data.error || 'Não foi possível remover.' })
      return
    }
    await refreshPlates()
  }

  function onUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) void sendRead(file)
  }

  return (
    <>
    <main className="no-print min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="mx-auto min-h-screen w-full max-w-[480px] bg-background shadow-sm md:max-w-6xl">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-5 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"><CarFront size={22} strokeWidth={2.4} /></div>
            <div><p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">Bati Car</p><p className="text-xs text-muted-foreground">Contagem de pátio</p></div>
          </div>
          <button aria-label="Abrir configurações" onClick={() => setShowSettings(true)} className="flex size-10 items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:bg-accent hover:text-foreground"><Settings2 size={19} /></button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-8 pt-6 sm:px-5 sm:pb-12 sm:pt-7 md:px-8">
        <section className="mb-6 flex flex-col justify-between gap-4 sm:mb-7 sm:gap-5 md:flex-row md:items-end">
          <div><p className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary"><span className="size-2 rounded-full bg-primary" /> Contagem em andamento</p><h1 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">Conte os carros sem perder nenhuma placa.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Aponte a câmera para a placa. O Bati Car reconhece, confere e organiza tudo por local.</p></div>
          <div className="flex w-full items-center justify-between gap-3 rounded-2xl bg-primary px-4 py-3 text-primary-foreground sm:w-auto sm:px-5 sm:py-4"><div><p className="text-xs font-medium text-primary-foreground/70">Total do dia</p><p className="text-3xl font-bold">{loading ? '—' : total}</p></div><CarFront size={28} className="opacity-80" /></div>
        </section>

        <div className="mb-6 flex rounded-2xl border border-border bg-card p-1.5 shadow-sm" role="tablist" aria-label="Local da contagem">
          {LOCATIONS.map((item) => (
            <button key={item} role="tab" aria-selected={location === item} onClick={() => setLocation(item)} className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${location === item ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent'}`}>
              <MapPin size={16} /> {item}
              <span className={`rounded-full px-2 py-0.5 text-xs ${location === item ? 'bg-primary-foreground/15' : 'bg-muted'}`}>{plates[item].length}</span>
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
          <section className="rounded-3xl border border-border bg-card p-5 shadow-sm md:p-7">
            <div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-bold">Nova leitura</h2><p className="mt-1 text-sm text-muted-foreground">Local selecionado: <span className="font-semibold text-foreground">{location}</span></p></div><div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">Plate Recognizer</div></div>

            {cameraOpen ? (
              <div className="overflow-hidden rounded-2xl bg-black">
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    onClick={() => void toggleFlash()}
                    className="aspect-[4/3] w-full object-cover"
                  />
                  {hasTorch && (
                    <div className={`pointer-events-none absolute right-3 top-3 flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold shadow-sm ${torchOn ? 'bg-amber-300 text-black' : 'bg-black/55 text-white'}`}>
                      <Flashlight size={15} />
                      {torchOn ? 'Flash ligado' : 'Toque na tela para o flash'}
                    </div>
                  )}
                  <p className={`pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1.5 text-xs font-bold ${aiming ? 'bg-emerald-400 text-black' : 'bg-black/55 text-white'}`}>
                    {isCapturing ? 'Lendo placa...' : aiming ? 'Placa na mira' : 'Aponte para a placa'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 p-3">
                  <button onClick={() => void captureFrame(false)} disabled={isCapturing} className="rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-70">
                    {isCapturing ? 'Lendo placa...' : 'Ler esta placa'}
                  </button>
                  <button onClick={stopCamera} className="rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-white">Fechar câmera</button>
                </div>
              </div>
            ) : (
              <button onClick={() => void openCamera()} disabled={isCapturing} className="group relative flex min-h-56 w-full flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-80">
                <div className="absolute inset-x-10 top-0 h-px bg-primary-foreground/30" />
                <div className="flex size-16 items-center justify-center rounded-2xl bg-primary-foreground/15 ring-1 ring-primary-foreground/25 transition group-hover:scale-105">{isCapturing ? <Sparkles className="animate-pulse" size={30} /> : <Camera size={30} />}</div>
                <div className="text-center">
                  <p className="text-lg font-bold">{isCapturing ? 'Lendo placa...' : 'Apontar câmera para a placa'}</p>
                  <p className="mt-1 text-sm text-primary-foreground/70">{isCapturing ? 'Conferindo com Plate Recognizer' : 'Toque para iniciar uma leitura'}</p>
                </div>
              </button>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button onClick={() => fileRef.current?.click()} className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold transition hover:bg-accent"><Upload size={17} /> Enviar foto</button>
              <button onClick={() => void addManual()} className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold transition hover:bg-accent"><Plus size={17} /> Digitar placa</button>
            </div>
            <input ref={fileRef} onChange={onUpload} type="file" accept="image/*" capture="environment" className="sr-only" />
            {notice && (
              <p role="status" className={`mt-4 rounded-xl border px-3 py-2 text-sm font-semibold ${notice.kind === 'error' ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-primary/30 bg-primary/10 text-primary'}`}>
                {notice.text}
              </p>
            )}
            <div className="mt-5 flex items-start gap-3 rounded-xl bg-muted/60 p-3 text-xs leading-5 text-muted-foreground"><Sparkles size={16} className="mt-0.5 shrink-0 text-primary" /> Só lê quando reconhece uma placa Mercosul na mira. Andar com a câmera ligada sem apontar não gasta leitura. Flash: toque na tela.</div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-5 shadow-sm md:p-7">
            <div className="mb-5 flex items-center justify-between">
              <div><h2 className="text-lg font-bold">Placas em {location}</h2><p className="mt-1 text-sm text-muted-foreground">Leituras de hoje no Neon</p></div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">{currentPlates.length} carros</span>
            </div>
            <div className="space-y-2">
              {currentPlates.map((plate) => (
                <div key={plate.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Check size={17} /></div>
                    <div>
                      <p className="font-mono text-sm font-bold tracking-wider">{plate.value}</p>
                      <p className="text-xs text-muted-foreground">{plate.time} · {plate.status}</p>
                    </div>
                  </div>
                  <button aria-label={`Remover placa ${plate.value}`} onClick={() => void removePlate(plate)} className="text-muted-foreground transition hover:text-destructive"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
            {!loading && currentPlates.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">Nenhuma placa neste local hoje.</div>}
            <button onClick={() => setShowClosing(true)} className="mt-5 flex w-full items-center justify-between rounded-xl bg-muted px-4 py-3 text-sm font-semibold transition hover:bg-accent"><span className="flex items-center gap-2"><History size={17} /> Ver fechamento da contagem</span><ChevronRight size={17} /></button>
          </section>
        </div>

        <section className="mt-6 flex flex-col items-start justify-between gap-4 rounded-3xl border border-primary/20 bg-primary/5 p-5 md:flex-row md:items-center md:px-7">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-primary"><FileText size={17} /> Relatório da operação</p>
            <p className="mt-1 text-sm text-muted-foreground">Bate físico no estilo da planilha e relatório com placas grandes para o grupo da loja.</p>
          </div>
          <button onClick={() => setShowClosing(true)} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"><FileText size={17} /> Fechar e gerar PDF</button>
        </section>
      </div>
      </div>

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 p-4 md:items-center">
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div><h2 className="text-xl font-bold">Configurar contagem</h2><p className="mt-1 text-sm text-muted-foreground">Prepare a próxima operação.</p></div>
              <button aria-label="Fechar" onClick={() => setShowSettings(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent"><X size={19} /></button>
            </div>
            <div className="space-y-3">
              {LOCATIONS.map((item) => (
                <button key={item} onClick={() => { setLocation(item); setShowSettings(false) }} className="flex w-full items-center justify-between rounded-2xl border border-border p-4 text-left hover:bg-accent">
                  <span><p className="font-bold">{item}</p><p className="text-xs text-muted-foreground">{plates[item].length} carros contados hoje</p></span>
                  <ChevronRight size={18} />
                </button>
              ))}
            </div>
            <button onClick={() => setShowSettings(false)} className="mt-6 w-full rounded-xl border border-border py-3 text-sm font-semibold">Concluir</button>
          </div>
        </div>
      )}
    </main>
      {showClosing && <ClosingReports plates={plates} onClose={() => setShowClosing(false)} />}
    </>
  )
}
