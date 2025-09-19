import { render, screen, fireEvent } from '@testing-library/react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

describe('Tabs Components', () => {
  const TabsExample = ({ defaultValue = 'tab1' }: { defaultValue?: string }) => (
    <Tabs defaultValue={defaultValue} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        <TabsTrigger value="tab3" disabled>Tab 3 (Disabled)</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1" className="mt-4">
        <div>Content for Tab 1</div>
      </TabsContent>
      <TabsContent value="tab2" className="mt-4">
        <div>Content for Tab 2</div>
      </TabsContent>
      <TabsContent value="tab3" className="mt-4">
        <div>Content for Tab 3</div>
      </TabsContent>
    </Tabs>
  )

  describe('Tabs Root', () => {
    it('renders tabs container with correct attributes', () => {
      render(<TabsExample />)

      const tabsContainer = screen.getByRole('tablist').closest('[data-slot="tabs"]')
      expect(tabsContainer).toBeInTheDocument()
      expect(tabsContainer).toHaveClass('flex', 'flex-col', 'gap-2')
    })

    it('applies custom className to tabs root', () => {
      render(
        <Tabs className="custom-tabs-class">
          <TabsList>
            <TabsTrigger value="test">Test</TabsTrigger>
          </TabsList>
        </Tabs>
      )

      const tabsContainer = screen.getByRole('tablist').closest('[data-slot="tabs"]')
      expect(tabsContainer).toHaveClass('custom-tabs-class')
    })

    it('sets default value correctly', () => {
      render(<TabsExample defaultValue="tab2" />)

      const tab2Trigger = screen.getByRole('tab', { name: 'Tab 2' })
      expect(tab2Trigger).toHaveAttribute('data-state', 'active')
      expect(screen.getByText('Content for Tab 2')).toBeInTheDocument()
    })
  })

  describe('TabsList', () => {
    it('renders tabs list with correct role and attributes', () => {
      render(<TabsExample />)

      const tabsList = screen.getByRole('tablist')
      expect(tabsList).toBeInTheDocument()
      expect(tabsList).toHaveAttribute('data-slot', 'tabs-list')
    })

    it('applies default styling to tabs list', () => {
      render(<TabsExample />)

      const tabsList = screen.getByRole('tablist')
      expect(tabsList).toHaveClass(
        'bg-muted',
        'text-muted-foreground',
        'inline-flex',
        'h-9',
        'w-fit',
        'items-center',
        'justify-center',
        'rounded-lg'
      )
    })

    it('applies custom className to tabs list', () => {
      render(
        <Tabs>
          <TabsList className="custom-list-class">
            <TabsTrigger value="test">Test</TabsTrigger>
          </TabsList>
        </Tabs>
      )

      const tabsList = screen.getByRole('tablist')
      expect(tabsList).toHaveClass('custom-list-class')
    })
  })

  describe('TabsTrigger', () => {
    it('renders tab triggers with correct role and attributes', () => {
      render(<TabsExample />)

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' })
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' })

      expect(tab1).toBeInTheDocument()
      expect(tab2).toBeInTheDocument()
      expect(tab1).toHaveAttribute('data-slot', 'tabs-trigger')
      expect(tab2).toHaveAttribute('data-slot', 'tabs-trigger')
    })

    it('shows active state for default tab', () => {
      render(<TabsExample />)

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' })
      expect(tab1).toHaveAttribute('data-state', 'active')
    })

    it('handles tab switching correctly', () => {
      render(<TabsExample />)

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' })
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' })

      // Initially tab1 is active
      expect(tab1).toHaveAttribute('data-state', 'active')
      expect(tab2).toHaveAttribute('data-state', 'inactive')
      expect(screen.getByText('Content for Tab 1')).toBeInTheDocument()

      // Click tab2
      fireEvent.click(tab2)

      // Now tab2 should be active
      expect(tab1).toHaveAttribute('data-state', 'inactive')
      expect(tab2).toHaveAttribute('data-state', 'active')
      expect(screen.getByText('Content for Tab 2')).toBeInTheDocument()
    })

    it('handles disabled tabs correctly', () => {
      render(<TabsExample />)

      const disabledTab = screen.getByRole('tab', { name: 'Tab 3 (Disabled)' })
      expect(disabledTab).toHaveAttribute('disabled')
      expect(disabledTab).toHaveAttribute('data-disabled', 'true')

      // Clicking disabled tab should not activate it
      fireEvent.click(disabledTab)
      expect(disabledTab).toHaveAttribute('data-state', 'inactive')
    })

    it('applies custom className to tab trigger', () => {
      render(
        <Tabs>
          <TabsList>
            <TabsTrigger value="test" className="custom-trigger-class">
              Test
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )

      const trigger = screen.getByRole('tab', { name: 'Test' })
      expect(trigger).toHaveClass('custom-trigger-class')
    })
  })

  describe('TabsContent', () => {
    it('renders active tab content', () => {
      render(<TabsExample />)

      expect(screen.getByText('Content for Tab 1')).toBeInTheDocument()
      expect(screen.queryByText('Content for Tab 2')).not.toBeInTheDocument()
    })

    it('switches content when tab changes', () => {
      render(<TabsExample />)

      const tab2 = screen.getByRole('tab', { name: 'Tab 2' })
      fireEvent.click(tab2)

      expect(screen.queryByText('Content for Tab 1')).not.toBeInTheDocument()
      expect(screen.getByText('Content for Tab 2')).toBeInTheDocument()
    })

    it('applies correct attributes to tab content', () => {
      render(<TabsExample />)

      const content = screen.getByText('Content for Tab 1').closest('[data-slot="tabs-content"]')
      expect(content).toBeInTheDocument()
      expect(content).toHaveClass('flex-1', 'outline-none')
    })

    it('applies custom className to tab content', () => {
      render(
        <Tabs defaultValue="test">
          <TabsList>
            <TabsTrigger value="test">Test</TabsTrigger>
          </TabsList>
          <TabsContent value="test" className="custom-content-class">
            Test Content
          </TabsContent>
        </Tabs>
      )

      const content = screen.getByText('Test Content').closest('[data-slot="tabs-content"]')
      expect(content).toHaveClass('custom-content-class')
    })
  })

  describe('Keyboard Navigation', () => {
    it('supports arrow key navigation', () => {
      render(<TabsExample />)

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' })
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' })

      // Focus first tab
      tab1.focus()
      expect(tab1).toHaveFocus()

      // Press right arrow to move to next tab
      fireEvent.keyDown(tab1, { key: 'ArrowRight' })
      expect(tab2).toHaveFocus()
    })

    it('supports home and end key navigation', () => {
      render(<TabsExample />)

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' })
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' })

      // Focus middle tab
      tab2.focus()

      // Press Home to go to first tab
      fireEvent.keyDown(tab2, { key: 'Home' })
      expect(tab1).toHaveFocus()

      // Press End to go to last enabled tab
      fireEvent.keyDown(tab1, { key: 'End' })
      expect(tab2).toHaveFocus() // Tab 3 is disabled, so should focus Tab 2
    })

    it('skips disabled tabs during keyboard navigation', () => {
      render(<TabsExample />)

      const tab2 = screen.getByRole('tab', { name: 'Tab 2' })
      const disabledTab = screen.getByRole('tab', { name: 'Tab 3 (Disabled)' })

      tab2.focus()

      // Pressing right arrow should skip disabled tab
      fireEvent.keyDown(tab2, { key: 'ArrowRight' })
      expect(disabledTab).not.toHaveFocus()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<TabsExample />)

      const tabsList = screen.getByRole('tablist')
      const tabs = screen.getAllByRole('tab')
      const tabpanel = screen.getByRole('tabpanel')

      expect(tabsList).toBeInTheDocument()
      expect(tabs).toHaveLength(3)
      expect(tabpanel).toBeInTheDocument()
    })

    it('associates tabs with their panels', () => {
      render(<TabsExample />)

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' })
      const tabpanel = screen.getByRole('tabpanel')

      expect(tab1).toHaveAttribute('aria-controls', tabpanel.id)
      expect(tabpanel).toHaveAttribute('aria-labelledby', tab1.id)
    })

    it('indicates selected state correctly', () => {
      render(<TabsExample />)

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' })
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' })

      expect(tab1).toHaveAttribute('aria-selected', 'true')
      expect(tab2).toHaveAttribute('aria-selected', 'false')

      fireEvent.click(tab2)

      expect(tab1).toHaveAttribute('aria-selected', 'false')
      expect(tab2).toHaveAttribute('aria-selected', 'true')
    })

    it('handles disabled state accessibility', () => {
      render(<TabsExample />)

      const disabledTab = screen.getByRole('tab', { name: 'Tab 3 (Disabled)' })
      expect(disabledTab).toHaveAttribute('aria-disabled', 'true')
    })
  })

  describe('Controlled vs Uncontrolled', () => {
    it('works as uncontrolled component with defaultValue', () => {
      render(<TabsExample defaultValue="tab2" />)

      const tab2 = screen.getByRole('tab', { name: 'Tab 2' })
      expect(tab2).toHaveAttribute('data-state', 'active')
      expect(screen.getByText('Content for Tab 2')).toBeInTheDocument()
    })

    it('works as controlled component', () => {
      const ControlledTabs = () => {
        const [value, setValue] = React.useState('tab1')

        return (
          <div>
            <button onClick={() => setValue('tab2')}>Switch to Tab 2</button>
            <Tabs value={value} onValueChange={setValue}>
              <TabsList>
                <TabsTrigger value="tab1">Tab 1</TabsTrigger>
                <TabsTrigger value="tab2">Tab 2</TabsTrigger>
              </TabsList>
              <TabsContent value="tab1">Content 1</TabsContent>
              <TabsContent value="tab2">Content 2</TabsContent>
            </Tabs>
          </div>
        )
      }

      render(<ControlledTabs />)

      expect(screen.getByText('Content 1')).toBeInTheDocument()

      const switchButton = screen.getByRole('button', { name: 'Switch to Tab 2' })
      fireEvent.click(switchButton)

      expect(screen.getByText('Content 2')).toBeInTheDocument()
    })
  })
})