'use client'
import { useState } from 'react'
import type { ToolCallStep } from '@/lib/types'

const TOOL_LABELS: Record<string, string> = {
  list_docs: 'Browsing documents',
  search_documents: 'Searching documents',
  get_wiki_page: 'Fetching wiki page',
  search_chunks: 'Retrieving evidence',
  check_conflicts: 'Checking conflicts',
  resolve_conflict: 'Flagging conflict',
}
const TOOL_SHORT: Record<string, string> = {
  list_docs: 'list',
  search_documents: 'search',
  get_wiki_page: 'wiki',
  search_chunks: 'chunks',
  check_conflicts: 'conflicts',
  resolve_conflict: 'resolve',
}

function label(name: string) { return TOOL_LABELS[name] ?? name.replace(/_/g, ' ') }
function short(name: string) { return TOOL_SHORT[name] ?? name }

function ArgsDetail({ args }: { args: Record<string, unknown> }) {
  const entries = Object.entries(args)
  if (entries.length === 0) return <span className="tcs-no-args">no arguments</span>
  return (
    <div className="tcs-args-grid">
      {entries.map(([k, v]) => (
        <div key={k} className="tcs-arg-row">
          <span className="tcs-arg-key">{k}</span>
          <span className="tcs-arg-val">{typeof v === 'string' ? v : JSON.stringify(v)}</span>
        </div>
      ))}
    </div>
  )
}

function StepDetail({ step, live }: { step: ToolCallStep; live?: boolean }) {
  return (
    <div className={`tcs-detail${live ? ' tcs-detail--live' : ''}`}>
      <div className="tcs-detail-meta">
        <span className="tcs-detail-fn">{step.name}()</span>
        <span className={`tcs-detail-status${live ? ' tcs-detail-status--live' : ' tcs-detail-status--done'}`}>
          {live ? 'running' : 'done'}
        </span>
      </div>
      <ArgsDetail args={step.args} />
    </div>
  )
}

function LiveTool({ step }: { step: ToolCallStep }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="tcs-live-wrap">
      <button className="tcs-live-pill" onClick={() => setOpen(o => !o)}>
        <span className="tcs-pulse-ring" />
        <span className="tcs-live-dot" />
        <span className="tcs-live-text">{label(step.name)}</span>
        <span className="tcs-live-tag">{short(step.name)}</span>
        <span className="tcs-caret">{open ? '↑' : '↓'}</span>
      </button>
      {open && <StepDetail step={step} live />}
    </div>
  )
}

function StepRow({ step, index }: { step: ToolCallStep; index: number }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="tcs-trace-item">
      <span className="tcs-trace-node" />
      <div className="tcs-trace-content">
        <button className={`tcs-trace-btn${open ? ' tcs-trace-btn--open' : ''}`} onClick={() => setOpen(o => !o)}>
          <span className="tcs-trace-idx">{index + 1}</span>
          <span className="tcs-trace-label">{label(step.name)}</span>
          <span className="tcs-trace-tag">{short(step.name)}</span>
          <span className="tcs-caret">{open ? '↑' : '↓'}</span>
        </button>
        {open && (
          <div className="tcs-trace-detail-wrap">
            <StepDetail step={step} />
          </div>
        )}
      </div>
    </div>
  )
}

export default function ToolCallStream({ steps, isStreaming }: { steps: ToolCallStep[]; isStreaming: boolean }) {
  const [expanded, setExpanded] = useState(false)

  if (steps.length === 0) return null

  const streamingStep = steps.findLast(s => s.status === 'streaming')
  const activeStep = isStreaming ? (streamingStep ?? steps[steps.length - 1]) : null
  const doneSteps = steps.filter(s => s.status === 'done')

  if (isStreaming && activeStep) return <LiveTool key={activeStep.id} step={activeStep} />
  if (doneSteps.length === 0) return null

  return (
    <div className="tcs-summary">
      <button className="tcs-toggle" onClick={() => setExpanded(o => !o)}>
        <span className="tcs-toggle-text">
          Thought for <strong>{doneSteps.length}</strong> step{doneSteps.length !== 1 ? 's' : ''}
        </span>
        <span className="tcs-caret">{expanded ? '↑' : '↓'}</span>
      </button>
      {expanded && (
        <div className="tcs-trace-list">
          {doneSteps.map((s, i) => <StepRow key={s.id} step={s} index={i} />)}
        </div>
      )}
    </div>
  )
}
