# API Endpoint Implementation Plan: GET /api/sets/{setId}/items

## 1. Przegląd punktu końcowego

Endpoint `GET /api/sets/{setId}/items` służy do pobierania listy elementów (przystanków ZTM) należących do określonego zestawu użytkownika. Elementy są zwracane posortowane według pola `position` (1-based, rosnąco).

**Główne funkcjonalności:**

- Pobieranie wszystkich elementów przypisanych do zestawu
- Elementy uporządkowane według pozycji
- Weryfikacja własności zestawu przez użytkownika
- Maksymalna liczba elementów: 6 (wymuszane przez trigger bazodanowy)

**Business rules:**

- Użytkownik może pobierać tylko elementy ze swoich zestawów
- Elementy są sortowane według position (rosnąco)
- Zestaw może być pusty (zwrócona pusta tablica)

---

## 2. Szczegóły żądania

### Metoda HTTP

`GET`

### Struktura URL

```
GET /api/sets/{setId}/items
```

### Parametry URL

**Wymagane:**

- `setId` (UUID) - Identyfikator zestawu

### Query Parameters

Brak

### Request Headers

```
Authorization: Bearer {JWT_TOKEN}
```

### Request Body

Brak (metoda GET nie przyjmuje body)

---

## 3. Wykorzystywane typy

### Command Model (Input)

Brak (tylko parametr URL)

### Response Types (Output)

```typescript
// z src/types.ts
export interface SetItemListResponse {
  items: SetItemDTO[];
  total_count: number;
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

### Sukces: 200 OK

**Status Code:** `200`

**Response Body:**

```json
{
  "items": [
    {
      "id": "uuid-1",
      "set_id": "set-uuid",
      "stop_id": 1001,
      "position": 1,
      "added_at": "2026-01-21T10:30:00Z"
    },
    {
      "id": "uuid-2",
      "set_id": "set-uuid",
      "stop_id": 1042,
      "position": 2
    }
  ],
  "total_count": 2
}
```

**Pusty zestaw:**

```json
{
  "items": [],
  "total_count": 0
}
```

### Błędy

#### 400 Bad Request

**Przyczyny:**

- Nieprawidłowy format setId (nie UUID)

**Response Body:**

```json
{
  "code": "INVALID_INPUT",
  "message": "Invalid set ID format"
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
1. Client → GET /api/sets/{setId}/items
   ↓
2. API Route Handler
   ├─ 2a. Walidacja setId (UUID format)
   ├─ 2b. Uwierzytelnienie (getUserId)
   ↓
3. Service Layer: verifySetOwnership(supabase, userId, setId)
   ├─ SELECT sets WHERE id = setId AND user_id = userId
   └─ Throw SET_NOT_FOUND jeśli nie znaleziono
   ↓
4. Service Layer: getAllSetItems(supabase, setId)
   ├─ SELECT set_items WHERE set_id = setId
   └─ ORDER BY position ASC
   ↓
5. Format SetItemListResponse
   ↓
6. Return 200 JSON
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

#### 2. SELECT wszystkich elementów zestawu

```sql
SELECT id, set_id, stop_id, position
FROM public.set_items
WHERE set_id = $1
ORDER BY position ASC;
```

- **Cel:** Pobranie wszystkich elementów z zestawu
- **Zwracany błąd:** Brak (może zwrócić pustą tablicę)

---

## 6. Względy bezpieczeństwa

### Uwierzytelnienie

- Token JWT w nagłówku Authorization
- `getUserId(locals.supabase)` weryfikuje sesję
- Brak/nieprawidłowy token → `401 Unauthorized`

### Autoryzacja

- **Warstwa 1:** Jawna weryfikacja własności zestawu (`verifySetOwnership`)
- **Warstwa 2:** Row Level Security (RLS) na `public.set_items` (przez FK do sets)
- Zapobiega dostępowi do elementów z cudzych zestawów

### Walidacja danych wejściowych

- UUID validation dla setId (regex)

### Potencjalne zagrożenia

1. **UUID Enumeration Attack:**
   - Opis: Próba pobrania elementów z cudzych zestawów
   - Mitigacja: verifySetOwnership + generyczny błąd 404

---

## 7. Obsługa błędów

### Tabela mapowania błędów

| Scenariusz          | Error Source       | HTTP Status | Error Code     | Error Message                  |
| ------------------- | ------------------ | ----------- | -------------- | ------------------------------ |
| Nieprawidłowy setId | UUID validation    | 400         | INVALID_INPUT  | Invalid set ID format          |
| Brak tokenu JWT     | Middleware         | 401         | UNAUTHORIZED   | Authentication required        |
| Zestaw nie istnieje | verifySetOwnership | 404         | SET_NOT_FOUND  | Set not found or access denied |
| Cudzy zestaw        | verifySetOwnership | 404         | SET_NOT_FOUND  | Set not found or access denied |
| Nieoczekiwany błąd  | PostgreSQL         | 500         | INTERNAL_ERROR | An unexpected error occurred   |

### Strategia logowania

- **Błędy 500:** Pełne szczegóły (stack trace, query)
- **Błędy 404:** userId + setId (bez ujawniania istnienia)
- **Success:** Liczba zwróconych elementów

---

## 8. Rozważania dotyczące wydajności

### Potencjalne wąskie gardła

1. **Dwa zapytania do bazy**
   - **Problem:** SELECT (verify) + SELECT (items)
   - **Optymalizacja:** Akceptowalne dla MVP
   - **Wpływ:** Max 6 elementów, negligible

### Strategie optymalizacji

- **Indeksy bazodanowe:** `sets_pkey`, `set_items_set_id_fkey`, `set_items_position_idx`
- **Caching:** Po stronie klienta (Svelte store)
- **Connection pooling:** Obsługiwane przez Supabase Client

### Monitoring

- **Metryki:** Query execution time, request latency
- **Alarmy:** p95 > 300ms, error rate > 2%

---

## 9. Etapy wdrożenia

### Krok 1: Service Layer (jeśli nie istnieje)

**Plik:** `src/lib/services/set-items.service.ts`

Funkcje powinny już istnieć:

- `verifySetOwnership(supabase, userId, setId)`
- `getAllSetItems(supabase, setId)`

### Krok 2: Implementacja handlera GET

**Plik:** `src/pages/api/sets/[setId]/items/index.ts`

Implementować handler GET:

1. Walidacja setId (UUID)
2. Sprawdzenie uwierzytelnienia
3. Wywołanie service layer
4. Zwrócenie odpowiedzi 200 lub błędu

### Krok 3: Walidacja implementacji

**3.1. Sprawdzenie linterów**

```bash
npm run lint
```

**3.2. Testowanie manualne**

- Test happy path: pobranie listy elementów
- Test pustego zestawu: zestaw bez elementów
- Test walidacji: nieprawidłowy UUID
- Test 404: nieistniejący setId
- Test autoryzacji: próba pobrania elementów z cudzego zestawu

### Krok 4: Dokumentacja i finalizacja

**4.1. Aktualizacja dokumentacji API**

- Dodać endpoint do `.ai/api-plan.md`

**4.2. Code review checklist**

- [ ] Endpoint zwraca 200 z poprawną strukturą
- [ ] Pusta tablica dla pustych zestawów
- [ ] Elementy sortowane według position
- [ ] Wszystkie błędy są mapowane
- [ ] user_id zawsze z sesji

---

## Podsumowanie

Endpoint `GET /api/sets/{setId}/items` implementuje bezpieczne pobieranie listy elementów zestawu. Kluczowe aspekty:

- **Bezpieczeństwo:** JWT + ownership verification + RLS
- **Wydajność:** Optymalne zapytania z indeksami, 2 queries na request
- **Spójność:** Zgodność z wzorcami projektu
- **Niezawodność:** Zawsze zwraca dane (może być pusta tablica)
- **UX:** Elementy posortowane według pozycji
