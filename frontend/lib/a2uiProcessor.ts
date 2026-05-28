import { MessageProcessor } from '@a2ui/web_core/v0_9'
import { basicCatalog } from '@a2ui/react/v0_9'

let _processor = new MessageProcessor([basicCatalog as any])

export function getA2uiProcessor(): MessageProcessor<any> {
  return _processor
}

export function resetA2uiProcessor(): void {
  _processor = new MessageProcessor([basicCatalog as any])
}
