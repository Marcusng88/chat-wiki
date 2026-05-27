'use client'
import Markdown from './Markdown'

interface Props {
  component: string
  data: Record<string, unknown>
  onOpenDoc?: (docId: string) => void
  onQuery?: (text: string) => void
}

function WikiCardView({ data, onOpenDoc }: { data: Record<string, unknown>; onOpenDoc?: (id: string) => void }) {
  const topics = (data.topics as string[]) ?? []
  const docId = data.doc_id as string | undefined
  const createdAt = data.created_at as string | undefined
  return (
    <div className="a2ui-card">
      <div className="a2ui-head">
        <span>wiki</span>
        <span className="schema">{data.title as string}</span>
      </div>
      <div className="a2ui-body">
        <div className="wiki-card-meta">
          {createdAt && <span className="wiki-card-date">{createdAt}</span>}
          {docId && onOpenDoc && (
            <button className="wiki-card-open" onClick={() => onOpenDoc(docId)}>open ↗</button>
          )}
        </div>
        <div className="wiki-card-body">{data.content as string}</div>
        {topics.length > 0 && (
          <div className="wiki-card-topics">
            {topics.map((t, i) => <span key={`${t}-${i}`} className="wiki-card-topic">{t}</span>)}
          </div>
        )}
      </div>
    </div>
  )
}

function KnowledgePanelView({ data, onOpenDoc }: { data: Record<string, unknown>; onOpenDoc?: (id: string) => void }) {
  const sources = (data.sources as Array<{ title: string; snippet: string; doc_id: string }>) ?? []
  return (
    <div className="a2ui-card">
      <div className="a2ui-head">
        <span>answer</span>
        <span className="schema">{data.query as string}</span>
      </div>
      <div className="a2ui-body">
        <div className="kp-answer">
          <Markdown md={(data.answer_md as string) ?? ''} onCite={() => {}} />
        </div>
        {sources.length > 0 && (
          <>
            <div className="kp-sources-label">sources</div>
            {sources.map((s) => (
              <div
                key={s.doc_id}
                className={`kp-source-row${onOpenDoc ? '' : ' no-action'}`}
                onClick={() => onOpenDoc?.(s.doc_id)}
              >
                <span className="kp-source-title">{s.title}</span>
                <span className="kp-source-snippet">{s.snippet}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function SourceBlockView({ data, onOpenDoc }: { data: Record<string, unknown>; onOpenDoc?: (id: string) => void }) {
  const pageRef = data.page_ref as string | null | undefined
  const score = data.relevance_score as number | null | undefined
  const docId = data.doc_id as string | undefined
  return (
    <div className="a2ui-card">
      <div className="a2ui-head">
        <span>source</span>
        <span className="schema">{data.doc_title as string}</span>
        {docId && onOpenDoc && (
          <button className="sb-open" onClick={() => onOpenDoc(docId)}>open ↗</button>
        )}
      </div>
      <div className="a2ui-body">
        <blockquote className="sb-quote">{data.excerpt as string}</blockquote>
        <div className="sb-meta-row">
          {pageRef && <span className="sb-meta">{pageRef}</span>}
          {score != null && (
            <div className="sb-score-wrap">
              <div className="sb-score-bar-track">
                <div className="sb-score-bar-fill" style={{ width: `${(score * 100).toFixed(0)}%` }} />
              </div>
              <span className="sb-score-label">{(score * 100).toFixed(0)}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DocCompareView({ data }: { data: Record<string, unknown> }) {
  const entries = (data.entries as Array<{ doc_id: string; title: string; excerpt: string; role: string }>) ?? []
  return (
    <div className="a2ui-card">
      <div className="a2ui-head">
        <span>compare</span>
        <span className="schema">{data.topic as string}</span>
      </div>
      <div className="a2ui-body">
        <div className={`dc-grid${entries.length === 1 ? ' dc-single' : ''}`}>
          {entries.map((e) => (
            <div key={e.doc_id} className="dc-entry">
              <div className="dc-entry-header">
                <span className="dc-title">{e.title}</span>
                <span className={`dc-role dc-role-${e.role}`}>{e.role}</span>
              </div>
              <span className="dc-excerpt">{e.excerpt}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TopicMapView({ data, onQuery }: { data: Record<string, unknown>; onQuery?: (text: string) => void }) {
  const topics = (data.topics as Array<{ label: string; doc_count: number }>) ?? []
  const highlighted = data.highlighted_topic as string | undefined
  return (
    <div className="a2ui-card">
      <div className="a2ui-head"><span>topics</span></div>
      <div className="a2ui-body">
        <div className="tm-cloud">
          {topics.map((t, i) => (
            <span
              key={`${t.label}-${i}`}
              className={`tm-chip${onQuery ? ' tm-clickable' : ''}${t.label === highlighted ? ' tm-hl' : ''}`}
              onClick={() => onQuery?.(`show me documents about ${t.label}`)}
            >
              <span className="tm-label">{t.label}</span>
              <span className="tm-count">{t.doc_count}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function DocStatusBoardView({ data }: { data: Record<string, unknown> }) {
  const docs = (data.docs as Array<{ title: string; status: string; file_type: string }>) ?? []
  const dotClass = (s: string) => s === 'ready' ? 'dsb-dot-ready' : s.startsWith('failed') ? 'dsb-dot-failed' : 'dsb-dot-processing'
  const statusClass = (s: string) => s === 'ready' ? 'dsb-status-ready' : s.startsWith('failed') ? 'dsb-status-failed' : 'dsb-status-processing'
  return (
    <div className="a2ui-card">
      <div className="a2ui-head"><span>library status</span></div>
      <div className="a2ui-body">
        {docs.map((d, i) => (
          <div key={i} className="dsb-row">
            <span className={`dsb-dot ${dotClass(d.status)}`} />
            <span className="dsb-title">{d.title}</span>
            <span className="dsb-type">{d.file_type}</span>
            <span className={`dsb-status ${statusClass(d.status)}`}>{d.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function A2UIRenderer({ component, data, onOpenDoc, onQuery }: Props) {
  switch (component) {
    case 'WikiCard':       return <WikiCardView data={data} onOpenDoc={onOpenDoc} />
    case 'KnowledgePanel': return <KnowledgePanelView data={data} onOpenDoc={onOpenDoc} />
    case 'SourceBlock':    return <SourceBlockView data={data} onOpenDoc={onOpenDoc} />
    case 'DocCompare':     return <DocCompareView data={data} />
    case 'TopicMap':       return <TopicMapView data={data} onQuery={onQuery} />
    case 'DocStatusBoard': return <DocStatusBoardView data={data} />
    default:
      return (
        <div className="a2ui-card">
          <div className="a2ui-head"><span>{component}</span></div>
          <pre className="a2ui-body" style={{ fontSize: 11, whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )
  }
}
