# Plan implementacji widoku Dashboard — lista zestawów

## 1. Przegląd

Widok Dashboard to centralne miejsce zarządzania zestawami tablic przystankowych użytkownika. Umożliwia przeglądanie wszystkich zestawów (maksymalnie 6), tworzenie nowych, zmianę nazw oraz usuwanie istniejących — wszystko w jednym miejscu. Widok łączy funkcje monitoringu i zarządzania zgodnie z filozofią minimalizmu technicznego aplikacji. Każda karta zestawu wyświetla nazwę oraz liczbę elementów (przystanków) i pozwala na szybkie przejście do widoku szczegółów zestawu.

## 2. Routing widoku

**Ścieżka:** `/dashboard`

**Zabezpieczenia:**

- Widok chroniony SSR guard (Astro middleware)
- Wymaga aktywnej sesji użytkownika (Supabase Auth)
- Brak sesji → przekierowanie do `/login`
- Odpowiedź 401 z API → przekierowanie do `/login`

## 3. Struktura komponentów

```
DashboardPage (Astro SSR)
├── AppLayout (Svelte) - współdzielony layout
│   ├── Header
│   │   ├── [Slot lewy - kontekstowy]
│   │   │   └── AccountButton (Svelte)
│   │   └── [Slot prawy - stały]
│   │       ├── Clock (Svelte)
│   │       └── ThemeToggle (Svelte)
│   ├── [Main Content Slot]
│   │   └── SetsDashboard (Svelte) - główny kontener interaktywny
│   │       ├── DashboardGrid (Svelte) - siatka CSS Grid
│   │       │   ├── SetCard (Svelte) × N - karty zestawów
│   │       │   └── CreateSetButton (Svelte) - przycisk tworzenia [warunkowo]
│   │       └── ConfirmDialog (Svelte) - potwierdzenie usunięcia
│   ├── GlobalPreloader (Svelte) - pełnoekranowy loader [poziom layout]
│   └── ToastStack (Svelte) - powiadomienia [poziom layout]
```

**Stan globalny (Svelte stores):**

- `globalLoadingStore` - zarządzanie stanem pełnoekranowego preloadera
- `toastsStore` - zarządzanie kolejką powiadomień

**Komponenty bazowe (używane przez komponenty widoku):**

- `Button` - przyciski z wariantami (primary, secondary) i stanami
- `IconButton` - przyciski ikonowe z wariantami (default, inverted)
- `TextInput` - pola tekstowe z walidacją HTML5
- `Dialog` - wrapper dla `<dialog>` z focus management
- `Card` - kontener karty z nagłówkiem (tytuł + sloty dla akcji)
- `GlobalPreloader`, `ToastStack` - renderowane w AppLayout

## 4. Szczegóły komponentów

### 4.1 DashboardPage (Astro)

**Opis:**
Główny kontener strony renderowany po stronie serwera. Odpowiedzialny za zabezpieczenia (auth guard), pobranie początkowych danych oraz przekazanie ich do komponentów Svelte.

**Główne elementy:**

- Guard SSR weryfikujący sesję użytkownika
- Wywołanie `GET /api/sets` w fazie renderowania SSR
- Przekazanie danych do `SetsDashboard` przez props
- Obsługa błędów SSR (redirect do `/login` przy 401)

**Obsługiwane zdarzenia:**

- Brak (SSR)

**Warunki walidacji:**

- Weryfikacja sesji przez `locals.supabase.auth.getUser()`
- Obsługa błędów API w fazie SSR

**Typy:**

- `SetListResponse` (z API)

**Propsy:**

- Brak (strona główna)

---

### 4.2 AppLayout (Svelte)

**Opis:**
Współdzielony layout aplikacji zawierający nagłówek, sloty dla treści specyficznych dla widoku oraz globalne komponenty UI (preloader, toasty). Zarządza globalnym stanem UI przez Svelte stores dostępne dla wszystkich widoków potomnych.

**Główne elementy:**

- `<Header>` - nagłówek z zegarem, przełącznikiem motywu i slotem kontekstowym
- `<slot>` - główny slot dla treści widoku
- `<GlobalPreloader>` - pełnoekranowy overlay (reaguje na `$globalLoadingStore`)
- `<ToastStack>` - stos powiadomień (reaguje na `$toastsStore`)

**Obsługiwane zdarzenia:**

- Subskrypcja zmian w `globalLoadingStore` i `toastsStore`
- Przekazywanie callbacków do zarządzania toastami i preloaderem

**Warunki walidacji:**

- Brak (kontener pasywny)

**Typy:**

- `Toast[]` (ze store)
- `boolean` (globalLoading ze store)

**Propsy:**

```typescript
interface AppLayoutProps {
  // Opcjonalnie: dodatkowa konfiguracja layoutu
}
```

**Sloty:**

- `header-left` - kontekstowy slot w nagłówku (np. AccountButton, SetSelect)
- `default` - główna treść widoku

---

### 4.3 SetsDashboard (Svelte)

**Opis:**
Główny komponent interaktywny zarządzający stanem widoku zestawów, operacjami CRUD i komunikacją z API. Orkiestruje wszystkie operacje: tworzenie, edycję, usuwanie zestawów. Komunikuje się z globalnym stanem UI przez Svelte stores (toasty, preloader).

**Główne elementy:**

- `<DashboardGrid>` - kontener siatki
- `<ConfirmDialog>` - dialog potwierdzenia

**Obsługiwane zdarzenia:**

- `handleCreateSet(name: string)` - tworzenie nowego zestawu
- `handleUpdateSet(setId: string, name: string)` - zmiana nazwy zestawu
- `handleDeleteSet(setId: string)` - usuwanie zestawu
- `handleNavigateToSet(setId: string)` - nawigacja do widoku zestawu

**Warunki walidacji:**

- Limit zestawów: `sets.length < 6` określa widoczność przycisku tworzenia
- Walidacja nazwy delegowana do komponentów potomnych

**Typy:**

- `SetDTO[]` (stan zestawów)
- `ConfirmDialogState` (stan dialogu potwierdzenia)

**Propsy:**

```typescript
interface SetsDashboardProps {
  initialSets: SetDTO[]; // Początkowe dane z SSR
  totalCount: number; // Łączna liczba zestawów
}
```

**Wykorzystywane stores:**

- `globalLoadingStore` - ustawianie stanu ładowania podczas POST/DELETE
- `toastsStore` - dodawanie powiadomień (sukces/błąd)

---

### 4.4 AccountButton (Svelte)

**Opis:**
Przycisk nawigacyjny umożliwiający przejście do widoku zarządzania kontem użytkownika. Umieszczony w lewym slocie nagłówka. Wykorzystuje komponent bazowy `IconButton`.

**Główne elementy:**

- `<IconButton>` - komponent bazowy
  - Props: `icon="account_circle"`, `title="Konto"`, `variant="ghost"`
  - Ikona z Material Symbols

**Obsługiwane zdarzenia:**

- `click` → nawigacja do `/account`

**Warunki walidacji:**

- Brak

**Typy:**

- Brak

**Propsy:**

- Brak

**Wykorzystywane komponenty bazowe:**

- `IconButton` (`src/components/base/IconButton.svelte`)

---

### 4.5 DashboardGrid (Svelte)

**Opis:**
Kontener siatki CSS Grid przyjmujący komponenty potomne (karty zestawów + przycisk tworzenia). Odpowiedzialny za responsywny układ i automatyczne dopasowanie kolumn.

**Główne elementy:**

- `<div>` z klasą CSS implementującą Grid
- Slot dla komponentów potomnych
- CSS: `display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem;`

**Obsługiwane zdarzenia:**

- Brak (kontener pasywny)

**Warunki walidacji:**

- Brak

**Typy:**

- Brak

**Propsy:**

```typescript
interface DashboardGridProps {
  // Przyjmuje dzieci przez slot
}
```

---

### 4.6 SetCard (Svelte)

**Opis:**
Karta pojedynczego zestawu wyświetlająca nazwę, liczbę elementów oraz umożliwiająca operacje: edycję nazwy (inline), usunięcie i nawigację do szczegółów. Edycja odbywa się w trybie inline z lokalnym loaderem podczas zapisu. Wykorzystuje komponenty bazowe do zachowania spójności UI.

**Główne elementy:**

- `<Card>` - komponent bazowy kontenera karty
  - Props: `title={set.name}` (lub edytowalna nazwa w trybie edycji)
  - Slot `actions`: przycisk przejścia do widoku zestawu
    - `<IconButton icon="visibility" title="Zobacz zestaw" variant="default" onClick={onNavigate} />`
  - Slot `deleteAction`: przycisk usuwania
    - `<IconButton icon="delete" title="Usuń" variant="inverted" onClick={handleDelete} />`
- `<form>` - formularz edycji nazwy (inline, w treści karty poniżej nagłówka)
  - W trybie edycji:
    - `<TextInput>` - komponent bazowy pola tekstowego
      - Props: `type="text"`, `maxlength="10"`, `pattern=".*\S.*"`, `required`
    - `<IconButton>` - zapisz (submit)
      - Props: `icon="check"`, `title="Zapisz"`, `type="submit"`, `variant="default"`
    - `<IconButton>` - anuluj (reset)
      - Props: `icon="close"`, `title="Anuluj"`, `type="reset"`, `variant="inverted"`
- `<div>` - wyświetlacz liczby elementów (w treści karty)
- `<div>` - lokalny loader (spinner) podczas PATCH (w treści karty)

**Obsługiwane zdarzenia:**

1. **Aktywacja edycji**: kliknięcie w nazwę → tryb edycji (input staje się edytowalny)
2. **Submit formularza**: Enter lub blur → wysłanie PATCH → aktualizacja listy
3. **Reset formularza**: przycisk reset lub Escape → anulowanie edycji, powrót do wartości oryginalnej
4. **Usunięcie**: przycisk delete → wywołanie callbacku `onDelete` → otwarcie dialogu potwierdzenia
5. **Nawigacja**: kliknięcie w kartę (poza akcjami) → `onNavigate(setId)`

**Warunki walidacji:**

- `required` - nazwa nie może być pusta
- `maxlength="10"` - limit 10 znaków
- `pattern=".*\S.*"` - przynajmniej jeden znak nie będący białym znakiem (blokuje same spacje)
- Walidacja HTML5 blokuje submit przy niepoprawnych danych
- Komunikaty błędów wyświetlane natywnie przez przeglądarkę przy polu

**Typy:**

- `SetDTO` (props.set)
- `UpdateSetCommand` (wysyłany do API)

**Propsy:**

```typescript
interface SetCardProps {
  set: SetDTO; // Dane zestawu
  onUpdate: (setId: string, name: string) => Promise<void>; // Callback edycji
  onDelete: (setId: string) => void; // Callback usunięcia (otwiera dialog)
  onNavigate: (setId: string) => void; // Callback nawigacji
}
```

**Stan wewnętrzny:**

```typescript
{
  isEditing: boolean; // Tryb edycji aktywny
  isLoading: boolean; // Lokalny loader podczas PATCH
  editedName: string; // Wartość pola input podczas edycji
}
```

**Wykorzystywane komponenty bazowe:**

- `Card` (`src/components/base/Card.svelte`)
- `TextInput` (`src/components/base/TextInput.svelte`)
- `IconButton` (`src/components/base/IconButton.svelte`)

---

### 4.7 CreateSetButton (Svelte)

**Opis:**
Duży przycisk otwierający dialog z formularzem tworzenia nowego zestawu. Widoczny tylko gdy użytkownik ma mniej niż 6 zestawów. Dialog zawiera formularz z walidacją HTML5. Wykorzystuje komponenty bazowe.

**Główne elementy:**

- `<IconButton>` - główny przycisk otwierający dialog
  - Props: `icon="add"`, `title="Dodaj zestaw"`, `variant="default"`, `size="large"`
  - Stylizacja: większy, wyróżniony (np. border-dashed), wypełniający całą komórkę grida
- `<Dialog>` - komponent bazowy dialogu
  - Props: `isOpen={isDialogOpen}`, `title="Nowy zestaw"`
  - `<form method="dialog">` - formularz z automatycznym zamknięciem
    - `<TextInput>` - pole nazwy
      - Props: `type="text"`, `name="name"`, `placeholder="Nazwa zestawu"`, `maxlength="10"`, `pattern=".*\S.*"`, `required`, `autofocus`
    - `<Button>` - zapisz
      - Props: `type="submit"`, `variant="primary"`, `disabled={isLoading}`
    - `<Button>` - anuluj
      - Props: `type="button"`, `variant="secondary"`, `onClick={closeDialog}`

**Obsługiwane zdarzenia:**

1. **Otwarcie dialogu**: kliknięcie przycisku → `dialog.showModal()`
2. **Submit formularza**: Enter lub przycisk submit → `POST /api/sets` → wywołanie `onCreate` → zamknięcie dialogu
3. **Anulowanie**: przycisk cancel lub Escape → zamknięcie dialogu bez akcji
4. **Zamknięcie dialogu**: po sukcesie lub anulowaniu → reset formularza

**Warunki walidacji:**

- `required` - nazwa nie może być pusta
- `maxlength="10"` - limit 10 znaków
- `pattern=".*\S.*"` - przynajmniej jeden znak nie będący białym znakiem
- Walidacja HTML5 blokuje submit przy niepoprawnych danych
- Komunikaty błędów wyświetlane natywnie przez przeglądarkę przy polu

**Typy:**

- `CreateSetCommand` (wysyłany do API)

**Propsy:**

```typescript
interface CreateSetButtonProps {
  onCreate: (name: string) => Promise<void>; // Callback tworzenia
  disabled: boolean; // Blokada gdy >= 6 zestawów
}
```

**Stan wewnętrzny:**

```typescript
{
  isDialogOpen: boolean; // Stan otwarcia dialogu
  newSetName: string; // Wartość pola input
  isLoading: boolean; // Stan ładowania podczas tworzenia
}
```

**Wykorzystywane komponenty bazowe:**

- `IconButton` (`src/components/base/IconButton.svelte`)
- `Dialog` (`src/components/base/Dialog.svelte`)
- `TextInput` (`src/components/base/TextInput.svelte`)
- `Button` (`src/components/base/Button.svelte`)

---

### 4.8 GlobalPreloader (Svelte)

**Opis:**
Pełnoekranowy overlay z loaderem wyświetlany podczas operacji POST (tworzenie) i DELETE (usuwanie). Blokuje interakcję z interfejsem, ale nie zatrzymuje cyklicznego odświeżania danych (w innych widokach). Zarządzany przez `globalLoadingStore` - subskrybuje stan i automatycznie pokazuje/ukrywa się.

**Główne elementy:**

- `<div>` - pełnoekranowy overlay (position: fixed, z-index wysoki)
- `<div>` - spinner/loader (animacja CSS)
- Opcjonalnie: tekst "Ładowanie..."

**Obsługiwane zdarzenia:**

- Subskrypcja `globalLoadingStore` (reaktywność)

**Warunki walidacji:**

- Brak

**Typy:**

- Brak

**Propsy:**

- Brak (stan ze store)

**Wykorzystywane stores:**

- `globalLoadingStore` - subskrypcja `$globalLoadingStore` określa widoczność

---

### 4.9 ToastStack (Svelte)

**Opis:**
Kontener powiadomień typu toast wyświetlający komunikaty sukcesu, błędów i informacji. Toasty błędów są persistent (wymagają ręcznego zamknięcia), toasty sukcesu auto-dismiss po ~3 sekundach. Nowe toasty pojawiają się na dole stosu. Zarządzany przez `toastsStore` - subskrybuje listę toastów i automatycznie wyświetla/ukrywa.

**Główne elementy:**

- `<div>` - kontener stosu (position: fixed, prawy górny róg)
- `<div>` × N - pojedyncze toasty
  - Ikona (zależna od typu: success ✓, error ✗, info ℹ, warning ⚠)
  - Tekst komunikatu
  - Przycisk zamknięcia (dla persistent) lub auto-dismiss (dla success)
  - Animacje wejścia/wyjścia (CSS transitions)

**Obsługiwane zdarzenia:**

1. **Zamknięcie toasta**: kliknięcie X → wywołanie `removeToast(toastId)` z store
2. **Auto-dismiss**: setTimeout po 3s dla toastów typu success/info → automatyczne wywołanie `removeToast`
3. **Subskrypcja**: reaktywność na zmiany w `$toastsStore`

**Warunki walidacji:**

- Brak

**Typy:**

- `Toast[]` (ze store)

**Propsy:**

- Brak (stan ze store)

**Wykorzystywane stores:**

- `toastsStore` - subskrypcja `$toastsStore` dostarcza listę aktywnych toastów

---

### 4.10 ConfirmDialog (Svelte)

**Opis:**
Dialog potwierdzenia używany przed usunięciem zestawu. Wyświetla komunikat z pytaniem i dwa przyciski: potwierdzenie i anulowanie. Zapewnia poprawne zarządzanie focusem zgodnie z WCAG. Wykorzystuje komponenty bazowe.

**Główne elementy:**

- `<Dialog>` - komponent bazowy dialogu
  - Props: `isOpen`, `title` (np. "Potwierdzenie")
  - `<p>` - komunikat (np. "Czy na pewno chcesz usunąć zestaw '{name}'?")
  - `<div>` - kontener przycisków
    - `<Button>` - Potwierdź
      - Props: `type="button"`, `variant="danger"`, `onClick={onConfirm}`
    - `<Button>` - Anuluj
      - Props: `type="button"`, `variant="ghost"`, `onClick={onCancel}`

**Obsługiwane zdarzenia:**

1. **Potwierdzenie**: przycisk confirm → wywołanie `onConfirm()` → zamknięcie dialogu
2. **Anulowanie**: przycisk cancel lub Escape → wywołanie `onCancel()` → zamknięcie dialogu

**Warunki walidacji:**

- Brak

**Typy:**

- Brak (prosty callback)

**Propsy:**

```typescript
interface ConfirmDialogProps {
  isOpen: boolean; // Stan otwarcia
  title: string; // Tytuł dialogu
  message: string; // Treść pytania
  confirmText?: string; // Tekst przycisku potwierdzenia (domyślnie "Usuń")
  cancelText?: string; // Tekst przycisku anulowania (domyślnie "Anuluj")
  onConfirm: () => void; // Callback potwierdzenia
  onCancel: () => void; // Callback anulowania
}
```

**Wykorzystywane komponenty bazowe:**

- `Dialog` (`src/components/base/Dialog.svelte`)
- `Button` (`src/components/base/Button.svelte`)

---

## 5. Typy

### 5.1 Istniejące typy z API (src/types.ts)

**SetDTO** - podstawowy obiekt zestawu zwracany przez API

```typescript
interface SetDTO {
  id: string; // UUID zestawu
  name: string; // Nazwa (1-10 znaków, trimmed)
  user_id: string; // ID właściciela
  item_count: number; // Liczba elementów w zestawie
  created_at?: string; // Opcjonalna data utworzenia (ISO 8601)
}
```

**SetListResponse** - odpowiedź GET /api/sets

```typescript
interface SetListResponse {
  sets: SetDTO[]; // Lista zestawów użytkownika
  total_count: number; // Łączna liczba zestawów
}
```

**CreateSetResponse** - odpowiedź POST /api/sets

```typescript
interface CreateSetResponse {
  sets: SetDTO[]; // Zaktualizowana lista wszystkich zestawów
  created_set: Pick<SetDTO, "id" | "name">; // Nowo utworzony zestaw
}
```

**UpdateSetResponse** - odpowiedź PATCH /api/sets/{setId}

```typescript
interface UpdateSetResponse {
  sets: SetDTO[]; // Zaktualizowana lista wszystkich zestawów
  updated_set: Pick<SetDTO, "id" | "name">; // Zaktualizowany zestaw
}
```

**DeleteSetResponse** - odpowiedź DELETE /api/sets/{setId}

```typescript
interface DeleteSetResponse {
  sets: SetDTO[]; // Zaktualizowana lista pozostałych zestawów
  deleted_set_id: string; // ID usuniętego zestawu
}
```

**CreateSetCommand** - dane wejściowe dla tworzenia zestawu

```typescript
interface CreateSetCommand {
  name: string; // Nazwa zestawu (1-10 znaków po trim)
}
```

**UpdateSetCommand** - dane wejściowe dla aktualizacji zestawu

```typescript
interface UpdateSetCommand {
  name: string; // Nowa nazwa zestawu (1-10 znaków po trim)
}
```

**ErrorResponse** - standardowa odpowiedź błędu

```typescript
interface ErrorResponse {
  code: string; // Kod błędu (np. "MAX_SETS_PER_USER_EXCEEDED")
  message: string; // Komunikat czytelny dla użytkownika
  details?: unknown; // Opcjonalne szczegóły
}
```

### 5.2 Nowe typy specyficzne dla widoku

**Toast** - reprezentacja powiadomienia w interfejsie

```typescript
interface Toast {
  id: string; // Unikalny identyfikator (np. timestamp + random)
  type: "success" | "error" | "info" | "warning"; // Typ powiadomienia (wpływa na styl)
  message: string; // Treść komunikatu
  autoDismiss: boolean; // Czy automatycznie zamknąć (true dla success/info)
}
```

**ConfirmDialogState** - stan dialogu potwierdzenia w SetsDashboard

```typescript
interface ConfirmDialogState {
  isOpen: boolean; // Czy dialog jest otwarty
  title: string; // Tytuł dialogu
  message: string; // Treść pytania
  onConfirm: () => void; // Callback wykonywany po potwierdzeniu
}
```

**SetCardState** - wewnętrzny stan komponentu SetCard

```typescript
interface SetCardState {
  isEditing: boolean; // Tryb edycji aktywny
  isLoading: boolean; // Lokalny loader (podczas PATCH)
  editedName: string; // Wartość pola input w trybie edycji
  originalName: string; // Oryginalna nazwa (do reset)
}
```

**SetsDashboardState** - stan głównego komponentu widoku

```typescript
interface SetsDashboardState {
  sets: SetDTO[]; // Lista zestawów
  confirmDialog: ConfirmDialogState; // Stan dialogu potwierdzenia
}
```

### 5.3 Typy dla Svelte stores

**GlobalLoadingStore** - typ store dla globalnego stanu ładowania

```typescript
import type { Writable } from "svelte/store";

type GlobalLoadingStore = Writable<boolean>;
```

**ToastsStore** - typ store dla kolejki powiadomień z metodami pomocniczymi

```typescript
import type { Writable } from "svelte/store";

interface ToastsStoreValue {
  toasts: Toast[];
}

interface ToastsStore extends Writable<Toast[]> {
  addToast: (type: Toast["type"], message: string) => void;
  removeToast: (id: string) => void;
}
```

---

## 6. Zarządzanie stanem

### 6.0 Svelte Stores - stan globalny UI

Aplikacja wykorzystuje **Svelte stores** do zarządzania globalnym stanem UI (preloader, toasty). Stores są zdefiniowane w dedykowanych plikach i dostępne dla wszystkich komponentów.

**Lokalizacja:** `src/lib/stores/`

#### globalLoadingStore

**Plik:** `src/lib/stores/global-loading.store.ts`

**Opis:** Prosty store boolean zarządzający stanem pełnoekranowego preloadera.

**Implementacja:**

```typescript
import { writable } from "svelte/store";

export const globalLoadingStore = writable<boolean>(false);

// Pomocnicze funkcje
export function setGlobalLoading(isLoading: boolean) {
  globalLoadingStore.set(isLoading);
}
```

**Użycie:**

```typescript
// Włączenie preloadera
setGlobalLoading(true);

// Wyłączenie preloadera
setGlobalLoading(false);

// W komponencie (reaktywność)
$: isLoading = $globalLoadingStore;
```

#### toastsStore

**Plik:** `src/lib/stores/toasts.store.ts`

**Opis:** Store zarządzający kolejką powiadomień z metodami do dodawania i usuwania toastów.

**Implementacja:**

```typescript
import { writable } from "svelte/store";
import type { Toast } from "../../types";

function createToastsStore() {
  const { subscribe, update } = writable<Toast[]>([]);

  return {
    subscribe,
    addToast: (type: Toast["type"], message: string) => {
      const id = `${Date.now()}-${Math.random()}`;
      const autoDismiss = type === "success" || type === "info";
      const toast: Toast = { id, type, message, autoDismiss };

      update((toasts) => [...toasts, toast]);

      // Auto-dismiss po 3 sekundach dla success/info
      if (autoDismiss) {
        setTimeout(() => {
          update((toasts) => toasts.filter((t) => t.id !== id));
        }, 3000);
      }

      return id;
    },
    removeToast: (id: string) => {
      update((toasts) => toasts.filter((t) => t.id !== id));
    },
  };
}

export const toastsStore = createToastsStore();
```

**Użycie:**

```typescript
// Dodanie toasta sukcesu (auto-dismiss)
toastsStore.addToast("success", "Zestaw utworzony pomyślnie");

// Dodanie toasta błędu (persistent)
toastsStore.addToast("error", "Wystąpił błąd");

// Ręczne usunięcie toasta
toastsStore.removeToast(toastId);

// W komponencie (reaktywność)
$: toasts = $toastsStore;
```

---

### 6.1 Strategia zarządzania stanem

Aplikacja wykorzystuje **hybrydowe podejście** do zarządzania stanem:

- **Svelte stores** dla globalnego stanu UI (preloader, toasty) - współdzielone między wszystkimi widokami
- **Lokalny stan komponentów** dla danych specyficznych dla widoku (lista zestawów, stan dialogów)
- **Props drilling** dla przekazywania danych i callbacków między komponentami w hierarchii

### 6.2 Przepływ danych

1. **SSR (DashboardPage - Astro)**:
   - Wywołanie `GET /api/sets` w fazie renderowania
   - Pobranie `SetListResponse`
   - Przekazanie `initialSets` i `totalCount` do `SetsDashboard` (w `AppLayout`)

2. **Globalny stan UI (Svelte stores)**:
   - `globalLoadingStore`: zarządzany przez `SetsDashboard` i `AppLayout`
   - `toastsStore`: zarządzany przez `SetsDashboard`, konsumowany przez `ToastStack` w `AppLayout`

3. **CSR (SetsDashboard - Svelte)**:
   - Inicjalizacja stanu z `initialSets`
   - Zarządzanie stanem lokalnym: `sets`, `confirmDialog`
   - Obsługa wszystkich mutacji (CREATE, UPDATE, DELETE)
   - Po każdej mutacji:
     - Aktualizacja `sets` na podstawie `response.sets` z API
     - Wywołanie `setGlobalLoading(true/false)` dla preloadera
     - Wywołanie `toastsStore.addToast(...)` dla powiadomień

4. **Komponenty potomne**:
   - `SetCard`: lokalny stan edycji (`isEditing`, `isLoading`, `editedName`)
   - `CreateSetButton`: lokalny stan dialogu (`isOpen`, `newSetName`)
   - Callbacki przekazywane z `SetsDashboard` w dół

5. **Komponenty globalne w AppLayout**:
   - `GlobalPreloader`: subskrybuje `$globalLoadingStore`
   - `ToastStack`: subskrybuje `$toastsStore`

### 6.3 Stan w SetsDashboard

```typescript
// Import stores
import { setGlobalLoading } from "$lib/stores/global-loading.store";
import { toastsStore } from "$lib/stores/toasts.store";

// Stan lokalny reaktywny w Svelte
let sets: SetDTO[] = initialSets;
let confirmDialog: ConfirmDialogState = {
  isOpen: false,
  title: "",
  message: "",
  onConfirm: () => {},
};

// Globalny stan UI zarządzany przez stores (nie trzymany lokalnie)
// setGlobalLoading(true/false) - dla preloadera
// toastsStore.addToast(type, message) - dla powiadomień
```

### 6.4 Aktualizacja stanu po mutacjach

Wszystkie endpointy mutacyjne (POST, PATCH, DELETE) zwracają zaktualizowaną listę wszystkich zestawów w polu `sets`. Upraszcza to zarządzanie stanem:

```typescript
// Przykład: po utworzeniu zestawu
setGlobalLoading(true); // Store: włączenie preloadera
try {
  const response: CreateSetResponse = await createSet(name);
  sets = response.sets; // Lokalny stan: całkowite zastąpienie listy
  toastsStore.addToast("success", "Zestaw utworzony"); // Store: dodanie toasta
} catch (error) {
  toastsStore.addToast("error", "Błąd tworzenia zestawu"); // Store: toast błędu
} finally {
  setGlobalLoading(false); // Store: wyłączenie preloadera
}
```

Nie ma potrzeby manualnego dodawania/usuwania/aktualizowania pojedynczych elementów — API zwraca zawsze pełny, aktualny obraz.

### 6.5 Custom hooki

Na obecnym etapie **nie są wymagane custom hooki**. Jeśli w przyszłości logika API stanie się bardziej skomplikowana lub będzie potrzebna w wielu miejscach, można rozważyć ekstrakcję do composables/hooks:

```typescript
// Przyszła możliwość: extracting API logic
// src/lib/hooks/useSets.ts
export function useSets() {
  async function createSet(name: string) { ... }
  async function updateSet(id: string, name: string) { ... }
  async function deleteSet(id: string) { ... }
  return { createSet, updateSet, deleteSet };
}
```

---

## 7. Integracja API

### 7.1 Endpointy wykorzystywane przez widok

| Metoda | Endpoint            | Opis                      | Request            | Response            |
| ------ | ------------------- | ------------------------- | ------------------ | ------------------- |
| GET    | `/api/sets`         | Pobranie listy zestawów   | -                  | `SetListResponse`   |
| POST   | `/api/sets`         | Utworzenie nowego zestawu | `CreateSetCommand` | `CreateSetResponse` |
| PATCH  | `/api/sets/{setId}` | Zmiana nazwy zestawu      | `UpdateSetCommand` | `UpdateSetResponse` |
| DELETE | `/api/sets/{setId}` | Usunięcie zestawu         | -                  | `DeleteSetResponse` |

### 7.2 Wywołania API w komponentach

#### GET /api/sets (SSR - DashboardPage)

**Kiedy:** Podczas renderowania strony po stronie serwera

**Request:**

- Method: GET
- Headers: `Authorization: Bearer {token}` (automatycznie przez Supabase client)
- Query params: brak (lub `include_items=false` domyślnie)

**Response (200 OK):**

```typescript
{
  sets: SetDTO[];
  total_count: number;
}
```

**Obsługa błędów:**

- 401 Unauthorized → redirect do `/login`
- 500 Internal Server Error → wyświetlenie strony błędu

**Implementacja w Astro:**

```typescript
// src/pages/dashboard.astro
const { data: setsData, error } = await supabase.from("sets").select("*, set_items(count)");
// ... lub wywołanie fetch do /api/sets
```

---

#### POST /api/sets (CSR - CreateSetButton → SetsDashboard)

**Kiedy:** Po zatwierdzeniu formularza tworzenia zestawu

**Request:**

- Method: POST
- Headers: `Content-Type: application/json`, `Authorization: Bearer {token}`
- Body:
  ```typescript
  {
    name: string; // 1-10 znaków po trim
  }
  ```

**Response (201 Created):**

```typescript
{
  sets: SetDTO[];                         // Zaktualizowana lista
  created_set: { id: string, name: string }  // Nowo utworzony
}
```

**Obsługa błędów:**

- 400 Bad Request (INVALID_SET_NAME) → toast: komunikat z API
- 400 Bad Request (MAX_SETS_PER_USER_EXCEEDED) → toast: "Osiągnięto limit 6 zestawów"
- 409 Conflict (DUPLICATE_SET_NAME) → toast: "Zestaw o tej nazwie już istnieje"
- 401 Unauthorized → redirect do `/login`
- 500 Internal Server Error → toast: "Wystąpił błąd serwera. Spróbuj ponownie."

**Implementacja:**

```typescript
async function handleCreateSet(name: string) {
  setGlobalLoading(true); // Store: włączenie globalnego preloadera
  try {
    const response = await fetch("/api/sets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      toastsStore.addToast("error", error.message); // Store: toast błędu
      return;
    }

    const data: CreateSetResponse = await response.json();
    sets = data.sets; // Lokalny stan: aktualizacja listy
    toastsStore.addToast("success", `Utworzono zestaw "${data.created_set.name}"`); // Store: toast sukcesu
  } catch (err) {
    toastsStore.addToast("error", "Brak połączenia z serwerem"); // Store: toast błędu
  } finally {
    setGlobalLoading(false); // Store: wyłączenie globalnego preloadera
  }
}
```

---

#### PATCH /api/sets/{setId} (CSR - SetCard → SetsDashboard)

**Kiedy:** Po zatwierdzeniu edycji nazwy zestawu (Enter lub blur)

**Request:**

- Method: PATCH
- Headers: `Content-Type: application/json`, `Authorization: Bearer {token}`
- URL params: `setId` (UUID)
- Body:
  ```typescript
  {
    name: string; // 1-10 znaków po trim
  }
  ```

**Response (200 OK):**

```typescript
{
  sets: SetDTO[];                         // Zaktualizowana lista
  updated_set: { id: string, name: string }  // Zaktualizowany
}
```

**Obsługa błędów:**

- 400 Bad Request (INVALID_SET_NAME) → toast: komunikat z API
- 404 Not Found (SET_NOT_FOUND) → toast: "Zestaw nie istnieje", odświeżenie listy
- 409 Conflict (DUPLICATE_SET_NAME) → toast: "Zestaw o tej nazwie już istnieje"
- 401 Unauthorized → redirect do `/login`
- 500 Internal Server Error → toast: "Wystąpił błąd serwera. Spróbuj ponownie."

**Implementacja:**

```typescript
async function handleUpdateSet(setId: string, name: string) {
  // Uwaga: isLoading w SetCard (lokalny stan karty, nie globalny preloader)
  try {
    const response = await fetch(`/api/sets/${setId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      toastsStore.addToast("error", error.message); // Store: toast błędu
      return;
    }

    const data: UpdateSetResponse = await response.json();
    sets = data.sets; // Lokalny stan: aktualizacja listy
    toastsStore.addToast("success", `Zmieniono nazwę na "${data.updated_set.name}"`); // Store: toast sukcesu
  } catch (err) {
    toastsStore.addToast("error", "Brak połączenia z serwerem"); // Store: toast błędu
  }
}
```

---

#### DELETE /api/sets/{setId} (CSR - SetCard → ConfirmDialog → SetsDashboard)

**Kiedy:** Po potwierdzeniu usunięcia w dialogu

**Request:**

- Method: DELETE
- Headers: `Authorization: Bearer {token}`
- URL params: `setId` (UUID)
- Body: brak

**Response (200 OK):**

```typescript
{
  sets: SetDTO[];           // Zaktualizowana lista pozostałych
  deleted_set_id: string;   // UUID usuniętego zestawu
}
```

**Obsługa błędów:**

- 404 Not Found (SET_NOT_FOUND) → toast: "Zestaw nie istnieje", odświeżenie listy
- 401 Unauthorized → redirect do `/login`
- 500 Internal Server Error → toast: "Wystąpił błąd serwera. Spróbuj ponownie."

**Implementacja:**

```typescript
async function handleDeleteSet(setId: string) {
  setGlobalLoading(true); // Store: włączenie globalnego preloadera
  try {
    const response = await fetch(`/api/sets/${setId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      toastsStore.addToast("error", error.message); // Store: toast błędu
      return;
    }

    const data: DeleteSetResponse = await response.json();
    sets = data.sets; // Lokalny stan: aktualizacja listy
    toastsStore.addToast("success", "Zestaw został usunięty"); // Store: toast sukcesu
  } catch (err) {
    toastsStore.addToast("error", "Brak połączenia z serwerem"); // Store: toast błędu
  } finally {
    setGlobalLoading(false); // Store: wyłączenie globalnego preloadera
  }
}
```

---

## 8. Interakcje użytkownika

### 8.1 Przeglądanie listy zestawów

**Akcja:** Użytkownik wchodzi na `/dashboard`

**Przepływ:**

1. SSR guard weryfikuje sesję
2. Pobieranie danych `GET /api/sets`
3. Renderowanie strony z listą zestawów
4. Wyświetlenie kart zestawów w siatce CSS Grid
5. Każda karta pokazuje: nazwę zestawu, liczbę elementów, akcje (edytuj, usuń, otwórz)

**Wynik:** Użytkownik widzi wszystkie swoje zestawy (0-6) w formie kart

---

### 8.2 Tworzenie nowego zestawu

**Akcja:** Kliknięcie przycisku "Dodaj zestaw" (widoczny gdy `sets.length < 6`)

**Przepływ:**

1. Kliknięcie → otwarcie dialogu `<dialog>.showModal()`
2. Focus automatycznie na polu input
3. Użytkownik wpisuje nazwę (1-10 znaków)
4. Walidacja HTML5 w czasie rzeczywistym (maxlength, pattern, required)
5. Submit formularza (Enter lub przycisk "Zapisz"):
   - Walidacja natywna — jeśli błąd, blokada submit z komunikatem
   - Jeśli OK → `POST /api/sets` z `setGlobalLoading(true)` (store)
6. Oczekiwanie na odpowiedź (globalny preloader widoczny w AppLayout)
7. Sukces:
   - Aktualizacja `sets` z `response.sets` (lokalny stan)
   - Toast sukcesu przez `toastsStore.addToast('success', ...)` (store)
   - Zamknięcie dialogu, reset formularza
8. Błąd:
   - Toast błędu przez `toastsStore.addToast('error', ...)` (store)
   - Dialog pozostaje otwarty

**Wynik:** Nowy zestaw pojawia się na liście, użytkownik może kontynuować

---

### 8.3 Zmiana nazwy zestawu (inline edit)

**Akcja:** Kliknięcie w nazwę zestawu na karcie

**Przepływ:**

1. Kliknięcie → aktywacja trybu edycji (`isEditing = true`)
2. Input staje się edytowalny, focus na polu
3. Użytkownik zmienia nazwę
4. Walidacja HTML5 w czasie rzeczywistym
5. Submit (Enter lub blur):
   - Jeśli nazwa się nie zmieniła → wyjście z trybu edycji bez zapisu
   - Jeśli zmieniona → lokalny loader (`isLoading = true` w karcie)
   - `PATCH /api/sets/{setId}` z nową nazwą
6. Oczekiwanie na odpowiedź (spinner w karcie, nie globalny preloader)
7. Sukces:
   - Aktualizacja `sets` z `response.sets` (lokalny stan)
   - Toast sukcesu przez `toastsStore.addToast('success', ...)` (store)
   - Wyjście z trybu edycji (`isEditing = false`)
8. Błąd:
   - Toast błędu przez `toastsStore.addToast('error', ...)` (store)
   - Tryb edycji pozostaje aktywny, użytkownik może poprawić

**Alternatywny przepływ - anulowanie:**

1. W trybie edycji: kliknięcie przycisku Reset (✗) lub naciśnięcie Escape
2. Przywrócenie oryginalnej nazwy
3. Wyjście z trybu edycji bez zapisu

**Wynik:** Nazwa zestawu zaktualizowana w liście i w UI

---

### 8.4 Usuwanie zestawu

**Akcja:** Kliknięcie ikony usunięcia (🗑️) na karcie zestawu

**Przepływ:**

1. Kliknięcie → otwarcie dialogu potwierdzenia
2. Dialog wyświetla: "Czy na pewno chcesz usunąć zestaw '{name}'?"
3. Użytkownik wybiera:
   - **Potwierdź**:
     - Zamknięcie dialogu
     - Globalny preloader przez `setGlobalLoading(true)` (store, widoczny w AppLayout)
     - `DELETE /api/sets/{setId}`
     - Oczekiwanie na odpowiedź
     - Sukces:
       - Aktualizacja `sets` z `response.sets` (lokalny stan)
       - Toast sukcesu przez `toastsStore.addToast('success', ...)` (store)
       - Karta znika z listy (reaktywnie)
     - Błąd:
       - Toast błędu przez `toastsStore.addToast('error', ...)` (store)
   - **Anuluj** lub Escape:
     - Zamknięcie dialogu bez akcji

**Wynik:** Zestaw usunięty, lista zaktualizowana, karta znika z UI

---

### 8.5 Nawigacja do widoku zestawu

**Akcja:** Kliknięcie w kartę zestawu (poza akcjami edycji/usunięcia)

**Przepływ:**

1. Kliknięcie → wywołanie `onNavigate(setId)`
2. Nawigacja do `/dashboard/{setId}` (używając Astro routing lub `window.location`)

**Wynik:** Przejście do widoku szczegółów zestawu z listą przystanków

---

### 8.6 Nawigacja do widoku konta

**Akcja:** Kliknięcie przycisku "Konto" w nagłówku

**Przepływ:**

1. Kliknięcie → nawigacja do `/account`

**Wynik:** Przejście do widoku zarządzania kontem

---

## 9. Warunki i walidacja

### 9.1 Warunki weryfikowane przez interfejs

#### 9.1.1 Limit liczby zestawów (max 6)

**Gdzie:** `SetsDashboard` → `CreateSetButton`

**Warunek:** `sets.length < 6`

**Wpływ na UI:**

- Jeśli `false` → przycisk "Dodaj zestaw" ukryty
- Jeśli `true` → przycisk widoczny i aktywny

**Implementacja:**

```svelte
{#if sets.length < 6}
  <CreateSetButton onCreate={handleCreateSet} disabled={false} />
{/if}
```

**Przypadek brzegowy:** API może zwrócić błąd `MAX_SETS_PER_USER_EXCEEDED` jeśli mimo ukrycia przycisku użytkownik wyśle request (np. przez devtools). UI obsługuje to przez toast.

---

#### 9.1.2 Walidacja nazwy zestawu (1-10 znaków, brak pustych/whitespace-only)

**Gdzie:** `SetCard` (edycja), `CreateSetButton` (tworzenie)

**Warunki:**

1. `required` - pole nie może być puste
2. `maxlength="10"` - maksymalnie 10 znaków
3. `pattern=".*\S.*"` - przynajmniej jeden znak nie będący białym znakiem (blokuje same spacje/taby)

**Wpływ na UI:**

- Walidacja HTML5 blokuje submit formularza jeśli warunki nie są spełnione
- Przeglądarka wyświetla natywny komunikat błędu przy polu (np. "Uzupełnij to pole", "Podany tekst nie zgadza się z wymaganym formatem")

**Implementacja:**

```svelte
<input
  type="text"
  name="name"
  bind:value={editedName}
  required
  maxlength="10"
  pattern=".*\S.*"
  title="Nazwa musi mieć od 1 do 10 znaków i zawierać przynajmniej jedną literę lub cyfrę"
/>
```

**Przypadek brzegowy:** Użytkownik wpisuje np. " " (same spacje) — walidacja `pattern` blokuje submit. Jeśli mimo to request dotrze do API, backend zwróci 400 z kodem `INVALID_SET_NAME`, co spowoduje wyświetlenie toasta.

---

#### 9.1.3 Unikalność nazwy zestawu (per użytkownik)

**Gdzie:** Backend API (baza danych)

**Warunek:** Nazwa zestawu (po trim) musi być unikalna w ramach zestawów danego użytkownika

**Wpływ na UI:**

- UI **nie sprawdza** tego przed wysłaniem requestu (brak pre-check)
- Jeśli API zwróci 409 Conflict z kodem `DUPLICATE_SET_NAME`:
  - Toast: "Zestaw o tej nazwie już istnieje"
  - Użytkownik może poprawić nazwę

**Implementacja:**

```typescript
if (response.status === 409) {
  const error: ErrorResponse = await response.json();
  if (error.code === "DUPLICATE_SET_NAME") {
    showToast("error", "Zestaw o tej nazwie już istnieje");
  }
}
```

---

#### 9.1.4 Autoryzacja (użytkownik musi być zalogowany)

**Gdzie:** SSR guard (DashboardPage), API endpoints

**Warunek:** Aktywna sesja użytkownika (Supabase Auth)

**Wpływ na UI:**

- **SSR:** Jeśli brak sesji → redirect do `/login` przed renderowaniem
- **CSR (API):** Jeśli API zwróci 401 Unauthorized → redirect do `/login`

**Implementacja (SSR):**

```typescript
// src/pages/dashboard.astro
const {
  data: { user },
  error,
} = await locals.supabase.auth.getUser();
if (error || !user) {
  return Astro.redirect("/login");
}
```

**Implementacja (CSR):**

```typescript
if (response.status === 401) {
  window.location.href = "/login";
}
```

---

#### 9.1.5 Własność zestawu (użytkownik może edytować/usuwać tylko swoje zestawy)

**Gdzie:** Backend API (RLS - Row Level Security)

**Warunek:** Zestaw musi należeć do zalogowanego użytkownika (`user_id = auth.uid()`)

**Wpływ na UI:**

- UI zakłada, że wszystkie zestawy w liście należą do użytkownika (zapewnione przez API)
- Jeśli użytkownik spróbuje edytować/usunąć cudzy zestaw (np. przez manipulację URL/devtools):
  - API zwróci 404 Not Found z kodem `SET_NOT_FOUND`
  - Toast: "Zestaw nie istnieje"
  - Opcjonalnie: odświeżenie listy

---

### 9.2 Podsumowanie warunków i ich lokalizacji

| Warunek                                | Gdzie weryfikowany | Komponent                | Efekt niepowodzenia                       |
| -------------------------------------- | ------------------ | ------------------------ | ----------------------------------------- |
| `sets.length < 6`                      | Frontend (UI)      | SetsDashboard            | Ukrycie przycisku "Dodaj zestaw"          |
| `name` required, 1-10 chars, non-empty | Frontend (HTML5)   | SetCard, CreateSetButton | Blokada submit, natywny komunikat         |
| Unikalność nazwy                       | Backend (DB)       | API                      | Toast: "Zestaw o tej nazwie już istnieje" |
| Max 6 zestawów                         | Backend (trigger)  | API                      | Toast: "Osiągnięto limit 6 zestawów"      |
| Autoryzacja (sesja)                    | SSR + Backend      | DashboardPage, API       | Redirect do `/login`                      |
| Własność zestawu                       | Backend (RLS)      | API                      | Toast: "Zestaw nie istnieje"              |

---

## 10. Obsługa błędów

### 10.1 Tabela błędów API i reakcji UI

| Status | Kod błędu                    | Scenariusz                                        | Reakcja UI                                                       |
| ------ | ---------------------------- | ------------------------------------------------- | ---------------------------------------------------------------- |
| 400    | `INVALID_SET_NAME`           | Nazwa pusta, > 10 znaków, whitespace-only         | Toast: komunikat z API (np. "Nazwa musi mieć od 1 do 10 znaków") |
| 400    | `MAX_SETS_PER_USER_EXCEEDED` | Próba utworzenia 7. zestawu                       | Toast: "Osiągnięto limit 6 zestawów"                             |
| 400    | `INVALID_INPUT`              | Niepoprawny format UUID lub JSON                  | Toast: "Niepoprawne dane wejściowe"                              |
| 401    | `UNAUTHORIZED`               | Brak/nieprawidłowy token JWT                      | Redirect do `/login`                                             |
| 404    | `SET_NOT_FOUND`              | Zestaw nie istnieje lub nie należy do użytkownika | Toast: "Zestaw nie istnieje", odświeżenie listy                  |
| 409    | `DUPLICATE_SET_NAME`         | Nazwa zestawu już istnieje (po trim)              | Toast: "Zestaw o tej nazwie już istnieje"                        |
| 500    | `INTERNAL_ERROR`             | Nieoczekiwany błąd serwera                        | Toast: "Wystąpił błąd serwera. Spróbuj ponownie."                |
| -      | Network error                | Brak połączenia z internetem                      | Toast: "Brak połączenia z serwerem"                              |

### 10.2 Obsługa błędów w komponentach

#### W DashboardPage (SSR)

```typescript
try {
  const response = await fetch("/api/sets");
  if (response.status === 401) {
    return Astro.redirect("/login");
  }
  if (!response.ok) {
    // Wyświetlenie strony błędu lub fallback
    return Astro.redirect("/error");
  }
  const data: SetListResponse = await response.json();
  // ... render
} catch (error) {
  return Astro.redirect("/error");
}
```

#### W SetsDashboard (CSR)

Wszystkie wywołania API opatrzone są try-catch z mapowaniem błędów i używają stores do zarządzania UI:

```typescript
import { setGlobalLoading } from "$lib/stores/global-loading.store";
import { toastsStore } from "$lib/stores/toasts.store";

async function handleApiCall(apiFunction: () => Promise<Response>, useGlobalLoader = true) {
  if (useGlobalLoader) {
    setGlobalLoading(true); // Store: włączenie globalnego preloadera
  }

  try {
    const response = await apiFunction();

    // Obsługa błędu autoryzacji
    if (response.status === 401) {
      window.location.href = "/login";
      return;
    }

    // Obsługa innych błędów
    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      toastsStore.addToast("error", getErrorMessage(error)); // Store: toast błędu
      return;
    }

    // Sukces
    const data = await response.json();
    return data;
  } catch (err) {
    // Błąd sieci
    toastsStore.addToast("error", "Brak połączenia z serwerem"); // Store: toast błędu
  } finally {
    if (useGlobalLoader) {
      setGlobalLoading(false); // Store: wyłączenie globalnego preloadera
    }
  }
}

function getErrorMessage(error: ErrorResponse): string {
  const messages: Record<string, string> = {
    MAX_SETS_PER_USER_EXCEEDED: "Osiągnięto limit 6 zestawów",
    DUPLICATE_SET_NAME: "Zestaw o tej nazwie już istnieje",
    SET_NOT_FOUND: "Zestaw nie istnieje",
    INVALID_SET_NAME: "Nieprawidłowa nazwa zestawu",
    INTERNAL_ERROR: "Wystąpił błąd serwera. Spróbuj ponownie.",
  };
  return messages[error.code] || error.message || "Wystąpił nieoczekiwany błąd";
}
```

### 10.3 Przypadki brzegowe

1. **Równoczesna edycja tego samego zestawu w dwóch oknach:**
   - Rozwiązanie: Po każdej mutacji API zwraca pełną listę → synchronizacja automatyczna
   - Użytkownik zobaczy najnowszy stan po odświeżeniu lub kolejnej operacji

2. **Utrata połączenia podczas operacji:**
   - Request timeout → catch error → toast "Brak połączenia z serwerem"
   - Użytkownik może spróbować ponownie

3. **Sesja wygasła podczas pracy:**
   - API zwróci 401 → redirect do `/login`
   - Użytkownik musi zalogować się ponownie

4. **Użytkownik próbuje edytować zestaw usunięty przez inne okno:**
   - API zwróci 404 SET_NOT_FOUND
   - Toast: "Zestaw nie istnieje"
   - Odświeżenie listy (fetch GET /api/sets) aby zsynchronizować stan

5. **Walidacja po stronie frontendu ominięta (devtools):**
   - Backend waliduje wszystkie dane niezależnie
   - Błędy backendu mapowane na toasty z komunikatami

---

## 11. Komponenty bazowe wymagane przez widok

Widok Dashboard wykorzystuje zestaw komponentów bazowych, które są cienkim wrapperem nad natywnymi elementami HTML. Zapewniają spójność stylowania, dostępność i obsługę stanów. Wszystkie komponenty bazowe powinny być zaimplementowane przed komponentami widoku.

### 11.1 Button (`src/components/base/Button.svelte`)

**Cel:** Uniwersalny przycisk z wariantami wizualnymi i stanami.

**Props:**

```typescript
interface ButtonProps {
  type?: "button" | "submit" | "reset"; // Typ przycisku (domyślnie 'button')
  variant?: "primary" | "secondary"; // Wariant wizualny (domyślnie 'primary')
  disabled?: boolean; // Stan wyłączenia
  loading?: boolean; // Stan ładowania (pokazuje spinner)
  onClick?: () => void; // Callback kliknięcia
}
```

**Implementacja:**

- Bazuje na `<button>`
- Warianty stylowane przez CSS classes
- Stan `loading` pokazuje spinner i ustawia `disabled`
- Slot dla zawartości (tekst lub ikony)

**Użycie w widoku:**

- `CreateSetButton` - przyciski "Zapisz" i "Anuluj" w dialogu
- `ConfirmDialog` - przyciski "Potwierdź" i "Anuluj"
- Potencjalnie w `SetCard` dla obszaru nawigacji

---

### 11.2 IconButton (`src/components/base/IconButton.svelte`)

**Cel:** Przycisk z ikoną Material Symbols, używany do akcji ikonowych.

**Props:**

```typescript
interface IconButtonProps {
  icon: string; // Nazwa ikony z Material Symbols (np. 'add', 'delete', 'check')
  title: string; // Wymagany atrybut title dla dostępności
  variant?: "default" | "inverted"; // Wariant wizualny (domyślnie 'default')
  size?: "small" | "medium" | "large"; // Rozmiar (domyślnie 'medium')
  type?: "button" | "submit" | "reset"; // Typ przycisku
  disabled?: boolean; // Stan wyłączenia
  onClick?: () => void; // Callback kliknięcia
}
```

**Implementacja:**

- Bazuje na `<button>`
- Renderuje ikonę z Material Symbols: `<span class="material-symbols-outlined">{icon}</span>`
- Import Material Symbols w głównym CSS: `@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined');`
- Atrybut `title` wymagany (walidacja TypeScript lub runtime check)
- Rozmiary kontrolują wielkość ikony (`font-size`) i padding przycisku

**Ikony używane w widoku Dashboard:**

- `account_circle` - przycisk konta
- `add` - tworzenie zestawu
- `check` - zapisz (w edycji nazwy)
- `close` - anuluj (w edycji nazwy)
- `visibility` - przycisk "Zobacz zestaw" (nawigacja do widoku zestawu)
- `delete` - usuń zestaw

**Użycie w widoku:**

- `AccountButton` - ikona konta w nagłówku
- `SetCard` - ikony: zapisz (check), anuluj (close), usuń (delete)
- `CreateSetButton` - duża ikona "add" do tworzenia zestawu

---

### 11.3 TextInput (`src/components/base/TextInput.svelte`)

**Cel:** Pole tekstowe z walidacją i stanami.

**Props:**

```typescript
interface TextInputProps {
  type?: "text" | "email" | "password" | "search"; // Typ inputu (domyślnie 'text')
  name?: string; // Nazwa pola (dla formularzy)
  value?: string; // Wartość pola (bind:value)
  placeholder?: string; // Placeholder
  required?: boolean; // Walidacja wymagalności
  maxlength?: number; // Maksymalna długość
  pattern?: string; // Pattern walidacji (regex)
  disabled?: boolean; // Stan wyłączenia
  autofocus?: boolean; // Automatyczny focus
  autocomplete?: string; // Atrybut autocomplete
}
```

**Implementacja:**

- Bazuje na `<input>`
- Wszystkie atrybuty walidacji HTML5 przekazywane do natywnego elementu
- Opcjonalnie: wizualne stany błędu (jeśli invalid)
- `bind:value` dla reaktywności

**Użycie w widoku:**

- `SetCard` - pole edycji nazwy zestawu (z walidacją: maxlength=10, pattern, required)
- `CreateSetButton` - pole nazwy w dialogu tworzenia (z walidacją)

---

### 11.4 Dialog (`src/components/base/Dialog.svelte`)

**Cel:** Wrapper dla natywnego `<dialog>` z zarządzaniem focusem i dostępnością.

**Props:**

```typescript
interface DialogProps {
  isOpen: boolean; // Stan otwarcia dialogu
  title?: string; // Tytuł dialogu (opcjonalny nagłówek)
  onClose?: () => void; // Callback zamknięcia (Escape, backdrop click)
}
```

**Implementacja:**

- Bazuje na `<dialog>`
- Reaktywnie wywołuje `showModal()` / `close()` na podstawie `isOpen`
- Focus management: ustawia focus na pierwszy focusable element po otwarciu
- Obsługa Escape: wywołuje `onClose`
- Opcjonalnie: zamknięcie przez kliknięcie w backdrop
- Slot dla zawartości dialogu

**Użycie w widoku:**

- `CreateSetButton` - dialog z formularzem tworzenia zestawu
- `ConfirmDialog` - dialog potwierdzenia usunięcia

---

### 11.5 Card (`src/components/base/Card.svelte`)

**Cel:** Kontener karty z nagłówkiem zawierającym tytuł i sloty dla akcji.

**Props:**

```typescript
interface CardProps {
  title: string; // Tytuł wyświetlany w nagłówku karty
}
```

**Sloty:**

- `actions` - slot w lewej części nagłówka (np. przycisk przejścia do widoku)
- `deleteAction` - slot w prawej części nagłówka (przycisk usuwania)
- `default` - główna zawartość karty (poniżej nagłówka)

**Implementacja:**

- Bazuje na `<article>` lub `<div>`
- Nagłówek z borderem (górna sekcja karty):
  - Layout: flexbox z `justify-content: space-between`
  - Kolejność: `[slot:actions] [title] [slot:deleteAction]`
  - Border: dolna krawędź nagłówka (separator od zawartości)
- Jednolite stylowanie: border-radius, shadow, background
- Padding: odpowiedni dla nagłówka i zawartości

**Struktura HTML:**

```svelte
<article class="card">
  <header class="card-header">
    <div class="card-header-actions">
      <slot name="actions" />
    </div>
    <h3 class="card-title">{title}</h3>
    <div class="card-header-delete">
      <slot name="deleteAction" />
    </div>
  </header>
  <div class="card-content">
    <slot />
  </div>
</article>
```

**Stylowanie nagłówka:**

- `display: flex`
- `justify-content: space-between`
- `align-items: center`
- `border-bottom: 1px solid var(--border-color)`
- Tytuł (`card-title`) w środku, może być elastyczny
- Sloty akcji w równym odstępie po bokach

**Użycie w widoku:**

- `SetCard` - karta zestawu z nagłówkiem (tytuł, akcje, usuwanie)

**Ikony używane w slotach:**

- `visibility` (lub `remove_red_eye`) - przycisk "Zobacz zestaw" w slot `actions`
- `delete` - przycisk usuwania w slot `deleteAction`

---

### 11.6 GlobalPreloader (`src/components/GlobalPreloader.svelte`)

**Cel:** Pełnoekranowy overlay z loaderem podczas operacji globalnych.

**Props:**

- Brak (stan ze `globalLoadingStore`)

**Implementacja:**

- Subskrybuje `$globalLoadingStore`
- Pełnoekranowy `<div>` z `position: fixed`, wysokim `z-index`
- Spinner (animacja CSS)
- Blokuje interakcję z UI (pointer-events)

**Użycie:**

- Renderowany w `AppLayout`, nie bezpośrednio w widoku
- Widok kontroluje przez `setGlobalLoading(true/false)`

---

### 11.7 ToastStack (`src/components/ToastStack.svelte`)

**Cel:** Kontener powiadomień toast.

**Props:**

- Brak (stan ze `toastsStore`)

**Implementacja:**

- Subskrybuje `$toastsStore`
- Kontener `position: fixed` (prawy dolny róg)
- Renderuje każdy toast z:
  - Ikoną zależną od typu (success, error, info, warning)
  - Tekstem komunikatu
  - Przyciskiem zamknięcia (dla persistent toastów)
- Animacje wejścia/wyjścia (CSS transitions)
- Auto-dismiss realizowany w store

**Użycie:**

- Renderowany w `AppLayout`, nie bezpośrednio w widoku
- Widok kontroluje przez `toastsStore.addToast(type, message)`

---

### 11.8 Lista wszystkich komponentów bazowych dla widoku Dashboard

| Komponent         | Plik                                    | Użycie w widoku                               |
| ----------------- | --------------------------------------- | --------------------------------------------- |
| `Button`          | `src/components/base/Button.svelte`     | `CreateSetButton`, `ConfirmDialog`            |
| `IconButton`      | `src/components/base/IconButton.svelte` | `AccountButton`, `SetCard`, `CreateSetButton` |
| `TextInput`       | `src/components/base/TextInput.svelte`  | `SetCard`, `CreateSetButton`                  |
| `Dialog`          | `src/components/base/Dialog.svelte`     | `CreateSetButton`, `ConfirmDialog`            |
| `Card`            | `src/components/base/Card.svelte`       | `SetCard`                                     |
| `GlobalPreloader` | `src/components/GlobalPreloader.svelte` | Renderowany w `AppLayout`                     |
| `ToastStack`      | `src/components/ToastStack.svelte`      | Renderowany w `AppLayout`                     |

**Uwaga:** Komponenty bazowe powinny być zaimplementowane jako pierwsze, przed komponentami specyficznymi dla widoku. Umożliwi to testowanie każdego komponentu bazowego niezależnie i zapewni spójność w całej aplikacji.

---

## 12. Kroki implementacji

### Krok 1: Przygotowanie struktury i typów

1. Upewnij się, że typy z `src/types.ts` są aktualne i zgodne z API
2. Dodaj nowe typy dla widoku: `Toast`, `ConfirmDialogState`, `SetCardState`, `SetsDashboardState`
3. Lokalizacja: `src/types.ts` (lub nowy plik `src/lib/types/dashboard.types.ts`)

### Krok 2: Utworzenie Svelte stores dla globalnego stanu UI

1. **globalLoadingStore** (`src/lib/stores/global-loading.store.ts`):
   - Prosty `writable<boolean>` store
   - Eksport funkcji pomocniczej `setGlobalLoading(isLoading: boolean)`
   - Użycie: `setGlobalLoading(true)` włącza preloader, `setGlobalLoading(false)` wyłącza

2. **toastsStore** (`src/lib/stores/toasts.store.ts`):
   - Custom store z metodami `addToast` i `removeToast`
   - Store przechowuje tablicę `Toast[]`
   - Metoda `addToast(type, message)` generuje ID, dodaje toast do kolejki
   - Auto-dismiss dla success/info: setTimeout 3s → automatyczne `removeToast(id)`
   - Metoda `removeToast(id)` usuwa toast z kolejki

### Krok 3: Utworzenie komponentów bazowych

Implementacja komponentów bazowych zgodnie z sekcją 11. Kolejność implementacji:

1. **Button** (`src/components/base/Button.svelte`):
   - Warianty: primary, secondary
   - Stany: disabled, loading
   - Slot dla zawartości

2. **IconButton** (`src/components/base/IconButton.svelte`):
   - Ikony z Material Symbols
   - Wymagany atrybut `title`
   - Warianty: default, inverted
   - Rozmiary: small, medium, large

3. **TextInput** (`src/components/base/TextInput.svelte`):
   - Typy: text, email, password, search
   - Walidacja HTML5 (required, maxlength, pattern)
   - `bind:value` dla reaktywności

4. **Dialog** (`src/components/base/Dialog.svelte`):
   - Wrapper dla `<dialog>`
   - Focus management
   - Obsługa Escape i backdrop click

5. **Card** (`src/components/base/Card.svelte`):
   - Nagłówek z borderem
   - Prop `title` dla tytułu w nagłówku
   - Slot `actions` (lewy) i `deleteAction` (prawy) w nagłówku
   - Slot `default` dla głównej zawartości

6. **GlobalPreloader** (`src/components/GlobalPreloader.svelte`):
   - Pełnoekranowy overlay
   - Subskrypcja `$globalLoadingStore`
   - Brak propsów (stan ze store)

7. **ToastStack** (`src/components/ToastStack.svelte`):
   - Kontener toastów (prawy górny róg)
   - Subskrypcja `$toastsStore`
   - Animacje i auto-dismiss

### Krok 4: Utworzenie komponentu AccountButton

1. Lokalizacja: `src/components/AccountButton.svelte`
2. Wykorzystuje `IconButton` z komponentów bazowych
3. Props dla `IconButton`: `icon="account_circle"`, `title="Konto"`, `variant="ghost"`
4. Handler `onClick` → nawigacja do `/account`

### Krok 5: Utworzenie komponentu DashboardGrid

1. Lokalizacja: `src/components/DashboardGrid.svelte`
2. Kontener `<div>` z CSS Grid
3. Style: `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem;`
4. Przyjmowanie dzieci przez slot

### Krok 6: Utworzenie komponentu SetCard

1. Lokalizacja: `src/components/SetCard.svelte`
2. Import komponentów bazowych: `Card`, `TextInput`, `IconButton`
3. Stan lokalny: `isEditing`, `isLoading`, `editedName`, `originalName`
4. Props: `set: SetDTO`, `onUpdate`, `onDelete`, `onNavigate`
5. UI (wykorzystując komponenty bazowe):
   - Kontener: `<Card title={isEditing ? editedName : set.name}>`
   - Slot `actions` (lewy, w nagłówku):
     - `<IconButton icon="visibility" title="Zobacz zestaw" variant="default" onClick={() => onNavigate(set.id)} />`
   - Slot `deleteAction` (prawy, w nagłówku):
     - `<IconButton icon="delete" title="Usuń" variant="inverted" onClick={() => onDelete(set.id)} />`
   - Zawartość karty (poniżej nagłówka):
     - Tryb wyświetlania: liczba elementów, opcjonalnie opis
     - Tryb edycji nazwy: `<form>` z komponentami:
       - `<TextInput bind:value={editedName} maxlength={10} pattern=".*\S.*" required />`
       - `<IconButton icon="check" title="Zapisz" type="submit" variant="default" />`
       - `<IconButton icon="close" title="Anuluj" type="reset" variant="inverted" />`
   - Lokalny loader (spinner) podczas `isLoading`
6. Logika:
   - Kliknięcie w tytuł w nagłówku (lub przycisk edycji) → `isEditing = true`
   - Submit → wywołanie `onUpdate(setId, editedName)` → `isLoading = true`
   - Reset/Escape → przywrócenie `originalName`, `isEditing = false`
   - Handler delete → `onDelete(setId)` (slot deleteAction)
   - Handler navigate → `onNavigate(setId)` (slot actions)

### Krok 7: Utworzenie komponentu CreateSetButton

1. Lokalizacja: `src/components/CreateSetButton.svelte`
2. Import komponentów bazowych: `IconButton`, `Dialog`, `TextInput`, `Button`
3. Stan lokalny: `isDialogOpen`, `newSetName`, `isLoading`
4. Props: `onCreate: (name) => Promise<void>`, `disabled: boolean`
5. UI (wykorzystując komponenty bazowe):
   - Przycisk główny:
     - `<IconButton icon="add" title="Dodaj zestaw" variant="default" size="large" onClick={openDialog} disabled={disabled} />`
     - Stylizacja: border-dashed, wypełnia całą komórkę grida
   - Dialog: `<Dialog isOpen={isDialogOpen} title="Nowy zestaw" onClose={closeDialog}>`
     - Formularz:
       - `<TextInput bind:value={newSetName} placeholder="Nazwa zestawu" maxlength={10} pattern=".*\S.*" required autofocus />`
       - `<Button type="submit" variant="primary" disabled={isLoading}>Zapisz</Button>`
       - `<Button type="button" variant="secondary" onClick={closeDialog}>Anuluj</Button>`
6. Logika:
   - `openDialog()` → `isDialogOpen = true`
   - Submit → `isLoading = true`, wywołanie `onCreate(newSetName)`, po zakończeniu: `closeDialog()`
   - `closeDialog()` → `isDialogOpen = false`, reset `newSetName`

### Krok 8: Utworzenie komponentu SetsDashboard

1. Lokalizacja: `src/components/SetsDashboard.svelte`
2. Props: `initialSets: SetDTO[]`, `totalCount: number`
3. Import stores:
   ```typescript
   import { setGlobalLoading } from "$lib/stores/global-loading.store";
   import { toastsStore } from "$lib/stores/toasts.store";
   ```
4. Stan lokalny:
   ```typescript
   let sets = initialSets;
   let confirmDialog: ConfirmDialogState = {
     isOpen: false,
     title: "",
     message: "",
     onConfirm: () => {},
   };
   ```
5. Funkcje pomocnicze:
   - `openConfirmDialog(title, message, onConfirm)` - otwarcie dialogu potwierdzenia
   - `closeConfirmDialog()` - zamknięcie dialogu

6. Implementacja handlerów API (używają stores):
   - `handleCreateSet(name: string)`:
     - `setGlobalLoading(true)` przed fetch
     - Po sukcesie: `sets = response.sets`, `toastsStore.addToast('success', ...)`
     - Po błędzie: `toastsStore.addToast('error', ...)`
     - W `finally`: `setGlobalLoading(false)`
   - `handleUpdateSet(setId: string, name: string)`:
     - Bez globalnego preloadera (lokalny loader w SetCard)
     - Po sukcesie: `sets = response.sets`, `toastsStore.addToast('success', ...)`
     - Po błędzie: `toastsStore.addToast('error', ...)`
   - `handleDeleteSet(setId: string)`:
     - Wywoływane z confirm dialog
     - Jak `handleCreateSet` (z globalnym preloaderem)
   - `handleNavigateToSet(setId: string)`:
     - `window.location.href = '/dashboard/${setId}'` lub Astro router

7. UI (wykorzystując komponenty widoku i bazowe):

   ```svelte
   <DashboardGrid>
     {#each sets as set (set.id)}
       <SetCard
         {set}
         onUpdate={handleUpdateSet}
         onDelete={(id) => openConfirmDialog(...)}
         onNavigate={handleNavigateToSet}
       />
     {/each}

     {#if sets.length < 6}
       <CreateSetButton
         onCreate={handleCreateSet}
         disabled={sets.length >= 6}
       />
     {/if}
   </DashboardGrid>

   <ConfirmDialog {...confirmDialog} />
   ```

   **Uwaga:**
   - `SetCard` wykorzystuje `Card`, `IconButton`, `TextInput`
   - `CreateSetButton` wykorzystuje `IconButton`, `Dialog`, `TextInput`, `Button`
   - `ConfirmDialog` wykorzystuje `Dialog`, `Button`
   - `GlobalPreloader` i `ToastStack` są w `AppLayout`, nie w `SetsDashboard`

### Krok 9: Utworzenie/aktualizacja komponentu AppLayout

1. Lokalizacja: `src/layouts/AppLayout.svelte` (lub `src/components/AppLayout.svelte`)
2. Import stores:
   ```typescript
   import { globalLoadingStore } from "$lib/stores/global-loading.store";
   import { toastsStore } from "$lib/stores/toasts.store";
   ```
3. Import komponentów globalnych:
   ```typescript
   import GlobalPreloader from "$lib/components/GlobalPreloader.svelte";
   import ToastStack from "$lib/components/ToastStack.svelte";
   ```
4. UI:

   ```svelte
   <header>
     <slot name="header-left" />
     <div class="header-right">
       <Clock />
       <ThemeToggle />
     </div>
   </header>

   <main>
     <slot />
   </main>

   <!-- Globalne komponenty UI (poza main) -->
   <GlobalPreloader />
   <ToastStack />
   ```

### Krok 10: Utworzenie strony DashboardPage (Astro)

1. Lokalizacja: `src/pages/dashboard.astro`
2. SSR guard:
   ```typescript
   const {
     data: { user },
     error,
   } = await locals.supabase.auth.getUser();
   if (error || !user) {
     return Astro.redirect("/login");
   }
   ```
3. Pobranie danych:
   ```typescript
   const response = await fetch(`${Astro.url.origin}/api/sets`, {
     headers: {
       Authorization: `Bearer ${session.access_token}`,
     },
   });
   if (response.status === 401) {
     return Astro.redirect("/login");
   }
   const data: SetListResponse = await response.json();
   ```
4. Layout:
   ```astro
   <Layout title="Dashboard">
     <Fragment slot="header-left">
       <AccountButton />
     </Fragment>

     <SetsDashboard initialSets={data.sets} totalCount={data.total_count} client:load />
   </Layout>
   ```

### Krok 12: Stylizacja komponentów

1. **Komponenty bazowe** (priorytet - stylowane jako pierwsze):
   - `Button` - warianty (primary/secondary), stany (disabled/loading)
   - `IconButton` - rozmiary (small/medium/large), warianty (default/inverted), ikony Material Symbols
   - `TextInput` - stany focus/error/disabled, walidacja wizualna
   - `Dialog` - backdrop, modal, animacje otwarcia/zamknięcia
   - `Card` - nagłówek z borderem, layout (actions/title/deleteAction), shadow, border-radius, padding
   - `GlobalPreloader` - overlay, spinner, z-index
   - `ToastStack` - pozycjonowanie (prawy górny róg), kolory dla typów (success/error/info/warning), animacje

2. **Komponenty widoku** (wykorzystują style z bazowych):
   - `SetCard` - wykorzystuje `Card`, dodatkowy layout wewnętrzny dla trybu edycji
   - `CreateSetButton` - border-dashed, wypełnienie grida
   - `DashboardGrid` - CSS Grid (auto-fill, minmax, gap)

3. **Globalne style**:
   - CSS custom properties dla kolorów (motywy light/dark przez `light-dark()`)
   - Typografia (czcionka Departure Mono, skala `clamp()`)
   - Tokeny stanów (info/success/warning/error)
4. **Responsywność**:
   - Grid breakpoints
   - Mobile-friendly spacing
   - Touch targets (min 44x44px dla przycisków)

### Krok 13: Testowanie i obsługa błędów

**Uwaga:** Przed testowaniem widoku, przetestuj komponenty bazowe w izolacji (np. w Storybook lub prostych test pages).

1. **Testowanie komponentów bazowych**:
   - `Button` - oba warianty (primary/secondary), stany disabled/loading
   - `IconButton` - różne ikony, rozmiary (small/medium/large), warianty (default/inverted)
   - `TextInput` - walidacja HTML5, bind:value, błędy
   - `Dialog` - otwarcie/zamknięcie, focus management, Escape
   - `Card` - nagłówek z tytułem, sloty actions/deleteAction, renderowanie zawartości
   - Stores (`globalLoadingStore`, `toastsStore`) - dodawanie/usuwanie, reaktywność

2. Testowanie tworzenia zestawu:
   - Poprawne dane → sukces
   - Duplikat nazwy → toast z błędem 409
   - 7. zestaw → toast MAX_SETS_PER_USER_EXCEEDED
   - Pusta nazwa → blokada HTML5 (przez `TextInput`)
   - Same spacje → blokada HTML5 pattern (przez `TextInput`)

3. Testowanie edycji:
   - Zmiana nazwy → sukces
   - Duplikat → toast z błędem 409
   - Bez zmian → brak requestu
   - Anulowanie → przywrócenie oryginalnej wartości

4. Testowanie usuwania:
   - Potwierdzenie → usunięcie, toast sukcesu
   - Anulowanie → brak akcji

5. Testowanie błędów:
   - 401 → redirect do `/login`
   - Network error → toast "Brak połączenia"
   - 500 → toast "Błąd serwera"

6. Testowanie przypadków brzegowych:
   - 0 zestawów → brak kart, tylko przycisk tworzenia
   - 6 zestawów → przycisk tworzenia ukryty
   - Wygasła sesja → redirect do `/login`

7. Testowanie stores:
   - Globalny preloader widoczny podczas POST/DELETE (nie podczas PATCH)
   - Toasty pojawiają się w AppLayout (nie w SetsDashboard)
   - Auto-dismiss dla toastów success/info (3s)
   - Persistent toasty dla błędów (wymagają kliknięcia X)

### Krok 14: Integracja z layoutem i nawigacją

1. Upewnij się, że `AppLayout`:
   - Poprawnie przyjmuje slot `header-left`
   - Zawiera `GlobalPreloader` i `ToastStack` (subskrybujące stores)
   - Importuje i subskrybuje `globalLoadingStore` i `toastsStore`
2. Integracja `Clock` i `ThemeToggle` w header-right (jeśli jeszcze nie istnieją)
3. Test globalnych stores:
   - Wywołanie `setGlobalLoading(true)` → preloader pojawia się
   - Wywołanie `toastsStore.addToast('success', 'Test')` → toast pojawia się
4. Test nawigacji:
   - Z `/dashboard` do `/dashboard/{setId}` (kliknięcie karty)
   - Z `/dashboard` do `/account` (kliknięcie AccountButton)
   - Z `/login` do `/dashboard` (po zalogowaniu)

### Krok 15: Optymalizacja i polishing

1. Dodanie loading states (skeleton screens opcjonalnie)
2. Optymalizacja renderowania (Svelte transitions)
3. Accessibility audit:
   - Focus management w dialogach
   - Aria labels dla przycisków ikonowych
   - Keyboard navigation (Tab, Enter, Escape)
   - Screen reader testing
4. Performance:
   - Lazy loading komponentów jeśli potrzeba
   - Debouncing dla częstych operacji (jeśli dotyczy)
5. Dokumentacja kodu (JSDoc dla publicznych API komponentów)

### Krok 16: Code review i testy E2E (opcjonalnie)

1. Code review zgodności z cursor rules
2. Testy E2E (Playwright/Cypress) dla krytycznych ścieżek:
   - Tworzenie → edycja → usuwanie zestawu
   - Walidacja formularzy
   - Obsługa błędów

---

## Koniec planu implementacji

Ten plan stanowi kompletny przewodnik do implementacji widoku Dashboard. Każdy krok jest szczegółowo opisany z uwzględnieniem wszystkich wymagań PRD, historyjek użytkownika i specyfikacji API.

**Kluczowe założenia architektoniczne:**

1. **Komponenty bazowe** - cienkie wrappery nad natywnymi elementami HTML zapewniające spójność i dostępność
   - `Button` z dwoma wariantami: primary, secondary
   - `IconButton` z dwoma wariantami: default, inverted
   - `Card` z nagłówkiem zawierającym tytuł i sloty dla akcji (actions po lewej, deleteAction po prawej)
2. **Svelte stores** - zarządzanie globalnym stanem UI (toasty, preloader)
   - `ToastStack` pozycjonowany w prawym górnym rogu
3. **Props drilling** - przekazywanie danych specyficznych dla widoku
4. **Walidacja HTML5** - natywna walidacja formularzy przez komponenty bazowe

**Kolejność implementacji:**

1. Typy i stores (fundament)
2. Komponenty bazowe (Button, IconButton, TextInput, Dialog, Card, GlobalPreloader, ToastStack)
3. Komponenty widoku (AccountButton, SetCard, CreateSetButton, etc.)
4. Integracja w AppLayout
5. Strona Dashboard (Astro SSR)
6. Stylizacja i testy

Implementacja powinna przebiegać sekwencyjnie według numeracji kroków (1-16), zaczynając od fundamentów (typy, stores, komponenty bazowe), a kończąc na integracji, testach i optymalizacji.
