import {
  expect,
  test,
  type APIRequestContext,
} from '@playwright/test'

const password = 'Password123!'

function createUniqueEmail(prefix: string): string {
  const uniqueValue = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`

  return `${prefix}-${uniqueValue}@example.com`
}

async function createUser(
  request: APIRequestContext,
  email: string,
): Promise<void> {
  const response = await request.post('/api/auth/register', {
    data: {
      name: 'QA Test User',
      email,
      password,
    },
  })

  expect(response.ok()).toBeTruthy()
}

test.describe('Authentication', () => {
  test('registers a new user successfully', async ({ page }) => {
    const email = createUniqueEmail('register')

    await page.goto('/')

    await page
      .getByRole('button', {
        name: 'Create account',
        exact: true,
      })
      .click()

    await page.getByLabel('Name').fill('Playwright User')
    await page.getByLabel('Email').fill(email)

    await page
      .getByLabel('Password', { exact: true })
      .fill(password)

    await page
      .getByLabel('Confirm Password')
      .fill(password)

    await page
      .getByRole('button', {
        name: 'Create account',
        exact: true,
      })
      .click()

    await expect(page).toHaveURL(/\/home$/)

    await expect(
      page.getByRole('heading', {
        name: 'Statistics',
        exact: true,
      }),
    ).toBeVisible()

    const storedUser = await page.evaluate(() => {
      const value = localStorage.getItem('user')
      return value ? JSON.parse(value) : null
    })

    expect(storedUser).not.toBeNull()
    expect(storedUser.email).toBe(email)
  })

  test('logs in with correct credentials', async ({
    page,
    request,
  }) => {
    const email = createUniqueEmail('login-success')

    await createUser(request, email)

    await page.goto('/')

    await page.getByLabel('Email').fill(email)

    await page
      .getByLabel('Password', { exact: true })
      .fill(password)

    await page
      .getByRole('button', {
        name: 'Login',
        exact: true,
      })
      .click()

    await expect(page).toHaveURL(/\/home$/)

    await expect(
      page.getByRole('heading', {
        name: 'Statistics',
        exact: true,
      }),
    ).toBeVisible()
  })

  test('shows an error for an incorrect password', async ({
    page,
    request,
  }) => {
    const email = createUniqueEmail('wrong-password')

    await createUser(request, email)

    await page.goto('/')

    await page.getByLabel('Email').fill(email)

    await page
      .getByLabel('Password', { exact: true })
      .fill('WrongPassword123!')

    await page
      .getByRole('button', {
        name: 'Login',
        exact: true,
      })
      .click()

    await expect(
      page.getByText('Invalid credentials', {
        exact: true,
      }),
    ).toBeVisible()

    await expect(page).not.toHaveURL(/\/home$/)
  })

  test('shows an error when the email is already registered', async ({
    page,
    request,
  }) => {
    const email = createUniqueEmail('duplicate')

    await createUser(request, email)

    await page.goto('/')

    await page
      .getByRole('button', {
        name: 'Create account',
        exact: true,
      })
      .click()

    await page.getByLabel('Name').fill('Duplicate User')
    await page.getByLabel('Email').fill(email)

    await page
      .getByLabel('Password', { exact: true })
      .fill(password)

    await page
      .getByLabel('Confirm Password')
      .fill(password)

    await page
      .getByRole('button', {
        name: 'Create account',
        exact: true,
      })
      .click()

    await expect(
      page.getByText('Email already in use', {
        exact: true,
      }),
    ).toBeVisible()

    await expect(page).not.toHaveURL(/\/home$/)
  })
})