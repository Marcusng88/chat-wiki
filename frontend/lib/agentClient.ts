import { HttpAgent } from '@ag-ui/client'

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000'

export function createChatAgent(authToken: string): HttpAgent {
  return new HttpAgent({
    url: `${BACKEND}/agent/chat`,
    headers: { Authorization: `Bearer ${authToken}` },
  })
}
