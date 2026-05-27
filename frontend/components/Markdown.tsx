'use client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import type { Components } from 'react-markdown'
import type { MessageSource } from '@/lib/types'

interface Props {
  md: string
  onCite?: (idx: number) => void
  sources?: MessageSource[]
}

export default function Markdown({ md, onCite, sources }: Props) {
  const cite = onCite ?? (() => {})

  const components: Components = {
    a({ href, children }) {
      // Citation links rendered by agent: [[1]](#s1)
      const m = href?.match(/^#s(\d+)$/)
      if (m) {
        const idx = parseInt(m[1])
        const src = (sources ?? []).find((s) => s.idx === idx)
        const tip = src ? `from ${src.name} — click to open` : `source ${idx}`
        return (
          <span
            className="cite"
            onClick={() => cite(idx)}
            title={tip}
            aria-label={tip}
            role="button"
          >
            {children}
          </span>
        )
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      )
    },

    pre({ children }) {
      // Extract language label from child code className
      const codeEl = children as React.ReactElement<{ className?: string }>
      const cls = codeEl?.props?.className ?? ''
      const lang = cls.replace(/language-/, '').replace(/\s.*/, '') || null
      return (
        <div className="code-block-wrap">
          {lang && <span className="code-lang">{lang}</span>}
          <pre>{children}</pre>
        </div>
      )
    },
  }

  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={components}
      >
        {md}
      </ReactMarkdown>
    </div>
  )
}
