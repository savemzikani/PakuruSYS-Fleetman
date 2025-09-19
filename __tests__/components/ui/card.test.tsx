import { render, screen } from '@testing-library/react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from '@/components/ui/card'

describe('Card Components', () => {
  describe('Card', () => {
    it('renders with correct data-slot attribute', () => {
      render(<Card data-testid="card">Card content</Card>)
      const card = screen.getByTestId('card')
      expect(card).toHaveAttribute('data-slot', 'card')
      expect(card).toHaveTextContent('Card content')
    })

    it('applies custom className', () => {
      render(<Card className="custom-class" data-testid="card">Content</Card>)
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('custom-class')
    })
  })

  describe('CardHeader', () => {
    it('renders with correct data-slot attribute', () => {
      render(<CardHeader data-testid="header">Header content</CardHeader>)
      const header = screen.getByTestId('header')
      expect(header).toHaveAttribute('data-slot', 'card-header')
      expect(header).toHaveTextContent('Header content')
    })
  })

  describe('CardTitle', () => {
    it('renders with correct data-slot attribute', () => {
      render(<CardTitle data-testid="title">Card Title</CardTitle>)
      const title = screen.getByTestId('title')
      expect(title).toHaveAttribute('data-slot', 'card-title')
      expect(title).toHaveTextContent('Card Title')
    })
  })

  describe('CardDescription', () => {
    it('renders with correct data-slot attribute', () => {
      render(<CardDescription data-testid="description">Card description</CardDescription>)
      const description = screen.getByTestId('description')
      expect(description).toHaveAttribute('data-slot', 'card-description')
      expect(description).toHaveTextContent('Card description')
    })
  })

  describe('CardAction', () => {
    it('renders with correct data-slot attribute', () => {
      render(<CardAction data-testid="action">Action content</CardAction>)
      const action = screen.getByTestId('action')
      expect(action).toHaveAttribute('data-slot', 'card-action')
      expect(action).toHaveTextContent('Action content')
    })
  })

  describe('CardContent', () => {
    it('renders with correct data-slot attribute', () => {
      render(<CardContent data-testid="content">Card content</CardContent>)
      const content = screen.getByTestId('content')
      expect(content).toHaveAttribute('data-slot', 'card-content')
      expect(content).toHaveTextContent('Card content')
    })
  })

  describe('CardFooter', () => {
    it('renders with correct data-slot attribute', () => {
      render(<CardFooter data-testid="footer">Footer content</CardFooter>)
      const footer = screen.getByTestId('footer')
      expect(footer).toHaveAttribute('data-slot', 'card-footer')
      expect(footer).toHaveTextContent('Footer content')
    })
  })

  describe('Complete Card Structure', () => {
    it('renders a complete card with all components', () => {
      render(
        <Card data-testid="complete-card">
          <CardHeader>
            <CardTitle>Test Title</CardTitle>
            <CardDescription>Test Description</CardDescription>
            <CardAction>Action</CardAction>
          </CardHeader>
          <CardContent>Test Content</CardContent>
          <CardFooter>Test Footer</CardFooter>
        </Card>
      )

      expect(screen.getByTestId('complete-card')).toBeInTheDocument()
      expect(screen.getByText('Test Title')).toBeInTheDocument()
      expect(screen.getByText('Test Description')).toBeInTheDocument()
      expect(screen.getByText('Action')).toBeInTheDocument()
      expect(screen.getByText('Test Content')).toBeInTheDocument()
      expect(screen.getByText('Test Footer')).toBeInTheDocument()
    })
  })
})