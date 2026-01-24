# API Endpoint Implementation Plan: DELETE /api/sets/{setId}

## 1. Przegląd punktu końcowego

Endpoint `DELETE /api/sets/{setId}` służy do permanentnego usuwania zestawu przystanków wraz z wszystkimi powiązanymi elementami. Operacja wykorzystuje mechanizm cascade delete zdefiniowany w bazie danych. Po pomyślnym usunięciu zwraca zaktualizowaną listę pozostałych zestawów użytkownika.

**Główne funkcjonalności:**

- Permanentne usuwanie zestawu użytkownika
- Automatyczne usuwanie powiązanych set_items (CASCADE)
- Weryfikacja własności zasobu przed usunięciem
- Zwracanie zaktualizowanej listy pozostałych zestawów

**Business rules:**

- Użytkownik może usuwać tylko swoje zestawy
- Usunięcie zestawu automatycznie usuwa wszystkie jego elementy
- Operacja jest destrukcyjna i nieodwracalna

---

## 2. Szczegóły żądania

### Metoda HTTP

`DELETE`

### Struktura URL

```
DELETE /api/sets/{setId}
```

### Parametry URL

**Wymagane:**

- `setId` (UUID) - Identyfikator zestawu do usunięcia

### Query Parameters

Brak

### Request Headers

```
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

### Request Body

Brak (operacja DELETE nie wymaga body)

---

## 3. Wykorzystywane typy

### Command Model (Input)

Brak (tylko parametr URL)

### Response Types (Output)

```typescript
// z src/types.ts
export interface DeleteSetResponse {
  sets: SetDTO[];
  deleted_set_id: string;
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
    }
  ],
  "deleted_set_id": "deleted-uuid"
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
1. Client → DELETE /api/sets/{setId}
   ↓
2. API Route Handler
   ├─ 2a. Walidacja setId (UUID format)
   ├─ 2b. Uwierzytelnienie (getUserId)
   ↓
3. Service Layer: deleteSet(supabase, userId, setId)
   ├─ DELETE FROM sets WHERE id = setId AND user_id = userId
   ├─ CASCADE automatycznie usuwa set_items
   └─ Check rowCount (czy coś usunięto)
   ↓
4. Service Layer: getAllUserSetsWithCounts(supabase, userId)
   ├─ SELECT sets LEFT JOIN set_items
   └─ GROUP BY + COUNT dla item_count
   ↓
5. Format DeleteSetResponse
   ↓
6. Return 200 JSON
```

### Interakcje z bazą danych

#### 1. DELETE zestawu

```sql
DELETE FROM public.sets
WHERE id = $1 AND user_id = $2
RETURNING *;
```

- **Cel:** Usunięcie zestawu z weryfikacją własności
- **CASCADE:** Automatyczne usunięcie wszystkich set_items
- **Zwracany błąd:** `SET_NOT_FOUND` jeśli rowCount === 0

#### 2. SELECT wszystkich zestawów użytkownika

```sql
SELECT s.id, s.name, s.user_id, COUNT(si.id) as item_count
FROM public.sets s
LEFT JOIN public.set_items si ON s.id = si.set_id
WHERE s.user_id = $1
GROUP BY s.id
ORDER BY s.name;
```

- **Cel:** Pobranie zaktualizowanej listy pozostałych zestawów
- **Zwracany błąd:** Brak (może zwrócić pustą tablicę)

---

## 6. Względy bezpieczeństwa

### Uwierzytelnienie

- Token JWT w nagłówku Authorization
- `getUserId(locals.supabase)` weryfikuje sesję
- Brak/nieprawidłowy token → `401 Unauthorized`

### Autoryzacja

- **Warstwa 1:** DELETE z warunkiem `AND user_id = userId`
- **Warstwa 2:** Row Level Security (RLS) na `public.sets`
- **Polityka:** `USING (user_id = auth.uid())`
- Zapobiega usuwaniu cudzych zestawów

### Walidacja danych wejściowych

- UUID validation dla setId (regex)
- Early return jeśli nieprawidłowy format

### Potencjalne zagrożenia

1. **UUID Enumeration Attack:**
   - Opis: Próba usunięcia zestawów innych użytkowników
   - Mitigacja: Warunek `AND user_id` + RLS + generyczny błąd 404

2. **Accidental Data Loss:**
   - Opis: Przypadkowe usunięcie zestawu
   - Mitigacja: Frontend powienien wymagać potwierdzenia

---

## 7. Obsługa błędów

### Tabela mapowania błędów

| Scenariusz          | Error Source           | HTTP Status | Error Code     | Error Message                  |
| ------------------- | ---------------------- | ----------- | -------------- | ------------------------------ |
| Nieprawidłowy setId | UUID validation        | 400         | INVALID_INPUT  | Invalid set ID format          |
| Brak tokenu JWT     | Middleware             | 401         | UNAUTHORIZED   | Authentication required        |
| Zestaw nie istnieje | deleteSet (rowCount=0) | 404         | SET_NOT_FOUND  | Set not found or access denied |
| Cudzy zestaw        | deleteSet (rowCount=0) | 404         | SET_NOT_FOUND  | Set not found or access denied |
| RLS rejection       | PostgreSQL (42501)     | 403         | FORBIDDEN      | Access denied                  |
| Nieoczekiwany błąd  | PostgreSQL             | 500         | INTERNAL_ERROR | An unexpected error occurred   |

### Strategia logowania

- **Błędy 500:** Pełne szczegóły (stack trace, query)
- **Błędy 404:** userId + setId (bez ujawniania czy istnieje)
- **Nie logować:** Tokenów, haseł, wrażliwych danych

---

## 8. Rozważania dotyczące wydajności

### Potencjalne wąskie gardła

1. **CASCADE DELETE**
   - **Problem:** Usuwanie powiązanych set_items
   - **Optymalizacja:** Obsługiwane przez PostgreSQL, bardzo szybkie
   - **Wpływ:** Max 6 items per set, negligible

2. **Dwa zapytania do bazy**
   - **Problem:** DELETE + SELECT jako osobne operacje
   - **Optymalizacja:** Akceptowalne dla MVP
   - **Wpływ:** Przy max 6 zestawach marginalny

### Strategie optymalizacji

- **Indeksy bazodanowe:** `sets_pkey`, `sets_user_id_idx`, `set_items_set_id_fkey`
- **CASCADE:** Automatyczne usuwanie przez FK constraint
- **Connection pooling:** Obsługiwane przez Supabase Client

### Monitoring

- **Metryki:** Query execution time, request latency
- **Alarmy:** p95 > 500ms, error rate > 5%
- **Tools:** Supabase Dashboard → Performance

---

## 9. Etapy wdrożenia

### Krok 1: Rozszerzenie Service Layer

**Plik:** `src/lib/services/sets.service.ts`

Dodać funkcję `deleteSet`:

```typescript
export async function deleteSet(supabase: SupabaseClient, userId: string, setId: string): Promise<void> {
  const { data, error } = await supabase.from("sets").delete().eq("id", setId).eq("user_id", userId).select().single();

  if (error || !data) {
    const notFoundError = new Error("SET_NOT_FOUND") as Error & { code: "SET_NOT_FOUND" };
    notFoundError.code = "SET_NOT_FOUND";
    throw notFoundError;
  }
}
```

### Krok 2: Implementacja handlera DELETE

**Plik:** `src/pages/api/sets/[setId].ts`

Implementować handler DELETE:

1. Walidacja setId (UUID)
2. Sprawdzenie uwierzytelnienia
3. Wywołanie service layer (deleteSet + getAllUserSetsWithCounts)
4. Zwrócenie odpowiedzi 200 lub błędu

### Krok 3: Walidacja implementacji

**3.1. Sprawdzenie linterów**

```bash
npm run lint
```

**3.2. Testowanie manualne**

- Test happy path: usunięcie zestawu
- Test walidacji: nieprawidłowy UUID
- Test 404: nieistniejący setId
- Test autoryzacji: próba usunięcia cudzego zestawu
- Test CASCADE: sprawdzenie czy set_items zostały usunięte

### Krok 4: Dokumentacja i finalizacja

**4.1. Aktualizacja dokumentacji API**

- Dodać endpoint do `.ai/api-plan.md`
- Udokumentować kody błędów
- Dodać ostrzeżenia o destrukcyjnym charakterze operacji

**4.2. Code review checklist**

- [ ] Endpoint zwraca 200 z poprawną strukturą
- [ ] Walidacja UUID działa poprawnie
- [ ] CASCADE delete działa (set_items usunięte)
- [ ] Wszystkie błędy są mapowane
- [ ] user_id zawsze z sesji
- [ ] Zgodność z wzorcami z innych endpointów

---

## Podsumowanie

Endpoint `DELETE /api/sets/{setId}` implementuje bezpieczne usuwanie zestawów z pełną walidacją i autoryzacją. Kluczowe aspekty:

- **Bezpieczeństwo:** Wielowarstwowa weryfikacja (JWT + ownership check + RLS)
- **Wydajność:** CASCADE delete obsługiwane przez PostgreSQL
- **Spójność:** Automatyczne usuwanie powiązanych danych
- **Niezawodność:** Obsługa wszystkich scenariuszy błędów
- **UX:** Zwraca zaktualizowaną listę pozostałych zestawów
