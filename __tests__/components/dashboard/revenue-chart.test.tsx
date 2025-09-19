import { render, screen } from '@testing-library/react'
import { RevenueChart } from '@/components/dashboard/revenue-chart'

// Mock recharts components
jest.mock('recharts', () => ({
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>
}))

describe('RevenueChart Component', () => {
  const mockData = [
    { month: 'Jan', revenue: 10000 },
    { month: 'Feb', revenue: 15000 },
    { month: 'Mar', revenue: 12000 },
    { month: 'Apr', revenue: 18000 }
  ]

  it('renders revenue chart with title and icon', () => {
    render(<RevenueChart data={mockData} />)

    expect(screen.getByText('Revenue Trend')).toBeInTheDocument()
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('renders chart components correctly', () => {
    render(<RevenueChart data={mockData} />)

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    expect(screen.getByTestId('bar')).toBeInTheDocument()
    expect(screen.getByTestId('x-axis')).toBeInTheDocument()
    expect(screen.getByTestId('y-axis')).toBeInTheDocument()
    expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument()
    expect(screen.getByTestId('tooltip')).toBeInTheDocument()
  })

  it('renders with empty data', () => {
    render(<RevenueChart data={[]} />)

    expect(screen.getByText('Revenue Trend')).toBeInTheDocument()
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('has correct card structure', () => {
    render(<RevenueChart data={mockData} />)

    const card = screen.getByText('Revenue Trend').closest('[class*="card"]')
    expect(card).toBeInTheDocument()
  })
})