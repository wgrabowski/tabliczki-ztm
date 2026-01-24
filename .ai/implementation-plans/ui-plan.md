# Architektura UI dla Tabliczki ZTM (MVP)

## 1. Przegląd struktury UI

Aplikacja dzieli interfejs na trzy czytelne „strefy” zgodne z routingiem MVP:

- **Strefa uwierzytelnienia**: `/login` (jedyny widok bez globalnego nagłówka).
- **Strefa aplikacji (po zalogowaniu)**: `/dashboard`, `/dashboard/{setId}`, `/account` (wspólny UI shell z nagłówkiem).
- **Strefa publiczna (TV)**: `/tv/{stopId}` (publiczny widok z nagłówkiem, bez elementów zależnych od konta).

Fundamentem jest **wspólny layout z nagłówkiem**, który:

- Jest widoczny w każdym widoku poza `/login`.
- Zawiera stałe elementy po prawej: **zegar** oraz **przełącznik motywu** (system/jasny/ciemny).
- Po lewej ma **pojedynczy slot kontekstowy**, wypełniany per widok (zależnie od routingu).

Założenia kluczowe dla UX i spójności:

- **Dashboard łączy monitoring i zarządzanie** (CRUD zestawów w jednym miejscu).
- **Minimalizm technologiczny**: preferowane są komponenty oparte o ostylowane, natywne elementy HTML (`<dialog>`, `<form>`, `<progress>`) oraz prosty CSS Grid.
- **Minimalistyczny interfejs**: skromna paleta kolorów, czcionka Departure Mono.
- **Brak store**: dane pobierane w kontenerach per route i przekazywane w dół przez **jawny props drilling**.
- **Stany globalne** (toasty, globalny preloader, overlay offline) są spójne między widokami.
- **Bezpieczeństwo**: guardy po stronie serwera (Astro) + jednoznaczna obsługa `401` (redirect do `/login`).

## 2. Lista widoków

Poniżej: widoki wymagane przez PRD + doprecyzowania z sesji planowania, wraz z mapowaniem na API, kluczowymi informacjami i elementami UI.

### 2.1 Login

- **Nazwa widoku**: Logowanie/Rejestracja
- **Ścieżka widoku**: `/login`
- **Główny cel**: Umożliwić wejście do aplikacji poprzez e-mail/hasło i przejść do `/dashboard`.
- **Kluczowe informacje do wyświetlenia**:
  - Formularz e-mail/hasło (dla logowania i rejestracji w MVP).
  - Komunikaty błędów (jako toasty i/lub przy polach – zależnie od typu błędu).
  - Informacja o braku sesji / wygaśniętej sesji (jeśli redirect nastąpił z powodu `401`).
- **Kluczowe komponenty widoku**:
  - `AuthForm` (email, password, submit; przełącznik trybu: logowanie/rejestracja).
  - `ToastStack` (globalny, ale widoczny też na loginie).
  - (Opcjonalnie) `AuthBranding` (nagłówek strony/krótki opis).
- **UX, dostępność i względy bezpieczeństwa**:
  - **Dostępność**: etykiety `<label>`, poprawne `autocomplete`, czytelne błędy (toasty bez auto-dismiss dla błędów).
  - **Bezpieczeństwo**: brak wrażliwych danych w URL; po sukcesie redirect do `/dashboard`.
  - **Przypadki brzegowe**: `401`/`403`/błędy sieci → toast; po zalogowaniu sesja jest „zapamiętana” (Supabase).
- **Powiązane wymagania / historyjki**: US-001.

### 2.2 Dashboard (lista + zarządzanie zestawami)

- **Nazwa widoku**: Dashboard — lista zestawów
- **Ścieżka widoku**: `/dashboard`
- **Główny cel**: Pokazać listę zestawów użytkownika i umożliwić CRUD zestawów w jednym miejscu.
- **Kluczowe informacje do wyświetlenia**:
  - Lista zestawów (nazwa, liczba elementów).
  - Stan limitu: maks. **6 zestawów** na użytkownika.
  - Szybki dostęp do konta.
- **Kluczowe komponenty widoku**:
  - Nagłówek (slot lewy): `AccountButton`.
  - `DashboardGrid` (grid przyjmujący dzieci; tutaj: karty zestawów).
  - `SetCard`:
    - Nazwa zestawu + mini-form do edycji (input + submit + reset) z loaderem lokalnym podczas PATCH.
    - Akcja usunięcia (z potwierdzeniem).
    - Akcja wejścia do `/dashboard/{setId}`.
  - `CreateSet` (duży przycisk otwierający `<dialog>` + `<form>`), widoczny tylko jeśli liczba zestawów < 6.
  - `GlobalPreloader` (aktywny przy POST/DELETE).
  - `ToastStack`.
- **UX, dostępność i względy bezpieczeństwa**:
  - **Walidacja nazwy**: natywna walidacja HTML (`maxlength=10`, `pattern` blokujący puste/whitespace-only), blokowanie submit przez przeglądarkę z komunikatem przy polu.
  - **Loading**:
    - PATCH nazwy blokuje tylko daną kartę.
    - POST/DELETE pokazuje globalny preloader (na całą stronę).
  - **Bezpieczeństwo**: widok chroniony (guard SSR); `401` z API → redirect do `/login`.
  - **Przypadki brzegowe**: `MAX_SETS_PER_USER_EXCEEDED`, konflikty nazw (`409`) → toast z komunikatem z API.
- **Mapowanie na API**:
  - `GET /api/sets` (pobranie listy).
  - `POST /api/sets` (tworzenie).
  - `PATCH /api/sets/{setId}` (zmiana nazwy).
  - `DELETE /api/sets/{setId}` (usuwanie).
- **Powiązane wymagania / historyjki**: US-002, US-003 (w MVP inline na dashboardzie), US-008.

### 2.3 Dashboard (pojedynczy zestaw)

- **Nazwa widoku**: Dashboard — zestaw
- **Ścieżka widoku**: `/dashboard/{setId}`
- **Główny cel**: Monitorować odjazdy dla maks. 6 przystanków w ramach wybranego zestawu, z cyklicznym odświeżaniem oraz możliwością dodania/usunięcia kart.
- **Kluczowe informacje do wyświetlenia**:
  - Wybrany zestaw i jego elementy (karty przystanków).
  - Dane odjazdów: numer linii, kierunek, czas (względny/bezwzględny), ikony udogodnień (rower/wózek), komunikaty specjalne (ticker).
  - Globalny pasek odliczania do odświeżenia + stan pobierania.
  - Stan limitu: maks. **6 elementów** w zestawie.
- **Kluczowe komponenty widoku**:
  - Nagłówek (slot lewy): `AccountButton` + `SetSelect` (zsynchronizowany z `setId` z URL) + `BackToDashboardButton`.
  - `RefreshProgressBar` (oparty o `<progress>`):
    - Tryb determinate podczas odliczania.
    - Tryb indeterminate podczas fetch.
  - `DashboardGrid` (CSS Grid, auto-fill; tutaj: karty przystanków).
  - `StopCard` (karta tablicy):
    - Nagłówek karty (nazwa/etykieta przystanku + ikona TV + ikona usunięcia).
    - Lista odjazdów (pierwsze 6 widoczne, reszta przez scroll).
    - `Ticker` dla komunikatów specjalnych (marquee).
    - Stan błędu per karta (po eskalacji 3 błędów odświeżania globalnego).
  - `AddStopDialog` (`<dialog>`):
    - Wyszukiwarka z autouzupełnianiem (w wersji minimalnej: `input type="search"` połączone z `datalist`).
    - Wynik minimalnie: `stopShortName + stopCode`.
  - `ConfirmDialog` dla usuwania karty (systemowy lub `<dialog>`).
  - `GlobalPreloader` (POST/DELETE elementów).
  - `ToastStack`.
- **UX, dostępność i względy bezpieczeństwa**:
  - **Guard SSR**: widok chroniony; dodatkowo sprawdzenie istnienia seta; jeśli brak → przekierowanie na wspólną stronę błędu.
  - **Dodawanie**: przy 6 kartach przycisk dodawania ukryty (na podstawie danych z API o liczbie kart).
  - **Odświeżanie**: co 60s, **bez retry** (decyzja sesji; zastępuje PRD-owy retry), z eskalacją błędów:
    - 1 błąd → warning przy ostatnich danych.
    - 2 błędy → mocniejszy warning.
    - 3 błędy → duży błąd na kaflach i zatrzymanie cyklu; zamiast paska pojawia się „Spróbuj ponownie” (twardy `reload`).
  - **Loading**:
    - Globalny preloader dla POST/DELETE nie blokuje cyklicznego odświeżania danych.
  - **Dostępność**: przyciski-ikony mają `title`; dialogi z poprawnym focusem i zamykaniem; scroll w karcie dostępny klawiaturą.
- **Mapowanie na API**:
  - Konfiguracja zestawu:
    - `GET /api/sets/{setId}/items`
    - `POST /api/sets/{setId}/items`
    - `DELETE /api/sets/{setId}/items/{itemId}`
  - Dane ZTM (proxy aplikacji):
    - `GET /api/ztm/stops` (cache w pamięci per sesja, odświeżenie cache przy starcie).
    - `GET /api/ztm/sets/{setId}/departures` (jeden request per cykl, dane dla wszystkich kart).
    - (Opcjonalnie wspierające) `GET /api/ztm/sets/{setId}/stops` (jeśli UI potrzebuje uzupełnienia metadanych przystanków dla kart).
- **Powiązane wymagania / historyjki**: US-004, US-005, US-006, US-008, US-009, US-010, US-012.

### 2.4 Konto

- **Nazwa widoku**: Konto
- **Ścieżka widoku**: `/account`
- **Główny cel**: Umożliwić zarządzanie kontem: wylogowanie lub usunięcie konta (i danych).
- **Kluczowe informacje do wyświetlenia**:
  - Informacje o zalogowanym użytkowniku (np. e-mail).
  - Akcje: wylogowanie, usunięcie konta.
- **Kluczowe komponenty widoku**:
  - Nagłówek (slot lewy): `BackToDashboardButton`.
  - `AccountSummary`.
  - `DeleteAccountSection` z wyraźnym ostrzeżeniem i potwierdzeniem.
  - `GlobalPreloader` podczas operacji konta (np. delete).
  - `ToastStack`.
- **UX, dostępność i względy bezpieczeństwa**:
  - **Bezpieczeństwo**: widok chroniony (guard SSR); `401` → `/login`.
  - **Dostępność**: ostrzeżenia i potwierdzenia czytelne, z poprawnym fokusem.
  - **Przypadki brzegowe**: błąd usunięcia konta → toast; po usunięciu konta powrót do `/login`.
- **Mapowanie na API**:
  - Autoryzacja realizowana przez Supabase Auth (operacje sesji).
  - Usunięcie konta: operacja backendowa (zgodnie z PRD: kasuje zestawy w DB) — UI zakłada endpoint/akcję serwera wspierającą tę funkcję.
- **Powiązane wymagania / historyjki**: US-011.

### 2.5 TV (publiczny widok przystanku)

- **Nazwa widoku**: TV — tablica przystankowa
- **Ścieżka widoku**: `/tv/{stopId}`
- **Główny cel**: Publicznie wyświetlać czytelną tablicę dla pojedynczego przystanku (wysoka czytelność, długi czas działania).
- **Kluczowe informacje do wyświetlenia**:
  - Duża nazwa przystanku.
  - Zegar (HH:mm).
  - Lista odjazdów (czytelna typografia, duże odstępy).
  - Stan błędu w jednym ekranie (bez zmiany routingu) + CTA do odświeżenia.
- **Kluczowe komponenty widoku**:
  - Nagłówek: zegar + `ThemeToggle` (slot lewy pusty).
  - `TvDeparturesList` (duża typografia).
  - `TvErrorScreen` (gdy brak danych / błąd).
- **UX, dostępność i względy bezpieczeństwa**:
  - **Publiczny dostęp**: brak logowania.
  - **Interakcje**: minimalne, ale dopuszczone (decyzja sesji: PRD-owe „brak elementów interakcyjnych” uznane za nieaktualne).
  - **Przypadki brzegowe**: brak przystanku / błąd danych → jeden ekran błędu z zachętą do `reload`.
  - **Offline**: brak osobnej obsługi offline (zgodnie z notatkami) — traktowane jak błąd + reload.
- **Mapowanie na API**:
  - `GET /api/ztm/departures?stopId={stopId}` (proxy do ZTM departures).
  - (Opcjonalnie) `GET /api/ztm/stops` lub inny mechanizm do mapowania `stopId → nazwa` (jeśli nie zwracana z departures).
- **Powiązane wymagania / historyjki**: US-007.

### 2.6 Wspólna strona błędu (app)

- **Nazwa widoku**: Błąd aplikacji
- **Ścieżka widoku**: wspólna strona błędu (np. `/error`) — używana przez redirecty z guardów i błędy inne niż `401`
- **Główny cel**: Zapewnić jeden spójny ekran dla błędów nienależących do `401`, z prostą ścieżką powrotu.
- **Kluczowe informacje do wyświetlenia**:
  - Przyjazny opis problemu (tekst ogólny) + ewentualnie identyfikator błędu.
  - CTA: „Wróć do dashboardu”.
- **Kluczowe komponenty widoku**:
  - Nagłówek (slot lewy): `BackToDashboardButton` (lub pusty, zależnie od kontekstu).
  - `ErrorMessage`.
  - `PrimaryCTAButton`.
- **UX, dostępność i względy bezpieczeństwa**:
  - **Bezpieczeństwo**: jeśli źródłem jest `401`, nie używać tej strony — zawsze redirect do `/login`.
  - **Dostępność**: komunikat w `role="alert"` lub analogiczny, czytelny kontrast.
- **Powiązane wymagania / historyjki**: US-012 (globalna obsługa błędów).

### 2.7 Overlay offline (app na mobile / PWA)

- **Nazwa widoku**: Offline overlay
- **Ścieżka widoku**: stan globalny (nie route)
- **Główny cel**: Zablokować dostęp do wszystkich widoków aplikacji na mobile/PWA przy braku internetu.
- **Kluczowe informacje do wyświetlenia**:
  - Informacja „Brak połączenia”.
  - Automatyczne przełączanie online/offline (bez dodatkowych akcji użytkownika).
- **Kluczowe komponenty widoku**:
  - `OfflineOverlay` (pełnoekranowy).
- **UX, dostępność i względy bezpieczeństwa**:
  - **Dostępność**: czytelny komunikat, brak pułapki fokusowej.
  - **Zachowanie**: overlay znika automatycznie po odzyskaniu połączenia.
- **Powiązane wymagania / historyjki**: (doprecyzowanie z sesji; PRD w granicach mówi „brak offline”, ale UI przewiduje blokadę widoków w offline na mobile/PWA).

## 3. Mapa podróży użytkownika

### 3.1 Główny przypadek użycia (MVP): skonfigurowanie i monitorowanie zestawu

1. **Wejście do aplikacji**
   - Użytkownik wchodzi na `/login` (lub zostaje przekierowany na `/login` po `401`).
2. **Logowanie/Rejestracja**
   - Wysyła formularz.
   - Po sukcesie: redirect do `/dashboard`.
3. **Utworzenie zestawu**
   - Na `/dashboard` wybiera „Dodaj zestaw” (dialog).
   - Wpisuje nazwę (1–10 znaków, walidacja HTML).
   - Po sukcesie: nowy zestaw pojawia się na liście.
4. **Wejście do widoku zestawu**
   - Klik w kartę zestawu → `/dashboard/{setId}`.
   - Guard SSR weryfikuje istnienie i własność seta; w razie braku → wspólny błąd.
5. **Dodanie przystanków do zestawu**
   - Klik „Dodaj tablicę” → dialog wyszukiwania.
   - Autouzupełnianie (cache `stops` per sesja) → wybór wyniku.
   - `POST /api/sets/{setId}/items` → karta pojawia się w gridzie.
   - Po 6 kartach przycisk dodawania znika.
6. **Monitorowanie odjazdów**
   - Co 60s wykonywany jest jeden request departures dla całego zestawu.
   - Pasek postępu odlicza czas i sygnalizuje fetch.
   - Na kartach widoczne: odjazdy, ticker, ikony udogodnień, scroll.
7. **Reakcja na błędy odświeżania**
   - 1–2 błędy: ostrzeżenia przy danych.
   - 3 błędy: zatrzymanie cyklu + CTA „Spróbuj ponownie” (hard reload).

### 3.2 Przypadek użycia: TV dla przystanku

1. Użytkownik na `/dashboard/{setId}` klika ikonę TV na karcie.
2. Otwiera się nowe okno/karta: `/tv/{stopId}`.
3. Widok TV pobiera dane i cyklicznie je odświeża (w granicach MVP).
4. W razie błędu: jeden ekran błędu z CTA „Odśwież”.

### 3.3 Przypadek użycia: zarządzanie kontem

1. Z `/dashboard` użytkownik przechodzi do `/account` (przycisk w nagłówku).
2. Może się wylogować lub usunąć konto (z potwierdzeniem).
3. Po usunięciu konta: powrót do `/login`.

## 4. Układ i struktura nawigacji

### 4.1 Struktura tras (routing MVP)

- `/login` — niezalogowany.
- `/dashboard` — lista zestawów + CRUD zestawów.
- `/dashboard/{setId}` — pojedynczy zestaw, grid kart.
- `/account` — konto.
- `/tv/{stopId}` — publiczny TV.

### 4.2 Nagłówek (UI shell) i slot kontekstowy

- **Widoczność**: wszędzie poza `/login`.
- **Prawa strona (stała)**: zegar + theme toggle (system/jasny/ciemny).
- **Lewa strona (slot zależny od widoku)**:
  - `/dashboard` → `AccountButton`
  - `/dashboard/{setId}` → `AccountButton` + `SetSelect` + przycisk do `/dashboard`
  - `/account` → przycisk do `/dashboard`
  - `/tv/{stopId}` → pusty

### 4.3 Nawigacja „w głąb” (dashboard → set)

- Wejście do zestawu jest przez wybór karty na `/dashboard`.
- Przełączanie zestawów w `/dashboard/{setId}` odbywa się przez `SetSelect`, który aktualizuje URL (z zachowaniem guardów SSR).

### 4.4 Zasady przekierowań i bezpieczeństwa

- `401` z dowolnego API → zawsze redirect do `/login`.
- `/dashboard*` i `/account` chronione guardem SSR.
- `/dashboard/{setId}` dodatkowo: weryfikacja istnienia seta; brak → wspólna strona błędu.

## 5. Kluczowe komponenty

Komponenty przekrojowe (używane w wielu widokach) oraz ich rola w architekturze:

- **AppLayout/HeaderShell**: wspólny layout z nagłówkiem, prawą stroną (zegar, `ThemeToggle`) i lewym slotem kontekstowym.
- **Clock**: aktualny czas (również w TV), spójne źródło czasu dla UI.
- **ThemeToggle**: system/jasny/ciemny; wybór nie jest zapamiętywany (zgodnie z PRD). Motywy jasny/ciemny wspierane przez CSS `color-scheme` oraz dobór wartości z użyciem `light-dark()`.
- **ToastStack**: jednolity kanał komunikatów (błędy jako persistent; sukces/info auto-dismiss ~1s; wiele toastów naraz, nowe niżej; treści z API).
- **GlobalPreloader**: pełnoekranowy preloader dla operacji POST/DELETE (zestawy i elementy), bez zatrzymywania cyklicznego odświeżania danych.
- **ConfirmDialog**: potwierdzenia usuwania (zestawów i kart), zgodne z WCAG (fokus, zamykanie).
- **DashboardGrid**: wspólny komponent siatki (CSS Grid) przyjmujący dzieci; wykorzystywany zarówno dla kart zestawów (`SetCard`), jak i kart przystanków (`StopCard`).
- **SetCard**: karta zestawu na `/dashboard` (w tym lokalny loader dla PATCH).
- **SetSelect**: przełączanie zestawów, zsynchronizowane z URL.
- **RefreshProgressBar**: globalny pasek odświeżania oparty o `<progress>` (determinate/indeterminate), z logiką resetu cyklu po zakończeniu requestu.
- **StopCard**: główna karta monitoringu (odjazdy, ticker, ikony, scroll, akcje: usuń/TV).
- **AddStopDialog + StopSearchAutocomplete**: wyszukiwarka w `<dialog>` z cache `stops` per sesja; minimalny wynik: `stopShortName + stopCode`.
- **ErrorPage (app)**: wspólna strona błędu dla przypadków innych niż `401`, z CTA do dashboardu.
- **TvScreen/TvErrorScreen**: TV view i jego pojedynczy ekran błędu (bez routingu).
- **OfflineOverlay**: pełnoekranowa blokada UI w offline (mobile/PWA), automatycznie włącza/wyłącza się.

---

## 6. Podstawowe komponenty UI (MVP, bez biblioteki UI)

Założenie: aplikacja **nie korzysta z żadnej biblioteki UI**, ale posiada przewidziany design. Dla spójności i dostępności natywne elementy (`button`, `input`, `select`, `dialog`, `progress`) są używane poprzez bazowe komponenty (cienkie wrappery / ustandaryzowane wzorce).

### 6.1 Globalne style (tylko typografia i kolory)

- **Typografia**: skala i hierarchia (z `clamp()`), czcionka „Departure Mono” (jako asset aplikacji).
- **Kolory**: skromna paleta + tokeny stanów (info/success/warning/error), kontrast pod czytelność.
- **Motywy**: jasny/ciemny/systemowy oparte o `color-scheme` i `light-dark()` (bez zapamiętywania wyboru).
- **Ikony**: Material Symbols (import z Google Fonts).

### 6.2 Komponenty bazowe (ostylowane, oparte o natywne elementy)

- **`Button`** (bazuje na `<button>`): warianty (primary/secondary/danger/ghost), stany (disabled/loading).
- **`IconButton`** (bazuje na `<button>`): akcje ikonowe (wymagany `title`).
- **`TextInput`** (bazuje na `<input>`): `text/email/password/search` + stany walidacji.
- **`ResetInput`** (bazuje na `<input type="reset">`): reset w mini-formularzach (np. edycja nazwy zestawu).
- **`Select`** (bazuje na `<select>`): m.in. `SetSelect`.
- **`Dialog`** (bazuje na `<dialog>`): wspólny układ + focus management; używany przez `AddStopDialog`, `CreateSet`, `ConfirmDialog`.
- **`ProgressBar`** (bazuje na `<progress>`): dla `RefreshProgressBar` (determinate/indeterminate).
- **`Toast` / `ToastStack`**: standard komunikatów (TTL wg zasad z planu).
- **`PageOverlay`**: baza dla `GlobalPreloader` i `OfflineOverlay`.
- **`Card` (styl)**: wspólny wygląd kontenerów kart (`SetCard`, `StopCard`).

## 7. Mapowanie wymagań (PRD) i historyjek użytkownika do architektury UI (skrót)

- **Uwierzytelnianie (US-001)** → `/login`, guardy SSR, redirect `401 → /login`, toasty błędów.
- **Zestawy: create/rename/delete (US-002, US-003, US-008)** → `/dashboard` (dialog tworzenia, inline rename, akcja delete z potwierdzeniem, limity 6).
- **Dodawanie przystanków (US-004)** → `/dashboard/{setId}` + `AddStopDialog` + cache `/api/ztm/stops`, limit 6 kart.
- **Monitoring i odświeżanie (US-005, US-012)** → `/dashboard/{setId}` + `RefreshProgressBar` + eskalacja błędów + „Spróbuj ponownie” (reload).
- **Przełączanie zestawów (US-006)** → `SetSelect` (zmiana URL, brak przeładowania pełnej strony w UX).
- **TV (US-007)** → `/tv/{stopId}` + duża typografia + publiczny dostęp + ekran błędu.
- **Komunikaty specjalne (US-009)** → `Ticker` na kartach.
- **Motyw (US-010)** → `ThemeToggle` w nagłówku (bez zapamiętywania).
- **Usunięcie konta (US-011)** → `/account` + potwierdzenie + efekt kaskadowy danych.
