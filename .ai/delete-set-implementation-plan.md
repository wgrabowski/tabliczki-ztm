# API Endpoint Implementation Plan: DELETE /api/sets/{setId}

## 1. Przegląd punktu końcowego

Endpoint `DELETE /api/sets/{setId}` służy do permanentnego usuwania zestawu przystanków wraz z wszystkimi powiązanymi elementami (set_items). Operacja wykorzystuje mechanizm cascade delete zdefiniowany w bazie danych, co zapewnia spójność danych. Po pomyślnym usunięciu endpoint zwraca zaktualizowaną listę wszystkich pozostałych zestawów użytkownika oraz ID usuniętego zestawu, co umożliwia klientowi synchronizację stanu lokalnego.

**Główne cechy:**

- Operacja destrukcyjna wymagająca autoryzacji
- Automatyczne usuwanie powiązanych set_items (CASCADE)
- Weryfikacja własności zasobu przed usunięciem
- Zwraca zaktualizowaną listę zestawów po operacji

## 2. Szczegóły żądania

### Metoda HTTP

`DELETE`

### Struktura URL

```
DELETE /api/sets/{setId}
```

### Parametry URL

**Wymagane:**

- `setId` (string, UUID) - Identyfikator zestawu do usunięcia

**Przykład:**

```
DELETE /api/sets/550e8400-e29b-41d4-a716-446655440000
```

### Parametry Query

Brak

### Request Body

Brak (operacja DELETE nie wymaga body)

### Headers

```
Content-Type: application/json (dla odpowiedzi)
Cookie: sb-<project>-auth-token (autentykacja Supabase)
```

## 3. Wykorzystywane typy

### Response Type

```typescript
// Zdefiniowany w src/types.ts
interface DeleteSetResponse {
  /** Updated list of remaining user's sets */
  sets: SetDTO[];
  /** ID of the deleted set */
  deleted_set_id: string;
}
```

### DTO Types

```typescript
// Zdefiniowany w src/types.ts
interface SetDTO {
  id: string;
  name: string;
  user_id: string;
  item_count: number;
  created_at?: string;
}
```

### Error Response Type

```typescript
// Zdefiniowany w src/types.ts
interface ErrorResponse {
  code: string;
  message: string;
  details?: unknown;
}
```

### Validation Schema

```typescript
// Należy dodać do src/lib/validation/sets.validation.ts
import { z } from "zod";

export const deleteSetParamsSchema = z.object({
  setId: z.string().uuid("Invalid set ID format"),
});
```

## 4. Szczegóły odpowiedzi

### Sukces - 200 OK

**Status:** `200 OK`

**Body:**

```json
{
  "sets": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Favorites",
      "user_id": "user-uuid",
      "item_count": 3
    },
    {
      "id": "234e5678-e89b-12d3-a456-426614174111",
      "name": "Work",
      "user_id": "user-uuid",
      "item_count": 2
    }
  ],
  "deleted_set_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Błąd - 400 Bad Request (Invalid UUID)

**Status:** `400 Bad Request`

**Body:**

```json
{
  "code": "INVALID_INPUT",
  "message": "Invalid set ID format"
}
```

### Błąd - 401 Unauthorized

**Status:** `401 Unauthorized`

**Body:**

```json
{
  "code": "UNAUTHORIZED",
  "message": "Authentication required"
}
```

### Błąd - 404 Not Found

**Status:** `404 Not Found`

**Body:**

```json
{
  "code": "SET_NOT_FOUND",
  "message": "Set not found or access denied"
}
```

**Uwaga:** Ten sam komunikat jest używany gdy zestaw nie istnieje lub nie należy do użytkownika (security through obscurity - nie ujawniamy czy zestaw istnieje).

### Błąd - 403 Forbidden

**Status:** `403 Forbidden`

**Body:**

```json
{
  "code": "FORBIDDEN",
  "message": "Access denied"
}
```

### Błąd - 500 Internal Server Error

**Status:** `500 Internal Server Error`

**Body:**

```json
{
  "code": "INTERNAL_ERROR",
  "message": "An unexpected error occurred"
}
```

## 5. Przepływ danych

### Diagram przepływu

```
Client Request
     ↓
[1] Extract setId from URL params
     ↓
[2] Validate setId format (UUID)
     ↓ (valid)
[3] Authenticate user (getUserId)
     ↓ (authenticated)
[4] Delete set in database (service layer)
     ├─→ Verify ownership (.eq("user_id", userId))
     ├─→ Delete set row
     └─→ CASCADE: Auto-delete set_items
     ↓ (success)
[5] Fetch updated sets list (getAllUserSetsWithCounts)
     ↓
[6] Format response (DeleteSetResponse)
     ↓
[7] Return 200 OK with JSON payload
     ↓
Client receives updated state
```

### Szczegółowy przepływ operacji

#### Krok 1: Walidacja parametrów URL

- Extract `setId` z `context.params`
- Walidacja formatu UUID przez Zod schema
- Jeśli nieprawidłowy → Return 400 Bad Request

#### Krok 2: Autentykacja

- Wywołanie `getUserId(locals.supabase)`
- Sprawdzenie sesji użytkownika przez Supabase Auth
- Jeśli brak sesji → Return 401 Unauthorized

#### Krok 3: Usunięcie zestawu (Service Layer)

```typescript
// Wywołanie w endpoint
await deleteSet(locals.supabase, userId, setId);

// W service
const { error } = await supabase.from("sets").delete().eq("id", setId).eq("user_id", userId);
```

**Weryfikacja własności:**

- Podwójna weryfikacja: `.eq("id", setId).eq("user_id", userId)`
- Jeśli żaden rekord nie pasuje → PostgreSQL zwraca success ale 0 affected rows
- Service musi sprawdzić czy operacja faktycznie usunęła rekord

**Cascade Delete:**

- Automatyczne usunięcie wszystkich `set_items` gdzie `set_id = setId`
- Zdefiniowane w FK: `ON DELETE CASCADE`
- Nie wymaga dodatkowych zapytań

#### Krok 4: Pobieranie zaktualizowanej listy

- Wywołanie `getAllUserSetsWithCounts(locals.supabase, userId)`
- Zwraca wszystkie pozostałe zestawy użytkownika z item_count

#### Krok 5: Formatowanie odpowiedzi

```typescript
const response: DeleteSetResponse = {
  sets: allSets,
  deleted_set_id: setId,
};
```

### Interakcje z bazą danych

**Tabele zaangażowane:**

- `public.sets` (PRIMARY) - usuwany rekord
- `public.set_items` (CASCADE) - automatycznie usuwane powiązane rekordy
- `auth.users` (READ) - weryfikacja użytkownika

**Zapytania SQL (przybliżone):**

1. DELETE z weryfikacją własności:

```sql
DELETE FROM public.sets
WHERE id = $1 AND user_id = $2;
```

2. CASCADE trigger automatycznie wykonuje:

```sql
DELETE FROM public.set_items
WHERE set_id = $1;
```

3. SELECT dla zaktualizowanej listy:

```sql
SELECT s.id, s.name, s.user_id, COUNT(si.id) as item_count
FROM public.sets s
LEFT JOIN public.set_items si ON s.id = si.set_id
WHERE s.user_id = $1
GROUP BY s.id
ORDER BY s.name;
```

## 6. Względy bezpieczeństwa

### Autentykacja

**Mechanizm:**

- Supabase Auth session cookie (`sb-<project>-auth-token`)
- Weryfikacja przez `getUserId(locals.supabase)`
- NIGDY nie ufać `user_id` z client input

**Implementacja:**

```typescript
const userIdResult = await getUserId(locals.supabase);
if (!userIdResult.success) {
  return new Response(JSON.stringify(userIdResult.error), {
    status: userIdResult.status,
    headers: { "Content-Type": "application/json" },
  });
}
const userId = userIdResult.userId;
```

### Autoryzacja

**Weryfikacja własności zasobu:**

- Warunek `.eq("user_id", userId)` w zapytaniu DELETE
- Row Level Security (RLS) jako backup layer
- Zwracanie tego samego błędu dla "not found" i "not owned" (security through obscurity)

**RLS Policies (istniejące):**

```sql
-- Users can only delete their own sets
CREATE POLICY "Users can delete own sets" ON public.sets
  FOR DELETE USING (auth.uid() = user_id);
```

### Walidacja danych wejściowych

**UUID Validation:**

```typescript
const deleteSetParamsSchema = z.object({
  setId: z.string().uuid("Invalid set ID format"),
});
```

**Zapobieganie:**

- SQL injection (parametryzowane zapytania przez Supabase client)
- UUID format injection (walidacja przez Zod)
- Path traversal (strict UUID format)

### CSRF Protection

**Mechanizm:**

- Same-site cookies dla Supabase Auth
- Astro middleware sprawdza origin headers

**Uwaga:** Dla API endpoints używanych przez JavaScript z tej samej domeny, CSRF jest mniej krytyczne, ale Auth cookies są secure + httpOnly.

### Rate Limiting

**Rekomendacje:**

- Supabase ma wbudowane rate limiting per project
- DELETE operations są kosztowne - rozważyć dodatkowy rate limit
- Sugerowane limity: max 10 delete operations / minute per user

### Logging i auditing

**Co logować:**

```typescript
console.error("Error deleting set:", {
  setId,
  userId,
  error: error.message,
  timestamp: new Date().toISOString(),
});
```

**Nie logować:**

- Pełnych user tokens
- Sensitive user data
- Stack traces do client response

## 7. Obsługa błędów

### Tabela błędów

| Error Code       | HTTP Status | Scenariusz                                        | Obsługa                                |
| ---------------- | ----------- | ------------------------------------------------- | -------------------------------------- |
| `INVALID_INPUT`  | 400         | Nieprawidłowy format UUID                         | Walidacja Zod przed wywołaniem service |
| `UNAUTHORIZED`   | 401         | Brak sesji użytkownika                            | getUserId zwraca error                 |
| `FORBIDDEN`      | 403         | RLS policy rejection                              | Rzadki - mapDatabaseError              |
| `SET_NOT_FOUND`  | 404         | Zestaw nie istnieje lub nie należy do użytkownika | Service rzuca błąd, mapDatabaseError   |
| `INTERNAL_ERROR` | 500         | Nieoczekiwany błąd bazy danych lub serwera        | Catch-all w endpoint                   |

### Implementacja w Service Layer

```typescript
export async function deleteSet(supabase: SupabaseClient, userId: string, setId: string): Promise<void> {
  const { data, error } = await supabase.from("sets").delete().eq("id", setId).eq("user_id", userId).select(); // Wymaga select() aby sprawdzić affected rows

  if (error) {
    throw error;
  }

  // Sprawdzenie czy faktycznie usunięto rekord
  if (!data || data.length === 0) {
    const notFoundError = new Error("SET_NOT_FOUND") as Error & {
      code: "SET_NOT_FOUND";
    };
    notFoundError.code = "SET_NOT_FOUND";
    throw notFoundError;
  }
}
```

### Implementacja w Endpoint

```typescript
try {
  await deleteSet(locals.supabase, userId, setId);
  // ... success path
} catch (error: unknown) {
  console.error("Error deleting set:", error);
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

### Edge Cases

**1. Równoczesne żądania DELETE tego samego zestawu:**

- First request succeeds, returns updated list
- Second request gets 404 SET_NOT_FOUND (brak rekordu)
- Bezpieczne - idempotent z perspektywy wyniku

**2. Zestaw usunięty między walidacją a DELETE:**

- Service rzuci SET_NOT_FOUND
- Normalny błąd 404

**3. User session expired mid-request:**

- getUserId zwróci 401 UNAUTHORIZED
- Request rejected przed DELETE

**4. Database connection lost:**

- Supabase client rzuci network error
- mapDatabaseError → INTERNAL_ERROR (500)
- Log szczegółów, nie expose klientowi

## 8. Wydajność

### Potencjalne wąskie gardła

1. **Cascade Delete performance:**
   - Usunięcie zestawu z wieloma set_items może być kosztowne
   - Limit 10 items per set minimalizuje problem
   - Index na `set_items.set_id` przyspiesza cascade

2. **Fetching updated list po delete:**
   - Dodatkowe zapytanie SELECT z JOIN
   - Maksymalnie 6 zestawów per user (business limit)
   - Szybkie przy małej liczbie rekordów

3. **Network roundtrips:**
   - DELETE operation: 1 roundtrip
   - Get updated list: 1 roundtrip
   - Total: 2 database calls

### Strategie optymalizacji

#### 1. Database Indexes (już istniejące)

```sql
-- Primary key index (automatic)
CREATE UNIQUE INDEX sets_pkey ON public.sets(id);

-- User lookup index
CREATE INDEX idx_sets_user_id ON public.sets(user_id);

-- Cascade delete optimization
CREATE INDEX idx_set_items_set_id ON public.set_items(set_id);
```

#### 2. Query optimization

```typescript
// Efficient: Single query with aggregation
const sets = await getAllUserSetsWithCounts(supabase, userId);

// Zamiast: Multiple queries per set
```

#### 3. Connection pooling

- Supabase automatycznie zarządza connection pool
- Reuse `locals.supabase` client (już zainicjowany przez middleware)

#### 4. Error handling optimization

```typescript
// Fast path: walidacja przed database call
if (!isValidUUID(setId)) {
  return early with 400; // Avoid database roundtrip
}
```

### Monitoring metryki

**Key Performance Indicators:**

- Response time DELETE endpoint (target: <200ms p95)
- Database query duration (target: <50ms per query)
- Error rate (target: <1% excluding 404)
- Cascade delete duration (monitor if items > 5)

**Monitoring:**

```typescript
const startTime = Date.now();
// ... operation
const duration = Date.now() - startTime;
console.log(`DELETE /api/sets/${setId} completed in ${duration}ms`);
```

## 9. Podsumowanie i następne kroki

### Podsumowanie implementacji

Endpoint `DELETE /api/sets/{setId}` zapewnia:

- ✅ Bezpieczne usuwanie zestawów z weryfikacją własności
- ✅ Automatyczne cascade delete powiązanych elementów
- ✅ Spójną obsługę błędów zgodną z resztą API
- ✅ Optymalizację przez reuse istniejących service functions
- ✅ Pełną walidację danych wejściowych

---

## Appendix A: Przykładowe wywołania API

### cURL Examples

#### Successful deletion

```bash
curl -X DELETE 'http://localhost:4321/api/sets/550e8400-e29b-41d4-a716-446655440000' \
  -H 'Cookie: sb-project-auth-token=eyJhbGc...' \
  -v
```

**Response:**

```json
{
  "sets": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Favorites",
      "user_id": "user-uuid-here",
      "item_count": 3
    }
  ],
  "deleted_set_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Invalid UUID

```bash
curl -X DELETE 'http://localhost:4321/api/sets/not-a-valid-uuid' \
  -H 'Cookie: sb-project-auth-token=eyJhbGc...' \
  -v
```

**Response:**

```json
{
  "code": "INVALID_INPUT",
  "message": "Invalid set ID format",
  "details": [
    {
      "code": "invalid_string",
      "validation": "uuid",
      "path": ["setId"],
      "message": "Invalid set ID format"
    }
  ]
}
```

### JavaScript Fetch Example

```javascript
async function deleteSet(setId) {
  try {
    const response = await fetch(`/api/sets/${setId}`, {
      method: "DELETE",
      credentials: "include", // Include cookies
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const data = await response.json();
    console.log("Set deleted:", data.deleted_set_id);
    console.log("Remaining sets:", data.sets);
    return data;
  } catch (error) {
    console.error("Failed to delete set:", error);
    throw error;
  }
}

// Usage
deleteSet("550e8400-e29b-41d4-a716-446655440000")
  .then((data) => {
    // Update UI with remaining sets
    updateSetsList(data.sets);
  })
  .catch((error) => {
    // Show error to user
    showErrorNotification(error.message);
  });
```

---

## Appendix B: Supabase RLS Policies

Dla kompletności, poniżej znajdują się RLS policies które powinny być skonfigurowane dla tabeli `sets`:

```sql
-- Enable RLS on sets table
ALTER TABLE public.sets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only delete their own sets
CREATE POLICY "Users can delete own sets" ON public.sets
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Users can only view their own sets
CREATE POLICY "Users can view own sets" ON public.sets
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only insert sets for themselves
CREATE POLICY "Users can insert own sets" ON public.sets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own sets
CREATE POLICY "Users can update own sets" ON public.sets
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**Uwaga:** Te policies są backup security layer. Aplikacja ZAWSZE powinna weryfikować ownership przez explicit `.eq("user_id", userId)` w zapytaniach.
