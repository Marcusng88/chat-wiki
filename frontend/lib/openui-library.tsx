'use client'
import { createLibrary, defineComponent, useTriggerAction, type DefinedComponent, type Library } from '@openuidev/react-lang'
import { openuiChatLibrary, openuiChatComponentGroups } from '@openuidev/react-ui/genui-lib'
import { z } from 'zod'
import Markdown from '@/components/Markdown'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComp = DefinedComponent<any>

const allComps = Object.values(
  (openuiChatLibrary as unknown as { components: Record<string, AnyComp> }).components
)

// Swap built-in text renderers with our Markdown component (rehype-katex + cite handler)
const baseComponents = allComps.map((c): AnyComp => {
  if (c.name === 'TextContent') {
    return {
      ...c,
      component: ({ props }: { props: { text: string } }) => <Markdown md={props.text} />,
    } as AnyComp
  }
  if (c.name === 'MarkDownRenderer') {
    return {
      ...c,
      component: ({ props }: { props: { textMarkdown: string } }) => <Markdown md={props.textMarkdown} />,
    } as AnyComp
  }
  return c
})

// ── Shared style helpers ─────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  processing: 'var(--status-processing)',
  ready: 'var(--status-ready)',
  conflict: 'var(--status-conflict)',
}

const CIRCLES = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩']

// ── DocumentCard ─────────────────────────────────────────────────────────────

type DocCardProps = { title: string; status: 'processing' | 'ready' | 'conflict'; summary: string; topics: string[]; docId: string }

function DocumentCardRenderer({ props }: { props: DocCardProps }) {
  const triggerAction = useTriggerAction()
  const color = STATUS_COLORS[props.status] ?? 'var(--text-muted)'
  return (
    <div style={{ background: 'var(--surface-soft)', border: '1px solid var(--panel-border)', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14, flex: 1 }}>{props.title}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color, background: `color-mix(in srgb, ${color} 15%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 35%, transparent)`, borderRadius: 5, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>{props.status}</span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>{props.summary}</p>
      {props.topics.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {props.topics.map((t, i) => <span key={i} style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--accent-dim)', borderRadius: 4, padding: '2px 7px' }}>{t}</span>)}
        </div>
      )}
      <button onClick={() => triggerAction(`__cite__:${props.docId}`)} style={{ alignSelf: 'flex-start', marginTop: 2, fontSize: 12, fontWeight: 500, color: 'var(--accent)', background: 'var(--accent-dim)', border: '1px solid var(--accent-ring)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}>Open →</button>
    </div>
  )
}

const DocumentCard = defineComponent({
  name: 'DocumentCard',
  description: 'Shows a document with status badge, summary, topic tags, and an open action. Use after list_docs or search_documents instead of plain text listings.',
  props: z.object({ title: z.string(), status: z.enum(['processing', 'ready', 'conflict']), summary: z.string(), topics: z.array(z.string()), docId: z.string() }),
  component: DocumentCardRenderer,
})

// ── WikiSummaryCard ──────────────────────────────────────────────────────────

type WikiCardProps = { title: string; summary: string; topics: string[]; docId: string; hasConflict?: boolean }

function WikiSummaryCardRenderer({ props }: { props: WikiCardProps }) {
  const triggerAction = useTriggerAction()
  return (
    <div style={{ background: 'var(--surface-soft)', border: `1px solid ${props.hasConflict ? 'var(--status-conflict)' : 'var(--panel-border)'}`, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {props.hasConflict && (
        <div style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 7, padding: '7px 12px', fontSize: 12, color: 'var(--status-conflict)', fontWeight: 500 }}>⚠ Active conflicts — verify before relying on this summary.</div>
      )}
      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{props.title}</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}><Markdown md={props.summary} /></div>
      {props.topics.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {props.topics.map((t, i) => <span key={i} style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--accent-dim)', borderRadius: 4, padding: '2px 7px' }}>{t}</span>)}
        </div>
      )}
      <button onClick={() => triggerAction(`__cite__:${props.docId}`)} style={{ alignSelf: 'flex-start', fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', background: 'transparent', border: '1px solid var(--panel-border)', borderRadius: 5, padding: '3px 10px', cursor: 'pointer' }}>① View source</button>
    </div>
  )
}

const WikiSummaryCard = defineComponent({
  name: 'WikiSummaryCard',
  description: 'Shows a synthesized wiki summary with topics and citation link. Use after get_wiki_page instead of dumping raw wiki text.',
  props: z.object({ title: z.string(), summary: z.string(), topics: z.array(z.string()), docId: z.string(), hasConflict: z.boolean().optional() }),
  component: WikiSummaryCardRenderer,
})

// ── CitationCard ─────────────────────────────────────────────────────────────

type CiteCardProps = { index: number; docTitle: string; excerpt: string; docId: string }

function CitationCardRenderer({ props }: { props: CiteCardProps }) {
  const triggerAction = useTriggerAction()
  const circle = CIRCLES[(props.index ?? 1) - 1] ?? `(${props.index})`
  return (
    <button onClick={() => triggerAction(`__cite__:${props.docId}`)} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--surface-soft)', border: '1px solid var(--panel-border)', borderRadius: 8, padding: '9px 12px', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
      <span style={{ fontSize: 15, color: 'var(--accent)', flexShrink: 0, lineHeight: 1.5 }}>{circle}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{props.docTitle}</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{props.excerpt}</span>
      </div>
    </button>
  )
}

const CitationCard = defineComponent({
  name: 'CitationCard',
  description: 'Inline citation showing source doc name and excerpt. Richer than bare circled-number buttons. Place after the paragraph it annotates.',
  props: z.object({ index: z.number(), docTitle: z.string(), excerpt: z.string(), docId: z.string() }),
  component: CitationCardRenderer,
})

// ── KnowledgeGapCard ─────────────────────────────────────────────────────────

type GapCardProps = { query: string; suggestion: string; relatedTopics: string[] }

function KnowledgeGapCardRenderer({ props }: { props: GapCardProps }) {
  const triggerAction = useTriggerAction()
  return (
    <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.22)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 15 }}>🔍</span>
        <span style={{ fontWeight: 600, color: 'var(--status-processing)', fontSize: 14 }}>Nothing found for &ldquo;{props.query}&rdquo;</span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>{props.suggestion}</p>
      {props.relatedTopics.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Related in your library</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {props.relatedTopics.map((t, i) => <button key={i} onClick={() => triggerAction(t)} style={{ fontSize: 12, color: 'var(--accent)', background: 'var(--accent-dim)', border: '1px solid var(--accent-ring)', borderRadius: 5, padding: '3px 10px', cursor: 'pointer' }}>{t}</button>)}
          </div>
        </div>
      )}
    </div>
  )
}

const KnowledgeGapCard = defineComponent({
  name: 'KnowledgeGapCard',
  description: 'Shown when a query topic is not in the library. Never return empty results — always surface this. Lists related topics that ARE available as clickable suggestions.',
  props: z.object({ query: z.string(), suggestion: z.string(), relatedTopics: z.array(z.string()) }),
  component: KnowledgeGapCardRenderer,
})

// ── ConflictBanner ────────────────────────────────────────────────────────────

type ConflictProps = { doc1Title: string; doc2Title: string; conflictSummary: string; recommendation: string }

function ConflictBannerRenderer({ props }: { props: ConflictProps }) {
  const triggerAction = useTriggerAction()
  return (
    <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 15 }}>⚡</span>
        <span style={{ fontWeight: 700, color: 'var(--status-failed)', fontSize: 14 }}>Conflict Detected</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[props.doc1Title, props.doc2Title].map((title, i) => (
          <div key={i} style={{ background: 'var(--surface-recess)', borderRadius: 7, padding: '7px 10px', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{title}</div>
        ))}
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>{props.conflictSummary}</p>
      <div style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid var(--accent-ring)', borderRadius: 7, padding: '9px 12px', fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
        <span style={{ fontWeight: 600, color: 'var(--accent)' }}>Recommendation: </span>{props.recommendation}
      </div>
      <button onClick={() => triggerAction('Resolve this conflict')} style={{ alignSelf: 'flex-start', fontSize: 13, fontWeight: 600, color: '#fff', background: 'var(--status-conflict)', border: 'none', borderRadius: 7, padding: '6px 16px', cursor: 'pointer' }}>Resolve →</button>
    </div>
  )
}

const ConflictBanner = defineComponent({
  name: 'ConflictBanner',
  description: 'Shows a conflict between two documents with agent recommendation and resolve button. Use when has_conflict:true is detected, before calling resolve_conflict.',
  props: z.object({ doc1Title: z.string(), doc2Title: z.string(), conflictSummary: z.string(), recommendation: z.string() }),
  component: ConflictBannerRenderer,
})

// ── TopicCluster ──────────────────────────────────────────────────────────────

type TopicClusterProps = { clusters: { topic: string; count: number; docs: string[] }[] }

function TopicClusterRenderer({ props }: { props: TopicClusterProps }) {
  const triggerAction = useTriggerAction()
  const sorted = [...props.clusters].sort((a, b) => b.count - a.count)
  const total = sorted.reduce((s, c) => s + c.count, 0)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.04em' }}>{props.clusters.length} topics · {total} documents</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {sorted.map((cluster, i) => {
          const big = cluster.count >= 4
          return (
            <button key={i} onClick={() => triggerAction(`Show documents about ${cluster.topic}`)} title={cluster.docs.join(', ')} style={{ fontSize: big ? 13 : 12, color: 'var(--accent)', background: 'var(--accent-dim)', border: '1px solid var(--accent-ring)', borderRadius: 6, padding: big ? '4px 13px' : '3px 9px', cursor: 'pointer', fontWeight: big ? 600 : 400, display: 'flex', alignItems: 'center', gap: 5 }}>
              {cluster.topic}<span style={{ fontSize: 10, opacity: 0.65 }}>×{cluster.count}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const TopicCluster = defineComponent({
  name: 'TopicCluster',
  description: 'Shows topic coverage across library docs as clickable tags sized by doc count. Use for knowledge-map queries like "what topics do my docs cover?".',
  props: z.object({ clusters: z.array(z.object({ topic: z.string(), count: z.number(), docs: z.array(z.string()) })) }),
  component: TopicClusterRenderer,
})

// ── ComparisonView ────────────────────────────────────────────────────────────

type ComparisonProps = { doc1: { title: string; points: string[] }; doc2: { title: string; points: string[] }; verdict: string }

function ComparisonViewRenderer({ props }: { props: ComparisonProps }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[props.doc1, props.doc2].map((doc, i) => (
          <div key={i} style={{ background: 'var(--surface-soft)', border: '1px solid var(--panel-border)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', paddingBottom: 8, borderBottom: '1px solid var(--panel-border)' }}>{doc.title}</div>
            <ul style={{ margin: 0, padding: '0 0 0 15px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {doc.points.map((pt, j) => <li key={j} style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{pt}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <div style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid var(--accent-ring)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
        <span style={{ fontWeight: 600, color: 'var(--accent)' }}>Verdict: </span>{props.verdict}
      </div>
    </div>
  )
}

const ComparisonView = defineComponent({
  name: 'ComparisonView',
  description: 'Side-by-side comparison of two documents with key points and agent verdict. Use for "compare X vs Y" queries.',
  props: z.object({ doc1: z.object({ title: z.string(), points: z.array(z.string()) }), doc2: z.object({ title: z.string(), points: z.array(z.string()) }), verdict: z.string() }),
  component: ComparisonViewRenderer,
})

// ── ChunkEvidence ─────────────────────────────────────────────────────────────

type ChunkProps = { text: string; docTitle: string; section?: string; relevanceScore?: number }

function ChunkEvidenceRenderer({ props }: { props: ChunkProps }) {
  const score = props.relevanceScore
  const scoreColor = score === undefined ? 'var(--text-muted)' : score >= 0.8 ? 'var(--status-ready)' : score >= 0.6 ? 'var(--status-processing)' : 'var(--text-muted)'
  return (
    <div style={{ background: 'var(--surface-recess)', border: '1px solid var(--panel-border)', borderLeft: '3px solid var(--accent)', borderRadius: '0 8px 8px 0', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <blockquote style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.65, fontStyle: 'italic' }}>{props.text}</blockquote>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{props.docTitle}</span>
          {props.section && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· {props.section}</span>}
        </div>
        {score !== undefined && <span style={{ fontSize: 10, color: scoreColor, fontWeight: 500 }}>{Math.round(score * 100)}% match</span>}
      </div>
    </div>
  )
}

const ChunkEvidence = defineComponent({
  name: 'ChunkEvidence',
  description: 'Raw source passage from search_chunks as a quoted evidence block with relevance score. Use for "exact quote" or "show source" queries.',
  props: z.object({ text: z.string(), docTitle: z.string(), section: z.string().optional(), relevanceScore: z.number().optional() }),
  component: ChunkEvidenceRenderer,
})

// ── Assemble library ──────────────────────────────────────────────────────────

const domainComponents: AnyComp[] = [
  DocumentCard,
  WikiSummaryCard,
  CitationCard,
  KnowledgeGapCard,
  ConflictBanner,
  TopicCluster,
  ComparisonView,
  ChunkEvidence,
]

export const customChatLibrary: Library = createLibrary({
  root: 'Card',
  componentGroups: openuiChatComponentGroups,
  components: [...baseComponents, ...domainComponents],
})
