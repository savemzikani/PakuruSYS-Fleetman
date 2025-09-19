import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary, useErrorHandler } from '@/components/ui/error-boundary'
import React from 'react'

// Mock console.error to avoid noise in test output
const originalConsoleError = console.error
beforeAll(() => {
  console.error = jest.fn()
})

afterAll(() => {
  console.error = originalConsoleError
})

// Test component that throws an error
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

// Test component that uses the error handler hook
const AsyncErrorComponent = () => {
  const handleError = useErrorHandler()
  
  const triggerAsyncError = () => {
    try {
      throw new Error('Async test error')
    } catch (error) {
      handleError(error as Error)
    }
  }

  return (
    <div>
      <button onClick={triggerAsyncError}>Trigger Async Error</button>
      <span>Async component content</span>
    </div>
  )
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Normal Operation', () => {
    it('renders children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      )

      expect(screen.getByText('Test content')).toBeInTheDocument()
    })

    it('renders multiple children correctly', () => {
      render(
        <ErrorBoundary>
          <div>First child</div>
          <div>Second child</div>
        </ErrorBoundary>
      )

      expect(screen.getByText('First child')).toBeInTheDocument()
      expect(screen.getByText('Second child')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('catches and displays error when child component throws', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.getByText(/We're sorry, but something unexpected happened/)).toBeInTheDocument()
    })

    it('displays error message when provided', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Test error')).toBeInTheDocument()
    })

    it('shows try again button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    })

    it('shows reload page button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument()
    })
  })

  describe('Error Recovery', () => {
    it('recovers from error when try again is clicked', () => {
      const TestComponent = () => {
        const [shouldThrow, setShouldThrow] = React.useState(true)
        
        React.useEffect(() => {
          const timer = setTimeout(() => setShouldThrow(false), 100)
          return () => clearTimeout(timer)
        }, [])

        return <ThrowError shouldThrow={shouldThrow} />
      }

      render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      )

      // Initially shows error
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()

      // Click try again
      const tryAgainButton = screen.getByRole('button', { name: /try again/i })
      fireEvent.click(tryAgainButton)

      // Should recover and show content
      expect(screen.getByText('No error')).toBeInTheDocument()
    })

    it('reloads page when reload button is clicked', () => {
      // Mock window.location.reload
      const mockReload = jest.fn()
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true,
      })

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const reloadButton = screen.getByRole('button', { name: /reload page/i })
      fireEvent.click(reloadButton)

      expect(mockReload).toHaveBeenCalled()
    })
  })

  describe('Custom Error Handler', () => {
    it('calls custom onError handler when provided', () => {
      const mockOnError = jest.fn()

      render(
        <ErrorBoundary onError={mockOnError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(mockOnError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      )
    })

    it('does not break when onError handler throws', () => {
      const mockOnError = jest.fn(() => {
        throw new Error('Handler error')
      })

      render(
        <ErrorBoundary onError={mockOnError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      // Should still show error UI despite handler error
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })
  })

  describe('Custom Fallback', () => {
    it('renders custom fallback when provided', () => {
      const CustomFallback = ({ error, retry }: { error: Error; retry: () => void }) => (
        <div>
          <h2>Custom Error UI</h2>
          <p>Error: {error.message}</p>
          <button onClick={retry}>Custom Retry</button>
        </div>
      )

      render(
        <ErrorBoundary fallback={CustomFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Custom Error UI')).toBeInTheDocument()
      expect(screen.getByText('Error: Test error')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /custom retry/i })).toBeInTheDocument()
    })

    it('calls retry function from custom fallback', () => {
      const CustomFallback = ({ retry }: { retry: () => void }) => (
        <button onClick={retry}>Custom Retry</button>
      )

      const TestComponent = () => {
        const [shouldThrow, setShouldThrow] = React.useState(true)
        
        React.useEffect(() => {
          const timer = setTimeout(() => setShouldThrow(false), 100)
          return () => clearTimeout(timer)
        }, [])

        return <ThrowError shouldThrow={shouldThrow} />
      }

      render(
        <ErrorBoundary fallback={CustomFallback}>
          <TestComponent />
        </ErrorBoundary>
      )

      const retryButton = screen.getByRole('button', { name: /custom retry/i })
      fireEvent.click(retryButton)

      expect(screen.getByText('No error')).toBeInTheDocument()
    })
  })

  describe('Development Mode', () => {
    it('logs error details in development mode', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(console.error).toHaveBeenCalledWith(
        'ErrorBoundary caught an error:',
        expect.any(Error),
        expect.any(Object)
      )

      process.env.NODE_ENV = originalEnv
    })

    it('does not log in production mode', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(console.error).not.toHaveBeenCalledWith(
        'ErrorBoundary caught an error:',
        expect.any(Error),
        expect.any(Object)
      )

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes for error state', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const errorContainer = screen.getByRole('alert')
      expect(errorContainer).toBeInTheDocument()
    })

    it('has proper heading structure', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const heading = screen.getByRole('heading', { name: /something went wrong/i })
      expect(heading).toBeInTheDocument()
    })

    it('has focusable retry button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const tryAgainButton = screen.getByRole('button', { name: /try again/i })
      expect(tryAgainButton).toBeInTheDocument()
      expect(tryAgainButton).not.toHaveAttribute('disabled')
    })
  })
})

describe('useErrorHandler', () => {
  it('throws error to be caught by ErrorBoundary', () => {
    expect(() => {
      render(
        <ErrorBoundary>
          <AsyncErrorComponent />
        </ErrorBoundary>
      )

      const triggerButton = screen.getByRole('button', { name: /trigger async error/i })
      fireEvent.click(triggerButton)
    }).not.toThrow()

    // Should show error boundary UI
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('logs async errors to console', () => {
    render(
      <ErrorBoundary>
        <AsyncErrorComponent />
      </ErrorBoundary>
    )

    const triggerButton = screen.getByRole('button', { name: /trigger async error/i })
    fireEvent.click(triggerButton)

    expect(console.error).toHaveBeenCalledWith(
      'Async error caught:',
      expect.any(Error)
    )
  })
})