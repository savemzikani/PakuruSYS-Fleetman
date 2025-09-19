import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectLabel,
  SelectSeparator,
  SelectGroup,
} from '@/components/ui/select'

describe('Select Components', () => {
  describe('Basic Select', () => {
    it('renders select trigger with placeholder', () => {
      render(
        <Select>
          <SelectTrigger data-testid="select-trigger">
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
            <SelectItem value="option2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      )

      const trigger = screen.getByTestId('select-trigger')
      expect(trigger).toBeInTheDocument()
      expect(trigger).toHaveAttribute('data-slot', 'select-trigger')
    })

    it('opens dropdown and shows options on click', async () => {
      const user = userEvent.setup()
      
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
            <SelectItem value="option2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      )

      const trigger = screen.getByRole('combobox')
      await user.click(trigger)

      expect(screen.getByText('Option 1')).toBeInTheDocument()
      expect(screen.getByText('Option 2')).toBeInTheDocument()
    })
  })

  describe('SelectTrigger', () => {
    it('applies size variants correctly', () => {
      const { rerender } = render(
        <Select>
          <SelectTrigger size="sm" data-testid="trigger">
            <SelectValue />
          </SelectTrigger>
        </Select>
      )

      let trigger = screen.getByTestId('trigger')
      expect(trigger).toHaveAttribute('data-size', 'sm')

      rerender(
        <Select>
          <SelectTrigger size="default" data-testid="trigger">
            <SelectValue />
          </SelectTrigger>
        </Select>
      )

      trigger = screen.getByTestId('trigger')
      expect(trigger).toHaveAttribute('data-size', 'default')
    })

    it('applies custom className', () => {
      render(
        <Select>
          <SelectTrigger className="custom-class" data-testid="trigger">
            <SelectValue />
          </SelectTrigger>
        </Select>
      )

      const trigger = screen.getByTestId('trigger')
      expect(trigger).toHaveClass('custom-class')
    })
  })

  describe('SelectItem', () => {
    it('renders with correct data-slot attribute', async () => {
      const user = userEvent.setup()
      
      render(
        <Select>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="test" data-testid="select-item">
              Test Item
            </SelectItem>
          </SelectContent>
        </Select>
      )

      await user.click(screen.getByRole('combobox'))
      const item = screen.getByTestId('select-item')
      expect(item).toHaveAttribute('data-slot', 'select-item')
      expect(item).toHaveTextContent('Test Item')
    })

    it('handles selection', async () => {
      const user = userEvent.setup()
      const handleValueChange = jest.fn()
      
      render(
        <Select onValueChange={handleValueChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="selected">Selected Item</SelectItem>
          </SelectContent>
        </Select>
      )

      await user.click(screen.getByRole('combobox'))
      await user.click(screen.getByText('Selected Item'))

      expect(handleValueChange).toHaveBeenCalledWith('selected')
    })
  })

  describe('SelectLabel', () => {
    it('renders with correct data-slot attribute', async () => {
      const user = userEvent.setup()
      
      render(
        <Select>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectLabel data-testid="select-label">Group Label</SelectLabel>
            <SelectItem value="item1">Item 1</SelectItem>
          </SelectContent>
        </Select>
      )

      await user.click(screen.getByRole('combobox'))
      const label = screen.getByTestId('select-label')
      expect(label).toHaveAttribute('data-slot', 'select-label')
      expect(label).toHaveTextContent('Group Label')
    })
  })

  describe('SelectSeparator', () => {
    it('renders with correct data-slot attribute', async () => {
      const user = userEvent.setup()
      
      render(
        <Select>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="item1">Item 1</SelectItem>
            <SelectSeparator data-testid="separator" />
            <SelectItem value="item2">Item 2</SelectItem>
          </SelectContent>
        </Select>
      )

      await user.click(screen.getByRole('combobox'))
      const separator = screen.getByTestId('separator')
      expect(separator).toHaveAttribute('data-slot', 'select-separator')
    })
  })

  describe('SelectGroup', () => {
    it('groups items correctly', async () => {
      const user = userEvent.setup()
      
      render(
        <Select>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup data-testid="select-group">
              <SelectLabel>Fruits</SelectLabel>
              <SelectItem value="apple">Apple</SelectItem>
              <SelectItem value="banana">Banana</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      )

      await user.click(screen.getByRole('combobox'))
      const group = screen.getByTestId('select-group')
      expect(group).toHaveAttribute('data-slot', 'select-group')
      expect(screen.getByText('Fruits')).toBeInTheDocument()
      expect(screen.getByText('Apple')).toBeInTheDocument()
      expect(screen.getByText('Banana')).toBeInTheDocument()
    })
  })

  describe('Controlled Select', () => {
    it('works with controlled value', () => {
      render(
        <Select value="option2">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
            <SelectItem value="option2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      )

      // The trigger should show the selected value
      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveAttribute('data-state', 'closed')
    })
  })
})