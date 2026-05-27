'use client'
import type { ReactElement } from 'react'
import type { MessageSource } from '@/lib/types'

type InlineOut = Array<string | ReactElement>

function renderInline(text: string, onCite: (idx: number) => void, sources?: MessageSource[]): InlineOut {
  const out: InlineOut = []
  const re = /\[\[(\d+)\]\]\(#s(\d+)\)|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*/g
  let last = 0
  let m: RegExpExecArray | null
  let key = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[1]) {
      const idx = parseInt(m[2])
      const src = (sources ?? []).find((s) => s.idx === idx)
      const tip = src ? `from ${src.name} — click to open` : `source ${idx}`
      out.push(
        <span key={key++} className="cite" onClick={() => onCite(idx)} title={tip} aria-label={tip}>
          {m[1]}
        </span>
      )
    } else if (m[3]) {
      out.push(<code key={key++}>{m[3]}</code>)
    } else if (m[4]) {
      out.push(<strong key={key++}>{m[4]}</strong>)
    } else if (m[5]) {
      out.push(<em key={key++}>{m[5]}</em>)
    }
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

interface Block {
  t: 'h1' | 'h2' | 'h3' | 'hr' | 'quote' | 'ul' | 'p'
  c?: string | string[]
}

interface Props {
  md: string
  onCite?: (idx: number) => void
  sources?: MessageSource[]
}

export default function Markdown({ md, onCite, sources }: Props) {
  const cite = onCite ?? (() => {})
  const lines = md.split('\n')
  const blocks: Block[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (/^### /.test(line)) { blocks.push({ t: 'h3', c: line.slice(4) }); i++; continue }
    if (/^## /.test(line))  { blocks.push({ t: 'h2', c: line.slice(3) }); i++; continue }
    if (/^# /.test(line))   { blocks.push({ t: 'h1', c: line.slice(2) }); i++; continue }
    if (/^---+\s*$/.test(line)) { blocks.push({ t: 'hr' }); i++; continue }
    if (/^> /.test(line)) {
      const buf: string[] = []
      while (i < lines.length && /^> /.test(lines[i])) { buf.push(lines[i].replace(/^> /, '')); i++ }
      blocks.push({ t: 'quote', c: buf.join(' ') }); continue
    }
    if (/^[-*] /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*] /.test(lines[i])) { items.push(lines[i].replace(/^[-*] /, '')); i++ }
      blocks.push({ t: 'ul', c: items }); continue
    }
    if (line.trim() === '') { i++; continue }
    const buf: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(#{1,3} |---+\s*$|> |[-*] )/.test(lines[i])
    ) {
      buf.push(lines[i]); i++
    }
    blocks.push({ t: 'p', c: buf.join(' ') })
  }

  return (
    <div className="md">
      {blocks.map((b, k) => {
        const bk = `${b.t}-${k}`
        if (b.t === 'hr') return <hr key={bk} />
        if (b.t === 'h1') return <h1 key={bk}>{renderInline(b.c as string, cite, sources)}</h1>
        if (b.t === 'h2') return <h2 key={bk}>{renderInline(b.c as string, cite, sources)}</h2>
        if (b.t === 'h3') return <h3 key={bk}>{renderInline(b.c as string, cite, sources)}</h3>
        if (b.t === 'quote') return <blockquote key={bk}>{renderInline(b.c as string, cite, sources)}</blockquote>
        if (b.t === 'ul') return (
          <ul key={bk}>
            {(b.c as string[]).map((it, j) => <li key={`${bk}-${j}`}>{renderInline(it, cite, sources)}</li>)}
          </ul>
        )
        return <p key={bk}>{renderInline(b.c as string, cite, sources)}</p>
      })}
    </div>
  )
}
