import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Login from '../../src/pages/Login'
import { supabase } from '../../src/supabase'

jest.mock('../../src/supabase')
const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

const renderLogin = () => render(<MemoryRouter><Login /></MemoryRouter>)

describe('Authentication — Login Page', () => {
  beforeEach(() => jest.clearAllMocks())

  test('renders login form by default', () => {
    renderLogin()
    expect(screen.getByText('Welcome back')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('you@university.edu')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  test('does not show full name field on login mode', () => {
    renderLogin()
    expect(screen.queryByPlaceholderText('Your name')).not.toBeInTheDocument()
  })

  test('switches to sign up mode when Sign Up button is clicked', () => {
    renderLogin()
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))
    // Use role=heading to avoid matching the submit button with same text
    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Your name')).toBeInTheDocument()
  })

  test('switches back to login from sign up mode', () => {
    renderLogin()
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(screen.getByText('Welcome back')).toBeInTheDocument()
  })

  test('calls signInWithPassword with correct credentials on submit', async () => {
    supabase.auth.signInWithPassword.mockResolvedValueOnce({ data: {}, error: null })
    renderLogin()
    fireEvent.change(screen.getByPlaceholderText('you@university.edu'), { target: { value: 'test@student.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'),           { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@student.com',
        password: 'password123',
      })
    })
  })

  test('navigates to /feed after successful login', async () => {
    supabase.auth.signInWithPassword.mockResolvedValueOnce({ data: {}, error: null })
    renderLogin()
    fireEvent.change(screen.getByPlaceholderText('you@university.edu'), { target: { value: 'test@student.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'),           { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/feed'))
  })

  test('displays error message on failed login', async () => {
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: null, error: { message: 'Invalid login credentials' }
    })
    renderLogin()
    fireEvent.change(screen.getByPlaceholderText('you@university.edu'), { target: { value: 'wrong@email.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'),           { target: { value: 'wrongpass' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => {
      expect(screen.getByText('Invalid login credentials')).toBeInTheDocument()
    })
  })

  test('clears error when switching between login and sign up', async () => {
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: null, error: { message: 'Invalid login credentials' }
    })
    renderLogin()
    fireEvent.change(screen.getByPlaceholderText('you@university.edu'), { target: { value: 'x@x.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'),           { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => screen.getByText('Invalid login credentials'))
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))
    expect(screen.queryByText('Invalid login credentials')).not.toBeInTheDocument()
  })

  test('calls signUp with correct data on registration', async () => {
    supabase.auth.signUp.mockResolvedValueOnce({ data: {}, error: null })
    renderLogin()
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))
    fireEvent.change(screen.getByPlaceholderText('Your name'),          { target: { value: 'Ansar Test' } })
    fireEvent.change(screen.getByPlaceholderText('you@university.edu'), { target: { value: 'ansar@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'),           { target: { value: 'securepass' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => {
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'ansar@test.com',
        password: 'securepass',
        options: { data: { full_name: 'Ansar Test' } },
      })
    })
  })

  test('shows confirmation message after successful registration', async () => {
    supabase.auth.signUp.mockResolvedValueOnce({ data: {}, error: null })
    renderLogin()
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))
    fireEvent.change(screen.getByPlaceholderText('Your name'),          { target: { value: 'Test User' } })
    fireEvent.change(screen.getByPlaceholderText('you@university.edu'), { target: { value: 'test@email.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'),           { target: { value: 'pass123' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument()
    })
  })

  test('shows loading state while submitting', async () => {
    supabase.auth.signInWithPassword.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({ data: {}, error: null }), 100))
    )
    renderLogin()
    fireEvent.change(screen.getByPlaceholderText('you@university.edu'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'),           { target: { value: 'pass' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(screen.getByText(/please wait/i)).toBeInTheDocument()
  })
})
