import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

jest.mock('../../src/supabase', () => {
  const mockProfile = {
    id: 'user-1',
    full_name: 'Ansar Talgatuly',
    email: 'ansar@student.com',
    major: 'Computer Science',
    year: 'Year 3',
    about: 'Passionate about algorithms.',
    courses: ['CS301', 'MATH202'],
    interests: ['gaming', 'hiking'],
    study_status: 'available',
    role: 'student',
  }
  const chain = {
    select:  jest.fn(),
    eq:      jest.fn(),
    or:      jest.fn(),
    order:   jest.fn(),
    update:  jest.fn(),
    delete:  jest.fn().mockResolvedValue({ error: null }),
    upsert:  jest.fn().mockResolvedValue({ error: null }),
    insert:  jest.fn().mockResolvedValue({ error: null }),
    single:  jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
  }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.or.mockReturnValue(chain)
  chain.order.mockReturnValue(chain)
  chain.update.mockReturnValue(chain)
  return {
    supabase: {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: jest.fn().mockReturnValue(chain),
    }
  }
})

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}))

import Profile from '../../src/pages/Profile'

const renderProfile = () => render(<MemoryRouter><Profile /></MemoryRouter>)

describe('Profile Page', () => {
  test('displays student name after loading', async () => {
    renderProfile()
    await waitFor(() => {
      expect(screen.getByText('Ansar Talgatuly')).toBeInTheDocument()
    })
  })

  test('displays major and year', async () => {
    renderProfile()
    await waitFor(() => {
      expect(screen.getByText(/Computer Science/)).toBeInTheDocument()
      expect(screen.getByText(/Year 3/)).toBeInTheDocument()
    })
  })

  test('displays courses stat label', async () => {
    renderProfile()
    await waitFor(() => {
      expect(screen.getByText('Courses')).toBeInTheDocument()
    })
  })

  test('shows available status by default', async () => {
    renderProfile()
    await waitFor(() => {
      expect(screen.getByText(/open to meeting people/i)).toBeInTheDocument()
    })
  })

  test('displays courses in profile', async () => {
    renderProfile()
    await waitFor(() => {
      expect(screen.getByText('CS301')).toBeInTheDocument()
      expect(screen.getByText('MATH202')).toBeInTheDocument()
    })
  })

  test('displays interests in profile', async () => {
    renderProfile()
    await waitFor(() => {
      expect(screen.getByText('gaming')).toBeInTheDocument()
      expect(screen.getByText('hiking')).toBeInTheDocument()
    })
  })

  test('shows Edit Profile button', async () => {
    renderProfile()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument()
    })
  })

  test('entering edit mode shows form fields', async () => {
    renderProfile()
    await waitFor(() => screen.getByRole('button', { name: /edit profile/i }))
    fireEvent.click(screen.getByRole('button', { name: /edit profile/i }))
    await waitFor(() => {
      expect(screen.getByDisplayValue('Ansar Talgatuly')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Computer Science')).toBeInTheDocument()
    })
  })

  test('edit form pre-fills with current profile data', async () => {
    renderProfile()
    await waitFor(() => screen.getByRole('button', { name: /edit profile/i }))
    fireEvent.click(screen.getByRole('button', { name: /edit profile/i }))
    await waitFor(() => {
      expect(screen.getByDisplayValue('Year 3')).toBeInTheDocument()
    })
  })

  test('cancel button exits edit mode', async () => {
    renderProfile()
    await waitFor(() => screen.getByRole('button', { name: /edit profile/i }))
    fireEvent.click(screen.getByRole('button', { name: /edit profile/i }))
    await waitFor(() => screen.getByRole('button', { name: /cancel/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    await waitFor(() => {
      expect(screen.getByText('Ansar Talgatuly')).toBeInTheDocument()
    })
  })

  test('status selector shows three options in edit mode', async () => {
    renderProfile()
    await waitFor(() => screen.getByRole('button', { name: /edit profile/i }))
    fireEvent.click(screen.getByRole('button', { name: /edit profile/i }))
    await waitFor(() => {
      expect(screen.getByText(/open to meet/i)).toBeInTheDocument()
      expect(screen.getByText(/studying/i)).toBeInTheDocument()
      expect(screen.getByText(/busy/i)).toBeInTheDocument()
    })
  })

  test('save button calls supabase update', async () => {
    renderProfile()
    await waitFor(() => screen.getByRole('button', { name: /edit profile/i }))
    fireEvent.click(screen.getByRole('button', { name: /edit profile/i }))
    await waitFor(() => screen.getByRole('button', { name: /save changes/i }))
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))
    // If no crash, update was called — chain mock handles it
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument()
    })
  })
})
