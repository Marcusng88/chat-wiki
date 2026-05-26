import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SignInPage from '@/app/sign-in/page'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const mockSignInWithPassword = vi.fn()
const mockSignInWithOAuth = vi.fn()
vi.mock('@/lib/supabase', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockSignInWithPassword.mockResolvedValue({ error: null })
  mockSignInWithOAuth.mockResolvedValue({ error: null })
})

describe('SignIn — rendering', () => {
  it('renders email field', () => {
    render(<SignInPage />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  })

  it('renders password field', () => {
    render(<SignInPage />)
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
  })

  it('renders Sign in submit button', () => {
    render(<SignInPage />)
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument()
  })

  it('renders Google SSO button', () => {
    render(<SignInPage />)
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument()
  })

  it('renders brand name', () => {
    render(<SignInPage />)
    expect(screen.getByText(/chat/i)).toBeInTheDocument()
  })

  it('no error message visible by default', () => {
    render(<SignInPage />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('SignIn — password visibility toggle', () => {
  it('password field starts as type=password', () => {
    render(<SignInPage />)
    expect(screen.getByLabelText(/^password$/i)).toHaveAttribute('type', 'password')
  })

  it('clicking show-password button reveals password', () => {
    render(<SignInPage />)
    fireEvent.click(screen.getByRole('button', { name: /show password/i }))
    expect(screen.getByLabelText(/^password$/i)).toHaveAttribute('type', 'text')
  })

  it('clicking again hides password', () => {
    render(<SignInPage />)
    const toggle = screen.getByRole('button', { name: /show password/i })
    fireEvent.click(toggle)
    fireEvent.click(screen.getByRole('button', { name: /hide password/i }))
    expect(screen.getByLabelText(/^password$/i)).toHaveAttribute('type', 'password')
  })
})

describe('SignIn — form submission', () => {
  it('calls signInWithPassword with email and password', async () => {
    render(<SignInPage />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'secret123' } })
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))
    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'secret123',
      })
    })
  })

  it('redirects to / on success', async () => {
    render(<SignInPage />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'secret123' } })
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('shows error alert on auth failure', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({ error: { message: 'Invalid login credentials' } })
    render(<SignInPage />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'bad@example.com' } })
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  it('disables submit button while loading', async () => {
    mockSignInWithPassword.mockReturnValue(new Promise(() => {})) // never resolves
    render(<SignInPage />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'secret123' } })
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign/i })).toBeDisabled()
    })
  })
})

describe('SignIn — Google SSO', () => {
  it('calls signInWithOAuth with google provider', async () => {
    render(<SignInPage />)
    fireEvent.click(screen.getByRole('button', { name: /google/i }))
    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: expect.objectContaining({ redirectTo: expect.any(String) }),
      })
    })
  })
})
