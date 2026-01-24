# API Endpoint Implementation Plan: GET /api/sets

## 1. Przegląd punktu końcowego

Endpoint `GET /api/sets` służy do pobierania listy wszystkich zestawów należących do uwierzytelnionego użytkownika. Każdy zestaw zawiera metadane, w tym liczbę przypisanych elementów (`item_count`).

**Główne funkcjonalności:**

- Pobieranie zestawów użytkownika z bazy danych
- Obliczanie liczby elementów dla każdego zestawu
- Zwracanie posortowanej listy zestawów wraz z total_count

**Business rules:**

- Użytkownik może mieć maksymalnie 6 zestawów
- Zestawy są sortowane alfabetycznie po nazwie
- RLS automatycznie filtruje zestawy do tych należących do użytkownika

---

## 2. Szczegóły żądania

### Metoda HTTP

`GET`

### Struktura URL

```
GET /api/sets
```

### Parametry URL

Brak

### Query Parameters

**Opcjonalne:**

- `include_items` (boolean, domyślnie `false`) - zarezerwowany na przyszłość

### Request Headers

```
Authorization: Bearer {JWT_TOKEN}
```

### Request Body

Brak (metoda GET nie przyjmuje body)

---

## 3. Wykorzystywane typy

### Command Model (Input)

Brak (tylko query parameters)

### Response Types (Output)

```typescript
// z src/types.ts
export interface SetListResponse {
  sets: SetDTO[];
  total_count: number;
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
      "item_count": 3,
      "created_at": "2026-01-21T10:30:00Z"
    },
    {
      "id": "uuid-2",
      "name": "Praca",
      "user_id": "user-uuid",
      "item_count": 5
    }
  ],
  "total_count": 2
}
```

### Błędy

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
1. Client → GET /api/sets
   ↓
2. Middleware weryfikuje JWT
   ↓
3. API Route Handler
   ├─ 3a. Uwierzytelnienie (getUserId)
   ↓
4. Service Layer: getAllUserSetsWithCounts(supabase, userId)
   ├─ SELECT sets LEFT JOIN set_items
   ├─ GROUP BY + COUNT dla item_count
   └─ ORDER BY name
   ↓
5. Format SetListResponse
   ↓
6. Return 200 JSON
```

### Interakcje z bazą danych

#### 1. SELECT wszystkich zestawów użytkownika

```sql
SELECT s.id, s.name, s.user_id, COUNT(si.id) as item_count
FROM public.sets s
LEFT JOIN public.set_items si ON s.id = si.set_id
WHERE s.user_id = $1
GROUP BY s.id
ORDER BY s.name;
```

- **Cel:** Pobranie wszystkich zestawów z licznikami elementów
- **RLS:** Automatycznie filtruje do user_id = auth.uid()
- **Zwracany błąd:** Brak (zawsze zwraca dane, może być pusta tablica)

---

## 6. Względy bezpieczeństwa

### Uwierzytelnienie

- Token JWT w nagłówku Authorization
- `getUserId(locals.supabase)` weryfikuje sesję
- Brak/nieprawidłowy token → `401 Unauthorized`

### Autoryzacja

- **Row Level Security (RLS):** `SELECT` policy z warunkiem `user_id = auth.uid()`
- Automatyczne filtrowanie wyników do zestawów użytkownika
- Użytkownik nie może zobaczyć cudzych zestawów

### Walidacja danych wejściowych

- Brak wymaganych parametrów do walidacji
- Opcjonalny `include_items` walidowany przez Zod (jeśli używany)

### Potencjalne zagrożenia

1. **Data Leakage:**
   - Opis: Przypadkowe ujawnienie cudzych zestawów
   - Mitigacja: RLS automatycznie filtruje wyniki

---

## 7. Obsługa błędów

### Tabela mapowania błędów

| Scenariusz            | Error Source | HTTP Status | Error Code     | Error Message                |
| --------------------- | ------------ | ----------- | -------------- | ---------------------------- |
| Brak tokenu JWT       | Middleware   | 401         | UNAUTHORIZED   | Authentication required      |
| Nieprawidłowy JWT     | getUser()    | 401         | UNAUTHORIZED   | Invalid or expired token     |
| Nieoczekiwany błąd DB | PostgreSQL   | 500         | INTERNAL_ERROR | An unexpected error occurred |

### Strategia logowania

- **Błędy 500:** Pełne szczegóły (stack trace, query)
- **Błędy 401:** Krótkie info (endpoint accessed)
- **Success:** Liczba zwróconych zestawów

---

## 8. Rozważania dotyczące wydajności

### Potencjalne wąskie gardła

1. **LEFT JOIN dla item_count**
   - **Problem:** Agregacja dla każdego zestawu
   - **Optymalizacja:** Indeksy na FK
   - **Wpływ:** Max 6 zestawów × 6 items = 36 rekordów, negligible

### Strategie optymalizacji

- **Indeksy bazodanowe:** `sets_user_id_idx`, `set_items_set_id_fkey`
- **Caching:** Po stronie klienta (Svelte store)
- **Connection pooling:** Obsługiwane przez Supabase Client

### Monitoring

- **Metryki:** Query execution time, request latency
- **Alarmy:** p95 > 300ms, error rate > 2%

---

## 9. Etapy wdrożenia

### Krok 1: Service Layer (jeśli nie istnieje)

**Plik:** `src/lib/services/sets.service.ts`

Funkcja powinna już istnieć: `getAllUserSetsWithCounts(supabase, userId)`

### Krok 2: Implementacja handlera GET

**Plik:** `src/pages/api/sets/index.ts`

Implementować handler GET:

1. Sprawdzenie uwierzytelnienia
2. Wywołanie service layer
3. Zwrócenie odpowiedzi 200 lub błędu

### Krok 3: Walidacja implementacji

**3.1. Sprawdzenie linterów**

```bash
npm run lint
```

**3.2. Testowanie manualne**

- Test happy path: pobranie listy zestawów
- Test pustej listy: nowy użytkownik bez zestawów
- Test autoryzacji: request bez tokenu

### Krok 4: Dokumentacja i finalizacja

**4.1. Aktualizacja dokumentacji API**

- Dodać endpoint do `.ai/api-plan.md`

**4.2. Code review checklist**

- [ ] Endpoint zwraca 200 z poprawną strukturą
- [ ] Pusta tablica dla użytkowników bez zestawów
- [ ] RLS filtruje poprawnie
- [ ] user_id zawsze z sesji

---

## Podsumowanie

Endpoint `GET /api/sets` implementuje bezpieczne pobieranie listy zestawów użytkownika. Kluczowe aspekty:

- **Bezpieczeństwo:** JWT + RLS automatycznie filtruje wyniki
- **Wydajność:** Jedna query z LEFT JOIN, optymalna dla małych zestawów danych
- **Spójność:** Zgodność z wzorcami projektu
- **Niezawodność:** Zawsze zwraca dane (może być pusta tablica)
