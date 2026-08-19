'use client'

import { useMemo, useState } from 'react'
import { FileText, Share2, X } from 'lucide-react'
import { type Location, type Plate } from '@/lib/plates'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function fileStamp(date = new Date()) {
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}`
}

function plateValues(list: Plate[]) {
  return [...list].slice().reverse().map((plate) => plate.value)
}

function shareMessage(loja: string[], lava: string[], shift: string, date: string) {
  return [
    `Bate físico ${shift} ${date}`,
    '',
    'LAVA JATO',
    ...lava,
    '',
    'UNIDAS',
    ...loja,
  ].join('\n')
}

export function ClosingReports({
  plates,
  onClose,
}: {
  plates: Record<Location, Plate[]>
  onClose: () => void
}) {
  const [shift, setShift] = useState<'DIA' | 'NOITE'>(() => (new Date().getHours() >= 18 ? 'NOITE' : 'DIA'))
  const loja = useMemo(() => plateValues(plates.Loja), [plates.Loja])
  const lava = useMemo(() => plateValues(plates['Lava-jato']), [plates['Lava-jato']])
  const stamp = fileStamp()
  const maxRows = Math.max(loja.length, lava.length, 1)
  const text = shareMessage(loja, lava, shift, stamp)

  async function share() {
    const title = `Bate físico ${shift} ${stamp}`
    if (navigator.share) {
      try {
        await navigator.share({ title, text })
        return
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  function printSheet() {
    const previous = document.title
    document.title = `Bate fisico ${shift} ${stamp}`
    window.print()
    document.title = previous
  }

  return (
    <div className="print-root fixed inset-0 z-[70] overflow-y-auto bg-white">
      <div className="no-print sticky top-0 z-10 border-b border-border bg-card px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold">Bate físico</p>
            <p className="text-xs text-muted-foreground">Mesma estrutura da planilha da loja, com letras grandes</p>
          </div>
          <button aria-label="Fechar" onClick={onClose} className="rounded-lg p-2 hover:bg-accent"><X size={18} /></button>
        </div>
        <div className="mx-auto mt-3 flex max-w-3xl gap-2">
          <button onClick={() => setShift('DIA')} className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${shift === 'DIA' ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>Dia</button>
          <button onClick={() => setShift('NOITE')} className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${shift === 'NOITE' ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>Noite</button>
        </div>
        <div className="mx-auto mt-2 flex max-w-3xl gap-2">
          <button onClick={() => void share()} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-bold"><Share2 size={16} /> Mandar no grupo</button>
          <button onClick={printSheet} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground"><FileText size={16} /> Salvar PDF</button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-3 py-5">
        <div className="print-sheet bg-white text-black">
          <p className="mb-3 text-center text-lg font-black">Bate físico {shift} {stamp}</p>
          <div className="grid grid-cols-2">
            <div className="border-r border-black">
              <p className="px-2 py-3 text-left text-xl font-black">LAVA JATO</p>
              <div className="h-4" />
              {Array.from({ length: maxRows }).map((_, index) => (
                <p key={`lava-${lava[index] ?? index}`} className="px-2 py-2 font-mono text-[28px] font-black leading-none tracking-wide">{lava[index] ?? ''}</p>
              ))}
            </div>
            <div>
              <p className="px-2 py-3 text-left text-xl font-black">UNIDAS</p>
              <div className="h-4" />
              {Array.from({ length: maxRows }).map((_, index) => (
                <p key={`loja-${loja[index] ?? index}`} className="px-2 py-2 font-mono text-[28px] font-black leading-none tracking-wide">{loja[index] ?? ''}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
