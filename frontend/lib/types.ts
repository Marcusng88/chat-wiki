export type FileType = 'pdf' | 'md' | 'txt' | 'pptx' | 'img'
export type DocumentStatus = 'uploading' | 'processing' | 'ready' | 'failed'
export type ProcessingStage = 'extracting' | 'chunking' | 'generating_wiki' | 'indexing'

export interface WikiEntity {
  kind: string
  name: string
}

export interface WikiContent {
  summary: string
  concepts: string[]
  entities: WikiEntity[]
  retrieval: string
}

export interface Document {
  id: string
  title: string
  fileType: FileType
  status: DocumentStatus
  hasConflict: boolean
  pages: number
  addedAt: string
  size: string
  wiki?: WikiContent
  raw?: string
  progress?: number
  stage?: ProcessingStage
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
