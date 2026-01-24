# API Endpoint Implementation Plan: POST /api/sets/{setId}/items

## 1. Przegląd punktu końcowego

Endpoint służy do dodawania nowego przystanku (stop card) do istniejącego zestawu użytkownika. Trigger bazodanowy automatycznie przypisuje kolejną pozycję (1-based, max+1) do nowo dodanego elementu. Endpoint wymaga autentykacji i weryfikuje własność zestawu przed dodaniem elementu.

**Główne funkcjonalności:**

- Dodanie nowego przystanku ZTM do zestawu
- Automatyczne przypisanie pozycji przez trigger bazodanowy
- Walidacja limitu elementów (max 6 per set)
- Walidacja unikalności stop_id w ramach zestawu
- Zwrócenie zaktualizowanej listy wszystkich elementów w zestawie

---

## 2. Szczegóły żądania

### Metoda HTTP

`POST`

### Struktura URL

```
POST /api/sets/{setId}/items
```

### Parametry URL

- **setId** (wymagany, UUID)
  - Identyfikator zestawu, do którego ma zostać dodany element
  - Musi być prawidłowym formatem UUID
  - Zestaw musi należeć do zalogowanego użytkownika

### Request Headers

```
Content-Type: application/json
Authorization: Bearer {supabase_auth_token}
```

### Request Body

```typescript
{
  "stop_id": number  // wymagany, positive integer
}
```

**Przykład:**

```json
{
  "stop_id": 1042
}
```

### Walidacja Request Body

- `stop_id`:
  - **Typ:** number (integer)
  - **Wymagany:** tak
  - **Walidacja:** musi być dodatnią liczbą całkowitą (positive integer)
  - **Znaczenie:** ID przystanku ZTM z systemu zewnętrznego

---

## 3. Wykorzystywane typy

### DTOs (z `src/types.ts`)

```typescript
// Input type - Command Model
export interface CreateSetItemCommand {
  stop_id: number;
}

// Output type - Response
export interface CreateSetItemResponse {
  items: SetItemDTO[];
  created_item: Pick<SetItemDTO, "id" | "stop_id" | "position">;
}

// SetItem DTO - pojedynczy element w zestawie
export interface SetItemDTO {
  id: string;
  set_id: string;
  stop_id: number;
  position: number;
  added_at?: string;
}

// Error response structure
export interface ErrorResponse {
  code: string;
  message: string;
  details?: unknown;
}
```

### Database Types (używane w service layer)

```typescript
// SetItemEntity - baza danych
export type SetItemEntity = Tables<"set_items">;

// SetItemInsert - insert do bazy danych
export type SetItemInsert = TablesInsert<"set_items">;
```

---

## 4. Szczegóły odpowiedzi

### Sukces: 201 Created

**Response Body:**

```typescript
{
  "items": SetItemDTO[],          // Wszystkie elementy w zestawie, posortowane po position
  "created_item": {
    "id": string,                  // UUID nowo utworzonego elementu
    "stop_id": number,             // ID przystanku
    "position": number             // Automatycznie przypisana pozycja (1-based)
  }
}
```

**Przykład:**

```json
{
  "items": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "set_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "stop_id": 1001,
      "position": 1
    },
    {
      "id": "223e4567-e89b-12d3-a456-426614174001",
      "set_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "stop_id": 1042,
      "position": 2
    }
  ],
  "created_item": {
    "id": "223e4567-e89b-12d3-a456-426614174001",
    "stop_id": 1042,
    "position": 2
  }
}
```

### Błędy

#### 400 Bad Request - Invalid Input

```json
{
  "code": "INVALID_INPUT",
  "message": "Stop ID is required and must be a positive integer"
}
```

**Scenariusze:**

- Brak `stop_id` w request body
- `stop_id` nie jest liczbą całkowitą
- `stop_id` jest ujemny lub zero
- Invalid JSON w request body

#### 400 Bad Request - Invalid Set ID Format

```json
{
  "code": "INVALID_INPUT",
  "message": "Invalid set ID format"
}
```

**Scenariusze:**

- `setId` w URL nie jest prawidłowym UUID

#### 400 Bad Request - Max Items Exceeded

```json
{
  "code": "MAX_ITEMS_PER_SET_EXCEEDED",
  "message": "Maximum number of items (6) reached for this set"
}
```

**Scenariusze:**

- Zestaw już zawiera 6 elementów (limit)
- Trigger bazodanowy odrzuca insert z komunikatem `MAX_ITEMS_PER_SET_EXCEEDED`

#### 401 Unauthorized

```json
{
  "code": "UNAUTHORIZED",
  "message": "Authentication required"
}
```

**Scenariusze:**

- Brak tokenu autentykacji
- Nieprawidłowy lub wygasły token

#### 403 Forbidden

```json
{
  "code": "FORBIDDEN",
  "message": "Access denied"
}
```

**Scenariusze:**

- RLS policy rejection (edge case - normalnie obsłużone jako 404)

#### 404 Not Found

```json
{
  "code": "SET_NOT_FOUND",
  "message": "Set not found or access denied"
}
```

**Scenariusze:**

- Zestaw o podanym `setId` nie istnieje
- Zestaw nie należy do zalogowanego użytkownika

#### 409 Conflict

```json
{
  "code": "SET_ITEM_ALREADY_EXISTS",
  "message": "This stop is already added to the set"
}
```

**Scenariusze:**

- `stop_id` już istnieje w tym zestawie
- Unique constraint violation: `set_items_set_id_stop_id_uniq`

#### 500 Internal Server Error

```json
{
  "code": "INTERNAL_ERROR",
  "message": "An unexpected error occurred"
}
```

**Scenariusze:**

- Nieoczekiwany błąd bazy danych
- Błąd komunikacji z Supabase

---

## 5. Przepływ danych

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ POST /api/sets/{setId}/items
       │ { stop_id: 1042 }
       ▼
┌─────────────────────────────────────────────────────┐
│ API Route: /api/sets/[setId]/items/index.ts        │
│                                                     │
│ 1. Validate setId format (UUID)                    │
│ 2. Check authentication → getUserId()              │
│ 3. Parse & validate request body (Zod)             │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│ Service: set-items.service.ts                       │
│                                                     │
│ 4a. Verify set ownership                           │
│     → Check if set exists + belongs to user        │
│                                                     │
│ 4b. Create set item                                │
│     → Insert { set_id, stop_id, position: NULL }   │
│                                                     │
│ 4c. Fetch all set items (ordered by position)      │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│ Supabase (PostgreSQL)                               │
│                                                     │
│ 5a. RLS Policy Check:                              │
│     → Verify set belongs to auth.uid()             │
│                                                     │
│ 5b. Before Insert Trigger:                         │
│     → enforce_set_items_limit_and_position()       │
│     → Count items in set (reject if >= 6)          │
│     → Auto-assign position = max(position) + 1     │
│                                                     │
│ 5c. Unique Constraint Check:                       │
│     → Verify (set_id, stop_id) is unique           │
│     → Reject if duplicate (code 23505)             │
│                                                     │
│ 5d. Insert row & return with assigned position     │
│                                                     │
│ 5e. Query all items ordered by position            │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│ API Route (Response Formatting)                     │
│                                                     │
│ 6. Format CreateSetItemResponse                    │
│    → items: all items in set                       │
│    → created_item: { id, stop_id, position }       │
│                                                     │
│ 7. Return 201 Created                              │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────┐
│   Client    │
│ ← Response  │
└─────────────┘
```

### Szczegóły kroków:

1. **Walidacja parametrów URL:**
   - Sprawdzenie czy `setId` jest prawidłowym UUID
   - Użycie funkcji `isValidUUID()` (istniejąca w [setId].ts)

2. **Autentykacja:**
   - Wywołanie `getUserId(locals.supabase)`
   - Zwrócenie 401 jeśli użytkownik niezalogowany

3. **Walidacja request body:**
   - Parsowanie JSON
   - Walidacja schema Zod: `createSetItemCommandSchema`
   - Zwrócenie 400 jeśli walidacja nie przejdzie

4. **Weryfikacja własności zestawu:**
   - Wywołanie `verifySetOwnership(supabase, userId, setId)`
   - Zwrócenie 404 jeśli set nie istnieje lub nie należy do użytkownika

5. **Utworzenie elementu:**
   - Insert do `set_items` z `position: NULL` (trigger przypisze wartość)
   - Trigger automatycznie:
     - Sprawdza limit 6 elementów (raise exception jeśli >= 6)
     - Przypisuje position = max(position) + 1 lub 1 jeśli puste
   - Unique constraint sprawdza czy (set_id, stop_id) jest unikalne

6. **Pobranie zaktualizowanej listy:**
   - Query wszystkich elementów w zestawie
   - Sortowanie po `position ASC`

7. **Formatowanie odpowiedzi:**
   - Struktura `CreateSetItemResponse`
   - Zwrócenie 201 Created

---

## 6. Względy bezpieczeństwa

### Autentykacja

- **Mechanizm:** Supabase Auth (JWT token)
- **Implementacja:** `getUserId(locals.supabase)`
- **Weryfikacja:** Każde żądanie wymaga ważnego tokenu sesji
- **Dev mode:** Obsługa DEV_USER_ID dla lokalnego development

### Autoryzacja

- **RLS Policies:**
  - Policy `set_items_insert_authenticated`: Sprawdza czy set należy do `auth.uid()`
  - Policy używa EXISTS subquery do weryfikacji własności przez `public.sets`
- **Ownership Verification:**
  - Jawna weryfikacja w service layer: `verifySetOwnership()`
  - Podwójna ochrona: API + RLS
  - Zwracanie 404 zamiast 403 aby nie ujawniać istnienia zasobów

### Walidacja danych wejściowych

- **UUID validation:** Sprawdzenie formatu setId (regex)
- **Zod schema:** Walidacja stop_id (integer, positive)
- **JSON parsing:** Try-catch dla nieprawidłowego JSON
- **Type safety:** TypeScript enforces types w całym pipeline

### Ochrona przed atakami

#### SQL Injection

- **Mitigacja:** Supabase client używa parametryzowanych zapytań
- **Ryzyko:** Brak - wszystkie parametry są bezpiecznie bindowane

#### Rate Limiting

- **Status:** Nie zaimplementowany w MVP
- **Rekomendacja:** Dodać w przyszłości (np. Supabase Edge Functions rate limits)

#### Data Validation

- **Input validation:** Zod schema catches invalid types/formats
- **Business logic validation:** Triggers enforce limits (6 items, unique stop_id)
- **Output sanitization:** TypeScript types ensure correct response structure

#### CORS

- **Status:** Konfiguracja Astro + Supabase
- **Uwaga:** Sprawdzić ustawienia CORS w production

### Ochrona danych użytkownika

- **RLS:** Force Row Level Security enabled na `set_items`
- **Isolation:** Użytkownik widzi tylko własne zestawy i elementy
- **Cascade delete:** ON DELETE CASCADE zapewnia czyszczenie danych

---

## 7. Obsługa błędów

### Błędy walidacji (400 Bad Request)

#### 1. Invalid Set ID Format

**Przyczyna:** `setId` w URL nie jest UUID  
**Kod:** `INVALID_INPUT`  
**Message:** `"Invalid set ID format"`  
**Detekcja:** `!isValidUUID(setId)`  
**Handler:** Route handler

#### 2. Invalid Request Body

**Przyczyna:** JSON parse error lub brak body  
**Kod:** `INVALID_INPUT`  
**Message:** `"Invalid JSON body"`  
**Detekcja:** `request.json()` throws  
**Handler:** Try-catch w route handler

#### 3. Invalid stop_id

**Przyczyna:** Zod validation fails (not number, not positive, not integer)  
**Kod:** `INVALID_STOP_ID`  
**Message:** `firstError.message` z Zod (np. "Stop ID must be a positive integer")  
**Detekcja:** `createSetItemCommandSchema.safeParse()`  
**Handler:** Route handler

#### 4. Max Items Per Set Exceeded

**Przyczyna:** Zestaw już zawiera 6 elementów  
**Kod:** `MAX_ITEMS_PER_SET_EXCEEDED`  
**Message:** `"Maximum number of items (6) reached for this set"`  
**Detekcja:** Trigger `enforce_set_items_limit_and_position()` raises exception  
**Handler:** `mapDatabaseError()` - check `error.message.includes("MAX_ITEMS_PER_SET_EXCEEDED")`

### Błędy autoryzacji

#### 5. Unauthorized (401)

**Przyczyna:** Brak tokenu lub nieprawidłowy token  
**Kod:** `UNAUTHORIZED`  
**Message:** `"Authentication required"`  
**Detekcja:** `getUserId()` returns `!success`  
**Handler:** Route handler - zwraca `userIdResult.error`

#### 6. Forbidden (403)

**Przyczyna:** RLS policy rejection (edge case)  
**Kod:** `FORBIDDEN`  
**Message:** `"Access denied"`  
**Detekcja:** Database error code `42501` lub `"permission denied"` in message  
**Handler:** `mapDatabaseError()`

### Błędy zasobów

#### 7. Set Not Found (404)

**Przyczyna:** Set nie istnieje lub nie należy do użytkownika  
**Kod:** `SET_NOT_FOUND`  
**Message:** `"Set not found or access denied"`  
**Detekcja:** `verifySetOwnership()` throws lub no rows returned  
**Handler:** Service layer throws error, caught by `mapDatabaseError()`

### Błędy konfliktu

#### 8. Duplicate Stop ID (409)

**Przyczyna:** `stop_id` już istnieje w tym zestawie  
**Kod:** `SET_ITEM_ALREADY_EXISTS`  
**Message:** `"This stop is already added to the set"`  
**Detekcja:** Database unique constraint violation:

- `error.code === "23505"`
- `error.constraint === "set_items_set_id_stop_id_uniq"`  
  **Handler:** `mapDatabaseError()` - nowy mapping do dodania

### Błędy serwera

#### 9. Internal Server Error (500)

**Przyczyna:** Nieoczekiwany błąd (database down, network error, etc.)  
**Kod:** `INTERNAL_ERROR`  
**Message:** `"An unexpected error occurred"`  
**Detekcja:** Catch-all w try-catch bloku  
**Handler:** Top-level catch block w route handler

### Error Mapping Flow

```typescript
// w mapDatabaseError() - nowe mappingi do dodania:

// 1. Duplicate stop_id w zestawie
if (
  error.code === "23505" &&
  (error.constraint === "set_items_set_id_stop_id_uniq" || error.message?.includes("set_items_set_id_stop_id_uniq"))
) {
  return {
    code: "SET_ITEM_ALREADY_EXISTS",
    message: "This stop is already added to the set",
    status: 409,
  };
}

// 2. Max items per set exceeded
if (error.message?.includes("MAX_ITEMS_PER_SET_EXCEEDED")) {
  return {
    code: "MAX_ITEMS_PER_SET_EXCEEDED",
    message: "Maximum number of items (6) reached for this set",
    status: 400,
  };
}

// 3. Set not found (from service layer)
if (error.code === "SET_NOT_FOUND" || error.message === "SET_NOT_FOUND") {
  return {
    code: "SET_NOT_FOUND",
    message: "Set not found or access denied",
    status: 404,
  };
}
```

### Logging Strategy

- **Console.error:** Wszystkie błędy logowane z kontekstem (userId, setId, stop_id)
- **Format:** `console.error("Error creating set item:", { userId, setId, stop_id, error })`
- **Production:** Rozważyć integrację z zewnętrznym systemem logowania (Sentry, LogRocket)

---

## 8. Rozważania dotyczące wydajności

### Potencjalne wąskie gardła

#### 1. Multiple Database Queries

**Problem:** Endpoint wykonuje 3 query:

1. Verify set ownership
2. Insert set_item
3. Fetch all set items

**Mitigacja:**

- RLS policies już sprawdzają ownership podczas insert - można pominąć explicit check
- Wszystkie queries są indeksowane:
  - `set_items_set_id_idx` - dla ownership check i fetch items
  - `set_items_set_id_position_idx` - dla sorted fetch
  - `set_items_set_id_stop_id_uniq` - dla duplicate check

**Optymalizacja:** Połączyć ownership check z insert (polegać na RLS + error handling)

#### 2. Trigger Execution Time

**Problem:** Before-insert trigger wykonuje COUNT i MAX queries

**Analiza:**

- Count i MAX na max 6 rows (limit enforced)
- Używa indeksu `set_items_set_id_idx`
- Bardzo szybkie dla małych zbiorów

**Mitigacja:** Brak potrzeby - performance jest akceptowalny dla MVP

#### 3. N+1 Query Problem

**Problem:** Nie dotyczy - pojedynczy query dla wszystkich items

**Zapobieganie:** Użycie `.select()` z relationshipami w Supabase

### Strategie optymalizacji

#### Database Indexes (już zaimplementowane)

```sql
-- Dla ownership check i fetch items
CREATE INDEX set_items_set_id_idx ON public.set_items (set_id);

-- Dla sorted fetch
CREATE INDEX set_items_set_id_position_idx ON public.set_items (set_id, position);

-- Dla duplicate check
CREATE UNIQUE INDEX set_items_set_id_stop_id_uniq ON public.set_items (set_id, stop_id);
```

#### Query Optimization

- **Order by position:** Używa indeksu `set_items_set_id_position_idx`
- **Filtering by set_id:** Używa indeksu `set_items_set_id_idx`
- **Limit set size:** Max 6 items = zawsze szybkie queries

#### Caching Strategy

**Current:** Brak cache (MVP)

**Future considerations:**

- Cache user's sets w localStorage (client-side)
- Cache validation w Redis (server-side) - dla rate limiting
- Supabase Realtime subscriptions dla live updates

#### Connection Pooling

- **Supabase:** Automatyczne connection pooling
- **Brak akcji:** Handled by platform

### Performance Metrics (Expected)

| Operacja        | Czas (avg)    | Notes                  |
| --------------- | ------------- | ---------------------- |
| UUID validation | < 1ms         | Regex match            |
| Authentication  | 10-50ms       | Supabase session check |
| Zod validation  | < 1ms         | Simple schema          |
| Ownership check | 5-20ms        | Indexed query          |
| Insert item     | 10-30ms       | With trigger execution |
| Fetch items     | 5-15ms        | Max 6 rows, indexed    |
| **Total**       | **~50-150ms** | End-to-end             |

### Monitoring Recommendations

- Log slow queries (> 200ms)
- Monitor trigger execution time
- Track 409 Conflict rate (może wskazywać na UX issues)
- Monitor 400 Max Items errors (user behavior insights)

---

## 9. Etapy wdrożenia

### Krok 1: Rozszerzenie typów i walidacji (jeśli potrzebne)

**Lokalizacja:** `src/lib/validation/sets.validation.ts` lub nowy plik `set-items.validation.ts`

**Zadanie:**

```typescript
// Nowy Zod schema dla CreateSetItemCommand
export const createSetItemCommandSchema = z.object({
  stop_id: z
    .number({ required_error: "Stop ID is required" })
    .int("Stop ID must be an integer")
    .positive("Stop ID must be a positive integer"),
});

export type CreateSetItemCommandInput = z.infer<typeof createSetItemCommandSchema>;
```

**Alternatywa:** Jeśli typy już istnieją i są wystarczające, pominąć ten krok.

---

### Krok 2: Rozszerzenie error mappings

**Lokalizacja:** `src/lib/errors/db-errors.ts`

**Zadanie:** Dodać mappingi dla nowych błędów:

```typescript
// W funkcji mapDatabaseError() dodać PRZED generic error:

// Duplicate stop_id in set - unique constraint
if (
  error.code === "23505" &&
  (error.constraint === "set_items_set_id_stop_id_uniq" || error.message?.includes("set_items_set_id_stop_id_uniq"))
) {
  return {
    code: "SET_ITEM_ALREADY_EXISTS",
    message: "This stop is already added to the set",
    status: 409,
  };
}

// Max items per set exceeded - trigger
if (error.message?.includes("MAX_ITEMS_PER_SET_EXCEEDED")) {
  return {
    code: "MAX_ITEMS_PER_SET_EXCEEDED",
    message: "Maximum number of items (6) reached for this set",
    status: 400,
  };
}

// Item not found - custom error from service (for future DELETE)
if (error.code === "ITEM_NOT_FOUND" || error.message === "ITEM_NOT_FOUND") {
  return {
    code: "ITEM_NOT_FOUND",
    message: "Item not found or access denied",
    status: 404,
  };
}
```

**Uwaga:** Dodać również kod `SET_ITEM_ALREADY_EXISTS` do typu `ErrorCode` w `src/types.ts` jeśli nie istnieje.

---

### Krok 3: Utworzenie service layer dla set items

**Lokalizacja:** `src/lib/services/set-items.service.ts` (nowy plik)

**Zadanie:** Implementacja funkcji serwisowych:

```typescript
import type { SupabaseClient } from "../../db/supabase.client.ts";
import type { SetItemDTO, SetItemEntity } from "../../types.ts";

/**
 * Verifies that a set exists and belongs to the specified user
 * @throws Error with code 'SET_NOT_FOUND' if set doesn't exist or user doesn't own it
 */
export async function verifySetOwnership(supabase: SupabaseClient, userId: string, setId: string): Promise<void> {
  const { data, error } = await supabase.from("sets").select("id").eq("id", setId).eq("user_id", userId).single();

  if (error || !data) {
    const notFoundError = new Error("SET_NOT_FOUND") as Error & { code: "SET_NOT_FOUND" };
    notFoundError.code = "SET_NOT_FOUND";
    throw notFoundError;
  }
}

/**
 * Creates a new set item (adds stop to set)
 * Position is auto-assigned by database trigger
 * @returns The newly created set item with assigned position
 * @throws Error if database operation fails (duplicate stop_id, max items, etc.)
 */
export async function createSetItem(supabase: SupabaseClient, setId: string, stopId: number): Promise<SetItemEntity> {
  // Insert with position NULL - trigger will assign it
  const { data, error } = await supabase
    .from("set_items")
    .insert({
      set_id: setId,
      stop_id: stopId,
      position: null, // Trigger assigns: max(position) + 1
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Failed to create set item: no data returned");
  }

  return data;
}

/**
 * Retrieves all items in a set, ordered by position
 * @returns Array of SetItemDTO ordered by position (ASC)
 */
export async function getAllSetItems(supabase: SupabaseClient, setId: string): Promise<SetItemDTO[]> {
  const { data, error } = await supabase
    .from("set_items")
    .select("id, set_id, stop_id, position, added_at")
    .eq("set_id", setId)
    .order("position", { ascending: true });

  if (error) {
    throw error;
  }

  if (!data) {
    return [];
  }

  return data.map((item) => ({
    id: item.id,
    set_id: item.set_id,
    stop_id: item.stop_id,
    position: item.position,
    added_at: item.added_at || undefined,
  }));
}
```

**Uwagi:**

- `verifySetOwnership` jest opcjonalne - RLS policies już to sprawdzają
- Można polegać tylko na RLS i error handling
- Jednak explicit check daje lepszą kontrolę nad error messages

---

### Krok 4: Utworzenie route handler

**Lokalizacja:** `src/pages/api/sets/[setId]/items/index.ts` (nowy plik)

**Struktura katalogów:** Utworzyć folder `items` w `src/pages/api/sets/[setId]/`

**Zadanie:** Implementacja POST endpoint:

```typescript
import type { APIRoute } from "astro";

import { getUserId } from "../../../../../lib/auth/get-user-id.ts";
import { mapDatabaseError } from "../../../../../lib/errors/db-errors.ts";
import { createSetItem, getAllSetItems, verifySetOwnership } from "../../../../../lib/services/set-items.service.ts";
import { createSetItemCommandSchema } from "../../../../../lib/validation/sets.validation.ts"; // lub set-items.validation.ts
import type { CreateSetItemResponse, ErrorResponse } from "../../../../../types.ts";

/**
 * Disable prerendering for this API endpoint
 */
export const prerender = false;

/**
 * Helper function to validate UUID format
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * POST /api/sets/{setId}/items - Add a new stop to the set
 *
 * URL Parameters:
 * - setId: UUID of the set
 *
 * Request body:
 * - stop_id: number (positive integer)
 *
 * Returns:
 * - 201: Created item with updated list of all items in set
 * - 400: Invalid input (bad UUID, invalid stop_id, max items exceeded)
 * - 401: Authentication required
 * - 404: Set not found or not owned by user
 * - 409: Stop already exists in this set
 * - 500: Unexpected server error
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
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

  // 2. Check authentication
  const userIdResult = await getUserId(locals.supabase);

  if (!userIdResult.success) {
    return new Response(JSON.stringify(userIdResult.error), {
      status: userIdResult.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = userIdResult.userId;

  // 3. Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        code: "INVALID_INPUT",
        message: "Invalid JSON body",
      } as ErrorResponse),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 4. Validate input with Zod schema
  const validationResult = createSetItemCommandSchema.safeParse(body);
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0];
    return new Response(
      JSON.stringify({
        code: "INVALID_STOP_ID",
        message: firstError?.message || "Invalid stop_id",
      } as ErrorResponse),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const { stop_id } = validationResult.data;

  // 5. Create set item and fetch updated list
  try {
    // 5a. Verify set ownership (optional - RLS will also check)
    await verifySetOwnership(locals.supabase, userId, setId);

    // 5b. Create the new set item (position auto-assigned by trigger)
    const newItem = await createSetItem(locals.supabase, setId, stop_id);

    // 5c. Fetch updated list of all items in the set
    const allItems = await getAllSetItems(locals.supabase, setId);

    // 6. Format and return successful response
    const response: CreateSetItemResponse = {
      items: allItems,
      created_item: {
        id: newItem.id,
        stop_id: newItem.stop_id,
        position: newItem.position,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    // Map database errors to user-friendly responses
    // eslint-disable-next-line no-console
    console.error("Error creating set item:", { userId, setId, stop_id, error });
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

**Uwagi:**

- Skopiować pattern z istniejących endpointów (`POST /api/sets`, `PATCH /api/sets/{setId}`)
- Używać `locals.supabase` zamiast importować `supabaseClient` bezpośrednio
- Error logging z kontekstem dla debugowania

---

### Krok 5: Testy manualne endpoint

**Setup:**

1. Uruchomić lokalną bazę Supabase: `npx supabase start`
2. Uruchomić dev server: `npm run dev`
3. Utworzyć testowego użytkownika i zestaw

**Test Cases:**

#### TC1: Sukces - dodanie pierwszego elementu

```bash
# Setup: Create test set first
SET_ID="<uuid-from-create-set>"

# Request
curl -X POST http://localhost:4321/api/sets/$SET_ID/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"stop_id": 1042}'

# Expected: 201 Created
# {
#   "items": [{"id": "...", "set_id": "...", "stop_id": 1042, "position": 1}],
#   "created_item": {"id": "...", "stop_id": 1042, "position": 1}
# }
```

#### TC2: Sukces - dodanie kolejnych elementów

```bash
# Add more items - verify position auto-increment
curl -X POST http://localhost:4321/api/sets/$SET_ID/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"stop_id": 1043}'

# Expected: position = 2
```

#### TC3: Błąd - duplikat stop_id

```bash
# Try to add same stop_id again
curl -X POST http://localhost:4321/api/sets/$SET_ID/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"stop_id": 1042}'

# Expected: 409 Conflict
# {"code": "SET_ITEM_ALREADY_EXISTS", "message": "This stop is already added to the set"}
```

#### TC4: Błąd - max items exceeded

```bash
# Add 6 items, then try 7th
for i in {1001..1006}; do
  curl -X POST http://localhost:4321/api/sets/$SET_ID/items \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <token>" \
    -d "{\"stop_id\": $i}"
done

# Try 7th item
curl -X POST http://localhost:4321/api/sets/$SET_ID/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"stop_id": 1007}'

# Expected: 400 Bad Request
# {"code": "MAX_ITEMS_PER_SET_EXCEEDED", "message": "Maximum number of items (6) reached for this set"}
```

#### TC5: Błąd - invalid stop_id

```bash
# Negative stop_id
curl -X POST http://localhost:4321/api/sets/$SET_ID/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"stop_id": -1}'

# Expected: 400 Bad Request
# {"code": "INVALID_STOP_ID", "message": "Stop ID must be a positive integer"}

# Non-integer stop_id
curl -X POST http://localhost:4321/api/sets/$SET_ID/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"stop_id": 1.5}'

# Expected: 400 Bad Request
```

#### TC6: Błąd - missing stop_id

```bash
curl -X POST http://localhost:4321/api/sets/$SET_ID/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{}'

# Expected: 400 Bad Request
# {"code": "INVALID_STOP_ID", "message": "Stop ID is required"}
```

#### TC7: Błąd - invalid setId format

```bash
curl -X POST http://localhost:4321/api/sets/not-a-uuid/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"stop_id": 1042}'

# Expected: 400 Bad Request
# {"code": "INVALID_INPUT", "message": "Invalid set ID format"}
```

#### TC8: Błąd - set not found

```bash
curl -X POST http://localhost:4321/api/sets/00000000-0000-0000-0000-000000000000/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"stop_id": 1042}'

# Expected: 404 Not Found
# {"code": "SET_NOT_FOUND", "message": "Set not found or access denied"}
```

#### TC9: Błąd - unauthorized

```bash
curl -X POST http://localhost:4321/api/sets/$SET_ID/items \
  -H "Content-Type: application/json" \
  -d '{"stop_id": 1042}'

# Expected: 401 Unauthorized
# {"code": "UNAUTHORIZED", "message": "Authentication required"}
```

#### TC10: Błąd - set belongs to different user

```bash
# Login as different user, try to add item to other user's set
curl -X POST http://localhost:4321/api/sets/$OTHER_USER_SET_ID/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <different-user-token>" \
  -d '{"stop_id": 1042}'

# Expected: 404 Not Found (not 403 - don't reveal existence)
# {"code": "SET_NOT_FOUND", "message": "Set not found or access denied"}
```

---

### Krok 6: Aktualizacja dokumentacji

**Pliki do zaktualizowania:**

1. **API documentation** (jeśli istnieje): Dodać dokumentację POST /api/sets/{setId}/items
2. **README.md**: Zaktualizować listę dostępnych endpointów
3. **`.ai/api-plan.md`**: Zaznaczyć endpoint jako zaimplementowany

---

### Krok 7: Code review checklist

**Przed merge do main:**

- [ ] Wszystkie typy są poprawnie zdefiniowane
- [ ] Walidacja Zod schema działa poprawnie
- [ ] Error mappings pokrywają wszystkie przypadki
- [ ] Service functions mają odpowiednie error handling
- [ ] Route handler używa `locals.supabase` (nie import)
- [ ] RLS policies są testowane (przynajmniej manualnie)
- [ ] Console.error logging zawiera kontekst
- [ ] Wszystkie test cases przechodzą (TC1-TC10)
- [ ] Brak linter errors: `npm run lint`
- [ ] TypeScript kompiluje się: `npm run build`
- [ ] Kod jest zgodny z cursor rules (struktura folderów, naming)

---

### Krok 8: Follow-up tasks (opcjonalne, poza MVP)

**Future enhancements:**

1. **Rate limiting:** Dodać limit requests per user/minute
2. **Unit tests:** Jest/Vitest tests dla service functions
3. **Integration tests:** Playwright/Cypress E2E tests

---

## 10. Podsumowanie

Ten plan implementacji dostarcza kompletny przewodnik do wdrożenia endpointu **POST /api/sets/{setId}/items**. Endpoint jest zgodny z:

- Istniejącą architekturą projektu (Astro + Supabase)
- Wzorcami z innych endpointów (`POST /api/sets`, `PATCH /api/sets/{setId}`)
- Database constraints i triggers (auto-position, limits)
- Best practices dla security (auth, RLS, validation)
- Error handling conventions (mapDatabaseError)

**Szacowany czas implementacji:** 2-3 godziny dla doświadczonego developera.

**Priorytet:** HIGH - endpoint kluczowy dla MVP (dodawanie przystanków do zestawów).

**Dependencies:**

- Zakończona implementacja bazy danych (migrations) ✅
- Istniejące endpoints: POST /api/sets ✅
- Istniejące utils: getUserId, mapDatabaseError ✅
- Types i walidacja: częściowo ✅ (do rozszerzenia)

**Risks:**

- LOW - straightforward CRUD operation
- Database triggers są już przetestowane w migracji
- RLS policies są już działające
