# API Endpoint Implementation Plan: GET /api/sets/{setId}/items

## 1. Przegląd punktu końcowego

**Cel:** Pobrać listę elementów (tabliczek/przystanków ZTM) należących do określonego zestawu użytkownika

**Funkcjonalność:**

- Zwraca wszystkie elementy przypisane do zestawu
- Elementy są uporządkowane według pola `position` (1-based, rosnąco)
- Endpoint jest zabezpieczony - wymaga uwierzytelnienia
- Weryfikuje własność zestawu przez użytkownika
- Maksymalna liczba elementów w zestawie to 6 (wymuszane przez trigger bazodanowy)

**Metoda HTTP:** GET

## 2. Szczegóły żądania

### Struktura URL

```
GET /api/sets/{setId}/items
```

### Parametry URL

#### Wymagane:

- **setId** (string, UUID)
  - Format: UUID v4 (np. `550e8400-e29b-41d4-a716-446655440000`)
  - Walidacja: Regex pattern `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
  - Opis: Unikalny identyfikator zestawu

#### Opcjonalne:

- Brak

### Parametry zapytania (Query Parameters)

- Brak (interfejs użytkownika ogranicza wyświetlanie do maksymalnie 6 kart, co jest wymuszane przez constraint/trigger w bazie danych)

### Nagłówki (Headers)

- **Authorization:** Bearer token (JWT) - zarządzane automatycznie przez Supabase Auth // wymagany w produkcji
- **Content-Type:** application/json

### Request Body

Nie dotyczy (metoda GET nie przyjmuje body)

## 3. Wykorzystywane typy

### DTOs (Data Transfer Objects)

#### SetItemDTO

```typescript
// Źródło: src/types.ts (linie 116-127)
export interface SetItemDTO {
  /** Unique identifier (UUID) */
  id: string;
  /** Foreign key to the parent set */
  set_id: string;
  /** ZTM stop ID (external reference) */
  stop_id: number;
  /** Position in the set (1-based, auto-assigned) */
  position: number;
  /** Optional timestamp when item was added */
  added_at?: string;
}
```

#### SetItemListResponse

```typescript
// Źródło: src/types.ts (linie 154-159)
export interface SetItemListResponse {
  /** Array of items in the set, ordered by position */
  items: SetItemDTO[];
  /** Total number of items in the set */
  total_count: number;
}
```

#### ErrorResponse

```typescript
// Źródło: src/types.ts (linie 204-211)
export interface ErrorResponse {
  /** Error code for client handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Optional additional error details */
  details?: unknown;
}
```

### Command Modele

Nie są wymagane dla tego endpointa (tylko odczyt danych)

## 4. Szczegóły odpowiedzi

### Odpowiedź sukcesu: 200 OK

**Content-Type:** `application/json`

**Struktura:**

```typescript
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "set_id": "123e4567-e89b-12d3-a456-426614174000",
      "stop_id": 1001,
      "position": 1,
      "added_at": "2024-01-15T10:30:00Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "set_id": "123e4567-e89b-12d3-a456-426614174000",
      "stop_id": 1045,
      "position": 2,
      "added_at": "2024-01-15T10:35:00Z"
    }
  ],
  "total_count": 2
}
```

**Puste zestawy:**
Jeśli zestaw istnieje, ale nie ma żadnych elementów:

```json
{
  "items": [],
  "total_count": 0
}
```

### Odpowiedzi błędów

#### 400 Bad Request - Nieprawidłowy format UUID

```json
{
  "code": "INVALID_INPUT",
  "message": "Invalid set ID format"
}
```

**Przyczyny:**

- setId nie jest poprawnym UUID
- setId jest undefined/null

#### 401 Unauthorized - Brak autoryzacji

```json
{
  "code": "UNAUTHORIZED",
  "message": "Authentication required"
}
```

**Przyczyny:**

- Brak lub nieprawidłowy JWT token w sesji
- Token wygasł
- Użytkownik nie jest zalogowany

#### 403 Forbidden - Odmowa dostępu (edge case)

```json
{
  "code": "FORBIDDEN",
  "message": "Access denied"
}
```

**Przyczyny:**

- RLS policy odrzuciło zapytanie (bardzo rzadki przypadek, ponieważ `verifySetOwnership` już to sprawdza)

#### 404 Not Found - Zestaw nie istnieje lub nie należy do użytkownika

```json
{
  "code": "SET_NOT_FOUND",
  "message": "Set not found or access denied"
}
```

**Przyczyny:**

- Zestaw o podanym UUID nie istnieje w bazie
- Zestaw istnieje, ale należy do innego użytkownika
- Zestaw został usunięty

**Uwaga:** Celowo nie rozróżniamy "nie istnieje" vs "nie należy do ciebie" ze względów bezpieczeństwa (zapobieganie enumeration attacks).

#### 500 Internal Server Error - Błąd serwera

```json
{
  "code": "INTERNAL_ERROR",
  "message": "An unexpected error occurred"
}
```

**Przyczyny:**

- Nieoczekiwany błąd bazy danych
- Nieobsłużony wyjątek
- Problem z połączeniem do Supabase

## 5. Przepływ danych

### Diagram przepływu

```
1. Klient wysyła GET /api/sets/{setId}/items
   ↓
2. Middleware Astro przekazuje żądanie do route handler
   ↓
3. Ekstrakcja i walidacja setId z params
   ├─ Jeśli nieprawidłowy UUID → 400 Bad Request
   └─ Jeśli prawidłowy → kontynuuj
   ↓
4. Sprawdzenie uwierzytelnienia (getUserId)
   ├─ Development mode: używa DEV_USER_ID
   ├─ Production: waliduje JWT token
   ├─ Brak autoryzacji → 401 Unauthorized
   └─ Sukces → kontynuuj z userId
   ↓
5. Weryfikacja własności zestawu (verifySetOwnership)
   ├─ Query: SELECT id FROM sets WHERE id = setId AND user_id = userId
   ├─ Brak wyniku → 404 Not Found
   └─ Sukces → kontynuuj
   ↓
6. Pobranie elementów zestawu (getAllSetItems)
   ├─ Query: SELECT id, set_id, stop_id, position
   │         FROM set_items
   │         WHERE set_id = setId
   │         ORDER BY position ASC
   ├─ Błąd bazy → 500 Internal Error
   └─ Sukces → tablica SetItemDTO[]
   ↓
7. Formatowanie odpowiedzi
   ├─ Konstruuj SetItemListResponse
   │  └─ items: tablica SetItemDTO
   │  └─ total_count: items.length
   └─ Return 200 OK z JSON
```

### Interakcje z bazą danych

#### Krok 5: Weryfikacja własności

**Tabela:** `public.sets`
**Operacja:** SELECT (single)
**Filtr:**

- `id = setId` (UUID)
- `user_id = userId` (UUID)

**Bezpieczeństwo:** RLS policy dodatkowo wymusza, że użytkownik może widzieć tylko własne zestawy

#### Krok 6: Pobranie elementów

**Tabela:** `public.set_items`
**Operacja:** SELECT (multiple)
**Kolumny:** id, set_id, stop_id, position
**Filtr:** `set_id = setId`
**Sortowanie:** `ORDER BY position ASC`

**Bezpieczeństwo:** Pośrednie - RLS na `set_items` wymaga, aby powiązany set należał do użytkownika

### Wykorzystywane serwisy

#### 1. getUserId (src/lib/auth/get-user-id.ts)

```typescript
const userIdResult = await getUserId(locals.supabase);
// Returns: GetUserIdResult =
//   | { success: true; userId: string }
//   | { success: false; error: ErrorResponse; status: number }
```

#### 2. verifySetOwnership (src/lib/services/set-items.service.ts)

```typescript
await verifySetOwnership(locals.supabase, userId, setId);
// Returns: void (throws Error with code 'SET_NOT_FOUND' on failure)
```

#### 3. getAllSetItems (src/lib/services/set-items.service.ts)

```typescript
const items = await getAllSetItems(locals.supabase, setId);
// Returns: SetItemDTO[] (ordered by position)
```

## 6. Względy bezpieczeństwa

### Uwierzytelnianie

**Mechanizm:** Supabase Auth z JWT tokens

- **Development mode:** DEV_USER_ID z .env (tylko dla testów lokalnych!)
- **Production mode:** Walidacja JWT token z sesji użytkownika

**Implementacja:**

```typescript
const userIdResult = await getUserId(locals.supabase);
if (!userIdResult.success) {
  return new Response(JSON.stringify(userIdResult.error), {
    status: userIdResult.status, // 401
    headers: { "Content-Type": "application/json" },
  });
}
```

**UWAGA BEZPIECZEŃSTWA:** NIGDY nie ufaj `user_id` z danych klienta. Zawsze pobieraj z sesji serwera!

### Autoryzacja

**Poziom 1: Explicit ownership check**

```typescript
await verifySetOwnership(locals.supabase, userId, setId);
```

- Sprawdza, czy zestaw istnieje i należy do użytkownika
- Rzuca błąd `SET_NOT_FOUND` w przypadku braku dostępu
- Zapewnia lepsze komunikaty błędów niż samo RLS

**Poziom 2: Row Level Security (RLS)**

- Polityki RLS w PostgreSQL zapewniają dodatkową warstwę ochrony
- Nawet jeśli kod endpointa ma błąd, RLS blokuje nieautoryzowany dostęp
- Polityka na `sets`: `user_id = auth.uid()`
- Polityka na `set_items`: weryfikuje własność przez powiązany set

### Walidacja danych wejściowych

#### UUID validation

```typescript
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

if (!setId || !isValidUUID(setId)) {
  return new Response(/* 400 Bad Request */);
}
```

**Zapobiega:**

- SQL injection attacks
- Path traversal attacks
- Nieprawidłowym zapytaniom do bazy

### Zapobieganie enumeration attacks

**Problem:** Atakujący mógłby sprawdzać, które UUID istnieją w systemie

**Rozwiązanie:** Zwracamy ten sam błąd 404 dla:

- Nieistniejących zestawów
- Zestawów należących do innych użytkowników

```json
{
  "code": "SET_NOT_FOUND",
  "message": "Set not found or access denied"
}
```

### Rate Limiting

**Obecnie:** Nie zaimplementowane w tym endpoincie

**Rekomendacja do przyszłości:**

- Middleware rate limiting na poziomie API
- Limity per-user (np. 100 requests/minutę)
- Użycie Redis lub Supabase Edge Functions rate limiting

### HTTPS

**Wymagane:** Wszystkie requesty MUSZĄ używać HTTPS w produkcji

- Hosting na Vercel automatycznie wymusza HTTPS
- JWT tokens są wrażliwe i nie mogą być przesyłane przez HTTP

## 7. Obsługa błędów

### Rodzaje błędów i ich obsługa

#### 1. Walidacja UUID (400)

**Warunek:**

```typescript
if (!setId || !isValidUUID(setId))
```

**Odpowiedź:**

```typescript
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
```

#### 2. Brak autoryzacji (401)

**Warunek:**

```typescript
if (!userIdResult.success)
```

**Odpowiedź:**

```typescript
return new Response(JSON.stringify(userIdResult.error), {
  status: 401,
  headers: { "Content-Type": "application/json" },
});
```

#### 3. Zestaw nie istnieje lub brak dostępu (404)

**Warunek:**

```typescript
// verifySetOwnership() throws Error with code 'SET_NOT_FOUND'
```

**Mapowanie przez `mapDatabaseError()`:**

```typescript
if (error.code === "SET_NOT_FOUND" || error.message === "SET_NOT_FOUND") {
  return {
    code: "SET_NOT_FOUND",
    message: "Set not found or access denied",
    status: 404,
  };
}
```

#### 4. Odmowa dostępu przez RLS (403)

**Warunek:**

```typescript
// PostgreSQL error code 42501 (permission denied)
```

**Mapowanie:**

```typescript
if (error.code === "42501" || error.message?.includes("permission denied")) {
  return {
    code: "FORBIDDEN",
    message: "Access denied",
    status: 403,
  };
}
```

**Uwaga:** To jest edge case - normalnie `verifySetOwnership` już to sprawdza.

#### 5. Nieoczekiwane błędy serwera (500)

**Warunek:**

```typescript
// Wszystkie inne błędy, które nie pasują do powyższych kategorii
```

**Mapowanie:**

```typescript
console.error("Unexpected database error:", error);
return {
  code: "INTERNAL_ERROR",
  message: "An unexpected error occurred",
  status: 500,
};
```

### Logowanie błędów

**Standard logowania:**

```typescript
console.error("Error fetching set items:", {
  userId,
  setId,
  error,
});
```

**Co logować:**

- Typ operacji ("Error fetching set items")
- Kontekst: userId, setId
- Szczegóły błędu: error object

**Co NIE logować:**

- JWT tokens
- Hasła (nie dotyczy tego endpointa)
- Inne wrażliwe dane osobowe

### Struktura try-catch

```typescript
try {
  // 1. Verify ownership
  await verifySetOwnership(locals.supabase, userId, setId);

  // 2. Fetch items
  const items = await getAllSetItems(locals.supabase, setId);

  // 3. Format response
  const response: SetItemListResponse = {
    items,
    total_count: items.length,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
} catch (error: unknown) {
  console.error("Error fetching set items:", { userId, setId, error });
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

## 8. Rozważania dotyczące wydajności

### Optymalizacje na poziomie bazy danych

#### Indeksy

**Wymagane indeksy (powinny już istnieć):**

1. **Primary Key na `set_items.id`** (automatyczny)
2. **Foreign Key index na `set_items.set_id`** (automatyczny lub ręczny)
   - Przyspiesza: `WHERE set_id = ?`
   - Zapytanie: `CREATE INDEX IF NOT EXISTS idx_set_items_set_id ON set_items(set_id);`

3. **Composite index na `(set_id, position)`** (opcjonalny, ale zalecany)
   - Przyspiesza: `WHERE set_id = ? ORDER BY position`
   - Zapytanie: `CREATE INDEX IF NOT EXISTS idx_set_items_set_id_position ON set_items(set_id, position);`

#### Rozmiar wyniku

- **Maksymalnie 6 elementów** w każdym zestawie (wymuszane przez trigger)
- Zapytanie SELECT zawsze zwróci ≤ 6 wierszy
- **Bardzo niskie obciążenie** - nie wymaga paginacji

### Liczba zapytań do bazy

**2 zapytania na request:**

1. `verifySetOwnership()`: SELECT z `sets` (single row)
2. `getAllSetItems()`: SELECT z `set_items` (max 6 rows)

**Potencjalna optymalizacja:**
Można połączyć w jedno zapytanie z JOIN, ale obecne podejście jest:

- Czytelniejsze
- Łatwiejsze w utrzymaniu
- Wystarczająco wydajne (brak N+1 problem)

### Caching

#### Obecnie: Brak cachingu

Każde żądanie wykonuje zapytania do bazy.

### Obciążenie sieci

**Typowy response size:**

```json
{
  "items": [
    /* 6 items, ~150 bytes each */
  ],
  "total_count": 6
}
```

- **Rozmiar:** ~1KB JSON (zależnie od długości UUID)
- **Kompresja:** Gzip automatycznie przez hosting (Vercel/DigitalOcean)
- **Zredukowany rozmiar:** ~300-400 bytes po kompresji

## 9. Kroki implementacji

### Krok 1: Utworzenie pliku endpointa

**Ścieżka:** `src/pages/api/sets/[setId]/items/index.ts`

**Uwaga:** Plik już istnieje z implementacją POST. Dodajemy export `GET`.

**Akcja:** Dodaj nową funkcję `GET` w tym samym pliku.

### Krok 2: Konfiguracja Astro

```typescript
/**
 * Disable prerendering for this API endpoint
 * Required for dynamic API routes that interact with authentication and database
 */
export const prerender = false;
```

**Uwaga:** To już powinno istnieć w pliku z POST handler.

### Krok 3: Import zależności

```typescript
import type { APIRoute } from "astro";
import { getUserId } from "../../../../../lib/auth/get-user-id.ts";
import { mapDatabaseError } from "../../../../../lib/errors/db-errors.ts";
import { getAllSetItems, verifySetOwnership } from "../../../../../lib/services/set-items.service.ts";
import type { SetItemListResponse, ErrorResponse } from "../../../../../types.ts";
```

**Uwaga:** Większość już zaimportowana dla POST handler.

### Krok 4: Implementacja funkcji pomocniczej isValidUUID

**Uwaga:** Funkcja już istnieje w pliku. Użyj jej ponownie.

```typescript
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}
```

### Krok 5: Implementacja GET handler - struktura

```typescript
/**
 * GET /api/sets/{setId}/items - List all items in a set
 *
 * URL Parameters:
 * - setId: UUID of the set
 *
 * Returns:
 * - 200: List of items with metadata
 * - 400: Invalid UUID format
 * - 401: Authentication required
 * - 403: Access denied (RLS rejection, rare)
 * - 404: Set not found or not owned by user
 * - 500: Unexpected server error
 */
export const GET: APIRoute = async ({ params, locals }) => {
  // Implementation steps follow...
};
```

### Krok 6: Ekstrakcja i walidacja setId

```typescript
// 1. Extract and validate setId from URL params
const { setId } = params;

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
```

### Krok 7: Sprawdzenie uwierzytelnienia

```typescript
// 2. Check authentication
const userIdResult = await getUserId(locals.supabase);

if (!userIdResult.success) {
  return new Response(JSON.stringify(userIdResult.error), {
    status: userIdResult.status, // 401
    headers: { "Content-Type": "application/json" },
  });
}

const userId = userIdResult.userId;
```

### Krok 8: Implementacja logiki try-catch

```typescript
// 3. Fetch items with ownership verification
try {
  // 3a. Verify set ownership (provides better error messages than RLS alone)
  await verifySetOwnership(locals.supabase, userId, setId);

  // 3b. Fetch all items in the set (ordered by position)
  const items = await getAllSetItems(locals.supabase, setId);

  // 4. Format and return successful response
  const response: SetItemListResponse = {
    items,
    total_count: items.length,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
} catch (error: unknown) {
  // Map database errors to user-friendly responses
  console.error("Error fetching set items:", { userId, setId, error });
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

### Krok 9: Testowanie (manulane lub automatyczne)

#### Test Case 1: Sukces - Pobranie elementów

**Request:**

```http
GET /api/sets/123e4567-e89b-12d3-a456-426614174000/items
Authorization: Bearer {valid-jwt-token}
```

**Expected Response:** 200 OK

```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "set_id": "123e4567-e89b-12d3-a456-426614174000",
      "stop_id": 1001,
      "position": 1
    }
  ],
  "total_count": 1
}
```

#### Test Case 2: Pusty zestaw

**Request:**

```http
GET /api/sets/123e4567-e89b-12d3-a456-426614174000/items
Authorization: Bearer {valid-jwt-token}
```

**Expected Response:** 200 OK

```json
{
  "items": [],
  "total_count": 0
}
```

#### Test Case 3: Nieprawidłowy UUID

**Request:**

```http
GET /api/sets/invalid-uuid/items
Authorization: Bearer {valid-jwt-token}
```

**Expected Response:** 400 Bad Request

```json
{
  "code": "INVALID_INPUT",
  "message": "Invalid set ID format"
}
```

#### Test Case 4: Brak autoryzacji

**Request:**

```http
GET /api/sets/123e4567-e89b-12d3-a456-426614174000/items
(No Authorization header)
```

**Expected Response:** 401 Unauthorized

```json
{
  "code": "UNAUTHORIZED",
  "message": "Authentication required"
}
```

#### Test Case 5: Zestaw nie istnieje

**Request:**

```http
GET /api/sets/00000000-0000-0000-0000-000000000000/items
Authorization: Bearer {valid-jwt-token}
```

**Expected Response:** 404 Not Found

```json
{
  "code": "SET_NOT_FOUND",
  "message": "Set not found or access denied"
}
```

#### Test Case 6: Zestaw należy do innego użytkownika

**Request:**

```http
GET /api/sets/{other-user-set-id}/items
Authorization: Bearer {valid-jwt-token}
```

**Expected Response:** 404 Not Found

```json
{
  "code": "SET_NOT_FOUND",
  "message": "Set not found or access denied"
}
```

### Krok 10: Weryfikacja działania z istniejącymi serwisami

**Sprawdzić:**

- ✅ `getUserId()` poprawnie zwraca userId lub błąd 401
- ✅ `verifySetOwnership()` poprawnie rzuca `SET_NOT_FOUND` dla nieistniejących/cudzych zestawów
- ✅ `getAllSetItems()` poprawnie zwraca tablicę SetItemDTO[] uporządkowaną według position
- ✅ `mapDatabaseError()` poprawnie mapuje wszystkie rodzaje błędów

### Krok 11: Dokumentacja

**Dodać komentarze JSDoc:**

```typescript
/**
 * GET /api/sets/{setId}/items - List all items in a set
 *
 * Returns items ordered by position (1-based, ascending).
 * Maximum of 6 items per set enforced by database trigger.
 *
 * URL Parameters:
 * - setId: UUID of the set
 *
 * Returns:
 * - 200: List of items with metadata
 * - 400: Invalid UUID format
 * - 401: Authentication required
 * - 403: Access denied (rare, RLS rejection)
 * - 404: Set not found or not owned by user
 * - 500: Unexpected server error
 *
 * @example
 * Response (200):
 * {
 *   "items": [
 *     {
 *       "id": "550e8400-...",
 *       "set_id": "123e4567-...",
 *       "stop_id": 1001,
 *       "position": 1,
 *       "added_at": "2024-01-15T10:30:00Z"
 *     }
 *   ],
 *   "total_count": 1
 * }
 */
```

### Krok 12: Code review checklist

**Przed mergem sprawdzić:**

- [ ] Walidacja UUID działa poprawnie
- [ ] Uwierzytelnienie jest wymuszane (401 gdy brak tokena)
- [ ] Autoryzacja jest weryfikowana (404 dla cudzych zestawów)
- [ ] Obsługa błędów obejmuje wszystkie scenariusze
- [ ] Logowanie błędów zawiera kontekst (userId, setId)
- [ ] Odpowiedzi mają poprawne Content-Type headers
- [ ] Kody statusu HTTP są zgodne ze specyfikacją
- [ ] TypeScript types są poprawnie użyte (SetItemListResponse, ErrorResponse)
- [ ] Brak duplikacji kodu z POST handler (współdzielona funkcja isValidUUID)
- [ ] Export `prerender = false` istnieje
- [ ] Komentarze JSDoc są aktualne i kompletne

## Podsumowanie

Endpoint **GET /api/sets/{setId}/items** jest prostym endpointem odczytu z następującymi charakterystykami:

✅ **Bezpieczny:** Wymaga uwierzytelnienia i weryfikuje własność zasobu  
✅ **Wydajny:** Maksymalnie 2 proste zapytania SQL, zawsze ≤ 6 elementów  
✅ **Przejrzysty:** Wykorzystuje istniejące serwisy i spójną obsługę błędów  
✅ **Testowalny:** Jasno zdefiniowane przypadki testowe  
✅ **Skalowalny:** Gotowy na przyszłe optymalizacje (caching, indexing)

**Szacowany czas implementacji:** 30-45 minut dla doświadczonego developera, włączając testowanie.
