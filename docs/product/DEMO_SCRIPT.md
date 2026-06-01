# Demo Video Script

Target length: **4 minutes** (comfortably inside 3–5 min). Voice-over, no face needed.

Each section: **[time] — what's on screen — what you say.** Lines in quotes are spoken verbatim; keep them tight, don't read the stage directions aloud.

---

## 0:00 – 0:30 · Hook + the problem

**Screen:** App open, left panel showing a few uploaded documents, chat empty.

> "This is chat-wiki. You upload your documents — PDFs, slides, notes — and it turns them into a knowledge base you can just talk to.
>
> But here's the part most 'chat with your docs' tools get wrong: when two of your files disagree on something, they quietly pick one and answer anyway. chat-wiki doesn't. It detects the conflict and asks *you* which source to trust. That's the core idea I built this around."

---

## 0:30 – 1:30 · Feature 1 — Upload → automatic wiki + index

**Screen:** Click upload, pick a file. Show the status badge animating: `uploading` → `processing` → `ready`.

> "Let me upload a document. The file goes straight to storage — it never round-trips through my API, so big files stay fast.
>
> Once it lands, a background agent pipeline takes over. Watch the status badge. Behind it, the document is being extracted, split into chunks, embedded into vectors, and turned into a wiki page and a topic index — automatically. No manual tagging."

**Screen:** Badge hits `ready`. Click the document to open its wiki page in the main panel.

> "When it flips to `ready`, it's queryable. Here's the AI-generated wiki page. One important decision: the embeddings I search over come from the *raw* text, never from this generated summary — so every answer traces back to real evidence, not a paraphrase of a paraphrase."

---

## 1:30 – 3:00 · Feature 2 — Conflict-aware Q&A with human-in-the-loop

**Screen:** Left panel — point at a document with a conflict flag icon.

> "Now the interesting part. A separate resolver agent scans my library and flags where sources contradict each other. See this flag? Two of my documents disagree. The resolver *only flags* — it never deletes or edits anything. That's always my call."

**Screen:** Type a question into the chat whose answer depends on the conflicting fact. Send it.

> "Let me ask a question that touches that disagreement."

**Screen:** Assistant starts answering, then a HITL decision card appears inline and the run pauses.

> "Instead of guessing, the assistant pauses mid-answer and shows me this card. Here are the two sources, here's exactly what they disagree on, and here's its recommendation. It's paused — it won't continue until I decide."

**Screen:** Click a source / "Use this one".

> "I'll pick this source as the one to trust."

**Screen:** Card collapses to a confirmation; assistant resumes and finishes the answer; left-panel flag clears.

> "The assistant resumes and finishes the answer using the source I chose — and notice the flag on the left just cleared, no refresh needed. The decision is recorded, so it stays resolved."

---

## 3:00 – 3:40 · How it works (architecture, fast)

**Screen:** Open `ARCHITECTURE.md` — show the flowchart diagrams scrolling.

> "Under the hood: the frontend is Next.js, the backend is FastAPI, and the agents run on DeepAgents and LangGraph. The reason I chose LangGraph is this pause-and-resume behavior — its interrupt mechanism is what powers the human-in-the-loop card you just saw.
>
> Everything streams to the browser over a single protocol — tokens, tool calls, and that interrupt — so the UI reacts live. Data sits in Supabase: Postgres with pgvector for search, plus storage and auth."

---

## 3:40 – 4:00 · Close

**Screen:** Back to the app, clean state.

> "So that's chat-wiki: upload anything, get a chat-able knowledge base, and when your sources disagree, you stay in control instead of getting a confidently wrong answer.
>
> If I had more time I'd add citation deep-links back to the exact source chunk, and handle multiple conflicts in a batch. Thanks for watching."

---

## Recording checklist

- [ ] Seed 3–4 documents **before** recording, including two that genuinely conflict (e.g. same topic, different number/date).
- [ ] Pre-run the resolver so the conflict flag is already visible — don't wait for it on camera.
- [ ] Have the conflict-triggering question typed out / copy-paste ready so you don't fumble.
- [ ] Clear the chat to a fresh thread before the take.
- [ ] Record at 1080p+; zoom the browser to ~110–125% so text is readable.
- [ ] One clean take per section is fine — cut between them in editing.
- [ ] Keep total under 5:00. If long, trim the architecture section first.

---

## One-paragraph version (fallback for a 60-second cut)

> "chat-wiki turns your documents into a knowledge base you can chat with. Upload a file and an agent pipeline automatically extracts, embeds, and builds a wiki and topic index from it. The standout feature: when two of your sources contradict each other, the assistant doesn't guess — it pauses mid-answer, shows you the conflict, and lets you pick which source to trust. It's built on Next.js, FastAPI, and LangGraph, whose interrupt mechanism powers that human-in-the-loop step, with Supabase and pgvector underneath."
