import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '@/store/useAppStore'

beforeEach(() => {
  useAppStore.setState(useAppStore.getInitialState())
})

describe('useAppStore — default state', () => {
  it('initializes with empty collections and correct defaults', () => {
    const state = useAppStore.getState()
    expect(state.documents).toEqual([])
    expect(state.messages).toEqual([])
    expect(state.activeConflicts).toEqual([])
    expect(state.threadId).toBeNull()
    expect(state.leftPanelView).toBe('list')
    expect(state.selectedDocumentId).toBeNull()
    expect(state.isStreaming).toBe(false)
    expect(state.isMobileDrawerOpen).toBe(false)
  })
})

describe('useAppStore — leftPanelView', () => {
  it('transitions list → detail → list', () => {
    const { setLeftPanelView } = useAppStore.getState()
    setLeftPanelView('detail')
    expect(useAppStore.getState().leftPanelView).toBe('detail')
    setLeftPanelView('list')
    expect(useAppStore.getState().leftPanelView).toBe('list')
  })

  it('sets selectedDocumentId alongside detail view', () => {
    const { setSelectedDocumentId, setLeftPanelView } = useAppStore.getState()
    setLeftPanelView('detail')
    setSelectedDocumentId('doc-123')
    expect(useAppStore.getState().selectedDocumentId).toBe('doc-123')
    setLeftPanelView('list')
    expect(useAppStore.getState().selectedDocumentId).toBeNull()
  })
})

describe('useAppStore — messages', () => {
  it('appends user then agent message in order', () => {
    const { addMessage } = useAppStore.getState()
    addMessage({ id: '1', type: 'user', content: 'hello' })
    addMessage({ id: '2', type: 'agent', content: 'world', hasSources: false })
    const { messages } = useAppStore.getState()
    expect(messages).toHaveLength(2)
    expect(messages[0].type).toBe('user')
    expect(messages[1].type).toBe('agent')
  })

  it('clearMessages empties the list and resets threadId', () => {
    const { addMessage, clearMessages, setThreadId } = useAppStore.getState()
    setThreadId('thread-old')
    addMessage({ id: '1', type: 'user', content: 'hello' })
    clearMessages('thread-new')
    const state = useAppStore.getState()
    expect(state.messages).toEqual([])
    expect(state.threadId).toBe('thread-new')
  })
})

describe('useAppStore — isStreaming', () => {
  it('locks and unlocks streaming', () => {
    const { setIsStreaming } = useAppStore.getState()
    setIsStreaming(true)
    expect(useAppStore.getState().isStreaming).toBe(true)
    setIsStreaming(false)
    expect(useAppStore.getState().isStreaming).toBe(false)
  })
})

describe('useAppStore — activeConflicts', () => {
  it('sets conflict list and count is derivable', () => {
    const { setActiveConflicts } = useAppStore.getState()
    setActiveConflicts(['doc-a', 'doc-b', 'doc-c'])
    const { activeConflicts } = useAppStore.getState()
    expect(activeConflicts).toHaveLength(3)
    expect(activeConflicts).toContain('doc-b')
  })

  it('clearing conflicts sets empty array', () => {
    const { setActiveConflicts } = useAppStore.getState()
    setActiveConflicts(['doc-a'])
    setActiveConflicts([])
    expect(useAppStore.getState().activeConflicts).toEqual([])
  })
})
