import { z } from 'zod'

export const HITLPayloadSchema = z.object({
  conflict_id: z.string(),
  conflict_type: z.string(),
  recommendation: z.string(),
  documents: z.array(z.object({
    id: z.string(),
    title: z.string(),
    created_at: z.string(),
  })),
})

export type HITLPayload = z.infer<typeof HITLPayloadSchema>

export interface HITLResumeCommand {
  command: {
    resume: {
      action: 'approve' | 'modify' | 'reject'
      preferred_document_id: string | null
      notes: string | null
    }
  }
}
