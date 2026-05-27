export type FileType = 'pdf' | 'md' | 'txt' | 'pptx' | 'img'

export type DocumentStatus =
  | 'uploading'          // frontend-only: XHR PUT in progress
  | 'uploaded'           // in DB, ingestion not started
  | 'extracting'
  | 'chunking'
  | 'embedding'
  | 'generating_wiki'
  | 'indexing'
  | 'conflict_scan'
  | 'ready'
  | 'failed_extraction'
  | 'failed_embedding'
  | 'failed_wiki'
  | 'failed_indexing'
  | 'unsupported'
  | 'failed'             // frontend-only: upload error before DB record created

export interface Document {
  id: string
  title: string
  fileType: FileType
  status: DocumentStatus
  hasConflict: boolean
  pages: number
  addedAt: string
  size: string
  wikiPage?: string
  summary?: string
  topics?: string[]
  raw?: string
  progress?: number
  failReason?: string
}

export interface MessageSource {
  idx: number
  docId: string
  name: string
  loc: string
  snippet: string
}

export interface HITLSource {
  id: string
  role: string
  name: string
  date: string
  claim: string
}

export interface A2UIRow {
  k: string
  v: string
}

export interface A2UIPayload {
  schema: string
  title: string
  rows: A2UIRow[]
}

export interface UserMessage {
  id: string
  role: 'user'
  content: string
  ts: string
}

export interface AgentMessage {
  id: string
  role: 'agent'
  ts: string
  md: string
  sources?: MessageSource[]
  a2ui?: A2UIPayload
}

export interface TypingMessage {
  id: string
  role: 'typing'
}

export interface HITLMessage {
  id: string
  role: 'hitl'
  ts: string
  conflictType: string
  title: string
  explanation: string
  sources: HITLSource[]
  recommend: string
}

export type Message = UserMessage | AgentMessage | TypingMessage | HITLMessage
