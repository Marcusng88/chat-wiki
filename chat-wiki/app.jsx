/* global React */
const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ───────── Icons ─────────
const Icon = {
  Plus: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  Send: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4Z"/></svg>,
  Upload: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  More: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/></svg>,
  Back: (p) => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m15 18-6-6 6-6"/></svg>,
  Menu: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  Check: (p) => <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="20 6 9 17 4 12"/></svg>,
  Alert: (p) => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  Sparkle: (p) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9.93 2.4 11 6l3.6 1.07L11 8.13 9.93 11.73 8.87 8.13 5.27 7.07 8.87 6Z"/><path d="m17.5 13.5 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z"/></svg>,
  Sun: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>,
  Moon: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg>,
  LogOut: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  ChevronLeft: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="15 18 9 12 15 6"/></svg>,
  ChevronRight: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="9 18 15 12 9 6"/></svg>,
  Link: (p) => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.71"/></svg>,
  Eye: (p) => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>,
  Trash: (p) => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>,
};

// ───────── Mock data ─────────
const FILE_ICON_CLASS = { pdf: 'ftype-pdf', md: 'ftype-md', txt: 'ftype-txt', pptx: 'ftype-pptx', img: 'ftype-img' };
const FILE_LABEL = { pdf: 'PDF', md: 'MD', txt: 'TXT', pptx: 'PPT', img: 'IMG' };

// Compact file-type glyphs (16x16). Stroke style matches the rest of the icon set.
const FileIcon = ({ type }) => {
  const common = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
  // common page shape used in every glyph for a unified family
  const Page = ({ children }) => (
    <svg {...common}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5" />
      {children}
    </svg>
  );
  if (type === 'pdf') return (
    <Page>
      <text x="8.2" y="17.5" fontSize="5.4" fontFamily="ui-monospace, Menlo, monospace" fontWeight="700" fill="currentColor" stroke="none" letterSpacing="0.2">PDF</text>
    </Page>
  );
  if (type === 'md') return (
    <Page>
      <text x="8.2" y="17.5" fontSize="5.4" fontFamily="ui-monospace, Menlo, monospace" fontWeight="700" fill="currentColor" stroke="none" letterSpacing="0.2">MD</text>
    </Page>
  );
  if (type === 'txt') return (
    <Page>
      <line x1="8"  y1="12.5" x2="15.5" y2="12.5" />
      <line x1="8"  y1="15"   x2="15.5" y2="15"   />
      <line x1="8"  y1="17.5" x2="13"   y2="17.5" />
    </Page>
  );
  if (type === 'pptx') return (
    <svg {...common}>
      <rect x="3.5" y="5" width="17" height="12" rx="1.5" />
      <line x1="7" y1="9.5" x2="14" y2="9.5" />
      <line x1="7" y1="12.5" x2="17" y2="12.5" />
      <line x1="12" y1="17" x2="12" y2="20" />
      <line x1="9" y1="20" x2="15" y2="20" />
    </svg>
  );
  if (type === 'img') return (
    <svg {...common}>
      <rect x="3" y="4.5" width="18" height="15" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="m3.5 17 5-5 4 4 3.5-3 4.5 4" />
    </svg>
  );
  return null;
};

const INITIAL_DOCS = [
  {
    id: 'd1',
    title: 'Transformers from Scratch — Annotated.pdf',
    fileType: 'pdf',
    status: 'ready',
    hasConflict: true,
    pages: 42,
    addedAt: 'mar 14',
    size: '3.4 MB',
    wiki: {
      summary: 'A self-annotated walkthrough of the original *Attention Is All You Need* architecture. Covers self-attention, multi-head scaling, positional encoding, and the residual+layernorm pattern. Includes my own notes on initialization, learning-rate warmup, and why GELU is preferred over ReLU in this context.',
      concepts: ['self-attention', 'multi-head', 'positional encoding', 'layernorm', 'gelu', 'warmup', 'kv-cache'],
      entities: [
        { kind: 'paper', name: 'Attention Is All You Need (2017)' },
        { kind: 'author', name: 'Vaswani et al.' },
        { kind: 'model', name: 'GPT-2' },
        { kind: 'concept', name: 'Encoder-Decoder' },
      ],
      retrieval: 'Best for: architecture details, training tricks, comparisons across attention variants.',
    },
    raw: 'Page 3 — "The encoder maps an input sequence of symbol representations (x1, ..., xn) to a sequence of continuous representations z = (z1, ..., zn)..."\n\nPage 11 — My note: "warmup_steps = 4000 worked for d_model=512; for 768 I had to bump it to ~8000 or loss diverged in the first epoch."',
  },
  {
    id: 'd2',
    title: 'meeting-notes-2026-05-21.md',
    fileType: 'md',
    status: 'ready',
    hasConflict: true,
    pages: 1,
    addedAt: 'may 21',
    size: '14 KB',
    wiki: {
      summary: 'Decisions from the May 21 sync. Switched provider preference to OpenAI for embeddings, kept Gemini for chat. Resolver agent must run manually, not on every ingest.',
      concepts: ['provider switch', 'resolver policy', 'embedding budget'],
      entities: [
        { kind: 'decision', name: 'Embeddings → OpenAI' },
        { kind: 'decision', name: 'Resolver = manual' },
        { kind: 'person', name: 'Sam' },
        { kind: 'person', name: 'Ren' },
      ],
      retrieval: 'Best for: recent decisions, provider preferences, MVP scope cuts.',
    },
    raw: '# May 21 sync\n\n- Embeddings: switch to OpenAI text-embedding-3-large.\n- Resolver: manual trigger only, do NOT run post-ingest.\n- HITL: one conflict at a time, no bulk.\n- Push wiki versioning to v1.1.',
  },
  {
    id: 'd3',
    title: 'design-decisions.md',
    fileType: 'md',
    status: 'ready',
    hasConflict: true,
    pages: 1,
    addedAt: 'apr 02',
    size: '6 KB',
    wiki: {
      summary: 'Earlier scratch of agent / provider choices. Embeddings preference was Gemini at the time. Most decisions here are superseded by the May 21 notes.',
      concepts: ['embeddings', 'agent framework', 'storage'],
      entities: [
        { kind: 'decision', name: 'Embeddings → Gemini' },
        { kind: 'decision', name: 'Agent = LangGraph' },
      ],
      retrieval: 'Historical context only. Cross-check before quoting.',
    },
    raw: '## Provider\n- Embeddings: Gemini text-embedding-004 (cheap, fast).\n- Chat: Gemini 2.0 flash.\n- Storage: Supabase.\n\n## Open\n- Resolver trigger policy — TBD.',
  },
  {
    id: 'd4',
    title: 'agentic-rag-survey.pdf',
    fileType: 'pdf',
    status: 'processing',
    progress: 62,
    stage: 'generating_wiki',
    hasConflict: false,
    pages: 18,
    addedAt: 'just now',
    size: '1.1 MB',
    raw: '',
  },
  {
    id: 'd5',
    title: 'kickoff-deck.pptx',
    fileType: 'pptx',
    status: 'ready',
    hasConflict: false,
    pages: 22,
    addedAt: 'mar 02',
    size: '8.2 MB',
    wiki: {
      summary: 'Internal kickoff deck. Defines the four-layer knowledge hierarchy: sources, retrieval structures, synthesized knowledge, governance metadata.',
      concepts: ['knowledge hierarchy', 'governance', 'pipeline'],
      entities: [
        { kind: 'concept', name: 'Source Evidence' },
        { kind: 'concept', name: 'Synthesized Knowledge' },
        { kind: 'concept', name: 'Governance Metadata' },
      ],
      retrieval: 'Best for: foundational concepts, system philosophy.',
    },
    raw: 'Slide 1 — Chat Wiki: a personal knowledge OS.\nSlide 4 — Knowledge hierarchy: Sources / Retrieval / Synthesis / Governance.',
  },
  {
    id: 'd6',
    title: 'screenshot-whiteboard.png',
    fileType: 'img',
    status: 'failed',
    failReason: 'no readable text found in the image',
    hasConflict: false,
    pages: 1,
    addedAt: '2 days ago',
    size: '2.7 MB',
  },
  {
    id: 'd7',
    title: 'reading-list.txt',
    fileType: 'txt',
    status: 'uploading',
    progress: 28,
    hasConflict: false,
    pages: 1,
    addedAt: 'just now',
    size: '— KB',
  },
];

const INITIAL_MESSAGES = [
  {
    id: 'm1',
    role: 'user',
    content: 'whats my latest decision on which embedding model to use?',
    ts: '11:42',
  },
  {
    id: 'm2',
    role: 'agent',
    ts: '11:42',
    md: `Most recently — **may 21** — you switched embeddings from Gemini \`text-embedding-004\` to **OpenAI text-embedding-3-large** [[1]](#s1). The reasoning recorded in the sync notes was *retrieval quality on technical PDFs*, with the trade-off being roughly **3.2× cost per million tokens**.

The earlier preference (Gemini) is documented in \`design-decisions.md\` from April [[2]](#s2), but it is *superseded* by the May 21 entry.`,
    sources: [
      { idx: 1, docId: 'd2', name: 'meeting-notes-2026-05-21.md', loc: '§ Provider', snippet: 'Embeddings: switch to OpenAI text-embedding-3-large.' },
      { idx: 2, docId: 'd3', name: 'design-decisions.md', loc: '## Provider', snippet: 'Embeddings: Gemini text-embedding-004 (cheap, fast).' },
    ],
  },
  {
    id: 'm3',
    role: 'user',
    content: 'ok and what about the resolver — does it run automatically?',
    ts: '11:44',
  },
  {
    id: 'm-hitl',
    role: 'hitl',
    ts: '11:44',
    conflictType: 'contradictory',
    title: 'Two of your files disagree',
    explanation: 'They say different things about how the conflict-check tool runs. I can answer once you tell me which one to trust.',
    sources: [
      { id: 'd2', role: 'latest', name: 'meeting-notes-2026-05-21.md', date: 'may 21, 2026', claim: 'Resolver = manual trigger only' },
      { id: 'd3', role: 'earlier', name: 'design-decisions.md', date: 'apr 02, 2026', claim: 'Resolver trigger policy — TBD' },
    ],
    recommend: 'Go with the **may 21 notes** — they\'re newer and more specific. Just for this question, I\'ll treat the older file as out of date. Everything else in it stays usable.',
  },
  {
    id: 'm4',
    role: 'agent',
    ts: '11:46',
    md: `Resolved — using \`meeting-notes-2026-05-21.md\` as the preferred reference.

### Resolver policy
- Runs **manually only**, via the *Resolve Conflicts* button [[1]](#s1).
- It scans only **unscanned / unresolved** documents (skips ones it has already checked).
- It flags conflicts in the database — it **does not** auto-resolve them, and it does **not** generate HITL cards itself.
- HITL cards (this one included) are generated by **me**, in chat, when I encounter a flagged doc during retrieval.

Want me to run the resolver now? I see _2 unscanned documents_ in your library.`,
    sources: [
      { idx: 1, docId: 'd2', name: 'meeting-notes-2026-05-21.md', loc: '§ Resolver', snippet: 'Resolver: manual trigger only, do NOT run post-ingest.' },
    ],
    a2ui: {
      schema: 'comparison.v1',
      title: 'Resolver behavior — at a glance',
      rows: [
        { k: 'trigger', v: 'manual button' },
        { k: 'scope', v: 'unscanned / unresolved only' },
        { k: 'output', v: 'conflict flags in DB' },
        { k: 'side-effects', v: 'none — read-only' },
      ],
    },
  },
];

const SUGGESTIONS = [
  'summarize my notes on attention variants',
  'what changed between april and may decisions?',
  'find every mention of HITL approval flow',
];

// ───────── Store ─────────
const useAppStore = () => {
  const [documents, setDocuments] = useState(INITIAL_DOCS);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [leftPanelView, setLeftPanelView] = useState('list');
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isMobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [threadTitle] = useState('Provider & resolver questions');

  const activeConflicts = useMemo(() => documents.filter(d => d.hasConflict), [documents]);

  const openDocument = (id) => {
    setSelectedDocId(id);
    setLeftPanelView('detail');
    setMobileDrawerOpen(false);
  };
  const backToList = () => {
    setLeftPanelView('list');
    setSelectedDocId(null);
  };

  return {
    documents, setDocuments,
    messages, setMessages,
    leftPanelView, setLeftPanelView,
    selectedDocId, setSelectedDocId,
    isStreaming, setIsStreaming,
    isMobileDrawerOpen, setMobileDrawerOpen,
    activeConflicts,
    threadTitle,
    openDocument, backToList,
  };
};

// ───────── Header ─────────
function AppHeader({ store, threadTitle, theme, onToggleTheme, onSignOut }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    setTimeout(() => document.addEventListener('mousedown', close), 0);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  return (
    <header className="app-header">
      <button className="icon-btn hamburger" onClick={() => store.setMobileDrawerOpen(true)} aria-label="Open sources">
        <Icon.Menu />
      </button>
      <div className="brand-block">
        <div className="brand">
          <span className="dot"></span>
          <span className="name">CHAT<em>·</em>WIKI</span>
        </div>
        <div className="tagline">ask anything — answers come from the files you've added.</div>
      </div>
      <div className="spacer"></div>
      <div className="header-actions">
        <button
          className={`theme-toggle ${theme === 'light' ? 'is-light' : 'is-dark'}`}
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
        >
          <span className="tt-icon left"><Icon.Sun /></span>
          <span className="tt-icon right"><Icon.Moon /></span>
          <span className="tt-thumb"/>
        </button>
        <div className="account-wrap" ref={menuRef}>
          <button
            className={`account-btn ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Account"
            title="Account"
          >
            <span className="avatar">YK</span>
          </button>
          {menuOpen && (
            <div className="account-menu" onClick={(e) => e.stopPropagation()}>
              <div className="account-info">
                <div className="account-name">You</div>
                <div className="account-email">you@example.com</div>
              </div>
              <div className="row-menu-sep"/>
              <button className="account-item">
                <Icon.Eye/><span>Account settings</span>
              </button>
              <button className="account-item danger" onClick={() => { setMenuOpen(false); onSignOut(); }}>
                <Icon.LogOut/><span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// ───────── Upload zone ─────────
function UploadZone({ onFiles }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);
  const handle = (files) => {
    if (!files || !files.length) return;
    onFiles(Array.from(files));
  };
  return (
    <div
      className={`upload-zone ${drag ? 'drag' : ''}`}
      onClick={() => inputRef.current && inputRef.current.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files); }}
      role="button"
      tabIndex={0}
    >
      <div className="uz-icon"><Icon.Upload /></div>
      <div className="uz-title">drop files or <strong>browse</strong></div>
      <div className="uz-sub">pdf · md · txt · pptx · img</div>
      <input ref={inputRef} type="file" multiple hidden onChange={(e) => handle(e.target.files)} />
    </div>
  );
}

// ───────── Status badge ─────────
function StatusBadge({ doc }) {
  if (doc.status === 'ready')
    return <span className="status-badge ready"><span className="pip"/>ready</span>;
  if (doc.status === 'failed')
    return <span className="status-badge failed"><span className="pip"/>failed</span>;
  if (doc.status === 'uploading')
    return <span className="status-badge uploading"><span className="pip"/>uploading {doc.progress != null ? doc.progress + '%' : ''}</span>;
  if (doc.status === 'processing') {
    const stageLabel = (doc.stage || 'processing').replace('_', ' ');
    return <span className="status-badge processing"><span className="pip"/>{stageLabel}</span>;
  }
  return <span className="status-badge">{doc.status}</span>;
}

function MaterialRow({ doc, active, onClick, onDelete, collapsed }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const rowRef = useRef(null);
  const tipTimer = useRef(null);
  const [tip, setTip] = useState(null); // {top, left, side}
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    setTimeout(() => document.addEventListener('mousedown', close), 0);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const isBusy = (doc.status === 'processing' || doc.status === 'uploading') && typeof doc.progress === 'number';
  const isFailed = doc.status === 'failed';
  const hint = isFailed
    ? `Couldn't read this file${doc.failReason ? ' — ' + doc.failReason : ''}. Open the menu to try again or remove it.`
    : doc.hasConflict
      ? `Two of your files disagree on something here. When it matters for an answer, the assistant will ask you which one to trust.`
      : null;

  const showTip = () => {
    if (!hint || !rowRef.current) return;
    clearTimeout(tipTimer.current);
    tipTimer.current = setTimeout(() => {
      if (!rowRef.current) return;
      const r = rowRef.current.getBoundingClientRect();
      if (collapsed) {
        // place to the right of the rail, just outside the panel
        setTip({ top: r.top + r.height / 2, left: r.right + 12, side: 'right' });
      } else {
        // place below the row, aligned with the file icon
        setTip({ top: r.bottom + 6, left: r.left + 48, side: 'below' });
      }
    }, 320);
  };
  const hideTip = () => {
    clearTimeout(tipTimer.current);
    setTip(null);
  };
  useEffect(() => {
    if (!tip) return;
    const onScroll = () => setTip(null);
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [tip]);

  return (
    <div
      ref={rowRef}
      className={`material-row ${active ? 'active' : ''} ${menuOpen ? 'menu-open' : ''} ${isFailed ? 'is-failed' : ''} ${doc.hasConflict ? 'has-conflict' : ''}`}
      onClick={() => onClick(doc.id)}
      onMouseEnter={showTip}
      onMouseLeave={hideTip}
    >
      <div className={`file-icon ${FILE_ICON_CLASS[doc.fileType]}`}>
        <FileIcon type={doc.fileType}/>
        {isFailed && <span className="overlay-mark fail-mark" aria-label="failed">✕</span>}
        {!isFailed && doc.hasConflict && (
          <span className="overlay-mark conflict-mark" aria-label="conflict flagged">
            <Icon.Alert />
          </span>
        )}
      </div>
      <div className="title-col">
        <div className="title" title={doc.title}>{doc.title}</div>
        <div className="sub">
          {isBusy
            ? <span className="busy">{(doc.stage || doc.status).replace('_', ' ')} · {Math.round(doc.progress)}%</span>
            : <span>{doc.addedAt}</span>
          }
        </div>
      </div>
      <div className="menu-wrap" ref={menuRef}>
        <button
          className="row-menu-btn"
          onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
          aria-label="More actions"
        >
          <Icon.More />
        </button>
        {menuOpen && (
          <div className="row-menu" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { setMenuOpen(false); onClick(doc.id); }}>
              <Icon.Eye/><span>Open</span>
            </button>
            <button>
              <Icon.Upload style={{transform: 'rotate(180deg)'}}/><span>Download</span>
            </button>
            <button>
              <Icon.Sparkle/><span>Re-ingest</span>
            </button>
            <div className="row-menu-sep"/>
            <button
              className="danger"
              onClick={() => { setMenuOpen(false); onDelete(doc.id); }}
            >
              <Icon.Trash/><span>Delete source</span>
            </button>
          </div>
        )}
      </div>
      {isBusy && (
        <div className="progress-rail"><div className="fill" style={{width: Math.round(doc.progress) + '%'}}/></div>
      )}
      {tip && (
        <div
          className={`floating-tip side-${tip.side} ${isFailed ? 'is-failed' : ''} ${doc.hasConflict ? 'has-conflict' : ''}`}
          style={{ top: tip.top, left: tip.left }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

// ───────── Detail view ─────────
function DetailView({ doc, onBack }) {
  const [tab, setTab] = useState('wiki');
  if (!doc) return null;
  return (
    <div className="detail-view">
      <div className="detail-head">
        <button className="back-btn" onClick={onBack}><Icon.Back /> Back to sources</button>
        <div className="detail-title" style={{textWrap: 'pretty'}}>{doc.title}</div>
        <div className="detail-meta">
          <span className="pill">{FILE_LABEL[doc.fileType]}</span>
          <span className="pill">{doc.size}</span>
          <span className="pill">{doc.pages} {doc.pages === 1 ? 'page' : 'pages'}</span>
          <span className="pill">added {doc.addedAt}</span>
          {doc.hasConflict && <span className="pill" style={{color: 'var(--status-conflict)'}}>conflict flagged</span>}
        </div>
      </div>
      <div className="detail-tabs">
        <button className={`detail-tab ${tab==='wiki'?'active':''}`} onClick={() => setTab('wiki')}>Wiki</button>
        <button className={`detail-tab ${tab==='raw'?'active':''}`} onClick={() => setTab('raw')}>Raw</button>
        <button className={`detail-tab ${tab==='meta'?'active':''}`} onClick={() => setTab('meta')}>Metadata</button>
      </div>
      <div className="detail-body">
        {tab === 'wiki' && doc.wiki && (
          <>
            <h3>Summary</h3>
            <p>{doc.wiki.summary}</p>
            <h3>Concepts</h3>
            <div style={{display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12}}>
              {doc.wiki.concepts.map(c => <span key={c} className="entity-chip">{c}</span>)}
            </div>
            <h3>Entities</h3>
            <div className="entity-grid">
              {doc.wiki.entities.map((e, i) => (
                <div key={i} className="entity-chip"><em>{e.kind}</em>{e.name}</div>
              ))}
            </div>
            <h3>Retrieval hints</h3>
            <p style={{color: 'var(--text-secondary)'}}>{doc.wiki.retrieval}</p>
          </>
        )}
        {tab === 'wiki' && !doc.wiki && (
          <div className="empty">{doc.status === 'failed' ? 'Wiki not generated — ingestion failed.' : 'Wiki generation in progress…'}</div>
        )}
        {tab === 'raw' && (
          <>
            <h3>Source excerpt</h3>
            <div className="detail-raw">{doc.raw || '— no raw text available —'}</div>
          </>
        )}
        {tab === 'meta' && (
          <dl className="kv-grid">
            <dt>file_type</dt><dd>{doc.fileType}</dd>
            <dt>status</dt><dd>{doc.status}</dd>
            <dt>pages</dt><dd>{doc.pages}</dd>
            <dt>size</dt><dd>{doc.size}</dd>
            <dt>added</dt><dd>{doc.addedAt}</dd>
            <dt>conflict</dt><dd>{doc.hasConflict ? 'flagged' : 'none'}</dd>
            <dt>storage_path</dt><dd style={{color: 'var(--text-secondary)'}}>/u/{doc.id}.bin</dd>
            <dt>embeddings</dt><dd>{doc.status === 'ready' ? `${(doc.pages*7)} chunks · OpenAI 3-large` : '—'}</dd>
            {doc.failReason && <><dt>fail_reason</dt><dd style={{color: 'var(--status-failed)'}}>{doc.failReason}</dd></>}
          </dl>
        )}
      </div>
    </div>
  );
}

// ───────── Left panel ─────────
function LeftPanel({ store, onResolverRun, collapsed, onToggleCollapsed, requestConfirm }) {
  const { documents, leftPanelView, selectedDocId, openDocument, backToList, activeConflicts, setDocuments, isMobileDrawerOpen } = store;
  const selectedDoc = documents.find(d => d.id === selectedDocId);

  // Animate "processing" doc progress
  useEffect(() => {
    const t = setInterval(() => {
      setDocuments(docs => docs.map(d => {
        if (d.status === 'processing' && typeof d.progress === 'number' && d.progress < 99) {
          const next = Math.min(99, d.progress + Math.random() * 3);
          let stage = d.stage;
          if (next > 30 && next < 60) stage = 'chunking';
          else if (next < 80) stage = 'generating_wiki';
          else stage = 'indexing';
          return { ...d, progress: next, stage };
        }
        if (d.status === 'uploading' && typeof d.progress === 'number') {
          const next = d.progress + Math.random() * 8;
          if (next >= 100) return { ...d, status: 'processing', progress: 5, stage: 'extracting' };
          return { ...d, progress: next };
        }
        return d;
      }));
    }, 900);
    return () => clearInterval(t);
  }, [setDocuments]);

  const onUpload = useCallback((files) => {
    const newDocs = files.map((f, i) => {
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      const ft = ['pdf','md','txt','pptx'].includes(ext) ? ext : (['png','jpg','jpeg','webp'].includes(ext) ? 'img' : 'txt');
      return {
        id: 'u' + Date.now() + i,
        title: f.name,
        fileType: ft,
        status: 'uploading',
        progress: 0,
        hasConflict: false,
        pages: 1,
        addedAt: 'just now',
        size: f.size ? `${(f.size/1024).toFixed(0)} KB` : '— KB',
      };
    });
    setDocuments(d => [...newDocs, ...d]);
  }, [setDocuments]);

  const onDelete = useCallback(async (id) => {
    const doc = documents.find(d => d.id === id);
    if (!doc) return;
    const ok = await requestConfirm({
      title: `Delete "${doc.title}"?`,
      message: `The file is removed for good, along with everything the assistant learned from it. Your other files aren't touched.`,
      confirmText: 'Delete',
      cancelText: 'Keep it',
      danger: true,
    });
    if (!ok) return;
    setDocuments(ds => ds.filter(d => d.id !== id));
    if (selectedDocId === id) backToList();
  }, [documents, setDocuments, selectedDocId, backToList, requestConfirm]);

  return (
    <aside className={`panel left-panel ${isMobileDrawerOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>
      <div className="panel-header">
        {!collapsed && <span className="label">Sources</span>}
        <div className="meta">
          {!collapsed && (
            <>
              <span className="live-dot"/>
              <span>{documents.filter(d => d.status === 'ready').length} / {documents.length}</span>
            </>
          )}
          <button
            className="icon-btn collapse-btn"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expand sources' : 'Collapse sources'}
            title={collapsed ? 'Expand sources' : 'Collapse sources'}
          >
            {collapsed ? <Icon.ChevronRight/> : <Icon.ChevronLeft/>}
          </button>
        </div>
      </div>

      {leftPanelView === 'list' && (
        <>
          <UploadZone onFiles={onUpload} />
          <div className="material-list-wrap">
            <div className="list-section-head">
              <span>library</span>
              <span className="count">{documents.length}</span>
              <span className="sort">↓ recent</span>
            </div>
            <div className="material-list">
              {documents.map(d => (
                <MaterialRow
                  key={d.id}
                  doc={d}
                  active={selectedDocId === d.id}
                  onClick={(id) => {
                    if (collapsed) onToggleCollapsed();
                    openDocument(id);
                  }}
                  onDelete={onDelete}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </div>
          {activeConflicts.length > 0 && (
            <div className="resolver-bar">
              <button className="resolver-btn" onClick={onResolverRun}>
                <span className="resolver-icon">
                  <Icon.Sparkle />
                </span>
                <span className="resolver-text">
                  <span className="resolver-title">Check for conflicts</span>
                  <span className="resolver-sub">Spots disagreements between your files — the assistant asks before anything changes.</span>
                </span>
                <span className="resolver-count">
                  <span className="n">{activeConflicts.length}</span>
                  <span className="lbl">flagged</span>
                </span>
              </button>
            </div>
          )}
        </>
      )}

      {leftPanelView === 'detail' && (
        <DetailView doc={selectedDoc} onBack={backToList} />
      )}
    </aside>
  );
}

// ───────── Markdown-ish renderer ─────────
// Lightweight, no deps. Supports headings, bold, italic, code, lists, blockquote, hr, [[N]](#sN) citations.
function renderInline(text, onCite, sources) {
  // Split out citation tokens [[N]](#sN)
  const out = [];
  const re = /\[\[(\d+)\]\]\(#s(\d+)\)|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0, m, key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) {
      const idx = parseInt(m[2]);
      const src = (sources || []).find(s => s.idx === idx);
      const tip = src ? `from ${src.name} — click to open` : `source ${idx}`;
      out.push(
        <span
          key={key++}
          className="cite"
          onClick={() => onCite(idx)}
          title={tip}
          aria-label={tip}
        >
          {m[1]}
        </span>
      );
    }
    else if (m[3]) out.push(<code key={key++}>{m[3]}</code>);
    else if (m[4]) out.push(<strong key={key++}>{m[4]}</strong>);
    else if (m[5]) out.push(<em key={key++}>{m[5]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function Markdown({ md, onCite, sources }) {
  // Block-level parse: paragraphs, headings, lists, hr, blockquote.
  const lines = md.split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.match(/^### /)) { blocks.push({ t: 'h3', c: line.slice(4) }); i++; continue; }
    if (line.match(/^## /))  { blocks.push({ t: 'h2', c: line.slice(3) }); i++; continue; }
    if (line.match(/^# /))   { blocks.push({ t: 'h1', c: line.slice(2) }); i++; continue; }
    if (line.match(/^---+\s*$/)) { blocks.push({ t: 'hr' }); i++; continue; }
    if (line.match(/^>\s+/)) {
      const buf = [];
      while (i < lines.length && lines[i].match(/^>\s+/)) { buf.push(lines[i].replace(/^>\s+/, '')); i++; }
      blocks.push({ t: 'quote', c: buf.join(' ') }); continue;
    }
    if (line.match(/^[-*]\s+/)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^[-*]\s+/)) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i++;
      }
      blocks.push({ t: 'ul', c: items }); continue;
    }
    if (line.trim() === '') { i++; continue; }
    // paragraph: gather contiguous non-empty, non-block lines
    const buf = [];
    while (i < lines.length && lines[i].trim() !== '' && !lines[i].match(/^(#{1,3}\s|---+\s*$|>\s+|[-*]\s+)/)) {
      buf.push(lines[i]); i++;
    }
    blocks.push({ t: 'p', c: buf.join(' ') });
  }
  return (
    <div className="md">
      {blocks.map((b, k) => {
        if (b.t === 'hr') return <hr key={k}/>;
        if (b.t === 'h1') return <h1 key={k}>{renderInline(b.c, onCite, sources)}</h1>;
        if (b.t === 'h2') return <h2 key={k}>{renderInline(b.c, onCite, sources)}</h2>;
        if (b.t === 'h3') return <h3 key={k}>{renderInline(b.c, onCite, sources)}</h3>;
        if (b.t === 'quote') return <blockquote key={k}>{renderInline(b.c, onCite, sources)}</blockquote>;
        if (b.t === 'ul') return <ul key={k}>{b.c.map((it, j) => <li key={j}>{renderInline(it, onCite, sources)}</li>)}</ul>;
        return <p key={k}>{renderInline(b.c, onCite, sources)}</p>;
      })}
    </div>
  );
}

// ───────── Source pill / popover ─────────
function SourcePill({ src, onOpen }) {
  const [hover, setHover] = useState(false);
  return (
    <span
      className="source-pill"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onOpen(src.docId)}
    >
      <span className="src-idx">{src.idx}</span>
      <span>{src.name}</span>
      <Icon.Link />
      {hover && (
        <div className="popover" onClick={(e) => e.stopPropagation()}>
          <div className="head"><Icon.Eye /> {src.name}</div>
          <div className="snippet">"{src.snippet}"</div>
          <div className="meta-row">
            <span>{src.loc}</span>
            <span>·</span>
            <span>click to open</span>
          </div>
        </div>
      )}
    </span>
  );
}

// ───────── HITL card ─────────
function HITLCard({ msg, onResolve }) {
  const [picked, setPicked] = useState(msg.sources[0].id);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="hitl-card" style={{borderColor: 'rgba(34,197,94,0.30)', background: 'rgba(34,197,94,0.04)'}}>
        <div className="hitl-head" style={{background: 'rgba(34,197,94,0.06)', borderBottomColor: 'rgba(34,197,94,0.20)'}}>
          <span className="badge" style={{background: 'var(--status-ready)'}}>got it</span>
          <span className="title">Saved your choice</span>
        </div>
        <div className="hitl-body" style={{fontSize: 11, color: 'var(--text-secondary)'}}>
          ✓ From now on I'll lean on <code style={{color: 'var(--status-ready)'}}>{msg.sources.find(s => s.id === picked).name}</code> for this topic. The other file stays in your library, untouched.
        </div>
      </div>
    );
  }

  return (
    <div className="hitl-card">
      <div className="hitl-head">
        <span className="badge">needs your call</span>
        <span className="title">{msg.title}</span>
        <span className="req-id">paused</span>
      </div>
      <div className="hitl-body">
        <div className="hitl-explanation">{msg.explanation}</div>
        <div className="hitl-sources">
          {msg.sources.map(s => (
            <div
              key={s.id}
              className={`hitl-source ${picked === s.id ? 'selected' : ''}`}
              onClick={() => setPicked(s.id)}
            >
              <span className="role">{s.role}</span>
              <span className="name">{s.name}</span>
              <span className="date">{s.date}</span>
              <span style={{fontSize: 10, color: 'var(--text-secondary)', marginTop: 4, fontStyle: 'normal'}}>
                claims: "{s.claim}"
              </span>
              <span className="check"><Icon.Check /></span>
            </div>
          ))}
        </div>
        <div className="hitl-recommend">
          <Markdown md={`**Recommendation —** ${msg.recommend}`} onCite={()=>{}}/>
        </div>
        <div className="hitl-actions">
          <button className="hitl-btn primary" onClick={() => { setDone(true); onResolve && onResolve(picked); }}>
            <Icon.Check /> Use this one
          </button>
          <button className="hitl-btn" onClick={() => { setDone(true); onResolve && onResolve('modify'); }}>
            Change something
          </button>
          <button className="hitl-btn danger" onClick={() => { setDone(true); onResolve && onResolve('reject'); }}>
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}

// ───────── A2UI card ─────────
function A2UICard({ payload }) {
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
  );
}

// ───────── Message item ─────────
function MessageItem({ msg, onOpenDoc, onResolveHitl, suggestions }) {
  if (msg.role === 'user') {
    return (
      <div className="msg-row user">
        <div className="who"><span>you</span><span className="ts">{msg.ts}</span></div>
        <div className="msg-bubble">{msg.content}</div>
      </div>
    );
  }
  if (msg.role === 'typing') {
    return (
      <div className="msg-row agent">
        <div className="who"><span>agent</span><span className="ts">retrieving…</span></div>
        <div className="typing"><span/><span/><span/></div>
      </div>
    );
  }
  if (msg.role === 'hitl') {
    return (
      <div className="msg-row agent" style={{width: '100%'}}>
        <div className="who" style={{color: 'var(--status-conflict)'}}>
          <span>agent · paused</span>
          <span className="ts">{msg.ts}</span>
        </div>
        <div style={{width: '100%', maxWidth: 640}}>
          <HITLCard msg={msg} onResolve={onResolveHitl}/>
        </div>
      </div>
    );
  }
  // agent
  return (
    <div className="msg-row agent">
      <div className="who"><span>agent</span><span className="ts">{msg.ts}</span></div>
      <div className="msg-bubble">
        <Markdown md={msg.md} onCite={(idx) => {
          const src = (msg.sources || []).find(s => s.idx === idx);
          if (src) onOpenDoc(src.docId);
        }} sources={msg.sources}/>
        {msg.a2ui && <A2UICard payload={msg.a2ui}/>}
        {msg.sources && msg.sources.length > 0 && (
          <div className="sources-row">
            <span className="sources-label">sources</span>
            {msg.sources.map(s => <SourcePill key={s.idx} src={s} onOpen={onOpenDoc}/>)}
          </div>
        )}
        {suggestions && suggestions.length > 0 && (
          <div className="followup-tray">
            <div className="suggestion-label">
              <Icon.Sparkle />
              <span>follow up</span>
            </div>
            <div className="suggestion-chips">
              {suggestions.map(s => (
                <button key={s.text} className="suggestion-chip" onClick={() => s.onPick(s.text)}>
                  <span className="arrow">↗</span>
                  <span>{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ───────── Chat panel ─────────
function ChatPanel({ store, onNewChat }) {
  const { messages, setMessages, isStreaming, setIsStreaming, openDocument, documents } = store;
  const [input, setInput] = useState('');
  const taRef = useRef(null);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, isStreaming]);

  const autoSize = () => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const lh = 22; const min = 22; const max = 6 * lh;
    ta.style.height = Math.min(max, Math.max(min, ta.scrollHeight)) + 'px';
  };
  useEffect(autoSize, [input]);

  const send = (textOverride) => {
    const text = (typeof textOverride === 'string' ? textOverride : input).trim();
    if (!text || isStreaming) return;
    const userMsg = {
      id: 'u' + Date.now(),
      role: 'user',
      content: text,
      ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(m => [...m, userMsg, { id: 't' + Date.now(), role: 'typing' }]);
    setInput('');
    setIsStreaming(true);

    // mock agent response
    setTimeout(() => {
      setMessages(m => {
        const filtered = m.filter(x => x.role !== 'typing');
        const reply = {
          id: 'a' + Date.now(),
          role: 'agent',
          ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          md: `Based on your library, the most relevant material is **${documents[0].title}** [[1]](#s1). Here's what I found:\n\n- Wiki page is *ready* and was last regenerated when you uploaded the file.\n- No conflicting claims with newer sources on this specific topic.\n- I can pull a deeper excerpt or open the raw source — just ask.`,
          sources: [
            { idx: 1, docId: documents[0].id, name: documents[0].title, loc: '§ 1', snippet: 'Most relevant section pulled from this document — click to open the source viewer.' },
          ],
        };
        return [...filtered, reply];
      });
      setIsStreaming(false);
    }, 1600);
  };

  return (
    <section className="panel chat-panel">
      <div className="panel-header">
        <span className="label">Chat</span>
        <div className="meta">
          <button className="ghost-btn primary" onClick={onNewChat}>
            <Icon.Plus />
            <span>New chat</span>
          </button>
        </div>
      </div>
      <div className="chat-body" ref={bodyRef}>
        {messages.map((m, idx) => {
          // Attach follow-up suggestions to the LAST agent message (only if not streaming)
          const isLastAgent =
            m.role === 'agent' &&
            !isStreaming &&
            store.showSuggestions !== false &&
            messages.slice(idx + 1).every(x => x.role !== 'agent' && x.role !== 'hitl' && x.role !== 'typing');
          return (
            <MessageItem
              key={m.id}
              msg={m}
              onOpenDoc={openDocument}
              onResolveHitl={() => {}}
              suggestions={isLastAgent ? SUGGESTIONS.map(s => ({text: s, onPick: send})) : null}
            />
          );
        })}
      </div>
      <div className="chat-input-wrap">
        <div className={`chat-input ${isStreaming ? 'disabled' : ''}`}>
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder={isStreaming ? 'agent is responding…' : 'ask about your knowledge — enter to send, shift+enter newline'}
            rows={1}
          />
          <div className="chat-input-bottom">
            <span className="scope-chip"><span className="pip"/>{documents.filter(d => d.status === 'ready').length} sources in scope</span>
            <span className="hint">⏎ send · ⇧⏎ newline</span>
            <button className="send" onClick={send} disabled={!input.trim() || isStreaming} aria-label="Send">
              <Icon.Send />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ───────── Confirm dialog ─────────
function ConfirmDialog({ state }) {
  const cancelRef = useRef(null);
  useEffect(() => {
    if (!state || !state.open) return;
    cancelRef.current && cancelRef.current.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') state.resolve(false);
      if (e.key === 'Enter') state.resolve(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state]);
  if (!state || !state.open) return null;
  return (
    <div className="confirm-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) state.resolve(false); }}>
      <div className={`confirm-card ${state.danger ? 'danger' : ''}`} role="alertdialog" aria-modal="true">
        <div className="confirm-head">
          <span className={`confirm-icon ${state.danger ? 'danger' : ''}`}>
            {state.danger ? <Icon.Trash/> : <Icon.Sparkle/>}
          </span>
          <div className="confirm-titles">
            <div className="confirm-title">{state.title}</div>
            <div className="confirm-message">{state.message}</div>
          </div>
        </div>
        <div className="confirm-actions">
          <button
            ref={cancelRef}
            className="hitl-btn"
            onClick={() => state.resolve(false)}
          >
            {state.cancelText || 'Cancel'}
          </button>
          <button
            className={`hitl-btn ${state.danger ? 'danger' : 'primary'}`}
            onClick={() => state.resolve(true)}
          >
            {state.danger ? <Icon.Trash/> : <Icon.Check/>}
            {state.confirmText || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ───────── Resizer ─────────
function Resizer() {
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    // restore saved width
    const saved = parseInt(localStorage.getItem('cw:left-w') || '', 10);
    if (!isNaN(saved)) document.documentElement.style.setProperty('--left-w', saved + 'px');
  }, []);
  const onDown = (e) => {
    e.preventDefault();
    setDragging(true);
    document.body.classList.add('resizing');
    const shellInner = document.querySelector('.shell-inner');
    const rect = shellInner.getBoundingClientRect();
    const move = (ev) => {
      const x = (ev.clientX ?? (ev.touches && ev.touches[0]?.clientX)) - rect.left;
      // clamp: leave at least 320px for right panel + 8px handle
      const min = 280;
      const max = Math.max(min + 1, rect.width - 320 - 8);
      const w = Math.min(max, Math.max(min, x));
      document.documentElement.style.setProperty('--left-w', w + 'px');
    };
    const up = () => {
      setDragging(false);
      document.body.classList.remove('resizing');
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
      const w = getComputedStyle(document.documentElement).getPropertyValue('--left-w').trim();
      const px = parseInt(w, 10);
      if (!isNaN(px)) localStorage.setItem('cw:left-w', String(px));
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
  };
  const onDoubleClick = () => {
    document.documentElement.style.setProperty('--left-w', '520px');
    localStorage.setItem('cw:left-w', '520');
  };
  return (
    <div
      className={`resizer ${dragging ? 'dragging' : ''}`}
      onMouseDown={onDown}
      onTouchStart={onDown}
      onDoubleClick={onDoubleClick}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sources panel — double-click to reset"
      title="Drag to resize · double-click to reset"
    />
  );
}

// ───────── Root app ─────────
function App() {
  const store = useAppStore();
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "accent": "#06b6d4",
    "density": "comfortable",
    "showA2UI": true,
    "showSuggestions": true
  }/*EDITMODE-END*/;

  const [t, setTweak] = (window.useTweaks ? window.useTweaks(TWEAK_DEFAULTS) : [TWEAK_DEFAULTS, () => {}]);

  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('cw:theme') || 'dark'; } catch { return 'dark'; }
  });
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('cw:theme', theme); } catch {}
  }, [theme]);
  const toggleTheme = () => setTheme(th => th === 'dark' ? 'light' : 'dark');

  const [leftCollapsed, setLeftCollapsed] = useState(() => {
    try { return localStorage.getItem('cw:left-collapsed') === '1'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('cw:left-collapsed', leftCollapsed ? '1' : '0'); } catch {}
  }, [leftCollapsed]);

  // Custom confirm dialog
  const [confirmState, setConfirmState] = useState(null);
  const requestConfirm = useCallback((opts) => {
    return new Promise((resolve) => {
      const close = (result) => {
        setConfirmState(null);
        resolve(result);
      };
      setConfirmState({ ...opts, open: true, resolve: close });
    });
  }, []);

  // Apply tweaks to CSS
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', t.accent);
    const c = t.accent.replace('#', '');
    const r = parseInt(c.slice(0,2),16), g = parseInt(c.slice(2,4),16), b = parseInt(c.slice(4,6),16);
    document.documentElement.style.setProperty('--accent-dim', `rgba(${r}, ${g}, ${b}, 0.14)`);
    document.documentElement.style.setProperty('--accent-ring', `rgba(${r}, ${g}, ${b}, 0.35)`);
  }, [t.accent]);

  // Density: strip vertical padding on rows
  useEffect(() => {
    const id = 'tweak-density-style';
    let el = document.getElementById(id);
    if (!el) { el = document.createElement('style'); el.id = id; document.head.appendChild(el); }
    el.textContent = t.density === 'compact'
      ? `.material-row{padding:6px 10px}.chat-body{gap:14px;padding:14px 20px 10px}.msg-bubble{padding:8px 12px;font-size:12px}`
      : ``;
  }, [t.density]);

  // Hide A2UI in messages if toggled off
  const filteredMessages = useMemo(() => store.messages.map(m => {
    if (!t.showA2UI && m.a2ui) { const { a2ui, ...rest } = m; return rest; }
    return m;
  }), [store.messages, t.showA2UI]);

  const newChat = async () => {
    const ok = await requestConfirm({
      title: 'Start a new chat?',
      message: 'This conversation will close, but your files stay where they are.',
      confirmText: 'New chat',
      cancelText: 'Keep this one',
    });
    if (!ok) return;
    store.setMessages([{
      id: 'welcome',
      role: 'agent',
      ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      md: `Fresh start. I can see **${store.documents.filter(d => d.status === 'ready').length} files** in your library — ask me anything.`,
    }]);
  };

  const runResolver = async () => {
    const ok = await requestConfirm({
      title: 'Check for conflicts?',
      message: `I'll quietly scan 2 files I haven't checked yet and mark anything that looks like a disagreement. Nothing actually changes — the next time one of those topics comes up in chat, the assistant will ask you which file to trust.`,
      confirmText: 'Start checking',
      cancelText: 'Not now',
    });
    if (!ok) return;
    // (in a real app this would kick off the resolver agent)
  };

  const TP = window.TweaksPanel;
  const TS = window.TweakSection;
  const TC = window.TweakColor;
  const TR = window.TweakRadio;
  const TT = window.TweakToggle;

  // Wrap openDocument so clicking a source in chat expands the panel + opens detail
  const openDocAndShow = useCallback((id) => {
    setLeftCollapsed(false);
    store.openDocument(id);
  }, [store.openDocument]);

  const signOut = async () => {
    const ok = await requestConfirm({
      title: 'Sign out?',
      message: `You'll need to sign back in to see your library. Your files and chats stay safe.`,
      confirmText: 'Sign out',
      cancelText: 'Stay',
    });
    if (!ok) return;
    window.location.href = 'Sign in.html';
  };

  return (
    <>
      <AppHeader
        store={store}
        threadTitle={store.threadTitle}
        theme={theme}
        onToggleTheme={toggleTheme}
        onSignOut={signOut}
      />
      <div className="shell">
        <div className={`shell-inner ${leftCollapsed ? 'left-collapsed' : ''}`}>
          <LeftPanel
            store={{...store, messages: filteredMessages}}
            onResolverRun={runResolver}
            requestConfirm={requestConfirm}
            collapsed={leftCollapsed}
            onToggleCollapsed={() => {
              setLeftCollapsed(v => {
                // Collapsing → reset back to the documents list (not the detail view)
                if (!v) store.backToList();
                return !v;
              });
            }}
          />
          <Resizer />
          <ChatPanel
            store={{...store, messages: filteredMessages, showSuggestions: t.showSuggestions, openDocument: openDocAndShow}}
            onNewChat={newChat}
          />
        </div>
      </div>
      {store.isMobileDrawerOpen && (
        <div className="mobile-backdrop" onClick={() => store.setMobileDrawerOpen(false)}/>
      )}

      <ConfirmDialog state={confirmState}/>

      {TP && (
        <TP title="Chat Wiki tweaks">
          <TS label="Theme">
            <TC
              label="Accent"
              value={t.accent}
              onChange={(v) => setTweak('accent', v)}
              options={['#06b6d4', '#a78bfa', '#22c55e', '#f59e0b']}
            />
            <TR
              label="Density"
              value={t.density}
              onChange={(v) => setTweak('density', v)}
              options={[{label: 'Comfy', value: 'comfortable'}, {label: 'Compact', value: 'compact'}]}
            />
          </TS>
          <TS label="Chat features">
            <TT
              label="Show A2UI cards"
              value={t.showA2UI}
              onChange={(v) => setTweak('showA2UI', v)}
            />
            <TT
              label="Suggestion chips"
              value={t.showSuggestions}
              onChange={(v) => setTweak('showSuggestions', v)}
            />
          </TS>
        </TP>
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
