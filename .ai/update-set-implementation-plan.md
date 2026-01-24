# API Endpoint Implementation Plan: PATCH /api/sets/{setId}

## 1. Przegląd punktu końcowego

Endpoint służy do zmiany nazwy istniejącego zestawu (set) należącego do uwierzytelnionego użytkownika. Nazwa musi być unikalna w ramach zestawów danego użytkownika (po przyciciu białych znaków, case-sensitive) i spełniać wymagania długości (1-10 znaków po przyciciu).

**Kluczowe funkcjonalności:**

- Zmiana nazwy istniejącego zestawu
- Weryfikacja własności zestawu (użytkownik może edytować tylko swoje zestawy)
- Walidacja unikalności nazwy (per user, case-sensitive, trimmed)
- Zwracanie zaktualizowanej listy wszystkich zestawów użytkownika

**Business rules:**

- Użytkownik może edytować tylko swoje zestawy
- Nazwa po przyciciu musi mieć 1-10 znaków
- Nazwa nie może być duplikatem innej nazwy użytkownika (po przyciciu)
- Operacja jest idempotentna (zmiana nazwy na tą samą wartość jest dozwolona)

## 2. Szczegóły żądania

### Metoda HTTP

`PATCH`

### Struktura URL

```
/api/sets/{setId}
```

### Parametry

#### Wymagane parametry URL:

- **setId** (string, UUID)
  - ID zestawu do edycji
  - Musi być poprawnym UUID
  - Zestaw musi należeć do uwierzytelnionego użytkownika

#### Wymagane parametry ciała żądania:

- **name** (string)
  - Nowa nazwa zestawu
  - Po przyciciu musi mieć 1-10 znaków
  - Będzie automatycznie przycięta (`.trim()`)
  - Musi być unikalna dla użytkownika (case-sensitive, po przyciciu)

#### Opcjonalne parametry:

Brak

### Nagłówki żądania

```
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>  // w produkcji
```

### Request Body

**Format:**

```json
{
  "name": "Praca"
}
```

**Przykłady poprawnych wartości:**

```json
{ "name": "Dom" }
{ "name": "  Szkoła  " }  // zostanie przycięte do "Szkoła"
{ "name": "1234567890" }  // maksymalnie 10 znaków
{ "name": "A" }           // minimum 1 znak
```

**Przykłady niepoprawnych wartości:**

```json
{ "name": "" }              // błąd: pusta nazwa
{ "name": "   " }           // błąd: pusta po przyciciu
{ "name": "12345678901" }   // błąd: za długa (11 znaków)
{ }                          // błąd: brak pola name
```

## 3. Wykorzystywane typy

### DTOs i Command Modele (z `src/types.ts`)

#### Input (Command Model):

```typescript
// Linia 59-62
export interface UpdateSetCommand {
  /** New set name (will be trimmed, must be 1-10 chars) */
  name: string;
}
```

#### Output (Response):

```typescript
// Linia 89-96
export interface UpdateSetResponse {
  /** Updated list of all user's sets */
  sets: SetDTO[];
  /** The updated set */
  updated_set: Pick<SetDTO, "id" | "name">;
}
```

#### SetDTO (używane w odpowiedzi):

```typescript
// Linia 25-36
export interface SetDTO {
  /** Unique identifier (UUID) */
  id: string;
  /** Set name (1-10 characters, trimmed) */
  name: string;
  /** Owner's user ID */
  user_id: string;
  /** Number of items in this set */
  item_count: number;
  /** Optional creation timestamp */
  created_at?: string;
}
```

#### ErrorResponse:

```typescript
// Linia 204-211
export interface ErrorResponse {
  /** Error code for client handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Optional additional error details */
  details?: unknown;
}
```

### Zod Schema (do stworzenia w `src/lib/validation/sets.validation.ts`)

```typescript
/**
 * Zod schema for updating a set
 * Validates that the name is a string between 1-10 characters after trimming
 */
export const updateSetCommandSchema = z.object({
  name: z
    .string({ required_error: "Set name is required" })
    .trim()
    .min(1, "Set name must be at least 1 character")
    .max(10, "Set name must be at most 10 characters"),
});

export type UpdateSetCommandInput = z.infer<typeof updateSetCommandSchema>;
```

## 4. Szczegóły odpowiedzi

### Odpowiedź sukcesu (200 OK)

**Status:** `200 OK`

**Body:**

```json
{
  "sets": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Dom",
      "user_id": "user-uuid",
      "item_count": 3
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Praca",
      "user_id": "user-uuid",
      "item_count": 2
    }
  ],
  "updated_set": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Praca"
  }
}
```

**Cechy odpowiedzi:**

- `sets` zawiera wszystkie zestawy użytkownika (z aktualizacją)
- `sets` są posortowane alfabetycznie po nazwie
- `updated_set` zawiera tylko `id` i `name` zaktualizowanego zestawu
- `item_count` w każdym zestawie pokazuje liczbę przypiętych tablic

### Odpowiedzi błędów

#### 400 Bad Request - Nieprawidłowe dane wejściowe

**Przypadki:**

1. Nieprawidłowy JSON
2. Brak pola `name`
3. Nazwa za krótka (pusta po przyciciu)
4. Nazwa za długa (>10 znaków po przyciciu)
5. Nieprawidłowy format `setId` (nie jest UUID)

**Przykład odpowiedzi:**

```json
{
  "code": "INVALID_SET_NAME",
  "message": "Set name must be at least 1 character"
}
```

#### 401 Unauthorized - Brak uwierzytelnienia

**Przypadek:** Brak tokena JWT lub token nieważny

**Odpowiedź:**

```json
{
  "code": "UNAUTHORIZED",
  "message": "Authentication required"
}
```

#### 404 Not Found - Zestaw nie znaleziony

**Przypadki:**

1. Zestaw o podanym ID nie istnieje
2. Zestaw istnieje, ale nie należy do uwierzytelnionego użytkownika (RLS blokuje dostęp)

**Odpowiedź:**

```json
{
  "code": "SET_NOT_FOUND",
  "message": "Set not found or access denied"
}
```

**Uwaga:** Z perspektywy bezpieczeństwa nie rozróżniamy czy zestaw nie istnieje, czy użytkownik nie ma do niego dostępu.

#### 409 Conflict - Duplikat nazwy

**Przypadek:** Użytkownik ma już inny zestaw o tej samej nazwie (po przyciciu, case-sensitive)

**Odpowiedź:**

```json
{
  "code": "DUPLICATE_SET_NAME",
  "message": "A set with this name already exists"
}
```

#### 500 Internal Server Error - Błąd serwera

**Przypadek:** Nieoczekiwany błąd bazy danych lub aplikacji

**Odpowiedź:**

```json
{
  "code": "INTERNAL_ERROR",
  "message": "An unexpected error occurred"
}
```

## 5. Przepływ danych

### Diagram przepływu

```
[Client]
    ↓ PATCH /api/sets/{setId} + { name }
[Astro Middleware] (verify JWT, setup context.locals.supabase)
    ↓
[API Route Handler] src/pages/api/sets/[setId].ts
    ↓ 1. getUserId(locals.supabase)
    ↓    → returns user_id or 401
    ↓ 2. Validate setId format (UUID)
    ↓ 3. Parse request.json()
    ↓ 4. Validate with updateSetCommandSchema (Zod)
    ↓    → trim name, check 1-10 length
    ↓ 5. Call service layer
[Service Layer] src/lib/services/sets.service.ts
    ↓ updateSet(supabase, userId, setId, name)
    ↓    → UPDATE sets SET name = $1 WHERE id = $2 AND user_id = $3
[PostgreSQL + RLS]
    ↓ RLS: CHECK user_id = auth.uid()
    ↓ Unique Index: (user_id, btrim(name))
    ↓ If no rows affected → 404
    ↓ If unique violation → 409
    ↓ SUCCESS → return updated row
[Service Layer]
    ↓ getAllUserSetsWithCounts(supabase, userId)
    ↓    → SELECT with LEFT JOIN + COUNT
    ↓ Transform to SetDTO[]
[API Route Handler]
    ↓ Format UpdateSetResponse
[Client]
    ← 200 { sets, updated_set }
```

### Kluczowe kroki przepływu:

1. **Middleware (Astro)**: Weryfikuje JWT i udostępnia `context.locals.supabase`

2. **Authentication**: `getUserId` weryfikuje sesję lub używa `DEV_USER_ID` w trybie dev

3. **URL Parameter Validation**: Sprawdzenie, czy `setId` jest poprawnym UUID

4. **Body Parsing**: Parsowanie JSON z obsługą błędów

5. **Input Validation**: Zod schema waliduje nazwę (trim + length check)

6. **Service Call - Update**:
   - Wywołanie `updateSet(supabase, userId, setId, name)`
   - Supabase wykonuje UPDATE z warunkiem `WHERE id = setId AND user_id = userId`
   - RLS dodatkowo weryfikuje `user_id = auth.uid()`
   - Zwraca zaktualizowany wiersz lub błąd

7. **Ownership & Existence Check**:
   - Jeśli UPDATE nie zmienił żadnych wierszy → 404 (zestaw nie istnieje lub nie należy do użytkownika)
   - Automatycznie obsługiwane przez sprawdzenie `affectedRows === 0`

8. **Service Call - Fetch List**:
   - Wywołanie `getAllUserSetsWithCounts(supabase, userId)`
   - SELECT z LEFT JOIN do `set_items` + COUNT dla `item_count`
   - ORDER BY name dla konsystentnej kolejności

9. **Response Formatting**: Utworzenie `UpdateSetResponse` z kodem 200

10. **Error Handling**: `mapDatabaseError` mapuje błędy PostgreSQL na user-friendly responses

### Zapytania SQL (szacunkowe)

**Update query:**

```sql
UPDATE public.sets
SET name = $1  -- trimmed name
WHERE id = $2  -- setId
  AND user_id = $3  -- userId from session
RETURNING *;
```

**Fetch all sets with counts:**

```sql
SELECT
  s.id,
  s.name,
  s.user_id,
  COUNT(si.id) as item_count
FROM public.sets s
LEFT JOIN public.set_items si ON s.id = si.set_id
WHERE s.user_id = $1
GROUP BY s.id
ORDER BY s.name;
```

**Uwaga:** RLS automatycznie dodaje dodatkowy warunek `user_id = auth.uid()` do pierwszego query.

## 6. Względy bezpieczeństwa

### Uwierzytelnienie (Authentication)

**Mechanizm:**

- Token JWT w nagłówku `Authorization: Bearer <token>` (produkcja)
- Lub `DEV_USER_ID` w `.env` (tylko development)
- Wykorzystanie helpera `getUserId(locals.supabase)`

**Implementacja:**

```typescript
const userIdResult = await getUserId(locals.supabase);
if (!userIdResult.success) {
  return new Response(JSON.stringify(userIdResult.error), {
    status: userIdResult.status,
  });
}
const userId = userIdResult.userId;
```

**Punkty kontroli:**

- JWT weryfikowany przez Supabase Auth (w middleware)
- Sesja sprawdzana w każdym żądaniu (stateless)
- Brak sesji = 401 Unauthorized

### Autoryzacja (Authorization)

**Poziom 1: Row Level Security (RLS)**

- Tabela `public.sets` ma włączony RLS z force mode
- Policy `sets_update_authenticated` wymaga `user_id = auth.uid()`
- Próba edycji cudzego zestawu = brak zwróconych wierszy (404)

**Poziom 2: Explicit Ownership Check (w service)**

- UPDATE zawiera warunek `WHERE id = setId AND user_id = userId`
- Sprawdzenie `affectedRows === 0` → zwróć 404
- Defense in depth: podwójna weryfikacja (app logic + RLS)

**Implementacja w service:**

```typescript
const { data, error, count } = await supabase
  .from("sets")
  .update({ name: name.trim() })
  .eq("id", setId)
  .eq("user_id", userId)
  .select()
  .single();

if (count === 0 || !data) {
  throw new Error("SET_NOT_FOUND");
}
```

### Walidacja danych wejściowych

**1. URL Parameter (setId):**

- Sprawdzenie czy jest poprawnym UUID
- Wykorzystanie regex lub biblioteki `uuid` dla walidacji
- Nieprawidłowy format → 400 Bad Request

**2. Request Body (name):**

- Zod schema automatycznie:
  - Przycina białe znaki (`.trim()`)
  - Waliduje długość (1-10 znaków)
  - Sprawdza typ (string)
- Nieprawidłowa nazwa → 400 Bad Request z opisem błędu

**3. Dodatkowa walidacja:**

- Sprawdzenie czy body jest poprawnym JSON
- Obsługa błędów parsowania (`try/catch` na `request.json()`)

### Ochrona przed atakami

**SQL Injection:**

- Supabase client używa parameterized queries
- Wszystkie wartości przekazywane jako parametry, nie konkatenacja stringów
- Automatyczna ochrona na poziomie biblioteki

**XSS (Cross-Site Scripting):**

- API zwraca tylko JSON (Content-Type: application/json)
- Brak renderowania HTML w odpowiedziach
- Nazwa zestawu nie jest sanityzowana (to zadanie frontendu przy wyświetlaniu)

**CSRF (Cross-Site Request Forgery):**

- API wymaga tokena JWT w nagłówku (nie cookie-based auth)
- SameSite cookies dla Supabase session (jeśli używane)
- Dodatkowe zabezpieczenie: endpoint tylko dla authenticated users

**Rate Limiting:**

- Powinien być zaimplementowany na poziomie Vercel/Supabase
- Zalecane: max 100 req/min per user dla endpoints modyfikujących dane
- To wykracza poza zakres tego endpointu (infrastruktura)

### Logowanie i monitoring

**Co logować:**

- Wszystkie nieoczekiwane błędy (500) z pełnym stack trace
- Próby dostępu do nieistniejących zasobów (404) z `setId` i `userId`
- Naruszenia unikalności (409) dla analizy UX

**Czego NIE logować:**

- Tokenów JWT
- Pełnych request bodies (mogą zawierać wrażliwe dane w przyszłości)
- Szczegółów błędów DB w odpowiedziach do klienta (tylko w console.error)

**Implementacja:**

```typescript
catch (error: unknown) {
  console.error("Error updating set:", {
    userId,
    setId,
    error: error instanceof Error ? error.message : error,
  });
  // ... map error and return response
}
```

## 7. Obsługa błędów

### Hierarchia obsługi błędów

```
[API Route]
    ↓ try/catch
[Service Layer]
    ↓ throw errors
[mapDatabaseError utility]
    ↓ map to ErrorResponse
[API Route]
    ↓ return Response with status
```

### Tabela błędów

| Scenariusz                        | Detected By   | Error Code           | HTTP Status | Message                                |
| --------------------------------- | ------------- | -------------------- | ----------- | -------------------------------------- |
| Brak JWT / nieważny token         | `getUserId`   | `UNAUTHORIZED`       | 401         | Authentication required                |
| Nieprawidłowy format setId        | API Route     | `INVALID_SET_NAME`   | 400         | Invalid set ID format                  |
| Nieprawidłowy JSON                | API Route     | `INVALID_SET_NAME`   | 400         | Invalid JSON body                      |
| Brak pola `name`                  | Zod           | `INVALID_SET_NAME`   | 400         | Set name is required                   |
| Nazwa za krótka (<1 po trim)      | Zod           | `INVALID_SET_NAME`   | 400         | Set name must be at least 1 character  |
| Nazwa za długa (>10 po trim)      | Zod           | `INVALID_SET_NAME`   | 400         | Set name must be at most 10 characters |
| Zestaw nie znaleziony             | Service       | `SET_NOT_FOUND`      | 404         | Set not found or access denied         |
| Zestaw należy do innego usera     | RLS / Service | `SET_NOT_FOUND`      | 404         | Set not found or access denied         |
| Duplikat nazwy (unique violation) | PostgreSQL    | `DUPLICATE_SET_NAME` | 409         | A set with this name already exists    |
| RLS policy rejection              | PostgreSQL    | `FORBIDDEN`          | 403         | Access denied                          |
| Nieoczekiwany błąd DB             | PostgreSQL    | `INTERNAL_ERROR`     | 500         | An unexpected error occurred           |

### Szczegółowa obsługa błędów

#### 1. Authentication Error (401)

**Warunek:**

```typescript
const userIdResult = await getUserId(locals.supabase);
if (!userIdResult.success) {
  // Return 401
}
```

**Response:**

```typescript
return new Response(JSON.stringify(userIdResult.error), {
  status: userIdResult.status,
  headers: { "Content-Type": "application/json" },
});
```

#### 2. Invalid setId Format (400)

**Walidacja:**

```typescript
// Helper function to validate UUID
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// In API route
const { setId } = Astro.params;
if (!setId || !isValidUUID(setId)) {
  return new Response(
    JSON.stringify({
      code: "INVALID_SET_NAME",
      message: "Invalid set ID format",
    } as ErrorResponse),
    { status: 400, headers: { "Content-Type": "application/json" } }
  );
}
```

#### 3. Invalid JSON Body (400)

**Walidacja:**

```typescript
let body: unknown;
try {
  body = await request.json();
} catch {
  return new Response(
    JSON.stringify({
      code: "INVALID_SET_NAME",
      message: "Invalid JSON body",
    } as ErrorResponse),
    { status: 400, headers: { "Content-Type": "application/json" } }
  );
}
```

#### 4. Zod Validation Errors (400)

**Walidacja:**

```typescript
const validationResult = updateSetCommandSchema.safeParse(body);
if (!validationResult.success) {
  const firstError = validationResult.error.issues[0];
  return new Response(
    JSON.stringify({
      code: "INVALID_SET_NAME",
      message: firstError?.message || "Invalid input",
    } as ErrorResponse),
    { status: 400, headers: { "Content-Type": "application/json" } }
  );
}
```

#### 5. Set Not Found (404)

**Detection w service:**

```typescript
export async function updateSet(
  supabase: SupabaseClient,
  userId: string,
  setId: string,
  name: string
): Promise<SetEntity> {
  const { data, error } = await supabase
    .from("sets")
    .update({ name: name.trim() })
    .eq("id", setId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    // Check if it's a "not found" error
    if (error.code === "PGRST116") {
      // PostgREST error for no rows returned
      const notFoundError = new Error("SET_NOT_FOUND");
      (notFoundError as any).code = "SET_NOT_FOUND";
      throw notFoundError;
    }
    throw error;
  }

  if (!data) {
    const notFoundError = new Error("SET_NOT_FOUND");
    (notFoundError as any).code = "SET_NOT_FOUND";
    throw notFoundError;
  }

  return data;
}
```

**Mapping w mapDatabaseError:**

```typescript
// Add to mapDatabaseError function
if (error.code === "SET_NOT_FOUND" || error.message === "SET_NOT_FOUND") {
  return {
    code: "SET_NOT_FOUND",
    message: "Set not found or access denied",
    status: 404,
  };
}

// PostgREST "no rows" error
if (error.code === "PGRST116") {
  return {
    code: "SET_NOT_FOUND",
    message: "Set not found or access denied",
    status: 404,
  };
}
```

#### 6. Duplicate Name (409)

**Already handled by existing mapDatabaseError:**

```typescript
if (
  error.code === "23505" &&
  (error.constraint?.includes("btrim_name_uniq") || error.message?.includes("sets_user_id_btrim_name_uniq"))
) {
  return {
    code: "DUPLICATE_SET_NAME",
    message: "A set with this name already exists",
    status: 409,
  };
}
```

#### 7. RLS Rejection (403)

**Already handled by existing mapDatabaseError:**

```typescript
if (error.code === "42501" || error.message?.includes("permission denied")) {
  return {
    code: "FORBIDDEN",
    message: "Access denied",
    status: 403,
  };
}
```

#### 8. Unexpected Errors (500)

**Already handled by existing mapDatabaseError:**

```typescript
// Fallback for unexpected errors
console.error("Unexpected database error:", error);
return {
  code: "INTERNAL_ERROR",
  message: "An unexpected error occurred",
  status: 500,
};
```

### Error Response Flow w API Route

```typescript
try {
  const updatedSet = await updateSet(locals.supabase, userId, setId, name);
  const allSets = await getAllUserSetsWithCounts(locals.supabase, userId);

  const response: UpdateSetResponse = {
    sets: allSets,
    updated_set: {
      id: updatedSet.id,
      name: updatedSet.name,
    },
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
} catch (error: unknown) {
  console.error("Error updating set:", { userId, setId, error });
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

### Potencjalne wąskie gardła

1. **Podwójne zapytanie do bazy:**
   - UPDATE sets (1 query)
   - SELECT all sets with item counts (1 query z JOIN)
   - Łącznie: 2 round-trips do bazy danych

2. **N+1 Problem (uniknięty):**
   - `getAllUserSetsWithCounts` używa LEFT JOIN zamiast oddzielnych queries dla każdego zestawu
   - Jeden query dla wszystkich zestawów + ich liczników

3. **Transfer danych:**
   - Response zawiera wszystkie zestawy użytkownika (max 6)
   - Przy 6 zestawach i średnio 20 itemach każdy: ~150 obiektów w response
   - Akceptowalne dla MVP (tysiące bajtów, nie megabajty)

### Strategie optymalizacji

#### 1. Database Indexes (już zaimplementowane)

**Existing indexes:**

```sql
-- For fast user lookup
CREATE INDEX sets_user_id_idx ON public.sets (user_id);

-- For uniqueness check
CREATE UNIQUE INDEX sets_user_id_btrim_name_uniq
  ON public.sets (user_id, btrim(name));
```

**Performance impact:**

- UPDATE sprawdza unique constraint używając indeksu (O(log n))
- SELECT filtruje po user_id używając indeksu (O(log n))

#### 2. Zmniejszenie liczby zapytań (opcjonalnie)

**Current approach (2 queries):**

```typescript
const updatedSet = await updateSet(...);           // 1 query
const allSets = await getAllUserSetsWithCounts(...); // 1 query
```

**Optimized approach (1 query z CTE - future enhancement):**

```sql
WITH updated AS (
  UPDATE public.sets
  SET name = $1
  WHERE id = $2 AND user_id = $3
  RETURNING *
)
SELECT
  s.id,
  s.name,
  s.user_id,
  COUNT(si.id) as item_count
FROM public.sets s
LEFT JOIN public.set_items si ON s.id = si.set_id
WHERE s.user_id = $3
GROUP BY s.id
ORDER BY s.name;
```

**Uwaga:** To wymaga custom RPC function w Supabase lub raw SQL. Dla MVP 2 queries są wystarczające (łączny czas < 50ms).

#### 3. Caching (nie zalecane dla tego endpointu)

**Dlaczego nie cachować:**

- Endpoint modyfikuje dane (PATCH) - cache byłby natychmiast invalidowany
- Response musi zawierać najnowsze dane po każdej zmianie
- Cache dodałby complexity bez korzyści dla write operacji

**Gdzie można cachować:**

- Frontend może cache'ować listę zestawów po otrzymaniu response
- Cache invalidation po każdym PATCH/POST/DELETE na sets

#### 4. Response Payload Optimization

**Current size estimate:**

- 1 set = ~150 bytes (id + name + user_id + item_count)
- 6 sets = ~900 bytes
- Total with updated_set = ~1KB
- Gzipped = ~300 bytes

**Possible optimization (nie zalecane dla MVP):**

- Zwracanie tylko zmienionego zestawu zamiast całej listy
- Client sam aktualizuje lokalny state
- Trade-off: prostota API vs bandwidth savings

**Verdict:** Current approach jest OK dla MVP. Response < 2KB jest akceptowalny.

### Performance Metrics (oczekiwane)

**Breakdown czasu odpowiedzi:**

```
Authentication check:     ~10ms  (Supabase Auth)
Validation (Zod):         ~1ms   (in-memory)
UPDATE query:             ~15ms  (indexed)
SELECT with JOIN:         ~20ms  (indexed)
Response serialization:   ~1ms   (JSON.stringify)
-------------------------------------------
Total (estimated):        ~50ms  (p95)
```

**Capacity:**

- Każde żądanie: 2 DB queries
- Przy 100 req/s: 200 DB queries/s
- Supabase free tier: 500 queries/s
- Supabase pro tier: 5000+ queries/s
- Bottleneck: nie w tym endpoincie (write operations są rzadkie)

### Monitoring i metryki

**Co monitorować:**

1. **Response time** (p50, p95, p99)
2. **Error rate** (4xx vs 5xx)
3. **Database query time** (slow query log > 100ms)
4. **Duplicate name errors** (409 rate - może wskazywać problemy UX)
5. **404 rate** (może wskazywać na błędy w UI routing)

**Alerty:**

- p95 response time > 500ms
- Error rate > 1%
- 500 errors > 0.1% (any unexpected errors)

## 9. Etapy wdrożenia

### Krok 1: Przygotowanie Zod Schema

**Plik:** `src/lib/validation/sets.validation.ts`

**Zadanie:** Dodaj schema dla `UpdateSetCommand`

**Implementacja:**

```typescript
/**
 * Zod schema for updating a set
 * Validates that the name is a string between 1-10 characters after trimming
 */
export const updateSetCommandSchema = z.object({
  name: z
    .string({ required_error: "Set name is required" })
    .trim()
    .min(1, "Set name must be at least 1 character")
    .max(10, "Set name must be at most 10 characters"),
});

/**
 * Type inference from the Zod schema
 */
export type UpdateSetCommandInput = z.infer<typeof updateSetCommandSchema>;
```

**Walidacja:**

- Test z przykładowymi danymi (valid: "Dom", " Praca ")
- Test z invalid danymi (empty, too long, null, undefined)

---

### Krok 2: Rozszerzenie Service Layer

**Plik:** `src/lib/services/sets.service.ts`

**Zadanie:** Dodaj funkcję `updateSet`

**Implementacja:**

```typescript
/**
 * Updates an existing set's name
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID from authenticated session
 * @param setId - UUID of the set to update
 * @param name - New set name (will be trimmed before update)
 * @returns The updated set entity
 * @throws Error if set not found, not owned by user, duplicate name, or database error
 */
export async function updateSet(
  supabase: SupabaseClient,
  userId: string,
  setId: string,
  name: string
): Promise<SetEntity> {
  const { data, error } = await supabase
    .from("sets")
    .update({ name: name.trim() })
    .eq("id", setId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    // PostgREST returns PGRST116 when no rows match the update condition
    if (error.code === "PGRST116") {
      const notFoundError = new Error("SET_NOT_FOUND") as any;
      notFoundError.code = "SET_NOT_FOUND";
      throw notFoundError;
    }
    throw error;
  }

  if (!data) {
    const notFoundError = new Error("SET_NOT_FOUND") as any;
    notFoundError.code = "SET_NOT_FOUND";
    throw notFoundError;
  }

  return data;
}
```

**Walidacja:**

- Unit test z mock Supabase client
- Test scenariuszy: sukces, not found, duplicate name

---

### Krok 3: Rozszerzenie Error Mapping

**Plik:** `src/lib/errors/db-errors.ts`

**Zadanie:** Dodaj obsługę błędu `SET_NOT_FOUND`

**Implementacja:**

```typescript
export function mapDatabaseError(error: any): MappedError {
  // Set not found - explicit error from service
  if (error.code === "SET_NOT_FOUND" || error.message === "SET_NOT_FOUND") {
    return {
      code: "SET_NOT_FOUND",
      message: "Set not found or access denied",
      status: 404,
    };
  }

  // PostgREST "no rows" error
  if (error.code === "PGRST116") {
    return {
      code: "SET_NOT_FOUND",
      message: "Set not found or access denied",
      status: 404,
    };
  }

  // ... existing error mappings (duplicate name, max sets, etc.)

  // Fallback
  console.error("Unexpected database error:", error);
  return {
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred",
    status: 500,
  };
}
```

**Uwaga:** Dodaj te warunki **przed** existing error handlers w funkcji.

---

### Krok 4: Utworzenie API Route z Dynamic Routing

**Plik:** `src/pages/api/sets/[setId].ts` (nowy plik)

**Zadanie:** Zaimplementuj handler dla PATCH /api/sets/{setId}

**Implementacja:**

```typescript
import type { APIRoute } from "astro";

import { getUserId } from "../../../lib/auth/get-user-id.ts";
import { mapDatabaseError } from "../../../lib/errors/db-errors.ts";
import { getAllUserSetsWithCounts, updateSet } from "../../../lib/services/sets.service.ts";
import { updateSetCommandSchema } from "../../../lib/validation/sets.validation.ts";
import type { ErrorResponse, UpdateSetResponse } from "../../../types.ts";

/**
 * Disable prerendering for this API endpoint
 * Required for dynamic API routes that interact with authentication and database
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
 * PATCH /api/sets/{setId} - Update (rename) an existing set
 *
 * URL Parameters:
 * - setId: UUID of the set to update
 *
 * Request body:
 * - name: string (1-10 characters after trimming)
 *
 * Returns:
 * - 200: Updated set with refreshed list of all user's sets
 * - 400: Invalid input (bad UUID, invalid name)
 * - 401: Authentication required
 * - 404: Set not found or not owned by user
 * - 409: Duplicate set name
 * - 500: Unexpected server error
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  // 1. Extract and validate setId from URL params
  const { setId } = params;

  if (!setId || !isValidUUID(setId)) {
    return new Response(
      JSON.stringify({
        code: "INVALID_SET_NAME",
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
        code: "INVALID_SET_NAME",
        message: "Invalid JSON body",
      } as ErrorResponse),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 4. Validate input with Zod schema
  const validationResult = updateSetCommandSchema.safeParse(body);
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0];
    return new Response(
      JSON.stringify({
        code: "INVALID_SET_NAME",
        message: firstError?.message || "Invalid input",
      } as ErrorResponse),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const { name } = validationResult.data;

  // 5. Update set and fetch updated list
  try {
    // Update the set (name is already trimmed by Zod schema)
    const updatedSet = await updateSet(locals.supabase, userId, setId, name);

    // Fetch updated list of all user's sets with item counts
    const allSets = await getAllUserSetsWithCounts(locals.supabase, userId);

    // 6. Format and return successful response
    const response: UpdateSetResponse = {
      sets: allSets,
      updated_set: {
        id: updatedSet.id,
        name: updatedSet.name,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    // Map database errors to user-friendly responses
    console.error("Error updating set:", { userId, setId, error });
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

**Uwaga:** Plik musi być w `src/pages/api/sets/[setId].ts` (w nawiasach kwadratowych) dla dynamic routing.

---

### Krok 5: Testy Manualne

**Przygotowanie:**

1. Upewnij się, że masz użytkownika w bazie (lub użyj `DEV_USER_ID` w `.env`)
2. Utwórz co najmniej 2 zestawy dla użytkownika testowego

**Scenariusze testowe:**

#### Test 1: Sukces - zmiana nazwy zestawu

```bash
# Request
curl -X PATCH http://localhost:4321/api/sets/{VALID_SET_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -d '{"name":"NowaNazwa"}'

# Expected: 200 OK
# Response zawiera sets[] z zaktualizowaną nazwą i updated_set
```

#### Test 2: Błąd - nieprawidłowy UUID

```bash
curl -X PATCH http://localhost:4321/api/sets/invalid-uuid \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}'

# Expected: 400 Bad Request
# { "code": "INVALID_SET_NAME", "message": "Invalid set ID format" }
```

#### Test 3: Błąd - pusta nazwa

```bash
curl -X PATCH http://localhost:4321/api/sets/{VALID_SET_ID} \
  -H "Content-Type: application/json" \
  -d '{"name":"   "}'

# Expected: 400 Bad Request
# { "code": "INVALID_SET_NAME", "message": "Set name must be at least 1 character" }
```

#### Test 4: Błąd - nazwa za długa

```bash
curl -X PATCH http://localhost:4321/api/sets/{VALID_SET_ID} \
  -H "Content-Type: application/json" \
  -d '{"name":"12345678901"}'

# Expected: 400 Bad Request
# { "code": "INVALID_SET_NAME", "message": "Set name must be at most 10 characters" }
```

#### Test 5: Błąd - duplikat nazwy

```bash
# Zakładamy, że użytkownik ma już zestaw o nazwie "Praca"
curl -X PATCH http://localhost:4321/api/sets/{DIFFERENT_SET_ID} \
  -H "Content-Type: application/json" \
  -d '{"name":"Praca"}'

# Expected: 409 Conflict
# { "code": "DUPLICATE_SET_NAME", "message": "A set with this name already exists" }
```

#### Test 6: Błąd - nieistniejący zestaw

```bash
curl -X PATCH http://localhost:4321/api/sets/550e8400-e29b-41d4-a716-446655440099 \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}'

# Expected: 404 Not Found
# { "code": "SET_NOT_FOUND", "message": "Set not found or access denied" }
```

#### Test 7: Błąd - brak autoryzacji

```bash
curl -X PATCH http://localhost:4321/api/sets/{VALID_SET_ID} \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}'
  # Bez nagłówka Authorization

# Expected: 401 Unauthorized
# { "code": "UNAUTHORIZED", "message": "Authentication required" }
```

#### Test 8: Edge case - przycinanie białych znaków

```bash
curl -X PATCH http://localhost:4321/api/sets/{VALID_SET_ID} \
  -H "Content-Type: application/json" \
  -d '{"name":"  Dom  "}'

# Expected: 200 OK
# updated_set.name === "Dom" (przycięte)
```

---

### Krok 6: Dokumentacja

**Zadanie:** Zaktualizuj dokumentację API

**Plik:** `.ai/api-plan.md`

**Dodaj sekcję:**

```markdown
- **PATCH /api/sets/{setId}**
  - Description: rename a set the owner controls.
  - URL Params: `setId` (UUID)
  - Body: `{ name: string }`
  - Response: `{ sets: [...], updated_set: { id, name } }`
  - Success: `200 OK`
  - Errors:
    - `400 Bad Request` for invalid input (bad UUID, invalid name length).
    - `401 Unauthorized` when authentication fails.
    - `404 Not Found` if set does not exist or doesn't belong to the user.
    - `409 Conflict` when trimmed name duplicates another set.
    - `500 Internal Server Error` for unexpected errors.
```

---

### Krok 7: Code Review Checklist

Przed mergowaniem sprawdź:

- [ ] Zod schema poprawnie waliduje name (trim, 1-10 chars)
- [ ] UUID validation działa dla setId
- [ ] Service function sprawdza ownership (eq user_id)
- [ ] Error mapping obsługuje SET_NOT_FOUND (404)
- [ ] Error mapping obsługuje DUPLICATE_SET_NAME (409)
- [ ] Wszystkie error paths zwracają proper status codes
- [ ] Console.error loguje szczegóły błędów (nie do klienta)
- [ ] Response zawiera sets[] posortowane alfabetycznie
- [ ] Response zawiera updated_set z id i name
- [ ] Kod zgodny z coding guidelines (early returns, guard clauses)
- [ ] Brak eslint errors
- [ ] Brak TypeScript errors
- [ ] Testy manualne przeszły dla wszystkich scenariuszy
- [ ] Dokumentacja zaktualizowana

---

## Podsumowanie

Ten endpoint implementuje operację renaming zestawu z pełną walidacją, autoryzacją i obsługą błędów. Kluczowe aspekty:

1. **Security**: RLS + explicit ownership check zapewniają defense in depth
2. **Validation**: Zod schema + UUID check + database constraints = trzy poziomy walidacji
3. **Error Handling**: Szczegółowe mapowanie błędów DB na user-friendly messages
4. **Performance**: 2 queries (~50ms total), indexed, scalable do 100s req/s
5. **Maintainability**: Follows existing patterns (POST /api/sets), reuses utilities

**Estimated effort:** 2-4 godziny (implementation + testing)

**Dependencies:** Brak (wszystkie potrzebne utilities już istnieją)

**Risk level:** Niski (pattern proven in POST endpoint, no database migrations needed)
