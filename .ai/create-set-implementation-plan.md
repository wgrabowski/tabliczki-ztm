# API Endpoint Implementation Plan: POST /api/sets

## 1. Przegląd punktu końcowego

Endpoint `POST /api/sets` służy do tworzenia nowego zestawu tablic (dashboard set) dla uwierzytelnionego użytkownika. Po pomyślnym utworzeniu zwraca zaktualizowaną listę wszystkich zestawów użytkownika wraz z metadanymi oraz informacje o nowo utworzonym zestawie.

**Kluczowe cechy:**

- Wymaga uwierzytelnienia (JWT)
- Automatyczne przypisanie `user_id` z kontekstu sesji
- Walidacja nazwy: wymagana długość 1-10 znaków po przycięciu spacji
- Egzekwowanie unikalności nazw per użytkownik (case-sensitive, ignoruje spacje brzegowe)
- Twardy limit 6 zestawów na użytkownika (egzekwowany przez trigger DB)
- Zwraca pełną listę zestawów + szczegóły nowo utworzonego zestawu

## 2. Szczegóły żądania

- **Metoda HTTP:** `POST`
- **Struktura URL:** `/api/sets`
- **Headers:**
  - `Authorization: Bearer <JWT_TOKEN>` (wymagany)
  - `Content-Type: application/json` (wymagany)

### Parametry:

- **Wymagane:** brak (parametry w body)
- **Opcjonalne:** brak

### Request Body:

```typescript
{
  name: string; // Nazwa zestawu (1-10 znaków po przycięciu)
}
```

**Przykład żądania:**

```json
{
  "name": "  Moje Trasy  "
}
```

## 3. Wykorzystywane typy

### Command Model (Input)

- `CreateSetCommand` - obiekt z walidowanym polem `name`

```typescript
interface CreateSetCommand {
  name: string;
}
```

### DTO (Output)

- `SetDTO` - reprezentacja zestawu z metadanymi
- `CreateSetResponse` - struktura odpowiedzi zawierająca zaktualizowaną listę i szczegóły utworzonego zestawu

```typescript
interface SetDTO {
  id: string;
  name: string;
  user_id: string;
  item_count: number;
  created_at?: string;
}

interface CreateSetResponse {
  sets: SetDTO[];
  created_set: Pick<SetDTO, "id" | "name">;
}
```

### Entity & Insert Types

- `SetEntity` - typ encji z bazy danych (`Tables<"sets">`)
- `SetInsert` - typ dla operacji wstawiania (`TablesInsert<"sets">`)

### Error Types

- `ErrorResponse` - standardowa struktura błędu
- `ErrorCode` - typ unii dla kodów błędów

## 4. Szczegóły odpowiedzi

### Sukces (201 Created)

**Status Code:** `201 Created`

**Body:**

```json
{
  "sets": [
    {
      "id": "uuid-1",
      "name": "Dom-Praca",
      "user_id": "user-uuid",
      "item_count": 3,
      "created_at": "2026-01-20T10:00:00Z"
    },
    {
      "id": "uuid-2",
      "name": "Moje Trasy",
      "user_id": "user-uuid",
      "item_count": 0,
      "created_at": "2026-01-20T11:30:00Z"
    }
  ],
  "created_set": {
    "id": "uuid-2",
    "name": "Moje Trasy"
  }
}
```

### Błędy

#### 400 Bad Request - Nieprawidłowe dane wejściowe

**Przypadki:**

1. Brak pola `name` w body
2. Puste `name` po przycięciu (`.trim()`)
3. `name` zbyt długie (>10 znaków po przycięciu)
4. Limit zestawów przekroczony (trigger DB)

**Przykład odpowiedzi (walidacja):**

```json
{
  "code": "INVALID_SET_NAME",
  "message": "Set name must be between 1 and 10 characters after trimming"
}
```

**Przykład odpowiedzi (limit):**

```json
{
  "code": "MAX_SETS_PER_USER_EXCEEDED",
  "message": "Maximum number of sets (6) reached for this user"
}
```

#### 401 Unauthorized

Brak lub nieprawidłowy token JWT.

```json
{
  "code": "UNAUTHORIZED",
  "message": "Authentication required"
}
```

#### 409 Conflict - Duplikat nazwy

Użytkownik już posiada zestaw o tej samej nazwie (po przycięciu, case-sensitive).

```json
{
  "code": "DUPLICATE_SET_NAME",
  "message": "A set with this name already exists"
}
```

#### 500 Internal Server Error

Nieoczekiwany błąd serwera.

```json
{
  "code": "INTERNAL_ERROR",
  "message": "An unexpected error occurred"
}
```

## 5. Przepływ danych

### Diagram przepływu:

```
[Client]
    ↓ POST /api/sets { name }
[Astro API Route] (/src/pages/api/sets/index.ts)
    ↓
[Middleware] (weryfikacja JWT, context.locals.supabase)
    ↓
[Validation Layer] (Zod schema)
    ↓ trim(name), check length 1-10
[Service Layer] (SetsService)
    ↓ context.locals.supabase.auth.getUser() → user_id
    ↓ createSet({ name: trimmed, user_id })
[Supabase Client]
    ↓ INSERT INTO sets (name, user_id)
[PostgreSQL + RLS + Triggers]
    ↓ RLS: CHECK user_id = auth.uid()
    ↓ Trigger: COUNT sets WHERE user_id → if >= 6 → EXCEPTION
    ↓ Unique Index: (user_id, btrim(name))
    ↓ SUCCESS → gen_random_uuid(), return row
[Supabase Client]
    ↓ Fetch all sets + item counts (LEFT JOIN + COUNT)
[Service Layer]
    ↓ Transform to SetDTO[]
[Astro API Route]
    ↓ Format CreateSetResponse
[Client]
    ← 201 { sets, created_set }
```

### Kluczowe kroki:

1. **Uwierzytelnienie:** Middleware weryfikuje JWT i udostępnia `context.locals.supabase`
2. **Walidacja wejścia:** Zod schema sprawdza strukturę i typy danych
3. **Przygotowanie danych:** Przycinanie nazwy (`.trim()`) i walidacja długości
4. **Pobranie user_id:** Z sesji Supabase (`getUser()`)
5. **Wstawienie do bazy:** Service wywołuje Supabase client z `{ name, user_id }`
6. **Egzekwowanie ograniczeń DB:**
   - RLS automatycznie sprawdza `user_id = auth.uid()`
   - Trigger sprawdza limit 6 zestawów
   - Unikalny indeks na `(user_id, btrim(name))` blokuje duplikaty
7. **Pobieranie zaktualizowanej listy:** Query z `LEFT JOIN set_items` + `COUNT` dla `item_count`
8. **Transformacja do DTO:** Mapowanie encji na `SetDTO[]`
9. **Formatowanie odpowiedzi:** Zwrócenie `CreateSetResponse` z kodem 201

### SQL Queries (szacunkowe):

**Insert:**

```sql
INSERT INTO public.sets (name, user_id)
VALUES ($1, $2)
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

## 6. Względy bezpieczeństwa

### Uwierzytelnienie

- **Wymagane:** Token JWT w nagłówku `Authorization: Bearer <token>`
- **Źródło:** Supabase Auth
- **Weryfikacja:** Middleware wywołuje `supabase.auth.getUser()` przed wykonaniem endpointu
- **Brak tokenu lub nieprawidłowy:** Zwróć `401 Unauthorized`

### Autoryzacja

- **Row Level Security (RLS):** Włączona na tabeli `public.sets`
- **Polityka INSERT:** `WITH CHECK (user_id = auth.uid())`
- **Cel:** Zapobiega próbom wstawienia zestawu dla innego użytkownika
- **Mechanizm:** Supabase automatycznie dodaje warunek do każdego query

### Walidacja danych

- **Nigdy nie ufaj klientowi:** Zawsze waliduj input na backendzie
- **Zod schema:** Deklaratywna walidacja struktury i typów
- **Sanitization:** Przycinanie spacji (`.trim()`) przed zapisem
- **Długość:** Wymuś 1-10 znaków po przycięciu
- **SQL Injection:** Używaj parametryzowanych queries (Supabase Client automatycznie parametryzuje)

### Izolacja użytkowników

- **user_id z sesji:** Zawsze pobieraj `user_id` z `context.locals.supabase.auth.getUser()`
- **NIE akceptuj user_id z requestu:** Klient nigdy nie powinien móc podać `user_id`
- **RLS jako backup:** Nawet jeśli kod zawiera błąd, RLS blokuje niewłaściwy dostęp

### Ochrona przed nadużyciami

- **Rate limiting:** (Opcjonalne w MVP) Limit liczby requestów per IP/user
- **Twardy limit 6 zestawów:** Egzekwowany przez trigger DB (nie tylko walidację aplikacji)
- **Unikalność nazw:** Indeks DB zapobiega race conditions przy równoczesnych insertach

### OWASP Top 10 Considerations

- **A01: Broken Access Control:** Zabezpieczone przez RLS i user_id z sesji
- **A03: Injection:** Zabezpieczone przez parametryzowane queries
- **A07: Identification and Authentication Failures:** Supabase Auth + JWT
- **A09: Security Logging and Monitoring Failures:** Logowanie błędów bez ujawniania szczegółów klientowi

## 7. Obsługa błędów

### Tabela błędów:

| Scenariusz                    | Status Code | Error Code                 | Komunikat                                                   | Przyczyna DB/Logika                         |
| ----------------------------- | ----------- | -------------------------- | ----------------------------------------------------------- | ------------------------------------------- |
| Brak tokenu JWT               | 401         | UNAUTHORIZED               | Authentication required                                     | Middleware nie znalazł tokenu               |
| Nieprawidłowy JWT             | 401         | UNAUTHORIZED               | Invalid or expired token                                    | `supabase.auth.getUser()` zwróciło błąd     |
| Brak pola `name`              | 400         | INVALID_SET_NAME           | Set name is required                                        | Zod validation failed                       |
| Puste `name` po trim          | 400         | INVALID_SET_NAME           | Set name must be between 1 and 10 characters after trimming | Custom validation                           |
| `name` > 10 znaków            | 400         | INVALID_SET_NAME           | Set name must be between 1 and 10 characters after trimming | Custom validation                           |
| Duplikat nazwy                | 409         | DUPLICATE_SET_NAME         | A set with this name already exists                         | Unique index `sets_user_id_btrim_name_uniq` |
| Przekroczono limit 6 zestawów | 400         | MAX_SETS_PER_USER_EXCEEDED | Maximum number of sets (6) reached for this user            | Trigger `BEFORE INSERT` na `sets`           |
| RLS blokuje INSERT            | 403         | FORBIDDEN                  | Access denied                                               | RLS policy rejection (edge case)            |
| Nieoczekiwany błąd DB         | 500         | INTERNAL_ERROR             | An unexpected error occurred                                | Inne błędy PostgreSQL                       |
| Błąd sieciowy/Supabase        | 500         | INTERNAL_ERROR             | An unexpected error occurred                                | Timeout, connection issues                  |

### Logika obsługi błędów:

1. **Walidacja wejściowa (Zod):**

   ```typescript
   const result = schema.safeParse(body);
   if (!result.success) {
     return new Response(
       JSON.stringify({
         code: "INVALID_SET_NAME",
         message: "Set name is required",
       }),
       { status: 400 }
     );
   }
   ```

2. **Walidacja długości:**

   ```typescript
   const trimmedName = name.trim();
   if (trimmedName.length < 1 || trimmedName.length > 10) {
     return new Response(
       JSON.stringify({
         code: "INVALID_SET_NAME",
         message: "Set name must be between 1 and 10 characters after trimming",
       }),
       { status: 400 }
     );
   }
   ```

3. **Mapowanie błędów DB:**

   ```typescript
   try {
     // ... insert
   } catch (error) {
     // Duplicate name (unique constraint)
     if (error.code === "23505" && error.constraint === "sets_user_id_btrim_name_uniq") {
       return new Response(
         JSON.stringify({
           code: "DUPLICATE_SET_NAME",
           message: "A set with this name already exists",
         }),
         { status: 409 }
       );
     }

     // Trigger: max sets exceeded
     if (error.message?.includes("MAX_SETS_PER_USER_EXCEEDED")) {
       return new Response(
         JSON.stringify({
           code: "MAX_SETS_PER_USER_EXCEEDED",
           message: "Maximum number of sets (6) reached for this user",
         }),
         { status: 400 }
       );
     }

     // Generic error
     console.error("Unexpected error creating set:", error);
     return new Response(
       JSON.stringify({
         code: "INTERNAL_ERROR",
         message: "An unexpected error occurred",
       }),
       { status: 500 }
     );
   }
   ```

4. **Logowanie błędów:**
   - Błędy 500: Loguj pełne szczegóły (stack trace, query, params) do console/monitoring
   - Błędy 400/409: Loguj krótkie info (user_id, attempted name)
   - NIE loguj wrażliwych danych (hasła, tokeny)
   - NIE ujawniaj szczegółów DB w odpowiedzi klientowi

## 8. Rozważania dotyczące wydajności

### Potencjalne wąskie gardła:

1. **Query `LEFT JOIN` dla item_count:**
   - Wykonywane po każdym utworzeniu zestawu
   - Z indeksem `sets_user_id_idx` + `set_items_set_id_idx` powinno być szybkie
   - Dla max 6 zestawów x max 6 items = 36 rekordów → negligible

2. **Trigger sprawdzający limit:**
   - `SELECT COUNT(*) FROM sets WHERE user_id = NEW.user_id`
   - Z indeksem na `user_id` bardzo szybkie dla małej liczby zestawów

3. **Unique index na btrim(name):**
   - Functional index może być wolniejszy niż prosty indeks
   - Dla 6 zestawów → negligible

4. **Round-trips do Supabase:**
   - 2 queries: INSERT + SELECT (fetch all sets)
   - Możliwa optymalizacja: użycie RETURNING + subquery w jednym zapytaniu
   - Dla MVP: akceptowalne

### Strategie optymalizacji:

#### Obecnie (MVP):

- **Indeksy:** Już zdefiniowane w schema (`sets_user_id_idx`, `sets_user_id_btrim_name_uniq`)
- **Limit danych:** Max 6 zestawów = małe zestawy wyników
- **Connection pooling:** Obsługiwane przez Supabase Client

#### Przyszłe optymalizacje (post-MVP):

1. **Kombinowany query (INSERT + SELECT):**

   ```sql
   WITH new_set AS (
     INSERT INTO sets (name, user_id) VALUES ($1, $2) RETURNING *
   )
   SELECT s.*, COUNT(si.id) as item_count
   FROM sets s
   LEFT JOIN set_items si ON s.id = si.set_id
   WHERE s.user_id = $2
   GROUP BY s.id
   UNION ALL
   SELECT id, name, user_id, 0 as item_count FROM new_set;
   ```

   - Zmniejsza round-trips do 1 query
   - Złożoność: średnia

2. **Cache po stronie klienta:**
   - Po otrzymaniu odpowiedzi, cache `sets` w Svelte store
   - Unikaj zbędnych requestów GET /api/sets

3. **Pagination (jeśli limit zwiększy się w przyszłości):**
   - Obecnie niepotrzebne dla max 6 zestawów

4. **Prepared statements / Query caching:**
   - Supabase/PostgREST automatycznie cache query plans

### Monitoring wydajności:

- **Metryki:** Query execution time, request latency
- **Alarmy:** Jeśli p95 > 500ms
- **Tools:** Supabase Dashboard → Performance → Slow Queries

## 9. Etapy wdrożenia

### Krok 1: Walidacja Zod Schema

**Plik:** `src/lib/validation/sets.validation.ts` (nowy)

**Zadanie:**

- Utwórz Zod schema dla `CreateSetCommand`
- Waliduj wymagane pole `name` typu string
- Dodaj custom refinement dla długości po `.trim()`

**Kod:**

```typescript
import { z } from "zod";

export const createSetCommandSchema = z.object({
  name: z
    .string({ required_error: "Set name is required" })
    .trim()
    .min(1, "Set name must be at least 1 character")
    .max(10, "Set name must be at most 10 characters"),
});

export type CreateSetCommandInput = z.infer<typeof createSetCommandSchema>;
```

**Walidacja:** Test schema z przykładowymi danymi (valid, invalid, edge cases)

---

### Krok 2: Service Layer - Sets Service

**Plik:** `src/lib/services/sets.service.ts` (nowy)

**Zadanie:**

- Utwórz funkcję `createSet(supabase, userId, name)` → `SetEntity`
- Utwórz funkcję `getAllUserSetsWithCounts(supabase, userId)` → `SetDTO[]`
- Obsłuż błędy DB i mapuj je na przyjazne komunikaty

**Kod (szkielet):**

```typescript
import type { SupabaseClient } from "../db/supabase.client";
import type { SetEntity, SetDTO, SetInsert } from "../types";

export async function createSet(supabase: SupabaseClient, userId: string, name: string): Promise<SetEntity> {
  const { data, error } = await supabase.from("sets").insert({ name: name.trim(), user_id: userId }).select().single();

  if (error) {
    // Handle duplicate name, max sets, etc.
    throw error;
  }

  return data;
}

export async function getAllUserSetsWithCounts(supabase: SupabaseClient, userId: string): Promise<SetDTO[]> {
  const { data, error } = await supabase
    .from("sets")
    .select("id, name, user_id, set_items(count)")
    .eq("user_id", userId)
    .order("name");

  if (error) throw error;

  return data.map((set) => ({
    id: set.id,
    name: set.name,
    user_id: set.user_id,
    item_count: set.set_items?.[0]?.count ?? 0,
  }));
}
```

**Walidacja:** Unit tests dla service functions z mock Supabase client

---

### Krok 3: Error Handling Utility

**Plik:** `src/lib/errors/db-errors.ts` (nowy)

**Zadanie:**

- Utwórz funkcję mapującą błędy PostgreSQL na `ErrorResponse`
- Obsłuż kody błędów: `23505` (unique violation), trigger messages

**Kod (szkielet):**

```typescript
import type { ErrorResponse, ErrorCode } from "../types";

export function mapDatabaseError(error: any): { code: ErrorCode; message: string; status: number } {
  // Duplicate name
  if (error.code === "23505" && error.constraint?.includes("btrim_name_uniq")) {
    return {
      code: "DUPLICATE_SET_NAME",
      message: "A set with this name already exists",
      status: 409,
    };
  }

  // Max sets trigger
  if (error.message?.includes("MAX_SETS_PER_USER_EXCEEDED")) {
    return {
      code: "MAX_SETS_PER_USER_EXCEEDED",
      message: "Maximum number of sets (6) reached for this user",
      status: 400,
    };
  }

  // Default
  return {
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred",
    status: 500,
  };
}
```

---

### Krok 4: API Route Handler

**Plik:** `src/pages/api/sets/index.ts` (nowy lub rozszerzenie istniejącego)

**Zadanie:**

- Utwórz funkcję `POST` handler
- Pobierz i zwaliduj request body
- Sprawdź uwierzytelnienie (`context.locals.supabase.auth.getUser()`)
- Wywołaj service layer
- Zwróć odpowiedź `CreateSetResponse` z kodem 201

**Kod (szkielet):**

```typescript
import type { APIRoute } from "astro";
import { createSetCommandSchema } from "../../lib/validation/sets.validation";
import { createSet, getAllUserSetsWithCounts } from "../../lib/services/sets.service";
import { mapDatabaseError } from "../../lib/errors/db-errors";
import type { CreateSetResponse, ErrorResponse } from "../../types";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  // 1. Check authentication
  const {
    data: { user },
    error: authError,
  } = await locals.supabase.auth.getUser();

  if (authError || !user) {
    return new Response(
      JSON.stringify({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      } as ErrorResponse),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 2. Parse and validate body
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        code: "INVALID_SET_NAME",
        message: "Invalid JSON body",
      } as ErrorResponse),
      { status: 400 }
    );
  }

  const validationResult = createSetCommandSchema.safeParse(body);
  if (!validationResult.success) {
    return new Response(
      JSON.stringify({
        code: "INVALID_SET_NAME",
        message: validationResult.error.issues[0]?.message || "Invalid input",
      } as ErrorResponse),
      { status: 400 }
    );
  }

  const { name } = validationResult.data;

  // 3. Create set via service
  try {
    const newSet = await createSet(locals.supabase, user.id, name);

    // 4. Fetch updated list
    const allSets = await getAllUserSetsWithCounts(locals.supabase, user.id);

    // 5. Format response
    const response: CreateSetResponse = {
      sets: allSets,
      created_set: {
        id: newSet.id,
        name: newSet.name,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error creating set:", error);
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

---

### Krok 5: Middleware Verification

**Plik:** `src/middleware/index.ts` (sprawdź istniejący)

**Zadanie:**

- Upewnij się, że middleware poprawnie inicjalizuje `context.locals.supabase`
- Dodaj `SupabaseClient` do `locals` jeśli jeszcze nie istnieje

**Kod (sprawdź czy już istnieje):**

```typescript
import { createServerClient } from "@supabase/ssr";
import type { MiddlewareHandler } from "astro";

export const onRequest: MiddlewareHandler = async ({ locals, request, cookies }, next) => {
  locals.supabase = createServerClient(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_ANON_KEY, {
    cookies: {
      get: (key) => cookies.get(key)?.value,
      set: (key, value, options) => cookies.set(key, value, options),
      remove: (key, options) => cookies.delete(key, options),
    },
  });

  return next();
};
```

---

### Krok 6: Type Definitions Update

**Plik:** `src/types.ts` (sprawdź czy wszystkie typy istnieją)

**Zadanie:**

- Upewnij się, że `CreateSetCommand`, `CreateSetResponse`, `ErrorResponse` są zdefiniowane
- Dodaj brakujące typy jeśli potrzebne

**Status:** Już zdefiniowane w pliku (sprawdzone w analizie)

---

<!-- ### Krok 7: Testy Integracyjne (Opcjonalne dla MVP)
**Plik:** `tests/api/sets.test.ts` (nowy)

**Zadanie:**
- Test happy path: utworzenie zestawu z prawidłową nazwą
- Test walidacji: puste name, za długie name
- Test duplikatu: próba utworzenia zestawu z istniejącą nazwą
- Test limitu: próba utworzenia 7. zestawu
- Test uwierzytelnienia: request bez tokenu

--- -->

### Krok 7: Dokumentacja i Finalizacja

**Zadania:**

1. Dodaj komentarze JSDoc do funkcji service
2. Zaktualizuj `.ai/api-plan.md` jeśli potrzebne
3. Przetestuj endpoint ręcznie (Postman/curl/Insomnia)
4. Sprawdź logi błędów w konsoli
5. Zweryfikuj odpowiedzi dla wszystkich przypadków błędów

**Checklist przed merge:**

- [ ] Endpoint zwraca 201 z poprawną strukturą dla valid input
- [ ] Endpoint zwraca 400 dla invalid name (puste, za długie)
- [ ] Endpoint zwraca 409 dla duplikatu nazwy
- [ ] Endpoint zwraca 400 dla limitu 6 zestawów
- [ ] Endpoint zwraca 401 dla braku uwierzytelnienia
- [ ] Linter nie pokazuje błędów
- [ ] Service functions są przetestowane
- [ ] Error handling pokrywa wszystkie scenariusze
- [ ] Dokumentacja jest aktualna

---

## 10. Dodatkowe uwagi

### Bezpieczeństwo user_id

**KRYTYCZNE:** Nigdy nie ufaj `user_id` z requestu. Zawsze pobieraj z sesji:

```typescript
const {
  data: { user },
} = await locals.supabase.auth.getUser();
const userId = user.id; // ← ZAWSZE z sesji, NIGDY z body
```

### Trimming name

Zawsze przycinaj spacje przed zapisem i walidacją:

```typescript
const trimmedName = name.trim();
// Następnie waliduj długość trimmedName
```

### RLS jako ostatnia linia obrony

Nawet jeśli kod aplikacji zawiera błąd, RLS na poziomie DB zapobiega:

- Wstawianiu zestawów dla innego użytkownika
- Odczytywaniu zestawów innych użytkowników

### Monitoring i Alerty

Zalecane metryki do monitorowania:

- Liczba błędów 409 (duplikaty) - może wskazywać na UX problem
- Liczba błędów 400 (limit) - użytkownicy osiągają limit
- Latencja p95/p99 - dla optymalizacji wydajności
- Rate błędów 500 - nieoczekiwane problemy

### Przyszłe rozszerzenia

Potencjalne feature w przyszłych wersjach:

- Możliwość kopiowania zestawu (duplicate with new name)
- Sortowanie niestandardowe (custom order field)

---

## Podsumowanie

Ten plan implementacji pokrywa wszystkie aspekty endpointu `POST /api/sets`:

- ✅ Szczegółowa walidacja danych wejściowych
- ✅ Bezpieczne uwierzytelnianie i autoryzacja
- ✅ Kompleksowa obsługa błędów
- ✅ Optymalizacja wydajności dla MVP
- ✅ Jasne kroki implementacji
- ✅ Zgodność z regułami projektu (Astro, Supabase, TypeScript)

Implementacja powinna zająć ~2-4 godziny dla doświadczonego developera, zakładając, że middleware i schema DB są już gotowe.
