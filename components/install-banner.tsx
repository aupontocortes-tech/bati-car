'use client'

import { useEffect, useState } from 'react'
import { CarFront, Download, Share } from 'lucide-react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface Window {
    __batiInstallPrompt?: BeforeInstallPromptEvent
  }
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function InstallBanner() {
  const [ready, setReady] = useState(false)
  const [ios, setIos] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [hint, setHint] = useState(false)

  useEffect(() => {
    localStorage.removeItem('bati-car-hide-install')
    sessionStorage.removeItem('bati-car-hide-install-session')

    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js')
    }

    if (isStandalone()) {
      setInstalled(true)
      setReady(true)
      return
    }

    setIos(isIos())
    setReady(true)

    const captured = window.__batiInstallPrompt
    if (captured) setInstallEvent(captured)

    const onPrompt = (event: Event) => {
      event.preventDefault()
      const promptEvent = event as BeforeInstallPromptEvent
      window.__batiInstallPrompt = promptEvent
      setInstallEvent(promptEvent)
    }
    const onInstalled = () => setInstalled(true)

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function install() {
    if (installEvent) {
      await installEvent.prompt()
      const choice = await installEvent.userChoice
      if (choice.outcome === 'accepted') setInstalled(true)
      return
    }
    setHint(true)
  }

  if (!ready || installed) return null

  return (
    <section className="no-print border-b border-primary/20 bg-primary/5">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:px-5 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <CarFront size={22} strokeWidth={2.4} />
          </div>
          <div>
            <p className="text-sm font-bold">Instalar o Bati Car neste celular</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {ios
                ? 'No Safari: toque em Compartilhar e depois em Adicionar à Tela de Início.'
                : 'Toque no botão para baixar. Se a janela não abrir, use o menu ⋮ do Chrome e Instalar aplicativo.'}
            </p>
            {hint && !ios && (
              <p className="mt-2 text-xs font-semibold text-primary">Chrome → menu ⋮ → Instalar aplicativo (ou Adicionar à tela inicial).</p>
            )}
          </div>
        </div>
        {ios ? (
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary"><Share size={14} /> Safari → Compartilhar → Adicionar</p>
        ) : (
          <button
            onClick={() => void install()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
          >
            <Download size={16} /> Baixar aplicativo
          </button>
        )}
      </div>
    </section>
  )
}
