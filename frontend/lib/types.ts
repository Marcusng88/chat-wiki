export type FileType = 'pdf' | 'md' | 'txt' | 'pptx' | 'img'

const _EXT_MAP: Record<string, FileType> = {
  pdf: 'pdf', md: 'md', txt: 'txt', pptx: 'pptx',
  png: 'img', jpg: 'img', jpeg: 'img', webp: 'img',
}

const _API_MAP: Record<string, FileType> = {
  pdf: 'pdf', md: 'md', txt: 'txt', pptx: 'pptx', image: 'img',
}

export const FILE_TYPE_ICON_CLASS: Record<FileType, string> = {
  pdf: 'ftype-pdf', md: 'ftype-md', txt: 'ftype-txt', pptx: 'ftype-pptx', img: 'ftype-img',
}

export function fileTypeFromExtension(filename: string): FileType {
  const ext = (filename.split('.').pop() ?? '').toLowerCase()
  return _EXT_MAP[ext] ?? 'txt'
}

export function fileTypeFromApi(apiType: string): FileType {
  return _API_MAP[apiType] ?? 'txt'
}

export function fileTypeToApi(fileType: FileType): string {
  return fileType === 'img' ? 'image' : fileType
}

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
  name: string
  date: string
}

export interface UserMessage {
  id: string
  role: 'user'
  content: string
  ts: string
}

export interface TextBlock {
  type: 'text'
  id: string
  md: string
}

export interface A2UIBlock {
  type: 'a2ui'
  surfaceId: string
}

export type Block = TextBlock | A2UIBlock

export interface AgentMessage {
  id: string
  role: 'agent'
  ts: string
  blocks: Block[]
  sources?: MessageSource[]
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
