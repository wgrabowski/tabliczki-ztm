# E2E Tests Setup Guide

## Quick Start

### 1. Configure Test Environment

```bash
# Copy example file
cp .env.test.example .env.test

# Edit .env.test with your test Supabase credentials
```

Required variables:

- `TEST_SUPABASE_URL` - Your test Supabase project URL
- `TEST_SUPABASE_KEY` - Anon/public key from test project
- `TEST_SUPABASE_SERVICE_ROLE_KEY` - Service role key (for cleanup)
- `TEST_USER_EMAIL` - Email of manually created test user
- `TEST_USER_PASSWORD` - Password of test user

### 2. Install Playwright Browsers

```bash
npx playwright install chromium
```

### 3. Run Tests

```bash
# Run all E2E tests (excludes screenshot tests)
npm run test:e2e

# Interactive UI mode
npm run test:e2e:ui

# See browser (headed mode)
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug

# Generate screenshots (separate from regular tests)
npm run screenshots        # headed mode (see browser)
npm run screenshots:ci     # headless mode (CI)
```

**Note:** Screenshot tests are isolated and won't run with regular E2E tests to avoid conflicts and save time.

## Test User Setup

### In Supabase Dashboard:

1. Go to **Authentication** → **Users**
2. Click **Add user**
3. Enter email and password
4. If email confirmation is enabled, verify the email
5. Use these credentials in `.env.test`

## GitHub Actions Setup

### Required Secrets

Go to **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add the following secrets:

**Test Environment:**

- `TEST_SUPABASE_URL`
- `TEST_SUPABASE_KEY`
- `TEST_SUPABASE_SERVICE_ROLE_KEY`
- `TEST_USER_EMAIL`
- `TEST_USER_PASSWORD`

**Application (if not already set):**

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Project Structure

```
src/tests/e2e/
├── fixtures/           # Test fixtures (auto-login, etc.)
├── helpers/            # Utility functions
├── smoke.spec.ts       # Verification tests
├── global-setup.ts     # Environment validation
└── README.md           # Detailed documentation
```

## Next Steps

1. ✅ Configure `.env.test` with your test credentials
2. ✅ Create test user in Supabase
3. ✅ Run smoke tests: `npm run test:e2e`
4. ✅ Add GitHub secrets for CI/CD
5. ⏳ Write additional test specs based on test plan

## Important Notes

- **One test user** - all tests share the same user
- **Sequential execution** - tests run one at a time
- **Automatic cleanup** - data is cleared after each test
- **Separate database** - never use production Supabase for tests

## Documentation

- Full E2E documentation: [src/tests/e2e/README.md](src/tests/e2e/README.md)
- Test plan: [.ai/test-plan.md](.ai/test-plan.md)
- Playwright docs: https://playwright.dev
