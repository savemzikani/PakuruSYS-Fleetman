import { render, screen } from '@testing-library/react'
import { FinancialCharts } from '@/components/dashboard/financial-charts'

// Mock recharts components
jest.mock('recharts', () => ({
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />
}))

describe('FinancialCharts Component', () => {
  const mockRevenueData = [
    { month: 'Jan', revenue: 10000 },
    { month: 'Feb', revenue: 15000 },
    { month: 'Mar', revenue: 12000 }
  ]

  const mockStatusData = [
    { name: 'Paid', value: 60, color: '#10b981' },
    { name: 'Pending', value: 30, color: '#f59e0b' },
    { name: 'Overdue', value: 10, color: '#ef4444' }
  ]

  const mockFormatCurrency = (amount: number) => `$${amount.toLocaleString()}`

  it('renders financial charts with revenue and status data', () => {
    render(
      <FinancialCharts 
        revenueData={mockRevenueData}
        statusData={mockStatusData}
        formatCurrency={mockFormatCurrency}
      />
    )

    expect(screen.getByText('Revenue Trend')).toBeInTheDocument()
    expect(screen.getByText('Invoice Status Distribution')).toBeInTheDocument()
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
  })

  it('renders responsive containers for both charts', () => {
    render(
      <FinancialCharts 
        revenueData={mockRevenueData}
        statusData={mockStatusData}
        formatCurrency={mockFormatCurrency}
      />
    )

    const responsiveContainers = screen.getAllByTestId('responsive-container')
    expect(responsiveContainers).toHaveLength(2)
  })

  it('renders chart components correctly', () => {
    render(
      <FinancialCharts 
        revenueData={mockRevenueData}
        statusData={mockStatusData}
        formatCurrency={mockFormatCurrency}
      />
    )

    expect(screen.getByTestId('bar')).toBeInTheDocument()
    expect(screen.getByTestId('pie')).toBeInTheDocument()
    expect(screen.getAllByTestId('tooltip')).toHaveLength(2)
  })
})