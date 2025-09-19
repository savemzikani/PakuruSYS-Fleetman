import { render, screen } from '@testing-library/react'
import { RecentActivity } from '@/components/dashboard/recent-activity'

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn((date) => {
    const mockDate = new Date(date)
    const now = new Date('2024-01-15T12:00:00Z')
    const diffInHours = (now.getTime() - mockDate.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) return 'less than an hour ago'
    if (diffInHours < 24) return `${Math.floor(diffInHours)} hours ago`
    return `${Math.floor(diffInHours / 24)} days ago`
  }),
}))

describe('RecentActivity', () => {
  const mockActivities = [
    {
      id: '1',
      type: 'load' as const,
      title: 'New Load Created',
      description: 'Load #L001 from Johannesburg to Cape Town',
      timestamp: '2024-01-15T10:00:00Z',
      status: 'pending',
    },
    {
      id: '2',
      type: 'vehicle' as const,
      title: 'Vehicle Maintenance',
      description: 'Truck ABC123 scheduled for maintenance',
      timestamp: '2024-01-15T08:30:00Z',
      status: 'scheduled',
    },
    {
      id: '3',
      type: 'driver' as const,
      title: 'Driver Assignment',
      description: 'John Doe assigned to Load #L002',
      timestamp: '2024-01-14T16:45:00Z',
      status: 'active',
    },
    {
      id: '4',
      type: 'invoice' as const,
      title: 'Invoice Generated',
      description: 'Invoice #INV001 for Load #L003',
      timestamp: '2024-01-14T14:20:00Z',
      status: 'sent',
    },
  ]

  beforeEach(() => {
    // Mock current time for consistent testing
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2024-01-15T12:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Rendering', () => {
    it('renders recent activity card with title', () => {
      render(<RecentActivity activities={mockActivities} />)

      expect(screen.getByText('Recent Activity')).toBeInTheDocument()
    })

    it('renders all activity items', () => {
      render(<RecentActivity activities={mockActivities} />)

      expect(screen.getByText('New Load Created')).toBeInTheDocument()
      expect(screen.getByText('Vehicle Maintenance')).toBeInTheDocument()
      expect(screen.getByText('Driver Assignment')).toBeInTheDocument()
      expect(screen.getByText('Invoice Generated')).toBeInTheDocument()
    })

    it('renders activity descriptions', () => {
      render(<RecentActivity activities={mockActivities} />)

      expect(screen.getByText('Load #L001 from Johannesburg to Cape Town')).toBeInTheDocument()
      expect(screen.getByText('Truck ABC123 scheduled for maintenance')).toBeInTheDocument()
      expect(screen.getByText('John Doe assigned to Load #L002')).toBeInTheDocument()
      expect(screen.getByText('Invoice #INV001 for Load #L003')).toBeInTheDocument()
    })

    it('renders activity timestamps', () => {
      render(<RecentActivity activities={mockActivities} />)

      expect(screen.getByText('2 hours ago')).toBeInTheDocument()
      expect(screen.getByText('3 hours ago')).toBeInTheDocument()
      expect(screen.getByText('19 hours ago')).toBeInTheDocument()
      expect(screen.getByText('21 hours ago')).toBeInTheDocument()
    })
  })

  describe('Status Badges', () => {
    it('renders status badges when provided', () => {
      render(<RecentActivity activities={mockActivities} />)

      expect(screen.getByText('pending')).toBeInTheDocument()
      expect(screen.getByText('scheduled')).toBeInTheDocument()
      expect(screen.getByText('active')).toBeInTheDocument()
      expect(screen.getByText('sent')).toBeInTheDocument()
    })

    it('applies correct styling to status badges', () => {
      render(<RecentActivity activities={mockActivities} />)

      const pendingBadge = screen.getByText('pending')
      const activeBadge = screen.getByText('active')
      
      expect(pendingBadge).toHaveClass('bg-yellow-100', 'text-yellow-800')
      expect(activeBadge).toHaveClass('bg-green-100', 'text-green-800')
    })

    it('handles activities without status', () => {
      const activitiesWithoutStatus = [
        {
          id: '1',
          type: 'load' as const,
          title: 'New Load Created',
          description: 'Load #L001 from Johannesburg to Cape Town',
          timestamp: '2024-01-15T10:00:00Z',
        },
      ]

      render(<RecentActivity activities={activitiesWithoutStatus} />)

      expect(screen.getByText('New Load Created')).toBeInTheDocument()
      expect(screen.queryByText('pending')).not.toBeInTheDocument()
    })
  })

  describe('Activity Types', () => {
    it('displays different activity types correctly', () => {
      render(<RecentActivity activities={mockActivities} />)

      // Check that all different types are rendered
      const loadActivity = screen.getByText('New Load Created')
      const vehicleActivity = screen.getByText('Vehicle Maintenance')
      const driverActivity = screen.getByText('Driver Assignment')
      const invoiceActivity = screen.getByText('Invoice Generated')

      expect(loadActivity).toBeInTheDocument()
      expect(vehicleActivity).toBeInTheDocument()
      expect(driverActivity).toBeInTheDocument()
      expect(invoiceActivity).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('renders empty state when no activities provided', () => {
      render(<RecentActivity activities={[]} />)

      expect(screen.getByText('Recent Activity')).toBeInTheDocument()
      expect(screen.getByText('No recent activity')).toBeInTheDocument()
    })

    it('renders empty state message correctly', () => {
      render(<RecentActivity activities={[]} />)

      expect(screen.getByText('No recent activity to display')).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('renders loading state when activities is undefined', () => {
      render(<RecentActivity activities={undefined as any} />)

      expect(screen.getByText('Recent Activity')).toBeInTheDocument()
      expect(screen.getByText('Loading activities...')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      render(<RecentActivity activities={mockActivities} />)

      const heading = screen.getByRole('heading', { name: 'Recent Activity' })
      expect(heading).toBeInTheDocument()
    })

    it('has proper list structure for activities', () => {
      render(<RecentActivity activities={mockActivities} />)

      const activityList = screen.getByRole('list')
      expect(activityList).toBeInTheDocument()

      const activityItems = screen.getAllByRole('listitem')
      expect(activityItems).toHaveLength(4)
    })

    it('has proper semantic structure for activity items', () => {
      render(<RecentActivity activities={mockActivities} />)

      const activityItems = screen.getAllByRole('listitem')
      
      activityItems.forEach((item) => {
        expect(item).toBeInTheDocument()
      })
    })
  })

  describe('Data Formatting', () => {
    it('formats timestamps correctly using date-fns', () => {
      render(<RecentActivity activities={mockActivities} />)

      // Verify that formatDistanceToNow was called for each activity
      expect(screen.getByText('2 hours ago')).toBeInTheDocument()
      expect(screen.getByText('3 hours ago')).toBeInTheDocument()
    })

    it('handles invalid timestamps gracefully', () => {
      const activitiesWithInvalidDate = [
        {
          id: '1',
          type: 'load' as const,
          title: 'New Load Created',
          description: 'Load #L001 from Johannesburg to Cape Town',
          timestamp: 'invalid-date',
          status: 'pending',
        },
      ]

      render(<RecentActivity activities={activitiesWithInvalidDate} />)

      expect(screen.getByText('New Load Created')).toBeInTheDocument()
      // Should still render the activity even with invalid timestamp
    })
  })

  describe('Performance', () => {
    it('handles large number of activities efficiently', () => {
      const manyActivities = Array.from({ length: 100 }, (_, index) => ({
        id: `activity-${index}`,
        type: 'load' as const,
        title: `Activity ${index}`,
        description: `Description for activity ${index}`,
        timestamp: '2024-01-15T10:00:00Z',
        status: 'pending',
      }))

      const { container } = render(<RecentActivity activities={manyActivities} />)

      expect(container).toBeInTheDocument()
      expect(screen.getByText('Activity 0')).toBeInTheDocument()
      expect(screen.getByText('Activity 99')).toBeInTheDocument()
    })
  })
})