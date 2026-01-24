# Stops

Lista przystanków ZTM w Gdańsku
URL: https://ckan.multimediagdansk.pl/dataset/c24aa637-3619-4dc2-a171-a23eec8f2172/resource/d3e96eb6-25ad-4d6c-8651-b1eb39155945/download/stopsingdansk.json

Zasób zawiera informacje o słupkach przystankowych wykorzystywanych w dniu bieżącym w sieci ZTM w Gdańsku. Zasób aktualizowany jest raz na dobę.

Zasób opiera się na bazie danych zawartych w zasobie Lista przystanków.

obiekt w formacie daty YYYY-MM-DD – wskazuje na datę, dla której przetrzymuje dane dotyczące zasobu słupków. Zawiera następujące pola:
lastUpdate – data aktualizacji danych z systemów źródłowych; data w formacie YYYY-MM-DD HH:MM:SS
stops - zasób obiektów przetrzymujących informacje o słupkach przystankowych; pojedynczy obiekt dotyczący słupka składa się z następujących pól:
stopId – identyfikator słupka przystankowego unikalny w skali Trójmiasta; wykorzystywany jako argument przy korzystaniu z zasobu Estymowane czasy przyjazdów na przystanek; liczba całkowita
stopCode – numer słupka przystankowego unikalny w ramach przystanku pochodzący z programu do układania rozkładu jazdy. Wartość dostępna jedynie dla słupków należących do ZTM w Gdańsku; liczba całkowita z dopełnieniem do dwóch cyfr
stopName – nazwa przystanku pochodząca z programu do układania rozkładu jazdy. Wartość dostępna jedynie dla słupków należących do ZTM w Gdańsku; ciąg znaków
stopShortname – identyfikator słupka przystankowego, unikalny w skali Organizatora, tj. ZTM w Gdańsku oraz ZKM w Gdyni. Wartość pochodzi z systemu TRISTAR; liczba całkowita
stopDesc – nazwa przystanku pochodząca z systemu TRISTAR; ciąg znaków
subName – pole opcjonalne. W przypadku ZTM w Gdańsku niepuste pole zawiera numer słupka przystankowego unikalny w ramach przystanku; Wartość pochodzi z systemu TRISTAR; liczba całkowita z dopełnieniem do dwóch cyfr
date – data, dla której obowiązują dane dotyczące słupka przystankowego; format YYYY-MM-DD
stopLat, stopLon – współrzędne geograficzne słupka przystankowego w formacie DDD.DDDDD° (system odniesienia EPSG:3857 znany też jako WGS84/Pseudo-Mercator)
type – pole informujące o typie taboru obsługiwanego przez słupek; ciąg znaków. Aktualnie pole może przyjmować nastepujące wartości:
BUS - przy słupku zatrzymują sie jedynie autobusy
TRAM - przy słupku zatrzymują się jedynie tramwaje
BUS_TRAM - przy słupku zatrzymują się zarówno autobusy jak i tramwaje
UNKNOWN - nie można jednoznacznie ustalić, jaki typ pojazdu zatrzymuje się przy słupku
zoneId – unikalny identyfikator miasta/gminy, do jakiej należy słupek przystankowy. Wartość dostępna jedynie dla słupków należących do ZTM w Gdańsku; liczba całkowita
zoneName – nazwa miasta/gminy, gdzie znajduje się słupek przystankowy; ciąg znaków
stopUrl – pole nieużywane
locationType – pole nieużywane
parentStation – pole nieużywane
stopTimezone – pole nieużywane
wheelchairBoarding – flaga określająca czy przystanek jest przystosowany dla osób poruszających się na wózkach. Wartość 1: tak, wartość 0: nie; bit
virtual – flaga określająca, czy słupek przystankowy jest wirtualny (nieprzeznaczony dla pasażera). Wartość 1: tak; wartość 0: nie; bit
nonpassenger – flaga określająca czy słupek przystankowy na trasie jest przeznaczony dla pasażera; wartość 0: nie; wartość 1: tak; bit
depot – flaga określająca czy słupek przystankowy jest zajezdnią; wartość 0: nie; wartość 1: tak; bit
ticketZoneBorder – flaga określająca czy słupek stanowi granicę strefy taryfowej. Wartość 1: tak; wartość 0: nie; bit
onDemand – flaga określająca, czy słupek ma status na żądanie. Wartość 1: tak; wartość 0: nie; bit
activationDate - data początku obowiązywania wersji topologii dot. słupka; data w formacie YYYY-MM-DD.

# Departures from stop

Estymowane czasy odjazdów z przystanku
URL: https://ckan2.multimediagdansk.pl/departures?stopId={stopId}

Zasób zawiera wywołanie zwracające informację o estymowanych czasach odjazdu pojazdów komunikacji miejskiej z podanego słupka przystankowego. Adres URL wskazujący na zasób oraz zwracana zawartość uległa zmianie od dnia 21.12.2021r.

Aktualna struktura URLa wygląda następująco: https://ckan2.multimediagdansk.pl/departures?stopId={stopId}.

Argument {stopId} jest identyfikatorem słupka – wartość stopId z zasobu Lista przystanków. Dane są pobierane dynamicznie, pochodzą z systemu TRISTAR. Dane są cache’owane dla każdego słupka niezależnie. Algorytm obliczający te dane bierze pod uwagę pozycję pojazdu względem wskazanego słupka przystankowego oraz dane o wykonaniu kursów, już zapisane w systemie. Dane mogą być nieprecyzyjne, z uwagi na dynamicznie zmieniające się warunki na drodze, interwał czasowy pomiędzy kolejnymi operacjami wyliczania próbek oraz wprowadzony czas cache’owania danych (20 sekund).

Zasób dostępny pod URLem https://ckan2.multimediagdansk.pl/departures?stopId={stopId} zawiera następujące dane:

lastUpdate – data aktualizacji danych z systemów źródłowych; data w formacie ISO-8601 (UTC)
departures – zawiera obiekty przechowujące informacje o estymowanych czasach przyjazdu na konkretny przystanek lub - w przypadku braku estymacji - powiązane dane rozkładowe. Obiekty są posortowane rosnąco względem pola estimatedTime. pojedynczy obiekt zawiera następujące pola:

w przypadku czasu estymowanego:

id – identyfikator, tworzony według zasady „T” + tripId + „R” + routeId; ciąg znaków
delayInSeconds – podany w sekundach czas opóźnienia. Wartość ujemna oznacza przyspieszenie w stosunku do czasu rozkładowego; liczba całkowita
estimatedTime – prognoza czasu odjazdu pojazdu z przystanku; w formacie ISO-8601 (UTC)
headsign – kierunek, w którym realizowany jest bieżący przejazd/kurs; najczęściej nazwa ostatniego przystanku dla pasażera; ciąg znaków
routeShortName - kod publiczny linii, którą realizuje pojazd; wartość routeShortName z zasobu Lista linii; ciąg znaków
routeId – identyfikator linii, do której przynależy wariant; wartość routeId z zasobu Lista linii; liczba całkowita
scheduledTripStartTime - rozkładowy czas rozpoczęcia kursu; format ISO-8601 (UTC)
tripId – identyfikator wariantu/trasy, do której przynależy słupek. Wartość tripId z zasobu „Lista tras”; liczba całkowita
status – wartość REALTIME; ciąg znaków
theoreticalTime – czas odjazdu wynikający z rozkładu jazdy; w formacie ISO-8601 (UTC)
timestamp – stempel czasowy określający czas obliczenia prognozy czasu odjazdu; format ISO-8601 (UTC)
trip – wewnętrzny identyfikator kursu; liczba całkowita
vehicleCode – numer boczny pojazdu realizującego kurs; liczba całkowita
vehicleId – wewnętrzny unikalny identyfikator pojazdów transportu zbiorowego w systemie TRISTAR; liczba całkowita
vehicleService - kod zadania przewozowego pojazdu; wartość busServiceName z zasobu Rozkład jazdy; ciąg znaków w formacie "xxx-yy", gdzie xxx – identyfikator linii, wartość routeId z zasobu Lista linii dopełniony z przodu zerami do trzech cyfr, yy - numer brygady dopełniony z przodu zerami do dwóch cyfr

w przypadku braku czasu estymowanego (dostępny jedynie czas rozkładowy):

id – identyfikator, tworzony według zasady „T” + tripId + „R” + routeId; ciąg znaków
delayInSeconds – wartość null
estimatedTime – czas odjazdu wynikający z rozkładu jazdy; w formacie ISO-8601 (UTC)
headsign – kierunek, w którym realizowany jest bieżący przejazd/kurs; najczęściej nazwa ostatniego przystanku dla pasażera; ciąg znaków
routeShortName - kod publiczny linii, którą realizuje pojazd; wartość routeShortName z zasobu Lista linii; ciąg znaków
routeId – identyfikator linii, do której przynależy wariant; wartość routeId z zasobu „Lista linii”; liczba całkowita
scheduledTripStartTime - rozkładowy czas rozpoczęcia kursu; format ISO-8601 (UTC)
tripId – identyfikator wariantu/trasy, do której przynależy słupek. Wartość tripId z zasobu „Lista tras”; liczba całkowita
status – wartość SCHEDULED; ciąg znaków
theoreticalTime – czas odjazdu wynikający z rozkładu jazdy; w formacie ISO-8601 (UTC)
timestamp – stempel czasowy określający czas wygenerowania obiektu; format ISO-8601 (UTC)
trip – wewnętrzny identyfikator kursu; liczba całkowita
vehicleCode – wartość null
vehicleId – wartość null
vehicleService - kod zadania przewozowego pojazdu; wartość busServiceName z zasobu Rozkład jazdy; ciąg znaków w formacie "xxx-yy", gdzie xxx – identyfikator linii, wartość routeId z zasobu Lista linii dopełniony z przodu zerami do trzech cyfr, yy - numer brygady dopełniony z przodu zerami do dwóch cyfr

# Departures from all stops

Estymowane czasy odjazdów ze wszystkich przystanków
URL: https://ckan2.multimediagdansk.pl/departures

Zasób zawiera dane dostępne w zasobie „Estymowane czasy odjazdów z przystanku” dla wszystkich słupków przystankowych.
