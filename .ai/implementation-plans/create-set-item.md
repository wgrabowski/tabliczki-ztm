# API Endpoint Implementation Plan: POST /api/sets/{setId}/items

## 1. Przegląd punktu końcowego

Endpoint `POST /api/sets/{setId}/items` służy do dodawania nowego przystanku (stop card) do istniejącego zestawu użytkownika. Trigger bazodanowy automatycznie przypisuje kolejną pozycję (1-based, max+1) do nowo dodanego elementu.

**Główne funkcjonalności:**

- Dodanie nowego przystanku ZTM do zestawu
- Automatyczne przypisanie pozycji przez trigger bazodanowy
- Walidacja limitu elementów (max 6 per set)
- Walidacja unikalności stop_id w ramach zestawu
- Zwrócenie zaktualizowanej listy wszystkich elementów

**Business rules:**

- Zestaw może mieć maksymalnie 6 elementów (egzekwowane przez trigger)
- stop_id musi być unikalny w ramach zestawu
- Pozycja jest auto-przypisywana: MAX(position) + 1, lub 1 jeśli zestaw pusty

---

## 2. Szczegóły żądania

### Metoda HTTP

`POST`

### Struktura URL

```
POST /api/sets/{setId}/items
```

### Parametry URL

**Wymagane:**

- `setId` (UUID) - Identyfikator zestawu, do którego dodawany jest element

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
  stop_id: number; // Positive integer, ID przystanku ZTM
}
```

**Przykład:**

```json
{
  "stop_id": 1042
}
```

---

## 3. Wykorzystywane typy

### Command Model (Input)

```typescript
// z src/types.ts
export interface CreateSetItemCommand {
  stop_id: number;
}
```

### Response Types (Output)

```typescript
// z src/types.ts
export interface CreateSetItemResponse {
  items: SetItemDTO[];
  created_item: Pick<SetItemDTO, "id" | "stop_id" | "position">;
}
```

### DTO Types

```typescript
// z src/types.ts
export interface SetItemDTO {
  id: string;
  set_id: string;
  stop_id: number;
  position: number;
  added_at?: string;
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
  "items": [
    {
      "id": "uuid-1",
      "set_id": "set-uuid",
      "stop_id": 1001,
      "position": 1
    },
    {
      "id": "uuid-2",
      "set_id": "set-uuid",
      "stop_id": 1042,
      "position": 2
    }
  ],
  "created_item": {
    "id": "uuid-2",
    "stop_id": 1042,
    "position": 2
  }
}
```

### Błędy

#### 400 Bad Request

**Przyczyny:**

- Nieprawidłowy format setId (nie UUID)
- Nieprawidłowy JSON
- Brak pola `stop_id`
- stop_id nie jest positive integer
- Limit elementów przekroczony (6 elementów)

**Response Body:**

```json
{
  "code": "INVALID_STOP_ID",
  "message": "stop_id must be a positive integer"
}
```

lub

```json
{
  "code": "MAX_ITEMS_PER_SET_EXCEEDED",
  "message": "Maximum number of items (6) reached for this set"
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

- stop_id już istnieje w tym zestawie

**Response Body:**

```json
{
  "code": "SET_ITEM_ALREADY_EXISTS",
  "message": "This stop is already added to the set"
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
1. Client → POST /api/sets/{setId}/items { stop_id }
   ↓
2. API Route Handler
   ├─ 2a. Walidacja setId (UUID format)
   ├─ 2b. Uwierzytelnienie (getUserId)
   ├─ 2c. Parsowanie JSON body
   └─ 2d. Walidacja Zod (stop_id positive int)
   ↓
3. Service Layer: verifySetOwnership(supabase, userId, setId)
   ├─ SELECT sets WHERE id = setId AND user_id = userId
   └─ Throw SET_NOT_FOUND jeśli nie znaleziono
   ↓
4. Service Layer: createSetItem(supabase, setId, stop_id)
   ├─ INSERT INTO set_items (set_id, stop_id, position = NULL)
   ├─ Trigger automatycznie przypisuje position
   ├─ Trigger sprawdza limit 6 elementów
   └─ Unique index sprawdza duplikaty stop_id
   ↓
5. Service Layer: getAllSetItems(supabase, setId)
   ├─ SELECT set_items WHERE set_id = setId
   └─ ORDER BY position ASC
   ↓
6. Format CreateSetItemResponse
   ↓
7. Return 201 JSON
```

### Interakcje z bazą danych

#### 1. Weryfikacja własności zestawu

```sql
SELECT id FROM public.sets
WHERE id = $1 AND user_id = $2
LIMIT 1;
```

- **Cel:** Sprawdzenie, czy zestaw istnieje i należy do użytkownika
- **Zwracany błąd:** `SET_NOT_FOUND` jeśli brak wyników

#### 2. INSERT nowego elementu

```sql
INSERT INTO public.set_items (set_id, stop_id, position)
VALUES ($1, $2, NULL)
RETURNING *;
```

- **Cel:** Utworzenie nowego elementu
- **Trigger:** Automatycznie przypisuje position = MAX(position) + 1
- **Trigger:** Sprawdza czy zestaw ma < 6 elementów
- **Unique Index:** `(set_id, stop_id)` blokuje duplikaty
- **Zwracany błąd:** `MAX_ITEMS_PER_SET_EXCEEDED` lub `SET_ITEM_ALREADY_EXISTS`

#### 3. SELECT wszystkich elementów zestawu

```sql
SELECT id, set_id, stop_id, position
FROM public.set_items
WHERE set_id = $1
ORDER BY position ASC;
```

- **Cel:** Pobranie zaktualizowanej listy elementów
- **Zwracany błąd:** Brak (zawsze zwraca dane)

---

## 6. Względy bezpieczeństwa

### Uwierzytelnienie

- Token JWT w nagłówku Authorization
- `getUserId(locals.supabase)` weryfikuje sesję
- Brak/nieprawidłowy token → `401 Unauthorized`

### Autoryzacja

- **Warstwa 1:** Jawna weryfikacja własności zestawu (`verifySetOwnership`)
- **Warstwa 2:** Row Level Security (RLS) na `public.set_items`
- **Polityka INSERT:** Przez FK do sets z warunkiem RLS
- Zapobiega dodawaniu elementów do cudzych zestawów

### Walidacja danych wejściowych

- UUID validation dla setId (regex)
- Zod schema dla request body
- stop_id musi być positive integer (> 0)
- Trigger DB waliduje business rules (limit 6, unique stop_id)

### Potencjalne zagrożenia

1. **Invalid stop_id:**
   - Opis: Dodanie nieistniejącego ID przystanku ZTM
   - Mitigacja: Frontend powinien walidować z API ZTM
   - Backend: Akceptujemy positive integer (validacja ZTM po stronie frontend)

2. **Race Condition:**
   - Opis: Równoczesne dodawanie do tego samego zestawu
   - Mitigacja: Trigger atomowo sprawdza limit i przypisuje pozycję

---

## 7. Obsługa błędów

### Tabela mapowania błędów

| Scenariusz           | Error Source         | HTTP Status | Error Code                 | Error Message                         |
| -------------------- | -------------------- | ----------- | -------------------------- | ------------------------------------- |
| Nieprawidłowy setId  | UUID validation      | 400         | INVALID_INPUT              | Invalid set ID format                 |
| Brak tokenu JWT      | Middleware           | 401         | UNAUTHORIZED               | Authentication required               |
| Nieprawidłowy JSON   | JSON.parse()         | 400         | INVALID_INPUT              | Invalid JSON body                     |
| Brak stop_id         | Zod validation       | 400         | INVALID_STOP_ID            | stop_id is required                   |
| stop_id <= 0         | Zod validation       | 400         | INVALID_STOP_ID            | stop_id must be a positive integer    |
| Zestaw nie istnieje  | verifySetOwnership   | 404         | SET_NOT_FOUND              | Set not found or access denied        |
| Cudzy zestaw         | verifySetOwnership   | 404         | SET_NOT_FOUND              | Set not found or access denied        |
| Duplikat stop_id     | Unique index (23505) | 409         | SET_ITEM_ALREADY_EXISTS    | This stop is already added to the set |
| Limit 6 przekroczony | Trigger              | 400         | MAX_ITEMS_PER_SET_EXCEEDED | Maximum number of items (6) reached   |
| Nieoczekiwany błąd   | PostgreSQL           | 500         | INTERNAL_ERROR             | An unexpected error occurred          |

### Strategia logowania

- **Błędy 500:** Pełne szczegóły (stack trace, query, params)
- **Błędy 400/409:** Krótkie info (userId, setId, stop_id)
- **Błędy 404:** userId + setId (bez ujawniania istnienia)

---

## 8. Rozważania dotyczące wydajności

### Potencjalne wąskie gardła

1. **Trzy zapytania do bazy**
   - **Problem:** SELECT (verify) + INSERT + SELECT (list)
   - **Optymalizacja:** Akceptowalne dla MVP
   - **Wpływ:** Max 6 elementów, negligible

2. **Trigger sprawdzający limit**
   - **Problem:** COUNT() przy każdym INSERT
   - **Optymalizacja:** Indeks na set_id zapewnia szybkie zliczanie
   - **Wpływ:** Dla małej liczby elementów bardzo szybkie

### Strategie optymalizacji

- **Indeksy bazodanowe:** `set_items_pkey`, `set_items_set_id_fkey`, `set_items_set_id_stop_id_uniq`
- **Trigger optymalizacja:** Jeden SELECT dla licznika i pozycji
- **Connection pooling:** Obsługiwane przez Supabase Client

### Monitoring

- **Metryki:** Query execution time, request latency
- **Alarmy:** p95 > 500ms, error rate > 5%

---

## 9. Etapy wdrożenia

### Krok 1: Rozszerzenie walidacji Zod

**Plik:** `src/lib/validation/sets.validation.ts`

Dodać schema dla CreateSetItemCommand:

```typescript
export const createSetItemCommandSchema = z.object({
  stop_id: z
    .number({ required_error: "stop_id is required" })
    .int("stop_id must be an integer")
    .positive("stop_id must be a positive integer"),
});
```

### Krok 2: Rozszerzenie Service Layer

**Plik:** `src/lib/services/set-items.service.ts`

Dodać funkcje:

- `verifySetOwnership(supabase, userId, setId)`
- `createSetItem(supabase, setId, stopId)`
- `getAllSetItems(supabase, setId)`

### Krok 3: Implementacja handlera POST

**Plik:** `src/pages/api/sets/[setId]/items/index.ts`

Implementować handler POST:

1. Walidacja setId (UUID)
2. Sprawdzenie uwierzytelnienia
3. Parsowanie i walidacja body
4. Wywołanie service layer
5. Zwrócenie odpowiedzi 201 lub błędu

### Krok 4: Walidacja implementacji

**4.1. Sprawdzenie linterów**

```bash
npm run lint
```

**4.2. Testowanie manualne**

- Test happy path: dodanie elementu
- Test walidacji: nieprawidłowy stop_id
- Test duplikatu: dodanie tego samego stop_id dwa razy
- Test limitu: dodanie 7. elementu
- Test 404: nieistniejący setId

### Krok 5: Dokumentacja i finalizacja

**5.1. Aktualizacja dokumentacji API**

- Dodać endpoint do `.ai/api-plan.md`
- Udokumentować kody błędów

**5.2. Code review checklist**

- [ ] Endpoint zwraca 201 z poprawną strukturą
- [ ] Trigger przypisuje pozycję poprawnie
- [ ] Wszystkie błędy są mapowane
- [ ] Limit 6 elementów egzekwowany
- [ ] Duplikaty blokowane

---

## Podsumowanie

Endpoint `POST /api/sets/{setId}/items` implementuje bezpieczne dodawanie elementów do zestawów z automatycznym przypisywaniem pozycji. Kluczowe aspekty:

- **Bezpieczeństwo:** Wielowarstwowa weryfikacja (JWT + ownership + RLS)
- **Wydajność:** Optymalne zapytania z indeksami, 3 queries na request
- **Spójność:** Trigger automatycznie zarządza pozycjami
- **Niezawodność:** Obsługa wszystkich scenariuszy błędów
- **UX:** Zwraca pełną listę elementów po dodaniu
