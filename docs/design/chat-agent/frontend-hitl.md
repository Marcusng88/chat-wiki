# Phase 5 — Frontend: HITL Fixed Card Component

## Files to create

- `frontend/components/HitlCard.tsx` — fixed conflict resolution card
- `frontend/components/HitlCard.css` (or inline styles matching app theme)

---

## Component: `HitlCard`

### Props

```typescript
interface HitlCardProps {
  interrupt: PendingInterrupt     // from useChat hook
  onResolve: (payload: ResumePayload) => void
  disabled?: boolean              // true while submitting
}
```

### Layout

```
┌─────────────────────────────────────────────────────┐
│ ⚠  Conflict detected  [badge: contradictory]         │
│                                                     │
│ Agent recommendation:                               │
│ "Doc B appears to be the newer version of Doc A..." │
│                                                     │
│ Documents involved:                                 │
│ ┌────────────────┐  ┌────────────────┐  [+ more]   │
│ │ [outdated]     │  │ [current]      │             │
│ │ Doc A          │  │ Doc B          │             │
│ │ Added: Jan 24  │  │ Added: May 26  │             │
│ │ "The model     │  │ "The updated   │             │
│ │  uses 6 layers"│  │  model uses 12"│             │
│ └────────────────┘  └────────────────┘             │
│                                                     │
│ Preferred source:  ○ Doc A  ● Doc B  ○ None        │
│                                                     │
│ Notes (optional): [__________________________]     │
│                                                     │
│ [Approve]  [Reject]  [Modify]                      │
└─────────────────────────────────────────────────────┘
```

### Behavior

**Approve**: submits `{action: "approve", preferred_document_id: selected, notes}`
- Requires a preferred source to be selected (or explicitly "None")

**Reject**: submits `{action: "reject", notes}` immediately
- No preferred source needed

**Modify**: opens additional fields (same as Approve but with intent to change conflict metadata)
- Submits `{action: "modify", preferred_document_id: selected, notes}`

### Document cards

- Scrollable horizontal list (not fixed 2 columns) — supports N docs
- Each card shows: role badge, title, added date, `conflicting_excerpt`
- Role badge colors: `outdated` = amber, `current` = green, `conflicting` = blue
- Radio selection for preferred source — one per card + "None" option

### Conflict type badge

| type | label | color |
|---|---|---|
| `duplicate` | Duplicate knowledge | neutral |
| `outdated` | Outdated information | amber |
| `contradictory` | Contradictory facts | red |

---

## Placement in chat panel

HitlCard appears **inline in the message list** — rendered after the last assistant message when `pendingInterrupt != null`.

```tsx
{messages.map(msg => <ChatBubble key={msg.id} {...msg} />)}
{pendingInterrupt && (
  <HitlCard
    interrupt={pendingInterrupt}
    onResolve={resumeInterrupt}
    disabled={isSubmittingResume}
  />
)}
```

After user resolves: `pendingInterrupt` clears, agent run resumes, new text chunks stream in.

---

## Notes

- Card is **fixed** (not A2UI) — layout is hardcoded, not agent-generated
- Distinct visual style from A2UI surfaces — heavier border, warning color scheme
- Accessible: keyboard navigable radio buttons, clear submit/cancel actions
- Mobile-friendly: document cards stack vertically on narrow screens
