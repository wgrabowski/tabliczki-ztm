# API Endpoint Implementation Plan: GET /api/sets

## 1. Przegląd punktu końcowego

Endpoint `GET /api/sets` służy do pobierania listy wszystkich zestawów (dashboard sets) należących do uwierzytelnionego użytkownika. Każdy zestaw zawiera metadane, w tym liczbę przypisanych do niego elementów (`item_count`). Endpoint zwraca również całkowitą liczbę zestawów użytkownika.

**Główne funkcjonalności:**

- Pobieranie zestawów użytkownika z bazy danych (tabela `public.sets`)
- Obliczanie liczby elementów dla każdego zestawu (relacja z `public.set_items`)
- Zwracanie posortowanej listy zestawów wraz z total_count
- Obsługa opcjonalnego parametru `include_items` (zarezerwowany na przyszłość)

## 2. Szczegóły żądania

- **Metoda HTTP:** `GET`
- **Struktura URL:** `/api/sets`
- **Parametry:**
  - **Wymagane:** Brak
  - **Opcjonalne:**
    - `include_items` (boolean, domyślnie `false`) - parametr zarezerwowany na przyszłość, obecnie nie wpływa na logikę. W przyszłości może służyć do zwracania pełnej listy items dla każdego zestawu.
- **Request Body:** Brak (metoda GET nie przyjmuje body)
- **Headers:**
  - `Authorization: Bearer <JWT_TOKEN>` - wymagany token JWT dla uwierzytelnienia

## 3. Wykorzystywane typy

### DTOs (z `src/types.ts`):

```typescript
/**
 * Set Data Transfer Object for API responses
 */
export interface SetDTO {
  id: string; // UUID zestawu
  name: string; // Nazwa zestawu (1-10 znaków po trim)
  user_id: string; // UUID właściciela
  item_count: number; // Liczba elementów w zestawie
  created_at?: string; // Opcjonalna data utworzenia
}

/**
 * Response for GET /api/sets - list all user's sets
 */
export interface SetListResponse {
  sets: SetDTO[]; // Tablica zestawów użytkownika
  total_count: number; // Całkowita liczba zestawów
}
```

### Walidacja (Zod schema):

```typescript
import { z } from "zod";

const queryParamsSchema = z.object({
  include_items: z.coerce.boolean().optional().default(false),
});
```

## 4. Szczegóły odpowiedzi

### Sukces (200 OK):

```json
{
  "sets": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Dom",
      "user_id": "user-uuid-here",
      "item_count": 3,
      "created_at": "2026-01-21T10:30:00Z"
    },
    {
      "id": "223e4567-e89b-12d3-a456-426614174001",
      "name": "Praca",
      "user_id": "user-uuid-here",
      "item_count": 5,
      "created_at": "2026-01-20T15:20:00Z"
    }
  ],
  "total_count": 2
}
```

**Charakterystyka odpowiedzi:**

- Zestawy posortowane alfabetycznie po nazwie (implementacja w serwisie)
- `item_count` to liczba rekordów w `set_items` dla danego zestawu
- `total_count` równa się długości tablicy `sets`
- Pusta tablica `[]` jeśli użytkownik nie ma żadnych zestawów

### Błędy:

#### 400 Bad Request

Nieprawidłowy format query parametru.

```json
{
  "code": "INVALID_INPUT",
  "message": "Invalid query parameter format",
  "details": {
    /* Zod validation errors */
  }
}
```

#### 401 Unauthorized

Brak tokenu JWT lub token nieprawidłowy/wygasły.

```json
{
  "code": "UNAUTHORIZED",
  "message": "Authentication required"
}
```

#### 403 Forbidden

Row Level Security blokuje dostęp (rzadkie, zazwyczaj RLS po prostu filtruje wyniki).

```json
{
  "code": "FORBIDDEN",
  "message": "Access denied"
}
```

#### 500 Internal Server Error

Nieoczekiwany błąd serwera lub bazy danych.

```json
{
  "code": "INTERNAL_ERROR",
  "message": "An unexpected error occurred"
}
```

## 5. Przepływ danych

### Sekwencja operacji:

1. **Request handling (Astro endpoint):**
   - Odbiór żądania GET na `/api/sets`
   - Parsowanie query params (`include_items`)

2. **Walidacja query params:**
   - Użycie Zod schema do walidacji
   - Zwrócenie 400 Bad Request jeśli walidacja nie powiedzie się

3. **Uwierzytelnienie:**
   - Pobranie instancji Supabase z `context.locals.supabase`
   - Wywołanie `supabase.auth.getUser()` aby uzyskać sesję użytkownika
   - Zwrócenie 401 Unauthorized jeśli użytkownik nie jest zalogowany

4. **Pobieranie danych (Service layer):**
   - Wywołanie `getAllUserSetsWithCounts(supabase, userId)`
   - Serwis wykonuje query do tabeli `sets` z:
     - Filtrem `user_id = userId` (RLS dodatkowo to wymusza)
     - JOIN/sub-query do `set_items` dla obliczenia `item_count`
     - Sortowaniem po `name` (alfabetycznie)

5. **Konstrukcja odpowiedzi:**
   - Mapowanie wyników na `SetDTO[]`
   - Obliczenie `total_count = sets.length`
   - Zwrócenie `SetListResponse` z kodem 200 OK

6. **Obsługa błędów:**
   - Przechwycenie błędów z warstwy serwisu
   - Mapowanie błędów PostgreSQL na odpowiednie kody HTTP
   - Zwrócenie struktury `ErrorResponse`

### Diagram przepływu:

```
Client Request (GET /api/sets?include_items=false)
    ↓
[Astro Middleware] - Weryfikacja CORS, rate limiting (opcjonalnie)
    ↓
[Endpoint Handler - GET function]
    ↓
[Zod Validation] - Query params
    ↓ (valid)
[Auth Check] - context.locals.supabase.auth.getUser()
    ↓ (authenticated)
[Service Layer] - getAllUserSetsWithCounts(supabase, userId)
    ↓
[Supabase Query]
    ├─ SELECT from sets WHERE user_id = $1
    ├─ LEFT JOIN set_items (count)
    └─ ORDER BY name
    ↓
[RLS Enforcement] - Supabase automatycznie filtruje po user_id
    ↓
[Data Transformation] - SetEntity → SetDTO[]
    ↓
[Response Construction] - SetListResponse
    ↓
[HTTP 200 OK] - JSON response
```

## 6. Względy bezpieczeństwa

### Uwierzytelnienie:

- **JWT Token Verification**: Token Bearer musi być prawidłowy i niewygasły
- **Session Management**: Supabase automatycznie weryfikuje sesję przez `getUser()`
- **Token Storage**: Token przechowywany w localStorage/cookie (zarządzane przez Supabase Client)

### Autoryzacja:

- **Row Level Security (RLS)**: Polityki RLS w Supabase wymuszają, że użytkownik może zobaczyć tylko swoje zestawy
  ```sql
  -- Przykładowa polityka RLS (powinna już istnieć w migracji)
  CREATE POLICY "Users can view own sets"
  ON public.sets FOR SELECT
  USING (auth.uid() = user_id);
  ```
- **User ID Source**: `userId` pobierany bezpośrednio z zweryfikowanej sesji Supabase, NIE z query params ani body

### Walidacja danych wejściowych:

- **Query Params**: Walidacja przez Zod eliminuje injection i nieprawidłowe typy
- **Type Coercion**: `z.coerce.boolean()` bezpiecznie konwertuje stringi na boolean
- **Sanitization**: Brak potrzeby dodatkowej sanityzacji (tylko odczyt, brak user input w query DB)

### Rate Limiting (opcjonalnie):

- Rozważenie implementacji rate limiting w middleware Astro
- Ochrona przed nadmiernym zapytaniami od jednego użytkownika
- Sugestia: max 100 żądań/minutę per użytkownik

### CORS:

- Konfiguracja CORS w Astro dla określonych origin
- Blokowanie nieautoryzowanych domen

## 7. Obsługa błędów

### Mapowanie błędów:

| Scenariusz                | Źródło błędu              | Kod HTTP | ErrorCode      | Message                          |
| ------------------------- | ------------------------- | -------- | -------------- | -------------------------------- |
| Brak/nieprawidłowy JWT    | `getUser()` zwraca null   | 401      | UNAUTHORIZED   | "Authentication required"        |
| Token wygasły             | `getUser()` error         | 401      | UNAUTHORIZED   | "Session expired"                |
| Nieprawidłowy query param | Zod parse error           | 400      | INVALID_INPUT  | "Invalid query parameter format" |
| RLS blokuje dostęp        | Supabase RLS error        | 403      | FORBIDDEN      | "Access denied"                  |
| Błąd połączenia z DB      | Supabase connection error | 500      | INTERNAL_ERROR | "Database connection failed"     |
| Nieoczekiwany błąd        | Uncaught exception        | 500      | INTERNAL_ERROR | "An unexpected error occurred"   |

### Strategia obsługi błędów:

1. **Try-catch block** okalający całą logikę endpointu
2. **Zod validation** na początku - zwróć 400 przy błędzie walidacji
3. **Auth check** jako guard clause - zwróć 401 jeśli `user` jest null
4. **Service errors** - przechwytywanie i mapowanie błędów z `getAllUserSetsWithCounts`
5. **Error logging** - `console.error()` dla błędów 500
6. **Consistent error structure** - zawsze zwracaj `ErrorResponse`

### Przykładowy kod obsługi błędów:

```typescript
try {
  // Walidacja
  const params = queryParamsSchema.parse(url.searchParams);

  // Autentykacja
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(
      JSON.stringify({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Pobieranie danych
  const sets = await getAllUserSetsWithCounts(supabase, user.id);

  // Odpowiedź sukcesu
  return new Response(JSON.stringify({ sets, total_count: sets.length }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
} catch (error) {
  if (error instanceof z.ZodError) {
    return new Response(
      JSON.stringify({
        code: "INVALID_INPUT",
        message: "Invalid query parameter format",
        details: error.errors,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Logowanie i zwracanie 500
  console.error("Error in GET /api/sets:", error);
  return new Response(
    JSON.stringify({
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}
```

## 8. Rozważania dotyczące wydajności

### Potencjalne wąskie gardła:

1. **Database Query Performance:**
   - Query łączy dane z `sets` i `set_items` (agregacja count)
   - Dla użytkowników z wieloma zestawami może być kosztowne
2. **N+1 Query Problem:**
   - Obecna implementacja w serwisie używa Supabase sub-query, co eliminuje N+1
   - Jedno zapytanie pobiera sets wraz z zagregowaną liczbą items

3. **Network Latency:**
   - Opóźnienie komunikacji z Supabase (zewnętrzny service)
   - Typowo 50-200ms w zależności od lokalizacji

### Strategie optymalizacji:

1. **Database Indexing:**
   - Index na `sets.user_id` (powinien już istnieć przez FK)
   - Index na `set_items.set_id` (powinien już istnieć przez FK)
   - Composite index na `(user_id, name)` już istnieje dla unique constraint

2. **Query Optimization:**
   - Obecna implementacja `getAllUserSetsWithCounts` używa efektywnego sub-query
   - Sortowanie po `name` może wykorzystać index jeśli Postgres to zoptymalizuje

3. **Response Caching (przyszłość):**
   - Rozważenie cache na poziomie aplikacji (Redis/Memory)
   - Cache key: `user_sets:${userId}`
   - TTL: 60 sekund
   - Invalidacja: przy CREATE/UPDATE/DELETE zestawu

4. **Pagination (przyszłość):**
   - Dla użytkowników z >50 zestawami warto dodać paginację
   - Query params: `page`, `per_page`
   - Response: dodać `page`, `per_page`, `total_pages`

5. **Partial Response:**
   - Parametr `include_items` już zarezerwowany
   - Można rozbudować o `fields` param dla wyboru konkretnych pól

### Metryki do monitorowania:

- Średni czas odpowiedzi endpointu (target: <200ms)
- Czas wykonania query w Supabase (target: <100ms)
- Liczba żądań per użytkownik per minutę
- Rate błędów 500 (target: <0.1%)

## 9. Etapy wdrożenia

### Krok 1: Utworzenie pliku endpointu

- Utworzyć plik `/src/pages/api/sets/index.ts`
- Dodać `export const prerender = false` (wymagane dla API routes)

### Krok 2: Zdefiniowanie schematu walidacji Zod

- Zaimportować `z` z `zod`
- Utworzyć `queryParamsSchema` dla walidacji `include_items`

### Krok 3: Implementacja handlera GET

- Utworzyć eksportowaną funkcję `GET` (uppercase zgodnie z zasadami Astro)
- Sygnatura: `export async function GET(context: APIContext): Promise<Response>`
- Parametr `context` zawiera `locals.supabase` i `url`

### Krok 4: Walidacja query parameters

- Parsować `context.url.searchParams` przez Zod schema
- Obsłużyć `ZodError` zwracając 400 Bad Request
- Wyekstrahować `include_items` (obecnie nieużywany, przygotowanie na przyszłość)

### Krok 5: Weryfikacja uwierzytelnienia

- Pobrać `supabase` z `context.locals.supabase`
- Wywołać `const { data: { user }, error } = await supabase.auth.getUser()`
- Guard clause: jeśli `error` lub `!user`, zwrócić 401 Unauthorized

### Krok 6: Wywołanie service layer

- Zaimportować `getAllUserSetsWithCounts` z `/src/lib/services/sets.service.ts`
- Wywołać `const sets = await getAllUserSetsWithCounts(supabase, user.id)`
- Otoczyć w try-catch dla obsługi błędów serwisu

### Krok 7: Konstrukcja odpowiedzi sukcesu

- Utworzyć obiekt `SetListResponse`:
  ```typescript
  const response: SetListResponse = {
    sets: sets,
    total_count: sets.length,
  };
  ```
- Zwrócić `new Response(JSON.stringify(response), { status: 200, headers: { "Content-Type": "application/json" } })`

### Krok 8: Obsługa błędów

- Implement comprehensive error handling:
  - ZodError → 400 Bad Request
  - Auth errors → 401 Unauthorized
  - Supabase RLS errors → 403 Forbidden (jeśli wystąpią)
  - Inne błędy → 500 Internal Server Error
- Zawsze zwracać `ErrorResponse` structure
- Logować błędy 500 przez `console.error()`

### Krok 9: Dodanie typów TypeScript

- Zaimportować typy z `/src/types.ts`:
  - `SetListResponse`
  - `ErrorResponse`
  - `SetDTO` (używany przez serwis)
- Zaimportować `APIContext` z `astro`
- Zaimportować `SupabaseClient` z `/src/db/supabase.client.ts`

### Krok 10: Code review i testing

- Review kodu pod kątem zgodności z guidelines (clean code, error handling)
- Ręczne testowanie:
  - Happy path: użytkownik z zestawami
  - Empty state: użytkownik bez zestawów
  - Błędy auth: brak tokenu, token wygasły
  - Błędy walidacji: nieprawidłowy query param
- Sprawdzenie linter errors

### Krok 11: Dokumentacja (opcjonalnie)

- Dodać JSDoc comments do funkcji `GET`
- Opisać parametry, zwracane wartości, możliwe błędy
- Przykład użycia w komentarzu

### Kompletna struktura pliku (template):

```typescript
// src/pages/api/sets/index.ts

import type { APIContext } from "astro";
import { z } from "zod";
import { getAllUserSetsWithCounts } from "../../../lib/services/sets.service";
import type { SetListResponse, ErrorResponse } from "../../../types";

// Wymuszenie SSR dla API routes
export const prerender = false;

// Schema walidacji query params
const queryParamsSchema = z.object({
  include_items: z.coerce.boolean().optional().default(false),
});

/**
 * GET /api/sets
 * Retrieves all sets for the authenticated user with item counts
 */
export async function GET(context: APIContext): Promise<Response> {
  try {
    // 1. Walidacja query params
    const params = queryParamsSchema.parse(Object.fromEntries(context.url.searchParams));

    // 2. Autentykacja
    const supabase = context.locals.supabase;
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      const errorResponse: ErrorResponse = {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Pobieranie danych
    const sets = await getAllUserSetsWithCounts(supabase, user.id);

    // 4. Konstrukcja odpowiedzi
    const response: SetListResponse = {
      sets,
      total_count: sets.length,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Obsługa błędów walidacji
    if (error instanceof z.ZodError) {
      const errorResponse: ErrorResponse = {
        code: "INVALID_INPUT",
        message: "Invalid query parameter format",
        details: error.errors,
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Obsługa nieoczekiwanych błędów
    console.error("Error in GET /api/sets:", error);
    const errorResponse: ErrorResponse = {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
```

---

## Podsumowanie

Ten plan dostarcza kompletne wytyczne do implementacji endpointu `GET /api/sets`. Kluczowe punkty:

1. **Wykorzystanie istniejącego serwisu** - `getAllUserSetsWithCounts` już implementuje wymaganą logikę
2. **Bezpieczeństwo first** - JWT auth + RLS w Supabase
3. **Walidacja przez Zod** - zgodnie z best practices
4. **Comprehensive error handling** - obsługa wszystkich scenariuszy błędów
5. **Type safety** - wykorzystanie TypeScript i istniejących typów z `src/types.ts`
6. **Performance awareness** - identyfikacja potencjalnych bottlenecków i strategie optymalizacji
7. **Future-proof** - parametr `include_items` zarezerwowany na przyszłe rozszerzenia

Endpoint jest stosunkowo prosty (read-only), ale plan uwzględnia wszystkie aspekty produkcyjnej implementacji.
