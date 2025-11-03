import { render, screen } from '@testing-library/react'
import { Header } from '@/components/dashboard/header'
import type { Profile } from '@/lib/types/database'

const mockUser: Profile = {
  id: 'user-123',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
  role: 'manager',
  company_id: 'company-123',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  company: {
    id: 'company-123',
    name: 'Test Company',
    subscription_status: 'active',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
}

describe('Header Component', () => {
  it('renders header with user information', () => {
    render(<Header user={mockUser} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('manager')).toBeInTheDocument()
  })

  it('displays search functionality', () => {
    render(<Header user={mockUser} />)

    const searchInput = screen.getByPlaceholderText('Search loads, vehicles, drivers...')
    expect(searchInput).toBeInTheDocument()
  })

  it('has proper header structure', () => {
    render(<Header user={mockUser} />)

    const header = screen.getByRole('banner')
    expect(header).toBeInTheDocument()
  })

  it('handles missing user names gracefully', () => {
    const userWithMissingData = {
      ...mockUser,
      first_name: null as any,
      last_name: null as any,
    }
    
    render(<Header user={userWithMissingData} />)
    
    // Should not crash and should still render the header
    const header = screen.getByRole('banner')
    expect(header).toBeInTheDocument()
  })
})
