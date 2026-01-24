## Schemat bazy danych (PostgreSQL / Supabase) — Tabliczki ZTM (MVP)

### 1) Lista tabel z ich kolumnami, typami danych i ograniczeniami

#### `public.users`
  managed by Supabase Auth

#### `public.sets`
- **Cel**: zestawy tablic (dashboard sets) przypisane do użytkownika.
- **Kolumny**
  - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
  - `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
  - `name text NOT NULL`
- **Ograniczenia**
  - **Walidacja nazwy**:
    - `CHECK (char_length(btrim(name)) > 0)`
    - `CHECK (char_length(btrim(name)) <= 10)`
  - **Unikalność nazwy per użytkownik (case-sensitive, ignoruje spacje brzegowe)**:
    - unikalny indeks na `(user_id, btrim(name))` (szczegóły w sekcji Indeksy)

#### `public.set_items`
- **Cel**: elementy zestawu (przypięte tablice), identyfikowane przez `stop_id`, z ustalaną raz kolejnością `position`.
- **Kolumny**
  - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
  - `set_id uuid NOT NULL REFERENCES public.sets(id) ON DELETE CASCADE`
  - `stop_id integer NOT NULL`
  - `position integer NOT NULL`
- **Ograniczenia**
  - **Brak duplikatów tablic w obrębie zestawu**:
    - unikalny indeks/constraint na `(set_id, stop_id)` (szczegóły w sekcji Indeksy)
  - **Pozycja dodatnia** (1-based):
    - `CHECK (position >= 1)`

---

### 2) Relacje między tabelami

- **`auth.users (1) -> (N) public.sets`**
  - FK: `public.sets.user_id -> auth.users.id`
  - Kasowanie: `ON DELETE CASCADE` (usunięcie konta usuwa zestawy)

- **`public.sets (1) -> (N) public.set_items`**
  - FK: `public.set_items.set_id -> public.sets.id`
  - Kasowanie: `ON DELETE CASCADE` (usunięcie zestawu usuwa elementy)

---

### 3) Indeksy

#### `public.sets`
- **Szybkie pobieranie zestawów użytkownika**
  - `CREATE INDEX sets_user_id_idx ON public.sets (user_id);`
- **Unikalność nazw per użytkownik, z ignorowaniem spacji brzegowych (case-sensitive)**
  - `CREATE UNIQUE INDEX sets_user_id_btrim_name_uniq ON public.sets (user_id, btrim(name));`

#### `public.set_items`
- **Szybkie pobieranie elementów zestawu**
  - `CREATE INDEX set_items_set_id_idx ON public.set_items (set_id);`
- **Sortowanie po pozycji w obrębie zestawu**
  - `CREATE INDEX set_items_set_id_position_idx ON public.set_items (set_id, position);`
- **Blokada duplikatów stopów w zestawie**
  - `CREATE UNIQUE INDEX set_items_set_id_stop_id_uniq ON public.set_items (set_id, stop_id);`

---

### 4) Zasady PostgreSQL (jeśli dotyczy)

Ta sekcja zawiera elementy kluczowe dla Supabase: rozszerzenie `pgcrypto`, włączenie RLS, polityki owner-only oraz triggery egzekwujące limity i nadawanie `position`.

#### Wymagane rozszerzenia
- `CREATE EXTENSION IF NOT EXISTS pgcrypto;`  
  (dla `gen_random_uuid()`)

#### RLS: `public.sets`
- `ALTER TABLE public.sets ENABLE ROW LEVEL SECURITY;`

Polityki (owner-only):
- **SELECT**
  - `USING (user_id = auth.uid())`
- **INSERT**
  - `WITH CHECK (user_id = auth.uid())`
- **UPDATE**
  - `USING (user_id = auth.uid())`
  - `WITH CHECK (user_id = auth.uid())`
- **DELETE**
  - `USING (user_id = auth.uid())`

#### RLS: `public.set_items`
- `ALTER TABLE public.set_items ENABLE ROW LEVEL SECURITY;`

Warunek własności przez zestaw:
- `EXISTS (SELECT 1 FROM public.sets s WHERE s.id = set_items.set_id AND s.user_id = auth.uid())`

Polityki (owner-only via set):
- **SELECT**
  - `USING (EXISTS (...))`
- **INSERT**
  - `WITH CHECK (EXISTS (...))`
- **UPDATE**
  - `USING (EXISTS (...))`
  - `WITH CHECK (EXISTS (...))`
- **DELETE**
  - `USING (EXISTS (...))`

#### Triggery: twarde limity i automatyczna `position`

**Stałe komunikaty błędów limitów (wymóg MVP)**
- dla zestawów: `MAX_SETS_PER_USER_EXCEEDED: limit=6`
- dla elementów: `MAX_ITEMS_PER_SET_EXCEEDED: limit=6`

1) **Limit 6 zestawów na użytkownika** — BEFORE INSERT na `public.sets`
- Jeśli liczba rekordów `public.sets` dla `NEW.user_id` >= 6 → `RAISE EXCEPTION 'MAX_SETS_PER_USER_EXCEEDED: limit=6';`

2) **Limit 6 elementów na zestaw** — BEFORE INSERT na `public.set_items`
- Jeśli liczba rekordów `public.set_items` dla `NEW.set_id` >= 6 → `RAISE EXCEPTION 'MAX_ITEMS_PER_SET_EXCEEDED: limit=6';`

3) **Nadawanie `position` w DB** — BEFORE INSERT na `public.set_items`
- Jeśli `NEW.position` jest NULL lub <= 0, DB ustawia:
  - `NEW.position := COALESCE((SELECT MAX(position) + 1 FROM public.set_items WHERE set_id = NEW.set_id), 1);`
- “Dziury” w `position` są dozwolone (bo używamy `MAX+1`, nie “pierwszej wolnej”).

4) **(Opcjonalnie, rekomendowane) Immutability `set_items`** — BEFORE UPDATE na `public.set_items`
- Zgodnie z założeniem “ustaw i zapomnij”:
  - blokuj zmiany `set_id`, `stop_id`, `position` (np. `RAISE EXCEPTION 'SET_ITEM_IMMUTABLE';`)
- Alternatywa: pozwól na UPDATE tylko w przyszłości, jeśli dodasz funkcję zmiany kolejności.

---

### 5) Wszelkie dodatkowe uwagi lub wyjaśnienia dotyczące decyzji projektowych

- Przechowujemy wyłącznie konfigurację użytkownika (zestawy + `stop_id`), bez cache przystanków/odjazdów.
- Brak `created_at/updated_at` w MVP (świadoma decyzja).
- Unikalność nazw zestawów jest **case-sensitive** i ignoruje spacje brzegowe przez unikalny indeks na `btrim(name)`.
- Limity 6/6 są egzekwowane w DB (triggery BEFORE INSERT), zgodnie z wymaganiem “twardo w bazie”.
- `stop_id` jest `integer NOT NULL` (zgodnie z decyzją z sesji).
