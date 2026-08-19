'use client'

import { useMemo, useState } from 'react'
import { Check, Copy, FileSpreadsheet, FileText, Share2, X } from 'lucide-react'
import { type Location, type Plate } from '@/lib/plates'

type View = 'loja' | 'visualizar'
type Shift = 'DIA' | 'NOITE'

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

function PlateCopyRow({
  value,
  copied,
  onCopy,
}: {
  value: string
  copied: boolean
  onCopy: (value: string) => void
}) {
  return (
    <li className={`flex items-center gap-2 rounded-xl border px-3 py-3 ${copied ? 'border-emerald-400 bg-emerald-50' : 'border-neutral-300 bg-white'}`}>
      <p className={`min-w-0 flex-1 font-mono text-[32px] font-bold leading-tight tracking-[0.12em] sm:text-[40px] ${copied ? 'text-emerald-700' : 'text-black'}`}>
        {value}
      </p>
      <button
        type="button"
        aria-label={copied ? `Placa ${value} já copiada` : `Copiar placa ${value}`}
        onClick={() => onCopy(value)}
        className={`no-print flex size-11 shrink-0 items-center justify-center rounded-xl ${copied ? 'bg-emerald-600 text-white' : 'bg-primary text-primary-foreground'}`}
      >
        {copied ? <Check size={18} /> : <Copy size={18} />}
      </button>
    </li>
  )
}

function downloadSheet(loja: string[], lava: string[], filename: string) {
  const max = Math.max(loja.length, lava.length, 1)
  const cells = (value: string, header = false) =>
    `<td style="border:1px solid #c7c7c7;padding:4px 8px;font-family:Calibri,Arial,Helvetica,sans-serif;font-size:${header ? 11 : 12}pt;font-weight:${header ? 700 : 400};color:#000">${value}</td>`

  const rows = [`<tr>${cells('LAVA JATO', true)}${cells('UNIDAS', true)}</tr>`]
  for (let index = 0; index < max; index += 1) {
    rows.push(`<tr>${cells(lava[index] ?? '')}${cells(loja[index] ?? '')}</tr>`)
  }

  const html = `\uFEFF<html><head><meta charset="UTF-8"></head><body><table>${rows.join('')}</table></body></html>`
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.xls`
  link.click()
  URL.revokeObjectURL(url)
}

export function ClosingReports({
  plates,
  onClose,
}: {
  plates: Record<Location, Plate[]>
  onClose: () => void
}) {
  const [shift, setShift] = useState<Shift>(() => (new Date().getHours() >= 18 ? 'NOITE' : 'DIA'))
  const [view, setView] = useState<View>('loja')
  const [copied, setCopied] = useState(false)
  const [copiedPlates, setCopiedPlates] = useState<Record<string, true>>({})
  const loja = useMemo(() => plateValues(plates.Loja), [plates.Loja])
  const lava = useMemo(() => plateValues(plates['Lava-jato']), [plates['Lava-jato']])
  const stamp = fileStamp()
  const maxRows = Math.max(loja.length, lava.length, 1)
  const title = `Bate físico ${shift} ${stamp}`
  const text = shareMessage(loja, lava, shift, stamp)

  async function share() {
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
    document.title = view === 'loja' ? title : `Relatório ${shift} ${stamp}`
    window.print()
    document.title = previous
  }

  async function copyList() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  async function copyPlate(value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedPlates((current) => ({ ...current, [value]: true }))
      return
    } catch {
      const input = document.createElement('textarea')
      input.value = value
      input.setAttribute('readonly', '')
      input.style.position = 'fixed'
      input.style.left = '-9999px'
      document.body.appendChild(input)
      input.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(input)
      if (ok) setCopiedPlates((current) => ({ ...current, [value]: true }))
    }
  }

  return (
    <div className="print-root fixed inset-0 z-[70] overflow-y-auto bg-[#f8f9fa]">
      <div className="no-print sticky top-0 z-10 border-b border-border bg-card px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold">Fechamento</p>
            <p className="text-xs text-muted-foreground">Dois relatórios: um para a loja e outro para você conferir e copiar.</p>
          </div>
          <button aria-label="Fechar" onClick={onClose} className="rounded-lg p-2 hover:bg-accent"><X size={18} /></button>
        </div>
        <div className="mx-auto mt-3 grid max-w-4xl grid-cols-2 gap-2">
          <button onClick={() => setView('loja')} className={`rounded-xl px-3 py-2 text-sm font-bold ${view === 'loja' ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>Bate físico</button>
          <button onClick={() => setView('visualizar')} className={`rounded-xl px-3 py-2 text-sm font-bold ${view === 'visualizar' ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>Ver placas</button>
        </div>
        <div className="mx-auto mt-2 flex max-w-4xl gap-2">
          <button onClick={() => setShift('DIA')} className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${shift === 'DIA' ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>Dia</button>
          <button onClick={() => setShift('NOITE')} className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${shift === 'NOITE' ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>Noite</button>
        </div>
        <div className="mx-auto mt-2 grid max-w-4xl grid-cols-2 gap-2 sm:grid-cols-4">
          <button onClick={() => void share()} className="flex items-center justify-center gap-1 rounded-xl border border-border py-3 text-xs font-bold"><Share2 size={15} /> Grupo</button>
          {view === 'loja' ? (
            <button onClick={() => downloadSheet(loja, lava, title)} className="flex items-center justify-center gap-1 rounded-xl border border-border py-3 text-xs font-bold"><FileSpreadsheet size={15} /> Excel</button>
          ) : (
            <button onClick={() => void copyList()} className="flex items-center justify-center gap-1 rounded-xl border border-border py-3 text-xs font-bold"><Copy size={15} /> {copied ? 'Copiado' : 'Copiar'}</button>
          )}
          <button onClick={printSheet} className="col-span-2 flex items-center justify-center gap-1 rounded-xl bg-primary py-3 text-xs font-bold text-primary-foreground sm:col-span-2"><FileText size={15} /> {view === 'loja' ? 'PDF da loja' : 'PDF grande'}</button>
        </div>
      </div>

      {view === 'loja' ? (
        <div className="mx-auto max-w-4xl overflow-x-auto px-2 py-4">
          <p className="no-print mb-2 px-1 text-sm font-semibold text-neutral-600">{title} — para mandar à loja</p>
          <table className="print-sheet w-full min-w-[420px] border-collapse bg-white text-black">
            <thead>
              <tr>
                <th className="w-10 border border-[#c7c7c7] bg-[#f8f9fa] py-1 text-[11px] font-medium text-neutral-500" />
                <th className="border border-[#c7c7c7] bg-[#f8f9fa] py-1 text-[11px] font-medium text-neutral-500">A</th>
                <th className="border border-[#c7c7c7] bg-[#f8f9fa] py-1 text-[11px] font-medium text-neutral-500">B</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-[#c7c7c7] bg-[#f8f9fa] text-center text-[11px] text-neutral-500">1</td>
                <td className="border border-[#c7c7c7] px-2 py-1 text-left text-[13px] font-bold">LAVA JATO</td>
                <td className="border border-[#c7c7c7] px-2 py-1 text-left text-[13px] font-bold">UNIDAS</td>
              </tr>
              {Array.from({ length: maxRows }).map((_, index) => (
                <tr key={`row-${index}`}>
                  <td className="border border-[#c7c7c7] bg-[#f8f9fa] text-center text-[11px] text-neutral-500">{index + 2}</td>
                  <td className="border border-[#c7c7c7] px-2 py-0.5 text-left font-sans text-[13px] leading-6 text-black">{lava[index] ?? ''}</td>
                  <td className="border border-[#c7c7c7] px-2 py-0.5 text-left font-sans text-[13px] leading-6 text-black">{loja[index] ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="print-report mx-auto max-w-4xl px-4 py-5">
          <p className="no-print mb-4 text-sm font-semibold text-neutral-600">Letras grandes para conferir e copiar no sistema</p>
          <p className="mb-5 text-lg font-bold text-black">{title}</p>
          <div className="grid gap-8 md:grid-cols-2">
            <section>
              <h3 className="mb-3 text-base font-bold tracking-wide text-black">LAVA JATO · {lava.length}</h3>
              <ul className="space-y-3">
                {lava.length === 0 && <li className="text-sm text-neutral-500">Nenhuma placa</li>}
                {lava.map((value) => (
                  <PlateCopyRow key={`lava-${value}`} value={value} copied={Boolean(copiedPlates[value])} onCopy={(plate) => void copyPlate(plate)} />
                ))}
              </ul>
            </section>
            <section>
              <h3 className="mb-3 text-base font-bold tracking-wide text-black">UNIDAS · {loja.length}</h3>
              <ul className="space-y-3">
                {loja.length === 0 && <li className="text-sm text-neutral-500">Nenhuma placa</li>}
                {loja.map((value) => (
                  <PlateCopyRow key={`loja-${value}`} value={value} copied={Boolean(copiedPlates[value])} onCopy={(plate) => void copyPlate(plate)} />
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
