# REST API Plan

## 1. Resources

- **Set** (`public.sets`): represents a user-owned dashboard configuration. Indexed by `user_id` for fast lookups; the unique index on `(user_id, btrim(name))` enforces per-user trimmed-name uniqueness with a 1–10 character limit.
- **SetItem** (`public.set_items`): links a set to a `stop_id`, tracks `position`, and prevents duplicate stops per set via the `(set_id, stop_id)` unique index. The `position >= 1` constraint and `MAX(position)+1` trigger define ordering behavior.
- **PublicStopSnapshot** (Edge/Proxy view): derived payload combining `set_items` with cached ZTM stop data to power dashboards and TV mode. Not a physical table, but built on the existing data plus the external API.

## 2. Endpoints

### Sets

- **GET /api/sets** ✅ IMPLEMENTED
  - Description: list authenticated user's sets (optionally paginated) along with metadata counts.
  - Query params:
    - `include_items` (boolean, default `false`)
  - Request body: _none_
  - Response: `{ sets: [{ id, name, item_count, created_at? }], total_count }`
  - Success: `200 OK`
  - Errors:
    - `401 Unauthorized` when JWT missing/invalid.
    - `403 Forbidden` if RLS blocks.

- **POST /api/sets** ✅ IMPLEMENTED
  - Description: create a new set for the authenticated user.
  - Body: `{ name: string }`
  - Response: `{ sets: [...] , created_set: { id, name } }`
  - Success: `201 Created`
  - Errors:
    - `400 Bad Request` for missing/invalid name (trimmed length must be 1‑10 characters).
    - `409 Conflict` when a trimmed name already exists for the user.
    - `400 Bad Request` with `MAX_SETS_PER_USER_EXCEEDED` when database trigger rejects insert after 6 sets.
    - `401 Unauthorized`
    - `500` on unexpected failure.

- **PATCH /api/sets/{setId}** ✅ IMPLEMENTED
  - Description: rename a set the owner controls.
  - URL Params: `setId` (UUID)
  - Body: `{ name: string }` (1-10 characters after trimming)
  - Response: `{ sets: [...], updated_set: { id, name } }`
  - Success: `200 OK`
  - Errors:
    - `400 Bad Request` for invalid input (bad UUID, invalid name length).
    - `401 Unauthorized` when authentication fails.
    - `404 Not Found` if set does not exist or doesn't belong to the user.
    - `409 Conflict` when trimmed name duplicates another set.
    - `500 Internal Server Error` for unexpected errors.

- **DELETE /api/sets/{setId}** ✅ IMPLEMENTED
  - Description: delete a set and its cascade items.
  - Response: `{ sets: [...], deleted_set_id: setId }`
  - Success: `204 No Content` (or `200` with payload)
  - Errors: `404` if not found/owned, `401/403`

### Set Items

- **GET /api/sets/{setId}/items** ✅ IMPLEMENTED
  - Description: list items in a set with metadata needed for dashboard/grid.
  - URL Params: `setId` (UUID)
  - Query params: _none_ (UI limits to 6 cards via DB trigger/constraints)
  - Response: `{ items: [{ id, set_id, stop_id, position, added_at? }], total_count }`
  - Success: `200 OK`
  - Errors:
    - `400 Bad Request` for invalid set ID format (not a valid UUID).
    - `401 Unauthorized` when authentication fails.
    - `404 Not Found` if set does not exist or doesn't belong to the user.
    - `500 Internal Server Error` for unexpected errors.

- **POST /api/sets/{setId}/items** ✅ IMPLEMENTED
  - Description: add a new stop card to the set; DB trigger auto-assigns positive `position`.
  - URL Params: `setId` (UUID)
  - Body: `{ stop_id: integer }`
  - Response: `{ items: [...], created_item: { id, stop_id, position } }`
  - Success: `201 Created`
  - Errors:
    - `400 Bad Request` for invalid set ID format or when `stop_id` missing or invalid.
    - `401 Unauthorized` when authentication fails.
    - `404 Not Found` if set does not exist or doesn't belong to the user.
    - `409 Conflict` if `stop_id` already exists in the set.
    - `400 Bad Request` with `MAX_ITEMS_PER_SET_EXCEEDED` when trigger rejects insert after 6 items.
    - `500 Internal Server Error` for unexpected errors.

- **DELETE /api/sets/{setId}/items/{itemId}**
  - Description: remove an item from the set.
  - URL Params: `setId` (UUID), `itemId` (UUID)
  - Response: `{ items: [...], deleted_item_id: itemId }`
  - Success: `200 OK`
  - Errors:
    - `400 Bad Request` for invalid set ID or item ID format.
    - `401 Unauthorized` when authentication fails.
    - `404 Not Found` if set or item does not exist or doesn't belong to the user.
    - `500 Internal Server Error` for unexpected errors.

## 3. Authentication and Authorization

- Mechanism: Supabase Auth (JWT in `Authorization: Bearer <token>` header). Use Supabase edge policy hooks to enforce owner-only access (`user_id = auth.uid()`).
- RLS policies defined on `sets` and `set_items` (per db schema) ensure every endpoint automatically filters by owner, preventing horizontal privilege escalation.
- Public endpoints for TV mode bypass auth but enforce rate limits and cache freshness checks to avoid abuse.

## 4. Validation and Business Logic

- **Sets**
  - Validate `name` is present after trimming, length 1–10 characters (matches `CHECK (char_length(btrim(name)) > 0)` & `<= 10`).
  - Enforce unique trimmed names per user before insert/update to avoid DB conflicts; handle `sets_user_id_btrim_name_uniq`.
  - Enforce maximum 6 sets per user; bubble up `MAX_SETS_PER_USER_EXCEEDED` trigger error as `400/409`.
  - Leverage DB `gen_random_uuid()` default for `id`.

- **SetItems**
  - Validate `stop_id` integer and not null.
  - Check duplicates client-side before request but rely on unique `(set_id, stop_id)` to reject duplicates; surface `SET_ITEM_ALREADY_EXISTS` style message.
  - Respect `MAX_ITEMS_PER_SET_EXCEEDED` trigger; surface as `400` with friendly text.
  - No client-side `position` — DB assigns via `MAX(position)+1` logic (handles holes).

- **Public Data**
  - Cache stop/arrival data in Edge function layer to satisfy auto-refresh (every 60 seconds) while respecting upstream API limits. Provide `refreshed_at` timestamp and implement retry/backoff (PRD 36-42) by returning `status` plus optional `retry_after`.
  - TV endpoint must omit auth, include readable clock value, and expose only necessary read-only info.

- **Security & Performance**
  - Rate limit public endpoints (`/api/public/...`) to prevent abuse; return `429` after threshold.
  - Automate retries/backoff client-side via `retry_after` hints while preserving overall throughput.
  - All data mutations go through Supabase API/Edge functions to reuse RLS and triggers.
