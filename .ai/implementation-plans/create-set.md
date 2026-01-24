# API Endpoint Implementation Plan: POST /api/sets

## 1. Przegląd punktu końcowego

Endpoint `POST /api/sets` służy do tworzenia nowego zestawu tablic (dashboard set) dla uwierzytelnionego użytkownika. Po pomyślnym utworzeniu zwraca zaktualizowaną listę wszystkich zestawów użytkownika wraz z metadanymi oraz informacje o nowo utworzonym zestawie.

**Główne funkcjonalności:**

- Tworzenie nowego zestawu dla zalogowanego użytkownika
- Automatyczne przypisanie `user_id` z kontekstu sesji
- Walidacja nazwy (1-10 znaków po przycięciu spacji)
- Egzekwowanie unikalności nazw per użytkownik
- Zwracanie pełnej listy zestawów

**Business rules:**

- Użytkownik może mieć maksymalnie 6 zestawów (egzekwowane przez trigger DB)
- Nazwa po przycięciu musi mieć 1-10 znaków
- Nazwa nie może być duplikatem innej nazwy użytkownika (case-sensitive, po przyc ięciu)
- `user_id` zawsze pochodzi z sesji, nigdy z input użytkownika

---

## 2. Szczegóły żądania

### Metoda HTTP

`POST`

### Struktura URL

```
POST /api/sets
```

### Parametry URL

Brak

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
  name: string; // Nazwa zestawu (1-10 znaków po przycięciu)
}
```

**Przykład:**

```json
{
  "name": "  Moje Trasy  "
}
```

---

## 3. Wykorzystywane typy

### Command Model (Input)

```typescript
// z src/types.ts
export interface CreateSetCommand {
  name: string;
}
```

### Response Types (Output)

```typescript
// z src/types.ts
export interface CreateSetResponse {
  sets: SetDTO[];
  created_set: Pick<SetDTO, "id" | "name">;
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

### Sukces: 201 Created

**Status Code:** `201`

**Response Body:**

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

#### 400 Bad Request

**Przyczyny:**

- Brak pola `name` w body
- Puste `name` po przycięciu
- `name` zbyt długie (>10 znaków po przycięciu)
- Limit zestawów przekroczony (6 zestawów)

**Response Body:**

```json
{
  "code": "INVALID_SET_NAME",
  "message": "Set name must be between 1 and 10 characters after trimming"
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

#### 409 Conflict

**Przyczyny:**

- Użytkownik już posiada zestaw o tej samej nazwie (po przycięciu, case-sensitive)

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
- Błąd sieciowy/Supabase

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
1. Client → POST /api/sets { name }
   ↓
2. Astro API Route Handler
   ↓
3. Middleware weryfikuje JWT → context.locals.supabase
   ↓
4. Walidacja Zod Schema (struktura + typy)
   ↓
5. Trim name + walidacja długości (1-10 chars)
   ↓
6. Pobranie user_id z sesji (getUser())
   ↓ [authenticated]
7. Service: createSet(supabase, userId, name)
   ├─ INSERT INTO sets (name, user_id)
   ├─ Trigger sprawdza limit 6 zestawów
   ├─ Unique index sprawdza duplikaty
   └─ RETURNING *
   ↓ [success]
8. Service: getAllUserSetsWithCounts(supabase, userId)
   ├─ SELECT sets LEFT JOIN set_items
   └─ GROUP BY + COUNT dla item_count
   ↓
9. Format CreateSetResponse
   ↓
10. Return 201 JSON
```

### Interakcje z bazą danych

#### 1. INSERT nowego zestawu

```sql
INSERT INTO public.sets (name, user_id)
VALUES ($1, $2)
RETURNING *;
```

- **Cel:** Utworzenie nowego zestawu
- **Trigger:** Sprawdza czy user ma < 6 zestawów
- **Unique Index:** `(user_id, btrim(name))` blokuje duplikaty
- **Zwracany błąd:** `MAX_SETS_PER_USER_EXCEEDED` lub `DUPLICATE_SET_NAME`

#### 2. SELECT wszystkich zestawów użytkownika z licznikami

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

- **Cel:** Pobranie zaktualizowanej listy zestawów z metadanymi
- **Zwracany błąd:** Brak (zawsze zwraca dane, może być pusta tablica)

---

## 6. Względy bezpieczeństwa

### Uwierzytelnienie

- Wymagany token JWT w nagłówku `Authorization: Bearer <token>`
- Weryfikacja przez Supabase Auth middleware
- `locals.supabase.auth.getUser()` przed wykonaniem operacji
- Brak/nieprawidłowy token → `401 Unauthorized`

### Autoryzacja

- **Row Level Security (RLS):** Włączona na tabeli `public.sets`
- **Polityka INSERT:** `WITH CHECK (user_id = auth.uid())`
- Zapobiega wstawieniu zestawu dla innego użytkownika
- Defense in depth: walidacja aplikacji + RLS

### Walidacja danych wejściowych

- Zod schema waliduje strukturę i typy
- `.trim()` przed walidacją długości (1-10 znaków)
- Parametryzowane queries (automatyczne w Supabase Client)
- SQL Injection: zabezpieczone przez prepared statements

### Potencjalne zagrożenia

1. **Privilege Escalation:**
   - Opis: Próba utworzenia zestawu dla innego user_id
   - Mitigacja: user_id TYLKO z sesji, RLS jako backup

2. **Rate Limiting Abuse:**
   - Opis: Wielokrotne próby tworzenia zestawów
   - Mitigacja: Twardy limit 6 zestawów per user

3. **Name Enumeration:**
   - Opis: Próba sprawdzenia czy dana nazwa istnieje
   - Mitigacja: Zwracanie generycznego błędu 409

---

## 7. Obsługa błędów

### Tabela mapowania błędów

| Scenariusz            | Error Source         | HTTP Status | Error Code                 | Error Message                                |
| --------------------- | -------------------- | ----------- | -------------------------- | -------------------------------------------- |
| Brak tokenu JWT       | Middleware           | 401         | UNAUTHORIZED               | Authentication required                      |
| Nieprawidłowy JWT     | getUser()            | 401         | UNAUTHORIZED               | Invalid or expired token                     |
| Brak pola `name`      | Zod validation       | 400         | INVALID_SET_NAME           | Set name is required                         |
| Puste `name` po trim  | Custom validation    | 400         | INVALID_SET_NAME           | Set name must be between 1 and 10 characters |
| `name` > 10 znaków    | Custom validation    | 400         | INVALID_SET_NAME           | Set name must be between 1 and 10 characters |
| Duplikat nazwy        | Unique index (23505) | 409         | DUPLICATE_SET_NAME         | A set with this name already exists          |
| Przekroczono limit 6  | Trigger              | 400         | MAX_SETS_PER_USER_EXCEEDED | Maximum number of sets (6) reached           |
| RLS blokuje INSERT    | PostgreSQL (42501)   | 403         | FORBIDDEN                  | Access denied                                |
| Nieoczekiwany błąd DB | PostgreSQL           | 500         | INTERNAL_ERROR             | An unexpected error occurred                 |

### Strategia logowania

- **Błędy 500:** Pełne szczegóły (stack trace, query) do console/monitoring
- **Błędy 400/409:** Krótkie info (user_id, attempted name)
- **NIE logować:** Wrażliwych danych (hasła, tokeny)
- **NIE ujawniać:** Szczegółów DB w odpowiedzi klientowi

---

## 8. Rozważania dotyczące wydajności

### Potencjalne wąskie gardła

1. **Dwa zapytania do bazy**
   - **Problem:** INSERT + SELECT jako osobne operacje
   - **Optymalizacja:** Możliwe połączenie w jedno zapytanie z CTE
   - **Wpływ:** Przy max 6 zestawach marginalny, akceptowalne dla MVP

2. **LEFT JOIN dla item_count**
   - **Problem:** Wykonywane po każdym utworzeniu
   - **Optymalizacja:** Indeksy na `sets.user_id` i `set_items.set_id`
   - **Wpływ:** Max 6 zestawów × 6 items = 36 rekordów, negligible

3. **Trigger sprawdzający limit**
   - **Problem:** `SELECT COUNT(*)` przy każdym INSERT
   - **Optymalizacja:** Indeks na `user_id` zapewnia szybkie zliczanie
   - **Wpływ:** Dla małej liczby zestawów bardzo szybkie

### Strategie optymalizacji

- **Indeksy bazodanowe:** `sets_user_id_idx`, `sets_user_id_btrim_name_uniq`
- **Caching:** Po stronie klienta (Svelte store)
- **Connection pooling:** Obsługiwane przez Supabase Client

### Monitoring

- **Metryki:** Query execution time, request latency (p50, p95, p99)
- **Alarmy:** p95 > 500ms, error rate > 5%
- **Tools:** Supabase Dashboard → Performance → Slow Queries

---

## 9. Etapy wdrożenia

### Krok 1: Walidacja Zod Schema

**Plik:** `src/lib/validation/sets.validation.ts`

Utworzyć schema dla `CreateSetCommand`:

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

**Testy:** Walidacja schema z przykładowymi danymi (valid, invalid, edge cases)

### Krok 2: Service Layer

**Plik:** `src/lib/services/sets.service.ts`

Utworzyć funkcje:

- `createSet(supabase, userId, name): Promise<SetEntity>`
- `getAllUserSetsWithCounts(supabase, userId): Promise<SetDTO[]>`

### Krok 3: Error Handling Utility

**Plik:** `src/lib/errors/db-errors.ts`

Utworzyć funkcję `mapDatabaseError(error)` obsługującą:

- Kod 23505 (unique violation)
- Trigger messages (MAX_SETS_PER_USER_EXCEEDED)
- Domyślne błędy

### Krok 4: API Route Handler

**Plik:** `src/pages/api/sets/index.ts`

Implementować handler `POST`:

1. Sprawdzenie uwierzytelnienia
2. Parsowanie i walidacja body
3. Wywołanie service layer
4. Zwrócenie odpowiedzi 201 lub błędu

### Krok 5: Walidacja implementacji

**5.1. Sprawdzenie linterów**

```bash
npm run lint
```

**5.2. Testowanie manualne**

- Test happy path: utworzenie zestawu z prawidłową nazwą
- Test walidacji: puste name, za długie name
- Test duplikatu: próba utworzenia zestawu z istniejącą nazwą
- Test limitu: próba utworzenia 7. zestawu
- Test uwierzytelnienia: request bez tokenu

### Krok 6: Dokumentacja i finalizacja

**6.1. Aktualizacja dokumentacji API**

- Dodać endpoint do `.ai/api-plan.md`
- Udokumentować wszystkie kody błędów
- Dodać przykłady żądań i odpowiedzi

**6.2. Code review checklist**

- [ ] Endpoint zwraca 201 z poprawną strukturą dla valid input
- [ ] Endpoint zwraca 400 dla invalid name
- [ ] Endpoint zwraca 409 dla duplikatu nazwy
- [ ] Endpoint zwraca 400 dla limitu 6 zestawów
- [ ] Endpoint zwraca 401 dla braku uwierzytelnienia
- [ ] Linter nie pokazuje błędów
- [ ] Service functions są przetestowane
- [ ] Error handling pokrywa wszystkie scenariusze
- [ ] user_id zawsze z sesji, nigdy z input

---

## Podsumowanie

Endpoint `POST /api/sets` implementuje bezpieczne tworzenie zestawów z pełną walidacją i autoryzacją. Kluczowe aspekty:

- **Bezpieczeństwo:** Wielowarstwowa weryfikacja (JWT + RLS + walidacja)
- **Wydajność:** Optymalne zapytania z indeksami, 2 queries na request
- **Spójność:** Zgodność z wzorcami Astro, Supabase, TypeScript
- **Niezawodność:** Obsługa wszystkich scenariuszy błędów
- **UX:** Zwraca pełną listę zestawów, eliminując dodatkowe zapytania
