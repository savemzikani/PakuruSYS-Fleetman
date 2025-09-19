import { render, screen } from '@testing-library/react'
import { Header } from '@/components/dashboard/header'

// Mock the user hook
jest.mock('@/lib/hooks/use-user', () => ({
  useUser: () => ({
    user: {
      id: 'user-123',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      role: 'manager',
      company: {
        id: 'company-123',
        name: 'Test Company'
      }
    },
    loading: false
  })
}))

describe('Header Component', () => {
  it('renders header with user information', () => {
    render(<Header />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('manager')).toBeInTheDocument()
  })

  it('displays company information', () => {
    render(<Header />)

    expect(screen.getByText('Test Company')).toBeInTheDocument()
  })

  it('has proper header structure', () => {
    render(<Header />)

    const header = screen.getByRole('banner')
    expect(header).toBeInTheDocument()
  })
})