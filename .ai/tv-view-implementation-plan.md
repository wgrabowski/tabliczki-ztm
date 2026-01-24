# Plan implementacji widoku TV — tablica przystankowa

## 1. Przegląd

Widok `TV` prezentuje publiczną, pełnoekranową tablicę dla jednego przystanku (ścieżka `/tv/{stopId}`). Celem jest maksymalna czytelność: duża nazwa przystanku, zegar HH:mm i wyraźna lista odjazdów z minimalnymi interakcjami (tylko przełącznik motywu i przycisk „Reload” przy błędzie). Widok korzysta z istniejących komponentów `Clock`, `ThemeToggle`, `DeparturesList` i `DepartureItem`, a dane pobiera z `/api/ztm/departures` oraz opcjonalnie `/api/ztm/stops`.

## 2. Routing widoku

- Dynamiczny plik Astro `src/pages/tv/[stopId].astro`.
- Parametr `stopId` obowiązkowy i liczbowy; Astro waliduje go przy renderowaniu SSR.
- Widok musi być dostępny publicznie (bez logowania) i ustawiać metadane strony po rozpoznaniu nazwy przystanku (np. „Tablica X” w title/description).

## 3. Struktura komponentów

- `TvPage` (Astro) – przekazuje `stopId` do klienta i ustawia meta.
- `TvView` (Svelte) – zarządza fetchowaniem danych, stanem, error overlay i układem.
- `TvHeader` (Svelte) – pokazuje nazwę przystanku, `Clock` i `ThemeToggle`.
- `TvDeparturesListWrapper` (Svelte) – mapuje dane do formatu `DeparturesList` i dostosowuje go dla widoku TV (typu „tv”).
- `DeparturesList` + `DepartureItem` – istniejące komponenty z nowym propem `variant="tv"`/`paginationDisabled` do większej typografii i ukrycia paginacji.
- `TvErrorScreen` (Svelte) – pełnoekranowy ekran błędu z CTA „Reload” bez zmiany routingu.

Diagram drzewa:

```
TvPage
└── TvView
    ├── TvHeader (Clock, ThemeToggle)
    ├── TvDeparturesListWrapper (DeparturesList → DepartureItem)
    └── TvErrorScreen (kondycjonalnie)
```

## 4. Szczegóły komponentów

### `TvPage`

- Opis: Astro page z dynamicznym `[stopId]`. Ustala `stopId` w propsach klienta, zwraca 404, gdy wartość nie jest liczbą. Może ustawić `canonical` i meta `title` (np. „Tablica przystanku {stopId} | Tabliczki ZTM”) oraz przekazać prefetchowaną nazwę, jeśli dostępna.
- Główne elementy: `<head>` z meta, render `TvView`.
- Obsługiwane zdarzenia: brak interakcji użytkownika.
- Walidacja: `stopId` musi być liczbą; w przeciwnym razie Svelte 404/redirect.
- Typy: `{ stopId: number; initialStopName?: string }`.
- Propsy: `{ stopId, initialStopName }`.

### `TvView`

- Opis: Główny klient (Svelte). Wywołuje `useTvDepartures(stopId)`; kontroluje automatyczne odświeżanie, licznik `retry`, overlay błędu i layout w formie „header + content”.
- Główne elementy: `TvHeader`, `TvDeparturesListWrapper`, `TvErrorScreen`, `lastUpdate`/„Ostatnia aktualizacja”.
- Obsługiwane zdarzenia: `handleReload()` (przycisk z `TvErrorScreen`), `ThemeToggle` (wewnętrznie via komponent), `auto-refresh interval`.
- Walidacja: `departures` powinny mieć co najmniej 1 pozycję; brak → error screen z kodem `NO_DEPARTURES`. Nazwa przystanku w headerze nie może być pusta (fallback do `stopId` lub „Nieznany przystanek”). `ThemeToggle` działa niezależnie.
- Typy: `TvDeparturesViewModel`, `TvErrorState`.
- Propsy: `{ stopId: number; initialStopName?: string }`.

### `TvHeader`

- Opis: Pasek w górnej części ekranu z nazwą przystanku po lewej, zegarem (`Clock`) po środku/prawej i `ThemeToggle` z prawej strony. Slot lewy jest pusty – tylko nazwa.
- Główne elementy: `<h1>` z `stopName`, `<div>` z `Clock`, `<IconButton>` `ThemeToggle`.
- Obsługiwane interakcje: `ThemeToggle` (zarządza motywem lokalnie). `Clock` aktualizuje samodzielnie (bez dodatkowych hooków).
- Walidacja: `stopName` fallback „Tablica {stopId}`” przy braku danych; jest wymagany `clock` (komponent).
- Typy: `TvStopInfo`.
- Propsy: `{ stopName: string; stopId: number }`.

### `TvDeparturesListWrapper`

- Opis: Przygotowuje dane do komponentu `DeparturesList`, ustawiając `variant="tv"` i `paginationDisabled={true}` albo `itemsPerPage={departures.length}` w wersji TV (chcemy pełną listę bez przycisków). Można dodać stylizację `--tv-item-height`.
- Główne elementy: `DeparturesList` (tabela z `DepartureItem`), tekst „Ostatnia aktualizacja HH:mm”.
- Obsługiwane interakcje: brak; strzałki w `DeparturesList` ukryte przy `variant="tv"`/`paginationDisabled`.
- Walidacja: każdy wiersz musi mieć `displayTime` (HH:mm). Brak – pomijamy w filtrze lub ustawiamy `„—”`.
- Typy: `TvDepartureRowModel[]`.
- Propsy: `{ departures: TvDepartureRowModel[]; lastUpdate: string }`.

### `TvErrorScreen`

- Opis: Błędy (sieć, brak danych, invalid stop) pokazują pełny ekran z ikonką, tytułem, opisem i `button` „Odśwież”.
- Główne elementy: `<section>` centrowane, `<button on:click={onReload}>`.
- Obsługiwane zdarzenia: `onReload`.
- Walidacja: `error.message` i `error.code`; `button` wyłączony gdy `isLoading` (`fetchState.status === "loading"`).
- Typy: `TvErrorState`.
- Propsy: `{ error: TvErrorState; onReload: () => void; isLoading: boolean }`.

## 5. Typy

- `TvDepartureRowModel`
  - `id: string` – dziedziczone z `ZtmDepartureDTO`.
  - `routeShortName: string | null` – numer linii (fallback `?`).
  - `headsign: string | null` – kierunek (fallback `—`).
  - `displayTime: string` – format `HH:mm`, wyliczany z `estimatedTime`/`theoreticalTime`.
  - `status: ZtmDepartureStatus`.
  - `delayInSeconds: number | null`.
  - `isRealtime: boolean`.
  - `rawTimestamp: string`.
- `TvDeparturesViewModel`
  - `stopId: number`.
  - `stopName: string`.
  - `departures: TvDepartureRowModel[]`.
  - `lastUpdate: string`.
  - `cacheAgeSeconds: number`.
  - `fetchedAt: string`.
- `TvStopInfo`
  - `stopId: number`.
  - `stopName: string`.
  - `stopCode?: string`.
- `TvErrorState`
  - `code: ZtmErrorCode | "NO_DEPARTURES" | "INVALID_STOP" | "NETWORK"`.
  - `message: string`.
  - `retryCount: number`.
  - `lastAttempt: string`.
  - `timestamp: string`.
- `TvFetchState`
  - `status: "idle" | "loading" | "success" | "error"`.
  - `data?: TvDeparturesViewModel`.
  - `error?: TvErrorState`.
  - `isRefreshing: boolean`.

## 6. Zarządzanie stanem

- `useTvDepartures(stopId: number)` – customowy hook (np. w `src/lib/hooks/tv-departures.ts` lub lokalny `TvView`) zarządza fetchami, cache, retry i transformacją:
  - `fetchStopDepartures()` wywołuje `/api/ztm/departures`.
  - Przy braku nazwy używa `/api/ztm/stops?stopIds={stopId}`.
  - Ustawia auto-refresh co 60 sekund (`setInterval`) i usuwa go w `onDestroy`.
  - W przypadku błędu ustawia `TvErrorState` i break; retry co 5 sekund (maks 3 próby) lub przy kliknięciu `Reload`.
- `Clock` i `ThemeToggle` pozostają samodzielne (nie potrzebujemy dodatkowego state-store), więc nie wprowadzamy `clockStore`/`themeStore`.
- Dodatkowy `derived` boolean `showError = fetchState.status === "error" || !fetchState.data?.departures.length`.
- `isLoading` = `fetchState.status === "loading"` (używane do blokowania buttonu reload).

## 7. Integracja API

- `GET /api/ztm/departures?stopId={stopId}`: query param liczbowy. Response `GetZtmDeparturesResponse` (najczęściej `ZtmDeparturesUpstreamResponseDTO`). Mapowanie danych:
  - `departures` → `TvDepartureRowModel` (formatowanie czasu HH:mm, `isRealtime` = `status === "REALTIME"`).
  - `lastUpdate` → `TvDeparturesViewModel.lastUpdate`.
  - Wyświetlanie `cacheAge` (czas od `fetchedAt`).
- `GET /api/ztm/stops?stopIds={stopId}`: w razie braku nazwy w depart, pobiera `stopName` (cache 6h). Response `GetZtmStopsResponse`.
- Obsługa `ErrorResponse`: jeśli API zwraca `code` (np. `INVALID_INPUT`, `ZTM_TIMEOUT`), przekazujemy go do `TvErrorState` i pokazujemy `TvErrorScreen`.

## 8. Interakcje użytkownika

- `ThemeToggle` – zmiana motywu (jasny/ciemny) w `TvHeader`, lokalnie zapisuje stan w `localStorage`. Natychmiast działa na `document.documentElement`.
- `Reload` (w `TvErrorScreen`) – wymusza ponowny fetch, resetuje licznik retry i `isRefreshing`.
- Zegar (`Clock`) – pasywnie wyświetla aktualny czas HH:mm (component dopasowany do TV).
- Brak innych przycisków/paginacji (lista pasywna).

## 9. Warunki i walidacja

- `stopId`: sprawdzamy w Astro i w hooku przed fetchowaniem (liczba > 0). W razie błędu 400/404 w API pokazujemy `TvErrorScreen` z `INVALID_STOP`.
- `departures`: wymagane `id`, `estimatedTime`/`theoreticalTime`. Jeśli brak, usuwamy pozycję; jeśli lista pusta – kod `NO_DEPARTURES`.
- `displayTime`: validacja (format HH:mm) odbywa się podczas mapowania; parsowanie `new Date()` z fallbackem.
- `ThemeToggle`: akceptuje tylko `light|dark`.
- `Reload`: button aktywny tylko wtedy, gdy `!isLoading`.

## 10. Obsługa błędów

- `NETWORK`: timeout/zła sieć – `TvErrorState.code = "NETWORK"` z CTA. Trigger: `ZtmServiceError` z `ZTM_TIMEOUT`, `fetch` rejects.
- `INVALID_STOP`: API zwraca błąd lub 404 – w headerze i `TvErrorScreen`.
- `NO_DEPARTURES`: brak odjazdów (lista pusta lub parsowanie).
- `ZtmServiceError` inne (np. `ZTM_UPSTREAM_ERROR`): przekazywane dalej, `TvErrorScreen` pokazuje `message`.
- Retry: automatyczny co 5s (maks 3) oraz manualny reload; `retryCount` rośnie i wyświetla informację „Ponowna próba: n”; po 3 błędach zatrzymujemy auto-retry i czekamy na user reload.
- `TvErrorScreen` informuje o statusie i umożliwia reload; `DeparturesList` nie renderuje przy `error`.

## 11. Kroki implementacji

1. Utworzyć `src/pages/tv/[stopId].astro` – walidacja parametru, przekazanie `stopId` do `TvView`, ustawienie meta (title/description) w oparciu o nazwę przystanku lub fallback.
2. W `src/components` dodać `TvView.svelte`, który wywołuje `useTvDepartures(stopId)`, renderuje `TvHeader`, `TvDeparturesListWrapper` oraz `TvErrorScreen`, przy okazji pokazując „Ostatnia aktualizacja” i overlay przy błędzie. Usuwa pomysł `clockStore`/`themeStore` – `Clock` i `ThemeToggle` działają autonomicznie.
3. Rozszerzyć `DeparturesList.svelte` o propsy `variant?: "default" | "tv"` i `paginationDisabled?: boolean`, by w trybie `tv` ustawić większą typografię i ukryć paginację; `DepartureItem` pozostaje but stylowany dla TV (większe czcionki, padding).
4. Stworzyć nowy komponent `TvErrorScreen.svelte` (pełny ekran) oraz ewentualny wrapper `TvDeparturesListWrapper` (dostosowujący dane i przekazujący `lastUpdate`).
5. W `src/lib` dodać helper/hook `useTvDepartures(stopId)` zarządzający fetch, auto-refresh co 60 s, retry co ~5 s przy błędzie, transformacją do `TvDepartureRowModel` oraz `TvErrorState`.
6. Napisać typy (w `src/ztm-types.ts` lub nowym pliku) dla `TvDepartureRowModel`, `TvDeparturesViewModel`, `TvErrorState`, `TvFetchState`.
7. Stylować layout w `src/styles/global.css` (np. klasy `.tv-view`, `.tv-view__header`, `.tv-error-screen`) by zapewnić duże fonty/spacing i dostępność z 3 metrów.
8. Przetestować przypadki: dane poprawne, brak odjazdów, timeout/API error, invalid stopId, reload, zmiana motywu (jasny/ciemny), auto-refresh.
