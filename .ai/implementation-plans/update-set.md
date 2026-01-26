# API Endpoint Implementation Plan: PATCH /api/sets/{setId}

## 1. Przegląd punktu końcowego

Endpoint `PATCH /api/sets/{setId}` służy do zmiany nazwy istniejącego zestawu należącego do uwierzytelnionego użytkownika. Nazwa musi być unikalna w ramach zestawów danego użytkownika (po przycięciu, case-sensitive) i spełniać wymagania długości (1-10 znaków).

**Główne funkcjonalności:**

- Zmiana nazwy istniejącego zestawu
- Weryfikacja własności zestawu
- Walidacja unikalności nazwy (per user, case-sensitive, trimmed)
- Zwracanie zaktualizowanej listy wszystkich zestawów użytkownika

**Business rules:**

- Użytkownik może edytować tylko swoje zestawy
- Nazwa po przycięciu musi mieć 1-10 znaków
- Nazwa nie może być duplikatem innej nazwy użytkownika
- Operacja jest idempotentna (zmiana na tę samą wartość dozwolona)

---

## 2. Szczegóły żądania

### Metoda HTTP

`PATCH`

### Struktura URL

```
PATCH /api/sets/{setId}
```

### Parametry URL

**Wymagane:**

- `setId` (UUID) - ID zestawu do edycji, musi należeć do użytkownika

### Query Parameters

Brak

### Request Headers

```
Content-Type: application/json
Authorization: Bearer {JWT_TOKEN}
```

### Request Body

```typescript
{
  name: string; // Nowa nazwa (1-10 znaków po trim)
}
```

**Przykład:**

```json
{
  "name": "  Praca  "
}
```

---

## 3. Wykorzystywane typy

### Command Model (Input)

```typescript
// z src/types.ts
export interface UpdateSetCommand {
  name: string;
}
```

### Response Types (Output)

```typescript
// z src/types.ts
export interface UpdateSetResponse {
  sets: SetDTO[];
  updated_set: Pick<SetDTO, "id" | "name">;
}
```

### DTO Types

```typescript
// z src/types.ts
export interface SetDTO {
  id: string;
  name: string;
  user_id: string;
  item_count: number;
  created_at?: string;
}
```

### Error Types

```typescript
// z src/types.ts
interface ErrorResponse {
  code: string;
  message: string;
  details?: unknown;
}
```

---

## 4. Szczegóły odpowiedzi

### Sukces: 200 OK

**Status Code:** `200`

**Response Body:**

```json
{
  "sets": [
    {
      "id": "uuid-1",
      "name": "Dom",
      "user_id": "user-uuid",
      "item_count": 3
    },
    {
      "id": "uuid-2",
      "name": "Praca",
      "user_id": "user-uuid",
      "item_count": 2
    }
  ],
  "updated_set": {
    "id": "uuid-2",
    "name": "Praca"
  }
}
```

### Błędy

#### 400 Bad Request

**Przyczyny:**

- Nieprawidłowy format setId (nie UUID)
- Nieprawidłowy JSON
- Brak pola `name`
- Nazwa za krótka (<1 znak po trim)
- Nazwa za długa (>10 znaków po trim)

**Response Body:**

```json
{
  "code": "INVALID_SET_NAME",
  "message": "Set name must be between 1 and 20 characters"
}
```

#### 401 Unauthorized

**Przyczyny:**

- Brak tokenu JWT
- Nieprawidłowy lub wygasły token

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

**Response Body:**

```json
{
  "code": "SET_NOT_FOUND",
  "message": "Set not found or access denied"
}
```

#### 409 Conflict

**Przyczyny:**

- Użytkownik ma już inny zestaw o tej samej nazwie (po trim, case-sensitive)

**Response Body:**

```json
{
  "code": "DUPLICATE_SET_NAME",
  "message": "A set with this name already exists"
}
```

#### 500 Internal Server Error

**Przyczyny:**

- Nieoczekiwany błąd bazy danych

**Response Body:**

```json
{
  "code": "INTERNAL_ERROR",
  "message": "An unexpected error occurred"
}
```

---

## 5. Przepływ danych

### Diagram przepływu

```
1. Client → PATCH /api/sets/{setId} { name }
   ↓
2. Middleware weryfikuje JWT
   ↓
3. API Route Handler
   ├─ 3a. Walidacja setId (UUID format)
   ├─ 3b. Uwierzytelnienie (getUserId)
   ├─ 3c. Parsowanie JSON body
   └─ 3d. Walidacja Zod (trim + length)
   ↓
4. Service Layer: updateSet(supabase, userId, setId, name)
   ├─ UPDATE sets WHERE id = setId AND user_id = userId
   ├─ Check rowCount (czy coś zaktualizowano)
   └─ Throw SET_NOT_FOUND jeśli rowCount === 0
   ↓
5. Service Layer: getAllUserSetsWithCounts(supabase, userId)
   ├─ SELECT sets LEFT JOIN set_items
   └─ GROUP BY + COUNT dla item_count
   ↓
6. Format UpdateSetResponse
   ↓
7. Return 200 JSON
```

### Interakcje z bazą danych

#### 1. UPDATE zestawu

```sql
UPDATE public.sets
SET name = $1
WHERE id = $2 AND user_id = $3
RETURNING *;
```

- **Cel:** Aktualizacja nazwy zestawu z weryfikacją własności
- **Zwracany błąd:** `SET_NOT_FOUND` jeśli rowCount === 0
- **Unique Index:** Może zwrócić 23505 jeśli duplikat nazwy

#### 2. SELECT wszystkich zestawów użytkownika

```sql
SELECT s.id, s.name, s.user_id, COUNT(si.id) as item_count
FROM public.sets s
LEFT JOIN public.set_items si ON s.id = si.set_id
WHERE s.user_id = $1
GROUP BY s.id
ORDER BY s.name;
```

- **Cel:** Pobranie zaktualizowanej listy zestawów
- **Zwracany błąd:** Brak (zawsze zwraca dane)

---

## 6. Względy bezpieczeństwa

### Uwierzytelnienie

- Token JWT w nagłówku Authorization
- `getUserId(locals.supabase)` weryfikuje sesję
- Brak/nieprawidłowy token → `401 Unauthorized`

### Autoryzacja

- **Warstwa 1:** UPDATE z warunkiem `AND user_id = userId`
- **Warstwa 2:** Row Level Security (RLS) na `public.sets`
- **Polityka:** `WITH CHECK (user_id = auth.uid())`
- Zapobiega edycji cudzych zestawów

### Walidacja danych wejściowych

- UUID validation dla setId (regex)
- Zod schema dla request body
- `.trim()` przed zapisem do bazy
- Długość 1-10 znaków po trim

### Potencjalne zagrożenia

1. **UUID Enumeration Attack:**
   - Opis: Próba edycji zestawów innych użytkowników
   - Mitigacja: Warunek `AND user_id` + RLS

2. **Name Collision Race Condition:**
   - Opis: Równoczesne próby zmiany nazwy
   - Mitigacja: Unique index `(user_id, btrim(name))`

---

## 7. Obsługa błędów

### Tabela mapowania błędów

| Scenariusz          | Error Source           | HTTP Status | Error Code         | Error Message                          |
| ------------------- | ---------------------- | ----------- | ------------------ | -------------------------------------- |
| Nieprawidłowy setId | UUID validation        | 400         | INVALID_INPUT      | Invalid set ID format                  |
| Brak tokenu JWT     | Middleware             | 401         | UNAUTHORIZED       | Authentication required                |
| Nieprawidłowy JSON  | JSON.parse()           | 400         | INVALID_SET_NAME   | Invalid JSON body                      |
| Brak pola name      | Zod validation         | 400         | INVALID_SET_NAME   | Set name is required                   |
| Puste name po trim  | Zod validation         | 400         | INVALID_SET_NAME   | Set name must be at least 1 character  |
| name > 20 znaków    | Zod validation         | 400         | INVALID_SET_NAME   | Set name must be at most 20 characters |
| Zestaw nie istnieje | updateSet (rowCount=0) | 404         | SET_NOT_FOUND      | Set not found or access denied         |
| Cudzy zestaw        | updateSet (rowCount=0) | 404         | SET_NOT_FOUND      | Set not found or access denied         |
| Duplikat nazwy      | Unique index (23505)   | 409         | DUPLICATE_SET_NAME | A set with this name already exists    |
| RLS rejection       | PostgreSQL (42501)     | 403         | FORBIDDEN          | Access denied                          |
| Nieoczekiwany błąd  | PostgreSQL             | 500         | INTERNAL_ERROR     | An unexpected error occurred           |

### Strategia logowania

- **Błędy 500:** Pełne szczegóły (stack trace, query, params)
- **Błędy 400/409:** Krótkie info (user_id, setId, attempted name)
- **Błędy 404:** userId + setId (bez ujawniania czy zestaw istnieje)
- NIE logować tokenów, haseł

---

## 8. Rozważania dotyczące wydajności

### Potencjalne wąskie gardła

1. **Dwa zapytania do bazy**
   - **Problem:** UPDATE + SELECT jako osobne operacje
   - **Optymalizacja:** Możliwe połączenie w jedno zapytanie z CTE
   - **Wpływ:** Przy max 6 zestawach marginalny

2. **LEFT JOIN dla item_count**
   - **Problem:** Wykonywane po każdej aktualizacji
   - **Optymalizacja:** Indeksy na FK
   - **Wpływ:** Negligible dla małych zestawów danych

3. **Unique index z btrim()**
   - **Problem:** Functional index może być wolniejszy
   - **Optymalizacja:** PostgreSQL cache query plans
   - **Wpływ:** Dla 6 zestawów negligible

### Strategie optymalizacji

- **Indeksy bazodanowe:** `sets_pkey`, `sets_user_id_idx`, `sets_user_id_btrim_name_uniq`
- **Caching:** Po stronie klienta (Svelte store)
- **Connection pooling:** Obsługiwane przez Supabase Client

### Monitoring

- **Metryki:** Query execution time, request latency
- **Alarmy:** p95 > 500ms, error rate > 5%
- **Tools:** Supabase Dashboard → Performance

---

## 9. Etapy wdrożenia

### Krok 1: Rozszerzenie walidacji Zod

**Plik:** `src/lib/validation/sets.validation.ts`

Dodać schema dla UpdateSetCommand:

```typescript
export const updateSetCommandSchema = z.object({
  name: z
    .string({ required_error: "Set name is required" })
    .trim()
    .min(1, "Set name must be at least 1 character")
    .max(20, "Set name must be at most 20 characters"),
});
```

### Krok 2: Rozszerzenie Service Layer

**Plik:** `src/lib/services/sets.service.ts`

Dodać funkcję `updateSet`:

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

  if (error || !data) {
    const notFoundError = new Error("SET_NOT_FOUND") as Error & { code: "SET_NOT_FOUND" };
    notFoundError.code = "SET_NOT_FOUND";
    throw notFoundError;
  }

  return data;
}
```

### Krok 3: Implementacja handlera PATCH

**Plik:** `src/pages/api/sets/[setId].ts`

Implementować handler PATCH:

1. Walidacja setId (UUID)
2. Sprawdzenie uwierzytelnienia
3. Parsowanie i walidacja body
4. Wywołanie service layer
5. Zwrócenie odpowiedzi 200 lub błędu

### Krok 4: Walidacja implementacji

**4.1. Sprawdzenie linterów**

```bash
npm run lint
```

**4.2. Testowanie manualne**

- Test happy path: aktualizacja nazwy
- Test walidacji: puste name, za długie name
- Test duplikatu: zmiana na istniejącą nazwę
- Test 404: nieistniejący setId
- Test autoryzacji: próba edycji cudzego zestawu

### Krok 5: Dokumentacja i finalizacja

**5.1. Aktualizacja dokumentacji API**

- Dodać endpoint do `.ai/api-plan.md`
- Udokumentować kody błędów
- Dodać przykłady

**5.2. Code review checklist**

- [ ] Endpoint zwraca 200 z poprawną strukturą
- [ ] Walidacja UUID działa poprawnie
- [ ] Wszystkie błędy są mapowane
- [ ] user_id zawsze z sesji
- [ ] Zgodność z wzorcami z innych endpointów

---

## Podsumowanie

Endpoint `PATCH /api/sets/{setId}` implementuje bezpieczną aktualizację nazw zestawów z pełną walidacją i autoryzacją. Kluczowe aspekty:

- **Bezpieczeństwo:** Wielowarstwowa weryfikacja (JWT + ownership check + RLS)
- **Wydajność:** Optymalne zapytania z indeksami, 2 queries na request
- **Spójność:** Zgodność z wzorcami Astro, Supabase, TypeScript
- **Niezawodność:** Obsługa wszystkich scenariuszy błędów
- **UX:** Zwraca pełną listę zestawów po aktualizacji
