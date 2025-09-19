import { test, expect } from '@playwright/test'

test.describe('Load Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/loads')
  })

  test('should display loads list page', async ({ page }) => {
    // Check page title and heading
    await expect(page).toHaveTitle(/Loads/)
    await expect(page.locator('h1')).toContainText('Loads')

    // Check for create load button
    await expect(page.getByRole('button', { name: /create load/i })).toBeVisible()

    // Check for loads table or list
    await expect(page.locator('[data-testid="loads-table"]')).toBeVisible()
  })

  test('should create a new load', async ({ page }) => {
    // Click create load button
    await page.click('button:has-text("Create Load")')

    // Should navigate to create load page
    await expect(page).toHaveURL('/loads/create')
    await expect(page.locator('h1')).toContainText('Create Load')

    // Fill in load form
    await page.fill('input[name="reference_number"]', 'TEST-LOAD-001')
    await page.fill('input[name="pickup_location"]', 'Johannesburg, South Africa')
    await page.fill('input[name="delivery_location"]', 'Cape Town, South Africa')
    await page.fill('textarea[name="cargo_description"]', 'Test cargo for automated testing')
    await page.fill('input[name="weight_tons"]', '25.5')
    await page.fill('input[name="value_usd"]', '50000')

    // Select customer from dropdown
    await page.click('select[name="customer_id"]')
    await page.selectOption('select[name="customer_id"]', { index: 1 })

    // Set pickup and delivery dates
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const pickupDate = tomorrow.toISOString().split('T')[0]

    const dayAfterTomorrow = new Date()
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 3)
    const deliveryDate = dayAfterTomorrow.toISOString().split('T')[0]

    await page.fill('input[name="pickup_date"]', pickupDate)
    await page.fill('input[name="delivery_date"]', deliveryDate)

    // Submit form
    await page.click('button[type="submit"]')

    // Should redirect to loads list with success message
    await expect(page).toHaveURL('/loads')
    await expect(page.getByText('Load created successfully')).toBeVisible()

    // Verify load appears in the list
    await expect(page.getByText('TEST-LOAD-001')).toBeVisible()
  })

  test('should view load details', async ({ page }) => {
    // Click on first load in the list
    const firstLoadRow = page.locator('[data-testid="load-row"]').first()
    await firstLoadRow.click()

    // Should navigate to load details page
    await expect(page.url()).toMatch(/\/loads\/[a-zA-Z0-9-]+/)

    // Check for load details
    await expect(page.getByText('Load Details')).toBeVisible()
    await expect(page.getByText('Reference Number')).toBeVisible()
    await expect(page.getByText('Pickup Location')).toBeVisible()
    await expect(page.getByText('Delivery Location')).toBeVisible()
    await expect(page.getByText('Status')).toBeVisible()
  })

  test('should update load status', async ({ page }) => {
    // Navigate to first load details
    const firstLoadRow = page.locator('[data-testid="load-row"]').first()
    await firstLoadRow.click()

    // Check current status
    const statusElement = page.locator('[data-testid="load-status"]')
    await expect(statusElement).toBeVisible()

    // Click status update button
    await page.click('button:has-text("Update Status")')

    // Select new status from dropdown
    await page.click('select[name="status"]')
    await page.selectOption('select[name="status"]', 'in_transit')

    // Add status note
    await page.fill('textarea[name="status_note"]', 'Load picked up and in transit')

    // Submit status update
    await page.click('button:has-text("Update")')

    // Verify success message
    await expect(page.getByText('Status updated successfully')).toBeVisible()

    // Verify status change
    await expect(page.getByText('In Transit')).toBeVisible()
  })

  test('should filter loads by status', async ({ page }) => {
    // Check for filter dropdown
    await expect(page.locator('select[name="status_filter"]')).toBeVisible()

    // Filter by pending status
    await page.selectOption('select[name="status_filter"]', 'pending')

    // Wait for filtered results
    await page.waitForTimeout(1000)

    // Verify only pending loads are shown
    const loadRows = page.locator('[data-testid="load-row"]')
    const count = await loadRows.count()
    
    if (count > 0) {
      // Check that all visible loads have pending status
      for (let i = 0; i < count; i++) {
        const statusBadge = loadRows.nth(i).locator('[data-testid="status-badge"]')
        await expect(statusBadge).toContainText('Pending')
      }
    }
  })

  test('should search loads by reference number', async ({ page }) => {
    // Check for search input
    const searchInput = page.locator('input[placeholder*="Search"]')
    await expect(searchInput).toBeVisible()

    // Enter search term
    await searchInput.fill('TL-2024')

    // Wait for search results
    await page.waitForTimeout(1000)

    // Verify search results contain the search term
    const loadRows = page.locator('[data-testid="load-row"]')
    const count = await loadRows.count()
    
    if (count > 0) {
      const firstRow = loadRows.first()
      await expect(firstRow).toContainText('TL-2024')
    }
  })

  test('should handle empty state', async ({ page }) => {
    // Mock empty response
    await page.route('/api/loads', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], success: true })
      })
    })

    await page.reload()

    // Check for empty state message
    await expect(page.getByText('No loads found')).toBeVisible()
    await expect(page.getByText('Create your first load')).toBeVisible()
  })
})