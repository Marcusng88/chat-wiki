import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useAppStore } from '@/store/useAppStore'
import TwoPanelShell from '@/components/TwoPanelShell'

beforeEach(() => {
  useAppStore.setState(useAppStore.getInitialState())
})

describe('TwoPanelShell — panels render', () => {
  it('renders left panel and main panel placeholders', () => {
    render(<TwoPanelShell />)
    expect(screen.getByTestId('left-panel')).toBeInTheDocument()
    expect(screen.getByTestId('main-panel')).toBeInTheDocument()
  })
})

describe('TwoPanelShell — mobile drawer', () => {
  it('backdrop renders when isMobileDrawerOpen is true', () => {
    useAppStore.setState({ isMobileDrawerOpen: true })
    render(<TwoPanelShell />)
    expect(screen.getByLabelText('Close drawer')).toBeInTheDocument()
  })

  it('backdrop click sets isMobileDrawerOpen to false', () => {
    useAppStore.setState({ isMobileDrawerOpen: true })
    render(<TwoPanelShell />)
    fireEvent.click(screen.getByLabelText('Close drawer'))
    expect(useAppStore.getState().isMobileDrawerOpen).toBe(false)
  })
})

describe('TwoPanelShell — hamburger', () => {
  it('hamburger button is present in DOM', () => {
    render(<TwoPanelShell />)
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument()
  })

  it('clicking hamburger sets isMobileDrawerOpen to true', () => {
    render(<TwoPanelShell />)
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(useAppStore.getState().isMobileDrawerOpen).toBe(true)
  })
})
