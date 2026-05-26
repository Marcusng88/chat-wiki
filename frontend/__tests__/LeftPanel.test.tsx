import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useAppStore } from '@/store/useAppStore'
import LeftPanel from '@/components/LeftPanel'

const MOCK_DOCS = [
  { id: 'doc-1', name: 'architecture.pdf', status: 'ready' as const },
  { id: 'doc-2', name: 'notes.md', status: 'processing' as const },
  { id: 'doc-3', name: 'slides.pptx', status: 'uploading' as const },
  { id: 'doc-4', name: 'report.txt', status: 'failed' as const },
  { id: 'doc-5', name: 'diagram.png', status: 'conflict' as const },
]

beforeEach(() => {
  useAppStore.setState(useAppStore.getInitialState())
})

describe('LeftPanel — material rows', () => {
  it('renders a row for each document in store', () => {
    useAppStore.setState({ documents: MOCK_DOCS })
    render(<LeftPanel />)
    MOCK_DOCS.forEach(doc => {
      expect(screen.getByText(doc.name)).toBeInTheDocument()
    })
  })

  it('title element has full name as tooltip attribute', () => {
    useAppStore.setState({ documents: [MOCK_DOCS[0]] })
    render(<LeftPanel />)
    const nameEl = screen.getByTitle('architecture.pdf')
    expect(nameEl).toBeInTheDocument()
  })

  it('status badge color matches CSS variable for each status', () => {
    useAppStore.setState({ documents: MOCK_DOCS })
    render(<LeftPanel />)
    const readyBadge = screen.getByTestId('status-badge-doc-1')
    expect(readyBadge).toHaveStyle({ color: 'var(--color-status-ready)' })
    const failedBadge = screen.getByTestId('status-badge-doc-4')
    expect(failedBadge).toHaveStyle({ color: 'var(--color-status-failed)' })
  })

  it('conflicted doc shows conflict badge color', () => {
    useAppStore.setState({ documents: [MOCK_DOCS[0]], activeConflicts: ['doc-1'] })
    render(<LeftPanel />)
    const badge = screen.getByTestId('status-badge-doc-1')
    expect(badge).toHaveStyle({ color: 'var(--color-status-conflict)' })
    expect(badge).toHaveTextContent('conflict')
  })
})

describe('LeftPanel — delete flow', () => {
  it('3-dot button opens menu with Delete option', () => {
    useAppStore.setState({ documents: [MOCK_DOCS[0]] })
    render(<LeftPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Options for architecture.pdf' }))
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument()
  })

  it('clicking Delete shows confirmation dialog', () => {
    useAppStore.setState({ documents: [MOCK_DOCS[0]] })
    render(<LeftPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Options for architecture.pdf' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }))
    expect(screen.getByText(/Delete.*architecture\.pdf/)).toBeInTheDocument()
  })

  it('confirming delete removes doc from store', () => {
    useAppStore.setState({ documents: MOCK_DOCS })
    render(<LeftPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Options for architecture.pdf' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    const docs = useAppStore.getState().documents
    expect(docs.find(d => d.id === 'doc-1')).toBeUndefined()
    expect(docs).toHaveLength(MOCK_DOCS.length - 1)
  })
})

describe('LeftPanel — upload zone', () => {
  it('renders upload zone with accepted types label', () => {
    render(<LeftPanel />)
    expect(screen.getByTestId('upload-zone')).toBeInTheDocument()
    expect(screen.getByText('PDF, MD, TXT, PPTX, Images')).toBeInTheDocument()
  })

  it('dragover sets drag-active state on upload zone', () => {
    render(<LeftPanel />)
    const zone = screen.getByTestId('upload-zone')
    fireEvent.dragOver(zone)
    expect(zone).toHaveAttribute('data-drag-active', 'true')
    fireEvent.dragLeave(zone)
    expect(zone).toHaveAttribute('data-drag-active', 'false')
  })
})
