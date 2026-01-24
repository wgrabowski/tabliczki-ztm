# API Endpoint Implementation Plan: DELETE Set Item

## 1. Przegląd punktu końcowego

Endpoint `DELETE /api/sets/{setId}/items/{itemId}` służy do usuwania pojedynczego elementu (przypiętego przystanku) z zestawu użytkownika. Po pomyślnym usunięciu zwraca zaktualizowaną listę pozostałych elementów w zestawie oraz ID usuniętego elementu.

**Kluczowe funkcje:**

- Usuwanie elementu z zestawu z weryfikacją własności
- Automatyczne aktualizowanie pozycji pozostałych elementów (obsługiwane przez trigger bazodanowy)
- Zwracanie zaktualizowanej listy elementów po usunięciu
- Zabezpieczenie przed próbami usuwania elementów z cudzych zestawów

## 2. Szczegóły żądania

### Metoda HTTP

`DELETE`

### Struktura URL

```
/api/sets/{setId}/items/{itemId}
```

### Parametry

#### Wymagane parametry URL:

- **setId** (string, UUID v4)
  - Identyfikator zestawu, z którego usuwany jest element
  - Format: UUID v4 (np. `123e4567-e89b-12d3-a456-426614174000`)
  - Walidacja: regex UUID, niepusty string

- **itemId** (string, UUID v4)
  - Identyfikator elementu do usunięcia
  - Format: UUID v4
  - Walidacja: regex UUID, niepusty string

#### Opcjonalne parametry:

Brak

### Request Body

Brak (DELETE nie wymaga ciała żądania)

### Nagłówki

- `Authorization`: Bearer token (obsługiwany przez middleware Supabase Auth)
- `Content-Type`: nie wymagany (brak body)

## 3. Wykorzystywane typy

### Response Types (z `src/types.ts`)

```typescript
// Główny typ odpowiedzi
interface DeleteSetItemResponse {
  items: SetItemDTO[];
  deleted_item_id: string;
}

// DTO dla elementów w odpowiedzi
interface SetItemDTO {
  id: string;
  set_id: string;
  stop_id: number;
  position: number;
  added_at?: string;
}

// Typ błędu
interface ErrorResponse {
  code: string;
  message: string;
  details?: unknown;
}
```

### Service Layer Types

```typescript
// Entity z bazy danych
type SetItemEntity = Tables<"set_items">;
```

### Internal Validation Types

```typescript
// Helper do walidacji UUID
function isValidUUID(id: string): boolean;
```

**Uwaga:** Nie ma potrzeby definiowania Command Model dla operacji DELETE (brak request body).

## 4. Szczegóły odpowiedzi

### Sukces: 200 OK

**Uzasadnienie kodu 200 zamiast 204:**

- Specyfikacja pierwotnie wspominała "204 No Content", ale jednocześnie opisywała response body
- Zgodność z istniejącym wzorcem w codebase: `DELETE /api/sets/{setId}` zwraca 200 z body
- Klient otrzymuje natychmiastową, zaktualizowaną listę elementów bez dodatkowego zapytania

**Response Body:**

```json
{
  "items": [
    {
      "id": "uuid",
      "set_id": "uuid",
      "stop_id": 123,
      "position": 1
    },
    {
      "id": "uuid",
      "set_id": "uuid",
      "stop_id": 456,
      "position": 2
    }
  ],
  "deleted_item_id": "deleted-uuid"
}
```

**Właściwości:**

- `items`: Lista pozostałych elementów, posortowana według `position` (rosnąco)
- `deleted_item_id`: UUID usuniętego elementu (do potwierdzenia po stronie klienta)

### Błędy

#### 400 Bad Request

**Przyczyny:**

- Nieprawidłowy format UUID dla `setId`
- Nieprawidłowy format UUID dla `itemId`

**Response Body:**

```json
{
  "code": "INVALID_INPUT",
  "message": "Invalid set ID format"
}
```

lub

```json
{
  "code": "INVALID_INPUT",
  "message": "Invalid item ID format"
}
```

#### 401 Unauthorized

**Przyczyna:** Brak autoryzacji (brak sesji lub nieważny token)

**Response Body:**

```json
{
  "code": "UNAUTHORIZED",
  "message": "Authentication required"
}
```

#### 404 Not Found

**Przyczyny:**

- Zestaw nie istnieje
- Zestaw nie należy do użytkownika
- Element nie istnieje w tym zestawie
- Element istnieje, ale w innym zestawie

**Response Body:**

```json
{
  "code": "ITEM_NOT_FOUND",
  "message": "Item not found or access denied"
}
```

lub

```json
{
  "code": "SET_NOT_FOUND",
  "message": "Set not found or access denied"
}
```

#### 500 Internal Server Error

**Przyczyna:** Nieoczekiwany błąd bazy danych

**Response Body:**

```json
{
  "code": "INTERNAL_ERROR",
  "message": "An unexpected error occurred"
}
```

## 5. Przepływ danych

### Diagram przepływu

```
1. HTTP DELETE Request
   ↓
2. Astro API Route Handler (export const DELETE)
   ↓
3. Walidacja UUID parametrów (setId, itemId)
   ↓ [valid]
4. Uwierzytelnienie (getUserId)
   ↓ [authenticated]
5. Autoryzacja i usuwanie (service layer)
   ├─ 5a. Weryfikacja własności zestawu (verifySetOwnership)
   ├─ 5b. Usunięcie elementu z weryfikacją (deleteSetItem)
   │      ├─ DELETE FROM set_items WHERE id = itemId AND set_id = setId
   │      └─ Sprawdzenie rowCount (czy coś zostało usunięte)
   └─ 5c. Pobranie zaktualizowanej listy (getAllSetItems)
   ↓ [success]
6. Formatowanie odpowiedzi (DeleteSetItemResponse)
   ↓
7. HTTP 200 Response z JSON
```

### Interakcje z bazą danych

#### 1. Weryfikacja własności zestawu

```sql
SELECT id
FROM sets
WHERE id = {setId}
  AND user_id = {userId}
LIMIT 1
```

- **Cel:** Sprawdzenie, czy zestaw istnieje i należy do użytkownika
- **Zwracany błąd:** `SET_NOT_FOUND` jeśli brak wyników

#### 2. Usunięcie elementu

```sql
DELETE FROM set_items
WHERE id = {itemId}
  AND set_id = {setId}
RETURNING id
```

- **Cel:** Usunięcie elementu z dodatkową walidacją przynależności do zestawu
- **Klauzula AND set_id:** Zapobiega usuwaniu elementów z innych zestawów (defense in depth)
- **Zwracany błąd:** `ITEM_NOT_FOUND` jeśli brak usuniętych wierszy (rowCount === 0)
- **Side effect:** Trigger bazodanowy może automatycznie przeliczyć pozycje pozostałych elementów

#### 3. Pobranie zaktualizowanej listy

```sql
SELECT id, set_id, stop_id, position
FROM set_items
WHERE set_id = {setId}
ORDER BY position ASC
```

- **Cel:** Zwrócenie aktualnej listy elementów po usunięciu
- **RLS:** Polityka Row Level Security zapewnia, że zwrócone zostaną tylko elementy z zestawów użytkownika

### Zarządzanie pozycjami elementów

**Baza danych obsługuje automatyczne przeindeksowanie pozycji:**

- Po usunięciu elementu z pozycją N, trigger bazodanowy może zaktualizować pozycje elementów N+1, N+2, ... → N, N+1, ...
- Alternatywnie: pozycje mogą pozostać z lukami (np. 1, 2, 4, 5 po usunięciu pozycji 3)
- **Implementacja:** Zależy od logiki triggera w bazie danych
- **Endpoint:** Zawsze zwraca aktualne pozycje bez dodatkowej logiki aplikacyjnej

## 6. Względy bezpieczeństwa

### Uwierzytelnienie

**Mechanizm:**

- Supabase Auth middleware weryfikuje sesję użytkownika
- Helper `getUserId(locals.supabase)` ekstraktuje `user_id` z sesji
- Obsługa trybu deweloperskiego z `DEV_USER_ID` (jeśli zaimplementowane)

**Zabezpieczenia:**

- NIGDY nie zaufać `user_id` z żądania klienta
- Zawsze używać `user_id` z zweryfikowanej sesji
- Zwracać `401 Unauthorized` w przypadku braku sesji

### Autoryzacja

**Warstwa 1: Weryfikacja własności zestawu**

```typescript
await verifySetOwnership(supabase, userId, setId);
```

- Sprawdza czy zestaw o ID `setId` należy do użytkownika `userId`
- Zwraca `SET_NOT_FOUND` jeśli warunek nie jest spełniony
- Zapobiega operacjom na cudzych zestawach

**Warstwa 2: Weryfikacja przynależności elementu do zestawu**

```sql
DELETE FROM set_items
WHERE id = itemId AND set_id = setId
```

- Klauzula `AND set_id = setId` zapewnia, że element należy do właściwego zestawu
- Zapobiega scenariuszowi: użytkownik ma dostęp do setA, próbuje usunąć element z setB

**Warstwa 3: Row Level Security (RLS)**

- Polityki RLS w Supabase zapewniają dodatkową warstwę ochrony
- Użytkownik może operować tylko na swoich danych
- Defense in depth: nawet jeśli walidacja aplikacji zawiedzie, RLS zatrzyma operację

**Zabezpieczenie przed atakami:**

1. **UUID Enumeration Attack:**
   - Atakujący próbuje losowych UUID dla itemId
   - Mitigacja: Połączone sprawdzenie set ownership + item membership
   - Zwracanie generycznego "not found" bez szczegółów

2. **Cross-Set Item Deletion:**
   - Użytkownik A ma dostęp do setX, próbuje usunąć item z setY
   - Mitigacja: DELETE z warunkiem `AND set_id = setId`
   - Nawet jeśli itemId jest prawidłowy, operacja się nie powiedzie

3. **Privilege Escalation:**
   - Próba manipulacji userId w żądaniu
   - Mitigacja: userId TYLKO z sesji, nigdy z input
   - RLS na poziomie bazy danych

### Walidacja danych wejściowych

**UUID Validation:**

```typescript
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}
```

- Walidacja formatu UUID v4
- Zapobiega SQL injection (choć Supabase używa prepared statements)
- Wczesne odrzucenie nieprawidłowych żądań (fail fast)

**Brak walidacji business logic:**

- Nie trzeba sprawdzać `stop_id` (nie ma w żądaniu)
- Nie trzeba walidować pozycji (obsługiwane przez bazę)
- Nie trzeba sprawdzać limitu elementów (usuwanie zawsze dozwolone)

## 7. Obsługa błędów

### Tabela mapowania błędów

| Scenariusz                          | Error Source       | HTTP Status | Error Code     | Error Message                   |
| ----------------------------------- | ------------------ | ----------- | -------------- | ------------------------------- |
| Nieprawidłowy format setId          | Walidacja UUID     | 400         | INVALID_INPUT  | Invalid set ID format           |
| Nieprawidłowy format itemId         | Walidacja UUID     | 400         | INVALID_INPUT  | Invalid item ID format          |
| Nieprawidłowy JSON (N/A dla DELETE) | -                  | -           | -              | -                               |
| Brak autoryzacji                    | getUserId()        | 401         | UNAUTHORIZED   | Authentication required         |
| Zestaw nie istnieje                 | verifySetOwnership | 404         | SET_NOT_FOUND  | Set not found or access denied  |
| Zestaw należy do innego użytkownika | verifySetOwnership | 404         | SET_NOT_FOUND  | Set not found or access denied  |
| Element nie istnieje                | deleteSetItem      | 404         | ITEM_NOT_FOUND | Item not found or access denied |
| Element należy do innego zestawu    | deleteSetItem      | 404         | ITEM_NOT_FOUND | Item not found or access denied |
| Naruszenie polityki RLS             | PostgreSQL (42501) | 403         | FORBIDDEN      | Access denied                   |
| Nieoczekiwany błąd bazy danych      | PostgreSQL         | 500         | INTERNAL_ERROR | An unexpected error occurred    |

### Implementacja obsługi błędów

**Wykorzystanie istniejącej funkcji `mapDatabaseError()`:**

```typescript
try {
  // ... business logic
} catch (error: unknown) {
  console.error("Error deleting set item:", { userId, setId, itemId, error });
  const mappedError = mapDatabaseError(error);

  return new Response(
    JSON.stringify({
      code: mappedError.code,
      message: mappedError.message,
    } as ErrorResponse),
    {
      status: mappedError.status,
      headers: { "Content-Type": "application/json" },
    }
  );
}
```

**Strategia logowania:**

- `console.error()` dla wszystkich błędów z kontekstem (userId, setId, itemId)
- Nielogowanie wrażliwych danych (tokeny, hasła)
- Uwzględnienie błędów w monitoringu produkcyjnym (Sentry, CloudWatch, etc.)

**Komunikaty błędów:**

- Generyczne dla klienta (nie ujawniać szczegółów implementacji)
- Szczegółowe w logach serwera (debugging)
- Przykład: "Item not found or access denied" zamiast "Item exists but belongs to another user's set"

## 8. Rozważania dotyczące wydajności

### Potencjalne wąskie gardła

#### 1. Trzy zapytania do bazy danych

**Problem:**

- Query 1: Weryfikacja własności zestawu (`verifySetOwnership`)
- Query 2: Usunięcie elementu (`DELETE FROM set_items`)
- Query 3: Pobranie zaktualizowanej listy (`getAllSetItems`)

**Optymalizacja:**

- Możliwość połączenia Query 1 i 2 w jedno zapytanie z JOIN
- Trade-off: Czytelność kodu vs. wydajność
- **Decyzja:** Zachować trzy zapytania dla czytelności i spójności z istniejącym kodem

**Wydajność:**

- Każde zapytanie działa na indeksowanych kolumnach (PRIMARY KEY, FOREIGN KEY)
- Zestawy mają maksymalnie 6 elementów (niski koszt Query 3)
- Łączny czas: < 50ms w typowych warunkach

#### 2. Trigger bazodanowy do przeindeksowania pozycji

**Problem:**

- Jeśli trigger przelicza pozycje po każdym usunięciu: UPDATE na wielu wierszach
- Worst case: Usunięcie pierwszego elementu → 5 UPDATE statements

**Optymalizacja:**

- Trigger powinien używać jednego UPDATE z WHERE position > deleted_position
- Alternatywnie: Akceptować luki w pozycjach, nie przeindeksowywać

**Wpływ:**

- Przy maksymalnie 6 elementach: koszt marginalny
- Trigger wykonuje się w tej samej transakcji co DELETE

#### 3. N+1 Problem

**Analiza:** Nie występuje

- Endpoint usuwa pojedynczy element (jedna operacja)
- Nie ma iteracji po wielu elementach z osobnymi zapytaniami
- Jedno zapytanie getAllSetItems() zwraca wszystkie pozostałe elementy

### Strategie optymalizacji

#### Indeksy bazodanowe (już istniejące)

```sql
-- Primary key index
CREATE INDEX ON set_items (id);

-- Foreign key index (automatyczny)
CREATE INDEX ON set_items (set_id);

-- Unique constraint index
CREATE UNIQUE INDEX ON set_items (set_id, stop_id);
```

#### Caching

**Nie zalecany dla tego endpointu:**

- DELETE zmienia stan → cache invalidation
- Zestawy są specyficzne dla użytkownika (niski hit rate)
- Dane muszą być świeże (real-time dashboard)

**Możliwy caching:**

- Lista zestawów użytkownika (jeśli rzadko się zmienia)
- Metadane przystanków ZTM (stop_id → stop_name)

#### Connection Pooling

- Supabase automatycznie zarządza poolingiem połączeń
- Aplikacja używa `locals.supabase` (connection per request)
- Brak potrzeby dodatkowej konfiguracji

#### Monitoring

**Metryki do śledzenia:**

- Czas odpowiedzi endpointu (p50, p95, p99)
- Liczba błędów 404 vs. 200 (wykrywanie abuse)
- Częstotliwość wywołań na użytkownika (rate limiting)

**Alarmy:**

- Czas odpowiedzi > 1s (p95)
- Error rate > 5%
- Wzrost liczby zapytań z błędami 404 (możliwy atak)

## 9. Etapy wdrożenia

### Krok 1: Rozszerzenie warstwy serwisowej

**Plik:** `src/lib/services/set-items.service.ts`

**Dodać funkcję `deleteSetItem`:**

```typescript
/**
 * Deletes a set item from the database
 *
 * Verifies that the item exists and belongs to the specified set.
 * Database trigger may automatically reindex positions of remaining items.
 *
 * @param supabase - Supabase client instance
 * @param setId - UUID of the set containing the item
 * @param itemId - UUID of the item to delete
 * @throws Error with code 'ITEM_NOT_FOUND' if item doesn't exist in this set
 */
export async function deleteSetItem(supabase: SupabaseClient, setId: string, itemId: string): Promise<void> {
  const { data, error } = await supabase
    .from("set_items")
    .delete()
    .eq("id", itemId)
    .eq("set_id", setId) // Ensures item belongs to this specific set
    .select()
    .single();

  if (error || !data) {
    const notFoundError = new Error("ITEM_NOT_FOUND") as Error & {
      code: "ITEM_NOT_FOUND";
    };
    notFoundError.code = "ITEM_NOT_FOUND";
    throw notFoundError;
  }
}
```

**Uzasadnienie:**

- `.eq("set_id", setId)`: Zapewnia że element należy do właściwego zestawu
- `.select().single()`: Zwraca dane usuniętego elementu, umożliwia sprawdzenie czy coś zostało usunięte
- Rzucanie błędu `ITEM_NOT_FOUND` jeśli `!data`: Element nie istnieje lub należy do innego zestawu

**Testy manualne:**

```typescript
// Test 1: Pomyślne usunięcie
await deleteSetItem(supabase, validSetId, validItemId);
// Oczekiwany wynik: Promise<void>, no error

// Test 2: Nieistniejący element
await deleteSetItem(supabase, validSetId, "non-existent-uuid");
// Oczekiwany wynik: Error z code "ITEM_NOT_FOUND"

// Test 3: Element z innego zestawu
await deleteSetItem(supabase, setAId, itemFromSetBId);
// Oczekiwany wynik: Error z code "ITEM_NOT_FOUND"
```

### Krok 2: Utworzenie pliku endpointu API

**Plik:** `src/pages/api/sets/[setId]/items/[itemId].ts`

**Struktura pliku:**

```typescript
import type { APIRoute } from "astro";
import { getUserId } from "../../../../../lib/auth/get-user-id.ts";
import { mapDatabaseError } from "../../../../../lib/errors/db-errors.ts";
import { deleteSetItem, getAllSetItems, verifySetOwnership } from "../../../../../lib/services/set-items.service.ts";
import type { DeleteSetItemResponse, ErrorResponse } from "../../../../../types.ts";

export const prerender = false;

function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export const DELETE: APIRoute = async ({ params, locals }) => {
  // Implementation in next step
};
```

### Krok 3: Implementacja handlera DELETE

**Plik:** `src/pages/api/sets/[setId]/items/[itemId].ts`

**Implementacja funkcji DELETE:**

```typescript
export const DELETE: APIRoute = async ({ params, locals }) => {
  // 1. Extract and validate URL parameters
  const { setId, itemId } = params;

  if (!setId || !isValidUUID(setId)) {
    return new Response(
      JSON.stringify({
        code: "INVALID_INPUT",
        message: "Invalid set ID format",
      } as ErrorResponse),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  if (!itemId || !isValidUUID(itemId)) {
    return new Response(
      JSON.stringify({
        code: "INVALID_INPUT",
        message: "Invalid item ID format",
      } as ErrorResponse),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 2. Check authentication
  const userIdResult = await getUserId(locals.supabase);

  if (!userIdResult.success) {
    return new Response(JSON.stringify(userIdResult.error), {
      status: userIdResult.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = userIdResult.userId;

  // 3. Delete item and fetch updated list
  try {
    // 3a. Verify set ownership
    await verifySetOwnership(locals.supabase, userId, setId);

    // 3b. Delete the item with verification
    await deleteSetItem(locals.supabase, setId, itemId);

    // 3c. Fetch updated list of remaining items
    const remainingItems = await getAllSetItems(locals.supabase, setId);

    // 4. Format and return successful response
    const response: DeleteSetItemResponse = {
      items: remainingItems,
      deleted_item_id: itemId,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    // Map database errors to user-friendly responses
    console.error("Error deleting set item:", { userId, setId, itemId, error });
    const mappedError = mapDatabaseError(error);

    return new Response(
      JSON.stringify({
        code: mappedError.code,
        message: mappedError.message,
      } as ErrorResponse),
      {
        status: mappedError.status,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
```

### Krok 4: Walidacja implementacji

**4.1. Sprawdzenie linterów**

```bash
npm run lint
```

- Brak błędów TypeScript
- Brak naruszeń ESLint
- Poprawne importy i typy

**4.2. Testowanie manualne z Postman/curl**

**Test 1: Pomyślne usunięcie elementu**

```bash
curl -X DELETE \
  http://localhost:4321/api/sets/{setId}/items/{itemId} \
  -H "Authorization: Bearer {token}" \
  -v
```

Oczekiwany wynik:

- Status: 200 OK
- Body: `{ items: [...], deleted_item_id: "uuid" }`
- items: lista pozostałych elementów, brak usuniętego

**Test 2: Nieprawidłowy UUID setId**

```bash
curl -X DELETE \
  http://localhost:4321/api/sets/invalid-uuid/items/{itemId} \
  -v
```

Oczekiwany wynik:

- Status: 400 Bad Request
- Body: `{ code: "INVALID_INPUT", message: "Invalid set ID format" }`

**Test 3: Nieprawidłowy UUID itemId**

```bash
curl -X DELETE \
  http://localhost:4321/api/sets/{setId}/items/invalid-uuid \
  -v
```

Oczekiwany wynik:

- Status: 400 Bad Request
- Body: `{ code: "INVALID_INPUT", message: "Invalid item ID format" }`

**Test 4: Brak autoryzacji**

```bash
curl -X DELETE \
  http://localhost:4321/api/sets/{setId}/items/{itemId} \
  -v
```

Oczekiwany wynik:

- Status: 401 Unauthorized
- Body: `{ code: "UNAUTHORIZED", message: "Authentication required" }`

**Test 5: Zestaw nie istnieje / nie należy do użytkownika**

```bash
curl -X DELETE \
  http://localhost:4321/api/sets/non-existent-uuid/items/{itemId} \
  -H "Authorization: Bearer {token}" \
  -v
```

Oczekiwany wynik:

- Status: 404 Not Found
- Body: `{ code: "SET_NOT_FOUND", message: "Set not found or access denied" }`

**Test 6: Element nie istnieje w tym zestawie**

```bash
curl -X DELETE \
  http://localhost:4321/api/sets/{setId}/items/non-existent-item-uuid \
  -H "Authorization: Bearer {token}" \
  -v
```

Oczekiwany wynik:

- Status: 404 Not Found
- Body: `{ code: "ITEM_NOT_FOUND", message: "Item not found or access denied" }`

**Test 7: Element należy do innego zestawu**

- Użytkownik ma dostęp do setA
- Próbuje usunąć item z setB (ale podaje setA w URL)

```bash
curl -X DELETE \
  http://localhost:4321/api/sets/{setAId}/items/{itemFromSetBId} \
  -H "Authorization: Bearer {token}" \
  -v
```

Oczekiwany wynik:

- Status: 404 Not Found
- Body: `{ code: "ITEM_NOT_FOUND", message: "Item not found or access denied" }`

**Test 8: Usunięcie ostatniego elementu**

- Zestaw z tylko 1 elementem

```bash
curl -X DELETE \
  http://localhost:4321/api/sets/{setId}/items/{lastItemId} \
  -H "Authorization: Bearer {token}" \
  -v
```

Oczekiwany wynik:

- Status: 200 OK
- Body: `{ items: [], deleted_item_id: "uuid" }`
- items: pusta tablica

### Krok 5: Dokumentacja i finalizacja

**5.1. Aktualizacja dokumentacji API**

- Dodać endpoint do pliku `.ai/api-plan.md` (jeśli istnieje)
- Udokumentować wszystkie kody błędów
- Dodać przykłady żądań i odpowiedzi

**5.2. Code review checklist**

- [ ] Typy TypeScript poprawne i spójne z `src/types.ts`
- [ ] Używa `locals.supabase` zamiast importu bezpośredniego
- [ ] Wszystkie błędy są mapowane przez `mapDatabaseError()`
- [ ] Logowanie błędów z odpowiednim kontekstem
- [ ] Zgodność z wzorcami z innych endpointów
- [ ] Brak hardcoded strings (używa typów `ErrorCode`)
- [ ] Walidacja UUID przed wywołaniami bazy
- [ ] Early returns dla błędów (guard clauses)
- [ ] Brak zagnieżdżonych else statements

---

## Podsumowanie

Endpoint `DELETE /api/sets/{setId}/items/{itemId}` implementuje bezpieczne usuwanie elementów z zestawów użytkownika z pełną walidacją własności i autoryzacji. Kluczowe aspekty implementacji:

- **Bezpieczeństwo:** Wielowarstwowa weryfikacja (set ownership + item membership + RLS)
- **Wydajność:** Optymalne zapytania z użyciem indeksów, maksymalnie 3 query na request
- **Spójność:** Zgodność z istniejącymi wzorcami w codebase
- **Niezawodność:** Obsługa wszystkich scenariuszy błędów z odpowiednimi kodami HTTP
- **UX:** Zwraca zaktualizowaną listę, eliminując potrzebę dodatkowego zapytania z frontendu
