# Stos Technologiczny (Tech Stack) - Tabliczki ZTM

## 1. Frontend

- **Framework:** [Astro](https://astro.build/) - główny szkielet aplikacji, routing i renderowanie po stronie serwera (SSR).
- **Komponenty Dynamiczne:** [Svelte](https://svelte.dev/) - obsługa interaktywnych elementów takich jak dashboard, widgety z odliczaniem czasu, wyszukiwarka i zarządzanie zestawami.
- **Style:** Nowoczesny, natywny CSS (Custom Properties, Grid, Flexbox) bez użycia ciężkich bibliotek UI.
- **UI:** Minimalnie ostylowane natywne elementy HTML5 (`<dialog>`, `<form>`, `<button>`, `<input>`).

## 2. Backend & Baza Danych

- **Platforma:** [Supabase](https://supabase.com/) (Backend-as-a-Service)
  - **Baza danych:** PostgreSQL (przechowywanie zestawów i przypisanych przystanków).
  - **Autoryzacja:** Supabase Auth (Social Login: Google, Facebook oraz Email/Password).
  - **Bezpieczeństwo:** Row Level Security (RLS) zapewniający izolację danych użytkowników.
  - **Logic:** Supabase Edge Functions (Deno) jako proxy do API ZTM Gdańsk (agregacja i cachowanie danych).

## 3. Infrastruktura i Dev-Ops

- **Hosting:** [Vercel](https://vercel.com/) (rekomendowany ze względu na wsparcie dla Astro i Edge Functions) lub DigitalOcean.
- **CI/CD:** GitHub Actions - automatyzacja testów i wdrożeń.

## 4. Główne Integracje

- **Źródło Danych:** API Otwarty Gdańsk (ZTM Gdańsk)[https://ckan.multimediagdansk.pl/dataset/tristar]
- **PWA:** Wsparcie dla Progressive Web App (Service Workers) w celu instalacji aplikacji na urządzeniach mobilnych i cachowania statycznych zasobów.
