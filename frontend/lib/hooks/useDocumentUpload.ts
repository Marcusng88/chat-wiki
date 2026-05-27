'use client'

import { useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { presignDocument, uploadToStorage, confirmDocument } from '@/lib/api'
import { fileTypeFromExtension, fileTypeToApi } from '@/lib/types'
import type { Document } from '@/lib/types'

export function useDocumentUpload() {
  const setDocuments = useAppStore((s) => s.setDocuments)

  const upload = useCallback(async (files: File[]) => {
    for (const file of files) {
      const fileType = fileTypeFromExtension(file.name)
      const tempId = `tmp-${Date.now()}-${Math.random()}`
      const optimistic: Document = {
        id: tempId,
        title: file.name,
        fileType,
        status: 'uploading',
        progress: 0,
        hasConflict: false,
        pages: 1,
        addedAt: 'just now',
        size: file.size ? `${(file.size / 1024).toFixed(0)} KB` : '— KB',
      }
      setDocuments((prev) => [optimistic, ...prev])

      try {
        const { document_id, presigned_url } = await presignDocument(
          file.name,
          fileTypeToApi(fileType),
          file.name,
        )
        setDocuments((prev) => prev.map((d) => d.id === tempId ? { ...d, id: document_id } : d))

        await uploadToStorage(presigned_url, file, (pct) => {
          setDocuments((prev) => prev.map((d) => d.id === document_id ? { ...d, progress: pct } : d))
        })

        await confirmDocument(document_id)
        setDocuments((prev) =>
          prev.map((d) => d.id === document_id ? { ...d, status: 'uploaded', progress: undefined } : d)
        )
      } catch (e) {
        console.error('upload failed', e)
        setDocuments((prev) =>
          prev.map((d) =>
            (d.id === tempId || d.id === file.name)
              ? { ...d, status: 'failed', failReason: String(e) }
              : d
          )
        )
      }
    }
  }, [setDocuments])

  return { upload }
}
