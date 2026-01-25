# CI/CD Setup

## Przegląd

Projekt używa GitHub Actions do automatyzacji procesów CI/CD. Workflow jest uruchamiany automatycznie przy każdym push na branch `master` oraz może być uruchomiony ręcznie.

## Workflow: CI

Plik: `.github/workflows/ci.yml`

### Triggery

- **Automatyczne**: Push na branch `master`
- **Ręczne**: `workflow_dispatch` (przycisk "Run workflow" w zakładce Actions)

### Jobs

#### 1. Quality Checks

Sprawdza jakość kodu i uruchamia wszystkie testy:

- **Linting**: `npm run lint` - sprawdzenie standardów kodu (ESLint)
- **Unit Tests**: `npm run test:unit` - testy jednostkowe (Vitest)
- **E2E Tests**: ~~`npm run test:e2e`~~ - testy end-to-end (Playwright) - **tymczasowo wyłączone, zostaną włączone na późniejszym etapie**

#### 2. Build

Tworzy produkcyjną wersję aplikacji:

- **Production Build**: `npm run build` - kompilacja aplikacji Astro
- **Artifacts**: Zapisuje zbudowaną aplikację jako artefakt (dostępny przez 7 dni)

### Konfiguracja

#### Wymagane Secrets

W ustawieniach repozytorium (Settings → Secrets and variables → Actions) należy dodać:

- `SUPABASE_URL` - URL instancji Supabase
- `SUPABASE_KEY` - Klucz publiczny (anon key)
- `SUPABASE_SERVICE_ROLE_KEY` - Klucz serwisowy (do operacji administracyjnych)

#### Node.js Version

Wersja Node.js jest automatycznie odczytywana z pliku `.nvmrc` (obecnie: 22.14.0).

### Optymalizacje

- **Cache**: Używa cache dla `npm` dependencies (automatyczne przez `setup-node`)
- **Timeout**: Limity czasowe na joba (10 minut) zapobiegają zawieszeniu
- **Playwright**: Instaluje tylko Chromium (oszczędność czasu i zasobów)
- **Dependencies**: Sequential jobs - `build` uruchamia się tylko gdy `quality-checks` przejdzie

### Ręczne uruchomienie

1. Przejdź do zakładki "Actions" w repozytorium
2. Wybierz workflow "CI"
3. Kliknij "Run workflow"
4. Wybierz branch i potwierdź

## Rozszerzenia (opcjonalne)

W przyszłości można dodać:

- **Coverage Reports**: Raporty pokrycia testami (Codecov/Coveralls)
- **Deploy**: Automatyczne wdrożenie na Vercel po sukcesie CI
- **PR Checks**: Uruchamianie CI na Pull Requestach
- **Cache dla Playwright**: Buforowanie przeglądarek Playwright
- **Matrix Strategy**: Testy na wielu wersjach Node.js
