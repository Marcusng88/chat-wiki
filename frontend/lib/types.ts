export type { DocumentStatus, FileType } from './contract/document'
export { DOCUMENT_STATUS, FILE_TYPE, PROCESSING_STATUSES } from './contract/document'

import type { FileType } from './contract/document'
import { FILE_TYPE } from './contract/document'

const _EXT_MAP: Record<string, FileType> = {
  pdf: FILE_TYPE.PDF,
  md: FILE_TYPE.MD,
  txt: FILE_TYPE.TXT,
  pptx: FILE_TYPE.PPTX,
  png: FILE_TYPE.IMG,
  jpg: FILE_TYPE.IMG,
  jpeg: FILE_TYPE.IMG,
  webp: FILE_TYPE.IMG,
}

const _API_MAP: Record<string, FileType> = {
  pdf: FILE_TYPE.PDF,
  md: FILE_TYPE.MD,
  txt: FILE_TYPE.TXT,
  pptx: FILE_TYPE.PPTX,
  image: FILE_TYPE.IMG,
}

export const FILE_TYPE_ICON_CLASS: Record<FileType, string> = {
  pdf: 'ftype-pdf',
  md: 'ftype-md',
  txt: 'ftype-txt',
  pptx: 'ftype-pptx',
  img: 'ftype-img',
}

export function fileTypeFromExtension(filename: string): FileType {
  const ext = (filename.split('.').pop() ?? '').toLowerCase()
  return _EXT_MAP[ext] ?? FILE_TYPE.TXT
}

export function fileTypeFromApi(apiType: string): FileType {
  return _API_MAP[apiType] ?? FILE_TYPE.TXT
}

export function fileTypeToApi(fileType: FileType): string {
  return fileType === FILE_TYPE.IMG ? 'image' : fileType
}

import type { DocumentStatus } from './contract/document'

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

export interface ToolCallStep {
  id: string
  name: string
  args: Record<string, unknown>
  status: 'streaming' | 'done'
}

export interface OpenUIBlock {
  type: 'openui'
  id: string
  content: string
}

export interface ErrorBlock {
  type: 'error'
  id: string
  message: string
}

export type Block = OpenUIBlock | ErrorBlock

export interface UserMessage {
  role: 'user'
  id: string
  content: string
  ts: string
}

export interface AgentMessage {
  role: 'agent'
  id: string
  ts: string
  blocks: Block[]
  sources?: MessageSource[]
  steps?: ToolCallStep[]
}

export interface TypingMessage {
  role: 'typing'
  id: string
}

export interface HITLMessage {
  role: 'hitl'
  id: string
  ts: string
  conflictType: string
  title: string
  explanation: string
  sources: HITLSource[]
  recommend: string
}

export type Message = UserMessage | AgentMessage | TypingMessage | HITLMessage
