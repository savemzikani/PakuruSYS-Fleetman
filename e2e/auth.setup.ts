import { test as setup, expect } from '@playwright/test'

const authFile = 'playwright/.auth/user.json'

setup('authenticate', async ({ page }) => {
  // Navigate to login page
  await page.goto('/auth/login')

  // Fill in login form
  await page.fill('input[name="email"]', 'admin@testlogistics.com')
  await page.fill('input[name="password"]', 'testpassword123')

  // Click login button
  await page.click('button[type="submit"]')

  // Wait for successful login redirect
  await page.waitForURL('/dashboard')

  // Verify we're logged in by checking for dashboard elements
  await expect(page.locator('h1')).toContainText('Dashboard')

  // Save authentication state
  await page.context().storageState({ path: authFile })
})