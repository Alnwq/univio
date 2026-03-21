const mockProfile = {
  id: 'user-1',
  full_name: 'Ansar Talgatuly',
  email: 'test@student.com',
  major: 'Computer Science',
  year: 'Year 3',
  courses: ['CS301', 'MATH202'],
  interests: ['gaming', 'hiking'],
  study_status: 'available',
  role: 'supervisor',
}

const mockUser = { id: 'user-1', email: 'test@student.com' }

// A proxy-based chain: every property access returns a jest.fn()
// that returns the chain itself, except .single() which returns a resolved promise.
function makeChain() {
  const resolved = { data: mockProfile, error: null }
  const resolvedArr = { data: [], error: null }

  const chain = new Proxy({}, {
    get(target, prop) {
      if (prop === 'single') {
        return jest.fn().mockResolvedValue(resolved)
      }
      if (prop === 'then') {
        // Make the chain itself awaitable and resolve to array result
        return undefined
      }
      if (prop in target) return target[prop]
      // Any other method: return a function that returns the chain
      target[prop] = jest.fn().mockReturnValue(chain)
      return target[prop]
    }
  })

  // Pre-define terminal methods
  chain.single = jest.fn().mockResolvedValue(resolved)
  chain.insert = jest.fn().mockResolvedValue(resolvedArr)
  chain.upsert = jest.fn().mockResolvedValue(resolvedArr)
  chain.delete = jest.fn().mockResolvedValue(resolvedArr)

  return chain
}

export const supabase = {
  auth: {
    getUser:            jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
    signInWithPassword: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
    signUp:             jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
    signOut:            jest.fn().mockResolvedValue({ error: null }),
  },
  from: jest.fn().mockImplementation(() => makeChain()),
  rpc:  jest.fn().mockResolvedValue({ error: null }),
}

export { mockUser, mockProfile }