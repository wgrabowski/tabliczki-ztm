# Specyfikacja Techniczna: System Uwierzytelniania i Zarządzania Kontem

Niniejszy dokument opisuje architekturę modułu rejestracji, logowania oraz zarządzania kontem dla aplikacji Tabliczki ZTM, zgodnie z wymaganiami US-001 i US-011 (PRD) oraz stosowaną technologią (Astro + Svelte + Supabase).

## 1. Architektura Interfejsu Użytkownika

### 1.1. Podział Odpowiedzialności (Astro vs Svelte)

Projekt opiera się na architekturze wyspowej (Island Architecture).

- **Strony Astro (Server-Side):** Odpowiadają za routing, bezpieczeństwo na poziomie serwera (SSR) oraz wstępne sprawdzenie sesji użytkownika. Strony te renderują szkielet interfejsu i osadzają interaktywne komponenty.
- **Komponenty Svelte (Client-Side):** Obsługują interaktywne formularze, walidację danych "w locie", stany ładowania oraz asynchroniczną komunikację z API (fetch).

### 1.2. Widoki i Komponenty (Zgodne z MVP)

Zgodnie z PRD, system ogranicza się wyłącznie do autentykacji email/password.

- **`src/pages/login.astro`**: Strona logowania. Osadza `LoginForm.svelte`.
- **`src/pages/register.astro`**: Strona rejestracji. Osadza `RegisterForm.svelte`.
- **`src/pages/account.astro`**: Widok zarządzania kontem (US-011). Dostępny tylko po zalogowaniu. Osadza `AccountManagement.svelte`.
- **`src/components/auth/`**:
  - `LoginForm.svelte`: Pola email/hasło, obsługa błędów logowania.
  - `RegisterForm.svelte`: Pola email/hasło/potwierdzenie.
  - `AccountManagement.svelte`: Informacje o użytkowniku, przycisk wylogowania oraz przycisk "Usuń konto" z potwierdzeniem.

_Uwaga: Funkcjonalność odzyskiwania hasła (Forgot Password) została usunięta jako nadmiarowa względem wymagań MVP opisanych w PRD._

### 1.3. Rozszerzenie Istniejących Elementów

- **`AppLayout.svelte`**: Dodanie stanu zalogowanego użytkownika do nagłówka. Wyświetlanie linku do widoku "Konto" (zgodnie z 3.f PRD).
- **`AccountButton.svelte`**: Kieruje bezpośrednio do `/account`.

### 1.4. Walidacja i UX

- **Walidacja po stronie klienta**: Wykorzystanie biblioteki `zod` do walidacji formatu e-mail i długości hasła.
- **Komunikaty błędów**: Mapowanie błędów Supabase na polskie komunikaty (np. "Błędne dane logowania").

---

## 2. Logika Backendowa

### 2.1. Endpointy API (`src/pages/api/auth/`)

- `POST /api/auth/login`: Weryfikacja danych, ustawienie sesji (HttpOnly).
- `POST /api/auth/register`: Tworzenie konta (bez weryfikacji mailowej - US-001).
- `POST /api/auth/logout`: Wyczyszczenie sesji.
- `DELETE /api/auth/account`: Trwałe usunięcie konta i danych (US-011).

### 2.2. Middleware i Ochrona Danych

- **`src/middleware/index.ts`**: Chroni `/dashboard` oraz `/account`.
- **Tryb TV (`/tv/[stopId]`)**: Pozostaje publiczny i nie wymaga logowania (zgodnie z US-007).

---

## 3. System Autentykacji (Supabase Auth)

### 3.1. Konfiguracja

- **Metody**: Wyłącznie Email + Password (pominięcie Social Login z Tech Stack na rzecz PRD).
- **Auto-confirm**: Włączone (brak konieczności potwierdzania e-mail w MVP).
- **RLS**: Row Level Security na tabelach `sets` i `set_items` w oparciu o `auth.uid()`.

### 3.2. Usuwanie danych (US-011)

- Usunięcie użytkownika w Supabase Auth wywołuje kaskadowe usuwanie w PostgreSQL:
  `ALTER TABLE sets ADD CONSTRAINT sets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;`
