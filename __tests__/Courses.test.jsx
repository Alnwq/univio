import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Mock supabase inline with full chain support
jest.mock('../../src/supabase', () => {
  const mockProfile = {
    id: 'user-1', full_name: 'Ansar', role: 'supervisor',
    courses: [], interests: [], study_status: 'available',
  }
  const chain = {
    select:  jest.fn(),
    eq:      jest.fn(),
    in:      jest.fn(),
    or:      jest.fn(),
    order:   jest.fn(),
    upsert:  jest.fn().mockResolvedValue({ error: null }),
    insert:  jest.fn().mockResolvedValue({ error: null }),
    update:  jest.fn(),
    delete:  jest.fn().mockResolvedValue({ error: null }),
    single:  jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
  }
  // All chaining methods return the same chain object
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.in.mockReturnValue(chain)
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

import Courses from '../../src/pages/Courses'

const renderCourses = () => render(<MemoryRouter><Courses /></MemoryRouter>)

describe('Courses Page', () => {
  test('renders My Courses heading', async () => {
    renderCourses()
    await waitFor(() => {
      expect(screen.getByText('My Courses')).toBeInTheDocument()
    })
  })

  test('renders Add Course button', async () => {
    renderCourses()
    await waitFor(() => {
      expect(screen.getByText(/\+ Add Course/i)).toBeInTheDocument()
    })
  })

  test('opens add course modal when button is clicked', async () => {
    renderCourses()
    await waitFor(() => screen.getByText(/\+ Add Course/i))
    fireEvent.click(screen.getByText(/\+ Add Course/i))
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/e\.g\. CS301/i)).toBeInTheDocument()
    })
  })

  test('modal has course code and course name inputs', async () => {
    renderCourses()
    await waitFor(() => screen.getByText(/\+ Add Course/i))
    fireEvent.click(screen.getByText(/\+ Add Course/i))
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/e\.g\. CS301/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/e\.g\. Data Structures/i)).toBeInTheDocument()
    })
  })

  test('closing modal with cancel removes it from view', async () => {
    renderCourses()
    await waitFor(() => screen.getByText(/\+ Add Course/i))
    fireEvent.click(screen.getByText(/\+ Add Course/i))
    await waitFor(() => screen.getByRole('button', { name: /cancel/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/e\.g\. CS301/i)).not.toBeInTheDocument()
    })
  })

  test('shows empty state when no courses enrolled', async () => {
    renderCourses()
    await waitFor(() => {
      expect(screen.getByText(/No courses yet/i)).toBeInTheDocument()
    })
  })
})
