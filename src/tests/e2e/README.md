# E2E Tests

End-to-end tests for Tabliczki ZTM application using Playwright.

## Prerequisites

### 1. Test Supabase Project

Create a dedicated Supabase project for testing (separate from production):

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project (e.g., "tabliczki-ztm-test")
3. Run migrations to set up database schema
4. Copy API keys from Settings → API

### 2. Test User

Manually create a test user in Supabase:

1. Go to Authentication → Users
2. Add a new user with email and password
3. Confirm the email (if email confirmation is enabled)
4. Use these credentials in `.env.test`

## Local Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Environment File

Copy the example file and fill in your test environment values:

```bash
cp .env.test.example .env.test
```

Edit `.env.test`:

```env
TEST_SUPABASE_URL=https://xxxxx.supabase.co
TEST_SUPABASE_KEY=eyJhbGc...
TEST_SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
TEST_USER_EMAIL=e2e-test@example.com
TEST_USER_PASSWORD=YourSecurePassword123!
BASE_URL=http://localhost:4321
```

### 3. Install Playwright Browsers

```bash
npx playwright install chromium
```

## Running Tests

### All Tests

```bash
npm run test:e2e
```

### With UI Mode (Interactive)

```bash
npm run test:e2e:ui
```

### Headed Mode (See Browser)

```bash
npm run test:e2e:headed
```

### Debug Mode

```bash
npm run test:e2e:debug
```

### View Last Report

```bash
npm run test:e2e:report
```

## Test Structure

```
src/tests/e2e/
├── fixtures/
│   └── authenticated.fixture.ts    # Auto-login fixture
├── helpers/
│   ├── auth.helper.ts              # Login/logout functions
│   └── cleanup.helper.ts           # Data cleanup functions
├── smoke.spec.ts                   # Basic verification tests
├── global-setup.ts                 # Pre-test validation
└── global-teardown.ts              # Post-test cleanup
```

## Writing Tests

### Basic Test (Unauthenticated)

```typescript
import { test, expect } from "@playwright/test";

test("should load home page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Tabliczki ZTM/);
});
```

### Authenticated Test

```typescript
import { test, expect } from "./fixtures/authenticated.fixture";

test("should access dashboard", async ({ authenticatedPage }) => {
  // User is already logged in
  await authenticatedPage.goto("/dashboard");
  await expect(authenticatedPage).toHaveURL("/dashboard");
});
```

## CI/CD

E2E tests run automatically in GitHub Actions on:

- Push to `master` branch
- Pull requests to `master` branch

### Required GitHub Secrets

Set these in repository Settings → Secrets and variables → Actions:

**Secrets:**

- `TEST_SUPABASE_URL`
- `TEST_SUPABASE_KEY`
- `TEST_SUPABASE_SERVICE_ROLE_KEY`
- `TEST_USER_EMAIL`
- `TEST_USER_PASSWORD`

**Also required (for app):**

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Test Philosophy

### Single User Approach

- **One test user** shared across all tests
- **Sequential execution** (no parallelism)
- **Automatic cleanup** after each test
- **Isolated test database** (separate from production)

### Cleanup Strategy

- Each test runs `cleanupUserData()` after completion
- Deletes all sets and set_items for test user
- Ensures clean state for next test
- Uses service role key to bypass RLS

### Best Practices

1. **Always use fixtures** for authenticated tests
2. **Verify cleanup** works correctly
3. **Use data-testid** attributes for stable selectors
4. **Handle loading states** with proper waits
5. **Test real user flows** end-to-end

## Troubleshooting

### Tests fail with authentication error

- Verify test user exists in Supabase
- Check credentials in `.env.test`
- Ensure email is confirmed (if required)

### Tests fail with cleanup errors

- Verify `TEST_SUPABASE_SERVICE_ROLE_KEY` is correct
- Check service role key has admin permissions
- Ensure RLS policies allow service role bypass

### Server doesn't start

- Check if port 4321 is available
- Verify `BASE_URL` in `.env.test`
- Increase timeout in `playwright.config.ts`

### Browser installation issues

```bash
npx playwright install --with-deps chromium
```

## Debugging

### Visual Debugging

```bash
# Run with UI mode
npm run test:e2e:ui

# Run in headed mode
npm run test:e2e:headed

# Step through with debugger
npm run test:e2e:debug
```

### View Traces

When tests fail, traces are automatically captured:

```bash
npx playwright show-trace test-results/[test-name]/trace.zip
```

### Screenshots

Failed tests automatically capture screenshots in `test-results/`

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [Test Plan](../../../.ai/test-plan.md)
