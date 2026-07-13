import { expect, test } from '@playwright/test'

test.describe('Dashboard', () => {
  test('loads the dashboard page', async ({ page }) => {
    await page.goto('/home')

    await expect(
      page.getByRole('heading', {
        name: 'Volt',
        exact: true,
      }),
    ).toBeVisible()

    await expect(
      page.getByRole('heading', {
        name: 'Statistics',
        exact: true,
      }),
    ).toBeVisible()
  })
})