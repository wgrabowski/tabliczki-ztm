# Tests Directory

This directory contains all tests for the Tabliczki ZTM project.

## Structure

**Important:** Following Vitest best practices, **unit tests should be placed next to source files** (e.g., `service.ts` → `service.test.ts`).

This directory contains **only shared test utilities and non-unit tests**:

```
src/tests/
├── setup.ts                    # Global Vitest setup
├── fixtures/
│   └── data.ts                 # Test data fixtures
├── helpers/
│   └── mocks.ts                # Mock utilities
├── unit/                       # ⚠️ LEGACY - Move tests to source directories
│   ├── validation/             # → Move to src/lib/validation/*.test.ts
│   ├── errors/                 # → Move to src/lib/errors/*.test.ts
│   └── services/               # → Move to src/lib/services/*.test.ts
├── integration/
│   └── api/                    # API endpoint tests
└── e2e/
    ├── *.spec.ts               # E2E test files
    ├── fixtures/
    │   └── auth.fixture.ts     # E2E fixtures
    └── pages/
        └── dashboard.page.ts   # Page Object Models
```

**Recommended structure for unit tests:**

```
src/
├── lib/
│   ├── validation/
│   │   ├── auth.validation.ts
│   │   ├── auth.validation.test.ts      ✅ Test next to source
│   │   ├── sets.validation.ts
│   │   └── sets.validation.test.ts      ✅ Test next to source
│   ├── services/
│   │   ├── sets.service.ts
│   │   └── sets.service.test.ts         ✅ Test next to source
│   └── errors/
│       ├── db-errors.ts
│       └── db-errors.test.ts            ✅ Test next to source
```

## Quick Start

### Run Unit Tests

```bash
npm run test:unit
```

### Run Integration Tests

```bash
npm run test:unit -- integration
```

### Run E2E Tests

```bash
npm run test:e2e
```

## Writing Tests

### Unit Tests

**Place unit tests next to the source files they test:**

- `src/lib/validation/auth.validation.test.ts` - Next to `auth.validation.ts`
- `src/lib/errors/db-errors.test.ts` - Next to `db-errors.ts`
- `src/lib/services/sets.service.test.ts` - Next to `sets.service.ts`

Use relative imports in test files:

```typescript
// Good: src/lib/validation/auth.validation.test.ts
import { loginCommandSchema } from "./auth.validation";

// Bad: using absolute path
import { loginCommandSchema } from "@/lib/validation/auth.validation";
```

### Integration Tests

Place integration tests in `src/tests/integration/`:

- `api/*.test.ts` - API endpoint tests (with mocked DB)

### E2E Tests

Place E2E tests in `src/tests/e2e/`:

- `*.spec.ts` - Playwright E2E tests
- Use Page Object Models from `pages/` directory
- Use fixtures from `fixtures/` directory

## Fixtures and Helpers

### Test Data Fixtures

Use fixtures from `fixtures/data.ts`:

```typescript
import { createTestSet, createTestUser } from "@/tests/fixtures/data";

const testSet = createTestSet({ name: "My Set" });
```

### Mocks

Use mock helpers from `helpers/mocks.ts`:

```typescript
import { createMockSupabaseClient, createMockAPIContext } from "@/tests/helpers/mocks";

const mockClient = createMockSupabaseClient();
const mockContext = createMockAPIContext();
```

## Test Coverage

Generate coverage report:

```bash
npm run test:unit:coverage
```

View report:

```bash
open coverage/index.html
```

## More Information

See the complete testing guide: [TESTING.md](../../TESTING.md)
