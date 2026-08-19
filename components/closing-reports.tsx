'use client'

import { useMemo, useState } from 'react'
import { FileSpreadsheet, FileText, Share2, X } from 'lucide-react'
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

function downloadSheet(loja: string[], lava: string[], filename: string) {
  const max = Math.max(loja.length, lava.length, 1)
  const cells = (value: string, header = false) =>
    `<td style="border:1px solid #c7c7c7;padding:10px 8px;font-family:Arial,Helvetica,sans-serif;font-size:${header ? 22 : 28}px;font-weight:700;letter-spacing:${header ? 0 : 2}px;color:#000">${value}</td>`

  const rows = [
    `<tr>${cells('LAVA JATO', true)}${cells('UNIDAS', true)}</tr>`,
    `<tr>${cells('')}${cells('')}</tr>`,
  ]
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
  const [shift, setShift] = useState<'DIA' | 'NOITE'>(() => (new Date().getHours() >= 18 ? 'NOITE' : 'DIA'))
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
    document.title = title
    window.print()
    document.title = previous
  }

  return (
    <div className="print-root fixed inset-0 z-[70] overflow-y-auto bg-[#f8f9fa]">
      <div className="no-print sticky top-0 z-10 border-b border-border bg-card px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold">Área do PDF / planilha</p>
            <p className="text-xs text-muted-foreground">Igual à planilha da loja: LAVA JATO e UNIDAS, com letras grandes para conferir e digitar depois</p>
          </div>
          <button aria-label="Fechar" onClick={onClose} className="rounded-lg p-2 hover:bg-accent"><X size={18} /></button>
        </div>
        <div className="mx-auto mt-3 flex max-w-4xl gap-2">
          <button onClick={() => setShift('DIA')} className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${shift === 'DIA' ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>Dia</button>
          <button onClick={() => setShift('NOITE')} className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${shift === 'NOITE' ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>Noite</button>
        </div>
        <div className="mx-auto mt-2 grid max-w-4xl grid-cols-3 gap-2">
          <button onClick={() => void share()} className="flex items-center justify-center gap-1 rounded-xl border border-border py-3 text-xs font-bold"><Share2 size={15} /> Grupo</button>
          <button onClick={() => downloadSheet(loja, lava, title)} className="flex items-center justify-center gap-1 rounded-xl border border-border py-3 text-xs font-bold"><FileSpreadsheet size={15} /> Excel</button>
          <button onClick={printSheet} className="flex items-center justify-center gap-1 rounded-xl bg-primary py-3 text-xs font-bold text-primary-foreground"><FileText size={15} /> PDF</button>
        </div>
      </div>

      <div className="mx-auto max-w-4xl overflow-x-auto px-2 py-4">
        <p className="no-print mb-2 px-1 text-sm font-semibold text-neutral-600">{title}.xlsx</p>
        <table className="print-sheet w-full min-w-[520px] border-collapse bg-white text-black">
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
              <td className="border border-[#c7c7c7] px-3 py-3 text-left font-sans text-[26px] font-bold tracking-tight">LAVA JATO</td>
              <td className="border border-[#c7c7c7] px-3 py-3 text-left font-sans text-[26px] font-bold tracking-tight">UNIDAS</td>
            </tr>
            <tr>
              <td className="border border-[#c7c7c7] bg-[#f8f9fa] text-center text-[11px] text-neutral-500">2</td>
              <td className="border border-[#c7c7c7] h-10" />
              <td className="border border-[#c7c7c7]" />
            </tr>
            {Array.from({ length: maxRows }).map((_, index) => (
              <tr key={`row-${index}`}>
                <td className="border border-[#c7c7c7] bg-[#f8f9fa] text-center text-[11px] text-neutral-500">{index + 3}</td>
                <td className="border border-[#c7c7c7] px-3 py-3 text-left font-sans text-[32px] font-bold leading-none tracking-[0.14em] text-black">{lava[index] ?? ''}</td>
                <td className="border border-[#c7c7c7] px-3 py-3 text-left font-sans text-[32px] font-bold leading-none tracking-[0.14em] text-black">{loja[index] ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
