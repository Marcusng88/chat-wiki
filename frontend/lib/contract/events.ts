import type { HITLPayload } from './hitl'

export type ChatAction =
  | { type: 'USER_SENT'; text: string; msgId: string }
  | { type: 'TOOL_OPENED'; stepId: string; name: string }
  | { type: 'TOOL_ARGS'; stepId: string; argsDelta: string }
  | { type: 'TOOL_CLOSED'; stepId: string }
  | { type: 'BLOCK_STARTED'; blockId: string }
  | { type: 'BLOCK_DELTA'; blockId: string; delta: string }
  | { type: 'BLOCK_CLOSED'; blockId: string }
  | { type: 'INTERRUPTED'; hitl: HITLPayload }
  | { type: 'RESUMING' }
  | { type: 'RUN_FINISHED' }
  | { type: 'RUN_ERROR'; message: string }
