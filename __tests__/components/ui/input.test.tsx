import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '@/components/ui/input'

describe('Input Component', () => {
  it('renders input element', () => {
    render(<Input data-testid="input" />)
    const input = screen.getByTestId('input')
    expect(input).toBeInTheDocument()
    expect(input.tagName).toBe('INPUT')
  })

  it('applies custom className', () => {
    render(<Input className="custom-class" data-testid="input" />)
    const input = screen.getByTestId('input')
    expect(input).toHaveClass('custom-class')
  })

  it('handles value changes', async () => {
    const user = userEvent.setup()
    const handleChange = jest.fn()
    
    render(<Input onChange={handleChange} data-testid="input" />)
    const input = screen.getByTestId('input')
    
    await user.type(input, 'test value')
    
    expect(handleChange).toHaveBeenCalled()
    expect(input).toHaveValue('test value')
  })

  it('supports different input types', () => {
    const { rerender } = render(<Input type="email" data-testid="input" />)
    let input = screen.getByTestId('input')
    expect(input).toHaveAttribute('type', 'email')

    rerender(<Input type="password" data-testid="input" />)
    input = screen.getByTestId('input')
    expect(input).toHaveAttribute('type', 'password')

    rerender(<Input type="number" data-testid="input" />)
    input = screen.getByTestId('input')
    expect(input).toHaveAttribute('type', 'number')
  })

  it('handles placeholder text', () => {
    render(<Input placeholder="Enter text here" data-testid="input" />)
    const input = screen.getByTestId('input')
    expect(input).toHaveAttribute('placeholder', 'Enter text here')
  })

  it('handles disabled state', () => {
    render(<Input disabled data-testid="input" />)
    const input = screen.getByTestId('input')
    expect(input).toBeDisabled()
  })

  it('handles required attribute', () => {
    render(<Input required data-testid="input" />)
    const input = screen.getByTestId('input')
    expect(input).toHaveAttribute('required')
  })

  it('handles readonly attribute', () => {
    render(<Input readOnly data-testid="input" />)
    const input = screen.getByTestId('input')
    expect(input).toHaveAttribute('readonly')
  })

  it('handles controlled input', () => {
    const { rerender } = render(<Input value="initial" data-testid="input" />)
    let input = screen.getByTestId('input') as HTMLInputElement
    expect(input.value).toBe('initial')

    rerender(<Input value="updated" data-testid="input" />)
    input = screen.getByTestId('input') as HTMLInputElement
    expect(input.value).toBe('updated')
  })

  it('handles focus and blur events', async () => {
    const user = userEvent.setup()
    const handleFocus = jest.fn()
    const handleBlur = jest.fn()
    
    render(
      <Input 
        onFocus={handleFocus} 
        onBlur={handleBlur} 
        data-testid="input" 
      />
    )
    const input = screen.getByTestId('input')
    
    await user.click(input)
    expect(handleFocus).toHaveBeenCalledTimes(1)
    
    await user.tab()
    expect(handleBlur).toHaveBeenCalledTimes(1)
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(<Input ref={ref} data-testid="input" />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })

  it('handles maxLength attribute', () => {
    render(<Input maxLength={10} data-testid="input" />)
    const input = screen.getByTestId('input')
    expect(input).toHaveAttribute('maxLength', '10')
  })

  it('handles minLength attribute', () => {
    render(<Input minLength={3} data-testid="input" />)
    const input = screen.getByTestId('input')
    expect(input).toHaveAttribute('minLength', '3')
  })

  it('handles pattern attribute', () => {
    render(<Input pattern="[0-9]*" data-testid="input" />)
    const input = screen.getByTestId('input')
    expect(input).toHaveAttribute('pattern', '[0-9]*')
  })
})