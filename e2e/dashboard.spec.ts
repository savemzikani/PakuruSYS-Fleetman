import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard')
  })

  test('should display dashboard with key metrics', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Dashboard/)

    // Check for main dashboard heading
    await expect(page.locator('h1')).toContainText('Dashboard')

    // Check for metric cards
    await expect(page.locator('[data-testid="metric-card"]')).toHaveCount(4)

    // Check for specific metrics
    await expect(page.getByText('Total Revenue')).toBeVisible()
    await expect(page.getByText('Active Loads')).toBeVisible()
    await expect(page.getByText('Fleet Utilization')).toBeVisible()
    await expect(page.getByText('Customer Satisfaction')).toBeVisible()
  })

  test('should display recent activity section', async ({ page }) => {
    // Check for recent activity section
    await expect(page.getByText('Recent Activity')).toBeVisible()

    // Check for activity items (should have at least one)
    const activityItems = page.locator('[data-testid="activity-item"]')
    await expect(activityItems.first()).toBeVisible()
  })

  test('should display revenue chart', async ({ page }) => {
    // Check for revenue chart section
    await expect(page.getByText('Revenue Overview')).toBeVisible()

    // Check for chart container
    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible()
  })

  test('should navigate to different sections from sidebar', async ({ page }) => {
    // Test navigation to loads
    await page.click('a[href="/loads"]')
    await expect(page).toHaveURL('/loads')
    await expect(page.locator('h1')).toContainText('Loads')

    // Navigate back to dashboard
    await page.click('a[href="/dashboard"]')
    await expect(page).toHaveURL('/dashboard')

    // Test navigation to fleet
    await page.click('a[href="/fleet"]')
    await expect(page).toHaveURL('/fleet')
    await expect(page.locator('h1')).toContainText('Fleet')

    // Navigate back to dashboard
    await page.click('a[href="/dashboard"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    // Check that dashboard is still accessible
    await expect(page.locator('h1')).toContainText('Dashboard')

    // Check that sidebar is collapsed/hidden on mobile
    const sidebar = page.locator('[data-testid="sidebar"]')
    await expect(sidebar).not.toBeVisible()

    // Check that mobile menu button is visible
    const mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]')
    await expect(mobileMenuButton).toBeVisible()
  })

  test('should handle loading states', async ({ page }) => {
    // Intercept API calls to simulate loading
    await page.route('/api/dashboard/metrics', async route => {
      // Delay the response to test loading state
      await new Promise(resolve => setTimeout(resolve, 1000))
      await route.continue()
    })

    await page.reload()

    // Check for loading indicators
    const loadingSpinners = page.locator('[data-testid="loading-spinner"]')
    await expect(loadingSpinners.first()).toBeVisible()

    // Wait for loading to complete
    await expect(loadingSpinners.first()).not.toBeVisible({ timeout: 5000 })
  })

  test('should display correct user information', async ({ page }) => {
    // Check for user profile section
    await expect(page.locator('[data-testid="user-profile"]')).toBeVisible()

    // Check for user name or email
    await expect(page.getByText('John Admin')).toBeVisible()
  })
})