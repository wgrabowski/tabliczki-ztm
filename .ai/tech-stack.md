# Stos Technologiczny (Tech Stack) - Tabliczki ZTM

## 1. Frontend

- **Framework:** [Astro](https://astro.build/) - główny szkielet aplikacji, routing i renderowanie po stronie serwera (SSR).
- **Komponenty Dynamiczne:** [Svelte](https://svelte.dev/) - obsługa interaktywnych elementów takich jak dashboard, widgety z odliczaniem czasu, wyszukiwarka i zarządzanie zestawami.
- **Style:** Nowoczesny, natywny CSS (Custom Properties, Grid, Flexbox) bez użycia ciężkich bibliotek UI.
- **UI:** Minimalnie ostylowane natywne elementy HTML5 (`<dialog>`, `<form>`, `<button>`, `<input>`).

## 2. Backend & Baza Danych

- **Platforma:** [Supabase](https://supabase.com/) (Backend-as-a-Service)
  - **Baza danych:** PostgreSQL (przechowywanie zestawów i przypisanych przystanków).
  - **Autoryzacja:** Supabase Auth (Email/Password) + sesja oparta o cookies (SSR).
  - **Bezpieczeństwo:** Row Level Security (RLS) zapewniający izolację danych użytkowników.
  - **Logika i API:** serverowe endpointy Astro (`/api/...`) dla:
    - auth (login/register/logout/usuwanie konta),
    - CRUD zestawów i elementów zestawów,
    - proxy do API ZTM (stops/departures) z walidacją, time-outami i krótkim cache dla publicznych danych.
  - **Reguły biznesowe w DB:** ograniczenia/limity i integralność (np. limity 6/6, unikalności, pozycjonowanie) realizowane przez constraints/triggery w Postgres.
  - **Walidacja:** TypeScript + `zod` po stronie serwera do walidacji payloadów i query.
  - **Klient DB:** `@supabase/supabase-js` + `@supabase/ssr` (obsługa sesji w SSR).

## 3. Infrastruktura i Dev-Ops

- **Hosting:** [Vercel](https://vercel.com/) (rekomendowany ze względu na wsparcie dla Astro/SSR) lub DigitalOcean.
- **CI/CD:** GitHub Actions - automatyzacja testów i wdrożeń.

## 4. Główne Integracje

- **Źródło Danych:** API Otwarty Gdańsk (ZTM Gdańsk): `https://ckan.multimediagdansk.pl/dataset/tristar`

## 5. Testy i jakość (QA)

- **Unit/Integration (TS):** Vitest (planowane) + ewentualnie `@testing-library/svelte` dla komponentów.
- **E2E:** Playwright (planowane) — testy przepływów użytkownika i scenariuszy błędów.
- **Testy API:** Postman / Insomnia; opcjonalnie Newman do uruchamiania kolekcji w CI.
- **A11y:** axe-core (np. `@axe-core/playwright`) — podstawowe skany kluczowych widoków.
- **Wydajność (smoke):** k6 lub Artillery dla wybranych endpointów `/api/ztm/*`.
