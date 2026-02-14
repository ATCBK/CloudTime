import { registerTaskHandlers } from './tasks'
import { registerInspirationHandlers } from './inspirations'

export function registerIpcHandlers(): void {
  registerTaskHandlers()
  registerInspirationHandlers()
}
