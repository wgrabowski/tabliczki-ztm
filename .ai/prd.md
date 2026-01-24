# Dokument wymagań produktu (PRD) - Tabliczki ZTM(MVP)

## 1. Przegląd produktu

Projekt Tabliczki ZTM(MVP) to aplikacja webowa służąca do śledzenia na żywo informacji z tablic przystankowych komunikacji miejskiej w Gdańsku (ZTM Gdańsk). Aplikacja agreguje dane z publicznego API projektu Otwarty Gdańsk, prezentując je w formie personalizowanych dashboardów. Użytkownicy mogą tworzyć własne zestawy tablic (np. Do pracy, Powrót do domu) i monitorować czasy odjazdów w czasie rzeczywistym.
Kluczową funckką jest śledzenie kilku tablic przystankowych jednocześnie.
Dodatkową funkcją jest tryb wysokiej czytelności (TV), przeznaczony do wyświetlania na monitorach stacjonarnych i telewizorach, co pozwala na bezobsługowe monitorowanie konkretnych przystanków.

## 2. Problem użytkownika

Głównym problemem jest utrudniony dostęp do szybkich i skonsolidowanych informacji o odjazdach z wielu przystanków jednocześnie. Pasażerowie często korzystają z różnych węzłów przesiadkowych i muszą sprawdzać każdą tablicę osobno w oficjalnych aplikacjach lub na fizycznych tablicach. Dodatkowo brakuje prostego, pasywnego rozwiązania, które pozwalałoby wyświetlić tablicę przystankową na ekranie telewizora lub tabletu w domu/biurze w sposób czytelny i niewymagający ciągłej interakcji.

## 3. Wymagania funkcjonalne

a. System uwierzytelniania:

- Rejestracja i logowanie wyłącznie za pomocą e-mail i hasła (bez weryfikacji mailowej w fazie MVP).
- Automatyczne zapamiętywanie sesji użytkownika.

b. Zarządzanie zestawami tablic:

- Tworzenie do 6 zestawów przystanków przez zalogowanego użytkownika.
- Nadawanie nazw zestawom (limit 10 znaków).
- Edycja nazw zestawów w osobnym widoku zarządzania.
- Usuwanie całych zestawów wraz z zawartością.

c. Dashboard i tablice:

- Prezentacja odjazdów w formie gridu kart (widgetów) - maksymalnie 6 tablic w jednym zestawie.
- Ukrywanie przycisku dodawania nowej tablicy po osiągnięciu limitu 6 elementów w gridzie.
- Wyszukiwarka przystanków z autouzupełnianiem uwzględniająca nazwę, numer słupka i kierunek.
- Wyświetlanie numeru linii, kierunku, czasu przyjazdu (względny/bezwzględny) oraz ikon udogodnień (rower, wózek).
- Wyświetlanie pierwszych 6 odjazdów na karcie z możliwością przewijania (scroll) w celu zobaczenia pozostałych.
- Obsługa komunikatów specjalnych (ticker) na górze karty widgetu.

d. Odświeżanie i dane:

- Automatyczne odświeżanie danych co 1 minutę.
- Wspólny wizualny pasek postępu odświeżania na górze ekranu, pod nagłówkiem aplikacji
- Mechanizm cichego ponowienia (retry) po 5 sekundach w przypadku błędu sieci.
- Wyświetlanie ikony błędu na karcie widgetu w przypadku trwałego problemu z pobraniem danych.

e. Tryb pełnoekranowy (TV):

- Dostępny przez unikalny URL zawierający identyfikator przystanku.
- Widok nie wymaga logowania do wyświetlania danych.
- Wysoka czytelność: duża nazwa przystanku, zegar HH:mm i lista odjazdów.

f. Interfejs i personalizacja:

- nagłówek aplikacji wyświetlający aktualny czas (zegar), przełącznik zestawu w trybie dashboard, linki do widoków:
  - edycji/zarządzania zestawami tablic
  - edycji konta użytkownika
- Przełącznik motywu: Jasny, Ciemny, Systemowy (domyślny).
- Responsywność (RWD) dostosowująca grid do wielkości ekranu.

## 4. Granice produktu

- Aplikacja nie wspiera trybu offline (wymagane stałe połączenie z API).
- Brak funkcji społecznościowych i udostępniania zestawów między użytkownikami.
- Brak powiadomień push o utrudnieniach.
- Brak mapy interaktywnej w wyszukiwarce przystanków.
- Brak możliwości ręcznej zmiany kolejności tablic w gridzie (tylko dodawanie i usuwanie).
- Brak zaawansowanego filtrowania linii na pojedynczej tablicy.

## 5. Historyjki użytkowników

ID: US-001
Tytuł: Uwierzytelnianie użytkownika
Opis: Jako użytkownik chcę zarejestrować się i zalogować do aplikacji za pomocą adresu e-mail, aby mieć dostęp do moich spersonalizowanych zestawów tablic.
Kryteria akceptacji:

- System umożliwia rejestrację i logowanie e-mail/hasło bez dodatkowej weryfikacji.
- Po poprawnym zalogowaniu użytkownik widzi swój Dashboard.

ID: US-002
Tytuł: Tworzenie nowego zestawu tablic
Opis: Jako zalogowany użytkownik chcę stworzyć nowy zestaw, aby pogrupować interesujące mnie przystanki (maksymalnie 6 zestawów).
Kryteria akceptacji:

- Widoczny przycisk Dodaj zestaw (jeśli liczba zestawów < 6).
- Możliwość wprowadzenia nazwy do 10 znaków.
- Nowy zestaw pojawia się w menu wyboru zestawów.

ID: US-003
Tytuł: Zmiana nazwy zestawu
Opis: Jako użytkownik chcę zmienić nazwę zestawu, aby lepiej odpowiadała jego przeznaczeniu.
Kryteria akceptacji:

- Edycja odbywa się w polu tekstowym w widoku zarządzania.
- Zmiana zapisuje się automatycznie po naciśnięciu Enter lub utracie fokusu.
- Obowiązuje limit 10 znaków.

ID: US-004
Tytuł: Wyszukiwanie i dodawanie przystanków
Opis: Jako użytkownik chcę wyszukać i dodać przystanek do mojego zestawu (maksymalnie 6 tablic).
Kryteria akceptacji:

- Autouzupełnianie pokazuje nazwę, numer słupka i kierunek.
- Wybrany przystanek pojawia się jako karta na końcu gridu.
- Przycisk dodawania nowej tablicy znika po osiągnięciu limitu 6 kart w zestawie.
- Karta zawiera dane o odjazdach pobrane z API.

ID: US-005
Tytuł: Monitorowanie odjazdów na Dashboardzie
Opis: Jako użytkownik chcę widzieć aktualne odjazdy dla wszystkich tablic w zestawie.
Kryteria akceptacji:

- Każda karta widgetu wyświetla co najmniej numer linii i czas dla pierwszych 6 odjazdów.
- Treść karty można przewijać (scroll), aby zobaczyć dalsze odjazdy.
- Widoczny jest pasek postępu odliczający 60 sekund do odświeżenia.
- Dane aktualizują się automatycznie dla wszystkich kart jednocześnie.

ID: US-006
Tytuł: Przełączanie zestawów
Opis: Jako użytkownik chcę szybko zmieniać widok między zestawami (np. rano/po południu).
Kryteria akceptacji:

- Lista rozwijana (Select) pozwala na wybór zestawu.
- Wybrany zestaw ładuje odpowiednie tablice bez przeładowania strony.

ID: US-007
Tytuł: Tryb TV dla pojedynczej tablicy
Opis: Jako użytkownik chcę otworzyć tablicę w trybie pełnoekranowym bez logowania.
Kryteria akceptacji:

- Ikona na karcie widgetu otwiera URL z identyfikatorem przystanku.
- Widok zawiera zegar HH:mm i powiększoną czcionkę odjazdów.
- Brak elementów interakcyjnych (widok pasywny).

ID: US-008
Tytuł: Usuwanie przystanków i zestawów
Opis: Jako użytkownik chcę usunąć niepotrzebny przystanek lub zestaw.
Kryteria akceptacji:

- Usunięcie wymaga potwierdzenia w systemowym dialogu lub modalu.
- Po usunięciu karta lub zestaw znika natychmiast z interfejsu.

ID: US-009
Tytuł: Wyświetlanie komunikatów specjalnych
Opis: Jako pasażer chcę wiedzieć o utrudnieniach na moim przystanku.
Kryteria akceptacji:

- Jeśli API zwraca wiadomości, na górze karty widgetu pojawia się przewijany pasek (marquee).
- Pasek znika automatycznie, gdy brak komunikatów w API.

ID: US-010
Tytuł: Zmiana motywu wizualnego
Opis: Jako użytkownik chcę dopasować wygląd aplikacji do moich preferencji.
Kryteria akceptacji:

- Przełącznik z opcjami Jasny/Ciemny/Systemowy.
- Motyw zmienia się natychmiast po wybraniu opcji.
- Wybór nie jest zapamiętywany

ID: US-011
Tytuł: Usuwanie konta
Opis: Jako użytkownik chcę trwale usunąć moje konto i dane.
Kryteria akceptacji:

- Opcja dostępna w widoku zarządzania kontem.
- Usunięcie konta kasuje wszystkie zestawy użytkownika w bazie danych.

ID: US-012
Tytuł: Obsługa błędów API
Opis: Jako użytkownik chcę wiedzieć, gdy wystąpił problem techniczny z danymi.
Kryteria akceptacji:

- Po nieudanej próbie i jednym cichym retry, na karcie pojawia się ikona błędu.
- Kolejne cykliczne odświeżenie próbuje samoczynnie przywrócić dane.

## 6. Metryki sukcesu

- Skuteczne logowanie użytkownika przy pierwszej próbie.
- Czas konfiguracji pierwszego zestawu (dodanie 1 zestawu i 1 przystanku) poniżej 30 sekund.
- Poprawne wyświetlanie danych na tablicy w trybie TV przez minimum 1 godzinę bez błędów sesji.
- Poprawne działanie automatycznego odświeżania danych na Dashboardzie przez minimum 30 minut.
- Wysoka czytelność trybu TV z odległości 3 metrów na standardowym ekranie 32 cale.
