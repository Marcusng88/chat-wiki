export const DOCUMENT_STATUS = {
  UPLOADING: 'uploading',
  UPLOADED: 'uploaded',
  EXTRACTING: 'extracting',
  CHUNKING: 'chunking',
  EMBEDDING: 'embedding',
  GENERATING_WIKI: 'generating_wiki',
  INDEXING: 'indexing',
  CONFLICT_SCAN: 'conflict_scan',
  READY: 'ready',
  FAILED_EXTRACTION: 'failed_extraction',
  FAILED_EMBEDDING: 'failed_embedding',
  FAILED_WIKI: 'failed_wiki',
  FAILED_INDEXING: 'failed_indexing',
  UNSUPPORTED: 'unsupported',
  FAILED: 'failed',
} as const

export type DocumentStatus = (typeof DOCUMENT_STATUS)[keyof typeof DOCUMENT_STATUS]

export const PROCESSING_STATUSES = new Set<DocumentStatus>([
  DOCUMENT_STATUS.UPLOADED,
  DOCUMENT_STATUS.EXTRACTING,
  DOCUMENT_STATUS.CHUNKING,
  DOCUMENT_STATUS.EMBEDDING,
  DOCUMENT_STATUS.GENERATING_WIKI,
  DOCUMENT_STATUS.INDEXING,
  DOCUMENT_STATUS.CONFLICT_SCAN,
])

export const FILE_TYPE = {
  PDF: 'pdf',
  MD: 'md',
  TXT: 'txt',
  PPTX: 'pptx',
  IMG: 'img',
} as const

export type FileType = (typeof FILE_TYPE)[keyof typeof FILE_TYPE]
