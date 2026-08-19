'use client'

import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'

const STORAGE_KEY = 'bati-car-hide-install'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function InstallBanner() {
  const [visible, setVisible] = useState(false)
  const [ios, setIos] = useState(false)
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(STORAGE_KEY) === '1') return

    setIos(isIos())
    setVisible(true)

    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js')
    }

    const onPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  function hide() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  async function install() {
    if (!installEvent) return
    await installEvent.prompt()
    const choice = await installEvent.userChoice
    if (choice.outcome === 'accepted') hide()
  }

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4">
      <div className="flex w-full max-w-md items-start gap-3 rounded-2xl border border-primary/20 bg-card p-4 shadow-2xl">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">BC</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Baixar o Bati Car</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {ios
              ? 'Toque em Compartilhar e depois em Adicionar à Tela de Início.'
              : installEvent
                ? 'Toque para instalar e abrir como aplicativo.'
                : 'No Chrome, abra o menu ⋮ e toque em Instalar aplicativo.'}
          </p>
          {ios ? (
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary"><Share size={14} /> Safari → Compartilhar → Adicionar</p>
          ) : (
            <button onClick={() => void (installEvent ? install() : undefined)} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">
              <Download size={14} /> Baixar aplicativo
            </button>
          )}
        </div>
        <button aria-label="Fechar" onClick={hide} className="rounded-lg p-1 text-muted-foreground hover:bg-accent"><X size={16} /></button>
      </div>
    </div>
  )
}
