'use client'

interface Props {
  component: string
  data: Record<string, unknown>
}

// ── per-component views ───────────────────────────────────────────────────────

function WikiCardView({ data }: { data: Record<string, unknown> }) {
  const topics = (data.topics as string[]) ?? []
  return (
    <div className="a2ui-card">
      <div className="a2ui-head">
        <span>wiki</span>
        <span className="schema">{data.title as string}</span>
      </div>
      <div className="a2ui-body">
        {topics.length > 0 && (
          <div className="a2ui-tags">
            {topics.map((t) => <span key={t} className="a2ui-tag">{t}</span>)}
          </div>
        )}
        <div className="a2ui-md">{data.content as string}</div>
      </div>
    </div>
  )
}

function KnowledgePanelView({ data }: { data: Record<string, unknown> }) {
  const sources = (data.sources as Array<{ title: string; snippet: string; doc_id: string }>) ?? []
  return (
    <div className="a2ui-card">
      <div className="a2ui-head">
        <span>answer</span>
        <span className="schema">{data.query as string}</span>
      </div>
      <div className="a2ui-body">
        <div className="a2ui-md">{data.answer_md as string}</div>
        {sources.length > 0 && (
          <div className="a2ui-sources">
            {sources.map((s) => (
              <div key={s.doc_id} className="a2ui-source-row">
                <span className="a2ui-source-title">{s.title}</span>
                <span className="a2ui-source-snippet">{s.snippet}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SourceBlockView({ data }: { data: Record<string, unknown> }) {
  const pageRef = data.page_ref as string | null | undefined
  const score = data.relevance_score as number | null | undefined
  return (
    <div className="a2ui-card">
      <div className="a2ui-head">
        <span>source</span>
        <span className="schema">{data.doc_title as string}</span>
      </div>
      <div className="a2ui-body">
        <blockquote className="a2ui-quote">{data.excerpt as string}</blockquote>
        {pageRef && <span className="a2ui-meta">{pageRef}</span>}
        {score != null && (
          <span className="a2ui-meta">similarity {(score * 100).toFixed(0)}%</span>
        )}
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
        {entries.map((e) => (
          <div key={e.doc_id} className="a2ui-compare-row">
            <div className="a2ui-compare-header">
              <span className="a2ui-source-title">{e.title}</span>
              <span className={`a2ui-role a2ui-role-${e.role}`}>{e.role}</span>
            </div>
            <span className="a2ui-source-snippet">{e.excerpt}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TopicMapView({ data }: { data: Record<string, unknown> }) {
  const topics = (data.topics as Array<{ label: string; doc_count: number }>) ?? []
  const highlighted = data.highlighted_topic as string | undefined
  return (
    <div className="a2ui-card">
      <div className="a2ui-head"><span>topics</span></div>
      <div className="a2ui-body">
        <div className="a2ui-tags">
          {topics.map((t) => (
            <span
              key={t.label}
              className={`a2ui-tag${t.label === highlighted ? ' a2ui-tag-hl' : ''}`}
            >
              {t.label} <span className="a2ui-tag-count">{t.doc_count}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function DocStatusBoardView({ data }: { data: Record<string, unknown> }) {
  const docs = (data.docs as Array<{ title: string; status: string; file_type: string }>) ?? []
  return (
    <div className="a2ui-card">
      <div className="a2ui-head"><span>library status</span></div>
      <div className="a2ui-body">
        {docs.map((d, i) => (
          <div key={i} className="a2ui-compare-row">
            <div className="a2ui-compare-header">
              <span className="a2ui-source-title">{d.title}</span>
              <span className={`a2ui-role a2ui-role-${d.status.startsWith('failed') ? 'conflicting' : d.status === 'ready' ? 'current' : 'outdated'}`}>
                {d.status}
              </span>
            </div>
            <span className="a2ui-meta">{d.file_type}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── dispatcher ────────────────────────────────────────────────────────────────

export default function A2UIRenderer({ component, data }: Props) {
  switch (component) {
    case 'WikiCard':       return <WikiCardView data={data} />
    case 'KnowledgePanel': return <KnowledgePanelView data={data} />
    case 'SourceBlock':    return <SourceBlockView data={data} />
    case 'DocCompare':     return <DocCompareView data={data} />
    case 'TopicMap':       return <TopicMapView data={data} />
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
