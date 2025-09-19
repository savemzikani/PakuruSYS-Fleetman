import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

describe('Dialog Components', () => {
  describe('Basic Dialog', () => {
    it('renders trigger and opens dialog on click', async () => {
      const user = userEvent.setup()
      
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dialog Title</DialogTitle>
              <DialogDescription>Dialog description</DialogDescription>
            </DialogHeader>
            <div>Dialog content</div>
            <DialogFooter>
              <button>Close</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )

      const trigger = screen.getByText('Open Dialog')
      expect(trigger).toBeInTheDocument()

      await user.click(trigger)
      
      expect(screen.getByText('Dialog Title')).toBeInTheDocument()
      expect(screen.getByText('Dialog description')).toBeInTheDocument()
      expect(screen.getByText('Dialog content')).toBeInTheDocument()
      expect(screen.getByText('Close')).toBeInTheDocument()
    })
  })

  describe('DialogContent', () => {
    it('renders with correct attributes', async () => {
      const user = userEvent.setup()
      
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent data-testid="dialog-content">
            <div>Content</div>
          </DialogContent>
        </Dialog>
      )

      await user.click(screen.getByText('Open'))
      const content = screen.getByTestId('dialog-content')
      expect(content).toBeInTheDocument()
    })

    it('applies custom className', async () => {
      const user = userEvent.setup()
      
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent className="custom-class" data-testid="dialog-content">
            <div>Content</div>
          </DialogContent>
        </Dialog>
      )

      await user.click(screen.getByText('Open'))
      const content = screen.getByTestId('dialog-content')
      expect(content).toHaveClass('custom-class')
    })
  })

  describe('DialogHeader', () => {
    it('renders header content', async () => {
      const user = userEvent.setup()
      
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogHeader data-testid="dialog-header">
              <DialogTitle>Header Title</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )

      await user.click(screen.getByText('Open'))
      const header = screen.getByTestId('dialog-header')
      expect(header).toBeInTheDocument()
      expect(screen.getByText('Header Title')).toBeInTheDocument()
    })
  })

  describe('DialogTitle', () => {
    it('renders title with correct attributes', async () => {
      const user = userEvent.setup()
      
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle data-testid="dialog-title">Test Title</DialogTitle>
          </DialogContent>
        </Dialog>
      )

      await user.click(screen.getByText('Open'))
      const title = screen.getByTestId('dialog-title')
      expect(title).toBeInTheDocument()
      expect(title).toHaveTextContent('Test Title')
    })
  })

  describe('DialogDescription', () => {
    it('renders description with correct attributes', async () => {
      const user = userEvent.setup()
      
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogDescription data-testid="dialog-description">
              Test description
            </DialogDescription>
          </DialogContent>
        </Dialog>
      )

      await user.click(screen.getByText('Open'))
      const description = screen.getByTestId('dialog-description')
      expect(description).toBeInTheDocument()
      expect(description).toHaveTextContent('Test description')
    })
  })

  describe('DialogFooter', () => {
    it('renders footer content', async () => {
      const user = userEvent.setup()
      
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogFooter data-testid="dialog-footer">
              <button>Cancel</button>
              <button>Confirm</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )

      await user.click(screen.getByText('Open'))
      const footer = screen.getByTestId('dialog-footer')
      expect(footer).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
      expect(screen.getByText('Confirm')).toBeInTheDocument()
    })
  })

  describe('Controlled Dialog', () => {
    it('works with controlled open state', () => {
      render(
        <Dialog open={true}>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Always Open</DialogTitle>
          </DialogContent>
        </Dialog>
      )

      // Dialog should be open without clicking trigger
      expect(screen.getByText('Always Open')).toBeInTheDocument()
    })

    it('handles onOpenChange callback', async () => {
      const user = userEvent.setup()
      const handleOpenChange = jest.fn()
      
      render(
        <Dialog onOpenChange={handleOpenChange}>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      )

      await user.click(screen.getByText('Open'))
      expect(handleOpenChange).toHaveBeenCalledWith(true)
    })
  })

  describe('Dialog Accessibility', () => {
    it('has proper ARIA attributes', async () => {
      const user = userEvent.setup()
      
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Accessible Dialog</DialogTitle>
            <DialogDescription>This dialog is accessible</DialogDescription>
          </DialogContent>
        </Dialog>
      )

      await user.click(screen.getByText('Open Dialog'))
      
      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()
      
      const title = screen.getByText('Accessible Dialog')
      expect(title).toBeInTheDocument()
    })
  })
})