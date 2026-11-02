# Stany w salonach – widget karty towaru IdoSell

Przycisk **Sprawdź dostępność w salonach** na karcie towaru. Po kliknięciu widget pobiera stany produktu we wszystkich magazynach-salonach, rozpoznaje po domenie, w którym salonie jest klient („jesteś tutaj”), i daje link do tego samego produktu na domenie innego salonu.

```
Karta towaru (katowice.example.pl)                Vercel                          Panel IdoSell
widget.js  ── GET /api/stock?productId=123 ──▶  api/stock.js  ── X-API-KEY ──▶  /api/admin/<wersja>/products/stocks
           ◀── salony + poziomy/stany ───────  (CORS, walidacja, cache 60 s)  ◀── stany per magazyn i rozmiar
```

Klucz API nigdy nie trafia do przeglądarki – zna go tylko funkcja serwerowa.

## Pliki

| Plik | Rola |
|---|---|
| `config/salons.js` | salony: nazwa, domena, ID magazynu; tryb prezentacji, próg „ostatnie sztuki”, format linku, cache |
| `api/stock.js` | proxy do API Admin IdoSell: biała lista domen (CORS), walidacja ID, timeout 5 s, zwraca tylko salony z konfiguracji |
| `public/widget.js` | przycisk + okno z listą salonów, osadzany w sklepie przez Dodatki HTML/JS |

## Założenie

Jeden panel IdoSell, wiele sklepów (domen) – jeden sklep na salon, każdy salon ma swój magazyn własny. Produkt ma to samo ID we wszystkich sklepach. Jeśli salony są w osobnych panelach, potrzebny jest klucz API na panel i inna konfiguracja.

## Konfiguracja

1. **Klucz API** – w panelu `USTAWIENIA > Dostęp` dodaj klucz metodą **Klucz API**, osobny dla tej aplikacji, tylko z uprawnieniami do odczytu potrzebnymi dla bramki `products/stocks`.
2. **Zmienne środowiskowe** projektu na Vercelu:
   - `IDOSELL_PANEL_DOMAIN` – domena panelu (bez `https://`)
   - `IDOSELL_API_VERSION` – wersja API Admin, np. `v6` – sprawdź aktualną w dokumentacji API IdoSell
   - `IDOSELL_API_KEY` – klucz z kroku 1, przechowywany zgodnie z polityką sekretów firmy; nie wpisuj go do repozytorium ani do kodu
3. **Salony** – uzupełnij `config/salons.js`: domeny sklepów i ID magazynów z konfiguracji magazynów w panelu.
4. **Prezentacja** – `display: 'levels'` (dostępny / ostatnie sztuki / brak, dokładne stany nie wychodzą z API) albo `'exact'` (liczba sztuk). Decyzja biznesowa klienta.

## Weryfikacja przed wdrożeniem

Parser stanów w `api/stock.js` jest odporny na układ odpowiedzi (magazyn → rozmiary albo rozmiar → magazyny), ale nazwy pól trzeba potwierdzić na prawdziwej odpowiedzi z panelu demo:

```bash
curl -s -H "X-API-KEY: $IDOSELL_API_KEY" \
  "https://$IDOSELL_PANEL_DOMAIN/api/admin/$IDOSELL_API_VERSION/products/stocks?identType=id&products=123"
```

Sprawdź i w razie potrzeby popraw stałe `STOCK_KEYS`, `SIZE_KEYS`, `QTY_KEYS` (ilość dyspozycyjna ma pierwszeństwo przed ilością całkowitą).

Do potwierdzenia na sklepie testowym:

- ID produktu: `#projector_form[data-product_id]`, potem `[name="product"]`, awaryjnie końcówka adresu `…-<ID>.html`
- wybrany rozmiar: `#projector_form [name="size"]` (`uniw` = towar bez rozmiarów)
- link do innego salonu: ta sama ścieżka (`/pl/products/…-<ID>.html`) na domenie salonu – działa, gdy sklepy mają ten sam adres produktu; jeśli nie, ustaw `linkTemplate`
- miejsce przycisku: wiersz `#projector_stocks` („Ten produkt nie jest dostępny w sklepie stacjonarnym”) – przycisk zastępuje ten tekst, ikona zostaje z szablonu; gdy wiersza brak, przycisk trafia za `#projector_form`; inne miejsce – atrybut `data-anchor`

## Wdrożenie

1. Wdróż projekt na Vercelu (najpierw preview), podłącz go do sklepu testowego / panelu demo.
2. W panelu: `Sklep > Dodatki HTML/JS` → kampania aktywna na sklepach salonów → **Nowy dodatek**, typ **HTML**, podstrona **Karta towaru** (`/projector.php`), ładowanie razem z treścią strony:

   ```html
   <script src="https://<projekt>.vercel.app/widget.js" defer></script>
   ```

   Typ **HTML**, nie JS – wklejany jest znacznik `<script>` z adresem pliku, a typ JS przyjmuje tylko czysty kod bez znaczników.
3. Przetestuj: produkt na stanie w kilku salonach, zmiana rozmiaru (szablon przerysowuje kartę – przycisk wraca na miejsce), produkt z rozmiarami, brak w bieżącym salonie, błąd API (okno pokazuje „Spróbuj ponownie”), widok mobilny.
4. Przed produkcją: code review i standardowa ścieżka change management.

## Ograniczenia

- Stany są cache’owane na 60 s (`cacheSeconds`) – ogranicza to liczbę wywołań API przy ruchu.
- Origin w CORS to filtr dla przeglądarek, nie uwierzytelnienie. Przy dużym ruchu dodaj limit zapytań w Vercel Firewall.
- Widget nie zapisuje cookies ani danych klienta.
