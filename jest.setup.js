require('@testing-library/jest-dom')


// Mock next/cache
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

// Mock next/navigation redirect
jest.mock('next/navigation', () => {
  const actual = jest.requireActual('next/navigation')
  return {
    ...actual,
    redirect: jest.fn((url) => {
      const error = new Error('NEXT_REDIRECT')
      error.digest = `NEXT_REDIRECT;${url}`
      throw error
    }),
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }),
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => '/',
  }
})

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

// Create a chainable mock for Supabase queries
const createChainableMock = (returnValue = { data: [], error: null }) => {
  const mock = jest.fn(() => mock)
  mock.select = jest.fn(() => mock)
  mock.insert = jest.fn(() => mock)
  mock.update = jest.fn(() => mock)
  mock.delete = jest.fn(() => mock)
  mock.eq = jest.fn(() => mock)
  mock.neq = jest.fn(() => mock)
  mock.gt = jest.fn(() => mock)
  mock.gte = jest.fn(() => mock)
  mock.lt = jest.fn(() => mock)
  mock.lte = jest.fn(() => mock)
  mock.like = jest.fn(() => mock)
  mock.ilike = jest.fn(() => mock)
  mock.in = jest.fn(() => mock)
  mock.contains = jest.fn(() => mock)
  mock.containedBy = jest.fn(() => mock)
  mock.range = jest.fn(() => mock)
  mock.order = jest.fn(() => mock)
  mock.limit = jest.fn(() => mock)
  mock.offset = jest.fn(() => mock)
  mock.single = jest.fn(() => Promise.resolve(returnValue))
  mock.maybeSingle = jest.fn(() => Promise.resolve(returnValue))
  mock.then = jest.fn((callback) => callback(returnValue))
  mock.catch = jest.fn()
  
  // Return the promise-like behavior
  Object.setPrototypeOf(mock, Promise.prototype)
  
  return mock
}

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(() => Promise.resolve({ 
      data: { user: { id: 'test-user-id', email: 'test@example.com' } }, 
      error: null 
    })),
    signOut: jest.fn(() => Promise.resolve({ error: null })),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } }))
  },
  from: jest.fn((table) => createChainableMock()),
  rpc: jest.fn(() => Promise.resolve({ data: 'LOAD-001', error: null }))
}

// Mock Supabase modules
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient))
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}))

jest.mock('@/lib/supabase/middleware', () => ({
  updateSession: jest.fn((request) => Promise.resolve())
}))

// Global test utilities
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock window.matchMedia only in jsdom environment
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}