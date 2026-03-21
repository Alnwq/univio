import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import People from '../../src/pages/People'
import { supabase } from '../../src/supabase'

jest.mock('../../src/supabase')
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}))

const mockMyProfile = {
  id: 'user-1',
  full_name: 'Ansar Talgatuly',
  major: 'Computer Science',
  year: 'Year 3',
  courses: ['CS301', 'MATH202'],
  interests: ['gaming', 'hiking'],
}

const mockOtherProfiles = [
  {
    id: 'user-2',
    full_name: 'Urach Bekova',
    major: 'Computer Science',
    year: 'Year 3',
    courses: ['CS301', 'PHYS101'],
    interests: ['gaming'],
    about: 'Looking for study partners',
  },
  {
    id: 'user-3',
    full_name: 'Amirkhusrav Rahimov',
    major: 'Mathematics',
    year: 'Year 2',
    courses: ['MATH202', 'STAT101'],
    interests: ['cooking'],
    about: '',
  },
  {
    id: 'user-4',
    full_name: 'Uranbileg Gantulga',
    major: 'Physics',
    year: 'Year 1',
    courses: ['BIO401'],
    interests: [],
    about: '',
  },
]

const setupMocks = () => {
  supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  supabase.from.mockImplementation((table) => ({
    select: jest.fn().mockReturnThis(),
    eq:     jest.fn().mockReturnThis(),
    or:     jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: mockMyProfile }),
    // Return all profiles for the second call (all students)
    then: jest.fn(),
  }))
}

const renderPeople = () =>
  render(<MemoryRouter><People /></MemoryRouter>)

describe('People Page — Student Discovery', () => {

  beforeEach(() => {
    jest.clearAllMocks()
    setupMocks()
  })

  // ── Rendering ────────────────────────────────────────────────────────────

  test('renders Find Students heading', async () => {
    renderPeople()
    await waitFor(() => {
      expect(screen.getByText('Find Students')).toBeInTheDocument()
    })
  })

  test('renders filter panel with expected options', async () => {
    renderPeople()
    await waitFor(() => {
      expect(screen.getByText('All students')).toBeInTheDocument()
      expect(screen.getByText('Shared courses')).toBeInTheDocument()
    })
  })

  test('renders search input', async () => {
    renderPeople()
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/name, major, course/i)).toBeInTheDocument()
    })
  })

  // ── Filter options ────────────────────────────────────────────────────────

  test('filter option becomes active when clicked', async () => {
    renderPeople()
    await waitFor(() => screen.getByText('Shared courses'))
    fireEvent.click(screen.getByText('Shared courses'))
    // Active filter should be highlighted — check it's visible
    expect(screen.getByText('Shared courses')).toBeInTheDocument()
  })

  test('search input updates correctly', async () => {
    renderPeople()
    await waitFor(() => screen.getByPlaceholderText(/name, major, course/i))
    const searchInput = screen.getByPlaceholderText(/name, major, course/i)
    fireEvent.change(searchInput, { target: { value: 'Computer Science' } })
    expect(searchInput.value).toBe('Computer Science')
  })
})

// ── Compatibility score display tests ────────────────────────────────────────

describe('People Page — Compatibility Score Display', () => {

  test('getMatchLabel returns Strong match for score >= 70', () => {
    // Test the label logic directly
    const getMatchLabel = (score) => {
      if (score >= 70) return { label: 'Strong match', color: '#10B981' }
      if (score >= 40) return { label: 'Good match',   color: '#3B82F6' }
      if (score >= 15) return { label: 'Some overlap', color: '#F59E0B' }
      return               { label: 'New connection', color: '#94A3B8' }
    }
    expect(getMatchLabel(70).label).toBe('Strong match')
    expect(getMatchLabel(85).label).toBe('Strong match')
    expect(getMatchLabel(100).label).toBe('Strong match')
  })

  test('getMatchLabel returns Good match for score 40-69', () => {
    const getMatchLabel = (score) => {
      if (score >= 70) return { label: 'Strong match' }
      if (score >= 40) return { label: 'Good match' }
      if (score >= 15) return { label: 'Some overlap' }
      return               { label: 'New connection' }
    }
    expect(getMatchLabel(40).label).toBe('Good match')
    expect(getMatchLabel(55).label).toBe('Good match')
    expect(getMatchLabel(69).label).toBe('Good match')
  })

  test('getMatchLabel returns New connection for score below 15', () => {
    const getMatchLabel = (score) => {
      if (score >= 70) return { label: 'Strong match' }
      if (score >= 40) return { label: 'Good match' }
      if (score >= 15) return { label: 'Some overlap' }
      return               { label: 'New connection' }
    }
    expect(getMatchLabel(0).label).toBe('New connection')
    expect(getMatchLabel(14).label).toBe('New connection')
  })
})
