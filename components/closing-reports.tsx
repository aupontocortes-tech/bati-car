'use client'

import { useMemo, useState } from 'react'
import { FileText, Share2, X } from 'lucide-react'
import { type Location, type Plate } from '@/lib/plates'

type View = 'bate' | 'relatorio'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function fileStamp(date = new Date()) {
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}`
}

function longDate(date = new Date()) {
  return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

function sortedValues(list: Plate[]) {
  return [...list].map((plate) => plate.value).sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

function shareMessage(loja: string[], lava: string[], shift: string, date: string) {
  const lines = [
    `BATE FÍSICO ${shift} ${date}`,
    `Bati Car`,
    '',
    `LOJA (${loja.length})`,
    ...loja,
    '',
    `LAVA JATO (${lava.length})`,
    ...lava,
    '',
    `TOTAL: ${loja.length + lava.length}`,
  ]
  return lines.join('\n')
}

export function ClosingReports({
  plates,
  onClose,
}: {
  plates: Record<Location, Plate[]>
  onClose: () => void
}) {
  const [view, setView] = useState<View>('bate')
  const [shift, setShift] = useState<'DIA' | 'NOITE'>(() => (new Date().getHours() >= 18 ? 'NOITE' : 'DIA'))
  const loja = useMemo(() => sortedValues(plates.Loja), [plates.Loja])
  const lava = useMemo(() => sortedValues(plates['Lava-jato']), [plates['Lava-jato']])
  const stamp = fileStamp()
  const date = longDate()
  const total = loja.length + lava.length
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
    <div className="print-root fixed inset-0 z-[70] overflow-y-auto bg-background">
      <div className="no-print sticky top-0 z-10 border-b border-border bg-card px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold">Fechamento</p>
            <p className="text-xs text-muted-foreground">PDF e texto para o grupo da loja</p>
          </div>
          <button aria-label="Fechar" onClick={onClose} className="rounded-lg p-2 hover:bg-accent"><X size={18} /></button>
        </div>
        <div className="mx-auto mt-3 flex max-w-3xl gap-2">
          <button onClick={() => setShift('DIA')} className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${shift === 'DIA' ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>Dia</button>
          <button onClick={() => setShift('NOITE')} className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${shift === 'NOITE' ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>Noite</button>
        </div>
        <div className="mx-auto mt-2 flex max-w-3xl gap-2">
          <button onClick={() => setView('bate')} className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${view === 'bate' ? 'bg-muted' : 'border border-border'}`}>Bate físico</button>
          <button onClick={() => setView('relatorio')} className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${view === 'relatorio' ? 'bg-muted' : 'border border-border'}`}>Relatório</button>
        </div>
        <div className="mx-auto mt-2 flex max-w-3xl gap-2">
          <button onClick={() => void share()} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-bold"><Share2 size={16} /> Mandar no grupo</button>
          <button onClick={printSheet} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground"><FileText size={16} /> Salvar PDF</button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6">
        {view === 'bate' ? (
          <div className="print-sheet rounded-none border border-black bg-white p-5 text-black">
            <p className="text-center text-xl font-black tracking-wide">BATE FÍSICO {shift} {stamp}</p>
            <p className="mt-1 text-center text-sm">Bati Car · {date} · Total {total}</p>
            <div className="mt-4 grid grid-cols-2 border border-black">
              <div className="border-r border-black">
                <p className="border-b border-black bg-neutral-200 px-2 py-2 text-center text-sm font-black">LAVA JATO {lava.length}</p>
                {Array.from({ length: maxRows }).map((_, index) => (
                  <p key={`lava-${lava[index] ?? index}`} className="border-b border-black px-2 py-1.5 font-mono text-lg font-bold tracking-wider last:border-b-0">{lava[index] ?? ''}</p>
                ))}
              </div>
              <div>
                <p className="border-b border-black bg-neutral-200 px-2 py-2 text-center text-sm font-black">LOJA {loja.length}</p>
                {Array.from({ length: maxRows }).map((_, index) => (
                  <p key={`loja-${loja[index] ?? index}`} className="border-b border-black px-2 py-1.5 font-mono text-lg font-bold tracking-wider last:border-b-0">{loja[index] ?? ''}</p>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="print-sheet rounded-none border border-black bg-white p-5 text-black">
            <p className="text-center text-2xl font-black">RELATÓRIO DE PLACAS</p>
            <p className="mt-1 text-center text-base font-bold">BATE FÍSICO {shift} {stamp}</p>
            <p className="mt-1 text-center text-sm">Bati Car · {date}</p>
            <p className="mt-4 text-center text-4xl font-black">{total}</p>
            <p className="text-center text-sm font-bold">carros no pátio</p>
            <section className="mt-8">
              <p className="mb-3 text-xl font-black">LOJA · {loja.length}</p>
              <div className="grid gap-2">
                {loja.map((value) => (
                  <p key={`big-loja-${value}`} className="border border-black px-3 py-3 text-center font-mono text-4xl font-black tracking-[0.18em]">{value}</p>
                ))}
                {loja.length === 0 && <p className="text-sm">Nenhuma placa.</p>}
              </div>
            </section>
            <section className="mt-8">
              <p className="mb-3 text-xl font-black">LAVA JATO · {lava.length}</p>
              <div className="grid gap-2">
                {lava.map((value) => (
                  <p key={`big-lava-${value}`} className="border border-black px-3 py-3 text-center font-mono text-4xl font-black tracking-[0.18em]">{value}</p>
                ))}
                {lava.length === 0 && <p className="text-sm">Nenhuma placa.</p>}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
