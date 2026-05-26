'use client'
import type { A2UIPayload } from '@/lib/types'

interface Props {
  payload: A2UIPayload
}

export default function A2UICard({ payload }: Props) {
  return (
    <div className="a2ui-card">
      <div className="a2ui-head">
        <span>quick summary</span>
        <span className="schema">{payload.schema}</span>
      </div>
      <div className="a2ui-body">
        <div className="a2ui-title">{payload.title}</div>
        <div className="a2ui-rows">
          {payload.rows.map((r, i) => (
            <div className="row" key={i}>
              <span className="k">{r.k}</span>
              <span className="v">{r.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
