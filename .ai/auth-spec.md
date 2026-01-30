# Specyfikacja Techniczna: System Uwierzytelniania i Zarządzania Kontem

Niniejszy dokument opisuje architekturę modułu rejestracji, logowania oraz zarządzania kontem dla aplikacji Tabliczki ZTM, zgodnie z wymaganiami US-001 i US-011 (PRD) oraz stosowaną technologią (Astro + Svelte + Supabase).

## 1. Architektura Interfejsu Użytkownika

### 1.1. Podział Odpowiedzialności (Astro vs Svelte)

Projekt opiera się na architekturze wyspowej (Island Architecture).

- **Strony Astro (Server-Side):** Odpowiadają za routing, bezpieczeństwo na poziomie serwera (SSR) oraz wstępne sprawdzenie sesji użytkownika. Strony te renderują szkielet interfejsu i osadzają interaktywne komponenty.
- **Komponenty Svelte (Client-Side):** Obsługują interaktywne formularze, walidację danych "w locie", stany ładowania oraz asynchroniczną komunikację z API (fetch).

### 1.2. Widoki i Komponenty (Zgodne z MVP)

Zgodnie z PRD, system ogranicza się wyłącznie do autentykacji email/password.

- **`src/pages/auth/login.astro`**: Strona logowania z obsługą trybu weryfikacji email. Osadza `LoginForm.svelte` lub wyświetla komunikat o konieczności potwierdzenia konta.
  - Parametr URL `?mode=verify-email`: Wyświetla informację o wysłaniu linku weryfikacyjnego na adres email.
- **`src/pages/auth/register.astro`**: Strona rejestracji. Osadza `RegisterForm.svelte`.
- **`src/pages/auth/account.astro`**: Widok zarządzania kontem (US-011). Dostępny tylko po zalogowaniu. Osadza `AccountManagement.svelte`.
- **`src/components/auth/`**:
  - `LoginForm.svelte`: Pola email/hasło, obsługa błędów logowania.
  - `RegisterForm.svelte`: Pola email/hasło/potwierdzenie. Po pomyślnej rejestracji przekierowuje na `/auth/login?mode=verify-email`.
  - `AccountManagement.svelte`: Informacje o użytkowniku, przycisk wylogowania oraz przycisk "Usuń konto" z potwierdzeniem.

_Uwaga: Funkcjonalność odzyskiwania hasła (Forgot Password) została usunięta jako nadmiarowa względem wymagań MVP opisanych w PRD._

### 1.2.1. Komunikat Weryfikacji Email

**Uwaga**: Ta funkcjonalność jest aktywna tylko w środowisku produkcyjnym z włączoną weryfikacją email (`enable_confirmations = true`). W środowisku lokalnym konta są automatycznie aktywowane.

Po rejestracji (w produkcji) użytkownik jest przekierowywany na stronę `/auth/login?mode=verify-email`, która wyświetla standardowy formularz logowania z dodatkowym komunikatem informacyjnym nad formularzem:

**Komunikat zawiera:**

- **Ikona**: Symbol emaila (Material Symbols: `mail`)
- **Nagłówek**: "Potwierdź swoje konto"
- **Komunikat**: "Na podany adres email został wysłany link aktywacyjny. Kliknij w link, aby aktywować swoje konto."
- **Instrukcja**: "Nie otrzymałeś wiadomości? Sprawdź folder spam."

**Pod komunikatem** wyświetlany jest standardowy formularz logowania, dzięki czemu użytkownik może od razu się zalogować po kliknięciu w link weryfikacyjny w emailu.

**Wygląd zgodny z wytycznymi UI:**

- Komunikat wyświetlany w ramce ze stylem `<outlined>`
- Ikona email z Material Symbols (`.theme-icon`)
- Tekst wycentrowany
- Zachowanie odstępów zgodnych z layoutem strony logowania

### 1.3. Rozszerzenie Istniejących Elementów

- **`AppLayout.svelte`**: Dodanie stanu zalogowanego użytkownika do nagłówka. Wyświetlanie linku do widoku "Konto" (zgodnie z 3.f PRD).
- **`AccountButton.svelte`**: Kieruje bezpośrednio do `/account`.

### 1.4. Walidacja i UX

- **Walidacja po stronie klienta**: Wykorzystanie biblioteki `zod` do walidacji formatu e-mail i długości hasła.
- **Komunikaty błędów**: Mapowanie błędów Supabase na polskie komunikaty (np. "Błędne dane logowania", "Konto nie zostało jeszcze zweryfikowane").

### 1.5. Przepływ Rejestracji i Weryfikacji

**Środowisko lokalne (development):**

1. **Rejestracja**: Użytkownik wypełnia formularz na `/auth/register`
2. **Auto-aktywacja**: Konto jest automatycznie aktywowane przez Supabase (`enable_confirmations = false`)
3. **Przekierowanie**: Użytkownik jest przekierowywany bezpośrednio na dashboard lub returnUrl
4. **Gotowe**: Użytkownik może od razu korzystać z aplikacji

**Środowisko produkcyjne:**

1. **Rejestracja**: Użytkownik wypełnia formularz na `/auth/register`
2. **Wysłanie email**: Po poprawnej walidacji, Supabase wysyła email z linkiem weryfikacyjnym
3. **Przekierowanie**: Użytkownik jest przekierowywany na `/auth/login?mode=verify-email`
4. **Komunikat weryfikacyjny**: Nad formularzem logowania wyświetlana jest informacja o konieczności potwierdzenia konta oraz instrukcja sprawdzenia skrzynki email
5. **Weryfikacja**: Użytkownik klika w link w emailu
6. **Aktywacja**: Konto zostaje aktywowane i użytkownik zostaje przekierowany na `/auth/login`
7. **Logowanie**: Użytkownik loguje się używając formularza, który już widzi na stronie

---

## 2. Implementacja Techniczna Widoku Weryfikacji

### 2.0. Implementacja w `src/pages/auth/login.astro`

Strona logowania **zawsze wyświetla formularz logowania** (`LoginForm.svelte`). Dodatkowo, w zależności od parametru URL `mode`, może wyświetlić komunikat informacyjny nad formularzem.

**Struktura strony:**

1. Nagłówek (zawsze)
2. **Komunikat weryfikacyjny (opcjonalnie, gdy `mode=verify-email`)**
3. Formularz logowania (zawsze)

**Komunikat weryfikacyjny (`mode=verify-email`):**
Wyświetlany nad formularzem logowania jako osobna sekcja zawierająca:

- Ikonę email (Material Symbols: `mail`)
- Nagłówek: "Potwierdź swoje konto"
- Opis: "Na podany adres email został wysłany link aktywacyjny. Kliknij w link, aby aktywować swoje konto."
- Wskazówkę: "Nie otrzymałeś wiadomości? Sprawdź folder spam."

**Implementacja:**

```typescript
const mode = Astro.url.searchParams.get("mode");
const showVerifyEmailMessage = mode === "verify-email";
```

**Layout:**

- Komunikat weryfikacyjny wyświetlany między `.auth-header` a `.auth-form-wrapper`
- Odstęp wertykalny zgodny z `gap: calc(var(--theme--spacing) * 6)` z `.auth-container`

**Style komunikatu zgodne z UI Guidelines:**

- Ramka komunikatu: `.theme-outlined` (białe tło, ciemne obramowanie, `padding: calc(var(--theme--spacing) * 4)`)
- Ikona: `.theme-icon` (Material Symbols, rozmiar 48px)
- Kolor tekstu: `var(--theme--accent-color)`
- Brak border-radius
- Centrowanie tekstu i ikony

## 2. Logika Backendowa

### 2.1. Endpointy API (`src/pages/api/auth/`)

- `POST /api/auth/login`: Weryfikacja danych, ustawienie sesji (HttpOnly). Sprawdza czy konto zostało zweryfikowane (tylko w produkcji z `enable_confirmations = true`).
- `POST /api/auth/register`: Tworzenie konta. W zależności od konfiguracji Supabase:
  - **Lokalnie**: Konto jest automatycznie aktywowane, sesja tworzona natychmiast
  - **Produkcja**: Wysyłany jest email weryfikacyjny, sesja nie jest tworzona do momentu potwierdzenia
- `POST /api/auth/logout`: Wyczyszczenie sesji.
- `DELETE /api/auth/account`: Trwałe usunięcie konta i danych (US-011).

### 2.2. Middleware i Ochrona Danych

- **`src/middleware/index.ts`**: Chroni `/dashboard` oraz `/account`.
- **Tryb TV (`/tv/[stopId]`)**: Pozostaje publiczny i nie wymaga logowania (zgodnie z US-007).

---

## 3. System Autentykacji (Supabase Auth)

### 3.1. Konfiguracja

- **Metody**: Wyłącznie Email + Password (pominięcie Social Login z Tech Stack na rzecz PRD).
- **Auto-confirm (weryfikacja email)**:
  - **Środowisko lokalne (development)**: `enable_confirmations = false` - konta są automatycznie aktywowane, brak konieczności potwierdzania email (ułatwia testowanie i rozwój)
  - **Środowisko produkcyjne**: `enable_confirmations = true` - wymagana weryfikacja adresu email poprzez kliknięcie w link aktywacyjny (bezpieczeństwo)
- **Email Templates**: Wykorzystanie szablonów Supabase dla wiadomości weryfikacyjnych (dostosowanie opcjonalne) - aktywne tylko w produkcji.
- **Redirect URL**: Po kliknięciu w link weryfikacyjny użytkownik zostaje przekierowany do `/auth/login` z automatycznym zalogowaniem (tylko produkcja).
- **RLS**: Row Level Security na tabelach `sets` i `set_items` w oparciu o `auth.uid()`.

### 3.2. Konfiguracja dla różnych środowisk

**Lokalne (development):**

- `supabase/config.toml`: `enable_confirmations = false`
- Ułatwia testowanie - nie trzeba sprawdzać emaili
- Konta aktywowane automatycznie

**Produkcja (Supabase Dashboard):**

- Authentication → Email Auth → Enable email confirmations: **ON**
- Ustawić redirect URLs dla wiadomości weryfikacyjnych
- Opcjonalnie dostosować szablony email

**Uwaga dla deweloperów**: Nie commituj zmian w `supabase/config.toml` z `enable_confirmations = true` - to utrudnia lokalne testowanie.

### 3.3. Usuwanie danych (US-011)

- Usunięcie użytkownika w Supabase Auth wywołuje kaskadowe usuwanie w PostgreSQL:
  `ALTER TABLE sets ADD CONSTRAINT sets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;`
