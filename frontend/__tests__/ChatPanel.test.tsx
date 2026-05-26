import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useAppStore } from '@/store/useAppStore'
import ChatPanel from '@/components/ChatPanel'

beforeEach(() => {
  useAppStore.setState(useAppStore.getInitialState())
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
})

const ALL_MSG_TYPES = [
  { id: '1', type: 'user' as const, content: 'Hello' },
  { id: '2', type: 'agent' as const, content: '**Bold** response' },
  { id: '3', type: 'typing' as const },
  { id: '4', type: 'hitl' as const },
  { id: '5', type: 'a2ui' as const },
]

describe('ChatPanel — message rendering', () => {
  it('renders all 5 message types without errors', () => {
    useAppStore.setState({ messages: ALL_MSG_TYPES })
    render(<ChatPanel />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByTestId('msg-typing')).toBeInTheDocument()
    expect(screen.getByTestId('msg-hitl')).toBeInTheDocument()
    expect(screen.getByTestId('msg-a2ui')).toBeInTheDocument()
  })

  it('user message is right-aligned', () => {
    useAppStore.setState({ messages: [{ id: '1', type: 'user', content: 'Hi' }] })
    render(<ChatPanel />)
    const bubble = screen.getByText('Hi').closest('div')!
    const wrapper = bubble.parentElement!
    expect(wrapper).toHaveClass('justify-end')
  })

  it('agent message is left-aligned', () => {
    useAppStore.setState({ messages: [{ id: '2', type: 'agent', content: 'Hey' }] })
    render(<ChatPanel />)
    const wrapper = screen.getByText('Hey').closest('.justify-start')
    expect(wrapper).toBeInTheDocument()
  })
})

describe('ChatPanel — header', () => {
  it('renders app name and New Chat button', () => {
    render(<ChatPanel />)
    expect(screen.getByText('Chat Wiki')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /new chat/i })).toBeInTheDocument()
  })
})

describe('ChatPanel — New Chat', () => {
  it('clears messages and sets new threadId on click', () => {
    useAppStore.setState({
      messages: [{ id: '1', type: 'user', content: 'old' }],
      threadId: 'old-thread',
    })
    render(<ChatPanel />)
    fireEvent.click(screen.getByRole('button', { name: /new chat/i }))
    const state = useAppStore.getState()
    expect(state.messages).toEqual([])
    expect(state.threadId).not.toBe('old-thread')
    expect(state.threadId).not.toBeNull()
  })
})
