## Plan testów (QA) — Tabliczki ZTM (MVP)

## 1. Wprowadzenie i cele testowania

Aplikacja **Tabliczki ZTM (MVP)** to web app (Astro + Svelte + TypeScript) do monitorowania odjazdów ZTM Gdańsk dla wielu przystanków jednocześnie (dashboard zestawów) oraz w trybie **TV** (publiczny widok pojedynczego przystanku). Backend opiera się o **Supabase (PostgreSQL + Auth + RLS)** oraz serwerowe endpointy Astro (`/api/...`) proxy’ujące dane z upstreamu ZTM i egzekwujące reguły biznesowe.

**Cele testowania:**

- Zapewnienie poprawności kluczowych funkcji MVP: logowanie/rejestracja, zarządzanie zestawami i przystankami, odświeżanie i odporność na błędy, tryb TV.
- Weryfikacja bezpieczeństwa: ochrona tras i API (middleware), izolacja danych użytkowników (RLS), brak wycieków w odpowiedziach.
- Weryfikacja jakości UX: komunikaty błędów, stany ładowania, retry, brak blokowania UI, przewidywalne zachowanie odświeżania (w tym Page Visibility i pauzowanie podczas dialogów).
- Weryfikacja integracji z upstreamem ZTM: walidacja schematów, time-outy, cache-control.

## 2. Zakres testów

### 2.1. W zakresie (In-scope)

- **Auth (Supabase Auth + cookies)**:
  - `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/logout`, `DELETE /api/auth/account`
  - strony/ochrona: `/dashboard/*`, `/account` (SSR guard + middleware)
- **Zestawy i elementy zestawów (Supabase Postgres + RLS + triggery limitów)**:
  - `GET/POST /api/sets`, `PATCH/DELETE /api/sets/{setId}`
  - `GET/POST /api/sets/{setId}/items`, `DELETE /api/sets/{setId}/items/{itemId}`
- **ZTM proxy (public API)**:
  - `GET /api/ztm/stops` (opcjonalnie filtrowanie `stopIds`)
  - `GET /api/ztm/departures` (opcjonalnie `stopId`, inaczej „all stops”)
  - `GET /api/ztm/sets/{setId}/stops` (z autoryzacją)
  - `GET /api/ztm/sets/{setId}/departures` (agregacja, per-stop błędy)
- **UI/UX**:
  - Dashboard listy zestawów + dashboard pojedynczego zestawu (grid, dodawanie/usuwanie, odświeżanie 60s, stop po 3 błędach, pauza na dialogach i przy ukryciu zakładki)
  - TV view `/tv/{stopId}` (public, odświeżanie 60s, retry 5s max 3, ekran błędu + manual reload)
  - Autocomplete dodawania przystanku (lazy-load stopów, retry)
  - Toasty, globalny preloader, komunikaty błędów
  - Motyw (light/dark) – zachowanie i persystencja wg implementacji

### 2.2. Poza zakresem (Out-of-scope)

- Funkcje poza MVP (np. mapy, push, udostępnianie zestawów).
- Testy e-mail deliverability (zależne od konfiguracji Supabase) – ograniczone do weryfikacji flagi `requires_email_confirmation`.
- Dostępność offline (explicit out-of-scope w PRD).

## 3. Typy testów do przeprowadzenia

- **Testy jednostkowe (Unit)**:
  - walidacje `zod` (auth, sets, ztm query),
  - mapowanie błędów DB (`mapDatabaseError`),
  - logika pomocnicza (np. parsowanie query, walidacja UUID w endpointach).
- **Testy integracyjne (Integration)**:
  - endpointy `/api/*` z prawdziwą bazą w środowisku testowym Supabase (lub lokalnie, jeśli skonfigurowane),
  - weryfikacja polityk RLS i triggerów (limity, unikalność nazw, unikalność stop_id w set).
- **Testy end-to-end (E2E)**:
  - przepływy użytkownika w przeglądarce (logowanie → dashboard → tworzenie zestawu → dodawanie/usuwanie przystanków → TV view),
  - scenariusze błędów (np. odcięcie upstreamu/timeout, brak autoryzacji).
- **Testy regresji**:
  - powtarzalny zestaw scenariuszy krytycznych po zmianach w API/UI.
- **Testy niefunkcjonalne**:
  - **wydajnościowe** (smoke load) dla `/api/ztm/stops` i `/api/ztm/departures`,
  - **bezpieczeństwa** (autoryzacja, RLS, brak podatności na open redirect w `returnUrl`, brak ujawniania informacji w błędach),
  - **UX / dostępność** (podstawowe a11y: focus, aria dla alertów, zachowanie dialogów).

## 4. Scenariusze testowe dla kluczowych funkcjonalności

### 4.1. Autoryzacja i sesja

- **Rejestracja (UI + API)**:
  - Poprawna rejestracja (email poprawny, hasło >= 6) → `200`, redirect do `returnUrl`.
  - Email już istnieje → `409` `USER_ALREADY_EXISTS` i czytelny komunikat PL w UI.
  - `requires_email_confirmation = true` (konfiguracja Supabase) → UI pokazuje komunikat i przenosi do logowania.
  - Niepoprawny JSON → `400` `INVALID_INPUT`.
  - Walidacje: pusty email, zły format email, hasło < 6 → `400` z details (API) i walidacja klienta (UI).

- **Logowanie (UI + API)**:
  - Poprawne logowanie → `200`, toast success, redirect do `returnUrl` (domyślnie `/dashboard`).
  - Błędne dane → `401` `UNAUTHORIZED` z komunikatem „Błędne dane logowania”.
  - Email niepotwierdzony (jeśli Supabase tego wymaga) → `401` z komunikatem „Adres e-mail nie został potwierdzony”.
  - Walidacje jak wyżej + niepoprawny JSON.

- **Ochrona tras i API**:
  - Niezalogowany dostęp do `/dashboard` i `/account` → redirect do `/auth/login?returnUrl=...`.
  - Niezalogowany dostęp do „protected API” (np. `/api/sets`) → `401` JSON `{ code: "UNAUTHORIZED" }`.
  - Publiczne endpointy `/api/ztm/*` i `/api/auth/*` dostępne bez sesji.

- **Wylogowanie i usuwanie konta**:
  - `POST /api/auth/logout` (UI) → po sukcesie redirect do `/`.
  - `DELETE /api/auth/account` (UI) → `204` i redirect do `/`; po usunięciu brak dostępu do zasobów użytkownika.
  - Brak `SUPABASE_SERVICE_ROLE_KEY` na serwerze → `500` `CONFIG_ERROR`.

### 4.2. Zestawy (Sets) – API i UI

- **GET /api/sets**:
  - Zalogowany: zwraca listę tylko własnych zestawów + `total_count`.
  - Niezalogowany: `401`.
  - Sprawdzenie nagłówków: `Cache-Control: no-store` (brak cache po stronie klienta).

- **POST /api/sets**:
  - Poprawne utworzenie zestawu (1–10 znaków po trim) → `201`, zwraca `created_set` + odświeżoną listę.
  - Limit 6 zestawów → `400` `MAX_SETS_PER_USER_EXCEEDED`.
  - Duplikat nazwy w obrębie usera (case-sensitive, ignorując spacje brzegowe) → `409` `DUPLICATE_SET_NAME`.
  - Walidacje nazwy: pusta, >10, tylko spacje, niepoprawny JSON → `400` `INVALID_SET_NAME`.

- **PATCH /api/sets/{setId}**:
  - Poprawna zmiana nazwy → `200`.
  - Niepoprawny UUID → `400` `INVALID_SET_NAME` (weryfikacja formatów).
  - Set nie istnieje / nie należy do usera → `404` `SET_NOT_FOUND`.
  - Duplikat nazwy → `409`.

- **DELETE /api/sets/{setId}**:
  - Poprawne usunięcie → `200` i odświeżona lista.
  - Set nie istnieje / nie należy do usera → `404`.
  - Walidacja UUID → `400`.
  - Weryfikacja kaskady: usunięcie set usuwa `set_items`.

- **UI (SetsDashboard)**:
  - Tworzenie zestawu do limitu 6; po osiągnięciu limitu brak możliwości dodania (zgodnie z UI).
  - Inline rename: zapis po Enter / blur; błędy (duplikat/limit/invalid) → toast error i brak trwałej zmiany.
  - Usuwanie zestawu z potwierdzeniem; po usunięciu aktualizacja listy.

### 4.3. Elementy zestawu (Set Items / przystanki przypięte)

- **GET /api/sets/{setId}/items**:
  - Zwraca itemy posortowane po `position` rosnąco.
  - Set nie istnieje / brak dostępu → `404` `SET_NOT_FOUND`.
  - Walidacja UUID setId → `400`.

- **POST /api/sets/{setId}/items**:
  - Dodanie stop_id (int > 0) → `201`, zwraca `created_item` i listę `items`.
  - Auto-assign `position` (trigger) – po dodaniu N-tego elementu `position` rośnie (max + 1).
  - Duplikat stop w zestawie → `409` `SET_ITEM_ALREADY_EXISTS`.
  - Limit 6 elementów w zestawie → `400` `MAX_ITEMS_PER_SET_EXCEEDED`.
  - Walidacje stop_id: brak, float, <=0, string, niepoprawny JSON → `400` `INVALID_STOP_ID` / `INVALID_INPUT`.

- **DELETE /api/sets/{setId}/items/{itemId}**:
  - Poprawne usunięcie → `200`, zwraca `deleted_item_id` i listę `items`.
  - Item nie istnieje w tym set → `404` `ITEM_NOT_FOUND`.
  - Walidacja UUID setId / itemId → `400`.

- **UI (SetDashboardView + AddStopDialog + StopCard)**:
  - Przycisk „Dodaj przystanek” widoczny tylko gdy \(items < 6\).
  - Dialog dodawania: ładowanie listy przystanków (spinner/skeleton), retry na błąd, brak możliwości „Dodaj” bez wyboru.
  - Po dodaniu pierwszego przystanku start cyklu odświeżania (departures).
  - Usuwanie przystanku: confirm, global loading w trakcie, toast success/error.

### 4.4. ZTM Proxy (public) – dane i odporność na błędy

- **GET /api/ztm/stops**:
  - Bez parametrów → zwraca całą listę; nagłówki cache `public, max-age=...`.
  - Z parametrem `stopIds=117,199` (spacje, duplikaty) → zwraca unikalne, przefiltrowane.
  - Niepoprawne `stopIds` (litery, 0, ujemne) → `400` `INVALID_INPUT` + `details`.
  - Upstream timeout → `504` `ZTM_TIMEOUT`; upstream HTTP != 200 → `502` `ZTM_UPSTREAM_ERROR`; invalid JSON/schemat → `502` `ZTM_INVALID_RESPONSE`.

- **GET /api/ztm/departures**:
  - Z `stopId` → dane dla pojedynczego przystanku.
  - Bez `stopId` → „all departures” (ciężkie) – testować ograniczenie w CI (np. tylko smoke w nightly).
  - Te same klasy błędów co wyżej + sprawdzenie cache `max-age=20`.

### 4.5. ZTM dla zestawu (autoryzowane agregacje)

- **GET /api/ztm/sets/{setId}/stops**:
  - Zalogowany i owner: zwraca `stops` (z `stop: ... | null`) + `fetched_at` + `stops_last_update`.
  - Brak auth → `401`.
  - Set nie istnieje / brak dostępu → `404`.
  - Edge-case: stop w set nie istnieje w ZTM stops dataset → `stop: null` (weryfikacja UI fallback).

- **GET /api/ztm/sets/{setId}/departures**:
  - Dla set z kilkoma przystankami: wynik `ok: true` i `data` jako mapa `stopId -> departures[]`.
  - Częściowa awaria upstreamu (dla jednego stop) → `ok: true` dalej dla pozostałych (errorMap istnieje tylko, gdy wszystkie failują).
  - Awaria dla wszystkich stopów → `ok: false`, `error` mapa stopId -> {code,message,status} i HTTP `500`.

### 4.6. Odświeżanie, retry i stany błędów (Dashboard)

- **Refresh cycle (60s)**:
  - Po załadowaniu: pobranie departures i start timera; progress bar resetuje się co cykl (animationKey).
  - Błąd odświeżenia: `errorCount` rośnie; toast warning przy 1 i 2; przy 3 – toast error i zatrzymanie cyklu + CTA „Spróbuj ponownie” (reload strony).
  - Pauza cyklu:
    - przy otwarciu dialogu (`AddStopDialog` lub `ConfirmDialog`) – brak odświeżeń w tle,
    - gdy karta przeglądarki ukryta – stop; po powrocie – natychmiastowe odświeżenie i reset `errorCount`.
  - Per-card error vs global error: per-card wyświetla warning na tej karcie; global – wszystkie karty pokazują globalny błąd.

### 4.7. TV View (public)

- Walidacja URL: `/tv/{stopId}` dla `stopId <= 0` / NaN → redirect `/404`.
- Pobranie departures:
  - Sukces → lista odjazdów (TV variant, bez paginacji), lastUpdate widoczny.
  - Brak odjazdów → ekran błędu „Brak dostępnych odjazdów...” + automatyczny retry (max 3 co 5s).
  - Błąd sieci/API → ekran błędu + retry; po 3 próbach brak kolejnych auto-retry.
  - Manual reload (CTA) → natychmiastowa próba i reset retry.
- Pobranie nazwy przystanku:
  - `GET /api/ztm/stops?stopIds={stopId}` – jeśli sukces, nagłówek używa `stop.stopName`; jeśli błąd, fallback na `Przystanek {stopId}`.

### 4.8. Motyw (Theme)

- Domyślne ustawienie: jeśli brak `localStorage.theme`, używa `prefers-color-scheme`.
- Toggle zmienia `documentElement.style.colorScheme`.
- Persist: `localStorage.theme` zapisuje `dark/light` – weryfikacja zachowania po odświeżeniu.

### 4.9. Bezpieczeństwo i prywatność

- **RLS**:
  - Użytkownik A nie widzi/nie modyfikuje setów/items użytkownika B (GET/PATCH/DELETE) → `404`/`403` wg mapowania.
- **Auth cookies**:
  - Chronione endpointy nie akceptują `user_id` z klienta (weryfikacja, że API używa sesji).
- **Open redirect**:
  - `returnUrl` w UI: akceptuje tylko ścieżki względne zaczynające się od `/` i nie od `//` (testy: `https://evil.com`, `//evil.com`, `/%2F%2Fevil.com`).
- **Konfiguracja secretów**:
  - `SUPABASE_SERVICE_ROLE_KEY` tylko po stronie serwera; brak jego ekspozycji w bundle klienta.

## 5. Środowisko testowe

- **Lokalne (dev)**:
  - Node.js `22.14.0`, `npm install`, `npm run dev`.
  - Supabase: rekomendowane osobne środowisko testowe (projekt w Supabase) z:
    - włączonym RLS,
    - zdeployowaną migracją DB,
    - kontami testowymi.
- **Staging (rekomendowane)**:
  - Deploy na Vercel/DO z oddzielnym Supabase (staging/test).
  - Monitoring błędów i logów (console/server logs).
- **Dane testowe**:
  - 2 użytkowników testowych (A i B),
  - seed zestawów/items do testów limitów,
  - stałe `stopId` do testów TV i dashboard (np. 2–3 znane przystanki).

## 6. Narzędzia do testowania

- **API**: Postman (zgodnie z README) / Insomnia, dodatkowo Newman do uruchamiania kolekcji w CI.
- **E2E**: Playwright (rekomendowane) – scenariusze UI + intercepty sieci (symulacja błędów upstreamu).
- **Unit/Integration (TS)**: Vitest (rekomendowane) + `@testing-library/svelte` dla komponentów (jeśli testy UI jednostkowe będą potrzebne).
- **Lint/format**: ESLint + Prettier (już w repo).
- **Performance**: k6 lub Artillery (smoke load dla `/api/ztm/*`).
- **A11y**: axe-core (np. `@axe-core/playwright`) – podstawowe skany kluczowych widoków.

## 7. Harmonogram testów

- **Sprint 0 / Setup (0.5–1 dnia)**:
  - konfiguracja środowiska testowego Supabase (staging/test),
  - przygotowanie użytkowników i danych testowych,
  - import kolekcji Postman i weryfikacja bazowych requestów.
- **Sprint 1 (1–2 dni)**:
  - testy API: auth, sets, items, mapowanie błędów (limity/unikaty/404/401).
- **Sprint 2 (1–2 dni)**:
  - testy integracji ZTM (stops/departures) + symulacje błędów (timeout/upstream).
- **Sprint 3 (1–2 dni)**:
  - testy E2E: pełne flow dashboard + TV view, retry/pauzowanie/stop po 3 błędach.
- **Sprint ciągły (per PR)**:
  - smoke testy regresji + lint.

## 8. Kryteria akceptacji testów

- **Krytyczne (Must-pass)**:
  - Auth działa (login/register/logout/delete account) i poprawnie chroni `/dashboard` i `/account`.
  - API zestawów i elementów działa wraz z limitami (6/6) i poprawnymi kodami błędów.
  - RLS uniemożliwia dostęp między użytkownikami.
  - Dashboard odświeża co 60s, eskaluje błędy i zatrzymuje cykl po 3 błędach.
  - TV view działa publicznie, odświeża, retry działa i ma czytelne stany błędu.
- **Niefunkcjonalne**:
  - Brak nieobsłużonych wyjątków w konsoli w typowych przepływach.
  - Brak wycieków danych innych użytkowników w odpowiedziach API.

## 9. Role i odpowiedzialności

- **QA / Inżynier jakości**:
  - przygotowanie przypadków testowych, kolekcji Postman i E2E,
  - wykonanie testów regresji i raportowanie defektów,
  - analiza ryzyk (upstream, cache, auth).
- **Frontend developer**:
  - poprawki UI/UX, obsługa stanów błędów, zgodność z PRD.
- **Backend developer**:
  - poprawki endpointów, mapowania błędów, integracje ZTM, bezpieczeństwo.
- **DevOps/Owner projektu**:
  - konfiguracja środowisk (Supabase, Vercel), secretów, CI.

## 10. Procedury raportowania błędów

- **Kanał**: GitHub Issues (rekomendowane) lub narzędzie zespołowe (Jira).
- **Szablon zgłoszenia**:
  - **Tytuł**: krótko, z modułem (np. `[API][sets] Duplicate name returns 500`)
  - **Środowisko**: local/staging, commit SHA, przeglądarka/OS
  - **Kroki odtworzenia**: numerowane
  - **Oczekiwany rezultat** vs **rzeczywisty rezultat**
  - **Dowody**: screenshot, HAR, logi serwera, response body, request
  - **Severity/Priority**: Blocker/Critical/Major/Minor
- **Triaging**:
  - codziennie/przy każdym PR: przegląd nowych bugów, przypisanie właścicieli, decyzja o hotfix vs backlog.
