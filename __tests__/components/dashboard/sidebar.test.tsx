import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { usePathname, useRouter } from 'next/navigation'
import { Sidebar } from '@/components/dashboard/sidebar'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types/database'

// Mock dependencies
jest.mock('next/navigation')
jest.mock('@/lib/supabase/client')

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

describe('Sidebar', () => {
  const mockPush = jest.fn()
  const mockSupabase = {
    auth: {
      signOut: jest.fn(),
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue({ push: mockPush } as any)
    mockCreateClient.mockReturnValue(mockSupabase as any)
  })

  const createMockUser = (role: Profile['role'], companyName?: string): Profile => ({
    id: 'user-1',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    role,
    company_id: companyName ? 'company-1' : null,
    company: companyName ? { id: 'company-1', name: companyName } : null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  })

  describe('Navigation Items', () => {
    it('renders all navigation items for super admin', () => {
      const user = createMockUser('super_admin', 'System')
      mockUsePathname.mockReturnValue('/dashboard')

      render(<Sidebar user={user} />)

      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Fleet Management')).toBeInTheDocument()
      expect(screen.getByText('Load Management')).toBeInTheDocument()
      expect(screen.getByText('Customers')).toBeInTheDocument()
      expect(screen.getByText('Drivers')).toBeInTheDocument()
      expect(screen.getByText('Quotes')).toBeInTheDocument()
      expect(screen.getByText('Financial')).toBeInTheDocument()
      expect(screen.getByText('Documents')).toBeInTheDocument()
      expect(screen.getByText('Reports')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('renders limited navigation items for driver role', () => {
      const user = createMockUser('driver', 'Test Fleet Co')
      mockUsePathname.mockReturnValue('/dashboard')

      render(<Sidebar user={user} />)

      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.queryByText('Fleet Management')).not.toBeInTheDocument()
      expect(screen.queryByText('Load Management')).not.toBeInTheDocument()
      expect(screen.queryByText('Customers')).not.toBeInTheDocument()
      expect(screen.queryByText('Drivers')).not.toBeInTheDocument()
      expect(screen.queryByText('Quotes')).not.toBeInTheDocument()
      expect(screen.queryByText('Financial')).not.toBeInTheDocument()
      expect(screen.queryByText('Documents')).not.toBeInTheDocument()
      expect(screen.queryByText('Reports')).not.toBeInTheDocument()
      expect(screen.queryByText('Settings')).not.toBeInTheDocument()
    })

    it('renders appropriate navigation items for company admin', () => {
      const user = createMockUser('company_admin', 'Test Fleet Co')
      mockUsePathname.mockReturnValue('/dashboard')

      render(<Sidebar user={user} />)

      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Fleet Management')).toBeInTheDocument()
      expect(screen.getByText('Load Management')).toBeInTheDocument()
      expect(screen.getByText('Customers')).toBeInTheDocument()
      expect(screen.getByText('Drivers')).toBeInTheDocument()
      expect(screen.getByText('Quotes')).toBeInTheDocument()
      expect(screen.getByText('Financial')).toBeInTheDocument()
      expect(screen.getByText('Documents')).toBeInTheDocument()
      expect(screen.getByText('Reports')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('renders appropriate navigation items for dispatcher', () => {
      const user = createMockUser('dispatcher', 'Test Fleet Co')
      mockUsePathname.mockReturnValue('/dashboard')

      render(<Sidebar user={user} />)

      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.queryByText('Fleet Management')).not.toBeInTheDocument()
      expect(screen.getByText('Load Management')).toBeInTheDocument()
      expect(screen.getByText('Customers')).toBeInTheDocument()
      expect(screen.queryByText('Drivers')).not.toBeInTheDocument()
      expect(screen.queryByText('Quotes')).not.toBeInTheDocument()
      expect(screen.queryByText('Financial')).not.toBeInTheDocument()
      expect(screen.getByText('Documents')).toBeInTheDocument()
      expect(screen.queryByText('Reports')).not.toBeInTheDocument()
      expect(screen.queryByText('Settings')).not.toBeInTheDocument()
    })
  })

  describe('Active State', () => {
    it('highlights active navigation item', () => {
      const user = createMockUser('company_admin', 'Test Fleet Co')
      mockUsePathname.mockReturnValue('/fleet')

      render(<Sidebar user={user} />)

      const fleetButton = screen.getByRole('button', { name: /fleet management/i })
      expect(fleetButton).toHaveClass('bg-sidebar-accent')
    })

    it('does not highlight inactive navigation items', () => {
      const user = createMockUser('company_admin', 'Test Fleet Co')
      mockUsePathname.mockReturnValue('/dashboard')

      render(<Sidebar user={user} />)

      const fleetButton = screen.getByRole('button', { name: /fleet management/i })
      expect(fleetButton).not.toHaveClass('bg-sidebar-accent')
    })
  })

  describe('Company Information', () => {
    it('displays company name when user has company', () => {
      const user = createMockUser('company_admin', 'Test Fleet Co')
      mockUsePathname.mockReturnValue('/dashboard')

      render(<Sidebar user={user} />)

      expect(screen.getByText('Test Fleet Co')).toBeInTheDocument()
    })

    it('does not display company name when user has no company', () => {
      const user = createMockUser('super_admin')
      mockUsePathname.mockReturnValue('/dashboard')

      render(<Sidebar user={user} />)

      expect(screen.queryByText('Test Fleet Co')).not.toBeInTheDocument()
    })

    it('displays PakuruSYS Fleetman logo', () => {
      const user = createMockUser('company_admin', 'Test Fleet Co')
      mockUsePathname.mockReturnValue('/dashboard')

      render(<Sidebar user={user} />)

      expect(screen.getByText('PakuruSYS Fleetman')).toBeInTheDocument()
    })
  })

  describe('User Information and Sign Out', () => {
    it('displays user name', () => {
      const user = createMockUser('company_admin', 'Test Fleet Co')
      mockUsePathname.mockReturnValue('/dashboard')

      render(<Sidebar user={user} />)

      expect(screen.getByText('Test User')).toBeInTheDocument()
    })

    it('displays user role badge', () => {
      const user = createMockUser('company_admin', 'Test Fleet Co')
      mockUsePathname.mockReturnValue('/dashboard')

      render(<Sidebar user={user} />)

      expect(screen.getByText('Company Admin')).toBeInTheDocument()
    })

    it('handles sign out correctly', async () => {
      const user = createMockUser('company_admin', 'Test Fleet Co')
      mockUsePathname.mockReturnValue('/dashboard')
      mockSupabase.auth.signOut.mockResolvedValue({})

      render(<Sidebar user={user} />)

      const signOutButton = screen.getByRole('button', { name: /sign out/i })
      fireEvent.click(signOutButton)

      await waitFor(() => {
        expect(mockSupabase.auth.signOut).toHaveBeenCalled()
        expect(mockPush).toHaveBeenCalledWith('/auth/login')
      })
    })

    it('handles sign out error gracefully', async () => {
      const user = createMockUser('company_admin', 'Test Fleet Co')
      mockUsePathname.mockReturnValue('/dashboard')
      mockSupabase.auth.signOut.mockRejectedValue(new Error('Sign out failed'))

      render(<Sidebar user={user} />)

      const signOutButton = screen.getByRole('button', { name: /sign out/i })
      fireEvent.click(signOutButton)

      await waitFor(() => {
        expect(mockSupabase.auth.signOut).toHaveBeenCalled()
        // Should still redirect even if sign out fails
        expect(mockPush).toHaveBeenCalledWith('/auth/login')
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels for navigation links', () => {
      const user = createMockUser('company_admin', 'Test Fleet Co')
      mockUsePathname.mockReturnValue('/dashboard')

      render(<Sidebar user={user} />)

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
      expect(dashboardLink).toHaveAttribute('href', '/dashboard')
    })

    it('has proper button roles for interactive elements', () => {
      const user = createMockUser('company_admin', 'Test Fleet Co')
      mockUsePathname.mockReturnValue('/dashboard')

      render(<Sidebar user={user} />)

      const signOutButton = screen.getByRole('button', { name: /sign out/i })
      expect(signOutButton).toBeInTheDocument()
    })
  })

  describe('Custom Styling', () => {
    it('applies custom className when provided', () => {
      const user = createMockUser('company_admin', 'Test Fleet Co')
      mockUsePathname.mockReturnValue('/dashboard')

      const { container } = render(<Sidebar user={user} className="custom-class" />)

      const sidebar = container.firstChild as HTMLElement
      expect(sidebar).toHaveClass('custom-class')
    })

    it('maintains default styling without custom className', () => {
      const user = createMockUser('company_admin', 'Test Fleet Co')
      mockUsePathname.mockReturnValue('/dashboard')

      const { container } = render(<Sidebar user={user} />)

      const sidebar = container.firstChild as HTMLElement
      expect(sidebar).toHaveClass('flex', 'h-full', 'w-64', 'flex-col', 'bg-sidebar')
    })
  })
})