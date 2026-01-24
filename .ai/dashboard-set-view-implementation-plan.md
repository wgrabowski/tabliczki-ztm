# Plan implementacji widoku Dashboard — Zestaw

## 1. Przegląd

Widok Dashboard — Zestaw (`/dashboard/{setId}`) jest głównym widokiem monitorowania odjazdów w aplikacji. Umożliwia użytkownikowi oglądanie na żywo odjazdów z maksymalnie 6 przystanków w ramach wybranego zestawu. Widok oferuje cykliczne odświeżanie danych co 60 sekund, możliwość dodawania i usuwania przystanków, przełączania między zestawami oraz obsługę błędów z inteligentną eskalacją.

Kluczowe funkcje:

- **Monitorowanie odjazdów** dla wszystkich przystanków w zestawie (6 widocznych na raz, nawigacja przyciskami góra/dół)
- **Automatyczne odświeżanie** co 60 sekund z globalnym paskiem postępu
- **Dodawanie przystanków** przez dialog wyszukiwania z autouzupełnianiem (max 6)
- **Usuwanie przystanków** z potwierdzeniem w dialogu
- **Przełączanie zestawów** przez Select zsynchronizowany z URL
- **Wyświetlanie szczegółów odjazdów**: numer linii, kierunek, czas (względny/bezwzględny), ikony udogodnień
- **Komunikaty specjalne** w formie ticker/marquee
- **Tryb TV** - możliwość otwarcia pojedynczego przystanku w trybie pełnoekranowym
- **Obsługa błędów** z eskalacją (1-2 błędy: warning, 3 błędy: zatrzymanie cyklu + CTA reload)

## 2. Routing widoku

**Ścieżka:** `/dashboard/{setId}`

- **Parametr URL:** `setId` (UUID) - identyfikator zestawu użytkownika
- **Guard SSR:** Widok chroniony przez middleware Astro - wymaga uwierzytelnienia
- **Walidacja:**
  - Sprawdzenie istnienia zestawu
  - Weryfikacja, że zestaw należy do zalogowanego użytkownika
  - W przypadku braku dostępu → przekierowanie na wspólną stronę błędu
  - W przypadku `401 Unauthorized` → przekierowanie na `/login`

## 3. Struktura komponentów

Widok składa się z następujących warstw:

```
dashboard-set.astro (strona Astro - SSR guard, initial data fetch)
└── SetDashboardView.svelte (główny komponent widoku)
    └── AppLayout (wrapper całego widoku z nagłówkiem)
        ├── Slot "header-left":
        │   ├── BackToDashboardButton
        │   ├── SetSelect
        │   └── AccountButton
        ├── Slot "header-right" (stałe):
        │   ├── Clock
        │   └── ThemeToggle
        ├── Slot główny (default - zawartość strony):
        │   ├── RefreshProgressBar
        │   ├── DashboardGrid
        │   │   ├── StopCard (x1-6)
        │   │   │   ├── Nagłówek (nazwa przystanku + akcje)
        │   │   │   ├── DeparturesList (paginacja: 6 widocznych, przyciski góra/dół)
        │   │   │   │   └── DepartureItem (x6 visible)
        │   │   │   └── Ticker (komunikaty specjalne, marquee)
        │   │   └── AddStopButton (widoczny gdy items.length < 6)
        │   ├── AddStopDialog (modal)
        │   │   └── StopSearchAutocomplete (input + datalist)
        │   └── ConfirmDialog (modal usuwania)
        ├── GlobalPreloader (globalny, część AppLayout, poza main)
        └── ToastStack (globalny, część AppLayout, poza main)
```

**Uwaga:** AppLayout to wrapper całego widoku. Komponenty RefreshProgressBar, DashboardGrid i dialogi są renderowane **wewnątrz głównego slotu** AppLayout (nie obok niego). GlobalPreloader i ToastStack są częścią AppLayout i renderowane są na poziomie layout (poza głównym contentem), ale technicznie nadal wewnątrz struktury AppLayout.

## 4. Szczegóły komponentów

### 4.1 `dashboard-set.astro` (strona Astro - entry point)

**Opis:** Strona Astro obsługująca routing `/dashboard/{setId}`. Odpowiedzialna za SSR guard, pobranie początkowych danych i renderowanie głównego komponentu Svelte.

**Główne elementy:**

- Guard sprawdzający sesję użytkownika (redirect na `/login` jeśli brak)
- Walidacja parametru `setId` (UUID format)
- Weryfikacja własności zestawu przez użytkownika
- Fetch początkowych danych:
  - `GET /api/sets/{setId}/items` - lista przystanków w zestawie
  - `GET /api/ztm/stops` - cache przystanków do wyszukiwarki (opcjonalnie, można fetchować client-side)
  - `GET /api/ztm/sets/{setId}/stops` - metadane przystanków (nazwy, kody)
  - `GET /api/ztm/sets/{setId}/departures` - początkowe dane odjazdów
- Renderowanie `SetDashboardView.svelte` z danymi jako props

**Obsługiwane interakcje:** Brak (tylko SSR)

**Obsługiwana walidacja:**

- Walidacja UUID parametru `setId`
- Weryfikacja istnienia zestawu i jego przynależności do użytkownika
- Obsługa błędów auth (401) i dostępu (403/404)

**Typy:**

- `Astro.params.setId: string`
- Initial data przekazywane do Svelte: `SetDashboardInitialData`

**Propsy:** Brak (strona Astro)

---

### 4.2 `SetDashboardView.svelte` (główny widok)

**Opis:** Główny komponent widoku Dashboard dla pojedynczego zestawu. Orchestruje wszystkie podkomponenty, zarządza stanem danych odjazdów, cyklem odświeżania (60s), oraz logiką dodawania/usuwania przystanków.

**Główne elementy:**

- `AppLayout` z konfiguracją nagłówka (AccountButton, SetSelect, BackToDashboardButton)
- `RefreshProgressBar` - pasek odliczania do następnego odświeżenia
- `DashboardGrid` - siatka kart przystanków
- `StopCard` (renderowany dla każdego item w `items`)
- `AddStopButton` (widoczny gdy `items.length < 6`)
- `AddStopDialog` (dialog dodawania przystanku)
- `ConfirmDialog` (dialog potwierdzenia usunięcia)

**Obsługiwane interakcje:**

- Inicjalizacja widoku z danymi SSR
- Uruchomienie cyklu odświeżania co 60s
- Obsługa przełączenia zestawu przez SetSelect (zmiana URL)
- Obsługa dodania przystanku (POST)
- Obsługa usunięcia przystanku (DELETE)
- Obsługa kliknięcia ikony TV (otwarcie `/tv/{stopId}`)
- Zatrzymanie cyklu po 3 kolejnych błędach
- Twardy reload po kliknięciu CTA "Spróbuj ponownie"

**Obsługiwana walidacja:**

- Limit 6 przystanków w zestawie (ukrycie przycisku dodawania)
- Eskalacja błędów (1, 2, 3 błędy kolejne)
- Walidacja odpowiedzi API (struktura danych)

**Typy:**

- `SetDashboardInitialData` - dane początkowe z SSR
- `SetDashboardState` - stan lokalny widoku (items, departures, errorCount, isRefreshing, etc.)
- `SetItemDTO[]` - lista elementów zestawu
- `GetZtmSetDeparturesResponse` - odpowiedź z API z odjazdami

**Propsy:**

```typescript
interface SetDashboardViewProps {
  setId: string;
  initialItems: SetItemDTO[];
  initialStops: ZtmSetStopDTO[];
  initialDepartures: GetZtmSetDeparturesResponse;
  allStops: ZtmStopDTO[]; // do wyszukiwarki
}
```

---

### 4.3 `RefreshProgressBar.svelte`

**Opis:** Pasek postępu odliczający czas do następnego odświeżenia danych. Wykorzystuje natywny element `<progress>` z dwoma trybami: determinate (odliczanie) i indeterminate (podczas fetch).

**Główne elementy:**

- `<progress>` z wartością reaktywną
- Tekst pomocniczy (np. "Odświeżanie za 45s" lub "Pobieranie danych...")
- Animacja CSS dla trybu indeterminate

**Obsługiwane interakcje:**

- Automatyczne odliczanie od 60 do 0 sekund
- Przełączenie na tryb indeterminate podczas fetch
- Reset do 60s po zakończeniu odświeżenia

**Obsługiwana walidacja:** Brak

**Typy:**

- `RefreshProgressState: { secondsLeft: number; isRefreshing: boolean }`

**Propsy:**

```typescript
interface RefreshProgressBarProps {
  secondsLeft: number; // 0-60
  isRefreshing: boolean; // true podczas fetch
  errorCount: number; // 0-3, dla wyświetlenia stanu błędu
}
```

---

### 4.4 `StopCard.svelte`

**Opis:** Karta pojedynczego przystanku wyświetlająca nazwę, kod, listę odjazdów (paginacja po 6), ticker z komunikatami specjalnymi oraz akcje (TV, usuń). Obsługuje wyświetlanie stanu błędu per karta po eskalacji błędów globalnych.

**Główne elementy:**

- `Card` (komponent bazowy) z nagłówkiem
- Nagłówek karty:
  - Tytuł: nazwa przystanku + kod (np. "Dworzec Główny (1001)")
  - Slot actions: `IconButton` TV
  - Slot deleteAction: `IconButton` usuń
- `DeparturesList` - kontener z paginacją (6 odjazdów widocznych, przyciski góra/dół w stopce)
- `DepartureItem` (6 visible) - pojedynczy odjazd
- `Ticker` - marquee dla komunikatów specjalnych (jeśli istnieją)
- Stan błędu (overlay lub komunikat) - wyświetlany gdy globalny errorCount >= 3

**Obsługiwane interakcje:**

- Nawigacja między stronami odjazdów (przyciski góra/dół w stopce DeparturesList)
- Kliknięcie ikony TV → otwarcie nowego okna/karty z `/tv/{stopId}`
- Kliknięcie ikony usuń → otwarcie ConfirmDialog

**Obsługiwana walidacja:** Brak (dane od rodzica)

**Typy:**

- `StopCardData` - dane pojedynczej karty (stop + departures + error state)
- `ZtmDepartureDTO[]` - lista odjazdów
- `ZtmStopDTO | null` - metadane przystanku

**Propsy:**

```typescript
interface StopCardProps {
  stopId: number;
  itemId: string; // UUID set_item
  stop: ZtmStopDTO | null;
  position: number;
  departures: ZtmDepartureDTO[] | null;
  error: ZtmSetStopDeparturesErrorDTO | null;
  hasGlobalError: boolean; // true jeśli errorCount >= 3
  onDelete: (itemId: string) => void;
  onOpenTv: (stopId: number) => void;
}
```

---

### 4.5 `DeparturesList.svelte`

**Opis:** Kontener wyświetlający listę odjazdów dla danego przystanku z paginacją. Pokazuje 6 odjazdów na raz z możliwością przełączania między "stronami" za pomocą przycisków góra/dół w stopce.

**Główne elementy:**

- Kontener `<div>` bez scroll (wysokość stała dla 6 elementów)
- Lista `DepartureItem` (renderowane tylko widoczne 6 elementów: `departures.slice(currentPage * 6, (currentPage + 1) * 6)`)
- Stopka z nawigacją:
  - Przycisk "Góra" / "Poprzednie" (ikona: `arrow_upward`, disabled gdy `currentPage === 0`)
  - Wskaźnik strony (np. "1-6 z 18" lub "Strona 1 z 3")
  - Przycisk "Dół" / "Następne" (ikona: `arrow_downward`, disabled gdy `currentPage === maxPage`)
- Stan pusty (jeśli brak odjazdów): komunikat "Brak odjazdów"

**Obsługiwane interakcje:**

- Kliknięcie "Góra" → `currentPage--` (pokazanie poprzednich 6 odjazdów)
- Kliknięcie "Dół" → `currentPage++` (pokazanie następnych 6 odjazdów)
- Przyciski są wyłączone (disabled) na końcach listy

**Obsługiwana walidacja:**

- `currentPage >= 0`
- `currentPage <= Math.floor(departures.length / 6)`
- Przyciski disabled na krańcach

**Typy:**

- `ZtmDepartureDTO[]` - lista odjazdów
- Stan lokalny: `currentPage: number` (0-based, która "strona" 6 elementów jest widoczna)

**Propsy:**

```typescript
interface DeparturesListProps {
  departures: ZtmDepartureDTO[];
}
```

---

### 4.6 `DepartureItem.svelte`

**Opis:** Pojedynczy wiersz odjazdu wyświetlający numer linii, kierunek, czas (względny/bezwzględny) oraz ikony udogodnień (rower, wózek dla osób niepełnosprawnych).

**Główne elementy:**

- Numer linii (wyróżniony, większa czcionka)
- Kierunek (headsign)
- Czas:
  - czas pobierany z pola estimatedTime
  - Względny (np. "za 3 min") jeśli status: REALTIME
  - Bezwzględny (np. "14:35") jeśli status: SCHEDULED
- Ikony udogodnień (jeśli dostępne w danych):
  - Ikona roweru (jeśli linia obsługuje rowery)
  - Ikona wózka (jeśli linia obsługuje wózki inwalidzkie) - wheelchairBoarding
- Status opóźnienia (opcjonalnie, jeśli delayInSeconds > 0)

**Obsługiwane interakcje:** Brak (tylko wyświetlanie)

**Obsługiwana walidacja:** Brak

**Typy:**

- `ZtmDepartureDTO` - dane odjazdu

**Propsy:**

```typescript
interface DepartureItemProps {
  departure: ZtmDepartureDTO;
}
```

---

### 4.7 `Ticker.svelte`

**Opis:** Komponent wyświetlający komunikaty specjalne w formie poziomego paska przewijanego (marquee). Wyświetlany na górze karty przystanku, jeśli istnieją komunikaty. W MVP komunikaty pochodzą z API ZTM (jeśli są zwracane w danych departures).

**Główne elementy:**

- Kontener `<div>` z overflow: hidden
- Tekst w animacji marquee (CSS animation)
- Automatyczne ukrycie, gdy brak komunikatów

**Obsługiwane interakcje:** Brak (automatyczna animacja)

**Obsługiwana walidacja:** Brak

**Typy:**

- `string | null` - treść komunikatu

**Propsy:**

```typescript
interface TickerProps {
  message: string | null;
}
```

**Uwaga:** W aktualnych typach ZTM nie ma pola `messages` w `ZtmDepartureDTO` ani `ZtmDeparturesUpstreamResponseDTO`. W MVP można założyć, że komunikaty specjalne będą dodane w przyszłości lub można pominąć ten komponent do czasu rozszerzenia API. Alternatywnie, można wyświetlać ticker tylko jeśli backend zwróci pole `messages` w response.

## Komponent powinien zostać zaimplementowany, ale nie użyty. Zostanie użyty po zmianach w API.

### 4.8 `AddStopButton.svelte`

**Opis:** Przycisk dodawania nowego przystanku do zestawu. Widoczny tylko gdy liczba elementów w zestawie < 6. Po kliknięciu otwiera dialog `AddStopDialog`.

**Główne elementy:**

- `Button` (komponent bazowy) z ikoną + tekst
- Warunkowe renderowanie (v-if: `items.length < 6`)

**Obsługiwane interakcje:**

- Kliknięcie → otwarcie `AddStopDialog`

**Obsługiwana walidacja:**

- Wyświetlanie tylko gdy `items.length < 6`

**Typy:** Brak

**Propsy:**

```typescript
interface AddStopButtonProps {
  onClick: () => void;
  disabled?: boolean;
}
```

---

### 4.9 `AddStopDialog.svelte`

**Opis:** Dialog (modal) do wyszukiwania i dodawania nowego przystanku do zestawu. Wykorzystuje `Dialog` (komponent bazowy) i zawiera wyszukiwarkę z autouzupełnianiem opartą o `<datalist>`.

**Główne elementy:**

- `Dialog` (komponent bazowy) z tytułem "Dodaj przystanek"
- `StopSearchAutocomplete` - input search + datalist
- Lista wyników wyszukiwania (opcjonalnie rozwinięta lista poniżej inputu)
- `Button` Dodaj (submit) + Anuluj (close)
- Komunikat błędu (jeśli POST fail)

**Obsługiwane interakcje:**

- Wpisywanie w input → filtrowanie wyników (autocomplete)
- Wybór wyniku z datalist → ustawienie wybranego stop_id
- Kliknięcie "Dodaj" → POST `/api/sets/{setId}/items` z { stop_id }
- Kliknięcie "Anuluj" lub Escape → zamknięcie dialogu
- Po sukcesie POST → zamknięcie dialogu, toast sukcesu, odświeżenie widoku

**Obsługiwana walidacja:**

- Pole wymagane (nie można dodać pustego)
- Walidacja wyboru (stop_id musi być wybrany z listy)
- Obsługa błędów API:
  - `409 Conflict` - przystanek już istnieje w zestawie
  - `400 Bad Request` z `MAX_ITEMS_PER_SET_EXCEEDED` - przekroczony limit 6

**Typy:**

- `ZtmStopDTO[]` - lista wszystkich przystanków (do wyszukiwania)
- `CreateSetItemCommand` - request body { stop_id: number }
- `CreateSetItemResponse` - response z API

**Propsy:**

```typescript
interface AddStopDialogProps {
  isOpen: boolean;
  setId: string;
  allStops: ZtmStopDTO[];
  onClose: () => void;
  onSuccess: (response: CreateSetItemResponse) => void;
}
```

---

### 4.10 `StopSearchAutocomplete.svelte`

**Opis:** Komponent wyszukiwarki przystanków z autouzupełnianiem. W wersji minimalnej wykorzystuje `<input type="search">` połączone z `<datalist>`. Wynik minimalnie: `stopShortName + stopCode`.

**Główne elementy:**

- `<input type="search">` z attributem `list`
- `<datalist>` z opcjami (filtrowanymi natywnie)
- `<datalist>` zawiera wszystkie opcje, filtrowanie jest natywnie po stronie przeglądarki
- Każda opcja: `{stopShortName} ({stopCode})` lub `{stopName} ({stopCode})`
- Wartością opcji jest `stopId`

**Obsługiwane interakcje:**

- Wpisywanie w input → natywne filtrowanie opcji
- Wybór opcji z datalist → ustawienie wartości i `selectedStopId`
- Binding dwukierunkowy z rodzicem

**Obsługiwana walidacja:**

- Walidacja wyboru (czy wybrano opcję z listy, nie wpisano ręcznie)

**Typy:**

- `ZtmStopDTO[]` - lista przystanków do wyszukiwania
- `number | null` - wybrany stop_id

**Propsy:**

```typescript
interface StopSearchAutocompleteProps {
  allStops: ZtmStopDTO[];
  selectedStopId: number | null;
  onSelect: (stopId: number) => void;
}
```

---

### 4.11 `ConfirmDialog.svelte` (istniejący komponent, do reużycia)

**Opis:** Dialog potwierdzenia akcji (np. usunięcie przystanku). Wykorzystuje `Dialog` (komponent bazowy) z układem: tytuł, wiadomość, przyciski (Potwierdź/Anuluj).

**Główne elementy:**

- `Dialog` z tytułem i treścią
- Przyciski: `Button` Potwierdź (variant: primary) + Anuluj (variant: secondary)

**Obsługiwane interakcje:**

- Kliknięcie "Potwierdź" → wykonanie callback `onConfirm`, zamknięcie
- Kliknięcie "Anuluj" lub Escape → zamknięcie bez akcji

**Obsługiwana walidacja:** Brak

**Typy:**

- `ConfirmDialogState` (istniejący typ z `src/types.ts`)

**Propsy:**

```typescript
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
}
```

---

### 4.12 `SetSelect.svelte` (nowy komponent)

**Opis:** Lista rozwijana (Select) do przełączania między zestawami użytkownika. Zsynchronizowana z parametrem URL `setId`. Po wyborze nowego zestawu następuje zmiana URL (client-side navigation) do `/dashboard/{newSetId}`.

**Główne elementy:**

- `<select>` z opcjami (wszystkie zestawy użytkownika)
- Każda opcja: `{set.name}` (value: `{set.id}`)
- Zaznaczona opcja: aktualny `setId` z URL

**Obsługiwane interakcje:**

- Wybór opcji → zmiana URL na `/dashboard/{newSetId}` (Astro navigate lub window.location)
- Po zmianie URL → pełne przeładowanie widoku z nowymi danymi (SSR)

**Obsługiwana walidacja:** Brak (lista zestawów z API)

**Typy:**

- `SetDTO[]` - lista zestawów użytkownika

**Propsy:**

```typescript
interface SetSelectProps {
  sets: SetDTO[];
  currentSetId: string;
  onSetChange: (setId: string) => void;
}
```

---

### 4.13 `BackToDashboardButton.svelte` (nowy komponent)

**Opis:** Przycisk nawigacji powrotnej do widoku listy zestawów (`/dashboard`).

**Główne elementy:**

- `IconButton` z ikoną dashboardu (dashboard_edit)
- Link/nawigacja do `/dashboard`

**Obsługiwane interakcje:**

- Kliknięcie → nawigacja do `/dashboard`

**Obsługiwana walidacja:** Brak

**Typy:** Brak

**Propsy:**

```typescript
interface BackToDashboardButtonProps {
  // Opcjonalnie: href?: string (domyślnie "/dashboard")
}
```

---

## 5. Typy

### 5.1 Istniejące typy (z `src/types.ts`)

Poniższe typy są już zdefiniowane w projekcie i będą wykorzystywane w widoku:

- `SetDTO` - zestaw użytkownika
- `SetItemDTO` - element zestawu (przystanek w zestawie)
- `SetItemListResponse` - odpowiedź GET /api/sets/{setId}/items
- `CreateSetItemResponse` - odpowiedź POST /api/sets/{setId}/items
- `DeleteSetItemResponse` - odpowiedź DELETE /api/sets/{setId}/items/{itemId}
- `ErrorResponse` - standardowa odpowiedź błędu
- `Toast` - toast notification
- `ConfirmDialogState` - stan dialogu potwierdzenia

### 5.2 Istniejące typy ZTM (z `src/ztm-types.ts`)

- `ZtmStopDTO` - przystanek ZTM (z API stops)
- `ZtmDepartureDTO` - odjazd (z API departures)
- `ZtmSetStopDeparturesResultDTO` - wynik dla pojedynczego przystanku (ok: true/false + dane/error)
- `GetZtmSetDeparturesResponse` - agregowana odpowiedź dla wszystkich przystanków w zestawie
- `ZtmSetStopDTO` - przystanek w zestawie z metadanymi
- `GetZtmSetStopsResponse` - odpowiedź GET /api/ztm/sets/{setId}/stops
- `ZtmSetStopDeparturesErrorDTO` - błąd dla pojedynczego przystanku
- `ZtmErrorCode` - kody błędów ZTM

### 5.3 Nowe typy (ViewModel dla widoku)

Poniższe typy należy dodać do `src/types.ts`:

```typescript
/**
 * Dane początkowe przekazywane z SSR do SetDashboardView
 */
export interface SetDashboardInitialData {
  setId: string;
  items: SetItemDTO[];
  stops: ZtmSetStopDTO[];
  departures: GetZtmSetDeparturesResponse;
  allStops: ZtmStopDTO[];
  sets: SetDTO[]; // wszystkie zestawy użytkownika (do SetSelect)
}

/**
 * Stan lokalny widoku SetDashboardView
 */
export interface SetDashboardState {
  items: SetItemDTO[];
  departuresData: GetZtmSetDeparturesResponse | null;
  stopsData: ZtmSetStopDTO[];
  errorCount: number; // 0-3, licznik kolejnych błędów odświeżania
  isRefreshing: boolean; // true podczas fetch
  secondsLeft: number; // 0-60, odliczanie do następnego odświeżenia
  isCycleStopped: boolean; // true po 3 błędach (zatrzymanie cyklu)
  isAddDialogOpen: boolean;
  confirmDialog: ConfirmDialogState;
}

/**
 * Dane pojedynczej karty przystanku (StopCard)
 */
export interface StopCardData {
  itemId: string; // UUID set_item
  stopId: number;
  stop: ZtmStopDTO | null;
  position: number;
  departures: ZtmDepartureDTO[] | null;
  error: ZtmSetStopDeparturesErrorDTO | null;
}

/**
 * Stan paska postępu odświeżania
 */
export interface RefreshProgressState {
  secondsLeft: number; // 0-60
  isRefreshing: boolean;
  errorCount: number; // do wizualizacji stanu błędu
}
```

## 6. Zarządzanie stanem

Widok wykorzystuje **hybrydowe zarządzanie stanem**:

### 6.1 Stan lokalny (Svelte reactive statements w `SetDashboardView.svelte`)

Stan specyficzny dla widoku, zarządzany przez Svelte w komponencie głównym:

```typescript
let state: SetDashboardState = {
  items: initialItems,
  departuresData: initialDepartures,
  stopsData: initialStops,
  errorCount: 0,
  isRefreshing: false,
  secondsLeft: 60,
  isCycleStopped: false,
  isAddDialogOpen: false,
  confirmDialog: {
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  },
};
```

### 6.2 Globalny stan UI (Svelte stores)

Wykorzystywane istniejące stores:

- **`globalLoadingStore`** (z `src/lib/stores/global-loading.store.ts`):
  - Zarządza stanem pełnoekranowego preloadera
  - Wywoływany przez `setGlobalLoading(true)` przed POST/DELETE
  - `GlobalPreloader` w `AppLayout` subskrybuje ten store i automatycznie pokazuje/ukrywa overlay

- **`toastsStore`** (z `src/lib/stores/toasts.store.ts`):
  - Zarządza kolejką toastów (sukces, błąd, info, warning)
  - Wywoływany przez `toastsStore.addToast(type, message)`
  - `ToastStack` w `AppLayout` subskrybuje ten store i wyświetla toasty
  - Toasty sukces/info znikają automatycznie po 3s
  - Toasty error/warning wymagają ręcznego zamknięcia

### 6.3 Logika cyklu odświeżania (60s)

Cykl odświeżania zarządzany jest w `SetDashboardView.svelte` przez:

1. **Interwał odliczania** (`setInterval` co 1s):
   - Dekrementacja `state.secondsLeft` od 60 do 0
   - Po osiągnięciu 0 → trigger funkcji `refreshDepartures()`
   - Jeśli `state.isCycleStopped === true` → interwał zatrzymany

2. **Funkcja `refreshDepartures()`**:
   - Ustawia `state.isRefreshing = true`
   - Wykonuje `GET /api/ztm/sets/{setId}/departures`
   - Sukces:
     - Aktualizuje `state.departuresData`
     - Resetuje `state.errorCount = 0`
     - Resetuje `state.secondsLeft = 60`
     - Ustawia `state.isRefreshing = false`
   - Błąd:
     - Inkrementuje `state.errorCount++`
     - Jeśli `errorCount < 3`: kontynuacja cyklu (ostrzeżenie)
     - Jeśli `errorCount >= 3`: zatrzymanie cyklu (`state.isCycleStopped = true`)
     - Ustawia `state.isRefreshing = false`

3. **Obsługa błędów z eskalacją**:
   - **1 błąd**: warning toast "Problem z odświeżeniem danych", kontynuacja cyklu
   - **2 błędy**: warning toast z mocniejszym komunikatem, kontynuacja cyklu
   - **3 błędy**: error toast "Nie można pobrać danych", zatrzymanie cyklu, wyświetlenie CTA "Spróbuj ponownie"

4. **CTA "Spróbuj ponownie"** (po 3 błędach):
   - Przycisk widoczny zamiast paska postępu
   - Kliknięcie → twardy reload strony (`window.location.reload()`)

### 6.4 Brak custom hooks

Widok **nie wymaga** custom hooks (są koncepcją React, nie Svelte). Cała logika stanu i cyklu odświeżania jest zarządzana bezpośrednio w komponencie Svelte przez:

- Reactive statements (`$:`)
- Lifecycle hooks (`onMount`, `onDestroy`)
- Zwykłe funkcje pomocnicze

## 7. Integracja API

Widok integruje się z następującymi endpointami:

### 7.1 GET `/api/sets/{setId}/items`

**Kiedy:** SSR (initial data) + po dodaniu/usunięciu przystanku (opcjonalnie, API już zwraca zaktualizowaną listę)

**Request:**

- Method: GET
- URL Params: `setId` (UUID)
- Headers: Cookie (sesja)

**Response:** `SetItemListResponse`

```typescript
{
  items: SetItemDTO[];
  total_count: number;
}
```

**Obsługa błędów:**

- `400` - Invalid UUID → toast error, przekierowanie na `/dashboard`
- `401` - Unauthorized → przekierowanie na `/login`
- `404` - Set not found → toast error, przekierowanie na `/dashboard`
- `500` - Internal error → toast error

---

### 7.2 POST `/api/sets/{setId}/items`

**Kiedy:** Użytkownik dodaje przystanek przez `AddStopDialog`

**Request:**

- Method: POST
- URL Params: `setId` (UUID)
- Headers: Cookie (sesja), Content-Type: application/json
- Body: `CreateSetItemCommand`

```typescript
{
  stop_id: number;
}
```

**Response:** `CreateSetItemResponse` (201 Created)

```typescript
{
  items: SetItemDTO[];
  created_item: {
    id: string;
    stop_id: number;
    position: number;
  };
}
```

**Workflow:**

1. Wywołanie `setGlobalLoading(true)` → pokazanie `GlobalPreloader`
2. POST request
3. Sukces:
   - Aktualizacja `state.items` nową listą z response
   - Toast sukcesu: "Przystanek dodany"
   - Zamknięcie `AddStopDialog`
   - Wywołanie `refreshDepartures()` dla natychmiastowego pobrania danych nowego przystanku
4. Błąd:
   - `409 Conflict` (przystanek już istnieje) → toast error "Przystanek już istnieje w zestawie"
   - `400 MAX_ITEMS_PER_SET_EXCEEDED` → toast error "Osiągnięto limit 6 przystanków"
   - Inne błędy → toast error z komunikatem z API
5. Wywołanie `setGlobalLoading(false)` → ukrycie `GlobalPreloader`

**Obsługa błędów:**

- `400` - Invalid input → toast error z komunikatem z API
- `401` - Unauthorized → przekierowanie na `/login`
- `404` - Set not found → toast error, przekierowanie na `/dashboard`
- `409` - Stop already exists → toast error "Przystanek już istnieje"
- `400 MAX_ITEMS_PER_SET_EXCEEDED` → toast error "Osiągnięto limit"
- `500` - Internal error → toast error

---

### 7.3 DELETE `/api/sets/{setId}/items/{itemId}`

**Kiedy:** Użytkownik usuwa przystanek po potwierdzeniu w `ConfirmDialog`

**Request:**

- Method: DELETE
- URL Params: `setId` (UUID), `itemId` (UUID)
- Headers: Cookie (sesja)

**Response:** `DeleteSetItemResponse` (200 OK)

```typescript
{
  items: SetItemDTO[];
  deleted_item_id: string;
}
```

**Workflow:**

1. Wywołanie `setGlobalLoading(true)` → pokazanie `GlobalPreloader`
2. DELETE request
3. Sukces:
   - Aktualizacja `state.items` nową listą z response
   - Toast sukcesu: "Przystanek usunięty"
   - Usunięcie danych departures dla usuniętego przystanku z lokalnego stanu
4. Błąd:
   - Toast error z komunikatem z API
5. Wywołanie `setGlobalLoading(false)` → ukrycie `GlobalPreloader`

**Obsługa błędów:**

- `400` - Invalid UUID → toast error
- `401` - Unauthorized → przekierowanie na `/login`
- `404 SET_NOT_FOUND` → toast error, przekierowanie na `/dashboard`
- `404 ITEM_NOT_FOUND` → toast error "Przystanek nie znaleziony"
- `500` - Internal error → toast error

---

### 7.4 GET `/api/ztm/stops`

**Kiedy:** SSR (initial data) lub po otwarciu `AddStopDialog` (jeśli nie załadowane wcześniej)

**Request:**

- Method: GET
- Headers: Brak (publiczny endpoint, lub z Cookie jeśli wymaga auth)

**Response:** `GetZtmStopsResponse`

```typescript
{
  lastUpdate: string;
  stops: ZtmStopDTO[];
}
```

**Workflow:**

1. Załadowanie pełnej listy przystanków (cache 6h po stronie API)
2. Przekazanie do `AddStopDialog` jako props `allStops`
3. Filtrowanie w `StopSearchAutocomplete` po stronie klienta

**Obsługa błędów:**

- `500` - Internal error → toast error "Nie można załadować listy przystanków"
- Timeouts → toast error

---

### 7.5 GET `/api/ztm/sets/{setId}/departures`

**Kiedy:**

- SSR (initial data)
- Co 60s (cykl odświeżania)
- Po dodaniu nowego przystanku (natychmiastowe odświeżenie)

**Request:**

- Method: GET
- URL Params: `setId` (UUID)
- Headers: Cookie (sesja)

**Response:** `GetZtmSetDeparturesResponse` (200 OK)

```typescript
{
  set_id: string;
  results: ZtmSetStopDeparturesResultDTO[];
  fetched_at: string; // ISO-8601
}
```

Każdy element `results`:

```typescript
{
  ok: true,
  stop_id: number,
  stop: ZtmStopDTO | null,
  position: number,
  item_id: string,
  data: {
    lastUpdate: string,
    departures: ZtmDepartureDTO[]
  }
}
// lub
{
  ok: false,
  stop_id: number,
  stop: ZtmStopDTO | null,
  position: number,
  item_id: string,
  error: {
    code: string,
    message: string,
    status: number
  }
}
```

**Workflow:**

1. Ustawienie `state.isRefreshing = true`
2. GET request
3. Sukces:
   - Aktualizacja `state.departuresData` całą odpowiedzią
   - Resetowanie `state.errorCount = 0`
   - Resetowanie `state.secondsLeft = 60`
4. Błąd:
   - Inkrementacja `state.errorCount++`
   - Jeśli `errorCount === 1`: toast warning "Problem z odświeżeniem"
   - Jeśli `errorCount === 2`: toast warning "Ponowny problem z danymi"
   - Jeśli `errorCount >= 3`: toast error "Nie można pobrać danych", `state.isCycleStopped = true`
5. Ustawienie `state.isRefreshing = false`

**Obsługa błędów:**

- `400` - Invalid UUID → toast error
- `401` - Unauthorized → przekierowanie na `/login`
- `404` - Set not found → toast error, przekierowanie na `/dashboard`
- `500` / timeouts → eskalacja błędów (1-2-3)

**Obsługa błędów per karta:**

- Jeśli `result.ok === false` dla pojedynczego przystanku:
  - Wyświetlenie komunikatu błędu na karcie `StopCard`
  - Nie wpływa na globalny `errorCount` (to jest błąd per przystanek, nie błąd całego requestu)

---

### 7.6 GET `/api/ztm/sets/{setId}/stops`

**Kiedy:** SSR (initial data) - metadane przystanków (nazwy, kody)

**Request:**

- Method: GET
- URL Params: `setId` (UUID)
- Headers: Cookie (sesja)

**Response:** `GetZtmSetStopsResponse` (200 OK)

```typescript
{
  set_id: string;
  stops: ZtmSetStopDTO[];
  fetched_at: string;
  stops_last_update: string;
}
```

**Workflow:**

1. Pobranie w SSR
2. Przekazanie do `SetDashboardView` jako `initialStops`
3. Użycie do wyświetlenia nazw przystanków w kartach

**Obsługa błędów:**

- `400` - Invalid UUID → redirect na `/dashboard`
- `401` - Unauthorized → redirect na `/login`
- `404` - Set not found → redirect na `/dashboard`
- `500` - Internal error → redirect na `/dashboard` lub strona błędu

---

## 8. Interakcje użytkownika

### 8.1 Inicjalizacja widoku

**Akcja:** Użytkownik wchodzi na `/dashboard/{setId}`

**Workflow:**

1. SSR (Astro):
   - Guard sprawdza sesję → jeśli brak, redirect na `/login`
   - Walidacja UUID `setId`
   - Weryfikacja własności zestawu
   - Fetch danych początkowych:
     - `GET /api/sets/{setId}/items`
     - `GET /api/ztm/sets/{setId}/stops`
     - `GET /api/ztm/sets/{setId}/departures`
     - `GET /api/ztm/stops` (do wyszukiwarki)
     - `GET /api/sets` (lista zestawów do SetSelect)
2. Renderowanie `SetDashboardView.svelte` z danymi jako props
3. Client-side (Svelte):
   - Inicjalizacja stanu lokalnego z props
   - Uruchomienie cyklu odświeżania (interval co 1s)
   - Wyświetlenie kart przystanków z danymi odjazdów

**Walidacja:** UUID `setId`, własność zestawu

**Obsługa błędów:** Redirect na `/login` (401) lub `/dashboard` (404/403/500)

---

### 8.2 Automatyczne odświeżanie danych (60s)

**Akcja:** Automatyczne odliczanie i fetch co 60 sekund

**Workflow:**

1. `setInterval` co 1s → dekrementacja `state.secondsLeft`
2. `RefreshProgressBar` wyświetla aktualną wartość (60 → 0)
3. Po osiągnięciu 0:
   - Wywołanie `refreshDepartures()`
   - Ustawienie `state.isRefreshing = true` → pasek w trybie indeterminate
   - `GET /api/ztm/sets/{setId}/departures`
   - Sukces → aktualizacja `state.departuresData`, reset `errorCount`, reset `secondsLeft`
   - Błąd → inkrementacja `errorCount`, eskalacja (1-2-3)
4. `state.isRefreshing = false` → pasek wraca do trybu determinate
5. Cykl kontynuowany (jeśli `errorCount < 3`)

**Walidacja:** Brak

**Obsługa błędów:** Eskalacja (1 błąd: warning, 2 błędy: warning, 3 błędy: error + stop cyklu)

---

### 8.3 Dodawanie przystanku

**Akcja:** Użytkownik klika przycisk "Dodaj przystanek" (`AddStopButton`)

**Workflow:**

1. Otwarcie `AddStopDialog` (`state.isAddDialogOpen = true`)
2. Użytkownik wpisuje w `StopSearchAutocomplete` → filtrowanie wyników
3. Wybór przystanku z listy → ustawienie `selectedStopId`
4. Kliknięcie "Dodaj":
   - Walidacja: `selectedStopId` nie może być null
   - Wywołanie `setGlobalLoading(true)`
   - `POST /api/sets/{setId}/items` z `{ stop_id: selectedStopId }`
   - Sukces:
     - Aktualizacja `state.items` z response
     - Toast sukcesu: "Przystanek dodany"
     - Zamknięcie dialogu
     - Natychmiastowe wywołanie `refreshDepartures()` (aby pobrać dane dla nowego przystanku)
   - Błąd:
     - Toast error z komunikatem (409: "już istnieje", 400: "limit", inne)
   - Wywołanie `setGlobalLoading(false)`
5. Zamknięcie dialogu

**Walidacja:**

- Wybór z listy (nie puste pole)
- Walidacja po stronie API (409 conflict, 400 max exceeded)

**Obsługa błędów:** Toasty z komunikatami błędów z API

---

### 8.4 Usuwanie przystanku

**Akcja:** Użytkownik klika ikonę "usuń" na karcie przystanku (`StopCard`)

**Workflow:**

1. Otwarcie `ConfirmDialog`:
   - Tytuł: "Usunąć przystanek?"
   - Wiadomość: "Czy na pewno chcesz usunąć przystanek {nazwa} z zestawu?"
2. Użytkownik klika "Potwierdź":
   - Wywołanie `setGlobalLoading(true)`
   - `DELETE /api/sets/{setId}/items/{itemId}`
   - Sukces:
     - Aktualizacja `state.items` z response (nowa lista bez usuniętego)
     - Usunięcie danych departures dla tego przystanku z `state.departuresData`
     - Toast sukcesu: "Przystanek usunięty"
   - Błąd:
     - Toast error z komunikatem
   - Wywołanie `setGlobalLoading(false)`
3. Zamknięcie dialogu
4. (Opcjonalnie) Jeśli lista jest pusta (0 przystanków), pokazać komunikat "Brak przystanków w zestawie"

**Walidacja:** Brak (potwierdzenie w dialogu)

**Obsługa błędów:** Toasty z komunikatami błędów z API

---

### 8.5 Przełączanie zestawów

**Akcja:** Użytkownik wybiera inny zestaw z `SetSelect`

**Workflow:**

1. Użytkownik otwiera listę rozwijaną i wybiera zestaw
2. Callback `onSetChange(newSetId)` → zmiana URL na `/dashboard/{newSetId}`
3. Przeładowanie strony (SSR) → nowe dane dla nowego zestawu
4. Inicjalizacja widoku z danymi nowego zestawu

**Walidacja:** Brak (lista zestawów z API)

**Obsługa błędów:** Jeśli nowy setId nie istnieje → guard SSR przekieruje na błąd

---

### 8.6 Otwarcie trybu TV

**Akcja:** Użytkownik klika ikonę TV na karcie przystanku (`StopCard`)

**Workflow:**

1. Kliknięcie ikony TV → wywołanie `onOpenTv(stopId)`
2. Otwarcie nowego okna/karty z URL `/tv/{stopId}`
3. Nowe okno wyświetla widok TV (poza zakresem tego planu)

**Walidacja:** Brak

**Obsługa błędów:** Brak (osobny widok TV)

---

### 8.7 Reakcja na 3 błędy odświeżania (zatrzymanie cyklu)

**Akcja:** Po 3 kolejnych błędach odświeżania cykl zostaje zatrzymany

**Workflow:**

1. Po 3 błędach:
   - Ustawienie `state.isCycleStopped = true`
   - Zatrzymanie interwału odliczania
   - Ukrycie `RefreshProgressBar`
   - Wyświetlenie komunikatu błędu: "Nie można pobrać danych"
   - Wyświetlenie przycisku CTA "Spróbuj ponownie"
2. Użytkownik klika "Spróbuj ponownie":
   - Twardy reload strony: `window.location.reload()`
   - (Alternatywnie: reset stanu i restart cyklu, ale reload jest bezpieczniejszy)

**Walidacja:** Brak

**Obsługa błędów:** Twardy reload

---

## 9. Warunki i walidacja

### 9.1 Walidacja parametru URL `setId`

**Gdzie:** SSR (Astro guard)

**Warunek:**

- `setId` musi być poprawnym UUID v4
- Format: `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`

**Akcja jeśli niepoprawny:** Redirect na `/dashboard` + toast error "Nieprawidłowy identyfikator zestawu"

---

### 9.2 Walidacja własności zestawu

**Gdzie:** SSR (Astro guard) → weryfikacja przez `getUserId()` + `verifySetOwnership()`

**Warunek:**

- Zestaw o `setId` musi istnieć
- Zestaw musi należeć do zalogowanego użytkownika (`user_id === auth.uid()`)

**Akcja jeśli niepoprawny:**

- `401 Unauthorized` → redirect na `/login`
- `404 Not Found` → redirect na `/dashboard` + toast error "Zestaw nie znaleziony"
- `403 Forbidden` → redirect na `/dashboard` + toast error "Brak dostępu"

---

### 9.3 Limit przystanków w zestawie (max 6)

**Gdzie:** `SetDashboardView.svelte` + `AddStopDialog.svelte`

**Warunek:**

- `state.items.length < 6` → przycisk "Dodaj przystanek" widoczny
- `state.items.length >= 6` → przycisk "Dodaj przystanek" ukryty

**Akcja API:**

- POST `/api/sets/{setId}/items` zwróci `400 MAX_ITEMS_PER_SET_EXCEEDED` jeśli limit przekroczony
- Toast error: "Osiągnięto maksymalną liczbę przystanków (6)"

**Stan UI:**

- Przed POST: UI ukrywa przycisk (defensywne)
- Po POST error 400: toast error + pozostawienie UI w stanie bez dodania

---

### 9.4 Walidacja wyboru przystanku w wyszukiwarce

**Gdzie:** `AddStopDialog.svelte` → przed POST

**Warunek:**

- `selectedStopId` nie może być `null`
- `selectedStopId` musi być liczbą całkowitą > 0

**Akcja jeśli niepoprawny:**

- Blokada przycisku "Dodaj" (disabled) jeśli `selectedStopId === null`
- (Opcjonalnie) Walidacja HTML5: `required` na input

---

### 9.5 Walidacja duplikatu przystanku

**Gdzie:** API → zwraca `409 Conflict`

**Warunek:**

- Przystanek o `stop_id` już istnieje w zestawie (unique constraint w DB)

**Akcja:**

- API zwraca `409 Conflict` z `SET_ITEM_ALREADY_EXISTS`
- Toast error: "Przystanek już istnieje w zestawie"
- Dialog pozostaje otwarty (użytkownik może wybrać inny przystanek)

---

### 9.6 Eskalacja błędów odświeżania

**Gdzie:** `SetDashboardView.svelte` → funkcja `refreshDepartures()`

**Warunek:**

- `state.errorCount` inkrementowany po każdym błędzie fetch
- Sprawdzenie: `if (errorCount === 1)`, `if (errorCount === 2)`, `if (errorCount >= 3)`

**Akcje:**

- **1 błąd:**
  - Toast warning: "Problem z odświeżeniem danych. Spróbujemy ponownie za minutę."
  - Kontynuacja cyklu
- **2 błędy:**
  - Toast warning: "Ponowny problem z danymi. Sprawdź połączenie."
  - Kontynuacja cyklu
- **3 błędy:**
  - Toast error (persistent): "Nie można pobrać danych odjazdów"
  - `state.isCycleStopped = true` → zatrzymanie interwału
  - Ukrycie `RefreshProgressBar`
  - Wyświetlenie przycisku "Spróbuj ponownie" → kliknięcie → `window.location.reload()`

---

### 9.7 Obsługa błędów per karta (pojedynczy przystanek)

**Gdzie:** `StopCard.svelte` → renderowanie z props `error`

**Warunek:**

- `props.error !== null` (błąd dla konkretnego `stop_id` z API)

**Akcja:**

- Wyświetlenie komunikatu błędu na karcie: "Nie można załadować odjazdów dla tego przystanku"
- Ikona błędu
- Brak danych odjazdów (pusta lista lub placeholder)
- **Nie wpływa na globalny errorCount** (to jest błąd per przystanek, nie całego requestu)

---

## 10. Obsługa błędów

### 10.1 Błędy uwierzytelnienia (401)

**Źródło:** Dowolne wywołanie API

**Obsługa:**

- Natychmiastowy redirect na `/login` (middleware Astro lub obsługa w fetch)
- (Opcjonalnie) Zapisanie aktualnego URL w session storage → po zalogowaniu powrót

---

### 10.2 Błędy dostępu (403, 404)

**Źródło:**

- `GET /api/sets/{setId}/items` → 404 (zestaw nie istnieje lub nie należy do użytkownika)
- `DELETE /api/sets/{setId}/items/{itemId}` → 404 (item nie istnieje)

**Obsługa:**

- Toast error z komunikatem z API
- (SSR 404) Redirect na `/dashboard`
- (Client-side 404 przy DELETE) Toast error "Przystanek nie znaleziony"

---

### 10.3 Błędy walidacji (400)

**Źródło:**

- `POST /api/sets/{setId}/items` → 400 (invalid stop_id, max items exceeded)
- Inne endpointy → 400 (invalid UUID, invalid body)

**Obsługa:**

- Toast error z komunikatem z API:
  - `MAX_ITEMS_PER_SET_EXCEEDED` → "Osiągnięto maksymalną liczbę przystanków (6)"
  - `INVALID_STOP_ID` → "Nieprawidłowy identyfikator przystanku"
  - Inne → komunikat z `ErrorResponse.message`

---

### 10.4 Błędy konfliktu (409)

**Źródło:**

- `POST /api/sets/{setId}/items` → 409 (przystanek już istnieje w zestawie)

**Obsługa:**

- Toast error: "Przystanek już istnieje w zestawie"
- Dialog `AddStopDialog` pozostaje otwarty

---

### 10.5 Błędy serwera (500)

**Źródło:** Dowolne wywołanie API → 500 Internal Server Error

**Obsługa:**

- Toast error: "Wystąpił błąd serwera. Spróbuj ponownie później."
- (Dla fetch departures) → eskalacja błędów (1-2-3)

---

### 10.6 Błędy sieci (timeout, network error)

**Źródło:** Fetch timeout, brak połączenia

**Obsługa:**

- (Dla fetch departures) → eskalacja błędów (1-2-3)
- (Dla POST/DELETE) → toast error: "Problem z połączeniem. Sprawdź internet."

---

### 10.7 Błędy ZTM (upstream errors)

**Źródło:**

- `GET /api/ztm/sets/{setId}/departures` → pojedynczy `result.ok === false`
- Błąd per przystanek (ZTM API nie zwróciło danych dla konkretnego stop_id)

**Obsługa:**

- Wyświetlenie komunikatu błędu na karcie `StopCard` dla tego przystanku
- Komunikat: "Brak danych dla tego przystanku" lub message z `error.message`
- Inne karty działają normalnie
- **Nie wpływa na globalny errorCount**

---

## 11. Kroki implementacji

### Krok 1: Przygotowanie typów

**Zadanie:** Dodać nowe typy ViewModel do `src/types.ts`

**Szczegóły:**

- Dodać `SetDashboardInitialData`
- Dodać `SetDashboardState`
- Dodać `StopCardData`
- Dodać `RefreshProgressState`

**Weryfikacja:** TypeScript nie zgłasza błędów kompilacji

---

### Krok 2: Stworzenie strony Astro `dashboard-set.astro`

**Zadanie:** Stworzyć plik `src/pages/dashboard/[setId].astro`

**Szczegóły:**

- Implementacja SSR guard (sprawdzenie sesji)
- Walidacja parametru `setId` (UUID)
- Weryfikacja własności zestawu (`verifySetOwnership`)
- Fetch danych początkowych:
  - `GET /api/sets/{setId}/items`
  - `GET /api/ztm/sets/{setId}/stops`
  - `GET /api/ztm/sets/{setId}/departures`
  - `GET /api/ztm/stops`
  - `GET /api/sets` (lista zestawów)
- Obsługa błędów (redirect na `/login`, `/dashboard`, lub strona błędu)
- Renderowanie `SetDashboardView.svelte` z danymi jako props
- Layout: `AppLayout` z konfiguracją nagłówka

**Weryfikacja:**

- Otwarcie `/dashboard/{validSetId}` → strona się renderuje z danymi
- Otwarcie `/dashboard/{invalidSetId}` → redirect na błąd
- Brak sesji → redirect na `/login`

---

### Krok 3: Stworzenie głównego komponentu `SetDashboardView.svelte`

**Zadanie:** Stworzyć `src/components/SetDashboardView.svelte`

**Szczegóły:**

- Props zgodnie z `SetDashboardInitialData`
- Inicjalizacja stanu lokalnego `SetDashboardState`
- Lifecycle: `onMount` → uruchomienie cyklu odświeżania (interval)
- Lifecycle: `onDestroy` → czyszczenie interwału
- Funkcja `refreshDepartures()` → fetch + eskalacja błędów
- Renderowanie struktury:
  - `RefreshProgressBar` (lub CTA "Spróbuj ponownie" jeśli `isCycleStopped`)
  - `DashboardGrid`
  - `StopCard` dla każdego item (loop)
  - `AddStopButton` (jeśli `items.length < 6`)
  - `AddStopDialog`
  - `ConfirmDialog`

**Weryfikacja:**

- Komponent renderuje się z danymi początkowymi
- Pasek postępu odlicza od 60 do 0
- Po 60s następuje fetch (sprawdzić w Network tab)

---

### Krok 4: Stworzenie komponentu `RefreshProgressBar.svelte`

**Zadanie:** Stworzyć `src/components/RefreshProgressBar.svelte`

**Szczegóły:**

- Props: `secondsLeft`, `isRefreshing`, `errorCount`
- Element `<progress>`:
  - Tryb determinate: `value={60 - secondsLeft}` `max={60}`
  - Tryb indeterminate: `value={undefined}` jeśli `isRefreshing === true`
- Tekst pomocniczy:
  - Normalnie: "Odświeżanie za {secondsLeft}s"
  - Podczas fetch: "Pobieranie danych..."
  - Po 1-2 błędach: "Ostrzeżenie: problem z danymi"
  - Po 3 błędach: komponent ukryty (rodzic renderuje CTA)

**Weryfikacja:**

- Pasek postępu wyświetla się i odlicza
- Podczas fetch zmienia się na tryb indeterminate
- Po 60s reset do 60

---

### Krok 5: Stworzenie komponentu `StopCard.svelte`

**Zadanie:** Stworzyć `src/components/StopCard.svelte`

**Szczegóły:**

- Props: `stopId`, `itemId`, `stop`, `position`, `departures`, `error`, `hasGlobalError`, `onDelete`, `onOpenTv`
- Bazuje na `Card.svelte` (istniejący)
- Nagłówek:
  - Tytuł: `{stop.stopName} ({stop.stopCode})`
  - Slot actions: `IconButton` TV (icon: "tv", onClick → `onOpenTv(stopId)`)
  - Slot deleteAction: `IconButton` usuń (icon: "delete", onClick → `onDelete(itemId)`)
- Content:
  - Jeśli `error !== null` → komunikat błędu per karta
  - Jeśli `hasGlobalError === true` → komunikat błędu globalnego
  - W przeciwnym razie → `DeparturesList` (departures)
  - Na dole (jeśli są komunikaty): `Ticker` (placeholder na przyszłość)

**Weryfikacja:**

- Karta renderuje się z nazwą i kodem przystanku
- Lista odjazdów jest widoczna (paginacja działa - przyciski góra/dół)
- Ikony TV i usuń są klikalne

---

### Krok 6: Stworzenie komponentu `DeparturesList.svelte`

**Zadanie:** Stworzyć `src/components/DeparturesList.svelte`

**Szczegóły:**

- Props: `departures: ZtmDepartureDTO[]`
- Stan lokalny: `currentPage = 0` (która "strona" 6 elementów jest widoczna)
- Obliczanie widocznych elementów:
  - `visibleDepartures = departures.slice(currentPage * 6, (currentPage + 1) * 6)`
  - `maxPage = Math.ceil(departures.length / 6) - 1`
- Kontener bez scroll: `<div>` ze stałą wysokością (dla 6 elementów)
- Loop przez `visibleDepartures` → renderowanie `DepartureItem` dla każdego
- Stopka z nawigacją:
  - `IconButton` "Góra" (icon: `arrow_upward`, onClick: `currentPage--`, disabled: `currentPage === 0`)
  - Wskaźnik: `{currentPage * 6 + 1}-{Math.min((currentPage + 1) * 6, departures.length)} z {departures.length}`
  - `IconButton` "Dół" (icon: `arrow_downward`, onClick: `currentPage++`, disabled: `currentPage === maxPage`)
- Stan pusty (jeśli `departures.length === 0`): "Brak odjazdów"

**Weryfikacja:**

- Lista renderuje się z pierwszymi 6 odjazdami
- Kliknięcie "Dół" → pokazuje następne 6
- Kliknięcie "Góra" → pokazuje poprzednie 6
- Przyciski są disabled na końcach listy
- Wskaźnik pokazuje prawidłowy zakres (np. "7-12 z 18")

---

### Krok 7: Stworzenie komponentu `DepartureItem.svelte`

**Zadanie:** Stworzyć `src/components/DepartureItem.svelte`

**Szczegóły:**

- Props: `departure: ZtmDepartureDTO`
- Layout: flexbox row (numer linii | kierunek | czas | ikony)
- Numer linii: `{departure.routeShortName}` (większa czcionka, wyróżniony)
- Kierunek: `{departure.headsign}`
- Czas:
  - Obliczenie czasu względnego z `departure.estimatedTime` (ISO-8601) → now
  - Jeśli < 60 min: "za X min"
  - Jeśli >= 60 min: format HH:mm
- Ikony udogodnień:
  - (Placeholder) Ikona roweru (jeśli dane w API wspierają)
  - (Placeholder) Ikona wózka (jeśli `wheelchairBoarding` w stop data)
  - **Uwaga:** Aktualne typy ZTM nie zawierają tych danych per odjazd. W MVP można pominąć lub wyświetlać na podstawie metadanych przystanku (stop.wheelchairBoarding)
- (Opcjonalnie) Status opóźnienia (jeśli `delayInSeconds > 0`): badge "Opóźnienie: +X min"

**Weryfikacja:**

- Odjazd renderuje się z numerem linii, kierunkiem i czasem
- Czas względny jest obliczany poprawnie

---

### Krok 8: Stworzenie komponentu `Ticker.svelte`

**Zadanie:** Stworzyć `src/components/Ticker.svelte` (placeholder)

**Szczegóły:**

- Props: `message: string | null`
- Jeśli `message === null` → komponent nie renderuje się
- Jeśli `message !== null` → pasek z animacją marquee
- Layout: kontener `overflow: hidden`, tekst w animacji CSS (translateX)

**Weryfikacja:**

- Komponent renderuje się tylko jeśli message istnieje
- Animacja marquee działa

**Uwaga:** W MVP komunikaty specjalne mogą nie być zwracane przez API ZTM. Komponent można stworzyć jako placeholder i aktywować w przyszłości.

---

### Krok 9: Stworzenie komponentu `AddStopButton.svelte`

**Zadanie:** Stworzyć `src/components/AddStopButton.svelte`

**Szczegóły:**

- Props: `onClick`, `disabled`
- Bazuje na `Button.svelte` (istniejący)
- Tekst: "Dodaj przystanek" + ikona "add"
- Warunkowe renderowanie w rodzicu: `{#if items.length < 6}`

**Weryfikacja:**

- Przycisk wyświetla się gdy < 6 przystanków
- Przycisk ukrywa się gdy >= 6 przystanków
- Kliknięcie → otwarcie dialogu

---

### Krok 10: Stworzenie komponentu `AddStopDialog.svelte`

**Zadanie:** Stworzyć `src/components/AddStopDialog.svelte`

**Szczegóły:**

- Props: `isOpen`, `setId`, `allStops`, `onClose`, `onSuccess`
- Bazuje na `Dialog.svelte` (istniejący)
- Tytuł: "Dodaj przystanek"
- Content:
  - `StopSearchAutocomplete` (binding: `selectedStopId`)
  - Przyciski: "Dodaj" (submit) + "Anuluj" (close)
- Logika submit:
  - Walidacja: `selectedStopId !== null`
  - Wywołanie `setGlobalLoading(true)`
  - `POST /api/sets/{setId}/items` z `{ stop_id: selectedStopId }`
  - Sukces → `onSuccess(response)`, `onClose()`
  - Błąd → toast error
  - `setGlobalLoading(false)`

**Weryfikacja:**

- Dialog otwiera się po kliknięciu przycisku
- Wyszukiwarka działa (filtrowanie)
- Dodanie przystanku → sukces → zamknięcie dialogu + aktualizacja widoku

---

### Krok 11: Stworzenie komponentu `StopSearchAutocomplete.svelte`

**Zadanie:** Stworzyć `src/components/StopSearchAutocomplete.svelte`

**Szczegóły:**

- Props: `allStops`, `selectedStopId`, `onSelect`
- Layout:
  - `<input type="search" list="stops-datalist">`
  - `<datalist id="stops-datalist">` z opcjami
- Filtrowanie:
  - Reaktywne filtrowanie `allStops` po wartości inputu
  - Matching: nazwa przystanku lub kod (case-insensitive)
- Każda opcja w datalist:
  - Value: `{stop.stopId}`
  - Label: `{stop.stopShortname} - {stop.stopName} ({stop.stopCode})`
- Binding:
  - `bind:value` na input
  - Parsowanie wybranej wartości → `onSelect(stopId)`

**Weryfikacja:**

- Input pokazuje autouzupełnianie po wpisaniu
- Wybór opcji → `selectedStopId` zostaje ustawiony
- Filtrowanie działa po nazwie i kodzie

---

### Krok 12: Stworzenie komponentu `SetSelect.svelte`

**Zadanie:** Stworzyć `src/components/SetSelect.svelte`

**Szczegóły:**

- Props: `sets: SetDTO[]`, `currentSetId: string`, `onSetChange`
- Element: `<select>` z opcjami
- Każda opcja:
  - Value: `{set.id}`
  - Label: `{set.name}`
- Binding: `bind:value={selectedSetId}`
- Event: `on:change` → `onSetChange(selectedSetId)`

**Weryfikacja:**

- Select wyświetla listę zestawów
- Aktualny zestaw jest zaznaczony
- Wybór innego zestawu → zmiana URL → przeładowanie widoku

---

### Krok 13: Stworzenie komponentu `BackToDashboardButton.svelte`

**Zadanie:** Stworzyć `src/components/BackToDashboardButton.svelte`

**Szczegóły:**

- Bazuje na `IconButton.svelte` (istniejący)
- Ikona: "arrow_back"
- Title: "Wróć do listy zestawów"
- Href: `/dashboard` (lub `onClick` → `window.location.href = '/dashboard'`)

**Weryfikacja:**

- Przycisk wyświetla się w nagłówku
- Kliknięcie → nawigacja do `/dashboard`

---

### Krok 14: Integracja z `AppLayout` (konfiguracja nagłówka)

**Zadanie:** Skonfigurować slot `header-left` w `AppLayout` dla widoku `/dashboard/{setId}`

**Szczegóły:**

- Slot `header-left` w `SetDashboardView.svelte`:
  - `BackToDashboardButton`
  - `SetSelect` (z listą zestawów i aktualnym setId)
  - `AccountButton` (istniejący komponent)
- Slot `header-right` (stały w `AppLayout`):
  - `Clock`
  - `ThemeToggle`

**Weryfikacja:**

- Nagłówek wyświetla wszystkie elementy w odpowiedniej kolejności
- SetSelect działa (zmiana zestawu)
- AccountButton prowadzi do `/account`

---

### Krok 15: Implementacja logiki cyklu odświeżania

**Zadanie:** Dodać logikę cyklu odświeżania (60s) w `SetDashboardView.svelte`

**Szczegóły:**

- `onMount`:
  - Uruchomienie `setInterval` co 1s
  - Dekrementacja `state.secondsLeft` od 60 do 0
  - Po osiągnięciu 0 → wywołanie `refreshDepartures()`
- Funkcja `refreshDepartures()`:
  - Ustawienie `state.isRefreshing = true`
  - Fetch `GET /api/ztm/sets/{setId}/departures`
  - Sukces:
    - Aktualizacja `state.departuresData`
    - Reset `state.errorCount = 0`
    - Reset `state.secondsLeft = 60`
  - Błąd:
    - Inkrementacja `state.errorCount++`
    - Eskalacja (toast warning/error)
    - Jeśli `errorCount >= 3` → `state.isCycleStopped = true`, clear interval
  - Ustawienie `state.isRefreshing = false`
- `onDestroy`:
  - Czyszczenie interwału (`clearInterval`)

**Weryfikacja:**

- Po 60s następuje automatyczne odświeżenie (sprawdzić w Network tab)
- Po błędzie następuje eskalacja (1-2-3)
- Po 3 błędach cykl zatrzymuje się, pojawia się CTA "Spróbuj ponownie"

---

### Krok 16: Implementacja obsługi dodawania przystanku

**Zadanie:** Dodać logikę POST `/api/sets/{setId}/items` w `AddStopDialog.svelte`

**Szczegóły:**

- Funkcja `handleAddStop(selectedStopId)`:
  - Walidacja: `selectedStopId !== null`
  - `setGlobalLoading(true)`
  - `POST /api/sets/{setId}/items` z `{ stop_id: selectedStopId }`
  - Sukces:
    - Wywołanie `onSuccess(response)` → aktualizacja `state.items` w rodzicu
    - Toast sukcesu: "Przystanek dodany"
    - Zamknięcie dialogu
    - Natychmiastowe wywołanie `refreshDepartures()` w rodzicu
  - Błąd:
    - Toast error z komunikatem z API
  - `setGlobalLoading(false)`

**Weryfikacja:**

- Dodanie przystanku → sukces → nowa karta pojawia się w gridzie
- Dodanie duplikatu → błąd 409 → toast "Przystanek już istnieje"
- Dodanie przy limicie 6 → błąd 400 → toast "Osiągnięto limit"

---

### Krok 17: Implementacja obsługi usuwania przystanku

**Zadanie:** Dodać logikę DELETE `/api/sets/{setId}/items/{itemId}` w `SetDashboardView.svelte`

**Szczegóły:**

- Funkcja `handleDeleteStop(itemId)`:
  - Otwarcie `ConfirmDialog` z komunikatem
  - Po potwierdzeniu:
    - `setGlobalLoading(true)`
    - `DELETE /api/sets/{setId}/items/{itemId}`
    - Sukces:
      - Aktualizacja `state.items` z response (nowa lista)
      - Usunięcie danych departures dla tego itemId z `state.departuresData`
      - Toast sukcesu: "Przystanek usunięty"
    - Błąd:
      - Toast error z komunikatem z API
    - `setGlobalLoading(false)`

**Weryfikacja:**

- Usunięcie przystanku → potwierdzenie → karta znika z gridu
- Usunięcie nieistniejącego → błąd 404 → toast error

---

### Krok 18: Implementacja obsługi trybu TV

**Zadanie:** Dodać logikę otwierania `/tv/{stopId}` w `StopCard.svelte`

**Szczegóły:**

- Funkcja `handleOpenTv(stopId)`:
  - `window.open('/tv/' + stopId, '_blank')`
  - Nowe okno/karta z widokiem TV

**Weryfikacja:**

- Kliknięcie ikony TV → otwarcie nowego okna z `/tv/{stopId}`

---

### Krok 19: Testowanie integracyjne

**Zadanie:** Przetestować cały widok end-to-end

**Scenariusze testowe:**

1. **Inicjalizacja widoku:**
   - Otwarcie `/dashboard/{setId}` → widok się renderuje z danymi
   - Karty przystanków wyświetlają odjazdy
   - Pasek postępu odlicza od 60

2. **Automatyczne odświeżanie:**
   - Po 60s następuje fetch
   - Dane odjazdów aktualizują się
   - Pasek resetuje się do 60

3. **Dodawanie przystanku:**
   - Kliknięcie "Dodaj przystanek" → dialog
   - Wyszukanie i wybór przystanku → kliknięcie "Dodaj"
   - Nowa karta pojawia się w gridzie
   - Dane odjazdów są pobierane natychmiast

4. **Usuwanie przystanku:**
   - Kliknięcie ikony usuń → dialog potwierdzenia
   - Potwierdzenie → karta znika z gridu

5. **Przełączanie zestawów:**
   - Wybór innego zestawu z SetSelect
   - URL zmienia się, widok przeładowuje się z nowymi danymi

6. **Tryb TV:**
   - Kliknięcie ikony TV → nowe okno z `/tv/{stopId}`

7. **Eskalacja błędów:**
   - Symulacja 3 błędów sieci (np. przez DevTools: offline mode on/off)
   - Po 1 błędzie: toast warning
   - Po 2 błędach: toast warning
   - Po 3 błędach: toast error, cykl zatrzymany, CTA "Spróbuj ponownie"
   - Kliknięcie CTA → reload strony

8. **Limit 6 przystanków:**
   - Dodanie 6 przystanków → przycisk "Dodaj przystanek" znika
   - Próba POST (przez API manual) z 7 przystanek → błąd 400

9. **Błędy per karta:**
   - Symulacja błędu ZTM dla pojedynczego przystanku (np. invalid stopId)
   - Karta wyświetla komunikat błędu
   - Inne karty działają normalnie

**Weryfikacja:** Wszystkie scenariusze przechodzą bez błędów

---

### Krok 20: Optymalizacja i dostępność

**Zadanie:** Sprawdzić i poprawić dostępność oraz optymalizacje

**Szczegóły:**

- **Dostępność (a11y):**
  - Wszystkie `IconButton` mają `title` (tooltips)
  - Dialogi mają poprawny focus management (trap focus)
  - Przyciski nawigacji w `DeparturesList` są dostępne z klawiatury (tab, enter/space)
  - Wszystkie interaktywne elementy mają `min-width/height: 44px` (WCAG)
  - Kontrast kolorów spełnia WCAG AA
- **Optymalizacje:**
  - Cache przystanków (`GET /api/ztm/stops`) na 6h (już zaimplementowane w API)
  - Cache departures na 20s (już zaimplementowane w API)
  - Fetch departures tylko gdy widok jest visible (opcjonalnie: `document.visibilityState`)
  - Debounce wyszukiwarki (opcjonalnie: w `StopSearchAutocomplete`)
- **Responsive:**
  - `DashboardGrid` z `auto-fill, minmax(280px, 1fr)` (już w istniejącym komponencie)
  - Karty adaptują się do różnych szerokości ekranu
  - Nagłówek stackuje się na mobile (jeśli potrzeba)

**Weryfikacja:**

- Lighthouse audit: Accessibility score >= 90
- Widok działa płynnie na desktop i mobile

---

### Krok 21: Dokumentacja i review

**Zadanie:** Przygotować dokumentację i code review

**Szczegóły:**

- Dodać komentarze JSDoc do wszystkich komponentów i funkcji
- Upewnić się, że wszystkie typy są poprawne i kompletne
- Sprawdzić linter (ESLint) → brak błędów
- Sprawdzić prettier → kod sformatowany
- Code review: sprawdzenie przez drugiego developera

**Weryfikacja:**

- Kod jest czytelny, zgodny z konwencjami projektu
- Brak błędów TypeScript, ESLint, Prettier
- Dokumentacja jest kompletna

---

## Podsumowanie

Ten plan implementacji szczegółowo opisuje wszystkie aspekty widoku Dashboard — Zestaw (`/dashboard/{setId}`), od struktury komponentów przez typy i zarządzanie stanem, po integrację API i obsługę błędów. Implementacja powinna być przeprowadzona krok po kroku zgodnie z kolejnością w sekcji 11, z weryfikacją każdego kroku przed przejściem do następnego.

Kluczowe funkcje widoku:

- ✅ Monitorowanie odjazdów dla max 6 przystanków
- ✅ Automatyczne odświeżanie co 60s z paskiem postępu
- ✅ Paginacja odjazdów (6 widocznych na raz, nawigacja przyciskami góra/dół)
- ✅ Dodawanie/usuwanie przystanków z walidacją limitu
- ✅ Przełączanie zestawów przez Select
- ✅ Tryb TV dla pojedynczych przystanków
- ✅ Obsługa błędów z eskalacją (1-2-3)
- ✅ Globalne komponenty UI (toasty, preloader) przez Svelte stores
- ✅ Pełna integracja z istniejącymi API endpointami

Widok jest zgodny z PRD, user stories oraz istniejącą architekturą aplikacji.
