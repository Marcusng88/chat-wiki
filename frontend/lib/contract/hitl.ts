import { z } from 'zod'

export const HITLPayloadSchema = z.object({
  conflict_id: z.string(),
  conflict_type: z.string(),
  detail: z.string().default(''),
  recommendation: z.string(),
  recommended_document_id: z.string().nullable().optional(),
  documents: z.array(z.object({
    id: z.string(),
    title: z.string(),
    created_at: z.string(),
    stance: z.string().optional().default(''),
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
