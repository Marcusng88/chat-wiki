'use client'
import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { createLibrary, defineComponent, useTriggerAction, useIsStreaming, type DefinedComponent, type Library } from '@openuidev/react-lang'
import { openuiChatLibrary, openuiChatComponentGroups } from '@openuidev/react-ui/genui-lib'
import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { ChevronRight } from 'lucide-react'
import { z } from 'zod'
import Markdown from '@/components/Markdown'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComp = DefinedComponent<any>

const allComps = Object.values(
  (openuiChatLibrary as unknown as { components: Record<string, AnyComp> }).components
)

// Fixed SectionBlock — same logic as OpenUI built-in but trigger uses <span> not <button>
// (built-in puts IconButton/<button> inside AccordionTrigger/<button> → nested button error)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SBProps = { props: { sections?: any[]; isFoldable?: boolean }; renderNode: (v: unknown) => ReactNode }

function SectionBlockFixed({ props, renderNode }: SBProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = props.sections ?? []
  const isFoldable = props.isFoldable !== false
  const isStreaming = useIsStreaming()
  const firstItemValue = items[0]?.props?.value
  const [openItems, setOpenItems] = useState<string[]>([])
  const userSelected = useRef(false)
  const prevLengthRef = useRef(0)
  const prevIsStreaming = useRef(isStreaming)

  useEffect(() => {
    if (items.length === 0) return
    if (isStreaming && items.length > prevLengthRef.current && !userSelected.current) {
      const last = items[items.length - 1]
      const lastValue = last?.props?.value
      if (lastValue) setOpenItems(prev => prev.includes(lastValue) ? prev : [...prev, lastValue])
    } else {
      setOpenItems(prev => prev.length === 0 && firstItemValue ? [firstItemValue] : prev)
    }
    prevLengthRef.current = items.length
  }, [items.length, isStreaming, firstItemValue])

  useEffect(() => {
    if (prevIsStreaming.current && !isStreaming && !userSelected.current && items.length > 0) {
      setOpenItems(firstItemValue ? [firstItemValue] : [])
    }
    prevIsStreaming.current = isStreaming
    // intentionally omit firstItemValue/items.length — mirrors official OpenUI impl
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStreaming])

  const handleValueChange = useCallback((value: string[]) => {
    userSelected.current = true
    setOpenItems(value ?? [])
  }, [])

  if (!isFoldable) {
    return (
      <>
        {items.map((item, index) => (
          <div key={index} className="openui-section-v2">
            <div className="openui-section-v2-wrapper">
              <div role="separator" style={{ height: 1, background: 'currentColor', opacity: 0.15 }} />
              <div className="openui-section-v2-header">
                <div className="openui-section-v2-header-trigger">{String(item?.props?.trigger ?? '')}</div>
              </div>
              <div className="openui-section-v2-content">{renderNode(item?.props?.content)}</div>
            </div>
          </div>
        ))}
      </>
    )
  }

  return (
    <AccordionPrimitive.Root
      type="multiple"
      value={openItems}
      onValueChange={handleValueChange}
      className="openui-foldable-section-root"
    >
      {items.map((item, index) => (
        <AccordionPrimitive.Item key={index} value={String(item?.props?.value ?? index)} className="openui-foldable-section-item">
          <AccordionPrimitive.Header className="openui-foldable-section-header">
            <AccordionPrimitive.Trigger className="openui-foldable-section-trigger">
              <div className="openui-foldable-section-trigger-content-wrapper">
                <div role="separator" className="openui-foldable-section-trigger-content-separator" style={{ height: 1, background: 'currentColor', opacity: 0.15 }} />
                <div className="openui-foldable-section-trigger-content-icon-button-wrapper">
                  <span className="openui-foldable-section-trigger-content-icon-button" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ChevronRight size={12} className="openui-foldable-section-trigger-content-icon-button-icon" />
                  </span>
                  <div className="openui-foldable-section-trigger-content-text">{String(item?.props?.trigger ?? '')}</div>
                </div>
              </div>
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content className="openui-foldable-section-content">
            {renderNode(item?.props?.content)}
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  )
}

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
  if (c.name === 'SectionBlock') {
    return { ...c, component: SectionBlockFixed } as AnyComp
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

// ── Shared trend helpers ──────────────────────────────────────────────────────

const TREND_ICONS: Record<string, string> = { up: '↑', down: '↓', neutral: '→' }
const TREND_COLORS: Record<string, string> = { up: 'var(--status-ready)', down: 'var(--status-failed)', neutral: 'var(--text-muted)' }

// ── MetricCard ────────────────────────────────────────────────────────────────

type MetricCardProps = { label: string; value: string; delta?: string; trend?: 'up' | 'down' | 'neutral'; unit?: string }

function MetricCardRenderer({ props }: { props: MetricCardProps }) {
  const trendColor = props.trend ? TREND_COLORS[props.trend] : 'var(--text-muted)'
  const trendIcon = props.trend ? TREND_ICONS[props.trend] : ''
  return (
    <div style={{ background: 'var(--surface-soft)', border: '1px solid var(--panel-border)', borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{props.label}</span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{props.value}</span>
        {props.unit && <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{props.unit}</span>}
      </div>
      {props.delta && (
        <span style={{ fontSize: 12, color: trendColor, fontWeight: 600 }}>{trendIcon} {props.delta}</span>
      )}
    </div>
  )
}

const MetricCard = defineComponent({
  name: 'MetricCard',
  description: 'Single KPI card with big value, label, optional delta and trend. Use for financial metrics, research stats, or any key number extracted from documents.',
  props: z.object({ label: z.string(), value: z.string(), delta: z.string().optional(), trend: z.enum(['up', 'down', 'neutral']).optional(), unit: z.string().optional() }),
  component: MetricCardRenderer,
})

// ── StatGrid ──────────────────────────────────────────────────────────────────

type StatGridItem = { label: string; value: string; delta?: string; trend?: 'up' | 'down' | 'neutral'; unit?: string }
type StatGridProps = { metrics: StatGridItem[]; columns?: 2 | 3 }

function StatGridRenderer({ props }: { props: StatGridProps }) {
  const cols = props.columns ?? (props.metrics.length >= 3 ? 3 : 2)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10 }}>
      {props.metrics.map((m, i) => {
        const trendColor = m.trend ? TREND_COLORS[m.trend] : 'var(--text-muted)'
        const trendIcon = m.trend ? TREND_ICONS[m.trend] : ''
        return (
          <div key={i} style={{ background: 'var(--surface-soft)', border: '1px solid var(--panel-border)', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{m.value}</span>
              {m.unit && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{m.unit}</span>}
            </div>
            {m.delta && <span style={{ fontSize: 11, color: trendColor, fontWeight: 600 }}>{trendIcon} {m.delta}</span>}
          </div>
        )
      })}
    </div>
  )
}

const StatGrid = defineComponent({
  name: 'StatGrid',
  description: 'Grid of 2–3 column KPI metrics. Use for multi-metric dashboards from financial, research, or analytics documents. Each metric has value, label, optional delta and trend.',
  props: z.object({
    metrics: z.array(z.object({ label: z.string(), value: z.string(), delta: z.string().optional(), trend: z.enum(['up', 'down', 'neutral']).optional(), unit: z.string().optional() })),
    columns: z.union([z.literal(2), z.literal(3)]).optional(),
  }),
  component: StatGridRenderer,
})

// ── Timeline ──────────────────────────────────────────────────────────────────

type TimelineEvent = { date: string; title: string; description?: string; status?: 'done' | 'active' | 'pending' }
type TimelineProps = { events: TimelineEvent[] }

const EVENT_DOT_COLORS: Record<string, string> = { done: 'var(--status-ready)', active: 'var(--accent)', pending: 'var(--text-muted)' }

function TimelineRenderer({ props }: { props: TimelineProps }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingLeft: 8 }}>
      {props.events.map((ev, i) => {
        const dotColor = ev.status ? EVENT_DOT_COLORS[ev.status] : 'var(--accent)'
        const isLast = i === props.events.length - 1
        return (
          <div key={i} style={{ display: 'flex', gap: 14, position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: dotColor, border: `2px solid color-mix(in srgb, ${dotColor} 40%, transparent)`, flexShrink: 0, marginTop: 4 }} />
              {!isLast && <div style={{ width: 2, flex: 1, background: 'var(--panel-border)', minHeight: 20, marginTop: 2 }} />}
            </div>
            <div style={{ paddingBottom: isLast ? 0 : 16, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'monospace', background: 'var(--surface-recess)', borderRadius: 4, padding: '1px 6px', border: '1px solid var(--panel-border)', flexShrink: 0 }}>{ev.date}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{ev.title}</span>
              </div>
              {ev.description && <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{ev.description}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const Timeline = defineComponent({
  name: 'Timeline',
  description: 'Chronological event list with date badges, status dots and descriptions. Use for history docs, research evolution, version timelines, or any "what happened when" query.',
  props: z.object({
    events: z.array(z.object({ date: z.string(), title: z.string(), description: z.string().optional(), status: z.enum(['done', 'active', 'pending']).optional() })),
  }),
  component: TimelineRenderer,
})

// ── QuoteBlock ────────────────────────────────────────────────────────────────

type QuoteBlockProps = { text: string; author: string; role?: string; docTitle?: string; docId?: string }

function QuoteBlockRenderer({ props }: { props: QuoteBlockProps }) {
  const triggerAction = useTriggerAction()
  return (
    <div style={{ borderLeft: '3px solid var(--accent)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--surface-recess)', borderRadius: '0 10px 10px 0' }}>
      <span style={{ fontSize: 36, lineHeight: 1, color: 'var(--accent)', opacity: 0.4, fontFamily: 'Georgia, serif', marginBottom: -8 }}>&ldquo;</span>
      <blockquote style={{ margin: 0, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.7, fontStyle: 'italic' }}>{props.text}</blockquote>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>— {props.author}</span>
          {props.role && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{props.role}</span>}
        </div>
        {props.docTitle && props.docId && (
          <button onClick={() => triggerAction(`__cite__:${props.docId}`)} style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--accent-dim)', border: '1px solid var(--accent-ring)', borderRadius: 5, padding: '2px 9px', cursor: 'pointer' }}>
            {props.docTitle} ↗
          </button>
        )}
      </div>
    </div>
  )
}

const QuoteBlock = defineComponent({
  name: 'QuoteBlock',
  description: 'Styled pull quote with large quotation marks, author attribution, optional role and source doc link. Use for notable quotes from research papers, books, legal docs, or expert statements.',
  props: z.object({ text: z.string(), author: z.string(), role: z.string().optional(), docTitle: z.string().optional(), docId: z.string().optional() }),
  component: QuoteBlockRenderer,
})

// ── GlossaryBlock ─────────────────────────────────────────────────────────────

type GlossaryTerm = { term: string; definition: string; category?: string }
type GlossaryBlockProps = { terms: GlossaryTerm[] }

function GlossaryBlockRenderer({ props }: { props: GlossaryBlockProps }) {
  const triggerAction = useTriggerAction()
  const sorted = [...props.terms].sort((a, b) => (a.term ?? '').localeCompare(b.term ?? ''))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {sorted.map((t, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '9px 12px', borderRadius: 8, background: i % 2 === 0 ? 'var(--surface-soft)' : 'transparent' }}>
          <button onClick={() => triggerAction(`Tell me more about ${t.term}`)} style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-dim)', border: '1px solid var(--accent-ring)', borderRadius: 5, padding: '2px 9px', cursor: 'pointer', flexShrink: 0, alignSelf: 'flex-start', whiteSpace: 'nowrap' }}>{t.term}</button>
          <div style={{ flex: 1 }}>
            {t.category && <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: 6 }}>[{t.category}]</span>}
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{t.definition}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

const GlossaryBlock = defineComponent({
  name: 'GlossaryBlock',
  description: 'Alphabetically sorted term-definition pairs with clickable terms. Use for technical jargon, legal definitions, medical terminology, or any domain vocabulary from documents.',
  props: z.object({ terms: z.array(z.object({ term: z.string(), definition: z.string(), category: z.string().optional() })) }),
  component: GlossaryBlockRenderer,
})

// ── KeyValueGrid ──────────────────────────────────────────────────────────────

type KVPair = { key: string; value: string; icon?: string }
type KeyValueGridProps = { pairs: KVPair[]; columns?: 2 | 3 }

function KeyValueGridRenderer({ props }: { props: KeyValueGridProps }) {
  const cols = props.columns ?? 2
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8 }}>
      {props.pairs.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--surface-soft)', border: '1px solid var(--panel-border)', borderRadius: 9, padding: '10px 12px' }}>
          {p.icon && <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{p.icon}</span>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1 }}>{p.key}</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4, wordBreak: 'break-word' }}>{p.value}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

const KeyValueGrid = defineComponent({
  name: 'KeyValueGrid',
  description: 'Grid of key-value metadata pairs with optional emoji icons. Use for document specs, config values, product attributes, or any structured metadata display.',
  props: z.object({
    pairs: z.array(z.object({ key: z.string(), value: z.string(), icon: z.string().optional() })),
    columns: z.union([z.literal(2), z.literal(3)]).optional(),
  }),
  component: KeyValueGridRenderer,
})

// ── RiskMatrix ────────────────────────────────────────────────────────────────

type RiskLevel = 'low' | 'medium' | 'high'
type RiskItem = { label: string; likelihood: RiskLevel; impact: RiskLevel; description?: string }
type RiskMatrixProps = { items: RiskItem[] }

const RISK_BG: Record<string, Record<string, string>> = {
  high:   { high: 'rgba(239,68,68,0.15)',   medium: 'rgba(249,115,22,0.12)', low: 'rgba(234,179,8,0.1)'  },
  medium: { high: 'rgba(249,115,22,0.12)',  medium: 'rgba(234,179,8,0.1)',   low: 'rgba(34,197,94,0.08)' },
  low:    { high: 'rgba(234,179,8,0.1)',    medium: 'rgba(34,197,94,0.08)',  low: 'rgba(34,197,94,0.06)' },
}
const RISK_BORDER: Record<string, Record<string, string>> = {
  high:   { high: 'rgba(239,68,68,0.4)',   medium: 'rgba(249,115,22,0.3)',  low: 'rgba(234,179,8,0.25)'  },
  medium: { high: 'rgba(249,115,22,0.3)',  medium: 'rgba(234,179,8,0.25)', low: 'rgba(34,197,94,0.2)'   },
  low:    { high: 'rgba(234,179,8,0.25)', medium: 'rgba(34,197,94,0.2)',   low: 'rgba(34,197,94,0.15)'  },
}

function RiskMatrixRenderer({ props }: { props: RiskMatrixProps }) {
  const levels: RiskLevel[] = ['high', 'medium', 'low']
  const cells: Record<string, RiskItem[]> = {}
  for (const item of props.items) {
    const key = `${item.likelihood}-${item.impact}`
    cells[key] = [...(cells[key] ?? []), item]
  }
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '8px 0', flexShrink: 0 }}>LIKELIHOOD</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr 1fr 1fr', gap: 4, marginBottom: 4 }}>
          <div />
          {['Low Impact', 'Med Impact', 'High Impact'].map((l, i) => (
            <div key={i} style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l}</div>
          ))}
        </div>
        {levels.map((likelihood) => (
          <div key={likelihood} style={{ display: 'grid', gridTemplateColumns: '52px 1fr 1fr 1fr', gap: 4, marginBottom: 4 }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{likelihood}</div>
            {levels.map((impact) => {
              const key = `${likelihood}-${impact}`
              const cellItems = cells[key] ?? []
              return (
                <div key={impact} style={{ background: RISK_BG[likelihood][impact], border: `1px solid ${RISK_BORDER[likelihood][impact]}`, borderRadius: 7, padding: '7px 8px', minHeight: 50, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {cellItems.map((item, j) => (
                    <div key={j} title={item.description} style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3 }}>{item.label}</div>
                  ))}
                </div>
              )
            })}
          </div>
        ))}
        <div style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>IMPACT</div>
      </div>
    </div>
  )
}

const RiskMatrix = defineComponent({
  name: 'RiskMatrix',
  description: 'A 3×3 likelihood × impact risk matrix with color-coded zones (red=critical, yellow=medium, green=low). Use for compliance, legal, business strategy, or any risk assessment document.',
  props: z.object({
    items: z.array(z.object({ label: z.string(), likelihood: z.enum(['low', 'medium', 'high']), impact: z.enum(['low', 'medium', 'high']), description: z.string().optional() })),
  }),
  component: RiskMatrixRenderer,
})

// ── EntityCard ────────────────────────────────────────────────────────────────

type EntityCardProps = { name: string; role: string; affiliation?: string; description?: string; tags?: string[] }

function EntityCardRenderer({ props }: { props: EntityCardProps }) {
  const triggerAction = useTriggerAction()
  const initials = props.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div style={{ background: 'var(--surface-soft)', border: '1px solid var(--panel-border)', borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent-dim)', border: '2px solid var(--accent-ring)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 15, fontWeight: 700, color: 'var(--accent)' }}>{initials}</div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <button onClick={() => triggerAction(`Tell me more about ${props.name}`)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{props.name}</span>
        </button>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>{props.role}</span>
          {props.affiliation && <><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>·</span><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{props.affiliation}</span></>}
        </div>
        {props.description && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{props.description}</p>}
        {props.tags && props.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
            {props.tags.map((tag, i) => <span key={i} style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--surface-recess)', border: '1px solid var(--panel-border)', borderRadius: 4, padding: '1px 6px' }}>{tag}</span>)}
          </div>
        )}
      </div>
    </div>
  )
}

const EntityCard = defineComponent({
  name: 'EntityCard',
  description: 'Person or organization card with avatar initials, name, role, affiliation, description and expertise tags. Use for research paper authors, legal parties, executives, or key stakeholders mentioned in documents.',
  props: z.object({ name: z.string(), role: z.string(), affiliation: z.string().optional(), description: z.string().optional(), tags: z.array(z.string()).optional() }),
  component: EntityCardRenderer,
})

// ── Assemble library ──────────────────────────────────────────────────────────

const domainComponents: AnyComp[] = [
  DocumentCard,
  WikiSummaryCard,
  CitationCard,
  KnowledgeGapCard,
  TopicCluster,
  ComparisonView,
  ChunkEvidence,
  MetricCard,
  StatGrid,
  Timeline,
  QuoteBlock,
  GlossaryBlock,
  KeyValueGrid,
  RiskMatrix,
  EntityCard,
]

export const customChatLibrary: Library = createLibrary({
  root: 'Card',
  componentGroups: openuiChatComponentGroups,
  components: [...baseComponents, ...domainComponents],
})
