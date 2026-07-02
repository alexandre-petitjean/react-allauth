import { expect, test, type Page } from '@playwright/test'
import { latestCodeFor } from './helpers/mailpit'

const SEEDED_EMAIL = 'user@example.com'
const SEEDED_PASSWORD = 'playground-e2e-pass'

async function logIn(page: Page, email: string, password: string) {
  const form = page.locator('form', {
    has: page.getByRole('heading', { name: 'Log in' }),
  })
  await form.getByLabel('Email').fill(email)
  await form.getByLabel('Password').fill(password)
  await form.getByRole('button', { name: 'Log in' }).click()
}

test('logs in and out with the seeded user', async ({ page }) => {
  await page.goto('/')
  await logIn(page, SEEDED_EMAIL, SEEDED_PASSWORD)

  await expect(page.getByText(/Signed in as/)).toBeVisible()

  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible()
})

test('shows the API error on a wrong password', async ({ page }) => {
  await page.goto('/')
  await logIn(page, SEEDED_EMAIL, 'wrong-password')

  await expect(page.locator('.form-errors').first()).toBeVisible()
  await expect(page.getByText(/Signed in as/)).not.toBeVisible()
})

test('signs up and verifies the email by code', async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`
  await page.goto('/')

  const form = page.locator('form', {
    has: page.getByRole('heading', { name: 'Sign up' }),
  })
  await form.getByLabel('Email').fill(email)
  await form.getByLabel('Password').fill('e2e-signup-pass-123')
  await form.getByRole('button', { name: 'Sign up' }).click()

  const verifyForm = page.locator('form', {
    has: page.getByRole('heading', { name: 'Verify your email' }),
  })
  await expect(verifyForm).toBeVisible()

  const code = await latestCodeFor(email)
  await verifyForm.getByLabel('Code').fill(code)
  await verifyForm.getByRole('button', { name: 'Verify' }).click()

  await expect(page.getByText(/Signed in as/)).toBeVisible()
})

test('lists sessions and revokes another device', async ({ browser, page }) => {
  // First device signs in.
  await page.goto('/')
  await logIn(page, SEEDED_EMAIL, SEEDED_PASSWORD)
  await expect(page.getByText(/Signed in as/)).toBeVisible()

  // Second device signs in with the same account.
  const otherContext = await browser.newContext()
  const otherPage = await otherContext.newPage()
  await otherPage.goto('/')
  await logIn(otherPage, SEEDED_EMAIL, SEEDED_PASSWORD)
  await expect(otherPage.getByText(/Signed in as/)).toBeVisible()

  // The first device now sees the other session and revokes it. Counts are
  // relative: the playground database persists across runs, so old sessions
  // may still be listed.
  await page.reload()
  const items = page.locator('.sessions-list li')
  await expect.poll(() => items.count()).toBeGreaterThanOrEqual(2)
  const before = await items.count()
  await page.getByRole('button', { name: 'Revoke' }).first().click()
  await expect(items).toHaveCount(before - 1)
  await expect(page.locator('.sessions-list')).toContainText('(current)')

  await otherContext.close()
})
