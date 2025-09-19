import { render, screen } from '@testing-library/react'
import { MetricCard } from '@/components/dashboard/metric-card'
import { TrendingUp, TrendingDown } from 'lucide-react'

describe('MetricCard Component', () => {
  const defaultProps = {
    title: 'Total Revenue',
    value: '$125,000',
    icon: TrendingUp,
  }

  it('renders metric card with basic props', () => {
    render(<MetricCard {...defaultProps} />)
    
    expect(screen.getByText('Total Revenue')).toBeInTheDocument()
    expect(screen.getByText('$125,000')).toBeInTheDocument()
  })

  it('displays positive change correctly', () => {
    render(
      <MetricCard 
        {...defaultProps} 
        change="+12%" 
        changeType="positive"
      />
    )
    
    const changeElement = screen.getByText('+12%')
    expect(changeElement).toBeInTheDocument()
    expect(changeElement).toHaveClass('text-green-600')
  })

  it('displays negative change correctly', () => {
    render(
      <MetricCard 
        {...defaultProps} 
        change="-5%" 
        changeType="negative"
        icon={TrendingDown}
      />
    )
    
    const changeElement = screen.getByText('-5%')
    expect(changeElement).toBeInTheDocument()
    expect(changeElement).toHaveClass('text-red-600')
  })

  it('displays neutral change correctly', () => {
    render(
      <MetricCard 
        {...defaultProps} 
        change="No change" 
        changeType="neutral"
      />
    )
    
    const changeElement = screen.getByText('No change')
    expect(changeElement).toBeInTheDocument()
    expect(changeElement).toHaveClass('text-muted-foreground')
  })

  it('handles large numbers correctly', () => {
    render(
      <MetricCard 
        {...defaultProps} 
        value="$1,234,567.89"
      />
    )
    
    expect(screen.getByText('$1,234,567.89')).toBeInTheDocument()
  })

  it('renders without change when not provided', () => {
    render(<MetricCard {...defaultProps} />)
    
    expect(screen.getByText('Total Revenue')).toBeInTheDocument()
    expect(screen.getByText('$125,000')).toBeInTheDocument()
    expect(screen.queryByText('+12%')).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <MetricCard {...defaultProps} className="custom-class" />
    )
    
    expect(container.firstChild).toHaveClass('custom-class')
  })
})